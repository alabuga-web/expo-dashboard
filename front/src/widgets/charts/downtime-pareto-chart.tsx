"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { DowntimeReason } from "@/entities/types";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors, chartColors } from "@/shared/config/theme";
import { formatDuration } from "@/shared/lib/formatters";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { ChartContainer } from "./chart-container";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface DowntimeParetoChartProps {
  reasons: DowntimeReason[];
  height?: number | string;
}

export function DowntimeParetoChart({ reasons, height = 260 }: DowntimeParetoChartProps) {
  registerEchartsTheme();
  const { locale } = useLocale();
  const fill = height === "100%";

  const sorted = [...reasons].sort((a, b) => b.durationSec - a.durationSec);
  const total = sorted.reduce((s, r) => s + r.durationSec, 0);
  let cumulative = 0;
  const cumulativePct = sorted.map((r) => {
    cumulative += r.durationSec;
    return +((cumulative / total) * 100).toFixed(1);
  });

  const option = useMemo(
    () => ({
      grid: fill
        ? { top: 8, right: 36, bottom: 28, left: 36 }
        : { top: 16, right: 48, bottom: 48, left: 48 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: { seriesName: string; value: number; name: string }[]) => {
          const bar = params.find((p) => p.seriesName === (locale === "ru" ? "Длительность" : "Duration"));
          return bar ? `${bar.name}<br/>${locale === "ru" ? "Длительность" : "Duration"}: <b>${formatDuration(bar.value, locale)}</b>` : "";
        },
      },
      xAxis: {
        type: "category",
        data: sorted.map((r) => r.label),
        axisLabel: { rotate: fill ? 12 : 20, fontSize: fill ? 8 : 10 },
      },
      yAxis: [
        {
          type: "value",
          name: locale === "ru" ? "Длительность (с)" : "Duration (s)",
          splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" } },
        },
        {
          type: "value",
          name: locale === "ru" ? "Накопл. %" : "Cumulative %",
          max: 100,
          axisLabel: { formatter: "{value}%" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: locale === "ru" ? "Длительность" : "Duration",
          type: "bar",
          barWidth: "50%",
          itemStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: chartColors.primary },
                { offset: 1, color: "rgba(34, 211, 238, 0.4)" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          data: sorted.map((r) => r.durationSec),
        },
        {
          name: locale === "ru" ? "Накопл." : "Cumulative",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: chartColors.cycleTime },
          data: cumulativePct,
        },
      ],
    }),
    [sorted, cumulativePct, locale, fill]
  );

  return (
    <ChartContainer height={height} fill={fill} empty={!reasons.length}>
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
