"use client";
import React from "react";
import { ConfigProvider } from "@/engine/ConfigContext";
import { ThemeProvider } from "@/engine/ThemeContext";
import { I18nProvider } from "@/engine/I18nContext";
import NotificationToast from "@/components/NotificationToast";
import SchemaEditor from "@/components/SchemaEditor";

export default function SettingsPage() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <I18nProvider>
          <NotificationToast />
          <div className="page-container" style={{ padding: "40px 20px", maxWidth: 1200, margin: "0 auto" }}>
             <div style={{ marginBottom: 32 }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => window.location.href = "/"}
                  style={{ marginBottom: 16, padding: "8px 0", color: "var(--accent)" }}
                >
                   ← Back to Dashboard
                </button>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>Platform Settings</h1>
                <p style={{ color: "var(--text-secondary)" }}>Manage your application configuration and exports.</p>
             </div>
             <SchemaEditor />
          </div>
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
