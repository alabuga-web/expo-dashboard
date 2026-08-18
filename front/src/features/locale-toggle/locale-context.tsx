"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";

type Locale = "en" | "ru";

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  /** Строка — для props, SVG, chart series, шаблонных строк */
  t: (en: string, ru: string) => string;
}

const STORAGE_KEY = "expo-dashboard-locale";
const AUTO_SWITCH_MS = 10_000;

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "ru" ? stored : "ru";
}

function flipLocale(l: Locale): Locale {
  return l === "en" ? "ru" : "en";
}

/** Анимированный текст при смене языка (только типографика, не весь UI). */
export function LocaleText({
  children,
  className,
  as: Tag = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const { locale } = useLocale();
  return (
    <Tag key={locale} className={cn("locale-text-swap", className)}>
      {children}
    </Tag>
  );
}

/** JSX-перевод с анимацией: `<T en="Hello" ru="Привет" />` */
export function T({
  en,
  ru,
  className,
}: {
  en: string;
  ru: string;
  className?: string;
}) {
  const { t } = useLocale();
  return <LocaleText className={className}>{t(en, ru)}</LocaleText>;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ru");
  const [ready, setReady] = useState(false);
  const switchingRef = useRef(false);

  useEffect(() => {
    setLocale(readStoredLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, ready]);

  const switchLocale = useCallback(() => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    setLocale(flipLocale);
    window.setTimeout(() => {
      switchingRef.current = false;
    }, 450);
  }, []);

  const toggleLocale = useCallback(() => {
    switchLocale();
  }, [switchLocale]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(switchLocale, AUTO_SWITCH_MS);
    return () => window.clearInterval(id);
  }, [ready, switchLocale]);

  const t = useCallback(
    (en: string, ru: string) => (locale === "en" ? en : ru),
    [locale],
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
