import { html, nothing, type TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import "../components/echart-host.ts";
import { buildReactTokenUsageBarOption } from "./charts/options.ts";
import { displayTimeZoneLabel } from "./charts/timezone.ts";
import type {
  SessionLogEntry,
  SessionLogRole,
  UsageColumnId,
  UsageProps,
  UsageSourceDimension,
} from "./usageTypes.ts";

export type { UsageColumnId, SessionLogEntry, SessionLogRole };

const SOURCE_COLORS = [
  "var(--react-cost-color-1)",
  "var(--react-cost-color-2)",
  "var(--react-cost-color-3)",
  "var(--react-cost-color-4)",
  "#6ee7b7",
  "#9ca3af",
] as const;

const SOURCE_DIMENSIONS: Array<{ key: UsageSourceDimension; label: string }> = [
  { key: "models", label: "Models" },
  { key: "providers", label: "Providers" },
  { key: "tools", label: "Tools" },
  { key: "agents", label: "Agents" },
  { key: "channels", label: "Channels" },
];

const RANGE_PRESETS: Array<{ key: UsageProps["rangePreset"]; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "custom", label: "Custom" },
];

function formatTokens(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return `${Math.round(value)}`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(Math.abs(value) < 1 ? 4 : 2)}`;
}

function formatResetTime(resetAt: string | null): string {
  if (!resetAt) {
    return "--";
  }
  const date = new Date(resetAt);
  if (!Number.isFinite(date.getTime())) {
    return "--";
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function windowLabel(windowType: string): string {
  if (!windowType || windowType === "none") {
    return "N/A";
  }
  if (windowType === "per-minute") {
    return "minute";
  }
  if (windowType === "per-hour") {
    return "hour";
  }
  if (windowType === "per-day") {
    return "day";
  }
  if (windowType === "per-month") {
    return "month";
  }
  return windowType.replace(/^per-/, "");
}

function utilizationPercent(entry: { used: number; limit: number }): number | null {
  if (!Number.isFinite(entry.limit) || entry.limit <= 0) {
    return null;
  }
  return Math.max(0, Math.min(100, (entry.used / entry.limit) * 100));
}

function utilizationTone(percent: number | null): "ok" | "warn" | "danger" | "na" {
  if (percent === null) {
    return "na";
  }
  if (percent >= 90) {
    return "danger";
  }
  if (percent >= 75) {
    return "warn";
  }
  return "ok";
}

function trendPercent(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const prev = Number(values[values.length - 2] ?? 0);
  const current = Number(values[values.length - 1] ?? 0);
  if (!Number.isFinite(prev) || !Number.isFinite(current) || prev <= 0) {
    return null;
  }
  return ((current - prev) / prev) * 100;
}

function renderTrend(delta: number | null): TemplateResult {
  if (delta === null || !Number.isFinite(delta)) {
    return html`
      <span class="react-kpi-trend neutral">
        <span class="react-kpi-trend__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14" /></svg>
        </span>
        <span>0.0%</span>
      </span>
    `;
  }
  const direction = delta > 0.01 ? "up" : delta < -0.01 ? "down" : "flat";
  const label = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  const icon =
    direction === "up"
      ? html`<svg viewBox="0 0 24 24" fill="none"><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>`
      : direction === "down"
        ? html`<svg viewBox="0 0 24 24" fill="none"><path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6V11" /></svg>`
        : html`<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14" /></svg>`;
  return html`
    <span class="react-kpi-trend ${direction}">
      <span class="react-kpi-trend__icon" aria-hidden="true">${icon}</span>
      <span>${label}</span>
    </span>
  `;
}

function renderKpiIcon(kind: "tokens" | "cost" | "avgTokens" | "avgCost"): TemplateResult {
  if (kind === "tokens") {
    // hash # symbol
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
  }
  if (kind === "cost") {
    // dollar sign
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  }
  if (kind === "avgTokens") {
    // bar chart
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  }
  // percent symbol
  return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;
}

function sourceDimensionIcon(key: UsageSourceDimension): TemplateResult {
  if (key === "models") {
    // cube/box
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
  }
  if (key === "providers") {
    // server stacks
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/></svg>`;
  }
  if (key === "tools") {
    // wrench
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  }
  if (key === "agents") {
    // user/person
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
  // channels — share/network
  return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
}

function sourceDimensionLabel(dimension: UsageSourceDimension): string {
  if (dimension === "models") return "Models";
  if (dimension === "providers") return "Providers";
  if (dimension === "tools") return "Tools";
  if (dimension === "agents") return "Agents";
  return "Channels";
}

export function renderUsage(props: UsageProps) {
  const model = props.analyticsView;
  const usageLimits = model.usageLimits;
  const totalTokens = model.snapshot.totalTokens;
  const totalCost = model.snapshot.totalCost;
  const messageCount = Math.max(0, model.snapshot.messageCount);
  const avgTokensPerMessage = messageCount > 0 ? totalTokens / messageCount : 0;
  const avgCostPerMessage = messageCount > 0 ? totalCost / messageCount : 0;

  const tokenTrendOption = model.trends.length
    ? buildReactTokenUsageBarOption(model, props.displayTimeZone)
    : null;

  const tokenDelta = trendPercent(model.trends.map((point) => point.tokens));
  const costDelta = trendPercent(model.trends.map((point) => point.cost));
  const avgTokensDelta = trendPercent(
    model.trends.map((point) => (point.sessions > 0 ? point.tokens / point.sessions : 0)),
  );
  const avgCostDelta = trendPercent(
    model.trends.map((point) => (point.sessions > 0 ? point.cost / point.sessions : 0)),
  );

  const dimensionRows = (model.dimensionSummary[props.sourceDimension] ?? []).slice(0, 6);
  const dimensionMetric = props.sourceDimension === "tools" ? "toolCalls" : "tokens";
  const dimensionTotal = dimensionRows.reduce((acc, row) => acc + Math.max(0, row.value), 0);
  const dimensionCostTotal = dimensionRows.reduce((acc, row) => acc + Math.max(0, row.totalCost), 0);
  const sourceStack = dimensionRows.map((row, index) => {
    const pct = dimensionTotal > 0 ? (row.value / dimensionTotal) * 100 : 0;
    return {
      ...row,
      pct,
      color: SOURCE_COLORS[index % SOURCE_COLORS.length],
    };
  });
  const breakdownMotionKey = [
    props.sourceDimension,
    props.rangePreset,
    props.displayTimeZone,
    props.startDate,
    props.endDate,
    ...sourceStack.map((row) => `${row.key}:${Math.round(row.value)}:${row.pct.toFixed(1)}`),
  ].join("|");

  return html`
    <section class="react-analytics-page">
      <div class="react-analytics-head">
        <h2>Usage & Limits</h2>
        <span>// token usage, rate limits, cost analytics</span>
      </div>

      <div class="usage-global-controls">
        <div class="usage-source-range">
          ${RANGE_PRESETS.map((entry) => html`
            <button
              class="usage-source-range__btn ${props.rangePreset === entry.key ? "active" : ""}"
              type="button"
              @click=${() => props.onRangePresetChange(entry.key)}
            >
              ${entry.label}
            </button>
          `)}
        </div>
        <div class="usage-source-tz">
          <button
            class="usage-source-tz__btn ${props.displayTimeZone === "local" ? "active" : ""}"
            type="button"
            @click=${() => props.onDisplayTimeZoneChange("local")}
          >
            Local
          </button>
          <button
            class="usage-source-tz__btn ${props.displayTimeZone === "utc" ? "active" : ""}"
            type="button"
            @click=${() => props.onDisplayTimeZoneChange("utc")}
          >
            UTC
          </button>
        </div>
      </div>

      ${
        props.rangePreset === "custom"
          ? html`
              <div class="usage-source-custom-range usage-source-custom-range--global">
                <label>
                  <span>Start</span>
                  <input type="date" .value=${props.startDate} @change=${(e: Event) => props.onStartDateChange((e.target as HTMLInputElement).value)} />
                </label>
                <label>
                  <span>End</span>
                  <input type="date" .value=${props.endDate} @change=${(e: Event) => props.onEndDateChange((e.target as HTMLInputElement).value)} />
                </label>
              </div>
            `
          : nothing
      }

      <div class="react-kpi-grid">
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Total Tokens Used</label>
              <strong>${formatTokens(totalTokens)}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("tokens")}</span>
              ${renderTrend(tokenDelta)}
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Total Cost</label>
              <strong>${formatUsd(totalCost)}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("cost")}</span>
              ${renderTrend(costDelta)}
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Average Tokens / Message</label>
              <strong>${avgTokensPerMessage.toFixed(avgTokensPerMessage >= 100 ? 0 : 1)}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("avgTokens")}</span>
              ${renderTrend(avgTokensDelta)}
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Average Cost / Message</label>
              <strong>${formatUsd(avgCostPerMessage)}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("avgCost")}</span>
              ${renderTrend(avgCostDelta)}
            </div>
          </div>
        </article>
      </div>

      <div class="react-chart-grid react-chart-grid--usage react-chart-grid--usage-wide">
        <article class="react-chart-card">
          <h3>Token Usage Trend</h3>
          ${
            tokenTrendOption
              ? html`<oc-echart class="react-chart-canvas" .option=${tokenTrendOption}></oc-echart>`
              : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No token trend data.</span></div>`
          }
        </article>

        <article class="react-chart-card react-chart-card--usage-breakdown">
          <div class="usage-source-panel__head">
            <h3>Usage Breakdown</h3>
            <div class="usage-source-segmented" role="tablist" aria-label="Source dimensions">
              ${SOURCE_DIMENSIONS.map((entry) => html`
                <button
                  class="usage-source-segmented__btn ${props.sourceDimension === entry.key ? "active" : ""}"
                  type="button"
                  @click=${() => props.onSourceDimensionChange(entry.key)}
                >
                  ${entry.label}
                </button>
              `)}
            </div>
          </div>

          ${keyed(
            breakdownMotionKey,
            html`
              <div class="react-cost-snapshot usage-source-card usage-source-card--${props.sourceDimension}">
                <div class="react-cost-snapshot__head">
                  <strong>
                    ${
                      dimensionMetric === "toolCalls"
                        ? `${Math.round(dimensionTotal).toLocaleString()}`
                        : formatTokens(dimensionTotal)
                    }
                  </strong>
                  <span class="react-cost-snapshot__icon">${sourceDimensionIcon(props.sourceDimension)}</span>
                </div>
                <div class="usage-source-card__meta">
                  <span>${sourceDimensionLabel(props.sourceDimension)}</span>
                  <span>${dimensionMetric === "toolCalls" ? "tool calls share" : "token share"}</span>
                  <span>${formatUsd(dimensionCostTotal)}</span>
                </div>
                <div class="react-cost-breakdown">
                  ${
                    sourceStack.length === 0
                      ? html`<span class="muted">No source data for this range.</span>`
                      : sourceStack.map(
                          (row, index) => html`
                            <div class="react-cost-breakdown__row usage-source-row" style="--usage-row-delay:${index * 42}ms;">
                              <div class="react-cost-breakdown__meta">
                                <span><i style="background:${row.color}"></i>${row.label}</span>
                                <b>
                                  ${
                                    dimensionMetric === "toolCalls"
                                      ? `${Math.round(row.value).toLocaleString()} calls`
                                      : formatTokens(row.value)
                                  }
                                </b>
                                <em>${row.pct.toFixed(0)}%</em>
                              </div>
                            </div>
                          `,
                        )
                  }
                </div>
                <div class="react-cost-snapshot__stack usage-source-stack">
                  ${sourceStack.map(
                    (row) =>
                      html`<span class="usage-source-stack__segment" style="width:${Math.max(0, row.pct)}%; background:${row.color};"></span>`,
                  )}
                </div>
              </div>
            `,
          )}
        </article>
      </div>

      <section class="react-provider-table-wrap">
        <div class="react-provider-table-title">Provider / Model Detail</div>
        ${
          usageLimits.length === 0
            ? html`<div class="callout warning">No provider data.</div>`
            : html`
                <table class="react-provider-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Model</th>
                      <th>Window</th>
                      <th>Utilization</th>
                      <th>Remaining</th>
                      <th>Reset</th>
                      <th>Telemetry</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${usageLimits.map(
                      (entry) => {
                        const utilization = utilizationPercent(entry);
                        const tone = utilizationTone(utilization);
                        return html`
                          <tr>
                            <td><span class="react-provider-badge">${entry.provider}</span></td>
                            <td><span class="react-model-label">${entry.model}</span></td>
                            <td><span class="react-window-pill">${windowLabel(entry.windowType)}</span></td>
                            <td>
                              <div class="react-util-cell">
                                <div class="react-util-meta">
                                  <strong class="react-util-value ${tone}">${utilization !== null ? `${utilization.toFixed(0)}%` : "N/A"}</strong>
                                  <span>
                                    ${
                                      entry.limit > 0
                                        ? `${formatTokens(entry.used)} / ${formatTokens(entry.limit)}`
                                        : `${formatTokens(entry.used)} used`
                                    }
                                  </span>
                                </div>
                                ${
                                  utilization !== null
                                    ? html`<div class="react-util-track"><div class="${tone}" style="width:${utilization}%"></div></div>`
                                    : nothing
                                }
                              </div>
                            </td>
                            <td>${entry.limit > 0 ? formatTokens(Math.max(0, entry.remaining)) : "--"}</td>
                            <td>${formatResetTime(entry.resetAt)}</td>
                            <td>
                              <div class="react-telemetry">
                                <span class="react-source-pill">${entry.source}</span>
                                <span class="react-confidence-pill ${entry.confidence}">${entry.confidence}</span>
                                <span class="react-freshness-pill">${Math.max(0, Math.floor(entry.freshnessSec / 60))}m</span>
                              </div>
                            </td>
                          </tr>
                        `;
                      },
                    )}
                  </tbody>
                </table>
              `
        }
      </section>

      ${props.loading ? html`<div class="callout">Loading usage analytics…</div>` : nothing}
      ${props.error ? html`<div class="callout warning">${props.error}</div>` : nothing}
      ${
        props.sessionsLimitReached
          ? html`<div class="callout warning">Showing first 1,000 sessions. Narrow date range for full results.</div>`
          : nothing
      }
      <div class="muted" style="font-size: 11px;">Display timezone: ${displayTimeZoneLabel(props.displayTimeZone)}</div>
    </section>
  `;
}
