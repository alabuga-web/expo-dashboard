"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { GraphicComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { registerEchartsTheme } from "@/shared/lib/echarts-theme";
import { colors, chartColors } from "@/shared/config/theme";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { cn } from "@/shared/lib/cn";
import { ChartContainer } from "./chart-container";

echarts.use([PieChart, TooltipComponent, GraphicComponent, CanvasRenderer]);

interface QualityDonutChartProps {
  goodCount: number;
  rejectCount: number;
  height?: number | string;
  compact?: boolean;
}

export function QualityDonutChart({
  goodCount,
  rejectCount,
  height = 220,
  compact = false,
}: QualityDonutChartProps) {
  registerEchartsTheme();
  const { locale, t } = useLocale();
  const fill = height === "100%";
  const total = goodCount + rejectCount;
  const goodLabel = t("Good", "Годные");
  const rejectLabel = t("Reject", "Брак");
  const totalLabel = t("Total", "Всего");

  const option = useMemo(
    () => ({
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [
        {
          type: "pie",
          radius: compact ? ["50%", "72%"] : ["55%", "78%"],
          center: ["50%", compact ? "55%" : "50%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: colors.panel, borderWidth: 2 },
          label: { show: false },
          data: [
            { value: goodCount, name: goodLabel, itemStyle: { color: chartColors.good } },
            { value: rejectCount, name: rejectLabel, itemStyle: { color: chartColors.rejectRate } },
          ],
        },
      ],
      graphic: [
        {
          type: "text",
          left: "center",
          top: compact ? "46%" : "42%",
          style: {
            text: total.toLocaleString(locale === "ru" ? "ru-RU" : "en-US"),
            fill: colors.text,
            fontSize: compact ? 18 : 28,
            fontWeight: 700,
            textAlign: "center",
          },
        },
        {
          type: "text",
          left: "center",
          top: compact ? "58%" : "55%",
          style: {
            text: totalLabel,
            fill: colors.textMuted,
            fontSize: compact ? 9 : 12,
            textAlign: "center",
          },
        },
      ],
    }),
    [goodCount, rejectCount, total, goodLabel, rejectLabel, totalLabel, compact, locale]
  );

  return (
    <div className={cn("flex h-full flex-col", compact && "min-h-0")}>
      {!compact && (
        <div className="mb-2 flex justify-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
            {goodLabel} {goodCount.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
            {rejectLabel} {rejectCount.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
          </span>
        </div>
      )}
      <ChartContainer height={height} fill={fill} className="flex-1">
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
      {compact && (
        <div className="mt-1 flex shrink-0 justify-center gap-3 text-[10px] text-[#8B949E]">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            {goodLabel}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
            {rejectLabel}
          </span>
        </div>
      )}
    </div>
  );
}
