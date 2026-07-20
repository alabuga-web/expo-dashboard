"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { KpiTile } from "@/shared/ui/kpi-tile";
import { Panel } from "@/shared/ui/panel";
import { usePolling } from "@/shared/lib/use-polling";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";
import type { ConveyorState, ProductColor, ProductionPayload } from "@/shared/lib/plc-data";

const colorMeta: Record<ProductColor, { label: string; bg: string; text: string; dot: string }> = {
  blue: { label: "Синие", bg: "bg-[#1D4ED8]/20", text: "text-[#60A5FA]", dot: "bg-[#2563EB]" },
  green: { label: "Зелёные", bg: "bg-[#10B981]/20", text: "text-[#34D399]", dot: "bg-[#10B981]" },
  metal: { label: "Серые", bg: "bg-[#94A3B8]/20", text: "text-[#CBD5E1]", dot: "bg-[#94A3B8]" },
};

function partColorFill(color: ProductColor | null) {
  if (color === "blue") return "#2563EB";
  if (color === "green") return "#10B981";
  if (color === "metal") return "#94A3B8";
  return "#E6EDF3";
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#10B981] shadow-[0_0_12px_#10B981]" : "bg-[#4B5563]"}`} />
      <span>{label}</span>
    </div>
  );
}

function ConveyorView({ conveyor }: { conveyor: ConveyorState }) {
  const count = Math.max(conveyor.segments.length, 1);
  const padX = 28;
  const beltY = 118;
  const beltH = 36;
  const usableW = 640 - padX * 2;
  const segW = usableW / count;

  const partRef = useRef<SVGGElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(conveyor.progress);
  const targetRef = useRef(conveyor.progress);
  const movingRef = useRef(conveyor.moving);
  const segmentsRef = useRef(conveyor.segments);
  const [visualIndex, setVisualIndex] = useState(
    Math.min(count - 1, Math.floor(conveyor.progress * count)),
  );

  useEffect(() => {
    targetRef.current = conveyor.progress;
    movingRef.current = conveyor.moving;
    segmentsRef.current = conveyor.segments;
  }, [conveyor.progress, conveyor.moving, conveyor.segments]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let uiAccum = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const target = targetRef.current;
      const moving = movingRef.current;
      let p = progressRef.current;

      if (moving) {
        // Равномерный проезд линии (~12 сек), без рывков от PLC
        p += 0.085 * dt;
        if (p > 1) p = 0;
      } else {
        // На остановке плавно доезжаем до последней известной точки
        const delta = target - p;
        if (Math.abs(delta) > 0.001) {
          p += delta * Math.min(1, 2.5 * dt);
        } else {
          p = target;
        }
        if (p < 0) p = 0;
        if (p > 1) p = 1;
      }

      progressRef.current = p;

      if (partRef.current) {
        partRef.current.setAttribute("transform", `translate(${padX + p * usableW}, ${beltY - 8})`);
      }

      uiAccum += dt;
      if (uiAccum > 0.15) {
        uiAccum = 0;
        const idx = Math.min(count - 1, Math.floor(p * count));
        const seg = segmentsRef.current[idx];
        if (labelRef.current) {
          labelRef.current.textContent = `${seg?.label ?? "—"} · ${Math.round(p * 100)}% · ${moving ? "едет" : "стоп"}`;
        }
        setVisualIndex(idx);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count, padX, usableW, beltY]);

  return (
    <div className="grid h-full grid-cols-[1fr_140px] gap-3">
      <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-border bg-[#0D1117]">
        <svg viewBox="0 0 640 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#161B22" />
              <stop offset="100%" stopColor="#0D1117" />
            </linearGradient>
            <linearGradient id="beltActive" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1F6FEB" />
              <stop offset="100%" stopColor="#1158C7" />
            </linearGradient>
            <linearGradient id="beltIdle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#30363D" />
              <stop offset="100%" stopColor="#21262D" />
            </linearGradient>
            <filter id="partGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="640" height="220" fill="url(#floorGrad)" />
          <polygon points="40,170 600,170 620,200 20,200" fill="#161B22" stroke="#21262D" strokeWidth="1" />

          {conveyor.segments.map((segment, index) => {
            const x = padX + index * segW;
            const active = segment.active || segment.sensorActive;
            const isCurrent = index === visualIndex;
            return (
              <g key={segment.id}>
                <polygon
                  points={`${x + 4},${beltY - 10} ${x + segW - 4},${beltY - 10} ${x + segW},${beltY} ${x},${beltY}`}
                  fill={active ? "#388BFD" : "#30363D"}
                  opacity="0.45"
                />
                <rect
                  x={x}
                  y={beltY}
                  width={segW - 2}
                  height={beltH}
                  rx="6"
                  fill={active ? "url(#beltActive)" : "url(#beltIdle)"}
                  stroke={isCurrent ? "#22D3EE" : active ? "#58A6FF" : "#484F58"}
                  strokeWidth={isCurrent ? 2.5 : 1.2}
                />
                {[0.2, 0.5, 0.8].map((t) => (
                  <circle
                    key={t}
                    cx={x + segW * t}
                    cy={beltY + beltH / 2}
                    r="4"
                    fill={active ? "#79C0FF" : "#484F58"}
                    opacity="0.55"
                  />
                ))}
                <text
                  x={x + segW / 2}
                  y={beltY - 18}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill={isCurrent ? "#E6EDF3" : "#8B949E"}
                >
                  {segment.label}
                </text>
                {segment.sensorActive && (
                  <circle cx={x + segW / 2} cy={beltY + beltH + 14} r="4" fill="#F59E0B">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          <g
            ref={partRef}
            transform={`translate(${padX + progressRef.current * usableW}, ${beltY - 8})`}
            filter="url(#partGlow)"
          >
            <rect x="-16" y="-28" width="32" height="28" rx="4" fill={partColorFill(conveyor.color)} stroke="#E6EDF3" strokeWidth="1.5" />
            <rect x="-16" y="-28" width="32" height="8" rx="2" fill="#ffffff" opacity="0.18" />
            <polygon points="-16,-28 0,-38 16,-28" fill={partColorFill(conveyor.color)} stroke="#E6EDF3" strokeWidth="1" opacity="0.9" />
          </g>

          <text x="28" y="28" fontSize="12" fill="#8B949E">
            Выдача → Склад
          </text>
        </svg>
        <div ref={labelRef} className="absolute bottom-3 left-3 rounded bg-panel/90 px-2 py-1 font-mono text-xs text-muted">
          {conveyor.segments[visualIndex]?.label ?? "—"} · {Math.round(progressRef.current * 100)}%
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-1.5 overflow-auto">
        {conveyor.segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`rounded-lg border px-2.5 py-2 text-xs ${
              index === visualIndex ? "border-[#22D3EE]/60 bg-[#22D3EE]/10" : "border-border bg-background"
            }`}
          >
            <div className="mb-1.5 font-semibold text-foreground">{segment.label}</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted">
                <span className={`h-2 w-2 rounded-full ${segment.active ? "bg-[#10B981]" : "bg-[#4B5563]"}`} />
                Лента
              </div>
              <div className="flex items-center gap-1.5 text-muted">
                <span className={`h-2 w-2 rounded-full ${segment.sensorActive ? "bg-[#F59E0B]" : "bg-[#4B5563]"}`} />
                Датчик
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowLine({ nodes }: { nodes: ProductionPayload["flow"]["nodes"] }) {
  return (
    <div className="grid h-full grid-cols-6 gap-2">
      {nodes.map((node, index) => (
        <div key={node.id} className="relative flex min-w-0 flex-col justify-center rounded-xl border border-border bg-background p-3">
          {index < nodes.length - 1 && (
            <div className="pointer-events-none absolute left-[calc(100%-4px)] top-1/2 z-10 h-[2px] w-4 bg-border" />
          )}
          <div className={`mb-3 h-3 w-3 rounded-full ${node.active ? "bg-[#22D3EE] shadow-[0_0_18px_#22D3EE]" : "bg-[#4B5563]"}`} />
          <div className="truncate text-sm font-semibold text-foreground">{node.label}</div>
          <div className="mt-1 truncate font-mono text-xs text-muted">{node.value ?? (node.active ? "ON" : "OFF")}</div>
        </div>
      ))}
    </div>
  );
}

function ColorShare({ data }: { data: ProductionPayload["produced"] }) {
  const total = Math.max(data.total, 1);
  return (
    <div className="space-y-3">
      {(["blue", "green", "metal"] as ProductColor[]).map((color) => {
        const value = data[color];
        const width = Math.round((value / total) * 100);
        return (
          <div key={color}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className={colorMeta[color].text}>{colorMeta[color].label}</span>
              <span className="font-mono text-foreground">{value}</span>
            </div>
            <div className="h-2 rounded-full bg-background">
              <div className={`h-2 rounded-full ${colorMeta[color].dot}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Warehouse({ data }: { data: ProductionPayload["warehouse"] }) {
  const max = Math.max(data.blue, data.green, data.metal, 1);
  return (
    <div className="grid h-full grid-cols-3 gap-3">
      {(["blue", "green", "metal"] as ProductColor[]).map((color) => {
        const level = Math.max(8, Math.round((data[color] / max) * 100));
        return (
          <div key={color} className="flex min-h-0 flex-col rounded-xl border border-border bg-background p-3">
            <div className="mb-3 text-center text-sm font-semibold text-foreground">{colorMeta[color].label}</div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#0D1117]">
              <div className={`absolute bottom-0 left-0 right-0 ${colorMeta[color].bg}`} style={{ height: `${level}%` }} />
              <div className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${colorMeta[color].text}`}>
                {data[color]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentColors({ colors }: { colors: ProductColor[] }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5">
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className={`h-5 w-5 rounded ${colorMeta[color].dot} shadow-sm`}
          title={colorMeta[color].label}
        />
      ))}
      {!colors.length && <span className="text-xs text-muted">Нет распознаваний</span>}
    </div>
  );
}


export default function ProductionPage() {
  const { data, loading } = usePolling<ProductionPayload>("/api/production", 1000);

  if (loading || !data) {
    return (
      <DashboardShell kiosk breadcrumbs={[{ label: "Производство" }]}>
        <div className="flex h-full items-center justify-center text-muted">Загрузка данных производства...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kiosk breadcrumbs={[{ label: "Производство AI Factory" }]}>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_minmax(0,1.15fr)] gap-3 overflow-hidden">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-2">
            <KpiTile compact label="Всего произведено" value={String(data.produced.total)} accent />
          </div>
          <div className="col-span-2">
            <KpiTile compact label="Скорость" value={data.ratePerMin.toFixed(0)} unit="шт/мин" variant="success" />
          </div>
          <div className="col-span-2">
            <KpiTile compact label="Склад" value={String(data.warehouse.blue + data.warehouse.green + data.warehouse.metal)} unit="шт" />
          </div>
          <div className="col-span-6 flex items-center justify-end gap-2 rounded-lg border border-border bg-panel px-4">
            <StatusPill active={data.status.connected} label={data.status.source === "db-replay" ? "Replay БД" : "Live OPC"} />
            <StatusPill active={data.status.operatingMode === 8 || data.status.operatingMode === 9} label={`PLC ${data.status.operatingModeLabel}`} />
            <StatusPill active={data.status.heartbeatAlive} label="Heartbeat" />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-3">
          <Panel compact fill title="Выпуск по цветам" className="col-span-3">
            <div className="grid h-full grid-rows-[1fr_auto] gap-4">
              <ColorShare data={data.produced} />
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted">Последние детали</div>
                <RecentColors colors={data.recentColors} />
              </div>
            </div>
          </Panel>
          <Panel compact fill title="Процесс линии" className="col-span-6">
            <FlowLine nodes={data.flow.nodes} />
          </Panel>
          <Panel compact fill title="Заполнение склада" className="col-span-3">
            <Warehouse data={data.warehouse} />
          </Panel>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-3">
          <Panel compact fill title="Движение детали по линии" className="col-span-7">
            <ConveyorView conveyor={data.conveyor} />
          </Panel>
          <Panel compact fill title="Тренды линии: датчик / конвейер / vision" className="col-span-5">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: "Датчик входа", data: data.trends.sensor, color: "#22D3EE" },
                { name: "Конвейер 1", data: data.trends.belt, color: "#F59E0B" },
                { name: "Vision", data: data.trends.vision, color: "#A78BFA" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
