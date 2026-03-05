import { html, type TemplateResult } from "lit";
import "../components/echart-host.ts";
import { formatDurationHuman } from "../format.ts";
import type { GatewayHelloOk } from "../gateway.ts";
import type { UiSettings } from "../storage.ts";
import {
  buildReactCostByProviderOption,
  buildReactSourceDonutOption,
  buildReactTokenByProviderOption,
} from "./charts/options.ts";
import type { DisplayTimeZone } from "./charts/timezone.ts";
import type { UsageAnalyticsViewModel } from "./usage-analytics-adapter.ts";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  lastErrorCode: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  usageLoading: boolean;
  usageError: string | null;
  usageAnalyticsView: UsageAnalyticsViewModel;
  displayTimeZone: DisplayTimeZone;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

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

function renderKpiIcon(kind: "activity" | "tokens" | "cost" | "alert" | "tools" | "sessions"): TemplateResult {
  if (kind === "activity") {
    // chat message bubble
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  }
  if (kind === "tokens") {
    // hash # symbol — standard token icon
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
  }
  if (kind === "tools") {
    // wrench
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  }
  if (kind === "cost") {
    // dollar sign
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  }
  if (kind === "sessions") {
    // layers — stacked sessions
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
  }
  // alert triangle
  return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

export function renderOverview(props: OverviewProps) {
  const model = props.usageAnalyticsView;
  const snapshot24h = model.snapshot24h;
  const costTrendOption = model.trends.length
    ? buildReactCostByProviderOption(model, props.displayTimeZone)
    : null;
  const tokenByProviderOption = model.trends.length
    ? buildReactTokenByProviderOption(model, props.displayTimeZone)
    : null;
  const sourceRows =
    snapshot24h && snapshot24h.sourceSummary.length > 0
      ? snapshot24h.sourceSummary
      : model.sourceSummary;
  const sourceDonutOption = sourceRows.length
    ? buildReactSourceDonutOption(sourceRows)
    : null;
  const uptimeMs = (props.hello?.snapshot as { uptimeMs?: number } | undefined)?.uptimeMs;
  const uptime = typeof uptimeMs === "number" ? formatDurationHuman(uptimeMs) : "n/a";
  const statusText = props.connected ? "online" : "offline";
  const cronStatus = props.cronEnabled ? "running" : "paused";
  const hasSnapshot24h = Boolean(snapshot24h);
  const snapshotWindowLabel = hasSnapshot24h ? "24h" : "selected range";
  const messages24h = snapshot24h?.messageCount ?? model.snapshot.messageCount;
  const toolCalls24h = snapshot24h?.toolCallCount ?? model.snapshot.toolCallCount;
  const tokens24h = snapshot24h?.totalTokens ?? model.snapshot.totalTokens;
  const cost24h = snapshot24h?.totalCost ?? model.snapshot.totalCost;
  const sessions24h = snapshot24h?.totalSessions ?? model.snapshot.totalSessions;

  const messageDelta = trendPercent(model.trends.map((point) => point.sessions));
  const toolDelta = trendPercent(model.trends.map((point) => point.sessions));
  const tokenDelta = trendPercent(model.trends.map((point) => point.tokens));
  const sessionsDelta = trendPercent(model.trends.map((point) => point.sessions));

  const breakdown = snapshot24h?.breakdown ?? model.snapshot.breakdown;
  const rawCostRows = [
    { label: "Input", value: Math.max(0, breakdown.inputCost), color: "var(--react-cost-color-1)" },
    { label: "Output", value: Math.max(0, breakdown.outputCost), color: "var(--react-cost-color-2)" },
    { label: "Cache Read", value: Math.max(0, breakdown.cacheReadCost), color: "var(--react-cost-color-3)" },
    { label: "Cache Write", value: Math.max(0, breakdown.cacheWriteCost), color: "var(--react-cost-color-4)" },
  ];
  const costBreakdownTotal = rawCostRows.reduce((acc, row) => acc + row.value, 0);
  const costRows = rawCostRows.map((row) => {
    const percent = costBreakdownTotal > 0 ? (row.value / costBreakdownTotal) * 100 : 0;
    return {
      label: row.label,
      value: row.value,
      percent,
      color: row.color,
    };
  });
  const topCostTotal = costRows.reduce((acc, row) => acc + row.value, 0);

  return html`
    <section class="react-analytics-page">
      <div class="react-analytics-head">
        <h2>Overview</h2>
        <span>// real-time gateway metrics</span>
      </div>

      <div class="react-kpi-grid">
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Messages (${snapshotWindowLabel})</label>
              <strong>${Math.max(0, messages24h).toLocaleString()}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("activity")}</span>
              ${renderTrend(messageDelta)}
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Tokens (${snapshotWindowLabel})</label>
              <strong>${formatTokens(tokens24h)}</strong>
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
              <label>Tool Calls (${snapshotWindowLabel})</label>
              <strong>${Math.max(0, toolCalls24h).toLocaleString()}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("tools")}</span>
              ${renderTrend(toolDelta)}
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Sessions (${snapshotWindowLabel})</label>
              <strong>${Math.max(0, sessions24h).toLocaleString()}</strong>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderKpiIcon("sessions")}</span>
              ${renderTrend(sessionsDelta)}
            </div>
          </div>
        </article>
      </div>

      <div class="react-chart-grid react-chart-grid--overview">
        <article class="react-chart-card react-chart-card--wide">
          <h3>Cost by Providers</h3>
          ${
            costTrendOption
              ? html`<oc-echart class="react-chart-canvas" .option=${costTrendOption}></oc-echart>`
              : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No provider cost trend data.</span></div>`
          }
        </article>
        <article class="react-chart-card react-chart-card--total-cost24h">
          <h3>Total Cost (${snapshotWindowLabel})</h3>
          <div class="react-cost-snapshot react-cost-snapshot--total24h">
            <div class="react-cost-snapshot__head">
              <strong>${formatUsd(cost24h)}</strong>
              <span class="react-cost-snapshot__icon">${renderKpiIcon("cost")}</span>
            </div>
            <div class="react-cost-breakdown">
              ${costRows.map((row) => html`
                <div class="react-cost-breakdown__row">
                  <div class="react-cost-breakdown__meta">
                    <span><i style="background:${row.color}"></i>${row.label}</span>
                    <b>${formatUsd(row.value)}</b>
                    <em>${row.percent.toFixed(0)}%</em>
                  </div>
                </div>
              `)}
            </div>
            <div class="react-cost-snapshot__stack">
              ${costRows.map((row) => {
                const width = topCostTotal > 0 ? (row.value / topCostTotal) * 100 : 0;
                return html`<span style="width:${width}%; background:${row.color};"></span>`;
              })}
            </div>
          </div>
        </article>
      </div>

      <div class="react-chart-grid react-chart-grid--overview">
        <article class="react-chart-card react-chart-card--wide">
          <h3>Token Usage by Providers</h3>
          ${
            tokenByProviderOption
              ? html`<oc-echart class="react-chart-canvas" .option=${tokenByProviderOption}></oc-echart>`
              : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No provider token trend data.</span></div>`
          }
        </article>
        <article class="react-chart-card">
          <h3>Token Usage by Source</h3>
          ${
            sourceDonutOption
              ? html`<oc-echart class="react-chart-canvas react-chart-canvas--compact" .option=${sourceDonutOption}></oc-echart>`
              : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No source usage data.</span></div>`
          }
        </article>
      </div>

      <div class="react-status-grid">
        <article class="react-status-card">
          <label>Status</label>
          <strong class=${statusText === "online" ? "ok" : "danger"}>${statusText}</strong>
        </article>
        <article class="react-status-card">
          <label>Uptime</label>
          <strong>${uptime}</strong>
        </article>
        <article class="react-status-card">
          <label>Providers</label>
          <strong>${model.snapshot.providersTracked} active / ${model.snapshot.activeModels} models</strong>
        </article>
        <article class="react-status-card">
          <label>Cron</label>
          <strong class=${cronStatus === "running" ? "ok" : "warn"}>${cronStatus}</strong>
        </article>
      </div>

      ${props.usageLoading ? html`<div class="callout">Loading overview analytics…</div>` : ""}
      ${props.usageError ? html`<div class="callout warning">${props.usageError}</div>` : ""}
      ${props.lastError ? html`<div class="callout danger">${props.lastError}</div>` : ""}
    </section>
  `;
}
