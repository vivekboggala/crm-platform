// Re-export shared types for frontend consumption
// This avoids relative path hell with ../../../../shared/types

export type FieldType = "string" | "number" | "boolean" | "date" | "email" | "text" | "phone";

export interface FieldConfig {
  name: string;
  type: FieldType;
  required: boolean;
  label?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

export interface EntityConfig {
  name: string;
  fields: FieldConfig[];
  icon?: string;
  displayField?: string;
}

export type AuthMethod = "email" | "google";

export interface AuthConfig {
  methods: AuthMethod[];
  userScoped: boolean;
}

export type ComponentType = "table" | "form" | "dashboard" | "csv_import";

export interface ComponentConfig {
  type: string;
  entity?: string;
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

export type ApiOperation = "list" | "create" | "update" | "delete";

export interface ApiConfig {
  entity: string;
  operations: ApiOperation[];
}

export interface NotificationTrigger {
  on: string;
  notify: string;
  message?: string;
}

export interface WebhookConfig {
  on: string;
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
}

export interface IntegrationsConfig {
  webhooks?: WebhookConfig[];
}

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
  integrations?: IntegrationsConfig;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: { total?: number; page?: number; limit?: number; };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface DataRecord {
  id: string;
  entity_name: string;
  user_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CsvImportResult {
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
    fields?: Record<string, string>;
  }>;
}

export interface NotificationEvent {
  type: "notification";
  trigger: string;
  entity: string;
  message: string;
  timestamp: string;
}
