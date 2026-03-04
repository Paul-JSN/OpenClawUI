import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";

@customElement("oc-echart")
export class OpenClawEchartHost extends LitElement {
  @property({ attribute: false }) option: EChartsOption | null = null;
  @property({ type: Boolean }) autoresize = true;

  @query(".oc-echart__canvas") private canvasEl?: HTMLDivElement;

  private chart: ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private observerResizeRaf: number | null = null;
  private transitionResizeRaf: number | null = null;
  private transitionResizeTimeout: number | null = null;
  private optionApplyTimer: number | null = null;
  private pendingOption: EChartsOption | null = null;
  private lastOptionSignature: string | null = null;
  private readonly onLayoutTransition = () => {
    this.runTransitionResize(520);
  };

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.ensureChart();
    this.queueApplyOption();
    this.attachResizeObserver();
    window.addEventListener("openclaw-layout-transition", this.onLayoutTransition);
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("option")) {
      this.queueApplyOption();
    }
  }

  disconnectedCallback() {
    this.detachResizeObserver();
    window.removeEventListener("openclaw-layout-transition", this.onLayoutTransition);
    if (this.observerResizeRaf !== null) {
      cancelAnimationFrame(this.observerResizeRaf);
      this.observerResizeRaf = null;
    }
    if (this.transitionResizeRaf !== null) {
      cancelAnimationFrame(this.transitionResizeRaf);
      this.transitionResizeRaf = null;
    }
    if (this.transitionResizeTimeout !== null) {
      clearTimeout(this.transitionResizeTimeout);
      this.transitionResizeTimeout = null;
    }
    if (this.optionApplyTimer !== null) {
      clearTimeout(this.optionApplyTimer);
      this.optionApplyTimer = null;
    }
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    this.lastOptionSignature = null;
    super.disconnectedCallback();
  }

  private ensureChart() {
    if (this.chart || !this.canvasEl) {
      return;
    }
    this.chart = echarts.init(this.canvasEl, undefined, {
      renderer: "canvas",
      // Dirty-rect can leave transient ghost lines on large range downshifts (e.g. 30d -> 1d).
      // Full repaint is safer for dashboard charts and removes hover-only cleanup artifacts.
      useDirtyRect: false,
    });
  }

  private queueApplyOption() {
    this.pendingOption = this.option;
    if (this.optionApplyTimer !== null) {
      return;
    }
    this.optionApplyTimer = window.setTimeout(() => {
      this.optionApplyTimer = null;
      this.applyOptionNow(this.pendingOption);
    }, 70);
  }

  private buildOptionSignature(option: EChartsOption): string {
    try {
      return JSON.stringify(option, (_, value) =>
        typeof value === "function" ? "__fn__" : value,
      );
    } catch {
      // Fallback when stringify fails (rare circular refs): force apply.
      return `${Date.now()}-${Math.random()}`;
    }
  }

  private applyOptionNow(option: EChartsOption | null) {
    this.ensureChart();
    if (!this.chart || !option) {
      return;
    }

    const optionSignature = this.buildOptionSignature(option);
    if (optionSignature === this.lastOptionSignature) {
      return;
    }

    const normalizedOption = { ...option } as EChartsOption;
    if (normalizedOption.animation === undefined) {
      normalizedOption.animation = true;
    }
    if (normalizedOption.animationDuration === undefined) {
      normalizedOption.animationDuration = 260;
    }
    if (normalizedOption.animationDurationUpdate === undefined) {
      normalizedOption.animationDurationUpdate = 360;
    }
    if (normalizedOption.animationEasing === undefined) {
      normalizedOption.animationEasing = "quarticOut";
    }
    if (normalizedOption.animationEasingUpdate === undefined) {
      normalizedOption.animationEasingUpdate = "cubicOut";
    }

    this.chart.setOption(normalizedOption, {
      notMerge: false,
      lazyUpdate: true,
      silent: true,
    });
    this.lastOptionSignature = optionSignature;
  }

  private attachResizeObserver() {
    if (!this.autoresize || !this.canvasEl || this.resizeObserver) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      if (this.observerResizeRaf !== null) {
        return;
      }
      this.observerResizeRaf = requestAnimationFrame(() => {
        this.observerResizeRaf = null;
        this.chart?.resize({
          animation: {
            duration: 120,
          },
        });
      });
    });
    this.resizeObserver.observe(this.canvasEl);
  }

  private runTransitionResize(durationMs: number) {
    if (!this.chart) {
      return;
    }
    if (this.transitionResizeRaf !== null) {
      cancelAnimationFrame(this.transitionResizeRaf);
      this.transitionResizeRaf = null;
    }
    if (this.transitionResizeTimeout !== null) {
      clearTimeout(this.transitionResizeTimeout);
      this.transitionResizeTimeout = null;
    }

    // Avoid per-frame resize storms during layout transitions.
    this.chart.resize({
      animation: {
        duration: 90,
      },
    });

    this.transitionResizeRaf = requestAnimationFrame(() => {
      this.transitionResizeRaf = null;
      this.transitionResizeTimeout = window.setTimeout(() => {
        this.chart?.resize({
          animation: {
            duration: 70,
          },
        });
        this.transitionResizeTimeout = null;
      }, Math.max(0, durationMs));
    });
  }

  private detachResizeObserver() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  render() {
    return html`<div class="oc-echart__canvas"></div>`;
  }
}
