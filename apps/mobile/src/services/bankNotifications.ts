import { NativeModules, Platform } from "react-native";

type BankNotificationsNative = {
  configure: (apiUrl: string, token: string, enabled: boolean) => Promise<boolean>;
  openListenerSettings: () => Promise<boolean>;
  isListenerEnabled: () => Promise<boolean>;
};

const Native = NativeModules.BankNotifications as BankNotificationsNative | undefined;

export function isBankNotificationsSupported(): boolean {
  return Platform.OS === "android" && !!Native;
}

export async function configureBankNotifications(apiUrl: string, token: string, enabled: boolean): Promise<void> {
  if (!Native) return;
  await Native.configure(apiUrl, token, enabled);
}

export async function openBankNotificationSettings(): Promise<void> {
  if (!Native) return;
  await Native.openListenerSettings();
}

export async function isBankNotificationListenerEnabled(): Promise<boolean> {
  if (!Native) return false;
  return Native.isListenerEnabled();
}
