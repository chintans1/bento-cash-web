"use client";

import { Check, Tags } from "lucide-react";
import type { Tag } from "@/lib/lunchmoney/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function TagPicker({
  tags,
  value,
  disabled,
  onChange,
}: {
  tags: Tag[];
  value: number[];
  disabled?: boolean;
  onChange: (ids: number[]) => void;
}) {
  const selected = tags.filter((tag) => value.includes(tag.id));

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start rounded-xl px-3"
            disabled={disabled}
          />
        }
      >
        <Tags data-icon="inline-start" />
        <span className="truncate text-left">
          {selected.length
            ? selected.map((tag) => tag.name).join(", ")
            : "No tags"}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-72 gap-1 overflow-y-auto p-1.5"
      >
        {tags.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-bento-subtle">
            No tags in Lunch Money.
          </p>
        ) : (
          tags.map((tag) => {
            const active = value.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                className="flex min-h-10 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                onClick={() =>
                  onChange(
                    active
                      ? value.filter((id) => id !== tag.id)
                      : [...value, tag.id]
                  )
                }
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: tag.background_color ?? undefined }}
                />
                <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                <Check
                  className={cn(
                    "size-4 transition-[opacity,scale,filter] duration-300",
                    active
                      ? "blur-0 scale-100 opacity-100"
                      : "scale-[0.25] opacity-0 blur-[4px]"
                  )}
                />
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
