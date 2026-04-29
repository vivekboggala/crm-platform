import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { getConfig, getEntity, getApiConfig } from "../config/loader";
import { validateData } from "./validationLayer";
import { emitNotification } from "../services/notifier";
import type { ApiOperation, ApiResponse, DataRecord } from "../types";

// ============================================================
// Route Generator — dynamically creates CRUD routes from config
// No hardcoded routes. Everything driven by apis[] in config.
// ============================================================

const prisma = new PrismaClient();

export function generateRoutes(): Router {
  const router = Router();
  const config = getConfig();

  // --- Serve config to frontend ---
  router.get("/config", (_req: Request, res: Response) => {
    res.json({ success: true, data: config });
  });

  // --- Health check ---
  router.get("/health", (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
  });

  // --- Dynamic entity routes ---
  for (const api of config.apis) {
    const entity = getEntity(api.entity);
    if (!entity) {
      console.warn(`⚠️  API config references unknown entity: "${api.entity}" — skipping`);
      continue;
    }

    // Skip reserved system names to avoid route conflicts (e.g., /api/auth)
    if (["auth", "user", "users", "login", "register", "logout"].includes(entity.name.toLowerCase())) {
      console.warn(`⚠️  Entity "${entity.name}" uses a reserved system name — skipping route generation`);
      continue;
    }

    const basePath = `/${entity.name.toLowerCase()}`;

    // LIST — GET /api/contact
    if (api.operations.includes("list")) {
      router.get(basePath, async (req: Request, res: Response) => {
        try {
          const userId = config.auth.userScoped ? (req as any).userId : undefined;
          const where: any = { entityName: entity.name };
          if (userId) where.userId = userId;

          const records = await prisma.record.findMany({
            where,
            orderBy: { createdAt: "desc" },
          });

          const mapped = records.map((r) => ({
            id: r.id,
            ...((r.data as Record<string, unknown>) || {}),
            created_at: r.createdAt.toISOString(),
            updated_at: r.updatedAt.toISOString(),
          }));

          const response: ApiResponse = {
            success: true,
            data: mapped,
            meta: { total: mapped.length },
          };
          res.json(response);
        } catch (err: any) {
          res.status(500).json({ success: false, error: err.message });
        }
      });

      // GET SINGLE — GET /api/contact/:id
      router.get(`${basePath}/:id`, async (req: Request, res: Response) => {
        try {
          const { id } = req.params;
          const userId = config.auth.userScoped ? (req as any).userId : undefined;
          const record = await prisma.record.findFirst({
            where: { id, entityName: entity.name, ...(userId ? { userId } : {}) },
          });
          if (!record) {
            res.status(404).json({ success: false, error: `${entity.name} with id "${id}" not found` });
            return;
          }
          res.json({
            success: true,
            data: { id: record.id, ...((record.data as Record<string, unknown>) || {}), created_at: record.createdAt.toISOString(), updated_at: record.updatedAt.toISOString() },
          });
        } catch (err: any) {
          res.status(500).json({ success: false, error: err.message });
        }
      });
    }


    // CREATE — POST /api/contact
    if (api.operations.includes("create")) {
      router.post(basePath, async (req: Request, res: Response) => {
        try {
          const validation = validateData(entity, req.body);
          if (!validation.success) {
            const response: ApiResponse = {
              success: false,
              error: "Validation failed",
              details: validation.errors,
            };
            res.status(400).json(response);
            return;
          }

          const userId = config.auth.userScoped ? (req as any).userId : null;

          const record = await prisma.record.create({
            data: {
              id: uuidv4(),
              entityName: entity.name,
              userId,
              data: validation.data as any,
            },
          });

          const responseData = {
            id: record.id,
            ...((record.data as Record<string, unknown>) || {}),
            created_at: record.createdAt.toISOString(),
            updated_at: record.updatedAt.toISOString(),
          };

          // Fire notification if configured
          emitNotification(`${entity.name}.create`, entity.name, responseData);

          const response: ApiResponse = { success: true, data: responseData };
          res.status(201).json(response);
        } catch (err: any) {
          res.status(500).json({ success: false, error: err.message });
        }
      });
    }

    // UPDATE — PUT /api/contact/:id
    if (api.operations.includes("update")) {
      router.put(`${basePath}/:id`, async (req: Request, res: Response) => {
        try {
          const { id } = req.params;
          const userId = config.auth.userScoped ? (req as any).userId : undefined;

          // Check record exists
          const existing = await prisma.record.findFirst({
            where: {
              id,
              entityName: entity.name,
              ...(userId ? { userId } : {}),
            },
          });

          if (!existing) {
            res.status(404).json({ success: false, error: `${entity.name} with id "${id}" not found` });
            return;
          }

          const validation = validateData(entity, req.body);
          if (!validation.success) {
            res.status(400).json({
              success: false,
              error: "Validation failed",
              details: validation.errors,
            });
            return;
          }

          // Merge existing data with updates
          const mergedData = {
            ...((existing.data as Record<string, unknown>) || {}),
            ...validation.data,
          };

          const record = await prisma.record.update({
            where: { id },
            data: { data: mergedData as any },
          });

          const responseData = {
            id: record.id,
            ...((record.data as Record<string, unknown>) || {}),
            created_at: record.createdAt.toISOString(),
            updated_at: record.updatedAt.toISOString(),
          };

          emitNotification(`${entity.name}.update`, entity.name, responseData);

          res.json({ success: true, data: responseData });
        } catch (err: any) {
          res.status(500).json({ success: false, error: err.message });
        }
      });
    }

    // DELETE — DELETE /api/contact/:id
    if (api.operations.includes("delete")) {
      router.delete(`${basePath}/:id`, async (req: Request, res: Response) => {
        try {
          const { id } = req.params;
          const userId = config.auth.userScoped ? (req as any).userId : undefined;

          const existing = await prisma.record.findFirst({
            where: {
              id,
              entityName: entity.name,
              ...(userId ? { userId } : {}),
            },
          });

          if (!existing) {
            res.status(404).json({ success: false, error: `${entity.name} with id "${id}" not found` });
            return;
          }

          await prisma.record.delete({ where: { id } });

          emitNotification(`${entity.name}.delete`, entity.name, { id });

          res.json({ success: true, data: { id, deleted: true } });
        } catch (err: any) {
          res.status(500).json({ success: false, error: err.message });
        }
      });
    }

    console.log(`  📌 ${entity.name}: ${api.operations.join(", ")} → /api${basePath}`);
  }

  // --- Catch unknown entity routes ---
  router.all("/:entity", (req: Request, res: Response) => {
    const entityName = req.params.entity;
    const knownEntities = config.database.entities.map((e) => e.name.toLowerCase());
    res.status(404).json({
      success: false,
      error: `Entity "${entityName}" not found in config`,
      available: knownEntities,
    });
  });

  router.all("/:entity/:id", (req: Request, res: Response) => {
    const entityName = req.params.entity;
    const knownEntities = config.database.entities.map((e) => e.name.toLowerCase());
    res.status(404).json({
      success: false,
      error: `Entity "${entityName}" not found in config`,
      available: knownEntities,
    });
  });

  return router;
}
