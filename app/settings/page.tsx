"use client";

import { useState } from "react";
import {
  Check,
  KeyRound,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { ConnectAccountForm } from "@/components/connect-account-form";
import { Badge } from "@/components/ui/badge";
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
import { useAuth, type LinkedAccount } from "@/hooks/use-token";
import { useInvestableMonths } from "@/hooks/use-investable-months";

export default function SettingsPage() {
  const {
    accounts,
    activeAccount,
    user,
    signOut,
    switchAccount,
    removeAccount,
    isAuthenticated,
    isDemo,
  } = useAuth();
  const { months: floorMonths, setMonths } = useInvestableMonths();
  const [floorMonthsInput, setFloorMonthsInput] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<LinkedAccount | null>(null);
  const [removing, setRemoving] = useState(false);

  function handleFloorMonthsChange(raw: string) {
    setFloorMonthsInput(raw);
    setMonths(Number(raw));
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeAccount(removeTarget.id);
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-7 pb-12 sm:px-6 sm:pt-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-sm text-bento-subtle">
          Manage your sign-in, connected budgets, and Bento preferences.
        </p>
      </div>

      {!isDemo && user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserRound className="size-5 text-bento-subtle" />
              Your Bento account
            </CardTitle>
            <CardDescription>
              This identity owns your connections and account-specific settings.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">Google</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bento-brand/10 font-medium text-bento-brand">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-bento-subtle">{user.email}</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      )}

      {!isDemo && (
        <Card id="connections" className="scroll-mt-28">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <WalletCards className="size-5 text-bento-subtle" />
              Lunch Money accounts
            </CardTitle>
            <CardDescription>
              Switch budgets here. Each connection keeps its own preferences and
              features.
            </CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus data-icon="inline-start" />
                Add account
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {accounts.map((account) => {
              const selected = account.id === activeAccount?.id;
              return (
                <div
                  key={account.id}
                  className="flex min-h-16 items-center gap-3 rounded-2xl bg-bento-raised p-3 shadow-[inset_0_0_0_1px_var(--surface-hairline)]"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bento-surface shadow-sm">
                    <KeyRound className="size-4 text-bento-subtle" />
                  </div>
                  <button
                    type="button"
                    className="min-h-10 min-w-0 flex-1 rounded-lg text-left"
                    onClick={() => switchAccount(account.id)}
                    aria-pressed={selected}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {account.label}
                      </span>
                      {selected && (
                        <Badge variant="secondary" className="shrink-0">
                          <Check data-icon="inline-start" /> Active
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-bento-subtle">
                      {account.email || "Connected with an API token"}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Remove ${account.label}`}
                    onClick={() => setRemoveTarget(account)}
                  >
                    <Trash2 className="text-bento-subtle" />
                  </Button>
                </div>
              );
            })}
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-bento-subtle">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              API tokens are encrypted on the server. When Lunch Money OAuth
              arrives, these connections can upgrade without changing your saved
              settings.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Investable Cash</CardTitle>
          <CardDescription>
            Set the emergency-fund floor used by your cash recommendations.
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
              onChange={(event) => handleFloorMonthsChange(event.target.value)}
              className="h-11 w-24 text-center font-mono text-base"
            />
            <label
              htmlFor="savings-months"
              className="text-sm text-bento-subtle"
            >
              months of expenses
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

      <p className="text-center font-mono text-sm text-bento-subtle">
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
