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
  area?: boolean;
  stack?: boolean;
  step?: boolean;
}

export function TrendLineChart({
  series,
  height = 260,
  compact = false,
  area = false,
  stack = false,
  step = false,
}: TrendLineChartProps) {
  registerEchartsTheme();
  const fill = height === "100%";

  const option = useMemo(() => {
    const timestamps = series[0]?.data.map((d) => formatTime(d.timestamp)) ?? [];
    return {
      animationDuration: 300,
      animationDurationUpdate: 400,
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
        minInterval: 1,
        splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" } },
      },
      tooltip: { trigger: "axis" },
      series: series.map((s, i) => {
        const color = s.color ?? chartColors.zones[i % chartColors.zones.length];
        return {
          name: s.name,
          type: "line",
          smooth: !step,
          step: step ? "end" : undefined,
          stack: stack ? "total" : undefined,
          symbol: "none",
          lineStyle: { width: 2, color },
          areaStyle: area
            ? {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: color + "66" },
                    { offset: 1, color: color + "10" },
                  ],
                },
              }
            : undefined,
          data: s.data.map((d) => d.value),
        };
      }),
    };
  }, [series, compact, area, stack, step]);

  return (
    <ChartContainer height={height} fill={fill} empty={!series.some((s) => s.data.length)}>
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
