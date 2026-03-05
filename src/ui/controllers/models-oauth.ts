import type { GatewayBrowserClient } from "../gateway.ts";

type WizardStepType = "note" | "select" | "text" | "confirm" | "multiselect" | "progress" | "action";

type WizardStepOption = {
  value: unknown;
  label: string;
  hint?: string;
};

type WizardStep = {
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
  step?: WizardStep;
  status?: "running" | "done" | "cancelled" | "error";
  error?: string;
};

type WizardNextResult = {
  done: boolean;
  step?: WizardStep;
  status?: "running" | "done" | "cancelled" | "error";
  error?: string;
};

type WizardAnswerResult =
  | { kind: "answer"; value: unknown }
  | { kind: "cancel" };

export type ModelsOAuthWizardState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  modelsOauthRunning: boolean;
  lastError: string | null;
};

export type RunModelsOAuthWizardParams = {
  providerId: string;
  method?: string;
  onReload?: () => Promise<void> | void;
};

const MAX_WIZARD_STEPS = 220;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toLower(value: unknown): string {
  return asString(value).toLowerCase();
}

function buildStepMessage(step: WizardStep): string {
  const title = asString(step.title);
  const message = asString(step.message);
  if (title && message) {
    return `${title}\n\n${message}`;
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
  step: WizardStep;
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

function extractActionUrl(step: WizardStep): string {
  const source = [asString(step.message), asString(step.title), asString(step.initialValue)].join("\n");
  const match = source.match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : "";
}

function askSelect(params: {
  step: WizardStep;
  providerHint: string;
  methodHint: string;
}): WizardAnswerResult {
  const options = Array.isArray(params.step.options) ? params.step.options : [];
  if (options.length === 0) {
    return { kind: "answer", value: params.step.initialValue ?? "" };
  }

  const defaultIndex = findSelectDefaultIndex(params);
  const menu = options
    .map((option, idx) => `${idx + 1}. ${option.label}${option.hint ? ` — ${option.hint}` : ""}`)
    .join("\n");
  const input = window.prompt(
    `${buildStepMessage(params.step)}\n\n${menu}\n\nPick option number (1-${options.length}).`,
    String(defaultIndex + 1),
  );

  if (input === null) {
    return { kind: "cancel" };
  }

  const parsed = Number.parseInt(input.trim(), 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= options.length) {
    return { kind: "answer", value: options[parsed - 1].value };
  }

  return { kind: "answer", value: options[defaultIndex]?.value ?? options[0].value };
}

function askMultiSelect(step: WizardStep): WizardAnswerResult {
  const options = Array.isArray(step.options) ? step.options : [];
  if (options.length === 0) {
    return { kind: "answer", value: Array.isArray(step.initialValue) ? step.initialValue : [] };
  }
  const menu = options
    .map((option, idx) => `${idx + 1}. ${option.label}${option.hint ? ` — ${option.hint}` : ""}`)
    .join("\n");
  const defaultIndices = Array.isArray(step.initialValue)
    ? step.initialValue
        .map((entry) => options.findIndex((option) => option.value === entry))
        .filter((idx) => idx >= 0)
        .map((idx) => String(idx + 1))
        .join(",")
    : "";

  const input = window.prompt(
    `${buildStepMessage(step)}\n\n${menu}\n\nEnter comma-separated numbers (e.g. 1,3).`,
    defaultIndices,
  );
  if (input === null) {
    return { kind: "cancel" };
  }

  const values = input
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((idx) => Number.isFinite(idx) && idx >= 1 && idx <= options.length)
    .map((idx) => options[idx - 1]?.value)
    .filter((value) => value !== undefined);

  return { kind: "answer", value: values };
}

function askWizardStep(params: {
  step: WizardStep;
  providerHint: string;
  methodHint: string;
}): WizardAnswerResult {
  const { step } = params;

  switch (step.type) {
    case "note":
    case "progress": {
      const proceed = window.confirm(`${buildStepMessage(step)}\n\nOK = continue, Cancel = stop`);
      return proceed ? { kind: "answer", value: true } : { kind: "cancel" };
    }
    case "confirm": {
      const accepted = window.confirm(`${buildStepMessage(step)}\n\nOK = yes, Cancel = no`);
      return { kind: "answer", value: accepted };
    }
    case "text": {
      const defaultValue = asString(step.initialValue) ||
        (toLower(step.message).includes("method") ? params.methodHint : "") ||
        (toLower(step.message).includes("provider") ? params.providerHint : "");
      const value = window.prompt(buildStepMessage(step), defaultValue);
      if (value === null) {
        return { kind: "cancel" };
      }
      return { kind: "answer", value };
    }
    case "multiselect":
      return askMultiSelect(step);
    case "select":
      return askSelect(params);
    case "action": {
      const url = extractActionUrl(step);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      const value = window.prompt(
        `${buildStepMessage(step)}\n\n${
          url ? `Opened: ${url}\n` : ""
        }Press OK to continue. If a code/value is requested, paste it below.`,
        asString(step.initialValue),
      );
      if (value === null) {
        return { kind: "cancel" };
      }
      return { kind: "answer", value: value || true };
    }
    default:
      return { kind: "answer", value: true };
  }
}

function formatWizardEndMessage(result: { status?: string; error?: string }): string {
  if (result.status === "done" || !result.status) {
    return "OAuth wizard finished.";
  }
  if (result.status === "cancelled") {
    return "OAuth wizard was cancelled.";
  }
  if (result.status === "error") {
    return `OAuth wizard failed: ${result.error ?? "unknown error"}`;
  }
  return `OAuth wizard stopped: ${result.status}`;
}

export async function runModelsOAuthWizard(
  state: ModelsOAuthWizardState,
  params: RunModelsOAuthWizardParams,
): Promise<void> {
  if (!state.client || !state.connected || state.modelsOauthRunning) {
    return;
  }

  const introConfirmed = window.confirm(
    [
      "This launches the gateway onboarding wizard inside the UI.",
      "",
      "To run OAuth, pick MODIFY flow and choose your provider/method when asked.",
      "Keep existing gateway/channels/skills values unless you intentionally want to change them.",
      "",
      "Continue?",
    ].join("\n"),
  );
  if (!introConfirmed) {
    return;
  }

  state.modelsOauthRunning = true;
  state.lastError = null;

  const { providerHint, methodHint } = extractProviderHints(params.providerId, params.method);
  const client = state.client;
  let sessionId: string | null = null;

  try {
    let result = await client.request<WizardStartResult>("wizard.start", { mode: "local" });
    sessionId = asString(result.sessionId);

    let steps = 0;
    while (!result.done) {
      if (steps >= MAX_WIZARD_STEPS) {
        throw new Error("OAuth wizard exceeded max step limit. Please retry.");
      }
      steps += 1;

      const step = result.step;
      if (!step) {
        result = {
          sessionId,
          ...(await client.request<WizardNextResult>("wizard.next", { sessionId })),
        };
        continue;
      }

      const answer = askWizardStep({ step, providerHint, methodHint });
      if (answer.kind === "cancel") {
        await client.request("wizard.cancel", { sessionId });
        window.alert("OAuth wizard cancelled.");
        return;
      }

      result = {
        sessionId,
        ...(await client.request<WizardNextResult>("wizard.next", {
          sessionId,
          answer: {
            stepId: step.id,
            value: answer.value,
          },
        })),
      };
    }

    const endMessage = formatWizardEndMessage(result);
    if (result.status === "done" || !result.status) {
      window.alert(`${endMessage} Reloading auth profiles…`);
      await params.onReload?.();
      return;
    }

    window.alert(endMessage);
  } catch (err) {
    state.lastError = String(err);
    window.alert(`OAuth wizard run failed: ${String(err)}`);
    if (sessionId) {
      try {
        await client.request("wizard.cancel", { sessionId });
      } catch {
        // best effort cleanup
      }
    }
  } finally {
    state.modelsOauthRunning = false;
  }
}
