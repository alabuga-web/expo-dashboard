"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { Panel } from "@/shared/ui/panel";
import { usePolling } from "@/shared/lib/use-polling";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { colors, chartColors } from "@/shared/config/theme";
import { formatDuration, formatTime } from "@/shared/lib/formatters";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";
import { ChartContainer } from "@/widgets/charts/chart-container";
import { EventTimelineChart } from "@/widgets/charts/event-timeline-chart";
import { KpiGaugeChart } from "@/widgets/charts/kpi-gauge-chart";
import type { ProcessPayload } from "@/shared/lib/plc-data";

echarts.use([LineChart, ScatterChart, BarChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, CanvasRenderer]);

interface AdvancedChartProps {
  option: object;
  height?: number | string;
  empty?: boolean;
}

function AdvancedChart({ option, height = "100%", empty = false }: AdvancedChartProps) {
  registerEchartsTheme();
  const fill = height === "100%";
  return (
    <ChartContainer height={height} fill={fill} empty={empty}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        theme="factoryHmi"
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={false}
        lazyUpdate
      />
    </ChartContainer>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#10B981] shadow-[0_0_12px_#10B981]" : "bg-[#4B5563]"}`} />
      <span>{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{children}</div>;
}

function PoseChip({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-foreground">
        {value}
        {unit ? <span className="ml-1 text-xs text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}

function baseGrid(left = 42) {
  return { top: 34, right: 14, bottom: 32, left };
}

export default function ProcessPage() {
  const { t, locale } = useLocale();
  const { data, loading } = usePolling<ProcessPayload>("/api/process", 1000);

  if (loading || !data) {
    return (
      <DashboardShell breadcrumbs={[{ label: t("Processes", "Процессы") }]}>
        <div className="flex h-full items-center justify-center text-muted">
          {t("Loading line processes...", "Загрузка процессов линии...")}
        </div>
      </DashboardShell>
    );
  }

  const { pose, arm, linePass, sorting, pickCycle, analytics } = data;

  const passSeries = [
    { name: t("Entry DS1", "Вход DS1"), data: linePass.diffuse1, color: "#22D3EE" },
    { name: t("Line DS3", "Линия DS3"), data: linePass.diffuse3, color: "#38BDF8" },
    { name: t("Buffer DS9", "Буфер DS9"), data: linePass.diffuse9, color: "#A78BFA" },
    { name: "Vision", data: linePass.vision, color: "#F472B6" },
    { name: t("Sort DS10", "Сорт. DS10"), data: linePass.diffuse10, color: "#F59E0B" },
  ];

  const sortingSeries = [
    { name: t("Blue ← left", "Синие ← left"), data: sorting.left, color: "#2563EB" },
    { name: t("Green → right", "Зелёные → right"), data: sorting.right, color: "#10B981" },
    { name: t("Metal", "Серые metal"), data: sorting.metal, color: "#94A3B8" },
  ];

  const pickSeries = [
    { name: t("Pose error", "Ошибка поз."), data: pickCycle.error, color: "#F43F5E" },
    { name: "Box detected", data: pickCycle.boxDetected, color: "#A78BFA" },
    { name: "Grab", data: pickCycle.grab, color: "#22D3EE" },
  ];

  const xyTrajectoryOption = {
      animationDuration: 300,
      grid: baseGrid(46),
      tooltip: {
        trigger: "axis",
        formatter: (items: Array<{ data: number[]; seriesName: string }>) =>
          items.map((item) => `${item.seriesName}: X ${item.data[0]?.toFixed?.(2)} / Y ${item.data[1]?.toFixed?.(2)}`).join("<br/>"),
      },
      legend: { top: 0, right: 0, textStyle: { color: colors.textMuted, fontSize: 10 } },
      xAxis: { type: "value", name: "X", min: 0, max: 10, splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" } } },
      yAxis: { type: "value", name: "Y", min: 0, max: 10, splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" } } },
      series: [
        {
          name: t("TCP path", "Путь TCP"),
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2, color: "#22D3EE" },
          data: analytics.xyPath.map((point) => [point.x, point.y]),
        },
        {
          name: t("Current", "Текущая"),
          type: "scatter",
          symbolSize: 11,
          itemStyle: { color: "#F59E0B" },
          data: analytics.xyPath.length ? [[pose.x, pose.y]] : [],
        },
      ],
    };

  const setpointScatterOption = {
      grid: baseGrid(46),
      tooltip: { trigger: "item" },
      legend: { top: 0, right: 0, textStyle: { color: colors.textMuted, fontSize: 10 } },
      xAxis: { type: "value", name: t("Setpoint", "Уставка"), min: 0, max: 10 },
      yAxis: { type: "value", name: t("Actual", "Факт"), min: 0, max: 10 },
      series: [
        {
          name: "X",
          type: "scatter",
          symbolSize: 7,
          itemStyle: { color: "#F43F5E" },
          data: analytics.xyPath.map((point) => [point.sx, point.x, point.error]),
        },
        {
          name: "Y",
          type: "scatter",
          symbolSize: 7,
          itemStyle: { color: "#22D3EE" },
          data: analytics.xyPath.map((point) => [point.sy, point.y, point.error]),
        },
        {
          name: "Z",
          type: "scatter",
          symbolSize: 7,
          itemStyle: { color: "#A78BFA" },
          data: analytics.xyPath.map((point) => [point.sz, point.z, point.error]),
        },
        {
          name: t("Ideal", "Идеал"),
          type: "line",
          symbol: "none",
          lineStyle: { color: colors.border, type: "dashed" },
          data: [
            [0, 0],
            [10, 10],
          ],
        },
      ],
    };

  const histogramOption = {
      grid: baseGrid(42),
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: analytics.errorHistogram.map((bucket) => bucket.bucket) },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          name: t("Samples", "Замеры"),
          type: "bar",
          barWidth: "58%",
          itemStyle: { color: "#F43F5E", borderRadius: [4, 4, 0, 0] },
          data: analytics.errorHistogram.map((bucket) => bucket.count),
        },
      ],
    };

  const cycleBarOption = {
      grid: baseGrid(44),
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, right: 0, textStyle: { color: colors.textMuted, fontSize: 10 } },
      xAxis: { type: "category", data: analytics.cycles.map((cycle) => formatTime(cycle.end)) },
      yAxis: { type: "value", name: "sec" },
      series: [
        {
          name: t("Box → Grab", "Box → Grab"),
          type: "bar",
          stack: "cycle",
          itemStyle: { color: "#A78BFA", borderRadius: [3, 3, 0, 0] },
          data: analytics.cycles.map((cycle) => cycle.grabDelaySec),
        },
        {
          name: t("Hold", "Удержание"),
          type: "bar",
          stack: "cycle",
          itemStyle: { color: "#22D3EE", borderRadius: [3, 3, 0, 0] },
          data: analytics.cycles.map((cycle) => cycle.holdSec),
        },
      ],
    };

  const heatmapSensors = [...new Set(analytics.sensorHeatmap.map((point) => point.sensor))];
  const heatmapBuckets = [...new Set(analytics.sensorHeatmap.map((point) => point.bucket))];
  const heatmapOption = {
      grid: { top: 28, right: 20, bottom: 48, left: 58 },
      tooltip: {
        formatter: (p: { data: [number, number, number] }) =>
          `${heatmapSensors[p.data[1]]}<br/>${formatTime(heatmapBuckets[p.data[0]])}: ${p.data[2]}`,
      },
      xAxis: { type: "category", data: heatmapBuckets.map(formatTime), axisLabel: { rotate: 30, fontSize: 9 } },
      yAxis: { type: "category", data: heatmapSensors, axisLabel: { fontSize: 10 } },
      visualMap: {
        min: 0,
        max: Math.max(1, ...analytics.sensorHeatmap.map((point) => point.value)),
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        textStyle: { color: colors.textMuted },
        inRange: { color: [colors.panelHover, chartColors.primary, colors.warning] },
      },
      series: [
        {
          name: t("Activity", "Активность"),
          type: "heatmap",
          data: analytics.sensorHeatmap.map((point) => [heatmapBuckets.indexOf(point.bucket), heatmapSensors.indexOf(point.sensor), point.value]),
        },
      ],
    };

  const pulseCountOption = {
      grid: { top: 24, right: 12, bottom: 40, left: 38 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: analytics.pulseCounts.map((item) => item.sensor), axisLabel: { rotate: 20, fontSize: 10 } },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          name: t("Rising edges", "Фронты"),
          type: "bar",
          itemStyle: { color: "#10B981", borderRadius: [4, 4, 0, 0] },
          data: analytics.pulseCounts.map((item) => item.count),
        },
      ],
    };

  const correlationOption = {
      grid: { top: 24, right: 12, bottom: 36, left: 42 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "category",
        data: [t("Box + Grab", "Box + Grab"), t("Box only", "Только Box"), t("Grab only", "Только Grab"), t("Idle", "Idle")],
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          name: t("Samples", "Замеры"),
          type: "bar",
          itemStyle: { color: "#6366F1", borderRadius: [4, 4, 0, 0] },
          data: [
            analytics.grabBoxCorrelation.matched,
            analytics.grabBoxCorrelation.boxOnly,
            analytics.grabBoxCorrelation.grabOnly,
            analytics.grabBoxCorrelation.idle,
          ],
        },
      ],
    };

  return (
    <DashboardShell breadcrumbs={[{ label: t("Line processes (demo)", "Процессы линии (демо)") }]}>
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel px-4 py-2">
          <div className="text-sm text-muted">
            {t(
              "All PLC trend variations: sensors, sorting, FX5, grab cycle",
              "Все вариации трендов PLC: датчики, сортировка, FX5, цикл захвата",
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              active={data.status.connected}
              label={data.status.source === "db-replay" ? t("DB Replay", "Replay БД") : "Live OPC"}
            />
            <StatusPill active={data.status.operatingMode === 8 || data.status.operatingMode === 9} label={`PLC ${data.status.operatingModeLabel}`} />
            <StatusPill active={data.status.heartbeatAlive} label="Heartbeat" />
            <StatusPill active={pose.grab} label="Grab" />
            <StatusPill active={pose.boxDetected} label="Box" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <PoseChip label={t("X actual", "X факт")} value={pose.x.toFixed(2)} />
          <PoseChip label={t("Y actual", "Y факт")} value={pose.y.toFixed(2)} />
          <PoseChip label={t("Z actual", "Z факт")} value={pose.z.toFixed(2)} />
          <PoseChip label={t("X setpoint", "X уставка")} value={pose.sx.toFixed(2)} />
          <PoseChip label={t("Y setpoint", "Y уставка")} value={pose.sy.toFixed(2)} />
          <PoseChip label={t("Z setpoint", "Z уставка")} value={pose.sz.toFixed(2)} />
          <PoseChip label={t("Error", "Ошибка")} value={pose.error.toFixed(3)} />
          <PoseChip label={t("Mode", "Режим")} value={pose.grab ? "GRAB" : "IDLE"} />
        </div>

        <SectionTitle>{t("New diagnostic charts", "Новые диагностические графики")}</SectionTitle>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("XY TCP trajectory", "XY-траектория TCP")} subtitle={t("Shows the real TCP movement path in XY; the orange point is the current position.", "Показывает реальный путь TCP в плоскости XY; оранжевая точка — текущая позиция.")} className="col-span-6 h-[320px]">
            <AdvancedChart option={xyTrajectoryOption} empty={!analytics.xyPath.length} />
          </Panel>
          <Panel compact fill title={t("Actual vs setpoint scatter", "Scatter: факт vs уставка")} subtitle={t("Each dot compares actual position with the setpoint; the dashed diagonal is the ideal match.", "Каждая точка сравнивает факт с уставкой; пунктирная диагональ — идеальное совпадение.")} className="col-span-6 h-[320px]">
            <AdvancedChart option={setpointScatterOption} empty={!analytics.xyPath.length} />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Axis error X/Y/Z", "Ошибка по осям X/Y/Z")} subtitle={t("Positive and negative deltas show which axis diverges from the setpoint.", "Положительные и отрицательные отклонения показывают, какая ось ушла от уставки.")} className="col-span-6 h-[300px]">
            <TrendLineChart
              compact
              area
              height="100%"
              series={[
                { name: "dX", data: analytics.axisError.x, color: "#F43F5E" },
                { name: "dY", data: analytics.axisError.y, color: "#22D3EE" },
                { name: "dZ", data: analytics.axisError.z, color: "#A78BFA" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("TCP error histogram", "Гистограмма ошибки TCP")} subtitle={t("Buckets show how often the positioning error falls into each range.", "Столбцы показывают, как часто ошибка попадает в каждый диапазон.")} className="col-span-3 h-[300px]">
            <AdvancedChart option={histogramOption} empty={!analytics.errorHistogram.some((bucket) => bucket.count > 0)} />
          </Panel>
          <Panel compact fill title={t("Current TCP error gauge", "Gauge текущей ошибки TCP")} subtitle={t("Current total TCP error: green is low, yellow is warning, red is high.", "Текущая общая ошибка TCP: зелёный — норма, жёлтый — внимание, красный — высокая.")} className="col-span-3 h-[300px]">
            <KpiGaugeChart
              value={pose.error}
              min={0}
              max={5}
              unit=""
              color={pose.error > 2 ? colors.alarm : pose.error > 0.75 ? colors.warning : colors.success}
              label={t("TCP error", "Ошибка TCP")}
              height={250}
              formatValue={(value) => value.toFixed(2)}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Cycle time trend", "Тренд времени цикла")} subtitle={t("Shows duration of completed pick cycles over time.", "Показывает длительность завершённых циклов захвата во времени.")} className="col-span-4 h-[280px]">
            <TrendLineChart
              compact
              area
              height="100%"
              series={[{ name: t("Cycle time", "Время цикла"), data: analytics.cycleTime, color: "#F59E0B" }]}
            />
          </Panel>
          <Panel compact fill title={t("Cycle Gantt: Box → Grab → Release", "Гант цикла: Box → Grab → Release")} subtitle={t("Stacked bars split each cycle into detection delay and hold time.", "Составные столбцы делят цикл на задержку до захвата и время удержания.")} className="col-span-4 h-[280px]">
            <AdvancedChart option={cycleBarOption} empty={!analytics.cycles.length} />
          </Panel>
          <Panel compact fill title={t("Recent cycle cards", "Последние циклы")} subtitle={t("Quick list of recent completed cycles with total and hold duration.", "Краткий список последних завершённых циклов с общей длительностью и удержанием.")} className="col-span-4 h-[280px]">
            <div className="grid h-full content-start gap-2 overflow-hidden text-xs">
              {analytics.cycles.slice(-6).reverse().map((cycle) => (
                <div key={cycle.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                  <span className="font-mono text-muted">{formatTime(cycle.end)}</span>
                  <span className="truncate text-foreground">{formatDuration(cycle.durationSec, locale)}</span>
                  <span className="font-mono text-[#22D3EE]">{cycle.holdSec.toFixed(1)}s</span>
                </div>
              ))}
              {!analytics.cycles.length && <div className="flex h-full items-center justify-center text-muted">{t("No completed cycles", "Нет завершённых циклов")}</div>}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Sensor activity heatmap", "Heatmap активности датчиков")} subtitle={t("Color intensity shows how often each signal was active in each time bucket.", "Интенсивность цвета показывает, как часто сигнал был активен в каждом временном окне.")} className="col-span-6 h-[330px]">
            <AdvancedChart option={heatmapOption} empty={!analytics.sensorHeatmap.length} />
          </Panel>
          <Panel compact fill title={t("Pulse counts", "Количество импульсов")} subtitle={t("Counts rising edges for sensors and actuators in the current history window.", "Считает фронты включения датчиков и исполнительных сигналов в текущем окне истории.")} className="col-span-3 h-[330px]">
            <AdvancedChart option={pulseCountOption} empty={!analytics.pulseCounts.length} />
          </Panel>
          <Panel compact fill title={t("Grab / Box correlation", "Корреляция Grab / Box")} subtitle={t("Compares box detection and grab state to reveal misses or false grabs.", "Сравнивает обнаружение коробки и состояние захвата, чтобы увидеть пропуски или ложные захваты.")} className="col-span-3 h-[330px]">
            <AdvancedChart option={correlationOption} empty={!analytics.grabBoxCorrelation.matched && !analytics.grabBoxCorrelation.boxOnly && !analytics.grabBoxCorrelation.grabOnly} />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Event timeline", "Timeline событий")} subtitle={t("Recent process events: BOX, GRAB and RELEASE from completed cycles.", "Последние события процесса: BOX, GRAB и RELEASE из завершённых циклов.")} className="col-span-6 h-[300px]">
            <EventTimelineChart items={analytics.events} height={250} />
          </Panel>
          <Panel compact fill title={t("Mini chart X", "Мини-график X")} subtitle={t("Compact trend of the X axis.", "Компактный тренд оси X.")} className="col-span-2 h-[300px]">
            <TrendLineChart compact area height="100%" series={[{ name: "X", data: arm.x, color: "#F43F5E" }]} />
          </Panel>
          <Panel compact fill title={t("Mini chart Y", "Мини-график Y")} subtitle={t("Compact trend of the Y axis.", "Компактный тренд оси Y.")} className="col-span-2 h-[300px]">
            <TrendLineChart compact area height="100%" series={[{ name: "Y", data: arm.y, color: "#22D3EE" }]} />
          </Panel>
          <Panel compact fill title={t("Mini chart Z", "Мини-график Z")} subtitle={t("Compact trend of the Z axis.", "Компактный тренд оси Z.")} className="col-span-2 h-[300px]">
            <TrendLineChart compact area height="100%" series={[{ name: "Z", data: arm.z, color: "#A78BFA" }]} />
          </Panel>
        </div>

        <SectionTitle>{t("Existing trend variations", "Существующие вариации трендов")}</SectionTitle>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Line pass — tracks (step)", "Проход по линии — дорожки (step)")} subtitle={t("Digital lanes show the order of sensor activations along the line.", "Цифровые дорожки показывают порядок срабатывания датчиков по линии.")} className="col-span-12 h-[300px]">
            <TrendLineChart compact step height="100%" series={passSeries} />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Line pass — area", "Проход по линии — area")} subtitle={t("Area view makes overlapping sensor activity easier to compare.", "Заливка помогает сравнивать перекрывающуюся активность датчиков.")} className="col-span-6 h-[280px]">
            <TrendLineChart compact area height="100%" series={passSeries} />
          </Panel>
          <Panel compact fill title={t("Line pass — step + area", "Проход по линии — step + area")} subtitle={t("Step lines preserve digital edges, while area highlights active intervals.", "Ступени сохраняют цифровые фронты, а заливка подчёркивает активные интервалы.")} className="col-span-6 h-[280px]">
            <TrendLineChart compact step area height="100%" series={passSeries} />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Sorting — tracks (step)", "Сортировка — дорожки (step)")} subtitle={t("Shows which route was active for blue, green and metal products.", "Показывает активные маршруты для синих, зелёных и металлических деталей.")} className="col-span-6 h-[280px]">
            <TrendLineChart compact step height="100%" series={sortingSeries} />
          </Panel>
          <Panel compact fill title={t("Sorting — step + area + stack", "Сортировка — step + area + stack")} subtitle={t("Stacked view emphasizes total sorting load and route overlap.", "Стековая заливка подчёркивает суммарную нагрузку сортировки и пересечения маршрутов.")} className="col-span-6 h-[280px]">
            <TrendLineChart compact step area stack height="100%" series={sortingSeries} />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Grab cycle: error + box + grab", "Цикл захвата: ошибка + box + grab")} subtitle={t("Compares positioning error with box detection and grab command.", "Сравнивает ошибку позиционирования с обнаружением коробки и командой захвата.")} className="col-span-6 h-[280px]">
            <TrendLineChart compact height="100%" series={pickSeries} />
          </Panel>
          <Panel compact fill title={t("Grab cycle — area", "Цикл захвата — area")} subtitle={t("Area fill makes active grab/box intervals visible against the error curve.", "Заливка делает интервалы Box/Grab заметными на фоне кривой ошибки.")} className="col-span-6 h-[280px]">
            <TrendLineChart compact area height="100%" series={pickSeries} />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("FX5 XYZ position (actual)", "FX5 позиция XYZ (факт)")} subtitle={t("Actual measured position of the FX5 axes from PLC history.", "Фактическое положение осей FX5 по истории PLC.")} className="col-span-6 h-[280px]">
            <TrendLineChart
              compact
              area
              height="100%"
              series={[
                { name: "X", data: arm.x, color: "#F43F5E" },
                { name: "Y", data: arm.y, color: "#22D3EE" },
                { name: "Z", data: arm.z, color: "#A78BFA" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("FX5 XYZ setpoints", "FX5 уставки XYZ (setpoint)")} subtitle={t("Commanded setpoints for the same axes, used as the target trajectory.", "Командные уставки тех же осей, то есть целевая траектория.")} className="col-span-6 h-[280px]">
            <TrendLineChart
              compact
              area
              height="100%"
              series={[
                { name: "SX", data: arm.sx, color: "#FB7185" },
                { name: "SY", data: arm.sy, color: "#67E8F9" },
                { name: "SZ", data: arm.sz, color: "#C4B5FD" },
              ]}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("FX5 X: actual vs setpoint", "FX5 X: факт vs уставка")} subtitle={t("X axis tracking quality: closer lines mean better following.", "Качество слежения оси X: чем ближе линии, тем лучше отработка.")} className="col-span-4 h-[260px]">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: t("X actual", "X факт"), data: arm.x, color: "#F43F5E" },
                { name: t("X setpoint", "X уставка"), data: arm.sx, color: "#F59E0B" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("FX5 Y: actual vs setpoint", "FX5 Y: факт vs уставка")} subtitle={t("Y axis tracking quality against the commanded setpoint.", "Качество слежения оси Y относительно командной уставки.")} className="col-span-4 h-[260px]">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: t("Y actual", "Y факт"), data: arm.y, color: "#22D3EE" },
                { name: t("Y setpoint", "Y уставка"), data: arm.sy, color: "#F59E0B" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("FX5 Z: actual vs setpoint", "FX5 Z: факт vs уставка")} subtitle={t("Z axis tracking quality, useful for pick and release height issues.", "Качество слежения оси Z, полезно для проблем высоты захвата и сброса.")} className="col-span-4 h-[260px]">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: t("Z actual", "Z факт"), data: arm.z, color: "#A78BFA" },
                { name: t("Z setpoint", "Z уставка"), data: arm.sz, color: "#F59E0B" },
              ]}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("FX5 XYZ actual — step", "FX5 XYZ факт — step")} subtitle={t("Step rendering makes discrete PLC updates easier to see.", "Ступенчатый вид лучше показывает дискретные обновления PLC.")} className="col-span-4 h-[260px]">
            <TrendLineChart
              compact
              step
              height="100%"
              series={[
                { name: "X", data: arm.x, color: "#F43F5E" },
                { name: "Y", data: arm.y, color: "#22D3EE" },
                { name: "Z", data: arm.z, color: "#A78BFA" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("FX5 XYZ actual — stack + area", "FX5 XYZ факт — stack + area")} subtitle={t("Stacked area is a visual load view, not a physical sum of coordinates.", "Стековая заливка — визуальный вид нагрузки, не физическая сумма координат.")} className="col-span-4 h-[260px]">
            <TrendLineChart
              compact
              area
              stack
              height="100%"
              series={[
                { name: "X", data: arm.x, color: "#F43F5E" },
                { name: "Y", data: arm.y, color: "#22D3EE" },
                { name: "Z", data: arm.z, color: "#A78BFA" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("Positioning error", "Ошибка позиционирования")} subtitle={t("Total TCP error computed from X/Y/Z actual minus setpoint.", "Итоговая ошибка TCP считается из отклонений X/Y/Z от уставок.")} className="col-span-4 h-[260px]">
            <TrendLineChart
              compact
              area
              height="100%"
              series={[{ name: t("TCP error", "Ошибка TCP"), data: pickCycle.error, color: "#F43F5E" }]}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title="Grab / Box — step" subtitle={t("Step view shows exact digital transitions of box detection and grab.", "Ступенчатый вид показывает точные цифровые переходы Box detected и Grab.")} className="col-span-6 h-[260px]">
            <TrendLineChart
              compact
              step
              height="100%"
              series={[
                { name: "Box detected", data: pickCycle.boxDetected, color: "#A78BFA" },
                { name: "Grab", data: pickCycle.grab, color: "#22D3EE" },
              ]}
            />
          </Panel>
          <Panel compact fill title="Grab / Box — step + area" subtitle={t("Area highlights how long each binary state stayed active.", "Заливка подчёркивает, как долго каждый бинарный сигнал был активен.")} className="col-span-6 h-[260px]">
            <TrendLineChart
              compact
              step
              area
              height="100%"
              series={[
                { name: "Box detected", data: pickCycle.boxDetected, color: "#A78BFA" },
                { name: "Grab", data: pickCycle.grab, color: "#22D3EE" },
              ]}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Panel compact fill title={t("Sorting — area (smooth)", "Сортировка — area (smooth)")} subtitle={t("Smooth area view is useful for quickly comparing route activity.", "Плавная заливка удобна для быстрого сравнения активности маршрутов.")} className="col-span-6 h-[260px]">
            <TrendLineChart compact area height="100%" series={sortingSeries} />
          </Panel>
          <Panel compact fill title={t("All setpoints vs Z actual", "Все уставки vs Z факт")} subtitle={t("Compares commanded XYZ setpoints with actual Z motion for height diagnostics.", "Сравнивает уставки XYZ с фактическим движением Z для диагностики высоты.")} className="col-span-6 h-[260px]">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: "SX", data: arm.sx, color: "#FB7185" },
                { name: "SY", data: arm.sy, color: "#67E8F9" },
                { name: "SZ", data: arm.sz, color: "#C4B5FD" },
                { name: t("Z actual", "Z факт"), data: arm.z, color: "#F59E0B" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
