import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { getThemePreference, setThemePreference, type ThemePreference } from "../services/theme";
import { getColors, type ColorScheme, type ThemeColors } from "../theme/colors";

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: ThemeColors;
  setPreference: (value: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    getThemePreference().then(setPreferenceState).catch(console.error);
  }, []);

  const scheme: ColorScheme =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const colors = useMemo(() => getColors(scheme), [scheme]);

  const setPreference = async (value: ThemePreference) => {
    await setThemePreference(value);
    setPreferenceState(value);
  };

  return (
    <ThemeContext.Provider value={{ preference, scheme, colors, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
