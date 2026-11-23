// Chia tiền của một đơn THEO NGƯỜI BÁN, sau giảm giá (sổ đại lý đợt 2 — ADR-0078 điều 9, 10; Ruling R-81, R-154 sổ thi công). MỘT hàm cho HAI nơi:
//  - biên nhận (`chiaPhanBienNhan`, module receipt): mỗi phần «người bán … còn phải trả»;
//  - trần «thu cho» / người thu là quầy nhà cung cấp (`nhaCungCapCuaDon`, module billing): phần của quầy SAU giảm giá.
// Trước bản này billing tính trần trên thành tiền TRƯỚC giảm giá còn biên nhận chia SAU giảm (lệch M-2: đơn chỉ vé i-resort 600.000 giảm 20.000 ⇒ ghi tại quầy 600.000
// được, biên nhận ra «trả dư»). Thuần, không I/O; chỉ đọc người bán của bản chụp, không chép mức, tỷ lệ, người hưởng.
import type { BanChup } from "./hoa-hong-dong.ts";

/**
 * Nhà cung cấp của MỘT dòng theo bản chụp: id hồ sơ nhà cung cấp mua lại (`supplierPartyId`), hoặc null = phần Tour Đảo (chính công ty cung cấp; thiếu nhà cung cấp —
 * MISSING; không có bản chụp). Việc 15 (2026-11-23): trước đây so «người bán ≠ công ty chủ HÔM NAY» nên đổi công ty chủ (ADR-0024 6.4) biến công ty CŨ thành «quầy nhà
 * cung cấp» trên biên nhận của mọi đơn, kể cả đơn chụp trước khi đổi (bài src/doi-cong-ty-chu-nha-cung-cap.test.ts). Bản chụp đã mang câu trả lời đúng lúc chụp: bất biến
 * ADR-0078 «có nhà cung cấp + tỷ lệ ⇔ người bán ≠ công ty chủ» (CHECK + trigger `prc_supply_term_supplier_iff`, ghi tay `apGhiTay`) — cùng cột sổ giá vốn dùng.
 */
export function nguoiBanCuaDong(c: BanChup | undefined): string | null {
  if (!c || c.cungUng.status !== "SET") return null;
  return c.cungUng.supplierPartyId;
}

export interface PhanNguoiBan<T> {
  /** null = phần Tour Đảo. */
  nguoiBan: string | null;
  dong: T[];
  /** Σ thành tiền các dòng DỊCH VỤ của phần, TRƯỚC giảm giá. */
  gross: number;
  /** Số giảm giá đã trừ vào phần này (chỉ trừ vào `gross`). */
  giamGia: number;
  /** Phí đưa đón của phần (Đợt C): chỉ phần Tour Đảo có; không bao giờ bị giảm giá. */
  phi: number;
  /** gross − giamGia + phi: số khách phải trả cho phần này. */
  tong: number;
}

/**
 * Nhóm dòng DỊCH VỤ theo người bán (phần Tour Đảo đứng đầu nếu có dòng, rồi nhà cung cấp theo thứ tự dòng đầu tiên của họ trên đơn) rồi trừ giảm giá hiệu lực của đơn vào phần
 * Tour Đảo trước, phần còn lại trừ lần lượt vào các phần sau (R-81). Σ `tong` = Σ gross − min(giảm, Σ gross) + `phiTourDao`. Giảm âm coi là 0.
 * Phí đưa đón (Đợt C, Task 5; trang ghép 2026-10-28 §1 «tính vào theo luật riêng»; chủ 15/11, SV-PD-26, SV-PD-29): `phiTourDao` = Σ dòng phí của đơn, đi vào PHẦN TOUR ĐẢO SAU khi đã
 * trừ giảm giá (giảm giá chỉ trừ vào gross dịch vụ, R-81 giữ nguyên cho phần dịch vụ). Phí > 0 mà Tour Đảo không bán dịch vụ nào ⇒ vẫn có phần Tour Đảo (đứng đầu, `dong` rỗng);
 * phí 0 đồng không tự sinh phần. Trần thu tại quầy của billing (`nhaCungCapCuaDon`) truyền 0: phần nhà cung cấp không đổi vì phí.
 */
export function chiaPhanNguoiBan<T>(dong: readonly T[], nguoiBan: (d: T) => string | null, thanhTien: (d: T) => number, giamGiaHieuLuc: number, phiTourDao: number): PhanNguoiBan<T>[] {
  const nhom = new Map<string | null, PhanNguoiBan<T>>();
  nhom.set(null, { nguoiBan: null, dong: [], gross: 0, giamGia: 0, phi: 0, tong: 0 }); // giữ chỗ đầu cho Tour Đảo; bỏ nếu không dòng nào và không phí
  for (const d of dong) {
    const k = nguoiBan(d);
    const p = nhom.get(k) ?? { nguoiBan: k, dong: [], gross: 0, giamGia: 0, phi: 0, tong: 0 };
    p.dong.push(d);
    p.gross += thanhTien(d);
    nhom.set(k, p);
  }
  if (nhom.get(null)!.dong.length === 0 && phiTourDao <= 0) nhom.delete(null);
  const ds = [...nhom.values()];
  let giam = Math.max(0, giamGiaHieuLuc);
  for (const p of ds) {
    p.giamGia = Math.min(giam, p.gross);
    giam -= p.giamGia;
    p.phi = p.nguoiBan === null ? Math.max(0, phiTourDao) : 0;
    p.tong = p.gross - p.giamGia + p.phi;
  }
  return ds;
}
