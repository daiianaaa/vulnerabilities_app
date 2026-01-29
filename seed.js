import { openDb } from "./db.js";
import crypto from "node:crypto";

const db = openDb();

db.exec(`
  DROP TABLE IF EXISTS users;
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0
  );

  DROP TABLE IF EXISTS flags;
  CREATE TABLE flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );

  DROP TABLE IF EXISTS notes;
  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    content TEXT NOT NULL
  );
`);

const insertUser = db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)");
insertUser.run("alice", "alice123", 0);
insertUser.run("bob", "bob123", 0);
insertUser.run("admin", "admin123", 1); // admin user

const flagValue = "FLAG-" + crypto.randomBytes(12).toString("hex");
db.prepare("INSERT INTO flags (name, value) VALUES (?, ?)").run("sqli_admin_flag", flagValue);

const insertNote = db.prepare("INSERT INTO notes (owner_id, content) VALUES (?, ?)");
insertNote.run(1, "Alice private note");
insertNote.run(2, "Bob private note");

console.log("DB seeded. Admin exists. Flag generated:", flagValue);