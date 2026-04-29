import { z } from "zod";

// ============================================================
// Config Zod Schema — validates the entire app.config.json
// ============================================================

const FieldTypeEnum = z.enum(["string", "number", "boolean", "date", "email", "text", "phone"]);

const FieldConfigSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  type: FieldTypeEnum,
  required: z.boolean(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const EntityConfigSchema = z.object({
  name: z.string().min(1, "Entity name is required").regex(/^[A-Z][a-zA-Z]*$/, "Entity name must be PascalCase"),
  fields: z.array(FieldConfigSchema),
  icon: z.string().optional(),
  displayField: z.string().optional(),
});

const AuthMethodEnum = z.enum(["email", "google", "guest"]);

const AuthConfigSchema = z.object({
  methods: z.array(AuthMethodEnum).min(1, "At least one auth method is required"),
  userScoped: z.boolean(),
});

const ComponentConfigSchema = z.object({
  type: z.string().min(1),
  entity: z.string().optional(),
  action: z.enum(["create", "update"]).optional(),
  title: z.string().optional(),
  props: z.record(z.unknown()).optional(),
});

const PageConfigSchema = z.object({
  route: z.string().startsWith("/", "Route must start with /"),
  title: z.string().optional(),
  components: z.array(ComponentConfigSchema),
  requiresAuth: z.boolean().optional(),
});

const ApiOperationEnum = z.enum(["list", "create", "update", "delete"]);

const ApiConfigSchema = z.object({
  entity: z.string().min(1),
  operations: z.array(ApiOperationEnum).min(1, "At least one operation is required"),
});

const NotificationTriggerSchema = z.object({
  on: z.string().min(1, "Trigger event is required (e.g., 'Contact.create')"),
  notify: z.string().min(1),
  message: z.string().optional(),
});

const WebhookSchema = z.object({
  on: z.string().min(1, "Webhook trigger event is required (e.g., 'Contact.create')"),
  url: z.string().url("Webhook URL must be a valid URL"),
  method: z.enum(["POST", "PUT", "PATCH"]).optional(),
  headers: z.record(z.string()).optional(),
});

const IntegrationsSchema = z.object({
  webhooks: z.array(WebhookSchema).optional(),
}).optional();

const AppSettingsSchema = z.object({
  name: z.string().min(1),
  theme: z.enum(["light", "dark"]),
  locale: z.string().min(2).max(5),
  description: z.string().optional(),
  logo: z.string().optional(),
});

export const AppConfigSchema = z.object({
  app: AppSettingsSchema,
  auth: AuthConfigSchema,
  database: z.object({
    entities: z.array(EntityConfigSchema).min(1, "At least one entity is required"),
  }),
  ui: z.object({
    pages: z.array(PageConfigSchema),
  }),
  apis: z.array(ApiConfigSchema),
  notifications: z.array(NotificationTriggerSchema).optional(),
  integrations: IntegrationsSchema,
}).refine(
  (config) => {
    // Ensure all entity names are unique
    const names = config.database.entities.map((e) => e.name);
    return new Set(names).size === names.length;
  },
  { message: "Entity names must be unique" }
).refine(
  (config) => {
    // Ensure all API entities reference existing entities
    const entityNames = new Set(config.database.entities.map((e) => e.name));
    return config.apis.every((api) => entityNames.has(api.entity));
  },
  { message: "API entity must reference a defined entity" }
);
