import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(
  databaseUrl &&
    !databaseUrl.includes("user:password") &&
    !databaseUrl.includes("ep-cool-name")
);

const sql = isDatabaseConfigured ? neon(databaseUrl) : null;

export const db = sql ? drizzle(sql) : null;
