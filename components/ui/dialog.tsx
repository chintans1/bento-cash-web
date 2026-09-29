"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/55 data-open:opacity-100" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <DialogPrimitive.Popup className="relative w-full max-w-md scale-[0.96] rounded-3xl glass bg-bento-surface p-6 text-bento-default opacity-0 transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none data-open:scale-100 data-open:opacity-100">
            {children}
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full text-bento-subtle transition-[color,background-color,scale] hover:bg-bento-raised hover:text-bento-default active:scale-[0.96]"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
