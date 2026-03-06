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
  oauthRunning?: boolean;
  oauthSessionId?: string | null;
  oauthStep?: {
    id: string;
    type: string;
    title?: string;
    message?: string;
    placeholder?: string;
  } | null;
  oauthStepInput?: string;
  oauthStepUrl?: string | null;
  oauthStatus?: string | null;
  oauthSelectedProviderId?: string;
  oauthSelectedMethod?: string;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onReload: () => void;
  onRunOAuthWizard?: (providerId: string, method?: string) => void | Promise<void>;
  onChangeOAuthProviderId?: (providerId: string) => void;
  onChangeOAuthMethod?: (method: string) => void;
  onChangeOAuthInput?: (value: string) => void;
  onSubmitOAuthStep?: (value?: string) => void | Promise<void>;
  onCancelOAuthWizard?: () => void | Promise<void>;
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
  "minimax-portal": {
    baseUrl: "https://api.minimax.io/anthropic",
    api: "anthropic-messages",
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
  if (typeof raw === "string") {
    const id = asString(raw);
    if (!id) {
      return null;
    }
    return {
      raw: { id, name: id },
      id,
      name: id,
      contextWindow: null,
      maxTokens: null,
    };
  }

  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  const name = asString(record.name) || id;
  return {
    raw: record,
    id,
    name,
    contextWindow: asNumber(record.contextWindow),
    maxTokens: asNumber(record.maxTokens),
  };
}

function parseProviderModelRows(rawModels: unknown): ModelRow[] {
  const modelEntries: unknown[] = [];

  if (Array.isArray(rawModels)) {
    modelEntries.push(...rawModels);
  } else {
    const modelRecord = asRecord(rawModels);
    if (modelRecord) {
      for (const [modelId, rawModel] of Object.entries(modelRecord)) {
        const normalizedId = asString(modelId);
        if (!normalizedId) {
          continue;
        }
        if (typeof rawModel === "string") {
          modelEntries.push({ id: normalizedId, name: asString(rawModel) || normalizedId });
          continue;
        }
        const record = asRecord(rawModel);
        if (record) {
          modelEntries.push({
            ...record,
            id: asString(record.id) || normalizedId,
            name: asString(record.name) || normalizedId,
          });
          continue;
        }
        modelEntries.push({ id: normalizedId, name: normalizedId });
      }
    }
  }

  return modelEntries
    .map((entry) => parseModelRow(entry))
    .filter((entry): entry is ModelRow => Boolean(entry));
}

function parseProviderRows(config: Record<string, unknown> | null): ProviderRow[] {
  const providers = asRecord(asRecord(config?.models)?.providers);
  if (!providers) {
    return [];
  }
  return Object.entries(providers)
    .map(([providerId, rawProvider]) => {
      const provider = asRecord(rawProvider) ?? {};
      const modelRows = parseProviderModelRows(provider.models);
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
  const currentModels = parseProviderModelRows(params.current?.models).map((entry) => ({
    ...entry.raw,
    id: entry.id,
    name: entry.name || entry.id,
  }));
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

function upsertCatalogModelRows(
  current: ModelRow[],
  models: Array<{ id: string; name: string }>,
): Record<string, unknown>[] {
  const next = current.map((entry) => ({ ...entry.raw }));
  for (const model of models) {
    const id = asString(model.id);
    if (!id) {
      continue;
    }
    const index = next.findIndex(
      (entry) => asString(asRecord(entry)?.id).toLowerCase() === id.toLowerCase(),
    );
    const existing = index >= 0 ? asRecord(next[index]) ?? {} : {};
    const nextRow: Record<string, unknown> = {
      ...existing,
      id,
      name: asString(model.name) || id,
    };
    if (index >= 0) {
      next[index] = nextRow;
    } else {
      next.push(nextRow);
    }
  }
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

function updateEasyAliasPlaceholder(
  form: HTMLFormElement,
  providerId: string,
  modelsByProvider: Map<string, CatalogModelRow[]>,
): void {
  const aliasInput = form.elements.namedItem("alias");
  const modelSelect = form.elements.namedItem("modelIds");
  if (!(aliasInput instanceof HTMLInputElement)) {
    return;
  }
  if (!(modelSelect instanceof HTMLSelectElement)) {
    aliasInput.placeholder = "alias (optional)";
    return;
  }
  const selectedModelIds = Array.from(modelSelect.selectedOptions)
    .map((option) => asString(option.value))
    .filter(Boolean);

  if (selectedModelIds.length === 1) {
    aliasInput.placeholder = `alias (optional, e.g. ${deriveAliasSeed(`${providerId}/${selectedModelIds[0]}`)})`;
    return;
  }

  if (selectedModelIds.length > 1) {
    aliasInput.placeholder = "alias (optional, only when one model is selected)";
    return;
  }

  const fallbackModelId = modelsByProvider.get(providerId)?.[0]?.id;
  aliasInput.placeholder = fallbackModelId
    ? `alias (optional, e.g. ${deriveAliasSeed(`${providerId}/${fallbackModelId}`)})`
    : "alias (optional)";
}

function setEasyModelOptions(
  form: HTMLFormElement,
  providerId: string,
  modelsByProvider: Map<string, CatalogModelRow[]>,
): void {
  const modelSelect = form.elements.namedItem("modelIds");
  if (!(modelSelect instanceof HTMLSelectElement)) {
    return;
  }
  const models = modelsByProvider.get(providerId) ?? [];
  const previousSelection = new Set(
    Array.from(modelSelect.selectedOptions)
      .map((option) => asString(option.value))
      .filter(Boolean),
  );

  while (modelSelect.options.length > 0) {
    modelSelect.remove(0);
  }

  if (models.length === 0) {
    const placeholder = new Option("no catalog models", "");
    placeholder.disabled = true;
    placeholder.selected = true;
    modelSelect.add(placeholder);
    updateEasyAliasPlaceholder(form, providerId, modelsByProvider);
    return;
  }

  for (const model of models) {
    const option = new Option(`${model.name} (${model.id})`, model.id);
    option.selected = previousSelection.has(model.id);
    modelSelect.add(option);
  }

  if (Array.from(modelSelect.selectedOptions).length === 0 && modelSelect.options.length > 0) {
    modelSelect.options[0].selected = true;
  }

  updateEasyAliasPlaceholder(form, providerId, modelsByProvider);
}

function resolveAuthModeOptionsForProvider(params: {
  providerId: string;
  providerById: Map<string, ProviderRow>;
  authModesByProvider: Map<string, Set<string>>;
}): string[] {
  const providerId = asString(params.providerId);
  const provider = params.providerById.get(providerId);
  const template = resolveProviderTemplate(providerId, provider);
  const modes: string[] = [];

  const profileModes = params.authModesByProvider.get(providerId);
  const providerAuthMode = normalizeAuthMode(provider?.auth ?? "");

  const push = (raw: string | undefined) => {
    const normalized = normalizeAuthMode(raw ?? "");
    if (!normalized) {
      return;
    }
    if (!(AUTH_MODE_OPTIONS as readonly string[]).includes(normalized)) {
      return;
    }
    if (!modes.includes(normalized)) {
      modes.push(normalized);
    }
  };

  const templateMode = normalizeAuthMode(template.auth);
  if (templateMode) {
    push(templateMode);
  }
  push(providerAuthMode);

  if (profileModes) {
    for (const mode of profileModes) {
      push(mode);
    }
  }

  if (modes.length === 0) {
    modes.push("api-key");
  }

  return modes;
}

function syncAuthSelectOptions(params: {
  form: HTMLFormElement;
  providerId: string;
  providerById: Map<string, ProviderRow>;
  authModesByProvider: Map<string, Set<string>>;
  preferred?: string;
}): void {
  const authSelect = params.form.elements.namedItem("auth");
  if (!(authSelect instanceof HTMLSelectElement)) {
    return;
  }

  const modes = resolveAuthModeOptionsForProvider({
    providerId: params.providerId,
    providerById: params.providerById,
    authModesByProvider: params.authModesByProvider,
  });
  const preferred = normalizeAuthMode(params.preferred ?? authSelect.value);

  while (authSelect.options.length > 0) {
    authSelect.remove(0);
  }

  for (const mode of modes) {
    const option = new Option(mode, mode);
    option.selected = mode === preferred;
    authSelect.add(option);
  }

  if (authSelect.selectedIndex < 0 && authSelect.options.length > 0) {
    const template = resolveProviderTemplate(params.providerId, params.providerById.get(params.providerId));
    const recommended = normalizeAuthMode(template.auth);
    const recommendedIndex = modes.findIndex((mode) => mode === recommended);
    authSelect.selectedIndex = recommendedIndex >= 0 ? recommendedIndex : 0;
  }
}

function hasExistingProviderApiCredential(provider: ProviderRow | undefined): boolean {
  const currentApiKey = provider?.raw?.apiKey;
  if (typeof currentApiKey === "string") {
    return currentApiKey.trim().length > 0;
  }
  return currentApiKey !== undefined && currentApiKey !== null;
}

function resolveProviderAuthValidationError(params: {
  providerId: string;
  authMode: string;
  provider: ProviderRow | undefined;
  apiKeyInput: string;
  authByProvider: Map<string, number>;
}): string | null {
  const authMode = normalizeAuthMode(params.authMode);
  if (!authMode) {
    return null;
  }

  if (authMode === "api-key") {
    if (params.apiKeyInput.trim().length === 0 && !hasExistingProviderApiCredential(params.provider)) {
      return `Provider ${params.providerId} requires api key/env ref before adding. Fill api key first.`;
    }
    return null;
  }

  if (authMode === "oauth") {
    if (params.providerId === "opencode") {
      return "opencode does not use OAuth here. Use auth=api-key (OPENCODE_API_KEY) or run: openclaw onboard --auth-choice opencode-zen";
    }
    const normalizedProviderId = normalizeOAuthProviderSelection(params.providerId).providerId;
    const hasOAuthProfile =
      (params.authByProvider.get(params.providerId) ?? 0) > 0 ||
      (params.authByProvider.get(normalizedProviderId) ?? 0) > 0;
    if (!hasOAuthProfile) {
      return `OAuth not completed for ${normalizedProviderId}. Use the OAuth Run Step in this page (or run: ${buildModelsOAuthLoginCommand(params.providerId)}), then retry.`;
    }
  }

  return null;
}

function shellQuoteArg(value: string): string {
  if (!value) {
    return "''";
  }
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

const OAUTH_PROVIDER_NORMALIZATION: Record<string, { providerId: string; method?: string }> = {
  minimax: { providerId: "minimax-portal", method: "oauth" },
  "minimax-cn": { providerId: "minimax-portal", method: "oauth-cn" },
};

const OAUTH_PROVIDER_PLUGIN_IDS: Record<string, string> = {
  minimax: "minimax-portal-auth",
  "minimax-cn": "minimax-portal-auth",
  "minimax-portal": "minimax-portal-auth",
  "qwen-portal": "qwen-portal-auth",
  "google-gemini-cli": "google-gemini-cli-auth",
};

function normalizeOAuthProviderSelection(
  providerId: string,
  method?: string,
): { providerId: string; method: string } {
  const rawProviderId = asString(providerId);
  const rawMethod = asString(method);
  const mapped = OAUTH_PROVIDER_NORMALIZATION[rawProviderId];
  const normalizedProviderId = mapped?.providerId ?? rawProviderId;
  const normalizedMethod = rawMethod || mapped?.method || "";
  return {
    providerId: normalizedProviderId,
    method: normalizedMethod,
  };
}

function resolveOAuthPluginIdForProvider(providerId: string): string {
  const rawProviderId = asString(providerId);
  if (!rawProviderId) {
    return "";
  }
  const normalizedProviderId = normalizeOAuthProviderSelection(rawProviderId).providerId;
  return OAUTH_PROVIDER_PLUGIN_IDS[rawProviderId] ?? OAUTH_PROVIDER_PLUGIN_IDS[normalizedProviderId] ?? "";
}

function isPluginEnabledInConfig(config: Record<string, unknown> | null, pluginId: string): boolean {
  const entries = asRecord(asRecord(asRecord(config)?.plugins)?.entries);
  const entry = entries ? asRecord(entries[pluginId]) : null;
  return entry?.enabled === true;
}

function buildModelsOAuthLoginCommand(providerId: string, method?: string): string {
  const normalized = normalizeOAuthProviderSelection(providerId, method);
  const command = [
    "openclaw",
    "models",
    "auth",
    "login",
    "--provider",
    shellQuoteArg(normalized.providerId),
  ];
  if (normalized.method) {
    command.push("--method", shellQuoteArg(normalized.method));
  }
  return command.join(" ");
}

function renderModelsKpiIcon(kind: "providers" | "models" | "aliases" | "auth") {
  switch (kind) {
    case "providers":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      `;
    case "models":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16"></rect>
          <path d="M9 1v3"></path>
          <path d="M15 1v3"></path>
          <path d="M9 20v3"></path>
          <path d="M15 20v3"></path>
          <path d="M1 9h3"></path>
          <path d="M1 15h3"></path>
          <path d="M20 9h3"></path>
          <path d="M20 15h3"></path>
        </svg>
      `;
    case "aliases":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 10 11 19 3 11V3h8z"></path>
          <circle cx="7" cy="7" r="1.5"></circle>
        </svg>
      `;
    case "auth":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
      `;
    default:
      return nothing;
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
  const authModesByProvider = new Map<string, Set<string>>();
  for (const row of authRows) {
    const providerId = asString(row.provider);
    if (!providerId) {
      continue;
    }
    authByProvider.set(providerId, (authByProvider.get(providerId) ?? 0) + 1);
    const mode = normalizeAuthMode(row.mode);
    if (!mode) {
      continue;
    }
    const set = authModesByProvider.get(providerId) ?? new Set<string>();
    set.add(mode);
    authModesByProvider.set(providerId, set);
  }

  const catalogModels = mergeCatalogModels(
    parseCatalogFromSuggestions(props.modelSuggestions),
    DEFAULT_MODELS_CATALOG,
  );

  const aliasDerivedProviderIds = aliasRows
    .map((row) => {
      const slash = row.modelId.indexOf("/");
      return slash > 0 ? row.modelId.slice(0, slash).trim() : "";
    })
    .filter(Boolean);

  const activeProviderIds = Array.from(
    new Set([...providerRows.map((row) => row.id), ...aliasDerivedProviderIds]),
  ).toSorted((a, b) => a.localeCompare(b));
  const activeProviderIdSet = new Set(activeProviderIds);

  const aliasModelIdsByProvider = new Map<string, string[]>();
  for (const row of aliasRows) {
    const slash = row.modelId.indexOf("/");
    if (slash <= 0) {
      continue;
    }
    const providerId = row.modelId.slice(0, slash).trim();
    const modelId = row.modelId.slice(slash + 1).trim();
    if (!providerId || !modelId) {
      continue;
    }
    const list = aliasModelIdsByProvider.get(providerId) ?? [];
    if (!list.includes(modelId)) {
      list.push(modelId);
    }
    aliasModelIdsByProvider.set(providerId, list);
  }

  const catalogProviders = Array.from(
    new Set([
      ...DEFAULT_PROVIDER_IDS,
      ...providerRows.map((row) => row.id),
      ...aliasDerivedProviderIds,
      ...catalogModels.map((entry) => entry.provider),
    ]),
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
  const providersWithCatalogModels = catalogProviders.filter(
    (providerId) => (catalogModelsByProvider.get(providerId)?.length ?? 0) > 0,
  );
  const providersWithCatalogModelSet = new Set(providersWithCatalogModels);
  const defaultEasyProviderId =
    activeProviderIds.find((providerId) => providersWithCatalogModelSet.has(providerId)) ??
    providersWithCatalogModels[0] ??
    activeProviderIds[0] ??
    catalogProviders[0] ??
    providerRows[0]?.id ??
    "";
  const defaultEasyModels = defaultEasyProviderId
    ? (catalogModelsByProvider.get(defaultEasyProviderId) ?? [])
    : [];
  const defaultEasyAliasSeed =
    defaultEasyProviderId && defaultEasyModels[0]
      ? deriveAliasSeed(`${defaultEasyProviderId}/${defaultEasyModels[0].id}`)
      : "model";
  const defaultEasyAuthOptions = resolveAuthModeOptionsForProvider({
    providerId: defaultEasyProviderId,
    providerById,
    authModesByProvider,
  });
  const defaultEasyRecommendedAuth = normalizeAuthMode(
    resolveProviderTemplate(defaultEasyProviderId, providerById.get(defaultEasyProviderId)).auth,
  );
  const defaultEasyAuth = defaultEasyAuthOptions.includes(defaultEasyRecommendedAuth)
    ? defaultEasyRecommendedAuth
    : (defaultEasyAuthOptions[0] ?? "api-key");
  const providerDisplayIds = Array.from(new Set([...activeProviderIds, ...catalogProviders])).toSorted(
    (a, b) => {
      const activityCmp = Number(activeProviderIdSet.has(b)) - Number(activeProviderIdSet.has(a));
      if (activityCmp !== 0) {
        return activityCmp;
      }
      return a.localeCompare(b);
    },
  );
  const oauthProviderIds = providerDisplayIds.filter((providerId) => {
    const provider = providerById.get(providerId);
    const template = resolveProviderTemplate(providerId, provider);
    const hasTemplateOAuth = normalizeAuthMode(template.auth) === "oauth";
    const hasProviderOAuth = normalizeAuthMode(provider?.auth ?? "") === "oauth";
    const hasProfileOAuth = authModesByProvider.get(providerId)?.has("oauth") ?? false;
    return hasTemplateOAuth || hasProviderOAuth || hasProfileOAuth;
  });
  const defaultOAuthProviderId =
    oauthProviderIds.find((providerId) => activeProviderIdSet.has(providerId)) ??
    oauthProviderIds[0] ??
    "";
  const selectedOAuthProviderId =
    (props.oauthSelectedProviderId && oauthProviderIds.includes(props.oauthSelectedProviderId)
      ? props.oauthSelectedProviderId
      : defaultOAuthProviderId) || "";
  const selectedOAuthMethod = asString(props.oauthSelectedMethod ?? "");
  const oauthCommandPreview = selectedOAuthProviderId
    ? buildModelsOAuthLoginCommand(selectedOAuthProviderId, selectedOAuthMethod)
    : "openclaw models auth login --provider <selected-provider> [--method <id>]";
  const oauthStepNeedsInput =
    props.oauthStep != null && (props.oauthStep.type === "text" || props.oauthStep.type === "action");

  return html`
    <section class="models-page">
      ${
        !props.connected
          ? html`<div class="callout warning">Disconnected. Connect first to load and edit config.</div>`
          : nothing
      }

      <div class="react-kpi-grid models-kpi-grid" style="margin-bottom: 14px;">
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Providers</label>
              <strong>${providerRows.length}</strong>
              <small>active ${activeProviderIds.length} · catalog ${catalogProviders.length}</small>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderModelsKpiIcon("providers")}</span>
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Configured Models</label>
              <strong>${providerModelCount}</strong>
              <small>catalog known ${catalogModels.length}</small>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderModelsKpiIcon("models")}</span>
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Model Aliases</label>
              <strong>${aliasRows.filter((row) => row.alias).length}</strong>
              <small>invalid ${invalidAliasNames.length + invalidModelIdAliases.length}</small>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderModelsKpiIcon("aliases")}</span>
            </div>
          </div>
        </article>
        <article class="react-kpi-card">
          <div class="react-kpi-head">
            <div>
              <label>Auth Profiles</label>
              <strong>${authRows.length}</strong>
              <small>providers with auth ${authByProvider.size}</small>
            </div>
            <div class="react-kpi-side">
              <span class="react-kpi-icon">${renderModelsKpiIcon("auth")}</span>
            </div>
          </div>
        </article>
      </div>

      ${
        oauthProviderIds.length > 0
          ? html`
              <section class="card">
                <div class="row" style="justify-content: space-between; align-items: flex-start; gap: 10px;">
                  <div>
                    <div class="card-title">OAuth Run Step</div>
                    <div class="card-sub">
                      Run provider OAuth once, then come back and reload profiles before setting auth=oauth.
                    </div>
                  </div>
                  <span class="pill">oauth providers ${oauthProviderIds.length}</span>
                </div>

                <form
                  class="models-wizard-form models-wizard-form--oauth"
                  @submit=${(event: SubmitEvent) => {
                    event.preventDefault();
                    const form = event.currentTarget as HTMLFormElement;
                    const data = new FormData(form);
                    const providerId = asString(data.get("providerId"));
                    const method = asString(data.get("method"));
                    if (!providerId) {
                      return;
                    }
                    const command = buildModelsOAuthLoginCommand(providerId, method);
                    if (!navigator.clipboard?.writeText) {
                      alert(`Clipboard unavailable. Run this command manually:\n\n${command}`);
                      return;
                    }
                    void navigator.clipboard.writeText(command).then(() => {
                      alert(
                        `Copied command:\n\n${command}\n\nRun it in a terminal (TTY), finish browser auth, then click Reload Auth Profiles.`,
                      );
                    }).catch(() => {
                      alert(`Copy failed. Run this command manually:\n\n${command}`);
                    });
                  }}
                >
                  <select
                    name="providerId"
                    required
                    .value=${selectedOAuthProviderId}
                    @change=${(event: Event) => {
                      const select = event.currentTarget;
                      if (!(select instanceof HTMLSelectElement)) {
                        return;
                      }
                      props.onChangeOAuthProviderId?.(asString(select.value));
                    }}
                  >
                    ${oauthProviderIds.map((providerId) => {
                      const hasAuth = (authByProvider.get(providerId) ?? 0) > 0;
                      return html`
                        <option value=${providerId}>
                          ${providerId}${hasAuth ? " (connected)" : ""}
                        </option>
                      `;
                    })}
                  </select>
                  <input
                    name="method"
                    placeholder="method id (optional)"
                    title="Optional provider auth method id"
                    .value=${selectedOAuthMethod}
                    @input=${(event: Event) => {
                      const input = event.currentTarget;
                      if (!(input instanceof HTMLInputElement)) {
                        return;
                      }
                      props.onChangeOAuthMethod?.(input.value);
                    }}
                  />
                  <button class="btn" type="submit">Copy OAuth Login Command</button>
                  <button
                    class="btn"
                    type="button"
                    ?disabled=${props.oauthRunning || !props.onRunOAuthWizard}
                    @click=${async (event: Event) => {
                      if (!props.onRunOAuthWizard) {
                        return;
                      }
                      const button = event.currentTarget;
                      if (!(button instanceof HTMLButtonElement)) {
                        return;
                      }
                      const form = button.form;
                      if (!form) {
                        return;
                      }
                      const data = new FormData(form);
                      const providerId = asString(data.get("providerId"));
                      const method = asString(data.get("method"));
                      if (!providerId) {
                        alert("Select an OAuth provider first.");
                        return;
                      }

                      const pluginId = resolveOAuthPluginIdForProvider(providerId);
                      if (pluginId && !isPluginEnabledInConfig(config, pluginId)) {
                        props.onPatch(["plugins", "entries", pluginId, "enabled"], true);
                        props.onApply();
                        alert(
                          `Enabled required plugin ${pluginId} and applied runtime. After reconnect, click Start OAuth in UI again.`,
                        );
                        return;
                      }

                      const normalized = normalizeOAuthProviderSelection(providerId, method);
                      await props.onRunOAuthWizard(normalized.providerId, normalized.method);
                    }}
                  >
                    ${props.oauthRunning ? "Running Wizard…" : "Start OAuth in UI"}
                  </button>
                  <button class="btn" type="button" @click=${props.onReload}>Reload Auth Profiles</button>
                </form>

                <div class="models-oauth-command-preview">
                  <code>${oauthCommandPreview}</code>
                </div>
                <div class="models-inline-help" style="margin-top: 8px;">
                  Tip: Start OAuth in UI, open the link, complete provider login, paste redirected URL/code, then press Connect.
                </div>

                ${
                  props.oauthStatus && !props.oauthStep
                    ? html`<div class="models-oauth-status">${props.oauthStatus}</div>`
                    : nothing
                }

                ${
                  props.oauthSessionId && props.oauthStep
                    ? html`
                        <div class="models-oauth-live-step">
                          <div class="models-oauth-live-step__head">
                            <strong>${asString(props.oauthStep.title) || `OAuth step (${props.oauthStep.type})`}</strong>
                            <span class="pill">session ${props.oauthSessionId.slice(0, 8)}</span>
                          </div>
                          ${
                            asString(props.oauthStep.message) &&
                            asString(props.oauthStep.message) !== asString(props.oauthStep.title)
                              ? html`<div class="models-inline-help">${props.oauthStep.message}</div>`
                              : nothing
                          }
                          ${
                            props.oauthStepUrl
                              ? html`
                                  <div class="models-oauth-link-row">
                                    <a
                                      class="btn"
                                      href=${props.oauthStepUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open OAuth Link
                                    </a>
                                    <code>${props.oauthStepUrl}</code>
                                  </div>
                                `
                              : nothing
                          }
                          <div class="models-wizard-form models-wizard-form--oauth-step">
                            ${
                              oauthStepNeedsInput
                                ? html`
                                    <input
                                      name="oauthStepInput"
                                      placeholder=${asString(props.oauthStep.placeholder) || "Paste redirected URL / code"}
                                      .value=${props.oauthStepInput ?? ""}
                                      @input=${(event: Event) => {
                                        if (!props.onChangeOAuthInput) {
                                          return;
                                        }
                                        const input = event.currentTarget;
                                        if (!(input instanceof HTMLInputElement)) {
                                          return;
                                        }
                                        props.onChangeOAuthInput(input.value);
                                      }}
                                    />
                                  `
                                : nothing
                            }
                            <button
                              class="btn"
                              type="button"
                              ?disabled=${props.oauthRunning || !props.onSubmitOAuthStep}
                              @click=${() =>
                                props.onSubmitOAuthStep?.(oauthStepNeedsInput ? props.oauthStepInput ?? "" : undefined)}
                            >
                              ${props.oauthRunning
                                ? "Connecting…"
                                : oauthStepNeedsInput
                                  ? "Connect"
                                  : "Continue"}
                            </button>
                            <button
                              class="btn"
                              type="button"
                              ?disabled=${props.oauthRunning || !props.onCancelOAuthWizard}
                              @click=${() => {
                                void props.onCancelOAuthWizard?.();
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      `
                    : nothing
                }
              </section>
            `
          : nothing
      }

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
            const auth = normalizeAuthMode(asString(data.get("auth")));
            const alias = asString(data.get("alias"));
            const apiKey = asString(data.get("apiKey"));
            const modelSelect = form.elements.namedItem("modelIds");

            if (!providerId || !(modelSelect instanceof HTMLSelectElement)) {
              return;
            }
            const selectedModelIds = Array.from(modelSelect.selectedOptions)
              .map((option) => asString(option.value))
              .filter(Boolean);
            if (selectedModelIds.length === 0) {
              alert("Select at least one model.");
              return;
            }
            if (!isProviderIdValid(providerId)) {
              alert("Provider id can use letters/numbers and . _ - only (no spaces).");
              return;
            }
            if (selectedModelIds.some((modelId) => !isModelIdValid(modelId))) {
              alert("One or more selected model ids are invalid.");
              return;
            }

            const catalogRows = catalogModelsByProvider.get(providerId) ?? [];
            const catalogById = new Map(catalogRows.map((row) => [row.id, row]));
            const selectedRows = selectedModelIds
              .map((modelId) => catalogById.get(modelId))
              .filter((row): row is CatalogModelRow => Boolean(row));
            if (selectedRows.length !== selectedModelIds.length) {
              alert("Some selected models were not found in catalog. Re-select provider and models.");
              return;
            }

            const template = resolveProviderTemplate(providerId, providerById.get(providerId));
            if (!template.baseUrl) {
              alert(
                "No default base URL template for this provider yet. Use Advanced Wizard or Providers section.",
              );
              return;
            }

            if (alias && selectedRows.length !== 1) {
              alert("Alias can only be set when exactly one model is selected.");
              return;
            }
            if (alias) {
              if (!isAliasValid(alias)) {
                alert("Alias should start with a letter and contain only letters/numbers/._-.");
                return;
              }
              const qualifiedModelId = `${providerId}/${selectedRows[0].id}`;
              const conflict = aliasRows.find(
                (row) =>
                  row.modelId !== qualifiedModelId && row.alias.toLowerCase() === alias.toLowerCase(),
              );
              if (conflict) {
                alert(`Alias ${alias} is already used by ${conflict.modelId}.`);
                return;
              }
            }

            const normalizedAuth = normalizeAuthMode(auth || template.auth);
            const normalizedOAuth = normalizeOAuthProviderSelection(providerId);
            const targetProviderId =
              normalizedAuth === "oauth" ? normalizedOAuth.providerId : providerId;
            const provider = providerById.get(targetProviderId) ?? providerById.get(providerId);
            const providerTemplateForSave =
              normalizedAuth === "oauth" && targetProviderId !== providerId
                ? resolveProviderTemplate(targetProviderId, providerById.get(targetProviderId))
                : template;
            const authValidationError = resolveProviderAuthValidationError({
              providerId: targetProviderId,
              authMode: normalizedAuth,
              provider,
              apiKeyInput: apiKey,
              authByProvider,
            });
            const hasOAuthProfile =
              (authByProvider.get(providerId) ?? 0) > 0 ||
              (authByProvider.get(targetProviderId) ?? 0) > 0;
            const shouldBootstrapOAuthInUi =
              normalizedAuth === "oauth" && !hasOAuthProfile && Boolean(props.onRunOAuthWizard);
            const bypassOAuthIncompleteValidation =
              shouldBootstrapOAuthInUi &&
              Boolean(authValidationError?.toLowerCase().includes("oauth not completed"));
            if (authValidationError && !bypassOAuthIncompleteValidation) {
              alert(authValidationError);
              return;
            }

            const nextProvider = createProviderObject({
              current: provider?.raw ?? null,
              baseUrl: providerTemplateForSave.baseUrl,
              api: providerTemplateForSave.api,
              auth: normalizedAuth,
              apiKey,
            });
            nextProvider.models = upsertCatalogModelRows(
              provider?.modelRows ?? [],
              selectedRows.map((row) => ({ id: row.id, name: row.name || row.id })),
            );
            props.onPatch(["models", "providers", targetProviderId], nextProvider);

            if (alias && selectedRows.length === 1) {
              props.onPatch(
                ["agents", "defaults", "models", `${targetProviderId}/${selectedRows[0].id}`, "alias"],
                alias,
              );
            }

            form.reset();
            const providerSelect = form.elements.namedItem("providerId");
            if (providerSelect instanceof HTMLSelectElement) {
              providerSelect.value = providerId;
              setEasyModelOptions(form, providerId, catalogModelsByProvider);
            }
            syncAuthSelectOptions({
              form,
              providerId,
              providerById,
              authModesByProvider,
              preferred: normalizedAuth,
            });
            updateEasyAliasPlaceholder(form, providerId, catalogModelsByProvider);

            if (shouldBootstrapOAuthInUi) {
              const pluginId = resolveOAuthPluginIdForProvider(providerId);
              if (pluginId && !isPluginEnabledInConfig(config, pluginId)) {
                props.onPatch(["plugins", "entries", pluginId, "enabled"], true);
                props.onApply();
                alert(
                  `Enabled required plugin ${pluginId} and applied runtime. After reconnect, click Start OAuth in UI again.`,
                );
                return;
              }
              const oauthSelection = normalizeOAuthProviderSelection(providerId);
              void props.onRunOAuthWizard?.(oauthSelection.providerId, oauthSelection.method);
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
              const providerId = asString(select.value);
              setEasyModelOptions(form, providerId, catalogModelsByProvider);
              const template = resolveProviderTemplate(providerId, providerById.get(providerId));
              syncAuthSelectOptions({
                form,
                providerId,
                providerById,
                authModesByProvider,
                preferred: template.auth,
              });
            }}
          >
            ${catalogProviders.map(
              (providerId) => html`
                <option
                  value=${providerId}
                  ?selected=${providerId === defaultEasyProviderId}
                >
                  ${providerId}${activeProviderIdSet.has(providerId) ? " (active)" : ""}
                </option>
              `,
            )}
          </select>

          <div class="models-multi-select-wrap">
            <select
              name="modelIds"
              multiple
              size="8"
              required
              @change=${(event: Event) => {
                const select = event.currentTarget as HTMLSelectElement;
                const form = select.form;
                if (!form) {
                  return;
                }
                const providerSelect = form.elements.namedItem("providerId");
                if (!(providerSelect instanceof HTMLSelectElement)) {
                  return;
                }
                updateEasyAliasPlaceholder(form, asString(providerSelect.value), catalogModelsByProvider);
              }}
            >
              ${defaultEasyModels.length > 0
                ? defaultEasyModels.map(
                    (row, idx) =>
                      html`<option value=${row.id} ?selected=${idx === 0}>${row.name} (${row.id})</option>`,
                  )
                : html`<option value="" disabled selected>no catalog models</option>`}
            </select>
            <div class="models-inline-help">Ctrl/⌘ + click to select multiple models</div>
          </div>

          <select name="auth">
            ${defaultEasyAuthOptions.map(
              (mode) => html`<option value=${mode} ?selected=${mode === defaultEasyAuth}>${mode}</option>`,
            )}
          </select>
          <input name="apiKey" placeholder="api key/env ref (optional)" />
          <input
            name="alias"
            placeholder="alias (optional, e.g. ${defaultEasyAliasSeed})"
            pattern="[A-Za-z][A-Za-z0-9._-]*"
            title="start with letter; use letters/numbers/._-"
          />
          <button class="btn" type="submit">Add Provider + Selected Models</button>
        </form>

        <div class="models-provider-pill-list models-provider-pill-list--catalog">
          ${catalogProviders.map(
            (providerId) => html`
              <span class="models-provider-pill ${activeProviderIdSet.has(providerId) ? "is-active" : ""}">
                ${providerId}
              </span>
            `,
          )}
        </div>
      </section>

      <section class="card">
        <details class="models-collapse">
          <summary class="models-collapse__summary">
            <div>
              <div class="card-title">Advanced Setup Wizard</div>
              <div class="card-sub">Manual provider/model fields for custom endpoints and edge cases.</div>
            </div>
          </summary>
          <div class="models-collapse__body">
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
            const normalizedAuth = normalizeAuthMode(auth);
            const authValidationError = resolveProviderAuthValidationError({
              providerId,
              authMode: normalizedAuth,
              provider,
              apiKeyInput: apiKey,
              authByProvider,
            });
            if (authValidationError) {
              alert(authValidationError);
              return;
            }

            const nextProvider = createProviderObject({
              current: provider?.raw ?? null,
              baseUrl,
              api,
              auth: normalizedAuth,
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
              const providerId = asString(preset.providerId);
              setInputValue("providerId", providerId);
              setInputValue("baseUrl", preset.baseUrl);
              setInputValue("api", preset.api);
              setInputValue("modelId", preset.modelId);
              setInputValue("modelName", preset.modelName);
              setInputValue("alias", preset.alias);
              syncAuthSelectOptions({
                form,
                providerId,
                providerById,
                authModesByProvider,
                preferred: preset.auth,
              });
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
            @input=${(event: Event) => {
              const input = event.currentTarget as HTMLInputElement;
              const form = input.form;
              if (!form) {
                return;
              }
              syncAuthSelectOptions({
                form,
                providerId: asString(input.value),
                providerById,
                authModesByProvider,
              });
            }}
          />
          <input name="baseUrl" placeholder="base URL" type="url" required />
          <select name="api">
            <option value="">api</option>
            ${MODEL_API_OPTIONS.map((api) => html`<option value=${api}>${api}</option>`)}
          </select>
          <select name="auth">
            ${resolveAuthModeOptionsForProvider({ providerId: "", providerById, authModesByProvider }).map(
              (mode, idx) => html`<option value=${mode} ?selected=${idx === 0}>${mode}</option>`,
            )}
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
          </div>
        </details>
      </section>

      <section class="card">
        <div class="row" style="justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <div class="card-title">Providers</div>
            <div class="card-sub">Click a provider to expand details and manage active models.</div>
          </div>
          <span class="pill">providers ${providerDisplayIds.length}</span>
        </div>

        <form
          class="models-wizard-form"
          style="margin-top: 10px;"
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
            const provider = providerById.get(providerId);
            const normalizedAuth = normalizeAuthMode(auth);
            const authValidationError = resolveProviderAuthValidationError({
              providerId,
              authMode: normalizedAuth,
              provider,
              apiKeyInput: apiKey,
              authByProvider,
            });
            if (authValidationError) {
              alert(authValidationError);
              return;
            }

            const current = provider?.raw ?? null;
            props.onPatch(
              ["models", "providers", providerId],
              createProviderObject({ current, baseUrl, api, auth: normalizedAuth, apiKey }),
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
            @input=${(event: Event) => {
              const input = event.currentTarget as HTMLInputElement;
              const form = input.form;
              if (!form) {
                return;
              }
              syncAuthSelectOptions({
                form,
                providerId: asString(input.value),
                providerById,
                authModesByProvider,
              });
            }}
          />
          <input name="baseUrl" placeholder="base URL" type="url" required />
          <select name="api">
            <option value="">api (optional)</option>
            ${MODEL_API_OPTIONS.map((api) => html`<option value=${api}>${api}</option>`)}
          </select>
          <select name="auth">
            ${resolveAuthModeOptionsForProvider({ providerId: "", providerById, authModesByProvider }).map(
              (mode, idx) => html`<option value=${mode} ?selected=${idx === 0}>${mode}</option>`,
            )}
          </select>
          <input name="apiKey" placeholder="api key/env ref (optional)" />
          <button class="btn" type="submit">Add / Update Provider</button>
        </form>

        <div class="models-provider-accordion-list" style="margin-top: 12px;">
          ${providerDisplayIds.map((providerId) => {
            const provider = providerById.get(providerId);
            const providerModels = provider?.modelRows ?? [];
            const aliasModelIds = aliasModelIdsByProvider.get(providerId) ?? [];
            const effectiveModelCount = new Set([
              ...providerModels.map((model) => model.id),
              ...aliasModelIds,
            ]).size;
            const providerAuthCount = authByProvider.get(providerId) ?? 0;
            const template = resolveProviderTemplate(providerId, provider);
            const catalogCount = catalogModelsByProvider.get(providerId)?.length ?? 0;
            const isActive = activeProviderIdSet.has(providerId);
            const isReferencedOnly = !provider && aliasModelIds.length > 0;
            const providerStatusLabel = provider
              ? "configured"
              : isReferencedOnly
                ? "referenced (no local override)"
                : "not configured";
            const catalogRows = catalogModelsByProvider.get(providerId) ?? [];
            const catalogById = new Map(catalogRows.map((row) => [row.id, row]));
            const referencedModelRows = aliasModelIds.map((modelId) => {
              const catalog = catalogById.get(modelId);
              return {
                id: modelId,
                name: catalog?.name ?? modelId,
                contextWindow: catalog?.contextWindow ?? null,
                maxTokens: catalog?.maxTokens ?? null,
              };
            });
            const configuredModelIdSet = new Set(providerModels.map((model) => model.id));
            const referencedOnlyModelRows = referencedModelRows.filter(
              (model) => !configuredModelIdSet.has(model.id),
            );
            return html`
              <details class="models-provider-accordion">
                <summary class="models-provider-accordion__summary">
                  <div>
                    <strong>${providerId}</strong>
                    <div class="muted" style="font-size: 11px; margin-top: 2px;">
                      ${providerStatusLabel} · models ${effectiveModelCount} · catalog ${catalogCount}
                    </div>
                  </div>
                  <div class="models-provider-accordion__summary-badges">
                    <span class="models-provider-pill ${isActive ? "is-active" : "is-inactive"}">
                      ${isActive ? "active" : "inactive"}
                    </span>
                    <span class="models-provider-pill">refs ${aliasModelIds.length}</span>
                    <span class="models-provider-pill">auth ${providerAuthCount}</span>
                  </div>
                </summary>

                <div class="models-provider-accordion__body">
                  <div class="muted" style="font-size: 11px; margin-bottom: 10px;">
                    base ${provider?.baseUrl || template.baseUrl || "--"}
                    · api ${provider?.api || template.api}
                    · auth ${provider?.auth || template.auth}
                    · source ${provider ? "config" : "template"}
                  </div>

                  ${
                    provider
                      ? html`
                          <div class="models-action-list" style="margin-bottom: 10px;">
                            <button
                              class="btn danger"
                              @click=${() => {
                                if (!confirm(`Delete provider ${provider.id} config block?`)) {
                                  return;
                                }
                                props.onRemove(["models", "providers", provider.id]);
                              }}
                            >
                              Remove Provider
                            </button>
                            ${
                              aliasModelIds.length > 0
                                ? html`
                                    <button
                                      class="btn danger"
                                      @click=${() => {
                                        if (!confirm(`Delete ${aliasModelIds.length} model refs under ${provider.id}?`)) {
                                          return;
                                        }
                                        for (const modelId of aliasModelIds) {
                                          props.onRemove([
                                            "agents",
                                            "defaults",
                                            "models",
                                            `${provider.id}/${modelId}`,
                                          ]);
                                        }
                                      }}
                                    >
                                      Remove Provider Refs
                                    </button>
                                    <button
                                      class="btn danger"
                                      @click=${() => {
                                        if (!confirm(`Delete provider ${provider.id} and ${aliasModelIds.length} model refs?`)) {
                                          return;
                                        }
                                        props.onRemove(["models", "providers", provider.id]);
                                        for (const modelId of aliasModelIds) {
                                          props.onRemove([
                                            "agents",
                                            "defaults",
                                            "models",
                                            `${provider.id}/${modelId}`,
                                          ]);
                                        }
                                      }}
                                    >
                                      Remove Provider + Refs
                                    </button>
                                  `
                                : nothing
                            }
                          </div>

                          <form
                            class="models-wizard-form"
                            style="margin-top: 0;"
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
                            providerModels.length === 0 && referencedOnlyModelRows.length === 0
                              ? html`
                                  <div class="muted" style="margin-top: 10px;">
                                    No provider models configured.
                                  </div>
                                `
                              : nothing
                          }

                          ${
                            providerModels.length > 0
                              ? html`
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
                                      ${providerModels.map(
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
                                                  const nextModels = providerModels
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
                              : nothing
                          }

                          ${
                            referencedOnlyModelRows.length > 0
                              ? html`
                                  <div class="muted" style="margin-top: 10px;">
                                    Referenced models (no local model entry).
                                  </div>
                                  <table class="react-provider-table usage-detail-table" style="margin-top: 8px;">
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
                                      ${referencedOnlyModelRows.map(
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
                                                  props.onRemove([
                                                    "agents",
                                                    "defaults",
                                                    "models",
                                                    `${provider.id}/${model.id}`,
                                                  ]);
                                                }}
                                              >
                                                Remove Ref
                                              </button>
                                            </td>
                                          </tr>
                                        `,
                                      )}
                                    </tbody>
                                  </table>
                                `
                              : nothing
                          }
                        `
                      : html`
                          <div class="callout" style="margin-top: 4px;">
                            <div>
                              ${isReferencedOnly
                                ? "No local provider override in config (using template defaults)."
                                : "This provider is not configured yet."}
                            </div>

                            <div class="models-action-list" style="margin-top: 8px;">
                              ${
                                template.baseUrl
                                  ? html`
                                      <button
                                        class="btn"
                                        @click=${() => {
                                          const authValidationError = resolveProviderAuthValidationError({
                                            providerId,
                                            authMode: template.auth,
                                            provider: undefined,
                                            apiKeyInput: "",
                                            authByProvider,
                                          });
                                          if (authValidationError) {
                                            alert(authValidationError);
                                            return;
                                          }
                                          props.onPatch(
                                            ["models", "providers", providerId],
                                            createProviderObject({
                                              current: null,
                                              baseUrl: template.baseUrl,
                                              api: template.api,
                                              auth: template.auth,
                                              apiKey: "",
                                            }),
                                          );
                                        }}
                                      >
                                        Create local override from template
                                      </button>
                                    `
                                  : nothing
                              }

                              ${
                                aliasModelIds.length > 0
                                  ? html`
                                      <button
                                        class="btn danger"
                                        @click=${() => {
                                          if (!confirm(`Delete ${aliasModelIds.length} model refs under ${providerId}?`)) {
                                            return;
                                          }
                                          for (const modelId of aliasModelIds) {
                                            props.onRemove([
                                              "agents",
                                              "defaults",
                                              "models",
                                              `${providerId}/${modelId}`,
                                            ]);
                                          }
                                        }}
                                      >
                                        Remove Provider Refs
                                      </button>
                                    `
                                  : nothing
                              }
                            </div>

                            ${
                              referencedModelRows.length > 0
                                ? html`
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
                                        ${referencedModelRows.map(
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
                                                    props.onRemove([
                                                      "agents",
                                                      "defaults",
                                                      "models",
                                                      `${providerId}/${model.id}`,
                                                    ]);
                                                  }}
                                                >
                                                  Remove Ref
                                                </button>
                                              </td>
                                            </tr>
                                          `,
                                        )}
                                      </tbody>
                                    </table>
                                  `
                                : nothing
                            }
                          </div>
                        `
                  }
                </div>
              </details>
            `;
          })}
        </div>
      </section>
      <section class="card" style="margin-top: 16px;">
        <details class="models-collapse">
          <summary class="models-collapse__summary">
            <div>
              <div class="card-title">Model Aliases</div>
              <div class="card-sub">Manage <code>agents.defaults.models</code> alias mapping.</div>
            </div>
          </summary>
          <div class="models-collapse__body">
            <form
              class="models-wizard-form"
              style="margin-top: 0;"
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
          </div>
        </details>
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

      <div class="row models-actions-row" style="margin-top: 16px; gap: 8px; flex-wrap: wrap;">
        <button
          class="btn"
          title="Discard local edits and reload config from gateway"
          ?disabled=${props.loading}
          @click=${props.onReload}
        >
          ${props.loading ? "Refreshing…" : "Reload Config"}
        </button>
        <button
          class="btn"
          title="Save current edits to config file"
          ?disabled=${props.saving || !props.connected}
          @click=${props.onSave}
        >
          ${props.saving ? "Saving…" : "Save"}
        </button>
        <button
          class="btn primary"
          title="Apply saved config to runtime"
          ?disabled=${props.applying || !props.connected}
          @click=${props.onApply}
        >
          ${props.applying ? "Applying…" : "Apply Runtime"}
        </button>
        <button class="btn" title="Open full JSON editor" @click=${props.onOpenConfig}>Open JSON Editor</button>
        <button
          class="btn"
          title="Copy all known provider/model ids"
          ?disabled=${knownModelIds.length === 0}
          @click=${() => {
            const payload = knownModelIds.join("\n");
            if (!payload) {
              return;
            }
            if (!navigator.clipboard?.writeText) {
              alert("Clipboard access is unavailable in this browser context.");
              return;
            }
            void navigator.clipboard.writeText(payload).catch(() => {
              alert("Clipboard access failed. Open JSON editor and copy manually.");
            });
          }}
        >
          Copy Model IDs
        </button>
        ${props.connected ? html`<span class="pill ok">Connected</span>` : html`<span class="pill warn">Disconnected</span>`}
        ${props.dirty ? html`<span class="pill warn">Unsaved changes</span>` : html`<span class="pill ok">Saved</span>`}
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
