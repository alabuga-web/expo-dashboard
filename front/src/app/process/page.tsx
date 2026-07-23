"use client";

import { useEffect, useRef } from "react";
import { DashboardShell } from "@/shared/ui/dashboard-shell";
import { Panel } from "@/shared/ui/panel";
import { usePolling } from "@/shared/lib/use-polling";
import { TrendLineChart } from "@/widgets/charts/trend-line-chart";
import type { ProcessArmPose, ProcessPayload } from "@/shared/lib/plc-data";

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#10B981] shadow-[0_0_12px_#10B981]" : "bg-[#4B5563]"}`} />
      <span>{label}</span>
    </div>
  );
}

const VOLT_MAX = 10;
const L1 = 95;
const L2 = 78;
const ARM_ORANGE = "#EA580C";
const ARM_DARK = "#1F2937";
const ARM_STEEL = "#9CA3AF";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

/** IK для 2-звенной руки в плоскости XY + высота Z */
function solveArm(xV: number, yV: number, zV: number) {
  const px = (clamp01(xV / VOLT_MAX) * 2 - 1) * (L1 + L2 - 8);
  const pz = (clamp01(yV / VOLT_MAX) * 2 - 1) * (L1 + L2 - 8);
  const reach = Math.hypot(px, pz);
  const maxR = L1 + L2 - 4;
  const minR = Math.abs(L1 - L2) + 8;
  const r = clamp(reach, minR, maxR);
  const scale = reach > 0.001 ? r / reach : 1;
  const tx = px * scale;
  const tz = pz * scale;

  const cosElbow = clamp((L1 * L1 + L2 * L2 - r * r) / (2 * L1 * L2), -1, 1);
  const elbow = Math.PI - Math.acos(cosElbow);
  const cosShoulder = clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r), -1, 1);
  const shoulderOffset = Math.acos(cosShoulder);
  const base = Math.atan2(tz, tx);
  const shoulder = base + shoulderOffset;
  const zDown = clamp01(zV / VOLT_MAX) * 70;

  return {
    baseDeg: (base * 180) / Math.PI,
    shoulderDeg: (shoulder * 180) / Math.PI - (base * 180) / Math.PI,
    elbowDeg: (elbow * 180) / Math.PI,
    zDown,
    tipX: tx,
    tipZ: tz,
  };
}

/**
 * Робот-рука (SCARA/articulated look) по XYZ PLC + вращение сцены мышью.
 * TCP следует за координатами через упрощённую IK.
 */
function Fx5RobotArm3D({ pose }: { pose: ProcessArmPose }) {
  const targetRef = useRef(pose);
  const displayRef = useRef({ ...pose });
  const worldRef = useRef<HTMLDivElement | null>(null);
  const baseYawRef = useRef<HTMLDivElement | null>(null);
  const shoulderRef = useRef<HTMLDivElement | null>(null);
  const elbowRef = useRef<HTMLDivElement | null>(null);
  const zRef = useRef<HTMLDivElement | null>(null);
  const suctionRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef({ rotX: 58, rotZ: -25 });
  const dragRef = useRef<{ active: boolean; x: number; y: number; rotX: number; rotZ: number } | null>(null);

  useEffect(() => {
    targetRef.current = pose;
  }, [pose]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = targetRef.current;
      const cur = displayRef.current;
      const k = Math.min(1, 9 * dt);

      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      cur.z += (target.z - cur.z) * k;
      cur.sx += (target.sx - cur.sx) * k;
      cur.sy += (target.sy - cur.sy) * k;
      cur.sz += (target.sz - cur.sz) * k;
      cur.error += (target.error - cur.error) * k;
      cur.grab = target.grab;
      cur.boxDetected = target.boxDetected;

      const ik = solveArm(cur.x, cur.y, cur.z);
      const ghost = solveArm(cur.sx, cur.sy, cur.sz);

      if (worldRef.current) {
        const { rotX, rotZ } = viewRef.current;
        worldRef.current.style.transform = `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
      }
      if (baseYawRef.current) {
        baseYawRef.current.style.transform = `rotateY(${ik.baseDeg}deg)`;
      }
      if (shoulderRef.current) {
        shoulderRef.current.style.transform = `translate3d(0, -72px, 0) rotateZ(${-ik.shoulderDeg}deg)`;
      }
      if (elbowRef.current) {
        elbowRef.current.style.transform = `translate3d(${L1}px, 0, 0) rotateZ(${-ik.elbowDeg}deg)`;
      }
      if (zRef.current) {
        zRef.current.style.transform = `translate3d(${L2}px, ${ik.zDown}px, 0)`;
      }
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${ghost.tipX}px, ${ghost.zDown}px, ${ghost.tipZ}px)`;
      }
      if (suctionRef.current) {
        suctionRef.current.style.background = cur.grab ? "#22D3EE" : "#E5E7EB";
        suctionRef.current.style.boxShadow = cur.grab ? "0 0 18px #22D3EEAA" : "none";
      }
      if (boxRef.current) {
        boxRef.current.style.opacity = cur.grab && cur.boxDetected ? "1" : "0";
      }
      if (readoutRef.current) {
        readoutRef.current.textContent = `X ${cur.x.toFixed(2)} / Y ${cur.y.toFixed(2)} / Z ${cur.z.toFixed(2)} · err ${cur.error.toFixed(2)} · ${cur.grab ? "GRAB" : "IDLE"}${cur.boxDetected ? " · BOX" : ""}`;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      rotX: viewRef.current.rotX,
      rotZ: viewRef.current.rotZ,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag?.active) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    viewRef.current.rotZ = drag.rotZ + dx * 0.45;
    viewRef.current.rotX = clamp(drag.rotX - dy * 0.35, 25, 75);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative grid h-full min-h-0 grid-rows-[1fr_auto] overflow-hidden rounded-xl border border-border bg-[#0D1117]">
      <div
        className="relative min-h-0 cursor-grab overflow-hidden active:cursor-grabbing"
        style={{ perspective: "1200px", perspectiveOrigin: "50% 35%", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-black/40 px-2 py-1 text-[10px] text-muted">
          тяни мышью — вращение
        </div>

        <div
          className="absolute left-1/2 top-[72%] h-0 w-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div ref={worldRef} style={{ transformStyle: "preserve-3d", transform: "rotateX(58deg) rotateZ(-25deg)" }}>
            {/* Пол */}
            <div
              className="absolute border border-[#30363D] bg-[#161B22]"
              style={{
                width: 320,
                height: 320,
                transform: "translate3d(-160px, 0, -160px) rotateX(90deg)",
                transformOrigin: "top left",
                backgroundImage:
                  "linear-gradient(#21262D 1px, transparent 1px), linear-gradient(90deg, #21262D 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Призрак уставки TCP */}
            <div ref={ghostRef} className="absolute" style={{ transformStyle: "preserve-3d" }}>
              <div
                className="absolute rounded-full border-2 border-dashed border-[#F59E0B]"
                style={{
                  width: 28,
                  height: 28,
                  transform: "translate3d(-14px, -14px, 0)",
                  background: "rgba(245, 158, 11, 0.15)",
                }}
              />
            </div>

            {/* Пьедестал */}
            <div
              className="absolute rounded-md"
              style={{
                width: 64,
                height: 28,
                background: ARM_DARK,
                transform: "translate3d(-32px, -28px, -32px)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 48,
                height: 18,
                background: "#374151",
                transform: "translate3d(-24px, -44px, -24px)",
              }}
            />

            {/* База (yaw) */}
            <div
              ref={baseYawRef}
              className="absolute"
              style={{ transformStyle: "preserve-3d", transformOrigin: "0 0 0" }}
            >
              <div
                className="absolute rounded-md"
                style={{
                  width: 36,
                  height: 42,
                  background: ARM_ORANGE,
                  transform: "translate3d(-18px, -86px, -18px)",
                  boxShadow: "inset -4px 0 0 #9A341255",
                }}
              />

              {/* Плечо */}
              <div
                ref={shoulderRef}
                className="absolute"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "0px 0px 0px",
                  transform: "translate3d(0, -72px, 0)",
                }}
              >
                <div
                  className="absolute rounded-sm"
                  style={{
                    width: L1,
                    height: 22,
                    background: `linear-gradient(180deg, ${ARM_ORANGE}, #C2410C)`,
                    transform: "translate3d(0, -11px, -11px)",
                    boxShadow: "0 0 12px #EA580C44",
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    background: ARM_STEEL,
                    transform: "translate3d(-8px, -13px, -13px)",
                  }}
                />

                {/* Локоть + предплечье */}
                <div
                  ref={elbowRef}
                  className="absolute"
                  style={{ transformStyle: "preserve-3d", transformOrigin: "0 0 0" }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 22,
                      height: 22,
                      background: ARM_STEEL,
                      transform: "translate3d(-11px, -11px, -11px)",
                    }}
                  />
                  <div
                    className="absolute rounded-sm"
                    style={{
                      width: L2,
                      height: 18,
                      background: `linear-gradient(180deg, #FB923C, ${ARM_ORANGE})`,
                      transform: "translate3d(0, -9px, -9px)",
                    }}
                  />

                  {/* Кисть + Z + захват */}
                  <div
                    ref={zRef}
                    className="absolute"
                    style={{ transformStyle: "preserve-3d", transformOrigin: "0 0 0" }}
                  >
                    <div
                      className="absolute rounded-sm"
                      style={{
                        width: 14,
                        height: 56,
                        background: `linear-gradient(90deg, #6B7280, ${ARM_STEEL}, #6B7280)`,
                        transform: "translate3d(-7px, 0, -7px)",
                      }}
                    />
                    <div
                      className="absolute rounded-sm bg-[#111827]"
                      style={{ width: 24, height: 12, transform: "translate3d(-12px, 48px, -8px)" }}
                    />
                    <div
                      ref={suctionRef}
                      className="absolute rounded-full"
                      style={{
                        width: 20,
                        height: 8,
                        background: "#E5E7EB",
                        transform: "translate3d(-10px, 58px, -6px) rotateX(65deg)",
                      }}
                    />
                    <div
                      ref={boxRef}
                      className="absolute rounded-sm bg-[#C4A574]"
                      style={{
                        width: 26,
                        height: 16,
                        opacity: 0,
                        transform: "translate3d(-13px, 64px, -10px)",
                        boxShadow: "0 0 10px #C4A57466",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-[10px] text-muted">
        <div ref={readoutRef} className="truncate font-mono text-foreground" />
        <div className="shrink-0">рука · пунктир = уставка · drag = обзор</div>
      </div>
    </div>
  );
}

export default function ProcessPage() {
  const { data, loading } = usePolling<ProcessPayload>("/api/process", 1000);

  if (loading || !data) {
    return (
      <DashboardShell kiosk breadcrumbs={[{ label: "Процессы" }]}>
        <div className="flex h-full items-center justify-center text-muted">Загрузка процессов линии...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kiosk breadcrumbs={[{ label: "Процессы линии (демо)" }]}>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel px-4 py-2">
          <div className="text-sm text-muted">
            Живые процессы PLC: 3D рука FX5, проход по зонам, сортировка, цикл захвата
          </div>
          <div className="flex items-center gap-2">
            <StatusPill active={data.status.connected} label={data.status.source === "db-replay" ? "Replay БД" : "Live OPC"} />
            <StatusPill active={data.status.operatingMode === 8 || data.status.operatingMode === 9} label={`PLC ${data.status.operatingModeLabel}`} />
            <StatusPill active={data.status.heartbeatAlive} label="Heartbeat" />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-3">
          <Panel compact fill title="FX5 — робот-рука (XYZ → IK)" className="col-span-6">
            <div className="h-full min-h-0">
              <Fx5RobotArm3D pose={data.pose} />
            </div>
          </Panel>
          <Panel compact fill title="Проход по линии (импульсы датчиков)" className="col-span-6">
            <TrendLineChart
              compact
              step
              height="100%"
              series={[
                { name: "Вход DS1", data: data.linePass.diffuse1, color: "#22D3EE" },
                { name: "Линия DS3", data: data.linePass.diffuse3, color: "#38BDF8" },
                { name: "Буфер DS9", data: data.linePass.diffuse9, color: "#A78BFA" },
                { name: "Vision", data: data.linePass.vision, color: "#F472B6" },
                { name: "Сорт. DS10", data: data.linePass.diffuse10, color: "#F59E0B" },
              ]}
            />
          </Panel>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-3">
          <Panel compact fill title="Сортировка: маршруты на склад" className="col-span-6">
            <TrendLineChart
              compact
              step
              height="100%"
              series={[
                { name: "Синие ← left", data: data.sorting.left, color: "#2563EB" },
                { name: "Зелёные → right", data: data.sorting.right, color: "#10B981" },
                { name: "Серые metal", data: data.sorting.metal, color: "#94A3B8" },
              ]}
            />
          </Panel>
          <Panel compact fill title="Цикл захвата: ошибка + box + grab" className="col-span-6">
            <TrendLineChart
              compact
              height="100%"
              series={[
                { name: "Ошибка поз.", data: data.pickCycle.error, color: "#F43F5E" },
                { name: "Box detected", data: data.pickCycle.boxDetected, color: "#A78BFA" },
                { name: "Grab", data: data.pickCycle.grab, color: "#22D3EE" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
