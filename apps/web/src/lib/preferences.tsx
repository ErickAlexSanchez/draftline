"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  LOCALE_KEY,
  THEME_KEY,
  isLocale,
  isTheme,
  messages,
  type Copy,
  type Locale,
  type Theme,
} from "./i18n";

type Preferences = {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};

type Listener = () => void;

const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function systemTheme(): Theme {
  if (typeof window.matchMedia !== "function") return "light";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getLocaleSnapshot(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = readStorage(LOCALE_KEY);
  return isLocale(stored) ? stored : "en";
}

export function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = readStorage(THEME_KEY);
  if (isTheme(stored)) return stored;
  return systemTheme();
}

export function getServerLocale(): Locale {
  return "en";
}

export function getServerTheme(): Theme {
  return "light";
}

export function setLocale(locale: Locale): void {
  writeStorage(LOCALE_KEY, locale);
  emit();
}

export function setTheme(theme: Theme): void {
  writeStorage(THEME_KEY, theme);
  emit();
}

const defaultPreferences: Preferences = {
  locale: "en",
  theme: "light",
  setLocale: () => undefined,
  setTheme: () => undefined,
};

const PreferencesContext = createContext<Preferences>(defaultPreferences);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocaleSnapshot, getServerLocale);
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("color-scheme", theme);
  }, [mounted, locale, theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    let media: MediaQueryList;
    try {
      media = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return undefined;
    }
    const onChange = (): void => {
      const stored = readStorage(THEME_KEY);
      if (isTheme(stored)) return;
      emit();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<Preferences>(
    () => ({ locale, theme, setLocale, setTheme }),
    [locale, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  return useContext(PreferencesContext);
}

export function useCopy(): Copy {
  return messages[usePreferences().locale];
}
