"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { AreaPayload } from "@/entities/types";
import { ZONES } from "@/shared/config/zones";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { KpiTile } from "@/shared/ui/kpi-tile";
import { Panel } from "@/shared/ui/panel";
import { Badge } from "@/shared/ui/badge";
import { usePolling } from "@/shared/lib/use-polling";
import { cn } from "@/shared/lib/cn";
import { statusColors } from "@/shared/config/theme";
import { equipmentStatus } from "@/shared/lib/i18n";
import { ThroughputAreaChart } from "@/widgets/charts/throughput-area-chart";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";

const statusBadgeVariant = (status: string) => {
  if (status === "running") return "success" as const;
  if (status === "fault" || status === "blocked") return "alarm" as const;
  if (status === "manual") return "warning" as const;
  return "idle" as const;
};

export default function AreaPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const { data, loading } = usePolling<AreaPayload>(`/api/areas/${zoneId}`);
  const { t, locale } = useLocale();

  const breadcrumbs = [
    { label: t("Overview", "Обзор"), href: "/overview" },
    { label: t("Areas", "Зоны"), href: "/areas/Z01" },
    { label: data?.zone.name ?? zoneId },
  ];

  if (loading || !data) {
    return (
      <DashboardShell breadcrumbs={breadcrumbs}>
        <div className="flex h-64 items-center justify-center text-[#8B949E]">
          {t("Loading...", "Загрузка...")}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell breadcrumbs={breadcrumbs}>
      <div className="space-y-5">
        {/* Zone tabs */}
        <div className="flex flex-wrap gap-2">
          {ZONES.map((z) => (
            <Link
              key={z.id}
              href={`/areas/${z.id}`}
              className={cn(
                "min-h-10 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                z.id === zoneId
                  ? "border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[#22D3EE]"
                  : "border-[#30363D] text-[#8B949E] hover:border-[#22D3EE]/30 hover:text-[#E6EDF3]"
              )}
            >
              {z.shortName}
            </Link>
          ))}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#E6EDF3]">{data.zone.name}</h1>
          <p className="text-sm text-[#8B949E]">{data.zone.description}</p>
        </div>

        {/* Zone diagram */}
        <Panel title={t("Zone Diagram", "Схема зоны")}>
          <div className="flex flex-wrap items-center justify-center gap-4 py-6">
            {data.equipment.map((eq) => {
              const color = statusColors[eq.status] ?? statusColors.idle;
              return (
                <Link
                  key={eq.id}
                  href={`/detail/${eq.id}`}
                  className="flex min-w-[140px] flex-col items-center rounded-xl border border-[#30363D] bg-[#0D1117] p-4 transition-all hover:border-[#22D3EE]/40 hover:scale-[1.02]"
                >
                  <div className="mb-2 h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold text-[#E6EDF3]">{eq.name}</span>
                  <span className="mt-1 text-xs text-[#8B949E]">{eq.type}</span>
                  <Badge variant={statusBadgeVariant(eq.status)} className="mt-2">
                    {equipmentStatus(eq.status, locale)}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </Panel>

        {/* Local KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile label={t("Local Throughput", "Производ.")} value={data.localThroughput.toFixed(1)} unit={locale === "ru" ? "куб/мин" : "cubes/min"} accent />
          <KpiTile label={t("WIP Count", "WIP")} value={data.wipCount} />
          <KpiTile label={t("Queue Length", "Очередь")} value={data.queueLength} />
          <KpiTile label={t("Cycle Time", "Цикл")} value={data.cycleTimeSec.toFixed(2)} unit={locale === "ru" ? "с" : "sec"} />
        </div>

        <div className="grid grid-cols-12 gap-5">
          <Panel title={t("Throughput Trend", "Тренд производ.")} className="col-span-12 lg:col-span-6">
            <ThroughputAreaChart data={data.trend.throughput} height={240} />
          </Panel>
          <Panel title={t("Cycle Time Trend", "Тренд цикла")} className="col-span-12 lg:col-span-6">
            <TrendLineChart
              series={[{ name: t("Cycle Time (sec)", "Время цикла (с)"), data: data.trend.cycleTime, color: "#F59E0B" }]}
              height={240}
            />
          </Panel>
        </div>

        {/* Equipment list */}
        <Panel title={t("Equipment", "Оборудование")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] text-left text-xs uppercase tracking-wider text-[#8B949E]">
                  <th className="pb-3 pr-4">{t("Name", "Название")}</th>
                  <th className="pb-3 pr-4">{t("Type", "Тип")}</th>
                  <th className="pb-3 pr-4">{t("Status", "Статус")}</th>
                  <th className="pb-3 pr-4">{t("Throughput", "Производ.")}</th>
                  <th className="pb-3">{t("Cycle Time", "Цикл")}</th>
                </tr>
              </thead>
              <tbody>
                {data.equipment.map((eq) => (
                  <tr key={eq.id} className="border-b border-[#21262D] hover:bg-[#0D1117]">
                    <td className="py-3 pr-4">
                      <Link href={`/detail/${eq.id}`} className="font-medium text-[#22D3EE] hover:underline">
                        {eq.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-[#8B949E]">{eq.type}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusBadgeVariant(eq.status)}>{equipmentStatus(eq.status, locale)}</Badge>
                    </td>
                    <td className="py-3 pr-4">{eq.throughputPerMin}/{locale === "ru" ? "мин" : "min"}</td>
                    <td className="py-3">{eq.cycleTimeSec} {locale === "ru" ? "с" : "s"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Local alarms */}
        {data.activeAlarms.length > 0 && (
          <Panel title={t("Local Alarms", "Локальные тревоги")}>
            <ul className="space-y-2">
              {data.activeAlarms.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 p-3">
                  <Badge variant="alarm">{a.code}</Badge>
                  <span className="text-sm text-[#E6EDF3]">{a.message}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </DashboardShell>
  );
}
