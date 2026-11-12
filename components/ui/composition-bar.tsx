import { cn } from "@/lib/utils";

export function CompositionBar<Id extends string | number>({
  segments,
  activeId,
  onHover,
  className,
}: {
  segments: readonly { id: Id; percent: number; color: string }[];
  activeId?: Id | null;
  onHover?: (id: Id | null) => void;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-3 gap-px overflow-hidden rounded-full bg-bento-raised",
        className
      )}
      onPointerLeave={() => onHover?.(null)}
    >
      {segments.map(({ id, percent, color }) => (
        <div
          key={id}
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") onHover?.(id);
          }}
          className={cn(
            "w-(--segment-width) bg-(--segment-color) transition-opacity motion-reduce:transition-none",
            activeId != null && activeId !== id && "opacity-35"
          )}
          style={
            {
              "--segment-width": `${percent}%`,
              "--segment-color": color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
