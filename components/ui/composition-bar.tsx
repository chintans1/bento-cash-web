"use client";

import { useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

export function useCompositionHighlight<Id extends string | number>() {
  const [hoveredId, setHoveredId] = useState<Id | null>(null);
  const [focusedId, setFocusedId] = useState<Id | null>(null);

  return {
    activeId: hoveredId ?? focusedId,
    onHover: setHoveredId,
    clearHighlight: () => {
      setHoveredId(null);
      setFocusedId(null);
    },
    rowHandlers: (id: Id) => ({
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType !== "touch") setHoveredId(id);
      },
      onPointerLeave: () => setHoveredId(null),
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(":focus-visible")) {
          setHoveredId(null);
          setFocusedId(id);
        }
      },
      onBlur: () => setFocusedId(null),
    }),
  };
}

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
