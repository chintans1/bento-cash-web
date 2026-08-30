import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
  /** Extra classes applied to the value element — use for size and color. */
  valueClassName?: string;
  /** Extra classes applied to the sub element. */
  subClassName?: string;
  onClick?: () => void;
  /** Adds a ring when true. */
  active?: boolean;
  /** Classes for the active ring, e.g. "ring-2 ring-green-500/50". */
  activeClassName?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  sub,
  loading = false,
  valueClassName,
  subClassName,
  onClick,
  active,
  activeClassName,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 py-0",
        onClick &&
          "cursor-pointer transition-[transform,box-shadow] hover:shadow-lg active:scale-[0.98]",
        active && activeClassName,
        className
      )}
      onClick={onClick}
    >
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-10 w-24 rounded-md" />
        ) : (
          <p className={cn("font-heading tabular-nums", valueClassName)}>
            {value}
          </p>
        )}
        <p className="mt-0.5 text-sm font-medium tracking-wide text-bento-subtle">
          {label}
        </p>
        {!loading && sub && (
          <p
            className={cn(
              "font-mono text-[11px] text-bento-subtle/50",
              subClassName
            )}
          >
            {sub}
          </p>
        )}
      </div>
    </Card>
  );
}
