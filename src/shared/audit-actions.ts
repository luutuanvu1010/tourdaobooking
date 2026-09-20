// NGUỒN DUY NHẤT của các hành động nhật ký (audit_log.action) và loại đối tượng (audit_log.target_type).
// Server (kiểm đầu vào, ghi nhật ký) và giao diện (nhãn, bộ lọc) cùng import file này. Từ migration 0007 SQL không còn
// CHECK liệt kê → thêm hành động mới = thêm một dòng ở đây, không cần migration. Logic thuần, không import gì.

export const AUDIT_GROUPS = {
  order: "Đơn hàng",
  staff: "Tài khoản",
  catalog: "Dịch vụ",
  party: "Hồ sơ",
  location: "Địa điểm",
} as const;

export type AuditGroup = keyof typeof AUDIT_GROUPS;

export const AUDIT_ACTIONS = {
  created: { label: "Tạo đơn", group: "order" },
  updated: { label: "Sửa đơn", group: "order" },
  trip_updated: { label: "Sửa thông tin chuyến", group: "order" },
  confirmed: { label: "Xác nhận đơn", group: "order" },
  cancelled: { label: "Huỷ đơn", group: "order" },
  exported_png: { label: "Xuất PNG", group: "order" },
  exported_pdf: { label: "Xuất PDF", group: "order" },
  staff_created: { label: "Tạo tài khoản", group: "staff" },
  staff_updated: { label: "Sửa hồ sơ nhân viên", group: "staff" },
  staff_suspended: { label: "Ngưng tài khoản", group: "staff" },
  staff_reactivated: { label: "Kích hoạt lại tài khoản", group: "staff" },
  staff_role_changed: { label: "Đổi vai trò", group: "staff" },
  pin_reset: { label: "Đặt lại PIN", group: "staff" },
  pin_changed: { label: "Đổi PIN", group: "staff" },
  login_unlocked: { label: "Mở khoá đăng nhập", group: "staff" },
  staff_synced: { label: "Đồng bộ nhân viên từ Sheet", group: "staff" },
  permission_changed: { label: "Đổi quyền tài khoản", group: "staff" },
  party_created: { label: "Tạo hồ sơ", group: "party" },
  party_updated: { label: "Sửa hồ sơ", group: "party" },
  party_contact_changed: { label: "Đổi thông tin liên hệ", group: "party" },
  party_role_added: { label: "Thêm vai trò hồ sơ", group: "party" },
  party_role_ended: { label: "Kết thúc vai trò hồ sơ", group: "party" },
  party_relationship_changed: { label: "Đổi quan hệ hồ sơ", group: "party" },
  location_created: { label: "Thêm địa điểm", group: "location" },
  location_updated: { label: "Sửa địa điểm", group: "location" },
  catalog_synced: { label: "Đồng bộ dịch vụ từ Sheet", group: "catalog" },
  catalog_overridden: { label: "Ghi đè giá dịch vụ", group: "catalog" },
  catalog_override_cleared: { label: "Bỏ ghi đè dịch vụ", group: "catalog" },
  catalog_hidden: { label: "Ẩn dịch vụ", group: "catalog" },
  catalog_unhidden: { label: "Hiện lại dịch vụ", group: "catalog" },
} as const satisfies Record<string, { label: string; group: AuditGroup }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** Loại đối tượng của một dòng nhật ký — trùng với nhóm hành động. */
export type AuditTargetType = AuditGroup;

export const isAuditAction = (v: unknown): v is AuditAction => typeof v === "string" && Object.hasOwn(AUDIT_ACTIONS, v);

export const auditLabel = (a: AuditAction): string => AUDIT_ACTIONS[a].label;
