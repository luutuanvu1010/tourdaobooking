// Luật thuần cho MỘT dịch vụ trong đơn (docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md §4.2):
// số khách, thông tin chuyến, dòng tiền do MÁY CHỦ sinh, bản chụp cho nháp cũ, điều kiện xác nhận, sửa trường vận hành. Không I/O.
import type { CatalogChangeDto, CatalogStatus, MissingReason, TripGapDto, TripInfoDto } from "../../shared/contracts.ts";
import {
  CATALOG_CODE_RE, MAX_AMOUNT_VND, MAX_GUESTS_PER_SERVICE, PAX_LABEL, PAX_ORDER, buildLines, paxTotal, payingGuests, priceDeviation,
  type CatalogService, type EffectiveService, type PaxCode, type PaxCounts, type Prices,
} from "../../shared/order-lines.ts";
import { MAX_LINES_PER_ORDER, MAX_SERVICES, ONE_DATE_MESSAGE, confirmWindow, tripUpdateKeepsOneDate } from "../../shared/trip-rules.ts";
import { cleanText, dateField, int, text, timeField } from "./fields.ts";

export type { CatalogChangeDto as CatalogChange, CatalogStatus, MissingReason, TripGapDto as TripGap };

// Trần và cửa sổ xác nhận nằm ở shared/trip-rules.ts (giao diện dùng chung một nguồn); xuất lại để orders/rules.ts, repository.ts và test không đổi.
export { MAX_DAYS_AHEAD, MAX_LINES_PER_ORDER, MAX_SERVICES, confirmWindow } from "../../shared/trip-rules.ts";
const MAX_QUANTITY = 100_000;

/** Thông tin chuyến đã chuẩn hoá (rỗng → null). Cùng hình dạng với DTO trả ra. */
export type ValidTrip = TripInfoDto;

export interface ValidItem {
  /** Mã dịch vụ nguồn khi dòng sinh từ danh mục; null = nhập tay. Chỉ để truy vết. */
  catalogCode: string | null;
  /** Loại khách của dòng; null = nhập tay. */
  paxCode: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  /** Giá danh mục hiệu lực lúc lập dòng; null = nhập tay. */
  catalogPrice: number | null;
  lineTotal: number;
}

export interface ValidService {
  /** id của dịch vụ đã lưu mà đầu vào này trỏ tới (giữ id ổn định qua các lần sửa); null = dịch vụ mới. */
  id: string | null;
  kind: "catalog" | "manual";
  catalogCode: string | null;
  name: string;
  /** Chuỗi đơn vị của Sheet lúc lập; "manual" = nhập tay. */
  unit: string;
  pax: PaxCounts;
  trip: ValidTrip;
  items: ValidItem[];
}

/** Dịch vụ đã lưu của đơn đang sửa (từ D1), đủ để dựng lại "bản chụp". */
export interface StoredService {
  id: string;
  catalogCode: string | null;
  name: string;
  unit: string;
  pax: PaxCounts;
  items: { paxCode: PaxCode | null; detail: string | null; catalogPrice: number | null }[];
}

export interface ServiceContext {
  /** Danh mục hiệu lực theo mã (kể cả dịch vụ đang ẩn — có cờ `visible`). */
  catalog: ReadonlyMap<string, EffectiveService>;
  stored: readonly StoredService[];
}

export type ServiceFailure = { ok: false; message: string; code?: "catalog_changed" | "catalog_unavailable"; details?: unknown };
export type ServiceResult = { ok: true; value: ValidService } | ServiceFailure;

const fail = (message: string, extra: Omit<ServiceFailure, "ok" | "message"> = {}): ServiceFailure => ({ ok: false, message, ...extra });

// ---- Thông tin chuyến --------------------------------------------------------------------------------------------

export type TripResult = { ok: true; value: ValidTrip } | ServiceFailure;

export function validateTrip(s: Record<string, unknown>, at: string): TripResult {
  const departDate = dateField(s.departDate, `${at}: ngày khởi hành`);
  const departTime = timeField(s.departTime, `${at}: giờ khởi hành`);
  const pickupTime = timeField(s.pickupTime, `${at}: giờ đón`);
  const pickupPlace = cleanText(s.pickupPlace, `${at}: điểm đón`, 200, false);
  const checkinDate = dateField(s.checkinDate, `${at}: ngày check-in`);
  const checkinTime = timeField(s.checkinTime, `${at}: giờ check-in`);
  const checkinPlace = cleanText(s.checkinPlace, `${at}: nơi check-in`, 200, false);
  const note = cleanText(s.note, `${at}: ghi chú`, 1000, true);
  const bad = [departDate, departTime, pickupTime, pickupPlace, checkinDate, checkinTime, checkinPlace, note].find((f) => f.error);
  if (bad) return fail(bad.error!);
  return {
    ok: true,
    value: {
      departDate: departDate.value, departTime: departTime.value, pickupTime: pickupTime.value, pickupPlace: pickupPlace.value,
      checkinDate: checkinDate.value, checkinTime: checkinTime.value, checkinPlace: checkinPlace.value, note: note.value,
    },
  };
}

// ---- Số khách và bảng giá ----------------------------------------------------------------------------------------

function validatePax(v: unknown, at: string): { ok: true; value: PaxCounts } | ServiceFailure {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail(`${at}: thiếu số khách.`);
  const o = v as Record<string, unknown>;
  const value: PaxCounts = { adult: 0, child: 0, senior: 0, infant: 0 };
  for (const c of PAX_ORDER) {
    const r = int(o[c], `${at}: số khách ${PAX_LABEL[c].toLowerCase()}`, 0, MAX_GUESTS_PER_SERVICE, 0);
    if (r.error) return fail(r.error);
    value[c] = r.value;
  }
  if (paxTotal(value) > MAX_GUESTS_PER_SERVICE) return fail(`${at}: tối đa ${MAX_GUESTS_PER_SERVICE} khách mỗi dịch vụ.`);
  return { ok: true, value };
}

function priceMap(v: unknown, label: string): { ok: true; value: Partial<Record<PaxCode, number>> } | ServiceFailure {
  if (v === undefined || v === null) return { ok: true, value: {} };
  if (typeof v !== "object" || Array.isArray(v)) return fail(`${label} không hợp lệ.`);
  const out: Partial<Record<PaxCode, number>> = {};
  for (const [k, n] of Object.entries(v)) {
    if (!PAX_ORDER.includes(k as PaxCode)) return fail(`${label}: loại khách "${k}" không hợp lệ.`);
    const r = int(n, `${label} ${PAX_LABEL[k as PaxCode].toLowerCase()}`, 0, MAX_AMOUNT_VND);
    if (r.error) return fail(r.error);
    out[k as PaxCode] = r.value;
  }
  return { ok: true, value: out };
}

const samePax = (a: PaxCounts, b: PaxCounts): boolean => PAX_ORDER.every((c) => a[c] === b[c]);

/**
 * Dựng lại dịch vụ danh mục từ những gì đã lưu (Q11: nháp cũ giữ bản chụp). Trả null nếu dòng đã lưu thiếu loại khách / giá danh mục
 * (không dùng được) — khi đó dịch vụ được xử lý như dịch vụ mới.
 */
export function snapshotService(st: StoredService): CatalogService | null {
  if (st.catalogCode === null || st.items.length === 0) return null;
  const prices: Prices = { adult: null, child: null, senior: null, infant: null };
  const notes: CatalogService["notes"] = { child: null, senior: null, infant: null };
  for (const it of st.items) {
    if (it.paxCode === null || it.catalogPrice === null) return null;
    prices[it.paxCode] = it.catalogPrice;
    if (it.paxCode !== "adult") notes[it.paxCode] = it.detail;
  }
  return { code: st.catalogCode, name: st.name, unit: st.unit, prices, notes };
}

// ---- Dịch vụ từ danh mục -----------------------------------------------------------------------------------------

function catalogService(s: Record<string, unknown>, at: string, index: number, pax: PaxCounts, trip: ValidTrip, ctx: ServiceContext): ServiceResult {
  const code = s.catalogCode;
  if (typeof code !== "string" || !CATALOG_CODE_RE.test(code)) return fail(`${at}: mã dịch vụ không hợp lệ.`);
  const prices = priceMap(s.unitPrices, `${at}: đơn giá`);
  if (!prices.ok) return prices;
  const seen = priceMap(s.catalogPriceSeen, `${at}: giá danh mục đã xem`);
  if (!seen.ok) return seen;
  if (payingGuests(pax) < 1) return fail(`${at}: cần ít nhất 1 khách không phải em bé.`);
  for (const c of Object.keys(prices.value) as PaxCode[]) {
    if (pax[c] === 0) return fail(`${at}: có đơn giá cho ${PAX_LABEL[c].toLowerCase()} nhưng không có khách loại này.`);
  }

  // Q11: dịch vụ đã lưu của CHÍNH đơn này, cùng mã và cùng số khách → giữ bản chụp, không tra danh mục (dịch vụ đã ẩn/đổi giá vẫn sửa được).
  const stored = typeof s.id === "string" ? ctx.stored.find((x) => x.id === s.id) : undefined;
  const kept = stored && stored.catalogCode === code && samePax(stored.pax, pax) ? snapshotService(stored) : null;

  let source: CatalogService;
  if (kept) source = kept;
  else {
    const eff = ctx.catalog.get(code);
    if (!eff || !eff.visible) return fail(`${at}: dịch vụ ${code} không còn trong danh mục — hãy chọn dịch vụ khác hoặc nhập tay.`, { code: "catalog_unavailable" });
    source = eff;
  }

  const built = buildLines(source, pax, prices.value);
  if (!built.ok) return fail(`${at}: ${built.message}`);

  if (!kept) {
    // BK5 (nửa sau): giá danh mục mà form đã hiển thị phải còn đúng lúc lưu, không thì báo khách một giá còn đơn lưu giá khác trong im lặng.
    const changes: CatalogChangeDto[] = [];
    for (const l of built.lines) {
      const s0 = seen.value[l.pax];
      if (s0 === undefined) return fail(`${at}: thiếu giá danh mục đã xem cho ${PAX_LABEL[l.pax].toLowerCase()}.`);
      if (s0 !== l.catalogPrice) changes.push({ serviceIndex: index, catalogCode: code, pax: l.pax, seen: s0, current: l.catalogPrice });
    }
    if (changes.length) return fail(`${at}: giá danh mục vừa thay đổi, hãy xem lại giá rồi lưu.`, { code: "catalog_changed", details: changes });
  }

  const items: ValidItem[] = [];
  for (const l of built.lines) {
    const lineTotal = l.quantity * l.unitPrice;
    if (lineTotal > MAX_AMOUNT_VND) return fail(`${at}: thành tiền vượt giới hạn.`);
    items.push({ catalogCode: code, paxCode: l.pax, description: l.description, detail: l.detail || null, quantity: l.quantity, unitPrice: l.unitPrice, catalogPrice: l.catalogPrice, lineTotal });
  }
  return { ok: true, value: { id: stored?.id ?? null, kind: "catalog", catalogCode: code, name: source.name, unit: source.unit, pax, trip, items } };
}

// ---- Dịch vụ nhập tay --------------------------------------------------------------------------------------------

function manualService(s: Record<string, unknown>, at: string, pax: PaxCounts, trip: ValidTrip, ctx: ServiceContext): ServiceResult {
  const name = text(s.name, `${at}: tên dịch vụ`, 300, true);
  if (name.error) return fail(name.error);
  if (!Array.isArray(s.items) || s.items.length === 0) return fail(`${at}: cần ít nhất một dòng tiền.`);
  if (s.items.length > MAX_LINES_PER_ORDER) return fail(`${at}: tối đa ${MAX_LINES_PER_ORDER} dòng tiền.`);
  const items: ValidItem[] = [];
  for (const [i, raw] of s.items.entries()) {
    const line = `${at}, dòng ${i + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(`${line} không hợp lệ.`);
    const it = raw as Record<string, unknown>;
    const description = text(it.description, `${line}: mô tả`, 300, true);
    if (description.error) return fail(description.error);
    const detail = text(it.detail, `${line}: chi tiết`, 1000, false);
    if (detail.error) return fail(detail.error);
    const quantity = int(it.quantity, `${line}: số lượng`, 1, MAX_QUANTITY, 1);
    if (quantity.error) return fail(quantity.error);
    const unitPrice = int(it.unitPrice, `${line}: đơn giá`, 0, MAX_AMOUNT_VND);
    if (unitPrice.error) return fail(unitPrice.error);
    const lineTotal = quantity.value * unitPrice.value;
    if (lineTotal > MAX_AMOUNT_VND) return fail(`${line}: thành tiền vượt giới hạn.`);
    items.push({ catalogCode: null, paxCode: null, description: description.value!, detail: detail.value, quantity: quantity.value, unitPrice: unitPrice.value, catalogPrice: null, lineTotal });
  }
  const stored = typeof s.id === "string" ? ctx.stored.find((x) => x.id === s.id) : undefined;
  return { ok: true, value: { id: stored?.id ?? null, kind: "manual", catalogCode: null, name: name.value!, unit: "manual", pax, trip, items } };
}

export function validateService(raw: unknown, index: number, ctx: ServiceContext): ServiceResult {
  const at = `Dịch vụ ${index + 1}`;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(`${at} không hợp lệ.`);
  const s = raw as Record<string, unknown>;
  if (s.kind !== "catalog" && s.kind !== "manual") return fail(`${at}: loại dịch vụ không hợp lệ.`);
  const trip = validateTrip(s, at);
  if (!trip.ok) return trip;
  const pax = validatePax(s.pax, at);
  if (!pax.ok) return pax;
  return s.kind === "catalog" ? catalogService(s, at, index, pax.value, trip.value, ctx) : manualService(s, at, pax.value, trip.value, ctx);
}

// ---- Xác nhận đơn (Q4 + Q12) -------------------------------------------------------------------------------------

/** Dịch vụ nào chưa đủ điều kiện xác nhận. Mảng rỗng = xác nhận được. */
export function confirmGaps(services: readonly { id: string; name: string; departDate: string | null; pax: PaxCounts }[], today: string): TripGapDto[] {
  const { from, to } = confirmWindow(today);
  const gaps: TripGapDto[] = [];
  for (const sv of services) {
    const reasons: MissingReason[] = [];
    if (!sv.departDate) reasons.push("no_date");
    else if (sv.departDate < from) reasons.push("past_date");
    else if (sv.departDate > to) reasons.push("too_far");
    if (paxTotal(sv.pax) < 1) reasons.push("no_guests");
    if (reasons.length) gaps.push({ serviceId: sv.id, name: sv.name, reasons });
  }
  return gaps;
}

// ---- Trạng thái so với danh mục hiện tại (chỉ để hiển thị cho đơn nháp) -----------------------------------------------

export function catalogStatusOf(
  svc: { catalogCode: string | null; unit: string; items: { paxCode: PaxCode | null; catalogPrice: number | null }[] },
  eff: EffectiveService | undefined,
): CatalogStatus | null {
  if (svc.catalogCode === null) return null;
  if (!eff || !eff.visible || eff.unit !== svc.unit) return "unavailable";
  for (const it of svc.items) if (it.paxCode !== null && it.catalogPrice !== null && eff.prices[it.paxCode] !== it.catalogPrice) return "price_changed";
  return "ok";
}

// ---- Sửa trường vận hành (Q9) ----------------------------------------------------------------------------------

export interface TripUpdate {
  expectedUpdatedAt: string;
  updates: { id: string; trip: ValidTrip }[];
}
export type TripUpdateResult = { ok: true; value: TripUpdate } | { ok: false; message: string };

/**
 * `PUT /api/orders/:id/trip`. Đơn nháp: trường nào cũng tuỳ chọn, không kiểm khoảng ngày (Q12: nháp luôn lưu được).
 * Đơn đã xác nhận: ngày khởi hành không được xoá; nếu ĐỔI ngày thì ngày mới phải trong khoảng cho phép (ghi chú chuyến đã đi vẫn sửa được).
 */
export function validateTripUpdate(
  input: unknown,
  stored: readonly { id: string; departDate: string | null }[],
  status: "draft" | "confirmed",
  today: string,
): TripUpdateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "Dữ liệu không hợp lệ." };
  const b = input as Record<string, unknown>;
  if (typeof b.expectedUpdatedAt !== "string" || !b.expectedUpdatedAt) return { ok: false, message: "Thiếu expectedUpdatedAt." };
  if (!Array.isArray(b.services) || b.services.length === 0) return { ok: false, message: "Cần ít nhất một dịch vụ để cập nhật." };
  if (b.services.length > MAX_SERVICES) return { ok: false, message: `Tối đa ${MAX_SERVICES} dịch vụ.` };
  const { from, to } = confirmWindow(today);
  const seen = new Set<string>();
  const updates: TripUpdate["updates"] = [];
  for (const [i, raw] of b.services.entries()) {
    const at = `Dịch vụ ${i + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: `${at} không hợp lệ.` };
    const s = raw as Record<string, unknown>;
    const cur = typeof s.id === "string" ? stored.find((x) => x.id === s.id) : undefined;
    if (!cur) return { ok: false, message: `${at}: không thuộc đơn này.` };
    if (seen.has(cur.id)) return { ok: false, message: `${at}: trùng dịch vụ.` };
    seen.add(cur.id);
    const trip = validateTrip(s, at);
    if (!trip.ok) return { ok: false, message: trip.message };
    if (status === "confirmed") {
      const d = trip.value.departDate;
      if (!d) return { ok: false, message: `${at}: đơn đã xác nhận phải có ngày khởi hành.` };
      if (d !== cur.departDate && (d < from || d > to)) return { ok: false, message: `${at}: ngày khởi hành phải từ ${from} đến ${to}.` };
    }
    updates.push({ id: cur.id, trip: trip.value });
  }
  if (!tripUpdateKeepsOneDate(stored, updates.map((u) => ({ id: u.id, departDate: u.trip.departDate })))) return { ok: false, message: ONE_DATE_MESSAGE }; // ADR-0021
  return { ok: true, value: { expectedUpdatedAt: b.expectedUpdatedAt, updates } };
}

// ---- Mô tả cho nhật ký -------------------------------------------------------------------------------------------
// Nhật ký KHÔNG ghi giá trị chuỗi tự do (điểm đón, nơi check-in, ghi chú là dữ liệu cá nhân của khách) — chỉ ghi "đổi".

const vnd = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;

/** "lệch giá danh mục: TD101 người lớn 850.000 ₫ → 800.000 ₫; …" — chỉ mã dịch vụ, loại khách, số tiền. undefined nếu không dòng nào lệch. */
export function summarizeDeviations(
  items: readonly { catalogCode: string | null; paxCode: PaxCode | null; unitPrice: number; catalogPrice: number | null }[],
  maxLines = 5,
): string | undefined {
  const dev = items.filter((i) => priceDeviation(i) !== null);
  if (dev.length === 0) return undefined;
  const shown = dev.slice(0, maxLines).map((i) => `${i.catalogCode ?? "?"} ${i.paxCode ? PAX_LABEL[i.paxCode].toLowerCase() : ""} ${vnd(i.catalogPrice!)} → ${vnd(i.unitPrice)}`.replace(/\s+/g, " "));
  const more = dev.length > maxLines ? [`… và ${dev.length - maxLines} dòng khác`] : [];
  return `lệch giá danh mục: ${[...shown, ...more].join("; ")}`;
}

const TRIP_VALUE_FIELDS = [
  ["departDate", "ngày khởi hành"], ["departTime", "giờ khởi hành"], ["pickupTime", "giờ đón"], ["checkinDate", "ngày check-in"], ["checkinTime", "giờ check-in"],
] as const;
const TRIP_TEXT_FIELDS = [["pickupPlace", "điểm đón"], ["checkinPlace", "nơi check-in"], ["note", "ghi chú"]] as const;

/** Thay đổi chuyến của một dịch vụ: ngày/giờ ghi "trước → sau", địa điểm/ghi chú chỉ ghi "đổi". null = không đổi gì. */
export function describeTripChange(name: string, before: ValidTrip, after: ValidTrip): string | null {
  const parts: string[] = [];
  for (const [k, label] of TRIP_VALUE_FIELDS) if (before[k] !== after[k]) parts.push(`${label} ${before[k] ?? "(trống)"} → ${after[k] ?? "(trống)"}`);
  for (const [k, label] of TRIP_TEXT_FIELDS) if (before[k] !== after[k]) parts.push(`đổi ${label}`);
  return parts.length ? `${name}: ${parts.join(", ")}` : null;
}

/** Gộp thay đổi của nhiều dịch vụ thành một dòng nhật ký. null = không có gì đổi (route khỏi ghi). */
export function describeTripUpdates(stored: readonly { id: string; name: string; trip: ValidTrip }[], updates: readonly { id: string; trip: ValidTrip }[]): string | null {
  const lines = updates.flatMap((u) => {
    const cur = stored.find((s) => s.id === u.id);
    const d = cur ? describeTripChange(cur.name, cur.trip, u.trip) : null;
    return d ? [d] : [];
  });
  return lines.length ? lines.join(" | ") : null;
}
