"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  Landmark,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BentoCashMark } from "@/components/bento-cash-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/investments", label: "Investments", icon: TrendingUp },
];

const navButtonClassName =
  "h-11 gap-3 text-bento-subtle transition-colors hover:text-bento-default data-active:bg-bento-brand data-active:text-bento-brand-fg data-active:hover:bg-bento-brand data-active:hover:text-bento-brand-fg data-active:active:bg-bento-brand data-active:active:text-bento-brand-fg group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center [&_svg]:size-4.5";

export function AppSidebar() {
  const pathname = usePathname();
  const { hasDataSource, isDemo, activeConnection, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);
  const workspaceName = isDemo
    ? "Demo workspace"
    : (activeConnection?.label ?? "Your workspace");

  return (
    <Sidebar id="app-sidebar" variant="floating" collapsible="icon">
      <SidebarHeader className="px-3 pt-3 pb-2 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            onClick={closeMobile}
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Bento Cash home. Viewing: ${workspaceName}`}
          >
            <BentoCashMark className="mx-0 size-10 shrink-0 sm:size-10" />
            <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <span className="font-heading text-xl font-bold whitespace-nowrap">
                Bento Cash
              </span>
              <span
                className="truncate text-(length:--text-caption) text-bento-subtle"
                title={`Viewing: ${workspaceName}`}
              >
                Viewing: {workspaceName}
              </span>
            </span>
          </Link>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Close navigation"
              className="text-bento-subtle hover:text-bento-default"
              onClick={closeMobile}
            >
              <X className="size-5" />
            </Button>
          ) : (
            <ThemeToggle />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {hasDataSource && (
          <SidebarGroup className="pt-0">
            <SidebarGroupContent>
              <nav aria-label="Main navigation">
                <SidebarMenu className="gap-1">
                  {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={pathname === href}
                        aria-current={pathname === href ? "page" : undefined}
                        aria-label={label}
                        tooltip={label}
                        onClick={closeMobile}
                        className={navButtonClassName}
                      >
                        <Icon strokeWidth={1.7} aria-hidden="true" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-3 pb-3">
        {isDemo && (
          <div className="rounded-2xl bg-bento-brand/10 p-3 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="mb-3 px-1 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium">You’re in demo mode</p>
              <p className="mt-1 text-xs leading-relaxed text-bento-subtle">
                Connect Lunch Money to see your own budget here.
              </p>
            </div>
            <Button
              className="h-10 w-full group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0"
              aria-label="Connect Lunch Money"
              title="Connect Lunch Money"
              onClick={() => {
                closeMobile();
                void signOut();
              }}
            >
              <ArrowUpRight className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Connect Lunch Money
              </span>
            </Button>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname === "/settings"}
              aria-current={pathname === "/settings" ? "page" : undefined}
              aria-label="Settings"
              tooltip="Settings"
              onClick={closeMobile}
              className={navButtonClassName}
            >
              <Settings strokeWidth={1.7} aria-hidden="true" />
              <span className="group-data-[collapsible=icon]:hidden">
                Settings
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <UserMenu onNavigate={closeMobile} />
      </SidebarFooter>
    </Sidebar>
  );
}
