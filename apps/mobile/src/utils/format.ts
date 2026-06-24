let formatLocaleTag = "es-AR";

export function setFormatLocaleTag(tag: string): void {
  formatLocaleTag = tag;
}

export function getFormatLocaleTag(): string {
  return formatLocaleTag;
}

export function formatMoney(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2).replace(".", ",")} M$`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".", ",")} K$`;
  }
  const formatted = value.toLocaleString(formatLocaleTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} $`;
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString(formatLocaleTag, { month: "long", year: "numeric" });
}
