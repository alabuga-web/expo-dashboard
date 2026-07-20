"use client";

import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { KpiTile } from "@/shared/ui/kpi-tile";
import { Panel } from "@/shared/ui/panel";
import { usePolling } from "@/shared/lib/use-polling";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";
import type { ProductColor, ProductionPayload } from "@/shared/lib/plc-data";

const colorMeta: Record<ProductColor, { label: string; bg: string; text: string; dot: string }> = {
  blue: { label: "Синие", bg: "bg-[#1D4ED8]/20", text: "text-[#60A5FA]", dot: "bg-[#2563EB]" },
  green: { label: "Зелёные", bg: "bg-[#10B981]/20", text: "text-[#34D399]", dot: "bg-[#10B981]" },
  metal: { label: "Серые", bg: "bg-[#94A3B8]/20", text: "text-[#CBD5E1]", dot: "bg-[#94A3B8]" },
};

function fmt(value: number, digits = 1) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#10B981] shadow-[0_0_12px_#10B981]" : "bg-[#4B5563]"}`} />
      <span>{label}</span>
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

function ArmView({ arm, color }: { arm: ProductionPayload["arm"]; color: ProductColor | null }) {
  const px = 8 + (arm.x / 10) * 84;
  const py = 88 - (arm.y / 10) * 76;
  const sx = 8 + (arm.sx / 10) * 84;
  const sy = 88 - (arm.sy / 10) * 76;
  const zLevel = Math.max(0, Math.min(100, (arm.z / 10) * 100));
  return (
    <div className="grid h-full grid-cols-[1fr_70px] gap-4">
      <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-border bg-background">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#21262D" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          <line x1="8" y1="88" x2="92" y2="88" stroke="#30363D" strokeWidth="1" />
          <line x1="8" y1="12" x2="8" y2="88" stroke="#30363D" strokeWidth="1" />
          <circle cx={sx} cy={sy} r="3.2" fill="none" stroke="#F59E0B" strokeWidth="1.6" />
          <line x1="8" y1="88" x2={px} y2={py} stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
          <circle cx={px} cy={py} r="4.5" fill="#22D3EE" />
          <circle cx={px} cy={py} r="9" fill="#22D3EE" opacity="0.12" />
          {arm.boxDetected && (
            <rect
              x={px - 3.5}
              y={py + 5}
              width="7"
              height="7"
              rx="1"
              fill={color ? (color === "blue" ? "#2563EB" : color === "green" ? "#10B981" : "#94A3B8") : "#E6EDF3"}
            />
          )}
        </svg>
        <div className="absolute bottom-3 left-3 rounded bg-panel/90 px-2 py-1 font-mono text-xs text-muted">
          X {fmt(arm.x)} / Y {fmt(arm.y)} / err {fmt(arm.error, 2)}
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background p-3">
          <div className="mb-2 text-center text-xs uppercase tracking-wider text-muted">Z</div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded bg-[#0D1117]">
            <div className="absolute bottom-0 left-0 right-0 bg-[#22D3EE]/25" style={{ height: `${zLevel}%` }} />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-foreground">{fmt(arm.z)}</div>
          </div>
        </div>
        <StatusPill active={arm.grab} label="Grab" />
        <StatusPill active={arm.boxDetected} label="Box" />
      </div>
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
          <Panel compact fill title="Манипулятор FX5" className="col-span-7">
            <ArmView arm={data.arm} color={data.lastColor} />
          </Panel>
          <Panel compact fill title="Тренды руки: факт / уставка / высота" className="col-span-5">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: "X факт", data: data.trends.x, color: "#22D3EE" },
                { name: "X цель", data: data.trends.sx, color: "#F59E0B" },
                { name: "Z", data: data.trends.z, color: "#A78BFA" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
