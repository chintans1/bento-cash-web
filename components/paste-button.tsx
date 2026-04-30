"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ClipboardPaste, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PasteState = "idle" | "success";

interface PasteButtonProps {
  onPaste: (text: string) => void;
  className?: string;
}

export function PasteButton({ onPaste, className }: PasteButtonProps) {
  const [state, setState] = useState<PasteState>("idle");
  const [enabled, setEnabled] = useState(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    async function checkClipboard() {
      try {
        const perm = await navigator.permissions.query({
          name: "clipboard-read" as PermissionName,
        });
        if (perm.state === "granted") {
          const text = await navigator.clipboard.readText();
          setEnabled(!!text.trim());
          // Re-check when permission state changes
          perm.onchange = async () => {
            if (perm.state === "granted") {
              const t = await navigator.clipboard.readText().catch(() => "");
              setEnabled(!!t.trim());
            } else {
              setEnabled(false);
            }
          };
        } else if (perm.state === "prompt") {
          // Haven't been asked yet — show the button, will prompt on click
          setEnabled(true);
        }
        // "denied" → stay hidden
      } catch {
        // Permissions API not supported — show and let the click handle it
        setEnabled(true);
      }
    }
    checkClipboard();
  }, []);

  const handleClick = useCallback(async () => {
    if (cooldownRef.current || state !== "idle") return;
    cooldownRef.current = true;
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onPaste(text.trim());
        setState("success");
        setTimeout(() => {
          setState("idle");
          cooldownRef.current = false;
        }, 1000);
      } else {
        setEnabled(false);
        cooldownRef.current = false;
      }
    } catch {
      // Permission denied or clipboard empty — disable silently
      setEnabled(false);
      cooldownRef.current = false;
    }
  }, [onPaste, state]);

  if (!enabled && state === "idle") return null;

  const isSuccess = state === "success";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      disabled={isSuccess}
      onClick={handleClick}
      aria-label="Paste from clipboard"
      className={cn(
        "absolute top-1/2 right-1.5 -translate-y-1/2",
        "animate-in fade-in duration-150",
        "text-bento-subtle hover:text-bento-default",
        "disabled:pointer-events-none disabled:opacity-100",
        className
      )}
    >
      <span
        className={cn(
          "block transition-all duration-200",
          isSuccess ? "scale-110 text-green-500" : "scale-100"
        )}
      >
        {isSuccess ? (
          <Check className="size-3.5" />
        ) : (
          <ClipboardPaste className="size-3.5" />
        )}
      </span>
    </Button>
  );
}
