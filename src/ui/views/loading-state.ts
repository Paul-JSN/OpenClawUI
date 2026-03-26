import { html, nothing } from "lit";

export type LoadingStateProps = {
  label: string;
  detail?: string;
  compact?: boolean;
  className?: string;
};

export function renderLoadingState(props: LoadingStateProps) {
  const className = [
    "loading-state",
    props.compact ? "loading-state--compact" : "",
    props.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return html`
    <div class=${className} role="status" aria-live="polite">
      <div class="loading-state__spinner" aria-hidden="true">
        <div class="loading-state__spinner-core"></div>
      </div>
      <div class="loading-state__copy">
        <span class="loading-state__label">${props.label}</span>
        ${props.detail ? html`<span class="loading-state__detail">${props.detail}</span>` : nothing}
      </div>
    </div>
  `;
}
