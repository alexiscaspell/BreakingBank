export const SPREADSHEET_HEADERS = [
  "Fecha y hora",
  "Categoría",
  "Cuenta",
  "Cantidad en la divisa de la cuenta",
  "Divisa de la cuenta",
  "Cantidad de la transacción en la divisa de la transacción",
  "Divisa de la transacción",
  "Etiquetas",
  "Comentario",
] as const;

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function periodTitle(type: "expense" | "income", year: number, month: number): string {
  const kind = type === "expense" ? "gastos" : "ingresos";
  const startLabel = `1 de ${MONTHS_ES[month - 1]} de ${year}`;
  const endLabel =
    month === 12 ? `1 de enero de ${year + 1}` : `1 de ${MONTHS_ES[month]} de ${year}`;
  return `Lista de ${kind} para el período entre ${startLabel} y ${endLabel}`;
}

export function dateToExcelSerial(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  return Math.round((utc - EXCEL_EPOCH_MS) / 86400000);
}

export function parseExcelSerial(value: number): string {
  const dt = new Date(EXCEL_EPOCH_MS + value * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateCell(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return parseExcelSerial(value);
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return parseExcelSerial(Number(text));
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function splitLabels(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export type SpreadsheetRow = {
  date: string;
  category: string;
  account: string;
  amount: number;
  labels: string[];
  comment: string | null;
};

export type ExportRowInput = {
  date: string;
  categoryName: string;
  accountName: string;
  amount: number;
  labels: string[];
  comment: string | null;
};

export function buildCsv(
  type: "expense" | "income",
  year: number,
  month: number,
  currency: string,
  transactions: ExportRowInput[]
): string {
  const lines: string[] = [];
  lines.push(escapeCsv(periodTitle(type, year, month)));
  lines.push(SPREADSHEET_HEADERS.map(escapeCsv).join(","));
  for (const txn of transactions) {
    lines.push(
      [
        dateToExcelSerial(txn.date),
        txn.categoryName,
        txn.accountName,
        txn.amount,
        currency,
        "",
        "",
        txn.labels.join(", "),
        txn.comment ?? "",
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  return `\ufeff${lines.join("\n")}`;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsvText(text: string): SpreadsheetRow[] {
  const normalized = text.replace(/^\ufeff/, "");
  const lines = normalized.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.slice(0, SPREADSHEET_HEADERS.length).join("|") === SPREADSHEET_HEADERS.join("|")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const rows: SpreadsheetRow[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    const cells = parseCsvLine(line);
    if (!cells.some((c) => c.trim())) continue;
    const amount = parseAmount(cells[3]) ?? parseAmount(cells[5]);
    const date = parseDateCell(cells[0]);
    if (amount == null || !date || !cells[1]?.trim() || !cells[2]?.trim()) continue;
    rows.push({
      date,
      category: cells[1].trim(),
      account: cells[2].trim(),
      amount,
      labels: splitLabels(cells[7]),
      comment: cells[8]?.trim() || null,
    });
  }
  return rows;
}

export function timestampFilename(ext: "csv" | "xlsx"): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}_${pad(now.getMilliseconds(), 3)}.${ext}`;
}
