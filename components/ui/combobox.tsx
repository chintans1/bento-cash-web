"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Searchable single-select, styled to match `select.tsx`.
 *
 * shadcn's `command`/`combobox` couldn't be installed here — the registry is
 * unreachable from this environment — so these parts wrap the same Base UI
 * primitive the generated `select.tsx` is built on, with its popup styling.
 */
const Combobox = ComboboxPrimitive.Root;
const ComboboxTrigger = ComboboxPrimitive.Trigger;

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        className
      )}
      {...props}
    />
  );
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 flex max-h-(--available-height) w-72 origin-(--transform-origin) flex-col overflow-hidden rounded-3xl bg-popover/70 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "max-h-64 overflow-y-auto overscroll-contain p-1.5",
        className
      )}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex cursor-default items-center gap-2 rounded-2xl px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-foreground/10 data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="flex flex-1 items-center gap-2">{children}</span>
      <ComboboxPrimitive.ItemIndicator>
        <CheckIcon className="size-3.5 shrink-0" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "px-3 py-6 text-center text-sm text-muted-foreground empty:hidden",
        className
      )}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
};
