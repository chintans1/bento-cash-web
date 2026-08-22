/**
 * Shared motion tokens.
 *
 * One curve and one set of durations for every transition in the app —
 * expanding rows, drill-down panels, nav pills, list entries. Consistency is
 * most of what makes motion feel deliberate rather than incidental.
 *
 * EASE is a quart ease-out: it leaves immediately and settles softly, which
 * reads as responsive without overshoot.
 */
export const EASE = [0.25, 1, 0.5, 1] as const;

export const DURATION = {
  /** Opening: the box grows and the content follows it in. */
  expand: 0.26,
  /** Closing: faster than opening — nobody wants to wait to dismiss. */
  collapse: 0.2,
  /** Small state changes: chevrons, hovers, fades. */
  quick: 0.15,
} as const;
