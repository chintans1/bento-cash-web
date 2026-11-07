# Step 03: Monthly spending history and historical average

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

Requires steps 01–02 merged. Pair the history loader, six/twelve-month chart, and monthly-average statistic because they need the same historical data and availability rules.

## Implement

- Add a selected-month-anchored history hook/adapter. Return twelve ordered month slots ending at the selected month; reuse the selected-month data already loaded and fetch prior months through main’s existing scoped client/cache. Do not repurpose the today-anchored history used by accounts/investments if that changes their behavior.
- Scope requests, results, and failures by authenticated data scope and reporting month; ignore late responses after either changes. Do not fetch while disconnected. Reuse cached requests across modules and navigation. Preserve a failed month as unavailable rather than inventing a zero total. Retain successful months on partial failure, and offer a retry using the cache’s real retry/invalidation semantics.
- Add a standalone monthly-history card near the summary with 6M/12M controls. Use the shared spending mode. Distinguish flexible and recurring segments in all mode; use one series in the other modes. Show full historical totals, and label the current month as actual month to date, never a forecast. Keep the full/comparable series distinction from step 01.
- Selecting a bar navigates to that reporting month using current main’s router/URL conventions. Preserve spending mode, selected range, and unrelated query state. Do not hardcode the prototype’s old route assumptions if main has changed.
- Add the historical monthly average to step 02’s summary. Match the prototype’s stated basis: prior completed months with posted spending in the active mode, excluding the selected month. State the denominator and number of months explicitly; do not call this an average across all months. Exclude unavailable months, distinguish a real empty month from missing data, and show no baseline when none qualifies.
- Keep 12M usable on mobile using internal horizontal scrolling and >=40px-wide selectable months; prevent page-level overflow. Give every bar a keyboard-accessible month/amount label, current-selection indication, and precise amount on hover/focus. Do not add category trends or anomalies yet.

## Acceptance evidence

Test ordered windows across years, selected current/closed months, empty versus missing months, partial failure and retry, session switching, request races, cache reuse, average denominator, and zero baselines. Manually check six/twelve months, keyboard navigation, mode persistence across bar navigation, and narrow-screen touch targets. Current-month content must stay usable when history fails.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
