import { getLocalDb } from "../db";
import { logConflict } from "./conflicts";
import { getPendingClientIds } from "./queue";
import type { SyncPullPayload } from "./types";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

async function maybeLogConflict(
  pending: Set<string>,
  entity: string,
  clientId: string
): Promise<void> {
  if (pending.has(clientId)) {
    await logConflict(
      entity,
      clientId,
      "El servidor reemplazó un cambio local pendiente (gana el servidor)"
    );
  }
}

export async function applyPull(data: SyncPullPayload): Promise<void> {
  const db = await getLocalDb();
  const pending = await getPendingClientIds();

  await db.withTransactionAsync(async () => {
    for (const a of data.accounts ?? []) {
      const cid = s(a.client_id);
      if (a.deleted_at) {
        await db.runAsync("DELETE FROM accounts WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "account", cid);
      await db.runAsync(
        `INSERT OR REPLACE INTO accounts (id, client_id, name, icon_key, color, initial_balance, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        s(a.id),
        cid,
        s(a.name),
        s(a.icon_key) || "wallet",
        s(a.color) || "#4ecdc4",
        Number(a.initial_balance ?? 0),
        s(a.created_at),
        s(a.updated_at)
      );
    }

    for (const c of data.categories ?? []) {
      const cid = s(c.client_id);
      if (c.deleted_at) {
        await db.runAsync("DELETE FROM categories WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "category", cid);
      const existing = await db.getFirstAsync<{ icon_local_uri: string | null }>(
        "SELECT icon_local_uri FROM categories WHERE client_id = ?",
        cid
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO categories
         (id, client_id, name, type, color, icon_type, icon_key, icon_storage_key, icon_local_uri, icon_sync_status, sort_order, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        s(c.id),
        cid,
        s(c.name),
        s(c.type),
        s(c.color) || "#4ecdc4",
        s(c.icon_type) || "preset",
        s(c.icon_key) || null,
        s(c.icon_storage_key) || null,
        existing?.icon_local_uri ?? null,
        existing?.icon_local_uri && !c.icon_storage_key ? "pending_upload" : "synced",
        Number(c.sort_order ?? 0),
        s(c.created_at),
        s(c.updated_at)
      );
    }

    for (const l of data.labels ?? []) {
      const cid = s(l.client_id);
      if (l.deleted_at) {
        await db.runAsync("DELETE FROM labels WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "label", cid);
      await db.runAsync(
        `INSERT OR REPLACE INTO labels (id, client_id, name, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
        s(l.id),
        cid,
        s(l.name),
        s(l.created_at),
        s(l.updated_at)
      );
    }

    for (const t of data.transactions ?? []) {
      const tid = s(t.id);
      const cid = s(t.client_id);
      if (t.deleted_at) {
        await db.runAsync("DELETE FROM attachments WHERE transaction_id = ?", tid);
        await db.runAsync("DELETE FROM transaction_labels WHERE transaction_id = ?", tid);
        await db.runAsync("DELETE FROM transactions WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "transaction", cid);
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions
         (id, client_id, account_id, category_id, type, amount, date, comment, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        tid,
        cid,
        s(t.account_id),
        s(t.category_id),
        s(t.type),
        Number(t.amount),
        s(t.date),
        s(t.comment) || null,
        s(t.created_at),
        s(t.updated_at)
      );
      await db.runAsync("DELETE FROM transaction_labels WHERE transaction_id = ?", tid);
      const labelIds = (t.label_ids as string[]) ?? [];
      for (const lid of labelIds) {
        await db.runAsync(
          "INSERT OR IGNORE INTO transaction_labels (transaction_id, label_id) VALUES (?, ?)",
          tid,
          lid
        );
      }

      const attachments = (t.attachments as Record<string, unknown>[]) ?? [];
      for (const att of attachments) {
        const attId = s(att.id);
        const attCid = s(att.client_id);
        await db.runAsync(
          `INSERT OR REPLACE INTO attachments
           (id, client_id, transaction_id, storage_key, thumbnail_key, mime_type, local_uri, upload_status, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 'uploaded', datetime('now'), datetime('now'), NULL)`,
          attId,
          attCid,
          tid,
          s(att.storage_key) || null,
          s(att.thumbnail_key) || null,
          s(att.mime_type) || "image/jpeg"
        );
      }
    }

    for (const tr of data.transfers ?? []) {
      const cid = s(tr.client_id);
      if (tr.deleted_at) {
        await db.runAsync("DELETE FROM transfers WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "transfer", cid);
      await db.runAsync(
        `INSERT OR REPLACE INTO transfers
         (id, client_id, from_account_id, to_account_id, amount, date, comment, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        s(tr.id),
        cid,
        s(tr.from_account_id),
        s(tr.to_account_id),
        Number(tr.amount),
        s(tr.date),
        s(tr.comment) || null,
        s(tr.created_at),
        s(tr.updated_at)
      );
    }

    for (const r of data.recurring ?? []) {
      const cid = s(r.client_id);
      if (r.deleted_at) {
        await db.runAsync("DELETE FROM recurring_payments WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "recurring", cid);
      const labelIds = Array.isArray(r.label_ids)
        ? JSON.stringify(r.label_ids)
        : typeof r.label_ids === "string"
          ? r.label_ids
          : null;
      await db.runAsync(
        `INSERT OR REPLACE INTO recurring_payments
         (id, client_id, account_id, category_id, type, amount, frequency, next_run_at, comment, label_ids, label_names, active, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        s(r.id),
        cid,
        s(r.account_id),
        s(r.category_id),
        s(r.type) || "expense",
        Number(r.amount),
        s(r.frequency),
        s(r.next_run_at),
        s(r.comment) || null,
        labelIds,
        s(r.label_names) || null,
        r.active === false ? 0 : 1,
        s(r.created_at),
        s(r.updated_at)
      );
    }

    for (const r of data.reminders ?? []) {
      const cid = s(r.client_id);
      if (r.deleted_at) {
        await db.runAsync("DELETE FROM reminders WHERE client_id = ?", cid);
        continue;
      }
      await maybeLogConflict(pending, "reminder", cid);
      await db.runAsync(
        `INSERT OR REPLACE INTO reminders
         (id, client_id, title, due_at, recurrence, notes, recurring_payment_id, payload, completed_at, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        s(r.id),
        cid,
        s(r.title),
        s(r.due_at),
        s(r.recurrence) || null,
        s(r.notes) || null,
        s(r.recurring_payment_id) || null,
        s(r.payload) || null,
        s(r.completed_at) || null,
        s(r.created_at),
        s(r.updated_at)
      );
    }
  });
}
