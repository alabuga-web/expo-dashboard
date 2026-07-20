"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { CustomChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Alarm, ProcessEvent } from "@/entities/types";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors } from "@/shared/config/theme";
import { formatTime } from "@/shared/lib/formatters";
import { ChartContainer } from "./chart-container";

echarts.use([CustomChart, GridComponent, TooltipComponent, CanvasRenderer]);

type TimelineItem = Alarm | ProcessEvent;

interface EventTimelineChartProps {
  items: TimelineItem[];
  height?: number;
}

function getSeverity(item: TimelineItem): string {
  if ("severity" in item) return item.severity;
  return "info";
}

function getItemLabel(item: TimelineItem): string {
  if ("code" in item) return item.code;
  return item.type;
}

function getItemDesc(item: TimelineItem): string {
  return item.message;
}

const severityColors: Record<string, string> = {
  alarm: colors.alarm,
  warning: colors.warning,
  info: colors.accent,
};

export function EventTimelineChart({ items, height = 200 }: EventTimelineChartProps) {
  registerEchartsTheme();

  const sorted = [...items].slice(0, 12).reverse();

  const option = useMemo(
    () => ({
      grid: { top: 8, right: 16, bottom: 8, left: 120 },
      xAxis: { type: "value", show: false, min: 0, max: sorted.length },
      yAxis: {
        type: "category",
        data: sorted.map((i) => formatTime(i.timestamp)),
        axisLine: { show: false },
        axisTick: { show: false },
      },
      tooltip: {
        formatter: (p: { data: { name: string; desc: string } }) =>
          `<b>${p.data.name}</b><br/>${p.data.desc}`,
      },
      series: [
        {
          type: "custom",
          renderItem: (
            _params: unknown,
            api: { value: (i: number) => number; coord: (v: [number, number]) => [number, number]; size: (v: [number, number]) => [number, number] }
          ) => {
            const idx = api.value(0) as number;
            const coord = api.coord([0.5, idx]);
            const size = api.size([1, 1]) as [number, number];
            const color = String(api.value(2));
            return {
              type: "rect",
              shape: {
                x: coord[0] - size[0] * 0.4,
                y: coord[1] - 8,
                width: size[0] * 0.8,
                height: 16,
                r: 4,
              },
              style: { fill: color },
            };
          },
          encode: { x: 0, y: 1 },
          data: sorted.map((item, i) => ({
            value: [0.5, i, severityColors[getSeverity(item)] ?? colors.accent],
            name: getItemLabel(item),
            desc: getItemDesc(item),
          })),
        },
      ],
    }),
    [sorted]
  );

  return (
    <ChartContainer height={height} empty={!items.length}>
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
