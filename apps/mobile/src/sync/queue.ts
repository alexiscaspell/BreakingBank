import { getLocalDb } from "../db";
import type { SyncMutation } from "./types";

export async function enqueueMutation(mutation: SyncMutation): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync(
    "INSERT INTO sync_queue (entity, op, client_id, payload) VALUES (?, ?, ?, ?)",
    mutation.entity,
    mutation.op,
    mutation.client_id,
    mutation.payload ? JSON.stringify(mutation.payload) : null
  );
}

export async function getPendingMutations(): Promise<
  (SyncMutation & { queue_id: number })[]
> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{
    id: number;
    entity: string;
    op: string;
    client_id: string;
    payload: string | null;
  }>("SELECT id, entity, op, client_id, payload FROM sync_queue ORDER BY id ASC");
  return rows.map((r) => ({
    queue_id: r.id,
    entity: r.entity as SyncMutation["entity"],
    op: r.op as SyncMutation["op"],
    client_id: r.client_id,
    payload: r.payload ? JSON.parse(r.payload) : undefined,
  }));
}

export async function clearProcessedMutations(upToId: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync("DELETE FROM sync_queue WHERE id <= ?", upToId);
}

export async function clearAllMutations(): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync("DELETE FROM sync_queue");
}

export async function getPendingMutationCount(): Promise<number> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) as n FROM sync_queue");
  return row?.n ?? 0;
}

export async function getPendingClientIds(): Promise<Set<string>> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{ client_id: string }>(
    "SELECT client_id FROM sync_queue"
  );
  return new Set(rows.map((r) => r.client_id));
}
