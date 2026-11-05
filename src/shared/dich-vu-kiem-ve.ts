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
): NhomKiemVe[] {
  const coDichVu = new Map(dongCo.filter((d) => d.pham === "SERVICE").map((d) => [d.ma, d.canXacNhan]));
  const coNhom = new Map(dongCo.filter((d) => d.pham === "GROUP").map((d) => [d.ma, d.canXacNhan]));
  const dangBan = dichVu.filter((d) => d.dangBan);
  const dung = (ma: string | null, ten: string): NhomKiemVe => {
    const ds = dangBan
      .filter((d) => (ma === null ? d.groupCode === null || !nhom.some((n) => n.code === d.groupCode) : d.groupCode === ma))
      .map((d) => ({
        ma: d.code,
        ten: d.ten,
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

export const nhanNguonKiemVe = (d: DongDichVuKiemVe): string => (d.rieng ? "Đặt riêng cho vé này" : d.coNhom ? "Theo nhóm" : "Chưa đặt");
export const demKiemVe = (n: NhomKiemVe): string => (n.soCan === 0 ? "Không có vé cần kiểm" : `${n.soCan}/${n.dichVu.length} vé cần kiểm`);
