"use client";

import { useMemo, useRef, useState } from "react";
import { fieldStyles } from "@/components/ui/field-styles";
import { ListFilter } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import { rankCategoryMatches } from "@/lib/lunchmoney/category-search";
import { cn } from "@/lib/utils";
import type { CategoryGroupEntry } from "@/lib/lunchmoney/analytics";

export type CategoryOption = {
  /**
   * -1 is the "Uncategorized" sentinel, which saves as null; -2 is the filter's
   * "All categories" row, which clears the filter.
   */
  id: number;
  name: string;
  group: string | null;
};

/** Flattens the grouped category tree into one searchable list. */
export function buildCategoryOptions(
  catGroups: CategoryGroupEntry[]
): CategoryOption[] {
  const options: CategoryOption[] = [
    { id: -1, name: "Uncategorized", group: null },
  ];
  for (const group of catGroups) {
    for (const item of group.items) {
      options.push({ id: item.id, name: item.name, group: group.groupName });
    }
  }
  return options;
}

/**
 * Base UI only commits Enter when an item is highlighted, which happens on
 * arrow-key navigation. After typing a filter nothing is highlighted, so Enter
 * would do nothing — but typing three letters and pressing Enter is the whole
 * point of a searchable picker. This takes the top match in that case, and
 * stays out of the way when the user has arrowed to a specific row.
 */
function commitTopMatchOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

  const popup = event.currentTarget.closest('[data-slot="combobox-content"]');
  if (!popup) return;
  if (popup.querySelector('[data-slot="combobox-item"][data-highlighted]')) {
    return;
  }

  const topMatch = popup.querySelector<HTMLElement>(
    '[data-slot="combobox-item"]'
  );
  if (topMatch) {
    event.preventDefault();
    topMatch.click();
  }
}

const ALL_CATEGORIES: CategoryOption = {
  id: -2,
  name: "All categories",
  group: null,
};

/**
 * The popup: search box over the flat category list. Shared so the row picker
 * and the list filter search the same way and read the same way.
 */
function CategoryComboboxPopup({
  finalFocus,
}: {
  finalFocus?: () => HTMLElement | boolean | null | void;
}) {
  return (
    <ComboboxContent finalFocus={finalFocus} className="w-128 min-w-0">
      <div className="border-b border-bento-hairline/60 p-1.5">
        <ComboboxInput
          showTrigger={false}
          placeholder="Search categories…"
          aria-label="Search categories"
          onKeyDown={commitTopMatchOnEnter}
        />
      </div>
      <ComboboxEmpty>No categories match.</ComboboxEmpty>
      <ComboboxList>
        {(option: CategoryOption) => (
          <ComboboxItem key={option.id} value={option}>
            {option.id === ALL_CATEGORIES.id ? (
              <ListFilter className="size-3.5 shrink-0 text-bento-subtle" />
            ) : (
              <CategoryIcon
                name={option.name}
                className="size-3.5 shrink-0 text-(--item-color)"
                style={
                  {
                    "--item-color": categoryColor(option.name),
                  } as React.CSSProperties
                }
              />
            )}
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                option.id === -1 && "font-medium text-bento-negative"
              )}
            >
              {option.name}
            </span>
            {option.group && (
              <span className="ml-auto max-w-24 shrink-0 truncate text-(length:--text-caption) text-muted-foreground">
                {option.group}
              </span>
            )}
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  );
}

/**
 * The category cell: a chip that opens a searchable list.
 *
 * A flat searchable list rather than a grouped dropdown — with a few dozen
 * categories, typing three letters beats scrolling to the right group. The
 * group name rides along on each row so the context isn't lost, and typing it
 * matches every category under it.
 */
export function CategoryPicker({
  categoryId,
  categoryName,
  options,
  onChange,
  saving,
  disabled,
  appearance = "cell",
}: {
  categoryId: number | null;
  categoryName: string;
  options: CategoryOption[];
  /** Return false when the edit removes this row and the list will move focus. */
  onChange: (categoryId: number | null) => void | false;
  saving?: boolean;
  disabled?: boolean;
  appearance?: "cell" | "field";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const skipFinalFocus = useRef(false);

  const selected = useMemo(
    () => options.find((o) => o.id === (categoryId ?? -1)) ?? null,
    [options, categoryId]
  );

  const isUncategorized = categoryId == null;
  const matches = useMemo(
    () => rankCategoryMatches(options, query),
    [options, query]
  );

  return (
    <Combobox
      items={options}
      filteredItems={matches}
      itemToStringLabel={(option: CategoryOption) => option.name}
      filter={null}
      inputValue={query}
      onInputValueChange={setQuery}
      value={selected}
      onValueChange={(option: CategoryOption | null) => {
        if (!option || option.id === (categoryId ?? -1)) return;
        skipFinalFocus.current =
          onChange(option.id === -1 ? null : option.id) === false;
      }}
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen && saving) {
          details.cancel();
          return;
        }
        setOpen(nextOpen);
        if (nextOpen) skipFinalFocus.current = false;
        else setQuery("");
      }}
    >
      <ComboboxTrigger
        aria-label={`Category: ${categoryName}. Change`}
        disabled={disabled}
        aria-disabled={saving || undefined}
        className={cn(
          "group/cat flex w-full items-center gap-1.5 text-left outline-none [&>svg]:ml-auto [&>svg]:shrink-0 [&>svg]:text-bento-subtle",
          appearance === "field"
            ? fieldStyles
            : "min-h-8 rounded-lg pr-1.5 pl-2 text-xs transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40",
          appearance !== "field" &&
            "[&>svg]:size-3 [&>svg]:opacity-65 [&>svg]:transition-opacity hover:[&>svg]:opacity-100 focus-visible:[&>svg]:opacity-100 aria-expanded:[&>svg]:opacity-100",
          (saving || (disabled && appearance !== "field")) && "opacity-60"
        )}
      >
        <span
          className={cn(
            "truncate",
            isUncategorized
              ? "font-medium text-bento-negative"
              : appearance === "field"
                ? "text-bento-default"
                : "text-bento-subtle"
          )}
        >
          {categoryName}
        </span>
      </ComboboxTrigger>

      <CategoryComboboxPopup finalFocus={() => !skipFinalFocus.current} />
    </Combobox>
  );
}

/**
 * The list's category filter — the same searchable picker as the row cell, with
 * an "All categories" row on top. Every category is offered, not just the ones
 * this month happens to contain, so filtering to an empty month is possible.
 *
 * Styled to match `SelectTrigger size="sm"`, which is what it replaced.
 */
export function CategoryFilterPicker({
  categoryId,
  options,
  onChange,
}: {
  /** null = no filter; -1 = uncategorized only. */
  categoryId: number | null;
  options: CategoryOption[];
  onChange: (categoryId: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const filterOptions = useMemo(() => [ALL_CATEGORIES, ...options], [options]);
  const matches = useMemo(
    () => rankCategoryMatches(filterOptions, query),
    [filterOptions, query]
  );

  const selected = useMemo(
    () =>
      filterOptions.find((o) => o.id === (categoryId ?? ALL_CATEGORIES.id)) ??
      ALL_CATEGORIES,
    [filterOptions, categoryId]
  );

  return (
    <Combobox
      items={filterOptions}
      filteredItems={matches}
      itemToStringLabel={(option: CategoryOption) => option.name}
      filter={null}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
      value={selected}
      onValueChange={(option: CategoryOption | null) => {
        if (!option) return;
        onChange(option.id === ALL_CATEGORIES.id ? null : option.id);
      }}
    >
      <ComboboxTrigger
        aria-label={`Filter by category: ${selected.name}. Change`}
        className="flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-transparent bg-input/50 px-2.5 text-xs whitespace-nowrap transition-field outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&>svg]:size-3.5 [&>svg]:shrink-0"
      >
        <span
          className={cn(
            "truncate",
            categoryId === null && "text-muted-foreground",
            categoryId === -1 && "font-medium text-bento-negative"
          )}
        >
          {selected.name}
        </span>
      </ComboboxTrigger>

      <CategoryComboboxPopup />
    </Combobox>
  );
}
