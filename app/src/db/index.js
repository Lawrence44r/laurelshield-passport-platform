const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { applySchema } = require('./schema');

const dbPath = process.env.DB_PATH || './data/laurelshield.db';
const resolved = path.resolve(dbPath);
fs.mkdirSync(path.dirname(resolved), { recursive: true });

const db = new Database(resolved);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
applySchema(db);

module.exports = db;
