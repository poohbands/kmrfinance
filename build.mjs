import { sql, initSchema } from "./db.mjs";
import fs from "node:fs";
import path from "node:path";

console.log("=== Building kmrfinance ===");

// 1. Verify index.html exists
if (!fs.existsSync(path.resolve("index.html"))) {
  console.error("Error: index.html not found!");
  process.exit(1);
}
console.log("✔ Verified index.html");

// 2. Prepare public directory for static hosting on Vercel
fs.mkdirSync("public", { recursive: true });
fs.copyFileSync("index.html", path.join("public", "index.html"));
if (fs.existsSync("excel")) {
  fs.cpSync("excel", path.join("public", "excel"), { recursive: true });
}
console.log("✔ Prepared public/ directory (index.html, excel/)");

// 3. Verify and initialize Neon Postgres schema
try {
  if (sql) {
    console.log("Verifying Neon Postgres connection and schema...");
    await initSchema();
    console.log("✔ Neon Postgres tables verified: months, inventory, users, audit");
  } else {
    console.log("ℹ DATABASE_URL not set in this build step; schema init skipped.");
  }
} catch (err) {
  console.warn("Notice: Neon schema initialization during build:", err.message);
}

console.log("=== Build complete: SUCCESS ===");
