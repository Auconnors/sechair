const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "sechair.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)",
  );
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/state", (req, res) => {
  db.get("SELECT payload FROM app_state WHERE id = 1", (err, row) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
      return;
    }
    if (!row) {
      res.json(null);
      return;
    }
    try {
      res.json(JSON.parse(row.payload));
    } catch (parseError) {
      res.status(500).json({ error: "Invalid stored payload" });
    }
  });
});

app.put("/api/state", (req, res) => {
  const body = req.body || {};
  if (Array.isArray(body.accounts)) {
    body.accounts = body.accounts.map((account) => {
      if (account.password && !account.passwordHash) {
        const hash = crypto.createHash("sha256").update(account.password).digest("hex");
        const { password, ...rest } = account;
        return { ...rest, passwordHash: hash };
      }
      if (account.password) {
        const { password, ...rest } = account;
        return rest;
      }
      return account;
    });
  }
  const payload = JSON.stringify(body);
  db.run(
    "INSERT INTO app_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
    payload,
    (err) => {
      if (err) {
        res.status(500).json({ error: "Database error" });
        return;
      }
      res.json({ ok: true });
    },
  );
});

app.listen(port, () => {
  console.log(`SeChair backend running on http://localhost:${port}`);
});
