// ADR-0226 (Việc 6, chủ duyệt 21/11/2026): Kế toán thuần xem đơn ĐỐI TÁC theo số nợ với Tour Đảo, không theo giá đối tác bán cho khách. MỘT luật thuần dùng chung máy chủ
// (`GET /api/orders`, `GET /api/orders/dashboard`, `POST /api/ledger/balances` bỏ số bán lẻ của đơn đối tác) và giao diện (chọn nhãn). Đây là luật HIỂN THỊ (siết bớt số được gửi),
// không cho thêm quyền: người không thuộc luật vẫn đi đúng đường cũ.
import type { PermissionHolder } from "./permissions.ts";

/** Quyền làm người xem thôi là «Kế toán thuần»: giữ một trong các quyền này thì vẫn xem số bán lẻ như cũ (họ lập / sửa / duyệt đơn nên cần giá bán cho khách). */
const GIU_GIA_BAN = new Set(["SALES", "SALES_MANAGER", "ADMIN", "SUPER_ADMIN"]);

/** Kế toán thuần: có quyền Kế toán, KHÔNG có Bán hàng / Quản lý bán hàng / Quản trị / Toàn quyền (chủ chọn khuyến nghị 6A). */
export function keToanThuan(who: Pick<PermissionHolder, "permissions">): boolean {
  return who.permissions.includes("ACCOUNTING") && !who.permissions.some((p) => GIU_GIA_BAN.has(p));
}

/** Nhãn của số nợ (giữ dấu, từ phiếu công nợ): âm ⇒ Tour Đảo nợ đối tác, hiện số dương với nhãn đảo chiều. */
export function nhanNoDoiTac(no: number): { nhan: string; soTien: number } {
  return no < 0 ? { nhan: "Tour Đảo cần trả lại đối tác", soTien: -no } : { nhan: "Đối tác nợ Tour Đảo", soTien: no };
}

export const NHAN_THU_HO_TIEN_MAT = "Tour Đảo đã thu hộ tiền mặt";
