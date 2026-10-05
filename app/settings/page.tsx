"use client";

import { useState } from "react";
import {
  Check,
  KeyRound,
  Plus,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { ConnectAccountForm } from "@/components/connect-account-form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { useAuth } from "@/hooks/use-auth";
import type { LunchMoneyConnection } from "@/lib/lunchmoney/connection-types";
import { useInvestableMonths } from "@/hooks/use-investable-months";
import { useAppData } from "@/hooks/use-app-data";
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
  const {
    connections,
    activeConnection,
    switchConnection,
    removeConnection,
    hasDataSource,
    isDemo,
  } = useAuth();
  const {
    user: lunchMoneyUser,
    loading: accountLoading,
    refreshAccounts,
  } = useAppData();
  const { months: floorMonths, setMonths } = useInvestableMonths();
  const [floorMonthsInput, setFloorMonthsInput] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<LunchMoneyConnection | null>(
    null
  );
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const floorValue = Number(floorMonthsInput ?? floorMonths);
  const floorValid =
    Number.isInteger(floorValue) && floorValue >= 1 && floorValue <= 24;

  function handleFloorMonthsChange(raw: string) {
    setFloorMonthsInput(raw);
    setMonths(Number(raw));
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeConnection(removeTarget.id);
      setRemoveTarget(null);
    } catch (cause) {
      setRemoveError(
        cause instanceof Error ? cause.message : "Couldn't remove account"
      );
    } finally {
      setRemoving(false);
    }
  }

  if (!hasDataSource) return <ConnectionPrompt />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-8 pb-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
          Settings
        </h1>
        <p className="mt-1 text-sm text-pretty text-bento-subtle">
          {isDemo
            ? "Adjust how Bento Cash calculates your demo insights."
            : "Manage your Lunch Money accounts, cash reserve, and historical data."}
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-settings">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="w-full">
            {accountLoading ? (
              <CardContent className="flex min-h-64 items-center justify-center text-sm text-bento-subtle">
                Loading account…
              </CardContent>
            ) : lunchMoneyUser ? (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">Account</CardTitle>
                  <CardDescription>
                    Your active Lunch Money budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bento-brand/10 font-heading text-sm font-semibold text-bento-brand">
                      {initials(lunchMoneyUser.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-lg font-medium">
                        {lunchMoneyUser.name}
                      </p>
                      <p className="truncate text-sm text-bento-subtle">
                        {lunchMoneyUser.budget_name}
                      </p>
                    </div>
                  </div>

                  <dl className="divide-y divide-border rounded-xl bg-bento-raised px-4 text-sm">
                    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
                      <dt className="shrink-0 text-bento-subtle">Email</dt>
                      <dd className="truncate font-medium">
                        {lunchMoneyUser.email}
                      </dd>
                    </div>
                    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
                      <dt className="text-bento-subtle">Currency</dt>
                      <dd className="font-mono font-medium uppercase tabular-nums">
                        {lunchMoneyUser.primary_currency}
                      </dd>
                    </div>
                    {lunchMoneyUser.api_key_label && (
                      <div className="flex min-h-11 items-center justify-between gap-4 py-2">
                        <dt className="shrink-0 text-bento-subtle">API key</dt>
                        <dd className="truncate font-medium">
                          {lunchMoneyUser.api_key_label}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
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
            <CardContent className="flex flex-col gap-4">
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
                    aria-invalid={!floorValid}
                    onBlur={() => setFloorMonthsInput(null)}
                    type="number"
                    min={1}
                    max={24}
                    step={1}
                    value={floorMonthsInput ?? String(floorMonths)}
                    onChange={(event) =>
                      handleFloorMonthsChange(event.target.value)
                    }
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

        <div className="flex min-w-0 flex-col gap-5">
          {!isDemo && (
            <Card id="connections" className="scroll-mt-28">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <WalletCards
                    className="size-5 text-bento-brand"
                    strokeWidth={1.5}
                  />
                  Lunch Money accounts
                </CardTitle>
                <CardDescription>
                  Switch budgets here. Each connection keeps its own preferences
                  and features.
                </CardDescription>
                <CardAction>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus data-icon="inline-start" />
                    Add account
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {connections.map((connection) => {
                  const selected = connection.id === activeConnection?.id;
                  return (
                    <div
                      key={connection.id}
                      className="flex min-h-16 items-center gap-3 rounded-2xl bg-bento-raised p-3 shadow-(--shadow-surface-outline)"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bento-surface shadow-sm">
                        <KeyRound
                          className="size-4 text-bento-brand"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {connection.label}
                          </span>
                          {selected && (
                            <Badge className="shrink-0">
                              <Check data-icon="inline-start" /> Active
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-bento-subtle">
                          {connection.email || "Connected with an API token"}
                        </span>
                      </div>
                      {!selected && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Switch to ${connection.label}`}
                          onClick={() =>
                            void switchConnection(connection.id).catch(
                              () => undefined
                            )
                          }
                        >
                          Switch
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Remove ${connection.label}`}
                        onClick={() => {
                          setRemoveError(null);
                          setRemoveTarget(connection);
                        }}
                      >
                        <Trash2 className="text-bento-subtle" />
                      </Button>
                    </div>
                  );
                })}
                <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-bento-subtle">
                  <ShieldCheck
                    className="mt-0.5 size-3.5 shrink-0 text-bento-brand"
                    strokeWidth={1.5}
                  />
                  Connection credentials are encrypted on the server and are
                  never sent back to your browser.
                </p>
              </CardContent>
            </Card>
          )}

          <MintBalanceImportCard
            currency={lunchMoneyUser?.primary_currency ?? "usd"}
            isDemo={isDemo}
            accountLoading={accountLoading}
            onImported={refreshAccounts}
          />
        </div>
      </div>

      <p className="text-center font-mono text-xs text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <div className="pr-7">
          <DialogTitle className="font-heading text-2xl font-semibold">
            Add a Lunch Money account
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-bento-subtle">
            Connect another budget now. You can switch between accounts from the
            header.
          </DialogDescription>
        </div>
        <div className="mt-6">
          <ConnectAccountForm
            buttonLabel="Add account"
            onConnected={() => setAddOpen(false)}
          />
        </div>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
      >
        <div className="pr-7">
          <DialogTitle className="font-heading text-2xl font-semibold">
            Remove {removeTarget?.label}?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-bento-subtle">
            Bento Cash will delete the encrypted credential and settings for
            this connection. You&apos;ll need to connect it again to restore
            access.
          </DialogDescription>
        </div>
        {removeError && (
          <Alert variant="destructive" className="mt-5 text-left">
            <AlertDescription>{removeError}</AlertDescription>
          </Alert>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setRemoveTarget(null)}
            disabled={removing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmRemove}
            disabled={removing}
          >
            <Trash2 data-icon="inline-start" />
            {removing ? "Removing…" : "Remove account"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
