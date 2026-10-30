// Chữ và cảnh báo màn «Đặc điểm dịch vụ» và màn gán nhóm (ADR-0152 Đ4 mục 2, (c), (d), mục 4; ca vàng CV-8; kế hoạch 2026-10-30 T12, T13). Thuần — giao diện chỉ vẽ.
// Cảnh báo là GIAO DIỆN, máy chủ không ép (Đ4 mục 2): đổi giá trị / nhóm vẫn lưu được; người lưu được báo trước dịch vụ nào thôi / bắt đầu bị chặn cho loại đối tác nào.
// Phép «luật phủ dịch vụ» là MỘT hàm dùng chung với máy chủ (luat-ban-phu.ts). So TRƯỚC / SAU: loại nào hết chặn, loại nào bắt đầu chặn — luật khác (một dịch vụ, cả nhóm)
// vẫn chặn thì không nói «bỏ chặn». Luật đã kết thúc hoặc «không phủ» (giá trị / đặc điểm đang tắt) không chặn gì nên không tính; luật sắp áp dụng có tính (sẽ chặn).
import type { CatalogDacDiemResponse, LuatBanDto } from "./contracts.ts";
import { phuDichVu, type DichVuPhu } from "./luat-ban-phu.ts";

/** Một dịch vụ ở một thời điểm (trước / sau khi đổi): mã, tên, nhóm hiện hành, giá trị hiệu lực. */
export interface DvTrangThai extends DichVuPhu {
  readonly ten: string;
}

export const CAU_CHUA_KIEM_LUAT =
  "Chưa kiểm được luật bán (không tải được danh sách luật). Đổi giá trị có thể bỏ chặn hoặc bắt đầu chặn dịch vụ cho một loại đối tác — tải lại trang để xem trước khi lưu.";
export const nhanNguon = (n: "SERVICE" | "GROUP"): string => (n === "SERVICE" ? "riêng" : "theo nhóm");

/**
 * Trạng thái dịch vụ `code` dựng từ dữ liệu màn, có thể kèm thay đổi giả định: `rieng` (giá trị riêng mới, `null` = bỏ ⇒ theo nhóm), `nhom` (nhóm mới, `null` = rời nhóm),
 * `nhomGiaTri` (giá trị chung mới của nhóm, `null` = bỏ). Giá trị riêng thắng chung; nhóm đang tắt không cho giá trị chung và không tính là nhóm (cùng view v_ctl_service_attribute).
 */
export function trangThaiTuMan(
  dm: CatalogDacDiemResponse,
  code: string,
  doi: { rieng?: Record<string, string | null>; nhom?: string | null; nhomGiaTri?: Record<string, string | null> } = {},
): DvTrangThai {
  const dv = dm.dichVu.find((d) => d.code === code);
  const rieng = new Map<string, string>();
  for (const [a, g] of Object.entries(dv?.giaTri ?? {})) if (g.nguon === "SERVICE") rieng.set(a, g.valueCode);
  for (const [a, v] of Object.entries(doi.rieng ?? {})) v === null ? rieng.delete(a) : rieng.set(a, v);
  const maNhom = doi.nhom !== undefined ? doi.nhom : (dv?.groupCode ?? null);
  const nhom = maNhom === null ? undefined : dm.nhom.find((g) => g.code === maNhom && g.dangDung);
  const giaTri = new Map<string, string>();
  if (nhom) {
    const chung = { ...nhom.giaTri, ...(doi.nhomGiaTri ?? {}) };
    for (const [a, v] of Object.entries(chung)) if (v !== null) giaTri.set(a, v);
  }
  for (const [a, v] of rieng) giaTri.set(a, v);
  return { code, ten: dv?.ten ?? code, nhom: nhom ? nhom.code : null, giaTri };
}

const conChan = (l: LuatBanDto): boolean => l.trangThai !== "DA_KET_THUC" && !l.khongPhu;
const xepTen = (a: Iterable<string>): string[] => [...new Set(a)].sort((x, y) => x.localeCompare(y, "vi"));

/** Loại đối tác (tên) bị chặn cho dịch vụ `d` bởi các luật còn chặn. */
function loaiBiChan(luat: readonly LuatBanDto[], d: DichVuPhu): Set<string> {
  return new Set(luat.filter((l) => conChan(l) && phuDichVu({ scope: l.phamVi, catalogCode: l.catalogCode, groupCode: l.groupCode, attributeCode: l.attributeCode, valueCode: l.valueCode }, d)).map((l) => l.tenLoai));
}
/** Tên các dịch vụ: một ⇒ «a»; nhiều ⇒ «N dịch vụ <ghi chú> («a», «b», …)». */
function tenDichVu(ten: readonly string[], ghiChu: string): string {
  if (ten.length === 1) return `«${ten[0]}»`;
  const dau = ten.slice(0, 3).map((t) => `«${t}»`).join(", ");
  return `${ten.length} dịch vụ${ghiChu} (${dau}${ten.length > 3 ? ", …" : ""})`;
}
/** So trước / sau theo từng dịch vụ (cùng thứ tự): loại hết chặn / bắt đầu chặn, kèm dịch vụ. */
function soChan(luat: readonly LuatBanDto[], truoc: readonly DvTrangThai[], sau: readonly DvTrangThai[]) {
  const het = { loai: new Set<string>(), dv: new Set<string>() };
  const moi = { loai: new Set<string>(), dv: new Set<string>() };
  truoc.forEach((t, i) => {
    const s = sau[i]!;
    const a = loaiBiChan(luat, t);
    const b = loaiBiChan(luat, s);
    for (const l of a) if (!b.has(l)) (het.loai.add(l), het.dv.add(t.ten));
    for (const l of b) if (!a.has(l)) (moi.loai.add(l), moi.dv.add(t.ten));
  });
  return { het, moi };
}
function cauSoChan(luat: readonly LuatBanDto[], truoc: readonly DvTrangThai[], sau: readonly DvTrangThai[], mo: string, boChan: string, ghiChu: string): string | null {
  const { het, moi } = soChan(luat, truoc, sau);
  const phan: string[] = [];
  if (het.loai.size) phan.push(`${boChan} ${tenDichVu(xepTen(het.dv), ghiChu)} cho: ${xepTen(het.loai).join(", ")}`);
  if (moi.loai.size) phan.push(`bắt đầu chặn ${tenDichVu(xepTen(moi.dv), ghiChu)} cho: ${xepTen(moi.loai).join(", ")}`);
  return phan.length ? `${mo} sẽ ${phan.join("; và ")}.` : null;
}

/**
 * ADR-0152 Đ4 mục 2 (CV-8): cảnh báo trước khi lưu một giá trị (của một dịch vụ, hoặc giá trị chung của nhóm ⇒ mọi dịch vụ đang theo nhóm). `luat` = null khi không tải được
 * danh sách luật ⇒ câu «chưa kiểm được» (không im lặng bỏ cảnh báo). Không loại nào đổi ⇒ null.
 */
export function canhBaoDoiGiaTri(v: { luat: readonly LuatBanDto[] | null; truoc: readonly DvTrangThai[]; sau: readonly DvTrangThai[] }): string | null {
  if (v.luat === null) return CAU_CHUA_KIEM_LUAT;
  return cauSoChan(v.luat, v.truoc, v.sau, "Đổi giá trị này", "bỏ chặn", " đang theo nhóm");
}

/** ADR-0152 Đ4 (d), tiêu chí 17b: bật lại giá trị / đặc điểm còn luật trỏ tới (luật chưa kết thúc — kể cả đang «không phủ» vì chính giá trị này đang tắt). */
export function canhBaoBatLai(v: { luat: readonly LuatBanDto[] | null; ma: string; la: "GIA_TRI" | "DAC_DIEM" }): string | null {
  if (v.luat === null) return CAU_CHUA_KIEM_LUAT;
  const tro = v.luat.filter((l) => l.trangThai !== "DA_KET_THUC" && l.phamVi === "ATTRIBUTE" && (v.la === "GIA_TRI" ? l.valueCode : l.attributeCode) === v.ma);
  if (tro.length === 0) return null;
  const sau = v.la === "GIA_TRI" ? "giá trị được gắn lại cho dịch vụ" : "giá trị của đặc điểm được gắn lại cho dịch vụ";
  return `Còn ${tro.length} luật bán trỏ tới ${v.la === "GIA_TRI" ? "giá trị" : "đặc điểm"} này, sẽ chặn ${xepTen(tro.map((l) => l.tenLoai)).join(", ")} khi ${sau}.`;
}

/** ADR-0152 Đ4 mục 4: đổi TÊN giá trị / đặc điểm có luật (chưa kết thúc) trỏ tới. Không đổi kết quả luật, nhưng người đọc luật sẽ thấy tên mới. */
export function canhBaoDoiTen(v: { luat: readonly LuatBanDto[] | null; ma: string; la: "GIA_TRI" | "DAC_DIEM"; tenCu: string; tenMoi: string }): string | null {
  if (v.luat === null) return CAU_CHUA_KIEM_LUAT;
  const tro = v.luat.filter((l) => l.trangThai !== "DA_KET_THUC" && l.phamVi === "ATTRIBUTE" && (v.la === "GIA_TRI" ? l.valueCode : l.attributeCode) === v.ma);
  if (tro.length === 0) return null;
  return `${v.la === "GIA_TRI" ? "Giá trị" : "Đặc điểm"} «${v.tenCu}» đang có ${tro.length} luật bán trỏ tới (${xepTen(tro.map((l) => l.tenLoai)).join(", ")}). Đổi tên thành «${v.tenMoi}» không đổi dịch vụ nào bị chặn, nhưng các luật đó sẽ hiện tên mới — kiểm tra tên mới vẫn đúng nghĩa.`;
}
