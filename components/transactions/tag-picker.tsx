"use client";

import { useState } from "react";
import { Check, Plus, Search, Tag as TagIcon, X } from "lucide-react";
import type { Tag } from "@/lib/lunchmoney/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function TagDot({ tag, className }: { tag: Tag; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        tag.background_color ? "bg-(--item-background)" : "bg-bento-hairline",
        className
      )}
      style={
        { "--item-background": tag.background_color } as React.CSSProperties
      }
    />
  );
}

export function TagPicker({
  tags,
  value,
  disabled,
  saving,
  appearance = "field",
  onChange,
}: {
  tags: Tag[];
  value: number[];
  disabled?: boolean;
  saving?: boolean;
  appearance?: "field" | "cell";
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const cell = appearance === "cell";
  const selectedIds = new Set(value);
  const selected = value
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
  const available = open
    ? [
        ...selected,
        ...tags.filter((tag) => !tag.archived && !selectedIds.has(tag.id)),
      ]
    : [];
  const names = selected.map((tag) => tag.name).join(", ");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = available.filter((tag) =>
    tag.name.toLowerCase().includes(normalizedQuery)
  );

  return (
    <div
      className={
        cell
          ? "min-w-0"
          : "flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-bento-hairline bg-input/50 p-1.5"
      }
    >
      {!cell &&
        selected.map((tag) => (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            aria-label={`Remove tag ${tag.name}`}
            title={`Remove ${tag.name}`}
            className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full bg-bento-raised px-2.5 text-xs font-medium text-bento-default transition-colors hover:bg-bento-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
            onClick={() => onChange(value.filter((id) => id !== tag.id))}
          >
            <TagDot tag={tag} />
            <span className="truncate">{tag.name}</span>
            <X
              aria-hidden="true"
              className="size-3.5 shrink-0 text-bento-subtle"
            />
          </button>
        ))}
      <Popover
        open={open}
        onOpenChange={(next, details) => {
          if (next && saving) {
            details.cancel();
            return;
          }
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger
          aria-label={names ? `Tags: ${names}. Edit tags` : "Add tags"}
          title={names || "Add tags"}
          disabled={disabled}
          aria-disabled={saving || undefined}
          className={cn(
            "inline-flex items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60",
            cell
              ? "pointer-press relative h-8 max-w-full min-w-8 text-bento-subtle hover:text-bento-default aria-expanded:bg-bento-raised"
              : "min-h-10 gap-1.5 bg-card px-3 text-bento-default",
            cell && selected[0] && "@2xl/ledger:w-full"
          )}
        >
          {cell ? (
            <>
              <TagIcon
                aria-hidden="true"
                className={cn("size-4", selected[0] && "@2xl/ledger:hidden")}
              />
              {value.length > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 right-0 min-w-3 rounded-full bg-bento-muted px-0.5 text-center text-(length:--text-micro) leading-3 tabular-nums",
                    selected[0] && "@2xl/ledger:hidden"
                  )}
                >
                  {value.length}
                </span>
              )}
              {selected[0] && (
                <span className="hidden max-w-full min-w-0 items-center gap-1 rounded-full bg-bento-raised px-1.5 py-0.5 @2xl/ledger:flex">
                  <TagDot tag={selected[0]} className="size-1.5" />
                  <span className="truncate">{selected[0].name}</span>
                  {value.length > 1 && (
                    <span className="shrink-0 tabular-nums">
                      +{value.length - 1}
                    </span>
                  )}
                </span>
              )}
            </>
          ) : (
            <>
              <Plus aria-hidden="true" className="size-3.5 shrink-0" />
              <span>{selected.length ? "Add tag" : "Add tags"}</span>
            </>
          )}
        </PopoverTrigger>
        <PopoverContent
          align={cell ? "end" : "start"}
          aria-label="Edit tags"
          className="max-h-(--available-height) max-w-(--available-width) gap-0 overflow-hidden p-1.5"
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
          <div className="max-h-64 min-h-0 overflow-y-auto overscroll-contain">
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
                const active = selectedIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    aria-disabled={saving || undefined}
                    disabled={disabled}
                    className="flex min-h-10 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
                    onClick={() => {
                      if (saving) return;
                      onChange(
                        active
                          ? value.filter((id) => id !== tag.id)
                          : [...value, tag.id]
                      );
                    }}
                  >
                    <TagDot tag={tag} className="size-2.5" />
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
