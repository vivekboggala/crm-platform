import * as fs from "fs";
import * as path from "path";
import { AppConfigSchema } from "./schema";
import type { AppConfig } from "../types";

// ============================================================
// Config Loader — loads and validates app.config.json
// Handles: missing file, JSON syntax errors, schema violations
// ============================================================

let cachedConfig: AppConfig | null = null;

export function loadConfig(configPath?: string): AppConfig {
  if (cachedConfig) return cachedConfig;

  const resolvedPath = configPath
    || process.env.CONFIG_PATH
    || path.resolve(__dirname, "../../../app.config.json");

  const absolutePath = path.isAbsolute(resolvedPath)
    ? resolvedPath
    : path.resolve(process.cwd(), resolvedPath);

  // --- Check if file exists ---
  if (!fs.existsSync(absolutePath)) {
    console.error(`\n❌ Failed to load config file.`);
    console.error(`   Path: ${absolutePath}`);
    console.error(`   The file does not exist.`);
    console.error(`\n   Create an app.config.json or set CONFIG_PATH environment variable.\n`);
    process.exit(1);
  }

  // --- Read and parse JSON ---
  let rawContent: string;
  let parsed: unknown;

  try {
    rawContent = fs.readFileSync(absolutePath, "utf-8");
  } catch (err: any) {
    console.error(`\n❌ Failed to read config file: ${absolutePath}`);
    console.error(`   ${err.message}\n`);
    process.exit(1);
  }

  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    // Extract line/column from JSON parse error
    const match = err.message.match(/position (\d+)/);
    let lineInfo = "";
    if (match && rawContent) {
      const pos = parseInt(match[1], 10);
      const upToError = rawContent.substring(0, pos);
      const line = upToError.split("\n").length;
      const col = pos - upToError.lastIndexOf("\n");
      lineInfo = ` at line ${line}, column ${col}`;
    }
    console.error(`\n❌ Failed to parse app.config.json: JSON syntax error${lineInfo}`);
    console.error(`   ${err.message}\n`);
    process.exit(1);
  }

  // --- Validate against schema ---
  const result = AppConfigSchema.safeParse(parsed);

  if (!result.success) {
    console.error(`\n❌ Config validation failed:`);
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      console.error(`   • ${path || "root"}: ${issue.message}`);
    }
    console.error(`\n   Fix the issues in ${absolutePath} and restart.\n`);
    process.exit(1);
  }

  cachedConfig = result.data as AppConfig;
  console.log(`✅ Config loaded: "${cachedConfig.app.name}" (${cachedConfig.database.entities.length} entities)`);
  return cachedConfig;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }
  return cachedConfig;
}

export function reloadConfig(): AppConfig {
  cachedConfig = null;
  return loadConfig();
}

export function getEntity(entityName: string) {
  const config = getConfig();
  return config.database.entities.find((e) => e.name === entityName) || null;
}

export function getApiConfig(entityName: string) {
  const config = getConfig();
  return config.apis.find((a) => a.entity === entityName) || null;
}
