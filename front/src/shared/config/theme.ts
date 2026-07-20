export const colors = {
  bg: "#0D1117",
  panel: "#161B22",
  panelHover: "#1C2128",
  border: "#30363D",
  borderSubtle: "#21262D",
  text: "#E6EDF3",
  textMuted: "#8B949E",
  accent: "#00A7E1",
  accentMuted: "#0072CE",
  success: "#10B981",
  warning: "#F59E0B",
  alarm: "#EF4444",
  idle: "#6B7280",
  good: "#10B981",
  reject: "#EF4444",
} as const;

export const chartColors = {
  primary: colors.accent,
  secondary: "#6366F1",
  tertiary: "#A78BFA",
  throughput: colors.accent,
  cycleTime: "#F59E0B",
  rejectRate: "#EF4444",
  good: "#10B981",
  zones: [colors.accent, "#6366F1", "#A78BFA", "#F59E0B", "#10B981", "#EC4899"],
} as const;

export const statusColors: Record<string, string> = {
  running: colors.success,
  idle: colors.idle,
  starved: colors.warning,
  blocked: colors.alarm,
  alarm: colors.alarm,
  manual: "#6366F1",
  fault: colors.alarm,
};

export const typography = {
  kpi: "text-5xl md:text-6xl font-bold tracking-tight",
  kpiSm: "text-3xl md:text-4xl font-bold tracking-tight",
  heading: "text-2xl font-semibold",
  subheading: "text-lg font-medium",
  label: "text-sm text-[#8B949E] uppercase tracking-wider",
  body: "text-base",
} as const;
