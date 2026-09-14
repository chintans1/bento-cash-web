"use client";

import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { useToken } from "@/hooks/use-token";
import { useAppData } from "@/hooks/use-app-data";
import { useInvestableMonths } from "@/hooks/use-investable-months";
import { MintBalanceImportCard } from "@/components/settings/mint-balance-import-card";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function SettingsPage() {
  const { signOut, isAuthenticated, isDemo } = useToken();
  const { user, loading, refreshAccounts } = useAppData();

  const { months: floorMonths, setMonths } = useInvestableMonths();
  // The field holds its own text so a half-typed value ("" while retyping)
  // doesn't get rejected mid-edit; only valid numbers reach storage.
  const [floorMonthsInput, setFloorMonthsInput] = useState<string | null>(null);

  function handleFloorMonthsChange(raw: string) {
    setFloorMonthsInput(raw);
    setMonths(Number(raw));
  }

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-8 pb-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
          Settings
        </h1>
        <p className="mt-1 text-sm text-pretty text-bento-subtle">
          Manage your Lunch Money connection, cash reserve, and historical data.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="w-full">
            {loading ? (
              <CardContent className="flex min-h-64 items-center justify-center text-sm text-bento-subtle">
                Loading account…
              </CardContent>
            ) : user ? (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">Account</CardTitle>
                  <CardDescription>
                    Your connected Lunch Money budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bento-brand/10 font-heading text-sm font-semibold text-bento-brand">
                      {initials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-lg font-medium">
                        {user.name}
                      </p>
                      <p className="truncate text-sm text-bento-subtle">
                        {user.budget_name}
                      </p>
                    </div>
                  </div>

                  <dl className="divide-y divide-border rounded-xl bg-bento-raised px-4 text-sm">
                    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
                      <dt className="shrink-0 text-bento-subtle">Email</dt>
                      <dd className="truncate font-medium">{user.email}</dd>
                    </div>
                    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
                      <dt className="text-bento-subtle">Currency</dt>
                      <dd className="font-mono font-medium uppercase tabular-nums">
                        {user.primary_currency}
                      </dd>
                    </div>
                    {user.api_key_label && (
                      <div className="flex min-h-11 items-center justify-between gap-4 py-2">
                        <dt className="shrink-0 text-bento-subtle">API key</dt>
                        <dd className="truncate font-medium">
                          {user.api_key_label}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button variant="outline" size="lg" onClick={signOut}>
                    {isDemo ? "Connect your account" : "Change token"}
                  </Button>
                </CardFooter>
              </>
            ) : (
              <CardContent className="flex min-h-64 items-center justify-center text-sm text-bento-subtle">
                Not connected
              </CardContent>
            )}
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Cash reserve</CardTitle>
              <CardDescription>
                Set the savings buffer used in your investment plan
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bento-raised p-3">
                <div className="min-w-0">
                  <label htmlFor="savings-months" className="block font-medium">
                    Emergency fund
                  </label>
                  <p className="mt-1 text-xs text-pretty text-bento-subtle">
                    Target months of average expenses
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Input
                    id="savings-months"
                    aria-describedby="savings-months-help"
                    onBlur={() => setFloorMonthsInput(null)}
                    type="number"
                    min={1}
                    max={24}
                    step={1}
                    value={floorMonthsInput ?? String(floorMonths)}
                    onChange={(e) => handleFloorMonthsChange(e.target.value)}
                    className="h-10 w-14 appearance-none px-2 py-0 text-center font-mono text-base leading-none tabular-nums [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-bento-subtle">months</span>
                </div>
              </div>
              <p
                id="savings-months-help"
                className="text-sm leading-relaxed text-pretty text-bento-subtle"
              >
                Checking always keeps one additional month for cash flow. Choose
                1–24 whole months; changes save automatically.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <MintBalanceImportCard
            currency={user?.primary_currency ?? "usd"}
            isDemo={isDemo}
            accountLoading={loading}
            onImported={refreshAccounts}
          />
        </div>
      </div>
      <p className="text-center font-mono text-xs text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>
    </div>
  );
}
