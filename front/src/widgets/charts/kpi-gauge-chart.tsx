"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { GaugeChart } from "echarts/charts";
import { TooltipComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors } from "@/shared/config/theme";
import { formatPercent } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/cn";
import { ChartContainer } from "./chart-container";

echarts.use([GaugeChart, TooltipComponent, TitleComponent, CanvasRenderer]);

interface KpiGaugeChartProps {
  value: number;
  label: string;
  height?: number;
  min?: number;
  max?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  color?: string;
}

export function KpiGaugeChart({
  value,
  label,
  height = 200,
  min = 0,
  max = 1,
  unit,
  formatValue,
  color = colors.accent,
}: KpiGaugeChartProps) {
  registerEchartsTheme();
  const compact = height <= 120;
  const detailText = formatValue ? formatValue(value) : unit ? `${value.toFixed(2)} ${unit}` : formatPercent(value, 0);

  const option = useMemo(
    () => ({
      series: [
        {
          type: "gauge",
          startAngle: 200,
          endAngle: -20,
          min,
          max,
          splitNumber: 4,
          radius: compact ? "82%" : "90%",
          pointer: { show: false },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: colors.accentMuted },
                  { offset: 1, color },
                ],
              },
            },
          },
          axisLine: {
            lineStyle: { width: compact ? 8 : 12, color: [[1, colors.borderSubtle]] },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: compact ? 16 : 36,
            fontWeight: 700,
            color: colors.text,
            offsetCenter: [0, compact ? "5%" : "10%"],
            formatter: () => detailText,
          },
          data: [{ value }],
        },
      ],
    }),
    [value, min, max, compact, detailText, color]
  );

  return (
    <div className="flex h-full flex-col">
      <p className={cn("shrink-0 truncate text-center uppercase tracking-wider text-[#8B949E]", compact ? "text-[8px]" : "mb-1 text-xs")}>
        {label}
      </p>
      <ChartContainer height={compact ? height - 14 : height} className="min-h-0 flex-1">
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
