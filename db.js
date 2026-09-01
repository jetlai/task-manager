const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tasks.db'));

// Runs once = creates the table only if it doesn't already exist 
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    due TEXT,
    completed INTEGER DEFAULT 0
    )
`); 

module.exports = db;

