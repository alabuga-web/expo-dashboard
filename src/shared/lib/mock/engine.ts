import type {
  AreaPayload,
  EquipmentDetailPayload,
  OverviewPayload,
  ProcessFlowNode,
  ScenarioId,
} from "@/entities/types";
import { ZONES, getZone } from "@/shared/config/zones";
import {
  baseKpi,
  generateAlarms,
  generateDowntimeReasons,
  generateEvents,
  generateHeatmapData,
  generateTrend,
  generateZoneLoad,
} from "./generators";
import {
  EQUIPMENT,
  getEquipmentById,
  getEquipmentByZone,
  getTagsByEquipment,
} from "./model";
import { getScenario, SCENARIOS } from "./scenarios";

let activeScenarioId: ScenarioId = "normal";

export function getActiveScenarioId(): ScenarioId {
  return activeScenarioId;
}

export function setActiveScenario(id: ScenarioId): void {
  activeScenarioId = id;
}

export function getScenarios() {
  return SCENARIOS;
}

function buildProcessFlow(scenario: ReturnType<typeof getScenario>): ProcessFlowNode[] {
  return ZONES.map((zone) => {
    const isBottleneck = zone.id === scenario.bottleneckZone;
    const isFault = zone.id === scenario.faultZone;
    let status: ProcessFlowNode["status"] = "running";
    if (isFault && scenario.lineStatus === "blocked") status = "blocked";
    else if (isFault && scenario.lineStatus === "starved") status = "starved";
    else if (isFault && scenario.lineStatus === "alarm") status = "fault";
    else if (scenario.lineStatus === "manual") status = "manual";
    else if (scenario.lineStatus === "idle") status = "idle";

    return {
      zoneId: zone.id,
      name: zone.name,
      status,
      throughput: +(32 * scenario.throughputMultiplier * (isBottleneck ? 0.85 : 1)).toFixed(1),
      isBottleneck,
    };
  });
}

export function buildOverviewPayload(): OverviewPayload {
  const scenario = getScenario(activeScenarioId);
  const kpi = baseKpi(scenario);
  const alarms = generateAlarms(scenario);

  return {
    lineStatus: scenario.lineStatus,
    ...kpi,
    topDowntimeReasons: generateDowntimeReasons(scenario),
    activeAlarms: alarms.filter((a) => a.active).length,
    bottleneckZone: scenario.bottleneckZone,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label.ru,
    visitorExplanation: scenario.visitorExplanation.ru,
    trend: {
      throughput: generateTrend(15, kpi.throughputPerMin, 3, scenario, "throughput"),
      cycleTime: generateTrend(15, kpi.avgCycleTimeSec, 0.15, scenario, "cycleTime"),
      rejectRate: generateTrend(15, (1 - kpi.quality) * 100, 0.3, scenario, "rejectRate"),
    },
    zoneLoad: generateZoneLoad(scenario),
    heatmapData: generateHeatmapData(scenario),
    processFlow: buildProcessFlow(scenario),
    alarms,
  };
}

export function buildAreaPayload(zoneId: string): AreaPayload | null {
  const zone = getZone(zoneId);
  if (!zone) return null;

  const scenario = getScenario(activeScenarioId);
  const equipment = getEquipmentByZone(zoneId).map((eq) => ({
    ...eq,
    status:
      eq.id === scenario.faultEquipment
        ? scenario.lineStatus === "blocked"
          ? ("blocked" as const)
          : scenario.lineStatus === "alarm"
            ? ("fault" as const)
            : eq.status
        : eq.status,
  }));

  const localThroughput = +(32 * scenario.throughputMultiplier * (zoneId === scenario.bottleneckZone ? 0.85 : 1)).toFixed(1);

  return {
    zone,
    equipment,
    localThroughput,
    wipCount: Math.round(4 + Math.random() * 12),
    queueLength: zoneId === scenario.bottleneckZone ? Math.round(14 + Math.random() * 6) : Math.round(2 + Math.random() * 5),
    cycleTimeSec: +(1.85 / scenario.throughputMultiplier).toFixed(2),
    cycleTimeAvgSec: +(1.9 / scenario.throughputMultiplier).toFixed(2),
    activeAlarms: generateAlarms(scenario).filter((a) => a.zoneId === zoneId),
    trend: {
      throughput: generateTrend(15, localThroughput, 2, scenario, "throughput"),
      cycleTime: generateTrend(15, 1.85 / scenario.throughputMultiplier, 0.1, scenario, "cycleTime"),
    },
  };
}

export function buildEquipmentPayload(equipmentId: string): EquipmentDetailPayload | null {
  const equipment = getEquipmentById(equipmentId);
  if (!equipment) return null;

  const zone = getZone(equipment.zoneId)!;
  const scenario = getScenario(activeScenarioId);
  const tags = getTagsByEquipment(equipmentId);

  const currentState =
    equipment.id === scenario.faultEquipment
      ? scenario.lineStatus === "alarm"
        ? "Неисправность"
        : scenario.lineStatus === "blocked"
          ? "Затор"
          : "Работа"
      : "Работа";

  return {
    equipment: {
      ...equipment,
      status:
        equipment.id === scenario.faultEquipment
          ? scenario.lineStatus === "blocked"
            ? "blocked"
            : scenario.lineStatus === "alarm"
              ? "fault"
              : equipment.status
          : equipment.status,
    },
    zone,
    tags,
    stateMachine: {
      current: currentState,
      states: ["Простой", "Работа", "Затор", "Неисправность"],
      transitions: [
        "Простой → Работа",
        "Работа → Затор",
        "Работа → Неисправность",
        "Неисправность → Простой",
      ],
    },
    interlocks: [
      { name: "Защитные ворота закрыты", satisfied: true },
      { name: "Аварийный стоп отключён", satisfied: true },
      { name: "Нижестоящий участок готов", satisfied: scenario.lineStatus !== "blocked" },
      { name: "Материал на входе", satisfied: scenario.lineStatus !== "starved" },
    ],
    events: generateEvents(scenario, 20),
    trend: generateTrend(15, equipment.throughputPerMin, 2, scenario, "throughput"),
    trendLabel: "Производительность (куб/мин)",
  };
}

export function buildAreasList() {
  return ZONES.map((zone) => {
    const payload = buildAreaPayload(zone.id)!;
    return {
      zone,
      equipmentCount: payload.equipment.length,
      localThroughput: payload.localThroughput,
      activeAlarms: payload.activeAlarms.length,
      status: payload.equipment.some((e) => e.status === "fault" || e.status === "blocked")
        ? "alarm"
        : "running",
    };
  });
}

export { EQUIPMENT, generateEvents, generateAlarms };
