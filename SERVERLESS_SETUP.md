# Serverless Save Setup (Vercel + Postgres)

This project now includes a serverless page backend for save/load using Vercel Functions.

## What was added

- `api/pages/index.js`
  - `GET /api/pages` list pages
  - `POST /api/pages` create page
- `api/pages/[id].js`
  - `GET /api/pages/:id` fetch page
  - `PUT /api/pages/:id` save page scene
  - `DELETE /api/pages/:id` delete page
- `api/_db.js`
  - Postgres connection pool
  - Automatic table bootstrap (`pages` table)

The frontend adds `New Page`, `Open Page`, and `Save` controls in the footer.

## Required env vars

Set these in Vercel Project Settings -> Environment Variables:

```env
DATABASE_URL=postgresql://...
```

Optional for future binary blob uploads:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
DIRECT_URL=postgresql://... # only if you later add Prisma migrations
```

## Table schema

The API auto-creates:

```sql
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  scene_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Usage

1. Open app
2. Click `New Page`
3. Draw
4. Click `Save`
5. Click `Open Page` to load any saved page

## Notes

- This is intentionally single-user page storage, no real-time collaboration.
- Scene data (elements/appState/files) is stored inside `scene_json`.
