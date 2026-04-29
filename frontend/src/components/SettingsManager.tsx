"use client";
import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useConfig } from "@/engine/ConfigContext";
import { useTranslation } from "@/engine/I18nContext";
import { useTheme } from "@/engine/ThemeContext";
import { showNotification } from "./NotificationToast";

export default function SettingsManager() {
  const { config, refetch } = useConfig();
  const { t, locale, setLocale } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "account">("general");
  const [formData, setFormData] = useState({
    name: config?.app.name || "",
    description: config?.app.description || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.app.name,
        description: config.app.description || "",
      });
    }
  }, [config]);

  const handleSaveAppDetails = async () => {
    setSaving(true);
    try {
      const newConfig = { ...config };
      newConfig.app.name = formData.name;
      newConfig.app.description = formData.description;
      
      const res = await apiPost("/config", newConfig);
      if (res.success) {
        showNotification("Settings updated", "Application details saved successfully", "success");
        await refetch();
      } else {
        showNotification("Update failed", (res as any).error, "error");
      }
    } catch (err: any) {
      showNotification("Error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    if (theme !== newTheme) toggleTheme();
  };

  return (
    <div className="settings-container" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div className="settings-header">
        <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
          {t("common.settings")}
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Manage your application preferences and account settings.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="settings-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
          <button 
            onClick={() => setActiveTab("general")}
            className={`tab-btn ${activeTab === "general" ? "active" : ""}`}
            style={{ padding: "16px 24px", border: "none", background: "none", cursor: "pointer", fontWeight: 600, color: activeTab === "general" ? "var(--accent)" : "var(--text-secondary)", borderBottom: activeTab === "general" ? "2px solid var(--accent)" : "none" }}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab("appearance")}
            className={`tab-btn ${activeTab === "appearance" ? "active" : ""}`}
            style={{ padding: "16px 24px", border: "none", background: "none", cursor: "pointer", fontWeight: 600, color: activeTab === "appearance" ? "var(--accent)" : "var(--text-secondary)", borderBottom: activeTab === "appearance" ? "2px solid var(--accent)" : "none" }}
          >
            Appearance
          </button>
          <button 
            onClick={() => setActiveTab("account")}
            className={`tab-btn ${activeTab === "account" ? "active" : ""}`}
            style={{ padding: "16px 24px", border: "none", background: "none", cursor: "pointer", fontWeight: 600, color: activeTab === "account" ? "var(--accent)" : "var(--text-secondary)", borderBottom: activeTab === "account" ? "2px solid var(--accent)" : "none" }}
          >
            Account
          </button>
        </div>

        <div className="settings-content" style={{ padding: 32 }}>
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
              <div className="form-group">
                <label className="form-label">Application Name</label>
                <input 
                  className="form-input" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. My CRM"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea" 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell us about this platform..."
                  style={{ minHeight: 100 }}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveAppDetails} 
                disabled={saving}
                style={{ width: "fit-content" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>Theme Mode</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 400 }}>
                  <button 
                    onClick={() => handleThemeChange("light")}
                    style={{ padding: 20, borderRadius: 12, border: theme === "light" ? "2px solid var(--accent)" : "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 12 }} />
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Light Mode</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Clean and professional</div>
                  </button>
                  <button 
                    onClick={() => handleThemeChange("dark")}
                    style={{ padding: 20, borderRadius: 12, border: theme === "dark" ? "2px solid var(--accent)" : "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1e293b", border: "1px solid #334155", marginBottom: 12 }} />
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Dark Mode</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Easy on the eyes</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>Language Preference</h3>
                <div style={{ display: "flex", gap: 12 }}>
                  {["en", "es", "pt", "zh"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLocale(lang)}
                      className={`btn ${locale === lang ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "8px 16px", minWidth: 80, border: locale === lang ? "none" : "1px solid var(--border)" }}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div style={{ maxWidth: 600 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>Account Security</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 24 }}>
                Manage your login credentials and security settings.
              </p>
              
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Email Address</label>
                <input className="form-input" value="user@example.com" disabled style={{ background: "var(--bg-page)", cursor: "not-allowed" }} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Email cannot be changed currently.</span>
              </div>

              <button className="btn btn-secondary" style={{ border: "1px solid var(--border)" }}>
                Change Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
