import type { GatewayBrowserClient } from "../gateway.ts";

type WizardStepType = "note" | "select" | "text" | "confirm" | "multiselect" | "progress" | "action";

type WizardStepOption = {
  value: unknown;
  label: string;
  hint?: string;
};

export type ModelsOAuthUiStep = {
  id: string;
  type: WizardStepType;
  title?: string;
  message?: string;
  options?: WizardStepOption[];
  initialValue?: unknown;
  placeholder?: string;
  sensitive?: boolean;
  executor?: "gateway" | "client";
};

type WizardStartResult = {
  sessionId: string;
  done: boolean;
  step?: ModelsOAuthUiStep;
  status?: "running" | "done" | "cancelled" | "error";
  error?: string;
};

type WizardNextResult = {
  done: boolean;
  step?: ModelsOAuthUiStep;
  status?: "running" | "done" | "cancelled" | "error";
  error?: string;
};

type WizardResult = WizardStartResult | WizardNextResult;

export type ModelsOAuthWizardState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  modelsOauthRunning: boolean;
  modelsOauthSessionId: string | null;
  modelsOauthStep: ModelsOAuthUiStep | null;
  modelsOauthStepInput: string;
  modelsOauthStepUrl: string | null;
  modelsOauthStatus: string | null;
  modelsOauthProviderHint: string;
  modelsOauthMethodHint: string;
  modelsOauthStepCount: number;
  lastError: string | null;
};

export type StartModelsOAuthWizardParams = {
  providerId: string;
  method?: string;
  onReload?: () => Promise<void> | void;
};

export type SubmitModelsOAuthWizardStepParams = {
  value?: string;
  onReload?: () => Promise<void> | void;
};

const MAX_WIZARD_STEPS = 280;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toLower(value: unknown): string {
  return asString(value).toLowerCase();
}

function buildStepMessage(step: ModelsOAuthUiStep): string {
  const title = asString(step.title);
  const message = asString(step.message);
  if (title && message) {
    return `${title}: ${message}`;
  }
  return title || message || step.type;
}

function optionSearchText(option: WizardStepOption): string {
  return [asString(option.label), asString(option.hint), asString(option.value)]
    .join(" ")
    .toLowerCase();
}

function extractProviderHints(providerId: string, method?: string): {
  providerHint: string;
  methodHint: string;
} {
  const provider = toLower(providerId);
  const rawMethod = toLower(method);

  const providerHint = provider.includes("qwen")
    ? "qwen"
    : provider.includes("openai") || provider.includes("codex")
      ? "openai"
      : provider.includes("anthropic")
        ? "anthropic"
        : provider.includes("google") || provider.includes("gemini")
          ? "google"
          : provider.includes("chutes")
            ? "chutes"
            : provider.includes("minimax")
              ? "minimax"
              : provider;

  const methodHint = rawMethod ||
    (provider.includes("qwen")
      ? "qwen-portal"
      : provider.includes("openai") || provider.includes("codex")
        ? "openai-codex"
        : provider.includes("google") || provider.includes("gemini")
          ? "google-gemini-cli"
          : provider.includes("chutes")
            ? "chutes"
            : provider.includes("minimax")
              ? "minimax-portal"
              : "");

  return { providerHint, methodHint };
}

function findSelectDefaultIndex(params: {
  step: ModelsOAuthUiStep;
  providerHint: string;
  methodHint: string;
}): number {
  const options = Array.isArray(params.step.options) ? params.step.options : [];
  if (options.length === 0) {
    return 0;
  }

  const message = toLower(params.step.message);
  const title = toLower(params.step.title);

  const initialIndex = options.findIndex((option) => {
    const value = asString(option.value);
    if (!value) {
      return false;
    }
    return value === asString(params.step.initialValue);
  });

  const selectBySearch = (needle: string): number => {
    const normalizedNeedle = needle.trim().toLowerCase();
    if (!normalizedNeedle) {
      return -1;
    }
    return options.findIndex((option) => optionSearchText(option).includes(normalizedNeedle));
  };

  if (message.includes("model/auth provider") || title.includes("model/auth provider")) {
    const idx = selectBySearch(params.providerHint);
    if (idx >= 0) {
      return idx;
    }
  }

  if (message.includes("auth method") || title.includes("auth method")) {
    const idx = selectBySearch(params.methodHint);
    if (idx >= 0) {
      return idx;
    }
  }

  return initialIndex >= 0 ? initialIndex : 0;
}

function extractActionUrl(step: ModelsOAuthUiStep): string {
  const source = [asString(step.message), asString(step.title), asString(step.initialValue)].join("\n");
  const matches = source.match(/https?:\/\/[^\s)]+/gi) ?? [];
  if (matches.length === 0) {
    return "";
  }

  const urls = matches
    .map((raw) => raw.replace(/[),.;]+$/g, "").trim())
    .filter(Boolean)
    .filter((url) => {
      const lower = url.toLowerCase();
      if (lower.includes("docs.openclaw.ai")) {
        return false;
      }
      return true;
    });

  if (urls.length === 0) {
    return "";
  }

  const score = (url: string): number => {
    const lower = url.toLowerCase();
    let value = 0;
    if (lower.includes("oauth") || lower.includes("authorize") || lower.includes("consent")) {
      value += 40;
    }
    if (lower.includes("login") || lower.includes("signin")) {
      value += 25;
    }
    if (lower.includes("accounts.google.com") || lower.includes("github.com") || lower.includes("qwen")) {
      value += 12;
    }
    if (lower.includes("127.0.0.1") || lower.includes("localhost")) {
      value -= 12;
    }
    return value;
  };

  return [...urls].toSorted((a, b) => score(b) - score(a))[0] ?? urls[0] ?? "";
}

function looksLikeManualCodePrompt(step: ModelsOAuthUiStep): boolean {
  const text = `${toLower(step.title)} ${toLower(step.message)} ${toLower(step.placeholder)}`;
  if (!text) {
    return false;
  }
  return ["redirect", "paste", "code", "callback", "verification", "authorize", "token", "url"]
    .some((needle) => text.includes(needle));
}

function defaultManualInput(step: ModelsOAuthUiStep, state: ModelsOAuthWizardState): string {
  const initial = asString(step.initialValue);
  const text = `${toLower(step.title)} ${toLower(step.message)} ${toLower(step.placeholder)}`;
  if (text.includes("auth method") || text.includes("method")) {
    return state.modelsOauthMethodHint || initial;
  }
  if (text.includes("provider")) {
    return state.modelsOauthProviderHint || initial;
  }
  return initial;
}

function resolveAutoAnswer(step: ModelsOAuthUiStep, state: ModelsOAuthWizardState): unknown | null {
  switch (step.type) {
    case "note":
    case "progress":
      return true;
    case "confirm":
      return true;
    case "multiselect":
      return Array.isArray(step.initialValue) ? step.initialValue : [];
    case "select": {
      const options = Array.isArray(step.options) ? step.options : [];
      if (options.length === 0) {
        return step.initialValue ?? "";
      }
      const idx = findSelectDefaultIndex({
        step,
        providerHint: state.modelsOauthProviderHint,
        methodHint: state.modelsOauthMethodHint,
      });
      return options[idx]?.value ?? options[0].value;
    }
    case "text": {
      const text = `${toLower(step.title)} ${toLower(step.message)} ${toLower(step.placeholder)}`;
      if (looksLikeManualCodePrompt(step)) {
        return null;
      }
      if (text.includes("auth method") || text.includes("method")) {
        return state.modelsOauthMethodHint || asString(step.initialValue) || null;
      }
      if (text.includes("model/auth provider") || text.includes("provider")) {
        return state.modelsOauthProviderHint || asString(step.initialValue) || null;
      }
      const initial = asString(step.initialValue);
      return initial || null;
    }
    case "action":
      return null;
    default:
      return true;
  }
}

function clearModelsOAuthStep(state: ModelsOAuthWizardState) {
  state.modelsOauthStep = null;
  state.modelsOauthStepInput = "";
}

function clearModelsOAuthSession(state: ModelsOAuthWizardState) {
  clearModelsOAuthStep(state);
  state.modelsOauthSessionId = null;
  state.modelsOauthStepCount = 0;
  state.modelsOauthStepUrl = null;
}

function formatWizardEndMessage(result: { status?: string; error?: string }): string {
  if (result.status === "done" || !result.status) {
    return "OAuth 연결 완료.";
  }
  if (result.status === "cancelled") {
    return "OAuth 진행이 취소됨.";
  }
  if (result.status === "error") {
    return `OAuth 실패: ${result.error ?? "unknown error"}`;
  }
  return `OAuth 종료: ${result.status}`;
}

async function finishWizard(
  state: ModelsOAuthWizardState,
  result: { status?: string; error?: string },
  onReload?: () => Promise<void> | void,
): Promise<void> {
  const message = formatWizardEndMessage(result);
  clearModelsOAuthSession(state);

  if (result.status === "done" || !result.status) {
    try {
      await onReload?.();
      state.modelsOauthStatus = `${message} auth.profiles 갱신 완료.`;
    } catch (err) {
      state.modelsOauthStatus = `${message} (reload failed: ${String(err)})`;
    }
    return;
  }

  state.modelsOauthStatus = message;
}

async function processWizardUntilPause(
  state: ModelsOAuthWizardState,
  initialResult: WizardResult,
  onReload?: () => Promise<void> | void,
): Promise<void> {
  const client = state.client;
  const sessionId = state.modelsOauthSessionId;
  if (!client || !sessionId) {
    throw new Error("OAuth wizard session is not initialized.");
  }

  let result: WizardResult = initialResult;
  while (!result.done) {
    state.modelsOauthStepCount += 1;
    if (state.modelsOauthStepCount > MAX_WIZARD_STEPS) {
      throw new Error("OAuth wizard exceeded max step limit.");
    }

    const step = result.step;
    if (!step) {
      result = await client.request<WizardNextResult>("wizard.next", { sessionId });
      continue;
    }

    const embeddedUrl = extractActionUrl(step);
    if (embeddedUrl && state.modelsOauthStepUrl !== embeddedUrl) {
      state.modelsOauthStepUrl = embeddedUrl;
      window.open(embeddedUrl, "_blank", "noopener,noreferrer");
    }

    const shouldPauseForOAuthLink = Boolean(embeddedUrl) && step.type === "note";
    if (shouldPauseForOAuthLink) {
      state.modelsOauthStep = step;
      state.modelsOauthStepInput = "";
      state.modelsOauthStepUrl = embeddedUrl;
      state.modelsOauthStatus = buildStepMessage(step);
      state.modelsOauthRunning = false;
      return;
    }

    const autoValue = resolveAutoAnswer(step, state);
    if (autoValue !== null) {
      result = await client.request<WizardNextResult>("wizard.next", {
        sessionId,
        answer: {
          stepId: step.id,
          value: autoValue,
        },
      });
      continue;
    }

    state.modelsOauthStep = step;
    state.modelsOauthStepInput = defaultManualInput(step, state);
    state.modelsOauthStepUrl = embeddedUrl || state.modelsOauthStepUrl || null;
    state.modelsOauthStatus = buildStepMessage(step);
    state.modelsOauthRunning = false;
    return;
  }

  await finishWizard(state, result, onReload);
  state.modelsOauthRunning = false;
}

function normalizeManualAnswer(step: ModelsOAuthUiStep, value: string | undefined): unknown {
  const trimmed = asString(value);
  if (step.type === "note" || step.type === "progress") {
    return true;
  }
  if (step.type === "action") {
    return trimmed || true;
  }
  if (step.type === "confirm") {
    const normalized = trimmed.toLowerCase();
    if (!normalized) {
      return true;
    }
    return !["false", "0", "no", "n"].includes(normalized);
  }
  return trimmed;
}

export async function startModelsOAuthWizard(
  state: ModelsOAuthWizardState,
  params: StartModelsOAuthWizardParams,
): Promise<void> {
  if (!state.client || !state.connected || state.modelsOauthRunning) {
    return;
  }

  if (state.modelsOauthSessionId) {
    await cancelModelsOAuthWizard(state);
  }

  const hints = extractProviderHints(params.providerId, params.method);
  state.modelsOauthProviderHint = hints.providerHint;
  state.modelsOauthMethodHint = hints.methodHint;
  state.modelsOauthStatus = "OAuth wizard 시작 중...";
  state.modelsOauthRunning = true;
  state.lastError = null;
  clearModelsOAuthSession(state);

  const client = state.client;

  try {
    const result = await client.request<WizardStartResult>("wizard.start", { mode: "local" });
    const sessionId = asString(result.sessionId);
    if (!sessionId) {
      throw new Error("wizard.start returned empty session id");
    }
    state.modelsOauthSessionId = sessionId;
    await processWizardUntilPause(state, result, params.onReload);
  } catch (err) {
    state.lastError = String(err);
    state.modelsOauthStatus = `OAuth wizard 실행 실패: ${String(err)}`;
    state.modelsOauthRunning = false;
    if (state.modelsOauthSessionId) {
      try {
        await client.request("wizard.cancel", { sessionId: state.modelsOauthSessionId });
      } catch {
        // best effort cleanup
      }
    }
    clearModelsOAuthSession(state);
  }
}

export async function submitModelsOAuthWizardStep(
  state: ModelsOAuthWizardState,
  params: SubmitModelsOAuthWizardStepParams = {},
): Promise<void> {
  if (!state.client || !state.connected || state.modelsOauthRunning) {
    return;
  }
  if (!state.modelsOauthSessionId || !state.modelsOauthStep) {
    return;
  }

  const client = state.client;
  const sessionId = state.modelsOauthSessionId;
  const step = state.modelsOauthStep;

  state.modelsOauthRunning = true;
  state.lastError = null;
  state.modelsOauthStatus = "OAuth step 제출 중...";

  const answerValue = normalizeManualAnswer(step, params.value ?? state.modelsOauthStepInput);
  clearModelsOAuthStep(state);

  try {
    const result = await client.request<WizardNextResult>("wizard.next", {
      sessionId,
      answer: {
        stepId: step.id,
        value: answerValue,
      },
    });

    await processWizardUntilPause(state, result, params.onReload);
  } catch (err) {
    state.lastError = String(err);
    state.modelsOauthStatus = `OAuth step 실패: ${String(err)}`;
    state.modelsOauthRunning = false;
    if (state.modelsOauthSessionId) {
      try {
        await client.request("wizard.cancel", { sessionId: state.modelsOauthSessionId });
      } catch {
        // best effort cleanup
      }
    }
    clearModelsOAuthSession(state);
  }
}

export async function cancelModelsOAuthWizard(state: ModelsOAuthWizardState): Promise<void> {
  const client = state.client;
  const sessionId = state.modelsOauthSessionId;

  if (!sessionId) {
    state.modelsOauthRunning = false;
    state.modelsOauthStatus = "OAuth wizard 취소됨.";
    clearModelsOAuthSession(state);
    return;
  }

  state.modelsOauthRunning = true;

  try {
    if (client && state.connected) {
      await client.request("wizard.cancel", { sessionId });
    }
  } catch (err) {
    state.lastError = String(err);
  } finally {
    state.modelsOauthRunning = false;
    state.modelsOauthStatus = "OAuth wizard 취소됨.";
    clearModelsOAuthSession(state);
  }
}
