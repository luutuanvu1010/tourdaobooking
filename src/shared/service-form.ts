// Bản nháp dịch vụ của form lập/sửa đơn (A2, đặc tả §5.1): trạng thái một thẻ dịch vụ, dòng tiền xem trước, lỗi chặn Lưu, thân ServiceInput.
// Logic thuần, không DOM. Tiền xem trước dùng ĐÚNG buildLines/priceDeviation của máy chủ (order-lines.ts); số chính thức do máy chủ tính khi lưu (spec A1 §2.3).
import type { CatalogStatus, OrderServiceDto, ServiceInput, TripInput } from "./contracts.ts";
import {
  MAX_AMOUNT_VND, MAX_GUESTS_PER_SERVICE, PAX_LABEL, PAX_ORDER, availableCodes, buildLines, parseUnit, paxTotal, payingGuests, priceDeviation, thanhTienDong,
  type CatalogService, type PaxCode, type PaxCounts, type Prices,
} from "./order-lines.ts";
import { MAX_LINES_PER_ORDER, MAX_SERVICES } from "./trip-rules.ts";
import { emptyTrip, tripFromDto } from "./trip-form.ts";
import { changTuDto, legInput, loiDanhSachChang, type ChangNhap } from "./chang-form.ts";
import { tongKhach } from "./so-nguoi-chang.ts";
import { CAU_THIEU_NGUOI_LON, donThieuNguoiLon } from "./nguoi-di-kem.ts";

export interface ManualLine {
  description: string;
  detail: string;
  quantity: number;
  unitPrice: number;
}

interface DraftBase {
  /** Khoá cục bộ của thẻ (ổn định để vẽ lại đúng thẻ, không mất focus); KHÔNG gửi lên máy chủ. */
  key: string;
  /** id dịch vụ đã lưu của CHÍNH đơn đang sửa; null = thẻ mới. */
  id: string | null;
  trip: TripInput;
  /** Chặng đưa đón của dịch vụ (ADR-0047 Phần B, bản vẽ M1) — gửi lên ở `legs` (luôn có khoá, kể cả []). */
  legs: ChangNhap[];
  /** Câu "Đã tạo sẵn … theo dịch vụ" khi chặng vừa được tạo theo mẫu (M6); null = không. */
  taoSan: string | null;
}

export interface CatalogDraft extends DraftBase {
  kind: "catalog";
  code: string;
  name: string;
  unit: string;
  /** Nguồn giá đang hiển thị: danh mục hiện tại ("live") hoặc bản chụp đã lưu ("snapshot" — giữ giá cũ của đơn nháp, đặc tả Q11). */
  source: "live" | "snapshot";
  item: CatalogService;
  /** Danh mục hiện tại còn dịch vụ này (kể cả khi thẻ đang ở bản chụp); null = đã ẩn/rời danh mục. */
  live: CatalogService | null;
  pax: PaxCounts;
  /** Đơn giá thực tế từng loại (mặc định = giá của `item`); chỉ loại có khách được gửi lên. */
  unitPrices: Partial<Record<PaxCode, number>>;
  catalogStatus: CatalogStatus | null;
  /** Thẻ dựng từ đơn giá đã lưu (dòng thiếu giá danh mục) mà danh mục không còn dịch vụ: máy chủ sẽ 400 `catalog_unavailable` → phải chọn lại từ danh mục. */
  repick: boolean;
  /**
   * Trạng thái ĐÃ LƯU của thẻ có bản chụp (đặt bởi `draftFromDto`); null = thẻ mới hoặc thẻ "live" không có bản chụp.
   * `setPax` dùng để QUAY LẠI bản chụp khi số khách cuối cùng y như đã lưu (đặc tả §5.1: chỉ chuyển giá khi ĐỔI số khách).
   */
  saved: { pax: PaxCounts; item: CatalogService; unitPrices: Partial<Record<PaxCode, number>>; catalogStatus: CatalogStatus | null } | null;
}

export interface ManualDraft extends DraftBase {
  kind: "manual";
  name: string;
  /** Số khách CHỈ để vận hành (không nhân với tiền); gửi lên ở `pax.adult`. */
  guests: number;
  lines: ManualLine[];
}

export type ServiceDraft = CatalogDraft | ManualDraft;

const wholeCount = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
const wholeMoney = (n: number): number => (Number.isFinite(n) ? Math.min(MAX_AMOUNT_VND, Math.max(0, Math.trunc(n))) : 0);

export const zeroPax = (): PaxCounts => ({ adult: 0, child: 0, senior: 0, infant: 0 });
export const emptyLine = (): ManualLine => ({ description: "", detail: "", quantity: 1, unitPrice: 0 });

function defaultPrices(item: CatalogService): Partial<Record<PaxCode, number>> {
  const out: Partial<Record<PaxCode, number>> = {};
  for (const c of PAX_ORDER) {
    const p = item.prices[c];
    if (p !== null) out[c] = p;
  }
  return out;
}

/** Chip đơn vị của thẻ: "theo người" / "theo nhóm 5 khách/lượt" / "nhập tay". */
export function unitLabel(unit: string): string {
  if (unit === "manual") return "nhập tay";
  const u = parseUnit(unit);
  if (u.kind === "perPax") return "theo người";
  if (u.kind === "group") return `theo nhóm ${u.size} khách/lượt`;
  return `đơn vị ${u.raw}`;
}

/**
 * Loại khách có bộ đếm trên thẻ (thứ tự PAX_ORDER): loại có giá ở bảng giá của thẻ + loại có giá ở danh mục HIỆN TẠI + loại đang có khách.
 * Thẻ bản chụp chỉ nhớ loại đã có dòng tiền (máy chủ chỉ sinh dòng cho loại có khách), nên phải cộng loại của danh mục hiện tại để thêm được
 * vd một trẻ em vào đơn đã lưu 2 người lớn — chạm bộ đếm là chuyển sang giá hiện tại (`setPax`) và danh sách này không đổi khi đó
 * (nhờ vậy thẻ không dựng lại bộ đếm đang gõ). Loại đang có khách luôn hiện để giảm được.
 */
export function cardCodes(d: CatalogDraft): PaxCode[] {
  const fromItem = availableCodes(d.item);
  const fromLive = d.live ? availableCodes(d.live) : [];
  return PAX_ORDER.filter((c) => fromItem.includes(c) || fromLive.includes(c) || d.pax[c] > 0);
}

/**
 * Dòng phụ của ô loại khách trong lưới số khách: "950.000 · Trẻ 5–10 tuổi" (theo người — điều kiện là ghi chú của danh mục) hoặc "1.500.000 / nhóm 5 khách" (theo nhóm);
 * thẻ dùng `formatMoney` nhóm hàng nghìn không kèm "₫" (bản vẽ 18/10). Loại chưa có ở bản chụp lấy giá/ghi chú của danh mục hiện tại (chạm bộ đếm loại đó là chuyển sang giá hiện tại).
 */
export function guestDetail(d: CatalogDraft, code: PaxCode, formatMoney: (n: number) => string): string {
  const price = d.item.prices[code] ?? d.live?.prices[code] ?? null;
  const g = groupInfo(d);
  if (g && price !== null) return `${formatMoney(price)} / nhóm ${g.size} khách`;
  const note = code === "adult" ? null : (d.item.notes[code] ?? d.live?.notes[code] ?? null);
  return [price === null ? null : formatMoney(price), note].filter(Boolean).join(" · ");
}

/** Số khách để hiển thị: theo người liệt kê từng loại ("2 người lớn · 1 trẻ em"); theo nhóm và nhập tay chỉ "N khách"; không khách → "Chưa có khách". */
export function paxSummary(pax: PaxCounts, unit: string): string {
  const total = paxTotal(pax);
  if (total === 0) return "Chưa có khách";
  if (unit === "manual" || parseUnit(unit).kind === "group") return `${total} khách`;
  return PAX_ORDER.filter((c) => pax[c] > 0).map((c) => `${pax[c]} ${PAX_LABEL[c].toLowerCase()}`).join(" · ");
}

// ---- tạo thẻ -----------------------------------------------------------------------------------------------------

/** Thêm dịch vụ từ danh mục: 1 người lớn (theo nhóm: "Số khách" = 1), đơn giá = giá danh mục, khối chuyến trống. */
export function newCatalogDraft(item: CatalogService, key: string): CatalogDraft {
  const pax = zeroPax();
  pax.adult = 1;
  return { kind: "catalog", key, id: null, trip: emptyTrip(), legs: [], taoSan: null, code: item.code, name: item.name, unit: item.unit, source: "live", item, live: item, pax, unitPrices: defaultPrices(item), catalogStatus: null, repick: false, saved: null };
}

export function newManualDraft(key: string): ManualDraft {
  return { kind: "manual", key, id: null, trip: emptyTrip(), legs: [], taoSan: null, name: "", guests: 0, lines: [emptyLine()] };
}

/** Dựng lại bảng giá từ dòng đã lưu (giống `snapshotService` của máy chủ); thiếu loại khách/giá danh mục → null. */
export function snapshotItem(dto: Pick<OrderServiceDto, "catalogCode" | "name" | "unit" | "items">): CatalogService | null {
  if (dto.catalogCode === null || dto.items.length === 0) return null;
  const prices: Prices = { adult: null, child: null, senior: null, infant: null };
  const notes: CatalogService["notes"] = { child: null, senior: null, infant: null };
  for (const it of dto.items) {
    if (it.paxCode === null || it.catalogPrice === null) return null;
    prices[it.paxCode] = it.catalogPrice;
    if (it.paxCode !== "adult") notes[it.paxCode] = it.detail;
  }
  return { code: dto.catalogCode, name: dto.name, unit: dto.unit, prices, notes };
}

/**
 * Thẻ của dịch vụ đã lưu (sửa nháp). `live` = danh mục hiện tại theo mã (chỉ dịch vụ đang hiện và được hỗ trợ).
 * Có bản chụp → giữ giá đã lưu (nhãn theo `catalogStatus`); danh mục không còn → thẻ khoá (`isLocked`).
 */
export function draftFromDto(dto: OrderServiceDto, live: ReadonlyMap<string, CatalogService>, key: string): ServiceDraft {
  const base = { key, id: dto.id, trip: tripFromDto(dto), legs: dto.legs.map((l, i) => changTuDto(l, `${key}-l${i}`)), taoSan: null };
  if (dto.kind === "manual" || dto.catalogCode === null) {
    return {
      ...base, kind: "manual", name: dto.name, guests: paxTotal(dto.pax),
      lines: dto.items.map((it) => ({ description: it.description, detail: it.detail ?? "", quantity: it.quantity, unitPrice: it.unitPrice })),
    };
  }
  const liveItem = live.get(dto.catalogCode) ?? null;
  const saved: Partial<Record<PaxCode, number>> = {};
  for (const it of dto.items) if (it.paxCode !== null) saved[it.paxCode] = it.unitPrice;
  const pax = { ...dto.pax };
  const snap = snapshotItem(dto);
  if (snap) {
    return {
      ...base, kind: "catalog", code: snap.code, name: snap.name, unit: snap.unit, source: "snapshot", item: snap, live: liveItem, pax, unitPrices: saved, catalogStatus: dto.catalogStatus, repick: false,
      saved: { pax: { ...dto.pax }, item: snap, unitPrices: { ...saved }, catalogStatus: dto.catalogStatus },
    };
  }
  if (liveItem) {
    return { ...base, kind: "catalog", code: liveItem.code, name: liveItem.name, unit: liveItem.unit, source: "live", item: liveItem, live: liveItem, pax, unitPrices: { ...defaultPrices(liveItem), ...saved }, catalogStatus: dto.catalogStatus, repick: false, saved: null };
  }
  // Dòng đã lưu thiếu giá danh mục và danh mục không còn: dựng bảng giá tạm từ đơn giá đã lưu, thẻ khoá VÀ bắt buộc chọn lại (repick):
  // máy chủ không có bản chụp đủ giá nên sẽ tra danh mục, không thấy và trả 400 catalog_unavailable.
  const prices: Prices = { adult: null, child: null, senior: null, infant: null };
  for (const c of PAX_ORDER) prices[c] = saved[c] ?? null;
  const item: CatalogService = { code: dto.catalogCode, name: dto.name, unit: dto.unit, prices, notes: { child: null, senior: null, infant: null } };
  return {
    ...base, kind: "catalog", code: item.code, name: item.name, unit: item.unit, source: "snapshot", item, live: null, pax, unitPrices: saved, catalogStatus: dto.catalogStatus, repick: true,
    saved: { pax: { ...dto.pax }, item, unitPrices: { ...saved }, catalogStatus: dto.catalogStatus },
  };
}

/** Thẻ bản chụp mà danh mục không còn dịch vụ: bộ đếm chỉ-đọc, chỉ còn "Chọn lại từ danh mục". */
export const isLocked = (d: ServiceDraft): boolean => d.kind === "catalog" && d.source === "snapshot" && d.live === null;

/**
 * Dịch vụ nhập tay ĐÃ LƯU khi người dùng KHÔNG được nhập tay (DK-T3-01; ADR-0061: công tắc tắt, không có ô, hoặc tài khoản có quyền Đối tác): máy chủ chỉ
 * nhận lại NGUYÊN tên + dòng tiền (`orders/price-guards.ts`), nên thẻ hiện CHỈ XEM tên và dòng tiền; số khách, thông tin chuyến và nút "Xoá" vẫn dùng được.
 * `duocNhapTay` = `duocDung` do máy chủ trả (`GET /api/cai-dat/nhap-tay`) — giao diện không tự tính luật; mặc định false (an toàn: chỉ xem).
 */
export const isFrozenManual = (d: ServiceDraft, duocNhapTay = false): boolean => d.kind === "manual" && d.id !== null && !duocNhapTay;

// ---- chỉnh sửa (bất biến: trả bản mới) -------------------------------------------------------------------------------

/**
 * Đổi số khách một loại. Thẻ bản chụp mà danh mục còn dịch vụ → chuyển sang giá danh mục hiện tại và bỏ nhãn cũ; thẻ khoá → không đổi.
 * Chỉ chuyển giá khi số khách THẬT SỰ khác đã lưu (đặc tả §5.1; máy chủ cũng chỉ giữ bản chụp khi số khách y như đã lưu — `service-rules.ts`, nhánh `kept`):
 * số khách quay về đúng giá trị đã lưu (bấm "+" rồi "−") → QUAY LẠI bản chụp (đơn giá thương lượng + nhãn), không để thẻ lệch với những gì máy chủ sẽ làm.
 */
export function setPax(d: CatalogDraft, code: PaxCode, n: number): CatalogDraft {
  if (isLocked(d)) return d;
  const pax = { ...d.pax, [code]: wholeCount(n) };
  const s = d.saved;
  if (s && PAX_ORDER.every((c) => pax[c] === s.pax[c])) {
    if (d.source === "snapshot") return { ...d, pax }; // đang là bản chụp: giữ nguyên, kể cả đơn giá vừa sửa
    // Đang ở giá hiện tại ("live"): đơn giá người dùng VỪA GÕ (khác giá danh mục hiện tại — cùng heuristic với refreshFromCatalog) phải được GIỮ khi quay về bản chụp;
    // loại chưa gõ dùng đơn giá đã lưu. (Giá gõ ở chế độ bản chụp rồi đổi số khách thì mất theo thiết kế §5.1: khi đó thẻ đã chuyển sang giá hiện tại.)
    const unitPrices = { ...s.unitPrices };
    const current = defaultPrices(d.item);
    for (const c of PAX_ORDER) {
      const typed = d.unitPrices[c];
      if (typed !== undefined && typed !== current[c]) unitPrices[c] = typed;
    }
    return { ...d, pax, source: "snapshot", item: s.item, name: s.item.name, unit: s.item.unit, unitPrices, catalogStatus: s.catalogStatus };
  }
  if (d.source === "snapshot" && d.live) return { ...d, pax, source: "live", item: d.live, name: d.live.name, unit: d.live.unit, unitPrices: defaultPrices(d.live), catalogStatus: null };
  return { ...d, pax };
}

export function setUnitPrice(d: CatalogDraft, code: PaxCode, n: number): CatalogDraft {
  return { ...d, unitPrices: { ...d.unitPrices, [code]: wholeMoney(n) } };
}

/**
 * Sau 409 `catalog_changed`: dùng bảng giá danh mục MỚI cho thẻ đang theo danh mục hiện tại ("live"). Đơn giá ĐÃ THƯƠNG LƯỢNG (khác giá danh mục cũ) được giữ;
 * đơn giá chưa thương lượng (bằng giá danh mục cũ) chuyển sang giá mới. Thẻ bản chụp không đổi (máy chủ không kiểm giá của bản chụp).
 */
export function refreshFromCatalog(d: CatalogDraft, item: CatalogService): CatalogDraft {
  if (d.source !== "live") return d;
  const unitPrices: Partial<Record<PaxCode, number>> = {};
  for (const c of PAX_ORDER) {
    const price = item.prices[c];
    if (price === null) continue;
    const old = d.item.prices[c];
    const typed = d.unitPrices[c];
    unitPrices[c] = typed !== undefined && old !== null && typed !== old ? typed : price;
  }
  return { ...d, item, live: item, name: item.name, unit: item.unit, unitPrices }; // tên/đơn vị theo danh mục mới: nhãn chip, bộ đếm "Số khách", chữ "7 khách = 2 lượt" (chuLuot) và dòng phụ "giá / nhóm N khách" đúng nếu Sheet đổi đơn vị
}

export const setGuests = (d: ManualDraft, n: number): ManualDraft => ({ ...d, guests: wholeCount(n) });

export function setManualLine(d: ManualDraft, index: number, patch: Partial<ManualLine>): ManualDraft {
  const lines = d.lines.map((l, i) =>
    i !== index
      ? l
      : {
          ...l,
          ...patch,
          quantity: patch.quantity === undefined ? l.quantity : wholeCount(patch.quantity),
          unitPrice: patch.unitPrice === undefined ? l.unitPrice : wholeMoney(patch.unitPrice),
        },
  );
  return { ...d, lines };
}

export const addManualLine = (d: ManualDraft): ManualDraft => ({ ...d, lines: [...d.lines, emptyLine()] });
export const removeManualLine = (d: ManualDraft, index: number): ManualDraft => ({ ...d, lines: d.lines.filter((_, i) => i !== index) });

// ---- dòng tiền xem trước ---------------------------------------------------------------------------------------------

export interface PreviewLine {
  /** Loại khách của dòng; null = dòng nhập tay. */
  pax: PaxCode | null;
  description: string;
  detail: string;
  quantity: number;
  unitPrice: number;
  /** Giá danh mục; null = nhập tay (KHÔNG BAO GIỜ có nhãn "Khác giá danh mục"). */
  catalogPrice: number | null;
  lineTotal: number;
  /** Độ lệch đơn giá so với giá danh mục (dương = cao hơn); null = khớp hoặc nhập tay. */
  deviation: number | null;
}
export type Preview = { ok: true; lines: PreviewLine[] } | { ok: false; message: string };

export function previewLines(d: ServiceDraft): Preview {
  if (d.kind === "manual") {
    return {
      ok: true,
      lines: d.lines.map((l) => ({ pax: null, description: l.description, detail: l.detail, quantity: l.quantity, unitPrice: l.unitPrice, catalogPrice: null, lineTotal: thanhTienDong(l), deviation: null })),
    };
  }
  const built = buildLines(d.item, d.pax, d.unitPrices);
  if (!built.ok) return { ok: false, message: built.message };
  return {
    ok: true,
    lines: built.lines.map((l) => ({
      pax: l.pax, description: l.description, detail: l.detail, quantity: l.quantity, unitPrice: l.unitPrice, catalogPrice: l.catalogPrice,
      lineTotal: thanhTienDong(l), deviation: priceDeviation({ unitPrice: l.unitPrice, catalogPrice: l.catalogPrice }),
    })),
  };
}

export function draftSubtotal(d: ServiceDraft): number {
  const p = previewLines(d);
  return p.ok ? p.lines.reduce((sum, l) => sum + l.lineTotal, 0) : 0;
}

/** Dịch vụ tính theo nhóm: số khách, cỡ nhóm và số lượt (làm tròn lên — cùng phép của `buildLines`) cho chữ "7 khách = 2 lượt". Không phải dịch vụ nhóm → null. */
export function groupInfo(d: CatalogDraft): { size: number; guests: number; trips: number } | null {
  const u = parseUnit(d.unit);
  if (u.kind !== "group") return null;
  const guests = d.pax.adult;
  return { size: u.size, guests, trips: guests > 0 ? Math.ceil(guests / u.size) : 0 };
}

// ---- chữ của lưới số khách và dòng tiền trên thẻ (thiết kế lại 18/10/2026) — CHỈ trình bày số đã có, không tính tiền ----

/** Chữ trong ô "Số khách" của dịch vụ theo nhóm: "7 khách = 2 lượt"; chưa có khách hoặc không phải dịch vụ nhóm → "". */
export function chuLuot(g: { guests: number; trips: number } | null): string {
  return g && g.guests > 0 ? `${g.guests} khách = ${g.trips} lượt` : "";
}

/** Phần số lượng của dòng tiền: "2 người lớn" / "1 em bé" (theo người), "2 lượt" (theo nhóm); dòng nhập tay chỉ có số. */
export function nhanSoLuongDong(l: Pick<PreviewLine, "pax" | "quantity">, laNhom: boolean): string {
  if (laNhom) return `${l.quantity} lượt`;
  return l.pax === null ? String(l.quantity) : `${l.quantity} ${PAX_LABEL[l.pax].toLowerCase()}`;
}

/**
 * Một dòng tiền của thẻ: "2 người lớn × 1.350.000 = 2.700.000". Thành tiền là `lineTotal` ĐÃ TÍNH (previewLines → buildLines + thanhTienDong — một công thức,
 * máy chủ tính lại khi lưu); hàm này chỉ ghép chữ, không nhân.
 */
export function chuDongTien(l: Pick<PreviewLine, "pax" | "quantity" | "unitPrice" | "lineTotal">, laNhom: boolean, formatMoney: (n: number) => string): string {
  return `${nhanSoLuongDong(l, laNhom)} × ${formatMoney(l.unitPrice)} = ${formatMoney(l.lineTotal)}`;
}

/** Dòng "Thành tiền dịch vụ" chỉ hiện khi thẻ có từ hai dòng tiền (một dòng thì chính dòng đó đã là thành tiền). */
export const coDongThanhTien = (soDong: number): boolean => soDong >= 2;

// ---- lỗi chặn Lưu (giảm vòng máy chủ; máy chủ vẫn là nơi quyết định) --------------------------------------------------

export interface DraftIssue {
  code: "leg" | "repick" | "no_guests" | "no_paying_guests" | "too_many_guests" | "preview" | "amount" | "name" | "no_lines" | "line_description" | "line_quantity" | "too_many_lines";
  message: string;
}

/** Số khách của dịch vụ đang nhập (mẫu số "Số người chiều về không được quá N", mẫu số hành khách). */
export const soKhachNhap = (d: ServiceDraft): number => (d.kind === "catalog" ? tongKhach(d.pax) : d.guests);

export function draftIssues(d: ServiceDraft): DraftIssue[] {
  return [...draftIssuesTien(d), ...loiDanhSachChang(d.legs, soKhachNhap(d)).map((message) => ({ code: "leg" as const, message }))];
}

function draftIssuesTien(d: ServiceDraft): DraftIssue[] {
  const out: DraftIssue[] = [];
  if (d.kind === "catalog") {
    if (d.repick) return [{ code: "repick", message: "Dịch vụ này không còn trong danh mục — chọn lại từ danh mục." }];
    const total = paxTotal(d.pax);
    if (total > MAX_GUESTS_PER_SERVICE) out.push({ code: "too_many_guests", message: `Tối đa ${MAX_GUESTS_PER_SERVICE} khách.` });
    else if (total === 0) out.push({ code: "no_guests", message: "Nhập số khách." });
    else if (payingGuests(d.pax) < 1) out.push({ code: "no_paying_guests", message: "Cần ít nhất 1 khách không phải em bé." });
    if (out.length === 0) {
      const p = previewLines(d);
      if (!p.ok) out.push({ code: "preview", message: p.message });
      else if (p.lines.some((l) => l.lineTotal > MAX_AMOUNT_VND)) out.push({ code: "amount", message: "Thành tiền vượt giới hạn." });
    }
    return out;
  }
  if (d.name.trim() === "") out.push({ code: "name", message: "Nhập tên dịch vụ." });
  if (d.guests > MAX_GUESTS_PER_SERVICE) out.push({ code: "too_many_guests", message: `Tối đa ${MAX_GUESTS_PER_SERVICE} khách.` });
  if (d.lines.length === 0) out.push({ code: "no_lines", message: "Thêm ít nhất một dòng tiền." });
  if (d.lines.length > MAX_LINES_PER_ORDER) out.push({ code: "too_many_lines", message: `Tối đa ${MAX_LINES_PER_ORDER} dòng tiền.` });
  d.lines.forEach((l, i) => {
    if (l.description.trim() === "") out.push({ code: "line_description", message: `Dòng ${i + 1}: nhập mô tả.` });
    if (l.quantity < 1) out.push({ code: "line_quantity", message: `Dòng ${i + 1}: số lượng tối thiểu là 1.` });
    if (thanhTienDong(l) > MAX_AMOUNT_VND) out.push({ code: "amount", message: `Dòng ${i + 1}: thành tiền vượt giới hạn.` });
  });
  return out;
}

/** Số dòng tiền của cả đơn (dịch vụ danh mục: số dòng xem trước; nhập tay: số dòng đã nhập). */
export function totalLines(drafts: readonly ServiceDraft[]): number {
  return drafts.reduce((n, d) => {
    const p = previewLines(d);
    return n + (p.ok ? p.lines.length : 0);
  }, 0);
}

export const canAddService = (drafts: readonly ServiceDraft[]): boolean => drafts.length < MAX_SERVICES;

/**
 * Lỗi cấp đơn: trần 20 dịch vụ và 50 dòng tiền; ADR-0114 D3 — tổng người đi kèm (người lớn + người cao tuổi) của CẢ ĐƠN bằng 0 thì báo `CAU_THIEU_NGUOI_LON`. Đây là luật cấp đơn
 * nên KHÔNG nằm ở `draftIssues` (từng dịch vụ vẫn chỉ đòi "ít nhất 1 khách không phải em bé" — `no_paying_guests`); dịch vụ nhập tay đếm số khách là người lớn, đúng như thân gửi
 * lên (`toServiceInput`). Đơn chưa có dịch vụ nào thì không báo thêm (biểu mẫu đã có dòng "Thêm ít nhất một dịch vụ."). Báo sớm thôi — máy chủ chặn thật ở lập đơn / lưu nháp / xác nhận.
 */
export function orderIssues(drafts: readonly ServiceDraft[]): string[] {
  const out: string[] = [];
  if (drafts.length > MAX_SERVICES) out.push(`Đơn tối đa ${MAX_SERVICES} dịch vụ.`);
  if (totalLines(drafts) > MAX_LINES_PER_ORDER) out.push(`Đơn tối đa ${MAX_LINES_PER_ORDER} dòng tiền.`);
  if (drafts.length > 0 && donThieuNguoiLon(drafts.map((d) => (d.kind === "catalog" ? d.pax : { adult: d.guests })))) out.push(CAU_THIEU_NGUOI_LON);
  return out;
}

// ---- thân gửi lên máy chủ ----------------------------------------------------------------------------------------------

/**
 * `ServiceInput`: KHÔNG gửi số lượng dòng của dịch vụ danh mục (máy chủ tự sinh); chỉ gửi đơn giá và giá danh mục ĐÃ XEM của loại có khách.
 * Chặng: LUÔN gửi khoá `legs` (kể cả []) — máy chủ đòi mọi dịch vụ cùng có khoá; KHÔNG gửi hai khoá cũ `pickupTime`/`pickupPlace` (ADR-0047 Phần B).
 * `guiSoVe` = người dùng có ô `order.trip.edit` (mới gửi số người chiều về — `legInput`).
 */
export function toServiceInput(d: ServiceDraft, guiSoVe = false): ServiceInput {
  const { pickupTime: _gio, pickupPlace: _noi, ...chuyen } = d.trip;
  const id = { ...(d.id === null ? {} : { id: d.id }), legs: d.legs.map((l) => legInput(l, guiSoVe)) };
  if (d.kind === "manual") {
    return {
      ...id, kind: "manual", name: d.name.trim(), pax: { ...zeroPax(), adult: d.guests },
      items: d.lines.map((l) => ({ description: l.description.trim(), detail: l.detail.trim(), quantity: l.quantity, unitPrice: l.unitPrice })),
      ...chuyen,
    };
  }
  const unitPrices: Partial<Record<PaxCode, number>> = {};
  const catalogPriceSeen: Partial<Record<PaxCode, number>> = {};
  for (const c of PAX_ORDER) {
    if (d.pax[c] <= 0) continue;
    const seen = d.item.prices[c];
    if (seen !== null) catalogPriceSeen[c] = seen;
    unitPrices[c] = d.unitPrices[c] ?? seen ?? 0;
  }
  return { ...id, kind: "catalog", catalogCode: d.code, pax: { ...d.pax }, unitPrices, catalogPriceSeen, ...chuyen };
}

// ---- tóm tắt tiền ---------------------------------------------------------------------------------------------------------

export interface OrderSummary {
  subtotal: number;
  discount: number;
  total: number;
  /** Số "thanh toán trước" người lập vừa gõ (ghi thành LẦN THU sau khi lưu — sổ tiền lượt 1). KHÔNG có "còn lại": số đó chỉ billing tính (ADR-0026 đ9, NT-R9). */
  traTruoc: number;
  /** Cảnh báo (không chặn): giảm giá lớn hơn tạm tính / trả trước lớn hơn tổng cộng. */
  warning: string | null;
}

/** Chỉ để xem trước; số chính thức do máy chủ tính lại khi lưu. */
export function orderSummary(drafts: readonly ServiceDraft[], discount: number, traTruoc: number): OrderSummary {
  const subtotal = drafts.reduce((sum, d) => sum + draftSubtotal(d), 0);
  const total = subtotal - discount;
  const warning = discount > subtotal ? "Giảm giá đang lớn hơn tạm tính." : traTruoc > total ? "Thanh toán trước đang lớn hơn tổng cộng." : null;
  return { subtotal, discount, total, traTruoc, warning };
}
