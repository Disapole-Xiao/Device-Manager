const Database = require('better-sqlite3');

const db = new Database('./db.sqlite');

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ip TEXT NOT NULL UNIQUE ON CONFLICT REPLACE,
      logged_in BOOLEAN
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      due INTEGER NOT NULL
    )
  `).run();
  
} catch (err) {
  console.error('Failed to create tables:', err);
}

module.exports = db;