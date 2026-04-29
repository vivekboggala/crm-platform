"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { ConfigProvider, useConfig } from "@/engine/ConfigContext";
import { I18nProvider, useTranslation } from "@/engine/I18nContext";
import { ThemeProvider, useTheme } from "@/engine/ThemeContext";
import { isAuthenticated, clearAuthToken, apiGet, apiPost } from "@/lib/api";
import NotificationToast from "@/components/NotificationToast";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import PageRenderer from "@/engine/PageRenderer";
import SchemaEditor from "@/components/SchemaEditor";
import type { PageConfig } from "@/lib/types";

// --- SVG Icons ---
function IconDashboard({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
}
function IconUsers({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
}
function IconBriefcase({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
}
function IconCheckCircle({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
function IconSettings({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
}
function IconMenu({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
}
function IconPlus({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
function IconLogout({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
}
function IconSun({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
}
function IconMoon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
}

export default function HomePage() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <I18nProvider>
          <NotificationToast />
          <AppShell route="" />
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}

export function AppShell({ route }: { route: string }) {
  const { config, loading, error, refetch } = useConfig();
  const { t } = useTranslation();
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      return path === "/" ? "" : path.replace(/^\//, "");
    }
    return route;
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Sync currentRoute with browser history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const cleanRoute = path === "/" ? "" : path.replace(/^\//, "");
      setCurrentRoute(cleanRoute);
    };
    
    // Sync on mount
    handlePopState();
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check auth on every page load — validate token via /auth/me
  const checkAuth = useCallback(async () => {
    const hasToken = isAuthenticated();
    if (!hasToken) {
      setAuthenticated(false);
      setAuthChecked(true);
      return;
    }
    try {
      const res = await apiGet("/auth/me");
      if (res.success) {
        setUser(res.data as any);
        if ((res.data as any).isAdmin) setIsAdmin(true);
        setAuthenticated(true);
      } else {
        // Token is invalid/expired — clear it
        clearAuthToken();
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Full logout: clear localStorage + NextAuth session + hard redirect
  const handleLogout = async () => {
    try {
      await apiPost("/auth/logout", {});
    } catch {}
    clearAuthToken();
    try {
      const { signOut } = await import("next-auth/react");
      await signOut({ redirect: false });
    } catch {}
    window.location.href = "/";
  };

  const handleLoginSuccess = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  // Infinite loading fix: Handle error state properly and ensure config is present
  if (error) return <ErrorScreen t={t} />;
  if (!authChecked || (loading && !config)) return <LoadingScreen t={t} />;
  if (!config) return <ErrorScreen t={t} />; 
  if (!authenticated) return <LoginPage onSuccess={handleLoginSuccess} />;

  const navigateTo = (newRoute: string) => {
    const cleanRoute = newRoute === "/" ? "" : newRoute.replace(/^\//, "");
    setCurrentRoute(cleanRoute);
    window.history.pushState({}, "", newRoute);
  };

  // Redirect if non-admin or guest tries to access settings
  useEffect(() => {
    if (currentRoute === "settings" && user && (!isAdmin || (user as any).isGuest)) {
      navigateTo("/");
    }
  }, [currentRoute, user, isAdmin]);

  const activePage = config.ui.pages.find((p: any) => 
    currentRoute === "" ? p.route === "/" : `/${currentRoute}` === p.route
  ) || (currentRoute === "settings" ? { title: t("common.settings") } : null);

  const getIconForRoute = (route: string) => {
    if (route === "/" || route === "") return <IconDashboard />;
    if (route === "/contacts") return <IconUsers />;
    if (route === "/deals") return <IconBriefcase />;
    if (route === "/tasks") return <IconCheckCircle />;
    return <IconPlus />;
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? "collapsed" : ""}`}>
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">{config.app.name}</div>
          <button className="sidebar-toggle-inner" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <IconMenu size={18} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {config.ui.pages.map((page: PageConfig) => {
            const isActive = currentRoute === "" ? page.route === "/" : `/${currentRoute}` === page.route;
            const translationKey = `common.${(page.title ?? '').toLowerCase()}`;
            const label = t(translationKey) !== translationKey ? t(translationKey) : page.title;

            return (
              <button
                key={page.route}
                className={`nav-link ${isActive ? "active" : ""}`}
                data-tooltip={label}
                onClick={() => { navigateTo(page.route); setMobileMenuOpen(false); }}
              >
                {getIconForRoute(page.route)}
                <span className="nav-label">{label}</span>
              </button>
            );
          })}

          {isAdmin && !(user as any).isGuest && (
            <button
              className={`nav-link ${currentRoute === "settings" ? "active" : ""}`}
              data-tooltip={t("common.settings")}
              onClick={() => { navigateTo("/settings"); setMobileMenuOpen(false); }}
            >
              <IconSettings />
              <span className="nav-label">{t("common.settings")}</span>
            </button>
          )}
        </nav>

        {/* Dark mode toggle — icon only */}
        <div className="sidebar-footer">
          <button
            className="theme-toggle-icon-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
        </div>
      </aside>

      <div className="main-content-wrapper">
        <header className="top-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="mobile-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="header-title">
              {activePage && activePage.title 
                ? (t(`common.${activePage.title.toLowerCase()}`) !== `common.${activePage.title.toLowerCase()}` 
                    ? t(`common.${activePage.title.toLowerCase()}`) 
                    : activePage.title)
                : t("common.dashboard")}
            </div>
          </div>
          <div className="header-actions">
            <LocaleSwitcher />
            {user && <UserMenu user={user} isAdmin={isAdmin} t={t} onLogout={handleLogout} onNavigate={navigateTo} />}
          </div>
        </header>
        <main className="main-content">
          {currentRoute === "settings" ? (
            <SchemaEditor />
          ) : (
            <PageRenderer route={currentRoute} isAdmin={isAdmin} />
          )}
        </main>
      </div>
    </div>
  );
}

function UserMenu({ user, isAdmin, t, onLogout, onNavigate }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getInitials = (name: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.split("@")[0].slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="user-menu-container" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="user-avatar">{getInitials(user.name, user.email)}</div>
        <IconChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="dropdown-header">
            <div className="dropdown-user-name">{user.name}</div>
            <div className="dropdown-user-email">{user.email}</div>
          </div>
          {isAdmin && !user.isGuest && (
            <button className="dropdown-item" onClick={() => { onNavigate("/settings"); setIsOpen(false); }}>
              <IconSettings size={16} /> {t("common.settings")}
            </button>
          )}
          <button className="dropdown-item danger" onClick={onLogout}>
            <IconLogout size={16} /> {t("common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingScreen({ t }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-page)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{t("common.loading")}</div>
      </div>
    </div>
  );
}

function ErrorScreen({ t }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-page)" }}>
      <div style={{ maxWidth: 400, textAlign: "center", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", padding: "40px 32px" }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto 16px", display: "block" }}>
          <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="2" fill="#fef2f2"/>
          <line x1="24" y1="16" x2="24" y2="28" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="24" cy="33" r="1.5" fill="#dc2626"/>
        </svg>
        <h2 style={{ marginBottom: 8, color: "var(--text-primary)", fontSize: "1.125rem" }}>{t("common.errorTitle") || "Connection Error"}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 24 }}>{t("common.errorDesc") || "Unable to connect to the server. Please try again."}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>{t("common.retry")}</button>
      </div>
    </div>
  );
}

function LoginPage({ onSuccess }: any) {
  const { config } = useConfig();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { apiPost, setAuthToken } = await import("@/lib/api");
      const { showNotification } = await import("@/components/NotificationToast");
      const res = await apiPost(mode === "login" ? "/auth/login" : "/auth/register", form);
      if (res.success) { 
        setAuthToken((res.data as any).token); 
        showNotification(mode === "login" ? "Welcome back!" : "Account created successfully!", undefined, "success");
        onSuccess(); 
      }
      else {
        const errorMsg = (res as any).error || "Authentication failed";
        setError(errorMsg);
        showNotification("Authentication failed", errorMsg, "error");
      }
    } catch (err: any) { 
      setError(err.message); 
      const { showNotification } = await import("@/components/NotificationToast");
      showNotification("System error", err.message, "error");
    }
    finally { setLoading(false); }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { apiPost, setAuthToken } = await import("@/lib/api");
      const { showNotification } = await import("@/components/NotificationToast");
      const res = await apiPost("/auth/guest", {});
      if (res.success) { 
        setAuthToken((res.data as any).token); 
        showNotification("Welcome, Guest!", undefined, "success");
        onSuccess(); 
      }
      else {
        const errorMsg = (res as any).error || "Authentication failed";
        setError(errorMsg);
        showNotification("Authentication failed", errorMsg, "error");
      }
    } catch (err: any) { 
      setError(err.message); 
      const { showNotification } = await import("@/components/NotificationToast");
      showNotification("System error", err.message, "error");
    }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: "40px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
            {config?.app.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9375rem" }}>
            {mode === "login" ? t("auth.signInTitle") : t("auth.registerTitle")}
          </p>
        </div>
        {error && (
          <div style={{ background: "var(--danger-soft)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "10px 14px", borderRadius: 8, fontSize: "0.875rem", marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">{t("auth.name")}</label>
              <input id="reg-name" className="form-input" value={form.name} placeholder="Your name" onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t("auth.email")}</label>
            <input id="login-email" className="form-input" type="email" value={form.email} placeholder="you@example.com" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t("auth.password")}</label>
            <input id="login-password" className="form-input" type="password" value={form.password} placeholder="••••••••" onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={4} />
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
            {loading ? t("common.loading") : mode === "login" ? t("common.login") : t("common.register")}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "24px 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ padding: "0 12px" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <button 
          onClick={handleGuestLogin}
          disabled={loading}
          style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 500, fontSize: "0.9375rem", cursor: "pointer" }}
        >
          Continue as Guest
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            id="auth-mode-toggle"
            style={{ border: "none", background: "none", color: "var(--accent)", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? t("auth.createNewAccount") : t("auth.alreadyHaveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
