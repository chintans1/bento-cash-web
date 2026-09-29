"use client";

import { useAuth } from "@/hooks/use-auth";
import { BentoCashMark } from "@/components/bento-cash-mark";
import { ConnectAccountForm } from "@/components/connect-account-form";
import { ArrowRight } from "lucide-react";

export function ConnectionPrompt() {
  const { user, enterDemo } = useAuth();

  return (
    <div className="mx-auto w-full max-w-md px-5 pt-10 pb-12 text-center sm:pt-16">
      <section className="flex w-full flex-col gap-5 rounded-[2rem] glass p-5 sm:p-6">
        <BentoCashMark />
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-bold">
            Connect Lunch Money
          </h1>
          <p className="text-sm leading-6 text-bento-subtle">
            Securely link a budget to start exploring your financial picture.
          </p>
          {user && (
            <p className="text-xs text-bento-subtle">
              Signed in as {user.email}
            </p>
          )}
        </div>

        <ConnectAccountForm buttonLabel="Connect Lunch Money" />

        <div className="border-t border-bento-hairline pt-3">
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-bento-subtle transition-colors hover:text-bento-default"
            onClick={enterDemo}
          >
            Use demo data instead
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
