"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const date = parseISO(value);
  const selected = Number.isNaN(date.getTime()) ? undefined : date;
  const currentYear = new Date().getFullYear();
  const selectedYear = selected?.getFullYear() ?? currentYear;
  const displayDate = selected
    ? format(selected, "MMM d, yyyy")
    : "Choose date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl"
          />
        }
        aria-label={`${label}: ${displayDate}`}
        disabled={disabled}
      >
        <CalendarDays aria-hidden="true" data-icon="inline-start" />
        {displayDate}
      </PopoverTrigger>
      <PopoverContent
        aria-label={`Choose ${label.toLowerCase()}`}
        align="start"
        className="w-auto max-w-(--available-width) p-0"
      >
        <Calendar
          mode="single"
          required
          autoFocus
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(Math.min(currentYear - 100, selectedYear), 0)}
          endMonth={new Date(Math.max(currentYear + 10, selectedYear), 11)}
          onSelect={(next) => {
            onChange(format(next, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
