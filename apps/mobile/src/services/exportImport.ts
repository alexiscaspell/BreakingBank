import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { API_URL, authHeaders } from "../api/client";
import {
  createAccount,
  createCategory,
  createLabel,
  createTransaction,
  listAccounts,
  listCategories,
  listLabels,
  listTransactions,
  usesOfflineStore,
  type Transaction,
} from "../data";
import { BASE_CURRENCY, type CurrencyCode } from "../constants/currencies";
import { syncNow } from "../sync";
import {
  buildCsv,
  monthBounds,
  parseCsvText,
  timestampFilename,
  type SpreadsheetRow,
} from "./spreadsheetFormat";

export type ExportFormat = "xlsx" | "csv";
export type TxType = "expense" | "income";

async function fetchExportBlob(
  type: TxType,
  year: number,
  month: number,
  format: ExportFormat,
  currency: CurrencyCode
): Promise<{ blob: Blob; filename: string }> {
  const q = new URLSearchParams({
    type,
    year: String(year),
    month: String(month),
    format,
    currency,
  });
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/export/transactions?${q}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Export failed");
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? timestampFilename(format);
  const blob = await res.blob();
  return { blob, filename };
}

async function transactionsForExport(type: TxType, year: number, month: number): Promise<Transaction[]> {
  const { start, end } = monthBounds(year, month);
  return listTransactions({ type, from: start, to: end });
}

function mapExportRows(transactions: Transaction[]) {
  return transactions.map((txn) => ({
    date: txn.date.slice(0, 10),
    categoryName: txn.category?.name ?? "",
    amount: txn.amount,
    labels: (txn.labels ?? []).map((l) => l.name),
    comment: txn.comment,
    accountId: txn.account_id,
  }));
}

async function enrichAccountNames(rows: ReturnType<typeof mapExportRows>) {
  const accounts = await listAccounts();
  const byId = new Map(accounts.map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    date: r.date,
    categoryName: r.categoryName,
    accountName: byId.get(r.accountId) ?? "",
    amount: r.amount,
    labels: r.labels,
    comment: r.comment,
  }));
}

async function saveAndShare(content: string | Blob, filename: string, mime: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error("No storage directory");
  const path = `${dir}${filename}`;

  if (typeof content === "string") {
    await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
  } else {
    const base64 = await blobToBase64(content);
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: mime, dialogTitle: filename });
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function renderExportBlob(
  type: TxType,
  year: number,
  month: number,
  format: ExportFormat,
  currency: CurrencyCode,
  rows: Awaited<ReturnType<typeof enrichAccountNames>>
): Promise<{ blob: Blob; filename: string }> {
  const headers = await authHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${API_URL}/export/transactions/render`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type,
      year,
      month,
      currency,
      format,
      rows: rows.map((r) => ({
        date: r.date,
        category_name: r.categoryName,
        account_name: r.accountName,
        amount: r.amount,
        labels: r.labels,
        comment: r.comment,
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Export failed");
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? timestampFilename(format);
  const blob = await res.blob();
  return { blob, filename };
}

export async function exportMonth(
  type: TxType,
  year: number,
  month: number,
  format: ExportFormat,
  currency: CurrencyCode = BASE_CURRENCY
): Promise<void> {
  if (!usesOfflineStore()) {
    const { blob, filename } = await fetchExportBlob(type, year, month, format, currency);
    const mime =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";
    await saveAndShare(blob, filename, mime);
    return;
  }

  const txns = await transactionsForExport(type, year, month);
  const rows = await enrichAccountNames(mapExportRows(txns));

  if (format === "csv") {
    const csv = buildCsv(type, year, month, currency, rows);
    await saveAndShare(csv, timestampFilename("csv"), "text/csv");
    return;
  }

  const { blob, filename } = await renderExportBlob(type, year, month, "xlsx", currency, rows);
  await saveAndShare(blob, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function resolveAccountId(name: string): Promise<string> {
  const accounts = await listAccounts();
  const found = accounts.find((a) => a.name === name);
  if (found) return found.id;
  await createAccount({ name });
  const refreshed = await listAccounts();
  const created = refreshed.find((a) => a.name === name);
  if (!created) throw new Error(`No se pudo crear la cuenta "${name}"`);
  return created.id;
}

async function resolveCategoryId(name: string, type: TxType): Promise<string> {
  const categories = await listCategories(type);
  const found = categories.find((c) => c.name === name);
  if (found) return found.id;
  await createCategory({ name, type, color: "#9E9E9E", icon_type: "preset", icon_key: "other" });
  const refreshed = await listCategories(type);
  const created = refreshed.find((c) => c.name === name);
  if (!created) throw new Error(`No se pudo crear la categoría "${name}"`);
  return created.id;
}

async function resolveLabelIds(names: string[]): Promise<string[]> {
  const existing = await listLabels();
  const byName = new Map(existing.map((l) => [l.name, l.id]));
  const ids: string[] = [];
  for (const name of names) {
    let id = byName.get(name);
    if (!id) {
      await createLabel(name);
      const refreshed = await listLabels();
      id = refreshed.find((l) => l.name === name)?.id;
    }
    if (id) ids.push(id);
  }
  return ids;
}

async function importRowsLocally(type: TxType, rows: SpreadsheetRow[]) {
  let created = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const accountId = await resolveAccountId(row.account);
      const categoryId = await resolveCategoryId(row.category, type);
      const labelIds = await resolveLabelIds(row.labels);
      await createTransaction({
        type,
        amount: row.amount,
        account_id: accountId,
        category_id: categoryId,
        date: row.date,
        comment: row.comment,
        label_ids: labelIds,
      });
      created++;
    } catch (e) {
      errors.push(`Fila ${i + 1}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return { created, skipped: rows.length - created, errors };
}

export async function importFile(
  type: TxType,
  uri: string,
  filename: string,
  mimeType?: string | null
): Promise<{ created: number; skipped: number; errors: string[] }> {
  let name = filename.trim() || "import.xlsx";
  const lower = name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
    if (mimeType?.includes("csv")) name = `${name}.csv`;
    else name = `${name}.xlsx`;
  }
  const ext = name.toLowerCase();

  if (!usesOfflineStore() || ext.endsWith(".xlsx")) {
    const form = new FormData();
    if (Platform.OS === "web") {
      const res = await fetch(uri);
      const blob = await res.blob();
      form.append("file", blob, name);
    } else {
      form.append("file", {
        uri,
        name,
        type: ext.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      } as unknown as Blob);
    }
    const headers = await authHeaders();
    const q = new URLSearchParams({ type });
    const res = await fetch(`${API_URL}/export/transactions/import?${q}`, {
      method: "POST",
      headers,
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Import failed");
    }
    const result = await res.json();
    if (usesOfflineStore()) {
      await syncNow();
    }
    return result;
  }

  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const rows = parseCsvText(text);
  if (!rows.length) throw new Error("No se encontraron filas válidas en el CSV");
  return importRowsLocally(type, rows);
}
