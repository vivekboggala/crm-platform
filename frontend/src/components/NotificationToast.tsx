"use client";
import React, { useState, useEffect, useCallback } from "react";
import { connectSSE } from "@/lib/api";
import type { NotificationEvent } from "@/lib/types";

interface Toast {
  id: string;
  message: string;
  entity: string;
  timestamp: string;
  exiting?: boolean;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((event: NotificationEvent) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = {
      id,
      message: event.message,
      entity: event.entity,
      timestamp: event.timestamp,
    };
    setToasts((prev) => [...prev, toast]);
    // Auto-remove after 4 seconds
    setTimeout(() => removeToast(id), 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  };

  useEffect(() => {
    const cleanup = connectSSE((event) => {
      if (event.type === "notification") {
        addToast(event as NotificationEvent);
      }
    });
    return cleanup;
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--success ${toast.exiting ? "toast-exit" : ""}`}
        >
          <div className="toast-message">
            <div className="toast-title">{toast.message}</div>
            <div className="toast-body">{toast.entity}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
