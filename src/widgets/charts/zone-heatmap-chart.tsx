"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors } from "@/shared/config/theme";
import { ZONES } from "@/shared/config/zones";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { ChartContainer } from "./chart-container";

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

interface ZoneHeatmapChartProps {
  heatmapData: number[][];
  height?: number | string;
}

export function ZoneHeatmapChart({ heatmapData, height = 220 }: ZoneHeatmapChartProps) {
  registerEchartsTheme();
  const { locale } = useLocale();
  const fill = height === "100%";

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => `${i * 5}m`), []);

  const data = useMemo(() => {
    const result: [number, number, number][] = [];
    heatmapData.forEach((row, zi) => {
      row.forEach((val, bi) => result.push([bi, zi, val]));
    });
    return result;
  }, [heatmapData]);

  const option = useMemo(
    () => ({
      grid: fill
        ? { top: 4, right: 56, bottom: 20, left: 56 }
        : { top: 8, right: 80, bottom: 32, left: 80 },
      xAxis: { type: "category", data: hours, splitArea: { show: true } },
      yAxis: {
        type: "category",
        data: ZONES.map((z) => z.shortName),
        splitArea: { show: true },
      },
      visualMap: {
        min: 0.3,
        max: 1,
        calculable: false,
        orient: "vertical",
        right: 0,
        top: "center",
        inRange: {
          color: ["#161B22", "#0891B2", "#22D3EE", "#F59E0B"],
        },
        textStyle: { color: colors.textMuted },
      },
      tooltip: {
        formatter: (p: { data: [number, number, number] }) => {
          const [bi, zi, val] = p.data;
          return `${ZONES[zi]?.name} @ ${hours[bi]}<br/>${locale === "ru" ? "Нагрузка" : "Load"}: <b>${(val * 100).toFixed(0)}%</b>`;
        },
      },
      series: [
        {
          type: "heatmap",
          data,
          label: { show: false },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: "rgba(34,211,238,0.4)" },
          },
        },
      ],
    }),
    [data, hours, locale, fill]
  );

  return (
    <ChartContainer height={height} fill={fill} empty={!heatmapData.length}>
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
