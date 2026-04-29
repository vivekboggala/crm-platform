"use client";
import React, { useEffect, useState, useCallback } from "react";
import { ConfigProvider, useConfig } from "@/engine/ConfigContext";
import { ThemeProvider } from "@/engine/ThemeContext";
import { I18nProvider, useTranslation } from "@/engine/I18nContext";
import { isAuthenticated, clearAuthToken, apiGet } from "@/lib/api";
import NotificationToast from "@/components/NotificationToast";
import SchemaEditor from "@/components/SchemaEditor";

// Simple icon for the back button
function IconBack() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
}

function SettingsContent() {
  const { t } = useTranslation();
  
  return (
    <div className="page-container" style={{ padding: "40px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => window.location.href = "/"}
          style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, padding: "8px 0", color: "var(--accent)" }}
        >
          <IconBack />
          <span>Back to Dashboard</span>
        </button>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px 0" }}>Platform Settings</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>Manage your application configuration, schema, and GitHub exports.</p>
      </div>
      <SchemaEditor />
    </div>
  );
}

function SettingsAuthShell() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const hasToken = isAuthenticated();
      if (!hasToken) {
        window.location.href = "/";
        return;
      }
      try {
        const res = await apiGet("/auth/me");
        if (res.success) setAuthenticated(true);
        else window.location.href = "/";
      } catch {
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  if (loading) return null;
  if (!authenticated) return null;

  return <SettingsContent />;
}

export default function SettingsPage() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <I18nProvider>
          <NotificationToast />
          <SettingsAuthShell />
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
