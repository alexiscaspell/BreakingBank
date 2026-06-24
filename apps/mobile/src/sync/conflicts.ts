import { getLocalDb } from "../db";

export type SyncConflict = {
  id: number;
  entity: string;
  client_id: string;
  message: string;
  created_at: string;
};

export async function logConflict(
  entity: string,
  clientId: string,
  message: string
): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync(
    "INSERT INTO sync_conflicts (entity, client_id, message) VALUES (?, ?, ?)",
    entity,
    clientId,
    message
  );
}

export async function listConflicts(): Promise<SyncConflict[]> {
  const db = await getLocalDb();
  return db.getAllAsync(
    "SELECT id, entity, client_id, message, created_at FROM sync_conflicts ORDER BY id DESC LIMIT 50"
  );
}

export async function getConflictCount(): Promise<number> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) as n FROM sync_conflicts"
  );
  return row?.n ?? 0;
}

export async function clearConflicts(): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync("DELETE FROM sync_conflicts");
}
