"use client";

import { useState } from "react";
import type { OverviewPayload } from "@/entities/types";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { KpiTile } from "@/shared/ui/kpi-tile";
import { Panel } from "@/shared/ui/panel";
import { usePolling } from "@/shared/lib/use-polling";
import { formatNumber, formatPercent } from "@/shared/lib/formatters";
import { chartColors } from "@/shared/config/theme";
import { KpiGaugeChart } from "@/widgets/charts/kpi-gauge-chart";
import { ProcessFlowChart } from "@/widgets/charts/process-flow-chart";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";
import { DowntimeParetoChart } from "@/widgets/charts/downtime-pareto-chart";
import { QualityDonutChart } from "@/widgets/charts/quality-donut-chart";

type TrendRange = "5m" | "15m" | "60m";

export default function OverviewPage() {
  const { data, loading } = usePolling<OverviewPayload>("/api/overview");
  const { locale, t } = useLocale();
  const [trendRange, setTrendRange] = useState<TrendRange>("15m");

  if (loading || !data) {
    return (
      <DashboardShell kiosk breadcrumbs={[{ label: t("Overview", "Обзор") }]}>
        <div className="flex h-full items-center justify-center text-muted">
          {t("Loading line data...", "Загрузка данных линии...")}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kiosk breadcrumbs={[{ label: t("Overview", "Обзор") }]}>
      <div className="grid h-full grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.85fr)] gap-2 overflow-hidden">
        {/* Строка 1: KPI + поток */}
        <div className="grid min-h-0 grid-cols-12 gap-2">
          <div className="col-span-2 grid grid-rows-4 gap-1.5">
            <KpiTile compact label={t("Total Produced", "Всего")} value={formatNumber(data.producedTotal)} accent />
            <KpiTile compact label={t("Good Count", "Годных")} value={formatNumber(data.goodCount)} variant="success" />
            <KpiTile compact label={t("Reject Count", "Брак")} value={formatNumber(data.rejectCount)} variant={data.rejectCount > 50 ? "alarm" : "default"} />
            <KpiTile compact label={t("Throughput", "Производ.")} value={data.throughputPerMin.toFixed(1)} unit={locale === "ru" ? "куб/мин" : "cubes/min"} accent />
          </div>

          <Panel
            compact
            fill
            title={t("Live Line Flow", "Динамика линии")}
            className="col-span-10 flex flex-col"
          >
            <div className="flex h-full min-h-0 flex-col">
              <ProcessFlowChart
                nodes={data.processFlow}
                zoneLoad={data.zoneLoad}
                variant="conveyor"
                fill
              />
            </div>
          </Panel>
        </div>

        {/* Строка 2: тренды + Pareto */}
        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel
            compact
            fill
            title={t("Production Trends", "Тренды производства")}
            className="col-span-7 flex flex-col"
            headerRight={
              <div className="flex gap-0.5">
                {(["5m", "15m", "60m"] as TrendRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTrendRange(r)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      trendRange === r
                        ? "bg-[color:color-mix(in_oklab,var(--accent)_22%,transparent)] text-[color:var(--accent)]"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-full min-h-0">
              <TrendLineChart
                compact
                series={[
                  { name: t("Throughput", "Производ."), data: data.trend.throughput, color: chartColors.throughput },
                  { name: t("Cycle Time", "Цикл"), data: data.trend.cycleTime, color: "#F59E0B" },
                  { name: t("Reject Rate", "Брак %"), data: data.trend.rejectRate, color: "#EF4444" },
                ]}
                height="100%"
              />
            </div>
          </Panel>

          <Panel compact fill title={t("Top Downtime Reasons", "Причины простоя")} className="col-span-5 flex flex-col">
            <div className="h-full min-h-0">
              <DowntimeParetoChart reasons={data.topDowntimeReasons} height="100%" />
            </div>
          </Panel>
        </div>

        {/* Строка 3: OEE + поток + качество */}
        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel
            compact
            fill
            title={t("OEE Decomposition", "Декомпозиция OEE")}
            className="col-span-3 flex flex-col"
            headerRight={
              <span className="text-lg font-bold text-[color:var(--accent)]">{formatPercent(data.oee, 0)}</span>
            }
          >
            <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-1">
              <KpiGaugeChart value={data.oee} label="OEE" height={90} />
              <KpiGaugeChart value={data.availability} label={t("Availability", "Доступ.")} height={90} />
              <KpiGaugeChart value={data.performance} label={t("Performance", "Произв.")} height={90} />
              <KpiGaugeChart value={data.quality} label={t("Quality", "Качество")} height={90} />
            </div>
          </Panel>

          <Panel
            compact
            fill
            title={t("Process Flow", "Поток процесса")}
            subtitle={t(`Bottleneck: ${data.bottleneckZone}`, `Узкое место: ${data.bottleneckZone}`)}
            className="col-span-6 flex flex-col"
          >
            <div className="flex h-full min-h-0 items-center">
              <ProcessFlowChart nodes={data.processFlow} compact />
            </div>
          </Panel>

          <Panel compact fill title={t("Quality Split", "Качество")} className="col-span-3 flex flex-col">
            <div className="h-full min-h-0">
              <QualityDonutChart goodCount={data.goodCount} rejectCount={data.rejectCount} height="100%" compact />
            </div>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
