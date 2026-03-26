import { html, nothing } from "lit";
import type { ConfigUiHints } from "../types.ts";
import { icons } from "../icons.ts";
import { iconForTab, titleForTab, type Tab } from "../navigation.ts";
import { renderLoadingState } from "./loading-state.ts";
import { analyzeConfigSchema, renderConfigForm, SECTION_META } from "./config-form.ts";
import { hintForPath, humanize, schemaType, type JsonSchema } from "./config-form.shared.ts";

export type CuratedConfigPageId =
  | "communications"
  | "appearance"
  | "automation"
  | "infrastructure"
  | "aiAgents";

export type CuratedConfigPageProps = {
  page: CuratedConfigPageId;
  connected: boolean;
  loading: boolean;
  schemaLoading: boolean;
  saving: boolean;
  applying: boolean;
  dirty: boolean;
  schema: unknown;
  uiHints: ConfigUiHints;
  formValue: Record<string, unknown> | null;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onReload: () => void;
  onSave: () => void;
  onApply: () => void;
  onOpenTab: (tab: Tab) => void;
  onOpenConfig: () => void;
};

type CuratedConfigPageDefinition = {
  label: string;
  eyebrow: string;
  description: string;
  focusAreas: string[];
  sections: string[];
  quickLinks: Tab[];
};

type CuratedSectionSummary = {
  key: string;
  label: string;
  description: string;
  subsections: string[];
};

const CURATED_PAGE_DEFINITIONS: Record<CuratedConfigPageId, CuratedConfigPageDefinition> = {
  communications: {
    label: "Communications",
    eyebrow: "Channels · Delivery · Voice",
    description:
      "Curated controls for channel accounts, routing, broadcast behavior, and voice/talk settings.",
    focusAreas: ["Channels", "Messages", "Hooks", "Broadcast", "Voice"],
    sections: ["channels", "messages", "hooks", "broadcast", "talk", "audio"],
    quickLinks: ["channels"],
  },
  appearance: {
    label: "Appearance",
    eyebrow: "UI · Layout · Canvas",
    description:
      "A focused surface for interface polish, presentation preferences, shortcuts, and visual host settings.",
    focusAreas: ["UI", "Bindings", "Canvas Host"],
    sections: ["ui", "bindings", "canvasHost"],
    quickLinks: [],
  },
  automation: {
    label: "Automation",
    eyebrow: "Schedules · Commands · Tooling",
    description:
      "Safe scaffolding for scheduled jobs, custom commands, event hooks, and tool-driven workflows.",
    focusAreas: ["Cron", "Commands", "Hooks", "Tools"],
    sections: ["cron", "commands", "hooks", "tools"],
    quickLinks: ["cron", "skills"],
  },
  infrastructure: {
    label: "Infrastructure",
    eyebrow: "Gateway · Web · Discovery",
    description:
      "Gateway runtime, web endpoints, networking/discovery, plugin surface, logs, and release posture in one place.",
    focusAreas: ["Gateway", "Web", "Discovery", "Logging", "Updates"],
    sections: ["gateway", "web", "discovery", "plugins", "logging", "env", "update"],
    quickLinks: ["nodes", "logs"],
  },
  aiAgents: {
    label: "AI Agents",
    eyebrow: "Agents · Models · Skills",
    description:
      "Curated editing for agent definitions, models, auth-backed providers, skill exposure, and tool access defaults.",
    focusAreas: ["Agents", "Models", "Skills", "Auth", "Tools"],
    sections: ["agents", "models", "skills", "auth", "tools"],
    quickLinks: ["agents", "models", "skills"],
  },
};

function resolveSectionMeta(
  key: string,
  schema?: JsonSchema,
): {
  label: string;
  description: string;
} {
  const meta = SECTION_META[key];
  if (meta) {
    return meta;
  }
  return {
    label: schema?.title ?? humanize(key),
    description: schema?.description ?? "",
  };
}

function resolveSubsections(params: {
  key: string;
  schema: JsonSchema | undefined;
  uiHints: ConfigUiHints;
}): string[] {
  const { key, schema, uiHints } = params;
  if (!schema || schemaType(schema) !== "object" || !schema.properties) {
    return [];
  }
  return Object.entries(schema.properties)
    .map(([subKey, node]) => {
      const hint = hintForPath([key, subKey], uiHints);
      const label = hint?.label ?? node.title ?? humanize(subKey);
      const order = hint?.order ?? 50;
      return { label, order, key: subKey };
    })
    .toSorted((a, b) => (a.order !== b.order ? a.order - b.order : a.key.localeCompare(b.key)))
    .map((entry) => entry.label)
    .slice(0, 4);
}

function buildSectionSummaries(params: {
  sectionKeys: string[];
  schema: JsonSchema | null;
  uiHints: ConfigUiHints;
}): { available: CuratedSectionSummary[]; missing: string[] } {
  const { sectionKeys, schema, uiHints } = params;
  if (!schema || schemaType(schema) !== "object") {
    return { available: [], missing: [...sectionKeys] };
  }

  const properties = schema.properties ?? {};
  const available: CuratedSectionSummary[] = [];
  const missing: string[] = [];

  for (const key of sectionKeys) {
    const sectionSchema = properties[key];
    if (!sectionSchema) {
      missing.push(key);
      continue;
    }
    const meta = resolveSectionMeta(key, sectionSchema);
    available.push({
      key,
      label: meta.label,
      description: meta.description,
      subsections: resolveSubsections({ key, schema: sectionSchema, uiHints }),
    });
  }

  return { available, missing };
}

export function renderCuratedConfigPage(props: CuratedConfigPageProps) {
  const definition = CURATED_PAGE_DEFINITIONS[props.page];
  const analysis = analyzeConfigSchema(props.schema);
  const { available, missing } = buildSectionSummaries({
    sectionKeys: definition.sections,
    schema: analysis.schema,
    uiHints: props.uiHints,
  });
  const hasConfig = Boolean(props.formValue);
  const showLoader = props.schemaLoading || (props.loading && !hasConfig);
  const canSave = props.connected && props.dirty && !props.loading && !props.saving && hasConfig;
  const canApply = props.connected && props.dirty && !props.loading && !props.applying && hasConfig;

  return html`
    <section class="settings-hub">
      <div class="settings-hub__hero card">
        <div class="settings-hub__hero-copy">
          <span class="settings-hub__eyebrow">${definition.eyebrow}</span>
          <h2 class="settings-hub__title">${definition.label}</h2>
          <p class="settings-hub__description">${definition.description}</p>
          <div class="settings-hub__focus-list">
            ${definition.focusAreas.map(
              (focus) => html`<span class="settings-hub__focus-pill">${focus}</span>`,
            )}
          </div>
        </div>
        <div class="settings-hub__hero-actions">
          ${definition.quickLinks.map(
            (tab) => html`
              <button class="btn btn--sm" @click=${() => props.onOpenTab(tab)}>
                <span class="settings-hub__hero-action-icon">${icons[iconForTab(tab)]}</span>
                ${titleForTab(tab)}
              </button>
            `,
          )}
          <button class="btn btn--sm" @click=${props.onOpenConfig}>Full Config</button>
        </div>
      </div>

      <div class="settings-hub__toolbar card">
        <div class="settings-hub__toolbar-status">
          <span class="pill ${props.dirty ? "danger" : ""}">
            ${props.dirty ? "Unsaved config changes" : "Loaded config is in sync"}
          </span>
          ${
            !props.connected
              ? html`<span class="pill">Disconnected</span>`
              : html`<span class="pill">Live editing ready</span>`
          }
        </div>
        <div class="settings-hub__toolbar-actions">
          <button class="btn btn--sm" ?disabled=${props.loading || props.schemaLoading} @click=${props.onReload}>
            ${props.loading || props.schemaLoading ? "Loading…" : "Reload"}
          </button>
          <button class="btn btn--sm primary" ?disabled=${!canSave} @click=${props.onSave}>
            ${props.saving ? "Saving…" : "Save"}
          </button>
          <button class="btn btn--sm" ?disabled=${!canApply} @click=${props.onApply}>
            ${props.applying ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>

      ${
        !props.connected
          ? html`<div class="callout warning">
              Disconnected. Connect first to load and edit this configuration page.
            </div>`
          : nothing
      }

      ${
        missing.length > 0
          ? html`<div class="callout info">
              Some curated sections are not present in this gateway schema yet:
              ${missing.map((key, index) => `${index === 0 ? "" : ", "}${resolveSectionMeta(key).label}`)}.
            </div>`
          : nothing
      }

      ${
        showLoader
          ? renderLoadingState({
              label: `Loading ${definition.label.toLowerCase()}`,
              detail: "Preparing the curated settings surface…",
            })
          : nothing
      }

      ${
        !showLoader && analysis.schema == null
          ? html`<div class="callout danger">
              Configuration schema unavailable. Open Full Config and use Raw mode if needed.
            </div>`
          : nothing
      }

      ${
        !showLoader && analysis.schema && available.length === 0
          ? html`<div class="callout warning">
              No matching curated sections are available for this gateway schema yet.
            </div>`
          : nothing
      }

      ${
        !showLoader && available.length > 0
          ? html`
              <div class="settings-hub__summary-grid">
                ${available.map(
                  (section) => html`
                    <article class="settings-hub__summary-card card">
                      <div class="settings-hub__summary-head">
                        <span class="settings-hub__summary-title">${section.label}</span>
                        <span class="settings-hub__summary-key">${section.key}</span>
                      </div>
                      <p class="settings-hub__summary-description">${section.description}</p>
                      ${
                        section.subsections.length > 0
                          ? html`
                              <div class="settings-hub__summary-subsections">
                                ${section.subsections.map(
                                  (subsection) => html`
                                    <span class="settings-hub__summary-chip">${subsection}</span>
                                  `,
                                )}
                              </div>
                            `
                          : html`<div class="settings-hub__summary-empty">Top-level section scaffold</div>`
                      }
                    </article>
                  `,
                )}
              </div>

              <div class="settings-hub__forms">
                ${available.map((section) =>
                  renderConfigForm({
                    schema: analysis.schema,
                    uiHints: props.uiHints,
                    value: props.formValue,
                    disabled: props.loading || !props.formValue,
                    unsupportedPaths: analysis.unsupportedPaths,
                    onPatch: props.onPatch,
                    searchQuery: "",
                    activeSection: section.key,
                    activeSubsection: null,
                  }),
                )}
              </div>
            `
          : nothing
      }
    </section>
  `;
}
