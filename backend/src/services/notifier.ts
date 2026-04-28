import { Request, Response } from "express";
import { getConfig } from "../config/loader";
import type { NotificationEvent } from "../types";

// ============================================================
// Notification Service — SSE-based (no WebSocket complexity)
// Reads triggers from config.notifications[]
// ============================================================

// Active SSE connections
const clients: Set<Response> = new Set();

export function sseHandler(req: Request, res: Response) {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);

  clients.add(res);
  console.log(`📡 SSE client connected (total: ${clients.size})`);

  req.on("close", () => {
    clients.delete(res);
    console.log(`📡 SSE client disconnected (total: ${clients.size})`);
  });
}

export function emitNotification(trigger: string, entity: string, data?: unknown) {
  const config = getConfig();
  const notifications = config.notifications || [];

  // Find matching notification triggers
  const matching = notifications.filter((n) => n.on === trigger);

  for (const notification of matching) {
    const event: NotificationEvent = {
      type: "notification",
      trigger: notification.on,
      entity,
      message: notification.message || `${trigger} event fired`,
      timestamp: new Date().toISOString(),
    };

    // Send to all SSE clients (in-app toast)
    if (notification.notify === "toast") {
      broadcastSSE(event);
    }

    // Email notification (if SMTP configured)
    if (notification.notify.includes("@")) {
      sendEmailNotification(notification.notify, event).catch((err) =>
        console.warn(`⚠️  Email notification failed: ${err.message}`)
      );
    }

    console.log(`🔔 Notification: ${trigger} → ${notification.notify}`);
  }

  // --- Webhook integrations ---
  const webhooks = (config as any).integrations?.webhooks || [];
  const matchingWebhooks = webhooks.filter((w: any) => w.on === trigger);

  for (const webhook of matchingWebhooks) {
    fireWebhook(webhook, trigger, entity, data).catch((err) =>
      console.warn(`⚠️  Webhook failed (${webhook.url}): ${err.message}`)
    );
  }
}

function broadcastSSE(event: NotificationEvent) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

async function sendEmailNotification(to: string, event: NotificationEvent) {
  // Only attempt if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.log(`📧 Email skipped (SMTP not configured): ${to} — ${event.message}`);
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${getConfig().app.name}" <noreply@configplatform.dev>`,
      to,
      subject: `[${getConfig().app.name}] ${event.message}`,
      html: `
        <h2>${event.message}</h2>
        <p><strong>Event:</strong> ${event.trigger}</p>
        <p><strong>Entity:</strong> ${event.entity}</p>
        <p><strong>Time:</strong> ${event.timestamp}</p>
      `,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err: any) {
    console.warn(`⚠️  Failed to send email: ${err.message}`);
  }
}

async function fireWebhook(
  webhook: { on: string; url: string; method?: string; headers?: Record<string, string> },
  trigger: string,
  entity: string,
  data: unknown
) {
  const method = webhook.method || "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(webhook.headers || {}),
  };

  const body = JSON.stringify({
    event: trigger,
    entity,
    data,
    timestamp: new Date().toISOString(),
  });

  console.log(`🔗 Webhook: ${method} ${webhook.url} (trigger: ${trigger})`);

  const res = await fetch(webhook.url, { method, headers, body });

  if (!res.ok) {
    const text = await res.text().catch(() => "No response body");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  console.log(`✅ Webhook delivered: ${webhook.url} → ${res.status}`);
}
