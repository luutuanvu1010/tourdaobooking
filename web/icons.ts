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
  check: [["path", { d: "M5 12l5 5 9-10" }]], // dấu ✓ của hàng đang chọn trong bảng chọn người phụ trách (form lập đơn — Task 1.8 phần b), đúng nét bản thiết kế
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
  // ADR-0087: màn Giao diện công ty.
  palette: [["path", { d: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z" }], ["circle", { cx: 7.5, cy: 10.5, r: 1.2 }], ["circle", { cx: 10.5, cy: 7, r: 1.2 }], ["circle", { cx: 15, cy: 7.5, r: 1.2 }]],
  // Đợt E (thẻ đơn rút gọn + biểu tượng Trang chủ): 7 hình mới, cùng khuôn 24×24, cùng phong cách nét mảnh không tô đặc.
  "doc-check": [["rect", { x: 6, y: 3, width: 12, height: 18, rx: 2 }], ["path", { d: "M9 12.6l2 2 4-5.4" }]],
  // "money" (dùng ở ô "Còn thiếu tiền", web/home.ts): vẽ LẠI sau kiểm độc lập Đợt E (2026-09-24, mục D của phiếu
  // kiểm) — bản cũ (một hình chữ nhật + một hình tròn giữa) bị đọc thành máy ảnh. Đổi sang HAI tờ tiền chồng lên
  // nhau (mẫu quen thuộc cho "tiền/thu chi", không có hình nào của camera có hai thân chồng nhau kiểu này), tờ trên
  // có một vòng tròn nhỏ giữa (con dấu/mệnh giá) — vẫn chỉ rect/circle, không tô đặc, cùng stroke-width dùng chung.
  money: [
    ["rect", { x: 2, y: 9, width: 15, height: 9, rx: 1.5 }],
    ["rect", { x: 7, y: 6, width: 15, height: 9, rx: 1.5 }],
    ["circle", { cx: 14.5, cy: 10.5, r: 2 }],
  ],
  assign: [
    ["circle", { cx: 9, cy: 8, r: 3.2 }],
    ["path", { d: "M3 20c0-3.6 2.8-5.6 6-5.6s6 2 6 5.6" }],
    ["circle", { cx: 18, cy: 7, r: 3.4 }],
    ["path", { d: "M18 5.4v3.2M16.4 7h3.2" }],
  ],
  clock: [["circle", { cx: 12, cy: 12.5, r: 8.5 }], ["path", { d: "M12 7.5v5l3.5 2" }]],
  chart: [["path", { d: "M4 20V13" }], ["path", { d: "M9.5 20V6" }], ["path", { d: "M15 20V15.5" }], ["path", { d: "M20 20V10" }]],
  handset: [
    ["path", {
      d: "M5.5 4.5c-1 0-1.8.9-1.6 1.9.6 3.3 2.2 6.3 4.4 8.5s5.2 3.8 8.5 4.4c1 .2 1.9-.6 1.9-1.6v-1.9a1.2 1.2 0 0 0-.9-1.2l-3-.8a1.2 1.2 0 0 0-1.2.3l-1 1.1a10.7 10.7 0 0 1-4.6-4.6l1.1-1a1.2 1.2 0 0 0 .3-1.2l-.8-3a1.2 1.2 0 0 0-1.2-.9H5.5z",
    }],
  ],
  guests: [["circle", { cx: 12, cy: 8, r: 3.6 }], ["path", { d: "M4.5 20c0-4 3-6 7.5-6s7.5 2 7.5 6" }]],
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
  // Mục "Hướng dẫn" của thanh điều hướng dọc: vòng tròn + dấu hỏi.
  help: [
    ["circle", { cx: 12, cy: 12, r: 8.5 }],
    ["path", { d: "M9.6 9.6a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.6" }],
    ["path", { d: "M12 17v.01" }],
  ],
  // Thông báo hệ thống (ADR-0034, Task 7) — path chép ĐÚNG từ bản mẫu docs/design/thong-bao-mockup/ban-mau-thong-bao.html (biến ICON).
  bell: [
    ["path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }],
    ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" }],
  ],
  megaphone: [
    ["path", { d: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" }],
    ["path", { d: "M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" }],
  ],
  // Loại tin "chờ nhận" (mockup: ICON.wait).
  userPlus: [
    ["circle", { cx: 9, cy: 8, r: 4 }],
    ["path", { d: "M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" }],
  ],
  // Loại tin "nhận"/"xác nhận" (mockup: ICON.ok).
  checkCircle: [
    ["circle", { cx: 12, cy: 12, r: 9 }],
    ["path", { d: "m8 12 3 3 5-6" }],
  ],
  // Loại tin "giao" (đổi người phụ trách, mockup: ICON.swap).
  swap: [["path", { d: "M7 7h13l-3-3M17 17H4l3 3" }]],
  // Loại tin "lập" (đơn mới, mockup: ICON.file).
  filePlus: [
    ["path", { d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }],
    ["path", { d: "M14 3v6h6M12 12v6M9 15h6" }],
  ],
  // Loại tin "huỷ" (mockup: ICON.ban).
  ban: [
    ["circle", { cx: 12, cy: 12, r: 9 }],
    ["path", { d: "m6 6 12 12" }],
  ],
  // Vận chuyển lượt 1a (ADR-0040) — path chép ĐÚNG từ bản vẽ docs/design/van-chuyen-1a/ (vo-may-tinh.dc.html biến IC.truck; 04 Giay to cua mot nguoi.dc.html
  // nút "Xem đủ số"; 03 Chi tiet xe.dc.html mũi tên "Lịch sử (N)"). Xe tải là biểu tượng MỚI của bản vẽ (điểm đoán 3), cùng nét 1.8 với cả bộ.
  truck: [["path", { d: "M3 16V6h11v10M14 9h4l3 4v3h-2M3 16h1M10 16h5M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" }]],
  eye: [["path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" }]],
  "chevron-down": [["path", { d: "M6 9l6 6 6-6" }]],
  // Nút đổi cỡ khung Hỗ trợ: hai mũi tên ngược chiều theo đường chéo (↖↘), cùng khuôn 24×24, nét 1.8 như cả bộ.
  resize: [["path", { d: "M10 4H4v6M4 4l6.5 6.5M14 20h6v-6M20 20l-6.5-6.5" }]],
  // Trang chủ điện thoại (bản vẽ "Trang chu dien thoai.dc.html", Claude Design 2026-09-30 — hai hình MỚI của bản vẽ, chép ĐÚNG path, cùng khuôn 24×24 nét 1.8):
  // kính lúp của ô tìm đơn, lưới 4 ô của ô "Tất cả".
  search: [["circle", { cx: 11, cy: 11, r: 6.5 }], ["path", { d: "M16 16l4.5 4.5" }]],
  grid: [
    ["rect", { x: 4, y: 4, width: 6.5, height: 6.5, rx: 1.8 }],
    ["rect", { x: 13.5, y: 4, width: 6.5, height: 6.5, rx: 1.8 }],
    ["rect", { x: 4, y: 13.5, width: 6.5, height: 6.5, rx: 1.8 }],
    ["rect", { x: 13.5, y: 13.5, width: 6.5, height: 6.5, rx: 1.8 }],
  ],
  // Thùng rác của nút "Xoá dịch vụ …" ở đầu thẻ dịch vụ mở (màn Tạo đơn thiết kế lại 18/10/2026) — hình MỚI của bản vẽ docs/design/tao-don-2026-10-18/TaoDonForm.dc.html, chép ĐÚNG path,
  // cùng luật cả bộ: lưới 24, nét 1.8, không tô.
  trash: [["path", { d: "M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" }]],
  // Ba hình của Đợt 0 khung chung (Task 2): cảnh báo trạng thái, dải "Thu gọn"/dấu trừ trên trang, bánh răng của thanh tab Thiết lập. Cùng luật: lưới 24, nét 1.8, không tô.
  alertCircle: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 8v5M12 16v.01" }]],
  minus: [["path", { d: "M5 12h14" }]],
  settings: [
    ["circle", { cx: 12, cy: 12, r: 3 }],
    ["path", { d: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" }],
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof SHAPES;

/** `net`: độ dày nét riêng khi bản vẽ vẽ khác mặc định (vd tam giác cảnh báo 2, biểu tượng trạng thái trống 1.5 — bản vẽ Vận chuyển). Bỏ trống = như cũ. */
export function icon(name: IconName, size = 24, net?: number): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  const bold = name === "plus" || name === "back" || name === "check";
  const attrs = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": net ?? (bold ? 2.2 : 1.8), "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  for (const [tag, shape] of SHAPES[name]) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(shape)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
