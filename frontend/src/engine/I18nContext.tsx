"use client";
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import en from "../i18n/en.json";
import es from "../i18n/es.json";
import pt from "../i18n/pt.json";
import zh from "../i18n/zh.json";

const translations: Record<string, any> = { 
  en, 
  es,
  pt,
  zh,
  fr: en,
  de: en,
  ja: en
};

interface I18nContextType {
  t: (path: string) => string;
  locale: string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: (s) => s,
  locale: "en",
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState("en");

  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    // Load saved locale from localStorage ONLY on client mount
    const saved = localStorage.getItem("app_locale");
    if (saved && translations[saved]) {
      if (isMounted.current) setLocaleState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  useEffect(() => {
    // Update document lang when locale changes
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: string) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem("app_locale", newLocale);
      document.documentElement.lang = newLocale;
    }
  };

  const t = useCallback((path: string): string => {
    const keys = path.split(".");
    let current = translations[locale] || translations["en"];
    
    const formatFallback = (p: string) => {
      const last = p.split(".").pop() || p;
      // Convert camelCase or dot.case to Title Case
      return last
        .replace(/([A-Z])/g, " $1") // Add space before caps
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
    };

    for (const key of keys) {
      if (!current || current[key] === undefined) {
        // Fallback to English if key missing in current locale
        let fallback = translations["en"];
        for (const fKey of keys) {
          if (!fallback || fallback[fKey] === undefined) return formatFallback(path);
          fallback = fallback[fKey];
        }
        return typeof fallback === "string" ? fallback : formatFallback(path);
      }
      current = current[key];
    }
    return typeof current === "string" ? current : formatFallback(path);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
