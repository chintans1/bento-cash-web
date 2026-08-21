"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

export function UncategorizedBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Alert className="mb-4 border-0 border-l-2 border-l-cat-3 glass pl-4">
      <AlertTriangle className="text-cat-3" />
      <AlertTitle className="text-bento-default">
        <span className="font-semibold">
          {count} uncategorized transaction{count !== 1 ? "s" : ""}
        </span>
        {" — "}
        <Link
          href="/transactions?category=-1"
          className="underline underline-offset-2 hover:text-bento-default"
        >
          assign categories →
        </Link>
      </AlertTitle>
    </Alert>
  );
}
