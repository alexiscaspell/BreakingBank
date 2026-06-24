import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getActiveGroupId } from "../services/groups";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem("access_token");
  }
  return SecureStore.getItemAsync("access_token");
}

export async function setTokens(access: string, refresh: string) {
  if (Platform.OS === "web") {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    return;
  }
  await SecureStore.setItemAsync("access_token", access);
  await SecureStore.setItemAsync("refresh_token", refresh);
}

export async function clearTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return;
  }
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
}

export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers = { ...extra };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers["X-Group-Id"]) {
    const groupId = getActiveGroupId();
    if (groupId) headers["X-Group-Id"] = groupId;
  }
  return headers;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders({
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  });

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join(", ")
          : "Request failed";
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export { API_URL };
