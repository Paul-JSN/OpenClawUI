import { html, nothing } from "lit";
import { icon } from "./icons.ts";
import type { OpenClawApp } from "./app.ts";

function describeTarget(plan: NonNullable<OpenClawApp["modelsDeletePlan"]>): string {
  return plan.target.kind === "provider"
    ? `Provider: ${plan.target.providerId}`
    : `Model: ${plan.target.modelKey}`;
}

export function renderModelsTab(state: OpenClawApp) {
  const {
    modelsLoading,
    modelsError,
    modelsProviders,
    modelsAliases,
    modelsDefaults,
    modelsAgents,
    modelsDeletePlan,
    modelsDeleteBusy,
    modelsDeleteError,
  } = state;

  if (modelsLoading) {
    return html`
      <div class="empty-state">
        <div class="empty-state__icon">${icon("loader")}</div>
        <div class="empty-state__title">Loading models…</div>
      </div>
    `;
  }

  if (modelsError) {
    return html`
      <div class="empty-state">
        <div class="empty-state__icon">${icon("bug")}</div>
        <div class="empty-state__title">Failed to load models</div>
        <div class="empty-state__subtitle">${modelsError}</div>
      </div>
    `;
  }

  const providerKeys = Object.keys(modelsProviders ?? {});
  const aliasCount = modelsAliases?.length ?? 0;
  const primaryModel = modelsDefaults?.primary ?? "—";
  const fallbackCount = modelsDefaults?.fallbacks?.length ?? 0;

  return html`
    <section class="overview-grid">
      <article class="card">
        <h3>Providers (${providerKeys.length})</h3>
        ${providerKeys.length === 0
          ? html`<div class="muted">No providers configured.</div>`
          : html`
              <div class="stack">
                ${providerKeys.map((key) => {
                  const provider = modelsProviders[key];
                  const modelCount = provider?.models?.length ?? 0;
                  return html`
                    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px;">
                      <div>
                        <div><strong>${key}</strong> · ${modelCount} model(s)</div>
                        ${provider?.baseUrl
                          ? html`<div class="muted" style="font-size:12px">${provider.baseUrl}</div>`
                          : nothing}
                        <div class="stack" style="margin-top:6px; gap:4px;">
                          ${provider.models.map((model) => {
                            const modelKey = `${key}/${model.id}`;
                            return html`
                              <div class="row" style="justify-content:space-between;gap:8px;">
                                <span><code>${modelKey}</code></span>
                                <button
                                  class="btn btn-sm danger"
                                  ?disabled=${modelsDeleteBusy}
                                  @click=${() => void state.handleModelsDeleteModel(modelKey)}
                                >
                                  Delete model
                                </button>
                              </div>
                            `;
                          })}
                        </div>
                      </div>
                      <button
                        class="btn btn-sm danger"
                        ?disabled=${modelsDeleteBusy}
                        @click=${() => void state.handleModelsDeleteProvider(key)}
                      >
                        Delete provider
                      </button>
                    </div>
                  `;
                })}
              </div>
            `}
      </article>

      <article class="card">
        <h3>Aliases (${aliasCount})</h3>
        ${aliasCount === 0
          ? html`<div class="muted">No aliases configured.</div>`
          : html`
              <div class="stack">
                ${modelsAliases.map((entry) => {
                  return html`<div><code>${entry.alias}</code> → <code>${entry.target}</code></div>`;
                })}
              </div>
            `}
      </article>

      <article class="card">
        <h3>Defaults</h3>
        <div>Primary: <code>${primaryModel}</code></div>
        <div>Fallbacks: ${fallbackCount}</div>
      </article>

      <article class="card">
        <h3>Agent overrides</h3>
        ${modelsAgents.length === 0
          ? html`<div class="muted">No agent-specific model overrides.</div>`
          : html`
              <div class="stack">
                ${modelsAgents.map((agent) => {
                  const modelText =
                    typeof agent.model === "string"
                      ? agent.model
                      : agent.model?.primary ?? "(none)";
                  return html`<div><strong>${agent.id}</strong>: <code>${modelText}</code></div>`;
                })}
              </div>
            `}
      </article>

      ${
        modelsDeletePlan
          ? html`
              <article class="card">
                <h3>Delete preview · ${describeTarget(modelsDeletePlan)}</h3>
                <div class="muted" style="margin-bottom:8px;">
                  Replacement model (when needed):
                  <code>${modelsDeletePlan.replacementModel ?? "none"}</code>
                </div>

                ${
                  modelsDeletePlan.blockers.length > 0
                    ? html`
                        <div class="callout warning" style="margin-bottom:10px;">
                          <strong>Blocked</strong>
                          <ul>
                            ${modelsDeletePlan.blockers.map((item) => html`<li>${item}</li>`)}
                          </ul>
                        </div>
                      `
                    : nothing
                }

                <div style="margin-bottom:8px;"><strong>Planned changes</strong></div>
                <div class="stack" style="max-height:260px; overflow:auto; border:1px solid var(--oc-border,#333); border-radius:8px; padding:8px;">
                  ${modelsDeletePlan.impacts.map((impact) => {
                    return html`
                      <div>
                        <div><code>${impact.path}</code> · ${impact.action}</div>
                        <div class="muted" style="font-size:12px;">${impact.before}${impact.after ? html` → ${impact.after}` : nothing}</div>
                      </div>
                    `;
                  })}
                </div>

                ${
                  modelsDeleteError
                    ? html`<div class="callout warning" style="margin-top:10px;">${modelsDeleteError}</div>`
                    : nothing
                }

                <div class="row" style="justify-content:flex-end; gap:8px; margin-top:10px;">
                  <button class="btn btn-sm" ?disabled=${modelsDeleteBusy} @click=${() => state.handleModelsDeleteCancel()}>
                    Cancel
                  </button>
                  <button
                    class="btn btn-sm danger"
                    ?disabled=${modelsDeleteBusy || modelsDeletePlan.blockers.length > 0}
                    @click=${() => void state.handleModelsDeleteApply()}
                  >
                    ${modelsDeleteBusy ? "Applying…" : "Apply delete"}
                  </button>
                </div>
              </article>
            `
          : nothing
      }
    </section>
  `;
}
