import * as Localization from "expo-localization";

import { translations, type AppLocale, type LanguagePreference, type TranslationKey } from "./translations";

export { translations };

export type { AppLocale, LanguagePreference, TranslationKey };

let activeLocale: AppLocale = "es";

export function getDeviceLocale(): AppLocale {
  const tag = Localization.getLocales()[0]?.languageCode ?? "es";
  return tag.startsWith("es") ? "es" : "en";
}

export function resolveLocale(preference: LanguagePreference): AppLocale {
  if (preference === "es" || preference === "en") return preference;
  return getDeviceLocale();
}

export function localeTag(locale: AppLocale): string {
  return locale === "es" ? "es-AR" : "en-US";
}

export function setActiveLocale(locale: AppLocale): void {
  activeLocale = locale;
}

export function getActiveLocale(): AppLocale {
  return activeLocale;
}

export function t(key: TranslationKey): string {
  return translations[activeLocale][key] ?? translations.en[key] ?? key;
}

export const PERIOD_KEYS = ["day", "week", "month", "year", "total"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export function periodLabel(key: PeriodKey): string {
  return t(`period.${key}` as TranslationKey);
}
