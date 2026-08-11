import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** Склеивает RU · EN для inline-контекстов (легенды, pills, title attrs). */
export function bilingual(en: string, ru: string): string {
  const a = en.trim();
  const b = ru.trim();
  if (!a) return b;
  if (!b || a === b) return a;
  return `${b} · ${a}`;
}

interface BiTextProps {
  en: string;
  ru: string;
  /** Компактный stacked для KPI / nav */
  compact?: boolean;
  /** Inline через · вместо двух строк */
  inline?: boolean;
  className?: string;
  enClassName?: string;
  ruClassName?: string;
}

/**
 * Двуязычная подпись: RU основной, EN вторичный.
 * Выглядит органично на выставочном киоске без переключателя языка.
 */
export function BiText({
  en,
  ru,
  compact = false,
  inline = false,
  className,
  enClassName,
  ruClassName,
}: BiTextProps): ReactNode {
  const a = en.trim();
  const b = ru.trim();
  if (!a) return b;
  if (!b || a === b) return <span className={className}>{a || b}</span>;

  if (inline) {
    return (
      <span className={className}>
        <span className={ruClassName}>{b}</span>
        <span className="mx-1 text-muted/70">·</span>
        <span className={cn("text-muted", enClassName)}>{a}</span>
      </span>
    );
  }

  return (
    <span className={cn("flex flex-col", compact ? "gap-0" : "gap-0.5", className)}>
      <span className={cn("leading-tight", ruClassName)}>{b}</span>
      <span
        className={cn(
          "font-normal leading-tight tracking-normal text-muted normal-case",
          compact ? "text-[0.78em]" : "text-[0.82em]",
          enClassName,
        )}
      >
        {a}
      </span>
    </span>
  );
}
