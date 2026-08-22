"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Click-to-edit text. Enter or blur commits, Escape reverts.
 *
 * The draft is seeded when editing starts rather than synced from `value`, so
 * the optimistic re-render that follows a save can't clobber what's being
 * typed.
 */
export function EditableText({
  value,
  onCommit,
  placeholder,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  function commit() {
    const next = (draft ?? "").trim();
    setDraft(null);
    if (next && next !== value) onCommit(next);
  }

  if (editing) {
    return (
      <input
        value={draft}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(null);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        className={cn(
          "w-full rounded-lg bg-bento-raised px-1.5 py-0.5 text-sm font-medium ring-2 ring-ring/40 outline-none",
          inputClassName
        )}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        setDraft(value);
      }}
      className={cn(
        "group/edit flex w-full items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        className
      )}
    >
      <span className="truncate text-sm font-medium">
        {value || <span className="text-bento-subtle">{placeholder}</span>}
      </span>
      <Pencil className="size-3 shrink-0 text-bento-subtle opacity-0 transition-opacity group-hover/edit:opacity-100" />
    </button>
  );
}
