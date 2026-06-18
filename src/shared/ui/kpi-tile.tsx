import { cn } from "@/shared/lib/cn";

interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
  variant?: "default" | "success" | "warning" | "alarm";
  className?: string;
  compact?: boolean;
}

const variantColors = {
  default: "text-[#E6EDF3]",
  success: "text-[#10B981]",
  warning: "text-[#F59E0B]",
  alarm: "text-[#EF4444]",
};

export function KpiTile({
  label,
  value,
  unit,
  accent,
  variant = "default",
  className,
  compact = false,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#30363D] bg-[#161B22]",
        compact ? "p-2" : "p-5",
        accent && "border-[#22D3EE]/30",
        className
      )}
    >
      <p className={cn("uppercase tracking-wider text-[#8B949E]", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </p>
      <div className={cn("flex items-baseline gap-1.5", compact ? "mt-0.5" : "mt-2")}>
        <span
          className={cn(
            "font-bold tracking-tight animate-count",
            compact ? "text-xl" : "text-4xl",
            variantColors[variant]
          )}
        >
          {value}
        </span>
        {unit && (
          <span className={cn("text-[#8B949E]", compact ? "text-[10px]" : "text-sm")}>{unit}</span>
        )}
      </div>
    </div>
  );
}
