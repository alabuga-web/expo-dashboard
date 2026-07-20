import { cn } from "@/shared/lib/cn";
import { statusColors } from "@/shared/config/theme";
import { lineStatusLabel } from "@/shared/lib/formatters";
import type { LineStatus } from "@/entities/types";
import type { Locale } from "@/shared/lib/i18n";

interface StatusBannerProps {
  status: LineStatus;
  locale?: Locale;
  explanation?: string;
  compact?: boolean;
}

export function StatusBanner({ status, locale = "ru", explanation, compact = false }: StatusBannerProps) {
  const color = statusColors[status] ?? statusColors.idle;
  const isCritical = status === "alarm" || status === "blocked";

  if (compact) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-lg border px-4 py-2",
          isCritical ? "border-[#EF4444]/40 bg-[#EF4444]/10" : "border-[#30363D] bg-[#161B22]"
        )}
      >
        <div
          className={cn("h-3 w-3 shrink-0 rounded-full", isCritical && "animate-pulse-subtle")}
          style={{ backgroundColor: color }}
        />
        <span className="text-[10px] uppercase tracking-wider text-[#8B949E]">
          {locale === "ru" ? "Статус" : "Status"}
        </span>
        <span className="text-xl font-bold" style={{ color }}>
          {lineStatusLabel(status, locale)}
        </span>
        {explanation && (
          <p className="min-w-0 flex-1 truncate text-xs text-[#8B949E]">{explanation}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border px-6 py-4",
        isCritical ? "border-[#EF4444]/40 bg-[#EF4444]/10" : "border-[#30363D] bg-[#161B22]"
      )}
    >
      <div
        className={cn("h-4 w-4 rounded-full", isCritical && "animate-pulse-subtle")}
        style={{ backgroundColor: color }}
      />
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <span className="text-sm uppercase tracking-wider text-[#8B949E]">
            {locale === "ru" ? "Статус линии" : "Line Status"}
          </span>
          <span className="text-3xl font-bold" style={{ color }}>
            {lineStatusLabel(status, locale)}
          </span>
        </div>
        {explanation && <p className="mt-1 text-sm text-[#8B949E]">{explanation}</p>}
      </div>
    </div>
  );
}
