"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function LunchMoneyLogo() {
  return (
    <>
      <Image
        src="/lunch-money-horizontal.png"
        alt=""
        width={2631}
        height={1004}
        unoptimized
        className="-my-4 -ml-3 h-auto w-36 sm:-ml-4 sm:w-48 dark:hidden"
      />
      <Image
        src="/lunch-money-horizontal-dark.png"
        alt=""
        width={2631}
        height={1004}
        unoptimized
        className="-my-4 -ml-3 hidden h-auto w-36 sm:-ml-4 sm:w-48 dark:block"
      />
    </>
  );
}

export function LunchMoneyButton({
  label,
  loading,
  onClick,
}: {
  label: "Sign in with" | "Connect with";
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      aria-label={loading ? "Opening Lunch Money" : `${label} Lunch Money`}
      className="h-16 w-full justify-between rounded-2xl border-bento-hairline bg-bento-surface px-3 text-left shadow-sm hover:border-bento-brand/40 hover:bg-bento-raised sm:px-5 dark:bg-bento-surface dark:hover:bg-bento-raised"
      onClick={onClick}
      disabled={loading}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 text-xs font-medium sm:text-sm">
          {loading ? "Opening" : label}
        </span>
        <LunchMoneyLogo />
      </span>
      <ArrowRight className="size-4 text-bento-subtle transition-transform duration-150 group-hover/button:translate-x-0.5 sm:size-5" />
    </Button>
  );
}
