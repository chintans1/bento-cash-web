"use client";

import type { ReactNode, Ref } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { compactFieldStyles } from "./field-styles";
import { Input } from "./input";

export function SearchField({
  label,
  value,
  onChange,
  ref,
  className,
  shortcutHint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
  className?: string;
  shortcutHint?: ReactNode;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-bento-subtle"
      />
      <Input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder="Search…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            event.currentTarget.blur();
          }
        }}
        className={cn(
          compactFieldStyles,
          "pr-8 pl-8 text-xs md:text-xs [&::-webkit-search-cancel-button]:appearance-none"
        )}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-0 right-0 rounded-compact-control"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X aria-hidden="true" className="size-3.5" />
        </Button>
      ) : (
        shortcutHint
      )}
    </div>
  );
}
