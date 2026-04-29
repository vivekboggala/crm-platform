"use client";
import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useConfig } from "@/engine/ConfigContext";
import { showNotification } from "./NotificationToast";

// --- Icons ---
function IconCode({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
}
function IconGithub({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
}

export default function SchemaEditor() {
  const { refetch } = useConfig();
  const [configStr, setConfigStr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [gistUrl, setGistUrl] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiGet("/config");
        if (res.success) {
          setConfigStr(JSON.stringify(res.data, null, 2));
        } else {
          setError((res as any).error || "Failed to load config.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
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

  const handleExportGist = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    setGistUrl("");
    try {
      const res = await apiPost("/export/gist", {});
      if (res.success && (res.data as any).url) {
        setGistUrl((res.data as any).url);
        setSuccess("Exported to GitHub Gist.");
        showNotification("Export successful", "Configuration exported to GitHub Gist.", "success");
      } else {
        const errorMsg = (res as any).error || "Failed to export gist.";
        setError(errorMsg);
        showNotification("Export failed", errorMsg, "error");
      }
    } catch (err: any) {
      setError(err.message);
      showNotification("Export error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExportRepo = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    setGistUrl("");
    try {
      const res = await apiPost("/export/repo", {});
      if (res.success && (res.data as any).url) {
        setGistUrl((res.data as any).url);
        setSuccess("Full project exported to GitHub repository!");
        showNotification("Export successful", "Full project repository created on GitHub.", "success");
      } else {
        const errorMsg = (res as any).error || "Failed to export repository.";
        setError(errorMsg);
        showNotification("Export failed", errorMsg, "error");
      }
    } catch (err: any) {
      setError(err.message);
      showNotification("Export error", err.message, "error");
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
        {(error || success || gistUrl) && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
            {error && <div className="form-error" style={{ marginBottom: 0 }}>{error}</div>}
            {success && <div style={{ color: "var(--success)", fontSize: "0.875rem", fontWeight: 500 }}>{success}</div>}
            {gistUrl && (
              <div style={{ fontSize: "0.875rem", marginTop: 4 }}>
                GitHub Link: <a href={gistUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{gistUrl}</a>
              </div>
            )}
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

      {/* Export Options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" id="github-export" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <IconGithub size={24} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Export Full Repository</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
            Generate the complete codebase (Next.js frontend, Express backend, Prisma schema) and push it to a new private GitHub repository.
          </p>
          <button className="btn btn-primary" onClick={handleExportRepo} disabled={saving} style={{ width: "100%" }}>
            {saving ? "Exporting..." : "Create GitHub Repository"}
          </button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <IconGithub size={24} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Export as Gist</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
            Export only the `app.config.json` file as a private GitHub Gist for quick backup or sharing with other platform instances.
          </p>
          <button className="btn btn-secondary" onClick={handleExportGist} disabled={saving} style={{ width: "100%", border: "1px solid var(--border)" }}>
            {saving ? "Exporting..." : "Save to Gist"}
          </button>
        </div>
      </div>
    </div>
  );
}
