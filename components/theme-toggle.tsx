"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Light/dark switch.
 *
 * Which icon is correct depends on the resolved theme, which the server can't
 * know. Rather than deferring the render until mount, both icons are rendered
 * and the `dark` class picks one — no hydration mismatch, no flash.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle light or dark mode"
      title="Toggle theme (d)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-bento-subtle hover:text-bento-default"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  );
}
