"use client";

import { LoaderCircle } from "lucide-react";
import { useToken } from "@/hooks/use-token";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useToken();

  return (
    <main>
      {isReady ? (
        children
      ) : (
        <div
          role="status"
          className="flex min-h-[calc(100svh-73px)] items-center justify-center gap-2 px-4 text-sm text-bento-subtle"
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      )}
    </main>
  );
}
