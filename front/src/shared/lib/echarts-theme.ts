import * as echarts from "echarts/core";
import { colors, chartColors } from "@/shared/config/theme";

const factoryHmiTheme = {
  color: [...chartColors.zones, chartColors.primary, chartColors.secondary],
  backgroundColor: "transparent",
  textStyle: { color: colors.textMuted, fontFamily: "inherit", fontSize: 12 },
  title: { textStyle: { color: colors.text, fontSize: 14, fontWeight: 500 } },
  legend: { textStyle: { color: colors.textMuted }, itemWidth: 12, itemHeight: 8 },
  tooltip: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    textStyle: { color: colors.text, fontSize: 13 },
    padding: [10, 14],
  },
  grid: { borderColor: colors.borderSubtle, containLabel: true },
  categoryAxis: {
    axisLine: { lineStyle: { color: colors.border } },
    axisTick: { lineStyle: { color: colors.border } },
    axisLabel: { color: colors.textMuted, fontSize: 11 },
    splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" as const } },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: colors.textMuted, fontSize: 11 },
    splitLine: { lineStyle: { color: colors.borderSubtle, type: "dashed" as const } },
  },
  line: {
    smooth: true,
    symbol: "circle",
    symbolSize: 4,
    lineStyle: { width: 2 },
  },
  gauge: {
    axisLine: { lineStyle: { width: 10 } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { color: colors.textMuted, fontSize: 10 },
    pointer: { width: 4 },
    title: { color: colors.textMuted, fontSize: 12 },
    detail: { color: colors.text, fontSize: 28, fontWeight: 600 },
  },
};

let registered = false;

export function registerEchartsTheme() {
  if (registered || typeof window === "undefined") return;
  echarts.registerTheme("factoryHmi", factoryHmiTheme);
  registered = true;
}

export { factoryHmiTheme };
