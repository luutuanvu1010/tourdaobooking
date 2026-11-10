// Luật THUẦN của màn «Dịch vụ cần kiểm vé» (ADR-0136 Đ1): xếp dịch vụ đang bán theo nhóm và cho biết từng dịch vụ đang cần kiểm vé không, do dòng riêng hay do nhóm.
// «Đang cần» gọi đúng `canXacNhan` (một nguồn với máy chủ), không viết lại ba bước đọc ở đây. Test cạnh tệp: dich-vu-kiem-ve.test.ts.
import type { DongCoXacNhanDto } from "./contracts.ts";
import { boDau } from "./so-cong-no-hien-thi.ts";
import { canXacNhan } from "./xac-nhan-don.ts";

export interface DongDichVuKiemVe {
  ma: string;
  ten: string;
  /** Đang cần kiểm vé (giá trị máy chủ sẽ áp). */
  can: boolean;
  /** true = có dòng riêng của dịch vụ, đổi nhóm không kéo theo; false = đang đi theo nhóm. */
  rieng: boolean;
  /** Dịch vụ nằm trong một nhóm đang hiện trên màn (false = «Chưa phân loại», không có gì để theo). */
  coNhom: boolean;
  /** ADR-0169 Đ4: false = đã ngừng bán. Chỉ màn hẹp mới có dòng false. */
  dangBan: boolean;
}
export interface NhomKiemVe {
  /** null = dịch vụ chưa phân loại (không đặt được cả nhóm). */
  ma: string | null;
  ten: string;
  caNhomCan: boolean;
  soCan: number;
  dichVu: DongDichVuKiemVe[];
}

export const TEN_CHUA_PHAN_LOAI = "Chưa phân loại";

export function xepNhomKiemVe(
  dichVu: readonly { code: string; ten: string; dangBan: boolean; groupCode: string | null }[],
  nhom: readonly { code: string; ten: string }[],
  dongCo: readonly DongCoXacNhanDto[],
  /** ADR-0169 Đ4: màn hẹp giữ cả vé đã ngừng bán để còn Mở bán lại. */
  kemNgungBan = false,
): NhomKiemVe[] {
  const coDichVu = new Map(dongCo.filter((d) => d.pham === "SERVICE").map((d) => [d.ma, d.canXacNhan]));
  const coNhom = new Map(dongCo.filter((d) => d.pham === "GROUP").map((d) => [d.ma, d.canXacNhan]));
  const dangBan = kemNgungBan ? [...dichVu] : dichVu.filter((d) => d.dangBan);
  const dung = (ma: string | null, ten: string): NhomKiemVe => {
    const ds = dangBan
      .filter((d) => (ma === null ? d.groupCode === null || !nhom.some((n) => n.code === d.groupCode) : d.groupCode === ma))
      .map((d) => ({
        ma: d.code,
        ten: d.ten,
        dangBan: d.dangBan,
        can: canXacNhan({ dichVu: [{ ma: d.code, nhom: d.groupCode }], coDichVu, coNhom, coChangDuoiMocChuaDatGap: false }).can,
        rieng: coDichVu.has(d.code),
        coNhom: ma !== null,
      }));
    return { ma, ten, caNhomCan: ma !== null && coNhom.get(ma) === true, soCan: ds.filter((d) => d.can).length, dichVu: ds };
  };
  return [...nhom.map((n) => dung(n.code, n.ten)), dung(null, TEN_CHUA_PHAN_LOAI)].filter((n) => n.dichVu.length > 0);
}

/** Lọc theo tên, không phân biệt dấu; khớp tên nhóm thì giữ cả nhóm. Không gõ gì ⇒ giữ nguyên. */
export function locNhomKiemVe(ds: readonly NhomKiemVe[], tu: string): NhomKiemVe[] {
  const q = boDau(tu).trim();
  if (q === "") return [...ds];
  return ds.flatMap((n) => {
    if (boDau(n.ten).includes(q)) return [n];
    const dichVu = n.dichVu.filter((d) => boDau(d.ten).includes(q));
    return dichVu.length > 0 ? [{ ...n, dichVu }] : [];
  });
}

/** Chữ nguồn dưới công tắc «Cần kiểm vé», MỘT nơi cho màn hẹp và màn đủ. «Mặc định: không cần kiểm» = chủ chọn B-4 (1), 9/11 (thay «Chưa đặt»). */
export const nhanNguonKiemVe = (d: Pick<DongDichVuKiemVe, "rieng" | "coNhom">): string => (d.rieng ? "Đặt riêng cho vé này" : d.coNhom ? "Theo nhóm" : "Mặc định: không cần kiểm");
export const demKiemVe = (n: NhomKiemVe): string => (n.soCan === 0 ? `Không có vé cần kiểm (${n.dichVu.length} vé)` : `${n.soCan}/${n.dichVu.length} vé cần kiểm`);

/** Nhóm nào mở sẵn: màn chỉ còn một nhóm, đang tìm, hoặc nhóm có vé cần kiểm. (Nhóm người dùng tự mở thì trang nhớ riêng.) */
export const moSanNhomKiemVe = (ds: readonly NhomKiemVe[], n: NhomKiemVe, dangTim: boolean): boolean => dangTim || ds.length === 1 || n.soCan > 0;

/** ADR-0169 Đ4: một dòng của màn đủ (Dịch vụ & giá): đang cần kiểm không, do dòng riêng hay theo nhóm. Cùng `canXacNhan` với máy chủ. */
export function kiemVeCua(ma: string, nhom: string | null, dongCo: readonly DongCoXacNhanDto[]): { can: boolean; rieng: boolean } {
  const coDichVu = new Map(dongCo.filter((d) => d.pham === "SERVICE").map((d) => [d.ma, d.canXacNhan]));
  const coNhom = new Map(dongCo.filter((d) => d.pham === "GROUP").map((d) => [d.ma, d.canXacNhan]));
  return { can: canXacNhan({ dichVu: [{ ma, nhom }], coDichVu, coNhom, coChangDuoiMocChuaDatGap: false }).can, rieng: coDichVu.has(ma) };
}
/** Cả nhóm đang đặt «cần kiểm vé» (dòng nhóm, không tính dòng riêng của từng vé). */
export const caNhomCanKiem = (nhom: string, dongCo: readonly DongCoXacNhanDto[]): boolean => dongCo.some((d) => d.pham === "GROUP" && d.ma === nhom && d.canXacNhan);

/** Hộp hỏi lại trước khi Ngừng bán một dịch vụ, MỘT nơi cho màn hẹp và màn đủ (chủ chọn B-5 (1), 9/11). Mở bán lại không hỏi. */
export const cauHoiNgungBan = (ten: string): { tieuDe: string; hauQua: string; nhanNguyHiem: string; nhanGiu: string } => ({
  tieuDe: `Ngừng bán ${ten}?`,
  hauQua: "Người lập đơn không chọn được dịch vụ này nữa, có hiệu lực ngay cho cả công ty. Đơn đã lập không đổi.",
  nhanNguyHiem: "Ngừng bán",
  nhanGiu: "Không ngừng",
});
