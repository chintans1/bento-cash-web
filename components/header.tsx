"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, LogOut, Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { DURATION, EASE } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AnimatedCollapse } from "@/components/animated-collapse";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountSwitcher } from "@/components/account-switcher";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/reports", label: "Reports" },
  { href: "/accounts", label: "Accounts" },
  { href: "/investments", label: "Investments" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDemo, isSignedIn, hasDataSource, error, clearError, signOut } =
    useAuth();

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
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-4xl bg-bento-brand"
                      transition={{ duration: DURATION.expand, ease: EASE }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </Link>
              ))}
          </nav>

          {hasDataSource && !isDemo && (
            <AccountSwitcher className="hidden md:flex" />
          )}
          {isSignedIn && !isDemo && (
            <Button
              variant="ghost"
              size="sm"
              className="text-bento-subtle hover:text-bento-default"
              onClick={() => void signOut()}
            >
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          )}
          <ThemeToggle />

          {/* Mobile hamburger */}
          {hasDataSource && (
            <button
              className="flex size-10 items-center justify-center rounded-lg text-bento-subtle transition-colors hover:bg-bento-raised hover:text-bento-default md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
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
            className="flex size-8 shrink-0 items-center justify-center rounded-full transition-[color,background-color,scale] hover:bg-bento-danger/10 active:scale-[0.96]"
            onClick={clearError}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Mobile dropdown menu */}
      <AnimatedCollapse open={menuOpen && hasDataSource}>
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-bento-hairline/60 px-4 pb-4 md:hidden"
        >
          {!isDemo && <AccountSwitcher className="mt-3 w-full" />}
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
      </AnimatedCollapse>
    </header>
  );
}
