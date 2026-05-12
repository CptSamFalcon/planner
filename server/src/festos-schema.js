/**
 * Fest OS: email accounts, festivals (tenants), admin + member roles, email invites.
 * Runs during initDb after app_kv exists.
 */
export function migrateFestOsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS festos_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_festos_users_email ON festos_users (email);

    CREATE TABLE IF NOT EXISTS festivals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_user_id) REFERENCES festos_users(id)
    );

    CREATE TABLE IF NOT EXISTS festival_memberships (
      festival_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (festival_id, user_id),
      FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES festos_users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_festival_memberships_user ON festival_memberships (user_id);

    CREATE TABLE IF NOT EXISTS festival_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      festival_id INTEGER NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      token_hash TEXT NOT NULL UNIQUE,
      invited_by_user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      accepted_user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_user_id) REFERENCES festos_users(id),
      FOREIGN KEY (accepted_user_id) REFERENCES festos_users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_festival_invites_festival ON festival_invites (festival_id);
    CREATE INDEX IF NOT EXISTS idx_festival_invites_lookup ON festival_invites (festival_id, email);
  `);
}
