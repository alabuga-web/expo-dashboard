"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Locale = "en" | "ru";

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  t: (en: string, ru: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ru");

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
