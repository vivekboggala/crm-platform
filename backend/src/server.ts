import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { loadConfig, reloadConfig } from "./config/loader";
import { generateRoutes } from "./engine/routeGenerator";
import { authMiddleware, generateToken } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { sseHandler } from "./services/notifier";
import { handleCsvImport } from "./services/csvImporter";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = parseInt(process.env.PORT || "4000");

import bcrypt from "bcryptjs";

// --- Load config (fails fast with clear error if missing/invalid) ---
console.log("\n🚀 Starting Config Platform Backend...\n");
const config = loadConfig();

// --- SMTP email transporter ---
console.log(`📧 SMTP configured: ${!!process.env.SMTP_HOST} (host: ${process.env.SMTP_HOST || "not set"})`);

const smtpTransporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,  // true for port 465 (implicit TLS/SSL)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendWelcomeEmail(email: string, name: string) {
  if (!smtpTransporter) {
    console.log("⚠️  Skipping welcome email — SMTP not configured");
    return;
  }
  try {
    console.log("📧 Sending welcome email to:", email);
    await smtpTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Welcome to ${config.app.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #0f172a;">Welcome, ${name || "there"}! 🎉</h2>
          <p style="color: #475569; line-height: 1.6;">Your account on <strong>${config.app.name}</strong> has been successfully created.</p>
          <p style="color: #475569; line-height: 1.6;">You can now log in and start managing your contacts, deals, and tasks.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 0.875rem;">This is an automated message from ${config.app.name}.</p>
        </div>
      `,
    });
    console.log("✅ Welcome email sent successfully to:", email);
  } catch (e: any) {
    console.error("❌ Email error:", e.message);
  }
}

// --- Middleware ---
const allowedOrigins = [
  "http://localhost:3000", 
  "http://127.0.0.1:3000",
  "https://crm-platform-frontend.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === "string") return allowed === origin;
      return false; // Regex or other types could be added here
    }) || /\.vercel\.app$/.test(origin); // Keep allowing Vercel preview URLs

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true 
}));
app.use(express.json());
app.use(authMiddleware);

// --- SSE endpoint for notifications ---
app.get("/api/events", sseHandler);

// --- Auth Router ---
const authRouter = express.Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password required" });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }
    
    // Hash password with bcrypt (10 rounds)
    const hashed = await bcrypt.hash(password, 10);
    const count = await prisma.user.count();
    const isAdmin = count === 0;
    
    const user = await prisma.user.create({
      data: { id: uuidv4(), email, password: hashed, name: name || null, isAdmin },
    });
    
    console.log(`New user created (Email), sending welcome email to: ${email}`);
    sendWelcomeEmail(email, name || email.split("@")[0]);

    const token = generateToken(user.id, user.email);
    res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }
    if (!user.password) {
      res.status(401).json({ success: false, error: "This account uses Google login. Please sign in with Google." });
      return;
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }
    const token = generateToken(user.id, user.email);
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post("/guest", async (req, res) => {
  try {
    const randomId = crypto.randomBytes(4).toString("hex");
    const email = `guest-${randomId}@guest.com`;
    const name = `Guest-${randomId}`;
    const password = crypto.randomBytes(8).toString("hex");
    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { id: uuidv4(), email, password: hashed, name, isAdmin: false, isGuest: true },
    });

    console.log("Guest user created:", newUser.id, "isGuest:", newUser.isGuest);

    const token = generateToken(newUser.id, newUser.email);
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          isAdmin: newUser.isAdmin,
          isGuest: newUser.isGuest,
        },
      },
    });
  } catch (err: any) {
    console.error("Guest login error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post("/logout", async (req: any, res) => {
  const userId = req.userId;
  console.log("Logout called for userId:", userId);

  try {
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      console.log("User found:", user);

      if (user && user.isGuest === true) {
        console.log("Guest cleanup starting...");
        try {
          // Schema verification (schema.prisma):
          //   model Record  → @@map("records")        → table: "records"
          //   userId String → @map("user_id")         → column: "user_id"
          //   model User    → @@map("users")           → table: "users"
          // Using $executeRaw guarantees the exact SQL table/column names are used,
          // bypassing any Prisma client mapping translation layer.
          const result = await prisma.$executeRaw`
            DELETE FROM "records" WHERE "user_id" = ${user.id}
          `;
          await prisma.user.delete({ where: { id: user.id } });
          console.log(`✅ Guest cleanup done: deleted ${result} records and user ${user.id}`);
        } catch (err: any) {
          console.error("Guest cleanup error:", err);
          // Still return success — client session ends regardless
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Logout error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post("/google", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(googleId ? [{ googleId }] : []),
          { email }
        ]
      }
    });

    if (existingUser) {
      if (!existingUser.googleId && googleId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { googleId },
        });
      }
      const token = generateToken(existingUser.id, existingUser.email);
      res.json({
        success: true,
        data: {
          token,
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, isAdmin: existingUser.isAdmin },
        },
      });
      return;
    }

    const count = await prisma.user.count();
    const isAdmin = count === 0;
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        name: name || email.split("@")[0],
        password: null,
        googleId: googleId || null,
        isAdmin,
      },
    });
    sendWelcomeEmail(email, name || email.split("@")[0]);
    const token = generateToken(user.id, user.email);
    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protect /me with authMiddleware
authRouter.get("/me", authMiddleware, async (req: any, res) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
});

app.use("/api/auth", authRouter);

// --- Stats route ---
app.get("/api/stats", async (req: any, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.json({ success: true, data: { contacts: 0, deals: 0, tasks: 0 } });
      return;
    }

    // Use groupBy for efficient counting of all entities for this user
    const counts = await prisma.record.groupBy({
      by: ['entityName'],
      where: { userId },
      _count: { id: true }
    });

    const stats: Record<string, number> = {};
    counts.forEach(c => {
      // Map to plural lowercase key (e.g., Contact -> contacts)
      const key = `${c.entityName.toLowerCase()}s`;
      stats[key] = c._count.id;
    });

    // Ensure common keys exist
    if (!stats.contacts) stats.contacts = 0;
    if (!stats.deals) stats.deals = 0;
    if (!stats.tasks) stats.tasks = 0;

    console.log(`📊 Stats for user ${userId}:`, stats);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    console.error("❌ Stats error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Activity route (Latest records) ---
app.get("/api/activity", async (req: any, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.json({ success: true, data: [] });
      return;
    }

    const activity = await prisma.record.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    res.json({ success: true, data: activity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- CSV import route ---
app.post("/api/import/csv", upload.single("file"), handleCsvImport);


// --- Config routes (Admin check REMOVED) ---
app.get("/api/config", async (req: any, res) => {
  try {
    const resolvedPath = process.env.CONFIG_PATH || path.resolve(__dirname, "../../../app.config.json");
    const absolutePath = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(process.cwd(), resolvedPath);
    const content = fs.readFileSync(absolutePath, "utf-8");
    res.json({ success: true, data: JSON.parse(content) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/config", async (req: any, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isAdmin !== true || user.isGuest === true) {
      res.status(403).json({ success: false, error: "Guests cannot modify configuration" });
      return;
    }

    const resolvedPath = process.env.CONFIG_PATH || path.resolve(__dirname, "../../../app.config.json");
    const absolutePath = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(process.cwd(), resolvedPath);
    
    // --- Auto-sync schema with Postgres using raw SQL ---
    if (req.body?.database?.entities) {
      for (const entity of req.body.database.entities) {
        // Skip reserved system names
        if (["auth", "user", "users", "login", "register", "logout"].includes(entity.name.toLowerCase())) continue;

        // Ensure table exists to prevent ALTER TABLE from crashing
        try {
          await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${entity.name}" (id TEXT PRIMARY KEY)`);
        } catch (dbErr: any) {
          throw new Error(`Database error creating table "${entity.name}": ${dbErr.message}`);
        }

        // Add columns for each field
        if (entity.fields && Array.isArray(entity.fields)) {
          for (const field of entity.fields) {
            let pgType = "TEXT";
            if (field.type === "number") pgType = "DOUBLE PRECISION";
            else if (field.type === "boolean") pgType = "BOOLEAN";
            else if (field.type === "date") pgType = "TIMESTAMP";

            try {
              await prisma.$executeRawUnsafe(`ALTER TABLE "${entity.name}" ADD COLUMN IF NOT EXISTS "${field.name}" ${pgType}`);
            } catch (dbErr: any) {
              throw new Error(`Database error adding column "${field.name}" to "${entity.name}": ${dbErr.message}`);
            }
          }
        }
      }
    }

    fs.writeFileSync(absolutePath, JSON.stringify(req.body, null, 2), "utf-8");
    
    // Hot-reload config and routes
    reloadConfig();
    apiRoutes = generateRoutes();
    
    res.json({ success: true, data: "Configuration saved and schema synced successfully." });
  } catch (err: any) {
    console.error("❌ Config sync error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- Dynamic CRUD routes ---
console.log("\n📦 Registering dynamic routes:");
let apiRoutes = generateRoutes();
app.use("/api", (req, res, next) => apiRoutes(req, res, next));

// --- Error handler (must be last) ---
app.use(errorHandler);

// --- Start server ---
async function start() {
  try {
    await prisma.$connect();
    console.log("\n✅ Database connected");
    app.listen(PORT, () => {
      console.log(`\n🌐 Backend running at http://localhost:${PORT}`);
      console.log(`   Config: ${config.app.name}`);
      console.log(`   Entities: ${config.database.entities.map((e) => e.name).join(", ")}`);
      console.log(`   Theme: ${config.app.theme} | Locale: ${config.app.locale}\n`);
    });
  } catch (err: any) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
}

start();
