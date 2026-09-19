// Sinh dòng đơn hàng từ một dịch vụ trong danh mục (spec §2.4-6, HANDOFF-M3). Logic thuần, dùng chung cho giao diện và máy chủ.
// Khớp cách tính của module booking tourdaovn (quote.ts): khách chia 4 loại adult/child/senior/infant, mỗi loại có giá thì một dòng;
// dịch vụ tính theo nhóm (perNPax) nhập theo SỐ KHÁCH, số lượng dòng = ceil(số khách / cỡ nhóm) LƯỢT.

export type PaxCode = "adult" | "child" | "senior" | "infant";
export const PAX_ORDER: readonly PaxCode[] = ["adult", "child", "senior", "infant"];
export const PAX_LABEL: Record<PaxCode, string> = { adult: "Người lớn", child: "Trẻ em", senior: "Người cao tuổi", infant: "Em bé" };

export type Prices = Record<PaxCode, number | null>;
export type PaxCounts = Record<PaxCode, number>;

/** Trần mọi số tiền VNĐ (100 tỷ) — chặn số phi lý, giữ mọi phép cộng/nhân trong số nguyên an toàn. */
export const MAX_AMOUNT_VND = 100_000_000_000;

/** Trần số khách của MỘT dịch vụ trong đơn (tổng các loại). Nguồn duy nhất: luật máy chủ, `buildLines` và giao diện cùng dùng. */
export const MAX_GUESTS_PER_SERVICE = 50;

/** Dạng hợp lệ của "Mã tour" trong danh mục (Sheet → catalog_item.code → order_item.catalog_code). */
export const CATALOG_CODE_RE = /^[A-Za-z0-9._-]{1,40}$/;

export interface CatalogService {
  code: string;
  name: string;
  /** Chuỗi đơn vị của Sheet: "perPax", "per5Pax"… */
  unit: string;
  prices: Prices;
  notes: Record<Exclude<PaxCode, "adult">, string | null>;
}

/** Dịch vụ danh mục ở dạng bán được: giá hiệu lực (đã áp ghi đè của Admin) + đang hiện hay không (còn trong Sheet và không bị ẩn). */
export interface EffectiveService extends CatalogService {
  visible: boolean;
}

export type Unit = { kind: "perPax" } | { kind: "group"; size: number } | { kind: "unknown"; raw: string };

/** perPax → tính theo người; per5Pax (perNPax, N ≥ 2) → giá mỗi nhóm tối đa N khách; còn lại chưa hỗ trợ. */
export function parseUnit(raw: string): Unit {
  const unit = raw.trim();
  if (unit === "perPax") return { kind: "perPax" };
  const m = /^per(\d{1,3})Pax$/.exec(unit);
  if (m && Number(m[1]) >= 2) return { kind: "group", size: Number(m[1]) };
  return { kind: "unknown", raw: unit };
}

/** Loại khách hiện bộ đếm: theo người → mọi loại có giá; theo nhóm → chỉ "số khách" (adult); đơn vị lạ → không có. */
export function availableCodes(item: CatalogService): PaxCode[] {
  const unit = parseUnit(item.unit);
  if (unit.kind === "group") return item.prices.adult === null ? [] : ["adult"];
  if (unit.kind === "unknown") return [];
  return PAX_ORDER.filter((c) => item.prices[c] !== null);
}

/** Tổng số khách mọi loại. Dịch vụ chỉ một loại giá (giá chung/nhóm): số khách nằm ở `adult`, các loại khác luôn 0. */
export const paxTotal = (pax: Partial<Record<PaxCode, number>>): number => PAX_ORDER.reduce((n, c) => n + (pax[c] ?? 0), 0);

/** Khách tính tiền: mọi loại trừ em bé. */
export const payingGuests = (pax: Partial<Record<PaxCode, number>>): number => (pax.adult ?? 0) + (pax.child ?? 0) + (pax.senior ?? 0);

export interface GeneratedLine {
  /** Mã dịch vụ nguồn — lưu vào order_item.catalog_code để truy vết. */
  catalogCode: string;
  /** Loại khách của dòng (dịch vụ tính theo nhóm: "adult" = số khách). */
  pax: PaxCode;
  description: string;
  detail: string;
  quantity: number;
  /** Đơn giá thực tế của dòng: giá do người dùng nhập (nếu có) hoặc giá danh mục. */
  unitPrice: number;
  /** Giá danh mục hiệu lực lúc sinh dòng — để lệch giá còn truy được về sau. */
  catalogPrice: number;
}

export type LinesResult = { ok: true; lines: GeneratedLine[] } | { ok: false; message: string };

/** Độ lệch đơn giá so với giá danh mục lúc lập dòng (dương = cao hơn); null = khớp hoặc dòng nhập tay. Một nguồn cho trang đơn, form và nhật ký. */
export function priceDeviation(line: { unitPrice: number; catalogPrice: number | null }): number | null {
  return line.catalogPrice !== null && line.catalogPrice !== line.unitPrice ? line.unitPrice - line.catalogPrice : null;
}

/**
 * Sinh dòng tiền cho `counts` khách. `unitPrices` (tuỳ chọn) ghi đè đơn giá từng loại (thương lượng); vắng = giá danh mục.
 * Chỉ kiểm khách/đơn vị/giá danh mục; kiểm khoảng của `unitPrices` là việc của luật đơn hàng (orders/service-rules.ts).
 */
export function buildLines(item: CatalogService, counts: Partial<Record<PaxCode, number>>, unitPrices: Partial<Record<PaxCode, number>> = {}): LinesResult {
  const unit = parseUnit(item.unit);
  if (unit.kind === "unknown") return { ok: false, message: `Dịch vụ này dùng đơn vị "${unit.raw}" mà hệ thống chưa hỗ trợ — hãy nhập tay.` };
  for (const c of PAX_ORDER) {
    const n = counts[c] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > MAX_GUESTS_PER_SERVICE) return { ok: false, message: `Số lượng ${PAX_LABEL[c].toLowerCase()} không hợp lệ.` };
  }
  if (paxTotal(counts) > MAX_GUESTS_PER_SERVICE) return { ok: false, message: `Tối đa ${MAX_GUESTS_PER_SERVICE} khách mỗi dịch vụ.` };

  if (unit.kind === "group") {
    const guests = counts.adult ?? 0;
    if (guests <= 0) return { ok: false, message: "Nhập số khách." };
    if (item.prices.adult === null) return { ok: false, message: "Dịch vụ này chưa có giá." };
    return {
      ok: true,
      lines: [
        {
          catalogCode: item.code,
          pax: "adult",
          description: item.name,
          detail: `${guests} khách (giá mỗi nhóm tối đa ${unit.size} khách)`,
          quantity: Math.ceil(guests / unit.size),
          unitPrice: unitPrices.adult ?? item.prices.adult,
          catalogPrice: item.prices.adult,
        },
      ],
    };
  }

  const lines: GeneratedLine[] = [];
  for (const c of PAX_ORDER) {
    const n = counts[c] ?? 0;
    if (n <= 0) continue;
    const price = item.prices[c];
    if (price === null) return { ok: false, message: `Dịch vụ này không có giá cho ${PAX_LABEL[c].toLowerCase()}.` };
    lines.push({
      catalogCode: item.code,
      pax: c,
      description: `${item.name} — ${PAX_LABEL[c]}`,
      detail: c === "adult" ? "" : (item.notes[c] ?? ""),
      quantity: n,
      unitPrice: unitPrices[c] ?? price,
      catalogPrice: price,
    });
  }
  return lines.length ? { ok: true, lines } : { ok: false, message: "Nhập số khách ít nhất một loại." };
}
