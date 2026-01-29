import express from "express";
import cookieParser from "cookie-parser";
import { openDb } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const app = express();
const db = openDb();

const MODE = process.env.MODE || "vulnerable"; // "vulnerable" | "fixed"
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "127.0.0.1"; // keep local by default

app.use(cookieParser());
app.use(express.urlencoded({ extended: false })); // for form posts
app.use("/public", express.static("public"));

function render(res, viewName, params = {}) {
  const layout = fs.readFileSync(path.join("views", "layout.html"), "utf8");
  const view = fs.readFileSync(path.join("views", viewName), "utf8");

  const html = layout
    .replace("{{content}}", view)
    .replaceAll("{{MODE}}", MODE)
    .replaceAll("{{title}}", params.title || "My Vuln Lab")
    .replaceAll("{{message}}", params.message || "")
    .replaceAll("{{results}}", params.results || "")
    .replaceAll("{{q}}", params.q || "")
    .replaceAll("{{csrf}}", params.csrf || "");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

// --- basic session (cookie) ---
function setSession(res, userId) {
  // super simplistic session (for learning). For real apps, use signed sessions + server-side storage.
  res.cookie("uid", String(userId), { httpOnly: true, sameSite: "lax" });
}
function getUserId(req) {
  const uid = req.cookies.uid;
  return uid ? Number(uid) : null;
}

// Optional CSRF token (only used in fixed mode to show best practices later)
function getOrSetCsrf(req, res) {
  let token = req.cookies.csrf;
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    res.cookie("csrf", token, { httpOnly: true, sameSite: "lax" });
  }
  return token;
}

app.get("/", (req, res) => {
  render(res, "home.html", { title: "Home" });
});

// -------- LAB 1: SQL Injection (login/search) --------
app.get("/labs/sqli", (req, res) => {
  render(res, "login.html", { title: "Lab: SQLi (Login)", message: "" });
});

app.post("/labs/sqli/login", (req, res) => {
  const { username = "", password = "" } = req.body;

  try {
    let user;

    if (MODE === "vulnerable") {
      // INTENTIONALLY VULNERABLE: string concatenation in SQL query
      const sql = `SELECT id, username FROM users WHERE username = '${username}' AND password = '${password}'`;
      user = db.prepare(sql).get();
    } else {
      // FIXED: parameterized query
      user = db.prepare("SELECT id, username FROM users WHERE username = ? AND password = ?").get(username, password);
    }

    if (!user) {
      return render(res, "login.html", { title: "Lab: SQLi (Login)", message: "Login failed." });
    }

    setSession(res, user.id);
    return render(res, "login.html", { title: "Lab: SQLi (Login)", message: `Logged in as ${user.username}.` });
  } catch (e) {
    return render(res, "login.html", { title: "Lab: SQLi (Login)", message: `Error: ${String(e.message || e)}` });
  }
});

app.get("/labs/sqli/search", (req, res) => {
  const q = String(req.query.q || "");
  let results = "";

  try {
    if (q) {
      let rows;

      if (MODE === "vulnerable") {
        // INTENTIONALLY VULNERABLE: query built from raw input
        const sql = `SELECT id, username FROM users WHERE username LIKE '%${q}%'`;
        rows = db.prepare(sql).all();
      } else {
        // FIXED: parameterized LIKE
        rows = db.prepare("SELECT id, username FROM users WHERE username LIKE ?").all(`%${q}%`);
      }

      results = rows.map(r => `<li>${escapeHtml(r.username)}</li>`).join("");
      results = results ? `<ul>${results}</ul>` : "<p>No results.</p>";
    }

    render(res, "search.html", { title: "Lab: SQLi (Search)", q: escapeHtml(q), results });
  } catch (e) {
    render(res, "search.html", { title: "Lab: SQLi (Search)", q: escapeHtml(q), results: `<p>Error.</p>` });
  }
});

// -------- LAB 2: Reflected XSS --------
app.get("/labs/xss", (req, res) => {
  const q = String(req.query.q || "");
  let message = "";

  if (q) {
    if (MODE === "vulnerable") {
      // INTENTIONALLY VULNERABLE: reflect raw input into HTML
      message = `You searched for: ${q}`;
    } else {
      // FIXED: escape HTML before rendering
      message = `You searched for: ${escapeHtml(q)}`;
    }
  }

  render(res, "xss.html", { title: "Lab: Reflected XSS", message, q: escapeHtml(q) });
});

// -------- (Optional) IDOR lab later: notes by owner_id --------
app.get("/labs/notes", (req, res) => {
  const uid = getUserId(req);
  if (!uid) return res.status(401).send("Login first via /labs/sqli");

  const id = Number(req.query.id || uid); // intentionally simplistic
  const rows = db.prepare("SELECT id, content FROM notes WHERE owner_id = ?").all(id);
  const list = rows.map(r => `<li>${escapeHtml(r.content)}</li>`).join("");
  res.send(`<h1>Notes</h1><p>MODE: ${MODE}</p><ul>${list}</ul><p><a href="/">Home</a></p>`);
});

// -------- Admin: reset DB (local only) --------
app.post("/admin/reset", (_req, res) => {
  // in practice, protect this; for local labs you can keep it simple
  // easiest: instruct to run npm run reset
  res.status(200).send("Run: npm run reset (server-side).");
});

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.listen(PORT, HOST, () => {
  console.log(`My Vuln Lab running at http://${HOST}:${PORT}`);
  console.log(`MODE=${MODE} (set MODE=fixed to show mitigations)`);
});