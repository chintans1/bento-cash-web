"use client";

import { useToken } from "@/hooks/use-token";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConnectAccountForm } from "@/components/connect-account-form";
import { Kbd } from "./ui/kbd";

export function NoTokenPrompt() {
  const { accounts, user, enterDemo, switchAccount, signOut } = useToken();

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-8 px-6 pt-12 pb-10 text-center sm:pt-20">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-5xl font-bold">Bento Cash</h1>
        <p className="text-bento-subtle">
          Richer analytics for your Lunch Money finances.
        </p>
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

      <Button size="lg" className="w-full" onClick={enterDemo}>
        Try Demo
      </Button>

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

      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-bento-hairline" />
        <span className="text-xs text-bento-subtle">
          or connect your account
        </span>
        <div className="h-px flex-1 bg-bento-hairline" />
      </div>

      <Alert className="text-left">
        <AlertDescription>
          Your API token is encrypted before it is stored. Bento Cash uses it
          only on the server to connect to Lunch Money.
        </AlertDescription>
      </Alert>

      <ConnectAccountForm />

      <p className="font-mono text-sm text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>
    </div>
  );
}
