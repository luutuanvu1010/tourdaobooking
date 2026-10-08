// VĂN PHÒNG SỬA SỐ KHÁCH SAU XÁC NHẬN (ADR-0063 D1, chủ duyệt 2026-10-08) — luật thuần dùng chung máy chủ ↔ giao diện. Không I/O, không import src/modules/.
// Route: `POST /api/orders/:id/money-edit` (module orders, cổng office). Tiền KHÔNG tính ở đây: máy chủ tính bằng `planMoneyEdit` (một luật với đường HDV).
// Bài canh: so-khach-van-phong.test.ts (luật thuần) + src/modules/orders/so-khach-van-phong-route.test.ts (route thật).
import { can, type PermissionHolder } from "./permissions.ts";
import type { OrderStatus } from "./contracts.ts";

/**
 * Lý do sửa số khách — MÃ ĐÓNG theo ADR-0023 điều 4 (ADR-0030 S23-9): "Khác" KHÔNG kèm ô chữ. Nhật ký ghi NHÃN (chữ cố định do máy chủ chọn), nên không bao
 * giờ chứa SĐT. Chữ ba mã đầu trùng ba nút chọn nhanh của hướng dẫn viên (`EDIT_REASON_QUICK`, bài so-khach-van-phong.test.ts khoá) — đường HDV vẫn nhận chữ
 * tự gõ (đổi đường đó sang mã là việc riêng của ADR-0023, chưa làm).
 */
export const LY_DO_SUA_SO_KHACH = {
  THEM_NGUOI: "Khách thêm người",
  BOT_NGUOI: "Khách bớt người",
  DOI_DICH_VU: "Đổi dịch vụ",
  KHAC: "Khác",
} as const;
export type MaLyDoSuaSoKhach = keyof typeof LY_DO_SUA_SO_KHACH;
export const MA_LY_DO_SUA_SO_KHACH = Object.keys(LY_DO_SUA_SO_KHACH) as MaLyDoSuaSoKhach[];

const laMa = (v: unknown): v is MaLyDoSuaSoKhach => typeof v === "string" && Object.hasOwn(LY_DO_SUA_SO_KHACH, v);

export type ThanSuaSoKhach = { ok: true; ma: MaLyDoSuaSoKhach; nhan: string; services: unknown } | { ok: false; message: string };

/**
 * Đọc thân route văn phòng: ĐÚNG hai khoá `lyDo` (mã) và `services` (danh sách dịch vụ + số khách mới — `planMoneyEdit` kiểm tiếp). Khoá nào khác (chữ lý do
 * tự gõ `reason`, ghi chú, hay một con số tiền) → từ chối: máy chủ không nhận chữ tự do vào nhật ký và không bao giờ tin số tiền từ trình duyệt.
 */
export function docThanSuaSoKhach(body: Record<string, unknown> | null): ThanSuaSoKhach {
  if (!body) return { ok: false, message: "Thiếu dữ liệu sửa số khách." };
  if (Object.keys(body).some((k) => k !== "lyDo" && k !== "services")) {
    return { ok: false, message: "Lý do sửa số khách chỉ chọn từ danh sách; không gửi kèm chữ gõ tay hay số tiền." };
  }
  if (body.lyDo === undefined || body.lyDo === "") return { ok: false, message: "Cần chọn lý do sửa." };
  if (!laMa(body.lyDo)) return { ok: false, message: "Lý do không có trong danh sách." };
  return { ok: true, ma: body.lyDo, nhan: LY_DO_SUA_SO_KHACH[body.lyDo], services: body.services };
}

/**
 * Ai sửa được số khách ở trang đơn (nút "Sửa số khách dịch vụ") — ô `order.money.edit` KHÔNG truyền `assigned`: Bán hàng chỉ đơn MÌNH lập (`own`), Kế toán /
 * Quản trị / Toàn quyền mọi đơn (`any`); hướng dẫn viên (ô `assigned`) không có đường này — họ giữ nút riêng ở "Việc của tôi". Đơn phải đã xác nhận, chưa
 * "Đã giao"; KHÔNG chặn theo ngày đi (văn phòng sửa được cả sau ngày đi). Giao diện chỉ ẩn/hiện; máy chủ tự hỏi lại `can()` trong route.
 */
export function duocSuaSoKhachVanPhong(viewer: PermissionHolder, don: { staffId: string; status: OrderStatus; deliveredAt: string | null }): boolean {
  return don.status === "confirmed" && don.deliveredAt === null && can(viewer, "order.money.edit", { ownerId: don.staffId });
}

/**
 * Tổng tiền âm (giảm giá lớn hơn tiền dịch vụ sau khi bớt khách — giảm giá không sửa được sau xác nhận): KHÔNG chặn (chủ duyệt 2026-10-08 "tổng tiền âm thì
 * cảnh báo, không chặn"), chỉ cảnh báo. Tính từ trạng thái HIỆN HÀNH của đơn (không lưu cờ), nên Kế toán mở đơn lúc nào cũng thấy, không riêng người vừa sửa.
 */
export const CAU_TONG_AM =
  "Tổng tiền của đơn đang âm vì giảm giá lớn hơn tiền dịch vụ sau khi bớt khách. Số “khách trả dư” vì vậy lớn hơn tiền khách thật đã trả — Kế toán xem lại trước khi hoàn tiền cho khách.";
export const canhBaoTongAm = (total: number): string | null => (total < 0 ? CAU_TONG_AM : null);
