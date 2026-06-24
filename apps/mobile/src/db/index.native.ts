import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export const SCHEMA_VERSION = 3;

export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  op TEXT NOT NULL,
  client_id TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT 'wallet',
  color TEXT NOT NULL DEFAULT '#4ecdc4',
  initial_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4ecdc4',
  icon_type TEXT NOT NULL DEFAULT 'preset',
  icon_key TEXT,
  icon_storage_key TEXT,
  icon_local_uri TEXT,
  icon_sync_status TEXT NOT NULL DEFAULT 'synced',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  comment TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS transaction_labels (
  transaction_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (transaction_id, label_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  transaction_id TEXT NOT NULL,
  storage_key TEXT,
  thumbnail_key TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  local_uri TEXT,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
`;

const MIGRATION_V2_SQL = `
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  from_account_id TEXT NOT NULL,
  to_account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  comment TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS recurring_payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL,
  next_run_at TEXT NOT NULL,
  label_names TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  due_at TEXT NOT NULL,
  recurrence TEXT,
  notes TEXT,
  completed_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  client_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const MIGRATION_V3_SQL = `
ALTER TABLE recurring_payments ADD COLUMN type TEXT NOT NULL DEFAULT 'expense';
ALTER TABLE recurring_payments ADD COLUMN comment TEXT;
ALTER TABLE recurring_payments ADD COLUMN label_ids TEXT;
ALTER TABLE reminders ADD COLUMN recurring_payment_id TEXT;
ALTER TABLE reminders ADD COLUMN payload TEXT;
`;

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'schema_version'"
  );
  const current = row ? Number(row.value) : 0;
  if (current < 1) {
    await database.execAsync(MIGRATION_SQL);
    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '1')"
    );
  }
  if (current < 2) {
    await database.execAsync(MIGRATION_V2_SQL);
    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '2')"
    );
  }
  if (current < 3) {
    await migrateV3(database);
    await database.runAsync(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', '3')"
    );
  }
}

async function migrateV3(database: SQLite.SQLiteDatabase): Promise<void> {
  const recurringCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info(recurring_payments)");
  const recurringNames = new Set(recurringCols.map((c) => c.name));
  if (!recurringNames.has("type")) {
    await database.execAsync("ALTER TABLE recurring_payments ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'");
  }
  if (!recurringNames.has("comment")) {
    await database.execAsync("ALTER TABLE recurring_payments ADD COLUMN comment TEXT");
  }
  if (!recurringNames.has("label_ids")) {
    await database.execAsync("ALTER TABLE recurring_payments ADD COLUMN label_ids TEXT");
  }
  const reminderCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info(reminders)");
  const reminderNames = new Set(reminderCols.map((c) => c.name));
  if (!reminderNames.has("recurring_payment_id")) {
    await database.execAsync("ALTER TABLE reminders ADD COLUMN recurring_payment_id TEXT");
  }
  if (!reminderNames.has("payload")) {
    await database.execAsync("ALTER TABLE reminders ADD COLUMN payload TEXT");
  }
}

export async function getLocalDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("spend_tracker_local.db");
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await runMigrations(db);
  }
  return db;
}

export async function getMeta(key: string): Promise<string | null> {
  const database = await getLocalDb();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    key
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const database = await getLocalDb();
  await database.runAsync(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    key,
    value
  );
}

export async function clearLocalData(): Promise<void> {
  const database = await getLocalDb();
  await database.execAsync(`
    DELETE FROM attachments;
    DELETE FROM transaction_labels;
    DELETE FROM transactions;
    DELETE FROM transfers;
    DELETE FROM recurring_payments;
    DELETE FROM reminders;
    DELETE FROM labels;
    DELETE FROM categories;
    DELETE FROM accounts;
    DELETE FROM sync_queue;
    DELETE FROM sync_conflicts;
    DELETE FROM sync_meta WHERE key = 'last_sync_at';
  `);
}
