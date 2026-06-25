import { api } from "../api/client";
import { getMeta, setMeta } from "../db";
import { applyPull } from "./applyPull";
import { clearProcessedMutations, getPendingMutations } from "./queue";
import type { SyncPullPayload, SyncPushResult } from "./types";
import { uploadPendingFiles } from "./uploads";

let syncMutex: Promise<unknown> = Promise.resolve();

export function withSyncMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = syncMutex.then(fn, fn);
  syncMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const ENTITY_TABLE: Record<string, string> = {
  account: "accounts",
  category: "categories",
  label: "labels",
  transaction: "transactions",
  transfer: "transfers",
  recurring: "recurring_payments",
  reminder: "reminders",
};

async function performSync(): Promise<Date | null> {
  try {
    const pending = await getPendingMutations();
    if (pending.length > 0) {
      const lastId = pending[pending.length - 1].queue_id;
      const pushResult = await api<SyncPushResult>("/sync/push", {
        method: "POST",
        body: JSON.stringify({ mutations: pending.map(({ queue_id: _, ...m }) => m) }),
      });
      await applyIdMappings(pushResult.mappings);
      await clearProcessedMutations(lastId);
    }

    const since = await getMeta("last_sync_at");
    const q = since ? `?since=${encodeURIComponent(since)}` : "";
    const pull = await api<SyncPullPayload>(`/sync/pull${q}`);
    await applyPull(pull);
    await setMeta("last_sync_at", pull.server_time);
    await uploadPendingFiles();
    return new Date(pull.server_time);
  } catch (e) {
    console.warn("Sync failed", e);
    return getLastSyncDate();
  }
}

export async function syncNow(): Promise<Date | null> {
  return withSyncMutex(performSync);
}

/** Clears local store and pulls server data; serialized with background sync. */
export async function resetAndSync(clear: () => Promise<void>): Promise<Date | null> {
  return withSyncMutex(async () => {
    await clear();
    return performSync();
  });
}

async function applyIdMappings(
  mappings: { entity: string; client_id: string; server_id: string }[]
): Promise<void> {
  const { getLocalDb } = await import("../db");
  const db = await getLocalDb();
  for (const m of mappings) {
    const table = ENTITY_TABLE[m.entity];
    if (!table) continue;
    await db.runAsync(`UPDATE ${table} SET id = ? WHERE client_id = ?`, m.server_id, m.client_id);
    if (m.entity === "transaction") {
      await db.runAsync(
        "UPDATE attachments SET transaction_id = ? WHERE transaction_id = ?",
        m.server_id,
        m.client_id
      );
      await db.runAsync(
        "UPDATE transaction_labels SET transaction_id = ? WHERE transaction_id = ?",
        m.server_id,
        m.client_id
      );
    }
  }
}

export async function getLastSyncDate(): Promise<Date | null> {
  const v = await getMeta("last_sync_at");
  return v ? new Date(v) : null;
}

export { getConflictCount, listConflicts, clearConflicts } from "./conflicts";
export { getPendingMutationCount } from "./queue";
