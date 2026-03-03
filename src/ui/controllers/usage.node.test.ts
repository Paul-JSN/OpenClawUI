import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __test, loadUsage, type UsageState } from "./usage.ts";

type RequestFn = (method: string, params?: unknown) => Promise<unknown>;

function createState(request: RequestFn, overrides: Partial<UsageState> = {}): UsageState {
  return {
    client: { request } as unknown as UsageState["client"],
    connected: true,
    usageLoading: false,
    usageResult: null,
    usageCostSummary: null,
    usageStatus: null,
    usageError: null,
    usageStartDate: "2026-02-16",
    usageEndDate: "2026-02-16",
    usageSelectedSessions: [],
    usageSelectedDays: [],
    usageTimeSeries: null,
    usageTimeSeriesLoading: false,
    usageTimeSeriesCursorStart: null,
    usageTimeSeriesCursorEnd: null,
    usageSessionLogs: null,
    usageSessionLogsLoading: false,
    ...overrides,
  };
}

describe("usage controller date interpretation params", () => {
  beforeEach(() => {
    __test.resetLegacyUsageDateParamsCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds UTC date interpretation payload only when enabled", () => {
    expect(__test.buildDateInterpretationParams(true)).toEqual({ mode: "utc" });
    expect(__test.buildDateInterpretationParams(false)).toBeUndefined();
  });

  it("sends UTC mode for usage endpoints", async () => {
    const request = vi.fn(async () => ({}));
    const state = createState(request);

    await loadUsage(state);

    expect(request).toHaveBeenNthCalledWith(1, "usage.status");
    expect(request).toHaveBeenNthCalledWith(2, "sessions.usage", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      mode: "utc",
      limit: 1000,
      includeContextWeight: true,
    });
    expect(request).toHaveBeenNthCalledWith(3, "usage.cost", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      mode: "utc",
    });
  });

  it("captures useful error strings in loadUsage", async () => {
    const request = vi.fn(async () => {
      throw new Error("request failed");
    });
    const state = createState(request);

    await loadUsage(state);

    expect(state.usageError).toBe("request failed");
  });

  it("keeps sessions usage when usage.cost fails", async () => {
    const request = vi.fn(async (method: string) => {
      if (method === "sessions.usage") {
        return {
          updatedAt: 1,
          sessions: [],
          totals: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            totalCost: 0,
            inputCost: 0,
            outputCost: 0,
            cacheReadCost: 0,
            cacheWriteCost: 0,
            missingCostEntries: 0,
          },
          aggregates: {
            byModel: [],
          },
        };
      }
      if (method === "usage.cost") {
        throw new Error("usage.cost failed");
      }
      return {
        updatedAt: 1,
        providers: [],
      };
    });
    const state = createState(request);

    await loadUsage(state);

    expect(state.usageError).toBeNull();
    expect(state.usageResult).toMatchObject({ updatedAt: 1, sessions: [] });
  });

  it("normalizes reversed custom date range", async () => {
    const request = vi.fn(async () => ({}));
    const state = createState(request);

    await loadUsage(state, {
      startDate: "2026-03-10",
      endDate: "2026-03-01",
    });

    expect(request).toHaveBeenCalledWith(
      "sessions.usage",
      expect.objectContaining({
        startDate: "2026-03-01",
        endDate: "2026-03-10",
      }),
    );
    expect(state.usageStartDate).toBe("2026-03-01");
    expect(state.usageEndDate).toBe("2026-03-10");
  });

  it("queues latest range while an earlier usage load is in flight", async () => {
    let releaseFirstLoad: (() => void) | null = null;
    const firstLoadGate = new Promise<void>((resolve) => {
      releaseFirstLoad = resolve;
    });

    const request = vi.fn(async (method: string, params?: unknown) => {
      if (method === "sessions.usage") {
        const payload = (params ?? {}) as { startDate?: string; endDate?: string };
        if (payload.startDate === "2026-02-01" && payload.endDate === "2026-02-07") {
          await firstLoadGate;
        }
        return { sessions: [] };
      }
      return {};
    });

    const state = createState(request, {
      usageStartDate: "2026-02-01",
      usageEndDate: "2026-02-07",
    });

    const first = loadUsage(state);
    await Promise.resolve();

    await loadUsage(state, {
      startDate: "2026-02-01",
      endDate: "2026-03-01",
    });

    releaseFirstLoad?.();
    await first;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(request).toHaveBeenCalledWith(
      "sessions.usage",
      expect.objectContaining({
        startDate: "2026-02-01",
        endDate: "2026-03-01",
      }),
    );
  });

  it("serializes non-Error objects without object-to-string coercion", () => {
    expect(__test.toErrorMessage({ reason: "nope" })).toBe('{"reason":"nope"}');
  });

  it("falls back and remembers compatibility when sessions.usage rejects UTC mode", async () => {
    const storage = createStorageMock();
    vi.stubGlobal("localStorage", storage as unknown as Storage);

    const request = vi.fn(async (method: string, params?: unknown) => {
      if (method === "sessions.usage") {
        const record = (params ?? {}) as Record<string, unknown>;
        if ("mode" in record) {
          throw new Error(
            "invalid sessions.usage params: at root: unexpected property 'mode'",
          );
        }
        return { sessions: [] };
      }
      return {};
    });

    const state = createState(request, {
      settings: { gatewayUrl: "ws://127.0.0.1:18789" },
    });

    await loadUsage(state);

    expect(request).toHaveBeenNthCalledWith(1, "usage.status");
    expect(request).toHaveBeenNthCalledWith(2, "sessions.usage", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      mode: "utc",
      limit: 1000,
      includeContextWeight: true,
    });
    expect(request).toHaveBeenNthCalledWith(3, "usage.cost", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      mode: "utc",
    });
    expect(request).toHaveBeenNthCalledWith(4, "sessions.usage", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      limit: 1000,
      includeContextWeight: true,
    });
    expect(request).toHaveBeenNthCalledWith(5, "usage.cost", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
    });

    // Subsequent loads for the same gateway should skip mode/utcOffset immediately.
    await loadUsage(state);

    expect(request).toHaveBeenNthCalledWith(6, "usage.status");
    expect(request).toHaveBeenNthCalledWith(7, "sessions.usage", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      limit: 1000,
      includeContextWeight: true,
    });
    expect(request).toHaveBeenNthCalledWith(8, "usage.cost", {
      startDate: "2026-02-16",
      endDate: "2026-02-16",
    });

    // Persisted flag should survive cache resets (simulating app reload).
    __test.resetLegacyUsageDateParamsCache();
    expect(__test.shouldSendLegacyDateInterpretation(state)).toBe(false);

    vi.unstubAllGlobals();
  });
});

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}
