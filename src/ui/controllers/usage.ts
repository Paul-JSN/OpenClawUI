import { lastNUtcDaysRange, localCurrentDayUtcCoverageRange } from "../views/charts/timezone.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  SessionsUsageResult,
  CostUsageSummary,
  SessionUsageTimeSeries,
  UsageSummary,
} from "../types.ts";
import type { SessionLogEntry } from "../views/usage.ts";

type BaseUsageState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  settings?: { gatewayUrl?: string };
};

export type UsageState = BaseUsageState & {
  usageLoading: boolean;
  usageResult: SessionsUsageResult | null;
  usageCostSummary: CostUsageSummary | null;
  usageStatus: UsageSummary | null;
  usageError: string | null;
  usageStartDate: string;
  usageEndDate: string;
  usageSelectedSessions: string[];
  usageSelectedDays: string[];
  usageTimeSeries: SessionUsageTimeSeries | null;
  usageTimeSeriesLoading: boolean;
  usageTimeSeriesCursorStart: number | null;
  usageTimeSeriesCursorEnd: number | null;
  usageSessionLogs: SessionLogEntry[] | null;
  usageSessionLogsLoading: boolean;
};

export type OverviewUsageState = BaseUsageState & {
  overviewUsageLoading: boolean;
  overviewUsageResult: SessionsUsageResult | null;
  overviewUsageCostSummary: CostUsageSummary | null;
  overviewUsageStatus: UsageSummary | null;
  overviewUsageError: string | null;
  overviewUsageSnapshot24hResult: SessionsUsageResult | null;
  overviewUsageSnapshot24hCostSummary: CostUsageSummary | null;
  overviewUsageSnapshot24hStatus: UsageSummary | null;
  overviewUsageSnapshot24hError: string | null;
};

type UsageDateInterpretationParams = {
  mode: "utc";
};

const LEGACY_USAGE_DATE_PARAMS_STORAGE_KEY = "openclaw.control.usage.date-params.v1";
const LEGACY_USAGE_DATE_PARAMS_DEFAULT_GATEWAY_KEY = "__default__";
const LEGACY_USAGE_DATE_PARAMS_MODE_RE = /unexpected property ['"]mode['"]/i;
const LEGACY_USAGE_DATE_PARAMS_OFFSET_RE = /unexpected property ['"]utcoffset['"]/i;
const LEGACY_USAGE_DATE_PARAMS_INVALID_RE = /invalid sessions\.usage params/i;

let legacyUsageDateParamsCache: Set<string> | null = null;

type PendingUsageReload = {
  startDate: string;
  endDate: string;
};

const usageReloadQueue = new WeakMap<UsageState, PendingUsageReload | null>();

function isIsoYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeUsageDateRange(startDate: string, endDate: string): {
  startDate: string;
  endDate: string;
} {
  const safeStart = isIsoYmd(startDate) ? startDate : endDate;
  const safeEnd = isIsoYmd(endDate) ? endDate : startDate;
  if (!isIsoYmd(safeStart) || !isIsoYmd(safeEnd)) {
    return {
      startDate,
      endDate,
    };
  }
  if (safeStart <= safeEnd) {
    return {
      startDate: safeStart,
      endDate: safeEnd,
    };
  }
  return {
    startDate: safeEnd,
    endDate: safeStart,
  };
}

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

function loadLegacyUsageDateParamsCache(): Set<string> {
  const storage = getLocalStorage();
  if (!storage) {
    return new Set<string>();
  }
  try {
    const raw = storage.getItem(LEGACY_USAGE_DATE_PARAMS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as { unsupportedGatewayKeys?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.unsupportedGatewayKeys)) {
      return new Set<string>();
    }
    return new Set(
      parsed.unsupportedGatewayKeys
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

function persistLegacyUsageDateParamsCache(cache: Set<string>) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(
      LEGACY_USAGE_DATE_PARAMS_STORAGE_KEY,
      JSON.stringify({ unsupportedGatewayKeys: Array.from(cache) }),
    );
  } catch {
    // ignore quota/private-mode failures
  }
}

function getLegacyUsageDateParamsCache(): Set<string> {
  if (!legacyUsageDateParamsCache) {
    legacyUsageDateParamsCache = loadLegacyUsageDateParamsCache();
  }
  return legacyUsageDateParamsCache;
}

function normalizeGatewayCompatibilityKey(gatewayUrl?: string): string {
  const trimmed = gatewayUrl?.trim();
  if (!trimmed) {
    return LEGACY_USAGE_DATE_PARAMS_DEFAULT_GATEWAY_KEY;
  }
  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.protocol}//${parsed.host}${pathname}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

function resolveGatewayCompatibilityKey(state: BaseUsageState): string {
  return normalizeGatewayCompatibilityKey(state.settings?.gatewayUrl);
}

function shouldSendLegacyDateInterpretation(state: BaseUsageState): boolean {
  return !getLegacyUsageDateParamsCache().has(resolveGatewayCompatibilityKey(state));
}

function rememberLegacyDateInterpretation(state: BaseUsageState) {
  const cache = getLegacyUsageDateParamsCache();
  cache.add(resolveGatewayCompatibilityKey(state));
  persistLegacyUsageDateParamsCache(cache);
}

function isLegacyDateInterpretationUnsupportedError(err: unknown): boolean {
  const message = toErrorMessage(err);
  return (
    LEGACY_USAGE_DATE_PARAMS_INVALID_RE.test(message) &&
    (LEGACY_USAGE_DATE_PARAMS_MODE_RE.test(message) ||
      LEGACY_USAGE_DATE_PARAMS_OFFSET_RE.test(message))
  );
}

const buildDateInterpretationParams = (
  includeDateInterpretation: boolean,
): UsageDateInterpretationParams | undefined => {
  if (!includeDateInterpretation) {
    return undefined;
  }
  return { mode: "utc" };
};

function toErrorMessage(err: unknown): string {
  if (typeof err === "string") {
    return err;
  }
  if (err instanceof Error && typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  if (err && typeof err === "object") {
    try {
      const serialized = JSON.stringify(err);
      if (serialized) {
        return serialized;
      }
    } catch {
      // ignore
    }
  }
  return "request failed";
}

async function requestUsageData(
  state: BaseUsageState,
  startDate: string,
  endDate: string,
): Promise<{
  sessionsRes: SessionsUsageResult | null;
  costRes: CostUsageSummary | null;
  statusRes: UsageSummary | null;
}> {
  const client = state.client;
  if (!client || !state.connected) {
    return { sessionsRes: null, costRes: null, statusRes: null };
  }

  const runUsageRequests = async (includeDateInterpretation: boolean) => {
    const dateInterpretation = buildDateInterpretationParams(includeDateInterpretation);
    const [sessionsOutcome, costOutcome] = await Promise.allSettled([
      client.request("sessions.usage", {
        startDate,
        endDate,
        ...dateInterpretation,
        limit: 1000,
        includeContextWeight: true,
      }),
      client.request("usage.cost", {
        startDate,
        endDate,
        ...dateInterpretation,
      }),
    ]);
    return { sessionsOutcome, costOutcome };
  };

  const firstRejectedReason = (
    outcomes: {
      sessionsOutcome: PromiseSettledResult<unknown>;
      costOutcome: PromiseSettledResult<unknown>;
    },
  ): unknown | null => {
    if (outcomes.sessionsOutcome.status === "rejected") {
      return outcomes.sessionsOutcome.reason;
    }
    if (outcomes.costOutcome.status === "rejected") {
      return outcomes.costOutcome.reason;
    }
    return null;
  };

  const isLegacyUnsupported = (
    outcomes: {
      sessionsOutcome: PromiseSettledResult<unknown>;
      costOutcome: PromiseSettledResult<unknown>;
    },
  ): boolean => {
    const reasons: unknown[] = [];
    if (outcomes.sessionsOutcome.status === "rejected") {
      reasons.push(outcomes.sessionsOutcome.reason);
    }
    if (outcomes.costOutcome.status === "rejected") {
      reasons.push(outcomes.costOutcome.reason);
    }
    return reasons.some((reason) => isLegacyDateInterpretationUnsupportedError(reason));
  };

  const runUsageStatusRequest = async (): Promise<unknown | null> => {
    try {
      return await client.request("usage.status");
    } catch {
      return null;
    }
  };

  const includeDateInterpretation = shouldSendLegacyDateInterpretation(state);
  const statusPromise = runUsageStatusRequest();

  const finalize = async (outcomes: {
    sessionsOutcome: PromiseSettledResult<unknown>;
    costOutcome: PromiseSettledResult<unknown>;
  }) => {
    const sessionsRes =
      outcomes.sessionsOutcome.status === "fulfilled"
        ? ((outcomes.sessionsOutcome.value as SessionsUsageResult) ?? null)
        : null;
    const costRes =
      outcomes.costOutcome.status === "fulfilled"
        ? ((outcomes.costOutcome.value as CostUsageSummary) ?? null)
        : null;

    if (!sessionsRes && !costRes) {
      throw firstRejectedReason(outcomes) ?? new Error("usage requests failed");
    }

    const statusRes = await statusPromise;
    return {
      sessionsRes,
      costRes,
      statusRes: (statusRes as UsageSummary) ?? null,
    };
  };

  const outcomes = await runUsageRequests(includeDateInterpretation);
  if (includeDateInterpretation && isLegacyUnsupported(outcomes)) {
    rememberLegacyDateInterpretation(state);
    const fallbackOutcomes = await runUsageRequests(false);
    return await finalize(fallbackOutcomes);
  }

  return await finalize(outcomes);
}

export async function loadUsage(
  state: UsageState,
  overrides?: {
    startDate?: string;
    endDate?: string;
  },
) {
  const requestedStartDate = overrides?.startDate ?? state.usageStartDate;
  const requestedEndDate = overrides?.endDate ?? state.usageEndDate;
  const normalizedRange = normalizeUsageDateRange(requestedStartDate, requestedEndDate);
  const startDate = normalizedRange.startDate;
  const endDate = normalizedRange.endDate;

  if (state.usageStartDate !== startDate) {
    state.usageStartDate = startDate;
  }
  if (state.usageEndDate !== endDate) {
    state.usageEndDate = endDate;
  }

  if (state.usageLoading) {
    usageReloadQueue.set(state, { startDate, endDate });
    return;
  }

  const client = state.client;
  if (!client || !state.connected) {
    return;
  }

  usageReloadQueue.set(state, null);
  state.usageLoading = true;
  state.usageError = null;
  try {
    const { sessionsRes, costRes, statusRes } = await requestUsageData(state, startDate, endDate);
    if (sessionsRes) {
      state.usageResult = sessionsRes;
    }
    if (costRes) {
      state.usageCostSummary = costRes;
    }
    if (statusRes) {
      state.usageStatus = statusRes;
    }
  } catch (err) {
    state.usageError = toErrorMessage(err);
  } finally {
    state.usageLoading = false;
    const pending = usageReloadQueue.get(state);
    if (pending && (pending.startDate !== startDate || pending.endDate !== endDate)) {
      usageReloadQueue.set(state, null);
      void loadUsage(state, pending);
    }
  }
}

export async function loadOverviewUsage(state: OverviewUsageState) {
  if (state.overviewUsageLoading) {
    return;
  }

  const range7d = lastNUtcDaysRange(7);
  const range24h = localCurrentDayUtcCoverageRange();

  const client = state.client;
  if (!client || !state.connected) {
    return;
  }

  state.overviewUsageLoading = true;
  state.overviewUsageError = null;
  state.overviewUsageSnapshot24hError = null;
  try {
    const [overview7d, overview24h] = await Promise.allSettled([
      requestUsageData(state, range7d.startDate, range7d.endDate),
      requestUsageData(state, range24h.startDate, range24h.endDate),
    ]);

    if (overview7d.status === "fulfilled") {
      const { sessionsRes, costRes, statusRes } = overview7d.value;
      if (sessionsRes) {
        state.overviewUsageResult = sessionsRes;
      }
      if (costRes) {
        state.overviewUsageCostSummary = costRes;
      }
      if (statusRes) {
        state.overviewUsageStatus = statusRes;
      }
    } else {
      state.overviewUsageError = toErrorMessage(overview7d.reason);
    }

    if (overview24h.status === "fulfilled") {
      const { sessionsRes, costRes, statusRes } = overview24h.value;
      if (sessionsRes) {
        state.overviewUsageSnapshot24hResult = sessionsRes;
      }
      if (costRes) {
        state.overviewUsageSnapshot24hCostSummary = costRes;
      }
      if (statusRes) {
        state.overviewUsageSnapshot24hStatus = statusRes;
      }
    } else {
      state.overviewUsageSnapshot24hError = toErrorMessage(overview24h.reason);
    }

    if (!state.overviewUsageError && !state.overviewUsageSnapshot24hError) {
      return;
    }
    if (!state.overviewUsageError && state.overviewUsageSnapshot24hError) {
      state.overviewUsageError = state.overviewUsageSnapshot24hError;
    }
  } finally {
    state.overviewUsageLoading = false;
  }
}

export const __test = {
  buildDateInterpretationParams,
  toErrorMessage,
  isLegacyDateInterpretationUnsupportedError,
  normalizeGatewayCompatibilityKey,
  shouldSendLegacyDateInterpretation,
  rememberLegacyDateInterpretation,
  resetLegacyUsageDateParamsCache: () => {
    legacyUsageDateParamsCache = null;
  },
};

export async function loadSessionTimeSeries(state: UsageState, sessionKey: string) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.usageTimeSeriesLoading) {
    return;
  }
  state.usageTimeSeriesLoading = true;
  state.usageTimeSeries = null;
  try {
    const res = await state.client.request("sessions.usage.timeseries", { key: sessionKey });
    if (res) {
      state.usageTimeSeries = res as SessionUsageTimeSeries;
    }
  } catch {
    state.usageTimeSeries = null;
  } finally {
    state.usageTimeSeriesLoading = false;
  }
}

export async function loadSessionLogs(state: UsageState, sessionKey: string) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.usageSessionLogsLoading) {
    return;
  }
  state.usageSessionLogsLoading = true;
  state.usageSessionLogs = null;
  try {
    const res = await state.client.request("sessions.usage.logs", {
      key: sessionKey,
      limit: 1000,
    });
    if (res && Array.isArray((res as { logs: SessionLogEntry[] }).logs)) {
      state.usageSessionLogs = (res as { logs: SessionLogEntry[] }).logs;
    }
  } catch {
    state.usageSessionLogs = null;
  } finally {
    state.usageSessionLogsLoading = false;
  }
}
