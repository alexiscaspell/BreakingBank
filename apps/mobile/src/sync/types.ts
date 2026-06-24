import { Platform } from "react-native";

export function isNativeOffline(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export function generateClientId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type SyncEntity =
  | "account"
  | "category"
  | "label"
  | "transaction"
  | "transfer"
  | "recurring"
  | "reminder";

export type SyncMutation = {
  entity: SyncEntity;
  op: "create" | "update" | "delete";
  client_id: string;
  payload?: Record<string, unknown>;
};

export type EntityMapping = {
  entity: string;
  client_id: string;
  server_id: string;
};

export type SyncPullPayload = {
  accounts: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  labels: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
  recurring: Record<string, unknown>[];
  reminders: Record<string, unknown>[];
  server_time: string;
};

export type SyncPushResult = {
  mappings: EntityMapping[];
  server_time: string;
};
