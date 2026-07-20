import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { Locale } from "@/shared/lib/i18n";

export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 0, locale: Locale = "ru"): string {
  return value.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatThroughput(value: number, locale: Locale = "ru"): string {
  return locale === "ru"
    ? `${value.toFixed(1)} куб/мин`
    : `${value.toFixed(1)} cubes/min`;
}

export function formatDuration(sec: number, locale: Locale = "ru"): string {
  if (sec < 60) return locale === "ru" ? `${Math.round(sec)} с` : `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (locale === "ru") {
    return s > 0 ? `${m} мин ${s} с` : `${m} мин`;
  }
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm:ss");
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string, locale: Locale = "ru"): string {
  try {
    return format(parseISO(iso), "d MMM, HH:mm:ss", {
      locale: locale === "ru" ? ru : undefined,
    });
  } catch {
    return iso;
  }
}

export function lineStatusLabel(status: string, locale: Locale = "ru"): string {
  const labels: Record<string, Record<Locale, string>> = {
    running: { en: "Running", ru: "Работа" },
    idle: { en: "Idle", ru: "Простой" },
    starved: { en: "Starved", ru: "Голодание" },
    blocked: { en: "Blocked", ru: "Затор" },
    alarm: { en: "Alarm", ru: "Авария" },
    manual: { en: "Manual", ru: "Ручной режим" },
    fault: { en: "Fault", ru: "Неисправность" },
  };
  return labels[status]?.[locale] ?? status;
}
