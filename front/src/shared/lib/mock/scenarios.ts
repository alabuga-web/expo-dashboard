import type { LineStatus, ScenarioId } from "@/entities/types";

export interface ScenarioConfig {
  id: ScenarioId;
  label: { en: string; ru: string };
  lineStatus: LineStatus;
  throughputMultiplier: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  bottleneckZone: string;
  activeAlarms: number;
  visitorExplanation: { en: string; ru: string };
  faultZone?: string;
  faultEquipment?: string;
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "normal",
    label: { en: "Normal Production", ru: "Штатная работа" },
    lineStatus: "running",
    throughputMultiplier: 1,
    oee: 0.87,
    availability: 0.92,
    performance: 0.89,
    quality: 0.98,
    bottleneckZone: "Z03",
    activeAlarms: 0,
    visitorExplanation: {
      en: "Line is running at nominal speed. All zones are balanced with buffer zone as the natural bottleneck.",
      ru: "Линия работает на номинальной скорости. Все зоны сбалансированы, узкое место — буферная зона.",
    },
  },
  {
    id: "jam",
    label: { en: "Jam / Blockage", ru: "Затор" },
    lineStatus: "blocked",
    throughputMultiplier: 0.15,
    oee: 0.42,
    availability: 0.55,
    performance: 0.78,
    quality: 0.97,
    bottleneckZone: "Z03",
    activeAlarms: 2,
    faultZone: "Z03",
    faultEquipment: "EQ_Z03_BUFFER",
    visitorExplanation: {
      en: "Blockage detected at buffer zone. Upstream zones starve while downstream waits. MTTR countdown active.",
      ru: "Затор в буферной зоне. Вверх по потоку — голодание, вниз — ожидание. Идёт отсчёт MTTR.",
    },
  },
  {
    id: "starvation",
    label: { en: "Starvation", ru: "Голодание" },
    lineStatus: "starved",
    throughputMultiplier: 0.35,
    oee: 0.58,
    availability: 0.72,
    performance: 0.82,
    quality: 0.98,
    bottleneckZone: "Z01",
    activeAlarms: 1,
    faultZone: "Z01",
    faultEquipment: "EQ_Z01_FEED",
    visitorExplanation: {
      en: "No input cubes at entry zone. Line is starved — downstream equipment runs idle waiting for material.",
      ru: "Нет кубиков на входе. Линия голодает — оборудование ниже по потоку простаивает.",
    },
  },
  {
    id: "sensor_fault",
    label: { en: "Sensor Fault", ru: "Отказ датчика" },
    lineStatus: "alarm",
    throughputMultiplier: 0.5,
    oee: 0.61,
    availability: 0.68,
    performance: 0.85,
    quality: 0.96,
    bottleneckZone: "Z05",
    activeAlarms: 3,
    faultZone: "Z05",
    faultEquipment: "EQ_Z05_CAM",
    visitorExplanation: {
      en: "Inspection camera signal stuck ON. Quality gate rejects valid cubes until sensor reset.",
      ru: "Сигнал камеры залип. Контроль качества отбраковывает годные кубики до сброса датчика.",
    },
  },
  {
    id: "reject_overflow",
    label: { en: "Reject Overflow", ru: "Переполнение брака" },
    lineStatus: "alarm",
    throughputMultiplier: 0.7,
    oee: 0.65,
    availability: 0.85,
    performance: 0.88,
    quality: 0.72,
    bottleneckZone: "Z05",
    activeAlarms: 2,
    faultZone: "Z05",
    faultEquipment: "EQ_Z05_REJECT",
    visitorExplanation: {
      en: "Reject bin full. Pusher interlock prevents further rejects — line slows to avoid overflow.",
      ru: "Бункер брака переполнен. Блокировка толкателя — линия замедляется.",
    },
  },
  {
    id: "manual",
    label: { en: "Manual Mode", ru: "Ручной режим" },
    lineStatus: "manual",
    throughputMultiplier: 0.25,
    oee: 0.45,
    availability: 0.6,
    performance: 0.75,
    quality: 0.99,
    bottleneckZone: "Z02",
    activeAlarms: 0,
    visitorExplanation: {
      en: "Operator intervention active. Auto sequence paused — step-by-step control enabled.",
      ru: "Вмешательство оператора. Автоматика на паузе — пошаговое управление.",
    },
  },
  {
    id: "speed_x2",
    label: { en: "Speed Demo x2", ru: "Ускорение x2" },
    lineStatus: "running",
    throughputMultiplier: 2,
    oee: 0.82,
    availability: 0.9,
    performance: 0.95,
    quality: 0.96,
    bottleneckZone: "Z04",
    activeAlarms: 0,
    visitorExplanation: {
      en: "Demonstration mode: line speed doubled. Watch throughput and cycle time trends respond in real time.",
      ru: "Демо-режим: скорость линии удвоена. Следите за throughput и cycle time.",
    },
  },
  {
    id: "speed_x4",
    label: { en: "Speed Demo x4", ru: "Ускорение x4" },
    lineStatus: "running",
    throughputMultiplier: 4,
    oee: 0.74,
    availability: 0.88,
    performance: 0.92,
    quality: 0.91,
    bottleneckZone: "Z03",
    activeAlarms: 1,
    visitorExplanation: {
      en: "High-speed demo at 4x. Buffer zone becomes critical bottleneck — quality slightly degrades.",
      ru: "Высокоскоростное демо x4. Буфер — критическое узкое место, качество слегка падает.",
    },
  },
  {
    id: "replay",
    label: { en: "Replay Session", ru: "Воспроизведение" },
    lineStatus: "running",
    throughputMultiplier: 1,
    oee: 0.85,
    availability: 0.91,
    performance: 0.88,
    quality: 0.97,
    bottleneckZone: "Z03",
    activeAlarms: 0,
    visitorExplanation: {
      en: "Historical session replay. Compare past production runs with current performance.",
      ru: "Воспроизведение исторической сессии. Сравнение с текущими показателями.",
    },
  },
];

export function getScenario(id: ScenarioId): ScenarioConfig {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
