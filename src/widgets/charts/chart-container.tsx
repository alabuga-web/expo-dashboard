"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface ChartContainerProps {
  children: ReactNode;
  className?: string;
  height?: number | string;
  empty?: boolean;
  emptyMessage?: string;
  fill?: boolean;
}

export function ChartContainer({
  children,
  className,
  height = 280,
  empty,
  emptyMessage = "Нет данных",
  fill = false,
}: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  if (empty) {
    return (
      <div
        className={cn("flex items-center justify-center text-sm text-[#8B949E]", className)}
        style={fill ? undefined : { height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("w-full", fill && "h-full min-h-0", className)}
      style={fill ? undefined : { height }}
    >
      {children}
    </div>
  );
}
