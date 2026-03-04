import { html, nothing } from "lit";
import type { ConfigSnapshot } from "../types.ts";

type ModelsProps = {
  connected: boolean;
  loading: boolean;
  saving: boolean;
  applying: boolean;
  dirty: boolean;
  configForm: Record<string, unknown> | null;
  configSnapshot: ConfigSnapshot | null;
  modelSuggestions: string[];
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onReload: () => void;
  onSave: () => void;
  onApply: () => void;
  onOpenConfig: () => void;
};

type ModelRow = {
  raw: Record<string, unknown>;
  id: string;
  name: string;
  contextWindow: number | null;
  maxTokens: number | null;
};

type ProviderRow = {
  id: string;
  raw: Record<string, unknown>;
  baseUrl: string;
  api: string;
  auth: string;
  modelRows: ModelRow[];
};

type AliasRow = {
  modelId: string;
  alias: string;
};

type AuthRow = {
  id: string;
  provider: string;
  mode: string;
};

const MODEL_API_OPTIONS = [
  "openai-responses",
  "openai-completions",
  "openai-codex-responses",
  "anthropic-messages",
  "google-generative-ai",
  "github-copilot",
  "bedrock-converse-stream",
  "ollama",
] as const;

const AUTH_MODE_OPTIONS = ["api-key", "oauth", "token", "aws-sdk"] as const;
const PROVIDER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const MODEL_ID_RE = /^\S+$/;
const QUALIFIED_MODEL_ID_RE = /^[^\s/]+\/\S+$/;
const ALIAS_RE = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
const AUTH_PROFILE_REQUIRED_MODES = new Set(["oauth", "token", "aws-sdk"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseModelRow(raw: unknown): ModelRow | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const id = asString(record.id);
  const name = asString(record.name);
  if (!id || !name) {
    return null;
  }
  return {
    raw: record,
    id,
    name,
    contextWindow: asNumber(record.contextWindow),
    maxTokens: asNumber(record.maxTokens),
  };
}

function parseProviderRows(config: Record<string, unknown> | null): ProviderRow[] {
  const providers = asRecord(asRecord(config?.models)?.providers);
  if (!providers) {
    return [];
  }
  return Object.entries(providers)
    .map(([providerId, rawProvider]) => {
      const provider = asRecord(rawProvider) ?? {};
      const modelRows = asArray(provider.models)
        .map((entry) => parseModelRow(entry))
        .filter((entry): entry is ModelRow => Boolean(entry));
      return {
        id: providerId,
        raw: provider,
        baseUrl: asString(provider.baseUrl),
        api: asString(provider.api),
        auth: asString(provider.auth),
        modelRows,
      };
    })
    .toSorted((a, b) => a.id.localeCompare(b.id));
}

function parseAliasRows(config: Record<string, unknown> | null): AliasRow[] {
  const models = asRecord(asRecord(asRecord(config?.agents)?.defaults)?.models);
  if (!models) {
    return [];
  }
  return Object.entries(models)
    .map(([modelId, raw]) => {
      if (typeof raw === "string") {
        return { modelId, alias: raw.trim() };
      }
      const alias = asString(asRecord(raw)?.alias);
      return { modelId, alias };
    })
    .toSorted((a, b) => a.modelId.localeCompare(b.modelId));
}

function parseAuthRows(config: Record<string, unknown> | null): AuthRow[] {
  const profiles = asRecord(asRecord(config?.auth)?.profiles);
  if (!profiles) {
    return [];
  }
  return Object.entries(profiles)
    .map(([id, raw]) => {
      const record = asRecord(raw) ?? {};
      const provider = asString(record.provider) || id.split(":")[0] || "unknown";
      const mode = asString(record.mode) || "unknown";
      return { id, provider, mode };
    })
    .toSorted((a, b) => a.id.localeCompare(b.id));
}

function createProviderObject(params: {
  current: Record<string, unknown> | null;
  baseUrl: string;
  api: string;
  auth: string;
  apiKey: string;
}): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...(params.current ?? {}),
    baseUrl: params.baseUrl,
  };
  if (params.api) {
    next.api = params.api;
  }
  if (params.auth) {
    next.auth = params.auth;
  }
  if (params.apiKey) {
    next.apiKey = params.apiKey;
  }
  const currentModels = asArray(params.current?.models).filter(
    (entry) => asRecord(entry) !== null,
  );
  next.models = currentModels;
  return next;
}

function normalizePositiveInteger(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

function normalizeAuthMode(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

function isProviderIdValid(value: string): boolean {
  return PROVIDER_ID_RE.test(value.trim());
}

function isModelIdValid(value: string): boolean {
  return MODEL_ID_RE.test(value.trim());
}

function isQualifiedModelId(value: string): boolean {
  return QUALIFIED_MODEL_ID_RE.test(value.trim());
}

function isAliasValid(value: string): boolean {
  return ALIAS_RE.test(value.trim());
}

export function renderModels(props: ModelsProps) {
  const config = (props.configForm ?? props.configSnapshot?.config ?? null) as
    | Record<string, unknown>
    | null;
  const providerRows = parseProviderRows(config);
  const aliasRows = parseAliasRows(config);
  const authRows = parseAuthRows(config);

  const providerById = new Map(providerRows.map((row) => [row.id, row]));
  const providerModelCount = providerRows.reduce((acc, row) => acc + row.modelRows.length, 0);
  const authByProvider = new Map<string, number>();
  for (const row of authRows) {
    authByProvider.set(row.provider, (authByProvider.get(row.provider) ?? 0) + 1);
  }

  const knownModelIds = Array.from(
    new Set([
      ...props.modelSuggestions,
      ...aliasRows.map((row) => row.modelId),
      ...providerRows.flatMap((provider) => provider.modelRows.map((model) => `${provider.id}/${model.id}`)),
    ]),
  ).toSorted((a, b) => a.localeCompare(b));
  const invalidModelIdAliases = aliasRows.filter((row) => !isQualifiedModelId(row.modelId));
  const invalidAliasNames = aliasRows.filter((row) => row.alias && !isAliasValid(row.alias));

  return html`
    <section class="models-page">
      <div class="react-analytics-head">
        <h2>Models</h2>
        <span>// provider onboarding, model catalog, alias routing</span>
      </div>

      ${
        !props.connected
          ? html`<div class="callout warning">Disconnected. Connect first to load and edit config.</div>`
          : nothing
      }

      <div class="kpi-grid" style="margin-bottom: 14px;">
        <article class="kpi-card">
          <div class="kpi-card__inner">
            <div class="kpi-card__left">
              <div class="kpi-card__label">Providers</div>
              <div class="kpi-card__value">${providerRows.length}</div>
            </div>
          </div>
        </article>
        <article class="kpi-card">
          <div class="kpi-card__inner">
            <div class="kpi-card__left">
              <div class="kpi-card__label">Configured Models</div>
              <div class="kpi-card__value">${providerModelCount}</div>
            </div>
          </div>
        </article>
        <article class="kpi-card">
          <div class="kpi-card__inner">
            <div class="kpi-card__left">
              <div class="kpi-card__label">Model Aliases</div>
              <div class="kpi-card__value">${aliasRows.filter((row) => row.alias).length}</div>
            </div>
          </div>
        </article>
        <article class="kpi-card">
          <div class="kpi-card__inner">
            <div class="kpi-card__left">
              <div class="kpi-card__label">Auth Profiles</div>
              <div class="kpi-card__value">${authRows.length}</div>
            </div>
          </div>
        </article>
      </div>

      <section class="card">
        <div class="row" style="justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <div class="card-title">Providers</div>
            <div class="card-sub">Register API endpoints and attach model catalogs.</div>
          </div>
          <form
            class="row"
            style="gap: 8px; flex-wrap: wrap; justify-content: flex-end;"
            @submit=${(event: SubmitEvent) => {
              event.preventDefault();
              const form = event.currentTarget as HTMLFormElement;
              const data = new FormData(form);
              const providerId = asString(data.get("providerId"));
              const baseUrl = asString(data.get("baseUrl"));
              const api = asString(data.get("api"));
              const auth = asString(data.get("auth"));
              const apiKey = asString(data.get("apiKey"));
              if (!providerId || !baseUrl) {
                return;
              }
              if (!isProviderIdValid(providerId)) {
                alert(
                  "Provider id can use letters/numbers and . _ - only (no spaces). Example: qwen-portal",
                );
                return;
              }
              if (!/^https?:\/\//i.test(baseUrl)) {
                alert("Base URL should start with http:// or https://");
                return;
              }
              const current = providerById.get(providerId)?.raw ?? null;
              props.onPatch(
                ["models", "providers", providerId],
                createProviderObject({ current, baseUrl, api, auth, apiKey }),
              );
              form.reset();
            }}
          >
            <input
              name="providerId"
              placeholder="provider id (e.g. xai)"
              pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
              title="letters/numbers + . _ - only"
              required
            />
            <input name="baseUrl" placeholder="base URL" type="url" required />
            <select name="api">
              <option value="">api (optional)</option>
              ${MODEL_API_OPTIONS.map((api) => html`<option value=${api}>${api}</option>`)}
            </select>
            <select name="auth">
              <option value="">auth (optional)</option>
              ${AUTH_MODE_OPTIONS.map((mode) => html`<option value=${mode}>${mode}</option>`)}
            </select>
            <input name="apiKey" placeholder="api key/env ref (optional)" />
            <button class="btn" type="submit">Add / Update Provider</button>
          </form>
        </div>

        ${
          providerRows.length === 0
            ? html`<div class="callout" style="margin-top: 12px;">No providers configured in models.providers.</div>`
            : html`
                <div class="stack" style="margin-top: 12px; gap: 14px;">
                  ${providerRows.map((provider) => {
                    const providerAuthCount = authByProvider.get(provider.id) ?? 0;
                    const providerAuthMode = normalizeAuthMode(provider.auth);
                    const needsAuthProfile =
                      AUTH_PROFILE_REQUIRED_MODES.has(providerAuthMode) && providerAuthCount === 0;
                    return html`
                      <article class="models-provider-card">
                        <div class="row" style="justify-content: space-between; align-items: center; gap: 8px;">
                          <div>
                            <strong>${provider.id}</strong>
                            <div class="muted" style="font-size: 11px; margin-top: 2px;">
                              ${provider.baseUrl || "(no baseUrl)"}
                              ${provider.api ? html` · ${provider.api}` : nothing}
                              ${provider.auth ? html` · auth=${provider.auth}` : nothing}
                              · ${provider.modelRows.length} models
                              · ${providerAuthCount} auth profile(s)
                            </div>
                          </div>
                          <button
                            class="btn danger"
                            @click=${() => {
                              if (!confirm(`Delete provider ${provider.id}?`)) {
                                return;
                              }
                              props.onRemove(["models", "providers", provider.id]);
                            }}
                          >
                            Remove Provider
                          </button>
                        </div>

                        ${
                          needsAuthProfile
                            ? html`<div class="callout warning" style="margin-top: 8px;">
                                Missing auth profile for <b>${provider.id}</b> (${providerAuthMode}).
                                Add one in <code>auth.profiles</code> to avoid auth errors.
                                <button
                                  class="btn"
                                  style="margin-left: 8px;"
                                  @click=${() =>
                                    props.onPatch(["auth", "profiles", `${provider.id}:default`], {
                                      provider: provider.id,
                                      mode: providerAuthMode,
                                    })}
                                >
                                  Create profile stub
                                </button>
                              </div>`
                            : nothing
                        }

                        <form
                          class="row"
                          style="margin-top: 8px; gap: 8px; flex-wrap: wrap;"
                          @submit=${(event: SubmitEvent) => {
                            event.preventDefault();
                            const form = event.currentTarget as HTMLFormElement;
                            const data = new FormData(form);
                            const modelId = asString(data.get("modelId"));
                            const modelName = asString(data.get("modelName"));
                            if (!modelId || !modelName) {
                              return;
                            }
                            if (!isModelIdValid(modelId)) {
                              alert("Model id cannot contain spaces.");
                              return;
                            }
                            const currentModels = [...provider.modelRows];
                            const index = currentModels.findIndex(
                              (entry) => entry.id.toLowerCase() === modelId.toLowerCase(),
                            );
                            const existing = index >= 0 ? currentModels[index] : null;
                            const contextWindow = normalizePositiveInteger(data.get("contextWindow"));
                            const maxTokens = normalizePositiveInteger(data.get("maxTokens"));
                            const nextModel: Record<string, unknown> = {
                              ...(existing?.raw ?? {}),
                              id: modelId,
                              name: modelName,
                            };
                            if (contextWindow !== null) {
                              nextModel.contextWindow = contextWindow;
                            }
                            if (maxTokens !== null) {
                              nextModel.maxTokens = maxTokens;
                            }
                            const nextModelsRaw = currentModels.map((entry) => ({ ...entry.raw }));
                            if (index >= 0) {
                              nextModelsRaw[index] = nextModel;
                            } else {
                              nextModelsRaw.push(nextModel);
                            }
                            props.onPatch(["models", "providers", provider.id, "models"], nextModelsRaw);
                            form.reset();
                          }}
                        >
                          <input
                            name="modelId"
                            placeholder="model id"
                            pattern="\\S+"
                            title="no spaces"
                            required
                          />
                          <input name="modelName" placeholder="display name" required />
                          <input name="contextWindow" type="number" min="1" step="1" placeholder="context" />
                          <input name="maxTokens" type="number" min="1" step="1" placeholder="max tokens" />
                          <button class="btn" type="submit">Add / Update Model</button>
                        </form>

                        ${
                          provider.modelRows.length === 0
                            ? html`<div class="muted" style="margin-top: 10px;">No models yet.</div>`
                            : html`
                                <table class="react-provider-table usage-detail-table" style="margin-top: 10px;">
                                  <thead>
                                    <tr>
                                      <th>Model</th>
                                      <th>Name</th>
                                      <th>Context</th>
                                      <th>Max Tokens</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${provider.modelRows.map(
                                      (model) => html`
                                        <tr>
                                          <td><span class="react-model-label">${model.id}</span></td>
                                          <td>${model.name}</td>
                                          <td>${model.contextWindow?.toLocaleString() ?? "--"}</td>
                                          <td>${model.maxTokens?.toLocaleString() ?? "--"}</td>
                                          <td>
                                            <button
                                              class="btn danger"
                                              @click=${() => {
                                                const nextModels = provider.modelRows
                                                  .filter((entry) => entry.id !== model.id)
                                                  .map((entry) => entry.raw);
                                                props.onPatch([
                                                  "models",
                                                  "providers",
                                                  provider.id,
                                                  "models",
                                                ], nextModels);
                                              }}
                                            >
                                              Remove
                                            </button>
                                          </td>
                                        </tr>
                                      `,
                                    )}
                                  </tbody>
                                </table>
                              `
                        }
                      </article>
                    `;
                  })}
                </div>
              `
        }
      </section>

      <section class="card" style="margin-top: 16px;">
        <div class="row" style="justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <div class="card-title">Model Aliases</div>
            <div class="card-sub">Manage agents.defaults.models alias mapping.</div>
          </div>
          <form
            class="row"
            style="gap: 8px; flex-wrap: wrap; justify-content: flex-end;"
            @submit=${(event: SubmitEvent) => {
              event.preventDefault();
              const form = event.currentTarget as HTMLFormElement;
              const data = new FormData(form);
              const modelId = asString(data.get("modelId"));
              const alias = asString(data.get("alias"));
              if (!modelId || !alias) {
                return;
              }
              if (!isQualifiedModelId(modelId)) {
                alert("Model id should look like provider/model (no spaces).");
                return;
              }
              if (!isAliasValid(alias)) {
                alert("Alias should start with a letter and contain only letters/numbers/._-.");
                return;
              }
              const conflict = aliasRows.find(
                (row) => row.modelId !== modelId && row.alias.toLowerCase() === alias.toLowerCase(),
              );
              if (conflict) {
                alert(`Alias ${alias} is already used by ${conflict.modelId}.`);
                return;
              }
              props.onPatch(["agents", "defaults", "models", modelId, "alias"], alias);
              form.reset();
            }}
          >
            <input
              name="modelId"
              placeholder="provider/model"
              list="models-known-ids"
              pattern="[^\\s/]+/\\S+"
              title="format: provider/model"
              required
            />
            <input
              name="alias"
              placeholder="alias"
              pattern="[A-Za-z][A-Za-z0-9._-]*"
              title="start with letter; use letters/numbers/._-"
              required
            />
            <button class="btn" type="submit">Add Alias</button>
          </form>
        </div>

        ${
          invalidModelIdAliases.length > 0 || invalidAliasNames.length > 0
            ? html`<div class="callout warning" style="margin-top: 12px;">
                Found ${invalidModelIdAliases.length} invalid model id entr${
                  invalidModelIdAliases.length === 1 ? "y" : "ies"
                } and ${invalidAliasNames.length} invalid alias entr${
                  invalidAliasNames.length === 1 ? "y" : "ies"
                }.
                Model id should look like <code>provider/model</code>, alias should start with a
                letter and contain only letters/numbers/._-.
              </div>`
            : nothing
        }

        ${
          aliasRows.length === 0
            ? html`<div class="callout" style="margin-top: 12px;">No alias entries found in agents.defaults.models.</div>`
            : html`
                <table class="react-provider-table usage-detail-table" style="margin-top: 12px;">
                  <thead>
                    <tr>
                      <th>Model ID</th>
                      <th>Alias</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${aliasRows.map(
                      (row) => html`
                        <tr>
                          <td><span class="react-model-label">${row.modelId}</span></td>
                          <td>
                            <input
                              value=${row.alias}
                              placeholder="(no alias)"
                              pattern="[A-Za-z][A-Za-z0-9._-]*"
                              title="start with letter; use letters/numbers/._-"
                              @change=${(event: Event) => {
                                const value = asString((event.target as HTMLInputElement).value);
                                if (!value) {
                                  props.onRemove(["agents", "defaults", "models", row.modelId, "alias"]);
                                  return;
                                }
                                if (!isAliasValid(value)) {
                                  alert("Alias should start with a letter and contain only letters/numbers/._-.");
                                  (event.target as HTMLInputElement).value = row.alias;
                                  return;
                                }
                                const conflict = aliasRows.find(
                                  (entry) =>
                                    entry.modelId !== row.modelId &&
                                    entry.alias.toLowerCase() === value.toLowerCase(),
                                );
                                if (conflict) {
                                  alert(`Alias ${value} is already used by ${conflict.modelId}.`);
                                  (event.target as HTMLInputElement).value = row.alias;
                                  return;
                                }
                                props.onPatch(["agents", "defaults", "models", row.modelId, "alias"], value);
                              }}
                            />
                          </td>
                          <td>
                            <button
                              class="btn danger"
                              @click=${() =>
                                props.onRemove(["agents", "defaults", "models", row.modelId, "alias"])}
                            >
                              Remove Alias
                            </button>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `
        }
      </section>

      <section class="card" style="margin-top: 16px;">
        <div class="card-title">Auth Profiles</div>
        <div class="card-sub">Profiles from auth.profiles (for provider auth visibility).</div>
        ${
          authRows.length === 0
            ? html`<div class="muted" style="margin-top: 10px;">No auth profiles configured.</div>`
            : html`
                <table class="react-provider-table usage-detail-table" style="margin-top: 12px;">
                  <thead>
                    <tr>
                      <th>Profile ID</th>
                      <th>Provider</th>
                      <th>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${authRows.map(
                      (row) => html`
                        <tr>
                          <td><span class="react-model-label">${row.id}</span></td>
                          <td><span class="react-provider-badge">${row.provider}</span></td>
                          <td>${row.mode}</td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `
        }
      </section>

      <datalist id="models-known-ids">
        ${knownModelIds.map((id) => html`<option value=${id}></option>`) }
      </datalist>

      <div class="row" style="margin-top: 16px; gap: 8px; flex-wrap: wrap;">
        <button class="btn" ?disabled=${props.loading} @click=${props.onReload}>
          ${props.loading ? "Refreshing…" : "Reload"}
        </button>
        <button class="btn" ?disabled=${props.saving || !props.connected} @click=${props.onSave}>
          ${props.saving ? "Saving…" : "Save"}
        </button>
        <button class="btn primary" ?disabled=${props.applying || !props.connected} @click=${props.onApply}>
          ${props.applying ? "Applying…" : "Apply"}
        </button>
        <button class="btn" @click=${props.onOpenConfig}>Open Full Config</button>
        ${
          props.dirty
            ? html`<span class="pill warn">Unsaved changes</span>`
            : html`<span class="pill ok">Saved</span>`
        }
      </div>

      ${
        props.dirty
          ? html`<div class="callout warning" style="margin-top: 12px;">
              You have pending model/config changes. Save or Apply before leaving this page.
            </div>`
          : nothing
      }
    </section>
  `;
}
