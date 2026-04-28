import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { getConfig, getEntity } from "../config/loader";
import { validateData } from "../engine/validationLayer";
import type { CsvImportResult } from "../types";

const prisma = new PrismaClient();

export async function handleCsvImport(req: Request, res: Response) {
  try {
    const entityName = req.query.entity as string;
    if (!entityName) {
      res.status(400).json({ success: false, error: "Query param 'entity' is required" });
      return;
    }

    const entity = getEntity(entityName);
    if (!entity) {
      res.status(404).json({ success: false, error: `Entity "${entityName}" not found` });
      return;
    }

    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ success: false, error: "No CSV file uploaded" });
      return;
    }

    const csvContent = file.buffer.toString("utf-8");
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    const config = getConfig();
    const userId = config.auth.userScoped ? (req as any).userId : null;
    const fieldNames = entity.fields.map((f) => f.name.toLowerCase());

    const result: CsvImportResult = { imported: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Auto-map columns (case-insensitive)
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const matchIdx = fieldNames.indexOf(key.toLowerCase());
        if (matchIdx >= 0) {
          mapped[entity.fields[matchIdx].name] = value;
        }
      }

      const validation = validateData(entity, mapped);
      if (!validation.success) {
        result.failed++;
        result.errors.push({ row: i + 2, message: "Validation failed", fields: validation.errors });
        continue;
      }

      await prisma.record.create({
        data: { id: uuidv4(), entityName: entity.name, userId, data: validation.data as any },
      });
      result.imported++;
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
