export type CurrencyCode = "ARS" | "USD" | "EUR" | "BRL" | "CLP" | "MXN" | "GBP" | "UYU" | "PYG" | "BOB";

export const BASE_CURRENCY: CurrencyCode = "ARS";

export type CurrencyInfo = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: "ARS", name: "Peso argentino", symbol: "$", decimals: 2 },
  { code: "USD", name: "Dólar estadounidense", symbol: "US$", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  { code: "BRL", name: "Real brasileño", symbol: "R$", decimals: 2 },
  { code: "CLP", name: "Peso chileno", symbol: "CL$", decimals: 0 },
  { code: "MXN", name: "Peso mexicano", symbol: "MX$", decimals: 2 },
  { code: "GBP", name: "Libra esterlina", symbol: "£", decimals: 2 },
  { code: "UYU", name: "Peso uruguayo", symbol: "$U", decimals: 2 },
  { code: "PYG", name: "Guaraní", symbol: "₲", decimals: 0 },
  { code: "BOB", name: "Boliviano", symbol: "Bs", decimals: 2 },
];

/** How many ARS equal 1 unit of the currency. */
export const DEFAULT_RATES_TO_BASE: Record<CurrencyCode, number> = {
  ARS: 1,
  USD: 1050,
  EUR: 1140,
  BRL: 210,
  CLP: 1.15,
  MXN: 62,
  GBP: 1320,
  UYU: 26,
  PYG: 0.15,
  BOB: 152,
};

export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatAmount(value: number, code: CurrencyCode): string {
  const info = getCurrencyInfo(code);
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: info.decimals,
  });
}

export function parseAmountInput(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatAmountInput(value: number, code: CurrencyCode): string {
  const info = getCurrencyInfo(code);
  if (info.decimals === 0) return String(Math.round(value));
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace(".", ",");
}
