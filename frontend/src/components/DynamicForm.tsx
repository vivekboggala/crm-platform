"use client";
import React, { useState } from "react";
import { useConfig } from "@/engine/ConfigContext";
import { useTranslation } from "@/engine/I18nContext";
import { apiPost } from "@/lib/api";
import { showNotification } from "./NotificationToast";

interface DynamicFormProps {
  entity?: string;
  action?: "create" | "update";
  title?: string;
}

export default function DynamicForm({ entity: entityName, action = "create", title }: DynamicFormProps) {
  const { config } = useConfig();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const entityConfig = config?.database.entities.find((e) => e.name === entityName);

  if (!entityConfig) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccess(false);

    try {
      const res = await apiPost(`/${(entityName ?? "record").toLowerCase()}`, formData);
      if (res.success) {
        setSuccess(true);
        showNotification(
          `${entityName ?? "Record"} created`,
          `New ${(entityName ?? "record").toLowerCase()} added successfully!`,
          "success"
        );
        setFormData({});
        window.dispatchEvent(new CustomEvent(`refetch-${entityName}`));
        setTimeout(() => setSuccess(false), 3000);
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
    <div className="card" style={{ padding: 0 }}>
      <div className="card-title" style={{ padding: "16px 24px", margin: 0 }}>
        {title || `${t("common.create")} ${entityName ?? ""}`}
      </div>

      <div style={{ padding: 24 }}>
        {success && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "var(--success-soft)", color: "var(--success)", fontSize: "0.875rem", marginBottom: 20, fontWeight: 500, border: "1px solid var(--success)" }}>
            ✓ {t("form.createdSuccess")}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {entityConfig.fields.map((field) => {
              const isPriority = field.name.toLowerCase() === "priority";
              const isBoolean = field.type === "boolean";
              const isTextarea = field.type === "text";
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
                          id={`field-${field.name}`}
                          checked={!!formData[field.name]}
                          onChange={(e) => handleChange(field.name, e.target.checked, field.type)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  ) : (
                    <>
                      <label className="form-label" htmlFor={`field-${field.name}`}>
                        {field.label || field.name}
                        {field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
                      </label>

                      {isPriority ? (
                        <select
                          id={`field-${field.name}`}
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
                          id={`field-${field.name}`}
                          className="form-textarea"
                          value={formData[field.name] || ""}
                          placeholder={field.placeholder}
                          onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                          style={{ minHeight: 120 }}
                        />
                      ) : (
                        <input
                          id={`field-${field.name}`}
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
                  {errors[field.name] && (
                    <div style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: 4 }}>
                      {errors[field.name]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {errors._form && (
            <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginTop: 16 }}>
              {errors._form}
            </div>
          )}

          <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160 }}>
              {saving ? t("form.creating") : `${t("common.create")} ${entityName ?? ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
