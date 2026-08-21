"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useToken } from "@/hooks/use-token";
import { Button } from "@/components/ui/button";
import { AnimatedCollapse } from "@/components/animated-collapse";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budget", label: "Budget" },
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
    <header className="sticky top-0 z-10 border-b border-bento-hairline/60 bg-bento-base/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-heading text-2xl font-bold">
          Bento Cash{" "}
          <span className="font-mono text-xs text-bento-subtle">web</span>
        </span>

        <div className="flex items-center gap-1">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {visibleLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative rounded-4xl px-4 py-1.5 text-sm font-medium transition-colors",
                  pathname === href
                    ? "text-bento-brand-fg"
                    : "text-bento-subtle hover:bg-bento-raised hover:text-bento-default"
                )}
              >
                {pathname === href && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-4xl bg-bento-brand"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            ))}
          </nav>

          <ThemeToggle />

          {/* Mobile hamburger */}
          {visibleLinks.length > 0 && (
            <button
              className="flex size-9 items-center justify-center rounded-lg text-bento-subtle transition-colors hover:bg-bento-raised hover:text-bento-default sm:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
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
        <div className="flex items-center justify-center gap-3 border-t border-bento-hairline bg-bento-brand/10 px-4 py-2 text-sm">
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
      <AnimatedCollapse open={menuOpen && visibleLinks.length > 0}>
        <nav className="border-t border-bento-hairline/60 px-4 pb-4 sm:hidden">
          {visibleLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
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
