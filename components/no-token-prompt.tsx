"use client";

import { useToken } from "@/hooks/use-token";
import { Button } from "@/components/ui/button";
import { ConnectAccountForm } from "@/components/connect-account-form";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "./ui/kbd";
import { ArrowRight, WalletCards } from "lucide-react";

export function NoTokenPrompt() {
  const { accounts, user, enterDemo, switchAccount, signOut } = useToken();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-7 px-5 pt-10 pb-12 text-center sm:pt-16">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-bento-brand/10 text-bento-brand shadow-[inset_0_0_0_1px_var(--surface-hairline)]">
          <WalletCards className="size-5" />
        </div>
        <h1 className="font-heading text-4xl font-bold">Connect Lunch Money</h1>
        <p className="text-bento-subtle">
          Add a budget to start exploring your real financial picture.
        </p>
        <Badge variant="secondary">API token for now</Badge>
      </div>

      {user && (
        <p className="text-sm text-bento-subtle">
          Signed in as {user.email}.{" "}
          <button
            type="button"
            className="inline-flex min-h-10 items-center font-medium text-bento-default underline-offset-4 hover:underline"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </p>
      )}

      {accounts.length > 0 && (
        <div className="flex w-full flex-col gap-2 text-left">
          <p className="text-sm font-medium">Your accounts</p>
          {accounts.map((account) => (
            <Button
              key={account.id}
              variant="outline"
              className="h-auto min-h-10 justify-between py-2"
              onClick={() => switchAccount(account.id)}
            >
              <span className="truncate">{account.label}</span>
              <span className="text-xs font-normal text-bento-subtle">
                Continue
              </span>
            </Button>
          ))}
        </div>
      )}

      <div className="w-full rounded-3xl glass p-5 sm:p-6">
        <ConnectAccountForm buttonLabel="Connect Lunch Money" />
      </div>

      <button
        type="button"
        className="group inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-bento-subtle transition-colors hover:text-bento-default"
        onClick={enterDemo}
      >
        Use demo data instead
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>

      <p className="font-mono text-sm text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>
    </div>
  );
}
