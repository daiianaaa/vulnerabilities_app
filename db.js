import Database from "better-sqlite3";

export function openDb() {
  const db = new Database("app.db");
  db.pragma("journal_mode = WAL");
  return db;
}