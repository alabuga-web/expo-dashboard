"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ReplaySession } from "@/entities/types";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors, chartColors } from "@/shared/config/theme";
import { ChartContainer } from "./chart-container";

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface SessionComparisonChartProps {
  sessions: ReplaySession[];
  height?: number;
}

export function SessionComparisonChart({ sessions, height = 300 }: SessionComparisonChartProps) {
  registerEchartsTheme();

  const option = useMemo(
    () => ({
      grid: { top: 40, right: 16, bottom: 48, left: 48 },
      legend: {
        top: 0,
        textStyle: { color: colors.textMuted },
      },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "category",
        data: sessions.map((s) => s.name),
        axisLabel: { rotate: 15, fontSize: 10 },
      },
      yAxis: [
        { type: "value", name: "OEE", max: 1, axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
        { type: "value", name: "Produced", splitLine: { show: false } },
      ],
      series: [
        {
          name: "OEE",
          type: "bar",
          barWidth: "28%",
          itemStyle: { color: chartColors.primary, borderRadius: [4, 4, 0, 0] },
          data: sessions.map((s) => s.oee),
        },
        {
          name: "Produced",
          type: "bar",
          yAxisIndex: 1,
          barWidth: "28%",
          itemStyle: { color: chartColors.secondary, borderRadius: [4, 4, 0, 0] },
          data: sessions.map((s) => s.produced),
        },
      ],
    }),
    [sessions]
  );

  return (
    <ChartContainer height={height} empty={!sessions.length}>
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
