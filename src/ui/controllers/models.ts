import type { OpenClawApp } from "../app.ts";

export type ProviderEntry = {
  id: string;
  baseUrl?: string;
  api?: string;
  models: ModelEntry[];
};

export type ModelEntry = {
  id: string;
  name?: string;
  reasoning?: boolean;
  input?: string[];
  contextWindow?: number;
  maxTokens?: number;
};

export type AliasEntry = {
  alias: string;
  target: string;
};

export type DefaultsEntry = {
  primary?: string;
  fallbacks: string[];
  imageModel: { primary?: string; fallbacks: string[] };
  pdfModel: { primary?: string; fallbacks: string[] };
};

export type AgentEntry = {
  id: string;
  model?: { primary?: string; fallbacks?: string[] } | string;
};

export type DeleteImpact = {
  action: "remove" | "replace" | "update";
  path: string;
  before: string;
  after?: string;
};

export type ModelsDeleteTarget =
  | { kind: "model"; modelKey: string; providerId: string; modelId: string }
  | { kind: "provider"; providerId: string };

export type ModelsDeletePlan = {
  target: ModelsDeleteTarget;
  baseHash: string;
  replacementModel: string | null;
  impacts: DeleteImpact[];
  blockers: string[];
  nextConfig: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toModelProfile(value: unknown): { primary?: string; fallbacks: string[] } {
  if (typeof value === "string") {
    return { primary: value, fallbacks: [] };
  }
  const rec = asRecord(value);
  const primary = typeof rec.primary === "string" ? rec.primary : undefined;
  const fallbacks = Array.isArray(rec.fallbacks)
    ? rec.fallbacks.filter((entry): entry is string => typeof entry === "string")
    : [];
  return { primary, fallbacks };
}

function fromModelProfile(
  original: unknown,
  profile: { primary?: string; fallbacks: string[] },
): unknown {
  if (typeof original === "string") {
    return profile.primary ?? original;
  }
  const base = asRecord(original);
  return {
    ...base,
    ...(profile.primary ? { primary: profile.primary } : {}),
    fallbacks: profile.fallbacks,
  };
}

function splitModelKey(modelKey: string): { providerId: string; modelId: string } | null {
  const value = String(modelKey ?? "").trim();
  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) {
    return null;
  }
  return {
    providerId: value.slice(0, slash),
    modelId: value.slice(slash + 1),
  };
}

function formatValue(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function addImpact(
  impacts: DeleteImpact[],
  action: DeleteImpact["action"],
  path: string,
  before: unknown,
  after?: unknown,
) {
  impacts.push({
    action,
    path,
    before: formatValue(before),
    ...(after !== undefined ? { after: formatValue(after) } : {}),
  });
}

function gatherProviderModelKeys(config: Record<string, unknown>): string[] {
  const providers = asRecord(asRecord(asRecord(config.models).providers));
  const keys: string[] = [];
  for (const [providerId, providerRaw] of Object.entries(providers)) {
    const models = Array.isArray(asRecord(providerRaw).models)
      ? (asRecord(providerRaw).models as unknown[])
      : [];
    for (const modelRaw of models) {
      const id = asRecord(modelRaw).id;
      if (typeof id === "string" && id.length > 0) {
        keys.push(`${providerId}/${id}`);
      }
    }
  }
  return keys;
}

function gatherDeletedSet(config: Record<string, unknown>, target: ModelsDeleteTarget): Set<string> {
  if (target.kind === "model") {
    return new Set([target.modelKey]);
  }
  const set = new Set<string>();
  const prefix = `${target.providerId}/`;
  for (const key of gatherProviderModelKeys(config)) {
    if (key.startsWith(prefix)) {
      set.add(key);
    }
  }
  const allowlist = asRecord(asRecord(asRecord(config.agents).defaults).models);
  for (const key of Object.keys(allowlist)) {
    if (key.startsWith(prefix)) {
      set.add(key);
    }
  }
  return set;
}

function gatherReplacementCandidates(
  config: Record<string, unknown>,
  deleted: Set<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value !== "string" || value.length === 0) {
      return;
    }
    if (deleted.has(value)) {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    out.push(value);
  };

  const defaults = asRecord(asRecord(config.agents).defaults);
  const defaultsModel = toModelProfile(defaults.model);
  add(defaultsModel.primary);
  defaultsModel.fallbacks.forEach(add);

  const allowlist = asRecord(defaults.models);
  Object.keys(allowlist).forEach(add);

  gatherProviderModelKeys(config).forEach(add);

  return out;
}

function rewriteModelReference(
  holder: Record<string, unknown>,
  key: string,
  path: string,
  deleted: Set<string>,
  replacement: string | null,
  impacts: DeleteImpact[],
  blockers: string[],
) {
  const before = holder[key];
  if (before == null) {
    return;
  }

  if (typeof before === "string") {
    if (!deleted.has(before)) {
      return;
    }
    if (!replacement) {
      blockers.push(`No replacement available for ${path} (${before}).`);
      return;
    }
    holder[key] = replacement;
    addImpact(impacts, "replace", path, before, replacement);
    return;
  }

  const profile = toModelProfile(before);
  const originalPrimary = profile.primary;
  const originalFallbacks = [...profile.fallbacks];
  profile.fallbacks = profile.fallbacks.filter((entry) => !deleted.has(entry));

  if (profile.primary && deleted.has(profile.primary)) {
    if (profile.fallbacks.length > 0) {
      profile.primary = profile.fallbacks[0];
      profile.fallbacks = profile.fallbacks.slice(1);
    } else if (replacement) {
      profile.primary = replacement;
    } else {
      blockers.push(`No replacement available for ${path}.primary (${profile.primary}).`);
      profile.primary = originalPrimary;
      profile.fallbacks = originalFallbacks;
      return;
    }
  }

  const changed =
    profile.primary !== originalPrimary ||
    profile.fallbacks.length !== originalFallbacks.length ||
    profile.fallbacks.some((entry, index) => entry !== originalFallbacks[index]);

  if (!changed) {
    return;
  }

  holder[key] = fromModelProfile(before, profile);
  addImpact(impacts, "update", path, before, holder[key]);
}

function applyModelDeletion(
  config: Record<string, unknown>,
  target: ModelsDeleteTarget,
  deleted: Set<string>,
  replacement: string | null,
): { impacts: DeleteImpact[]; blockers: string[] } {
  const impacts: DeleteImpact[] = [];
  const blockers: string[] = [];

  const models = asRecord(config.models);
  const providers = asRecord(models.providers);

  if (target.kind === "provider") {
    if (Object.prototype.hasOwnProperty.call(providers, target.providerId)) {
      const before = providers[target.providerId];
      delete providers[target.providerId];
      addImpact(impacts, "remove", `models.providers.${target.providerId}`, before);
    }
  } else {
    const provider = asRecord(providers[target.providerId]);
    const modelsArray = Array.isArray(provider.models) ? (provider.models as unknown[]) : [];
    const nextModels = modelsArray.filter(
      (entry) => asRecord(entry).id !== target.modelId,
    );
    if (nextModels.length !== modelsArray.length) {
      provider.models = nextModels;
      providers[target.providerId] = provider;
      addImpact(
        impacts,
        "update",
        `models.providers.${target.providerId}.models`,
        `${modelsArray.length} entries`,
        `${nextModels.length} entries`,
      );
    }
  }

  const agents = asRecord(config.agents);
  const defaults = asRecord(agents.defaults);

  const allowlist = asRecord(defaults.models);
  for (const key of Object.keys(allowlist)) {
    if (!deleted.has(key)) {
      continue;
    }
    const before = allowlist[key];
    delete allowlist[key];
    addImpact(impacts, "remove", `agents.defaults.models.${key}`, before);
  }
  defaults.models = allowlist;

  rewriteModelReference(defaults, "model", "agents.defaults.model", deleted, replacement, impacts, blockers);
  rewriteModelReference(
    defaults,
    "imageModel",
    "agents.defaults.imageModel",
    deleted,
    replacement,
    impacts,
    blockers,
  );
  rewriteModelReference(defaults, "pdfModel", "agents.defaults.pdfModel", deleted, replacement, impacts, blockers);

  const agentList = Array.isArray(agents.list) ? (agents.list as unknown[]) : [];
  for (const [index, agentRaw] of agentList.entries()) {
    const agent = asRecord(agentRaw);
    rewriteModelReference(
      agent,
      "model",
      `agents.list[${index}].model`,
      deleted,
      replacement,
      impacts,
      blockers,
    );
  }

  const cron = asRecord(config.cron);
  const jobs = Array.isArray(cron.jobs) ? (cron.jobs as unknown[]) : [];
  for (const [index, jobRaw] of jobs.entries()) {
    const job = asRecord(jobRaw);
    rewriteModelReference(
      job,
      "model",
      `cron.jobs[${index}].model`,
      deleted,
      replacement,
      impacts,
      blockers,
    );
  }

  return { impacts, blockers };
}

function buildDeletePlan(
  config: Record<string, unknown>,
  baseHash: string,
  target: ModelsDeleteTarget,
): ModelsDeletePlan {
  const nextConfig = structuredClone(config) as Record<string, unknown>;
  const deleted = gatherDeletedSet(nextConfig, target);
  const replacementCandidates = gatherReplacementCandidates(nextConfig, deleted);
  const replacementModel = replacementCandidates.length > 0 ? replacementCandidates[0] : null;
  const { impacts, blockers } = applyModelDeletion(nextConfig, target, deleted, replacementModel);

  if (impacts.length === 0) {
    blockers.push("No matching configuration entries were changed.");
  }

  return {
    target,
    baseHash,
    replacementModel,
    impacts,
    blockers,
    nextConfig,
  };
}

export async function loadModels(state: OpenClawApp) {
  if (state.modelsLoading) {
    return;
  }
  if (!state.client || !state.connected) {
    return;
  }

  state.modelsLoading = true;
  state.modelsError = null;

  try {
    const configRes = (await state.client.request("config.get", {})) as {
      config?: Record<string, unknown>;
      hash?: string;
    };
    const cfg = asRecord(configRes.config);

    const providersRaw = asRecord(asRecord(cfg.models).providers);
    const providers: Record<string, ProviderEntry> = {};
    for (const [providerId, providerData] of Object.entries(providersRaw)) {
      const p = asRecord(providerData);
      providers[providerId] = {
        id: providerId,
        baseUrl: typeof p.baseUrl === "string" ? p.baseUrl : undefined,
        api: typeof p.api === "string" ? p.api : undefined,
        models: Array.isArray(p.models)
          ? p.models
              .map((entry) => asRecord(entry))
              .filter((entry) => typeof entry.id === "string")
              .map((entry) => ({
                id: String(entry.id),
                name: typeof entry.name === "string" ? entry.name : undefined,
                reasoning: typeof entry.reasoning === "boolean" ? entry.reasoning : undefined,
                input: Array.isArray(entry.input)
                  ? entry.input.filter((value): value is string => typeof value === "string")
                  : undefined,
                contextWindow:
                  typeof entry.contextWindow === "number" ? entry.contextWindow : undefined,
                maxTokens: typeof entry.maxTokens === "number" ? entry.maxTokens : undefined,
              }))
          : [],
      };
    }

    const aliasesRaw = asRecord(asRecord(asRecord(cfg.agents).defaults).models);
    const aliases: AliasEntry[] = [];
    for (const [target, entry] of Object.entries(aliasesRaw)) {
      const alias = asRecord(entry).alias;
      if (typeof alias === "string" && alias.length > 0) {
        aliases.push({ alias, target });
      }
    }

    const defaultsRaw = asRecord(asRecord(cfg.agents).defaults);
    const modelCfg = toModelProfile(defaultsRaw.model);
    const imageModel = toModelProfile(defaultsRaw.imageModel);
    const pdfModel = toModelProfile(defaultsRaw.pdfModel);

    const defaults: DefaultsEntry = {
      primary: modelCfg.primary,
      fallbacks: modelCfg.fallbacks,
      imageModel,
      pdfModel,
    };

    const agentsRaw = Array.isArray(asRecord(cfg.agents).list) ? (asRecord(cfg.agents).list as unknown[]) : [];
    const agents: AgentEntry[] = agentsRaw.map((entry) => {
      const row = asRecord(entry);
      return {
        id: typeof row.id === "string" ? row.id : "unknown",
        model: row.model as AgentEntry["model"],
      };
    });

    state.modelsProviders = providers;
    state.modelsAliases = aliases;
    state.modelsDefaults = defaults;
    state.modelsAgents = agents;
    state.modelsConfigHash = typeof configRes.hash === "string" ? configRes.hash : null;
  } catch (err: unknown) {
    state.modelsError = err instanceof Error ? err.message : String(err);
  } finally {
    state.modelsLoading = false;
  }
}

export async function startDeleteModel(state: OpenClawApp, modelKey: string) {
  if (!state.client || !state.connected || state.modelsDeleteBusy) {
    return;
  }
  const parsed = splitModelKey(modelKey);
  if (!parsed) {
    state.modelsDeleteError = `Invalid model key: ${modelKey}`;
    return;
  }

  state.modelsDeleteBusy = true;
  state.modelsDeleteError = null;
  try {
    const res = (await state.client.request("config.get", {})) as {
      config?: Record<string, unknown>;
      hash?: string;
    };
    if (!res.hash) {
      state.modelsDeleteError = "Config hash missing; reload and retry.";
      return;
    }

    state.modelsDeletePlan = buildDeletePlan(asRecord(res.config), res.hash, {
      kind: "model",
      modelKey,
      providerId: parsed.providerId,
      modelId: parsed.modelId,
    });
  } catch (err: unknown) {
    state.modelsDeleteError = err instanceof Error ? err.message : String(err);
  } finally {
    state.modelsDeleteBusy = false;
  }
}

export async function startDeleteProvider(state: OpenClawApp, providerId: string) {
  if (!state.client || !state.connected || state.modelsDeleteBusy) {
    return;
  }

  state.modelsDeleteBusy = true;
  state.modelsDeleteError = null;
  try {
    const res = (await state.client.request("config.get", {})) as {
      config?: Record<string, unknown>;
      hash?: string;
    };
    if (!res.hash) {
      state.modelsDeleteError = "Config hash missing; reload and retry.";
      return;
    }

    state.modelsDeletePlan = buildDeletePlan(asRecord(res.config), res.hash, {
      kind: "provider",
      providerId,
    });
  } catch (err: unknown) {
    state.modelsDeleteError = err instanceof Error ? err.message : String(err);
  } finally {
    state.modelsDeleteBusy = false;
  }
}

export function cancelDeletePlan(state: OpenClawApp) {
  state.modelsDeletePlan = null;
  state.modelsDeleteError = null;
}

export async function applyDeletePlan(state: OpenClawApp) {
  if (!state.client || !state.connected || state.modelsDeleteBusy) {
    return;
  }
  const plan = state.modelsDeletePlan;
  if (!plan) {
    return;
  }
  if (plan.blockers.length > 0) {
    state.modelsDeleteError = "Resolve blockers before applying deletion.";
    return;
  }

  state.modelsDeleteBusy = true;
  state.modelsDeleteError = null;
  try {
    await state.client.request("config.set", {
      raw: JSON.stringify(plan.nextConfig, null, 2),
      baseHash: plan.baseHash,
    });
    state.modelsDeletePlan = null;
    await loadModels(state);
  } catch (err: unknown) {
    state.modelsDeleteError = err instanceof Error ? err.message : String(err);
  } finally {
    state.modelsDeleteBusy = false;
  }
}
