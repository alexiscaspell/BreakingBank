import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  BASE_CURRENCY,
  CURRENCIES,
  DEFAULT_RATES_TO_BASE,
  type CurrencyCode,
} from "../constants/currencies";

const RATES_KEY = "currency_rates_to_base";
const RATES_AT_KEY = "currency_rates_updated_at";
const DEFAULT_CURRENCY_KEY = "default_entry_currency";
const RATES_TTL_MS = 12 * 60 * 60 * 1000;

let ratesCache: Record<CurrencyCode, number> = { ...DEFAULT_RATES_TO_BASE };

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export function getRates(): Record<CurrencyCode, number> {
  return { ...ratesCache };
}

export async function loadCachedRates(): Promise<void> {
  try {
    const raw = await storageGet(RATES_KEY);
    if (raw) {
      ratesCache = { ...DEFAULT_RATES_TO_BASE, ...JSON.parse(raw) };
    }
  } catch {
    ratesCache = { ...DEFAULT_RATES_TO_BASE };
  }
}

export async function refreshRates(): Promise<void> {
  const codes = CURRENCIES.map((c) => c.code).filter((c) => c !== BASE_CURRENCY);
  const updated: Partial<Record<CurrencyCode, number>> = { ARS: 1 };

  await Promise.all(
    codes.map(async (code) => {
      try {
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=${code}&to=${BASE_CURRENCY}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { rates?: Record<string, number> };
        const rate = data.rates?.[BASE_CURRENCY];
        if (rate && rate > 0) updated[code] = rate;
      } catch {
        /* keep default */
      }
    })
  );

  ratesCache = { ...DEFAULT_RATES_TO_BASE, ...updated, ARS: 1 };
  await storageSet(RATES_KEY, JSON.stringify(ratesCache));
  await storageSet(RATES_AT_KEY, String(Date.now()));
}

export async function ensureFreshRates(): Promise<void> {
  await loadCachedRates();
  const updatedAt = Number(await storageGet(RATES_AT_KEY)) || 0;
  if (Date.now() - updatedAt > RATES_TTL_MS) {
    await refreshRates().catch(() => undefined);
  }
}

export function convertToBase(amount: number, from: CurrencyCode): number {
  const rate = ratesCache[from] ?? DEFAULT_RATES_TO_BASE[from] ?? 1;
  return amount * rate;
}

export function convertFromBase(amountBase: number, to: CurrencyCode): number {
  const rate = ratesCache[to] ?? DEFAULT_RATES_TO_BASE[to] ?? 1;
  if (rate === 0) return amountBase;
  return amountBase / rate;
}

export function convertBetween(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  return convertFromBase(convertToBase(amount, from), to);
}

export async function getDefaultEntryCurrency(): Promise<CurrencyCode> {
  const v = await storageGet(DEFAULT_CURRENCY_KEY);
  if (v && CURRENCIES.some((c) => c.code === v)) return v as CurrencyCode;
  return BASE_CURRENCY;
}

export async function setDefaultEntryCurrency(code: CurrencyCode): Promise<void> {
  await storageSet(DEFAULT_CURRENCY_KEY, code);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
