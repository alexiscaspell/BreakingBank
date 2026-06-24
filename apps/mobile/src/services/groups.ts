import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACTIVE_GROUP_KEY = "active_group_id";

let activeGroupId: string | null = null;

export function getActiveGroupId(): string | null {
  return activeGroupId;
}

export async function loadActiveGroupId(): Promise<string | null> {
  const raw =
    Platform.OS === "web" ? localStorage.getItem(ACTIVE_GROUP_KEY) : await SecureStore.getItemAsync(ACTIVE_GROUP_KEY);
  activeGroupId = raw;
  return raw;
}

export async function persistActiveGroupId(groupId: string | null): Promise<void> {
  activeGroupId = groupId;
  if (Platform.OS === "web") {
    if (groupId) localStorage.setItem(ACTIVE_GROUP_KEY, groupId);
    else localStorage.removeItem(ACTIVE_GROUP_KEY);
    return;
  }
  if (groupId) await SecureStore.setItemAsync(ACTIVE_GROUP_KEY, groupId);
  else await SecureStore.deleteItemAsync(ACTIVE_GROUP_KEY);
}

export type GroupSummary = {
  id: string;
  name: string;
  role: string;
  member_count: number;
};

export type GroupMember = {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: string;
};
