const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tasks.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    due TEXT,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

module.exports = db;