export type LineStatus =
  | "running"
  | "idle"
  | "starved"
  | "blocked"
  | "alarm"
  | "manual";

export type TagType = "bool" | "int" | "float" | "enum";
export type TagDirection = "input" | "output" | "internal" | "calculated";
export type TagQuality = "good" | "bad" | "uncertain";
export type EquipmentStatus = "running" | "idle" | "fault" | "blocked" | "manual";
export type AlarmSeverity = "warning" | "alarm" | "info";
export type ScenarioId =
  | "normal"
  | "jam"
  | "starvation"
  | "sensor_fault"
  | "reject_overflow"
  | "manual"
  | "speed_x2"
  | "speed_x4"
  | "replay";

export interface Tag {
  id: string;
  name: string;
  path: string;
  type: TagType;
  direction: TagDirection;
  zoneId: string;
  equipmentId?: string;
  unit?: string;
  value: boolean | number | string;
  quality: TagQuality;
  timestamp: string;
  description?: string;
}

export interface Zone {
  id: string;
  name: string;
  shortName: string;
  description: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  status: EquipmentStatus;
  cycleTimeSec: number;
  throughputPerMin: number;
}

export interface Alarm {
  id: string;
  code: string;
  message: string;
  severity: AlarmSeverity;
  zoneId: string;
  equipmentId?: string;
  active: boolean;
  timestamp: string;
}

export interface ProcessEvent {
  id: string;
  type: string;
  message: string;
  zoneId: string;
  equipmentId?: string;
  timestamp: string;
}

export interface TrendPoint {
  timestamp: string;
  value: number;
}

export interface DowntimeReason {
  code: string;
  label: string;
  durationSec: number;
}

export interface OverviewPayload {
  lineStatus: LineStatus;
  producedTotal: number;
  goodCount: number;
  rejectCount: number;
  wipCount: number;
  throughputPerMin: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  avgCycleTimeSec: number;
  maxCycleTimeSec: number;
  topDowntimeReasons: DowntimeReason[];
  activeAlarms: number;
  bottleneckZone: string;
  scenarioId: ScenarioId;
  scenarioLabel: string;
  visitorExplanation: string;
  trend: {
    throughput: TrendPoint[];
    cycleTime: TrendPoint[];
    rejectRate: TrendPoint[];
  };
  zoneLoad: { zoneId: string; load: number }[];
  heatmapData: number[][];
  processFlow: ProcessFlowNode[];
  alarms: Alarm[];
}

export interface ProcessFlowNode {
  zoneId: string;
  name: string;
  status: EquipmentStatus | "starved";
  throughput: number;
  isBottleneck: boolean;
}

export interface AreaPayload {
  zone: Zone;
  equipment: Equipment[];
  localThroughput: number;
  wipCount: number;
  queueLength: number;
  cycleTimeSec: number;
  cycleTimeAvgSec: number;
  activeAlarms: Alarm[];
  trend: {
    throughput: TrendPoint[];
    cycleTime: TrendPoint[];
  };
}

export interface EquipmentDetailPayload {
  equipment: Equipment;
  zone: Zone;
  tags: Tag[];
  stateMachine: { current: string; states: string[]; transitions: string[] };
  interlocks: { name: string; satisfied: boolean }[];
  events: ProcessEvent[];
  trend: TrendPoint[];
  trendLabel: string;
}

export interface ReplaySession {
  id: string;
  name: string;
  date: string;
  durationMin: number;
  oee: number;
  produced: number;
  rejectRate: number;
}

export interface KpiSnapshot {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  throughputPerMin: number;
  producedTotal: number;
}
