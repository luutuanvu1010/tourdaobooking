// ẢNH XÁC NHẬN ĐƠN gửi khách (v1.0, đặc tả "Việc 2"): mô hình nội dung thuần (src/shared/order-confirmation.ts) → BỐ CỤC (danh sách lệnh vẽ, đo bằng canvas) → PNG.
// Dựng hoàn toàn ở trình duyệt (Worker không có canvas/font). Ba bước, tách để đo và kiểm được:
//   1. prepareConfirmation: đọc màu/phông từ token CSS (getComputedStyle, không hex cứng trong mã), CHỜ phông nạp xong (document.fonts.load cho mọi họ × độ đậm, kèm chính
//      chữ của mô hình — app.css chia mỗi họ phông thành tập con latin và tập con tiếng Việt theo unicode-range, không đưa chữ mẫu thì tập tiếng Việt chưa nạp và ₫/dấu bị vẽ bằng phông dự phòng),
//      nạp logo cùng nguồn (canvas không bị "tainted"), rồi ĐO và bố trí (layoutConfirmation) — chỉ đo SAU khi phông đã sẵn sàng.
//   2. paint: đặt kích thước canvas (khổ 720 px CSS × max(2, devicePixelRatio) ≤ 3 → ảnh ≥ 1440 px; giảm độ phân giải khi diện tích vượt giới hạn canvas của iOS Safari) rồi vẽ.
//   3. toBlob("image/png").
// Tiền chỉ nằm ở ô nguyên khối căn phải (cột bảng, dòng tổng kết), KHÔNG qua bộ ngắt dòng: cột rộng đúng số đo của chuỗi tiền dài nhất của MỌI dịch vụ (các thẻ thẳng cột); cột mô tả không đủ chỗ thì bảng chuyển sang
// bố cục hai hàng (mô tả + thành tiền, dưới là "SL × đơn giá"); dòng tổng kết co cỡ chữ nếu quá rộng. Chữ dài không dấu cách bị ngắt cứng (src/shared/text-wrap.ts).
// Lỗi (phông, canvas, mã hoá PNG, thiếu token) ném ConfirmationImageError — hộp thoại (confirmation-dialog.ts) đổi thành thông báo tiếng Việt và cho thử lại.
import type { ConfirmationModel, HeaderBlock, LabelValue, ServiceBlock, SummaryBlock, TitleBlock, CustomerBlock, FooterBlock } from "../src/shared/order-confirmation";
import { wrapLines } from "../src/shared/text-wrap";

export const CONFIRMATION_WIDTH = 720;
export const CONFIRMATION_MARGIN = 40;
const W = CONFIRMATION_WIDTH;
const MG = CONFIRMATION_MARGIN;
const CW = W - 2 * MG;
const STRIPE_H = 8;
const LOGO_URL = "/icons/icon-192.png";
const LOGO_SIZE = 76;
/** Diện tích canvas tối đa (điểm ảnh): 2^24, giới hạn của iOS Safari; vượt thì hạ độ phân giải thay vì để canvas trống. */
const MAX_CANVAS_AREA = 16_777_216;
const FONT_TIMEOUT_MS = 10_000;
const FONT_WEIGHTS = [400, 600, 700, 800];

export type ImageErrorCode = "font" | "theme" | "canvas" | "encode";
export class ConfirmationImageError extends Error {
  constructor(readonly code: ImageErrorCode, message: string) {
    super(message);
  }
}

// ---- token → màu/phông ----------------------------------------------------------------------------------------------------------------------------------------------
const COLOR_TOKENS = {
  // border / surfaceAlt: token RIÊNG của ảnh biên nhận (giữ màu cũ khi Nền tảng đổi nền trang / viền — thị giác 1.69, ADR-0087 điều 7).
  primary: "--c-primary", accent: "--c-accent", accentSoft: "--c-accent-soft", text: "--c-text", muted: "--c-text-muted", border: "--c-receipt-border", surface: "--c-surface", surfaceAlt: "--c-receipt-surface-alt",
  sandSoft: "--c-sand-soft", sandText: "--c-sand-text", greenSoft: "--c-green-soft", greenText: "--c-green-text",
} as const;
export type Theme = Record<keyof typeof COLOR_TOKENS, string> & { fontDisplay: string; fontBody: string };

/** Đọc token từ `:root`. Thiếu token (CSS chưa nạp/đã đổi tên) thì báo lỗi — KHÔNG có màu dự phòng cứng trong mã. */
function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string): string => {
    const v = style.getPropertyValue(name).trim();
    if (v === "") throw new ConfirmationImageError("theme", `Thiếu token ${name}`);
    return v;
  };
  const theme = { fontDisplay: read("--font-display"), fontBody: read("--font") } as Theme;
  for (const [key, token] of Object.entries(COLOR_TOKENS)) theme[key as keyof typeof COLOR_TOKENS] = read(token);
  return theme;
}

/** Màu huy hiệu trạng thái theo token — cùng cặp màu với `.badge-draft/-confirmed/-cancelled` của trang đơn. */
function badgeColors(theme: Theme, status: TitleBlock["status"]["code"]): { bg: string; fg: string } {
  if (status === "confirmed") return { bg: theme.greenSoft, fg: theme.greenText };
  if (status === "cancelled") return { bg: theme.surfaceAlt, fg: theme.muted };
  return { bg: theme.sandSoft, fg: theme.sandText };
}

// ---- lệnh vẽ ----------------------------------------------------------------------------------------------------------------------------------------------------------
type Align = "left" | "right" | "center";
type Radius = number | [number, number, number, number];
export interface RectOp { kind: "rect"; tag?: string; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius?: Radius }
export interface LineOp { kind: "line"; tag?: string; x1: number; y1: number; x2: number; y2: number; color: string }
/** `y` = đường cơ sở của chữ; `width` = bề rộng đã đo; `ascent`/`descent` = số đo của PHÔNG (không phải của riêng chuỗi) — đủ để tính hộp bao. */
export interface TextOp { kind: "text"; tag?: string; text: string; x: number; y: number; font: string; color: string; align: Align; width: number; ascent: number; descent: number }
export interface LogoOp { kind: "logo"; x: number; y: number; size: number; radius: number }
export type Op = RectOp | LineOp | TextOp | LogoOp;
export interface Layout { width: number; height: number; ops: Op[] }

/** Bộ đo chữ: canvas ở trình duyệt (test có thể đưa bộ đo giả). */
export interface Measurer {
  width(text: string, font: string): number;
  metrics(font: string): { ascent: number; descent: number };
}

function canvasMeasurer(): Measurer {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new ConfirmationImageError("canvas", "Không tạo được canvas để đo chữ.");
  const cache = new Map<string, { ascent: number; descent: number }>();
  return {
    width(text, font) {
      ctx.font = font;
      return ctx.measureText(text).width;
    },
    metrics(font) {
      let m = cache.get(font);
      if (!m) {
        ctx.font = font;
        const t = ctx.measureText("Hg");
        const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
        m = { ascent: t.fontBoundingBoxAscent ?? size * 0.95, descent: t.fontBoundingBoxDescent ?? size * 0.25 };
        cache.set(font, m);
      }
      return m;
    },
  };
}

/** Bề rộng ba cột số của bảng dịch vụ — CHUNG cho mọi dịch vụ của đơn (các thẻ thẳng hàng với nhau); `stacked` = hết chỗ cho cột mô tả → bố cục hai hàng. */
interface Cols {
  qtyW: number;
  unitW: number;
  totW: number;
  stacked: boolean;
}
interface Ctx {
  theme: Theme;
  m: Measurer;
  ops: Op[];
  hasLogo: boolean;
  cols: Cols;
}
const TABLE_GAP = 14;
const MIN_DESC = 200;
const CARD_PAD = 16;

const fontOf = (c: Ctx, kind: "body" | "display", weight: number, size: number): string => `${weight} ${size}px ${kind === "body" ? c.theme.fontBody : c.theme.fontDisplay}`;

/** Đường cơ sở trong hộp dòng cao `lh` (chữ căn giữa theo số đo phông — dấu tiếng Việt không bị cắt). */
function baselineIn(c: Ctx, font: string, lh: number): number {
  const { ascent, descent } = c.m.metrics(font);
  return (lh - (ascent + descent)) / 2 + ascent;
}

interface TextArgs { text: string; x: number; top: number; lh: number; font: string; color: string; align?: Align; tag?: string }
function put(c: Ctx, a: TextArgs): void {
  const { ascent, descent } = c.m.metrics(a.font);
  c.ops.push({ kind: "text", tag: a.tag, text: a.text, x: a.x, y: a.top + baselineIn(c, a.font, a.lh), font: a.font, color: a.color, align: a.align ?? "left", width: c.m.width(a.text, a.font), ascent, descent });
}

/** Ngắt `s` theo bề rộng `width` rồi đặt từng dòng từ `y`; trả toạ độ y ngay dưới dòng cuối. */
function flow(c: Ctx, s: string, o: { x: number; y: number; width: number; lh: number; font: string; color: string; align?: Align; tag?: string }): number {
  const lines = wrapLines(s, o.width, (t) => c.m.width(t, o.font));
  const ax = o.align === "center" ? o.x + o.width / 2 : o.align === "right" ? o.x + o.width : o.x;
  lines.forEach((line, i) => {
    if (line !== "") put(c, { text: line, x: ax, top: o.y + i * o.lh, lh: o.lh, font: o.font, color: o.color, align: o.align, tag: o.tag });
  });
  return o.y + lines.length * o.lh;
}

const rule = (c: Ctx, x1: number, x2: number, y: number, tag?: string): void => void c.ops.push({ kind: "line", tag, x1, y1: y, x2, y2: y, color: c.theme.border });

/** Các cặp "nhãn: giá trị": cột nhãn rộng vừa đủ chữ dài nhất (tối đa 42%), giá trị tự ngắt dòng. */
function rows(c: Ctx, list: LabelValue[], o: { x: number; y: number; width: number; size: number; lh: number }): number {
  if (list.length === 0) return o.y;
  const labelFont = fontOf(c, "body", 400, o.size);
  const valueFont = fontOf(c, "body", 700, o.size);
  const widest = Math.max(...list.map((r) => c.m.width(r.label, labelFont)));
  const labelW = Math.min(Math.ceil(widest) + 16, Math.floor(o.width * 0.42));
  let y = o.y;
  for (const r of list) {
    const labelEnd = flow(c, r.label, { x: o.x, y, width: labelW - 10, lh: o.lh, font: labelFont, color: c.theme.muted });
    const valueEnd = flow(c, r.value, { x: o.x + labelW, y, width: o.width - labelW, lh: o.lh, font: valueFont, color: c.theme.text });
    y = Math.max(labelEnd, valueEnd) + 4;
  }
  return y;
}

/** Cỡ chữ lớn nhất (≤ `size`) để `s` vừa `maxWidth`; không xuống dưới 11. */
function fitSize(c: Ctx, kind: "body" | "display", weight: number, size: number, s: string, maxWidth: number): number {
  let px = size;
  while (px > 11 && c.m.width(s, fontOf(c, kind, weight, px)) > maxWidth) px -= 1;
  return px;
}

// ---- các khối ---------------------------------------------------------------------------------------------------------------------------------------------------------
function headerBlock(c: Ctx, b: HeaderBlock, y: number): number {
  const top = y + 28;
  const textX = MG + (c.hasLogo ? LOGO_SIZE + 20 : 0);
  const textW = W - MG - textX;
  if (c.hasLogo) c.ops.push({ kind: "logo", x: MG, y: top, size: LOGO_SIZE, radius: Math.round(LOGO_SIZE * 0.2237) });
  let ty = flow(c, b.companyName, { x: textX, y: top, width: textW, lh: 28, font: fontOf(c, "display", 800, 22), color: c.theme.primary, tag: "company" });
  ty += 4;
  for (const line of b.lines) ty = flow(c, line, { x: textX, y: ty, width: textW, lh: 20, font: fontOf(c, "body", 400, 14), color: c.theme.muted });
  const bottom = Math.max(ty, c.hasLogo ? top + LOGO_SIZE : ty) + 24;
  rule(c, MG, W - MG, bottom, "header-rule");
  return bottom + 1;
}

function titleBlock(c: Ctx, b: TitleBlock, y: number): number {
  const top = y + 24;
  const titleFont = fontOf(c, "display", 800, 26);
  const badgeFont = fontOf(c, "body", 700, 14);
  const badgeW = Math.ceil(c.m.width(b.status.text, badgeFont)) + 24;
  const badgeH = 28;
  const colors = badgeColors(c.theme, b.status.code);
  const sameRow = c.m.width(b.title, titleFont) + 16 + badgeW <= CW;
  let end = flow(c, b.title, { x: MG, y: top, width: CW, lh: 34, font: titleFont, color: c.theme.primary, tag: "title" });
  const badgeY = sameRow ? top + (34 - badgeH) / 2 : end + 4;
  const badgeX = sameRow ? W - MG - badgeW : MG;
  c.ops.push({ kind: "rect", tag: "status-badge", x: badgeX, y: badgeY, w: badgeW, h: badgeH, fill: colors.bg, radius: badgeH / 2 });
  put(c, { text: b.status.text, x: badgeX + badgeW / 2, top: badgeY, lh: badgeH, font: badgeFont, color: colors.fg, align: "center", tag: "status-text" });
  if (!sameRow) end = badgeY + badgeH;
  const rowsEnd = rows(c, b.rows, { x: MG, y: end + 12, width: CW, size: 15, lh: 22 });
  if (b.note === null) return rowsEnd + 4;
  // Đơn CHƯA có người phụ trách: câu chờ nhận thay cho dòng "Nhân viên phụ trách" (quyết định chủ dự án 2026-09-28) — tự ngắt dòng gọn trong lề như mọi khối khác.
  return flow(c, b.note, { x: MG, y: rowsEnd + 4, width: CW, lh: 22, font: fontOf(c, "body", 600, 15), color: c.theme.text, tag: "handler-note" }) + 4;
}

function headingBlock(c: Ctx, heading: string, y: number): number {
  const top = y + 12;
  const end = flow(c, heading, { x: MG, y: top, width: CW, lh: 24, font: fontOf(c, "display", 700, 16), color: c.theme.primary, tag: "heading" });
  rule(c, MG, W - MG, end + 4);
  return end + 14;
}

function customerBlock(c: Ctx, b: CustomerBlock, y: number): number {
  return rows(c, b.rows, { x: MG, y: headingBlock(c, b.heading, y), width: CW, size: 15, lh: 22 }) + 4;
}

const HEAD_FONT = (c: Ctx): string => fontOf(c, "body", 700, 13);
const NUM_FONT = (c: Ctx): string => fontOf(c, "body", 600, 15);
const TOT_FONT = (c: Ctx): string => fontOf(c, "body", 800, 15);
const SUB_FONT = (c: Ctx): string => fontOf(c, "body", 800, 16);

/** Đo MỌI dịch vụ của đơn: mỗi cột rộng đúng chuỗi dài nhất (tiêu đề, số lượng, đơn giá, thành tiền, tổng dịch vụ) rồi xét còn đủ chỗ cho cột mô tả không. */
function measureColumns(c: Ctx, services: ServiceBlock[]): Cols {
  const w = (t: string, f: string): number => Math.ceil(c.m.width(t, f));
  const head = HEAD_FONT(c), num = NUM_FONT(c), tot = TOT_FONT(c), sub = SUB_FONT(c);
  let qtyW = 0, unitW = 0, totW = 0;
  for (const s of services) {
    qtyW = Math.max(qtyW, w(s.columns.quantity, head), ...s.lines.map((l) => w(l.quantity, num)));
    unitW = Math.max(unitW, w(s.columns.unitPrice, head), ...s.lines.map((l) => w(l.unitPrice, num)));
    totW = Math.max(totW, w(s.columns.lineTotal, head), ...s.lines.map((l) => w(l.lineTotal, tot)), s.subtotal ? w(s.subtotal.value, sub) : 0);
  }
  const width = CW - 2 * CARD_PAD;
  const cols = { qtyW: qtyW + 4, unitW: unitW + 4, totW: totW + 4, stacked: false };
  cols.stacked = width - cols.qtyW - cols.unitW - cols.totW - 3 * TABLE_GAP < MIN_DESC;
  return cols;
}

/** Bảng dòng tiền của một dịch vụ (cột theo `c.cols`; hết chỗ cho mô tả thì hai hàng: mô tả + thành tiền, dưới là "SL × đơn giá"). Trả y ngay dưới bảng. */
function table(c: Ctx, b: ServiceBlock, x: number, y: number, width: number): number {
  const headFont = HEAD_FONT(c);
  const numFont = NUM_FONT(c);
  const totFont = TOT_FONT(c);
  const subFont = SUB_FONT(c);
  const col = { quantity: b.columns.quantity, unitPrice: b.columns.unitPrice, lineTotal: b.columns.lineTotal };
  const { qtyW, unitW, totW, stacked } = c.cols;
  const GAP = TABLE_GAP;
  const descW = stacked ? width - totW - GAP : width - qtyW - unitW - totW - 3 * GAP;
  const qtyR = x + descW + GAP + qtyW;
  const unitR = qtyR + GAP + unitW;
  const totR = x + width;
  // hàng tiêu đề
  const headH = 28;
  put(c, { text: b.columns.description, x, top: y, lh: headH, font: headFont, color: c.theme.muted });
  if (!stacked) {
    put(c, { text: col.quantity, x: qtyR, top: y, lh: headH, font: headFont, color: c.theme.muted, align: "right" });
    put(c, { text: col.unitPrice, x: unitR, top: y, lh: headH, font: headFont, color: c.theme.muted, align: "right" });
  }
  put(c, { text: col.lineTotal, x: totR, top: y, lh: headH, font: headFont, color: c.theme.muted, align: "right" });
  rule(c, x, x + width, y + headH);
  let cy = y + headH + 1;
  b.lines.forEach((l, i) => {
    const top = cy + 9;
    let end = flow(c, l.description, { x, y: top, width: descW, lh: 21, font: fontOf(c, "body", 600, 15), color: c.theme.text });
    if (!stacked) {
      put(c, { text: l.quantity, x: qtyR, top, lh: 21, font: numFont, color: c.theme.text, align: "right" });
      put(c, { text: l.unitPrice, x: unitR, top, lh: 21, font: numFont, color: c.theme.text, align: "right" });
    }
    put(c, { text: l.lineTotal, x: totR, top, lh: 21, font: totFont, color: c.theme.text, align: "right" });
    if (l.detail !== null) end = flow(c, l.detail, { x, y: end, width: descW, lh: 18, font: fontOf(c, "body", 400, 13), color: c.theme.muted });
    if (stacked) end = flow(c, `${l.quantity} × ${l.unitPrice}`, { x, y: end, width: descW, lh: 18, font: fontOf(c, "body", 400, 13), color: c.theme.muted });
    cy = end + 9;
    if (i < b.lines.length - 1 || b.subtotal) {
      rule(c, x, x + width, cy);
      cy += 1;
    }
  });
  if (b.subtotal) {
    const top = cy + 6;
    put(c, { text: b.subtotal.label, x: totR - totW - GAP, top, lh: 26, font: fontOf(c, "body", 700, 15), color: c.theme.muted, align: "right", tag: "subtotal-label" });
    put(c, { text: b.subtotal.value, x: totR, top, lh: 26, font: subFont, color: c.theme.text, align: "right", tag: "subtotal-value" });
    cy = top + 26 + 6;
  }
  return cy;
}

function serviceBlock(c: Ctx, b: ServiceBlock, y: number): number {
  const top = y + 18;
  const pad = CARD_PAD;
  const innerX = MG + pad;
  const innerW = CW - 2 * pad;
  const titleFont = fontOf(c, "display", 700, 17);
  const titleLines = wrapLines(`${b.index}. ${b.name}`, innerW, (t) => c.m.width(t, titleFont)).length;
  const stripeH = titleLines * 24 + 20;
  c.ops.push({ kind: "rect", tag: "service-title", x: MG, y: top, w: CW, h: stripeH, fill: c.theme.surfaceAlt, radius: [10, 10, 0, 0] });
  flow(c, `${b.index}. ${b.name}`, { x: innerX, y: top + 10, width: innerW, lh: 24, font: titleFont, color: c.theme.text, tag: "service-name" });
  let cy = rows(c, b.details, { x: innerX, y: top + stripeH + 12, width: innerW, size: 14, lh: 20 });
  cy = table(c, b, innerX, cy + 6, innerW);
  const bottom = cy + 8;
  c.ops.push({ kind: "rect", tag: "service-card", x: MG, y: top, w: CW, h: bottom - top, stroke: c.theme.border, radius: 10 });
  return bottom;
}

function summaryBlock(c: Ctx, b: SummaryBlock, y: number): number {
  const top = y + 22;
  const pad = 16;
  let cy = top + 6;
  b.rows.forEach((r, i) => {
    const emph = r.emphasis;
    const lh = emph ? 40 : 30;
    const labelFont = emph ? fontOf(c, "body", 800, 17) : fontOf(c, "body", 400, 15);
    const labelColor = emph ? c.theme.accent : c.theme.muted;
    const labelW = Math.ceil(c.m.width(r.label, labelFont));
    const avail = CW - 2 * pad - labelW - 16;
    const size = emph ? fitSize(c, "display", 800, 22, r.value, avail) : fitSize(c, "body", 600, 16, r.value, avail);
    const valueFont = emph ? fontOf(c, "display", 800, size) : fontOf(c, "body", 600, size);
    if (emph) c.ops.push({ kind: "rect", tag: "emphasis-strip", x: MG + 1, y: cy, w: CW - 2, h: lh, fill: c.theme.accentSoft, radius: i === b.rows.length - 1 ? [0, 0, 9, 9] : 0 });
    else if (i > 0 && !b.rows[i - 1]!.emphasis) rule(c, MG + pad, W - MG - pad, cy);
    put(c, { text: r.label, x: MG + pad, top: cy, lh, font: labelFont, color: labelColor, tag: emph ? "emphasis" : undefined });
    put(c, { text: r.value, x: W - MG - pad, top: cy, lh, font: valueFont, color: emph ? c.theme.accent : c.theme.text, align: "right", tag: emph ? "emphasis" : undefined });
    cy += lh;
  });
  const bottom = cy + 6;
  c.ops.push({ kind: "rect", tag: "summary-card", x: MG, y: top, w: CW, h: bottom - top, stroke: c.theme.border, radius: 10 });
  return bottom;
}

function footerBlock(c: Ctx, b: FooterBlock, y: number): number {
  let cy = y + 28;
  rule(c, MG, W - MG, cy);
  cy += 16;
  b.lines.forEach((line, i) => {
    cy = flow(c, line, { x: MG + 20, y: cy, width: CW - 40, lh: 22, font: i === 0 ? fontOf(c, "body", 700, 15) : fontOf(c, "body", 400, 14), color: i === 0 ? c.theme.text : c.theme.muted, align: "center" }) + (i === 0 ? 2 : 0);
  });
  return cy + 28;
}

/** Bố cục toàn bộ mô hình: danh sách lệnh vẽ theo toạ độ px CSS (khổ 720). Thuần theo (mô hình, token, bộ đo) nên kiểm được không cần vẽ. */
export function layoutConfirmation(model: ConfirmationModel, theme: Theme, m: Measurer, hasLogo: boolean): Layout {
  const c: Ctx = { theme, m, ops: [], hasLogo, cols: { qtyW: 0, unitW: 0, totW: 0, stacked: false } };
  c.cols = measureColumns(c, model.blocks.filter((b): b is ServiceBlock => b.kind === "service"));
  c.ops.push({ kind: "rect", tag: "top-stripe", x: 0, y: 0, w: W, h: STRIPE_H, fill: theme.primary });
  let y = STRIPE_H;
  for (const block of model.blocks) {
    switch (block.kind) {
      case "header": y = headerBlock(c, block, y); break;
      case "title": y = titleBlock(c, block, y); break;
      case "customer": y = customerBlock(c, block, y); break;
      case "service": y = serviceBlock(c, block, y); break;
      case "summary": y = summaryBlock(c, block, y); break;
      case "footer": y = footerBlock(c, block, y); break;
    }
  }
  return { width: W, height: Math.ceil(y), ops: c.ops };
}

// ---- phông, logo, độ phân giải -------------------------------------------------------------------------------------------------------------------------------
function withTimeout<T>(p: Promise<T>, ms: number, fail: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(fail()), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e: unknown) => { clearTimeout(timer); reject(e); },
    );
  });
}

const familiesOf = (stack: string): string[] => stack.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter((s) => s !== "");

/** Mọi chuỗi trong mô hình (làm mẫu chữ cho document.fonts.load) cộng ký tự bộ vẽ tự thêm ("×"). */
function sampleText(model: ConfirmationModel): string {
  const parts: string[] = ["×"];
  const walk = (v: unknown): void => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v !== null && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(model);
  return [...new Set([...parts.join("")])].filter((ch) => ch !== "\n").join("");
}

/** Chờ mọi họ phông trong hai chồng phông (tiêu đề, nội dung) × các độ đậm đã dùng nạp xong, KÈM chữ mẫu để tập con tiếng Việt (unicode-range) cũng được nạp. */
async function loadFonts(theme: Theme, sample: string): Promise<void> {
  if (!("fonts" in document)) return;
  const families = [...new Set([...familiesOf(theme.fontDisplay), ...familiesOf(theme.fontBody)])];
  const jobs = families.flatMap((f) => FONT_WEIGHTS.map((weight) => document.fonts.load(`${weight} 16px "${f}"`, sample)));
  const done = Promise.all(jobs).then(() => document.fonts.ready);
  try {
    await withTimeout(done, FONT_TIMEOUT_MS, () => new ConfirmationImageError("font", "Phông chữ nạp quá lâu."));
  } catch (e) {
    throw e instanceof ConfirmationImageError ? e : new ConfirmationImageError("font", "Không nạp được phông chữ.");
  }
}

/** Logo cùng nguồn (`/icons/icon-192.png`); nạp hỏng thì ảnh vẫn ra, chỉ thiếu logo. */
async function loadLogo(): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = LOGO_URL;
    await withTimeout(img.decode(), 8_000, () => new Error("logo"));
    return img;
  } catch {
    return null;
  }
}

/** ≥ 2 (ảnh ≥ 1440 px) và ≤ 3; đơn quá dài thì hạ theo bước 0,25 để diện tích không vượt MAX_CANVAS_AREA (iOS trả canvas trống khi vượt), tối thiểu 1. */
function chooseScale(height: number): number {
  const dpr = typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const wanted = Math.min(3, Math.max(2, dpr));
  const fit = Math.sqrt(MAX_CANVAS_AREA / (W * height));
  return wanted <= fit ? wanted : Math.max(1, Math.floor(fit * 4) / 4);
}

export interface Prepared {
  layout: Layout;
  scale: number;
  theme: Theme;
  logo: HTMLImageElement | null;
}

/** Bước 1: token, phông, logo, bố cục. Tách khỏi `renderConfirmationPng` để bằng chứng đo đúng bố cục đã vẽ. */
export async function prepareConfirmation(model: ConfirmationModel): Promise<Prepared> {
  const theme = readTheme();
  await loadFonts(theme, sampleText(model));
  const logo = await loadLogo();
  const layout = layoutConfirmation(model, theme, canvasMeasurer(), logo !== null);
  return { layout, scale: chooseScale(layout.height), theme, logo };
}

// ---- vẽ ----------------------------------------------------------------------------------------------------------------------------------------------------------------
function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: Radius): void {
  const [tl, tr, br, bl] = typeof radius === "number" ? [radius, radius, radius, radius] : radius;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function paint(p: Prepared): HTMLCanvasElement {
  const { layout, scale, theme, logo } = p;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.ceil(layout.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ConfirmationImageError("canvas", "Trình duyệt không cho tạo canvas.");
  ctx.setTransform(scale, 0, 0, scale, 0, 0); // (đặt kích thước canvas đã xoá trạng thái; đặt phép co giãn SAU đó)
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale); // phủ kín cả hàng điểm ảnh cuối (chiều cao × độ phân giải lẻ thì canvas cao hơn bố cục tới 1 điểm ảnh)
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "alphabetic";
  for (const op of layout.ops) {
    switch (op.kind) {
      case "rect":
        if (op.radius === undefined || op.radius === 0) {
          if (op.fill) { ctx.fillStyle = op.fill; ctx.fillRect(op.x, op.y, op.w, op.h); }
          if (op.stroke) { ctx.strokeStyle = op.stroke; ctx.lineWidth = 1; ctx.strokeRect(op.x, op.y, op.w, op.h); }
        } else {
          roundedPath(ctx, op.x, op.y, op.w, op.h, op.radius);
          if (op.fill) { ctx.fillStyle = op.fill; ctx.fill(); }
          if (op.stroke) { ctx.strokeStyle = op.stroke; ctx.lineWidth = 1; ctx.stroke(); }
        }
        break;
      case "line":
        ctx.strokeStyle = op.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(op.x1, op.y1 + 0.5);
        ctx.lineTo(op.x2, op.y2 + 0.5);
        ctx.stroke();
        break;
      case "text":
        ctx.font = op.font;
        ctx.fillStyle = op.color;
        ctx.textAlign = op.align;
        ctx.fillText(op.text, op.x, op.y);
        break;
      case "logo":
        if (logo) {
          ctx.save();
          roundedPath(ctx, op.x, op.y, op.size, op.size, op.radius);
          ctx.clip();
          ctx.drawImage(logo, op.x, op.y, op.size, op.size);
          ctx.restore();
        }
        break;
    }
  }
  // Canvas quá lớn/hỏng thì trình duyệt (iOS) lặng lẽ vẽ hỏng và trả ảnh trong suốt: dò hai góc — nền đã tô kín nên phải đặc.
  const corner = (x: number, y: number): number => ctx.getImageData(x, y, 1, 1).data[3] ?? 0;
  if (corner(0, 0) !== 255 || corner(canvas.width - 1, canvas.height - 1) !== 255) throw new ConfirmationImageError("canvas", "Canvas trả ảnh trống.");
  return canvas;
}

function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ConfirmationImageError("encode", "Không mã hoá được ảnh PNG."))), "image/png");
    } catch {
      reject(new ConfirmationImageError("encode", "Không mã hoá được ảnh PNG."));
    }
  });
}

/** Mô hình → PNG. Lỗi thì ném `ConfirmationImageError` (không bao giờ trả ảnh trống). */
export async function renderConfirmationPng(model: ConfirmationModel): Promise<Blob> {
  return encode(paint(await prepareConfirmation(model)));
}
