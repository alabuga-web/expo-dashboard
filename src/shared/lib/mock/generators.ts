import type { Alarm, ProcessEvent, ReplaySession, TrendPoint } from "@/entities/types";
import type { ScenarioConfig } from "./scenarios";

const BASE_THROUGHPUT = 32.4;
const BASE_CYCLE = 1.85;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTrend(
  rangeMin: number,
  baseValue: number,
  variance: number,
  scenario: ScenarioConfig,
  field: "throughput" | "cycleTime" | "rejectRate" = "throughput"
): TrendPoint[] {
  const now = Date.now();
  const points: TrendPoint[] = [];
  const intervalMs = (rangeMin * 60 * 1000) / 60;
  const rand = seededRandom(rangeMin * 100 + baseValue * 10);

  for (let i = 60; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const noise = (rand() - 0.5) * variance;
    let value = baseValue + noise;

    if (field === "throughput") {
      value = BASE_THROUGHPUT * scenario.throughputMultiplier + noise;
      if (scenario.id === "jam" && i < 15) value *= 0.3;
      if (scenario.id === "starvation" && i < 25) value *= 0.4;
    } else if (field === "cycleTime") {
      value = BASE_CYCLE / scenario.throughputMultiplier + noise * 0.1;
    } else {
      value = (1 - scenario.quality) * 100 + noise * 0.5;
      value = Math.max(0, value);
    }

    points.push({ timestamp: t.toISOString(), value: Math.max(0, +value.toFixed(2)) });
  }
  return points;
}

export function generateZoneLoad(scenario: ScenarioConfig): { zoneId: string; load: number }[] {
  const zones = ["Z01", "Z02", "Z03", "Z04", "Z05", "Z06"];
  const bottleneck = scenario.bottleneckZone;
  return zones.map((zoneId) => {
    let load = 0.65 + Math.random() * 0.25;
    if (zoneId === bottleneck) load = 0.92 + Math.random() * 0.08;
    if (scenario.faultZone === zoneId) load = scenario.lineStatus === "blocked" ? 0.98 : 0.45;
    return { zoneId, load: +load.toFixed(2) };
  });
}

export function generateHeatmapData(scenario: ScenarioConfig): number[][] {
  const zones = 6;
  const buckets = 12;
  const data: number[][] = [];
  for (let z = 0; z < zones; z++) {
    const row: number[] = [];
    for (let b = 0; b < buckets; b++) {
      let val = 0.5 + Math.random() * 0.4;
      if (`Z0${z + 1}` === scenario.bottleneckZone) val = 0.75 + Math.random() * 0.25;
      row.push(+val.toFixed(2));
    }
    data.push(row);
  }
  return data;
}

export function generateAlarms(scenario: ScenarioConfig): Alarm[] {
  const now = new Date();
  const alarms: Alarm[] = [];

  if (scenario.activeAlarms >= 1 && scenario.faultZone) {
    alarms.push({
      id: "ALM001",
      code: scenario.id === "jam" ? "BLOCKAGE" : scenario.id === "starvation" ? "STARVATION" : "FAULT",
      message:
        scenario.id === "jam"
          ? "Затор в буферной зоне"
          : scenario.id === "starvation"
            ? "Голодание на входе — нет материала"
            : scenario.id === "sensor_fault"
              ? "Сигнал камеры залип в ON"
              : scenario.id === "reject_overflow"
                ? "Переполнение бункера брака"
                : "Снижение производительности зоны",
      severity: scenario.lineStatus === "alarm" || scenario.lineStatus === "blocked" ? "alarm" : "warning",
      zoneId: scenario.faultZone,
      equipmentId: scenario.faultEquipment,
      active: true,
      timestamp: new Date(now.getTime() - 120000).toISOString(),
    });
  }

  if (scenario.activeAlarms >= 2) {
    alarms.push({
      id: "ALM002",
      code: "PERF_LOSS",
      message: "Производительность ниже целевого порога",
      severity: "warning",
      zoneId: scenario.bottleneckZone,
      active: true,
      timestamp: new Date(now.getTime() - 300000).toISOString(),
    });
  }

  if (scenario.activeAlarms >= 3) {
    alarms.push({
      id: "ALM003",
      code: "SENSOR_FAULT",
      message: "Неопределённое качество сигнала датчика",
      severity: "alarm",
      zoneId: scenario.faultZone ?? "Z05",
      equipmentId: scenario.faultEquipment,
      active: true,
      timestamp: new Date(now.getTime() - 60000).toISOString(),
    });
  }

  return alarms;
}

export function generateEvents(scenario: ScenarioConfig, limit = 20): ProcessEvent[] {
  const types = ["CUBE_PASS", "CYCLE_COMPLETE", "STATE_CHANGE", "ALARM", "RESET"];
  const events: ProcessEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < limit; i++) {
    const zoneIdx = i % 6;
    events.push({
      id: `EVT${String(i).padStart(4, "0")}`,
      type: types[i % types.length],
      message:
        i === 0 && scenario.id === "jam"
          ? "Обнаружен затор в буфере"
          : `Куб обработан в зоне Z0${zoneIdx + 1}`,
      zoneId: `Z0${zoneIdx + 1}`,
      timestamp: new Date(now - i * 45000).toISOString(),
    });
  }
  return events;
}

export function generateDowntimeReasons(scenario: ScenarioConfig) {
  const reasons = [
    { code: "BLOCKAGE", label: "Затор", durationSec: 340 },
    { code: "SENSOR_FAULT", label: "Отказ датчика", durationSec: 125 },
    { code: "STARVATION", label: "Голодание", durationSec: 95 },
    { code: "MANUAL_STOP", label: "Ручной останов", durationSec: 60 },
    { code: "REJECT_OVERFLOW", label: "Переполнение брака", durationSec: 45 },
  ];

  if (scenario.id === "jam") {
    return reasons.sort((a, b) => (a.code === "BLOCKAGE" ? -1 : b.code === "BLOCKAGE" ? 1 : 0));
  }
  if (scenario.id === "starvation") {
    return [...reasons].sort((a) => (a.code === "STARVATION" ? -1 : 0));
  }
  return reasons.slice(0, 4);
}

export const REPLAY_SESSIONS: ReplaySession[] = [
  { id: "SES001", name: "Утренняя смена", date: "2026-06-18T06:00:00Z", durationMin: 240, oee: 0.89, produced: 4520, rejectRate: 0.021 },
  { id: "SES002", name: "Демо: событие затора", date: "2026-06-17T14:30:00Z", durationMin: 45, oee: 0.52, produced: 680, rejectRate: 0.045 },
  { id: "SES003", name: "Высокоскоростной прогон", date: "2026-06-17T10:00:00Z", durationMin: 60, oee: 0.78, produced: 3840, rejectRate: 0.038 },
];

export function baseKpi(scenario: ScenarioConfig) {
  const producedTotal = Math.round(1842 * scenario.throughputMultiplier);
  const quality = scenario.quality;
  const goodCount = Math.round(producedTotal * quality);
  const rejectCount = producedTotal - goodCount;
  return {
    producedTotal,
    goodCount,
    rejectCount,
    wipCount: Math.round(8 + scenario.throughputMultiplier * 4),
    throughputPerMin: +(BASE_THROUGHPUT * scenario.throughputMultiplier).toFixed(1),
    oee: scenario.oee,
    availability: scenario.availability,
    performance: scenario.performance,
    quality: scenario.quality,
    avgCycleTimeSec: +(BASE_CYCLE / scenario.throughputMultiplier).toFixed(2),
    maxCycleTimeSec: +(BASE_CYCLE / scenario.throughputMultiplier * 1.8).toFixed(2),
  };
}
