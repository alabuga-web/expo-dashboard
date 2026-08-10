import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { LineStatus, ProcessEvent, Tag, TagDirection, TagType, TrendPoint } from "@/entities/types";

export type PlcDataSource = "live-api" | "db-replay" | "unavailable";
export type ProductColor = "blue" | "green" | "metal";

export interface PlcTagMeta {
  tagName: string;
  label: string;
  description: string;
  zoneId: string;
  equipmentId: string;
  direction: TagDirection;
  type: TagType;
  unit?: string;
  ui: Array<"production" | "diagnostics" | "overview-status" | "overview-flow" | "detail-trend" | "heartbeat">;
}

export const PLC_TAG_MAP: Record<string, PlcTagMeta> = {
  plc_operating_mode: {
    tagName: "plc_operating_mode",
    label: "Operating Mode",
    description: "Режим CPU Siemens (8 = Run)",
    zoneId: "Z01",
    equipmentId: "EQ_PLC",
    direction: "internal",
    type: "int",
    ui: ["production", "diagnostics", "overview-status"],
  },
  clock_0_5hz: {
    tagName: "clock_0_5hz",
    label: "Clock 0.5Hz",
    description: "Heartbeat ПЛК (должен мигать)",
    zoneId: "Z01",
    equipmentId: "EQ_PLC",
    direction: "internal",
    type: "bool",
    ui: ["production", "diagnostics", "heartbeat"],
  },
  diffuse_sensor_1: {
    tagName: "diffuse_sensor_1",
    label: "Diffuse Sensor 1",
    description: "Оптический датчик наличия объекта",
    zoneId: "Z01",
    equipmentId: "EQ_Z01_PE",
    direction: "input",
    type: "bool",
    ui: ["production", "diagnostics", "overview-flow"],
  },
  diffuse_sensor_3: {
    tagName: "diffuse_sensor_3",
    label: "Diffuse Sensor 3",
    description: "Датчик после входной секции",
    zoneId: "Z01",
    equipmentId: "EQ_Z01_PE",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  diffuse_sensor_9: {
    tagName: "diffuse_sensor_9",
    label: "Diffuse Sensor 9",
    description: "Датчик перед сортировкой",
    zoneId: "Z03",
    equipmentId: "EQ_Z03_PE",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  diffuse_sensor_10: {
    tagName: "diffuse_sensor_10",
    label: "Diffuse Sensor 10",
    description: "Датчик после сортировки",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  fx3_diffuse_sensor_2: {
    tagName: "fx3_diffuse_sensor_2",
    label: "FX3 Diffuse Sensor 2",
    description: "Датчик FX3 перед сортировщиком",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  fx3_diffuse_sensor_8: {
    tagName: "fx3_diffuse_sensor_8",
    label: "FX3 Diffuse Sensor 8",
    description: "Датчик FX3 после сортировщика",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  belt_conveyor_1: {
    tagName: "belt_conveyor_1",
    label: "Belt Conveyor (2m) 1",
    description: "Команда конвейера 2 м",
    zoneId: "Z02",
    equipmentId: "EQ_Z02_CONV",
    direction: "output",
    type: "bool",
    ui: ["production", "diagnostics", "overview-flow"],
  },
  belt_conveyor_2: {
    tagName: "belt_conveyor_2",
    label: "Belt Conveyor 2",
    description: "Конвейерная секция 2",
    zoneId: "Z02",
    equipmentId: "EQ_Z02_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  belt_conveyor_3: {
    tagName: "belt_conveyor_3",
    label: "Belt Conveyor 3",
    description: "Конвейерная секция 3",
    zoneId: "Z02",
    equipmentId: "EQ_Z02_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  belt_conveyor_4: {
    tagName: "belt_conveyor_4",
    label: "Belt Conveyor 4",
    description: "Конвейерная секция 4",
    zoneId: "Z02",
    equipmentId: "EQ_Z02_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  belt_conveyor_7: {
    tagName: "belt_conveyor_7",
    label: "Belt Conveyor 7",
    description: "Конвейерная секция 7",
    zoneId: "Z03",
    equipmentId: "EQ_Z03_BUFFER",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  belt_conveyor_8: {
    tagName: "belt_conveyor_8",
    label: "Belt Conveyor 8",
    description: "Конвейерная секция 8",
    zoneId: "Z03",
    equipmentId: "EQ_Z03_BUFFER",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_belt_conveyor_3: {
    tagName: "fx3_belt_conveyor_3",
    label: "FX3 Belt Conveyor 3",
    description: "Конвейер FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_belt_conveyor_4: {
    tagName: "fx3_belt_conveyor_4",
    label: "FX3 Belt Conveyor 4",
    description: "Конвейер FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_belt_conveyor_5: {
    tagName: "fx3_belt_conveyor_5",
    label: "FX3 Belt Conveyor 5",
    description: "Конвейер FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_belt_conveyor_6: {
    tagName: "fx3_belt_conveyor_6",
    label: "FX3 Belt Conveyor 6",
    description: "Конвейер FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_belt_conveyor_7: {
    tagName: "fx3_belt_conveyor_7",
    label: "FX3 Belt Conveyor 7",
    description: "Конвейер FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_belt_conveyor_8: {
    tagName: "fx3_belt_conveyor_8",
    label: "FX3 Belt Conveyor 8",
    description: "Конвейер FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  factory_io_reset: {
    tagName: "factory_io_reset",
    label: "FACTORY I/O Reset",
    description: "Сброс сцены Factory I/O",
    zoneId: "Z01",
    equipmentId: "EQ_PLC",
    direction: "output",
    type: "bool",
    ui: ["production", "diagnostics"],
  },
  emitter_1_emit: {
    tagName: "emitter_1_emit",
    label: "Emitter 1 Emit",
    description: "Импульс выдачи детали",
    zoneId: "Z01",
    equipmentId: "EQ_Z01_FEED",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  emitter_2_base: {
    tagName: "emitter_2_base",
    label: "Emitter 2 Base",
    description: "Код основания детали",
    zoneId: "Z01",
    equipmentId: "EQ_Z01_FEED",
    direction: "output",
    type: "int",
    ui: ["production"],
  },
  emitter_2_part: {
    tagName: "emitter_2_part",
    label: "Emitter 2 Part",
    description: "Код выдаваемой детали",
    zoneId: "Z01",
    equipmentId: "EQ_Z01_FEED",
    direction: "output",
    type: "int",
    ui: ["production"],
  },
  color: {
    tagName: "color",
    label: "COLOR",
    description: "Код цвета от программы ПЛК",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "internal",
    type: "int",
    ui: ["production"],
  },
  vision_sensor_1_value: {
    tagName: "vision_sensor_1_value",
    label: "Vision Sensor 1",
    description: "Код цвета/типа детали",
    zoneId: "Z04",
    equipmentId: "EQ_Z05_CAM",
    direction: "input",
    type: "int",
    ui: ["production"],
  },
  vision_sensor_2_value: {
    tagName: "vision_sensor_2_value",
    label: "Vision Sensor 2",
    description: "Код цвета/типа детали",
    zoneId: "Z04",
    equipmentId: "EQ_Z05_CAM",
    direction: "input",
    type: "int",
    ui: ["production"],
  },
  fx3_vision_sensor_3_value: {
    tagName: "fx3_vision_sensor_3_value",
    label: "FX3 Vision Sensor 3",
    description: "Код цвета/типа на FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z05_CAM",
    direction: "input",
    type: "int",
    ui: ["production"],
  },
  fx3_vision_sensor_4_value: {
    tagName: "fx3_vision_sensor_4_value",
    label: "FX3 Vision Sensor 4",
    description: "Код цвета/типа на FX3",
    zoneId: "Z04",
    equipmentId: "EQ_Z05_CAM",
    direction: "input",
    type: "int",
    ui: ["production"],
  },
  pivot_arm_sorter_11_turn: {
    tagName: "pivot_arm_sorter_11_turn",
    label: "Sorter 11 Turn",
    description: "Поворот сортировщика 11",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  pivot_arm_sorter_22_turn: {
    tagName: "pivot_arm_sorter_22_turn",
    label: "Sorter 22 Turn",
    description: "Поворот сортировщика 22",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  pivot_arm_sorter_11_belt: {
    tagName: "pivot_arm_sorter_11_belt",
    label: "Sorter 11 Belt",
    description: "Лента сортировщика 11",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  pivot_arm_sorter_22_belt: {
    tagName: "pivot_arm_sorter_22_belt",
    label: "Sorter 22 Belt",
    description: "Лента сортировщика 22",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_SORT",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  pop_up_wheel_sorter_1_plus: {
    tagName: "pop_up_wheel_sorter_1_plus",
    label: "Pop Up Sorter",
    description: "Сортировщик активен",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  pop_up_wheel_sorter_1_left: {
    tagName: "pop_up_wheel_sorter_1_left",
    label: "Sorter Left",
    description: "Маршрут в левую ячейку склада",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  pop_up_wheel_sorter_1_right: {
    tagName: "pop_up_wheel_sorter_1_right",
    label: "Sorter Right",
    description: "Маршрут в правую ячейку склада",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_pivot_arm_sorter_4_turn: {
    tagName: "fx3_pivot_arm_sorter_4_turn",
    label: "FX3 Sorter 4 Turn",
    description: "Маршрут серой детали",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_pivot_arm_sorter_4_belt: {
    tagName: "fx3_pivot_arm_sorter_4_belt",
    label: "FX3 Sorter 4 Belt",
    description: "Лента маршрута серой детали",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_pivot_arm_sorter_5_turn: {
    tagName: "fx3_pivot_arm_sorter_5_turn",
    label: "FX3 Sorter 5 Turn",
    description: "Дополнительный маршрут сортировки",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx3_pivot_arm_sorter_5_turn_plus: {
    tagName: "fx3_pivot_arm_sorter_5_turn_plus",
    label: "FX3 Sorter 5 Turn +",
    description: "Дополнительный маршрут сортировки",
    zoneId: "Z06",
    equipmentId: "EQ_Z06_CONV",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx5_dis1: {
    tagName: "fx5_dis1",
    label: "FX5 DIS1",
    description: "Дискретный датчик зоны Pick & Place",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "bool",
    ui: ["production", "diagnostics", "detail-trend"],
  },
  fx5_dis2: {
    tagName: "fx5_dis2",
    label: "FX5 DIS2",
    description: "Датчик промежуточной позиции FX5",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  fx5_dis3: {
    tagName: "fx5_dis3",
    label: "FX5 DIS3",
    description: "Датчик позиции склада FX5",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  fx5_box_detected: {
    tagName: "fx5_box_detected",
    label: "FX5 Box Detected",
    description: "Коробка обнаружена на Pick & Place",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "bool",
    ui: ["production"],
  },
  fx5_conv1: {
    tagName: "fx5_conv1",
    label: "FX5 CONV1",
    description: "Конвейер FX5",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx5_curved_roller_conveyor_1_cw: {
    tagName: "fx5_curved_roller_conveyor_1_cw",
    label: "FX5 Curved Roller",
    description: "Поворотный роликовый конвейер FX5",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx5_roller_conveyor_2m_1: {
    tagName: "fx5_roller_conveyor_2m_1",
    label: "FX5 Roller 2m",
    description: "Роликовый конвейер FX5 2м",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx5_roller_conveyor_4m_1: {
    tagName: "fx5_roller_conveyor_4m_1",
    label: "FX5 Roller 4m",
    description: "Роликовый конвейер FX5 4м",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx5_roller_conveyor_6m_1: {
    tagName: "fx5_roller_conveyor_6m_1",
    label: "FX5 Roller 6m",
    description: "Роликовый конвейер FX5 6м",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
  fx5_pick_place_x_position: {
    tagName: "fx5_pick_place_x_position",
    label: "Pick & Place X Position",
    description: "Фактическая позиция X манипулятора",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "float",
    unit: "V",
    ui: ["production", "diagnostics", "detail-trend"],
  },
  fx5_pick_place_y_position: {
    tagName: "fx5_pick_place_y_position",
    label: "Pick & Place Y Position",
    description: "Фактическая позиция Y манипулятора",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "float",
    unit: "V",
    ui: ["production"],
  },
  fx5_pick_place_z_position: {
    tagName: "fx5_pick_place_z_position",
    label: "Pick & Place Z Position",
    description: "Фактическая позиция Z манипулятора",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "input",
    type: "float",
    unit: "V",
    ui: ["production"],
  },
  fx5_pick_place_x_setpoint: {
    tagName: "fx5_pick_place_x_setpoint",
    label: "Pick & Place X Setpoint",
    description: "Уставка позиции X",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "float",
    unit: "V",
    ui: ["production", "diagnostics", "detail-trend"],
  },
  fx5_pick_place_y_setpoint: {
    tagName: "fx5_pick_place_y_setpoint",
    label: "Pick & Place Y Setpoint",
    description: "Уставка позиции Y",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "float",
    unit: "V",
    ui: ["production"],
  },
  fx5_pick_place_z_setpoint: {
    tagName: "fx5_pick_place_z_setpoint",
    label: "Pick & Place Z Setpoint",
    description: "Уставка позиции Z",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "float",
    unit: "V",
    ui: ["production"],
  },
  fx5_pick_place_grab: {
    tagName: "fx5_pick_place_grab",
    label: "Pick & Place Grab",
    description: "Захват манипулятора",
    zoneId: "Z04",
    equipmentId: "EQ_Z04_PP",
    direction: "output",
    type: "bool",
    ui: ["production"],
  },
};

const OPERATING_MODE_LABELS: Record<number, string> = {
  0: "NotSupported",
  1: "StopFwUpdate",
  3: "StopSelfInitialization",
  4: "Stop",
  6: "Startup",
  8: "Run",
  9: "RunRedundant",
  10: "Halt",
  13: "Defective",
  15: "NoPower",
};

export interface PlcStatus {
  source: PlcDataSource;
  connected: boolean;
  operatingMode: number | null;
  operatingModeLabel: string;
  lineStatus: LineStatus;
  heartbeatAlive: boolean;
  heartbeatValue: boolean | null;
  lastTs: string | null;
  tagCount: number;
  replayProgress?: number;
}

export interface PlcSnapshot {
  status: PlcStatus;
  tags: Tag[];
}

interface RawReading {
  ts: string;
  tag_name: string;
  tag_address: string | null;
  value_text: string;
  value_type: string | null;
}

let cachedReadings: RawReading[] | null = null;
let cachedTimestamps: string[] | null = null;
let cachedDbMtime = 0;

function resolveDbPath(): string {
  if (process.env.PLC_DB_PATH) return path.resolve(process.env.PLC_DB_PATH);
  return path.resolve(process.cwd(), "..", "back", "plc_data.db");
}

function plcApiBase(): string {
  return (process.env.PLC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

export function parseValue(valueText: string, valueType: string | null): boolean | number | string {
  const t = (valueType ?? "").toLowerCase();
  if (t === "bool" || valueText === "ON" || valueText === "OFF") {
    return valueText === "ON" || valueText === "true" || valueText === "1";
  }
  if (t === "int" || t === "dint") {
    const n = Number.parseInt(valueText, 10);
    return Number.isFinite(n) ? n : valueText;
  }
  if (t === "float" || t === "real" || t === "double") {
    const n = Number.parseFloat(valueText);
    return Number.isFinite(n) ? n : valueText;
  }
  const asNum = Number(valueText);
  if (valueText.trim() !== "" && Number.isFinite(asNum) && !Number.isNaN(asNum)) return asNum;
  return valueText;
}

function toTag(tagName: string, valueText: string, valueType: string | null, ts: string, address?: string | null): Tag | null {
  const meta = PLC_TAG_MAP[tagName];
  if (!meta) return null;
  return {
    id: `PLC_${tagName}`,
    name: tagName,
    path: address || meta.label,
    type: meta.type,
    direction: meta.direction,
    zoneId: meta.zoneId,
    equipmentId: meta.equipmentId,
    unit: meta.unit,
    value: parseValue(valueText, valueType),
    quality: "good",
    timestamp: ts,
    description: meta.description,
  };
}

function loadDbReadings(): RawReading[] {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    cachedReadings = [];
    cachedTimestamps = [];
    cachedDbMtime = 0;
    return cachedReadings;
  }

  try {
    const mtime = fs.statSync(dbPath).mtimeMs;
    if (cachedReadings && cachedDbMtime === mtime) return cachedReadings;
    const sql =
      "SELECT ts, tag_name, tag_address, value_text, value_type FROM readings ORDER BY id ASC;";
    const out = execFileSync("sqlite3", ["-json", dbPath, sql], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    const rows = (JSON.parse(out || "[]") as RawReading[]) ?? [];
    cachedReadings = rows;
    cachedTimestamps = [...new Set(rows.map((r) => r.ts))];
    cachedDbMtime = mtime;
    return cachedReadings;
  } catch {
    cachedReadings = [];
    cachedTimestamps = [];
    return cachedReadings;
  }
}

function replayIndex(): { ts: string; progress: number } | null {
  const stamps = cachedTimestamps ?? [];
  if (!stamps.length) return null;
  // ~1 с на шаг опроса → полный цикл снимка за длину timestamps
  const idx = Math.floor(Date.now() / 1000) % stamps.length;
  return { ts: stamps[idx], progress: idx / Math.max(stamps.length - 1, 1) };
}

function tagsFromDbReplay(): PlcSnapshot | null {
  const rows = loadDbReadings();
  if (!rows.length) return null;

  const cursor = replayIndex();
  if (!cursor) return null;

  const atTs = rows.filter((r) => r.ts === cursor.ts);
  const tags: Tag[] = [];
  for (const row of atTs) {
    const tag = toTag(row.tag_name, row.value_text, row.value_type, row.ts, row.tag_address);
    if (tag) tags.push(tag);
  }
  if (!tags.length) return null;

  return { status: buildStatus("db-replay", tags, cursor.progress), tags };
}

async function tagsFromLiveApi(): Promise<PlcSnapshot | null> {
  const base = plcApiBase();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${base}/api/tags/latest`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;

    const rows = (await res.json()) as Array<{
      server_id?: string;
      tag_name: string;
      tag_address?: string;
      value_text: string;
      value_type?: string;
      ts: string;
    }>;

    const tags: Tag[] = [];
    for (const row of rows) {
      const tag = toTag(row.tag_name, row.value_text, row.value_type ?? null, row.ts, row.tag_address);
      if (tag) tags.push(tag);
    }
    if (!tags.length) return null;
    return { status: buildStatus("live-api", tags), tags };
  } catch {
    return null;
  }
}

function buildStatus(source: PlcDataSource, tags: Tag[], replayProgress?: number): PlcStatus {
  const byName = new Map(tags.map((t) => [t.name, t]));
  const modeTag = byName.get("plc_operating_mode");
  const clockTag = byName.get("clock_0_5hz");
  const mode = typeof modeTag?.value === "number" ? modeTag.value : Number(modeTag?.value);
  const modeNum = Number.isFinite(mode) ? mode : null;
  const heartbeatValue = typeof clockTag?.value === "boolean" ? clockTag.value : null;

  const lastTs = tags.reduce<string | null>((acc, t) => {
    if (!acc || t.timestamp > acc) return t.timestamp;
    return acc;
  }, null);

  // Для db-replay считаем связь «живой», т.к. идёт воспроизведение снимка
  const connected = source === "live-api" || source === "db-replay";
  const heartbeatAlive =
    source === "db-replay" ? true : heartbeatValue !== null || source === "live-api";

  let lineStatus: LineStatus = "idle";
  if (modeNum === 8 || modeNum === 9) lineStatus = "running";
  else if (modeNum === 13) lineStatus = "alarm";
  else if (modeNum === 4 || modeNum === 10 || modeNum === 15) lineStatus = "idle";
  else if (modeNum != null) lineStatus = "manual";

  return {
    source,
    connected,
    operatingMode: modeNum,
    operatingModeLabel: modeNum != null ? OPERATING_MODE_LABELS[modeNum] ?? `Mode ${modeNum}` : "—",
    lineStatus,
    heartbeatAlive,
    heartbeatValue,
    lastTs,
    tagCount: tags.length,
    replayProgress,
  };
}

export async function getPlcSnapshot(): Promise<PlcSnapshot | null> {
  const live = await tagsFromLiveApi();
  if (live) return live;
  return tagsFromDbReplay();
}

export async function getPlcTags(filters?: {
  zone?: string | null;
  type?: string | null;
  direction?: string | null;
}): Promise<Tag[]> {
  const snap = await getPlcSnapshot();
  if (!snap) return [];
  let tags = snap.tags;
  if (filters?.zone) tags = tags.filter((t) => t.zoneId === filters.zone);
  if (filters?.type) tags = tags.filter((t) => t.type === filters.type);
  if (filters?.direction) tags = tags.filter((t) => t.direction === filters.direction);
  return tags;
}

export async function getPlcStatus(): Promise<PlcStatus> {
  const snap = await getPlcSnapshot();
  if (!snap) {
    return {
      source: "unavailable",
      connected: false,
      operatingMode: null,
      operatingModeLabel: "—",
      lineStatus: "idle",
      heartbeatAlive: false,
      heartbeatValue: null,
      lastTs: null,
      tagCount: 0,
    };
  }
  return snap.status;
}

export function getPlcTagsForEquipment(equipmentId: string, all: Tag[]): Tag[] {
  return all.filter((t) => t.equipmentId === equipmentId);
}

/** История тега из БД (для графиков detail / replay) */
export function getPlcHistory(tagName: string, limit = 100): TrendPoint[] {
  const rows = loadDbReadings().filter((r) => r.tag_name === tagName);
  if (!rows.length) return [];

  const cursor = replayIndex();
  let slice = rows;
  if (cursor) {
    let endIdx = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].ts === cursor.ts) {
        endIdx = i;
        break;
      }
    }
    const end = endIdx >= 0 ? endIdx + 1 : rows.length;
    slice = rows.slice(Math.max(0, end - limit), end);
  } else {
    slice = rows.slice(-limit);
  }

  return slice.map((r) => ({
    timestamp: r.ts,
    value: Number(parseValue(r.value_text, r.value_type)) || 0,
  }));
}

export function operatingModeLabel(value: number): string {
  return OPERATING_MODE_LABELS[value] ?? `Mode ${value}`;
}

export interface ColorCounts {
  blue: number;
  green: number;
  metal: number;
}

export interface ConveyorSegmentState {
  id: string;
  label: string;
  active: boolean;
  sensorActive: boolean;
}

export interface ConveyorState {
  segmentIndex: number;
  progress: number;
  moving: boolean;
  color: ProductColor | null;
  segments: ConveyorSegmentState[];
}

const CONVEYOR_PIPELINE: Array<{
  id: string;
  label: string;
  beltTags: string[];
  sensorTags: string[];
  numericSensors?: string[];
}> = [
  { id: "emit", label: "Выдача", beltTags: ["emitter_1_emit"], sensorTags: [] },
  { id: "z01", label: "Вход", beltTags: ["belt_conveyor_1"], sensorTags: ["diffuse_sensor_1"] },
  {
    id: "z02",
    label: "Линия",
    beltTags: ["belt_conveyor_2", "belt_conveyor_3", "belt_conveyor_4"],
    sensorTags: ["diffuse_sensor_3"],
  },
  {
    id: "z03",
    label: "Буфер",
    beltTags: ["belt_conveyor_7", "belt_conveyor_8"],
    sensorTags: ["diffuse_sensor_9"],
  },
  {
    id: "vision",
    label: "Камера",
    beltTags: [],
    sensorTags: [],
    numericSensors: ["vision_sensor_1_value"],
  },
  {
    id: "sort",
    label: "Сортировка",
    beltTags: ["fx3_belt_conveyor_3", "pivot_arm_sorter_11_belt", "pop_up_wheel_sorter_1_plus"],
    sensorTags: ["diffuse_sensor_10", "fx3_diffuse_sensor_2"],
  },
  {
    id: "storage",
    label: "Склад",
    beltTags: ["pop_up_wheel_sorter_1_left", "pop_up_wheel_sorter_1_right", "fx3_pivot_arm_sorter_4_belt"],
    sensorTags: ["fx3_diffuse_sensor_8"],
  },
];

function buildConveyorState(tags: Map<string, Tag>, color: ProductColor | null): ConveyorState {
  const segments: ConveyorSegmentState[] = CONVEYOR_PIPELINE.map((segment) => ({
    id: segment.id,
    label: segment.label,
    active: segment.beltTags.some((tag) => boolOf(tags, tag)),
    sensorActive:
      segment.sensorTags.some((tag) => boolOf(tags, tag)) ||
      (segment.numericSensors?.some((tag) => numberOf(tags, tag) > 0) ?? false),
  }));

  let segmentIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].active || segments[i].sensorActive) segmentIndex = i;
  }

  const current = segments[segmentIndex];
  const localProgress = current.sensorActive ? 0.85 : current.active ? 0.55 : 0.2;
  const progress = Math.min(1, (segmentIndex + localProgress) / segments.length);

  return {
    segmentIndex,
    progress,
    moving: segments.some((segment) => segment.active),
    color,
    segments,
  };
}

export interface ProductionDynamics {
  cumulative: {
    blue: TrendPoint[];
    green: TrendPoint[];
    metal: TrendPoint[];
  };
  throughput: TrendPoint[];
  cycleTime: TrendPoint[];
}

export interface ProductionPayload {
  status: PlcStatus;
  produced: ColorCounts & { total: number };
  ratePerMin: number;
  warehouse: ColorCounts;
  dynamics: ProductionDynamics;
  conveyor: ConveyorState;
  arm: {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    grab: boolean;
    boxDetected: boolean;
    dis1: boolean;
    dis2: boolean;
    dis3: boolean;
    error: number;
  };
  lastVision: number | null;
  lastColor: ProductColor | null;
  recentColors: ProductColor[];
  trends: {
    sensor: TrendPoint[];
    belt: TrendPoint[];
    vision: TrendPoint[];
  };
}

export function visionToColor(value: number | null | undefined): ProductColor | null {
  if (!value) return null;
  if (value >= 1 && value <= 3) return "blue";
  if (value >= 4 && value <= 6) return "green";
  if (value >= 7 && value <= 9) return "metal";
  return null;
}

function valueOf(tags: Map<string, Tag>, name: string): boolean | number | string | null {
  return tags.get(name)?.value ?? null;
}

function boolOf(tags: Map<string, Tag>, name: string): boolean {
  return valueOf(tags, name) === true;
}

function numberOf(tags: Map<string, Tag>, name: string): number {
  const value = valueOf(tags, name);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function historyRowsUntilCursor(): RawReading[] {
  const rows = loadDbReadings();
  const cursor = replayIndex();
  if (!cursor) return rows;

  let endIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].ts === cursor.ts) {
      endIdx = i;
      break;
    }
  }
  return rows.slice(0, endIdx >= 0 ? endIdx + 1 : rows.length);
}

function countVisionEvents(rows: RawReading[]): {
  produced: ColorCounts & { total: number };
  recentColors: ProductColor[];
  lastVision: number | null;
} {
  const counts: ColorCounts & { total: number } = { total: 0, blue: 0, green: 0, metal: 0 };
  const recentColors: ProductColor[] = [];
  let prev = 0;
  let lastVision: number | null = null;

  for (const row of rows) {
    if (row.tag_name !== "vision_sensor_1_value") continue;
    const value = Number(parseValue(row.value_text, row.value_type));
    if (!Number.isFinite(value)) continue;
    if (value > 0) lastVision = value;
    if (prev === 0 && value > 0) {
      const color = visionToColor(value);
      if (color) {
        counts[color] += 1;
        counts.total += 1;
        recentColors.push(color);
      }
    }
    prev = value;
  }

  return { produced: counts, recentColors: recentColors.slice(-12), lastVision };
}

function countWarehouseEvents(rows: RawReading[]): ColorCounts {
  const counts: ColorCounts = { blue: 0, green: 0, metal: 0 };
  const previous: Partial<Record<keyof ColorCounts, boolean>> = {};

  const routes: Array<[keyof ColorCounts, string]> = [
    ["blue", "pop_up_wheel_sorter_1_left"],
    ["green", "pop_up_wheel_sorter_1_right"],
    ["metal", "fx3_pivot_arm_sorter_4_belt"],
  ];

  for (const row of rows) {
    for (const [color, tag] of routes) {
      if (row.tag_name !== tag) continue;
      const active = parseValue(row.value_text, row.value_type) === true;
      if (!previous[color] && active) counts[color] += 1;
      previous[color] = active;
    }
  }
  return counts;
}

function collectVisionEvents(rows: RawReading[]): Array<{ ts: number; tsText: string; color: ProductColor }> {
  const events: Array<{ ts: number; tsText: string; color: ProductColor }> = [];
  let prev = 0;

  for (const row of rows) {
    if (row.tag_name !== "vision_sensor_1_value") continue;
    const value = Number(parseValue(row.value_text, row.value_type));
    if (!Number.isFinite(value)) continue;
    if (prev === 0 && value > 0) {
      const color = visionToColor(value);
      if (color) {
        const ts = new Date(row.ts).getTime();
        if (Number.isFinite(ts)) events.push({ ts, tsText: row.ts, color });
      }
    }
    prev = value;
  }
  return events;
}

function buildProductionDynamics(rows: RawReading[]): ProductionDynamics {
  const events = collectVisionEvents(rows);
  const stamps = [...new Set(rows.map((row) => row.ts))];
  if (!stamps.length) {
    return {
      cumulative: { blue: [], green: [], metal: [] },
      throughput: [],
      cycleTime: [],
    };
  }

  const maxPoints = 90;
  const step = Math.max(1, Math.ceil(stamps.length / maxPoints));
  const sampled = stamps.filter((_, i) => i % step === 0 || i === stamps.length - 1);

  const blue: TrendPoint[] = [];
  const green: TrendPoint[] = [];
  const metal: TrendPoint[] = [];
  const throughput: TrendPoint[] = [];
  const cycleTime: TrendPoint[] = [];

  let ei = 0;
  const counts: ColorCounts = { blue: 0, green: 0, metal: 0 };
  let lastCycle = 0;

  for (const tsText of sampled) {
    const t = new Date(tsText).getTime();
    while (ei < events.length && events[ei].ts <= t) {
      if (ei > 0) {
        const dt = (events[ei].ts - events[ei - 1].ts) / 1000;
        if (dt > 0 && dt < 120) lastCycle = Math.round(dt * 10) / 10;
      }
      counts[events[ei].color] += 1;
      ei += 1;
    }

    blue.push({ timestamp: tsText, value: counts.blue });
    green.push({ timestamp: tsText, value: counts.green });
    metal.push({ timestamp: tsText, value: counts.metal });

    const windowStart = t - 60_000;
    let rate = 0;
    for (const event of events) {
      if (event.ts > t) break;
      if (event.ts >= windowStart) rate += 1;
    }
    throughput.push({ timestamp: tsText, value: rate });
    cycleTime.push({ timestamp: tsText, value: lastCycle });
  }

  return {
    cumulative: { blue, green, metal },
    throughput,
    cycleTime,
  };
}

function ratePerMinute(rows: RawReading[]): number {
  if (!rows.length) return 0;
  const cursorTs = rows[rows.length - 1]?.ts;
  if (!cursorTs) return 0;
  const end = new Date(cursorTs).getTime();
  const start = end - 60_000;
  const recent = rows.filter((row) => {
    if (row.tag_name !== "vision_sensor_1_value") return false;
    const ts = new Date(row.ts).getTime();
    return ts >= start && ts <= end;
  });
  return countVisionEvents(recent).produced.total;
}

function getTrend(tagName: string, limit = 90): TrendPoint[] {
  const cursorRows = historyRowsUntilCursor().filter((row) => row.tag_name === tagName);
  return cursorRows.slice(-limit).map((row) => ({
    timestamp: row.ts,
    value: Number(parseValue(row.value_text, row.value_type)) || 0,
  }));
}

export async function getProductionPayload(): Promise<ProductionPayload> {
  const snap = await getPlcSnapshot();
  const status = snap?.status ?? (await getPlcStatus());
  const tags = new Map((snap?.tags ?? []).map((tag) => [tag.name, tag]));
  const rows = historyRowsUntilCursor();
  const { produced, recentColors, lastVision } = countVisionEvents(rows);
  const warehouse = countWarehouseEvents(rows);
  const lastColor = visionToColor(lastVision);

  const x = numberOf(tags, "fx5_pick_place_x_position");
  const y = numberOf(tags, "fx5_pick_place_y_position");
  const z = numberOf(tags, "fx5_pick_place_z_position");
  const sx = numberOf(tags, "fx5_pick_place_x_setpoint");
  const sy = numberOf(tags, "fx5_pick_place_y_setpoint");
  const sz = numberOf(tags, "fx5_pick_place_z_setpoint");
  const error = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2);

  return {
    status,
    produced,
    ratePerMin: ratePerMinute(rows),
    warehouse,
    dynamics: buildProductionDynamics(rows),
    conveyor: buildConveyorState(tags, lastColor),
    arm: {
      x,
      y,
      z,
      sx,
      sy,
      sz,
      grab: boolOf(tags, "fx5_pick_place_grab"),
      boxDetected: boolOf(tags, "fx5_box_detected"),
      dis1: boolOf(tags, "fx5_dis1"),
      dis2: boolOf(tags, "fx5_dis2"),
      dis3: boolOf(tags, "fx5_dis3"),
      error,
    },
    lastVision,
    lastColor,
    recentColors,
    trends: {
      sensor: getTrend("diffuse_sensor_1"),
      belt: getTrend("belt_conveyor_1"),
      vision: getTrend("vision_sensor_1_value"),
    },
  };
}

export interface ProcessArmPose {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  grab: boolean;
  boxDetected: boolean;
  error: number;
}

export interface ProcessPayload {
  status: PlcStatus;
  pose: ProcessArmPose;
  arm: {
    x: TrendPoint[];
    y: TrendPoint[];
    z: TrendPoint[];
    sx: TrendPoint[];
    sy: TrendPoint[];
    sz: TrendPoint[];
  };
  linePass: {
    diffuse1: TrendPoint[];
    diffuse3: TrendPoint[];
    diffuse9: TrendPoint[];
    vision: TrendPoint[];
    diffuse10: TrendPoint[];
  };
  sorting: {
    left: TrendPoint[];
    right: TrendPoint[];
    metal: TrendPoint[];
  };
  pickCycle: {
    error: TrendPoint[];
    grab: TrendPoint[];
    boxDetected: TrendPoint[];
  };
  analytics: ProcessAnalytics;
}

export interface ProcessPathPoint {
  timestamp: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  error: number;
}

export interface ProcessCycle {
  id: string;
  start: string;
  end: string;
  durationSec: number;
  grabDelaySec: number;
  holdSec: number;
}

export interface ProcessHeatmapPoint {
  sensor: string;
  bucket: string;
  value: number;
}

export interface ProcessPulseCount {
  sensor: string;
  count: number;
}

export interface ProcessCorrelation {
  matched: number;
  boxOnly: number;
  grabOnly: number;
  idle: number;
}

export interface ProcessAnalytics {
  xyPath: ProcessPathPoint[];
  axisError: {
    x: TrendPoint[];
    y: TrendPoint[];
    z: TrendPoint[];
    total: TrendPoint[];
  };
  errorHistogram: Array<{ bucket: string; count: number }>;
  cycles: ProcessCycle[];
  cycleTime: TrendPoint[];
  sensorHeatmap: ProcessHeatmapPoint[];
  pulseCounts: ProcessPulseCount[];
  grabBoxCorrelation: ProcessCorrelation;
  events: ProcessEvent[];
  currentErrorRatio: number;
}

function toBinaryTrend(points: TrendPoint[]): TrendPoint[] {
  return points.map((point) => ({
    timestamp: point.timestamp,
    value: point.value > 0 ? 1 : 0,
  }));
}

/** Сдвиг «дорожек» для цифровых импульсов — волна читается слева направо */
function laneTrend(points: TrendPoint[], lane: number, gap = 1.35): TrendPoint[] {
  return points.map((point) => ({
    timestamp: point.timestamp,
    value: lane * gap + (point.value > 0 ? 1 : 0),
  }));
}

function getArmErrorTrend(limit = 120): TrendPoint[] {
  const x = getTrend("fx5_pick_place_x_position", limit);
  const y = getTrend("fx5_pick_place_y_position", limit);
  const z = getTrend("fx5_pick_place_z_position", limit);
  const sx = getTrend("fx5_pick_place_x_setpoint", limit);
  const sy = getTrend("fx5_pick_place_y_setpoint", limit);
  const sz = getTrend("fx5_pick_place_z_setpoint", limit);
  const n = Math.min(x.length, y.length, z.length, sx.length, sy.length, sz.length);
  const error: TrendPoint[] = [];
  for (let i = 0; i < n; i++) {
    const dx = x[i].value - sx[i].value;
    const dy = y[i].value - sy[i].value;
    const dz = z[i].value - sz[i].value;
    error.push({
      timestamp: x[i].timestamp,
      value: Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 1000) / 1000,
    });
  }
  return error;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function boolValue(point: TrendPoint | undefined): boolean {
  return (point?.value ?? 0) > 0;
}

function countRisingEdges(points: TrendPoint[]): number {
  let count = 0;
  let prev = 0;
  for (const point of points) {
    const value = point.value > 0 ? 1 : 0;
    if (prev === 0 && value === 1) count += 1;
    prev = value;
  }
  return count;
}

function buildAxisError(
  x: TrendPoint[],
  y: TrendPoint[],
  z: TrendPoint[],
  sx: TrendPoint[],
  sy: TrendPoint[],
  sz: TrendPoint[],
) {
  const n = Math.min(x.length, y.length, z.length, sx.length, sy.length, sz.length);
  const ex: TrendPoint[] = [];
  const ey: TrendPoint[] = [];
  const ez: TrendPoint[] = [];
  const total: TrendPoint[] = [];
  const path: ProcessPathPoint[] = [];

  for (let i = 0; i < n; i++) {
    const dx = x[i].value - sx[i].value;
    const dy = y[i].value - sy[i].value;
    const dz = z[i].value - sz[i].value;
    const error = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const timestamp = x[i].timestamp;
    ex.push({ timestamp, value: round3(dx) });
    ey.push({ timestamp, value: round3(dy) });
    ez.push({ timestamp, value: round3(dz) });
    total.push({ timestamp, value: round3(error) });
    path.push({
      timestamp,
      x: x[i].value,
      y: y[i].value,
      z: z[i].value,
      sx: sx[i].value,
      sy: sy[i].value,
      sz: sz[i].value,
      error: round3(error),
    });
  }

  return { path, axisError: { x: ex, y: ey, z: ez, total } };
}

function buildErrorHistogram(points: TrendPoint[]): Array<{ bucket: string; count: number }> {
  const buckets = [
    { min: 0, max: 0.25, label: "0-0.25" },
    { min: 0.25, max: 0.5, label: "0.25-0.5" },
    { min: 0.5, max: 1, label: "0.5-1" },
    { min: 1, max: 2, label: "1-2" },
    { min: 2, max: Number.POSITIVE_INFINITY, label: "2+" },
  ];
  return buckets.map((bucket) => ({
    bucket: bucket.label,
    count: points.filter((point) => point.value >= bucket.min && point.value < bucket.max).length,
  }));
}

function buildCycles(box: TrendPoint[], grab: TrendPoint[]): { cycles: ProcessCycle[]; cycleTime: TrendPoint[]; events: ProcessEvent[] } {
  const n = Math.min(box.length, grab.length);
  const cycles: ProcessCycle[] = [];
  const cycleTime: TrendPoint[] = [];
  const events: ProcessEvent[] = [];
  let activeStart: TrendPoint | null = null;
  let grabStart: TrendPoint | null = null;
  let prevBox = 0;
  let prevGrab = 0;

  for (let i = 0; i < n; i++) {
    const boxOn = box[i].value > 0 ? 1 : 0;
    const grabOn = grab[i].value > 0 ? 1 : 0;

    if (prevBox === 0 && boxOn === 1) {
      activeStart = box[i];
      events.push({
        id: `box-${i}`,
        type: "BOX",
        message: "Box detected on FX5 pick cycle",
        zoneId: "Z05",
        equipmentId: "EQ_Z05_FX5",
        timestamp: box[i].timestamp,
      });
    }
    if (prevGrab === 0 && grabOn === 1) {
      grabStart = grab[i];
      events.push({
        id: `grab-${i}`,
        type: "GRAB",
        message: "FX5 grab activated",
        zoneId: "Z05",
        equipmentId: "EQ_Z05_FX5",
        timestamp: grab[i].timestamp,
      });
    }
    if (prevGrab === 1 && grabOn === 0 && activeStart && grabStart) {
      const startMs = new Date(activeStart.timestamp).getTime();
      const grabMs = new Date(grabStart.timestamp).getTime();
      const endMs = new Date(grab[i].timestamp).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(grabMs) && Number.isFinite(endMs) && endMs > startMs) {
        const durationSec = round3((endMs - startMs) / 1000);
        const cycle: ProcessCycle = {
          id: `cycle-${cycles.length + 1}`,
          start: activeStart.timestamp,
          end: grab[i].timestamp,
          durationSec,
          grabDelaySec: round3(Math.max(0, (grabMs - startMs) / 1000)),
          holdSec: round3(Math.max(0, (endMs - grabMs) / 1000)),
        };
        cycles.push(cycle);
        cycleTime.push({ timestamp: cycle.end, value: durationSec });
        events.push({
          id: `release-${i}`,
          type: "RELEASE",
          message: `FX5 cycle completed in ${durationSec.toFixed(1)}s`,
          zoneId: "Z05",
          equipmentId: "EQ_Z05_FX5",
          timestamp: grab[i].timestamp,
        });
      }
      activeStart = null;
      grabStart = null;
    }

    prevBox = boxOn;
    prevGrab = grabOn;
  }

  return { cycles: cycles.slice(-16), cycleTime: cycleTime.slice(-60), events: events.slice(-24) };
}

function buildSensorHeatmap(sensors: Array<{ name: string; data: TrendPoint[] }>): ProcessHeatmapPoint[] {
  const bucketCount = 12;
  return sensors.flatMap((sensor) => {
    if (!sensor.data.length) return [];
    const step = Math.max(1, Math.ceil(sensor.data.length / bucketCount));
    const points: ProcessHeatmapPoint[] = [];
    for (let start = 0; start < sensor.data.length; start += step) {
      const bucket = sensor.data.slice(start, start + step);
      const value = bucket.reduce((sum, point) => sum + (point.value > 0 ? 1 : 0), 0);
      points.push({
        sensor: sensor.name,
        bucket: bucket[0]?.timestamp ?? String(points.length + 1),
        value,
      });
    }
    return points;
  });
}

function buildCorrelation(box: TrendPoint[], grab: TrendPoint[]): ProcessCorrelation {
  const n = Math.min(box.length, grab.length);
  const result: ProcessCorrelation = { matched: 0, boxOnly: 0, grabOnly: 0, idle: 0 };
  for (let i = 0; i < n; i++) {
    const b = boolValue(box[i]);
    const g = boolValue(grab[i]);
    if (b && g) result.matched += 1;
    else if (b) result.boxOnly += 1;
    else if (g) result.grabOnly += 1;
    else result.idle += 1;
  }
  return result;
}

export async function getProcessPayload(): Promise<ProcessPayload> {
  const snap = await getPlcSnapshot();
  const status = snap?.status ?? (await getPlcStatus());
  const tags = new Map((snap?.tags ?? []).map((tag) => [tag.name, tag]));
  const limit = 120;

  const x = numberOf(tags, "fx5_pick_place_x_position");
  const y = numberOf(tags, "fx5_pick_place_y_position");
  const z = numberOf(tags, "fx5_pick_place_z_position");
  const sx = numberOf(tags, "fx5_pick_place_x_setpoint");
  const sy = numberOf(tags, "fx5_pick_place_y_setpoint");
  const sz = numberOf(tags, "fx5_pick_place_z_setpoint");
  const error = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2);

  const diffuse1 = toBinaryTrend(getTrend("diffuse_sensor_1", limit));
  const diffuse3 = toBinaryTrend(getTrend("diffuse_sensor_3", limit));
  const diffuse9 = toBinaryTrend(getTrend("diffuse_sensor_9", limit));
  const vision = toBinaryTrend(getTrend("vision_sensor_1_value", limit));
  const diffuse10 = toBinaryTrend(getTrend("diffuse_sensor_10", limit));

  const left = toBinaryTrend(getTrend("pop_up_wheel_sorter_1_left", limit));
  const right = toBinaryTrend(getTrend("pop_up_wheel_sorter_1_right", limit));
  const metal = toBinaryTrend(getTrend("fx3_pivot_arm_sorter_4_belt", limit));

  const grab = toBinaryTrend(getTrend("fx5_pick_place_grab", limit));
  const boxDetected = toBinaryTrend(getTrend("fx5_box_detected", limit));
  const armX = getTrend("fx5_pick_place_x_position", limit);
  const armY = getTrend("fx5_pick_place_y_position", limit);
  const armZ = getTrend("fx5_pick_place_z_position", limit);
  const armSx = getTrend("fx5_pick_place_x_setpoint", limit);
  const armSy = getTrend("fx5_pick_place_y_setpoint", limit);
  const armSz = getTrend("fx5_pick_place_z_setpoint", limit);
  const { path, axisError } = buildAxisError(armX, armY, armZ, armSx, armSy, armSz);
  const cycleAnalytics = buildCycles(boxDetected, grab);
  const heatmapSensors = [
    { name: "DS1", data: diffuse1 },
    { name: "DS3", data: diffuse3 },
    { name: "DS9", data: diffuse9 },
    { name: "Vision", data: vision },
    { name: "DS10", data: diffuse10 },
    { name: "Left", data: left },
    { name: "Right", data: right },
    { name: "Metal", data: metal },
    { name: "Box", data: boxDetected },
    { name: "Grab", data: grab },
  ];

  return {
    status,
    pose: {
      x,
      y,
      z,
      sx,
      sy,
      sz,
      grab: boolOf(tags, "fx5_pick_place_grab"),
      boxDetected: boolOf(tags, "fx5_box_detected"),
      error,
    },
    arm: {
      x: armX,
      y: armY,
      z: armZ,
      sx: armSx,
      sy: armSy,
      sz: armSz,
    },
    linePass: {
      diffuse1: laneTrend(diffuse1, 4),
      diffuse3: laneTrend(diffuse3, 3),
      diffuse9: laneTrend(diffuse9, 2),
      vision: laneTrend(vision, 1),
      diffuse10: laneTrend(diffuse10, 0),
    },
    sorting: {
      left: laneTrend(left, 2),
      right: laneTrend(right, 1),
      metal: laneTrend(metal, 0),
    },
    pickCycle: {
      error: axisError.total.length ? axisError.total : getArmErrorTrend(limit),
      grab: laneTrend(grab, 8),
      boxDetected: laneTrend(boxDetected, 7),
    },
    analytics: {
      xyPath: path,
      axisError,
      errorHistogram: buildErrorHistogram(axisError.total),
      cycles: cycleAnalytics.cycles,
      cycleTime: cycleAnalytics.cycleTime,
      sensorHeatmap: buildSensorHeatmap(heatmapSensors),
      pulseCounts: heatmapSensors.map((sensor) => ({ sensor: sensor.name, count: countRisingEdges(sensor.data) })),
      grabBoxCorrelation: buildCorrelation(boxDetected, grab),
      events: cycleAnalytics.events,
      currentErrorRatio: Math.min(1, error / 5),
    },
  };
}
