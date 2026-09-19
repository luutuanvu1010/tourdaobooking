import type { AuditAction, DepositMethod, OrderStatus } from "./api";

const nf = new Intl.NumberFormat("vi-VN");

/** 1350000 → "1.350.000 ₫" */
export const vnd = (n: number): string => `${nf.format(n)} ₫`;
export const grouped = (n: number): string => nf.format(n);

/** "1.350.000 đ" / "1350000" → 1350000; rỗng → 0. */
export function parseMoney(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export const dateTime = (iso: string): string =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const STATUS_LABEL: Record<OrderStatus, string> = { draft: "Nháp", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" };

export const METHOD_LABEL: Record<DepositMethod, string> = { cash: "Tiền mặt", bank_transfer: "Chuyển khoản", other: "Khác" };

export const ACTION_LABEL: Record<AuditAction, string> = {
  created: "Tạo đơn",
  updated: "Sửa đơn",
  confirmed: "Xác nhận đơn",
  cancelled: "Huỷ đơn",
  exported_png: "Xuất PNG",
  exported_pdf: "Xuất PDF",
  staff_created: "Tạo tài khoản",
  staff_updated: "Sửa hồ sơ nhân viên",
  staff_suspended: "Ngưng tài khoản",
  staff_reactivated: "Kích hoạt lại tài khoản",
  staff_role_changed: "Đổi vai trò",
  pin_reset: "Đặt lại PIN",
  pin_changed: "Đổi PIN",
  login_unlocked: "Mở khoá đăng nhập",
  staff_synced: "Đồng bộ nhân viên từ Sheet",
  catalog_synced: "Đồng bộ dịch vụ từ Sheet",
  catalog_overridden: "Ghi đè giá dịch vụ",
  catalog_override_cleared: "Bỏ ghi đè dịch vụ",
  catalog_hidden: "Ẩn dịch vụ",
  catalog_unhidden: "Hiện lại dịch vụ",
};
