"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch.
 *
 * Which icon is correct depends on the resolved theme, which the server can't
 * know. Rather than deferring the render until mount, both icons are rendered
 * and the `dark` class picks one — no hydration mismatch, no flash.
 */
export function ThemeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "menu";
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={variant === "menu" ? "lg" : "icon-lg"}
      aria-label="Toggle light or dark mode"
      title="Toggle theme (d)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "text-bento-subtle hover:text-bento-default",
        variant === "menu" &&
          "h-10 w-full justify-start gap-2.5 rounded-2xl px-3 font-normal hover:bg-bento-raised dark:hover:bg-bento-raised"
      )}
    >
      <Moon
        className="size-4 dark:hidden"
        strokeWidth={variant === "menu" ? 1.5 : 2}
      />
      <Sun
        className="hidden size-4 dark:block"
        strokeWidth={variant === "menu" ? 1.5 : 2}
      />
      {variant === "menu" && (
        <>
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </>
      )}
    </Button>
  );
}
