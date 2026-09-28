"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-token";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function GoogleMark() {
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

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (result.error) {
        setError(result.error.message || "Couldn't sign in with Google");
        setLoading(false);
      }
    } catch {
      setError("Couldn't start Google sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 px-5 pt-10 pb-12 text-center sm:pt-20">
      <div className="flex max-w-sm flex-col gap-3">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-bento-brand/10 text-bento-brand shadow-[inset_0_0_0_1px_var(--surface-hairline)]">
          <ShieldCheck className="size-5" strokeWidth={2} />
        </div>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          Your money, clearly.
        </h1>
        <p className="text-sm leading-6 text-bento-subtle sm:text-base">
          Sign in once to keep your Lunch Money accounts, preferences, and
          future features in sync.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 rounded-3xl glass p-5 sm:p-6">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 w-full justify-between rounded-2xl bg-bento-surface px-4"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          <span className="flex items-center gap-3">
            <GoogleMark />
            {loading ? "Opening Google…" : "Continue with Google"}
          </span>
          <ArrowRight className="size-4 text-bento-subtle" />
        </Button>
        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs leading-5 text-bento-subtle">
          No password to create. Google is used only to identify your Bento Cash
          account.
        </p>
      </div>

      <button
        type="button"
        className="group inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-bento-subtle transition-colors hover:text-bento-default"
        onClick={enterDemo}
      >
        Explore with demo data
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
