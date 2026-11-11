"use client";

import { ConnectionPrompt } from "@/components/connection-prompt";
import { AppleCardImportCard } from "@/components/imports/apple-card-import-card";
import { MintBalanceImportCard } from "@/components/imports/mint-balance-import-card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";

export default function ImportsPage() {
  const { hasDataSource, isDemo } = useAuth();
  const { user, loading, refreshAccounts } = useAppData();

  if (!hasDataSource) return <ConnectionPrompt />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
        Imports
      </h1>
      {isDemo && (
        <Alert>
          <AlertTitle>Connect a Lunch Money budget to import.</AlertTitle>
        </Alert>
      )}
      <div className="grid grid-cols-1 items-start gap-5 @4xl/main:grid-cols-2">
        <MintBalanceImportCard
          currency={user?.primary_currency ?? "usd"}
          isDemo={isDemo}
          accountLoading={loading}
          onImported={refreshAccounts}
        />
        <AppleCardImportCard isDemo={isDemo} onImported={refreshAccounts} />
      </div>
    </div>
  );
}
