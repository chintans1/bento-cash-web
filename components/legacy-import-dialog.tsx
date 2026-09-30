"use client";

import { Check, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function LegacyImportDialog() {
  const { legacyImportNotice, dismissLegacyImportNotice } = useAuth();
  const importedConnections = legacyImportNotice?.connections ?? [];

  return (
    <Dialog
      open={legacyImportNotice !== null}
      onOpenChange={(open) => {
        if (!open) dismissLegacyImportNotice();
      }}
    >
      <div className="flex flex-col gap-5 pr-7">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-bento-positive/10 text-bento-positive shadow-(--shadow-surface-outline)">
          <Check className="size-5" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-2">
          <DialogTitle className="font-heading text-2xl font-semibold">
            Your account is ready
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-bento-subtle">
            We found your existing Lunch Money token and moved it into your
            signed-in account. You won&apos;t need to paste it again.
          </DialogDescription>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {importedConnections.map((connection) => (
          <div
            key={connection.id}
            className="flex items-center gap-3 rounded-2xl bg-bento-raised p-3 shadow-(--shadow-surface-outline)"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-bento-surface shadow-sm">
              <KeyRound className="size-4 text-bento-subtle" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{connection.label}</p>
              <p className="truncate text-xs text-bento-subtle">
                Stored securely for this sign-in
              </p>
            </div>
            <ShieldCheck className="size-4 shrink-0 text-bento-positive" />
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-6 w-full"
        onClick={dismissLegacyImportNotice}
      >
        Continue to Bento Cash
      </Button>
    </Dialog>
  );
}
