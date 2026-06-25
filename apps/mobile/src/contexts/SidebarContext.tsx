import { createContext, useContext, type ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

export const SIDEBAR_EXPANDED_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 0;

type SidebarContextType = {
  ready: boolean;
  collapsed: boolean;
  progress: SharedValue<number>;
  toggle: () => void;
  collapse: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({
  value,
  children,
}: {
  value: SidebarContextType;
  children: ReactNode;
}) {
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
