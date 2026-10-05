"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/collapsible";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/reports", label: "Reports" },
  { href: "/accounts", label: "Accounts" },
  { href: "/investments", label: "Investments" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDemo, hasDataSource, error, clearError, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-bento-hairline bg-bento-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0 font-heading text-2xl font-bold">
          Bento Cash
        </Link>

        <div className="flex items-center gap-1">
          {/* Desktop nav */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {hasDataSource &&
              NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center rounded-full px-3 text-sm font-medium transition-colors",
                    pathname === href
                      ? "text-bento-brand-fg"
                      : "text-bento-subtle hover:bg-bento-raised hover:text-bento-default"
                  )}
                >
                  {pathname === href && (
                    <span className="absolute inset-0 rounded-4xl bg-bento-brand" />
                  )}
                  <span className="relative z-10">{label}</span>
                </Link>
              ))}
          </nav>

          <UserMenu />
          <ThemeToggle />

          {/* Mobile hamburger */}
          {hasDataSource && (
            <button
              className="flex size-10 items-center justify-center rounded-lg text-bento-subtle transition-colors hover:bg-bento-raised hover:text-bento-default md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Demo mode banner */}
      {isDemo && (
        <div className="flex items-center justify-center gap-2 border-t border-bento-hairline bg-bento-brand/10 px-4 py-2 text-center text-sm">
          <span className="text-bento-subtle">Viewing demo data</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Connect Lunch Money
          </Button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 border-t border-bento-danger/20 bg-bento-danger/10 px-4 py-2 text-sm text-bento-danger"
        >
          <CircleAlert className="size-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            className="flex size-8 shrink-0 items-center justify-center rounded-full transition-control hover:bg-bento-danger/10 active:scale-96"
            onClick={clearError}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Mobile dropdown menu */}
      <Collapsible open={menuOpen && hasDataSource}>
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              document
                .querySelector<HTMLButtonElement>(
                  '[aria-controls="mobile-navigation"]'
                )
                ?.focus();
            }
          }}
          className="border-t border-bento-hairline/60 px-4 pb-4 md:hidden"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "mt-1 block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-bento-brand text-bento-brand-fg"
                  : "text-bento-subtle hover:bg-bento-raised hover:text-bento-default"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </Collapsible>
    </header>
  );
}
