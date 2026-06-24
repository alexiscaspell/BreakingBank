import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { clearLocalData } from "../db";
import { syncNow } from "../sync";
import {
  loadActiveGroupId,
  persistActiveGroupId,
  type GroupMember,
  type GroupSummary,
} from "../services/groups";

type GroupContextValue = {
  groups: GroupSummary[];
  activeGroup: GroupSummary | null;
  loading: boolean;
  refreshGroups: () => Promise<void>;
  setActiveGroup: (groupId: string) => Promise<void>;
  createGroup: (name: string) => Promise<GroupSummary>;
  inviteMember: (groupId: string, email: string) => Promise<GroupMember>;
  listMembers: (groupId: string) => Promise<GroupMember[]>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshGroups = useCallback(async () => {
    const list = await api<GroupSummary[]>("/groups");
    setGroups(list);
    const stored = await loadActiveGroupId();
    const pick = list.find((g) => g.id === stored)?.id ?? list[0]?.id ?? null;
    if (pick) {
      await persistActiveGroupId(pick);
      setActiveGroupId(pick);
    }
  }, []);

  useEffect(() => {
    loadActiveGroupId()
      .then(setActiveGroupId)
      .finally(() => setLoading(false));
  }, []);

  const setActiveGroup = useCallback(async (groupId: string) => {
    await api("/groups/active", { method: "PATCH", body: JSON.stringify({ group_id: groupId }) });
    await persistActiveGroupId(groupId);
    setActiveGroupId(groupId);
    await clearLocalData();
    await syncNow();
  }, []);

  const createGroup = useCallback(async (name: string) => {
    const group = await api<GroupSummary>("/groups", { method: "POST", body: JSON.stringify({ name }) });
    await refreshGroups();
    await setActiveGroup(group.id);
    return group;
  }, [refreshGroups, setActiveGroup]);

  const inviteMember = useCallback(async (groupId: string, email: string) => {
    return api<GroupMember>(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role: "editor" }),
      headers: { "X-Group-Id": groupId },
    });
  }, []);

  const listMembers = useCallback(async (groupId: string) => {
    return api<GroupMember[]>(`/groups/${groupId}/members`);
  }, []);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setActiveGroupId(null);
      return;
    }
    refreshGroups().catch(console.error);
  }, [user?.id, refreshGroups]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <GroupContext.Provider
      value={{
        groups,
        activeGroup,
        loading,
        refreshGroups,
        setActiveGroup,
        createGroup,
        inviteMember,
        listMembers,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used within GroupProvider");
  return ctx;
}
