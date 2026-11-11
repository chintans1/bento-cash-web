import { cn } from "@/lib/utils";

export function AccountSegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex rounded-xl bg-bento-raised p-0.5", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            "pointer-press min-h-7 rounded-lg px-2.5 text-xs font-medium transition-segmented focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
