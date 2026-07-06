const { Pool } = require("pg");

const globalForDb = globalThis;

if (!globalForDb.__excalidrawPool && process.env.DATABASE_URL) {
  globalForDb.__excalidrawPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

if (!globalForDb.__excalidrawSchemaInitPromise && globalForDb.__excalidrawPool) {
  globalForDb.__excalidrawSchemaInitPromise = globalForDb.__excalidrawPool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      scene_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

const pool = globalForDb.__excalidrawPool;
const schemaInitPromise = globalForDb.__excalidrawSchemaInitPromise;

const ensureSchema = async () => {
  if (!pool || !schemaInitPromise) {
    throw new Error("DATABASE_URL is required for API routes");
  }
  await schemaInitPromise;
};

module.exports = {
  pool,
  ensureSchema,
};
