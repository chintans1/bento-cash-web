"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";

export type AccountFilterOption = {
  id: string;
  name: string;
  institution?: string | null;
};

const ALL_ACCOUNTS: AccountFilterOption = { id: "", name: "All accounts" };

export function AccountFilterPicker({
  accountId,
  options,
  onChange,
}: {
  accountId: string | null;
  options: AccountFilterOption[];
  onChange: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find(({ id }) => id === accountId) ?? ALL_ACCOUNTS;

  return (
    <Combobox
      autoHighlight
      items={[ALL_ACCOUNTS, ...options]}
      itemToStringLabel={(option) => option.name}
      isItemEqualToValue={(option, value) => option.id === value.id}
      filter={(option, input) =>
        `${option.name} ${option.institution ?? ""}`
          .toLowerCase()
          .includes(input.trim().toLowerCase())
      }
      value={selected}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
      onValueChange={(option) => {
        if (option) onChange(option.id || null);
      }}
    >
      <ComboboxTrigger
        aria-label={`Filter by account: ${selected.name}. Change`}
        className={cn(
          fieldStyles,
          compactFieldStyles,
          "flex w-full min-w-0 items-center justify-between gap-1.5 px-2.5 text-xs md:text-xs [&>svg]:size-3.5 [&>svg]:shrink-0"
        )}
      >
        <span
          className={cn(
            "truncate",
            selected === ALL_ACCOUNTS && "text-muted-foreground"
          )}
        >
          {selected.name}
        </span>
      </ComboboxTrigger>
      <ComboboxContent className="w-80 min-w-0">
        <div className="border-b border-bento-hairline/60 p-1.5">
          <ComboboxInput
            showTrigger={false}
            placeholder="Search accounts…"
            aria-label="Search accounts"
          />
        </div>
        <ComboboxEmpty>No accounts match.</ComboboxEmpty>
        <ComboboxList>
          {(option: AccountFilterOption) => (
            <ComboboxItem key={option.id} value={option}>
              <span className="min-w-0">
                <span className="block truncate">{option.name}</span>
                {option.institution && option.institution !== option.name && (
                  <span className="block truncate text-xs font-normal text-bento-subtle">
                    {option.institution}
                  </span>
                )}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
