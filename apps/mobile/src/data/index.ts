import { api } from "../api/client";
import { getLocalDb, clearLocalData } from "../db";
import { resetAndSync, syncNow } from "../sync";
import { enqueueMutation } from "../sync/queue";
import { generateClientId, isNativeOffline } from "../sync/types";

export type Account = {
  id: string;
  client_id: string;
  name: string;
  icon_key: string;
  color: string;
  initial_balance: number;
  balance: number;
};

export type Category = {
  id: string;
  client_id: string;
  name: string;
  type: string;
  color: string;
  icon_type: string;
  icon_key: string | null;
  icon_storage_key: string | null;
  icon_local_uri?: string | null;
  sort_order: number;
};

export type Label = { id: string; client_id: string; name: string };

export type Transaction = {
  id: string;
  client_id: string;
  account_id: string;
  category_id: string;
  type: string;
  amount: number;
  date: string;
  comment: string | null;
  category?: Category | null;
  labels?: { id: string; name: string }[];
};

export type AnalyticsSummary = {
  total: number;
  by_category: {
    category_id: string;
    category_name: string;
    color: string;
    icon_type: string;
    icon_key: string | null;
    icon_storage_key: string | null;
    total: number;
    percentage: number;
  }[];
};

async function computeBalance(accountId: string): Promise<number> {
  const db = await getLocalDb();
  const acc = await db.getFirstAsync<{ initial_balance: number }>(
    "SELECT initial_balance FROM accounts WHERE id = ? AND deleted_at IS NULL",
    accountId
  );
  if (!acc) return 0;
  const tx = await db.getFirstAsync<{ delta: number }>(
    `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as delta
     FROM transactions WHERE account_id = ? AND deleted_at IS NULL`,
    accountId
  );
  const out = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transfers WHERE from_account_id = ? AND deleted_at IS NULL",
    accountId
  );
  const inn = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transfers WHERE to_account_id = ? AND deleted_at IS NULL",
    accountId
  );
  return (acc.initial_balance ?? 0) + (tx?.delta ?? 0) - (out?.total ?? 0) + (inn?.total ?? 0);
}

async function enqueueAndSync(mutation: Parameters<typeof enqueueMutation>[0]): Promise<void> {
  await enqueueMutation(mutation);
  syncNow().catch(console.warn);
}

async function softDeleteById(
  table: string,
  id: string
): Promise<{ client_id: string } | null> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ client_id: string }>(
    `SELECT client_id FROM ${table} WHERE id = ? AND deleted_at IS NULL`,
    id
  );
  if (!row) return null;
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, now, now, id);
  return row;
}

export async function listAccounts(): Promise<Account[]> {
  if (!isNativeOffline()) return api<Account[]>("/accounts");
  const db = await getLocalDb();
  const rows = await db.getAllAsync<Omit<Account, "balance">>(
    "SELECT id, client_id, name, icon_key, color, initial_balance FROM accounts WHERE deleted_at IS NULL ORDER BY name"
  );
  return Promise.all(
    rows.map(async (r) => ({ ...r, balance: await computeBalance(r.id) }))
  );
}

export async function createAccount(data: {
  name: string;
  icon_key?: string;
  color?: string;
  initial_balance?: number;
}): Promise<void> {
  const icon_key = data.icon_key ?? "wallet";
  const color = data.color ?? "#4ecdc4";
  const initial_balance = data.initial_balance ?? 0;
  if (!isNativeOffline()) {
    await api("/accounts", {
      method: "POST",
      body: JSON.stringify({ name: data.name, icon_key, color, initial_balance }),
    });
    return;
  }
  const clientId = generateClientId();
  const db = await getLocalDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO accounts (id, client_id, name, icon_key, color, initial_balance, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    clientId,
    clientId,
    data.name,
    icon_key,
    color,
    initial_balance,
    now,
    now
  );
  await enqueueMutation({
    entity: "account",
    op: "create",
    client_id: clientId,
    payload: { name: data.name, icon_key, color, initial_balance },
  });
  syncNow().catch(console.warn);
}

export async function deleteAccount(id: string): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/accounts/${id}`, { method: "DELETE" });
    return;
  }
  const row = await softDeleteById("accounts", id);
  if (!row) return;
  await enqueueAndSync({ entity: "account", op: "delete", client_id: row.client_id });
}

export async function updateAccount(
  id: string,
  data: { name?: string; icon_key?: string; color?: string; initial_balance?: number }
): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<Account>("SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL", id);
  if (!row) return;
  const now = new Date().toISOString();
  const name = data.name ?? row.name;
  const icon_key = data.icon_key ?? row.icon_key;
  const color = data.color ?? row.color;
  const initial_balance = data.initial_balance ?? row.initial_balance;
  await db.runAsync(
    "UPDATE accounts SET name = ?, icon_key = ?, color = ?, initial_balance = ?, updated_at = ? WHERE id = ?",
    name,
    icon_key,
    color,
    initial_balance,
    now,
    id
  );
  await enqueueAndSync({
    entity: "account",
    op: "update",
    client_id: row.client_id,
    payload: { name, icon_key, color, initial_balance },
  });
}

export async function listCategories(type?: string): Promise<Category[]> {
  if (!isNativeOffline()) {
    const q = type ? `?type=${type}` : "";
    return api<Category[]>(`/categories${q}`);
  }
  const db = await getLocalDb();
  const sql = type
    ? "SELECT * FROM categories WHERE deleted_at IS NULL AND type = ? ORDER BY sort_order, name"
    : "SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY sort_order, name";
  return db.getAllAsync<Category>(sql, ...(type ? [type] : []));
}

export async function createCategory(data: {
  name: string;
  type: string;
  color: string;
  icon_type: string;
  icon_key?: string | null;
  icon_storage_key?: string | null;
  icon_local_uri?: string | null;
}): Promise<void> {
  if (!isNativeOffline()) {
    await api("/categories", { method: "POST", body: JSON.stringify(data) });
    return;
  }
  const clientId = generateClientId();
  const db = await getLocalDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO categories (id, client_id, name, type, color, icon_type, icon_key, icon_storage_key, icon_local_uri, icon_sync_status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    clientId,
    clientId,
    data.name,
    data.type,
    data.color,
    data.icon_type,
    data.icon_key ?? null,
    data.icon_storage_key ?? null,
    data.icon_local_uri ?? null,
    data.icon_local_uri ? "pending_upload" : "synced",
    now,
    now
  );
  await enqueueMutation({
    entity: "category",
    op: "create",
    client_id: clientId,
    payload: {
      name: data.name,
      type: data.type,
      color: data.color,
      icon_type: data.icon_type,
      icon_key: data.icon_key,
      icon_storage_key: data.icon_storage_key,
      sort_order: 0,
    },
  });
  syncNow().catch(console.warn);
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/categories/${id}`, { method: "DELETE" });
    return;
  }
  const row = await softDeleteById("categories", id);
  if (!row) return;
  await enqueueAndSync({ entity: "category", op: "delete", client_id: row.client_id });
}

export async function updateCategory(
  id: string,
  data: Partial<Pick<Category, "name" | "type" | "color" | "icon_type" | "icon_key" | "icon_storage_key" | "sort_order">>
): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<Category>(
    "SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL",
    id
  );
  if (!row) return;
  const now = new Date().toISOString();
  const merged = {
    name: data.name ?? row.name,
    type: data.type ?? row.type,
    color: data.color ?? row.color,
    icon_type: data.icon_type ?? row.icon_type,
    icon_key: data.icon_key ?? row.icon_key,
    icon_storage_key: data.icon_storage_key ?? row.icon_storage_key,
    sort_order: data.sort_order ?? row.sort_order,
  };
  await db.runAsync(
    `UPDATE categories SET name = ?, type = ?, color = ?, icon_type = ?, icon_key = ?,
     icon_storage_key = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    merged.name,
    merged.type,
    merged.color,
    merged.icon_type,
    merged.icon_key,
    merged.icon_storage_key,
    merged.sort_order,
    now,
    id
  );
  await enqueueAndSync({
    entity: "category",
    op: "update",
    client_id: row.client_id,
    payload: merged,
  });
}

export async function listLabels(): Promise<Label[]> {
  if (!isNativeOffline()) return api<Label[]>("/labels");
  const db = await getLocalDb();
  return db.getAllAsync("SELECT id, client_id, name FROM labels WHERE deleted_at IS NULL ORDER BY name");
}

export async function createLabel(name: string): Promise<Label> {
  if (!isNativeOffline()) {
    return api<Label>("/labels", { method: "POST", body: JSON.stringify({ name }) });
  }
  const clientId = generateClientId();
  const db = await getLocalDb();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO labels (id, client_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    clientId,
    clientId,
    name,
    now,
    now
  );
  await enqueueAndSync({ entity: "label", op: "create", client_id: clientId, payload: { name } });
  return { id: clientId, client_id: clientId, name };
}

export async function deleteLabel(id: string): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/labels/${id}`, { method: "DELETE" });
    return;
  }
  const row = await softDeleteById("labels", id);
  if (!row) return;
  await enqueueAndSync({ entity: "label", op: "delete", client_id: row.client_id });
}

export async function listTransactions(filters: {
  type?: string;
  from?: string;
  to?: string;
}): Promise<Transaction[]> {
  if (!isNativeOffline()) {
    const q = new URLSearchParams();
    if (filters.type) q.set("type", filters.type);
    if (filters.from) q.set("from", filters.from);
    if (filters.to) q.set("to", filters.to);
    return api<Transaction[]>(`/transactions?${q}`);
  }
  const db = await getLocalDb();
  let sql = `SELECT t.*, c.name as cat_name, c.color as cat_color, c.icon_type as cat_icon_type,
    c.icon_key as cat_icon_key, c.icon_storage_key as cat_icon_storage_key
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.deleted_at IS NULL`;
  const params: string[] = [];
  if (filters.type) {
    sql += " AND t.type = ?";
    params.push(filters.type);
  }
  if (filters.from) {
    sql += " AND t.date >= ?";
    params.push(filters.from);
  }
  if (filters.to) {
    sql += " AND t.date <= ?";
    params.push(filters.to);
  }
  sql += " ORDER BY t.date DESC";
  const rows = await db.getAllAsync<Record<string, unknown>>(sql, ...params);
  const result: Transaction[] = [];
  for (const r of rows) {
    const labels = await db.getAllAsync<{ id: string; name: string }>(
      `SELECT l.id, l.name FROM labels l
       JOIN transaction_labels tl ON tl.label_id = l.id
       WHERE tl.transaction_id = ?`,
      r.id as string
    );
    result.push({
      id: String(r.id),
      client_id: String(r.client_id),
      account_id: String(r.account_id),
      category_id: String(r.category_id),
      type: String(r.type),
      amount: Number(r.amount),
      date: String(r.date),
      comment: r.comment ? String(r.comment) : null,
      category: r.cat_name
        ? {
            id: String(r.category_id),
            client_id: "",
            name: String(r.cat_name),
            type: String(r.type),
            color: String(r.cat_color),
            icon_type: String(r.cat_icon_type),
            icon_key: r.cat_icon_key ? String(r.cat_icon_key) : null,
            icon_storage_key: r.cat_icon_storage_key ? String(r.cat_icon_storage_key) : null,
            sort_order: 0,
          }
        : null,
      labels,
    });
  }
  return result;
}

export async function createTransaction(data: {
  type: string;
  amount: number;
  account_id: string;
  category_id: string;
  date: string;
  comment: string | null;
  label_ids: string[];
  photoUris?: string[];
}): Promise<string> {
  if (!isNativeOffline()) {
    const txn = await api<{ id: string }>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (data.photoUris?.length) {
      const { apiForm } = await import("../api/client");
      for (const uri of data.photoUris) {
        const form = new FormData();
        form.append("file", { uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
        await apiForm(`/files/attachments/${txn.id}`, form);
      }
    }
    return txn.id;
  }

  const clientId = generateClientId();
  const db = await getLocalDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions (id, client_id, account_id, category_id, type, amount, date, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    clientId,
    clientId,
    data.account_id,
    data.category_id,
    data.type,
    data.amount,
    data.date,
    data.comment,
    now,
    now
  );
  for (const lid of data.label_ids) {
    await db.runAsync(
      "INSERT OR IGNORE INTO transaction_labels (transaction_id, label_id) VALUES (?, ?)",
      clientId,
      lid
    );
  }
  if (data.photoUris) {
    for (const uri of data.photoUris) {
      const attId = generateClientId();
      await db.runAsync(
        `INSERT INTO attachments (id, client_id, transaction_id, local_uri, upload_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        attId,
        attId,
        clientId,
        uri,
        now,
        now
      );
    }
  }
  await enqueueMutation({
    entity: "transaction",
    op: "create",
    client_id: clientId,
    payload: {
      account_id: data.account_id,
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      date: data.date,
      comment: data.comment,
      label_ids: data.label_ids,
    },
  });
  syncNow().catch(console.warn);
  return clientId;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  if (!isNativeOffline()) {
    try {
      return await api<Transaction>(`/transactions/${id}`);
    } catch {
      return null;
    }
  }
  const db = await getLocalDb();
  const r = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT t.*, c.name as cat_name, c.color as cat_color, c.icon_type as cat_icon_type,
      c.icon_key as cat_icon_key, c.icon_storage_key as cat_icon_storage_key
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ? AND t.deleted_at IS NULL`,
    id
  );
  if (!r) return null;
  const labels = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT l.id, l.name FROM labels l
     JOIN transaction_labels tl ON tl.label_id = l.id
     WHERE tl.transaction_id = ?`,
    id
  );
  return {
    id: String(r.id),
    client_id: String(r.client_id),
    account_id: String(r.account_id),
    category_id: String(r.category_id),
    type: String(r.type),
    amount: Number(r.amount),
    date: String(r.date),
    comment: r.comment ? String(r.comment) : null,
    category: r.cat_name
      ? {
          id: String(r.category_id),
          client_id: "",
          name: String(r.cat_name),
          type: String(r.type),
          color: String(r.cat_color),
          icon_type: String(r.cat_icon_type),
          icon_key: r.cat_icon_key ? String(r.cat_icon_key) : null,
          icon_storage_key: r.cat_icon_storage_key ? String(r.cat_icon_storage_key) : null,
          sort_order: 0,
        }
      : null,
    labels,
  };
}

export async function updateTransaction(
  id: string,
  data: {
    type: string;
    amount: number;
    account_id: string;
    category_id: string;
    date: string;
    comment: string | null;
    label_ids: string[];
  }
): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ client_id: string }>(
    "SELECT client_id FROM transactions WHERE id = ? AND deleted_at IS NULL",
    id
  );
  if (!row) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE transactions SET account_id = ?, category_id = ?, type = ?, amount = ?, date = ?, comment = ?, updated_at = ? WHERE id = ?`,
    data.account_id,
    data.category_id,
    data.type,
    data.amount,
    data.date,
    data.comment,
    now,
    id
  );
  await db.runAsync("DELETE FROM transaction_labels WHERE transaction_id = ?", id);
  for (const lid of data.label_ids) {
    await db.runAsync(
      "INSERT OR IGNORE INTO transaction_labels (transaction_id, label_id) VALUES (?, ?)",
      id,
      lid
    );
  }
  await enqueueAndSync({
    entity: "transaction",
    op: "update",
    client_id: row.client_id,
    payload: data,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/transactions/${id}`, { method: "DELETE" });
    return;
  }
  const row = await softDeleteById("transactions", id);
  if (!row) return;
  await enqueueAndSync({ entity: "transaction", op: "delete", client_id: row.client_id });
}

export type RecurringPayment = {
  id: string;
  client_id: string;
  account_id: string;
  category_id: string;
  type: string;
  amount: number;
  frequency: string;
  next_run_at: string;
  comment: string | null;
  label_ids: string[];
  label_names: string | null;
  active: boolean;
};

export type Reminder = {
  id: string;
  client_id: string;
  title: string;
  due_at: string;
  recurrence: string | null;
  notes: string | null;
  recurring_payment_id: string | null;
  payload: string | null;
  completed_at: string | null;
};

function parseLabelIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapRecurringRow(r: Record<string, unknown>): RecurringPayment {
  return {
    id: String(r.id),
    client_id: String(r.client_id),
    account_id: String(r.account_id),
    category_id: String(r.category_id),
    type: r.type ? String(r.type) : "expense",
    amount: Number(r.amount),
    frequency: String(r.frequency),
    next_run_at: String(r.next_run_at),
    comment: r.comment ? String(r.comment) : null,
    label_ids: parseLabelIds(r.label_ids as string | null),
    label_names: r.label_names ? String(r.label_names) : null,
    active: r.active === false || r.active === 0 ? false : true,
  };
}

export async function listRecurringPayments(): Promise<RecurringPayment[]> {
  if (!isNativeOffline()) return api<RecurringPayment[]>("/recurring-payments");
  const db = await getLocalDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, client_id, account_id, category_id, type, amount, frequency, next_run_at,
      comment, label_ids, label_names, active
     FROM recurring_payments WHERE deleted_at IS NULL ORDER BY next_run_at`
  );
  return rows.map(mapRecurringRow);
}

export async function getRecurringPayment(id: string): Promise<RecurringPayment | null> {
  if (!isNativeOffline()) {
    try {
      return await api<RecurringPayment>(`/recurring-payments/${id}`);
    } catch {
      return null;
    }
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT id, client_id, account_id, category_id, type, amount, frequency, next_run_at,
      comment, label_ids, label_names, active
     FROM recurring_payments WHERE id = ? AND deleted_at IS NULL`,
    id
  );
  return row ? mapRecurringRow(row) : null;
}

export async function createRecurringPayment(data: {
  type: string;
  amount: number;
  account_id: string;
  category_id: string;
  frequency: string;
  next_run_at: string;
  comment: string | null;
  label_ids: string[];
  active?: boolean;
}): Promise<RecurringPayment> {
  const payload = {
    type: data.type,
    amount: data.amount,
    account_id: data.account_id,
    category_id: data.category_id,
    frequency: data.frequency,
    next_run_at: data.next_run_at,
    comment: data.comment,
    label_ids: data.label_ids,
    active: data.active ?? true,
  };
  if (!isNativeOffline()) {
    return api<RecurringPayment>("/recurring-payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  const clientId = generateClientId();
  const db = await getLocalDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO recurring_payments
     (id, client_id, account_id, category_id, type, amount, frequency, next_run_at, comment, label_ids, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    clientId,
    clientId,
    payload.account_id,
    payload.category_id,
    payload.type,
    payload.amount,
    payload.frequency,
    payload.next_run_at,
    payload.comment,
    JSON.stringify(payload.label_ids),
    payload.active ? 1 : 0,
    now,
    now
  );
  await enqueueAndSync({ entity: "recurring", op: "create", client_id: clientId, payload });
  return (await getRecurringPayment(clientId))!;
}

export async function updateRecurringPayment(
  id: string,
  data: Partial<{
    type: string;
    amount: number;
    account_id: string;
    category_id: string;
    frequency: string;
    next_run_at: string;
    comment: string | null;
    label_ids: string[];
    active: boolean;
  }>
): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/recurring-payments/${id}`, { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<RecurringPayment>(
    "SELECT * FROM recurring_payments WHERE id = ? AND deleted_at IS NULL",
    id
  );
  if (!row) return;
  const now = new Date().toISOString();
  const merged = {
    type: data.type ?? row.type,
    amount: data.amount ?? row.amount,
    account_id: data.account_id ?? row.account_id,
    category_id: data.category_id ?? row.category_id,
    frequency: data.frequency ?? row.frequency,
    next_run_at: data.next_run_at ?? row.next_run_at,
    comment: data.comment !== undefined ? data.comment : row.comment,
    label_ids: data.label_ids ?? row.label_ids,
    active: data.active ?? row.active,
  };
  await db.runAsync(
    `UPDATE recurring_payments SET account_id = ?, category_id = ?, type = ?, amount = ?, frequency = ?,
     next_run_at = ?, comment = ?, label_ids = ?, active = ?, updated_at = ? WHERE id = ?`,
    merged.account_id,
    merged.category_id,
    merged.type,
    merged.amount,
    merged.frequency,
    merged.next_run_at,
    merged.comment,
    JSON.stringify(merged.label_ids),
    merged.active ? 1 : 0,
    now,
    id
  );
  await enqueueAndSync({
    entity: "recurring",
    op: "update",
    client_id: row.client_id,
    payload: merged,
  });
}

export async function deleteRecurringPayment(id: string): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/recurring-payments/${id}`, { method: "DELETE" });
    return;
  }
  const row = await softDeleteById("recurring_payments", id);
  if (!row) return;
  await enqueueAndSync({ entity: "recurring", op: "delete", client_id: row.client_id });
}

function mapReminderRow(r: Record<string, unknown>): Reminder {
  return {
    id: String(r.id),
    client_id: String(r.client_id),
    title: String(r.title),
    due_at: String(r.due_at),
    recurrence: r.recurrence ? String(r.recurrence) : null,
    notes: r.notes ? String(r.notes) : null,
    recurring_payment_id: r.recurring_payment_id ? String(r.recurring_payment_id) : null,
    payload: r.payload ? String(r.payload) : null,
    completed_at: r.completed_at ? String(r.completed_at) : null,
  };
}

export async function listReminders(): Promise<Reminder[]> {
  if (!isNativeOffline()) return api<Reminder[]>("/reminders");
  const db = await getLocalDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, client_id, title, due_at, recurrence, notes, recurring_payment_id, payload, completed_at
     FROM reminders WHERE deleted_at IS NULL ORDER BY due_at`
  );
  return rows.map(mapReminderRow);
}

export async function getReminder(id: string): Promise<Reminder | null> {
  if (!isNativeOffline()) {
    const all = await api<Reminder[]>("/reminders");
    return all.find((r) => r.id === id) ?? null;
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT id, client_id, title, due_at, recurrence, notes, recurring_payment_id, payload, completed_at
     FROM reminders WHERE id = ? AND deleted_at IS NULL`,
    id
  );
  return row ? mapReminderRow(row) : null;
}

export async function createReminder(data: {
  title: string;
  due_at: string;
  recurrence?: string | null;
  notes?: string | null;
  recurring_payment_id?: string | null;
  payload?: string | null;
}): Promise<Reminder> {
  const payload = {
    title: data.title,
    due_at: data.due_at,
    recurrence: data.recurrence ?? null,
    notes: data.notes ?? null,
    recurring_payment_id: data.recurring_payment_id ?? null,
    payload: data.payload ?? null,
  };
  if (!isNativeOffline()) {
    return api<Reminder>("/reminders", { method: "POST", body: JSON.stringify(payload) });
  }
  const clientId = generateClientId();
  const db = await getLocalDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO reminders
     (id, client_id, title, due_at, recurrence, notes, recurring_payment_id, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    clientId,
    clientId,
    payload.title,
    payload.due_at,
    payload.recurrence,
    payload.notes,
    payload.recurring_payment_id,
    payload.payload,
    now,
    now
  );
  await enqueueAndSync({ entity: "reminder", op: "create", client_id: clientId, payload });
  return (await getReminder(clientId))!;
}

export async function updateReminder(
  id: string,
  data: Partial<{
    title: string;
    due_at: string;
    recurrence: string | null;
    notes: string | null;
    completed_at: string | null;
  }>
): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/reminders/${id}`, { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<Reminder>("SELECT * FROM reminders WHERE id = ? AND deleted_at IS NULL", id);
  if (!row) return;
  const now = new Date().toISOString();
  const merged = {
    title: data.title ?? row.title,
    due_at: data.due_at ?? row.due_at,
    recurrence: data.recurrence !== undefined ? data.recurrence : row.recurrence,
    notes: data.notes !== undefined ? data.notes : row.notes,
    completed_at: data.completed_at !== undefined ? data.completed_at : row.completed_at,
  };
  await db.runAsync(
    `UPDATE reminders SET title = ?, due_at = ?, recurrence = ?, notes = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    merged.title,
    merged.due_at,
    merged.recurrence,
    merged.notes,
    merged.completed_at,
    now,
    id
  );
  await enqueueAndSync({
    entity: "reminder",
    op: "update",
    client_id: row.client_id,
    payload: merged,
  });
}

export async function deleteReminder(id: string): Promise<void> {
  if (!isNativeOffline()) {
    await api(`/reminders/${id}`, { method: "DELETE" });
    return;
  }
  const row = await softDeleteById("reminders", id);
  if (!row) return;
  await enqueueAndSync({ entity: "reminder", op: "delete", client_id: row.client_id });
}

export async function completeRecurringReminder(
  reminderId: string,
  overrides?: Partial<{
    type: string;
    amount: number;
    account_id: string;
    category_id: string;
    date: string;
    comment: string | null;
    label_ids: string[];
  }>
): Promise<void> {
  const reminder = await getReminder(reminderId);
  if (!reminder || reminder.completed_at || !reminder.payload) return;
  const draft = JSON.parse(reminder.payload) as {
    recurring_id: string;
    type: string;
    amount: number;
    account_id: string;
    category_id: string;
    comment: string | null;
    label_ids: string[];
    due_date: string;
  };
  const recurring = await getRecurringPayment(draft.recurring_id);
  await createTransaction({
    type: overrides?.type ?? draft.type,
    amount: overrides?.amount ?? draft.amount,
    account_id: overrides?.account_id ?? draft.account_id,
    category_id: overrides?.category_id ?? draft.category_id,
    date: overrides?.date ?? draft.due_date,
    comment: overrides?.comment !== undefined ? overrides.comment : draft.comment,
    label_ids: overrides?.label_ids ?? draft.label_ids,
  });
  if (recurring) {
    const { advanceNextRun } = await import("../services/recurringSchedule");
    const next = advanceNextRun(new Date(recurring.next_run_at), recurring.frequency as "daily" | "weekly" | "monthly" | "yearly");
    await updateRecurringPayment(recurring.id, { next_run_at: next.toISOString() });
  }
  await updateReminder(reminderId, { completed_at: new Date().toISOString() });
}

export async function getAnalyticsSummary(filters: {
  type: string;
  from: string;
  to: string;
  account_id?: string | null;
}): Promise<AnalyticsSummary> {
  if (!isNativeOffline()) {
    const q = new URLSearchParams({
      type: filters.type,
      from: filters.from,
      to: filters.to,
    });
    if (filters.account_id) q.set("account_id", filters.account_id);
    return api<AnalyticsSummary>(`/analytics/summary?${q}`);
  }
  const db = await getLocalDb();
  const accountClause = filters.account_id ? " AND account_id = ?" : "";
  const baseParams = filters.account_id
    ? [filters.type, filters.from, filters.to, filters.account_id]
    : [filters.type, filters.from, filters.to];
  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE type = ? AND date >= ? AND date <= ? AND deleted_at IS NULL${accountClause}`,
    ...baseParams
  );
  const total = totalRow?.total ?? 0;
  const rows = await db.getAllAsync<{
    category_id: string;
    category_name: string;
    color: string;
    icon_type: string;
    icon_key: string | null;
    icon_storage_key: string | null;
    cat_total: number;
  }>(
    `SELECT c.id as category_id, c.name as category_name, c.color, c.icon_type, c.icon_key, c.icon_storage_key,
      COALESCE(SUM(t.amount), 0) as cat_total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = ? AND t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL${accountClause}
     GROUP BY c.id ORDER BY cat_total DESC`,
    ...baseParams
  );
  return {
    total,
    by_category: rows.map((r) => ({
      category_id: r.category_id,
      category_name: r.category_name,
      color: r.color,
      icon_type: r.icon_type,
      icon_key: r.icon_key,
      icon_storage_key: r.icon_storage_key,
      total: r.cat_total,
      percentage: total ? Math.round((r.cat_total / total) * 1000) / 10 : 0,
    })),
  };
}

export async function onUserLogin(): Promise<void> {
  if (!isNativeOffline()) return;
  await resetAndSync(clearLocalData);
}

export async function refreshFromServer(): Promise<Date | null> {
  if (!isNativeOffline()) return null;
  return syncNow();
}

export function usesOfflineStore(): boolean {
  return isNativeOffline();
}
