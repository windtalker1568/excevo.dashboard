const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultDb = {
  people: [],
  efficiency: [],
  quality: [],
  pips: [],
  imports: []
};

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
      return { ...defaultDb };
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return { ...defaultDb, ...data };
  } catch (err) {
    console.error('DB load error:', err.message);
    return { ...defaultDb };
  }
}

function save(db) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('DB save error:', err.message);
  }
}

let _db = load();

function getDb() {
  return _db;
}

function persist() {
  save(_db);
}

module.exports = { getDb, persist, load };
