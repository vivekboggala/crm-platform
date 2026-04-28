"use client";
import { SessionProvider } from "next-auth/react";
import React from "react";

/**
 * Client-side wrapper for NextAuth's SessionProvider.
 * Required because SessionProvider uses React context (client-only),
 * but layout.tsx is a server component by default.
 */
export default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
