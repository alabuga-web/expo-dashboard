"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { EquipmentDetailPayload } from "@/entities/types";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { Panel } from "@/shared/ui/panel";
import { Badge } from "@/shared/ui/badge";
import { usePolling } from "@/shared/lib/use-polling";
import { formatDateTime } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/cn";
import { equipmentStatus, qualityLabel } from "@/shared/lib/i18n";
import { ThroughputAreaChart } from "@/widgets/charts/throughput-area-chart";

export default function DetailPage() {
  const params = useParams();
  const equipmentId = params.equipmentId as string;
  const { data, loading, refetch } = usePolling<EquipmentDetailPayload>(`/api/equipment/${equipmentId}`);
  const { t, locale } = useLocale();
  const [manualState, setManualState] = useState<string | null>(null);

  const breadcrumbs = [
    { label: t("Overview", "Обзор"), href: "/overview" },
    { label: t("Areas", "Зоны"), href: data ? `/areas/${data.zone.id}` : "/areas/Z01" },
    { label: data?.equipment.name ?? equipmentId },
  ];

  const handleControl = (action: string) => {
    setManualState(action);
    setTimeout(() => refetch(), 300);
  };

  if (loading || !data) {
    return (
      <DashboardShell breadcrumbs={breadcrumbs}>
        <div className="flex h-64 items-center justify-center text-[#8B949E]">
          {t("Loading...", "Загрузка...")}
        </div>
      </DashboardShell>
    );
  }

  const currentState = manualState ?? data.stateMachine.current;

  return (
    <DashboardShell breadcrumbs={breadcrumbs}>
      <div className="space-y-5">
        {/* Passport */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E6EDF3]">{data.equipment.name}</h1>
            <p className="text-sm text-[#8B949E]">
              {data.zone.name} · {data.equipment.type} · {data.equipment.id}
            </p>
          </div>
          <Badge variant={data.equipment.status === "running" ? "success" : data.equipment.status === "fault" ? "alarm" : "warning"}>
            {equipmentStatus(data.equipment.status, locale)}
          </Badge>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* State machine */}
          <Panel title={t("State Machine", "Автомат состояний")} className="col-span-12 lg:col-span-4">
            <div className="flex flex-wrap gap-2">
              {data.stateMachine.states.map((state) => (
                <div
                  key={state}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium",
                    currentState === state
                      ? "border-[#22D3EE] bg-[#22D3EE]/15 text-[#22D3EE]"
                      : "border-[#30363D] text-[#8B949E]"
                  )}
                >
                  {state}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1">
              {data.stateMachine.transitions.map((tr) => (
                <p key={tr} className="text-xs text-[#8B949E]">{tr}</p>
              ))}
            </div>
          </Panel>

          {/* Manual controls */}
          <Panel title={t("Manual Controls", "Ручное управление")} className="col-span-12 lg:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "Start", label: t("Start", "Пуск") },
                { id: "Stop", label: t("Stop", "Стоп") },
                { id: "Reset", label: t("Reset", "Сброс") },
                { id: "Auto/Manual", label: t("Auto/Manual", "Авто/Ручн.") },
                { id: "Step", label: t("Step", "Шаг") },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleControl(btn.id)}
                  className="min-h-12 rounded-lg border border-[#30363D] bg-[#0D1117] text-sm font-medium text-[#E6EDF3] transition-colors hover:border-[#22D3EE]/50 hover:bg-[#22D3EE]/10"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            {manualState && (
              <p className="mt-3 text-xs text-[#22D3EE]">
                {t("Action sent:", "Команда отправлена:")} {manualState}
              </p>
            )}
          </Panel>

          {/* Interlocks */}
          <Panel title={t("Interlocks", "Блокировки")} className="col-span-12 lg:col-span-4">
            <ul className="space-y-2">
              {data.interlocks.map((il) => (
                <li key={il.name} className="flex items-center justify-between rounded-lg border border-[#30363D] px-3 py-2">
                  <span className="text-sm text-[#E6EDF3]">{il.name}</span>
                  <Badge variant={il.satisfied ? "success" : "alarm"}>
                    {il.satisfied ? "OK" : t("FAIL", "НЕТ")}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Tags */}
        <Panel title={t("Tags", "Теги")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] text-left text-xs uppercase tracking-wider text-[#8B949E]">
                  <th className="pb-3 pr-4">{t("Name", "Имя")}</th>
                  <th className="pb-3 pr-4">{t("Direction", "Направление")}</th>
                  <th className="pb-3 pr-4">{t("Type", "Тип")}</th>
                  <th className="pb-3 pr-4">{t("Value", "Значение")}</th>
                  <th className="pb-3">{t("Quality", "Качество")}</th>
                </tr>
              </thead>
              <tbody>
                {data.tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-[#21262D]">
                    <td className="py-2 pr-4 font-mono text-xs text-[#22D3EE]">{tag.name}</td>
                    <td className="py-2 pr-4 text-[#8B949E]">{tag.direction}</td>
                    <td className="py-2 pr-4 text-[#8B949E]">{tag.type}</td>
                    <td className="py-2 pr-4 font-medium">{String(tag.value)}{tag.unit ? ` ${tag.unit}` : ""}</td>
                    <td className="py-2">
                      <Badge variant={tag.quality === "good" ? "success" : tag.quality === "bad" ? "alarm" : "warning"}>
                        {qualityLabel(tag.quality, locale)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid grid-cols-12 gap-5">
          {/* Trend */}
          <Panel title={data.trendLabel} className="col-span-12 lg:col-span-6">
            <ThroughputAreaChart
              data={data.trend}
              label={data.trendLabel}
              unit={locale === "ru" ? "куб/мин" : "cubes/min"}
              height={240}
            />
          </Panel>

          {/* Event log */}
          <Panel title={t("Event Log", "Журнал событий")} className="col-span-12 lg:col-span-6">
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161B22]">
                  <tr className="border-b border-[#30363D] text-left text-xs uppercase text-[#8B949E]">
                    <th className="pb-2 pr-3">{t("Time", "Время")}</th>
                    <th className="pb-2 pr-3">{t("Type", "Тип")}</th>
                    <th className="pb-2">{t("Message", "Сообщение")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((ev) => (
                    <tr key={ev.id} className="border-b border-[#21262D]">
                      <td className="py-2 pr-3 font-mono text-xs text-[#8B949E]">{formatDateTime(ev.timestamp, locale)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="default">{ev.type}</Badge>
                      </td>
                      <td className="py-2 text-[#E6EDF3]">{ev.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <Link href={`/areas/${data.zone.id}`} className="inline-block text-sm text-[#22D3EE] hover:underline">
          ← {t("Back to zone", "Назад к зоне")} {data.zone.name}
        </Link>
      </div>
    </DashboardShell>
  );
}
