import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db = null;

export function initDb(dataDir) {
  if (db) return db;
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'planner.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'going',
      note TEXT,
      contact_number TEXT,
      wristband TEXT,
      campsite_id INTEGER,
      vehicle_id INTEGER,
      shelter_packing_id INTEGER,
      bed_packing_id INTEGER,
      bedding_packing_id INTEGER,
      pre_party INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate existing DBs: add new columns if missing
  const memberCols = ['contact_number', 'wristband'];
  for (const col of memberCols) {
    try {
      db.exec(`ALTER TABLE members ADD COLUMN ${col} TEXT`);
    } catch (_) {
      /* column already exists */
    }
  }
  const memberIdCols = ['campsite_id', 'vehicle_id', 'shelter_packing_id', 'bed_packing_id', 'bedding_packing_id', 'pre_party'];
  for (const col of memberIdCols) {
    try {
      db.exec(`ALTER TABLE members ADD COLUMN ${col} INTEGER`);
    } catch (_) {
      /* column already exists */
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS campsites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      vehicle_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec('ALTER TABLE vehicles ADD COLUMN capacity INTEGER');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE campsites ADD COLUMN vehicle_id INTEGER');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE campsites ADD COLUMN area TEXT');
  } catch (_) {}

  db.exec(`

    CREATE TABLE IF NOT EXISTS packing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      campsite_id INTEGER,
      item_type TEXT,
      occupants INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec('ALTER TABLE packing ADD COLUMN campsite_id INTEGER');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE packing ADD COLUMN item_type TEXT');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE packing ADD COLUMN occupants INTEGER');
  } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS packing_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      vehicle_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec('ALTER TABLE packing_lists ADD COLUMN vehicle_id INTEGER');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE packing ADD COLUMN packing_list_id INTEGER');
  } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      time TEXT,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate existing notes: add created_at if missing (old schema had updated_at)
  try {
    db.exec('ALTER TABLE notes ADD COLUMN created_at TEXT');
  } catch (_) {
    /* column already exists */
  }
  try {
    db.exec('UPDATE notes SET created_at = updated_at WHERE created_at IS NULL AND updated_at IS NOT NULL');
  } catch (_) {
    /* updated_at may not exist */
  }
  try {
    db.exec("UPDATE notes SET created_at = datetime('now') WHERE created_at IS NULL");
  } catch (_) {}

  // Schedule: add columns for multi-stage set times and meetups
  for (const col of ['end_time', 'stage_id', 'event_type']) {
    try {
      if (col === 'end_time') db.exec('ALTER TABLE schedule ADD COLUMN end_time TEXT');
      if (col === 'stage_id') db.exec('ALTER TABLE schedule ADD COLUMN stage_id INTEGER');
      if (col === 'event_type') db.exec("ALTER TABLE schedule ADD COLUMN event_type TEXT DEFAULT 'meetup'");
    } catch (_) { /* already exists */ }
  }
  try {
    db.exec("UPDATE schedule SET event_type = 'meetup' WHERE event_type IS NULL OR event_type = ''");
  } catch (_) {}

  // Seed default stages if none exist
  const stageCount = db.prepare('SELECT COUNT(*) AS n FROM schedule_stages').get();
  if (stageCount && stageCount.n === 0) {
    db.prepare(
      "INSERT INTO schedule_stages (name, sort_order) VALUES ('Main Stage', 0), ('Second Stage', 1), ('Hill Stage', 2)"
    ).run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_attendees (
      event_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      PRIMARY KEY (event_id, member_id),
      FOREIGN KEY (event_id) REFERENCES schedule(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
