import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import { config } from "../config.js";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";

// Ensure data directory exists
const dbDir = dirname(config.databasePath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(config.databasePath);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Helper to check if column exists
function columnExists(table: string, column: string): boolean {
  const result = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return result.some((col) => col.name === column);
}

// Helper to safely add column
function addColumnIfNotExists(
  table: string,
  column: string,
  definition: string
) {
  if (!columnExists(table, column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Initialize database tables
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      response_status_code INTEGER NOT NULL DEFAULT 200,
      response_headers TEXT NOT NULL DEFAULT '{}',
      response_body TEXT NOT NULL DEFAULT '',
      forward_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      hook_id TEXT NOT NULL REFERENCES hooks(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      headers TEXT NOT NULL,
      body TEXT,
      content_type TEXT,
      forward_status_code INTEGER,
      forward_response_body TEXT,
      forward_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS replays (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      target_url TEXT NOT NULL,
      status_code INTEGER,
      response_body TEXT,
      error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_hook_id ON events(hook_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_replays_event_id ON replays(event_id);
  `);

  // Migration: Add new columns to existing tables
  addColumnIfNotExists(
    "hooks",
    "response_status_code",
    "INTEGER NOT NULL DEFAULT 200"
  );
  addColumnIfNotExists(
    "hooks",
    "response_headers",
    "TEXT NOT NULL DEFAULT '{}'"
  );
  addColumnIfNotExists("hooks", "response_body", "TEXT NOT NULL DEFAULT ''");
  addColumnIfNotExists("hooks", "forward_url", "TEXT");
  addColumnIfNotExists("events", "forward_status_code", "INTEGER");
  addColumnIfNotExists("events", "forward_response_body", "TEXT");
  addColumnIfNotExists("events", "forward_error", "TEXT");
}
