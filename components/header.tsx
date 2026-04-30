"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToken } from "@/hooks/use-token";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
  { href: "/investments", label: "Investments" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDemo, isAuthenticated, exitDemo } = useToken();

  const visibleLinks = isAuthenticated ? NAV_LINKS : [];

  return (
    <header className="sticky top-0 z-10 border-b border-bento-hairline/60 bg-bento-base/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-heading text-2xl font-bold">Bento Cash</span>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {visibleLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-4xl px-4 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-bento-brand text-bento-brand-fg"
                  : "text-bento-subtle hover:bg-bento-muted hover:text-bento-default"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        {visibleLinks.length > 0 && (
          <button
            className="flex size-9 items-center justify-center rounded-lg text-bento-subtle transition-colors hover:bg-bento-muted hover:text-bento-default sm:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        )}
      </div>

      {/* Demo mode banner */}
      {isDemo && (
        <div className="flex items-center justify-center gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
          <span className="text-bento-subtle">
            Viewing demo data —{" "}
            <Link
              href="/settings"
              className="font-medium text-bento-default underline-offset-4 hover:underline"
            >
              Connect your account
            </Link>
          </span>
          <Button variant="ghost" size="sm" onClick={exitDemo}>
            Exit demo
          </Button>
        </div>
      )}

      {/* Mobile dropdown menu */}
      {menuOpen && visibleLinks.length > 0 && (
        <nav className="border-t border-bento-hairline/60 bg-bento-base/95 px-4 pb-4 sm:hidden">
          {visibleLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "mt-1 block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-bento-brand text-bento-brand-fg"
                  : "text-bento-subtle hover:bg-bento-muted hover:text-bento-default"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
