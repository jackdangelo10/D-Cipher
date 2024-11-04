const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the users database.");
  }
});

db.serialize(() => {
  // Create users table with family_id and roles
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    family_id INTEGER,
    roles TEXT DEFAULT 'user'
  )`, (err) => {
    if (err) {
      console.error("Error creating users table:", err.message);
    }
  });

  // Create passwords table with visibility settings and owner
  db.run(`CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    username TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    visibility TEXT CHECK (visibility IN ('private', 'family')) NOT NULL DEFAULT 'private',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error("Error creating passwords table:", err.message);
    }
  });
});

module.exports = db;