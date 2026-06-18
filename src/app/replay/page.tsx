"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReplaySession } from "@/entities/types";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { Panel } from "@/shared/ui/panel";
import { Badge } from "@/shared/ui/badge";
import { formatPercent, formatDateTime } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/cn";
import { SessionComparisonChart } from "@/widgets/charts/session-comparison-chart";

export default function ReplayPage() {
  const { t, locale } = useLocale();
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch("/api/replay/sessions").then((r) => r.json()).then((data: ReplaySession[]) => {
      setSessions(data);
      if (data.length) setSelected(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 1));
    }, 200);
    return () => clearInterval(id);
  }, [playing]);

  const activeSession = sessions.find((s) => s.id === selected);

  const breadcrumbs = [
    { label: t("Overview", "Обзор"), href: "/overview" },
    { label: t("Replay", "Воспроизведение") },
  ];

  return (
    <DashboardShell breadcrumbs={breadcrumbs}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#E6EDF3]">{t("Replay Mode", "Режим воспроизведения")}</h1>
          <Link href="/diagnostics" className="text-sm text-[#22D3EE] hover:underline">
            ← {t("Diagnostics", "Диагностика")}
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Session list */}
          <Panel title={t("Sessions", "Сессии")} className="col-span-12 lg:col-span-4">
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setSelected(s.id); setProgress(0); }}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition-colors",
                      selected === s.id
                        ? "border-[#22D3EE]/50 bg-[#22D3EE]/10"
                        : "border-[#30363D] hover:border-[#22D3EE]/30"
                    )}
                  >
                    <p className="font-medium text-[#E6EDF3]">{s.name}</p>
                    <p className="mt-1 text-xs text-[#8B949E]">{formatDateTime(s.date, locale)}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="default">OEE {formatPercent(s.oee, 0)}</Badge>
                      <Badge variant="success">{s.produced} {locale === "ru" ? "куб." : "cubes"}</Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Playback controls */}
          <Panel title={t("Playback", "Воспроизведение")} className="col-span-12 lg:col-span-8">
            {activeSession && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[#22D3EE] hover:bg-[#22D3EE]/20"
                  >
                    {playing ? "⏸" : "▶"}
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-[#E6EDF3]">{activeSession.name}</p>
                    <p className="text-sm text-[#8B949E]">
                      {activeSession.durationMin} {locale === "ru" ? "мин" : "min"} · {locale === "ru" ? "Брак" : "Reject rate"} {(activeSession.rejectRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-[#22D3EE]"
                />
                <div className="flex justify-between text-xs text-[#8B949E]">
                  <span>0:00</span>
                  <span>{Math.floor((progress / 100) * activeSession.durationMin)}:{String(Math.floor(((progress / 100) * activeSession.durationMin % 1) * 60)).padStart(2, "0")}</span>
                  <span>{activeSession.durationMin}:00</span>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel title={t("Session Comparison", "Сравнение сессий")}>
          <SessionComparisonChart sessions={sessions} height={320} />
        </Panel>
      </div>
    </DashboardShell>
  );
}
