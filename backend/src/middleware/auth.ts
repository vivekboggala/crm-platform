import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ============================================================
// Auth Middleware — JWT verification for protected routes
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || "config-platform-secret-change-in-production";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token — set userId to a default for non-scoped mode
    req.userId = undefined;
    next();
    return;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    // Invalid token — continue without auth (routes will handle scoping)
    req.userId = undefined;
    next();
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }
  next();
}

// --- Token generation for login ---
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
}
