import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set in environment or .env.local");
}

export const sql = connectionString ? neon(connectionString) : null;

export async function initSchema() {
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  
  await sql`
    CREATE TABLE IF NOT EXISTS months (
      key VARCHAR(32) PRIMARY KEY,
      doc JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS inventory (
      id VARCHAR(32) PRIMARY KEY,
      doc JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      username VARCHAR(64) PRIMARY KEY,
      doc JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit (
      id VARCHAR(64) PRIMARY KEY,
      doc JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  console.log("Neon Postgres tables initialized successfully.");
}
