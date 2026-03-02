export const CHART_NEON = {
  bg: "rgba(16, 19, 24, 0.98)",
  surface: "rgba(19, 23, 30, 0.98)",
  border: "rgba(66, 76, 88, 0.62)",
  text: "#d6ece6",
  muted: "#819ca0",
  grid: "rgba(58, 70, 78, 0.52)",
  axis: "rgba(107, 124, 130, 0.7)",
  pointer: "rgba(132, 239, 222, 0.45)",
  glowA: "#31e6d3",
  glowB: "#4ee98f",
  glowC: "#f1cf67",
  ok: "#4ee98f",
  warn: "#f1cf67",
  danger: "#ff6c6c",
  donut: ["#31e6d3", "#4ee98f", "#f1cf67", "#d26bf5", "#6d92ff"],
} as const;

export function chartTextShadow(color: string): string {
  return `0 0 10px ${color}`;
}
