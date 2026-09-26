"use client";

import { WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-token";
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
  const { accounts, activeAccount, switchAccount } = useAuth();

  if (!activeAccount) return null;

  function handleValueChange(value: string | null) {
    if (!value) return;
    if (value === MANAGE_VALUE) router.push("/settings#connections");
    else void switchAccount(value);
  }

  return (
    <Select value={activeAccount.id} onValueChange={handleValueChange}>
      <SelectTrigger
        aria-label="Switch Lunch Money account"
        className={cn("h-10", className)}
      >
        <WalletCards className="size-4 text-bento-subtle" />
        <SelectValue>
          <span className="max-w-40 truncate">{activeAccount.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Lunch Money accounts</SelectLabel>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value={MANAGE_VALUE}>Manage accounts…</SelectItem>
      </SelectContent>
    </Select>
  );
}
