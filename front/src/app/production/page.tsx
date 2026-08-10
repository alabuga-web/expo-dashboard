"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { KpiTile } from "@/shared/ui/kpi-tile";
import { Panel } from "@/shared/ui/panel";
import { usePolling } from "@/shared/lib/use-polling";
import { useLocale } from "@/features/locale-toggle/locale-context";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";
import type { ConveyorState, ProductColor, ProductionPayload } from "@/shared/lib/plc-data";

const colorMeta: Record<ProductColor, { bg: string; text: string; dot: string }> = {
  blue: { bg: "bg-[#1D4ED8]/20", text: "text-[#60A5FA]", dot: "bg-[#2563EB]" },
  green: { bg: "bg-[#10B981]/20", text: "text-[#34D399]", dot: "bg-[#10B981]" },
  metal: { bg: "bg-[#94A3B8]/20", text: "text-[#CBD5E1]", dot: "bg-[#94A3B8]" },
};

const SEGMENT_LABELS: Record<string, { en: string; ru: string }> = {
  emit: { en: "Emit", ru: "Выдача" },
  z01: { en: "Entry", ru: "Вход" },
  z02: { en: "Line", ru: "Линия" },
  z03: { en: "Buffer", ru: "Буфер" },
  vision: { en: "Camera", ru: "Камера" },
  sort: { en: "Sorting", ru: "Сортировка" },
  storage: { en: "Storage", ru: "Склад" },
};

function colorLabel(color: ProductColor, t: (en: string, ru: string) => string) {
  if (color === "blue") return t("Blue", "Синие");
  if (color === "green") return t("Green", "Зелёные");
  return t("Metal", "Серые");
}

/** Цвета Raw Material как в Factory I/O. */
function factoryPartPalette(color: ProductColor | null) {
  if (color === "blue") {
    return { top: "#2EC4C6", front: "#157F82" };
  }
  if (color === "green") {
    return { top: "#8ED44A", front: "#4F8C22" };
  }
  if (color === "metal") {
    return { top: "#A4AAB2", front: "#6A7078" };
  }
  return { top: "#B8C0C8", front: "#7A828C" };
}

/** Деталь лежит на ленте — простой прямоугольник без скосов и меток. */
function FactoryPartOnBelt({ color }: { color: ProductColor | null }) {
  const p = factoryPartPalette(color);
  return (
    <g>
      <ellipse cx="0" cy="7" rx="30" ry="3" fill="#000000" opacity="0.25" />
      <rect x="-28" y="-8" width="56" height="16" fill={p.top} />
      <rect x="-28" y="4" width="56" height="4" fill={p.front} />
    </g>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#10B981] shadow-[0_0_12px_#10B981]" : "bg-[#4B5563]"}`} />
      <span>{label}</span>
    </div>
  );
}

function nextJourneyColor(
  recent: ProductColor[],
  last: ProductColor | null,
  prev: ProductColor | null,
  trip: number,
): ProductColor {
  if (recent.length) return recent[trip % recent.length];
  if (last) return last;
  if (prev) return prev;
  const cycle: ProductColor[] = ["blue", "green", "metal"];
  return cycle[trip % cycle.length];
}

function ConveyorView({
  conveyor,
  recentColors,
  lastColor,
}: {
  conveyor: ConveyorState;
  recentColors: ProductColor[];
  lastColor: ProductColor | null;
}) {
  const { t } = useLocale();
  const segmentLabel = useCallback(
    (id: string, fallback: string) => {
      const pair = SEGMENT_LABELS[id];
      return pair ? t(pair.en, pair.ru) : fallback;
    },
    [t],
  );
  const movingLabel = t("moving", "едет");
  const stopLabel = t("stop", "стоп");
  const count = Math.max(conveyor.segments.length, 1);
  const padX = 28;
  const beltY = 118;
  const beltH = 36;
  const usableW = 640 - padX * 2;
  const segW = usableW / count;

  const partRef = useRef<SVGGElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<SVGRectElement | null>(null);
  const progressRef = useRef(0.04);
  const movingRef = useRef(conveyor.moving);
  const segmentsRef = useRef(conveyor.segments);
  const recentRef = useRef(recentColors);
  const lastColorRef = useRef(lastColor);
  const tripRef = useRef(0);
  const partColorRef = useRef<ProductColor | null>(lastColor ?? recentColors[0] ?? "blue");
  const opacityRef = useRef(1);
  const phaseRef = useRef<"travel" | "fadeOut" | "spawn" | "fadeIn">("travel");
  const labelsRef = useRef({ movingLabel, stopLabel, segmentLabel });

  const [visualIndex, setVisualIndex] = useState(0);
  const [partColor, setPartColor] = useState<ProductColor | null>(partColorRef.current);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    movingRef.current = conveyor.moving;
    segmentsRef.current = conveyor.segments;
  }, [conveyor.moving, conveyor.segments]);

  useEffect(() => {
    recentRef.current = recentColors;
    lastColorRef.current = lastColor;
  }, [recentColors, lastColor]);

  useEffect(() => {
    labelsRef.current = { movingLabel, stopLabel, segmentLabel };
  }, [movingLabel, stopLabel, segmentLabel]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let uiAccum = 0;

    const applyVisual = (p: number, opacity: number) => {
      if (partRef.current) {
        partRef.current.setAttribute("transform", `translate(${padX + p * usableW}, ${beltY})`);
        partRef.current.setAttribute("opacity", String(opacity));
      }
      if (progressBarRef.current) {
        progressBarRef.current.setAttribute("width", String(Math.max(4, Math.min(1, p) * usableW)));
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const moving = movingRef.current;
      let p = progressRef.current;
      let opacity = opacityRef.current;
      let phase = phaseRef.current;

      if (phase === "fadeOut") {
        opacity = Math.max(0, opacity - dt * 2.6);
        if (opacity <= 0) {
          opacity = 0;
          phase = "spawn";
        }
      } else if (phase === "spawn") {
        p = 0.03;
        tripRef.current += 1;
        const next = nextJourneyColor(
          recentRef.current,
          lastColorRef.current,
          partColorRef.current,
          tripRef.current,
        );
        partColorRef.current = next;
        setPartColor(next);
        phase = "fadeIn";
      } else if (phase === "fadeIn") {
        opacity = Math.min(1, opacity + dt * 2.2);
        if (moving) p += 0.065 * dt;
        if (opacity >= 1) {
          opacity = 1;
          phase = "travel";
        }
      } else if (moving) {
        // Плавный проезд ~15 с. Без телепорта: в конце — fade и новый цикл.
        p += 0.065 * dt;
        if (p >= 0.995) {
          p = 1;
          phase = "fadeOut";
        }
      } else {
        const idx = Math.min(count - 1, Math.floor(p * count));
        const rest = (idx + 0.55) / count;
        p += (rest - p) * Math.min(1, 1.1 * dt);
      }

      progressRef.current = p;
      opacityRef.current = opacity;
      phaseRef.current = phase;
      applyVisual(p, opacity);

      uiAccum += dt;
      if (uiAccum > 0.12) {
        uiAccum = 0;
        const idx = Math.min(count - 1, Math.floor(Math.min(0.999, p) * count));
        const seg = segmentsRef.current[idx];
        const labels = labelsRef.current;
        const name = seg ? labels.segmentLabel(seg.id, seg.label) : "—";
        const motion =
          phase === "fadeOut" || phase === "spawn"
            ? t("to storage", "на склад")
            : moving
              ? labels.movingLabel
              : labels.stopLabel;
        const text = `${name} · ${Math.round(p * 100)}% · ${motion}`;
        if (labelRef.current) labelRef.current.textContent = text;
        setStatusText(text);
        setVisualIndex((prev) => (prev === idx ? prev : idx));
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count, padX, usableW, beltY, t]);

  const colorChip =
    partColor === "blue" ? "#2EC4C6" : partColor === "green" ? "#8ED44A" : partColor === "metal" ? "#A4AAB2" : "#8B949E";

  return (
    <div className="grid h-full grid-cols-[1fr_148px] gap-3">
      <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-border bg-[#0D1117]">
        <svg viewBox="0 0 640 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#161B22" />
              <stop offset="100%" stopColor="#0D1117" />
            </linearGradient>
            <linearGradient id="beltDone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1F3A5F" />
              <stop offset="100%" stopColor="#152033" />
            </linearGradient>
            <linearGradient id="beltNow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1F6FEB" />
              <stop offset="100%" stopColor="#1158C7" />
            </linearGradient>
            <linearGradient id="beltIdle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#30363D" />
              <stop offset="100%" stopColor="#21262D" />
            </linearGradient>
          </defs>

          <rect width="640" height="220" fill="url(#floorGrad)" />
          <polygon points="40,170 600,170 620,200 20,200" fill="#161B22" stroke="#21262D" strokeWidth="1" />

          <rect x={padX} y={beltY + beltH + 18} width={usableW} height="4" rx="2" fill="#21262D" />
          <rect
            ref={progressBarRef}
            x={padX}
            y={beltY + beltH + 18}
            width={Math.max(4, progressRef.current * usableW)}
            height="4"
            rx="2"
            fill="#22D3EE"
            opacity="0.9"
          />

          {conveyor.segments.map((segment, index) => {
            const x = padX + index * segW;
            const isCurrent = index === visualIndex;
            const isDone = index < visualIndex;
            const isAhead = index > visualIndex;
            const fill = isCurrent ? "url(#beltNow)" : isDone ? "url(#beltDone)" : "url(#beltIdle)";
            const stroke = isCurrent ? "#22D3EE" : isDone ? "#388BFD" : "#484F58";
            const topFill = isCurrent ? "#388BFD" : isDone ? "#244A7A" : "#30363D";

            return (
              <g key={segment.id} opacity={isAhead ? 0.7 : 1}>
                <polygon
                  points={`${x + 4},${beltY - 10} ${x + segW - 4},${beltY - 10} ${x + segW},${beltY} ${x},${beltY}`}
                  fill={topFill}
                  opacity="0.45"
                />
                <rect
                  x={x}
                  y={beltY}
                  width={segW - 2}
                  height={beltH}
                  rx="6"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isCurrent ? 2.5 : 1.2}
                />
                {[0.25, 0.5, 0.75].map((tick) => (
                  <circle
                    key={tick}
                    cx={x + segW * tick}
                    cy={beltY + beltH / 2}
                    r="3.5"
                    fill={isCurrent ? "#79C0FF" : isDone ? "#58A6FF" : "#484F58"}
                    opacity="0.55"
                  />
                ))}
                <text
                  x={x + segW / 2}
                  y={beltY - 18}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight={isCurrent ? 700 : 600}
                  fill={isCurrent ? "#E6EDF3" : isDone ? "#C9D1D9" : "#8B949E"}
                >
                  {segmentLabel(segment.id, segment.label)}
                </text>
                {segment.sensorActive && (
                  <circle cx={x + segW / 2} cy={beltY + beltH + 10} r="3.5" fill="#F59E0B" opacity="0.95" />
                )}
              </g>
            );
          })}

          <g
            ref={partRef}
            transform={`translate(${padX + progressRef.current * usableW}, ${beltY})`}
            opacity={opacityRef.current}
          >
            <FactoryPartOnBelt color={partColor} />
          </g>

          <text x="28" y="28" fontSize="12" fill="#8B949E">
            {t("Emit → Camera → Sort → Storage", "Выдача → Камера → Сортировка → Склад")}
          </text>
        </svg>

        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div ref={labelRef} className="rounded bg-panel/90 px-2 py-1 font-mono text-xs text-muted">
            {statusText ||
              `${segmentLabel(conveyor.segments[visualIndex]?.id ?? "", conveyor.segments[visualIndex]?.label ?? "—")} · 0%`}
          </div>
          <div className="flex items-center gap-1.5 rounded bg-panel/90 px-2 py-1 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorChip }} />
            {partColor ? colorLabel(partColor, t) : t("Unknown", "Нет цвета")}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-1.5 overflow-auto">
        <div className="mb-0.5 px-0.5 text-[10px] uppercase tracking-wider text-muted">
          {t("Stages", "Этапы")}
        </div>
        {conveyor.segments.map((segment, index) => {
          const isCurrent = index === visualIndex;
          const isDone = index < visualIndex;
          return (
            <div
              key={segment.id}
              className={`rounded-lg border px-2.5 py-2 text-xs transition-colors duration-300 ${
                isCurrent
                  ? "border-[#22D3EE]/70 bg-[#22D3EE]/10"
                  : isDone
                    ? "border-[#388BFD]/35 bg-[#388BFD]/5"
                    : "border-border bg-background"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span className="font-semibold text-foreground">{segmentLabel(segment.id, segment.label)}</span>
                {isCurrent && (
                  <span className="rounded bg-[#22D3EE]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#22D3EE]">
                    {t("now", "сейчас")}
                  </span>
                )}
                {isDone && !isCurrent && (
                  <span className="text-[9px] uppercase text-[#58A6FF]">{t("done", "готово")}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted">
                  <span
                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                      segment.active || isCurrent ? "bg-[#10B981]" : "bg-[#4B5563]"
                    }`}
                  />
                  {t("Belt", "Лента")}
                </div>
                <div className="flex items-center gap-1.5 text-muted">
                  <span
                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                      segment.sensorActive ? "bg-[#F59E0B]" : "bg-[#4B5563]"
                    }`}
                  />
                  {t("Sensor", "Датчик")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorShare({ data }: { data: ProductionPayload["produced"] }) {
  const { t } = useLocale();
  const total = Math.max(data.total, 1);
  return (
    <div className="space-y-3">
      {(["blue", "green", "metal"] as ProductColor[]).map((color) => {
        const value = data[color];
        const width = Math.round((value / total) * 100);
        return (
          <div key={color}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className={colorMeta[color].text}>{colorLabel(color, t)}</span>
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
  const { t } = useLocale();
  const max = Math.max(data.blue, data.green, data.metal, 1);
  return (
    <div className="grid h-full grid-cols-3 gap-3">
      {(["blue", "green", "metal"] as ProductColor[]).map((color) => {
        const level = Math.max(8, Math.round((data[color] / max) * 100));
        return (
          <div key={color} className="flex min-h-0 flex-col rounded-xl border border-border bg-background p-3">
            <div className="mb-3 text-center text-sm font-semibold text-foreground">{colorLabel(color, t)}</div>
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
  const { t } = useLocale();
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5">
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className={`h-5 w-5 rounded ${colorMeta[color].dot} shadow-sm`}
          title={colorLabel(color, t)}
        />
      ))}
      {!colors.length && <span className="text-xs text-muted">{t("No detections", "Нет распознаваний")}</span>}
    </div>
  );
}

export default function ProductionPage() {
  const { t } = useLocale();
  const { data, loading } = usePolling<ProductionPayload>("/api/production", 1000);

  if (loading || !data) {
    return (
      <DashboardShell kiosk breadcrumbs={[{ label: t("Production", "Производство") }]}>
        <div className="flex h-full items-center justify-center text-muted">
          {t("Loading production data...", "Загрузка данных производства...")}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kiosk breadcrumbs={[{ label: t("AI Factory Production", "Производство AI Factory") }]}>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_minmax(0,1.15fr)] gap-3 overflow-hidden">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-2">
            <KpiTile compact label={t("Total produced", "Всего произведено")} value={String(data.produced.total)} accent />
          </div>
          <div className="col-span-2">
            <KpiTile
              compact
              label={t("Rate", "Скорость")}
              value={data.ratePerMin.toFixed(0)}
              unit={t("pcs/min", "шт/мин")}
              variant="success"
            />
          </div>
          <div className="col-span-2">
            <KpiTile
              compact
              label={t("Warehouse", "Склад")}
              value={String(data.warehouse.blue + data.warehouse.green + data.warehouse.metal)}
              unit={t("pcs", "шт")}
            />
          </div>
          <div className="col-span-6 flex items-center justify-end gap-2 rounded-lg border border-border bg-panel px-4">
            <StatusPill
              active={data.status.connected}
              label={data.status.source === "db-replay" ? t("DB Replay", "Replay БД") : "Live OPC"}
            />
            <StatusPill active={data.status.operatingMode === 8 || data.status.operatingMode === 9} label={`PLC ${data.status.operatingModeLabel}`} />
            <StatusPill active={data.status.heartbeatAlive} label="Heartbeat" />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-3">
          <Panel compact fill title={t("Part movement on the line", "Движение детали по линии")} className="col-span-9">
            <ConveyorView
              conveyor={data.conveyor}
              recentColors={data.recentColors}
              lastColor={data.lastColor}
            />
          </Panel>
          <Panel compact fill title={t("Warehouse fill", "Заполнение склада")} className="col-span-3">
            <Warehouse data={data.warehouse} />
          </Panel>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-3">
          <Panel compact fill title={t("Output by color", "Выпуск по цветам")} className="col-span-3">
            <div className="grid h-full grid-rows-[1fr_auto] gap-4">
              <ColorShare data={data.produced} />
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted">
                  {t("Recent parts", "Последние детали")}
                </div>
                <RecentColors colors={data.recentColors} />
              </div>
            </div>
          </Panel>
          <Panel compact fill title={t("Cumulative output", "Накопительный выпуск")} className="col-span-5">
            <TrendLineChart
              compact
              area
              stack
              step
              height="100%"
              series={[
                { name: t("Blue", "Синие"), data: data.dynamics.cumulative.blue, color: "#2563EB" },
                { name: t("Green", "Зелёные"), data: data.dynamics.cumulative.green, color: "#10B981" },
                { name: t("Metal", "Серые"), data: data.dynamics.cumulative.metal, color: "#94A3B8" },
              ]}
            />
          </Panel>
          <Panel compact fill title={t("Output rate and cycle", "Скорость выпуска и цикл")} className="col-span-4">
            <TrendLineChart
              compact
              area
              height="100%"
              series={[
                { name: t("Pcs/min (60s window)", "Шт/мин (окно 60с)"), data: data.dynamics.throughput, color: "#22D3EE" },
                { name: t("Cycle, s", "Цикл, с"), data: data.dynamics.cycleTime, color: "#F59E0B" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
