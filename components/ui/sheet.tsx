"use client";

import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/25 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/45 data-open:opacity-100" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex justify-end">
          <Dialog.Popup
            className={cn(
              "h-full w-full max-w-xl translate-x-4 overflow-hidden bg-card text-card-foreground opacity-0 shadow-2xl outline-none",
              "transition-[translate,opacity] duration-200 ease-out data-open:translate-x-0 data-open:opacity-100"
            )}
          >
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;
