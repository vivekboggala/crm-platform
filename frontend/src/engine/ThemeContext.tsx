"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useConfig } from "@/engine/ConfigContext";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();
  const configDefault: Theme = config?.app?.theme === "dark" ? "dark" : "light";
  const [theme, setTheme] = useState<Theme>(configDefault);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem("app_theme") as Theme | null;
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
      } else {
        setTheme(configDefault);
        document.documentElement.classList.toggle("dark", configDefault === "dark");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [configDefault]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem("app_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
