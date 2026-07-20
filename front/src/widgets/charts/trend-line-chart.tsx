"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TrendPoint } from "@/entities/types";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors, chartColors } from "@/shared/config/theme";
import { formatTime } from "@/shared/lib/formatters";
import { ChartContainer } from "./chart-container";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface TrendLineChartProps {
  series: { name: string; data: TrendPoint[]; color?: string }[];
  unit?: string;
  height?: number | string;
  compact?: boolean;
}

export function TrendLineChart({ series, height = 260, compact = false }: TrendLineChartProps) {
  registerEchartsTheme();
  const fill = height === "100%";

  const option = useMemo(() => {
    const timestamps = series[0]?.data.map((d) => formatTime(d.timestamp)) ?? [];
    return {
      grid: compact
        ? { top: 28, right: 8, bottom: 20, left: 36 }
        : { top: 40, right: 16, bottom: 32, left: 48 },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: colors.textMuted, fontSize: compact ? 9 : 11 },
        itemWidth: 12,
        itemHeight: 2,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" } },
      },
      tooltip: { trigger: "axis" },
      series: series.map((s, i) => ({
        name: s.name,
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: s.color ?? chartColors.zones[i % chartColors.zones.length] },
        data: s.data.map((d) => d.value),
      })),
    };
  }, [series, compact]);

  return (
    <ChartContainer height={height} fill={fill} empty={!series.length}>
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
