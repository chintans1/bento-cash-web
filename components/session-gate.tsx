"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthPrompt } from "@/components/auth-prompt";
import { cn } from "@/lib/utils";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const { isReady, isSignedIn, isDemo, hasDataSource, dataScopeKey } =
    useAuth();
  const isPublicPage = usePathname() === "/privacy-policy";

  return (
    // A connection switch remounts page-level data hooks. No prior account's
    // transient state can remain visible while the next account loads.
    <main
      key={dataScopeKey ?? "signed-out"}
      className={cn(
        "@container/main min-w-0 flex-1",
        hasDataSource && !isPublicPage && "px-4 pt-6 pb-10 md:px-6 lg:px-8"
      )}
    >
      {isPublicPage ? (
        children
      ) : !isReady ? (
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
