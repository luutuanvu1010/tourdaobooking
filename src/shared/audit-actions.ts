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
  vehicle: "Xe", // ADR-0040 D1 (giả định G12): trang Nhật ký không có nhãn đối tượng cho xe — `detail` mở đầu bằng biển số
  trip: "Điều phối xe", // ADR-0049 (kế hoạch mục 1.1): chính sách điều phối, lý do; từ A13 thêm hành động chuyến `trip_*` (order_id luôn NULL — I17)
  system: "Hệ thống",
} as const;

export type AuditGroup = keyof typeof AUDIT_GROUPS;

export const AUDIT_ACTIONS = {
  created: { label: "Tạo đơn", group: "order" },
  updated: { label: "Sửa đơn", group: "order" },
  trip_updated: { label: "Sửa thông tin chuyến", group: "order" },
  // ADR-0047 A1: chặng đưa đón sau xác nhận — `detail` "Chiều đi · <tên dịch vụ>: giờ đón 06:30 → 07:00; nơi đón A → B" (chữ tự do che dãy số — moTaChang).
  order_leg_added: { label: "Thêm chặng đưa đón", group: "order" },
  order_leg_updated: { label: "Sửa chặng đưa đón", group: "order" },
  order_leg_closed: { label: "Bỏ chặng đưa đón", group: "order" },
  order_leg_short_notice: { label: "Đặt gấp chặng đưa đón", group: "order" }, // ADR-0049 D2 — detail: mã đơn + chiều + nhãn lý do (KHÔNG ghi chú)
  // ADR-0047 A2: `detail` ĐÚNG khuôn "thêm N, sửa N, huỷ N khách" — KHÔNG tên, KHÔNG năm sinh (Hiến chương 5.12; kiểm định kỳ R-ORD-10).
  order_passenger_changed: { label: "Sửa danh sách hành khách", group: "order" },
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
  party_document_number_viewed: { label: "Xem đủ số giấy tờ", group: "party" },
  party_document_catalog_changed: { label: "Sửa danh mục giấy tờ của người", group: "party" },
  vehicle_created: { label: "Thêm xe", group: "vehicle" },
  vehicle_updated: { label: "Sửa xe", group: "vehicle" },
  // Giấy tờ xe — `detail` mở đầu bằng biển số, KHÔNG số giấy tờ (một luật chung với giấy tờ của người — giả định G4).
  vehicle_document_added: { label: "Thêm giấy tờ xe", group: "vehicle" },
  vehicle_document_renewed: { label: "Gia hạn giấy tờ xe", group: "vehicle" },
  vehicle_document_corrected: { label: "Sửa sai giấy tờ xe", group: "vehicle" },
  vehicle_document_type_changed: { label: "Sửa danh mục loại giấy tờ xe", group: "vehicle" },
  expiry_policy_changed: { label: "Đổi mốc nhắc giấy tờ sắp hết hạn", group: "vehicle" },
  // ADR-0049 D2 (lát 1.1): chính sách điều phối, điều kiện xuất bến, hạng bằng (Toàn quyền), danh mục lý do (Quản trị). `detail` chỉ mã, con số, nhãn
  // danh mục; không order_id, không target (khuôn expiry_policy_changed).
  dispatch_policy_changed: { label: "Đổi chính sách điều phối", group: "trip" },
  departure_rule_added: { label: "Thêm điều kiện xuất bến", group: "trip" },
  departure_rule_closed: { label: "Đóng điều kiện xuất bến", group: "trip" },
  license_capacity_changed: { label: "Đổi số khách theo hạng bằng", group: "trip" },
  trip_reason_added: { label: "Thêm lý do điều phối", group: "trip" },
  trip_reason_updated: { label: "Sửa lý do điều phối", group: "trip" },
  trip_passengers_synced: { label: "Cập nhật khách theo đơn", group: "trip" }, // R-P29 (chủ lần 16) — route `cap-nhat-khach`; detail chỉ mã chuyến, mã đơn, SỐ khách
  trip_stops_synced: { label: "Cập nhật điểm theo đơn", group: "trip" }, // ADR-0050 VK1-B — route `cap-nhat-diem` (A13); detail chỉ mã đơn + tên nơi danh mục / "nơi tự do"
  // ADR-0049 D1 (Task A13): lệnh KẾ HOẠCH của chuyến xe. orderId NULL, targetType "trip" (I17). "Sửa chuyến xe" mang tên `trip_edited` — `trip_updated`
  // đã là hành động của orders ("Sửa thông tin chuyến" của ĐƠN, nhóm order) nên không dùng lại (GA-37).
  trip_created: { label: "Tạo chuyến xe", group: "trip" },
  trip_edited: { label: "Sửa chuyến xe", group: "trip" },
  trip_cancelled: { label: "Huỷ chuyến xe", group: "trip" },
  trip_allocated: { label: "Xếp khách lên xe", group: "trip" },
  trip_allocation_removed: { label: "Rút khách khỏi xe", group: "trip" },
  trip_allocation_moved: { label: "Dời khách sang chuyến khác", group: "trip" },
  // ADR-0049 D1, D3 (Task A15): lệnh TIẾN ĐỘ — tài xế bấm hoặc văn phòng bấm thay (detail ghi "văn phòng bấm thay"; khai giờ: "xảy ra lúc HH:MM").
  trip_departed: { label: "Xuất bến", group: "trip" },
  trip_stop_arrived: { label: "Xe đã tới điểm", group: "trip" },
  trip_passenger_boarded: { label: "Đã đón khách", group: "trip" },
  trip_passenger_no_show: { label: "Khách vắng", group: "trip" },
  trip_passenger_cancelled_at_stop: { label: "Khách đã huỷ tại điểm", group: "trip" },
  trip_passenger_dropped: { label: "Đã trả khách", group: "trip" },
  trip_stops_reordered: { label: "Đổi thứ tự điểm khi đang chạy", group: "trip" },
  trip_ended: { label: "Kết thúc chuyến", group: "trip" },
  trip_ended_interrupted: { label: "Kết thúc chuyến gián đoạn", group: "trip" },
  // ADR-0051 GB1: mốc giờ hẹn của chặng — orderId NULL (I17); detail danh sách trắng (mã đơn, chiều, "giờ hẹn đón A → B", mã chuyến).
  trip_appt_called: { label: "Đã gọi báo khách giờ hẹn mới", group: "trip" },
  trip_appt_call_undone: { label: "Bỏ đánh dấu đã gọi báo", group: "trip" },
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
