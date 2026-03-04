import { z } from "zod";
import type {
  CostUsageSummary,
  SessionsUsageResult,
  UsageSummary,
  SessionsUsageTotals,
} from "../types.ts";
import { localTodayYmd, toLocalYmd } from "./charts/timezone.ts";

export type UsageLimitWindowType = "per-minute" | "per-hour" | "per-day" | "per-month" | "none";
export type UsageLimitSource = "provider_api" | "scraper" | "estimate";
export type UsageLimitConfidence = "high" | "medium" | "low";

export type UsageLimitSnapshotEntry = {
  provider: string;
  model: string;
  windowType: UsageLimitWindowType;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
  source: UsageLimitSource;
  freshnessSec: number;
  confidence: UsageLimitConfidence;
};

export type UsageTrendPoint = {
  date: string;
  tokens: number;
  cost: number;
  sessions: number;
};

export type UsageProviderSummary = {
  provider: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  messageCount: number;
  toolCallCount: number;
  sessionCount: number;
  modelCount: number;
};

export type UsageDimensionKey = "models" | "providers" | "tools" | "agents" | "channels";

export type UsageDimensionSummaryEntry = {
  key: string;
  label: string;
  metric: "tokens" | "toolCalls";
  value: number;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  toolCallCount: number;
  sessionCount: number;
};

export type UsageSourceSummary = {
  source: string;
  label: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  messageCount: number;
  toolCallCount: number;
  sessionCount: number;
};

export type UsageTokenCostBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
};

export type UsageSnapshot24h = {
  timezone: "Local";
  date: string;
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  requestCount: number;
  messageCount: number;
  toolCallCount: number;
  providerSummary: UsageProviderSummary[];
  sourceSummary: UsageSourceSummary[];
  updatedAt: number | null;
  freshnessSec: number;
  source: "session-activity" | "daily-aggregate";
  confidence: UsageLimitConfidence;
  status: "ok" | "partial" | "empty";
  breakdown: UsageTokenCostBreakdown;
};

export type UsageAnalyticsViewModel = {
  usageLimits: UsageLimitSnapshotEntry[];
  trends: UsageTrendPoint[];
  providerSummary: UsageProviderSummary[];
  sourceSummary: UsageSourceSummary[];
  dimensionSummary: Record<UsageDimensionKey, UsageDimensionSummaryEntry[]>;
  snapshot24h: UsageSnapshot24h | null;
  snapshot: {
    totalTokens: number;
    totalCost: number;
    totalSessions: number;
    messageCount: number;
    toolCallCount: number;
    activeModels: number;
    providersTracked: number;
    limitsTracked: number;
    updatedAt: number | null;
    breakdown: UsageTokenCostBreakdown;
  };
  health: {
    hasProviderApiLimits: boolean;
    hasTrendData: boolean;
    hasCostData: boolean;
    hasSessionTrend: boolean;
    schemaValid: boolean;
  };
};

const SessionsUsageTotalsSchema = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number(),
  inputCost: z.number(),
  outputCost: z.number(),
  cacheReadCost: z.number(),
  cacheWriteCost: z.number(),
  missingCostEntries: z.number().nonnegative(),
});

const SessionsByModelSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  count: z.number().nonnegative(),
  totals: SessionsUsageTotalsSchema,
});

const SessionsByChannelSchema = z.object({
  channel: z.string(),
  totals: SessionsUsageTotalsSchema,
});

const SessionsUsageResultSchema = z.object({
  updatedAt: z.number(),
  sessions: z.array(
    z
      .object({
        key: z.string(),
        updatedAt: z.number().optional(),
        usage: z
          .object({
            activityDates: z.array(z.string()).optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  ),
  totals: SessionsUsageTotalsSchema,
  aggregates: z
    .object({
      byModel: z.array(SessionsByModelSchema),
      byProvider: z.array(SessionsByModelSchema).optional(),
      byChannel: z.array(SessionsByChannelSchema).optional(),
      daily: z
        .array(
          z.object({
            date: z.string(),
            tokens: z.number().nonnegative(),
            cost: z.number(),
          }),
        )
        .optional(),
    })
    .passthrough(),
});

const CostUsageSummarySchema = z.object({
  updatedAt: z.number(),
  daily: z.array(
    z.object({
      date: z.string(),
      totalTokens: z.number().nonnegative(),
      totalCost: z.number(),
    }),
  ),
  totals: SessionsUsageTotalsSchema.optional(),
});

const UsageSummarySchema = z.object({
  updatedAt: z.number(),
  providers: z.array(
    z.object({
      provider: z.string(),
      displayName: z.string(),
      windows: z.array(
        z.object({
          label: z.string(),
          usedPercent: z.number(),
          resetAt: z.number().optional(),
        }),
      ),
      error: z.string().optional(),
    }),
  ),
});

const UsageLimitSnapshotEntrySchema = z.object({
  provider: z.string(),
  model: z.string(),
  windowType: z.enum(["per-minute", "per-hour", "per-day", "per-month", "none"]),
  limit: z.number().nonnegative(),
  used: z.number().nonnegative(),
  remaining: z.number().nonnegative(),
  resetAt: z.string().nullable(),
  source: z.enum(["provider_api", "scraper", "estimate"]),
  freshnessSec: z.number().nonnegative(),
  confidence: z.enum(["high", "medium", "low"]),
});

const UsageTrendPointSchema = z.object({
  date: z.string(),
  tokens: z.number().nonnegative(),
  cost: z.number(),
  sessions: z.number().nonnegative(),
});

const UsageProviderSummarySchema = z.object({
  provider: z.string(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number(),
  requestCount: z.number().nonnegative(),
  messageCount: z.number().nonnegative(),
  toolCallCount: z.number().nonnegative(),
  sessionCount: z.number().nonnegative(),
  modelCount: z.number().nonnegative(),
});

const UsageDimensionSummaryEntrySchema = z.object({
  key: z.string(),
  label: z.string(),
  metric: z.enum(["tokens", "toolCalls"]),
  value: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number(),
  messageCount: z.number().nonnegative(),
  toolCallCount: z.number().nonnegative(),
  sessionCount: z.number().nonnegative(),
});

const UsageSourceSummarySchema = z.object({
  source: z.string(),
  label: z.string(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number(),
  requestCount: z.number().nonnegative(),
  messageCount: z.number().nonnegative(),
  toolCallCount: z.number().nonnegative(),
  sessionCount: z.number().nonnegative(),
});

const UsageSnapshot24hSchema = z.object({
  timezone: z.literal("Local"),
  date: z.string(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number(),
  totalSessions: z.number().nonnegative(),
  requestCount: z.number().nonnegative(),
  messageCount: z.number().nonnegative(),
  toolCallCount: z.number().nonnegative(),
  providerSummary: z.array(UsageProviderSummarySchema),
  sourceSummary: z.array(UsageSourceSummarySchema),
  updatedAt: z.number().nullable(),
  freshnessSec: z.number().nonnegative(),
  source: z.enum(["session-activity", "daily-aggregate"]),
  confidence: z.enum(["high", "medium", "low"]),
  status: z.enum(["ok", "partial", "empty"]),
  breakdown: z.object({
    inputTokens: z.number().nonnegative(),
    outputTokens: z.number().nonnegative(),
    cacheReadTokens: z.number().nonnegative(),
    cacheWriteTokens: z.number().nonnegative(),
    inputCost: z.number(),
    outputCost: z.number(),
    cacheReadCost: z.number(),
    cacheWriteCost: z.number(),
  }),
});

const UsageAnalyticsViewModelSchema = z.object({
  usageLimits: z.array(UsageLimitSnapshotEntrySchema),
  trends: z.array(UsageTrendPointSchema),
  providerSummary: z.array(UsageProviderSummarySchema),
  sourceSummary: z.array(UsageSourceSummarySchema),
  dimensionSummary: z.object({
    models: z.array(UsageDimensionSummaryEntrySchema),
    providers: z.array(UsageDimensionSummaryEntrySchema),
    tools: z.array(UsageDimensionSummaryEntrySchema),
    agents: z.array(UsageDimensionSummaryEntrySchema),
    channels: z.array(UsageDimensionSummaryEntrySchema),
  }),
  snapshot24h: UsageSnapshot24hSchema.nullable(),
  snapshot: z.object({
    totalTokens: z.number().nonnegative(),
    totalCost: z.number(),
    totalSessions: z.number().nonnegative(),
    messageCount: z.number().nonnegative(),
    toolCallCount: z.number().nonnegative(),
    activeModels: z.number().nonnegative(),
    providersTracked: z.number().nonnegative(),
    limitsTracked: z.number().nonnegative(),
    updatedAt: z.number().nullable(),
    breakdown: z.object({
      inputTokens: z.number().nonnegative(),
      outputTokens: z.number().nonnegative(),
      cacheReadTokens: z.number().nonnegative(),
      cacheWriteTokens: z.number().nonnegative(),
      inputCost: z.number(),
      outputCost: z.number(),
      cacheReadCost: z.number(),
      cacheWriteCost: z.number(),
    }),
  }),
  health: z.object({
    hasProviderApiLimits: z.boolean(),
    hasTrendData: z.boolean(),
    hasCostData: z.boolean(),
    hasSessionTrend: z.boolean(),
    schemaValid: z.boolean(),
  }),
});

const EMPTY_TOTALS: SessionsUsageTotals = {
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
};

const EMPTY_VIEW_MODEL: UsageAnalyticsViewModel = {
  usageLimits: [],
  trends: [],
  providerSummary: [],
  sourceSummary: [],
  dimensionSummary: {
    models: [],
    providers: [],
    tools: [],
    agents: [],
    channels: [],
  },
  snapshot24h: null,
  snapshot: {
    totalTokens: 0,
    totalCost: 0,
    totalSessions: 0,
    messageCount: 0,
    toolCallCount: 0,
    activeModels: 0,
    providersTracked: 0,
    limitsTracked: 0,
    updatedAt: null,
    breakdown: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheWriteCost: 0,
    },
  },
  health: {
    hasProviderApiLimits: false,
    hasTrendData: false,
    hasCostData: false,
    hasSessionTrend: false,
    schemaValid: false,
  },
};

type BuildUsageAnalyticsViewModelArgs = {
  usageResult: SessionsUsageResult | null;
  usageCostSummary: CostUsageSummary | null;
  usageStatus: UsageSummary | null;
  overviewUsage24hResult?: SessionsUsageResult | null;
  overviewUsage24hCostSummary?: CostUsageSummary | null;
  overviewUsage24hStatus?: UsageSummary | null;
  rangeKey?: string;
};

type UsageVmCacheEntry = {
  usageResultRef: SessionsUsageResult | null;
  usageCostSummaryRef: CostUsageSummary | null;
  usageStatusRef: UsageSummary | null;
  overviewUsage24hResultRef: SessionsUsageResult | null | undefined;
  overviewUsage24hCostSummaryRef: CostUsageSummary | null | undefined;
  overviewUsage24hStatusRef: UsageSummary | null | undefined;
  rangeKey: string;
  result: UsageAnalyticsViewModel;
};

const USAGE_VM_CACHE_MAX_ENTRIES = 6;
const usageVmCache: UsageVmCacheEntry[] = [];

function getCachedUsageVm(args: BuildUsageAnalyticsViewModelArgs): UsageAnalyticsViewModel | null {
  const rangeKey = args.rangeKey ?? "";
  const hit = usageVmCache.find(
    (entry) =>
      entry.usageResultRef === args.usageResult &&
      entry.usageCostSummaryRef === args.usageCostSummary &&
      entry.usageStatusRef === args.usageStatus &&
      entry.overviewUsage24hResultRef === args.overviewUsage24hResult &&
      entry.overviewUsage24hCostSummaryRef === args.overviewUsage24hCostSummary &&
      entry.overviewUsage24hStatusRef === args.overviewUsage24hStatus &&
      entry.rangeKey === rangeKey,
  );
  return hit?.result ?? null;
}

function cacheUsageVm(args: BuildUsageAnalyticsViewModelArgs, result: UsageAnalyticsViewModel) {
  usageVmCache.unshift({
    usageResultRef: args.usageResult,
    usageCostSummaryRef: args.usageCostSummary,
    usageStatusRef: args.usageStatus,
    overviewUsage24hResultRef: args.overviewUsage24hResult,
    overviewUsage24hCostSummaryRef: args.overviewUsage24hCostSummary,
    overviewUsage24hStatusRef: args.overviewUsage24hStatus,
    rangeKey: args.rangeKey ?? "",
    result,
  });
  if (usageVmCache.length > USAGE_VM_CACHE_MAX_ENTRIES) {
    usageVmCache.length = USAGE_VM_CACHE_MAX_ENTRIES;
  }
}

function normalizeProvider(value: string | undefined): string {
  if (!value) {
    return "unknown";
  }
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function mapProviderToUsageStatusKey(value: string): string {
  const normalized = normalizeProvider(value);
  if (normalized === "openai") {
    return "openai-codex";
  }
  if (normalized === "google" || normalized === "gemini") {
    return "google-gemini-cli";
  }
  if (normalized === "github" || normalized === "copilot" || normalized === "github-copilot") {
    return "github-copilot";
  }
  return normalized;
}

function inferWindowType(windowLabel: string): UsageLimitWindowType {
  const normalized = windowLabel.toLowerCase();
  if (normalized.includes("minute") || normalized.includes("min")) {
    return "per-minute";
  }
  if (normalized.includes("hour") || normalized.includes("hr") || normalized.endsWith("h")) {
    return "per-hour";
  }
  if (normalized.includes("day") || normalized.endsWith("d") || normalized.includes("week")) {
    return "per-day";
  }
  if (
    normalized.includes("month") ||
    normalized.includes("billing") ||
    normalized.includes("cycle")
  ) {
    return "per-month";
  }
  return "none";
}

function freshnessFromUpdatedAt(updatedAt: number | null, now = Date.now()): number {
  if (!updatedAt) {
    return 0;
  }
  return Math.max(0, Math.floor((now - updatedAt) / 1000));
}

function dateFromTimestamp(ts?: number): string | null {
  if (!ts || !Number.isFinite(ts)) {
    return null;
  }
  return new Date(ts).toISOString();
}

function bestUsageWindow(
  windows: Array<{ label: string; usedPercent: number; resetAt?: number }>,
): { label: string; usedPercent: number; resetAt?: number } | null {
  if (!windows.length) {
    return null;
  }
  const ranked = [...windows].toSorted((a, b) => {
    const rank = (value: string) => {
      const type = inferWindowType(value);
      if (type === "per-minute") {
        return 0;
      }
      if (type === "per-hour") {
        return 1;
      }
      if (type === "per-day") {
        return 2;
      }
      if (type === "per-month") {
        return 3;
      }
      return 4;
    };
    return rank(a.label) - rank(b.label);
  });
  return ranked[0] ?? null;
}

function summarizeProvidersFromSessions(
  sessions: SessionsUsageResult["sessions"],
  fallbackByProvider: SessionsUsageResult["aggregates"]["byProvider"] = [],
): UsageProviderSummary[] {
  const byProvider = new Map<
    string,
    {
      provider: string;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      messageCount: number;
      toolCallCount: number;
      sessionCount: number;
      models: Set<string>;
    }
  >();

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage) {
      continue;
    }
    const provider = normalizeProvider(session.modelProvider ?? session.providerOverride);
    const row = byProvider.get(provider) ?? {
      provider,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      messageCount: 0,
      toolCallCount: 0,
      sessionCount: 0,
      models: new Set<string>(),
    };
    row.totalTokens += Math.max(0, usage.totalTokens ?? 0);
    row.totalCost += usage.totalCost ?? 0;
    row.requestCount += Math.max(0, usage.messageCounts?.total ?? 0);
    row.messageCount += Math.max(0, usage.messageCounts?.total ?? 0);
    row.toolCallCount += Math.max(0, usage.messageCounts?.toolCalls ?? usage.toolUsage?.totalCalls ?? 0);
    row.sessionCount += 1;
    row.models.add((session.model ?? "unknown").trim() || "unknown");
    byProvider.set(provider, row);
  }

  if (byProvider.size === 0) {
    for (const row of fallbackByProvider) {
      const provider = normalizeProvider(row.provider);
      const next = byProvider.get(provider) ?? {
        provider,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
        models: new Set<string>(),
      };
      next.totalTokens += Math.max(0, row.totals.totalTokens);
      next.totalCost += row.totals.totalCost;
      next.requestCount += Math.max(0, row.count ?? 0);
      next.messageCount += Math.max(0, row.count ?? 0);
      next.sessionCount += Math.max(0, row.count ?? 0);
      next.models.add((row.model ?? "unknown").trim() || "unknown");
      byProvider.set(provider, next);
    }
  }

  return Array.from(byProvider.values())
    .map((row) => ({
      provider: row.provider,
      totalTokens: row.totalTokens,
      totalCost: row.totalCost,
      requestCount: row.requestCount,
      messageCount: row.messageCount,
      toolCallCount: row.toolCallCount,
      sessionCount: row.sessionCount,
      modelCount: row.models.size,
    }))
    .toSorted((a, b) => {
      if (a.totalTokens !== b.totalTokens) {
        return b.totalTokens - a.totalTokens;
      }
      return a.provider.localeCompare(b.provider);
    });
}

function toTitleLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function classifyUsageSource(channelLike: string | undefined): { source: string; label: string } {
  const normalized = normalizeProvider(channelLike);
  if (!normalized || normalized === "unknown") {
    return { source: "other", label: "Other" };
  }
  const messagingChannels = new Set([
    "chat",
    "slack",
    "discord",
    "telegram",
    "whatsapp",
    "signal",
    "imessage",
    "google-chat",
    "googlechat",
    "msteams",
    "teams",
    "line",
    "wechat",
    "facebook",
    "messenger",
    "matrix",
    "nostr",
  ]);
  if (normalized.includes("cron") || normalized.includes("scheduler")) {
    return { source: "cron", label: "Cron" };
  }
  if (messagingChannels.has(normalized) || normalized.includes("chat")) {
    return { source: "chat", label: "Chat" };
  }
  if (normalized.includes("api") || normalized.includes("http") || normalized.includes("webhook")) {
    return { source: "api", label: "API" };
  }
  if (normalized.includes("agent")) {
    return { source: "agent", label: "Agent" };
  }
  if (normalized.includes("system") || normalized.includes("internal")) {
    return { source: "system", label: "System" };
  }
  return {
    source: normalized,
    label: toTitleLabel(normalized),
  };
}

function summarizeSourcesFromSessions(
  sessions: SessionsUsageResult["sessions"],
  fallbackByChannel: SessionsUsageResult["aggregates"]["byChannel"] = [],
): UsageSourceSummary[] {
  const bySource = new Map<
    string,
    {
      source: string;
      label: string;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      messageCount: number;
      toolCallCount: number;
      sessionCount: number;
    }
  >();

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage) {
      continue;
    }
    const sourceHint =
      (typeof session.channel === "string" && session.channel.trim()) ||
      (typeof session.origin?.surface === "string" && session.origin.surface.trim()) ||
      "unknown";
    const source = classifyUsageSource(sourceHint);
    const row = bySource.get(source.source) ?? {
      source: source.source,
      label: source.label,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      messageCount: 0,
      toolCallCount: 0,
      sessionCount: 0,
    };
    row.totalTokens += Math.max(0, usage.totalTokens ?? 0);
    row.totalCost += usage.totalCost ?? 0;
    row.requestCount += Math.max(0, usage.messageCounts?.total ?? 0);
    row.messageCount += Math.max(0, usage.messageCounts?.total ?? 0);
    row.toolCallCount += Math.max(0, usage.messageCounts?.toolCalls ?? usage.toolUsage?.totalCalls ?? 0);
    row.sessionCount += 1;
    bySource.set(source.source, row);
  }

  if (bySource.size === 0) {
    for (const row of fallbackByChannel) {
      const source = classifyUsageSource(row.channel);
      const next = bySource.get(source.source) ?? {
        source: source.source,
        label: source.label,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
      };
      next.totalTokens += Math.max(0, row.totals.totalTokens);
      next.totalCost += row.totals.totalCost ?? 0;
      next.messageCount += 0;
      next.toolCallCount += 0;
      bySource.set(source.source, next);
    }
  }

  return Array.from(bySource.values()).toSorted((a, b) => {
    if (a.totalTokens !== b.totalTokens) {
      return b.totalTokens - a.totalTokens;
    }
    return a.label.localeCompare(b.label);
  });
}

function toDimensionRows(
  map: Map<string, UsageDimensionSummaryEntry>,
  metric: "tokens" | "toolCalls",
): UsageDimensionSummaryEntry[] {
  return Array.from(map.values())
    .map((row) => ({
      ...row,
      metric,
      value: metric === "tokens" ? Math.max(0, row.totalTokens) : Math.max(0, row.toolCallCount),
    }))
    .filter((row) => row.value > 0 || row.totalCost > 0 || row.messageCount > 0)
    .toSorted((a, b) => b.value - a.value || b.totalCost - a.totalCost || a.label.localeCompare(b.label));
}

function buildDimensionSummary(
  usageResult: SessionsUsageResult | null,
): Record<UsageDimensionKey, UsageDimensionSummaryEntry[]> {
  const empty: Record<UsageDimensionKey, UsageDimensionSummaryEntry[]> = {
    models: [],
    providers: [],
    tools: [],
    agents: [],
    channels: [],
  };
  if (!usageResult) {
    return empty;
  }

  const modelMap = new Map<string, UsageDimensionSummaryEntry>();
  const providerMap = new Map<string, UsageDimensionSummaryEntry>();
  const agentMap = new Map<string, UsageDimensionSummaryEntry>();
  const channelMap = new Map<string, UsageDimensionSummaryEntry>();
  const toolMap = new Map<string, UsageDimensionSummaryEntry>();

  for (const session of usageResult.sessions ?? []) {
    const usage = session.usage;
    if (!usage) {
      continue;
    }
    const messages = Math.max(0, usage.messageCounts?.total ?? 0);
    const toolCalls = Math.max(0, usage.messageCounts?.toolCalls ?? usage.toolUsage?.totalCalls ?? 0);
    const modelProvider = normalizeProvider(session.modelProvider ?? session.providerOverride);
    const modelName = (session.model ?? "unknown").trim() || "unknown";
    const modelKey = `${modelProvider}/${modelName}`;
    const providerKey = modelProvider;
    const agentKey = (session.agentId ?? "unknown").trim() || "unknown";
    const channelKey =
      (typeof session.channel === "string" && session.channel.trim()) ||
      (typeof session.origin?.surface === "string" && session.origin.surface.trim()) ||
      "unknown";

    const upsert = (target: Map<string, UsageDimensionSummaryEntry>, key: string, label: string) => {
      const row = target.get(key) ?? {
        key,
        label,
        metric: "tokens",
        value: 0,
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
      };
      row.totalTokens += Math.max(0, usage.totalTokens ?? 0);
      row.totalCost += usage.totalCost ?? 0;
      row.messageCount += messages;
      row.toolCallCount += toolCalls;
      row.sessionCount += 1;
      target.set(key, row);
    };

    upsert(modelMap, modelKey, modelKey);
    upsert(providerMap, providerKey, providerKey);
    upsert(agentMap, agentKey, agentKey);
    upsert(channelMap, channelKey, channelKey);

    for (const tool of usage.toolUsage?.tools ?? []) {
      const key = (tool.name ?? "unknown").trim() || "unknown";
      const row = toolMap.get(key) ?? {
        key,
        label: key,
        metric: "toolCalls",
        value: 0,
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
      };
      row.toolCallCount += Math.max(0, tool.count ?? 0);
      row.sessionCount += 1;
      toolMap.set(key, row);
    }
  }

  if (!modelMap.size) {
    for (const row of usageResult.aggregates.byModel ?? []) {
      const provider = normalizeProvider(row.provider);
      const model = (row.model ?? "unknown").trim() || "unknown";
      const key = `${provider}/${model}`;
      modelMap.set(key, {
        key,
        label: key,
        metric: "tokens",
        value: 0,
        totalTokens: Math.max(0, row.totals.totalTokens),
        totalCost: row.totals.totalCost ?? 0,
        messageCount: Math.max(0, row.count ?? 0),
        toolCallCount: 0,
        sessionCount: Math.max(0, row.count ?? 0),
      });
    }
  }
  if (!providerMap.size) {
    for (const row of usageResult.aggregates.byProvider ?? []) {
      const key = normalizeProvider(row.provider);
      providerMap.set(key, {
        key,
        label: key,
        metric: "tokens",
        value: 0,
        totalTokens: Math.max(0, row.totals.totalTokens),
        totalCost: row.totals.totalCost ?? 0,
        messageCount: Math.max(0, row.count ?? 0),
        toolCallCount: 0,
        sessionCount: Math.max(0, row.count ?? 0),
      });
    }
  }
  if (!agentMap.size) {
    for (const row of usageResult.aggregates.byAgent ?? []) {
      const key = (row.agentId ?? "unknown").trim() || "unknown";
      agentMap.set(key, {
        key,
        label: key,
        metric: "tokens",
        value: 0,
        totalTokens: Math.max(0, row.totals.totalTokens),
        totalCost: row.totals.totalCost ?? 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
      });
    }
  }
  if (!channelMap.size) {
    for (const row of usageResult.aggregates.byChannel ?? []) {
      const key = (row.channel ?? "unknown").trim() || "unknown";
      channelMap.set(key, {
        key,
        label: key,
        metric: "tokens",
        value: 0,
        totalTokens: Math.max(0, row.totals.totalTokens),
        totalCost: row.totals.totalCost ?? 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
      });
    }
  }
  if (!toolMap.size) {
    for (const tool of usageResult.aggregates.tools?.tools ?? []) {
      const key = (tool.name ?? "unknown").trim() || "unknown";
      toolMap.set(key, {
        key,
        label: key,
        metric: "toolCalls",
        value: 0,
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        toolCallCount: Math.max(0, tool.count ?? 0),
        sessionCount: 0,
      });
    }
  }

  return {
    models: toDimensionRows(modelMap, "tokens"),
    providers: toDimensionRows(providerMap, "tokens"),
    tools: toDimensionRows(toolMap, "toolCalls"),
    agents: toDimensionRows(agentMap, "tokens"),
    channels: toDimensionRows(channelMap, "tokens"),
  };
}

function buildLocalSnapshot24h(args: {
  usageResult: SessionsUsageResult | null;
  costSummary: CostUsageSummary | null;
  updatedAt: number | null;
  now: number;
}): UsageSnapshot24h | null {
  const targetDate = localTodayYmd(args.now);
  const usageResult = args.usageResult;
  const costSummary = args.costSummary;

  const sessionsForToday = (usageResult?.sessions ?? []).filter((session) => {
    const usage = session.usage;
    const lastActivity = usage?.lastActivity ?? session.updatedAt;
    if (lastActivity && Number.isFinite(lastActivity)) {
      return toLocalYmd(lastActivity) === targetDate;
    }
    return false;
  });

  if (sessionsForToday.length > 0) {
    const providerSummary = summarizeProvidersFromSessions(sessionsForToday);
    const sourceSummary = summarizeSourcesFromSessions(sessionsForToday);
    const totals = sessionsForToday.reduce(
      (acc, session) => {
        const usage = session.usage;
        if (!usage) {
          return acc;
        }
        acc.totalTokens += Math.max(0, usage.totalTokens ?? 0);
        acc.totalCost += usage.totalCost ?? 0;
        acc.requestCount += Math.max(0, usage.messageCounts?.total ?? 0);
        acc.messageCount += Math.max(0, usage.messageCounts?.total ?? 0);
        acc.toolCallCount += Math.max(0, usage.messageCounts?.toolCalls ?? usage.toolUsage?.totalCalls ?? 0);
        acc.inputTokens += Math.max(0, usage.input ?? 0);
        acc.outputTokens += Math.max(0, usage.output ?? 0);
        acc.cacheReadTokens += Math.max(0, usage.cacheRead ?? 0);
        acc.cacheWriteTokens += Math.max(0, usage.cacheWrite ?? 0);
        acc.inputCost += usage.inputCost ?? 0;
        acc.outputCost += usage.outputCost ?? 0;
        acc.cacheReadCost += usage.cacheReadCost ?? 0;
        acc.cacheWriteCost += usage.cacheWriteCost ?? 0;
        return acc;
      },
      {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        messageCount: 0,
        toolCallCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        inputCost: 0,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
    );
    return {
      timezone: "Local",
      date: targetDate,
      totalTokens: totals.totalTokens,
      totalCost: totals.totalCost,
      totalSessions: sessionsForToday.length,
      requestCount: totals.requestCount,
      messageCount: totals.messageCount,
      toolCallCount: totals.toolCallCount,
      providerSummary,
      sourceSummary,
      updatedAt: args.updatedAt,
      freshnessSec: freshnessFromUpdatedAt(args.updatedAt, args.now),
      source: "session-activity",
      confidence: "high",
      status: "ok",
      breakdown: {
        inputTokens: totals.inputTokens,
        outputTokens: totals.outputTokens,
        cacheReadTokens: totals.cacheReadTokens,
        cacheWriteTokens: totals.cacheWriteTokens,
        inputCost: totals.inputCost,
        outputCost: totals.outputCost,
        cacheReadCost: totals.cacheReadCost,
        cacheWriteCost: totals.cacheWriteCost,
      },
    };
  }

  const fallbackDay = costSummary?.daily.find((day) => day.date === targetDate);
  if (!fallbackDay) {
    return {
      timezone: "Local",
      date: targetDate,
      totalTokens: 0,
      totalCost: 0,
      totalSessions: 0,
      requestCount: 0,
      messageCount: 0,
      toolCallCount: 0,
      providerSummary: [],
      sourceSummary: [],
      updatedAt: args.updatedAt,
      freshnessSec: freshnessFromUpdatedAt(args.updatedAt, args.now),
      source: "daily-aggregate",
      confidence: "low",
      status: "empty",
      breakdown: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        inputCost: 0,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
    };
  }

  return {
    timezone: "Local",
    date: targetDate,
    totalTokens: Math.max(0, fallbackDay.totalTokens),
    totalCost: fallbackDay.totalCost ?? 0,
    totalSessions: 0,
    requestCount: 0,
    messageCount: 0,
    toolCallCount: 0,
    providerSummary: [],
    sourceSummary: [],
    updatedAt: args.updatedAt,
    freshnessSec: freshnessFromUpdatedAt(args.updatedAt, args.now),
    source: "daily-aggregate",
    confidence: "medium",
    status: "partial",
    breakdown: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheWriteCost: 0,
    },
  };
}

export function buildUsageAnalyticsViewModel(args: BuildUsageAnalyticsViewModelArgs): UsageAnalyticsViewModel {
  const cached = getCachedUsageVm(args);
  if (cached) {
    return cached;
  }

  const now = Date.now();
  const parsedUsage = SessionsUsageResultSchema.safeParse(args.usageResult);
  const parsedCost = CostUsageSummarySchema.safeParse(args.usageCostSummary);
  const parsedStatus = UsageSummarySchema.safeParse(args.usageStatus);
  const parsedOverviewUsage24h = SessionsUsageResultSchema.safeParse(args.overviewUsage24hResult);
  const parsedOverviewCost24h = CostUsageSummarySchema.safeParse(args.overviewUsage24hCostSummary);
  const parsedOverviewStatus24h = UsageSummarySchema.safeParse(args.overviewUsage24hStatus);

  const usageResult = parsedUsage.success ? parsedUsage.data : null;
  const costSummary = parsedCost.success ? parsedCost.data : null;
  const statusSummary = parsedStatus.success ? parsedStatus.data : null;
  const overviewUsage24hResult = parsedOverviewUsage24h.success ? parsedOverviewUsage24h.data : null;
  const overviewCost24hSummary = parsedOverviewCost24h.success ? parsedOverviewCost24h.data : null;
  const overviewStatus24hSummary = parsedOverviewStatus24h.success ? parsedOverviewStatus24h.data : null;

  const latestUpdatedAt = [
    usageResult?.updatedAt,
    costSummary?.updatedAt,
    statusSummary?.updatedAt,
    overviewUsage24hResult?.updatedAt,
    overviewCost24hSummary?.updatedAt,
    overviewStatus24hSummary?.updatedAt,
  ]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .reduce<number | null>((max, value) => (max == null || value > max ? value : max), null);

  const statusByProvider = new Map<
    string,
    { provider: string; displayName: string; windows: Array<{ label: string; usedPercent: number; resetAt?: number }> }
  >();
  for (const provider of statusSummary?.providers ?? []) {
    statusByProvider.set(normalizeProvider(provider.provider), provider);
  }

  const usageLimits: UsageLimitSnapshotEntry[] = [];
  const seenProviderModels = new Set<string>();

  for (const modelUsage of usageResult?.aggregates.byModel ?? []) {
    const provider = normalizeProvider(modelUsage.provider);
    const providerKey = mapProviderToUsageStatusKey(provider);
    const model = (modelUsage.model ?? "unknown").trim() || "unknown";
    const uniqueKey = `${provider}:${model}`;
    if (seenProviderModels.has(uniqueKey)) {
      continue;
    }
    seenProviderModels.add(uniqueKey);

    const providerStatus = statusByProvider.get(providerKey) ?? statusByProvider.get(provider);
    const window = providerStatus ? bestUsageWindow(providerStatus.windows) : null;

    if (window) {
      const used = Math.max(0, Math.min(100, window.usedPercent));
      const limit = 100;
      usageLimits.push({
        provider,
        model,
        windowType: inferWindowType(window.label),
        limit,
        used,
        remaining: Math.max(0, limit - used),
        resetAt: dateFromTimestamp(window.resetAt),
        source: "provider_api",
        freshnessSec: freshnessFromUpdatedAt(statusSummary?.updatedAt ?? latestUpdatedAt, now),
        confidence: "high",
      });
      continue;
    }

  }

  for (const providerStatus of statusSummary?.providers ?? []) {
    const provider = normalizeProvider(providerStatus.provider);
    const uniqueKey = `${provider}:unknown`;
    if (seenProviderModels.has(uniqueKey)) {
      continue;
    }
    const window = bestUsageWindow(providerStatus.windows);
    if (!window) {
      continue;
    }
    seenProviderModels.add(uniqueKey);
    const used = Math.max(0, Math.min(100, window.usedPercent));
    const limit = 100;
    usageLimits.push({
      provider,
      model: "unknown",
      windowType: inferWindowType(window.label),
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetAt: dateFromTimestamp(window.resetAt),
      source: "provider_api",
      freshnessSec: freshnessFromUpdatedAt(statusSummary.updatedAt, now),
      confidence: "high",
    });
  }

  usageLimits.sort((a, b) => {
    if (a.source !== b.source) {
      return a.source === "provider_api" ? -1 : 1;
    }
    if (a.limit > 0 && b.limit > 0) {
      const aRatio = a.used / a.limit;
      const bRatio = b.used / b.limit;
      if (aRatio !== bRatio) {
        return bRatio - aRatio;
      }
    }
    return `${a.provider}:${a.model}`.localeCompare(`${b.provider}:${b.model}`);
  });

  const dailyCost = new Map<string, { tokens: number; cost: number }>();
  for (const day of costSummary?.daily ?? []) {
    dailyCost.set(day.date, { tokens: day.totalTokens, cost: day.totalCost });
  }
  for (const day of usageResult?.aggregates.daily ?? []) {
    if (!dailyCost.has(day.date)) {
      dailyCost.set(day.date, { tokens: day.tokens, cost: day.cost });
    }
  }

  const dailySessions = new Map<string, Set<string>>();
  for (const session of usageResult?.sessions ?? []) {
    const activityDates = session.usage?.activityDates ?? [];
    if (activityDates.length) {
      for (const date of activityDates) {
        const key = date.trim();
        if (!key) {
          continue;
        }
        const current = dailySessions.get(key) ?? new Set<string>();
        current.add(session.key);
        dailySessions.set(key, current);
      }
      continue;
    }
    if (session.updatedAt) {
      const date = new Date(session.updatedAt).toISOString().slice(0, 10);
      const current = dailySessions.get(date) ?? new Set<string>();
      current.add(session.key);
      dailySessions.set(date, current);
    }
  }

  const allTrendDates = new Set<string>([...dailyCost.keys(), ...dailySessions.keys()]);
  const trends = Array.from(allTrendDates)
    .toSorted()
    .map((date) => {
      const dayCost = dailyCost.get(date);
      const sessions = dailySessions.get(date)?.size ?? 0;
      return {
        date,
        tokens: dayCost?.tokens ?? 0,
        cost: dayCost?.cost ?? 0,
        sessions,
      };
    });

  const byModel = usageResult?.aggregates.byModel ?? [];
  const providers = new Set<string>();
  for (const row of usageResult?.aggregates.byProvider ?? []) {
    if (row.provider) {
      providers.add(normalizeProvider(row.provider));
    }
  }
  for (const provider of statusSummary?.providers ?? []) {
    providers.add(normalizeProvider(provider.provider));
  }

  const totals = costSummary?.totals ?? usageResult?.totals ?? EMPTY_TOTALS;
  const providerSummary = summarizeProvidersFromSessions(
    usageResult?.sessions ?? [],
    usageResult?.aggregates.byProvider ?? [],
  );
  const sourceSummary = summarizeSourcesFromSessions(
    usageResult?.sessions ?? [],
    usageResult?.aggregates.byChannel ?? [],
  );
  const dimensionSummary = buildDimensionSummary(usageResult);
  const snapshot24h = buildLocalSnapshot24h({
    usageResult: overviewUsage24hResult,
    costSummary: overviewCost24hSummary,
    updatedAt: latestUpdatedAt,
    now,
  });
  const messageCount = Math.max(
    0,
    usageResult?.aggregates.messages?.total ??
      usageResult?.sessions.reduce((acc, session) => acc + Math.max(0, session.usage?.messageCounts?.total ?? 0), 0) ??
      0,
  );
  const toolCallCount = Math.max(
    0,
    usageResult?.aggregates.messages?.toolCalls ??
      usageResult?.aggregates.tools?.totalCalls ??
      usageResult?.sessions.reduce(
        (acc, session) =>
          acc + Math.max(0, session.usage?.messageCounts?.toolCalls ?? session.usage?.toolUsage?.totalCalls ?? 0),
        0,
      ) ??
      0,
  );
  const viewModel: UsageAnalyticsViewModel = {
    usageLimits,
    trends,
    providerSummary,
    sourceSummary,
    dimensionSummary,
    snapshot24h,
    snapshot: {
      totalTokens: Math.max(0, totals.totalTokens),
      totalCost: totals.totalCost,
      totalSessions: usageResult?.sessions.length ?? 0,
      messageCount,
      toolCallCount,
      activeModels: new Set(byModel.map((row) => row.model ?? "unknown")).size,
      providersTracked: providers.size,
      limitsTracked: usageLimits.length,
      updatedAt: latestUpdatedAt,
      breakdown: {
        inputTokens: Math.max(0, totals.input ?? 0),
        outputTokens: Math.max(0, totals.output ?? 0),
        cacheReadTokens: Math.max(0, totals.cacheRead ?? 0),
        cacheWriteTokens: Math.max(0, totals.cacheWrite ?? 0),
        inputCost: totals.inputCost ?? 0,
        outputCost: totals.outputCost ?? 0,
        cacheReadCost: totals.cacheReadCost ?? 0,
        cacheWriteCost: totals.cacheWriteCost ?? 0,
      },
    },
    health: {
      hasProviderApiLimits: usageLimits.some((entry) => entry.source === "provider_api"),
      hasTrendData: trends.length > 0,
      hasCostData: Math.abs(totals.totalCost) > 0 || trends.some((point) => point.cost > 0),
      hasSessionTrend: trends.some((point) => point.sessions > 0),
      schemaValid:
        parsedUsage.success &&
        parsedCost.success &&
        (args.overviewUsage24hResult == null || parsedOverviewUsage24h.success) &&
        (args.overviewUsage24hCostSummary == null || parsedOverviewCost24h.success),
    },
  };

  const validated = UsageAnalyticsViewModelSchema.safeParse(viewModel);
  if (!validated.success) {
    cacheUsageVm(args, EMPTY_VIEW_MODEL);
    return EMPTY_VIEW_MODEL;
  }

  cacheUsageVm(args, validated.data);
  return validated.data;
}
