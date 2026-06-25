import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

export async function getSidebarCollapsed(): Promise<boolean> {
  const raw =
    Platform.OS === "web"
      ? localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      : await SecureStore.getItemAsync(SIDEBAR_COLLAPSED_KEY);
  return raw === "1";
}

export async function setSidebarCollapsed(collapsed: boolean): Promise<void> {
  const value = collapsed ? "1" : "0";
  if (Platform.OS === "web") {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SIDEBAR_COLLAPSED_KEY, value);
}
