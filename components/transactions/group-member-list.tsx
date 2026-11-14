"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { getTransaction, type Transaction } from "@/lib/lunchmoney/client";

const PAGE_SIZE = 12;

export function GroupMemberList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-bento-hairline">
      <ul className="divide-y divide-bento-hairline">
        {transactions.slice(0, limit).map((transaction) => (
          <li
            key={transaction.id}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p
                className="truncate font-medium"
                title={transaction.payee ?? undefined}
              >
                {transaction.payee ||
                  transaction.original_name ||
                  "Unnamed transaction"}
              </p>
              <p className="text-xs text-bento-subtle">
                {formatShortDate(transaction.date)}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs tabular-nums">
              {formatCurrency(
                Number(transaction.amount),
                transaction.currency,
                true
              )}
            </span>
          </li>
        ))}
      </ul>
      {limit < transactions.length && (
        <div className="border-t border-bento-hairline p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
          >
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}

export function GroupMembers({ transaction }: { transaction: Transaction }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    children: Transaction[] | null;
  }>();
  const embedded = transaction.children?.length ? transaction.children : null;
  const { id } = transaction;

  useEffect(() => {
    if (embedded) return;
    let active = true;
    void getTransaction(id).then(
      (group) => {
        if (active)
          setResult({
            attempt,
            children:
              group.is_group_parent && group.children ? group.children : null,
          });
      },
      () => {
        if (active) setResult({ attempt, children: null });
      }
    );
    return () => {
      active = false;
    };
  }, [attempt, embedded, id]);

  const current = result?.attempt === attempt ? result : undefined;
  const children = embedded ?? current?.children;

  return (
    <section aria-label="Transactions in this group">
      <h3 className="mb-2 text-sm font-semibold">
        Transactions in this group
        {children && (
          <span className="ml-2 font-normal text-bento-subtle tabular-nums">
            {children.length}
          </span>
        )}
      </h3>
      {children?.length ? (
        <GroupMemberList transactions={children} />
      ) : children ? (
        <p className="text-sm text-bento-subtle">
          No transactions in this group.
        </p>
      ) : current ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-bento-subtle">
            Couldn’t load the group’s transactions.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-bento-subtle">
          Loading grouped transactions…
        </p>
      )}
    </section>
  );
}
