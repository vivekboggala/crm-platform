"use client";
import React from "react";
import { ConfigProvider } from "@/engine/ConfigContext";
import { I18nProvider } from "@/engine/I18nContext";
import { ThemeProvider } from "@/engine/ThemeContext";
import NotificationToast from "@/components/NotificationToast";
import { AppShell } from "../page";

export default function SettingsPage() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <I18nProvider>
          <NotificationToast />
          <AppShell route="settings" />
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
