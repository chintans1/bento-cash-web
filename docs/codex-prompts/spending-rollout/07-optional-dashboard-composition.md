# Step 07: Optional spending-first dashboard composition

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

Optional. Run only after steps 01–06 are merged and individually reviewed, and the user explicitly chooses to adopt the full spending-first layout. Running the earlier prompts does not authorize this redesign.

## Implement

- Inspect the integrated modules and current Overview before changing structure. Compose existing modules rather than adding another giant dashboard component or a duplicate data/history hook.
- Adopt the prototype’s hierarchy: spending title and month selector; monthly spending summary with mode controls; monthly history beside insights; category explorer beside daily calendar; supporting purchases; then cumulative spending pace, budget/bills, and net worth/cash flow as supporting financial context.
- Preserve current main’s connection/authentication handling, session scoping, comparisons, errors/retries, transaction editing/deletion/imports, theme controls, keyboard shortcuts, accessible collapsibles, and Reports navigation. Do not bring back the prototype’s old auth or runtime. Keep the uncategorized alert prominent and its destination month-correct.
- Consolidate duplicate spending/count/transaction presentations. Preserve income drill-down, top merchants, net worth, cash flow, budgets, recurring items, and recent activity in useful reachable placements or a clearly labeled accessible disclosure. Do not silently discard existing functionality to match a screenshot. Adapt the current user-facing recurring-items/bills semantics accurately.
- Use the current design system: clear heading hierarchy, legible theme colors, concentric radii, shallow surface depth, tabular numerals, restrained hover/press states, reduced-motion support, and >=40px targets. Keep month navigation and filter states stable. Ensure evidence scrolling respects the sticky header and keyboard users receive useful context.
- On desktop, use balanced wide/narrow columns; on mobile, stack in reading order with explicit minmax/zero-minimum sizing. Twelve-month bars may scroll inside their card, but the page must not overflow horizontally. Check 320px, 390px, tablet, and desktop widths with large amounts and long category/merchant names.
- Preserve useful current-month content during history failures. Retain the explicit gross-spend, recurring, comparison, and partial-month definitions where they help explain a number. Avoid filler copy, an unrelated global restyle, new dependencies, or changes to the separate Reports page’s period semantics.

## Acceptance evidence

Verify the complete path: month and mode -> history -> category -> purchases; calendar -> day -> purchases; insight -> category/exact purchase; clear filters; browser back/forward; transaction edit then return; and data-source change. Check loading/errors, empty and unavailable history, both themes, reduced motion, keyboard focus, all target widths, and preservation of the existing Overview capabilities. Describe the final layout clearly in this step’s PR so it can be reviewed as a separate product decision.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
