"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type Locale = "en" | "ru";

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  t: (en: string, ru: string) => string;
}

const STORAGE_KEY = "expo-dashboard-locale";

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "ru" ? stored : "ru";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ru");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocale(readStoredLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, ready]);

  const toggleLocale = useCallback(() => {
    setLocale((l) => (l === "en" ? "ru" : "en"));
  }, []);

  const t = useCallback(
    (en: string, ru: string) => (locale === "en" ? en : ru),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
