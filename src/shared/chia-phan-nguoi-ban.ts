// Chia tiền của một đơn THEO NGƯỜI BÁN, sau giảm giá (sổ đại lý đợt 2 — ADR-0078 điều 9, 10; Ruling R-81, R-154 sổ thi công). MỘT hàm cho HAI nơi:
//  - biên nhận (`chiaPhanBienNhan`, module receipt): mỗi phần «người bán … còn phải trả»;
//  - trần «thu cho» / người thu là quầy nhà cung cấp (`nhaCungCapCuaDon`, module billing): phần của quầy SAU giảm giá.
// Trước bản này billing tính trần trên thành tiền TRƯỚC giảm giá còn biên nhận chia SAU giảm (lệch M-2: đơn chỉ vé i-resort 600.000 giảm 20.000 ⇒ ghi tại quầy 600.000
// được, biên nhận ra «trả dư»). Thuần, không I/O; chỉ đọc người bán của bản chụp, không chép mức, tỷ lệ, người hưởng.
import type { BanChup } from "./hoa-hong-dong.ts";

/**
 * Người bán của MỘT dòng theo bản chụp: id hồ sơ nhà cung cấp, hoặc null = phần Tour Đảo (người bán là công ty chủ, thiếu người bán — MISSING, không đọc được công ty chủ).
 * Cùng luật nhóm biên nhận đã dùng từ Task 8 (`cungUng.sellerPartyId` khác công ty chủ).
 */
export function nguoiBanCuaDong(c: BanChup | undefined, congTyChuId: string | null): string | null {
  if (!c || c.cungUng.status !== "SET" || congTyChuId === null || c.cungUng.sellerPartyId === congTyChuId) return null;
  return c.cungUng.sellerPartyId;
}

export interface PhanNguoiBan<T> {
  /** null = phần Tour Đảo. */
  nguoiBan: string | null;
  dong: T[];
  /** Σ thành tiền các dòng của phần, TRƯỚC giảm giá. */
  gross: number;
  /** Số giảm giá đã trừ vào phần này. */
  giamGia: number;
  /** gross − giamGia: số khách phải trả cho phần này. */
  tong: number;
}

/**
 * Nhóm dòng theo người bán (phần Tour Đảo đứng đầu nếu có dòng, rồi nhà cung cấp theo thứ tự dòng đầu tiên của họ trên đơn) rồi trừ giảm giá hiệu lực của đơn vào phần
 * Tour Đảo trước, phần còn lại trừ lần lượt vào các phần sau (R-81). Σ `tong` = Σ gross − min(giảm, Σ gross). Giảm âm coi là 0.
 */
export function chiaPhanNguoiBan<T>(dong: readonly T[], nguoiBan: (d: T) => string | null, thanhTien: (d: T) => number, giamGiaHieuLuc: number): PhanNguoiBan<T>[] {
  const nhom = new Map<string | null, PhanNguoiBan<T>>();
  nhom.set(null, { nguoiBan: null, dong: [], gross: 0, giamGia: 0, tong: 0 }); // giữ chỗ đầu cho Tour Đảo; bỏ nếu không dòng nào
  for (const d of dong) {
    const k = nguoiBan(d);
    const p = nhom.get(k) ?? { nguoiBan: k, dong: [], gross: 0, giamGia: 0, tong: 0 };
    p.dong.push(d);
    p.gross += thanhTien(d);
    nhom.set(k, p);
  }
  if (nhom.get(null)!.dong.length === 0) nhom.delete(null);
  const ds = [...nhom.values()];
  let giam = Math.max(0, giamGiaHieuLuc);
  for (const p of ds) {
    p.giamGia = Math.min(giam, p.gross);
    giam -= p.giamGia;
    p.tong = p.gross - p.giamGia;
  }
  return ds;
}
