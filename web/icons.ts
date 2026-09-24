// Biểu tượng nét vẽ (SVG) dựng bằng createElementNS — repo cấm innerHTML. Màu theo `currentColor`.
const NS = "http://www.w3.org/2000/svg";
type Shape = readonly [tag: string, attrs: Record<string, string | number>];

const SHAPES = {
  home: [["path", { d: "M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" }]],
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
  // 4 hình mới cho thanh điều hướng dọc (ADR-0015, Đợt D Task 4) — copy ĐÚNG path/circle/rect từ mockup
  // docs/design/mockup-by-ClaudeDesign/00 Trang chu v2.dc.html (dòng ~65, ~82, ~86, ~98), theo đúng khuôn 24×24 đã có.
  "contact-card": [
    ["rect", { x: 3, y: 5, width: 18, height: 14, rx: 2 }],
    ["circle", { cx: 9, cy: 11, r: 2.2 }],
    ["path", { d: "M5.8 16.2c.5-1.4 1.7-2.1 3.2-2.1s2.7.7 3.2 2.1M15.5 10h3.2M15.5 13.5h3.2" }],
  ],
  pin: [
    ["path", { d: "M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z" }],
    ["circle", { cx: 12, cy: 10, r: 2.4 }],
  ],
  history: [
    ["path", { d: "M3.5 12a8.5 8.5 0 1 0 2.6-6.1" }],
    ["path", { d: "M3.2 4.4v3.9h3.9" }],
    ["path", { d: "M12 8.2V12l2.8 1.8" }],
  ],
  chat: [
    ["path", { d: "M4.5 5.5h15v10.5H9.5l-5 4V5.5z" }],
    ["path", { d: "M8.5 9.5h7M8.5 12.5h4.5" }],
  ],
  // Nút đăng nhập sinh trắc học ở trang Đăng nhập — copy ĐÚNG path từ bản thiết kế "Đăng nhập.dc.html" (Claude Design, 2026-09-24, chủ dự án yêu cầu tuân thủ 100%).
  face: [
    ["path", { d: "M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" }],
    ["path", { d: "M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" }],
    ["path", { d: "M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16" }],
    ["path", { d: "M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" }],
    ["path", { d: "M8.5 9v1.5" }],
    ["path", { d: "M15.5 9v1.5" }],
    ["path", { d: "M12 9v4h-1" }],
    ["path", { d: "M9 16c1.7 1.3 4.3 1.3 6 0" }],
  ],
  // Mục "Trợ giúp" của thanh điều hướng dọc: vòng tròn + dấu hỏi.
  help: [
    ["circle", { cx: 12, cy: 12, r: 8.5 }],
    ["path", { d: "M9.6 9.6a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.6" }],
    ["path", { d: "M12 17v.01" }],
  ],
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
