"use client";

import { WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MANAGE_VALUE = "__manage_accounts__";

export function AccountSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const { connections, activeConnection, switchConnection } = useAuth();

  if (!activeConnection) return null;

  function handleValueChange(value: string | null) {
    if (!value) return;
    if (value === MANAGE_VALUE) router.push("/settings#connections");
    else void switchConnection(value).catch(() => undefined);
  }

  return (
    <Select value={activeConnection.id} onValueChange={handleValueChange}>
      <SelectTrigger
        aria-label="Switch Lunch Money account"
        className={cn("h-10", className)}
      >
        <WalletCards className="size-4 text-bento-subtle" />
        <SelectValue>
          <span className="max-w-40 truncate">{activeConnection.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Lunch Money accounts</SelectLabel>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              {connection.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value={MANAGE_VALUE}>Manage accounts…</SelectItem>
      </SelectContent>
    </Select>
  );
}
