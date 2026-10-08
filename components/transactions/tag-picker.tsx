"use client";

import { useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import type { Tag } from "@/lib/lunchmoney/client";
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
  const [query, setQuery] = useState("");
  const selected = value
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
  const available = [
    ...selected,
    ...tags.filter((tag) => !tag.archived && !value.includes(tag.id)),
  ];
  const matches = available.filter((tag) =>
    tag.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-bento-hairline bg-input/50 p-1.5">
      {selected.map((tag) => (
        <button
          key={tag.id}
          type="button"
          disabled={disabled}
          aria-label={`Remove tag ${tag.name}`}
          title={`Remove ${tag.name}`}
          className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full bg-bento-raised px-2.5 text-xs font-medium text-bento-default transition-colors hover:bg-bento-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
          onClick={() => onChange(value.filter((id) => id !== tag.id))}
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-(--item-background)"
            style={
              {
                "--item-background": tag.background_color ?? undefined,
              } as React.CSSProperties
            }
          />
          <span className="truncate">{tag.name}</span>
          <X
            aria-hidden="true"
            className="size-3.5 shrink-0 text-bento-subtle"
          />
        </button>
      ))}
      <Popover onOpenChange={(open) => !open && setQuery("")}>
        <PopoverTrigger
          aria-label={
            selected.length
              ? `Tags: ${selected.map((tag) => tag.name).join(", ")}. Edit tags`
              : "Add tags"
          }
          title={
            selected.length
              ? `Tags: ${selected.map((tag) => tag.name).join(", ")}`
              : "Add tags"
          }
          disabled={disabled}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-medium text-bento-default transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
        >
          <Plus aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{selected.length ? "Add tag" : "Add tags"}</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-80 gap-0 overflow-hidden p-1.5"
        >
          <div className="relative mb-1 border-b border-bento-hairline/60 pb-1.5">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-5 left-3 size-3.5 -translate-y-1/2 text-bento-subtle"
            />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tags…"
              aria-label="Search tags"
              className="h-10 w-full rounded-xl bg-bento-raised pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="min-h-0 overflow-y-auto">
            {available.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-bento-subtle">
                No tags in Lunch Money.
              </p>
            ) : matches.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-bento-subtle">
                No matching tags.
              </p>
            ) : (
              matches.map((tag) => {
                const active = value.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    disabled={disabled}
                    className="flex min-h-10 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
                    onClick={() =>
                      onChange(
                        active
                          ? value.filter((id) => id !== tag.id)
                          : [...value, tag.id]
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full bg-(--item-background)"
                      style={
                        {
                          "--item-background":
                            tag.background_color ?? undefined,
                        } as React.CSSProperties
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "size-4 transition-icon duration-150 ease-out",
                        active
                          ? "scale-100 opacity-100 blur-none"
                          : "scale-25 opacity-0 blur-xs"
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
