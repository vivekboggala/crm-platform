"use client";
import React, { useEffect, useState } from "react";
import { useConfig } from "@/engine/ConfigContext";
import { useTranslation } from "@/engine/I18nContext";
import { apiGet, apiDelete, apiPost, apiPut } from "@/lib/api";
import PhoneInputField from "@/components/PhoneInputField";
import { showNotification } from "@/components/NotificationToast";

interface DynamicTableProps {
  entity?: string;
}

// --- Icons ---
function IconRefresh({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>;
}
function IconTrash({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
}
function IconEdit({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
}
function IconPlus({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
function IconClose({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}

// Clean minimal empty state SVG
function EmptyStateIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="4" y="12" width="48" height="36" rx="4" stroke="#cbd5e1" strokeWidth="2" fill="#f8fafc"/>
      <line x1="12" y1="24" x2="44" y2="24" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="32" x2="36" y2="32" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="40" x2="28" y2="40" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="44" cy="44" r="10" fill="#eff6ff" stroke="#1a56db" strokeWidth="2"/>
      <line x1="44" y1="40" x2="44" y2="48" stroke="#1a56db" strokeWidth="2" strokeLinecap="round"/>
      <line x1="40" y1="44" x2="48" y2="44" stroke="#1a56db" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function DynamicTable({ entity: entityName }: DynamicTableProps) {
  const { config } = useConfig();
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const entityConfig = config?.database.entities.find((e) => e.name === entityName);

  const fetchData = async () => {
    if (!entityName) return;
    setLoading(true);
    try {
      const res = await apiGet(`/${entityName.toLowerCase()}`);
      if (res.success) setData(res.data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleRefetch = () => fetchData();
    window.addEventListener(`refetch-${entityName}`, handleRefetch);
    return () => window.removeEventListener(`refetch-${entityName}`, handleRefetch);
  }, [entityName]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      const res = await apiDelete(`/${entityName!.toLowerCase()}/${id}`);
      if (res.success) {
        showNotification(`${entityName} deleted`, undefined, "success");
        fetchData();
        window.dispatchEvent(new CustomEvent("records-updated"));
      } else {
        showNotification("Delete failed", (res as any).error, "error");
      }
    } catch (err: any) {
      showNotification("Delete error", err.message, "error");
    }
  };

  const renderValue = (field: any, value: any) => {
    if (value === null || value === undefined) return "-";
    if (field.type === "boolean") {
      return (
        <span className={`badge ${value ? "badge-success" : "badge-neutral"}`}>
          {value ? t("common.yes") : t("common.no")}
        </span>
      );
    }
    if (field.name.toLowerCase() === "priority") {
      const color = value === "High" ? "badge-danger" : value === "Medium" ? "badge-warning" : "badge-neutral";
      return <span className={`badge ${color}`}>{value}</span>;
    }
    return String(value);
  };

  if (!entityConfig) return null;

  const entityLabel = t(`common.${entityName?.toLowerCase()}`);

  return (
    <>
      {/* Table header with New button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {entityLabel}
          </h2>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {data.length} {data.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading} title={t("common.refresh")}>
            <IconRefresh />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <IconPlus size={14} />
            <span>New {entityLabel}</span>
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="data-table-wrapper">
          {loading ? (
            <div style={{ padding: 0 }}>
              <div style={{ background: "var(--bg-page)", height: 40, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 16px" }}>
                {entityConfig.fields.map((f, i) => (
                  <div key={i} className="skeleton" style={{ width: 80, height: 14, marginRight: 40 }} />
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} style={{ height: 52, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 16px" }}>
                  {entityConfig.fields.map((f, i) => (
                    <div key={i} className="skeleton" style={{ width: i === 0 ? 120 : 80, height: 16, marginRight: 40, opacity: 1 - (row * 0.15) }} />
                  ))}
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <EmptyStateIcon />
              <div className="empty-state-title">No {entityLabel} yet</div>
              <div className="empty-state-desc">
                Get started by creating your first record.
              </div>
              <button className="empty-state-link" onClick={() => setShowCreateModal(true)}>
                + Create your first {entityLabel}
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {entityConfig.fields.map((f) => (
                    <th key={f.name}>{f.label || f.name}</th>
                  ))}
                  <th style={{ width: 100, textAlign: "right" }}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    {entityConfig.fields.map((f) => (
                      <td key={f.name}>{renderValue(f, row[f.name])}</td>
                    ))}
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(row.id)} title={t("common.edit")}>
                          <IconEdit />
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: "#dc2626" }} onClick={() => handleDelete(row.id)} title={t("common.delete")}>
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateModal
          entityName={entityName!}
          entityConfig={entityConfig}
          t={t}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchData(); }}
        />
      )}

      {/* Edit Modal */}
      {editingId && (
        <EditModal
          entityName={entityName!}
          entityConfig={entityConfig}
          recordId={editingId}
          existingData={data.find((r) => r.id === editingId)}
          t={t}
          onClose={() => setEditingId(null)}
          onUpdated={() => { setEditingId(null); fetchData(); }}
        />
      )}
    </>
  );
}

/* ---- Inline Create Modal ---- */
function CreateModal({ entityName, entityConfig, t, onClose, onCreated }: any) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiPost(`/${entityName.toLowerCase()}`, formData);
      if (res.success) {
        setSuccess(true);
        showNotification(`${entityName} created`, `New ${entityName.toLowerCase()} added successfully!`, "success");
        window.dispatchEvent(new CustomEvent(`refetch-${entityName}`));
        window.dispatchEvent(new CustomEvent("records-updated"));
        setTimeout(() => onCreated(), 600);
      } else {
        const errorMsg = (res as any).error || "Failed to create record";
        setErrors((res as any).details || { _form: errorMsg });
        showNotification("Creation failed", errorMsg, "error");
      }
    } catch (err: any) {
      setErrors({ _form: err.message });
      showNotification("Creation error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (fieldName: string, value: any, fieldType: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: fieldType === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {t("common.create")} {t(`common.${entityName?.toLowerCase()}`)}
          </div>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          {success && (
            <div style={{ padding: "12px 16px", borderRadius: "8px", background: "var(--success-soft)", color: "var(--success)", fontSize: "0.875rem", marginBottom: 20, fontWeight: 500, border: "1px solid var(--success)" }}>
              ✓ Created successfully!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {entityConfig.fields.map((field: any) => {
                const isPriority = field.name.toLowerCase() === "priority";
                const isBoolean = field.type === "boolean";
                const isTextarea = field.type === "text";
                const isPhone = field.type === "phone";
                const isFullWidth = isPriority || isBoolean || isTextarea;

                return (
                  <div key={field.name} className={`form-group ${isFullWidth ? "full-width" : ""}`}>
                    {isBoolean ? (
                      <div className="toggle-row">
                        <label className="form-label" style={{ margin: 0 }}>
                          {field.label || field.name}
                          {field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
                        </label>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={!!formData[field.name]}
                            onChange={(e) => handleChange(field.name, e.target.checked, field.type)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    ) : (
                      <>
                        <label className="form-label" htmlFor={`modal-field-${field.name}`}>
                          {field.label || field.name}
                          {field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
                        </label>

                        {isPriority ? (
                          <select
                            id={`modal-field-${field.name}`}
                            className="form-select"
                            value={formData[field.name] || ""}
                            onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          >
                            <option value="">Select Priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        ) : isTextarea ? (
                          <textarea
                            id={`modal-field-${field.name}`}
                            className="form-textarea"
                            value={formData[field.name] || ""}
                            placeholder={field.placeholder}
                            onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          />
                        ) : isPhone ? (
                          <PhoneInputField
                            id={`modal-field-${field.name}`}
                            value={formData[field.name] || ""}
                            onChange={(val) => handleChange(field.name, val, "string")}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <input
                            id={`modal-field-${field.name}`}
                            type={
                              field.type === "number" ? "number" :
                              field.type === "date" ? "date" :
                              field.type === "email" ? "email" : "text"
                            }
                            className="form-input"
                            value={formData[field.name] ?? ""}
                            placeholder={field.placeholder}
                            onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          />
                        )}
                      </>
                    )}
                    {errors[field.name] && <div style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: 4 }}>{errors[field.name]}</div>}
                  </div>
                );
              })}
            </div>

            {errors._form && <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginTop: 16 }}>{errors._form}</div>}

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating..." : `Create ${t(`common.${entityName?.toLowerCase()}`)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---- Inline Edit Modal ---- */
function EditModal({ entityName, entityConfig, recordId, existingData, t, onClose, onUpdated }: any) {
  // Pre-fill form with existing record data
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (!existingData) return {};
    const initial: Record<string, any> = {};
    for (const field of entityConfig.fields) {
      initial[field.name] = existingData[field.name] ?? "";
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiPut(`/${entityName.toLowerCase()}/${recordId}`, formData);
      if (res.success) {
        setSuccess(true);
        showNotification(`${entityName} updated`, `${entityName} record updated successfully`, "success");
        window.dispatchEvent(new CustomEvent(`refetch-${entityName}`));
        window.dispatchEvent(new CustomEvent("records-updated"));
        setTimeout(() => onUpdated(), 600);
      } else {
        const errorMsg = (res as any).error || "Failed to update record";
        setErrors((res as any).details || { _form: errorMsg });
        showNotification("Update failed", errorMsg, "error");
      }
    } catch (err: any) {
      setErrors({ _form: err.message });
      showNotification("Update error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (fieldName: string, value: any, fieldType: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: fieldType === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {t("common.edit")} {t(`common.${entityName?.toLowerCase()}`)}
          </div>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          {success && (
            <div style={{ padding: "12px 16px", borderRadius: "8px", background: "var(--success-soft)", color: "var(--success)", fontSize: "0.875rem", marginBottom: 20, fontWeight: 500, border: "1px solid var(--success)" }}>
              ✓ Updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {entityConfig.fields.map((field: any) => {
                const isPriority = field.name.toLowerCase() === "priority";
                const isBoolean = field.type === "boolean";
                const isTextarea = field.type === "text";
                const isPhone = field.type === "phone";
                const isFullWidth = isPriority || isBoolean || isTextarea;

                return (
                  <div key={field.name} className={`form-group ${isFullWidth ? "full-width" : ""}`}>
                    {isBoolean ? (
                      <div className="toggle-row">
                        <label className="form-label" style={{ margin: 0 }}>
                          {field.label || field.name}
                        </label>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={!!formData[field.name]}
                            onChange={(e) => handleChange(field.name, e.target.checked, field.type)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    ) : (
                      <>
                        <label className="form-label" htmlFor={`edit-field-${field.name}`}>
                          {field.label || field.name}
                          {field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
                        </label>

                        {isPriority ? (
                          <select
                            id={`edit-field-${field.name}`}
                            className="form-select"
                            value={formData[field.name] || ""}
                            onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          >
                            <option value="">Select Priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        ) : isTextarea ? (
                          <textarea
                            id={`edit-field-${field.name}`}
                            className="form-textarea"
                            value={formData[field.name] || ""}
                            placeholder={field.placeholder}
                            onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          />
                        ) : isPhone ? (
                          <PhoneInputField
                            id={`edit-field-${field.name}`}
                            value={formData[field.name] || ""}
                            onChange={(val) => handleChange(field.name, val, "string")}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <input
                            id={`edit-field-${field.name}`}
                            type={
                              field.type === "number" ? "number" :
                              field.type === "date" ? "date" :
                              field.type === "email" ? "email" : "text"
                            }
                            className="form-input"
                            value={formData[field.name] ?? ""}
                            placeholder={field.placeholder}
                            onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          />
                        )}
                      </>
                    )}
                    {errors[field.name] && <div style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: 4 }}>{errors[field.name]}</div>}
                  </div>
                );
              })}
            </div>

            {errors._form && <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginTop: 16 }}>{errors._form}</div>}

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : `Save Changes`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
