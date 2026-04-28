// ============================================================
// SHARED TYPES — Single source of truth for Frontend + Backend
// ============================================================
// This file is the contract between all layers.
// Both frontend and backend import from here.
// DO NOT duplicate these types elsewhere.
// ============================================================

// --- Field & Entity Types ---

export type FieldType = "string" | "number" | "boolean" | "date" | "email" | "text";

export interface FieldConfig {
  name: string;
  type: FieldType;
  required: boolean;
  label?: string;           // Display label (falls back to name)
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

export interface EntityConfig {
  name: string;
  fields: FieldConfig[];
  icon?: string;            // Optional icon identifier
  displayField?: string;    // Which field to use as display name (defaults to first string field)
}

// --- Auth Types ---

export type AuthMethod = "email" | "google";

export interface AuthConfig {
  methods: AuthMethod[];
  userScoped: boolean;      // If true, all data is scoped to the logged-in user
}

// --- UI Types ---

export type ComponentType = "table" | "form" | "dashboard" | "csv_import";

export interface ComponentConfig {
  type: string;             // string (not ComponentType) so unknown types don't crash
  entity?: string;          // Which entity this component operates on
  action?: "create" | "update";
  title?: string;
  props?: Record<string, unknown>;
}

export interface PageConfig {
  route: string;
  title?: string;
  components: ComponentConfig[];
  requiresAuth?: boolean;
}

// --- API Types ---

export type ApiOperation = "list" | "create" | "update" | "delete";

export interface ApiConfig {
  entity: string;
  operations: ApiOperation[];
}

// --- Notification Types ---

export interface NotificationTrigger {
  on: string;               // e.g. "Contact.create"
  notify: string;           // email address or "toast"
  message?: string;         // Custom notification message
}

// --- Top-level App Config ---

export interface AppSettings {
  name: string;
  theme: "light" | "dark";
  locale: string;
  description?: string;
  logo?: string;
}

export interface AppConfig {
  app: AppSettings;
  auth: AuthConfig;
  database: {
    entities: EntityConfig[];
  };
  ui: {
    pages: PageConfig[];
  };
  apis: ApiConfig[];
  notifications?: NotificationTrigger[];
}

// --- API Response Types ---

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string>;   // field-level errors
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- Record Type (JSONB approach) ---

export interface DataRecord {
  id: string;
  entity_name: string;
  user_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- CSV Import Types ---

export interface CsvImportResult {
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
    fields?: Record<string, string>;
  }>;
}

// --- SSE Event Types ---

export interface NotificationEvent {
  type: "notification";
  trigger: string;          // e.g. "Contact.create"
  entity: string;
  message: string;
  timestamp: string;
}
