import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import { TAB_GROUPS, iconForTab, subtitleForTab, titleForTab, type Tab } from "../navigation.ts";

type CommandPaletteProps = {
  open: boolean;
  query: string;
  activeIndex: number;
  onToggle: () => void;
  onQueryChange: (query: string) => void;
  onActiveIndexChange: (index: number) => void;
  onNavigate: (tab: Tab) => void;
  onSlashCommand: (command: string) => void;
};

type PaletteItem =
  | {
      kind: "tab";
      category: string;
      label: string;
      description: string;
      tab: Tab;
    }
  | {
      kind: "command";
      category: string;
      label: string;
      description: string;
      command: string;
    };

const SLASH_ITEMS = [
  {
    command: "/new",
    label: "/new",
    description: "Start a fresh chat session",
  },
  {
    command: "/reset",
    label: "/reset",
    description: "Reset the current chat context",
  },
] as const;

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

export function renderCommandPalette(props: CommandPaletteProps) {
  if (!props.open) {
    return nothing;
  }

  const query = props.query.trim();
  const navItems: PaletteItem[] = TAB_GROUPS.flatMap((group) =>
    group.tabs.map((tab) => ({
      kind: "tab" as const,
      category: group.label,
      label: titleForTab(tab),
      description: subtitleForTab(tab),
      tab,
    })),
  ).filter((item) => {
    if (!query) {
      return true;
    }
    return (
      matchesQuery(item.label, query) ||
      matchesQuery(item.description, query) ||
      matchesQuery(item.category, query)
    );
  });
  const slashItems: PaletteItem[] = SLASH_ITEMS.filter((item) => {
    if (!query) {
      return true;
    }
    return (
      matchesQuery(item.command, query) ||
      matchesQuery(item.description, query) ||
      matchesQuery(item.label, query)
    );
  }).map((item) => ({
    kind: "command",
    category: "actions",
    label: item.label,
    description: item.description,
    command: item.command,
  }));

  const items = [...navItems, ...slashItems];
  const safeIndex = items.length === 0 ? 0 : Math.min(props.activeIndex, items.length - 1);
  const select = (item: PaletteItem) => {
    props.onToggle();
    props.onQueryChange("");
    props.onActiveIndexChange(0);
    if (item.kind === "tab") {
      props.onNavigate(item.tab);
      return;
    }
    props.onSlashCommand(item.command);
  };

  return html`
    <div
      class="cmd-palette__backdrop"
      @click=${() => {
        props.onToggle();
        props.onQueryChange("");
        props.onActiveIndexChange(0);
      }}
    ></div>
    <div class="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="cmd-palette__panel">
        <div class="cmd-palette__input-wrap">
          <span class="cmd-palette__icon" aria-hidden="true">${icons.search}</span>
          <input
            ${ref((node) => {
              if (node instanceof HTMLInputElement && document.activeElement !== node) {
                queueMicrotask(() => {
                  node.focus();
                  node.select();
                });
              }
            })}
            class="cmd-palette__input"
            type="text"
            placeholder=${t("overview.palette.placeholder")}
            .value=${props.query}
            @input=${(event: Event) => {
              props.onQueryChange((event.target as HTMLInputElement).value);
              props.onActiveIndexChange(0);
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === "Escape") {
                event.preventDefault();
                props.onToggle();
                props.onQueryChange("");
                props.onActiveIndexChange(0);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                props.onActiveIndexChange(Math.min(safeIndex + 1, Math.max(items.length - 1, 0)));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                props.onActiveIndexChange(Math.max(safeIndex - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const selected = items[safeIndex];
                if (selected) {
                  select(selected);
                }
              }
            }}
          />
          <kbd class="cmd-palette__kbd">Ctrl K</kbd>
        </div>
        <div class="cmd-palette__list">
          ${items.length === 0
            ? html`
                <div class="cmd-palette__empty">${t("overview.palette.empty")}</div>
              `
            : items.map((item, index) => {
                const active = index === safeIndex;
                const iconTemplate =
                  item.kind === "tab"
                    ? icons[iconForTab(item.tab)]
                    : item.command === "/new"
                      ? icons.messageSquare
                      : icons.loader;
                return html`
                  <button
                    type="button"
                    class="cmd-palette__item ${active ? "is-active" : ""}"
                    @mouseenter=${() => props.onActiveIndexChange(index)}
                    @click=${() => select(item)}
                  >
                    <span class="cmd-palette__item-icon" aria-hidden="true">${iconTemplate}</span>
                    <span class="cmd-palette__item-body">
                      <span class="cmd-palette__item-label">${item.label}</span>
                      <span class="cmd-palette__item-desc">${item.description}</span>
                    </span>
                    <span class="cmd-palette__item-badge">${item.category}</span>
                  </button>
                `;
              })}
        </div>
      </div>
    </div>
  `;
}
