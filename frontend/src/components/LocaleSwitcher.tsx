"use client";
import React from "react";
import { useTranslation } from "@/engine/I18nContext";

const LOCALES: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  zh: "中文",
};

export default function LocaleSwitcher() {
  const { locale, setLocale } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value);
  };

  return (
    <div className="locale-switcher">
      <select 
        value={locale} 
        onChange={handleChange}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          padding: "6px 10px",
          fontSize: "0.8125rem",
          color: "#64748b",
          background: "#ffffff",
          outline: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {Object.entries(LOCALES).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
