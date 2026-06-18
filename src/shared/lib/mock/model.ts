import type { Equipment, Tag } from "@/entities/types";

export const EQUIPMENT: Equipment[] = [
  { id: "EQ_Z01_CONV", name: "Входной конвейер", type: "конвейер", zoneId: "Z01", status: "running", cycleTimeSec: 1.8, throughputPerMin: 33 },
  { id: "EQ_Z01_PE", name: "Датчик входа", type: "датчик", zoneId: "Z01", status: "running", cycleTimeSec: 0, throughputPerMin: 33 },
  { id: "EQ_Z01_FEED", name: "Толкатель подачи", type: "привод", zoneId: "Z01", status: "running", cycleTimeSec: 2.1, throughputPerMin: 33 },
  { id: "EQ_Z02_CONV", name: "Главный конвейер", type: "конвейер", zoneId: "Z02", status: "running", cycleTimeSec: 1.5, throughputPerMin: 32 },
  { id: "EQ_Z02_MOTOR", name: "Приводной мотор", type: "привод", zoneId: "Z02", status: "running", cycleTimeSec: 0, throughputPerMin: 32 },
  { id: "EQ_Z03_BUFFER", name: "Буфер-накопитель", type: "накопитель", zoneId: "Z03", status: "running", cycleTimeSec: 2.4, throughputPerMin: 28 },
  { id: "EQ_Z03_PUSHER", name: "Буферный толкатель", type: "привод", zoneId: "Z03", status: "running", cycleTimeSec: 2.8, throughputPerMin: 28 },
  { id: "EQ_Z03_PE", name: "Датчик заполнения", type: "датчик", zoneId: "Z03", status: "running", cycleTimeSec: 0, throughputPerMin: 28 },
  { id: "EQ_Z04_SORT", name: "Сортировочный затвор", type: "сортировщик", zoneId: "Z04", status: "running", cycleTimeSec: 1.9, throughputPerMin: 30 },
  { id: "EQ_Z04_DIV", name: "Переключатель потока", type: "привод", zoneId: "Z04", status: "running", cycleTimeSec: 1.2, throughputPerMin: 30 },
  { id: "EQ_Z05_CAM", name: "Камера контроля", type: "датчик", zoneId: "Z05", status: "running", cycleTimeSec: 2.0, throughputPerMin: 29 },
  { id: "EQ_Z05_REJECT", name: "Толкатель брака", type: "привод", zoneId: "Z05", status: "running", cycleTimeSec: 1.5, throughputPerMin: 29 },
  { id: "EQ_Z06_CONV", name: "Выходной конвейер", type: "конвейер", zoneId: "Z06", status: "running", cycleTimeSec: 1.4, throughputPerMin: 31 },
  { id: "EQ_Z06_COUNT", name: "Счётчик выхода", type: "датчик", zoneId: "Z06", status: "running", cycleTimeSec: 0, throughputPerMin: 31 },
];

function tag(
  id: string,
  name: string,
  zoneId: string,
  equipmentId: string,
  direction: Tag["direction"],
  type: Tag["type"],
  value: boolean | number | string,
  unit?: string
): Tag {
  return {
    id,
    name,
    path: name,
    type,
    direction,
    zoneId,
    equipmentId,
    unit,
    value,
    quality: "good",
    timestamp: new Date().toISOString(),
  };
}

export const TAGS: Tag[] = [
  tag("T001", "I_Z01_Entry_PE", "Z01", "EQ_Z01_PE", "input", "bool", true),
  tag("T002", "Q_Z01_Conv_Main_Run", "Z01", "EQ_Z01_CONV", "output", "bool", true),
  tag("T003", "Q_Z01_Feed_Extend", "Z01", "EQ_Z01_FEED", "output", "bool", false),
  tag("T004", "I_Z02_Conv_Speed", "Z02", "EQ_Z02_MOTOR", "input", "float", 1.2, "m/s"),
  tag("T005", "Q_Z02_Conv_Run", "Z02", "EQ_Z02_CONV", "output", "bool", true),
  tag("T006", "I_Z02_Motor_Amp", "Z02", "EQ_Z02_MOTOR", "input", "float", 3.4, "A"),
  tag("T007", "I_Z03_Buffer_Full", "Z03", "EQ_Z03_PE", "input", "bool", false),
  tag("T008", "Q_Z03_Pusher_Extend", "Z03", "EQ_Z03_PUSHER", "output", "bool", true),
  tag("T009", "T_Z03_Blockage", "Z03", "EQ_Z03_BUFFER", "internal", "bool", false),
  tag("T010", "I_Z03_Queue_Len", "Z03", "EQ_Z03_BUFFER", "calculated", "int", 12, "cubes"),
  tag("T011", "Q_Z04_Gate_Open", "Z04", "EQ_Z04_SORT", "output", "bool", true),
  tag("T012", "I_Z04_Sort_Pos", "Z04", "EQ_Z04_DIV", "input", "enum", "A"),
  tag("T013", "I_Z05_Quality_OK", "Z05", "EQ_Z05_CAM", "input", "bool", true),
  tag("T014", "Q_Z05_Reject_Push", "Z05", "EQ_Z05_REJECT", "output", "bool", false),
  tag("T015", "C_GoodCubes_Total", "Z06", "EQ_Z06_COUNT", "calculated", "int", 1798),
  tag("T016", "C_RejectCubes_Total", "Z06", "EQ_Z06_COUNT", "calculated", "int", 44),
  tag("T017", "M_Line_AutoMode", "Z01", "EQ_Z01_CONV", "internal", "bool", true),
  tag("T018", "KPI_OEE_Current", "Z01", "EQ_Z01_CONV", "calculated", "float", 0.87),
];

export function getEquipmentById(id: string): Equipment | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

export function getEquipmentByZone(zoneId: string): Equipment[] {
  return EQUIPMENT.filter((e) => e.zoneId === zoneId);
}

export function getTagsByEquipment(equipmentId: string): Tag[] {
  return TAGS.filter((t) => t.equipmentId === equipmentId);
}

export function getAllTags(): Tag[] {
  return TAGS;
}
