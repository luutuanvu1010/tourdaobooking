// Biểu tượng nét vẽ (SVG) dựng bằng createElementNS — repo cấm innerHTML. Màu theo `currentColor`.
const NS = "http://www.w3.org/2000/svg";
type Shape = readonly [tag: string, attrs: Record<string, string | number>];

const SHAPES = {
  orders: [["rect", { x: 5, y: 4, width: 14, height: 17, rx: 2 }], ["path", { d: "M9 9h6M9 13h6M9 17h3" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  me: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 21c0-4 3.5-6 8-6s8 2 8 6" }]],
  services: [["path", { d: "M3 12V4h8l10 10-8 8L3 12z" }], ["circle", { cx: 7.5, cy: 8.5, r: 1.2 }]],
  staff: [
    ["circle", { cx: 9, cy: 8, r: 3.5 }],
    ["path", { d: "M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" }],
    ["circle", { cx: 17, cy: 9, r: 2.5 }],
    ["path", { d: "M17.5 14.5c2.5.3 4 2 4 4.5" }],
  ],
  back: [["path", { d: "M15 5l-7 7 7 7" }]],
  next: [["path", { d: "M9 5l7 7-7 7" }]],
  lock: [["rect", { x: 5, y: 11, width: 14, height: 9, rx: 2 }], ["path", { d: "M8 11V8a4 4 0 0 1 8 0v3" }]],
  alert: [["path", { d: "M12 4l9 16H3L12 4z" }], ["path", { d: "M12 10v4M12 17v.01" }]],
  close: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof SHAPES;

export function icon(name: IconName, size = 24): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  const bold = name === "plus" || name === "back";
  const attrs = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": bold ? 2.2 : 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  for (const [tag, shape] of SHAPES[name]) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(shape)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
