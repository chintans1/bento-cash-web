"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

export function UncategorizedBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Alert className="mb-4 border-cat-3/30 bg-cat-3/10">
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
