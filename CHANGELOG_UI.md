# CHANGELOG_UI

## What Changed

- Refined Overview/Usage visual system to better match the reference mood while preserving OpenClaw semantics.
  - Updated dark palette away from over-blue tint in `src/styles/base.css`.
  - Added chart-mode pills (`Cost / Limits / Activity`) in usage analytics.
  - Converted usage filter header to collapsed-summary-first UX (default collapsed).
- Reworked analytics chart compositions in `src/ui/views/usage-render-analytics.ts`.
  - `Cost` mode now uses `Donut + Mini Trend` (replacing the prior secondary bar-focused composition).
  - `Limits` mode emphasizes depletion/utilization with dedicated chart + table.
  - `Activity` mode focuses on sessions/day-activity trends.
- Re-tuned ECharts rendering/tooltip behavior for smoother hover interactions.
  - `oc-echart` now uses canvas renderer with immediate option updates.
  - Tooltips/axis pointer/emphasis styling simplified in `src/ui/views/charts/options.ts` to reduce jitter/lag feel.
- Added usage view state wiring:
  - `usageAnalyticsMode: "cost" | "limits" | "activity"`
  - `usageFiltersCollapsed` (default `true`)
  - Updated state/props flow in `app.ts`, `app-view-state.ts`, `app-render-usage-tab.ts`, `usageTypes.ts`, `usage.ts`.
- Added analytics adapter + schema validation in `ui/src/ui/views/usage-analytics-adapter.ts`.
  - Zod validation for usage/limits/cost/trend/provider-summary mapping.
  - Safe fallback mapping with non-fatal empty states and confidence/source/freshness.
- Added ECharts chart infrastructure in `ui/src/ui/components/echart-host.ts` and `ui/src/ui/views/charts/*`.
  - `theme.ts`: neon palette and chart visual constants.
  - `options.ts`: reusable line/area, donut, stacked bar+line option builders.
  - `timezone.ts`: UTC range math + UTC/GMT+8 display formatters.
- Implemented fixed/dynamic chart roles:
  - `Overview`: fixed `Last 7 days` trend rendering.
  - `Usage`: dynamic range analytics (`1d/7d/30d/custom`) for trend/cost/limits.
- Implemented timezone policy:
  - Query/aggregation boundary generation is UTC-only.
  - UI display timezone toggle is `GMT+8` (default) or `UTC`.
  - Chart x-axis and tooltip formatting uses selected display timezone.
  - UTC server timestamps are converted at render-time only.
- Split overview vs usage analytics loading state:
  - Overview uses dedicated state slice (`overviewUsage*`).
  - Usage keeps independent range/selection state (`usage*`).
- Updated usage controller behavior (`ui/src/ui/controllers/usage.ts`):
  - `sessions.usage`/`usage.cost` requested in UTC mode.
  - Legacy fallback for unsupported date interpretation remains.
  - Added dedicated `loadOverviewUsage()` fixed to UTC last 7-day range.
- Upgraded analytics rendering in:
  - `ui/src/ui/views/usage-render-analytics.ts`
  - `ui/src/ui/views/usage.ts`
  - `ui/src/ui/views/usage-render-overview.ts`
  - `ui/src/ui/views/usage-render-details.ts`
  - `ui/src/ui/views/usage-metrics.ts`
- Added `echarts` dependency in `ui/package.json`.
- Updated analytics styling in `ui/src/styles/components.css` for neon/glow chart cards, tooltips, and no-data placeholders.
- Added/maintained label freeze artifact:
  - `ui/LABEL_FREEZE_CHECKLIST.md`

## What Stayed Unchanged

- Navigation tab IDs and route paths in `ui/src/ui/navigation.ts`.
- Upstream tab labels and terminology in `ui/src/i18n/locales/en.ts`.
- Existing control-plane modules and semantics:
  - sessions
  - cron
  - config
  - channels
  - skills
  - nodes
- Auth and routing behavior.
- Native stack remains Lit + TypeScript + Vite.

## Known Limitations

- ECharts increased bundle size (`dist/control-ui/assets/index-*.js` now significantly larger).
- Provider limits are provider-window based when available from `usage.status`; model-level hard limits may be unavailable.
- Missing limit/reset/trend fields render placeholder blocks with `데이터 없음` and safe fallback badges.
- `usage.status` may be missing on older gateways; UI still renders usage/cost analytics from `sessions.usage` and `usage.cost`.
- `npm run test` (browser-mode Vitest) currently fails in this environment due local listen permission error (`EACCES ::1:63315`).

## Deployment Notes

- Build and serve the UI package as usual (`ui` workspace flow).
- No installer/system-wide changes required.
- No backend contract changes were introduced; adapter layer shields UI from payload drift.

## Rollback Notes

- Revert `ui/` changes only.
- Key files:
  - `ui/src/ui/components/echart-host.ts`
  - `ui/src/ui/views/charts/timezone.ts`
  - `ui/src/ui/views/charts/theme.ts`
  - `ui/src/ui/views/charts/options.ts`
  - `ui/src/ui/views/usage-analytics-adapter.ts`
  - `ui/src/ui/views/usage-render-analytics.ts`
  - `ui/src/ui/controllers/usage.ts`
  - `ui/src/ui/views/usage.ts`
  - `ui/src/ui/views/overview.ts`
  - `ui/src/styles/components.css`
  - state/render wiring in `ui/src/ui/app-render.ts`, `ui/src/ui/app-render-usage-tab.ts`, `ui/src/ui/app-settings.ts`, `ui/src/ui/app.ts`, `ui/src/ui/app-view-state.ts`, `ui/src/ui/views/usageTypes.ts`
