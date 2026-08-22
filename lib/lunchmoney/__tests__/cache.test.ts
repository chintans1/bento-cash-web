import { afterEach, describe, expect, it, vi } from "vitest";
import { cached, clearCache, invalidate } from "../cache";

afterEach(() => {
  clearCache();
  vi.useRealTimers();
});

describe("cached", () => {
  it("calls the loader once for repeated reads of the same key", async () => {
    const load = vi.fn().mockResolvedValue("value");

    await cached("k", load);
    await cached("k", load);
    await cached("k", load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps separate entries per key", async () => {
    const a = vi.fn().mockResolvedValue("a");
    const b = vi.fn().mockResolvedValue("b");

    await expect(cached("a", a)).resolves.toBe("a");
    await expect(cached("b", b)).resolves.toBe("b");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    // The dashboard asks for the previous month while the current month's
    // request is still open; both should ride the same promise.
    const load = vi.fn().mockResolvedValue("value");

    const [first, second] = await Promise.all([
      cached("k", load),
      cached("k", load),
    ]);

    expect(first).toBe("value");
    expect(second).toBe("value");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a rejected request", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue("recovered");

    await expect(cached("k", load)).rejects.toThrow("network");
    await expect(cached("k", load)).resolves.toBe("recovered");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("refetches once the entry is older than the TTL", async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockResolvedValue("value");

    await cached("k", load);
    vi.advanceTimersByTime(4 * 60_000);
    await cached("k", load);
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60_000);
    await cached("k", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("invalidate", () => {
  it("drops entries matching the prefix and leaves the rest", async () => {
    const tx = vi.fn().mockResolvedValue("tx");
    const categories = vi.fn().mockResolvedValue("categories");

    await cached("tx:2026-8", tx);
    await cached("categories", categories);

    invalidate("tx:");

    await cached("tx:2026-8", tx);
    await cached("categories", categories);

    expect(tx).toHaveBeenCalledTimes(2);
    expect(categories).toHaveBeenCalledTimes(1);
  });
});

describe("clearCache", () => {
  it("drops everything, so one account's data can't outlive its session", async () => {
    const load = vi.fn().mockResolvedValue("value");

    await cached("k", load);
    clearCache();
    await cached("k", load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
