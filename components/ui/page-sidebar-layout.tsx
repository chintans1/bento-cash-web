import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageSidebarLayout({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "grid items-start gap-page-gap @page-sidebar/main:grid-cols-page-sidebar",
        className
      )}
    />
  );
}

export function PageSidebar({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      {...props}
      className={cn(
        "min-w-0 @page-sidebar/main:col-start-2 @page-sidebar/main:row-start-1",
        className
      )}
    />
  );
}

export function PageSidebarHeading(props: ComponentProps<"h2">) {
  return (
    <h2
      {...props}
      className="mb-panel-row flex min-h-6 items-center text-sm font-semibold"
    />
  );
}
