// Luật THUẦN ô «Vé do ai phát» (ADR-0175 Đ1.2): một nguồn cho máy chủ và màn Dịch vụ & giá. Không I/O, không import module. Test cạnh tệp: nguon-ve.test.ts.
// Ô chỉ có trên từng dịch vụ (không theo nhóm). Không luật vé nào đọc Người bán dịch vụ (`prc_supply_term`).

export type NguonVe = "HANG_NGOAI" | "TOUR_DAO";
export const NGUON_VE: readonly NguonVe[] = ["HANG_NGOAI", "TOUR_DAO"];
export const isNguonVe = (v: unknown): v is NguonVe => v === "HANG_NGOAI" || v === "TOUR_DAO";

/** Có dòng của dịch vụ thì theo dòng đó; không có dòng, hoặc dịch vụ nhập tay (`ma` null), là vé hãng ngoài. */
export function nguonVeCua(ma: string | null, hienHanh: ReadonlyMap<string, NguonVe>): NguonVe {
  if (ma === null) return "HANG_NGOAI";
  return hienHanh.get(ma) ?? "HANG_NGOAI";
}
