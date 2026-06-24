import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  localeTag,
  resolveLocale,
  setActiveLocale,
  translations,
  type AppLocale,
  type LanguagePreference,
  type TranslationKey,
} from "../i18n";
import { getLanguagePreference, setLanguagePreference } from "../services/language";
import { setFormatLocaleTag } from "../utils/format";

type LocaleContextValue = {
  preference: LanguagePreference;
  locale: AppLocale;
  localeTag: string;
  setPreference: (value: LanguagePreference) => Promise<void>;
  t: (key: TranslationKey) => string;
  tf: (key: TranslationKey, vars: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(resolved: AppLocale) {
  setActiveLocale(resolved);
  setFormatLocaleTag(localeTag(resolved));
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>("system");
  const [locale, setLocaleState] = useState<AppLocale>("es");

  useEffect(() => {
    getLanguagePreference()
      .then((pref) => {
        const resolved = resolveLocale(pref);
        applyLocale(resolved);
        setPreferenceState(pref);
        setLocaleState(resolved);
      })
      .catch(console.error);
  }, []);

  const setPreference = async (value: LanguagePreference) => {
    const resolved = resolveLocale(value);
    applyLocale(resolved);
    setPreferenceState(value);
    setLocaleState(resolved);
    await setLanguagePreference(value);
  };

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? translations.en[key] ?? key,
    [locale]
  );

  const tf = useCallback(
    (key: TranslationKey, vars: Record<string, string | number>) => {
      let text = t(key);
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value));
      }
      return text;
    },
    [t]
  );

  const tag = useMemo(() => localeTag(locale), [locale]);

  const value = useMemo(
    () => ({
      preference,
      locale,
      localeTag: tag,
      setPreference,
      t,
      tf,
    }),
    [preference, locale, tag, t, tf]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useTranslation() {
  return useLocale().t;
}
