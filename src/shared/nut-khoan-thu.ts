// Nút trên từng khoản thu ở thẻ Thanh toán của trang đơn — luật THUẦN (giao diện chỉ ẩn/hiện; máy chủ vẫn kiểm lại khi bấm).
// Rà soát ngôn ngữ 18/10 §5 (docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-giao-dien.md).
import { can, holdsPartner, type OperationCode, type PermissionHolder } from "./permissions.ts";

/**
 * Lệnh ghi sổ công nợ ghi NGAY, không người thứ hai duyệt — «Huỷ khoản thu» / «Huỷ dòng sổ», «Sửa khoản thu đã ghi», «Đã nộp về công ty» / «công ty trả», «Ghi hoàn
 * cho khách»: cần ô của lệnh VÀ không giữ quyền Đối tác (kể cả tài khoản lai — kẻo tự làm mất khoản mình đang giữ / nợ; BL-SDL2-DAO-DONG-TM và người kiểm I-1, 19/10).
 * Route của các lệnh đó và nút ở trang đơn cùng gọi hàm này.
 */
export function ghiSoNoiBo(staff: PermissionHolder, op: OperationCode): boolean {
  return can(staff, op) && !holdsPartner(staff);
}

/**
 * «Huỷ khoản thu» / «Huỷ dòng sổ» (`POST /api/ledger/adjustments`, `dao_lan_thu` / `dao_dong`): ô `ledger.write` VÀ không giữ quyền Đối tác (kể cả tài khoản lai —
 * BL-SDL2-DAO-DONG-TM, 19/10). Lệnh đảo ghi ngay, không người thứ hai duyệt. Route và nút ở trang đơn cùng gọi hàm này.
 */
export function duocHuyKhoanSo(staff: PermissionHolder): boolean {
  return ghiSoNoiBo(staff, "ledger.write");
}

/**
 * "Sửa khoản thu đã ghi" (ADR-0088). Không hiện trên khoản «Công ty thu – CK» còn chờ Kế toán xác nhận: máy chủ luôn từ chối
 * (`ghiThayLanThu` → 409 `ck_cho_xac_nhan`, ADR-0088 đ4 (i)) — xác nhận đã nhận trước, rồi mới sửa.
 */
export function hienNutSuaKhoanThu(
  l: { id: string; traLai: boolean; daDao: boolean; laDongDao: boolean },
  t: { choXacNhan: readonly string[]; donDaHuy: boolean },
): boolean {
  return !l.daDao && !l.laDongDao && !l.traLai && !t.donDaHuy && !t.choXacNhan.includes(l.id);
}

/** Câu hỏi trước khi Kế toán bấm "Công ty đã nhận": chỉ chuyển khoản mới "vào tài khoản" và cần mã giao dịch (ADR-0092 Đ6). */
export function cauXacNhanDaNhan(i: { hinhThuc: "BANK_TRANSFER" | "CASH" | "OTHER"; soTien: string }): string {
  if (i.hinhThuc === "BANK_TRANSFER") {
    return `Đã đối chiếu: công ty đã nhận ${i.soTien} vào tài khoản? Nhập mã giao dịch và số tiền thực chuyển đúng như sao kê.`;
  }
  return i.hinhThuc === "CASH" ? `Công ty đã nhận đủ ${i.soTien} tiền mặt?` : `Công ty đã nhận đủ ${i.soTien}?`;
}
