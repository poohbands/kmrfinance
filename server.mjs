import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql, initSchema } from "./db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const router = express.Router();

// Health / Status endpoint
router.get("/status", async (req, res) => {
  try {
    if (!sql) {
      return res.status(503).json({ ok: false, error: "Database not connected" });
    }
    await sql`SELECT 1`;
    res.json({
      ok: true,
      mode: "neon",
      branch: process.env.NEON_BRANCH || "production",
      message: "Connected to Neon Postgres"
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Load all data
router.get("/data", async (req, res) => {
  try {
    const [monthsRows, inventoryRows, usersRows, auditRows] = await Promise.all([
      sql`SELECT key, doc FROM months`,
      sql`SELECT doc FROM inventory WHERE id = 'default'`,
      sql`SELECT username, doc FROM users`,
      sql`SELECT id, doc FROM audit ORDER BY created_at DESC LIMIT 500`
    ]);

    const months = {};
    for (const row of monthsRows) {
      months[row.key] = row.doc;
    }

    const admin = inventoryRows.length > 0 ? inventoryRows[0].doc : { carry: null, cogs: {} };

    const users = {};
    for (const row of usersRows) {
      users[row.username] = row.doc;
    }

    const audit = auditRows.map(row => row.doc);

    res.json({ ok: true, months, admin, users, audit });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Save month doc
router.post("/months/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const doc = req.body;
    await sql`
      INSERT INTO months (key, doc, updated_at)
      VALUES (${key}, ${JSON.stringify(doc)}, NOW())
      ON CONFLICT (key) DO UPDATE
      SET doc = EXCLUDED.doc, updated_at = NOW()
    `;
    res.json({ ok: true });
  } catch (err) {
    console.error("Error saving month:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Save admin doc (carry & cogs)
router.post("/admin", async (req, res) => {
  try {
    const doc = req.body;
    await sql`
      INSERT INTO inventory (id, doc, updated_at)
      VALUES ('default', ${JSON.stringify(doc)}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET doc = EXCLUDED.doc, updated_at = NOW()
    `;
    res.json({ ok: true });
  } catch (err) {
    console.error("Error saving admin:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Save user doc
router.post("/users/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const doc = req.body;
    await sql`
      INSERT INTO users (username, doc, updated_at)
      VALUES (${username}, ${JSON.stringify(doc)}, NOW())
      ON CONFLICT (username) DO UPDATE
      SET doc = EXCLUDED.doc, updated_at = NOW()
    `;
    res.json({ ok: true });
  } catch (err) {
    console.error("Error saving user:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Remove user
router.delete("/users/:username", async (req, res) => {
  try {
    const username = req.params.username;
    await sql`DELETE FROM users WHERE username = ${username}`;
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Log audit
router.post("/audit", async (req, res) => {
  try {
    const doc = req.body;
    const id = doc.id || (Date.now() + "-" + Math.random().toString(36).slice(2, 8));
    await sql`
      INSERT INTO audit (id, doc, created_at)
      VALUES (${id}, ${JSON.stringify(doc)}, NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    res.json({ ok: true, id });
  } catch (err) {
    console.error("Error logging audit:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Mount router on both /api and / to handle any rewrite scenario
app.use("/api", router);
app.use(router);

export async function startServer(port = PORT) {
  await initSchema();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

// Start if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

export default app;
