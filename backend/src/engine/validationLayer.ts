import { z, ZodObject, ZodRawShape } from "zod";
import type { EntityConfig, FieldConfig, FieldType } from "../types";

// ============================================================
// Validation Layer — builds Zod schemas per entity from config
// No hardcoding. All validators generated from field definitions.
// ============================================================

const validatorCache = new Map<string, z.ZodObject<any>>();

function fieldTypeToZod(field: FieldConfig): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type as FieldType) {
    case "string":
    case "text":
      schema = z.string().min(field.required ? 1 : 0, `${field.label || field.name} is required`);
      break;
    case "email":
      schema = z.string().email(`${field.label || field.name} must be a valid email`);
      break;
    case "number":
      schema = z.coerce.number({
        invalid_type_error: `${field.label || field.name} must be a number`,
      });
      break;
    case "boolean":
      schema = z.coerce.boolean();
      break;
    case "date":
      schema = z.string().refine(
        (val) => !val || !isNaN(Date.parse(val)),
        { message: `${field.label || field.name} must be a valid date` }
      );
      break;
    case "phone":
      schema = z.string();
      break;
    default:
      schema = z.string();
  }

  if (!field.required) {
    schema = schema.optional().nullable();
  }

  return schema;
}

export function buildEntityValidator(entity: EntityConfig): z.ZodObject<any> {
  const cached = validatorCache.get(entity.name);
  if (cached) return cached;

  const shape: ZodRawShape = {};

  for (const field of entity.fields) {
    shape[field.name] = fieldTypeToZod(field);
  }

  const validator = z.object(shape).passthrough();
  validatorCache.set(entity.name, validator);
  return validator;
}

export function validateData(entity: EntityConfig, data: unknown): {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Record<string, string>;
} {
  const validator = buildEntityValidator(entity);
  const result = validator.safeParse(data);

  if (result.success) {
    // Strip unknown fields — only keep fields defined in entity config
    const knownFieldNames = new Set(entity.fields.map((f) => f.name));
    const cleanedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(result.data)) {
      if (knownFieldNames.has(key)) {
        cleanedData[key] = value;
      } else {
        console.warn(`⚠️  Stripped unknown field "${key}" from ${entity.name} data`);
      }
    }

    return { success: true, data: cleanedData };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".");
    errors[field] = issue.message;
  }

  return { success: false, errors };
}

export function clearValidatorCache() {
  validatorCache.clear();
}
