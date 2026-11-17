"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { useIsClient } from "@/hooks/useIsClient";

const STORAGE_KEY = "speech-adventure-sidebar-collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  mounted: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  mounted: false,
});

// Collapsed state lives in localStorage (survives reloads) and is read with useSyncExternalStore.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const readCollapsed = () => {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
};
const writeCollapsed = (value: boolean) => {
  try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* private mode */ }
  listeners.forEach((listener) => listener());
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useIsClient();
  const setCollapsed = useCallback((value: boolean) => writeCollapsed(value), []);
  const toggle = useCallback(() => writeCollapsed(!readCollapsed()), []);

  // Close mobile drawer on route change handled by consumer

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed, mobileOpen, setMobileOpen, mounted }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
