import { html, nothing, type TemplateResult } from "lit";
import "../components/echart-host.ts";
import type { EChartsOption } from "echarts";
import type { DisplayTimeZone } from "./charts/timezone.ts";
import {
  buildOverviewTrendOption,
  buildOverviewUpdatedAtLabel,
  buildUsageActivityTrendOption,
  buildUsageCostDonutOption,
  buildUsageCostMiniTrendOption,
  buildUsageLimitDepletionOption,
  buildUsageTrendOption,
} from "./charts/options.ts";
import { displayTimeZoneLabel, formatForDisplayTz } from "./charts/timezone.ts";
import type { UsageAnalyticsMode } from "./usageTypes.ts";
import type { UsageAnalyticsViewModel, UsageLimitSnapshotEntry } from "./usage-analytics-adapter.ts";

type UsageCostBreakdown = {
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  totalCost: number;
};

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  if (Math.abs(value) >= 100) {
    return `${Math.round(value)}`;
  }
  return `${value.toFixed(1)}`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

function formatFreshness(sec: number): string {
  if (sec < 60) {
    return `${sec}s ago`;
  }
  if (sec < 3600) {
    return `${Math.floor(sec / 60)}m ago`;
  }
  return `${Math.floor(sec / 3600)}h ago`;
}

function formatResetAt(resetAt: string | null, displayTimeZone: DisplayTimeZone): string {
  if (!resetAt) {
    return "n/a";
  }
  const parsed = Date.parse(resetAt);
  if (!Number.isFinite(parsed)) {
    return "n/a";
  }
  return formatForDisplayTz(parsed, displayTimeZone, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceBadge(entry: UsageLimitSnapshotEntry): TemplateResult {
  const cls = entry.source === "provider_api" ? "ok" : entry.source === "scraper" ? "warn" : "muted";
  return html`<span class="usage-analytics-badge ${cls}">${entry.source}</span>`;
}

function confidenceBadge(entry: UsageLimitSnapshotEntry): TemplateResult {
  const cls = entry.confidence === "high" ? "ok" : entry.confidence === "medium" ? "warn" : "danger";
  return html`<span class="usage-analytics-badge ${cls}">${entry.confidence}</span>`;
}

function freshnessBadge(entry: UsageLimitSnapshotEntry): TemplateResult {
  const cls = entry.freshnessSec <= 60 ? "ok" : entry.freshnessSec <= 600 ? "warn" : "danger";
  return html`<span class="usage-analytics-badge ${cls}">${formatFreshness(entry.freshnessSec)}</span>`;
}

function renderNoData(label: string): TemplateResult {
  return html`<div class="usage-chart-empty"><strong>데이터 없음</strong><span>${label}</span></div>`;
}

function renderTopToolsTable(model: UsageAnalyticsViewModel): TemplateResult {
  const tools = model.dimensionSummary.tools.slice(0, 10);
  if (tools.length === 0) {
    return html``;
  }
  return html`
    <div class="usage-analytics-top-tools">
      <div class="usage-analytics-chart-head">
        <div class="usage-analytics-chart-title">Top Tools</div>
        <div class="usage-analytics-chart-sub">Tool call counts from current range</div>
      </div>
      <div class="usage-limits-table-wrap">
        <table class="usage-limits-table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Call Count</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            ${tools.map((tool) => html`
              <tr>
                <td style="font-family:var(--mono);color:var(--text-strong)">${tool.label}</td>
                <td style="font-family:var(--mono)">${tool.toolCallCount.toLocaleString()}</td>
                <td style="font-family:var(--mono);color:var(--muted)">${tool.sessionCount.toLocaleString()}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderChartCard(args: {
  title: string;
  subtitle: string;
  option: EChartsOption | null;
  noDataLabel: string;
  className?: string;
}): TemplateResult {
  const cls = args.className ? `usage-analytics-chart-card ${args.className}` : "usage-analytics-chart-card";
  return html`
    <article class="${cls}">
      <div class="usage-analytics-chart-head">
        <div class="usage-analytics-chart-title">${args.title}</div>
        <div class="usage-analytics-chart-sub">${args.subtitle}</div>
      </div>
      ${
        args.option
          ? html`<oc-echart class="usage-analytics-chart" .option=${args.option}></oc-echart>`
          : renderNoData(args.noDataLabel)
      }
    </article>
  `;
}

function renderLimitsTable(model: UsageAnalyticsViewModel, displayTimeZone: DisplayTimeZone): TemplateResult {
  if (model.usageLimits.length === 0) {
    return html`
      <div class="callout warning" style="margin-top: 10px;">
        데이터 없음: provider usage windows are unavailable. Showing safe fallback with estimate source.
      </div>
    `;
  }

  return html`
    <div class="usage-limits-table-wrap">
      <table class="usage-limits-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Model</th>
            <th>Window</th>
            <th>Used / Limit</th>
            <th>Remaining</th>
            <th>Reset</th>
            <th>Source</th>
            <th>Confidence</th>
            <th>Freshness</th>
          </tr>
        </thead>
        <tbody>
          ${model.usageLimits.map((entry) => {
            const hasLimit = entry.limit > 0;
            const usedLabel = hasLimit
              ? `${entry.used.toFixed(1)}% / ${entry.limit.toFixed(0)}%`
              : `${formatCompactNumber(entry.used)} / n/a`;
            const remainingLabel = hasLimit ? `${entry.remaining.toFixed(1)}%` : "n/a";
            return html`
              <tr>
                <td>${entry.provider}</td>
                <td>${entry.model}</td>
                <td>${entry.windowType}</td>
                <td>${usedLabel}</td>
                <td>${remainingLabel}</td>
                <td>${formatResetAt(entry.resetAt, displayTimeZone)}</td>
                <td>${sourceBadge(entry)}</td>
                <td>${confidenceBadge(entry)}</td>
                <td>${freshnessBadge(entry)}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}

function renderRateLimitByModelGrid(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): TemplateResult {
  if (model.usageLimits.length === 0) {
    return html`
      <div class="callout warning" style="margin-top: 10px;">
        데이터 없음: Rate limit by model snapshot is currently unavailable.
      </div>
    `;
  }

  return html`
    <section class="rate-limit-grid-shell">
      <div class="rate-limit-grid-head">
        <div class="card-title">Rate Limit by Model</div>
        <div class="card-sub">Quick-scan cards with source, confidence, and freshness.</div>
      </div>
      <div class="rate-limit-grid">
        ${model.usageLimits.map((entry) => {
          const hasLimit = entry.limit > 0;
          const usageRatio = hasLimit ? Math.max(0, Math.min(100, (entry.used / entry.limit) * 100)) : 0;
          const usedLabel = hasLimit
            ? `${entry.used.toFixed(1)} / ${entry.limit.toFixed(0)}%`
            : `${formatCompactNumber(entry.used)} / n/a`;
          return html`
            <article class="rate-limit-card">
              <div class="rate-limit-card__head">
                <div>
                  <div class="rate-limit-card__provider">${entry.provider}</div>
                  <div class="rate-limit-card__model">${entry.model}</div>
                </div>
                <div class="rate-limit-card__window">${entry.windowType}</div>
              </div>
              <div class="rate-limit-card__metric">
                <span>${usedLabel}</span>
                <strong>${hasLimit ? `${usageRatio.toFixed(1)}%` : "n/a"}</strong>
              </div>
              <div class="rate-limit-card__progress">
                <span style="width:${hasLimit ? usageRatio.toFixed(2) : 0}%"></span>
              </div>
              <div class="rate-limit-card__meta">
                <span>Reset ${formatResetAt(entry.resetAt, displayTimeZone)}</span>
                <div class="rate-limit-card__badges">
                  ${sourceBadge(entry)}
                  ${confidenceBadge(entry)}
                  ${freshnessBadge(entry)}
                </div>
              </div>
            </article>
          `;
        })}
      </div>
    </section>
  `;
}

function renderUsageModeCharts(args: {
  model: UsageAnalyticsViewModel;
  displayTimeZone: DisplayTimeZone;
  mode: UsageAnalyticsMode;
  costBreakdown: UsageCostBreakdown | null;
}): TemplateResult {
  const { model, displayTimeZone, mode, costBreakdown } = args;
  const hasTrendData = model.trends.length > 0;
  const hasLimitData = model.usageLimits.length > 0;
  const hasCostBreakdown = Boolean(costBreakdown && costBreakdown.totalCost > 0);

  if (mode === "limits") {
    return html`
      <div class="usage-analytics-layout">
        ${renderChartCard({
          title: "Limit Depletion",
          subtitle: "Provider/model utilization",
          option: hasLimitData ? buildUsageLimitDepletionOption(model) : null,
          noDataLabel: "표시할 limit window 데이터가 없습니다.",
          className: "usage-analytics-chart-card--hero",
        })}
        ${renderChartCard({
          title: "Usage Trend",
          subtitle: "Range-linked tokens",
          option: hasTrendData ? buildUsageTrendOption(model, displayTimeZone, "tokens") : null,
          noDataLabel: "선택된 기간의 토큰 추이가 없습니다.",
        })}
      </div>
      ${renderRateLimitByModelGrid(model, displayTimeZone)}
      ${renderLimitsTable(model, displayTimeZone)}
    `;
  }

  if (mode === "activity") {
    return html`
      <div class="usage-analytics-layout usage-analytics-layout--activity">
        ${renderChartCard({
          title: "Sessions Activity",
          subtitle: `Rendered in ${displayTimeZoneLabel(displayTimeZone)}`,
          option:
            hasTrendData && model.health.hasSessionTrend
              ? buildUsageActivityTrendOption(model, displayTimeZone)
              : null,
          noDataLabel: "세션 추이 데이터가 없어 차트를 표시하지 않습니다.",
          className: "usage-analytics-chart-card--hero",
        })}
        <div class="usage-analytics-stack">
          ${renderChartCard({
            title: "Token Trend",
            subtitle: "Actual API trend only",
            option: hasTrendData ? buildUsageTrendOption(model, displayTimeZone, "tokens") : null,
            noDataLabel: "선택된 기간의 토큰 추이가 없습니다.",
          })}
          ${renderChartCard({
            title: "Cost Trend",
            subtitle: "Actual API trend only",
            option: hasTrendData ? buildUsageTrendOption(model, displayTimeZone, "cost") : null,
            noDataLabel: "선택된 기간의 비용 추이가 없습니다.",
          })}
        </div>
      </div>
    `;
  }

  return html`
    <div class="usage-analytics-layout">
      ${renderChartCard({
        title: "Cost Trend",
        subtitle: "Range-linked trend analysis",
        option: hasTrendData ? buildUsageTrendOption(model, displayTimeZone, "cost") : null,
        noDataLabel: "선택된 기간의 비용 추이가 없습니다.",
        className: "usage-analytics-chart-card--hero",
      })}
      <div class="usage-analytics-stack">
        ${renderChartCard({
          title: "Cost Share",
          subtitle: "Donut by token type",
          option: hasCostBreakdown ? buildUsageCostDonutOption(costBreakdown, displayTimeZone) : null,
          noDataLabel: "선택된 기간의 비용 데이터가 없습니다.",
        })}
        ${renderChartCard({
          title: "Mini Cost Trend",
          subtitle: "Compact trend for fast scan",
          option: hasTrendData ? buildUsageCostMiniTrendOption(model, displayTimeZone) : null,
          noDataLabel: "선택된 기간의 비용 추이가 없습니다.",
        })}
      </div>
    </div>
  `;
}

export function renderUsageAnalyticsSections(args: {
  model: UsageAnalyticsViewModel;
  loading: boolean;
  error: string | null;
  displayTimeZone: DisplayTimeZone;
  costBreakdown: UsageCostBreakdown | null;
  usageAnalyticsMode: UsageAnalyticsMode;
  onUsageAnalyticsModeChange: (mode: UsageAnalyticsMode) => void;
}): TemplateResult {
  const { model, loading, error, displayTimeZone, costBreakdown, usageAnalyticsMode } = args;

  return html`
    <section class="card usage-analytics-section usage-analytics-section--main">
      <div class="usage-analytics-toolbar">
        <div>
          <div class="card-title">Usage & Limits</div>
          <div class="card-sub">
            Provider/model windows with source, freshness, confidence. Display: ${displayTimeZoneLabel(
              displayTimeZone,
            )}.
          </div>
        </div>
        <div class="usage-analytics-pills" role="tablist" aria-label="Usage chart mode">
          <button
            class="usage-analytics-pill ${usageAnalyticsMode === "cost" ? "active" : ""}"
            @click=${() => args.onUsageAnalyticsModeChange("cost")}
          >
            Cost
          </button>
          <button
            class="usage-analytics-pill ${usageAnalyticsMode === "limits" ? "active" : ""}"
            @click=${() => args.onUsageAnalyticsModeChange("limits")}
          >
            Limits
          </button>
          <button
            class="usage-analytics-pill ${usageAnalyticsMode === "activity" ? "active" : ""}"
            @click=${() => args.onUsageAnalyticsModeChange("activity")}
          >
            Activity
          </button>
        </div>
      </div>

      ${loading
        ? html`<div class="callout" style="margin-top: 10px;">Loading latest analytics snapshot…</div>`
        : nothing}
      ${error ? html`<div class="callout warning" style="margin-top: 10px;">${error}</div>` : nothing}

      <div class="usage-analytics-kpis">
        <div class="usage-analytics-kpi">
          <div class="usage-analytics-kpi__head">
            <span>Total Tokens</span>
            <span class="usage-analytics-kpi__icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
            </span>
          </div>
          <strong>${formatCompactNumber(model.snapshot.totalTokens)}</strong>
        </div>
        <div class="usage-analytics-kpi">
          <div class="usage-analytics-kpi__head">
            <span>Total Cost</span>
            <span class="usage-analytics-kpi__icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
          </div>
          <strong>${formatUsd(model.snapshot.totalCost)}</strong>
        </div>
        <div class="usage-analytics-kpi">
          <div class="usage-analytics-kpi__head">
            <span>Avg Tokens / Msg</span>
            <span class="usage-analytics-kpi__icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </span>
          </div>
          <strong>${model.snapshot.messageCount > 0 ? formatCompactNumber(Math.round(model.snapshot.totalTokens / model.snapshot.messageCount)) : "—"}</strong>
        </div>
        <div class="usage-analytics-kpi">
          <div class="usage-analytics-kpi__head">
            <span>Avg Cost / Msg</span>
            <span class="usage-analytics-kpi__icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
            </span>
          </div>
          <strong>${model.snapshot.messageCount > 0 ? formatUsd(model.snapshot.totalCost / model.snapshot.messageCount) : "—"}</strong>
        </div>
      </div>

      ${renderUsageModeCharts({
        model,
        displayTimeZone,
        mode: usageAnalyticsMode,
        costBreakdown,
      })}

      ${renderTopToolsTable(model)}
    </section>
  `;
}

function renderOverviewSideSnapshots(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): TemplateResult {
  const topLimits = model.usageLimits.slice(0, 5);
  return html`
    <article class="usage-analytics-chart-card overview-side-snapshot">
      <div class="usage-analytics-chart-head">
        <div class="usage-analytics-chart-title">Limits Snapshot</div>
        <div class="usage-analytics-chart-sub">Top pressure windows</div>
      </div>
      <div class="overview-limit-list">
        ${
          topLimits.length === 0
            ? html`<div class="muted" style="font-size: 12px;">데이터 없음: No limit windows reported.</div>`
            : topLimits.map(
                (entry) => html`
                  <div class="overview-limit-row">
                    <div class="overview-limit-name">${entry.provider}/${entry.model}</div>
                    <div class="overview-limit-used">${entry.used.toFixed(1)}%</div>
                    <div class="overview-limit-badges">
                      ${sourceBadge(entry)}
                      ${confidenceBadge(entry)}
                    </div>
                  </div>
                `,
              )
        }
      </div>
      <div class="overview-side-footnote">Display: ${displayTimeZoneLabel(displayTimeZone)}</div>
    </article>
  `;
}

export function renderOverviewAnalyticsSection(args: {
  model: UsageAnalyticsViewModel;
  loading: boolean;
  error: string | null;
  displayTimeZone: DisplayTimeZone;
}): TemplateResult {
  const { model, loading, error, displayTimeZone } = args;
  const hasTrendData = model.trends.length > 0;
  const hasLimitData = model.usageLimits.length > 0;

  return html`
    <section class="card overview-analytics">
      <div class="overview-analytics-head">
        <div>
          <div class="card-title">Analytics Snapshot</div>
          <div class="card-sub">Usage, limits, and costs from current gateway data contracts.</div>
        </div>
        <div class="overview-analytics-badges">
          <span class="usage-analytics-badge ok">Last 7 days</span>
          <span class="usage-analytics-badge muted">${displayTimeZoneLabel(displayTimeZone)}</span>
        </div>
      </div>
      ${loading ? html`<div class="callout" style="margin-top: 10px;">Loading usage analytics…</div>` : nothing}
      ${error ? html`<div class="callout warning" style="margin-top: 10px;">${error}</div>` : nothing}

      <div class="overview-analytics-grid overview-analytics-grid--kpi">
        <div class="stat">
          <div class="stat-label">Usage Snapshot</div>
          <div class="stat-value">${formatCompactNumber(model.snapshot.totalTokens)}</div>
          <div class="muted">${model.snapshot.totalSessions} sessions in range</div>
        </div>
        <div class="stat">
          <div class="stat-label">Limits Snapshot</div>
          <div class="stat-value">${model.snapshot.limitsTracked}</div>
          <div class="muted">
            ${model.health.hasProviderApiLimits ? "provider_api available" : "estimate-only fallback"}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">Current Cost Snapshot</div>
          <div class="stat-value">${formatUsd(model.snapshot.totalCost)}</div>
          <div class="muted">Updated ${buildOverviewUpdatedAtLabel(model.snapshot.updatedAt, displayTimeZone)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Providers</div>
          <div class="stat-value">${model.snapshot.providersTracked}</div>
          <div class="muted">${model.snapshot.activeModels} active models</div>
        </div>
      </div>

      <div class="overview-analytics-layout">
        ${renderChartCard({
          title: "Overview Trend",
          subtitle: "Fixed 7-day trend",
          option: hasTrendData ? buildOverviewTrendOption(model, displayTimeZone) : null,
          noDataLabel: "최근 7일 추이 데이터가 없습니다.",
          className: "usage-analytics-chart-card--hero",
        })}
        ${renderOverviewSideSnapshots(model, displayTimeZone)}
      </div>

      <div class="overview-analytics-layout overview-analytics-layout--second">
        ${renderChartCard({
          title: "Cost Trend",
          subtitle: `Last 7 days in ${displayTimeZoneLabel(displayTimeZone)}`,
          option: hasTrendData ? buildUsageTrendOption(model, displayTimeZone, "cost") : null,
          noDataLabel: "최근 7일 비용 추이가 없습니다.",
        })}
        ${renderChartCard({
          title: "Limits Pressure",
          subtitle: "Provider/model usage pressure",
          option: hasLimitData ? buildUsageLimitDepletionOption(model) : null,
          noDataLabel: "표시할 limit pressure 데이터가 없습니다.",
        })}
      </div>
    </section>
  `;
}
