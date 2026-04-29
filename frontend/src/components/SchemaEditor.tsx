"use client";
import React, { useState, useEffect, useRef } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useConfig } from "@/engine/ConfigContext";
import { showNotification } from "./NotificationToast";

// --- Icons ---
function IconCode({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
}


export default function SchemaEditor() {
  const { refetch } = useConfig();
  const [configStr, setConfigStr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiGet("/config");
        if (isMounted.current) {
          if (res.success) {
            setConfigStr(JSON.stringify(res.data, null, 2));
          } else {
            setError((res as any).error || "Failed to load config.");
          }
        }
      } catch (err: any) {
        if (isMounted.current) setError(err.message);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const parsed = JSON.parse(configStr);
      const res = await apiPost("/config", parsed);
      if (res.success) {
        setSuccess("Configuration saved and reloaded.");
        showNotification("Configuration saved", "The application has been reloaded with the new configuration.", "success");
        setLastSaved(new Date().toLocaleTimeString());
        await refetch();
      } else {
        const errorMsg = (res as any).error || "Failed to save configuration.";
        setError(errorMsg);
        showNotification("Save failed", errorMsg, "error");
      }
    } catch (err: any) {
      const errorMsg = "Invalid JSON: " + err.message;
      setError(errorMsg);
      showNotification("JSON Error", errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return <div className="skeleton skeleton-card" style={{ height: 400 }} />;
  }

  if (error && !configStr) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div className="empty-state-title">Access Denied</div>
          <div className="empty-state-desc">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header with Save Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>App Configuration</h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Edit the raw JSON configuration that drives the entire platform.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastSaved && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Saved at {lastSaved}</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Main Editor Card */}
      <div className="card" style={{ padding: 0 }}>
        {(error || success) && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
            {error && <div className="form-error" style={{ marginBottom: 0 }}>{error}</div>}
            {success && <div style={{ color: "var(--success)", fontSize: "0.875rem", fontWeight: 500 }}>{success}</div>}
          </div>
        )}

        <textarea
          className="schema-editor-textarea"
          value={configStr}
          onChange={(e) => setConfigStr(e.target.value)}
          spellCheck={false}
          style={{ minHeight: "520px", border: "none" }}
        />
      </div>
    </div>
  );
}
