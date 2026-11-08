"use client";

import { Check, ChevronsUpDown, LogOut, WalletCards } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const menuItemClassName =
  "flex min-h-10 w-full items-center gap-2.5 rounded-2xl px-3 text-left text-sm transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none";

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const {
    user,
    isDemo,
    connections,
    activeConnection,
    switchConnection,
    signOut,
  } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || isDemo) return null;

  function selectConnection(connectionId: string) {
    setOpen(false);
    if (connectionId === activeConnection?.id) return;
    onNavigate?.();
    void switchConnection(connectionId).catch(() => undefined);
  }

  function handleSignOut() {
    setOpen(false);
    onNavigate?.();
    void signOut();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="lg"
            aria-label={`Switch budget or sign out for ${user.name}`}
            className="h-14 w-full justify-start gap-2.5 rounded-xl px-2 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          />
        }
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bento-brand/10 font-medium text-bento-brand dark:text-bento-brand-fg">
          {(user.name || user.email).slice(0, 1).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start text-left group-data-[collapsible=icon]:hidden">
          <span className="w-full truncate">{user.name || user.email}</span>
          <span
            className="w-full truncate text-xs font-normal text-bento-subtle"
            title={activeConnection?.label}
          >
            {activeConnection?.label ?? "No budget connected"}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 text-bento-subtle group-data-[collapsible=icon]:hidden" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-72 gap-1 p-1.5"
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bento-brand/10 font-medium text-bento-brand">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-bento-subtle">{user.email}</p>
          </div>
        </div>

        {connections.length > 0 && (
          <>
            <div className="mx-1.5 h-px bg-bento-hairline" />
            <p className="px-3 pt-2 pb-1 text-xs font-medium text-bento-subtle">
              Switch budget
            </p>
            {connections.map((connection) => {
              const active = connection.id === activeConnection?.id;
              return (
                <button
                  key={connection.id}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    menuItemClassName,
                    active && "bg-bento-brand/10 text-bento-brand"
                  )}
                  onClick={() => selectConnection(connection.id)}
                >
                  <WalletCards className="size-4" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate">
                    {connection.label}
                  </span>
                  {active && <Check className="size-4" />}
                </button>
              );
            })}
          </>
        )}

        <div className="mx-1.5 my-1 h-px bg-bento-hairline" />
        <button
          type="button"
          className={menuItemClassName}
          onClick={handleSignOut}
        >
          <LogOut className="size-4" strokeWidth={1.5} />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
