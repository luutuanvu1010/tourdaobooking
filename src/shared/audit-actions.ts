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
  ledger: "Sổ tiền", // sổ tiền lượt 1 (ADR-0026): nộp/trả, xác nhận công ty đã nhận, hoàn khách, điều chỉnh, đảo — `detail` KHÔNG số tiền chi tiết, không SĐT
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
  order_cancel_reason_classified: { label: "Phân loại lý do huỷ", group: "order" },
  // ADR-0062 Đ1-a: `doiSoKhach: true` = hành động ghi dòng `order_money_adjustment` (một cửa insertMoneyAdjustment) — tự vào tập nguồn tin "đơn đổi sau xác
  // nhận". `detail` dòng mới: "số khách: <phần đổi> · lý do: <lý do>" (khuôn có hàm đọc canh — src/shared/tin-doi-don.ts).
  order_money_adjusted_by_field: { label: "Sửa số khách (hướng dẫn viên đang phụ trách)", group: "order", doiSoKhach: true },
  // ADR-0062 Đ1 cách (a): KHAI TRƯỚC cho đường văn phòng sửa số khách (ADR-0063 D1 — chưa duyệt, chưa route nào ghi). Bị bác thì nằm chết, vô hại.
  order_money_adjusted: { label: "Sửa số khách (văn phòng)", group: "order", doiSoKhach: true },
  // Sổ tiền lượt 1 (ADR-0025, ADR-0026) — `detail` không SĐT, không số tiền chi tiết (kế hoạch §3.4).
  order_delivered: { label: "Đã giao – đã thu đủ", group: "order" },
  order_completed: { label: "Hoàn thành", group: "order" },
  payment_recorded: { label: "Ghi lần thu", group: "order" },
  // ADR-0060: dấu "đã nhập phần mềm kế toán" (bảng chỉ-thêm bil_accounting_entry) — detail = moTaDauNhap (số hoá đơn nguyên văn; lý do đã chặn dãy số dài).
  // Lịch sử đơn BỎ hai hành động này với người không qua ô accounting.entry.view; không vào hộp thông báo (v_aud_order_event là danh sách cho phép).
  order_accounting_entry_marked: { label: "Đánh dấu đã nhập phần mềm kế toán", group: "order" },
  order_accounting_entry_unmarked: { label: "Bỏ dấu đã nhập phần mềm kế toán", group: "order" },
  ledger_company_received: { label: "Xác nhận công ty đã nhận", group: "ledger" },
  ledger_settlement: { label: "Ghi nộp / trả tiền", group: "ledger" },
  ledger_refund: { label: "Ghi hoàn khách", group: "ledger" },
  ledger_adjustment: { label: "Ghi điều chỉnh sổ", group: "ledger" },
  ledger_receipt_replaced: { label: "Thay lần thu", group: "ledger" },
  ledger_reversal: { label: "Ghi dòng đảo sổ", group: "ledger" },
  // ADR-0089 (cọc đơn huỷ — migration 0079): duyệt / huỷ duyệt / chi / chuyển / đã hoàn ngoài hệ thống. Không số tiền trong detail (chỉ lý do).
  deposit_refund_approved: { label: "Duyệt hoàn cọc", group: "ledger" },
  deposit_transfer_approved: { label: "Duyệt chuyển tiền sang đơn mới", group: "ledger" },
  deposit_approval_voided: { label: "Huỷ duyệt hoàn cọc", group: "ledger" },
  deposit_refund_paid: { label: "Ghi chi hoàn cọc", group: "ledger" },
  deposit_transferred_out: { label: "Chuyển tiền sang đơn mới", group: "ledger" },
  deposit_transferred_in: { label: "Nhận tiền chuyển từ đơn huỷ", group: "ledger" },
  deposit_outside_recorded: { label: "Ghi đã hoàn ngoài hệ thống", group: "ledger" },
  deposit_outside_confirmed: { label: "Xác nhận đã hoàn ngoài hệ thống", group: "ledger" },
  deposit_outside_rejected: { label: "Từ chối dòng đã hoàn ngoài hệ thống", group: "ledger" },
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
  // ADR-0068: gộp hồ sơ — HAI dòng (hồ sơ phụ + hồ sơ chính), `detail` chỉ tên hai hồ sơ + số dòng chuyển theo loại (KHÔNG SĐT, email, số giấy tờ).
  party_merged: { label: "Gộp hồ sơ", group: "party" },
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
  // ADR-0055 VK2-A A6 (Đợt 3): khung bận của xe — `detail` = biển số + khung giờ VN + nhãn lý do; không dữ liệu cá nhân.
  vehicle_unavailability_added: { label: "Ghi lịch xe bận", group: "vehicle" },
  vehicle_unavailability_withdrawn: { label: "Rút lịch xe bận", group: "vehicle" },
  // ADR-0049 D2 (lát 1.1): chính sách điều phối, điều kiện xuất bến, hạng bằng (Toàn quyền), danh mục lý do (Quản trị). `detail` chỉ mã, con số, nhãn
  // danh mục; không order_id, không target (khuôn expiry_policy_changed).
  dispatch_policy_changed: { label: "Đổi chính sách điều phối", group: "trip" },
  departure_rule_added: { label: "Thêm điều kiện xuất bến", group: "trip" },
  departure_rule_closed: { label: "Đóng điều kiện xuất bến", group: "trip" },
  license_capacity_changed: { label: "Đổi số khách theo hạng bằng", group: "trip" },
  trip_reason_added: { label: "Thêm lý do điều phối", group: "trip" },
  trip_reason_updated: { label: "Sửa lý do điều phối", group: "trip" },
  // ADR-0054 D10.1 (+ ADR nháp nơi trả mặc định, đã duyệt 1/10): mẫu đưa đón theo dịch vụ — `detail` = mã dịch vụ, chế độ cũ → mới, giờ gợi ý, nơi trả mặc định
  // (TÊN điểm danh mục). Không order_id, không dữ liệu cá nhân.
  transfer_template_set: { label: "Đổi mẫu đưa đón của dịch vụ", group: "trip" },
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
  // ADR-0052 D5 (Đợt 5): xe đang chạy — detail chỉ mã chuyến, mã đơn, SỐ người, nhãn lý do / tên nơi danh mục (không tên khách, không SĐT).
  trip_stop_added_running: { label: "Thêm điểm khi xe đang chạy", group: "trip" },
  trip_allocation_office_cancelled: { label: "Văn phòng báo huỷ khách", group: "trip" },
  // ADR-0052 D5b (Đợt 5 A-1b — chủ duyệt 5/10): tài xế bổ sung tên khách chưa có tên — detail mã chuyến, mã đơn, số người (không tên, năm sinh).
  trip_passenger_named: { label: "Tài xế bổ sung tên khách", group: "trip" },
  // ADR-0051 GB1: mốc giờ hẹn của chặng — orderId NULL (I17); detail danh sách trắng (mã đơn, chiều, "giờ hẹn đón A → B", mã chuyến).
  trip_appt_called: { label: "Đã gọi báo khách giờ hẹn mới", group: "trip" },
  trip_appt_call_undone: { label: "Bỏ đánh dấu đã gọi báo", group: "trip" },
  // ADR-0057 T1 (kế hoạch Đợt 4 Task 4): bảng giá thuê xe — detail: tên nhà xe, tên tuyến / nhãn cỡ, số tiền, ngày hiệu lực (C10); không SĐT.
  // ADR-0057 T2 C10 (Task 10): Kế toán / Quản trị ghi chi phí chuyến xe thuê — detail: mã chuyến, tên nhà xe, tổng trước → sau, nhãn lý do; KHÔNG ghi chú (chữ tự do).
  trip_cost_adjusted: { label: "Điều chỉnh chi phí xe thuê", group: "trip" },
  trip_cost_reversed: { label: "Đảo dòng chi phí xe thuê", group: "trip" },
  trip_cost_snapshot: { label: "Lấy lại giá bảng cho chuyến xe thuê", group: "trip" },
  trip_cost_agreed: { label: "Nhập giá thoả thuận chuyến xe thuê", group: "trip" },
  rental_rate_added: { label: "Thêm giá thuê xe", group: "trip" },
  rental_rate_closed: { label: "Kết thúc giá thuê xe", group: "trip" },
  route_saved: { label: "Lưu tuyến (bảng giá xe)", group: "trip" },
  vehicle_size_saved: { label: "Lưu cỡ xe (bảng giá xe)", group: "trip" },
  location_created: { label: "Thêm địa điểm", group: "location" },
  location_updated: { label: "Sửa địa điểm", group: "location" },
  maintenance_changed: { label: "Đổi chế độ bảo trì", group: "system" },
  // ADR-0061 điều 6: Toàn quyền bật / tắt "Dịch vụ nhập tay" (POST /api/cai-dat/nhap-tay) — không gắn đơn (orderId NULL); detail "Bật" / "Tắt".
  manual_service_policy_changed: { label: "Đổi công tắc dịch vụ nhập tay", group: "system" },
  // ADR-0069 điều 5 + Hiến chương 5.12: ai đổi cài đặt trợ lý Hỗ trợ lúc nào — detail chỉ nêu PHẦN đã đổi, KHÔNG nội dung lời dặn / ngữ cảnh.
  tro_ly_settings_changed: { label: "Đổi cài đặt trợ lý Hỗ trợ", group: "system" },
  // ADR-0087 điều 6: Toàn quyền đổi giao diện công ty — detail = các ô đổi (nhãn: cũ → mới), không dữ liệu cá nhân. KHÔNG im lặng (ADR-0038).
  giao_dien_changed: { label: "Đổi giao diện", group: "system" },
  // ADR-0047 §6 (Đợt 8): máy còn gửi thân đơn / thông tin chuyến KIỂU CŨ — dòng ĐẾM cho cổng cắt; order_id NULL, detail = nhãn màn hình, không nội dung thân.
  client_outdated_body: { label: "Máy dùng app bản cũ", group: "system" },
  catalog_synced: { label: "Đồng bộ dịch vụ từ Sheet", group: "catalog" },
  catalog_overridden: { label: "Ghi đè giá dịch vụ", group: "catalog" },
  catalog_override_cleared: { label: "Bỏ ghi đè dịch vụ", group: "catalog" },
  catalog_hidden: { label: "Ẩn dịch vụ", group: "catalog" },
  catalog_unhidden: { label: "Hiện lại dịch vụ", group: "catalog" },
  // ADR-0058 Đ3: nhóm dịch vụ — targetType "catalog". Nhóm: targetId NULL (mã nhóm máy sinh không lên trang Nhật ký), detail = tên / trước → sau.
  // Gán: targetId = mã dịch vụ, detail "Tour đảo → Thể thao biển" (tên; "Chưa phân loại" khi không nhóm), mỗi dịch vụ một dòng cùng lô.
  catalog_group_created: { label: "Thêm nhóm dịch vụ", group: "catalog" },
  catalog_group_updated: { label: "Sửa nhóm dịch vụ", group: "catalog" },
  catalog_group_assigned: { label: "Đổi nhóm của dịch vụ", group: "catalog" },
  catalog_groups_seeded: { label: "Gieo nhóm dịch vụ", group: "catalog" }, // do migration 0055 ghi một lần (detail "gieo 14 nhóm, N dịch vụ")
  feedback_created: { label: "Gửi yêu cầu góp ý", group: "feedback" },
  feedback_replied: { label: "Trả lời yêu cầu góp ý", group: "feedback" },
  feedback_status_changed: { label: "Đổi trạng thái yêu cầu góp ý", group: "feedback" },
  feedback_assigned: { label: "Đổi người xử lý yêu cầu góp ý", group: "feedback" },
  notice_sent: { label: "Gửi thông báo", group: "notice" },
  notice_revoked: { label: "Thu hồi thông báo", group: "notice" },
  notice_acknowledged: { label: "Xác nhận đã hiểu thông báo", group: "notice" },
  session_policy_changed: { label: "Đổi chính sách đăng nhập", group: "staff" }, // ADR-0085 điều 9: quyền đổi + giá trị mới + số máy/số người — KHÔNG tên, SĐT, IP
  session_revoked: { label: "Gỡ phiên đăng nhập", group: "staff" }, // ADR-0075 điều 8: ai gỡ, tài khoản bị gỡ (target), mã phiên (detail) — KHÔNG IP/User-Agent
} as const satisfies Record<string, { label: string; group: AuditGroup; doiSoKhach?: true }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** ADR-0062 Đ1-a: hành động mang cờ `doiSoKhach` — kiểu DẪN từ AUDIT_ACTIONS (tham số hành động của insertMoneyAdjustment chỉ nhận kiểu này). */
export type HanhDongDoiSoKhach = { [K in AuditAction]: (typeof AUDIT_ACTIONS)[K] extends { doiSoKhach: true } ? K : never }[AuditAction];
export const HANH_DONG_DOI_SO_KHACH: readonly HanhDongDoiSoKhach[] = (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter(
  (a): a is HanhDongDoiSoKhach => (AUDIT_ACTIONS[a] as { doiSoKhach?: true }).doiSoKhach === true,
);

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
  "session_policy_changed", // ADR-0085 điều 9
  "session_revoked", // ADR-0075 điều 8: cùng loại với pin_reset, passkey_removed
] as const satisfies readonly AuditAction[];

export const isAuditAction = (v: unknown): v is AuditAction => typeof v === "string" && Object.hasOwn(AUDIT_ACTIONS, v);

export const auditLabel = (a: AuditAction): string => AUDIT_ACTIONS[a].label;
