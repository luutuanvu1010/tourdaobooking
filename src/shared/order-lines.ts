// Sinh dòng đơn hàng từ một dịch vụ trong danh mục (spec §2.4-6, HANDOFF-M3). Logic thuần, dùng chung cho giao diện và test.
// Khớp cách tính của module booking tourdaovn (quote.ts): khách chia 4 loại adult/child/senior/infant, mỗi loại có giá thì một dòng;
// dịch vụ tính theo nhóm (perNPax) nhập theo SỐ KHÁCH, số lượng dòng = ceil(số khách / cỡ nhóm) LƯỢT.

export type PaxCode = "adult" | "child" | "senior" | "infant";
export const PAX_ORDER: readonly PaxCode[] = ["adult", "child", "senior", "infant"];
export const PAX_LABEL: Record<PaxCode, string> = { adult: "Người lớn", child: "Trẻ em", senior: "Người cao tuổi", infant: "Em bé" };

export type Prices = Record<PaxCode, number | null>;

export interface CatalogService {
  code: string;
  name: string;
  /** Chuỗi đơn vị của Sheet: "perPax", "per5Pax"… */
  unit: string;
  prices: Prices;
  notes: Record<Exclude<PaxCode, "adult">, string | null>;
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

export interface GeneratedLine {
  description: string;
  detail: string;
  quantity: number;
  unitPrice: number;
}

export type LinesResult = { ok: true; lines: GeneratedLine[] } | { ok: false; message: string };

const MAX_COUNT = 100_000;

export function buildLines(item: CatalogService, counts: Partial<Record<PaxCode, number>>): LinesResult {
  const unit = parseUnit(item.unit);
  if (unit.kind === "unknown") return { ok: false, message: `Dịch vụ này dùng đơn vị "${unit.raw}" mà hệ thống chưa hỗ trợ — hãy nhập tay.` };
  for (const c of PAX_ORDER) {
    const n = counts[c] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > MAX_COUNT) return { ok: false, message: `Số lượng ${PAX_LABEL[c].toLowerCase()} không hợp lệ.` };
  }

  if (unit.kind === "group") {
    const guests = counts.adult ?? 0;
    if (guests <= 0) return { ok: false, message: "Nhập số khách." };
    if (item.prices.adult === null) return { ok: false, message: "Dịch vụ này chưa có giá." };
    return {
      ok: true,
      lines: [{ description: item.name, detail: `${guests} khách (giá mỗi nhóm tối đa ${unit.size} khách)`, quantity: Math.ceil(guests / unit.size), unitPrice: item.prices.adult }],
    };
  }

  const lines: GeneratedLine[] = [];
  for (const c of PAX_ORDER) {
    const n = counts[c] ?? 0;
    if (n <= 0) continue;
    const price = item.prices[c];
    if (price === null) return { ok: false, message: `Dịch vụ này không có giá cho ${PAX_LABEL[c].toLowerCase()}.` };
    lines.push({ description: `${item.name} — ${PAX_LABEL[c]}`, detail: c === "adult" ? "" : (item.notes[c] ?? ""), quantity: n, unitPrice: price });
  }
  return lines.length ? { ok: true, lines } : { ok: false, message: "Nhập số khách ít nhất một loại." };
}
