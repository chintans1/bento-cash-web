"use client";

import {
  type NormalizedAccount,
  groupByInstitution,
} from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AccountRow } from "./account-row";

export function AccountSection({
  title,
  accounts,
  total,
  primaryCurrency,
}: {
  title: string;
  accounts: NormalizedAccount[];
  total: number;
  primaryCurrency: string;
}) {
  if (accounts.length === 0) return null;

  const groups = groupByInstitution(accounts);

  return (
    <Card className="pb-0">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {formatCurrency(total, primaryCurrency, true)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {groups.map(([institution, groupAccounts], i) => {
          const groupTotal = groupAccounts.reduce(
            (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
            0
          );
          return (
            <div
              key={institution}
              className={cn(i > 0 && "border-t border-border")}
            >
              <div className="flex items-baseline justify-between bg-muted/90 px-6 py-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {institution}
                </span>
                <span className="font-mono text-xs font-medium tabular-nums">
                  {formatCurrency(groupTotal, primaryCurrency, true)}
                </span>
              </div>
              <ul className="flex flex-col px-6">
                {groupAccounts.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    primaryCurrency={primaryCurrency}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
