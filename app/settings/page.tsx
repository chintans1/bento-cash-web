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

export default function SettingsPage() {
  const { signOut, isAuthenticated, isDemo } = useToken();
  const { user, loading } = useAppData();

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
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pt-6 pb-10 sm:px-6">
      <h1 className="w-full font-heading text-2xl font-bold">Settings</h1>
      {/* User Card */}
      <Card className="w-full max-w-md">
        {loading ? (
          <CardContent className="py-8 text-center text-base text-bento-subtle">
            Loading…
          </CardContent>
        ) : user ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <CardDescription className="text-base">
                {user.budget_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-base">
                <div className="flex justify-between gap-4">
                  <dt className="text-bento-subtle">Email</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-bento-subtle">Currency</dt>
                  <dd className="font-medium uppercase">
                    {user.primary_currency}
                  </dd>
                </div>
                {user.api_key_label && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-bento-subtle">API key</dt>
                    <dd className="font-medium">{user.api_key_label}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={signOut}>
                {isDemo ? "Connect your account" : "Change token"}
              </Button>
            </CardFooter>
          </>
        ) : (
          <CardContent className="py-8 text-center text-base text-bento-subtle">
            Not connected
          </CardContent>
        )}
      </Card>

      {/* Investable Cash Card */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Investable Cash</CardTitle>
          <CardDescription className="text-base">
            How many months of expenses your savings should cover as an
            emergency fund. Checking always keeps 1 month for cash flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
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
              className="h-11 w-24 text-center font-mono text-base"
            />
            <label
              htmlFor="savings-months"
              className="text-base text-bento-subtle"
            >
              months savings target
            </label>
          </div>
          <p
            id="savings-months-help"
            className="mt-3 text-xs text-bento-subtle"
          >
            Choose 1–24 whole months. Changes save automatically.
          </p>
        </CardContent>
      </Card>
      <p className="font-mono text-sm text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>
    </div>
  );
}
