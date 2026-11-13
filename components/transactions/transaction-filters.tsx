"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Landmark,
  ListFilter,
  Tag,
  X,
} from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { compactFieldStyles, fieldStyles } from "@/components/ui/field-styles";
import { rankCategoryMatches } from "@/lib/lunchmoney/category-search";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "./category-picker";

export type AccountFilterOption = {
  id: string;
  name: string;
  institution?: string | null;
};

type FilterType = "category" | "account";
type MenuItem =
  | { kind: "section"; name: string; section: FilterType }
  | { kind: "back"; name: string }
  | { kind: "category"; name: string; id: number; detail: string | null }
  | { kind: "account"; name: string; id: string; detail: string | null };

const sections: MenuItem[] = [
  { kind: "section", name: "Category", section: "category" },
  { kind: "section", name: "Account", section: "account" },
];
const back: MenuItem = { kind: "back", name: "All filters" };
const filterLabels = { category: "Category", account: "Account" };

export function TransactionFilters({
  categoryId,
  accountId,
  categories,
  accounts,
  onCategoryChange,
  onAccountChange,
}: {
  categoryId: number | null;
  accountId: string | null;
  categories: CategoryOption[];
  accounts: AccountFilterOption[];
  onCategoryChange: (id: number | null) => void;
  onAccountChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<FilterType | null>(null);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [chipAnchor, setChipAnchor] = useState<HTMLButtonElement | null>(null);
  const items = useMemo<MenuItem[]>(() => {
    const search = query.trim().toLowerCase();
    if (!section && !search) return sections;
    const categoryItems =
      section !== "account"
        ? rankCategoryMatches(categories, search).map(
            ({ id, name, group }) => ({
              kind: "category" as const,
              id,
              name,
              detail: group,
            })
          )
        : [];
    const accountItems =
      section !== "category"
        ? accounts
            .filter(({ name, institution }) =>
              `${name} ${institution ?? ""}`.toLowerCase().includes(search)
            )
            .map(({ id, name, institution }) => ({
              kind: "account" as const,
              id,
              name,
              detail: institution ?? null,
            }))
        : [];

    if (section)
      return search
        ? [...categoryItems, ...accountItems]
        : [back, ...categoryItems, ...accountItems];
    return [
      ...sections.filter(({ name }) => name.toLowerCase().includes(search)),
      ...categoryItems,
      ...accountItems,
    ];
  }, [accounts, categories, query, section]);
  const activeFilters = [
    ...(categoryId === null
      ? []
      : [
          {
            type: "category" as const,
            name:
              categories.find(({ id }) => id === categoryId)?.name ??
              "Unavailable category",
            clear: () => onCategoryChange(null),
          },
        ]),
    ...(accountId === null
      ? []
      : [
          {
            type: "account" as const,
            name:
              accounts.find(({ id }) => id === accountId)?.name ??
              "Unavailable account",
            clear: () => onAccountChange(null),
          },
        ]),
  ];
  const searchLabel =
    section === "category"
      ? "Search categories"
      : section === "account"
        ? "Search accounts"
        : "Search filters";

  return (
    <>
      <Combobox<MenuItem>
        autoHighlight
        open={open}
        onOpenChange={(next, details) => {
          if (details.isCanceled) return;
          setOpen(next);
          if (next) {
            setChipAnchor(null);
            setSection(null);
            setQuery("");
          }
        }}
        items={items}
        filter={null}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={(item) => item.name}
        value={null}
        onValueChange={(item, details) => {
          if (!item) return;
          if (item.kind === "section" || item.kind === "back") {
            details.cancel();
            setSection(item.kind === "section" ? item.section : null);
            setQuery("");
          } else if (item.kind === "category") {
            onCategoryChange(item.id);
          } else {
            onAccountChange(item.id);
          }
        }}
      >
        <ComboboxTrigger
          ref={triggerRef}
          className={cn(
            fieldStyles,
            compactFieldStyles,
            "order-3 flex shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium md:text-xs [&>svg:last-child]:hidden"
          )}
        >
          <ListFilter
            aria-hidden="true"
            className="size-3.5 text-bento-subtle"
          />
          Filter
        </ComboboxTrigger>
        <ComboboxContent
          anchor={chipAnchor ?? undefined}
          align={chipAnchor ? "start" : "end"}
          className="w-72 min-w-0"
          finalFocus={() => chipAnchor ?? true}
        >
          <div className="border-b border-bento-hairline/60 p-1.5">
            <ComboboxInput
              showTrigger={false}
              aria-label={searchLabel}
              placeholder={`${searchLabel}…`}
            />
          </div>
          <ComboboxEmpty>No matching filters.</ComboboxEmpty>
          <ComboboxList>
            {(item: MenuItem) => {
              const type = item.kind === "section" ? item.section : item.kind;
              const Icon =
                type === "category"
                  ? Tag
                  : type === "account"
                    ? Landmark
                    : ArrowLeft;
              const active =
                (item.kind === "category" && item.id === categoryId) ||
                (item.kind === "account" && item.id === accountId);
              const detail =
                item.kind === "category" || item.kind === "account"
                  ? [section ? null : filterLabels[item.kind], item.detail]
                      .filter(Boolean)
                      .join(" · ")
                  : "";
              return (
                <ComboboxItem
                  key={
                    item.kind === "back"
                      ? item.kind
                      : item.kind === "section"
                        ? item.section
                        : `${item.kind}-${item.id}`
                  }
                  value={item}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-bento-subtle"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    {detail && (
                      <span className="block truncate text-xs font-normal text-bento-subtle">
                        {detail}
                      </span>
                    )}
                  </span>
                  {item.kind === "section" && (
                    <ChevronRight
                      aria-hidden="true"
                      className="absolute right-2 size-3.5 text-bento-subtle"
                    />
                  )}
                  {active && (
                    <>
                      <Check
                        aria-hidden="true"
                        className="absolute right-2 size-3.5"
                      />
                      <span className="sr-only">Active filter</span>
                    </>
                  )}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {activeFilters.length > 0 && (
        <div
          role="group"
          aria-label="Active transaction filters"
          className="order-5 col-span-full flex min-w-0 flex-wrap items-center gap-2"
        >
          {activeFilters.map(({ type, name, clear }) => (
            <div
              key={type}
              className="flex h-8 max-w-full min-w-0 items-stretch rounded-compact-control border border-bento-hairline bg-input/50 text-xs"
            >
              <button
                type="button"
                aria-label={`Change ${type} filter: ${name}`}
                className="flex min-w-0 items-center gap-1.5 rounded-l-compact-control px-2.5 hover:bg-bento-raised"
                onClick={(event) => {
                  setChipAnchor(event.currentTarget);
                  setSection(type);
                  setQuery("");
                  setOpen(true);
                }}
              >
                <span className="text-bento-subtle">{filterLabels[type]}</span>
                <span className="truncate font-medium">{name}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${type} filter: ${name}`}
                className="grid w-7 shrink-0 place-items-center rounded-r-compact-control border-l border-bento-hairline text-bento-subtle hover:bg-bento-raised hover:text-bento-default"
                onClick={() => {
                  triggerRef.current?.focus();
                  clear();
                }}
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
