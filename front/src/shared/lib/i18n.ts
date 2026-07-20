export type Locale = "en" | "ru";

export const equipmentStatusLabels: Record<string, Record<Locale, string>> = {
  running: { en: "Running", ru: "Работа" },
  idle: { en: "Idle", ru: "Простой" },
  fault: { en: "Fault", ru: "Авария" },
  blocked: { en: "Blocked", ru: "Затор" },
  manual: { en: "Manual", ru: "Ручной" },
  starved: { en: "Starved", ru: "Голодание" },
};

export const tagDirectionLabels: Record<string, Record<Locale, string>> = {
  input: { en: "Input", ru: "Вход" },
  output: { en: "Output", ru: "Выход" },
  internal: { en: "Internal", ru: "Внутренний" },
  calculated: { en: "Calculated", ru: "Расчётный" },
};

export const severityLabels: Record<string, Record<Locale, string>> = {
  alarm: { en: "Alarm", ru: "Авария" },
  warning: { en: "Warning", ru: "Предупреждение" },
  info: { en: "Info", ru: "Инфо" },
};

export const eventTypeLabels: Record<string, Record<Locale, string>> = {
  CUBE_PASS: { en: "Cube pass", ru: "Проход куба" },
  CYCLE_COMPLETE: { en: "Cycle complete", ru: "Цикл завершён" },
  STATE_CHANGE: { en: "State change", ru: "Смена состояния" },
  ALARM: { en: "Alarm", ru: "Тревога" },
  RESET: { en: "Reset", ru: "Сброс" },
};

export const qualityLabels: Record<string, Record<Locale, string>> = {
  good: { en: "Good", ru: "Норма" },
  bad: { en: "Bad", ru: "Плохо" },
  uncertain: { en: "Uncertain", ru: "Неопределено" },
};

export function tr(map: Record<Locale, string>, locale: Locale = "ru"): string {
  return map[locale] ?? map.ru;
}

export function equipmentStatus(status: string, locale: Locale = "ru"): string {
  return equipmentStatusLabels[status]?.[locale] ?? status;
}

export function tagDirection(direction: string, locale: Locale = "ru"): string {
  return tagDirectionLabels[direction]?.[locale] ?? direction;
}

export function severityLabel(severity: string, locale: Locale = "ru"): string {
  return severityLabels[severity]?.[locale] ?? severity;
}

export function eventTypeLabel(type: string, locale: Locale = "ru"): string {
  return eventTypeLabels[type]?.[locale] ?? type;
}

export function qualityLabel(quality: string, locale: Locale = "ru"): string {
  return qualityLabels[quality]?.[locale] ?? quality;
}
