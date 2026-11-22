// Luật THUẦN ô «Vé do ai phát» (ADR-0175 Đ1.2; theo nhóm ADR-0230 Đ3): một nguồn cho máy chủ và màn Dịch vụ & giá. Không I/O, không import module. Test cạnh tệp: nguon-ve.test.ts.
// Ô đặt được trên từng dịch vụ và trên nhóm (khuôn ô «Có vé», src/shared/co-ve.ts). Không luật vé nào đọc Người bán dịch vụ (`prc_supply_term`).
// Chỉ `catalog` gọi `nguonVeCua` (chỉ nó biết nhóm hiện tại); module khác nhận giá trị đã gộp qua `nguonVeTheoMa` của catalog.

export type NguonVe = "HANG_NGOAI" | "TOUR_DAO";
export const NGUON_VE: readonly NguonVe[] = ["HANG_NGOAI", "TOUR_DAO"];
export const isNguonVe = (v: unknown): v is NguonVe => v === "HANG_NGOAI" || v === "TOUR_DAO";

/** Giá trị lấy từ đâu: dòng riêng của dịch vụ, dòng của nhóm hiện tại, hay chưa đặt (vé hãng ngoài). */
export type NguonVeTheo = "SERVICE" | "GROUP" | "CHUA_KHAI";
export interface NguonVeHienHanh {
  nguonDichVu: ReadonlyMap<string, NguonVe>;
  nguonNhom: ReadonlyMap<string, NguonVe>;
}

/** Có dòng riêng của dịch vụ thì theo dòng đó; không có thì theo nhóm hiện tại; không có cả hai, hoặc dịch vụ nhập tay (`ma` null), là vé hãng ngoài. */
export function nguonVeCua(ma: string | null, nhom: string | null, hien: NguonVeHienHanh): { nguonVe: NguonVe; theo: NguonVeTheo } {
  if (ma === null) return { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" };
  const rieng = hien.nguonDichVu.get(ma);
  if (rieng !== undefined) return { nguonVe: rieng, theo: "SERVICE" };
  const theoNhom = nhom === null ? undefined : hien.nguonNhom.get(nhom);
  if (theoNhom !== undefined) return { nguonVe: theoNhom, theo: "GROUP" };
  return { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" };
}
