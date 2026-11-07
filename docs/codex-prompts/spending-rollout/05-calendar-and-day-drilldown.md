# Step 05: Daily spending calendar and purchase drill-down

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

Requires steps 01–04 merged. The calendar is paired with day filtering in the existing purchase list; it must not introduce a competing transaction list or new fetches.

## Implement

- Add a standalone “Your spending rhythm” calendar near the category explorer, driven by the same selected-month, active-mode posted expenses. Use a Monday-first seven-column grid and the actual local month length. Show a subtle low-to-high spending heatmap and a concise legend. Zero-spend days must be visually different from future/unavailable days.
- Future days in the current month are disabled and excluded from no-spend-day counts. Closed months include all days. Each selectable day exposes its complete date and exact primary-currency amount through accessible text and hover/focus affordances; color must not be the only way to learn the amount.
- Selecting a day filters the existing purchase list, updates its heading/count/total, and brings it into view. Match the prototype’s interaction: selecting a day clears the category; selecting a category clears the day. Selecting the same day again clears it. A genuine no-spend day opens a useful empty list.
- Keep day state scoped to its reporting month; moving from a 31-day month to February must not retain an invalid selection. Reset incompatible filters on spending-mode changes, clear transaction expansion when its selection changes, and preserve the shared mode/range behavior.
- Provide one clear-filter action that restores the list and selected states together. Use semantic buttons, keyboard operation, visible focus, and >=40px hit targets without overlapping. On very small screens, contain any calendar scrolling within its card.
- Do not add scheduling, forecasts, budgets, recurrence editing, or anomaly detection in this step.

## Acceptance evidence

Check Monday/Sunday starting months, leap February, 30/31-day months, selected/no-spend/future days, current versus closed months, mode changes, category/day mutual exclusion, month changes, and clear filters. The sum of daily totals must equal the active-mode monthly total. Test keyboard operation, scrolling to the list, and no horizontal overflow at narrow widths.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
