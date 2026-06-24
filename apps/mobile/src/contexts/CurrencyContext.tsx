import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BASE_CURRENCY, type CurrencyCode } from "../constants/currencies";
import {
  ensureFreshRates,
  getDefaultEntryCurrency,
  getRates,
  refreshRates,
  setDefaultEntryCurrency as persistDefaultCurrency,
} from "../services/currency";

type CurrencyContextValue = {
  ready: boolean;
  defaultCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  refresh: () => Promise<void>;
  setDefaultCurrency: (code: CurrencyCode) => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  ready: false,
  defaultCurrency: BASE_CURRENCY,
  rates: getRates(),
  refresh: async () => undefined,
  setDefaultCurrency: async () => undefined,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [defaultCurrency, setDefaultCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY);
  const [rates, setRates] = useState(getRates());

  useEffect(() => {
    (async () => {
      await ensureFreshRates();
      setRates(getRates());
      setDefaultCurrencyState(await getDefaultEntryCurrency());
      setReady(true);
    })().catch(console.error);
  }, []);

  const refresh = async () => {
    await refreshRates();
    setRates(getRates());
  };

  const setDefaultCurrency = async (code: CurrencyCode) => {
    await persistDefaultCurrency(code);
    setDefaultCurrencyState(code);
  };

  return (
    <CurrencyContext.Provider value={{ ready, defaultCurrency, rates, refresh, setDefaultCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
