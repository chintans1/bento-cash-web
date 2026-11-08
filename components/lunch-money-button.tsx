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
        className="-my-3 -ml-4 h-auto w-44 sm:w-48 dark:hidden"
      />
      <Image
        src="/lunch-money-horizontal-dark.png"
        alt=""
        width={2631}
        height={1004}
        unoptimized
        className="-my-3 -ml-4 hidden h-auto w-44 sm:w-48 dark:block"
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
      className="h-20 w-full justify-between rounded-2xl border-bento-hairline bg-bento-surface px-5 text-left shadow-sm hover:border-bento-brand/40 hover:bg-bento-raised dark:bg-bento-surface dark:hover:bg-bento-raised"
      onClick={onClick}
      disabled={loading}
    >
      <span className="flex flex-col items-start">
        <span className="text-xs text-bento-subtle">
          {loading ? "Opening Lunch Money…" : label}
        </span>
        <LunchMoneyLogo />
      </span>
      <ArrowRight className="size-5 text-bento-subtle transition-transform duration-150 group-hover/button:translate-x-0.5" />
    </Button>
  );
}
