import type { PeriodKey } from "../i18n";
import { monthLabel } from "./format";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: iso(start), end: iso(end) };
}

export function monthBoundsFromKey(key: string): { start: string; end: string } {
  const [year, month] = key.split("-").map(Number);
  return monthBounds(year, month);
}

export function periodBounds(period: PeriodKey, ref = new Date()): { start: string; end: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  switch (period) {
    case "day":
      return { start: iso(ref), end: iso(ref) };
    case "week": {
      const weekday = (ref.getDay() + 6) % 7;
      const monday = new Date(y, m, d - weekday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: iso(monday), end: iso(sunday) };
    }
    case "year":
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case "custom":
    case "month":
    default:
      return monthBounds(y, m + 1);
  }
}

export function monthOptions(count: number, localeTag: string) {
  const now = new Date();
  const items: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    items.push({ key, label: monthLabel(d) });
  }
  return items;
}
