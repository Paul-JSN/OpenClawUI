import { html, nothing } from "lit";
import type { ConfigSnapshot } from "../types.ts";
import {
  DEFAULT_MODELS_CATALOG,
  DEFAULT_PROVIDER_IDS,
  type DefaultCatalogModel,
} from "./models-catalog-defaults.ts";

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

type AliasSuggestionRow = {
  modelId: string;
  alias: string;
};

type WizardPreset = {
  key: string;
  label: string;
  providerId?: string;
  baseUrl?: string;
  api?: string;
  auth?: string;
  modelId?: string;
  modelName?: string;
  alias?: string;
};

type ProviderTemplate = {
  baseUrl: string;
  api: string;
  auth: string;
};

type CatalogModelRow = {
  provider: string;
  id: string;
  name: string;
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
const WIZARD_PRESETS: WizardPreset[] = [
  {
    key: "custom",
    label: "Custom",
  },
  {
    key: "openai-compatible",
    label: "OpenAI compatible",
    api: "openai-responses",
    auth: "api-key",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    key: "qwen-portal",
    label: "Qwen Portal",
    providerId: "qwen-portal",
    api: "openai-completions",
    auth: "oauth",
    baseUrl: "https://portal.qwen.ai/v1",
    modelId: "coder-model",
    modelName: "Qwen Coder",
    alias: "qwen",
  },
  {
    key: "ollama-local",
    label: "Ollama (local)",
    providerId: "ollama-local",
    api: "ollama",
    auth: "token",
    baseUrl: "http://127.0.0.1:11434",
    modelId: "llama3.1:8b",
    modelName: "Llama 3.1 8B",
  },
];

const PROVIDER_TEMPLATES: Record<string, ProviderTemplate> = {
  "amazon-bedrock": {
    baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
    api: "bedrock-converse-stream",
    auth: "aws-sdk",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    api: "anthropic-messages",
    auth: "api-key",
  },
  "azure-openai-responses": {
    baseUrl: "https://YOUR-RESOURCE.openai.azure.com/openai/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  cerebras: {
    baseUrl: "https://api.cerebras.ai/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  "github-copilot": {
    baseUrl: "https://api.githubcopilot.com",
    api: "github-copilot",
    auth: "token",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    api: "google-generative-ai",
    auth: "api-key",
  },
  "google-antigravity": {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    api: "google-generative-ai",
    auth: "api-key",
  },
  "google-gemini-cli": {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    api: "google-generative-ai",
    auth: "oauth",
  },
  "google-vertex": {
    baseUrl: "https://us-central1-aiplatform.googleapis.com/v1",
    api: "google-generative-ai",
    auth: "oauth",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  huggingface: {
    baseUrl: "https://router.huggingface.co/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  "kimi-coding": {
    baseUrl: "https://api.kimi.com/coding/",
    api: "openai-completions",
    auth: "api-key",
  },
  minimax: {
    baseUrl: "https://api.minimax.io/anthropic",
    api: "anthropic-messages",
    auth: "oauth",
  },
  "minimax-cn": {
    baseUrl: "https://api.minimax.chat/v1",
    api: "openai-completions",
    auth: "oauth",
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  "openai-codex": {
    baseUrl: "https://api.openai.com/v1",
    api: "openai-codex-responses",
    auth: "api-key",
  },
  opencode: {
    baseUrl: "https://api.opencode.ai/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  "qwen-portal": {
    baseUrl: "https://portal.qwen.ai/v1",
    api: "openai-completions",
    auth: "oauth",
  },
  "vercel-ai-gateway": {
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    api: "openai-responses",
    auth: "api-key",
  },
  zai: {
    baseUrl: "https://api.z.ai/api/paas/v4/",
    api: "openai-responses",
    auth: "api-key",
  },
};

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

function upsertModelRows(
  current: ModelRow[],
  modelId: string,
  modelName: string,
  contextWindow: number | null,
  maxTokens: number | null,
): Record<string, unknown>[] {
  const index = current.findIndex((entry) => entry.id.toLowerCase() === modelId.toLowerCase());
  const existing = index >= 0 ? current[index] : null;
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
  const nextModelsRaw = current.map((entry) => ({ ...entry.raw }));
  if (index >= 0) {
    nextModelsRaw[index] = nextModel;
  } else {
    nextModelsRaw.push(nextModel);
  }
  return nextModelsRaw;
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

function deriveAliasSeed(modelId: string): string {
  const parts = modelId.split("/");
  const modelPart = parts.length > 1 ? parts.slice(1).join("-") : parts[0] ?? "";
  const providerPart = parts[0] ?? "model";
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-._]+|[-._]+$/g, "");

  let seed = normalize(modelPart);
  if (!seed) {
    seed = normalize(`${providerPart}-model`);
  }
  if (!seed) {
    seed = "model";
  }
  if (!/^[a-z]/.test(seed)) {
    seed = `m-${seed}`;
  }
  if (!isAliasValid(seed)) {
    return "model";
  }
  return seed;
}

function buildAliasSuggestions(modelIds: string[], aliasRows: AliasRow[]): AliasSuggestionRow[] {
  const usedAliases = new Set(
    aliasRows
      .map((row) => row.alias.trim().toLowerCase())
      .filter((alias) => alias.length > 0),
  );
  const aliasByModelId = new Map(aliasRows.map((row) => [row.modelId, row.alias.trim()]));
  const suggestions: AliasSuggestionRow[] = [];

  for (const modelId of modelIds) {
    const existing = aliasByModelId.get(modelId);
    if (existing && isAliasValid(existing)) {
      continue;
    }
    const base = deriveAliasSeed(modelId);
    let candidate = base;
    let suffix = 2;
    while (usedAliases.has(candidate.toLowerCase())) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    if (!isAliasValid(candidate)) {
      continue;
    }
    usedAliases.add(candidate.toLowerCase());
    suggestions.push({ modelId, alias: candidate });
  }

  return suggestions;
}

function parseCatalogFromSuggestions(modelSuggestions: string[]): CatalogModelRow[] {
  return modelSuggestions
    .map((entry) => {
      const value = entry.trim();
      const slash = value.indexOf("/");
      if (slash <= 0 || slash >= value.length - 1) {
        return null;
      }
      const provider = value.slice(0, slash).trim();
      const id = value.slice(slash + 1).trim();
      if (!provider || !id) {
        return null;
      }
      return { provider, id, name: id };
    })
    .filter((row): row is CatalogModelRow => Boolean(row));
}

function mergeCatalogModels(...groups: Array<CatalogModelRow[] | DefaultCatalogModel[]>): CatalogModelRow[] {
  const seen = new Set<string>();
  const out: CatalogModelRow[] = [];
  for (const group of groups) {
    for (const row of group) {
      const provider = asString(row.provider);
      const id = asString(row.id);
      const name = asString(row.name) || id;
      if (!provider || !id) {
        continue;
      }
      const key = `${provider.toLowerCase()}::${id.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({ provider, id, name });
    }
  }
  return out.toSorted((a, b) => {
    const providerCmp = a.provider.localeCompare(b.provider);
    if (providerCmp !== 0) {
      return providerCmp;
    }
    return a.name.localeCompare(b.name);
  });
}

function resolveProviderTemplate(providerId: string, current: ProviderRow | undefined): ProviderTemplate {
  const template = PROVIDER_TEMPLATES[providerId] ?? null;
  return {
    baseUrl: current?.baseUrl || template?.baseUrl || "",
    api: current?.api || template?.api || "openai-responses",
    auth: current?.auth || template?.auth || "api-key",
  };
}

function setEasyModelOptions(
  form: HTMLFormElement,
  providerId: string,
  modelsByProvider: Map<string, CatalogModelRow[]>,
): void {
  const modelSelect = form.elements.namedItem("modelId");
  if (!(modelSelect instanceof HTMLSelectElement)) {
    return;
  }
  const aliasInput = form.elements.namedItem("alias");
  const models = modelsByProvider.get(providerId) ?? [];
  const previousModelId = asString(modelSelect.value);

  while (modelSelect.options.length > 0) {
    modelSelect.remove(0);
  }

  const placeholder = new Option(models.length > 0 ? "select model" : "no catalog models", "");
  placeholder.disabled = models.length === 0;
  placeholder.selected = true;
  modelSelect.add(placeholder);

  for (const model of models) {
    const option = new Option(`${model.name} (${model.id})`, model.id);
    modelSelect.add(option);
  }

  if (models.some((model) => model.id === previousModelId)) {
    modelSelect.value = previousModelId;
  } else if (models.length > 0) {
    modelSelect.value = models[0].id;
  }

  if (aliasInput instanceof HTMLInputElement) {
    const activeModelId = modelSelect.value || models[0]?.id || "";
    aliasInput.placeholder = activeModelId
      ? `alias (optional, e.g. ${deriveAliasSeed(`${providerId}/${activeModelId}`)})`
      : "alias (optional)";
  }
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

  const catalogModels = mergeCatalogModels(
    parseCatalogFromSuggestions(props.modelSuggestions),
    DEFAULT_MODELS_CATALOG,
  );
  const catalogProviders = Array.from(
    new Set([...DEFAULT_PROVIDER_IDS, ...catalogModels.map((entry) => entry.provider)]),
  ).toSorted((a, b) => a.localeCompare(b));
  const catalogModelsByProvider = new Map<string, CatalogModelRow[]>();
  for (const row of catalogModels) {
    const list = catalogModelsByProvider.get(row.provider) ?? [];
    list.push(row);
    catalogModelsByProvider.set(row.provider, list);
  }

  const providerModelIds = providerRows
    .flatMap((provider) => provider.modelRows.map((model) => `${provider.id}/${model.id}`))
    .toSorted((a, b) => a.localeCompare(b));
  const providerModelIdSet = new Set(providerModelIds);

  const activeProviderIds = Array.from(
    new Set([
      ...providerRows.map((row) => row.id),
      ...aliasRows
        .map((row) => {
          const slash = row.modelId.indexOf("/");
          return slash > 0 ? row.modelId.slice(0, slash).trim() : "";
        })
        .filter(Boolean),
    ]),
  ).toSorted((a, b) => a.localeCompare(b));

  const knownModelIds = Array.from(
    new Set([
      ...props.modelSuggestions,
      ...aliasRows.map((row) => row.modelId),
      ...providerModelIds,
      ...catalogModels.map((entry) => `${entry.provider}/${entry.id}`),
    ]),
  ).toSorted((a, b) => a.localeCompare(b));
  const invalidModelIdAliases = aliasRows.filter((row) => !isQualifiedModelId(row.modelId));
  const invalidAliasNames = aliasRows.filter((row) => row.alias && !isAliasValid(row.alias));
  const orphanAliases = aliasRows.filter(
    (row) => row.alias && isQualifiedModelId(row.modelId) && !providerModelIdSet.has(row.modelId),
  );
  const aliasSuggestions = buildAliasSuggestions(providerModelIds, aliasRows);
  const defaultEasyProviderId =
    activeProviderIds[0] ?? catalogProviders[0] ?? providerRows[0]?.id ?? "";
  const defaultEasyModels = defaultEasyProviderId
    ? (catalogModelsByProvider.get(defaultEasyProviderId) ?? [])
    : [];
  const defaultEasyAliasSeed =
    defaultEasyProviderId && defaultEasyModels[0]
      ? deriveAliasSeed(`${defaultEasyProviderId}/${defaultEasyModels[0].id}`)
      : "model";

  return html`
    <section class="models-page">
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
        <div class="card-title">Validation & Suggested Fixes</div>
        <div class="card-sub">Catch stale mappings and apply safe alias suggestions.</div>

        ${
          orphanAliases.length === 0 &&
          invalidModelIdAliases.length === 0 &&
          invalidAliasNames.length === 0 &&
          aliasSuggestions.length === 0
            ? html`<div class="callout" style="margin-top: 10px;">No obvious model mapping issues found.</div>`
            : html`
                <div class="stack" style="margin-top: 10px; gap: 12px;">
                  ${
                    orphanAliases.length > 0
                      ? html`
                          <div>
                            <div class="muted" style="margin-bottom: 6px;">
                              Orphan aliases (model id missing from providers): ${orphanAliases.length}
                            </div>
                            <div class="models-action-list">
                              ${orphanAliases.map(
                                (row) => html`
                                  <button
                                    class="btn danger"
                                    @click=${() =>
                                      props.onRemove(["agents", "defaults", "models", row.modelId, "alias"])}
                                  >
                                    Remove ${row.modelId} → ${row.alias}
                                  </button>
                                `,
                              )}
                            </div>
                          </div>
                        `
                      : nothing
                  }

                  ${
                    invalidModelIdAliases.length > 0
                      ? html`
                          <div>
                            <div class="muted" style="margin-bottom: 6px;">
                              Invalid model-id keys: ${invalidModelIdAliases.length}
                            </div>
                            <div class="models-action-list">
                              ${invalidModelIdAliases.map(
                                (row) => html`
                                  <button
                                    class="btn danger"
                                    @click=${() => props.onRemove(["agents", "defaults", "models", row.modelId])}
                                  >
                                    Remove invalid key ${row.modelId}
                                  </button>
                                `,
                              )}
                            </div>
                          </div>
                        `
                      : nothing
                  }

                  ${
                    invalidAliasNames.length > 0
                      ? html`
                          <div>
                            <div class="muted" style="margin-bottom: 6px;">
                              Invalid alias values: ${invalidAliasNames.length}
                            </div>
                            <div class="models-action-list">
                              ${invalidAliasNames.map(
                                (row) => html`
                                  <button
                                    class="btn danger"
                                    @click=${() =>
                                      props.onRemove(["agents", "defaults", "models", row.modelId, "alias"])}
                                  >
                                    Clear invalid alias on ${row.modelId}
                                  </button>
                                `,
                              )}
                            </div>
                          </div>
                        `
                      : nothing
                  }

                  ${
                    aliasSuggestions.length > 0
                      ? html`
                          <div>
                            <div class="muted" style="margin-bottom: 6px;">
                              Suggested aliases for configured models: ${aliasSuggestions.length}
                            </div>
                            <table class="react-provider-table usage-detail-table">
                              <thead>
                                <tr>
                                  <th>Model ID</th>
                                  <th>Suggested Alias</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                ${aliasSuggestions.slice(0, 20).map(
                                  (row) => html`
                                    <tr>
                                      <td><span class="react-model-label">${row.modelId}</span></td>
                                      <td><span class="react-provider-badge">${row.alias}</span></td>
                                      <td>
                                        <button
                                          class="btn"
                                          @click=${() =>
                                            props.onPatch(
                                              ["agents", "defaults", "models", row.modelId, "alias"],
                                              row.alias,
                                            )}
                                        >
                                          Apply
                                        </button>
                                      </td>
                                    </tr>
                                  `,
                                )}
                              </tbody>
                            </table>
                            ${
                              aliasSuggestions.length > 20
                                ? html`<div class="muted" style="margin-top: 6px;">
                                    Showing first 20 suggestions.
                                  </div>`
                                : nothing
                            }
                          </div>
                        `
                      : nothing
                  }
                </div>
              `
        }
      </section>

      <section class="card">
        <div class="row" style="justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <div class="card-title">Easy Setup</div>
            <div class="card-sub">Pick provider + model, choose auth mode, and optionally set alias.</div>
          </div>
          <div class="row" style="gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
            <span class="pill">catalog ${catalogProviders.length}</span>
            <span class="pill ok">active ${activeProviderIds.length}</span>
          </div>
        </div>

        <div class="models-provider-pill-list" style="margin-top: 10px;">
          ${activeProviderIds.length > 0
            ? activeProviderIds.map((providerId) => html`<span class="models-provider-pill is-active">${providerId}</span>`)
            : html`<span class="muted">No active providers in current config.</span>`}
        </div>

        <form
          class="models-wizard-form models-wizard-form--easy"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const data = new FormData(form);
            const providerId = asString(data.get("providerId"));
            const modelId = asString(data.get("modelId"));
            const auth = normalizeAuthMode(asString(data.get("auth")));
            const alias = asString(data.get("alias"));
            const apiKey = asString(data.get("apiKey"));

            if (!providerId || !modelId) {
              return;
            }
            if (!isProviderIdValid(providerId)) {
              alert("Provider id can use letters/numbers and . _ - only (no spaces).");
              return;
            }
            if (!isModelIdValid(modelId)) {
              alert("Model id cannot contain spaces.");
              return;
            }

            const catalogRows = catalogModelsByProvider.get(providerId) ?? [];
            const selected = catalogRows.find((row) => row.id === modelId);
            if (!selected) {
              alert("Selected provider/model is not in the catalog list. Try re-selecting provider.");
              return;
            }

            const template = resolveProviderTemplate(providerId, providerById.get(providerId));
            if (!template.baseUrl) {
              alert(
                "No default base URL template for this provider yet. Use Advanced Wizard or Providers section.",
              );
              return;
            }

            const qualifiedModelId = `${providerId}/${selected.id}`;
            if (alias) {
              if (!isAliasValid(alias)) {
                alert("Alias should start with a letter and contain only letters/numbers/._-.");
                return;
              }
              const conflict = aliasRows.find(
                (row) =>
                  row.modelId !== qualifiedModelId && row.alias.toLowerCase() === alias.toLowerCase(),
              );
              if (conflict) {
                alert(`Alias ${alias} is already used by ${conflict.modelId}.`);
                return;
              }
            }

            const provider = providerById.get(providerId);
            const nextProvider = createProviderObject({
              current: provider?.raw ?? null,
              baseUrl: template.baseUrl,
              api: template.api,
              auth: auth || template.auth,
              apiKey,
            });
            nextProvider.models = upsertModelRows(
              provider?.modelRows ?? [],
              selected.id,
              selected.name || selected.id,
              null,
              null,
            );
            props.onPatch(["models", "providers", providerId], nextProvider);

            if (alias) {
              props.onPatch(["agents", "defaults", "models", qualifiedModelId, "alias"], alias);
            }

            const normalizedAuth = normalizeAuthMode(auth || template.auth);
            if (
              AUTH_PROFILE_REQUIRED_MODES.has(normalizedAuth) &&
              (authByProvider.get(providerId) ?? 0) === 0
            ) {
              props.onPatch(["auth", "profiles", `${providerId}:default`], {
                provider: providerId,
                mode: normalizedAuth,
              });
            }

            form.reset();
            const providerSelect = form.elements.namedItem("providerId");
            if (providerSelect instanceof HTMLSelectElement) {
              providerSelect.value = providerId;
              setEasyModelOptions(form, providerId, catalogModelsByProvider);
            }
          }}
        >
          <select
            name="providerId"
            required
            @change=${(event: Event) => {
              const select = event.currentTarget as HTMLSelectElement;
              const form = select.form;
              if (!form) {
                return;
              }
              setEasyModelOptions(form, asString(select.value), catalogModelsByProvider);
              const authSelect = form.elements.namedItem("auth");
              if (authSelect instanceof HTMLSelectElement) {
                const template = resolveProviderTemplate(asString(select.value), providerById.get(asString(select.value)));
                authSelect.value = template.auth || authSelect.value;
              }
            }}
          >
            ${catalogProviders.map(
              (providerId) => html`
                <option
                  value=${providerId}
                  ?selected=${providerId === defaultEasyProviderId}
                >
                  ${providerId}${activeProviderIds.includes(providerId) ? " (active)" : ""}
                </option>
              `,
            )}
          </select>
          <select
            name="modelId"
            required
            @change=${(event: Event) => {
              const select = event.currentTarget as HTMLSelectElement;
              const form = select.form;
              if (!form) {
                return;
              }
              const providerSelect = form.elements.namedItem("providerId");
              const aliasInput = form.elements.namedItem("alias");
              if (!(providerSelect instanceof HTMLSelectElement) || !(aliasInput instanceof HTMLInputElement)) {
                return;
              }
              const providerId = asString(providerSelect.value);
              const modelId = asString(select.value);
              aliasInput.placeholder = modelId
                ? `alias (optional, e.g. ${deriveAliasSeed(`${providerId}/${modelId}`)})`
                : "alias (optional)";
            }}
          >
            ${defaultEasyModels.length > 0
              ? defaultEasyModels.map(
                  (row, idx) =>
                    html`<option value=${row.id} ?selected=${idx === 0}>${row.name} (${row.id})</option>`,
                )
              : html`<option value="" disabled selected>no catalog models</option>`}
          </select>
          <select name="auth">
            ${AUTH_MODE_OPTIONS.map((mode) => {
              const recommended = resolveProviderTemplate(
                defaultEasyProviderId,
                providerById.get(defaultEasyProviderId),
              ).auth;
              return html`<option value=${mode} ?selected=${mode === recommended}>${mode}</option>`;
            })}
          </select>
          <input name="apiKey" placeholder="api key/env ref (optional)" />
          <input
            name="alias"
            placeholder="alias (optional, e.g. ${defaultEasyAliasSeed})"
            pattern="[A-Za-z][A-Za-z0-9._-]*"
            title="start with letter; use letters/numbers/._-"
          />
          <button class="btn" type="submit">Add Provider + Model</button>
        </form>

        <div class="models-provider-pill-list models-provider-pill-list--catalog">
          ${catalogProviders.map(
            (providerId) => html`
              <span class="models-provider-pill ${activeProviderIds.includes(providerId) ? "is-active" : ""}">
                ${providerId}
              </span>
            `,
          )}
        </div>
      </section>

      <section class="card">
        <div class="row" style="justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <div class="card-title">Advanced Setup Wizard</div>
            <div class="card-sub">Manual provider/model fields for custom endpoints and edge cases.</div>
          </div>
        </div>
        <form
          class="models-wizard-form models-wizard-form--advanced"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const data = new FormData(form);
            const providerId = asString(data.get("providerId"));
            const baseUrl = asString(data.get("baseUrl"));
            const api = asString(data.get("api"));
            const auth = asString(data.get("auth"));
            const apiKey = asString(data.get("apiKey"));
            const modelId = asString(data.get("modelId"));
            const modelName = asString(data.get("modelName"));
            const alias = asString(data.get("alias"));
            if (!providerId || !baseUrl || !modelId || !modelName) {
              return;
            }
            if (!isProviderIdValid(providerId)) {
              alert("Provider id can use letters/numbers and . _ - only (no spaces).");
              return;
            }
            if (!/^https?:\/\//i.test(baseUrl)) {
              alert("Base URL should start with http:// or https://");
              return;
            }
            if (!isModelIdValid(modelId)) {
              alert("Model id cannot contain spaces.");
              return;
            }
            const qualifiedModelId = `${providerId}/${modelId}`;
            if (alias) {
              if (!isAliasValid(alias)) {
                alert("Alias should start with a letter and contain only letters/numbers/._-.");
                return;
              }
              const conflict = aliasRows.find(
                (row) =>
                  row.modelId !== qualifiedModelId && row.alias.toLowerCase() === alias.toLowerCase(),
              );
              if (conflict) {
                alert(`Alias ${alias} is already used by ${conflict.modelId}.`);
                return;
              }
            }

            const provider = providerById.get(providerId);
            const nextProvider = createProviderObject({
              current: provider?.raw ?? null,
              baseUrl,
              api,
              auth,
              apiKey,
            });
            const contextWindow = normalizePositiveInteger(data.get("contextWindow"));
            const maxTokens = normalizePositiveInteger(data.get("maxTokens"));
            nextProvider.models = upsertModelRows(
              provider?.modelRows ?? [],
              modelId,
              modelName,
              contextWindow,
              maxTokens,
            );
            props.onPatch(["models", "providers", providerId], nextProvider);

            if (alias) {
              props.onPatch(["agents", "defaults", "models", qualifiedModelId, "alias"], alias);
            }

            const normalizedAuth = normalizeAuthMode(auth);
            if (
              AUTH_PROFILE_REQUIRED_MODES.has(normalizedAuth) &&
              (authByProvider.get(providerId) ?? 0) === 0
            ) {
              props.onPatch(["auth", "profiles", `${providerId}:default`], {
                provider: providerId,
                mode: normalizedAuth,
              });
            }
            form.reset();
          }}
        >
          <select
            name="preset"
            @change=${(event: Event) => {
              const select = event.currentTarget as HTMLSelectElement;
              const form = select.form;
              if (!form) {
                return;
              }
              const preset = WIZARD_PRESETS.find((entry) => entry.key === select.value);
              if (!preset) {
                return;
              }
              const setInputValue = (name: string, value?: string) => {
                const element = form.elements.namedItem(name);
                if (!element) {
                  return;
                }
                if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
                  element.value = value ?? "";
                }
              };
              setInputValue("providerId", preset.providerId);
              setInputValue("baseUrl", preset.baseUrl);
              setInputValue("api", preset.api);
              setInputValue("auth", preset.auth);
              setInputValue("modelId", preset.modelId);
              setInputValue("modelName", preset.modelName);
              setInputValue("alias", preset.alias);
            }}
          >
            ${WIZARD_PRESETS.map((preset) => html`<option value=${preset.key}>${preset.label}</option>`)}
          </select>
          <input
            name="providerId"
            placeholder="provider id"
            pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            title="letters/numbers + . _ - only"
            required
          />
          <input name="baseUrl" placeholder="base URL" type="url" required />
          <select name="api">
            <option value="">api</option>
            ${MODEL_API_OPTIONS.map((api) => html`<option value=${api}>${api}</option>`)}
          </select>
          <select name="auth">
            <option value="">auth</option>
            ${AUTH_MODE_OPTIONS.map((mode) => html`<option value=${mode}>${mode}</option>`)}
          </select>
          <input name="apiKey" placeholder="api key/env ref (optional)" />
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
          <input
            name="alias"
            placeholder="alias (optional)"
            pattern="[A-Za-z][A-Za-z0-9._-]*"
            title="start with letter; use letters/numbers/._-"
          />
          <button class="btn" type="submit">Run Advanced Wizard</button>
        </form>
      </section>

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
                            const contextWindow = normalizePositiveInteger(data.get("contextWindow"));
                            const maxTokens = normalizePositiveInteger(data.get("maxTokens"));
                            const nextModelsRaw = upsertModelRows(
                              provider.modelRows,
                              modelId,
                              modelName,
                              contextWindow,
                              maxTokens,
                            );
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
