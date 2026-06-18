"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/shared/lib/cn";
import { ScenarioSwitcher } from "@/features/scenario-switcher/scenario-switcher";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { LiveClock } from "./live-clock";

const navItems = [
  { href: "/overview", label: { en: "Overview", ru: "Обзор" }, icon: "◫", match: undefined },
  { href: "/areas/Z01", label: { en: "Areas", ru: "Зоны" }, icon: "▦", match: "/areas" },
  { href: "/diagnostics", label: { en: "Diagnostics", ru: "Диагностика" }, icon: "◎", match: "/diagnostics" },
  { href: "/replay", label: { en: "Replay", ru: "Воспроизведение" }, icon: "▶", match: "/replay" },
];

interface DashboardShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  /** Без внутренней прокрутки — для kiosk / большого экрана */
  kiosk?: boolean;
}

export function DashboardShell({ children, breadcrumbs, kiosk = false }: DashboardShellProps) {
  const pathname = usePathname();
  const { locale, toggleLocale, t } = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Rail sidebar — по умолчанию ~52px, раскрывается по hover / tap */}
      <aside
        className={cn(
          "group/sidebar relative z-20 flex shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 ease-out",
          sidebarOpen ? "w-[168px]" : "w-[52px] hover:w-[168px]"
        )}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="flex h-11 shrink-0 items-center overflow-hidden border-b border-border px-2">
          <Link href="/overview" className="flex min-w-0 items-center gap-2 overflow-hidden">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[color:color-mix(in_oklab,var(--accent)_18%,transparent)] p-1">
              <Image
                src="/alabuga-mark.svg"
                alt={t("Alabuga SEZ", "ОЭЗ «Алабуга»")}
                width={18}
                height={18}
                className="h-[18px] w-[18px] object-contain"
                priority
                draggable={false}
              />
            </span>
            <span
              className={cn(
                "truncate text-sm font-bold text-[color:var(--accent)] whitespace-nowrap transition-[opacity,width] duration-150",
                sidebarOpen
                  ? "w-auto opacity-100"
                  : "w-0 opacity-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100"
              )}
            >
              {t("SEZ Alabuga", "ОЭЗ «Алабуга»")}
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-1.5">
          {navItems.map((item) => {
            const active = item.match
              ? pathname.startsWith(item.match)
              : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.label.en, item.label.ru)}
                className={cn(
                  "flex h-10 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color:var(--accent)]"
                    : "text-muted hover:bg-panel hover:text-foreground"
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-base">{item.icon}</span>
                <span
                  className={cn(
                    "truncate whitespace-nowrap transition-opacity duration-150",
                    sidebarOpen ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100"
                  )}
                >
                  {t(item.label.en, item.label.ru)}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 truncate text-xs text-muted">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && <span className="text-border">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="truncate hover:text-[color:var(--accent)]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="truncate text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ScenarioSwitcher />
            <button
              onClick={toggleLocale}
              className="h-8 rounded-md border border-border px-2 text-xs text-muted hover:border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border))] hover:text-foreground"
            >
              {locale === "en" ? "RU" : "EN"}
            </button>
            <LiveClock />
          </div>
        </header>

        <main
          className={cn(
            "min-h-0 flex-1 p-3",
            kiosk ? "overflow-hidden" : "overflow-auto"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
