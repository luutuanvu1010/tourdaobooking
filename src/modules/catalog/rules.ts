// Luật thuần của danh mục: kế hoạch đồng bộ, ghi đè có chủ đích, chốt chặn Sheet hỏng. Không I/O.
import { PAX_LABEL, PAX_ORDER, type EffectiveService, type PaxCode, type Prices } from "../../shared/order-lines.ts";
import type { CatalogInput, PhiDonSheet } from "./sheet.ts";

/** Bản ghi đang lưu trong D1 (phần lấy từ Sheet). */
export interface CatalogRecord {
  code: string;
  name: string;
  unit: string;
  prices: Prices;
  notes: CatalogInput["notes"];
  inSheet: boolean;
}

export interface SyncPlan {
  added: CatalogInput[];
  changed: { input: CatalogInput; changes: string[] }[];
  /** Có trong D1 (đang còn trong Sheet) nhưng không còn trong Sheet → chỉ ẩn. */
  missing: string[];
  /** Đang bán (còn trong Sheet) mà dòng của nó trong Sheet hỏng ở lần đọc này → GIỮ NGUYÊN bản đã lưu, không ẩn (TT1). Dòng thật sự vắng khỏi Sheet vẫn vào `missing`. */
  giuLai: string[];
  unchanged: number;
}

/** Định dạng tiền cho nhật ký: 850000 → "850.000 ₫", null → "(không có)". */
export const money = (n: number | null): string => (n === null ? "(không có)" : `${n.toLocaleString("vi-VN")} ₫`);

export function planSync(existing: Map<string, CatalogRecord>, incoming: CatalogInput[], problems: readonly { code?: string }[] = []): SyncPlan {
  const plan: SyncPlan = { added: [], changed: [], missing: [], giuLai: [], unchanged: 0 };
  const hong = new Set(problems.flatMap((p) => (p.code ? [p.code] : [])));
  const seen = new Set<string>();
  for (const input of incoming) {
    seen.add(input.code);
    const cur = existing.get(input.code);
    if (!cur) {
      plan.added.push(input);
      continue;
    }
    const changes: string[] = [];
    if (!cur.inSheet) changes.push("quay lại Sheet");
    if (cur.name !== input.name) changes.push(`tên "${cur.name}" → "${input.name}"`);
    if (cur.unit !== input.unit) changes.push(`đơn vị ${cur.unit} → ${input.unit}`);
    for (const c of PAX_ORDER) {
      if (cur.prices[c] !== input.prices[c]) changes.push(`giá ${PAX_LABEL[c].toLowerCase()} ${money(cur.prices[c])} → ${money(input.prices[c])}`);
    }
    for (const c of ["child", "senior", "infant"] as const) {
      if (cur.notes[c] !== input.notes[c]) changes.push(`ghi chú ${PAX_LABEL[c].toLowerCase()} đổi`);
    }
    if (changes.length) plan.changed.push({ input, changes });
    else plan.unchanged++;
  }
  for (const [code, rec] of existing) {
    if (!rec.inSheet || seen.has(code)) continue;
    (hong.has(code) ? plan.giuLai : plan.missing).push(code);
  }
  return plan;
}

/** Chặn lần đồng bộ trông như Sheet bị hỏng/xoá nhầm (sẽ ẩn hàng loạt dịch vụ). Trả lý do, hoặc null nếu ổn. */
export function syncGuard(existingInSheet: number, plan: SyncPlan, incomingCount: number): string | null {
  if (incomingCount === 0 && existingInSheet > 0) return "Sheet không còn dịch vụ hợp lệ nào — có thể Sheet bị xoá hoặc đổi cấu trúc.";
  if (existingInSheet >= 4 && plan.missing.length * 2 > existingInSheet) {
    return `Lần đồng bộ này sẽ ẩn ${plan.missing.length}/${existingInSheet} dịch vụ — có thể Sheet bị xoá nhầm.`;
  }
  return null;
}

/** Một dòng Sheet hỏng như đã lưu ở trạng thái đồng bộ. `giuLai`: dịch vụ đang bán được giữ theo bản đã lưu; `daBao`: đã gửi tin cho Quản trị về đúng dòng + lý do này. */
export interface VanDeDongBo { row: number; message: string; code?: string; giuLai?: boolean; daBao?: boolean }

/** Chìa nhận diện «cùng một vấn đề» giữa hai lần đồng bộ: mã + lý do (số dòng đổi do chèn dòng không tính là vấn đề mới). */
export const chiaVanDe = (p: { code?: string; message: string }): string => `${p.code ?? ""}|${p.message}`;

/** Tóm tắt ngắn cho nhật ký (không chứa bí mật): số lượng + tối đa vài thay đổi giá đầu tiên. */
export function summarizePlan(plan: SyncPlan, maxLines = 6): string {
  const parts = [`thêm ${plan.added.length}`, `đổi ${plan.changed.length}`, `ẩn ${plan.missing.length}`];
  const details = plan.changed.slice(0, maxLines).map((c) => `${c.input.code}: ${c.changes.join(", ")}`);
  const more = plan.changed.length > maxLines ? [`… và ${plan.changed.length - maxLines} dịch vụ khác`] : [];
  if (plan.giuLai.length) parts.push(`giữ lại ${plan.giuLai.length} (dòng Sheet sai)`);
  return [parts.join(", "), ...details, ...more].join(" | ");
}

export interface Override {
  hidden: boolean;
  prices: Partial<Record<PaxCode, number>>;
  base: Partial<Record<PaxCode, number | null>>;
}

export interface Effective {
  prices: Prices;
  hidden: boolean;
  overridden: PaxCode[];
  /** Loại khách có ghi đè mà giá Sheet đã ĐỔI kể từ lúc ghi đè → cần admin xem lại. */
  conflicts: { code: PaxCode; base: number | null; current: number | null; override: number }[];
}

export function applyOverride(sheet: Prices, ov: Override | null): Effective {
  const prices: Prices = { ...sheet };
  const overridden: PaxCode[] = [];
  const conflicts: Effective["conflicts"] = [];
  if (ov) {
    for (const c of PAX_ORDER) {
      const v = ov.prices[c];
      if (v === undefined) continue;
      prices[c] = v;
      overridden.push(c);
      const base = ov.base[c] ?? null;
      if (base !== sheet[c]) conflicts.push({ code: c, base, current: sheet[c], override: v });
    }
  }
  return { prices, hidden: ov?.hidden ?? false, overridden, conflicts };
}

export type OverridePatch = { hidden?: boolean; prices?: Partial<Record<PaxCode, number | null>> };

/** Áp một yêu cầu sửa lên ghi đè hiện có. `number` = đặt ghi đè cho loại đó, `null` = bỏ ghi đè loại đó. Trả ghi đè mới (hoặc null nếu không còn gì). */
export function patchOverride(sheet: Prices, current: Override | null, patch: OverridePatch): Override | null {
  const next: Override = { hidden: current?.hidden ?? false, prices: { ...(current?.prices ?? {}) }, base: { ...(current?.base ?? {}) } };
  if (patch.hidden !== undefined) next.hidden = patch.hidden;
  for (const c of PAX_ORDER) {
    const v = patch.prices?.[c];
    if (v === undefined) continue;
    if (v === null) {
      delete next.prices[c];
      delete next.base[c];
    } else {
      // Giữ nguyên `base` nếu loại này đã ghi đè từ trước; chỉ chụp giá Sheet ở lần ghi đè đầu tiên.
      if (!(c in next.prices)) next.base[c] = sheet[c];
      next.prices[c] = v;
    }
  }
  return next.hidden || Object.keys(next.prices).length ? next : null;
}

/** "Giữ ghi đè": xác nhận đã xem thay đổi của Sheet — chụp lại giá Sheet hiện tại làm mốc mới. */
export function acknowledge(sheet: Prices, ov: Override): Override {
  const base: Override["base"] = {};
  for (const c of Object.keys(ov.prices) as PaxCode[]) base[c] = sheet[c];
  return { ...ov, base };
}

/**
 * Dịch vụ như bên bán hàng dùng: giá hiệu lực (đã áp ghi đè của Admin) + `visible` = còn trong Sheet và không bị Admin ẩn.
 * MỘT nguồn cho "đang hiện / giá hiệu lực": danh mục công khai (`GET /api/catalog`, `GET /api/catalog/for-order`) và luật đơn hàng cùng gọi hàm này.
 */
export function toEffective(s: CatalogRecord & { override: Override | null }): EffectiveService {
  const eff = applyOverride(s.prices, s.override);
  return { code: s.code, name: s.name, unit: s.unit, prices: eff.prices, notes: s.notes, visible: s.inSheet && !eff.hidden };
}

// ---------------------------------------------------------------------------------------------------------------------
// Giá gốc phí đưa đón từ Sheet (ADR-0218 Đ1.3). Thuần: nhận giá hiện hành đã lưu + phần đã đọc từ Sheet, trả các dòng cần ghi và vấn đề cần báo.
// ---------------------------------------------------------------------------------------------------------------------
export type GiaGocPhiDon = { moiKhach: number | null; xeRieng: number | null };

export function kePhiDonGoc(
  cu: ReadonlyMap<string, GiaGocPhiDon>,
  sheet: PhiDonSheet,
): { ghi: { catalogCode: string; moiKhach: number | null; xeRieng: number | null }[]; vanDe: VanDeDongBo[] } {
  const vanDe: VanDeDongBo[] = [];
  const daTungCo = (cot: keyof GiaGocPhiDon) => [...cu.values()].some((v) => v[cot] !== null);
  if (!sheet.coCotMoiKhach && daTungCo("moiKhach")) vanDe.push({ row: 0, message: "Cột «Phí đưa đón» không còn trên Sheet; giữ giá gốc cũ" });
  if (!sheet.coCotXeRieng && daTungCo("xeRieng")) vanDe.push({ row: 0, message: "Cột «Phí đưa đón xe riêng» không còn trên Sheet; giữ giá gốc cũ" });
  for (const l of sheet.loiO) vanDe.push({ row: l.row, code: l.code, message: l.message });
  const hong = new Set(sheet.loiO.map((l) => `${l.code}|${l.cot}`));
  const ghi: { catalogCode: string; moiKhach: number | null; xeRieng: number | null }[] = [];
  for (const [ma, o] of sheet.theoMa) {
    const truoc = cu.get(ma) ?? { moiKhach: null, xeRieng: null };
    const moiKhach = sheet.coCotMoiKhach && !hong.has(`${ma}|moi_khach`) ? o.moiKhach : truoc.moiKhach;
    const xeRieng = sheet.coCotXeRieng && !hong.has(`${ma}|xe_rieng`) ? o.xeRieng : truoc.xeRieng;
    if (moiKhach !== truoc.moiKhach || xeRieng !== truoc.xeRieng) ghi.push({ catalogCode: ma, moiKhach, xeRieng });
  }
  return { ghi, vanDe };
}
