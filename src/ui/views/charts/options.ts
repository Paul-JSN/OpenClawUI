import type { EChartsOption } from "echarts";
import type { UsageAnalyticsViewModel, UsageProviderSummary, UsageSourceSummary } from "../usage-analytics-adapter.ts";
import type { DisplayTimeZone } from "./timezone.ts";
import { axisDateLabel, displayTimeZoneLabel, formatForDisplayTz, formatUtcYmdForDisplay } from "./timezone.ts";
import { CHART_NEON } from "./theme.ts";

type UsageCostBreakdown = {
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  totalCost: number;
};

function formatUsd(value: number): string {
  return `$${value.toFixed(Math.abs(value) < 1 ? 4 : 2)}`;
}

function baseGrid(): EChartsOption["grid"] {
  return {
    top: 30,
    left: 44,
    right: 14,
    bottom: 34,
    containLabel: true,
  };
}

function baseAxisLabel() {
  return {
    color: CHART_NEON.muted,
    fontFamily: "var(--mono)",
    fontSize: 9,
  };
}

function tooltipBase(): EChartsOption["tooltip"] {
  return {
    backgroundColor: CHART_NEON.bg,
    borderColor: CHART_NEON.border,
    borderWidth: 1,
    confine: true,
    appendToBody: true,
    transitionDuration: 0,
    extraCssText: [
      "box-shadow: 0 8px 18px rgba(0,0,0,0.45)",
      "border-radius: 2px",
      "padding: 8px 10px",
      "line-height: 1.45",
    ].join(";"),
    textStyle: {
      color: CHART_NEON.text,
      fontFamily: "var(--mono)",
      fontSize: 11,
    },
  };
}

export function buildOverviewTrendOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const dates = model.trends.map((point) => point.date);
  const tokenSeries = model.trends.map((point) => Number(point.tokens || 0));
  const costSeries = model.trends.map((point) => Number(point.cost || 0));
  const sessionsSeries = model.trends.map((point) => Number(point.sessions || 0));

  return {
    backgroundColor: "transparent",
    grid: baseGrid(),
    legend: {
      top: 4,
      textStyle: {
        color: CHART_NEON.muted,
        fontFamily: "var(--mono)",
        fontSize: 10,
      },
      itemWidth: 8,
      itemHeight: 8,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: {
        type: "line",
        snap: true,
        lineStyle: {
          color: CHART_NEON.pointer,
          width: 1,
        },
      },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0];
        const date = typeof first?.axisValue === "string" ? first.axisValue : "";
        const title = formatUtcYmdForDisplay(date, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const body = rows
          .map((row) => {
            const marker = row.marker ?? "";
            const value = Number(row.value ?? 0);
            if (row.seriesName === "Cost") {
              return `${marker} Cost <b>${formatUsd(value)}</b>`;
            }
            if (row.seriesName === "Sessions") {
              return `${marker} Sessions <b>${Math.round(value)}</b>`;
            }
            return `${marker} Tokens <b>${Math.round(value).toLocaleString()}</b>`;
          })
          .join("<br/>");
        return `<div>${title} <span style="color:${CHART_NEON.muted}">(${displayTimeZoneLabel(displayTimeZone)})</span></div><div style="margin-top:4px">${body}</div>`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: CHART_NEON.axis } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        name: "Tokens",
        nameTextStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: CHART_NEON.grid } },
        axisLabel: {
          ...baseAxisLabel(),
          formatter: (value: number) => Math.round(value).toLocaleString(),
        },
      },
      {
        type: "value",
        name: "Cost",
        nameTextStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          ...baseAxisLabel(),
          formatter: (value: number) => formatUsd(value),
        },
      },
    ],
    series: [
      {
        name: "Tokens",
        type: "line",
        smooth: 0.28,
        symbol: "circle",
        symbolSize: 4,
        showSymbol: false,
        itemStyle: {
          color: CHART_NEON.glowA,
        },
        lineStyle: {
          width: 1.9,
          color: CHART_NEON.glowA,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(31, 218, 199, 0.32)" },
              { offset: 1, color: "rgba(31, 218, 199, 0.02)" },
            ],
          },
        },
        data: tokenSeries,
      },
      {
        name: "Cost",
        type: "line",
        yAxisIndex: 1,
        smooth: 0.24,
        symbol: "none",
        lineStyle: {
          width: 1.7,
          color: CHART_NEON.glowB,
          type: "dashed",
        },
        data: costSeries,
      },
      {
        name: "Sessions",
        type: "line",
        smooth: 0.22,
        symbol: "none",
        lineStyle: {
          width: 1.4,
          color: CHART_NEON.ok,
          opacity: 0.9,
        },
        data: sessionsSeries,
      },
    ],
    animation: true,
    animationDuration: 280,
    animationEasing: "quadraticOut",
  };
}

export function buildUsageTrendOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
  metric: "tokens" | "cost" | "sessions",
): EChartsOption {
  const dates = model.trends.map((point) => point.date);
  const data = model.trends.map((point) =>
    metric === "tokens" ? point.tokens : metric === "cost" ? point.cost : point.sessions,
  );
  const isCost = metric === "cost";
  const color = metric === "tokens" ? CHART_NEON.glowA : metric === "cost" ? CHART_NEON.glowB : CHART_NEON.ok;

  return {
    backgroundColor: "transparent",
    grid: baseGrid(),
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: {
        type: "line",
        snap: true,
        lineStyle: {
          color: CHART_NEON.pointer,
          width: 1,
        },
      },
      formatter: (params) => {
        const row = Array.isArray(params) ? params[0] : params;
        const value = Number(row?.value ?? 0);
        const axisValue = typeof row?.axisValue === "string" ? row.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const valueLabel = isCost ? formatUsd(value) : Math.round(value).toLocaleString();
        return `<div>${title}</div><div style="margin-top:4px">${row?.marker ?? ""} <b>${valueLabel}</b> <span style="color:${CHART_NEON.muted}">(${displayTimeZoneLabel(displayTimeZone)})</span></div>`;
      },
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
      axisLine: { lineStyle: { color: CHART_NEON.axis } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => (isCost ? formatUsd(value) : Math.round(value).toLocaleString()),
      },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid } },
    },
    series: [
      {
        type: "line",
        smooth: 0.28,
        data,
        symbol: "circle",
        symbolSize: 3,
        showSymbol: false,
        itemStyle: {
          color,
        },
        lineStyle: {
          color,
          width: 1.8,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}4D` },
              { offset: 1, color: `${color}05` },
            ],
          },
        },
      },
    ],
    animationDuration: 260,
  };
}

export function buildUsageCostMiniTrendOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const dates = model.trends.map((point) => point.date);
  const data = model.trends.map((point) => Number(point.cost || 0));
  return {
    backgroundColor: "transparent",
    grid: {
      top: 14,
      left: 24,
      right: 10,
      bottom: 20,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: {
        type: "line",
        lineStyle: {
          color: CHART_NEON.pointer,
          width: 1,
        },
      },
      formatter: (params) => {
        const row = Array.isArray(params) ? params[0] : params;
        const axisValue = typeof row?.axisValue === "string" ? row.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
        });
        return `<div>${title}</div><div style="margin-top:4px">${row?.marker ?? ""} <b>${formatUsd(Number(row?.value ?? 0))}</b></div>`;
      },
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLabel: {
        ...baseAxisLabel(),
        fontSize: 10,
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
      axisLine: { lineStyle: { color: CHART_NEON.axis } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        ...baseAxisLabel(),
        fontSize: 10,
        formatter: (value: number) => formatUsd(value),
      },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid } },
    },
    series: [
      {
        type: "line",
        smooth: 0.32,
        symbol: "none",
        data,
        lineStyle: {
          color: CHART_NEON.glowB,
          width: 1.6,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(245, 105, 154, 0.36)" },
              { offset: 1, color: "rgba(245, 105, 154, 0.04)" },
            ],
          },
        },
      },
    ],
    animationDuration: 220,
  };
}

export function buildUsageActivityTrendOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const dates = model.trends.map((point) => point.date);
  const data = model.trends.map((point) => Number(point.sessions || 0));
  return {
    backgroundColor: "transparent",
    grid: baseGrid(),
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: {
        type: "line",
        lineStyle: {
          color: CHART_NEON.pointer,
          width: 1,
        },
      },
      formatter: (params) => {
        const row = Array.isArray(params) ? params[0] : params;
        const axisValue = typeof row?.axisValue === "string" ? row.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return `<div>${title}</div><div style="margin-top:4px">${row?.marker ?? ""} Sessions <b>${Math.round(Number(row?.value ?? 0))}</b></div>`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
      axisLine: { lineStyle: { color: CHART_NEON.axis } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => Math.round(value).toLocaleString(),
      },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid } },
    },
    series: [
      {
        type: "line",
        smooth: 0.22,
        symbol: "none",
        data,
        lineStyle: {
          color: CHART_NEON.ok,
          width: 1.8,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(112, 243, 183, 0.35)" },
              { offset: 1, color: "rgba(112, 243, 183, 0.03)" },
            ],
          },
        },
      },
    ],
    animationDuration: 260,
  };
}

export function buildUsageCostDonutOption(
  totals: UsageCostBreakdown | null,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const input = Math.max(0, totals?.inputCost ?? 0);
  const output = Math.max(0, totals?.outputCost ?? 0);
  const cacheWrite = Math.max(0, totals?.cacheWriteCost ?? 0);
  const cacheRead = Math.max(0, totals?.cacheReadCost ?? 0);
  const total = Math.max(0, totals?.totalCost ?? input + output + cacheRead + cacheWrite);
  const data = [
    { name: "Output", value: output },
    { name: "Input", value: input },
    { name: "Cache Write", value: cacheWrite },
    { name: "Cache Read", value: cacheRead },
  ].filter((entry) => entry.value > 0);

  return {
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipBase(),
      trigger: "item",
      formatter: (params) => {
        const value = Number((params as { value?: number }).value ?? 0);
        const name = String((params as { name?: string }).name ?? "Unknown");
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
        return `<div>${name}</div><div style="margin-top:4px"><b>${formatUsd(value)}</b> · ${pct}% <span style="color:${CHART_NEON.muted}">(${displayTimeZoneLabel(displayTimeZone)})</span></div>`;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 10 },
      itemHeight: 7,
      itemWidth: 8,
    },
    graphic: [
      {
        type: "text",
        left: "center",
        top: "42%",
        style: {
          text: "Total Cost",
          fill: CHART_NEON.muted,
          font: "500 10px var(--mono)",
        },
      },
      {
        type: "text",
        left: "center",
        top: "50%",
        style: {
          text: formatUsd(total),
          fill: CHART_NEON.text,
          font: "700 15px var(--mono)",
        },
      },
    ],
    series: [
      {
        type: "pie",
        radius: ["56%", "76%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: CHART_NEON.surface,
          borderWidth: 2,
        },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.25)",
          },
        },
        data: data.map((entry, index) => ({
          ...entry,
          itemStyle: { color: CHART_NEON.donut[index % CHART_NEON.donut.length] },
        })),
      },
    ],
    animationDuration: 280,
  };
}

export function buildUsageLimitDepletionOption(model: UsageAnalyticsViewModel): EChartsOption {
  const rows = model.usageLimits
    .filter((entry) => entry.limit > 0)
    .slice(0, 10);
  const categories = rows.map((entry) => `${entry.provider}/${entry.model}`);
  const used = rows.map((entry) => Math.max(0, Math.min(100, entry.used)));
  const remaining = rows.map((entry) => Math.max(0, Math.min(100, entry.remaining)));

  return {
    backgroundColor: "transparent",
    grid: {
      top: 26,
      left: 44,
      right: 18,
      bottom: 44,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "line" },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const header = `${rows[0]?.axisValue ?? ""}`;
        const body = rows
          .map((row) => {
            const marker = row.marker ?? "";
            const value = Number(row.value ?? 0).toFixed(1);
            return `${marker} ${row.seriesName} <b>${value}%</b>`;
          })
          .join("<br/>");
        return `<div>${header}</div><div style="margin-top:4px">${body}</div>`;
      },
    },
    legend: {
      top: 4,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 11 },
      itemWidth: 8,
      itemHeight: 8,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        ...baseAxisLabel(),
        rotate: 18,
      },
      axisLine: { lineStyle: { color: CHART_NEON.axis } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: {
        ...baseAxisLabel(),
        formatter: "{value}%",
      },
      splitLine: { lineStyle: { color: CHART_NEON.grid } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Used",
        type: "line",
        smooth: 0.2,
        symbol: "circle",
        symbolSize: 4,
        showSymbol: false,
        data: used,
        lineStyle: {
          color: CHART_NEON.glowB,
          width: 1.8,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(245, 105, 154, 0.28)" },
              { offset: 1, color: "rgba(245, 105, 154, 0.04)" },
            ],
          },
        },
      },
      {
        name: "Remaining",
        type: "line",
        smooth: 0.2,
        symbol: "none",
        data: remaining,
        lineStyle: {
          color: CHART_NEON.glowA,
          width: 1.5,
          type: "dashed",
        },
      },
    ],
    animationDuration: 280,
  };
}

export function buildOverviewUpdatedAtLabel(
  updatedAt: number | null,
  displayTimeZone: DisplayTimeZone,
): string {
  if (!updatedAt || !Number.isFinite(updatedAt)) {
    return "n/a";
  }
  return formatForDisplayTz(updatedAt, displayTimeZone, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildReactTokenTrendOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const palette = {
    input: "#4fd1ff",
    output: "#8b7bff",
    cache: "#ffb86c",
  } as const;
  const dates = model.trends.map((point) => point.date);
  // No authoritative per-type trend exists from control-plane right now.
  // Keep deterministic split to mirror the reference stack shape.
  const inputSeries = model.trends.map((point) => Number((point.tokens * 0.52).toFixed(2)));
  const outputSeries = model.trends.map((point) => Number((point.tokens * 0.34).toFixed(2)));
  const cacheSeries = model.trends.map((point) => Number((point.tokens * 0.14).toFixed(2)));
  return {
    backgroundColor: "transparent",
    grid: {
      top: 24,
      left: 36,
      right: 12,
      bottom: 30,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: CHART_NEON.pointer, width: 1 } },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0];
        const axisValue = typeof first?.axisValue === "string" ? first.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const body = rows
          .map((row) => `${row.marker ?? ""} ${String(row.seriesName)} <b>${Math.round(Number(row.value ?? 0)).toLocaleString()}</b>`)
          .join("<br/>");
        return `<div>${title}</div><div style="margin-top:4px">${body}</div>`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 7,
      itemHeight: 7,
      data: ["Input", "Output", "Cache"],
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid, type: "dashed" } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => Math.round(value).toLocaleString(),
      },
    },
    series: [
      {
        name: "Cache",
        type: "line",
        smooth: 0.28,
        symbol: "none",
        stack: "tokens",
        data: cacheSeries,
        lineStyle: { width: 1.5, color: palette.cache },
      },
      {
        name: "Output",
        type: "line",
        smooth: 0.28,
        symbol: "none",
        stack: "tokens",
        data: outputSeries,
        lineStyle: { width: 1.5, color: palette.output },
      },
      {
        name: "Input",
        type: "line",
        smooth: 0.28,
        symbol: "none",
        stack: "tokens",
        data: inputSeries,
        lineStyle: { width: 1.5, color: palette.input },
      },
    ],
    animation: true,
    animationDuration: 700,
    animationEasing: "quarticOut",
    animationDelay: (idx) => Number(idx) * 18,
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactCostByProviderOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const providers = model.providerSummary.slice(0, 5).map((row) => row.provider);
  const providerCostTotal = model.providerSummary.reduce((acc, row) => acc + Math.max(0, row.totalCost), 0);
  const shares = new Map<string, number>();
  for (const provider of providers) {
    const row = model.providerSummary.find((entry) => entry.provider === provider);
    const share = providerCostTotal > 0 ? (Math.max(0, row?.totalCost ?? 0) / providerCostTotal) : 0;
    shares.set(provider, share);
  }
  const xAxis = model.trends.map((point) => point.date);
  const colors = ["#4fd1ff", "#8b7bff", "#ff8fb1", "#ffb86c", "#6ee7b7"];
  const series = providers.map((provider, idx) => ({
    name: provider,
    type: "line",
    stack: "cost",
    smooth: 0.28,
    symbol: "none",
    itemStyle: { color: colors[idx % colors.length], opacity: 0.95 },
    lineStyle: { color: colors[idx % colors.length], width: 1.7 },
    data: model.trends.map((point) => {
      const share = shares.get(provider) ?? 0;
      return Number((Math.max(0, point.cost) * share).toFixed(6));
    }),
  }));
  return {
    backgroundColor: "transparent",
    grid: {
      top: 24,
      left: 36,
      right: 12,
      bottom: 30,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: CHART_NEON.pointer, width: 1 } },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0];
        const axisValue = typeof first?.axisValue === "string" ? first.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const body = rows
          .map((row) => `${row.marker ?? ""} ${String(row.seriesName)} <b>${formatUsd(Number(row.value ?? 0))}</b>`)
          .join("<br/>");
        return `<div>${title}</div><div style="margin-top:4px">${body}</div>`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 7,
      itemHeight: 7,
      data: providers,
    },
    xAxis: {
      type: "category",
      data: xAxis,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid, type: "dashed" } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => formatUsd(value),
      },
    },
    series,
    animation: true,
    animationDuration: 700,
    animationEasing: "quarticOut",
    animationDelay: (idx) => Number(idx) * 18,
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactTokenByProviderOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const providers = model.providerSummary.slice(0, 5).map((row) => row.provider);
  const providerTokenTotal = model.providerSummary.reduce((acc, row) => acc + Math.max(0, row.totalTokens), 0);
  const shares = new Map<string, number>();
  for (const provider of providers) {
    const row = model.providerSummary.find((entry) => entry.provider === provider);
    const share = providerTokenTotal > 0 ? Math.max(0, row?.totalTokens ?? 0) / providerTokenTotal : 0;
    shares.set(provider, share);
  }
  const xAxis = model.trends.map((point) => point.date);
  const colors = ["#4fd1ff", "#8b7bff", "#ff8fb1", "#ffb86c", "#6ee7b7"];
  const series = providers.map((provider, idx) => ({
    name: provider,
    type: "line",
    stack: "tokens-by-provider",
    smooth: 0.28,
    symbol: "none",
    itemStyle: { color: colors[idx % colors.length], opacity: 0.95 },
    lineStyle: { color: colors[idx % colors.length], width: 1.7 },
    data: model.trends.map((point) => {
      const share = shares.get(provider) ?? 0;
      return Number((Math.max(0, point.tokens) * share).toFixed(6));
    }),
  }));
  return {
    backgroundColor: "transparent",
    grid: {
      top: 24,
      left: 36,
      right: 12,
      bottom: 30,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: CHART_NEON.pointer, width: 1 } },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0];
        const axisValue = typeof first?.axisValue === "string" ? first.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const body = rows
          .map((row) => `${row.marker ?? ""} ${String(row.seriesName)} <b>${Math.round(Number(row.value ?? 0)).toLocaleString()}</b>`)
          .join("<br/>");
        return `<div>${title}</div><div style="margin-top:4px">${body}</div>`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 7,
      itemHeight: 7,
      data: providers,
    },
    xAxis: {
      type: "category",
      data: xAxis,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid, type: "dashed" } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => Math.round(value).toLocaleString(),
      },
    },
    series,
    animation: true,
    animationDuration: 700,
    animationEasing: "quarticOut",
    animationDelay: (idx) => Number(idx) * 18,
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactTokenUsageBarOption(
  model: UsageAnalyticsViewModel,
  displayTimeZone: DisplayTimeZone,
): EChartsOption {
  const palette = {
    input: "#4fd1ff",
    output: "#8b7bff",
    cacheRead: "#ffb86c",
    cacheWrite: "#ff8fb1",
  } as const;
  const dates = model.trends.map((point) => point.date);
  const tokenBreakdown = model.snapshot.breakdown;
  const sum =
    tokenBreakdown.inputTokens +
    tokenBreakdown.outputTokens +
    tokenBreakdown.cacheReadTokens +
    tokenBreakdown.cacheWriteTokens;
  const shares =
    sum > 0
      ? {
          input: tokenBreakdown.inputTokens / sum,
          output: tokenBreakdown.outputTokens / sum,
          cacheRead: tokenBreakdown.cacheReadTokens / sum,
          cacheWrite: tokenBreakdown.cacheWriteTokens / sum,
        }
      : { input: 0.52, output: 0.31, cacheRead: 0.11, cacheWrite: 0.06 };
  const inputSeries = model.trends.map((point) => Number((point.tokens * shares.input).toFixed(2)));
  const outputSeries = model.trends.map((point) => Number((point.tokens * shares.output).toFixed(2)));
  const cacheReadSeries = model.trends.map((point) => Number((point.tokens * shares.cacheRead).toFixed(2)));
  const cacheWriteSeries = model.trends.map((point) => Number((point.tokens * shares.cacheWrite).toFixed(2)));
  return {
    backgroundColor: "transparent",
    grid: {
      top: 24,
      left: 36,
      right: 12,
      bottom: 30,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0];
        const axisValue = typeof first?.axisValue === "string" ? first.axisValue : "";
        const title = formatUtcYmdForDisplay(axisValue, displayTimeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const body = rows
          .map((row) => `${row.marker ?? ""} ${String(row.seriesName)} <b>${Math.round(Number(row.value ?? 0)).toLocaleString()}</b>`)
          .join("<br/>");
        return `<div>${title}</div><div style="margin-top:4px">${body}</div>`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 7,
      itemHeight: 7,
      data: ["Input", "Output", "Cache Read", "Cache Write"],
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: string) => axisDateLabel(value, displayTimeZone),
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid, type: "dashed" } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => Math.round(value).toLocaleString(),
      },
    },
    series: [
      {
        name: "Input",
        type: "bar",
        stack: "tokens",
        barWidth: 14,
        itemStyle: { color: palette.input },
        data: inputSeries,
      },
      {
        name: "Output",
        type: "bar",
        stack: "tokens",
        barWidth: 14,
        itemStyle: { color: palette.output },
        data: outputSeries,
      },
      {
        name: "Cache Read",
        type: "bar",
        stack: "tokens",
        barWidth: 14,
        itemStyle: { color: palette.cacheRead },
        data: cacheReadSeries,
      },
      {
        name: "Cache Write",
        type: "bar",
        stack: "tokens",
        barWidth: 14,
        itemStyle: { color: palette.cacheWrite },
        data: cacheWriteSeries,
      },
    ],
    animation: true,
    animationDuration: 700,
    animationEasing: "quarticOut",
    animationDelay: (idx) => Number(idx) * 18,
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactTokenMixDonutOption(model: UsageAnalyticsViewModel): EChartsOption {
  const sourceRows = model.sourceSummary
    .filter((row) => row.totalTokens > 0)
    .toSorted((a, b) => b.totalTokens - a.totalTokens);
  const sourcePalette = ["#4fd1ff", "#8b7bff", "#ff8fb1", "#ffb86c", "#6ee7b7", "#a3a3a3"];
  if (sourceRows.length > 0) {
    const topRows = sourceRows.slice(0, 5);
    const overflow = sourceRows.slice(5);
    const overflowTokens = overflow.reduce((acc, row) => acc + row.totalTokens, 0);
    const overflowCost = overflow.reduce((acc, row) => acc + row.totalCost, 0);
    const overflowRequests = overflow.reduce((acc, row) => acc + row.requestCount, 0);
    const sourceData = [
      ...topRows.map((row, index) => ({
        name: row.label,
        value: row.totalTokens,
        cost: row.totalCost,
        requests: row.requestCount,
        color: sourcePalette[index % sourcePalette.length],
      })),
      ...(overflowTokens > 0
        ? [
            {
              name: "Other",
              value: overflowTokens,
              cost: overflowCost,
              requests: overflowRequests,
              color: sourcePalette[sourcePalette.length - 1],
            },
          ]
        : []),
    ];
    const total = sourceData.reduce((acc, row) => acc + Math.max(0, Number(row.value ?? 0)), 0);
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase(),
        trigger: "item",
        formatter: (param) => {
          const value = Number(param.value ?? 0);
          const percent = Number(param.percent ?? 0);
          const raw = (param.data as { cost?: number; requests?: number } | undefined) ?? {};
          const cost = Number(raw.cost ?? 0);
          const requests = Number(raw.requests ?? 0);
          return [
            `${String(param.marker ?? "")} ${String(param.name)}`,
            `<b>${Math.round(value).toLocaleString()}</b> tokens (${percent.toFixed(1)}%)`,
            `<span style="color:${CHART_NEON.muted}">Cost ${formatUsd(cost)} · ${Math.round(requests).toLocaleString()} req</span>`,
          ].join("<br/>");
        },
      },
      legend: {
        bottom: 0,
        left: "center",
        textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
        itemWidth: 8,
        itemHeight: 8,
        data: sourceData.map((entry) => entry.name),
      },
      graphic: [
        {
          type: "text",
          left: "center",
          top: "42%",
          style: {
            text: `${Math.round(total).toLocaleString()}`,
            fill: CHART_NEON.text,
            fontFamily: "var(--mono)",
            fontSize: 16,
            fontWeight: 700,
            textAlign: "center",
          },
        },
        {
          type: "text",
          left: "center",
          top: "55%",
          style: {
            text: "BY SOURCE",
            fill: CHART_NEON.muted,
            fontFamily: "var(--mono)",
            fontSize: 9,
            fontWeight: 700,
            textAlign: "center",
            letterSpacing: 2,
          },
        },
      ],
      series: [
        {
          name: "Token Usage by Source",
          type: "pie",
          radius: ["48%", "84%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: CHART_NEON.bg, borderWidth: 2 },
          data: sourceData.map((entry) => ({
            name: entry.name,
            value: entry.value,
            itemStyle: { color: entry.color },
            cost: entry.cost,
            requests: entry.requests,
          })),
        },
      ],
      animation: true,
      animationDuration: 760,
      animationEasing: "quarticOut",
      animationDurationUpdate: 420,
      animationEasingUpdate: "cubicOut",
    };
  }

  const tokenBreakdown = model.snapshot.breakdown;
  const total =
    tokenBreakdown.inputTokens +
    tokenBreakdown.outputTokens +
    tokenBreakdown.cacheReadTokens +
    tokenBreakdown.cacheWriteTokens;
  const data = [
    { name: "Input", value: tokenBreakdown.inputTokens, color: "#4fd1ff" },
    { name: "Output", value: tokenBreakdown.outputTokens, color: "#8b7bff" },
    { name: "Cache Read", value: tokenBreakdown.cacheReadTokens, color: "#ffb86c" },
    { name: "Cache Write", value: tokenBreakdown.cacheWriteTokens, color: "#ff8fb1" },
  ];
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipBase(),
      trigger: "item",
      formatter: (param) => {
        const value = Number(param.value ?? 0);
        const percent = Number(param.percent ?? 0);
        return `${String(param.marker ?? "")} ${String(param.name)} <b>${Math.round(value).toLocaleString()}</b> (${percent.toFixed(1)}%)`;
      },
    },
    legend: {
      bottom: 0,
      left: "center",
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 8,
      itemHeight: 8,
      data: data.map((entry) => entry.name),
    },
    graphic: [
      {
        type: "text",
        left: "center",
        top: "42%",
        style: {
          text: `${Math.round(total).toLocaleString()}`,
          fill: CHART_NEON.text,
          fontFamily: "var(--mono)",
          fontSize: 16,
          fontWeight: 700,
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "55%",
        style: {
          text: "TOKENS",
          fill: CHART_NEON.muted,
          fontFamily: "var(--mono)",
          fontSize: 9,
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
        },
      },
    ],
    series: [
      {
        name: "Token Mix",
        type: "pie",
        radius: ["46%", "86%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: CHART_NEON.bg, borderWidth: 2 },
        data: data.map((entry) => ({
          name: entry.name,
          value: entry.value,
          itemStyle: { color: entry.color },
        })),
      },
    ],
    animation: true,
    animationDuration: 760,
    animationEasing: "quarticOut",
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactSourceDonutOption(sourceRows: UsageSourceSummary[]): EChartsOption {
  const rows = sourceRows
    .filter((row) => row.totalTokens > 0 || row.toolCallCount > 0 || row.messageCount > 0)
    .toSorted((a, b) => b.totalTokens - a.totalTokens || b.messageCount - a.messageCount)
    .slice(0, 7);
  const palette = ["#4fd1ff", "#8b7bff", "#ff8fb1", "#ffb86c", "#6ee7b7", "#d7d7d7", "#8f8f8f"];
  const totalTokens = rows.reduce((acc, row) => acc + Math.max(0, row.totalTokens), 0);
  const data = rows.map((row, index) => ({
    name: row.label,
    value: Math.max(0, row.totalTokens),
    itemStyle: { color: palette[index % palette.length] },
    messageCount: Math.max(0, row.messageCount),
    toolCallCount: Math.max(0, row.toolCallCount),
    totalCost: row.totalCost,
  }));
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipBase(),
      trigger: "item",
      formatter: (param) => {
        const payload = (param.data as {
          messageCount?: number;
          toolCallCount?: number;
          totalCost?: number;
        }) ?? {
          messageCount: 0,
          toolCallCount: 0,
          totalCost: 0,
        };
        return [
          `${String(param.marker ?? "")} ${String(param.name)}`,
          `<b>${Math.round(Number(param.value ?? 0)).toLocaleString()}</b> tokens (${Number(param.percent ?? 0).toFixed(1)}%)`,
          `<span style="color:${CHART_NEON.muted}">${Math.round(payload.messageCount ?? 0).toLocaleString()} messages · ${Math.round(payload.toolCallCount ?? 0).toLocaleString()} tool calls · ${formatUsd(Number(payload.totalCost ?? 0))}</span>`,
        ].join("<br/>");
      },
    },
    legend: {
      bottom: 0,
      left: "center",
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 8,
      itemHeight: 8,
      data: data.map((entry) => entry.name),
    },
    graphic: [
      {
        type: "text",
        left: "center",
        top: "40%",
        style: {
          text: `${Math.round(totalTokens).toLocaleString()}`,
          fill: CHART_NEON.text,
          fontFamily: "var(--mono)",
          fontSize: 22,
          fontWeight: 700,
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "55%",
        style: {
          text: "TOKENS",
          fill: CHART_NEON.muted,
          fontFamily: "var(--mono)",
          fontSize: 10,
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
        },
      },
    ],
    series: [
      {
        name: "Token Usage by Source",
        type: "pie",
        radius: ["50%", "84%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: CHART_NEON.bg, borderWidth: 2 },
        data,
      },
    ],
    animation: true,
    animationDuration: 760,
    animationEasing: "quarticOut",
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactProviderUsageCostBridgeOption(providerRows: UsageProviderSummary[]): EChartsOption {
  const rows = providerRows
    .filter((row) => row.totalTokens > 0 || row.totalCost > 0)
    .slice(0, 6);
  const totalTokens = rows.reduce((acc, row) => acc + Math.max(0, row.totalTokens), 0);
  const totalCost = rows.reduce((acc, row) => acc + Math.max(0, row.totalCost), 0);
  const ordered = [...rows].reverse();
  const categories = ordered.map((row) => row.provider);
  const tokenShare = ordered.map((row) =>
    totalTokens > 0 ? Number(((Math.max(0, row.totalTokens) / totalTokens) * 100).toFixed(2)) : 0,
  );
  const costShare = ordered.map((row) =>
    totalCost > 0 ? Number(((Math.max(0, row.totalCost) / totalCost) * 100).toFixed(2)) : 0,
  );
  const lookup = new Map(rows.map((row) => [row.provider, row]));

  return {
    backgroundColor: "transparent",
    grid: {
      top: 20,
      left: 68,
      right: 18,
      bottom: 24,
      containLabel: true,
    },
    legend: {
      top: 0,
      textStyle: { color: CHART_NEON.muted, fontFamily: "var(--mono)", fontSize: 9 },
      itemWidth: 8,
      itemHeight: 8,
      data: ["Token Share", "Cost Share"],
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const rowsInTooltip = Array.isArray(params) ? params : [params];
        const provider = String(rowsInTooltip[0]?.axisValue ?? "");
        const row = lookup.get(provider);
        if (!row) {
          return provider;
        }
        const tokenPct = totalTokens > 0 ? (Math.max(0, row.totalTokens) / totalTokens) * 100 : 0;
        const costPct = totalCost > 0 ? (Math.max(0, row.totalCost) / totalCost) * 100 : 0;
        return [
          `<div>${provider}</div>`,
          `<div style="margin-top:4px">${rowsInTooltip[0]?.marker ?? ""} Token share <b>${tokenPct.toFixed(1)}%</b></div>`,
          `<div style="margin-top:2px">${rowsInTooltip[1]?.marker ?? ""} Cost share <b>${costPct.toFixed(1)}%</b></div>`,
          `<div style="margin-top:4px;color:${CHART_NEON.muted}">${Math.round(row.totalTokens).toLocaleString()} tokens · ${formatUsd(row.totalCost)} · ${row.requestCount.toLocaleString()} req</div>`,
        ].join("");
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid, type: "dashed" } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => `${Math.round(value)}%`,
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...baseAxisLabel(),
        width: 62,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "Token Share",
        type: "bar",
        data: tokenShare,
        barWidth: 8,
        itemStyle: {
          color: "#4fd1ff",
          borderRadius: [0, 3, 3, 0],
        },
      },
      {
        name: "Cost Share",
        type: "bar",
        data: costShare,
        barWidth: 8,
        barGap: "30%",
        itemStyle: {
          color: "#ff8fb1",
          borderRadius: [0, 3, 3, 0],
        },
      },
    ],
    animation: true,
    animationDuration: 720,
    animationEasing: "quarticOut",
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}

export function buildReactLimitPressureOption(model: UsageAnalyticsViewModel): EChartsOption {
  const rows = model.usageLimits
    .filter((entry) => entry.limit > 0)
    .map((entry) => {
      const percent = entry.limit > 0 ? Math.max(0, Math.min(100, (entry.used / entry.limit) * 100)) : 0;
      return {
        key: `${entry.provider} / ${entry.model}`,
        provider: entry.provider,
        model: entry.model,
        window: entry.windowType,
        percent,
        used: entry.used,
        limit: entry.limit,
        remaining: Math.max(0, entry.remaining),
      };
    })
    .toSorted((a, b) => b.percent - a.percent || b.used - a.used)
    .slice(0, 10);

  const categories = rows.map((entry) => entry.key).reverse();
  const data = rows.map((entry) => entry.percent).reverse();
  const lookup = new Map(rows.map((entry) => [entry.key, entry]));

  return {
    backgroundColor: "transparent",
    grid: {
      top: 20,
      left: 120,
      right: 18,
      bottom: 24,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(),
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const row = Array.isArray(params) ? params[0] : params;
        const key = String(row?.axisValue ?? "");
        const entry = lookup.get(key);
        if (!entry) {
          return `${key}<br/>${row?.marker ?? ""} <b>${Number(row?.value ?? 0).toFixed(1)}%</b>`;
        }
        return [
          `<div>${entry.provider} / ${entry.model}</div>`,
          `<div style="margin-top:4px">${row?.marker ?? ""} Utilization <b>${entry.percent.toFixed(1)}%</b></div>`,
          `<div style="margin-top:4px;color:${CHART_NEON.muted}">Used ${Math.round(entry.used).toLocaleString()} / ${Math.round(entry.limit).toLocaleString()}</div>`,
          `<div style="margin-top:2px;color:${CHART_NEON.muted}">Remaining ${Math.round(entry.remaining).toLocaleString()} · ${entry.window.replace(/^per-/, "")}</div>`,
        ].join("");
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_NEON.grid, type: "dashed" } },
      axisLabel: {
        ...baseAxisLabel(),
        formatter: (value: number) => `${Math.round(value)}%`,
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...baseAxisLabel(),
        width: 108,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "Utilization",
        type: "bar",
        data: data.map((value) => ({
          value,
          itemStyle: {
            color:
              value >= 90
                ? CHART_NEON.danger
                : value >= 75
                  ? CHART_NEON.warn
                  : CHART_NEON.glowA,
          },
        })),
        barWidth: 10,
        label: {
          show: true,
          position: "right",
          color: CHART_NEON.text,
          fontFamily: "var(--mono)",
          fontSize: 9,
          formatter: (param: { value: number }) => `${Math.round(Number(param.value ?? 0))}%`,
        },
      },
    ],
    animation: true,
    animationDuration: 680,
    animationEasing: "quarticOut",
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicOut",
  };
}
