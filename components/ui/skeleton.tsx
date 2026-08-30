import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // Diverges from the registry's `bg-muted`: every surface in this app is
      // glass, and an opaque fill on a translucent pane reads as a patch stuck
      // to it. See the surfaces section of CLAUDE.md.
      className={cn("animate-pulse rounded-2xl bg-bento-raised", className)}
      {...props}
    />
  );
}

export { Skeleton };
