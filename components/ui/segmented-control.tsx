import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: ReactNode; ariaLabel?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex w-fit max-w-full rounded-compact-control bg-bento-raised p-(--segment-inset) [--segment-inset:--spacing(0.5)]",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-label={option.ariaLabel}
          aria-pressed={option.value === value}
          className={cn(
            "pointer-press min-h-7 rounded-[calc(var(--radius-compact-control)-var(--segment-inset))] px-2.5 text-xs font-medium whitespace-nowrap transition-segmented focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            option.value === value
              ? "bg-bento-surface shadow-sm"
              : "text-bento-subtle hover:text-bento-default"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
