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
  description: string;
  sections: string[];
  quickLinks: Tab[];
};

type CuratedSectionSummary = {
  key: string;
  label: string;
  description: string;
  previewItems: string[];
  structureLabel: string | null;
  valueLabel: string;
  valueTone: "pill--ok" | "";
};

const CURATED_PAGE_DEFINITIONS: Record<CuratedConfigPageId, CuratedConfigPageDefinition> = {
  communications: {
    label: "Communications",
    description: "",
    sections: ["channels", "messages", "broadcast", "talk", "audio"],
    quickLinks: ["channels"],
  },
  appearance: {
    label: "Appearance",
    description: "",
    sections: ["__appearance__", "ui", "wizard"],
    quickLinks: [],
  },
  automation: {
    label: "Automation",
    description: "",
    sections: ["commands", "hooks", "bindings", "cron", "approvals", "plugins"],
    quickLinks: ["cron"],
  },
  infrastructure: {
    label: "Infrastructure",
    description: "",
    sections: ["gateway", "web", "browser", "nodeHost", "canvasHost", "discovery", "media", "acp", "mcp"],
    quickLinks: ["nodes", "logs"],
  },
  aiAgents: {
    label: "AI & Agents",
    description: "",
    sections: ["agents", "models", "skills", "tools", "memory", "session"],
    quickLinks: ["agents", "models", "skills"],
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

function resolvePreviewItems(params: {
  key: string;
  schema: JsonSchema | undefined;
  uiHints: ConfigUiHints;
  value: unknown;
}): string[] {
  const { key, schema, uiHints, value } = params;

  if (schema && schemaType(schema) === "object" && schema.properties) {
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

  if (isPlainObject(value)) {
    return Object.keys(value).sort((a, b) => a.localeCompare(b)).slice(0, 4);
  }

  return [];
}

function countConfiguredLeaves(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "string") {
    return value.trim() ? 1 : 0;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return 1;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 0;
    }
    return value.reduce((total, entry) => total + countConfiguredLeaves(entry), 0);
  }
  if (isPlainObject(value)) {
    const entries = Object.values(value);
    if (entries.length === 0) {
      return 0;
    }
    return entries.reduce((total, entry) => total + countConfiguredLeaves(entry), 0);
  }
  return 0;
}

function resolveStructureLabel(schema: JsonSchema | undefined): string | null {
  if (!schema) {
    return null;
  }

  const type = schemaType(schema);
  if (type === "object") {
    const propertyCount = Object.keys(schema.properties ?? {}).length;
    if (propertyCount > 0) {
      return `${propertyCount} direct field${propertyCount === 1 ? "" : "s"}`;
    }
    if (schema.additionalProperties) {
      return "Dynamic keys";
    }
    return "Object section";
  }

  if (type === "array") {
    return "List section";
  }

  if (!type) {
    return null;
  }

  return `${humanize(type)} section`;
}

function resolveValueStatus(value: unknown): { label: string; tone: "pill--ok" | "" } {
  if (value == null) {
    return { label: "No current values", tone: "" };
  }

  if (typeof value === "string") {
    return value.trim()
      ? { label: "Value present in config", tone: "pill--ok" }
      : { label: "No current values", tone: "" };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { label: "Value present in config", tone: "pill--ok" };
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? { label: `${value.length} item${value.length === 1 ? "" : "s"} in config`, tone: "pill--ok" }
      : { label: "No current values", tone: "" };
  }

  if (isPlainObject(value)) {
    const entryCount = Object.keys(value).length;
    const leafCount = countConfiguredLeaves(value);
    if (entryCount === 0 || leafCount === 0) {
      return { label: "No current values", tone: "" };
    }
    if (entryCount === leafCount) {
      return {
        label: `${leafCount} configured field${leafCount === 1 ? "" : "s"}`,
        tone: "pill--ok",
      };
    }
    return {
      label: `${entryCount} entries · ${leafCount} values set`,
      tone: "pill--ok",
    };
  }

  return { label: "Value present in config", tone: "pill--ok" };
}

function buildSectionSummaries(params: {
  sectionKeys: string[];
  schema: JsonSchema | null;
  uiHints: ConfigUiHints;
  formValue: Record<string, unknown> | null;
}): CuratedSectionSummary[] {
  const { sectionKeys, schema, uiHints, formValue } = params;
  if (!schema || schemaType(schema) !== "object") {
    return [];
  }

  const properties = schema.properties ?? {};
  const available: CuratedSectionSummary[] = [];

  for (const key of sectionKeys) {
    const sectionSchema = properties[key];
    if (!sectionSchema) {
      continue;
    }

    const meta = resolveSectionMeta(key, sectionSchema);
    const valueStatus = resolveValueStatus(formValue?.[key]);
    available.push({
      key,
      label: meta.label,
      description: meta.description,
      previewItems: resolvePreviewItems({
        key,
        schema: sectionSchema,
        uiHints,
        value: formValue?.[key],
      }),
      structureLabel: resolveStructureLabel(sectionSchema),
      valueLabel: valueStatus.label,
      valueTone: valueStatus.tone,
    });
  }

  return available;
}

function renderStatusPill(label: string, className = "") {
  return html`<span class=${["pill", "pill--sm", className].filter(Boolean).join(" ")}>${label}</span>`;
}

export function renderCuratedConfigPage(props: CuratedConfigPageProps) {
  const definition = CURATED_PAGE_DEFINITIONS[props.page];
  const analysis = analyzeConfigSchema(props.schema);
  const available = buildSectionSummaries({
    sectionKeys: definition.sections,
    schema: analysis.schema,
    uiHints: props.uiHints,
    formValue: props.formValue,
  });
  const hasConfig = Boolean(props.formValue);
  const showLoader = props.schemaLoading || (props.loading && !hasConfig);
  const canSave = props.connected && props.dirty && !props.loading && !props.saving && hasConfig;
  const canApply = props.connected && props.dirty && !props.loading && !props.applying && hasConfig;
  const rootPreview = available.slice(0, 6);
  const extraRootCount = Math.max(0, available.length - rootPreview.length);

  return html`
    <section class="settings-hub">
      <div class="settings-hub__hero card">
        <div class="settings-hub__hero-copy">
          <h2 class="settings-hub__title">${definition.label}</h2>
          ${
            definition.description
              ? html`<p class="settings-hub__description">${definition.description}</p>`
              : nothing
          }
          ${
            rootPreview.length > 0
              ? html`
                  <div class="settings-hub__focus-list">
                    ${rootPreview.map(
                      (section) => html`<span class="settings-hub__focus-pill">${section.key}</span>`,
                    )}
                    ${
                      extraRootCount > 0
                        ? html`
                            <span class="settings-hub__focus-pill">+${extraRootCount} more</span>
                          `
                        : nothing
                    }
                  </div>
                `
              : nothing
          }
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
          ${props.dirty ? renderStatusPill("Unsaved changes", "pill--danger") : nothing}
          ${props.loading && hasConfig ? renderStatusPill("Refreshing values") : nothing}
          ${props.saving ? renderStatusPill("Saving", "pill--ok") : nothing}
          ${props.applying ? renderStatusPill("Applying", "pill--ok") : nothing}
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
        showLoader
          ? renderLoadingState({
              label: `Loading ${definition.label}`,
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
              No schema-backed roots for this page are present in the current gateway schema. Open Full
              Config to inspect the full root set.
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
                      <div class="settings-hub__summary-meta">
                        ${
                          section.structureLabel
                            ? html`<span class="settings-hub__summary-chip">${section.structureLabel}</span>`
                            : nothing
                        }
                        ${renderStatusPill(section.valueLabel, section.valueTone)}
                      </div>
                      ${
                        section.description
                          ? html`<p class="settings-hub__summary-description">${section.description}</p>`
                          : nothing
                      }
                      ${
                        section.previewItems.length > 0
                          ? html`
                              <div class="settings-hub__summary-subsections">
                                ${section.previewItems.map(
                                  (item) => html`<span class="settings-hub__summary-chip">${item}</span>`,
                                )}
                              </div>
                            `
                          : nothing
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
