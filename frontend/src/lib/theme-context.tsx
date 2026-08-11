"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "neon";

const THEME_KEY = "vsn-theme";
const THEMES: Theme[] = ["light", "dark", "neon"];

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "neon") return stored;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors: Record<Theme, string> = {
      light: "#FAF3E7",
      dark: "#121826",
      neon: "#000000",
    };
    meta.setAttribute("content", colors[theme]);
  }
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
