# Comprehensive UI polish checklist

Skills: Better UI and Emil Design Eng. Each item must be inspected and either improved or retained with a reason. Code verification and browser verification are tracked separately; untested external writes must remain explicitly Not verified.

## Rebase scope (2026-10-05)

The audit below records the original September 15 UI review. The changes were subsequently ported onto main’s newer Vinext runtime, server-side authentication, and generated UI components. Deleted primitives (`animated-collapse`, `no-token-prompt`, calendar, and hover-card) remain deleted; their historical mentions below refer to the original review. Main’s `Collapsible`, authentication flows, and SheetContent API are preserved. The earlier browser evidence does not certify the newer authentication flows. Rebase validation is recorded separately at the end.

## Status

158 flow/state checks completed. A checked item means its implementation was inspected against both skills and improved where needed; it does not claim a live API write or every runtime state was exercised. Browser coverage and limitations are recorded below.

## Application shell and connection

Reviewed `header`, `theme-provider`, `theme-toggle`, `session-gate`, `no-token-prompt`, and `footer`. Navigation is instant, mobile Escape restores focus, theme changes suppress transitions, and failed connection fields announce their error. Retained the hydration-safe theme icon pair and text-backed loading indicator. Demo and unauthenticated views were exercised; real token submission was not.

- [x] Session restoration/loading gate
- [x] Token entry and password privacy
- [x] Empty token/disabled connect
- [x] Connection in progress
- [x] Invalid token and retry
- [x] Successful connection
- [x] Enter demo
- [x] Demo banner/connect/exit
- [x] Desktop navigation: all six routes and active state
- [x] Mobile menu: open/close/navigation/Escape
- [x] Theme button and d shortcut
- [x] System theme and reduced motion
- [x] Footer attribution/external link
- [x] Unauthenticated access to every route

## Overview

Reviewed every component in `components/dashboard`. Removed chart interpolation and disclosure height animation; preserved static comparisons, chart legends, budget labels, empty states, and conditional cards. Category links preserve month/category, numeric bars clamp their bounds, and rounded-zero delta badges disappear. Retained existing density and independent card radii. Exercised all three drilldowns, month changes, category expansion/navigation, and mobile layout.

- [x] Initial loading, refresh and request error
- [x] Previous/next/current month and future boundary
- [x] Net worth total, change and history chart
- [x] Net worth history loading/empty/error
- [x] Net cash flow income/spend comparison
- [x] Income tile and transaction drilldown
- [x] Spend tile and transaction drilldown
- [x] Average daily spend
- [x] Peak day tile and transaction drilldown
- [x] Drilldown switching and close
- [x] Uncategorized banner and filtered navigation
- [x] Spending flexible/total switch
- [x] Spending current/previous chart and tooltip
- [x] Category totals, color/icon and comparison badge
- [x] Category expansion and transaction rows
- [x] Category view-more navigation preserving context
- [x] Top merchant ranking and transaction navigation
- [x] Budget totals, category progress and over-budget
- [x] Upcoming recurring bills and empty state
- [x] Recent transactions and view all
- [x] Absent budget/recurring data and zero activity

## Transactions

Reviewed the page, row, category picker, and editable-text state machines. Added visible select-all state, bulk progress, complete filter reset, mobile sorting, and visible-control focus advancement. Kept search/sort/review responses immediate. Preserved optimistic rollback and row error messages; disabled conflicting edits while saving. Exercised filtering, empty search recovery, bulk review, category search/Enter, and focus advancement in demo.

- [x] Month navigation and [/] shortcuts
- [x] Search via / and input
- [x] Search across payee/original name/notes/category/account/tags/amount
- [x] Clear search
- [x] Category filter: all/uncategorized/groups/search/empty results
- [x] Review filters: all/unreviewed/pending/attention with counts
- [x] Date/payee/amount sorting and direction
- [x] Pending-first ordering
- [x] Desktop columns and mobile rows
- [x] Transaction selection and select all
- [x] Bulk review, saving, partial failure and clear selection
- [x] Review/unreview a row and advance focus
- [x] Inline payee start/edit/suggestions/commit/blur/Escape
- [x] Inline category edit/search/select/clear and advance focus
- [x] Row details trigger and keyboard access
- [x] Row saving/error/retry states
- [x] Pending/deletion/split/group/locked indicators
- [x] No transactions vs no filter matches
- [x] Filtered spend and count summary

## Transaction details

Reviewed all draft fields, validation, read-only rules, metadata, and submission paths. Added dirty-draft protection, concise invalid-value guidance, explicit control names, save guards, scroll containment, and exit completion before unmount. Normalized null/omitted API fields so untouched records remain unchanged. Retained existing locking rules and in-place save error. Exercised editing, tags, save, invalid currency, cancel/keep editing, unchanged save state, and mobile sheet.

- [x] Sheet open/close/backdrop/Escape/focus return
- [x] Payee and original statement name
- [x] Date editing
- [x] Category picker
- [x] Amount editing and validation
- [x] Currency editing and validation
- [x] Account picker and cash option
- [x] Recurring picker and none option
- [x] Tag multiselect/empty list/selected state
- [x] Notes editing
- [x] Review toggle
- [x] Source/updated/ID metadata
- [x] Pending and deletion warnings
- [x] Synced-account locked fields
- [x] Split/group read-only fields
- [x] Unchanged/invalid/save-disabled state
- [x] Save in progress/success/error/retry
- [x] Cancel and unsaved draft handling
- [x] Mobile scrolling and fixed footer

## Accounts

Reviewed page, account sections/rows, reserve calculation display, and every performance-chart branch. Wrapped account badges, improved hero number sizing, added disclosure semantics and named control groups, clarified history failure separately from empty history, and increased chart tick precision. Retained native/base-currency pairing, invalid-balance dash, inactive badges, and explicit reserve shortfall text. Exercised history ranges/groups and inspected responsive layouts.

- [x] Loading/error/empty account collection
- [x] Net worth hero and assets/liabilities totals
- [x] History range selection
- [x] History grouping selection
- [x] History chart and tooltip
- [x] History missing/partial/error states
- [x] Institution groups and totals
- [x] Asset and liability sections
- [x] Account subtype/inactive status
- [x] Inactive/revoked disclosure
- [x] Native and converted balances
- [x] Invalid balance and last updated
- [x] Investable cash loading/error
- [x] Checking buffer funded/shortfall
- [x] Emergency fund funded/shortfall
- [x] Investable surplus and zero states
- [x] Adjust reserve navigation

## Investments

Reviewed all investment components. Classification editing is immediate, labels are explicit, failures retain the draft, and controls lock during save. Financial chart interpolation and width animations are removed; milestones scroll within their card; contribution/goal currency labels use the account currency. Retained allocation selection, comparison labels, persisted drafts, estimate windows, goal presets, and already-reached/unreachable logic. Exercised classification save, contribution estimate, goal selection and narrow layout.

- [x] Portfolio hero/loading/error/empty
- [x] Portfolio/cash/debt and income/spend stats
- [x] Allocation breakdown
- [x] Institution groups/totals/scrolling
- [x] Checking/savings cash overview
- [x] Other accounts and reclassification help
- [x] Manual account edit entry
- [x] Type/subtype picker
- [x] Classification save/pending/error/cancel
- [x] Synced account non-editable state
- [x] Inactive/invalid/native currency rows
- [x] Allocation group popovers and account subtotals
- [x] Growth chart and rate tooltips
- [x] Monthly contribution input and persistence
- [x] 3/6 month estimate switch and Use action
- [x] 10/20/30 year milestones
- [x] Goal amount input and persistence
- [x] Goal presets and selected state
- [x] Goal dates/already reached/unreachable
- [x] Narrow screen projection layout

## Reports

Reviewed each report and shared chart/ranking/metric helper. All chart data updates are immediate; metrics wrap rather than silently truncating; share bars clamp to 0–100%; report errors announce themselves; the nested main landmark is removed. Retained pressed-state segmented controls, empty rankings, time labels and source notes. Exercised all report types and periods on desktop and inspected mobile.

- [x] 3M/6M/1Y period selection
- [x] Cash flow/spending/income selection
- [x] Loading/error/empty history
- [x] Cash flow metrics
- [x] Monthly income/spending chart and tooltip
- [x] Cash flow legend and saved-line comparison
- [x] Spending metrics and monthly chart
- [x] Category ranking/share/change
- [x] Report ranking empty states
- [x] Income metrics and monthly chart
- [x] Income source ranking/stability
- [x] Mobile segmented controls and tables

## Settings and Mint import

Reviewed every phase in the import card, preview component, and supporting service/tests. Reserve validation now has an invalid state, import conflict choices lock during writes, completion announces itself, and preview scrolling has one container so the header can stick. Retained file-size/parse errors, warnings, stale-preview handling, write/reconciliation errors, post-import refresh errors, and reset/retry paths. Exercised reserve bounds/blur, demo restriction and a temporary synthetic import preview; removed the fixture afterward.

- [x] Account loading/profile/absent user
- [x] Connected budget/email/currency/API label
- [x] Connect/change token action
- [x] Reserve input: valid/partial/out of range/blur/persistence
- [x] Demo import restriction
- [x] CSV choose/cancel/replace
- [x] CSV parsing/loading
- [x] Oversize/malformed/empty file errors
- [x] Timeline warnings
- [x] Preview month count/date range/overlap totals
- [x] Conflict keep/match policy
- [x] Negative-adjustment warning
- [x] Scrollable month preview and sticky header
- [x] Import cancel/reset
- [x] Import pending and duplicate-action prevention
- [x] Stale preview refresh
- [x] Import failure and retry
- [x] Import success summary
- [x] Post-import refresh failure
- [x] Import another file

## Shared primitives and cross-cutting states

Reviewed all exported primitives, including unused calendar/hover-card/button-group variants. Buttons have explicit 150ms easing, pointer-only 0.96 press feedback and a static opt-out; calendar focus now has its ref attached. Selects/comboboxes are instant and opaque, nested option radii account for padding, occasional popovers use interruptible origin-aware transitions, and keyboard/reduced-motion rules suppress movement. Retained structural borders, existing focus rings, semantic color tokens, badges, skeletons, chart legends and static icons. Physical touch and 10%-speed animation-panel checks are Not verified.

- [x] Buttons variants/sizes/hover/focus/press/static/disabled
- [x] Input/textarea focus/invalid/disabled
- [x] Select trigger/options/typeahead/scroll
- [x] Combobox/autocomplete search/list/empty/keyboard
- [x] Popover anchor origin/interruptible entry/exit
- [x] Sheet motion/focus/scroll
- [x] Cards and nested surface radii
- [x] Badges/alerts/separators/tables/skeletons
- [x] Calendar and button groups (exported primitives)
- [x] Hover cards (exported primitive)
- [x] Chart defaults/tooltip/legend
- [x] Contextual icons and stroke consistency
- [x] Keyboard instantaneous actions
- [x] Touch hover and hit areas
- [x] Reduced motion and theme transition suppression
- [x] Light/dark desktop/mobile visual verification

## Motion restraint

| Severity | Location                                           | Before                                        | After                                       | Why                                                                                                       |
| -------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MEDIUM   | `components/animated-collapse.tsx:2`               | Height animations replayed on every drilldown | Immediate disclosure                        | Frequent financial inspection should not wait for layout animation.                                       |
| MEDIUM   | `components/header.tsx:54`                         | Navigation pill moved between pages           | Static active pill                          | Navigation and keyboard actions respond immediately.                                                      |
| MEDIUM   | `components/dashboard/spending-trend-card.tsx:230` | Charts interpolated after data/input changes  | Animation disabled for all financial series | Stable values are easier to compare; also applies to net-worth-card, growth-projection and report charts. |

## Interruptibility and theme consistency

| Severity | Location                           | Before                                      | After                                    | Why                                                                      |
| -------- | ---------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| MEDIUM   | `components/theme-provider.tsx:16` | Theme changes fired every color transition  | Theme transition suppression             | Avoids a page-wide color smear.                                          |
| MEDIUM   | `components/ui/popover.tsx:40`     | Keyframe popovers restarted on interruption | Origin-aware CSS transitions             | Applies also to hover-card; keyboard/reduced-motion are immediate.       |
| MEDIUM   | `components/ui/sheet.tsx:9`        | Parent could unmount before exit finished   | Close completion controls parent unmount | Small fixed offset and shorter exit remain visible on pointer dismissal. |

## State feedback and recovery

| Severity | Location                                             | Before                                                   | After                                             | Why                                                                      |
| -------- | ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| HIGH     | `components/investments/account-row.tsx:71`          | Classification failure had no recovery message           | Inline error retains edits                        | A failed save is now understandable and retryable.                       |
| HIGH     | `components/settings/mint-import-review.tsx:88`      | Conflict policy could change during import               | Choices lock while importing                      | Prevents preview/write races and misleading decisions.                   |
| MEDIUM   | `components/transactions/transaction-editor.tsx:102` | Close silently discarded edits                           | Keep editing or discard in the footer             | Protects work without introducing a browser confirm dialog.              |
| MEDIUM   | `lib/lunchmoney/transaction-state.ts:104`            | Omitted optional API fields appeared dirty               | Null and omitted empty values compare equally     | Untouched transactions keep Save disabled; regression covered by a test. |
| MEDIUM   | `hooks/use-balance-history.ts:26`                    | History failures appeared as no history                  | Separate error message                            | Overview and Accounts distinguish unavailable data from empty data.      |
| MEDIUM   | `app/transactions/page.tsx:385`                      | Invisible select-all, no bulk progress, incomplete clear | Visible selection and progress; full filter reset | Review queues have clear completion and recovery states.                 |

## Context and keyboard continuity

| Severity | Location                                    | Before                                                   | After                                                     | Why                                                          |
| -------- | ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| HIGH     | `app/transactions/page.tsx:288`             | Queue focus could be cancelled or sent to hidden control | Preserve pending focus until frame; select visible target | Verified next-row category focus after Enter.                |
| MEDIUM   | `components/dashboard/category-row.tsx:103` | More link dropped month and category                     | Contextual transaction URL                                | Drilling down preserves the data being inspected.            |
| MEDIUM   | `app/transactions/page.tsx:541`             | Date and amount sorting unavailable on mobile            | Mobile sort selector                                      | All existing sort orders remain reachable on narrow screens. |

## Surfaces and responsive detail

| Severity | Location                                           | Before                                         | After                                                 | Why                                                                                |
| -------- | -------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| MEDIUM   | `components/investments/growth-projection.tsx:347` | Large milestone figures collided on mobile     | Contained horizontal scrolling                        | Full financial values remain readable.                                             |
| MEDIUM   | `components/settings/mint-import-review.tsx:139`   | Nested scrolling defeated sticky table header  | One constrained scrolling container                   | Month headings stay with long previews.                                            |
| LOW      | `components/ui/combobox.tsx:52`                    | Translucent pickers and mismatched inner radii | Opaque surface; inset-based option radius             | Applies to select and tag options too; improves legibility and concentric corners. |
| LOW      | `components/ui/button.tsx:45`                      | Implicit press timing and no static opt-out    | 150ms explicit curve; 0.96 pointer press; static prop | Tactile feedback without keyboard movement.                                        |
| LOW      | `components/footer.tsx:19`                         | Attribution image had no edge separation       | Neutral 1px image outline                             | Uses pure black/white low-opacity edges in each theme.                             |

## Verification

- Code: every listed flow inspected; TypeScript, ESLint, formatting and 151 tests passed. Production build passed with network access for the existing Google Fonts dependency.
- Browser: demo connection; overview drilldowns and month/category navigation; transaction search/empty recovery/category Enter and focus advancement; bulk review; transaction validation, tag selection, save and draft recovery; account chart controls; classification save; projections; all report types/periods; settings reserve validation; import preview policy/warnings with synthetic data.
- Visual: light and dark desktop; 390px mobile overview, transactions, editor, investments, reports, settings and import preview. All six routes measured at 320px without document-level horizontal overflow. Projection and import tables intentionally scroll within their containers.
- Temporary synthetic import page removed. No real financial data or balance history was changed.
- **Not verified:** real credential connection, live API save/import failures, actual import writes and post-write account refresh, OS-level reduced-motion/system-theme switching, physical touch devices, and 10%-speed browser Animations-panel playback. These paths were inspected in code; import service failure/reconciliation behavior is covered by existing tests. Exported unused primitives were inspected in code only.

**Approve — inspected implementation has no remaining HIGH UI-polish finding. Runtime coverage is limited to the checks above.**

## Rebase validation — 2026-10-05

- Rebased onto freshly fetched main, `20228b0` (`Use Cloudflare Builds for both Workers`).
- Preserved server-side authentication, scoped data fetching, comparison failure handling, current generated sheet/combobox APIs, transaction header details, and long-text wrapping.
- Installed main's locked dependencies with `pnpm install --frozen-lockfile`.
- `pnpm test`: 26 files, 228 tests passed.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build`: passed. Build reports Vinext dependency chunking/route-classification notices.
- Browser checks above are historical; no new browser or real-account write verification was performed during this Git rebase.
