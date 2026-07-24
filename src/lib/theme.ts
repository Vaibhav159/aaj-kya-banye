import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_KEY = "thali:theme";

export async function syncTheme(mode: ThemeMode) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").upsert({
      id: user.id,
      theme: mode,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Theme sync error:", err);
  }
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
  } catch {
    // Ignore localStorage errors
  }
  return "system";
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const resolved = resolveTheme(mode);
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Update meta theme-color to match background/header
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", resolved === "dark" ? "#181615" : "#d97706");
  }

  // Broadcast change for multi-tab or reactive listeners
  window.dispatchEvent(new CustomEvent("thali:theme-change", { detail: { mode, resolved } }));
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const setTheme = useCallback((nextMode: ThemeMode) => {
    setThemeState(nextMode);
    try {
      localStorage.setItem(THEME_KEY, nextMode);
    } catch (err) {
      console.error("Failed to save theme setting:", err);
    }
    applyTheme(nextMode);
    setResolvedTheme(resolveTheme(nextMode));
    syncTheme(nextMode);
  }, []);

  useEffect(() => {
    // Initial sync
    const currentStored = getStoredTheme();
    setThemeState(currentStored);
    setResolvedTheme(resolveTheme(currentStored));
    applyTheme(currentStored);

    const handleSystemChange = () => {
      if (getStoredTheme() === "system") {
        const resolved = getSystemTheme();
        applyTheme("system");
        setResolvedTheme(resolved);
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: ThemeMode; resolved: "light" | "dark" }>;
      if (customEvent.detail) {
        setThemeState(customEvent.detail.mode);
        setResolvedTheme(customEvent.detail.resolved);
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener("thali:theme-change", handleCustomChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener("thali:theme-change", handleCustomChange);
    };
  }, []);

  return { theme, setTheme, resolvedTheme };
}
