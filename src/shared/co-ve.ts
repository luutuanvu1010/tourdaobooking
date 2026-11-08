// Luật THUẦN ô «Có vé» (ADR-0174 Đ2): một nguồn cho máy chủ và màn Dịch vụ & giá. Không I/O, không import module. Test cạnh tệp: co-ve.test.ts.

export type NguonCoVe = "SERVICE" | "GROUP" | "CHUA_KHAI";
export interface CoHienHanh {
  coDichVu: ReadonlyMap<string, boolean>;
  coNhom: ReadonlyMap<string, boolean>;
}

/** Có dòng riêng của dịch vụ thì theo dòng đó; không có thì theo nhóm hiện hành; không có cả hai, hoặc dịch vụ nhập tay (`ma` null), là Không vé. */
export function coVeCua(ma: string | null, nhom: string | null, co: CoHienHanh): { coVe: boolean; nguon: NguonCoVe } {
  if (ma === null) return { coVe: false, nguon: "CHUA_KHAI" };
  const rieng = co.coDichVu.get(ma);
  if (rieng !== undefined) return { coVe: rieng, nguon: "SERVICE" };
  const theoNhom = nhom === null ? undefined : co.coNhom.get(nhom);
  if (theoNhom !== undefined) return { coVe: theoNhom, nguon: "GROUP" };
  return { coVe: false, nguon: "CHUA_KHAI" };
}
