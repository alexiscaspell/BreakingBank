/** Keeps only digits with a single decimal separator (`,` or `.`). */
export function sanitizeAmountInput(raw: string, maxDecimals: number): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const lastSep = Math.max(lastComma, lastDot);

  if (lastSep === -1) return cleaned.replace(/[.,]/g, "");

  const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
  if (maxDecimals === 0) return intPart;

  let decPart = cleaned.slice(lastSep + 1).replace(/[.,]/g, "");
  decPart = decPart.slice(0, maxDecimals);

  if (cleaned.endsWith(",") || cleaned.endsWith(".")) {
    return decPart.length ? `${intPart},${decPart}` : `${intPart},`;
  }
  return decPart.length ? `${intPart},${decPart}` : intPart;
}
