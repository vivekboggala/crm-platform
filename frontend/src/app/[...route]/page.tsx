"use client";
import HomePage from "../page";

/**
 * Catch-all route component.
 * This ensures that any path (like /settings, /contacts, etc.) 
 * renders the main application shell defined in the root page.tsx.
 */
export default function CatchAllPage() {
  return <HomePage />;
}
