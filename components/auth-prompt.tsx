"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BentoCashMark } from "@/components/bento-cash-mark";
import { LunchMoneyButton } from "@/components/lunch-money-button";
import { signInWithPrimaryIdentityProvider } from "@/lib/auth-client";
import { primaryIdentityProvider } from "@/lib/auth/identity-provider";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AuthPrompt() {
  const { enterDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithPrimaryIdentityProvider();
    } catch {
      setError(
        `Couldn't start ${primaryIdentityProvider.name} sign-in. Please try again.`
      );
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-115 px-3 pt-10 pb-14 text-center sm:px-4 sm:pt-16">
      <section className="flex w-full flex-col gap-6 rounded-4xl glass px-4 py-8 sm:px-9 sm:py-10">
        <BentoCashMark />
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Bento Cash
          </h1>
          <p className="text-sm leading-6 text-bento-subtle sm:text-base sm:leading-7">
            A fresh perspective on your Lunch Money budget.
          </p>
        </div>

        <LunchMoneyButton
          label="Sign in with"
          loading={loading}
          onClick={startSignIn}
        />
        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs leading-5 text-bento-subtle">
          {primaryIdentityProvider.explanation}
        </p>

        <div className="border-t border-bento-hairline pt-4">
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
