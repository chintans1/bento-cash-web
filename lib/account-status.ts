import { formatSubtype } from "@/lib/account-utils";
import type { PlaidAccount } from "@/lib/lunchmoney/client";

type AccountStatus = {
  label: string;
  tone?: "attention" | "syncing";
  guidance?: string;
};

const statuses: Record<PlaidAccount["status"], AccountStatus> = {
  active: { label: "Active" },
  inactive: {
    label: "Inactive",
    guidance: "Lunch Money has paused balance updates and transaction imports.",
  },
  closed: { label: "Closed" },
  deactivated: {
    label: "Deactivated",
    guidance:
      "Select this account again under Add/Remove Accounts From This Bank in Lunch Money.",
  },
  "not found": {
    label: "Not found",
    guidance: "Plaid can no longer find this account at the institution.",
  },
  "not supported": {
    label: "Not supported",
    guidance: "Plaid does not support syncing this account.",
  },
  relink: {
    label: "Relink required",
    tone: "attention",
    guidance: "Relink this institution in Lunch Money to resume syncing.",
  },
  syncing: {
    label: "Syncing",
    tone: "syncing",
    guidance: "Waiting for the first transaction import.",
  },
  revoked: {
    label: "Revoked",
    tone: "attention",
    guidance: "Set up a new connection for this institution in Lunch Money.",
  },
  error: {
    label: "Sync error",
    tone: "attention",
    guidance:
      "Check this institution’s connection in Lunch Money to resume syncing.",
  },
};

export function getAccountStatus(status: string): AccountStatus {
  return Object.hasOwn(statuses, status)
    ? statuses[status as keyof typeof statuses]
    : { label: formatSubtype(status) || "Unknown" };
}
