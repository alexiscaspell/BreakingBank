import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import {
  getConflictCount,
  getLastSyncDate,
  getPendingMutationCount,
  syncNow,
} from "../sync";
import { isNativeOffline } from "../sync/types";
import { getFormatLocaleTag } from "../utils/format";
import { t } from "../i18n";
import { useAuth } from "./AuthContext";

type SyncContextType = {
  lastSync: Date | null;
  syncing: boolean;
  pendingCount: number;
  conflictCount: number;
  triggerSync: () => Promise<void>;
  refreshSyncTime: () => Promise<void>;
  refreshStats: () => Promise<void>;
};

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  const refreshStats = useCallback(async () => {
    if (!isNativeOffline() || !user) return;
    setPendingCount(await getPendingMutationCount());
    setConflictCount(await getConflictCount());
  }, [user]);

  const refreshSyncTime = useCallback(async () => {
    if (!user) return;
    setLastSync(await getLastSyncDate());
    await refreshStats();
  }, [refreshStats, user]);

  const triggerSync = useCallback(async () => {
    if (!isNativeOffline() || !user) return;
    setSyncing(true);
    try {
      const d = await syncNow();
      setLastSync(d);
      await refreshStats();
    } finally {
      setSyncing(false);
    }
  }, [refreshStats, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    refreshSyncTime();
  }, [authLoading, refreshSyncTime, user]);

  useEffect(() => {
    if (!isNativeOffline() || !user) return;
    const onChange = (state: AppStateStatus) => {
      if (state === "active") triggerSync().catch(console.warn);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [triggerSync, user]);

  useEffect(() => {
    if (!isNativeOffline() || Platform.OS === "web" || !user) return;
    return NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        triggerSync().catch(console.warn);
      }
    });
  }, [triggerSync, user]);

  return (
    <SyncContext.Provider
      value={{ lastSync, syncing, pendingCount, conflictCount, triggerSync, refreshSyncTime, refreshStats }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}

export function formatSyncTime(d: Date | null): string {
  if (!d) return t("settings.syncPending");
  const tag = getFormatLocaleTag();
  return `Sync: ${d.toLocaleDateString(tag)} ${d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })}`;
}
