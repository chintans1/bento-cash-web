"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

export function UncategorizedBanner({
  count,
  href,
}: {
  count: number;
  href: string;
}) {
  return (
    <Alert className="mb-4 border-0 glass bg-cat-3/30 pl-4">
      <AlertTriangle className="text-cat-3" />
      <AlertTitle className="text-bento-default">
        <span className="font-semibold">
          {count} uncategorized transaction{count !== 1 ? "s" : ""}
        </span>
        {" — "}
        <Link href={href} className="underline">
          assign categories →
        </Link>
      </AlertTitle>
    </Alert>
  );
}
