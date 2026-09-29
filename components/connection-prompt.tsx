"use client";

import { useAuth } from "@/hooks/use-auth";
import { ConnectAccountForm } from "@/components/connect-account-form";
import { Kbd } from "./ui/kbd";
import { ArrowRight, WalletCards } from "lucide-react";

export function ConnectionPrompt() {
  const { user, enterDemo, signOut } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-7 px-5 pt-10 pb-12 text-center sm:pt-16">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-bento-brand/10 text-bento-brand shadow-[inset_0_0_0_1px_var(--surface-hairline)]">
          <WalletCards className="size-5" />
        </div>
        <h1 className="font-heading text-4xl font-bold">Connect Lunch Money</h1>
        <p className="text-bento-subtle">
          Securely link a budget to start exploring your financial picture.
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

      <div className="w-full rounded-[2rem] glass p-5 sm:p-6">
        <ConnectAccountForm buttonLabel="Connect Lunch Money" />
      </div>

      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-bento-subtle transition-colors hover:text-bento-default"
        onClick={enterDemo}
      >
        Use demo data instead
        <ArrowRight className="size-4" />
      </button>

      <p className="font-mono text-sm text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>
    </div>
  );
}
