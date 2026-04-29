# Config-Driven App Platform — Base44 Engine

> A platform where a **single JSON file** defines an entire application — UI, APIs, database schema, auth, and notifications. No hardcoding. Everything generated at runtime.

---

## Quick Start

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** (running instance)

### 1. Install
```bash
npm install
```

### 2. Configure Environment
```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/configplatform"
JWT_SECRET="your-secret-key"
PORT=4000

# Optional features:

SMTP_HOST="smtp.example.com"  # For email notifications
```

### 3. Database Setup
```bash
cd backend
npx prisma db push
npm run seed   # Optional: seeds demo user (demo@example.com / password123)
```

### 4. Run
```bash
# From root
npm run dev    # Starts frontend (port 3000) + backend (port 4000)
```

---

## Architecture

```
app.config.json (Single Source of Truth)
       │
       ├─► Backend Engine
       │     ├── routeGenerator.ts   → Dynamic CRUD APIs (Express Router)
       │     ├── validationLayer.ts  → Zod schemas auto-built from field defs
       │     ├── config/loader.ts    → Config load + hot-reload
       │     └── services/
       │           ├── notifier.ts   → SSE-based real-time notifications
       │           └── csvImporter.ts → CSV upload → validate → store
       │
       └─► Frontend Engine (Next.js App Router)
             ├── ConfigContext.tsx    → Fetches config from backend
             ├── ComponentRegistry.tsx → type string → React component
             ├── PageRenderer.tsx    → Renders pages from config.ui.pages[]
             └── I18nContext.tsx     → Multi-language (en/es/pt/zh)
```

### Database Schema
Single `Record` table with a `data: JSONB` column handles **all entities**:
```
Record { id, entityName, userId, data: JSONB, createdAt, updatedAt }
```
This means adding a new entity in config requires **zero database migrations**.

---

## Features Implemented

### Core Platform
| Feature | How It Works |
|---|---|
| **Config-driven UI** | `config.ui.pages[].components[]` → ComponentRegistry → React |
| **Config-driven APIs** | `config.apis[].operations[]` → Express routes generated at startup |
| **Config-driven DB** | JSONB-backed `Record` table — schema-free, migration-free |
| **Config-driven Validation** | Zod schemas auto-built from `config.database.entities[].fields[]` |
| **Hot-reload config** | POST `/api/config` → reloads routes + UI without restart |
| **Unknown component handling** | `UnknownFallback` — never crashes on missing component types |
| **Missing entity handling** | Graceful 404 with available entity list |
| **Edge case: bad config JSON** | Zod validation at load time with detailed error messages |

### Mandatory Features (3+ implemented)

#### 1. Multi-Language / Localization
- 4 languages: English, Spanish, Portuguese, Chinese
- Dynamic switching via locale switcher in header
- Persisted to `localStorage`
- Falls back to English for missing keys
- `document.documentElement.lang` updated for accessibility

#### 2. CSV Import System
- Drag-and-drop or click-to-browse
- Auto-maps CSV columns to entity fields (case-insensitive)
- Validates each row against entity schema
- Reports imported/failed counts + per-row error details
- Triggers table refresh via custom browser event

#### 3. Event-Based Notifications (SSE)
- Config-driven: `config.notifications[].on` triggers
- Real-time toast notifications via Server-Sent Events
- Optional email via SMTP (Nodemailer) if configured
- No WebSocket complexity

#### 4. Dark Mode
- Full dark/light toggle with `localStorage` persistence
- CSS custom properties — every component adapts
- Sun/moon icon toggle in sidebar footer


### Authentication
- Email + password (SHA-256 hashed, JWT sessions, 7-day expiry)
- User-scoped data: each user only sees their own records
- Settings page (config editor), config save: Accessible to all authenticated users

### PWA
- `manifest.json` + service worker (`sw.js`)
- Installable on mobile and desktop

---

## Deployment

### Frontend (Vercel)
- The frontend is configured for deployment on Vercel.
- Environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) should be set in the Vercel dashboard.

### Backend (Railway/Render)
- The backend should be deployed to a service like Railway or Render that supports long-running Node.js processes and PostgreSQL.

---

## Extensibility

### Adding a new UI component (1 line)
```typescript
// frontend/src/engine/ComponentRegistry.tsx
import MyComponent from "@/components/MyComponent";
registry["my_type"] = MyComponent;
```

Then use it in config:
```json
{ "type": "my_type", "entity": "MyEntity" }
```

### Adding a new entity (config only, no code)
```json
{
  "database": {
    "entities": [{
      "name": "Invoice",
      "fields": [
        { "name": "amount", "type": "number", "required": true, "label": "Amount" },
        { "name": "paid", "type": "boolean", "label": "Paid" }
      ]
    }]
  },
  "apis": [{ "entity": "Invoice", "operations": ["list", "create", "update", "delete"] }],
  "ui": { "pages": [{ "route": "/invoices", "title": "Invoices", "components": [{ "type": "table", "entity": "Invoice" }] }] }
}
```
**No code changes. No migrations.** Just save the config.

---

## Edge Cases & Tradeoffs

### Config Robustness
- **Unknown `type` in components[]** → renders `UnknownFallback` with the unrecognised type shown
- **Entity in UI but not in `apis[]`** → table renders empty, no crash
- **Missing required fields in config** → Zod fails fast with field-level error messages
- **Partial config (missing `notifications`, `apis`)** → defaults to empty arrays, no crash

### Auth
- Email + password (bcrypt hashed, JWT sessions, 7-day expiry)
- User-scoped data: each user only sees their own records

### Database
- JSONB stores all entity data — schema mismatches are ignored
- Adding a field to an entity in config is **backward-compatible**
- Removing a field is safe — old data is preserved in JSONB but not exposed

### Config Hot-reload Limitation
- Adding a **new entity** to `apis[]` requires a backend restart because Express routes are registered at startup
- UI changes (titles, component order) reflect immediately on next page refresh

---

## Project Structure

```
/
├── app.config.json          # Single source of truth
├── backend/
│   ├── src/
│   │   ├── server.ts        # Express app, auth routes, stats, CSV
│   │   ├── engine/
│   │   │   ├── routeGenerator.ts   # Dynamic CRUD router
│   │   │   └── validationLayer.ts  # Zod schema builder
│   │   ├── config/
│   │   │   ├── loader.ts    # Config load + validation + hot-reload
│   │   │   └── schema.ts    # Config shape (Zod)
│   │   ├── middleware/
│   │   │   ├── auth.ts      # JWT verification
│   │   │   └── errorHandler.ts
│   │   └── services/
│   │       ├── notifier.ts  # SSE broadcast + email
│   │       └── csvImporter.ts
│   └── prisma/schema.prisma
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx     # App shell, sidebar, header, auth
│       │   └── globals.css  # Full design system (light + dark)
│       ├── engine/
│       │   ├── ComponentRegistry.tsx  # type → component map
│       │   ├── ConfigContext.tsx       # Config fetch + cache
│       │   ├── I18nContext.tsx         # Multi-language
│       │   ├── PageRenderer.tsx        # Config → UI
│       │   └── ThemeContext.tsx        # Dark/light toggle
│       └── components/
│           ├── DynamicDashboard.tsx   # Stats cards + activity
│           ├── DynamicForm.tsx        # Config-driven create form
│           ├── DynamicTable.tsx       # Config-driven data table
│           ├── CsvImporter.tsx        # CSV drag-drop import
│           ├── SchemaEditor.tsx       # Live config editor
│           ├── LocaleSwitcher.tsx     # Language picker
│           └── NotificationToast.tsx  # SSE toast renderer
└── shared/
    └── types.ts             # Shared TypeScript interfaces
```
