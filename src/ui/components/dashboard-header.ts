import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { titleForTab, type Tab } from "../navigation.ts";

@customElement("dashboard-header")
export class DashboardHeader extends LitElement {
  @property({ type: String }) tab: Tab = "overview";

  createRenderRoot() {
    return this;
  }

  private handleOverviewClick(event: Event) {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent("dashboard-navigate", {
        detail: { tab: "overview" as Tab },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const label = titleForTab(this.tab);
    return html`
      <div class="dashboard-header">
        <div class="dashboard-header__breadcrumb">
          <a
            class="dashboard-header__breadcrumb-link"
            href="/overview"
            @click=${this.handleOverviewClick}
            >OpenClaw</a
          >
          <span class="dashboard-header__breadcrumb-sep">›</span>
          <span class="dashboard-header__breadcrumb-current">${label}</span>
        </div>
        <div class="dashboard-header__actions">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dashboard-header": DashboardHeader;
  }
}
