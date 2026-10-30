// LUẬT THUẦN của luật bán theo loại đối tác (ADR-0146 Đ2; ADR-0152 Đ2, Đ5; kế hoạch 2026-10-30 R-1, R-3, T4). Không I/O, không import module khác.
// MỘT phép xét (`chanBan`) cho mọi cửa ghi đơn và bộ lọc danh mục — gọi qua hàm công bố của `pricing` (T6), không viết phép thứ hai ở `orders`.
// Hiệu lực dùng CHUNG `hieuLuc` của rules.ts (ngày dân sự Việt Nam, gồm cả hai đầu). Giá trị đặc điểm của dịch vụ là giá trị HIỆU LỰC đã đọc từ view
// `v_ctl_service_attribute` (riêng thắng chung tính ở view — không tính lại ở đây). Mã không biết loại, nhóm, đặc điểm nào: chỉ so khoá với khoá.
import { addDays } from "../../shared/vn-date.ts";
import { MA_RE, docGhiChu, hieuLuc, laNgay } from "./rules.ts";

type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
export type PhamViLuatBan = "SERVICE" | "GROUP" | "ATTRIBUTE";
const PHAM_VI: readonly PhamViLuatBan[] = ["SERVICE", "GROUP", "ATTRIBUTE"];

/** Một dòng `prc_sales_block` (đã đọc). */
export interface DongLuatBan {
  id: string;
  roleTypeCode: string;
  scope: PhamViLuatBan;
  catalogCode: string | null;
  groupCode: string | null;
  attributeCode: string | null;
  valueCode: string | null;
  validFrom: string;
  validTo: string | null;
}
/** Một dịch vụ có mã của đơn: nhóm HIỆN HÀNH (`null` = Chưa phân loại / nhóm tắt) và giá trị hiệu lực theo từng đặc điểm (`attributeCode → valueCode`; vắng = chưa khai). */
export interface DichVuXet { code: string; nhom: string | null; giaTri: ReadonlyMap<string, string> }
/** Một lần trúng luật: mã dịch vụ + luật trúng; với luật theo đặc điểm kèm mã đặc điểm / giá trị để lấy TÊN qua hàm công bố của catalog. */
export interface TrungLuat { catalogCode: string; luatId: string; roleTypeCode: string; scope: PhamViLuatBan; attributeCode: string | null; valueCode: string | null }

/** Một luật có phủ một dịch vụ không (ADR-0152 Đ2, ba vế). Dịch vụ chưa khai đặc điểm thì vế 3 không phủ (Đ5). */
function phu(l: DongLuatBan, d: DichVuXet): boolean {
  if (l.scope === "SERVICE") return l.catalogCode === d.code;
  if (l.scope === "GROUP") return l.groupCode !== null && l.groupCode === d.nhom;
  if (l.attributeCode === null || l.valueCode === null) return false;
  if (d.giaTri.get(l.attributeCode) !== l.valueCode) return false;
  return l.groupCode === null || l.groupCode === d.nhom;
}

/**
 * ADR-0146 Đ2 + ADR-0152 Đ2: dịch vụ bị chặn khi bên đặt mang ít nhất một loại có luật còn hiệu lực ở `ngay` (giờ Việt Nam lúc thao tác) phủ dịch vụ đó. Luật cộng dồn
 * kiểu «chặn thắng», không thứ tự ưu tiên. Không mang loại nào ⇒ rỗng. Thứ tự kết quả: thứ tự dòng đơn, rồi thứ tự luật — câu báo dùng phần tử đầu.
 */
export function chanBan(v: { vaiBenDat: readonly string[]; luat: readonly DongLuatBan[]; dichVu: readonly DichVuXet[]; ngay: string }): TrungLuat[] {
  if (v.vaiBenDat.length === 0) return [];
  const vai = new Set(v.vaiBenDat);
  const con = v.luat.filter((l) => vai.has(l.roleTypeCode) && hieuLuc(l, v.ngay));
  const out: TrungLuat[] = [];
  for (const d of v.dichVu)
    for (const l of con)
      if (phu(l, d)) out.push({ catalogCode: d.code, luatId: l.id, roleTypeCode: l.roleTypeCode, scope: l.scope, attributeCode: l.attributeCode, valueCode: l.valueCode });
  return out;
}

/**
 * Kế hoạch R-1 (chủ chọn Q-3 (a)): ngày kết thúc của luật là ngày TÍNH TRỌN. Không gửi `denNgay` = «Kết thúc ngay» ⇒ max(hôm qua, ngày bắt đầu − 1) — thôi chặn từ hôm nay
 * (luật chưa bắt đầu thì thành khoảng rỗng, không bao giờ chặn). Hẹn ngày: phải ≥ biên đó (hẹn «hôm nay» thì vẫn chặn tới hết hôm nay).
 */
export function ngayKetThucLuat(v: { homNay: string; validFrom: string; denNgay?: unknown }): Ket<string> {
  const hq = addDays(v.homNay, -1);
  const truocBatDau = addDays(v.validFrom, -1);
  const bien = hq > truocBatDau ? hq : truocBatDau;
  if (v.denNgay === undefined || v.denNgay === null || v.denNgay === "") return { ok: true, value: bien };
  if (!laNgay(v.denNgay)) return { ok: false, message: "Ngày kết thúc không hợp lệ." };
  if (v.denNgay < bien) return { ok: false, message: "Ngày kết thúc phải từ hôm nay trở đi (hoặc bấm «Kết thúc ngay»)." };
  return { ok: true, value: v.denNgay };
}

export interface ThanLuatBan {
  roleTypeCode: string;
  scope: PhamViLuatBan;
  catalogCode: string | null;
  groupCode: string | null;
  attributeCode: string | null;
  valueCode: string | null;
  validFrom: string;
  validTo: string | null;
  note: string | null;
}
const ma = (x: unknown): x is string => typeof x === "string" && MA_RE.test(x);
const vang = (x: unknown): boolean => x === undefined || x === null || x === "";

/**
 * Thân `POST /api/pricing/luat-ban`: { loai, phamVi, catalogCode? | groupCode? | (attributeCode, valueCode, groupCode?), tuNgay?, denNgay?, ghiChu? }.
 * Mỗi kiểu phạm vi chỉ nhận đúng khoá của nó (khớp CHECK của bảng — để CHECK không bao giờ nổ thành 500). Ngày bắt đầu mặc định hôm nay, không nhận ngày đã qua
 * (luật không xét lại đơn cũ — kế hoạch R-1). Có hay không mã trong danh mục, loại có được hưởng, giá trị có thuộc đặc điểm: route kiểm (cần I/O).
 */
export function kiemThanLuatBan(raw: unknown, homNay: string): Ket<ThanLuatBan> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin luật bán." };
  const b = raw as Record<string, unknown>;
  if (!ma(b.loai)) return { ok: false, message: "Chọn loại đối tác." };
  const loiPhamVi = { ok: false as const, message: "Chọn phạm vi: một dịch vụ, một nhóm dịch vụ, hoặc một đặc điểm dịch vụ (kèm nhóm nếu muốn)." };
  const scope = b.phamVi as PhamViLuatBan;
  if (!PHAM_VI.includes(scope)) return loiPhamVi;
  let pv: Pick<ThanLuatBan, "catalogCode" | "groupCode" | "attributeCode" | "valueCode">;
  if (scope === "SERVICE") {
    if (!ma(b.catalogCode) || !vang(b.groupCode) || !vang(b.attributeCode) || !vang(b.valueCode)) return loiPhamVi;
    pv = { catalogCode: b.catalogCode, groupCode: null, attributeCode: null, valueCode: null };
  } else if (scope === "GROUP") {
    if (!ma(b.groupCode) || !vang(b.catalogCode) || !vang(b.attributeCode) || !vang(b.valueCode)) return loiPhamVi;
    pv = { catalogCode: null, groupCode: b.groupCode, attributeCode: null, valueCode: null };
  } else {
    if (!ma(b.attributeCode) || !ma(b.valueCode) || !vang(b.catalogCode) || !(vang(b.groupCode) || ma(b.groupCode))) return loiPhamVi;
    pv = { catalogCode: null, groupCode: ma(b.groupCode) ? b.groupCode : null, attributeCode: b.attributeCode, valueCode: b.valueCode };
  }
  let validFrom = homNay;
  if (!vang(b.tuNgay)) {
    if (!laNgay(b.tuNgay)) return { ok: false, message: "Ngày bắt đầu không hợp lệ." };
    if (b.tuNgay < homNay) return { ok: false, message: "Ngày bắt đầu không được ở quá khứ." };
    validFrom = b.tuNgay;
  }
  let validTo: string | null = null;
  if (!vang(b.denNgay)) {
    if (!laNgay(b.denNgay) || b.denNgay < validFrom) return { ok: false, message: "Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu." };
    validTo = b.denNgay;
  }
  const note = docGhiChu(b.ghiChu);
  if (!note.ok) return note;
  return { ok: true, value: { roleTypeCode: b.loai, scope, ...pv, validFrom, validTo, note: note.value } };
}

/** Câu 409 `sales_blocked` (ADR-0146 Đ3): nêu tên dịch vụ; luật theo đặc điểm nêu thêm «(đặc điểm: giá trị)» — tên lấy từ dữ liệu (hàm công bố của catalog), không viết trong mã. */
export function cauBiChan(v: { tenDichVu: string; tenDacDiem?: string | null; tenGiaTri?: string | null }): string {
  const dacDiem = v.tenDacDiem && v.tenGiaTri ? ` (${v.tenDacDiem}: ${v.tenGiaTri})` : "";
  return `Dịch vụ «${v.tenDichVu}» không bán cho loại đối tác của bên đặt này${dacDiem}.`;
}
