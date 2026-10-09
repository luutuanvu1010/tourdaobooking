// Tính tiền MỘT dòng dịch vụ của phần thương mại (sổ đại lý đợt 1 — ADR-0077, ADR-0078 B1; đặc tả 2026-10-08 §4): làm tròn NỬA LÊN tới đồng, hoa hồng, giá vốn, và kiểu bản chụp.
// Thuần, không import gì. MỘT định nghĩa: `pricing/rules.ts` tái xuất (luật chụp / chọn mức), `orders/thuong-mai.ts` dùng để dựng DTO. Nằm ở `src/shared/` (không ở `pricing/rules.ts`)
// vì `orders/thuong-mai.ts` phải chạy được bằng `node --test` trực tiếp, mà nhập `../pricing` (index.ts) kéo `../audit` bằng đường dẫn không đuôi — node không giải được.
// Tỷ lệ tính bằng phần vạn (1250 = 12,5%). Thành tiền / số khách là số HIỆN HÀNH của dòng; mức là mức ĐÃ CHỤP (A-2).

export type KieuMuc = "RATE" | "PER_PAX";
export type LyDoThieu = "NO_RULE" | "RULE_CONFLICT" | "MANUAL_LINE" | "BOOKER_NOT_BENEFICIARY" | "NOT_CAPTURED";

/** Làm tròn NỬA LÊN tới đồng của `tu / mau` (tu ≥ 0, mau > 0, số nguyên) — điều A1, chủ duyệt 2026-10-08. */
export const lamTronNuaLen = (tu: number, mau: number): number => Math.floor((2 * tu + mau) / (2 * mau));
export function hoaHongDong(v: { kind: KieuMuc; rateBp: number | null; perPaxAmount: number | null; thanhTien: number; soKhachTinh: number }): number {
  return v.kind === "RATE" ? lamTronNuaLen(v.rateBp! * v.thanhTien, 10_000) : v.perPaxAmount! * v.soKhachTinh;
}
/** Giá vốn trên thành tiền TRƯỚC giảm giá cấp đơn (H8 = A), cùng cách làm tròn. */
export const giaVonDong = (v: { costRateBp: number; thanhTien: number }): number => lamTronNuaLen(v.costRateBp * v.thanhTien, 10_000);

/** Bản chụp của một dòng — cùng dạng cho bản mới tính và bản đọc từ `ord_service_terms` (ruleId null = ghi tay). */
export interface BanChup {
  serviceId: string;
  beneficiaryPartyId: string | null;
  hoaHong:
    | { status: "NONE" }
    | { status: "SET"; kind: KieuMuc; rateBp: number | null; perPax: number | null; ruleId: string | null }
    | { status: "MISSING"; reason: LyDoThieu };
  cungUng: { status: "SET"; termId: string | null; sellerPartyId: string; supplierPartyId: string | null; costRateBp: number | null } | { status: "MISSING" };
}

export interface DongPhanDoiTac {
  serviceId: string;
  thanhTien: number;
  soKhachTinh: number;
  /** null = thiếu mức (không bao giờ tự lấy 0); 0 khi đơn không có người hưởng. */
  hoaHong: number | null;
  /** Thành tiền − hoa hồng; null khi thiếu mức. Chỉ hiển thị, không lưu. */
  giaDaiLy: number | null;
  /** Chỉ khi người bán là nhà cung cấp. */
  giaVon: number | null;
}
export function tinhDongDoiTac(c: BanChup, tien: { thanhTien: number; soKhachTinh: number }): DongPhanDoiTac {
  const h = c.hoaHong;
  const hoaHong = h.status === "NONE" ? 0 : h.status === "MISSING" ? null
    : hoaHongDong({ kind: h.kind, rateBp: h.rateBp, perPaxAmount: h.perPax, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh });
  const cu = c.cungUng;
  const giaVon = cu.status === "SET" && cu.supplierPartyId !== null && cu.costRateBp !== null ? giaVonDong({ costRateBp: cu.costRateBp, thanhTien: tien.thanhTien }) : null;
  return { serviceId: c.serviceId, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh, hoaHong, giaDaiLy: hoaHong === null ? null : tien.thanhTien - hoaHong, giaVon };
}
