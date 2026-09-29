"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { signInWithPrimaryIdentityProvider } from "@/lib/auth-client";
import { primaryIdentityProvider } from "@/lib/auth/identity-provider";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Provider mark isolated here so the future Lunch Money swap stays local. */
function IdentityProviderMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.31 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6.01 6.01 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  );
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
      <section className="flex w-full flex-col gap-5 rounded-[2rem] glass p-5 sm:p-6">
        <Image
          src="/bento-cash-mark.png"
          alt=""
          width={72}
          height={72}
          priority
          unoptimized
          className="mx-auto size-16 object-contain sm:size-[4.5rem]"
        />
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-bold">Bento Cash</h1>
          <p className="text-sm leading-6 text-bento-subtle">
            Sign in to keep your Lunch Money accounts and preferences together.
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
