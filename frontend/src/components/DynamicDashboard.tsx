"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/engine/ConfigContext";
import { useTranslation } from "@/engine/I18nContext";
import { apiGet } from "@/lib/api";

// --- Icons ---
function IconPlus({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
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
function IconActivity({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
}
function EmptyActivityIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="2" fill="#f8fafc"/>
      <polyline points="34 24 28 24 26 30 22 18 20 24 14 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function DynamicDashboard() {
  const { config } = useConfig();
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        apiGet("/stats"),
        apiGet("/activity")
      ]);
      if (statsRes.success) setStats(statsRes.data as any);
      if (activityRes.success) setActivities(activityRes.data as any);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleFocus = () => { console.log("🔄 Window focused, refreshing data..."); fetchData(); };
    const handleRecordsUpdated = () => { console.log("🔄 Records updated event detected, refreshing data..."); fetchData(); };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("records-updated", handleRecordsUpdated);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("records-updated", handleRecordsUpdated);
    };
  }, []);

  const statItems = [
    { key: "contacts", label: t("common.contacts"), icon: <IconUsers />, color: "blue" },
    { key: "deals", label: t("common.deals"), icon: <IconBriefcase />, color: "green" },
    { key: "tasks", label: t("common.tasks"), icon: <IconCheckCircle />, color: "purple" },
  ];

  const handleQuickAction = (entityName: string) => {
    const page = config?.ui.pages.find(p => p.components.some(c => c.entity === entityName && c.type === "table"));
    if (page) {
      window.history.pushState({}, "", page.route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const getActivityLabel = (activity: any) => {
    const entity = config?.database.entities.find(e => e.name === activity.entityName);
    const displayField = entity?.displayField || "id";
    const value = activity.data[displayField] || activity.id.slice(0, 8);
    return (
      <div style={{ fontSize: "0.875rem" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>New {activity.entityName}</span>: {value}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {statItems.map((item) => (
          <div key={item.key} className={`stat-card ${item.color}`}>
            <div className="stat-icon-box">{item.icon}</div>
            <div className="stat-value">{loading ? <div className="skeleton" style={{ width: 40, height: 28, borderRadius: 6 }} /> : (stats[item.key] || 0)}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Recent Activity Card */}
          <div className="card">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconActivity />
              <span>Recent Activity</span>
            </div>
            
            {activities.length > 0 ? (
              <div style={{ padding: "8px 0" }}>
                {activities.map((activity, idx) => (
                  <div 
                    key={activity.id} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "16px 20px",
                      borderBottom: idx === activities.length - 1 ? "none" : "1px solid var(--border-soft)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconPlus size={14} />
                      </div>
                      {getActivityLabel(activity)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formatTime(activity.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "48px 24px" }}>
                <EmptyActivityIcon />
                <div style={{ color: "var(--text-secondary)", marginTop: 14, fontSize: "0.875rem", fontWeight: 500 }}>No activity yet</div>
                <div style={{ color: "var(--text-muted)", marginTop: 4, fontSize: "0.8125rem" }}>Activity will appear here as you create records.</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Quick Actions</div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {config?.database.entities.map(entity => (
                <button key={entity.name} className="btn btn-ghost" style={{ border: "1px solid var(--border)", justifyContent: "flex-start", padding: "12px 16px" }} onClick={() => handleQuickAction(entity.name)}>
                  <IconPlus size={16} />
                  <span>New {entity.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card">
            <div className="card-title">Data Distribution</div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {(() => {
                const total = statItems.slice(0, 3).reduce((acc, item) => acc + (stats[item.key] || 0), 0);
                if (total === 0 && !loading) {
                  return <div style={{ padding: "20px 0", textAlign: "center" }}><div style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: 8 }}>No data yet. Create records to see distribution.</div></div>;
                }
                const c = 440;
                let currentOffset = 0;
                return (
                  <>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="20" />
                      {!loading && statItems.slice(0, 3).map((item, idx) => {
                        const count = stats[item.key] || 0;
                        if (count === 0) return null;
                        const dash = (count / total) * c;
                        const offset = currentOffset;
                        currentOffset -= dash;
                        const color = idx === 0 ? "var(--accent)" : idx === 1 ? "var(--success)" : "#7c3aed";
                        return <circle key={item.key} cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="20" strokeDasharray={`${dash} ${c}`} strokeDashoffset={offset} transform="rotate(-90 80 80)" />;
                      })}
                      <text x="80" y="85" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: "1.25rem", fontWeight: 800 }}>{loading ? "..." : total}</text>
                      <text x="80" y="102" textAnchor="middle" fill="var(--text-muted)" style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Total items</text>
                    </svg>
                    <div style={{ width: "100%", marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                      {statItems.slice(0, 3).map((item, idx) => (
                        <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: idx === 0 ? "var(--accent)" : idx === 1 ? "var(--success)" : "#7c3aed" }} />
                            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{item.label}</span>
                          </div>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>{stats[item.key] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
