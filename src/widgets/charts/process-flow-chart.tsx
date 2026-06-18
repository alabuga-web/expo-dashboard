"use client";

import Link from "next/link";
import type { ProcessFlowNode } from "@/entities/types";
import { statusColors } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { equipmentStatus } from "@/shared/lib/i18n";

interface ProcessFlowChartProps {
  nodes: ProcessFlowNode[];
  compact?: boolean;
}

export function ProcessFlowChart({ nodes, compact = false }: ProcessFlowChartProps) {
  const { locale, t } = useLocale();

  return (
    <div className="flex w-full items-center justify-between gap-0.5">
      {nodes.map((node, i) => {
        const color = statusColors[node.status] ?? statusColors.idle;
        return (
          <div key={node.zoneId} className="flex min-w-0 flex-1 items-center">
            <Link
              href={`/areas/${node.zoneId}`}
              className={cn(
                "relative flex w-full flex-col items-center rounded-lg border transition-all hover:border-[#22D3EE]/40",
                compact ? "px-1 py-1.5" : "rounded-xl px-4 py-3 hover:scale-[1.02]",
                node.isBottleneck
                  ? "border-[#F59E0B]/60 bg-[#F59E0B]/10"
                  : "border-[#30363D] bg-[#0D1117]"
              )}
            >
              {node.isBottleneck && (
                <span className="absolute -top-1.5 rounded bg-[#F59E0B] px-1 text-[8px] font-bold uppercase text-black">
                  {t("BN", "УМ")}
                </span>
              )}
              <div
                className={cn("rounded-full", compact ? "mb-0.5 h-2 w-2" : "mb-2 h-3 w-3")}
                style={{ backgroundColor: color }}
              />
              <span className={cn("truncate font-semibold text-[#E6EDF3]", compact ? "text-[10px]" : "text-xs")}>
                {node.name}
              </span>
              {!compact && (
                <>
                  <span className="mt-1 text-[10px] uppercase tracking-wide" style={{ color }}>
                    {equipmentStatus(node.status, locale)}
                  </span>
                  <span className="mt-1 text-xs text-[#8B949E]">
                    {node.throughput}/{locale === "ru" ? "мин" : "min"}
                  </span>
                </>
              )}
            </Link>
            {i < nodes.length - 1 && (
              <div className="flex shrink-0 items-center px-0.5">
                <div className="h-px w-2 bg-[#22D3EE]/40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
