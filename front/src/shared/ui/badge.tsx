import { cn } from "@/shared/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "alarm" | "idle";
  className?: string;
}

const variants = {
  default: "bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30",
  success: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
  warning: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  alarm: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
  idle: "bg-[#6B7280]/15 text-[#9CA3AF] border-[#6B7280]/30",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
