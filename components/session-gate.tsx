"use client";

import { LoaderCircle } from "lucide-react";
import { useToken } from "@/hooks/use-token";
import { AuthPrompt } from "@/components/auth-prompt";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const { isReady, isSignedIn, isDemo, sessionKey } = useToken();

  return (
    // A connection switch remounts page-level data hooks. No prior account's
    // transient state can remain visible while the next account loads.
    <main key={sessionKey ?? "signed-out"} className="flex-1">
      {!isReady ? (
        <div
          role="status"
          className="flex min-h-app-content items-center justify-center gap-2 px-4 text-sm text-bento-subtle"
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      ) : !isSignedIn && !isDemo ? (
        <AuthPrompt />
      ) : (
        children
      )}
    </main>
  );
}
