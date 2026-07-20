const { ensureSchema, pool } = require("../_db");
const { requireAuthorizedUser } = require("../_auth");

const isValidScene = (scene) => {
  return (
    scene &&
    typeof scene === "object" &&
    Array.isArray(scene.elements) &&
    typeof scene.appState === "object"
  );
};

module.exports = async (req, res) => {
  const pageId = req.query?.id;

  if (!pageId || typeof pageId !== "string") {
    return res.status(400).json({ error: "Invalid page id" });
  }

  try {
    if (!(await requireAuthorizedUser(req, res))) {
      return;
    }

    await ensureSchema();

    if (req.method === "GET") {
      const result = await pool.query(
        `
          SELECT id, title, scene_json, created_at, updated_at
          FROM pages
          WHERE id = $1
        `,
        [pageId],
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Page not found" });
      }

      return res.status(200).json({ page: result.rows[0] });
    }

    if (req.method === "PUT") {
      const title =
        typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : "Untitled Page";
      const scene = req.body?.scene;

      if (!isValidScene(scene)) {
        return res.status(400).json({ error: "Invalid scene payload" });
      }

      const result = await pool.query(
        `
          UPDATE pages
          SET title = $2, scene_json = $3::jsonb, updated_at = NOW()
          WHERE id = $1
          RETURNING id, title, updated_at
        `,
        [pageId, title, JSON.stringify(scene)],
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Page not found" });
      }

      return res.status(200).json({ page: result.rows[0] });
    }

    if (req.method === "DELETE") {
      const result = await pool.query("DELETE FROM pages WHERE id = $1", [
        pageId,
      ]);
      if (!result.rowCount) {
        return res.status(404).json({ error: "Page not found" });
      }
      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
