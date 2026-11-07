"use client";

import { useState } from "react";
import { ArrowRight, WalletCards } from "lucide-react";
import { BentoCashMark } from "@/components/bento-cash-mark";
import { signInWithPrimaryIdentityProvider } from "@/lib/auth-client";
import { primaryIdentityProvider } from "@/lib/auth/identity-provider";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function IdentityProviderMark() {
  return <WalletCards aria-hidden="true" className="size-4 text-bento-brand" />;
}

export function AuthPrompt() {
  const { enterDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSignIn() {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPrimaryIdentityProvider();
      if (result.error) {
        setError(
          result.error.message ||
            `Couldn't sign in with ${primaryIdentityProvider.name}`
        );
        setLoading(false);
      }
    } catch {
      setError(
        `Couldn't start ${primaryIdentityProvider.name} sign-in. Please try again.`
      );
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pt-10 pb-12 text-center sm:pt-16">
      <section className="flex w-full flex-col gap-5 rounded-4xl glass p-5 sm:p-6">
        <BentoCashMark />
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-bold">Bento Cash</h1>
          <p className="text-sm leading-6 text-bento-subtle">
            Sign in with Lunch Money to use Bento Cash and choose a budget.
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 w-full justify-between rounded-2xl bg-bento-surface px-4"
          onClick={startSignIn}
          disabled={loading}
        >
          <span className="flex items-center gap-3">
            <IdentityProviderMark />
            {loading
              ? primaryIdentityProvider.pendingLabel
              : primaryIdentityProvider.signInLabel}
          </span>
          <ArrowRight className="size-4 text-bento-subtle" />
        </Button>
        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs leading-5 text-bento-subtle">
          {primaryIdentityProvider.explanation}
        </p>

        <div className="border-t border-bento-hairline pt-3">
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-bento-subtle transition-colors hover:text-bento-default"
            onClick={enterDemo}
          >
            Explore with demo data
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
