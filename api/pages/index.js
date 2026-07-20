const crypto = require("crypto");
const { ensureSchema, pool } = require("../_db");
const { requireAuthorizedUser } = require("../_auth");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = async (req, res) => {
  try {
    if (!(await requireAuthorizedUser(req, res))) {
      return;
    }

    await ensureSchema();

    if (req.method === "GET") {
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, toInt(req.query?.limit, DEFAULT_LIMIT)),
      );
      const result = await pool.query(
        `
          SELECT id, title, created_at, updated_at
          FROM pages
          ORDER BY updated_at DESC
          LIMIT $1
        `,
        [limit],
      );
      return res.status(200).json({ pages: result.rows });
    }

    if (req.method === "POST") {
      const title =
        typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : "Untitled Page";
      const id = crypto.randomUUID();

      const result = await pool.query(
        `
          INSERT INTO pages (id, title, scene_json)
          VALUES ($1, $2, '{}'::jsonb)
          RETURNING id, title, created_at, updated_at
        `,
        [id, title],
      );

      return res.status(201).json({ page: result.rows[0] });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
