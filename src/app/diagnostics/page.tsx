"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Alarm, ProcessEvent, Tag } from "@/entities/types";
import { ZONES } from "@/shared/config/zones";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { Panel } from "@/shared/ui/panel";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/formatters";
import { tagDirection, severityLabel, eventTypeLabel, qualityLabel } from "@/shared/lib/i18n";
import { EventTimelineChart } from "@/widgets/charts/event-timeline-chart";

type Tab = "tags" | "alarms" | "events";

export default function DiagnosticsPage() {
  const { t, locale } = useLocale();
  const [tab, setTab] = useState<Tab>("tags");
  const [tags, setTags] = useState<Tag[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [events, setEvents] = useState<ProcessEvent[]>([]);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (zoneFilter) params.set("zone", zoneFilter);
    if (directionFilter) params.set("direction", directionFilter);
    fetch(`/api/tags?${params}`).then((r) => r.json()).then(setTags);
    fetch("/api/alarms").then((r) => r.json()).then(setAlarms);
    fetch("/api/events").then((r) => r.json()).then(setEvents);
  }, [zoneFilter, directionFilter]);

  const filteredTags = tags.filter(
    (tag) =>
      !search ||
      tag.name.toLowerCase().includes(search.toLowerCase()) ||
      tag.path.toLowerCase().includes(search.toLowerCase())
  );

  const breadcrumbs = [
    { label: t("Overview", "Обзор"), href: "/overview" },
    { label: t("Diagnostics", "Диагностика") },
  ];

  return (
    <DashboardShell breadcrumbs={breadcrumbs}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#E6EDF3]">{t("Diagnostics", "Диагностика")}</h1>
          <Link href="/replay" className="text-sm text-[#22D3EE] hover:underline">
            {t("Open Replay Mode →", "Открыть воспроизведение →")}
          </Link>
        </div>

        {/* Communication panel */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Panel title={t("Communication", "Связь")}>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[#10B981] animate-pulse-subtle" />
              <span className="text-sm text-[#E6EDF3]">{t("PLC Connected", "PLC подключён")}</span>
            </div>
            <p className="mt-2 text-xs text-[#8B949E]">
              {t("Heartbeat: 1s · Latency: 12ms", "Пульс: 1 с · Задержка: 12 мс")}
            </p>
          </Panel>
          <Panel title={t("Data Quality", "Качество данных")}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#8B949E]">{t("Good tags", "Норма")}</span><span className="text-[#10B981]">94%</span></div>
              <div className="flex justify-between"><span className="text-[#8B949E]">{t("Uncertain", "Неопределено")}</span><span className="text-[#F59E0B]">4%</span></div>
              <div className="flex justify-between"><span className="text-[#8B949E]">{t("Bad", "Плохо")}</span><span className="text-[#EF4444]">2%</span></div>
            </div>
          </Panel>
          <Panel title={t("Sequence Trace", "Трассировка")}>
            <p className="text-sm text-[#8B949E]">Авто → Работа → {t("Normal cycle", "Нормальный цикл")}</p>
            <p className="mt-1 font-mono text-xs text-[#22D3EE]">M_Line_AutoMode = TRUE</p>
          </Panel>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["tags", "alarms", "events"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`min-h-10 rounded-lg px-4 text-sm font-medium capitalize ${
                tab === tb ? "bg-[#22D3EE]/15 text-[#22D3EE]" : "text-[#8B949E] hover:text-[#E6EDF3]"
              }`}
            >
              {tb === "tags" ? t("Tag Browser", "Теги") : tb === "alarms" ? t("Alarm Log", "Тревоги") : t("Event Log", "События")}
            </button>
          ))}
        </div>

        {tab === "tags" && (
          <Panel title={t("Tag Browser", "Обозреватель тегов")}>
            <div className="mb-4 flex flex-wrap gap-3">
              <input
                type="search"
                placeholder={t("Search tags...", "Поиск тегов...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-10 flex-1 rounded-lg border border-[#30363D] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] outline-none focus:border-[#22D3EE]/50"
              />
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="min-h-10 rounded-lg border border-[#30363D] bg-[#0D1117] px-3 text-sm text-[#E6EDF3]"
              >
                <option value="">{t("All zones", "Все зоны")}</option>
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="min-h-10 rounded-lg border border-[#30363D] bg-[#0D1117] px-3 text-sm text-[#E6EDF3]"
              >
                <option value="">{t("All directions", "Все направления")}</option>
                <option value="input">{t("Input", "Вход")}</option>
                <option value="output">{t("Output", "Выход")}</option>
                <option value="internal">{t("Internal", "Внутренний")}</option>
                <option value="calculated">{t("Calculated", "Расчётный")}</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#30363D] text-left text-xs uppercase text-[#8B949E]">
                    <th className="pb-3 pr-4">{t("Path", "Путь")}</th>
                    <th className="pb-3 pr-4">{t("Zone", "Зона")}</th>
                    <th className="pb-3 pr-4">{t("Direction", "Направление")}</th>
                    <th className="pb-3 pr-4">{t("Value", "Значение")}</th>
                    <th className="pb-3">{t("Quality", "Качество")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTags.map((tag) => (
                    <tr key={tag.id} className="border-b border-[#21262D] hover:bg-[#0D1117]">
                      <td className="py-2 pr-4 font-mono text-xs text-[#22D3EE]">{tag.name}</td>
                      <td className="py-2 pr-4">{tag.zoneId}</td>
                      <td className="py-2 pr-4 text-[#8B949E]">{tagDirection(tag.direction, locale)}</td>
                      <td className="py-2 pr-4">{String(tag.value)}</td>
                      <td className="py-2">
                        <Badge variant={tag.quality === "good" ? "success" : "alarm"}>{qualityLabel(tag.quality, locale)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "alarms" && (
          <Panel title={t("Alarm Log", "Журнал тревог")}>
            <EventTimelineChart items={alarms} height={Math.min(alarms.length * 36 + 40, 400)} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#30363D] text-left text-xs uppercase text-[#8B949E]">
                    <th className="pb-3 pr-4">{t("Time", "Время")}</th>
                    <th className="pb-3 pr-4">{t("Code", "Код")}</th>
                    <th className="pb-3 pr-4">{t("Severity", "Важность")}</th>
                    <th className="pb-3">{t("Message", "Сообщение")}</th>
                  </tr>
                </thead>
                <tbody>
                  {alarms.map((a) => (
                    <tr key={a.id} className="border-b border-[#21262D]">
                      <td className="py-2 pr-4 font-mono text-xs text-[#8B949E]">{formatDateTime(a.timestamp, locale)}</td>
                      <td className="py-2 pr-4 font-mono text-[#22D3EE]">{a.code}</td>
                      <td className="py-2 pr-4"><Badge variant={a.severity === "alarm" ? "alarm" : "warning"}>{severityLabel(a.severity, locale)}</Badge></td>
                      <td className="py-2">{a.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "events" && (
          <Panel title={t("Event Log", "Журнал событий")}>
            <EventTimelineChart items={events.slice(0, 15)} height={300} />
            <div className="mt-4 max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161B22]">
                  <tr className="border-b border-[#30363D] text-left text-xs uppercase text-[#8B949E]">
                    <th className="pb-3 pr-4">{t("Time", "Время")}</th>
                    <th className="pb-3 pr-4">{t("Type", "Тип")}</th>
                    <th className="pb-3 pr-4">{t("Zone", "Зона")}</th>
                    <th className="pb-3">{t("Message", "Сообщение")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-[#21262D]">
                      <td className="py-2 pr-4 font-mono text-xs text-[#8B949E]">{formatDateTime(ev.timestamp, locale)}</td>
                      <td className="py-2 pr-4"><Badge variant="default">{eventTypeLabel(ev.type, locale)}</Badge></td>
                      <td className="py-2 pr-4">{ev.zoneId}</td>
                      <td className="py-2">{ev.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </DashboardShell>
  );
}
