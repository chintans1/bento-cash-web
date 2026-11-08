"use client";

import Link from "next/link";
import { CircleAlert, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { Footer } from "@/components/footer";
import { SessionGate } from "@/components/session-gate";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

function MobileHeader() {
  const { openMobile, toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-bento-hairline bg-background px-4 md:hidden">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Open navigation"
        aria-expanded={openMobile}
        aria-controls="app-sidebar"
        onClick={toggleSidebar}
      >
        <Menu className="size-5" />
      </Button>
      <Link href="/" className="font-heading text-xl font-bold">
        Bento Cash
      </Link>
    </header>
  );
}

function AuthError() {
  const { error, clearError } = useAuth();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-bento-danger/10 px-4 py-2 text-sm text-bento-danger"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      <span>{error}</span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Dismiss error"
        className="shrink-0 hover:bg-bento-danger/10 hover:text-bento-danger"
        onClick={clearError}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isDemo } = useAuth();

  if (!isSignedIn && !isDemo) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex h-18 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-heading text-2xl font-bold">
            Bento Cash
          </Link>
          <ThemeToggle />
        </header>
        <AuthError />
        <SessionGate>{children}</SessionGate>
        <Footer />
      </div>
    );
  }

  return (
    <TooltipProvider delay={150}>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <AuthError />
          <SessionGate>{children}</SessionGate>
          <Footer />
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
