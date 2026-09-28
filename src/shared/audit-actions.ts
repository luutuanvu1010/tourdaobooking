// NGUỒN DUY NHẤT của các hành động nhật ký (audit_log.action) và loại đối tượng (audit_log.target_type).
// Server (kiểm đầu vào, ghi nhật ký) và giao diện (nhãn, bộ lọc) cùng import file này. Từ migration 0007 SQL không còn
// CHECK liệt kê → thêm hành động mới = thêm một dòng ở đây, không cần migration. Logic thuần, không import gì.

export const AUDIT_GROUPS = {
  order: "Đơn hàng",
  staff: "Tài khoản",
  catalog: "Dịch vụ",
  party: "Hồ sơ",
  location: "Địa điểm",
  feedback: "Góp ý",
  notice: "Thông báo",
  system: "Hệ thống",
} as const;

export type AuditGroup = keyof typeof AUDIT_GROUPS;

export const AUDIT_ACTIONS = {
  created: { label: "Tạo đơn", group: "order" },
  updated: { label: "Sửa đơn", group: "order" },
  trip_updated: { label: "Sửa thông tin chuyến", group: "order" },
  confirmed: { label: "Xác nhận đơn", group: "order" },
  cancelled: { label: "Huỷ đơn", group: "order" },
  order_cancelled_by_field: { label: "Huỷ đơn (hướng dẫn viên đang phụ trách)", group: "order" },
  order_money_adjusted_by_field: { label: "Sửa số khách (hướng dẫn viên đang phụ trách)", group: "order" },
  order_handler_changed: { label: "Đổi người phụ trách", group: "order" },
  order_claimed: { label: "Tự nhận phụ trách đơn", group: "order" },
  booker_changed: { label: "Đổi khách", group: "order" },
  exported_png: { label: "Xuất PNG", group: "order" },
  exported_pdf: { label: "Xuất PDF", group: "order" },
  staff_created: { label: "Tạo tài khoản", group: "staff" },
  staff_updated: { label: "Sửa hồ sơ nhân viên", group: "staff" },
  staff_suspended: { label: "Ngưng tài khoản", group: "staff" },
  staff_reactivated: { label: "Kích hoạt lại tài khoản", group: "staff" },
  staff_role_changed: { label: "Đổi vai trò", group: "staff" },
  pin_reset: { label: "Đặt lại PIN", group: "staff" },
  pin_changed: { label: "Đổi PIN", group: "staff" },
  passkey_added: { label: "Bật đăng nhập Face ID", group: "staff" },
  passkey_removed: { label: "Gỡ đăng nhập Face ID", group: "staff" },
  pin_set_by_passkey: { label: "Đặt PIN mới bằng Face ID", group: "staff" },
  login_unlocked: { label: "Mở khoá đăng nhập", group: "staff" },
  staff_synced: { label: "Đồng bộ nhân viên từ Sheet", group: "staff" },
  permission_changed: { label: "Đổi quyền tài khoản", group: "staff" },
  account_roles_changed: { label: "Đổi vai và quyền tài khoản", group: "staff" },
  party_created: { label: "Tạo hồ sơ", group: "party" },
  party_updated: { label: "Sửa hồ sơ", group: "party" },
  party_contact_changed: { label: "Đổi thông tin liên hệ", group: "party" },
  party_role_added: { label: "Thêm vai trò hồ sơ", group: "party" },
  party_role_ended: { label: "Kết thúc vai trò hồ sơ", group: "party" },
  party_relationship_changed: { label: "Đổi quan hệ hồ sơ", group: "party" },
  // ADR-0040 D2: giấy tờ của người — `detail` KHÔNG BAO GIỜ chứa số giấy tờ, nơi cấp (chiTietNhatKy của src/modules/parties/giay-to.ts).
  party_document_added: { label: "Thêm giấy tờ của người", group: "party" },
  party_document_renewed: { label: "Gia hạn giấy tờ của người", group: "party" },
  party_document_corrected: { label: "Sửa sai giấy tờ của người", group: "party" },
  location_created: { label: "Thêm địa điểm", group: "location" },
  location_updated: { label: "Sửa địa điểm", group: "location" },
  maintenance_changed: { label: "Đổi chế độ bảo trì", group: "system" },
  catalog_synced: { label: "Đồng bộ dịch vụ từ Sheet", group: "catalog" },
  catalog_overridden: { label: "Ghi đè giá dịch vụ", group: "catalog" },
  catalog_override_cleared: { label: "Bỏ ghi đè dịch vụ", group: "catalog" },
  catalog_hidden: { label: "Ẩn dịch vụ", group: "catalog" },
  catalog_unhidden: { label: "Hiện lại dịch vụ", group: "catalog" },
  feedback_created: { label: "Gửi yêu cầu góp ý", group: "feedback" },
  feedback_replied: { label: "Trả lời yêu cầu góp ý", group: "feedback" },
  feedback_status_changed: { label: "Đổi trạng thái yêu cầu góp ý", group: "feedback" },
  feedback_assigned: { label: "Đổi người xử lý yêu cầu góp ý", group: "feedback" },
  notice_sent: { label: "Gửi thông báo", group: "notice" },
  notice_revoked: { label: "Thu hồi thông báo", group: "notice" },
  notice_acknowledged: { label: "Xác nhận đã hiểu thông báo", group: "notice" },
} as const satisfies Record<string, { label: string; group: AuditGroup }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** Loại đối tượng của một dòng nhật ký — trùng với nhóm hành động. */
export type AuditTargetType = AuditGroup;

/**
 * ADR-0038: thao tác "im lặng" — dòng nhật ký VẪN ghi, nhưng khi người làm đang giữ Toàn quyền thì chỉ Toàn quyền xem được ở trang Nhật ký
 * (GET /api/audit). Thêm/bớt hành động ở đây là đổi quyền xem → cần chủ dự án duyệt (ADR mới hoặc sửa ADR-0038).
 */
export const SILENT_AUDIT_ACTIONS = [
  "account_roles_changed",
  "permission_changed",
  "staff_role_changed",
  "maintenance_changed",
  "pin_reset",
  "passkey_removed",
] as const satisfies readonly AuditAction[];

export const isAuditAction = (v: unknown): v is AuditAction => typeof v === "string" && Object.hasOwn(AUDIT_ACTIONS, v);

export const auditLabel = (a: AuditAction): string => AUDIT_ACTIONS[a].label;
