import { sql } from "./db.mjs";

async function resetDatabase() {
  console.log("Connecting to Neon Postgres to reset data...");
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  // 1. Delete all months data
  await sql`DELETE FROM months;`;
  console.log("✔ Cleared table: months");

  // 2. Reset admin inventory (carry: null, cogs: {})
  await sql`
    INSERT INTO inventory (id, doc, updated_at)
    VALUES ('default', '{"carry": null, "cogs": {}}', NOW())
    ON CONFLICT (id) DO UPDATE
    SET doc = EXCLUDED.doc, updated_at = NOW();
  `;
  console.log("✔ Reset table: inventory (carry: null, cogs: {})");

  // 3. Clear all custom users
  await sql`DELETE FROM users;`;
  console.log("✔ Cleared table: users (default admin remains active via code)");

  // 4. Clear audit logs
  await sql`DELETE FROM audit;`;
  console.log("✔ Cleared table: audit");

  // 5. Insert an initial audit entry
  const initAudit = {
    id: "init-" + Date.now(),
    at: new Date().toISOString(),
    by: "system",
    byName: "ระบบ",
    action: "เริ่มต้นระบบใหม่ (ล้างข้อมูลทั้งหมดเป็น 0)",
    month: "",
    changes: []
  };
  await sql`
    INSERT INTO audit (id, doc, created_at)
    VALUES (${initAudit.id}, ${JSON.stringify(initAudit)}, NOW());
  `;
  console.log("✔ Created initial clean audit log");

  console.log("\n=== Database reset complete: All data reset to 0/clean state ===");
}

resetDatabase().catch(err => {
  console.error("Reset failed:", err);
  process.exit(1);
});
