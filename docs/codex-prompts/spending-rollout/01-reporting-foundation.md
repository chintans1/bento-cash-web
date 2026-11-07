# Step 01: Reporting foundation and comparison accuracy

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

No prerequisite. This is the first implementation step; it should produce a small correctness PR with no layout redesign.

## Implement

- Establish shared, pure spending selectors, reusing main’s analytics helpers. Sum `to_base`, never raw `amount`, and use the repository’s uncategorized sentinel. Count positive, posted expense transactions; exclude pending entries, categories excluded from totals, and transactions after the reporting cutoff. Income and refunds are not subtracted from this gross-spending measure. Keep raw transaction records available for editing and future-dated planning elsewhere.
- Define all/flexible/recurring selection once: recurring means `recurring_id != null`, including zero; flexible is its complement. Do not infer recurrence from merchant names.
- Build selected-month and previous-month comparisons. For the current calendar month compare both periods through the same elapsed day, bounded by each month’s length; for closed months compare complete months. Use local calendar dates, with an injectable clock for testing. Define refresh behavior when the reporting date changes rather than freezing today forever in an unmounted tab.
- Keep full-month totals separate from comparable-period totals. A previous-month fetch failure is unavailable data, not zero spending. Preserve main’s independent current-month loading and its comparison-loading/unavailable signals.
- Keep budget results, transaction results, and failures scoped to the selected month and authenticated data scope. Preserve main’s existing protections; only fix a demonstrated gap. The prototype’s budget-result tagging is already present in the inspected main and must not be reapplied as a wholesale hook replacement.
- Integrate the cutoff into derived dashboard spending consistently, without silently rewriting shared raw API responses or changing income/account calculations. No new history requests, summary card, filter controls, or insights yet.

## Acceptance evidence

Add focused tests for converted currency, pending/excluded/future entries, wrong-month records, uncategorized expenses, recurring ID zero, zero previous spend, unavailable comparisons, month/year boundaries, leap February, unequal month lengths, and a clock crossing midnight. Exercise existing session/month isolation tests where available. The existing Overview and transaction editor should still work; no future-month transaction is deleted or made uneditable.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
