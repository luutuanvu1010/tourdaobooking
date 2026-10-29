// Luật thuần của nhóm dịch vụ (ADR-0058 Đ2, Đ5): kiểm đầu vào, chọn nhóm cho form, chữ nhật ký. Không import gì ngoài `shared` (bài kiểm nạp thẳng bằng Node).
import { CATALOG_CODE_RE } from "../../shared/order-lines.ts";
import type { QuyTacDuaDon } from "../../shared/dua-don-dich-vu.ts";

export const TEN_NHOM_TOI_DA = 40;
export const LO_GAN_TOI_DA = 50;
export const CHUA_PHAN_LOAI = "Chưa phân loại";

export type Kiem<T> = { ok: true; value: T } | { ok: false; message: string };

/** Tên nhóm: cắt khoảng trắng hai đầu, 1–40 ký tự. (Trùng tên giữa các nhóm đang dùng do CSDL + máy chủ kiểm, không phải luật thuần.) */
export function kiemTenNhom(raw: unknown): Kiem<string> {
  if (typeof raw !== "string") return { ok: false, message: "Tên nhóm phải là chữ." };
  const ten = raw.trim();
  if (ten.length === 0) return { ok: false, message: "Tên nhóm không được để trống." };
  if (ten.length > TEN_NHOM_TOI_DA) return { ok: false, message: `Tên nhóm dài tối đa ${TEN_NHOM_TOI_DA} ký tự.` };
  return { ok: true, value: ten };
}

/** Lô gán nhóm `{ codes, groupCode }`: 1–50 mã dịch vụ đúng dạng (đếm TRƯỚC khi bỏ trùng), bỏ trùng giữ thứ tự; `groupCode` là chuỗi không rỗng hoặc `null` (Chưa phân loại). */
export function kiemLoGan(raw: unknown): Kiem<{ codes: string[]; groupCode: string | null }> {
  if (typeof raw !== "object" || raw === null) return { ok: false, message: "Dữ liệu gán nhóm không hợp lệ." };
  const { codes, groupCode } = raw as { codes?: unknown; groupCode?: unknown };
  if (!Array.isArray(codes) || codes.length === 0) return { ok: false, message: "Chọn ít nhất một dịch vụ." };
  if (codes.length > LO_GAN_TOI_DA) return { ok: false, message: `Mỗi lần gán tối đa ${LO_GAN_TOI_DA} dịch vụ.` };
  for (const c of codes) if (typeof c !== "string" || !CATALOG_CODE_RE.test(c)) return { ok: false, message: "Có mã dịch vụ không hợp lệ." };
  if (groupCode !== null && (typeof groupCode !== "string" || groupCode.length === 0)) return { ok: false, message: "Nhóm đích không hợp lệ." };
  return { ok: true, value: { codes: [...new Set(codes as string[])], groupCode: groupCode as string | null } };
}

export interface NhomChoForm { code: string; name: string; sortOrder: number; active: boolean }

/** Nhóm cho luật đưa đón (ADR-0118 Đ1): đủ mã, trạng thái dùng và cờ «Có đưa đón». */
export interface NhomDuaDon { code: string; active: boolean; transferEnabled: boolean }

/**
 * ADR-0118 Đ1–Đ2: dịch vụ ở nhóm `groupCode` có được ghi chặng đưa đón không — NGUỒN DUY NHẤT cho `transferEnabled` của DTO (form đơn). Chưa phân loại (`null`), mã nhóm không có,
 * hoặc nhóm đã NGƯNG DÙNG (không còn nghĩa — coi như Chưa phân loại, cùng luật `nhomChoForm`) → LUÔN cho; nhóm đang dùng → theo cờ của nó. Máy chủ (`orders`) quyết bằng view
 * `v_ctl_service_transfer` cùng luật này (bài `src/migrations-dua-don-nhom.test.ts`, `dua-don-nhom-route.test.ts`).
 * ADR-0149 Đ1: `quyTac` là ô riêng của dịch vụ — ALWAYS / NEVER thắng mọi điều trên; GROUP (mặc định) = như trên (bài so khớp `src/migrations-dua-don-dich-vu.test.ts`).
 */
export function choPhepDuaDon(groupCode: string | null, nhoms: readonly NhomDuaDon[], quyTac: QuyTacDuaDon = "GROUP"): boolean {
  if (quyTac !== "GROUP") return quyTac === "ALWAYS";
  if (groupCode === null) return true;
  const g = nhoms.find((x) => x.code === groupCode);
  return g === undefined || !g.active || g.transferEnabled;
}

/**
 * Nhóm cho form đơn (ADR-0058 Đ5): `items` là các dịch vụ ĐANG HIỆN kèm nhóm hiện hành. Dịch vụ thuộc nhóm tắt (hoặc mã nhóm không có) → `groupCode: null`.
 * `groups` chỉ gồm nhóm còn bật có ≥ 1 dịch vụ đang hiện, xếp `sortOrder` rồi tên.
 */
export function nhomChoForm<T extends { groupCode: string | null }>(
  groups: readonly NhomChoForm[],
  items: readonly T[],
): { groups: { code: string; name: string }[]; items: T[] } {
  const bat = new Map(groups.filter((g) => g.active).map((g) => [g.code, g]));
  const moi = items.map((i) => ({ ...i, groupCode: i.groupCode !== null && bat.has(i.groupCode) ? i.groupCode : null }));
  const coDichVu = new Set(moi.map((i) => i.groupCode).filter((c): c is string => c !== null));
  const chon = [...bat.values()]
    .filter((g) => coDichVu.has(g.code))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"))
    .map((g) => ({ code: g.code, name: g.name }));
  return { groups: chon, items: moi };
}

/** Chữ nhật ký `catalog_group_assigned`: "nhóm cũ → nhóm mới" bằng TÊN; `null` là "Chưa phân loại". */
export const moTaDoiNhom = (tenCu: string | null, tenMoi: string | null): string => `${tenCu ?? CHUA_PHAN_LOAI} → ${tenMoi ?? CHUA_PHAN_LOAI}`;
