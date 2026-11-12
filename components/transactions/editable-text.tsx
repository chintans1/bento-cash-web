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
  "h-8 w-full min-w-0 rounded-lg bg-bento-raised px-1.5 text-sm font-medium ring-2 ring-ring/40 outline-none";

/** Shared suggestions popup for inline and detail payee editing. */
export function PayeeSuggestionsPopup() {
  return (
    <ComboboxContent className="w-(--anchor-width) min-w-56">
      <ComboboxEmpty>No matching names.</ComboboxEmpty>
      <ComboboxList>
        {(name: string) => (
          <Autocomplete.Item
            key={name}
            value={name}
            className="flex min-h-10 cursor-default items-center rounded-2xl px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-foreground/10"
          >
            <span className="truncate">{name}</span>
          </Autocomplete.Item>
        )}
      </ComboboxList>
    </ComboboxContent>
  );
}

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
  disabled = false,
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
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const restoreFocus = useRef(false);
  /**
   * The suggestion the user has arrowed to, if any. Enter belongs to Base UI
   * in that case — it commits the highlighted name — and to us otherwise, so
   * that typing a name that matches nothing still saves.
   */
  const highlighted = useRef<string | undefined>(undefined);
  const editing = draft !== null;

  function commit(next: string, focusTrigger = false) {
    const trimmed = next.trim();
    cancel(focusTrigger);
    if (trimmed && trimmed !== value) onCommit(trimmed);
  }

  function cancel(focusTrigger: boolean) {
    restoreFocus.current = focusTrigger;
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
          if (details.reason === "item-press") commit(next, true);
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
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              if (highlighted.current !== undefined) return;
              e.preventDefault();
              commit(draft, true);
            } else if (e.key === "Escape") {
              e.preventDefault();
              // Escape dismisses the suggestions first, so a stray keypress
              // doesn't throw away what's been typed.
              if (open) {
                setOpen(false);
                highlighted.current = undefined;
              } else cancel(true);
            }
          }}
        />
        <PayeeSuggestionsPopup />
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
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft, true);
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel(true);
          }
        }}
      />
    );
  }

  return (
    <button
      ref={(element) => {
        if (element && restoreFocus.current) {
          restoreFocus.current = false;
          element.focus();
        }
      }}
      type="button"
      aria-label={ariaLabel}
      title={value || placeholder}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        setDraft(value);
      }}
      className={cn(
        "group/edit flex min-h-8 w-full items-center gap-1.5 rounded-lg px-1.5 text-left transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none aria-disabled:opacity-60",
        className
      )}
    >
      <span className="truncate text-sm font-medium">
        {value || <span className="text-bento-subtle">{placeholder}</span>}
      </span>
      <Pencil
        aria-hidden="true"
        className="size-3 shrink-0 text-bento-subtle opacity-65 transition-opacity group-focus-within/edit:opacity-100 group-hover/edit:opacity-100"
      />
    </button>
  );
}
