"use client";
import { ConfigProvider } from "@/engine/ConfigContext";
import { I18nProvider } from "@/engine/I18nContext";
import { ThemeProvider } from "@/engine/ThemeContext";
import NotificationToast from "@/components/NotificationToast";
import { AppShell } from "../page";

export default function CatchAllPage({ params }: { params: { route: string[] } }) {
  const route = params.route ? params.route.join("/") : "";
  return (
    <ConfigProvider>
      <ThemeProvider>
        <I18nProvider>
          <NotificationToast />
          <AppShell route={route} />
        </I18nProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}