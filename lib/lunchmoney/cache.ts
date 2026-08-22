/**
 * Request cache for the Lunch Money client.
 *
 * Every month change used to refetch everything — including categories and
 * recurring items, which don't depend on the month at all — so stepping back
 * to a month you just looked at cost a full round-trip. Entries are keyed by
 * request and held for TTL_MS.
 *
 * The promise is cached rather than the resolved value, so two callers asking
 * for the same month at once (the dashboard fetches the previous month
 * alongside the current one) share a single request.
 */
const TTL_MS = 5 * 60_000;

type Entry = { at: number; value: Promise<unknown> };

const entries = new Map<string, Entry>();

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.value as Promise<T>;
  }

  const value = load().catch((err) => {
    // A failed request must not be served to the next caller.
    entries.delete(key);
    throw err;
  });
  entries.set(key, { at: Date.now(), value });
  return value;
}

/** Drops every entry whose key starts with `prefix`. */
export function invalidate(prefix: string): void {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

/** Drops everything. Called when the active client changes, so one account's data never leaks into another's session. */
export function clearCache(): void {
  entries.clear();
}
