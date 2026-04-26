"use client";

import { useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import type { AccountType } from "@lunch-money/lunch-money-js-v2";
import {
  type NormalizedAccount,
  formatSubtype,
  formatUpdated,
} from "@/lib/account-utils";
import { updateManualAccount } from "@/lib/lunchmoney/client";
import { formatCurrency } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPES,
  INVESTMENT_SUBTYPE_OPTIONS,
  OTHER_SUBTYPE_OPTIONS,
} from "@/lib/investment-utils";

export function AccountRow({
  account,
  primaryCurrency,
  token,
  onSaved,
}: {
  account: NormalizedAccount;
  primaryCurrency: string;
  token: string;
  onSaved: (id: string, type: AccountType, subtype: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState(account.type);
  const [editSubtype, setEditSubtype] = useState(account.subtype ?? "");
  const [saving, setSaving] = useState(false);

  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();
  const isInactive = account.status !== "active";

  function startEdit() {
    setEditType(account.type);
    setEditSubtype(account.subtype ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await updateManualAccount(token, account.rawId, {
        type: editType,
        subtype: editSubtype || undefined,
      });
      onSaved(account.id, editType, editSubtype);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border-b border-bento-hairline/50 py-3 last:border-0">
      {editing ? (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">{account.name}</span>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-bento-subtle">Type</label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v as AccountType)}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-bento-subtle">Subtype</label>
              <Select
                value={editSubtype}
                onValueChange={(v) => setEditSubtype(v ?? "")}
              >
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="— none —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— none —</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Investment</SelectLabel>
                    {INVESTMENT_SUBTYPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatSubtype(s)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    {OTHER_SUBTYPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatSubtype(s)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                <Check className="h-3 w-3" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  isInactive && "text-bento-subtle"
                )}
              >
                {account.name}
              </span>
              {account.subtype && (
                <Badge variant="secondary">
                  {formatSubtype(account.subtype)}
                </Badge>
              )}
              {isInactive && (
                <Badge variant="secondary">{account.status}</Badge>
              )}
              {account.source === "manual" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={startEdit}
                  title="Edit type / subtype"
                  className="text-bento-subtle/60 hover:text-bento-default"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-bento-subtle capitalize">
              {account.type}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {account.balanceValid ? (
              <>
                <span className="font-mono text-sm font-medium tabular-nums">
                  {showNative
                    ? formatCurrency(account.balance, account.currency, true)
                    : formatCurrency(account.toBase, primaryCurrency, true)}
                </span>
                {showNative && (
                  <span className="font-mono text-xs text-bento-subtle tabular-nums">
                    ≈ {formatCurrency(account.toBase, primaryCurrency, true)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-bento-subtle">—</span>
            )}
            <span className="text-xs text-bento-subtle">
              {formatUpdated(account.lastUpdated)}
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
