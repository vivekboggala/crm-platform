"use client";
import React, { useState, useEffect, useCallback } from "react";
import { connectSSE } from "@/lib/api";
import type { NotificationEvent } from "@/lib/types";

interface Toast {
  id: string;
  message: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  exiting?: boolean;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, description?: string, type: Toast["type"] = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, message, description, type };
    
    setToasts((prev) => [...prev, toast]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    // 1. Listen to SSE Notifications
    const cleanupSSE = connectSSE((event) => {
      if (event.type === "notification") {
        const e = event as NotificationEvent;
        addToast(e.message, e.entity, "info");
      }
    });

    // 2. Listen to Local UI Notifications
    const handleLocalNotification = (e: any) => {
      const { message, description, type } = e.detail;
      addToast(message, description, type);
    };

    window.addEventListener("app-notification", handleLocalNotification);

    return () => {
      cleanupSSE();
      window.removeEventListener("app-notification", handleLocalNotification);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type} ${toast.exiting ? "toast-exit" : ""}`}
        >
          <div className="toast-icon">
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "✕"}
            {toast.type === "warning" && "⚠"}
            {toast.type === "info" && "ℹ"}
          </div>
          <div className="toast-content">
            <div className="toast-title">{toast.message}</div>
            {toast.description && <div className="toast-body">{toast.description}</div>}
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper function to trigger notification from anywhere
export function showNotification(message: string, description?: string, type: Toast["type"] = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-notification", { 
      detail: { message, description, type } 
    }));
  }
}
