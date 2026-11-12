import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      {...props}
      className={cn(
        "font-heading text-3xl font-semibold tracking-tight",
        className
      )}
    />
  );
}
