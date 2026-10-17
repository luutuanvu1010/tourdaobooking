// "Chạm quyền truy cập" (ADR-0125 đ5; lát H-4 Gói 2) — MỘT nguồn tên, khớp từng chữ với view v_aud_cham_tai_khoan (migration *_xac_minh_ho_so.sql).
// Thuần, không I/O. Đổi danh sách = migration mới tạo lại view + sửa tệp này cùng commit (bài cham-tai-khoan.test.ts).
import type { AuditAction } from "../../shared/audit-actions.ts";

/** Chữ nhật ký `staff_updated` khi đổi SĐT đăng nhập — accounts GHI bằng hằng này, view NHẬN bằng chính chữ này. */
export const CHI_TIET_DOI_SDT = "đổi SĐT đăng nhập";
export type LoaiCham = "TAO" | "VINH_VIEN" | "CUA_SO_30";

export const CHAM_TAI_KHOAN = {
  TAO: ["staff_created"],
  // Trao quyền đăng nhập thay: áp vĩnh viễn (chủ duyệt 2026-10-16 "bịt kẽ hở 30 ngày"). Hai tên ADR-0121 đặt trước, CHƯA ai ghi.
  VINH_VIEN: ["pin_reset", "mfa_reset", "mfa_grace_reopened", "mfa_exception_set"],
  CUA_SO_30: ["passkey_removed", "login_unlocked", "permission_changed", "account_roles_changed", "staff_role_changed"],
  CUA_SO_30_THEO_CHI_TIET: [{ action: "staff_updated", chua: CHI_TIET_DOI_SDT }],
  KHONG_CHAM: {
    staff_suspended: "Ngưng tài khoản lấy mất quyền đăng nhập, không trao quyền cho ai.",
    staff_reactivated: "Kích hoạt lại trả quyền cho chính chủ; ngoài danh sách của ADR-0125 đ5 — chờ chủ quyết (Q2 kế hoạch H-4).",
    pin_changed: "Chính chủ tự đổi PIN của mình.",
    passkey_added: "Chính chủ tự bật Face ID.",
    pin_set_by_passkey: "Chính chủ đặt PIN mới bằng Face ID của mình.",
    staff_synced: "Đồng bộ Sheet do hệ thống làm, không có người làm.",
    session_policy_changed: "Chính sách chung, không nhắm một tài khoản.",
    session_revoked: "Gỡ phiên chỉ lấy mất quyền đăng nhập.",
    mfa_enabled: "Chính chủ tự bật lớp hai.",
    mfa_removed: "Chính chủ tự gỡ lớp hai của mình.",
    mfa_recovery_regenerated: "Chính chủ tự tạo mã dự phòng.",
  },
} as const satisfies {
  TAO: readonly AuditAction[]; VINH_VIEN: readonly AuditAction[]; CUA_SO_30: readonly AuditAction[];
  CUA_SO_30_THEO_CHI_TIET: readonly { action: AuditAction; chua: string }[]; KHONG_CHAM: Readonly<Partial<Record<AuditAction, string>>>;
};
