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
  private readonly onLayoutTransition = () => {
    this.runTransitionResize(520);
  };

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.ensureChart();
    this.applyOption();
    this.attachResizeObserver();
    window.addEventListener("openclaw-layout-transition", this.onLayoutTransition);
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("option")) {
      this.applyOption();
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
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    super.disconnectedCallback();
  }

  private ensureChart() {
    if (this.chart || !this.canvasEl) {
      return;
    }
    this.chart = echarts.init(this.canvasEl, undefined, {
      renderer: "canvas",
      useDirtyRect: true,
    });
  }

  private applyOption() {
    this.ensureChart();
    if (!this.chart || !this.option) {
      return;
    }
    this.chart.setOption(this.option, {
      notMerge: false,
      lazyUpdate: true,
      replaceMerge: ["series"],
      silent: true,
    });
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
