import { cn } from "@/shared/lib/cn";
import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  compact?: boolean;
  fill?: boolean;
}

export function Panel({
  title,
  subtitle,
  children,
  className,
  headerRight,
  compact = false,
  fill = false,
}: PanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-panel",
        compact ? "p-2.5" : "p-5",
        fill && "min-h-0 min-w-0 flex-1 overflow-hidden",
        className
      )}
    >
      {(title || headerRight) && (
        <div className={cn("flex shrink-0 items-start justify-between gap-2", compact ? "mb-1.5" : "mb-4")}>
          <div className="min-w-0">
            {title && (
              <h3 className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-base")}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={cn("text-muted", compact ? "text-[10px]" : "mt-0.5 text-sm")}>{subtitle}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className={cn(fill && "min-h-0 min-w-0 flex-1 overflow-hidden")}>{children}</div>
    </div>
  );
}
