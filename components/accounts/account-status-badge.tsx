import { RefreshCw, TriangleAlert } from "lucide-react";
import { getAccountStatus } from "@/lib/account-status";
import { cn } from "@/lib/utils";

export function AccountStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { label, tone } = getAccountStatus(status);
  const Icon =
    tone === "attention"
      ? TriangleAlert
      : tone === "syncing"
        ? RefreshCw
        : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
        tone === "attention"
          ? "bg-warning/10 text-warning-foreground"
          : tone === "syncing"
            ? "bg-primary/10 text-primary"
            : "bg-bento-raised text-bento-subtle",
        className
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  );
}
