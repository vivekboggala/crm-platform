"use client";
import React from "react";
import { useConfig } from "@/engine/ConfigContext";
import { resolveComponent } from "@/engine/ComponentRegistry";
import { useTranslation } from "@/engine/I18nContext";
import type { ComponentConfig } from "@/lib/types";

interface PageRendererProps {
  route: string;
  isAdmin?: boolean;
}

export default function PageRenderer({ route, isAdmin }: PageRendererProps) {
  const { config, loading, error } = useConfig();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 28 }}>
          <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 260, height: 16 }} />
        </div>
        <div className="skeleton skeleton-card" style={{ marginBottom: 16 }} />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div className="empty-state-title">Failed to load configuration</div>
        <div className="empty-state-desc">{error}</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!config) return null;

  const normalizedRoute = route === "" ? "/" : `/${route}`;
  let page = config.ui.pages.find(
    (p) => p.route === normalizedRoute || p.route === `/${route}`
  );

  if (!page && isAdmin && normalizedRoute === "/settings") {
    page = {
      title: "Platform Settings",
      route: "/settings",
      components: [{ type: "schema_editor" }]
    };
  }

  if (!page) {
    return (
      <div className="not-found" style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: "4rem", fontWeight: 800, color: "#e2e8f0", marginBottom: 16 }}>404</div>
        <div style={{ fontSize: "1.125rem", color: "#64748b", marginBottom: 32 }}>
          The page &quot;{normalizedRoute}&quot; doesn&apos;t exist or isn&apos;t configured.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            window.history.pushState({}, "", "/");
            window.location.reload();
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {page.components.map((comp: ComponentConfig, idx: number) => {
        const Component = resolveComponent(comp.type);
        if (!Component) return null;
        
        return (
          <Component
            key={`${comp.type}-${comp.entity || "default"}-${idx}`}
            entity={comp.entity}
            action={comp.action}
            title={comp.title}
            config={config}
            {...(comp.props || {})}
          />
        );
      })}
    </div>
  );
}
