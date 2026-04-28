"use client";
import React from "react";

interface UnknownFallbackProps {
  type?: string;
  [key: string]: any;
}

export default function UnknownFallback({ type }: UnknownFallbackProps) {
  return (
    <div className="form-container" style={{ borderColor: "#d97706" }}>
      <div className="empty-state" style={{ padding: "32px 20px" }}>
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <div className="empty-state-title">Unknown Component</div>
        <div className="empty-state-desc">
          Component type <code style={{
            background: "#f8fafc",
            padding: "2px 8px",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            border: "1px solid #e2e8f0",
          }}>&quot;{type || "undefined"}&quot;</code> is not registered.
        </div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          Register it in <code style={{ fontFamily: "monospace" }}>ComponentRegistry.tsx</code> to use it.
        </div>
      </div>
    </div>
  );
}
