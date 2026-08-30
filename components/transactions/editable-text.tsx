"use client";

import { useRef, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Pencil } from "lucide-react";
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-lg bg-bento-raised px-1.5 py-0.5 text-sm font-medium ring-2 ring-ring/40 outline-none";

/**
 * Click-to-edit text, optionally with a list of names to pick from.
 *
 * The draft is seeded when editing starts rather than synced from `value`, so
 * the optimistic re-render that follows a save can't clobber what's being
 * typed.
 */
export function EditableText({
  value,
  onCommit,
  placeholder,
  suggestions,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  /**
   * Existing names to suggest while typing. Free text always wins — these are
   * a shortcut to a name already in use, not a set of allowed values. An empty
   * list falls back to a plain input.
   */
  suggestions?: string[];
  className?: string;
  inputClassName?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  /**
   * The suggestion the user has arrowed to, if any. Enter belongs to Base UI
   * in that case — it commits the highlighted name — and to us otherwise, so
   * that typing a name that matches nothing still saves.
   */
  const highlighted = useRef<string | undefined>(undefined);
  const editing = draft !== null;

  function commit(next: string) {
    const trimmed = next.trim();
    setDraft(null);
    setOpen(false);
    highlighted.current = undefined;
    if (trimmed && trimmed !== value) onCommit(trimmed);
  }

  function cancel() {
    setDraft(null);
    setOpen(false);
    highlighted.current = undefined;
  }

  // Shared by both inputs: the row underneath is click-to-expand, and the page
  // binds single-key shortcuts, so neither may see what happens in here.
  const inputProps = {
    "aria-label": ariaLabel,
    placeholder,
    autoFocus: true,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    className: cn(INPUT_CLASS, inputClassName),
  };

  if (editing && suggestions && suggestions.length > 0) {
    return (
      <Autocomplete.Root
        items={suggestions}
        value={draft}
        onValueChange={(next, details) => {
          setDraft(next);
          // Picking a suggestion is the whole edit — commit without making the
          // user press Enter as well.
          if (details.reason === "item-press") commit(next);
        }}
        open={open}
        onOpenChange={setOpen}
        onItemHighlighted={(item) => {
          highlighted.current = item;
        }}
      >
        <Autocomplete.Input
          {...inputProps}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              if (highlighted.current !== undefined) return;
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              // Escape dismisses the suggestions first, so a stray keypress
              // doesn't throw away what's been typed.
              if (open) setOpen(false);
              else cancel();
            }
          }}
        />
        <ComboboxContent className="w-(--anchor-width) min-w-56">
          <ComboboxEmpty>No matching names.</ComboboxEmpty>
          <ComboboxList>
            {(name: string) => (
              <Autocomplete.Item
                key={name}
                value={name}
                className="flex cursor-default items-center rounded-2xl px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-foreground/10"
              >
                <span className="truncate">{name}</span>
              </Autocomplete.Item>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Autocomplete.Root>
    );
  }

  if (editing) {
    return (
      <input
        {...inputProps}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
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
