"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const STORAGE_KEY = "speech-adventure-theme";
const ThemeContext = createContext<ThemeContextValue>({ theme: "light", toggle: () => {} });

// The inline script in app/layout.tsx sets html.dark before first paint; the class is the source of truth.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const readTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "light" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
