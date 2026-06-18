"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import type { ProcessFlowNode } from "@/entities/types";
import { statusColors } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { equipmentStatus } from "@/shared/lib/i18n";

interface ProcessFlowChartProps {
  nodes: ProcessFlowNode[];
  compact?: boolean;
  variant?: "cards" | "conveyor";
  zoneLoad?: { zoneId: string; load: number }[];
  fill?: boolean;
}

function loadColor(load: number): string {
  if (load >= 0.85) return "#F59E0B";
  if (load >= 0.65) return "#22D3EE";
  return "#0891B2";
}

function isStopped(status: ProcessFlowNode["status"]): boolean {
  return status === "blocked" || status === "fault" || status === "idle";
}

function conveyorDuration(throughput: number, nodes: ProcessFlowNode[]): string {
  const avg = nodes.reduce((s, n) => s + n.throughput, 0) / nodes.length || 32;
  const ratio = avg / throughput;
  const seconds = Math.max(6, Math.min(20, 14 * ratio));
  return `${seconds}s`;
}

function ConveyorView({
  nodes,
  zoneLoad,
  fill,
}: {
  nodes: ProcessFlowNode[];
  zoneLoad?: { zoneId: string; load: number }[];
  fill?: boolean;
}) {
  const { locale, t } = useLocale();

  const loadMap = useMemo(() => {
    const map = new Map<string, number>();
    zoneLoad?.forEach((z) => map.set(z.zoneId, z.load));
    return map;
  }, [zoneLoad]);

  const lineThroughput = nodes[0]?.throughput ?? 32;
  const duration = conveyorDuration(lineThroughput, nodes);
  const hasStoppage = nodes.some((n) => isStopped(n.status));
  const cubeCount = 7;

  return (
    <div className={cn("flex w-full flex-col", fill && "h-full min-h-0")}>
      {/* Conveyor belt with animated cubes */}
      <div
        className={cn(
          "relative mx-1 overflow-hidden rounded-md border border-[#30363D] bg-[#0D1117]",
          fill ? "mb-2 min-h-0 flex-1" : "mb-3 h-16"
        )}
        style={{ "--conveyor-duration": duration } as CSSProperties}
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#22D3EE]/25" />
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: cubeCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "animate-conveyor-cube h-3 w-3 -translate-y-1/2 rounded-sm border border-[#22D3EE]/60 bg-[#00A7E1]/80",
                hasStoppage && "opacity-60"
              )}
              style={{
                animationDelay: `${(i / cubeCount) * parseFloat(duration)}s`,
                animationPlayState: hasStoppage ? "paused" : "running",
              }}
            />
          ))}
        </div>

        {/* Zone dividers */}
        <div className="absolute inset-0 flex">
          {nodes.map((node) => {
            const stopped = isStopped(node.status);
            return (
              <div
                key={node.zoneId}
                className={cn(
                  "relative flex-1 border-r border-[#30363D]/60 last:border-r-0",
                  stopped && "bg-[#EF4444]/5"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Zone columns */}
      <div className="grid shrink-0 grid-cols-6 gap-1 px-0.5">
        {nodes.map((node) => {
          const color = statusColors[node.status] ?? statusColors.idle;
          const load = loadMap.get(node.zoneId) ?? 0.65;
          const loadPct = Math.round(load * 100);
          const statusLabel = equipmentStatus(node.status, locale);

          return (
            <Link
              key={node.zoneId}
              href={`/areas/${node.zoneId}`}
              title={`${node.name}\n${locale === "ru" ? "Нагрузка" : "Load"}: ${loadPct}%\n${statusLabel}\n${node.throughput}/${locale === "ru" ? "мин" : "min"}`}
              className={cn(
                "group relative flex flex-col items-center rounded-lg border px-1 py-1.5 transition-all hover:border-[#22D3EE]/40",
                node.isBottleneck
                  ? "animate-conveyor-bottleneck border-[#F59E0B]/60 bg-[#F59E0B]/10"
                  : "border-[#30363D] bg-[#0D1117]"
              )}
            >
              {node.isBottleneck && (
                <span className="absolute -top-1.5 rounded bg-[#F59E0B] px-1 text-[8px] font-bold uppercase text-black">
                  {t("BN", "УМ")}
                </span>
              )}

              <div className="mb-1 flex h-10 w-full items-end justify-center rounded bg-[#161B22] px-1">
                <div
                  className="w-full rounded-sm transition-all duration-500"
                  style={{
                    height: `${loadPct}%`,
                    minHeight: 4,
                    backgroundColor: loadColor(load),
                  }}
                />
              </div>

              <div
                className="mb-0.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="w-full truncate text-center text-[10px] font-semibold text-[#E6EDF3]">
                {node.name}
              </span>
              <span className="text-[9px] text-[#8B949E]">{loadPct}%</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ProcessFlowChart({
  nodes,
  compact = false,
  variant = "cards",
  zoneLoad,
  fill = false,
}: ProcessFlowChartProps) {
  const { locale, t } = useLocale();

  if (variant === "conveyor") {
    return <ConveyorView nodes={nodes} zoneLoad={zoneLoad} fill={fill} />;
  }

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
