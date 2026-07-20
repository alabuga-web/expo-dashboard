import type { Zone } from "@/entities/types";

export const ZONES: Zone[] = [
  { id: "Z01", name: "Подача", shortName: "Подача", description: "Загрузка кубов и детекция на входе" },
  { id: "Z02", name: "Транспорт", shortName: "Транспорт", description: "Основной конвейерный транспорт" },
  { id: "Z03", name: "Буфер", shortName: "Буфер", description: "Буферная зона накопления" },
  { id: "Z04", name: "Сортировка", shortName: "Сортировка", description: "Сортировка и маршрутизация" },
  { id: "Z05", name: "Контроль", shortName: "Контроль", description: "Контроль качества" },
  { id: "Z06", name: "Выгрузка", shortName: "Выгрузка", description: "Выход и выгрузка продукции" },
];

export function getZone(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}
