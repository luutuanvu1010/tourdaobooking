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
/** Ba số tiền "mỗi khách" theo loại (ADR-0133). Em bé không có ô: luôn 0. Trẻ em và người cao tuổi phải được điền rõ (gõ 0 nếu không trả) — không có «ô trống» ở tầng này. */
export interface MucTheoLoai { adult: number; child: number; senior: number }
const laSoNguyenKhongAm = (n: number): boolean => Number.isInteger(n) && n >= 0;
/** Hoa hồng "mỗi khách theo loại" của MỘT dòng: Σ (số người loại đó × số tiền loại đó); em bé không tính. Số tiền hoặc số khách không phải số nguyên ≥ 0 thì ném lỗi (không âm thầm ra số lạ). */
export function hoaHongTheoLoai(muc: MucTheoLoai, soKhach: { adult?: number; child?: number; senior?: number; infant?: number }): number {
  let tong = 0;
  for (const loai of ["adult", "child", "senior"] as const) {
    const tien = muc[loai], nguoi = soKhach[loai] ?? 0;
    if (!laSoNguyenKhongAm(tien) || !laSoNguyenKhongAm(nguoi)) throw new Error(`hoaHongTheoLoai: số tiền/số khách không hợp lệ (${loai})`);
    tong += tien * nguoi;
  }
  return tong;
}
/** Dịch vụ tính theo nhóm/lượt (không tách loại khách): mỗi lượt lấy số tiền người lớn (ADR-0133 điều 4). */
export function hoaHongTheoLuot(muc: MucTheoLoai, soLuot: number): number {
  if (!laSoNguyenKhongAm(muc.adult) || !laSoNguyenKhongAm(soLuot)) throw new Error("hoaHongTheoLuot: số tiền/số lượt không hợp lệ");
  return muc.adult * soLuot;
}
/** Giá vốn trên thành tiền TRƯỚC giảm giá cấp đơn (H8 = A), cùng cách làm tròn. */
export const giaVonDong = (v: { costRateBp: number; thanhTien: number }): number => lamTronNuaLen(v.costRateBp * v.thanhTien, 10_000);

/** Bản chụp của một dòng — cùng dạng cho bản mới tính và bản đọc từ `ord_service_terms` (ruleId null = ghi tay). */
export interface BanChup {
  serviceId: string;
  beneficiaryPartyId: string | null;
  hoaHong:
    | { status: "NONE" }
    | { status: "SET"; kind: KieuMuc; rateBp: number | null; perPax: number | null; ruleId: string | null; theoLoai?: MucTheoLoai | null }
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
/**
 * `tien.pax` (ADR-0133): số khách HIỆN HÀNH theo loại của dòng; `null` = dịch vụ tính theo nhóm/lượt (khi đó `soKhachTinh` là số lượt). Chỉ cần khi bản chụp mang ba số theo loại:
 * có ba số mà thiếu `pax` (undefined) ⇒ ném lỗi, không đoán. Không có ba số ⇒ như cũ.
 */
export function tinhDongDoiTac(c: BanChup, tien: { thanhTien: number; soKhachTinh: number; pax?: { adult?: number; child?: number; senior?: number } | null }): DongPhanDoiTac {
  const h = c.hoaHong;
  const theoLoai = h.status === "SET" && h.kind === "PER_PAX" ? (h.theoLoai ?? null) : null;
  if (theoLoai && tien.pax === undefined) throw new Error("tinhDongDoiTac: bản chụp có số tiền theo loại nhưng thiếu số khách theo loại (pax)");
  const hoaHong = h.status === "NONE" ? 0 : h.status === "MISSING" ? null
    : theoLoai ? (tien.pax ? hoaHongTheoLoai(theoLoai, tien.pax) : hoaHongTheoLuot(theoLoai, tien.soKhachTinh))
    : hoaHongDong({ kind: h.kind, rateBp: h.rateBp, perPaxAmount: h.perPax, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh });
  const cu = c.cungUng;
  const giaVon = cu.status === "SET" && cu.supplierPartyId !== null && cu.costRateBp !== null ? giaVonDong({ costRateBp: cu.costRateBp, thanhTien: tien.thanhTien }) : null;
  return { serviceId: c.serviceId, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh, hoaHong, giaDaiLy: hoaHong === null ? null : tien.thanhTien - hoaHong, giaVon };
}
