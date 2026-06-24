import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { LanguagePreference } from "../i18n";

const LANGUAGE_KEY = "language_preference";

export async function getLanguagePreference(): Promise<LanguagePreference> {
  const raw =
    Platform.OS === "web" ? localStorage.getItem(LANGUAGE_KEY) : await SecureStore.getItemAsync(LANGUAGE_KEY);
  if (raw === "es" || raw === "en" || raw === "system") return raw;
  return "system";
}

export async function setLanguagePreference(value: LanguagePreference): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(LANGUAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(LANGUAGE_KEY, value);
}

export type { LanguagePreference };
