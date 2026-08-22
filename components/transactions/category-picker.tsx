"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { CategoryGroupEntry } from "@/lib/lunchmoney/analytics";

export type CategoryOption = {
  /** -1 is the "Uncategorized" sentinel, which saves as null. */
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
 * The category cell: a chip that opens a searchable list.
 *
 * A flat searchable list rather than a grouped dropdown — with a few dozen
 * categories, typing three letters beats scrolling to the right group. The
 * group name rides along on each row so the context isn't lost.
 */
/**
 * Base UI only commits Enter when an item is highlighted, which happens on
 * arrow-key navigation. After typing a filter nothing is highlighted, so Enter
 * would do nothing — but typing three letters and pressing Enter is the whole
 * point of a searchable picker. This takes the top match in that case, and
 * stays out of the way when the user has arrowed to a specific row.
 */
function commitTopMatchOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;

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

export function CategoryPicker({
  categoryId,
  categoryName,
  options,
  onChange,
  saving,
  finalFocus,
}: {
  categoryId: number | null;
  categoryName: string;
  options: CategoryOption[];
  onChange: (categoryId: number | null) => void;
  saving?: boolean;
  /**
   * What receives focus when the picker closes. Return an element to focus it,
   * `false` to leave focus alone, or nothing for the default (the trigger).
   */
  finalFocus?: () => HTMLElement | boolean | null | void;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.id === (categoryId ?? -1)) ?? null,
    [options, categoryId]
  );

  const isUncategorized = categoryId == null;
  const color = categoryColor(categoryName);

  return (
    <Combobox
      items={options}
      itemToStringLabel={(option: CategoryOption) => option.name}
      value={selected}
      onValueChange={(option: CategoryOption | null) => {
        if (!option || option.id === (categoryId ?? -1)) return;
        onChange(option.id === -1 ? null : option.id);
      }}
      open={open}
      onOpenChange={setOpen}
    >
      <ComboboxTrigger
        aria-label={`Category: ${categoryName}. Change`}
        className={cn(
          "group/cat flex w-full items-center gap-1.5 rounded-full py-1 pr-1.5 pl-2 text-left text-xs transition-colors outline-none hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40",
          saving && "opacity-60"
        )}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: isUncategorized ? "var(--cat-3)" : color }}
        />
        <span
          className={cn(
            "truncate",
            isUncategorized ? "text-cat-3" : "text-bento-subtle"
          )}
        >
          {categoryName}
        </span>
        <ChevronDown className="ml-auto size-3 shrink-0 text-bento-subtle opacity-0 transition-opacity group-hover/cat:opacity-100" />
      </ComboboxTrigger>

      <ComboboxContent finalFocus={finalFocus}>
        <div className="border-b border-bento-hairline/60 p-1.5">
          <ComboboxInput
            placeholder="Search categories…"
            onKeyDown={commitTopMatchOnEnter}
          />
        </div>
        <ComboboxEmpty>No categories match.</ComboboxEmpty>
        <ComboboxList>
          {(option: CategoryOption) => (
            <ComboboxItem key={option.id} value={option}>
              <CategoryIcon
                name={option.name}
                className="size-3.5 shrink-0"
                style={{
                  color:
                    option.id === -1
                      ? "var(--cat-3)"
                      : categoryColor(option.name),
                }}
              />
              <span className="truncate">{option.name}</span>
              {option.group && (
                <span className="ml-auto truncate text-[11px] text-muted-foreground">
                  {option.group}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
