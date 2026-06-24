import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const THEME_KEY = "theme_preference";

export type ThemePreference = "light" | "dark" | "system";

export async function getThemePreference(): Promise<ThemePreference> {
  const raw = Platform.OS === "web" ? localStorage.getItem(THEME_KEY) : await SecureStore.getItemAsync(THEME_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export async function setThemePreference(value: ThemePreference): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(THEME_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(THEME_KEY, value);
}
