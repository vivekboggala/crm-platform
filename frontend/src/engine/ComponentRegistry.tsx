"use client";
import React from "react";
import DynamicForm from "@/components/DynamicForm";
import DynamicTable from "@/components/DynamicTable";
import DynamicDashboard from "@/components/DynamicDashboard";
import CsvImporter from "@/components/CsvImporter";
import UnknownFallback from "@/components/UnknownFallback";
import SchemaEditor from "@/components/SchemaEditor";
import SettingsManager from "@/components/SettingsManager";

// ============================================================
// Component Registry — maps config type strings to React components
// Extensibility key: adding a new component = one line
// ============================================================

const registry: Record<string, React.FC<any>> = {
  form: DynamicForm,
  table: DynamicTable,
  dashboard: DynamicDashboard,
  csv_import: CsvImporter,
  schema_editor: SchemaEditor,
  settings_manager: SettingsManager,
};

/**
 * Resolve a component type string to a React component.
 * Returns UnknownFallback for unregistered types — never crashes.
 */
export function resolveComponent(type: string): React.FC<any> {
  return registry[type] || UnknownFallback;
}

/**
 * Register a new component type at runtime.
 * Example: registerComponent("kanban", DynamicKanban);
 */
export function registerComponent(type: string, component: React.FC<any>) {
  registry[type] = component;
}

/**
 * Get all registered component types.
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(registry);
}

export default registry;
