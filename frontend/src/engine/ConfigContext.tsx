"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { AppConfig } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/config`);
      if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
      } else {
        throw new Error(json.error || "Invalid config response");
      }
    } catch (err: any) {
      console.error("Config load failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refetch: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  return useContext(ConfigContext);
}

export function useEntity(entityName?: string) {
  const { config } = useConfig();
  if (!config || !entityName) return null;
  return config.database.entities.find((e) => e.name === entityName) || null;
}
