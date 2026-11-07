# Step 06: Spending insights and supporting evidence

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

Requires steps 01–05 merged. Pair signal computation, insight cards, and evidence navigation so every claim can be inspected immediately.

## Implement

- Move signal generation into pure selectors over the shared scoped report. Reuse the fetched history; no extra API, AI service, telemetry, or new credentials. Limit the panel to a small prioritized set of useful signals, not a feed of every fluctuation.
- Category “above usual”: compare selected-category spend with the mean of up to three available prior comparable periods. Require at least two prior periods with positive category spend, an increase greater than 50%, and an absolute increase of at least 50 primary-currency units. Include real zero-spend periods in the mean; never treat failed/missing periods as zero. Show the actual baseline period count and elapsed-day basis for a partial current month. Suppress this signal if there is insufficient comparable history.
- Unusual repeat-merchant purchase: exclude linked recurring transactions; normalize the merchant by trimming and case folding. Require at least three prior purchases from the preceding three completed month slots. Compute the correct odd/even median of their `to_base` values. Flag a selected-month purchase only if it is >=2.5 times that median and >=50 primary-currency units above it. Explain amount, typical median, ratio, and actual history coverage. Suppress evidence-dependent claims if relevant historical data is unavailable.
- The prototype uses 50-unit thresholds; make those named, documented constants rather than burying them in JSX. Do not silently exchange currencies or suggest that the threshold is a universal fraud rule.
- If space remains, show the largest comparable month-over-month category increase of at least 50 units that is not already an above-usual card. Optionally include the largest decrease exceeding 50 units where prior spend is positive. Describe these as spending changes, not guaranteed savings or confirmed problems.
- Selecting a category signal chooses that category, clears the day, updates the shared history/list, and brings its purchases into view. Selecting an unusual purchase chooses its category and day together and identifies the exact transaction within the supporting list, even if there were multiple purchases that day. Use main’s actual transaction ID affordances; preserve local evidence if an editor deep link is unsupported.
- Handle loading, partial/unavailable history, no spending, and no strong signals with truthful messages. Do not report “nothing unusual” when analysis could not run. Keep the existing Overview modules and ordering.

## Acceptance evidence

Add selector tests around exact thresholds, insufficient history, real zero versus unavailable periods, recurring exclusions, merchant normalization, odd/even medians, converted currency, matching elapsed days, ranking, and duplicate-category suppression. Verify both category and exact-purchase evidence paths, including multiple purchases on the same day, filter clearing, month changes, and a failed historical request. Confirm every displayed amount/ratio against the list and baseline fixtures.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
