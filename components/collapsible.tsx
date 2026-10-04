"use client";

import { cn } from "@/lib/utils";

/** Immediate disclosure: no height animation to block input or move content mid-click. */
export function Collapsible({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return open ? <div className={cn(className)}>{children}</div> : null;
}
