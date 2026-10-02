// Giao diện công ty (ADR-0087): luật THUẦN dùng chung máy chủ (module giao-dien) ↔ màn chỉnh (web/giao-dien.ts). Không I/O.
// Một "núm" = một token CSS ở :root của public/app.css; giá trị lưu là tập GHI ĐÈ (chỉ núm đã đổi). Token dẫn xuất trỏ var(núm gốc) trong app.css
// nên tự đi theo (ví dụ --c-selected-text: var(--c-primary)). MAC_DINH phải khớp app.css — bài src/giao-dien-mac-dinh.test.ts canh.

export type LoaiNum = "mau" | "phong" | "co" | "dam";
export interface Num { khoa: string; nhan: string; nhom: "nen-chu" | "thanh" | "nut" | "chu"; loai: LoaiNum; token: string; min?: number; max?: number }
export interface LoiGiaoDien { khoa: string | null; message: string }

const DU_PHONG = `system-ui, -apple-system, "Segoe UI", "Segoe UI Symbol", Roboto, "Noto Sans", sans-serif`;
export const PHONG: Readonly<Record<string, { ten: string; stack: string; dam: readonly number[] }>> = {
  "be-vietnam-pro": { ten: "Be Vietnam Pro", stack: `"Be Vietnam Pro", ${DU_PHONG}`, dam: [400, 500, 600, 700, 800] },
  nunito: { ten: "Nunito", stack: `"Nunito", ${DU_PHONG}`, dam: [400, 500, 600, 700] },
  lexend: { ten: "Lexend", stack: `"Lexend", ${DU_PHONG}`, dam: [400, 500, 600, 700] },
  "noto-sans": { ten: "Noto Sans", stack: `"Noto Sans", ${DU_PHONG}`, dam: [400, 500, 600, 700] },
};

export const NUM: readonly Num[] = [
  { khoa: "nen-trang", nhan: "Nền trang", nhom: "nen-chu", loai: "mau", token: "--c-surface-alt" },
  { khoa: "nen-the", nhan: "Nền thẻ", nhom: "nen-chu", loai: "mau", token: "--c-surface" },
  { khoa: "chu-chinh", nhan: "Chữ chính", nhom: "nen-chu", loai: "mau", token: "--c-text" },
  { khoa: "chu-phu", nhan: "Chữ phụ", nhom: "nen-chu", loai: "mau", token: "--c-text-muted" },
  { khoa: "vien", nhan: "Viền", nhom: "nen-chu", loai: "mau", token: "--c-border" },
  { khoa: "mau-chinh", nhan: "Màu chính (tiêu đề, liên kết, chữ nhấn)", nhom: "nen-chu", loai: "mau", token: "--c-primary" },
  { khoa: "mau-chinh-nhat", nhan: "Màu chính nhạt (nền mục đang chọn, nút chính)", nhom: "nen-chu", loai: "mau", token: "--c-primary-soft" },
  { khoa: "nen-thanh-tren", nhan: "Nền thanh trên", nhom: "thanh", loai: "mau", token: "--c-bar-bg" },
  { khoa: "chu-thanh-tren", nhan: "Chữ thanh trên", nhom: "thanh", loai: "mau", token: "--c-on-bar" },
  { khoa: "nen-thanh-ben", nhan: "Nền thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-bg" },
  { khoa: "chu-thanh-ben", nhan: "Chữ thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-item" },
  { khoa: "nen-muc-chon", nhan: "Nền mục đang chọn ở thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-active" },
  { khoa: "chu-muc-chon", nhan: "Chữ mục đang chọn ở thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-text-on" },
  { khoa: "nen-nut-chinh", nhan: "Nền nút chính", nhom: "nut", loai: "mau", token: "--c-btn-primary-bg" },
  { khoa: "chu-nut-chinh", nhan: "Chữ nút chính", nhom: "nut", loai: "mau", token: "--c-btn-primary-text" },
  { khoa: "nen-nut-chot", nhan: "Nền nút hành động chốt (Tạo đơn, Xác nhận)", nhom: "nut", loai: "mau", token: "--c-accent" },
  { khoa: "phong-tieu-de", nhan: "Phông tiêu đề", nhom: "chu", loai: "phong", token: "--font-display" },
  { khoa: "phong-noi-dung", nhan: "Phông nội dung", nhom: "chu", loai: "phong", token: "--font" },
  { khoa: "co-tieu-de-trang", nhan: "Cỡ tiêu đề trang", nhom: "chu", loai: "co", token: "--fs-h1", min: 20, max: 32 },
  { khoa: "co-tieu-de-muc", nhan: "Cỡ tiêu đề mục", nhom: "chu", loai: "co", token: "--fs-h2", min: 16, max: 24 },
  { khoa: "co-noi-dung", nhan: "Cỡ chữ nội dung", nhom: "chu", loai: "co", token: "--fs-step-5", min: 14, max: 18 },
  { khoa: "co-nhan", nhan: "Cỡ nhãn, chữ phụ", nhom: "chu", loai: "co", token: "--fs-label", min: 12, max: 16 },
  { khoa: "dam-tieu-de", nhan: "Độ đậm tiêu đề", nhom: "chu", loai: "dam", token: "--fw-heading", min: 400, max: 700 },
  { khoa: "dam-noi-dung", nhan: "Độ đậm chữ nội dung", nhom: "chu", loai: "dam", token: "--fw-regular", min: 400, max: 500 },
  { khoa: "dam-nhan", nhan: "Độ đậm chữ nhấn (nút, tên, số tiền)", nhom: "chu", loai: "dam", token: "--fw-semibold", min: 400, max: 700 },
];
/** Núm "dam-nhan" kéo cả ba mức nhấn (đặc tả §2). */
export const KEO_THEO: Readonly<Record<string, readonly string[]>> = { "dam-nhan": ["--fw-bold", "--fw-heavy"], "nen-nut-chinh": ["--c-btn-primary-border", "--c-btn-primary-hover-bg"] };

/**
 * Núm con -> núm cha: token của núm con trong app.css :root là `var(token của núm cha)`, nên đổi cha thì con đi theo (CSS tự thừa kế).
 * Kiểm tương phản phải đi theo cùng quan hệ này, nếu không sẽ chấm con bằng màu mặc định cũ. Bài src/giao-dien-mac-dinh.test.ts canh bảng này khớp app.css.
 */
export const CHA: Readonly<Record<string, string>> = {
  "nen-thanh-tren": "nen-the", "chu-thanh-tren": "mau-chinh",
  "nen-thanh-ben": "nen-the", "chu-thanh-ben": "chu-phu",
  "nen-muc-chon": "mau-chinh-nhat", "chu-muc-chon": "mau-chinh",
  "nen-nut-chinh": "mau-chinh-nhat", "chu-nut-chinh": "mau-chinh",
};

/** Giá trị mặc định = app.css bản 1.65 (bài src/giao-dien-mac-dinh.test.ts so khớp). */
export const MAC_DINH: Readonly<Record<string, string>> = {
  "nen-trang": "#eaf2f8", "nen-the": "#ffffff", "chu-chinh": "#0f172a", "chu-phu": "#475569", vien: "#d3e1ec",
  "mau-chinh": "#0c4a6e", "mau-chinh-nhat": "#dcebf6",
  "nen-thanh-tren": "#ffffff", "chu-thanh-tren": "#0c4a6e", "nen-thanh-ben": "#ffffff", "chu-thanh-ben": "#475569",
  "nen-muc-chon": "#dcebf6", "chu-muc-chon": "#0c4a6e",
  "nen-nut-chinh": "#dcebf6", "chu-nut-chinh": "#0c4a6e", "nen-nut-chot": "#c0392b",
  "phong-tieu-de": "be-vietnam-pro", "phong-noi-dung": "be-vietnam-pro",
  // --fs-h1 = 1.5rem = 24px; --fs-h2 = 1.1rem = 17,6px (làm tròn 18 — mặc định KHÔNG ghi đè nên trang vẫn 17,6px; chỉ khi Toàn quyền chọn mới thành số nguyên);
  // --fs-step-5 = 16px; --fs-label → --fs-step-3 = 14px (đo 2026-10-02 trên nhánh thanh-sang-chu-manh).
  "co-tieu-de-trang": "24", "co-tieu-de-muc": "18", "co-noi-dung": "16", "co-nhan": "14",
  "dam-tieu-de": "500", "dam-noi-dung": "400", "dam-nhan": "500",
};

/** Cặp [chữ, nền] phải ≥ 4,5:1 — theo khoá núm, hoặc hex cố định (chữ trắng trên nút chốt). */
export const CAP_TUONG_PHAN: readonly [string, string, string][] = [
  ["chu-chinh", "nen-trang", "Chữ chính trên nền trang"],
  ["chu-chinh", "nen-the", "Chữ chính trên nền thẻ"],
  ["chu-phu", "nen-the", "Chữ phụ trên nền thẻ"],
  ["chu-phu", "nen-trang", "Chữ phụ trên nền trang"],
  ["mau-chinh", "nen-the", "Màu chính (liên kết) trên nền thẻ"],
  ["mau-chinh", "mau-chinh-nhat", "Màu chính trên màu chính nhạt (mục đang chọn, dải tóm tắt)"],
  ["chu-thanh-tren", "nen-thanh-tren", "Chữ trên thanh trên"],
  ["chu-thanh-ben", "nen-thanh-ben", "Chữ trên thanh bên"],
  ["chu-phu", "nen-thanh-ben", "Tiêu đề nhóm trên thanh bên"],
  ["chu-muc-chon", "nen-muc-chon", "Chữ mục đang chọn ở thanh bên"],
  ["chu-nut-chinh", "nen-nut-chinh", "Chữ nút chính"],
  ["#ffffff", "nen-nut-chot", "Chữ trắng trên nút hành động chốt"],
  ["chu-chinh", "#ffffff", "Chữ chính trong ô nhập (nền trắng cố định)"],
  ["#ffffff", "mau-chinh", "Chữ trắng trên màu chính (huy hiệu)"],
];

const HEX = /^#[0-9a-f]{6}$/;
const SO = /^\d{1,3}$/;
const doSang = (h: string): number => {
  const k = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k[0]! + 0.7152 * k[1]! + 0.0722 * k[2]!;
};
/** Tỉ lệ tương phản WCAG 2.x giữa hai màu `#rrggbb` (không phân biệt thứ tự). */
export function tuongPhan(a: string, b: string): number {
  const [x, y] = [doSang(a), doSang(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
const soVN = (r: number): string => r.toFixed(2).replace(".", ",");
const NUM_THEO_KHOA = new Map(NUM.map((n) => [n.khoa, n] as const));

/** Lỗi của MỘT giá trị (null = hợp lệ). Không xét chéo ô. */
function loiMotO(n: Num, v: unknown): string | null {
  if (typeof v !== "string") return `${n.nhan}: giá trị không hợp lệ.`;
  if (n.loai === "mau") return HEX.test(v) ? null : `${n.nhan}: chọn một màu trong bảng màu.`;
  if (n.loai === "phong") return Object.hasOwn(PHONG, v) ? null : `${n.nhan}: phông không có trong danh sách.`;
  if (!SO.test(v)) return `${n.nhan}: phải là số nguyên.`;
  const x = Number(v);
  if (x < n.min! || x > n.max!) return `${n.nhan}: phải từ ${n.min} đến ${n.max}${n.loai === "co" ? "px" : ""}.`;
  if (n.loai === "dam" && x % 100 !== 0) return `${n.nhan}: chỉ chọn 400, 500, 600 hoặc 700.`;
  return null;
}

/** Giá trị HIỆU LỰC của một núm: tự đặt, nếu không thì theo núm cha (CHA), nếu không thì mặc định. */
export function giaTriHieuLuc(tokens: Readonly<Record<string, string>>, khoa: string): string {
  return tokens[khoa] ?? (CHA[khoa] !== undefined ? giaTriHieuLuc(tokens, CHA[khoa]!) : MAC_DINH[khoa]!);
}
/** Giá trị núm SẼ có nếu bỏ ghi đè riêng của nó (núm con: theo cha; núm gốc: mặc định) — để so trước khi xoá ghi đè. */
export function giaTriKhiBoGhiDe(tokens: Readonly<Record<string, string>>, khoa: string): string {
  return CHA[khoa] !== undefined ? giaTriHieuLuc(tokens, CHA[khoa]!) : MAC_DINH[khoa]!;
}

/** Kiểm tập ghi đè; mảng rỗng = hợp lệ. Giá trị chưa đặt lấy MAC_DINH khi xét chéo (tương phản, độ đậm theo phông). */
export function kiemGiaoDien(tokens: unknown): LoiGiaoDien[] {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) return [{ khoa: null, message: "Dữ liệu giao diện không hợp lệ." }];
  const loi: LoiGiaoDien[] = [];
  const t = tokens as Record<string, unknown>;
  for (const [k, v] of Object.entries(t)) {
    const n = NUM_THEO_KHOA.get(k);
    if (!n) { loi.push({ khoa: k, message: "Có một ô không còn được hỗ trợ — tải lại trang." }); continue; }
    const m = loiMotO(n, v);
    if (m) loi.push({ khoa: k, message: m });
  }
  if (loi.length > 0) return loi;
  // Giá trị hiệu lực: tự đặt, nếu không thì theo núm cha (CHA), nếu không thì mặc định.
  const gt = (k: string): string => (k.startsWith("#") ? k : giaTriHieuLuc(t as Record<string, string>, k));
  for (const [chu, nen, ten] of CAP_TUONG_PHAN) {
    const r = tuongPhan(gt(chu), gt(nen));
    // Lỗi luôn gắn vào ô của MỘT NÚM (khoá hex cố định không có dòng nào trên màn → nút Áp dụng khoá mà không có câu báo).
    const khoaLoi = chu.startsWith("#") ? nen : nen.startsWith("#") ? chu : (t[chu] !== undefined ? chu : nen);
    if (r < 4.5) loi.push({ khoa: khoaLoi, message: `${ten} khó đọc (${soVN(r)}:1, cần ít nhất 4,5:1).` });
  }
  for (const n of NUM.filter((x) => x.loai === "dam")) {
    const phong = gt(n.khoa === "dam-tieu-de" ? "phong-tieu-de" : "phong-noi-dung");
    const dam = Number(gt(n.khoa));
    if (!PHONG[phong]!.dam.includes(dam)) loi.push({ khoa: n.khoa, message: `${n.nhan}: phông ${PHONG[phong]!.ten} không có độ đậm ${dam}.` });
  }
  return loi;
}

/** Cặp [--token, giá trị CSS] CHỈ cho khoá hợp lệ (dùng cho xem trước bằng style.setProperty và dựng :root). */
export function bienCss(tokens: Readonly<Record<string, string>>): [string, string][] {
  const ra: [string, string][] = [];
  for (const [k, v] of Object.entries(tokens)) {
    const n = NUM_THEO_KHOA.get(k);
    if (!n || loiMotO(n, v) !== null) continue;
    const css = n.loai === "phong" ? PHONG[v]!.stack : n.loai === "co" ? `${v}px` : v;
    ra.push([n.token, css]);
    for (const keo of KEO_THEO[k] ?? []) ra.push([keo, css]);
  }
  return ra;
}
export const dungCss = (tokens: Readonly<Record<string, string>>): string => `:root{${bienCss(tokens).map(([k, v]) => `${k}:${v};`).join("")}}`;

/** Đọc chuỗi JSON đã lưu ở D1: bỏ khoá lạ / sai dạng, không ném. */
export function docTokensDaLuu(json: string): Record<string, string> {
  let o: unknown;
  try { o = JSON.parse(json); } catch { return {}; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  const ra: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) { const n = NUM_THEO_KHOA.get(k); if (n && loiMotO(n, v) === null) ra[k] = v as string; }
  return ra;
}
