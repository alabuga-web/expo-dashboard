"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TrendPoint } from "@/entities/types";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors, chartColors } from "@/shared/config/theme";
import { formatTime } from "@/shared/lib/formatters";
import { ChartContainer } from "./chart-container";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface ThroughputAreaChartProps {
  data: TrendPoint[];
  label?: string;
  unit?: string;
  height?: number;
  sparkline?: boolean;
}

export function ThroughputAreaChart({
  data,
  label = "Throughput",
  unit = "cubes/min",
  height = 260,
  sparkline = false,
}: ThroughputAreaChartProps) {
  registerEchartsTheme();

  const latest = data.length ? data[data.length - 1].value : 0;

  const option = useMemo(
    () => ({
      grid: sparkline
        ? { top: 4, right: 4, bottom: 4, left: 4 }
        : { top: 16, right: 16, bottom: 32, left: 48 },
      xAxis: {
        type: "category",
        data: data.map((d) => formatTime(d.timestamp)),
        show: !sparkline,
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        show: !sparkline,
        splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" } },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", lineStyle: { color: colors.accent, opacity: 0.4 } },
        formatter: (params: { value: number; axisValue: string }[]) => {
          const p = params[0];
          return `${p.axisValue}<br/><b>${p.value}</b> ${unit}`;
        },
      },
      series: [
        {
          name: label,
          type: "line",
          smooth: true,
          symbol: sparkline ? "none" : "circle",
          symbolSize: 4,
          lineStyle: { width: 2.5, color: chartColors.throughput },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(34, 211, 238, 0.25)" },
                { offset: 1, color: "rgba(34, 211, 238, 0.02)" },
              ],
            },
          },
          data: data.map((d) => d.value),
        },
      ],
    }),
    [data, label, unit, sparkline]
  );

  return (
    <div>
      {!sparkline && (
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-[#8B949E]">{label}</span>
          <span className="text-2xl font-bold text-[#22D3EE]">
            {latest.toFixed(1)} <span className="text-sm font-normal text-[#8B949E]">{unit}</span>
          </span>
        </div>
      )}
      <ChartContainer height={height} empty={data.length === 0}>
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
    </div>
  );
}
