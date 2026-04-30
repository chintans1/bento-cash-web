"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToken } from "@/hooks/use-token";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Spend", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/investments", label: "Invest", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useToken();

  if (!isAuthenticated) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-bento-hairline/60 bg-bento-base/90 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
            >
              <div
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-bento-brand/10" : "transparent"
                )}
              >
                <Icon
                  className={cn(
                    "size-[1.125rem] transition-colors",
                    active ? "text-bento-brand" : "text-bento-subtle"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  active
                    ? "font-semibold text-bento-brand"
                    : "text-bento-subtle"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
