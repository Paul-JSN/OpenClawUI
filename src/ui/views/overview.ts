import { html, nothing, type TemplateResult } from "lit";
import "../components/echart-host.ts";
import { t, i18n, SUPPORTED_LOCALES, type Locale, isSupportedLocale } from "../../i18n/index.ts";
import type { EventLogEntry } from "../app-events.ts";
import { buildExternalLinkRel, EXTERNAL_LINK_TARGET } from "../external-link.ts";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import type { GatewayHelloOk } from "../gateway.ts";
import { icons } from "../icons.ts";
import type { UiSettings } from "../storage.ts";
import type {
  AttentionItem,
  CostUsageSummary,
  CronJob,
  CronStatus,
  SessionsListResult,
  SessionsUsageResult,
  SkillStatusReport,
} from "../types.ts";
import { renderOverviewAttention } from "./overview-attention.ts";
import { renderOverviewCards } from "./overview-cards.ts";
import { renderOverviewEventLog } from "./overview-event-log.ts";
import {
  buildReactCostByProviderOption,
  buildReactSourceDonutOption,
  buildReactTokenByProviderOption,
} from "./charts/options.ts";
import { buildUsageAnalyticsViewModel } from "./usage-analytics-adapter.ts";
import type { DisplayTimeZone } from "./charts/timezone.ts";
import {
  resolveAuthHintKind,
  shouldShowInsecureContextHint,
  shouldShowPairingHint,
} from "./overview-hints.ts";
import { renderOverviewLogTail } from "./overview-log-tail.ts";

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
  // New dashboard data
  usageResult: SessionsUsageResult | null;
  usageCostSummary: CostUsageSummary | null;
  displayTimeZone: DisplayTimeZone;
  sessionsResult: SessionsListResult | null;
  skillsReport: SkillStatusReport | null;
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  attentionItems: AttentionItem[];
  eventLog: EventLogEntry[];
  overviewLogLines: string[];
  showGatewayToken: boolean;
  showGatewayPassword: boolean;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onToggleGatewayTokenVisibility: () => void;
  onToggleGatewayPasswordVisibility: () => void;
  onConnect: () => void;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
  onRefreshLogs: () => void;
};

const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatTokens(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (value >= 1000) {
    return compactNumber.format(value);
  }
  return Math.round(value).toLocaleString();
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return usdFormatter.format(value);
}

function trendPercent(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return null;
  }
  if (first === 0 && last === 0) {
    return 0;
  }
  if (first === 0) {
    return 100;
  }
  return ((last - first) / Math.abs(first)) * 100;
}

function formatTokenReadWriteSplit(args: {
  total: number;
  cacheRead: number;
  cacheWrite: number;
}): string {
  if (args.total <= 0) {
    return "no cache activity";
  }
  const readPct = Math.round((Math.max(0, args.cacheRead) / args.total) * 100);
  const writePct = Math.round((Math.max(0, args.cacheWrite) / args.total) * 100);
  return `cache read ${readPct}% · cache write ${writePct}%`;
}

function renderTrend(value: number | null): TemplateResult {
  if (value == null) {
    return html`<span class="pill">—</span>`;
  }
  const rounded = Math.round(value);
  const cls = rounded > 0 ? "ok" : rounded < 0 ? "danger" : "warn";
  const prefix = rounded > 0 ? "+" : "";
  return html`<span class="pill ${cls}">${prefix}${rounded}%</span>`;
}

function renderKpiIcon(kind: "activity" | "tokens" | "tools" | "cost" | "sessions") {
  if (kind === "activity") {
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>`;
  }
  if (kind === "tokens") {
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
  }
  if (kind === "tools") {
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  }
  if (kind === "cost") {
    return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  }
  return html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
}

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | {
        uptimeMs?: number;
        authMode?: "none" | "token" | "password" | "trusted-proxy";
      }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationHuman(snapshot.uptimeMs) : t("common.na");
  const tickIntervalMs = props.hello?.policy?.tickIntervalMs;
  const tick = tickIntervalMs
    ? `${(tickIntervalMs / 1000).toFixed(tickIntervalMs % 1000 === 0 ? 0 : 1)}s`
    : t("common.na");
  const authMode = snapshot?.authMode;
  const isTrustedProxy = authMode === "trusted-proxy";

  const pairingHint = (() => {
    if (!shouldShowPairingHint(props.connected, props.lastError, props.lastErrorCode)) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.pairing.hint")}
        <div style="margin-top: 6px">
          <span class="mono">openclaw devices list</span><br />
          <span class="mono">openclaw devices approve &lt;requestId&gt;</span>
        </div>
        <div style="margin-top: 6px; font-size: 12px;">
          ${t("overview.pairing.mobileHint")}
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#device-pairing-first-connection"
            target=${EXTERNAL_LINK_TARGET}
            rel=${buildExternalLinkRel()}
            title="Device pairing docs (opens in new tab)"
            >Docs: Device pairing</a
          >
        </div>
      </div>
    `;
  })();

  const authHint = (() => {
    const authHintKind = resolveAuthHintKind({
      connected: props.connected,
      lastError: props.lastError,
      lastErrorCode: props.lastErrorCode,
      hasToken: Boolean(props.settings.token.trim()),
      hasPassword: Boolean(props.password.trim()),
    });
    if (authHintKind == null) {
      return null;
    }
    if (authHintKind === "required") {
      return html`
        <div class="muted" style="margin-top: 8px">
          ${t("overview.auth.required")}
          <div style="margin-top: 6px">
            <span class="mono">openclaw dashboard --no-open</span> → tokenized URL<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> → set token
          </div>
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target=${EXTERNAL_LINK_TARGET}
              rel=${buildExternalLinkRel()}
              title="Control UI auth docs (opens in new tab)"
              >Docs: Control UI auth</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.auth.failed", { command: "openclaw dashboard --no-open" })}
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target=${EXTERNAL_LINK_TARGET}
            rel=${buildExternalLinkRel()}
            title="Control UI auth docs (opens in new tab)"
            >Docs: Control UI auth</a
          >
        </div>
      </div>
    `;
  })();

  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    if (!shouldShowInsecureContextHint(props.connected, props.lastError, props.lastErrorCode)) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.insecure.hint", { url: "http://127.0.0.1:18789" })}
        <div style="margin-top: 6px">
          ${t("overview.insecure.stayHttp", { config: "gateway.controlUi.allowInsecureAuth: true" })}
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target=${EXTERNAL_LINK_TARGET}
            rel=${buildExternalLinkRel()}
            title="Tailscale Serve docs (opens in new tab)"
            >Docs: Tailscale Serve</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target=${EXTERNAL_LINK_TARGET}
            rel=${buildExternalLinkRel()}
            title="Insecure HTTP docs (opens in new tab)"
            >Docs: Insecure HTTP</a
          >
        </div>
      </div>
    `;
  })();

  const currentLocale = isSupportedLocale(props.settings.locale)
    ? props.settings.locale
    : i18n.getLocale();

  const analyticsModel = buildUsageAnalyticsViewModel({
    usageResult: props.usageResult,
    usageCostSummary: props.usageCostSummary,
    usageStatus: null,
    rangeKey: "overview",
  });
  const snapshot24h = analyticsModel.snapshot24h;
  const costTrendOption = analyticsModel.trends.length
    ? buildReactCostByProviderOption(analyticsModel, props.displayTimeZone)
    : null;
  const tokenByProviderOption = analyticsModel.trends.length
    ? buildReactTokenByProviderOption(analyticsModel, props.displayTimeZone)
    : null;
  const sourceRows =
    snapshot24h && snapshot24h.sourceSummary.length > 0
      ? snapshot24h.sourceSummary
      : analyticsModel.sourceSummary;
  const sourceDonutOption = sourceRows.length ? buildReactSourceDonutOption(sourceRows) : null;
  const snapshotWindowLabel = snapshot24h ? "24h" : "selected range";
  const messagesWindow = snapshot24h?.messageCount ?? analyticsModel.snapshot.messageCount;
  const toolCallsWindow = snapshot24h?.toolCallCount ?? analyticsModel.snapshot.toolCallCount;
  const tokensWindow = snapshot24h?.totalTokens ?? analyticsModel.snapshot.totalTokens;
  const costWindow = snapshot24h?.totalCost ?? analyticsModel.snapshot.totalCost;
  const sessionsWindow = snapshot24h?.totalSessions ?? analyticsModel.snapshot.totalSessions;
  const messageDelta = trendPercent(analyticsModel.trends.map((point) => point.sessions));
  const toolDelta = trendPercent(analyticsModel.trends.map((point) => point.sessions));
  const tokenDelta = trendPercent(analyticsModel.trends.map((point) => point.tokens));
  const sessionsDelta = trendPercent(analyticsModel.trends.map((point) => point.sessions));
  const breakdown = snapshot24h?.breakdown ?? analyticsModel.snapshot.breakdown;
  const tokenBreakdownLabel = formatTokenReadWriteSplit({
    total: Math.max(0, tokensWindow),
    cacheRead: Math.max(0, breakdown.cacheReadTokens),
    cacheWrite: Math.max(0, breakdown.cacheWriteTokens),
  });
  const rawCostRows = [
    { label: "Input", value: Math.max(0, breakdown.inputCost), color: "var(--react-cost-color-1)" },
    { label: "Output", value: Math.max(0, breakdown.outputCost), color: "var(--react-cost-color-2)" },
    { label: "Cache Read", value: Math.max(0, breakdown.cacheReadCost), color: "var(--react-cost-color-3)" },
    { label: "Cache Write", value: Math.max(0, breakdown.cacheWriteCost), color: "var(--react-cost-color-4)" },
  ];
  const costBreakdownTotal = rawCostRows.reduce((acc, row) => acc + row.value, 0);
  const costRows = rawCostRows.map((row) => ({
    ...row,
    percent: costBreakdownTotal > 0 ? (row.value / costBreakdownTotal) * 100 : 0,
  }));

  const customOverviewHero = html`
    <section class="react-analytics-page">
      <div class="react-analytics-head">
        <h2>Overview</h2>
        <span>// New UI analytics shell</span>
      </div>

      <div class="react-kpi-grid">
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Messages (${snapshotWindowLabel})</label>
              <strong>${Math.max(0, messagesWindow).toLocaleString()}</strong>
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
              <strong>${formatTokens(tokensWindow)}</strong>
              <div class="muted" style="font-size: 11px;">${tokenBreakdownLabel}</div>
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
              <strong>${Math.max(0, toolCallsWindow).toLocaleString()}</strong>
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
              <strong>${Math.max(0, sessionsWindow).toLocaleString()}</strong>
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
          ${costTrendOption
            ? html`<oc-echart class="react-chart-canvas" .option=${costTrendOption}></oc-echart>`
            : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No provider cost trend data.</span></div>`}
        </article>
        <article class="react-chart-card react-chart-card--total-cost24h">
          <h3>Total Cost (${snapshotWindowLabel})</h3>
          <div class="react-cost-snapshot react-cost-snapshot--total24h">
            <div class="react-cost-snapshot__head">
              <strong>${formatUsd(costWindow)}</strong>
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
          </div>
        </article>
      </div>

      <div class="react-chart-grid react-chart-grid--overview">
        <article class="react-chart-card react-chart-card--wide">
          <h3>Token Usage by Providers</h3>
          ${tokenByProviderOption
            ? html`<oc-echart class="react-chart-canvas" .option=${tokenByProviderOption}></oc-echart>`
            : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No provider token trend data.</span></div>`}
        </article>
        <article class="react-chart-card">
          <h3>Token Usage by Source</h3>
          ${sourceDonutOption
            ? html`<oc-echart class="react-chart-canvas react-chart-canvas--compact" .option=${sourceDonutOption}></oc-echart>`
            : html`<div class="usage-chart-empty"><strong>No Data</strong><span>No source usage data.</span></div>`}
        </article>
      </div>

      ${(props.usageLoading || props.usageError || props.lastError)
        ? html`
            <div class="react-status-grid">
              ${props.usageLoading ? html`<article class="react-status-card"><label>Overview Analytics</label><strong>loading…</strong></article>` : nothing}
              ${props.usageError ? html`<article class="react-status-card"><label>Usage</label><strong class="warn">${props.usageError}</strong></article>` : nothing}
              ${props.lastError ? html`<article class="react-status-card"><label>Gateway</label><strong class="danger">${props.lastError}</strong></article>` : nothing}
            </div>
          `
        : nothing}
    </section>
  `;

  return html`
    ${customOverviewHero}
    <section class="grid">
      <div class="card">
        <div class="card-title">${t("overview.access.title")}</div>
        <div class="card-sub">${t("overview.access.subtitle")}</div>
        <div class="ov-access-grid" style="margin-top: 16px;">
          <label class="field ov-access-grid__full">
            <span>${t("overview.access.wsUrl")}</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSettingsChange({
                  ...props.settings,
                  gatewayUrl: v,
                  token: v.trim() === props.settings.gatewayUrl.trim() ? props.settings.token : "",
                });
              }}
              placeholder="ws://100.x.y.z:18789"
            />
          </label>
          ${
            isTrustedProxy
              ? ""
              : html`
                <label class="field">
                  <span>${t("overview.access.token")}</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input
                      type=${props.showGatewayToken ? "text" : "password"}
                      autocomplete="off"
                      style="flex: 1;"
                      .value=${props.settings.token}
                      @input=${(e: Event) => {
                        const v = (e.target as HTMLInputElement).value;
                        props.onSettingsChange({ ...props.settings, token: v });
                      }}
                      placeholder="OPENCLAW_GATEWAY_TOKEN"
                    />
                    <button
                      type="button"
                      class="btn btn--icon ${props.showGatewayToken ? "active" : ""}"
                      style="width: 36px; height: 36px;"
                      title=${props.showGatewayToken ? "Hide token" : "Show token"}
                      aria-label="Toggle token visibility"
                      aria-pressed=${props.showGatewayToken}
                      @click=${props.onToggleGatewayTokenVisibility}
                    >
                      ${props.showGatewayToken ? icons.eye : icons.eyeOff}
                    </button>
                  </div>
                </label>
                <label class="field">
                  <span>${t("overview.access.password")}</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input
                      type=${props.showGatewayPassword ? "text" : "password"}
                      autocomplete="off"
                      style="flex: 1;"
                      .value=${props.password}
                      @input=${(e: Event) => {
                        const v = (e.target as HTMLInputElement).value;
                        props.onPasswordChange(v);
                      }}
                      placeholder="system or shared password"
                    />
                    <button
                      type="button"
                      class="btn btn--icon ${props.showGatewayPassword ? "active" : ""}"
                      style="width: 36px; height: 36px;"
                      title=${props.showGatewayPassword ? "Hide password" : "Show password"}
                      aria-label="Toggle password visibility"
                      aria-pressed=${props.showGatewayPassword}
                      @click=${props.onToggleGatewayPasswordVisibility}
                    >
                      ${props.showGatewayPassword ? icons.eye : icons.eyeOff}
                    </button>
                  </div>
                </label>
              `
          }
          <label class="field">
            <span>${t("overview.access.sessionKey")}</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSessionKeyChange(v);
              }}
            />
          </label>
          <label class="field">
            <span>${t("overview.access.language")}</span>
            <select
              .value=${currentLocale}
              @change=${(e: Event) => {
                const v = (e.target as HTMLSelectElement).value as Locale;
                void i18n.setLocale(v);
                props.onSettingsChange({ ...props.settings, locale: v });
              }}
            >
              ${SUPPORTED_LOCALES.map((loc) => {
                const key = loc.replace(/-([a-zA-Z])/g, (_, c) => c.toUpperCase());
                return html`<option value=${loc} ?selected=${currentLocale === loc}>
                  ${t(`languages.${key}`)}
                </option>`;
              })}
            </select>
          </label>
        </div>
        <div class="row" style="margin-top: 14px;">
          <button class="btn" @click=${() => props.onConnect()}>${t("common.connect")}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${t("common.refresh")}</button>
          <span class="muted">${
            isTrustedProxy ? t("overview.access.trustedProxy") : t("overview.access.connectHint")
          }</span>
        </div>
        ${
          !props.connected
            ? html`
                <div class="login-gate__help" style="margin-top: 16px;">
                  <div class="login-gate__help-title">${t("overview.connection.title")}</div>
                  <ol class="login-gate__steps">
                    <li>${t("overview.connection.step1")}<code>openclaw gateway run</code></li>
                    <li>${t("overview.connection.step2")}<code>openclaw dashboard --no-open</code></li>
                    <li>${t("overview.connection.step3")}</li>
                    <li>${t("overview.connection.step4")}<code>openclaw doctor --generate-gateway-token</code></li>
                  </ol>
                  <div class="login-gate__docs">
                    ${t("overview.connection.docsHint")}
                    <a
                      class="session-link"
                      href="https://docs.openclaw.ai/web/dashboard"
                      target="_blank"
                      rel="noreferrer"
                    >${t("overview.connection.docsLink")}</a>
                  </div>
                </div>
              `
            : nothing
        }
      </div>

      <div class="card">
        <div class="card-title">${t("overview.snapshot.title")}</div>
        <div class="card-sub">${t("overview.snapshot.subtitle")}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.status")}</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? t("common.ok") : t("common.offline")}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.uptime")}</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.tickInterval")}</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.lastChannelsRefresh")}</div>
            <div class="stat-value">
              ${props.lastChannelsRefresh ? formatRelativeTimestamp(props.lastChannelsRefresh) : t("common.na")}
            </div>
          </div>
        </div>
        ${
          props.lastError
            ? html`<div class="callout danger" style="margin-top: 14px;">
              <div>${props.lastError}</div>
              ${pairingHint ?? ""}
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
            : html`
                <div class="callout" style="margin-top: 14px">
                  ${t("overview.snapshot.channelsHint")}
                </div>
              `
        }
      </div>
    </section>

    <div class="ov-section-divider"></div>

    ${renderOverviewCards({
      usageResult: props.usageResult,
      sessionsResult: props.sessionsResult,
      skillsReport: props.skillsReport,
      cronJobs: props.cronJobs,
      cronStatus: props.cronStatus,
      presenceCount: props.presenceCount,
      onNavigate: props.onNavigate,
    })}

    ${renderOverviewAttention({ items: props.attentionItems })}

    <div class="ov-section-divider"></div>

    <div class="ov-bottom-grid">
      ${renderOverviewEventLog({
        events: props.eventLog,
      })}

      ${renderOverviewLogTail({
        lines: props.overviewLogLines,
        onRefreshLogs: props.onRefreshLogs,
      })}
    </div>

  `;
}
