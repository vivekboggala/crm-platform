import { Request, Response, NextFunction } from "express";

// ============================================================
// Global Error Handler — consistent error responses
// ============================================================

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("🔥 Unhandled error:", err);

  // Zod validation errors
  if (err.name === "ZodError") {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      details[issue.path.join(".")] = issue.message;
    }
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details,
    });
    return;
  }

  // Prisma errors
  if (err.code?.startsWith?.("P")) {
    res.status(400).json({
      success: false,
      error: "Database error",
      details: { code: err.code, message: err.message },
    });
    return;
  }

  // Generic error
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Unknown error",
  });
}
