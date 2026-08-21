"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

export function UncategorizedBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Alert className="mb-4 border-bento-brand/30 bg-bento-brand/10">
      <AlertTriangle className="text-bento-brand" />
      <AlertTitle className="text-bento-default">
        <span className="font-semibold">
          {count} uncategorized transaction{count !== 1 ? "s" : ""}
        </span>
        {" — "}
        <Link
          href="/transactions?category=-1"
          className="text-bento-brand underline underline-offset-2"
        >
          assign categories →
        </Link>
      </AlertTitle>
    </Alert>
  );
}
