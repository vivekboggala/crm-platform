import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { loadConfig, reloadConfig } from "./config/loader";
import { generateRoutes } from "./engine/routeGenerator";
import { authMiddleware, generateToken } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { sseHandler } from "./services/notifier";
import { handleCsvImport } from "./services/csvImporter";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = parseInt(process.env.PORT || "4000");

import bcrypt from "bcryptjs";

// --- Load config (fails fast with clear error if missing/invalid) ---
console.log("\n🚀 Starting Config Platform Backend...\n");
const config = loadConfig();

// --- SMTP email transporter ---
console.log(`📧 SMTP configured: ${!!process.env.SMTP_HOST} (host: ${process.env.SMTP_HOST || "not set"})`);

const smtpTransporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendWelcomeEmail(email: string, name: string) {
  if (!smtpTransporter) {
    console.log("⚠️  Skipping welcome email — SMTP not configured");
    return;
  }
  try {
    console.log("📧 Sending welcome email to:", email);
    await smtpTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Welcome to ${config.app.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #0f172a;">Welcome, ${name || "there"}! 🎉</h2>
          <p style="color: #475569; line-height: 1.6;">Your account on <strong>${config.app.name}</strong> has been successfully created.</p>
          <p style="color: #475569; line-height: 1.6;">You can now log in and start managing your contacts, deals, and tasks.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 0.875rem;">This is an automated message from ${config.app.name}.</p>
        </div>
      `,
    });
    console.log("✅ Welcome email sent successfully to:", email);
  } catch (e: any) {
    console.error("❌ Email error:", e.message);
  }
}

// --- Middleware ---
app.use(cors({ 
  origin: [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "https://crm-platform-frontend.vercel.app",
    /\.vercel\.app$/ // Allow all Vercel preview/branch deployments
  ], 
  credentials: true 
}));
app.use(express.json());
app.use(authMiddleware);

// --- SSE endpoint for notifications ---
app.get("/api/events", sseHandler);

// --- Auth Router ---
const authRouter = express.Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password required" });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }
    
    // Hash password with bcrypt (10 rounds)
    const hashed = await bcrypt.hash(password, 10);
    const count = await prisma.user.count();
    const isAdmin = count === 0;
    
    const user = await prisma.user.create({
      data: { id: uuidv4(), email, password: hashed, name: name || null, isAdmin },
    });
    
    console.log(`New user created (Email), sending welcome email to: ${email}`);
    sendWelcomeEmail(email, name || email.split("@")[0]);

    const token = generateToken(user.id, user.email);
    res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }
    if (!user.password) {
      res.status(401).json({ success: false, error: "This account uses Google login. Please sign in with Google." });
      return;
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }
    const token = generateToken(user.id, user.email);
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post("/google", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(googleId ? [{ googleId }] : []),
          { email }
        ]
      }
    });

    if (existingUser) {
      if (!existingUser.googleId && googleId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { googleId },
        });
      }
      const token = generateToken(existingUser.id, existingUser.email);
      res.json({
        success: true,
        data: {
          token,
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, isAdmin: existingUser.isAdmin },
        },
      });
      return;
    }

    const count = await prisma.user.count();
    const isAdmin = count === 0;
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        name: name || email.split("@")[0],
        password: null,
        googleId: googleId || null,
        isAdmin,
      },
    });
    sendWelcomeEmail(email, name || email.split("@")[0]);
    const token = generateToken(user.id, user.email);
    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protect /me with authMiddleware
authRouter.get("/me", authMiddleware, async (req: any, res) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
});

app.use("/api/auth", authRouter);

// --- Stats route ---
app.get("/api/stats", async (req: any, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.json({ success: true, data: { contacts: 0, deals: 0, tasks: 0 } });
      return;
    }

    // Use groupBy for efficient counting of all entities for this user
    const counts = await prisma.record.groupBy({
      by: ['entityName'],
      where: { userId },
      _count: { id: true }
    });

    const stats: Record<string, number> = {};
    counts.forEach(c => {
      // Map to plural lowercase key (e.g., Contact -> contacts)
      const key = `${c.entityName.toLowerCase()}s`;
      stats[key] = c._count.id;
    });

    // Ensure common keys exist
    if (!stats.contacts) stats.contacts = 0;
    if (!stats.deals) stats.deals = 0;
    if (!stats.tasks) stats.tasks = 0;

    console.log(`📊 Stats for user ${userId}:`, stats);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    console.error("❌ Stats error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Activity route (Latest records) ---
app.get("/api/activity", async (req: any, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.json({ success: true, data: [] });
      return;
    }

    const activity = await prisma.record.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    res.json({ success: true, data: activity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- CSV import route ---
app.post("/api/import/csv", upload.single("file"), handleCsvImport);


// --- Config routes (Admin check REMOVED) ---
app.get("/api/config", async (req: any, res) => {
  try {
    const resolvedPath = process.env.CONFIG_PATH || path.resolve(__dirname, "../../../app.config.json");
    const absolutePath = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(process.cwd(), resolvedPath);
    const content = fs.readFileSync(absolutePath, "utf-8");
    res.json({ success: true, data: JSON.parse(content) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/config", async (req: any, res) => {
  try {
    const resolvedPath = process.env.CONFIG_PATH || path.resolve(__dirname, "../../../app.config.json");
    const absolutePath = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(process.cwd(), resolvedPath);
    fs.writeFileSync(absolutePath, JSON.stringify(req.body, null, 2), "utf-8");
    
    // Hot-reload config and routes
    reloadConfig();
    apiRoutes = generateRoutes();
    
    res.json({ success: true, data: "Configuration saved and reloaded successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Export routes (Admin check REMOVED) ---
app.post("/api/export/gist", async (req: any, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      res.status(400).json({ success: false, error: "GITHUB_TOKEN env variable not set in backend." });
      return;
    }
    const resolvedPath = process.env.CONFIG_PATH || path.resolve(__dirname, "../../../app.config.json");
    const absolutePath = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(process.cwd(), resolvedPath);
    const content = fs.readFileSync(absolutePath, "utf-8");
    
    const githubRes = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: "Config Platform app.config.json export",
        public: false,
        files: { "app.config.json": { content } }
      })
    });
    const data = await githubRes.json() as any;
    if (!githubRes.ok) throw new Error(data.message || "Failed to create gist");
    
    res.json({ success: true, data: { url: data.html_url } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Full project export to GitHub repo ---
app.post("/api/export/repo", async (req: any, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token || token === "your_github_personal_access_token_here") {
      res.status(400).json({ success: false, error: "GITHUB_TOKEN env variable not configured. Set a valid GitHub PAT with repo scope." });
      return;
    }

    const resolvedPath = process.env.CONFIG_PATH || path.resolve(__dirname, "../../../app.config.json");
    const absolutePath = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(process.cwd(), resolvedPath);
    const configContent = fs.readFileSync(absolutePath, "utf-8");
    const parsedConfig = JSON.parse(configContent);
    const repoName = `config-app-${parsedConfig.app?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "export"}-${Date.now().toString(36)}`;

    // Step 1: Create the repository
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoName,
        description: `Config-driven app: ${parsedConfig.app?.name || "Untitled"} — exported from Config Platform`,
        private: true,
        auto_init: true,
      }),
    });
    const repoData = await createRes.json() as any;
    if (!createRes.ok) throw new Error(repoData.message || "Failed to create repository");

    const owner = repoData.owner.login;

    // Step 2: Create project files in the repo via GitHub Contents API
    const files: Record<string, string> = {
      "app.config.json": configContent,
      ".gitignore": "node_modules\n.env\n.next\ndist\n*.log\n.DS_Store",
      "README.md": `# ${parsedConfig.app?.name || "Config App"}

> Auto-generated from Config Platform

## Configuration
The \`app.config.json\` file defines the entire application:
- **Entities:** ${parsedConfig.database?.entities?.map((e: any) => e.name).join(", ") || "None"}
- **Pages:** ${parsedConfig.ui?.pages?.map((p: any) => p.title || p.route).join(", ") || "None"}
- **Auth:** ${parsedConfig.auth?.methods?.join(", ") || "email"}

## Getting Started
1. Clone this repo
2. Run \`npm install\` in both \`backend/\` and \`frontend/\`
3. Set up PostgreSQL and configure \`backend/.env\`
4. Run \`npx prisma db push\` in \`backend/\`
5. Run \`npm run dev\` from root

## Architecture
- **Frontend:** Next.js (React) — config-driven UI rendering
- **Backend:** Express + Prisma — dynamic CRUD API generation
- **Database:** PostgreSQL with JSONB storage — no migrations needed
`,
      "backend/package.json": JSON.stringify({
        name: `${repoName}-backend`,
        version: "1.0.0",
        scripts: { dev: "npx tsx src/server.ts", build: "tsc", start: "node dist/server.js" },
        dependencies: {
          express: "^4.18.0", cors: "^2.8.0", dotenv: "^16.0.0",
          "@prisma/client": "^5.0.0", uuid: "^9.0.0", jsonwebtoken: "^9.0.0",
          zod: "^3.22.0", multer: "^1.4.0", "csv-parse": "^5.5.0", nodemailer: "^6.9.0", axios: "^1.6.0"
        },
        devDependencies: { typescript: "^5.0.0", "@types/express": "^4.17.0", "@types/node": "^20.0.0", tsx: "^4.0.0" }
      }, null, 2),
      "backend/.env.example": `DATABASE_URL=postgresql://user:password@localhost:5432/configplatform\nJWT_SECRET=your-secret-key\nPORT=4000`,
      "frontend/package.json": JSON.stringify({
        name: `${repoName}-frontend`,
        version: "1.0.0",
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: {
          next: "14.0.0", react: "^18.2.0", "react-dom": "^18.2.0",
          lucide_react: "^0.284.0", clsx: "^2.0.0", "tailwind-merge": "^1.14.0"
        }
      }, null, 2),
      "frontend/next.config.js": "/** @type {import('next').NextConfig} */\nconst nextConfig = { reactStrictMode: true };\nmodule.exports = nextConfig;",
      "frontend/src/app/layout.tsx": "export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (<html><body>{children}</body></html>);\n}",
      "frontend/src/app/page.tsx": "export default function Home() {\n  return (<div><h1>Welcome to your Config App</h1><p>Check app.config.json to see your structure.</p></div>);\n}",
    };

    for (const [filePath, content] of Object.entries(files)) {
      const encoded = Buffer.from(content).toString("base64");
      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add ${filePath}`,
          content: encoded,
        }),
      });
      if (!putRes.ok) {
        const errBody = await putRes.json() as any;
        console.warn(`⚠️ Failed to create ${filePath}: ${errBody.message}`);
      }
    }

    console.log(`✅ Repository created: ${repoData.html_url}`);
    res.json({ success: true, data: { url: repoData.html_url, name: repoName } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Dynamic CRUD routes ---
console.log("\n📦 Registering dynamic routes:");
let apiRoutes = generateRoutes();
app.use("/api", (req, res, next) => apiRoutes(req, res, next));

// --- Error handler (must be last) ---
app.use(errorHandler);

// --- Start server ---
async function start() {
  try {
    await prisma.$connect();
    console.log("\n✅ Database connected");
    app.listen(PORT, () => {
      console.log(`\n🌐 Backend running at http://localhost:${PORT}`);
      console.log(`   Config: ${config.app.name}`);
      console.log(`   Entities: ${config.database.entities.map((e) => e.name).join(", ")}`);
      console.log(`   Theme: ${config.app.theme} | Locale: ${config.app.locale}\n`);
    });
  } catch (err: any) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
}

start();
