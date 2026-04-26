"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

export function UncategorizedBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
      <AlertTriangle className="text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-300">
        <span className="font-semibold">
          {count} uncategorized transaction{count !== 1 ? "s" : ""}
        </span>
        {" — "}
        <Link
          href="/transactions?category=-1"
          className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
        >
          assign categories →
        </Link>
      </AlertTitle>
    </Alert>
  );
}
