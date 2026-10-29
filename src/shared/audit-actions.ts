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
  order_leg_added: { label: "Thêm lượt đưa đón", group: "order" },
  order_leg_updated: { label: "Sửa lượt đưa đón", group: "order" },
  order_leg_closed: { label: "Bỏ lượt đưa đón", group: "order" },
  order_leg_short_notice: { label: "Đặt gấp lượt đưa đón", group: "order" }, // ADR-0049 D2 — detail: mã đơn + chiều + nhãn lý do (KHÔNG ghi chú)
  // ADR-0047 A2: `detail` ĐÚNG khuôn "thêm N, sửa N, huỷ N khách" — KHÔNG tên, KHÔNG năm sinh (Hiến chương 5.12; kiểm định kỳ R-ORD-10).
  order_passenger_changed: { label: "Sửa danh sách hành khách", group: "order" },
  confirmed: { label: "Xác nhận đơn", group: "order" },
  // ADR-0136 Đ3: gửi / rút lại yêu cầu xác nhận — `detail` là khuôn cố định ("Gửi xác nhận · cần: dịch vụ cần xác nhận / đặt gấp"), không dữ liệu khách.
  order_confirm_requested: { label: "Gửi xác nhận đơn", group: "order" },
  order_confirm_withdrawn: { label: "Rút lại yêu cầu xác nhận", group: "order" },
  cancelled: { label: "Huỷ đơn", group: "order" },
  order_cancelled_by_field: { label: "Huỷ đơn (hướng dẫn viên đang phụ trách)", group: "order" },
  order_cancel_reason_classified: { label: "Phân loại lý do huỷ", group: "order" },
  // ADR-0062 Đ1-a: `doiSoKhach: true` = hành động ghi dòng `order_money_adjustment` (một cửa insertMoneyAdjustment) — tự vào tập nguồn tin "đơn đổi sau xác
  // nhận". `detail` dòng mới: "số khách: <phần đổi> · lý do: <lý do>" (khuôn có hàm đọc canh — src/shared/tin-doi-don.ts).
  order_money_adjusted_by_field: { label: "Sửa số khách (hướng dẫn viên đang phụ trách)", group: "order", doiSoKhach: true },
  // ADR-0062 Đ1 cách (a): KHAI TRƯỚC cho đường văn phòng sửa số khách (ADR-0063 D1 — chưa duyệt, chưa route nào ghi). Bị bác thì nằm chết, vô hại.
  order_money_adjusted: { label: "Sửa số khách (văn phòng)", group: "order", doiSoKhach: true },
  // Sổ đại lý đợt 1 (ADR-0077 điều 8): chụp mức hoa hồng + người bán của từng dòng lúc Xác nhận — `detail` chỉ đếm dòng (không tỷ lệ, không tiền, không tên đối tác).
  order_terms_captured: { label: "Chụp mức hoa hồng lúc xác nhận", group: "order" },
  order_terms_recaptured: { label: "Chụp lại mức khi đổi bên đặt", group: "order" },
  order_terms_manual: { label: "Ghi mức hoa hồng tay", group: "order" }, // Task 5: Kế toán / Quản trị / Toàn quyền ghi mức hoặc người bán cho một dịch vụ; detail "<dịch vụ>: mức trước → sau" (không tiền khách, không a%, không lý do); lịch sử đơn lọc bỏ khi người xem giữ quyền Đối tác
  // Sổ đại lý đợt 2, Task 6 (ADR-0079 điều 7 b2, C4 = A): Kế toán bấm «Chụp bù» cho đơn xác nhận trước khi có bảng mức — `detail` chỉ ngày chụp + đếm dòng (khuôn `moTaChup`:
  // không tỷ lệ, không tiền, không tên đối tác). Tiền tố `ord_terms_` thuộc nhóm hành động thương mại (`laHanhDongThuongMai`); ẩn khỏi lịch sử đơn của Đối tác.
  ord_terms_backfilled: { label: "Chụp bù mức hoa hồng", group: "order" },
  // Sổ tiền lượt 1 (ADR-0025, ADR-0026) — `detail` không SĐT, không số tiền chi tiết (kế hoạch §3.4).
  order_delivered: { label: "Đã giao – đã thu đủ", group: "order" },
  order_completed: { label: "Hoàn thành", group: "order" },
  payment_recorded: { label: "Ghi khoản thu", group: "order" },
  // ADR-0060: dấu "đã nhập phần mềm kế toán" (bảng chỉ-thêm bil_accounting_entry) — detail = moTaDauNhap (số hoá đơn nguyên văn; lý do đã chặn dãy số dài).
  // Lịch sử đơn BỎ hai hành động này với người không qua ô accounting.entry.view; không vào hộp thông báo (v_aud_order_event là danh sách cho phép).
  order_accounting_entry_marked: { label: "Đánh dấu đã nhập phần mềm kế toán", group: "order" },
  order_accounting_entry_unmarked: { label: "Bỏ đánh dấu đã nhập phần mềm kế toán", group: "order" },
  ledger_company_received: { label: "Xác nhận công ty đã nhận", group: "ledger" },
  // Sổ đại lý đợt 2 (ADR-0132 điều 2): Kế toán xác nhận khoản khách trả cho bên đặt / tại quầy nhà cung cấp — không detail (không tên bên kia, không số).
  ledger_counterparty_confirmed: { label: "Xác nhận bên kia đã nhận", group: "ledger" },
  ledger_settlement: { label: "Ghi nộp / trả tiền", group: "ledger" },
  ledger_refund: { label: "Ghi hoàn khách", group: "ledger" },
  ledger_adjustment: { label: "Ghi điều chỉnh sổ", group: "ledger" },
  // ADR-0115 đợt 1 (migration 0094): điều chỉnh công nợ cần người thứ hai duyệt. `ledger_adjustment` (trên) vẫn là dòng ghi SỐ DƯ TRƯỚC / SAU lúc DUYỆT. Các dòng dưới là
  // nguồn tin báo (ADR-0034; view v_aud_ledger_event — chỉ khoá, KHÔNG detail): `target` là khoá NGƯỜI NHẬN (yêu cầu mới / rút = ('ledger', mã yêu cầu), người nhận tính lúc
  // đọc theo ô `ledger.adjust.approve`; duyệt / từ chối = ('staff', người tạo); "đổi số dư của bạn" = ('staff', nhân viên bị đổi)). `detail` chỉ lý do đã che dãy số dài.
  ledger_adjustment_requested: { label: "Gửi yêu cầu điều chỉnh sổ", group: "ledger" },
  ledger_adjustment_approved: { label: "Duyệt yêu cầu điều chỉnh sổ", group: "ledger" },
  ledger_adjustment_rejected: { label: "Từ chối yêu cầu điều chỉnh sổ", group: "ledger" },
  ledger_adjustment_withdrawn: { label: "Rút yêu cầu điều chỉnh sổ", group: "ledger" },
  ledger_adjustment_affected: { label: "Điều chỉnh đổi số dư của một nhân viên", group: "ledger" },
  ledger_receipt_replaced: { label: "Sửa khoản thu đã ghi", group: "ledger" },
  ledger_reversal: { label: "Huỷ một dòng sổ tiền", group: "ledger" },
  // ADR-0092 Đ6 (migration 0088): gắn mã giao dịch ngân hàng vào khoản thu — target = khoản thu (`ledger`, id khoản thu); `detail` = "gắn mã giao dịch ngân hàng"
  // (chữ cố định); KHÔNG chép mã giao dịch, không số tài khoản.
  ledger_bank_txn_linked: { label: "Gắn mã giao dịch ngân hàng", group: "ledger" },
  // ADR-0089 (cọc đơn huỷ — migration 0079): duyệt / huỷ duyệt / chi / chuyển / đã hoàn ngoài hệ thống. Không số tiền trong detail (chỉ lý do).
  deposit_refund_approved: { label: "Duyệt hoàn thu trước", group: "ledger" },
  deposit_transfer_approved: { label: "Duyệt chuyển tiền sang đơn mới", group: "ledger" },
  deposit_approval_voided: { label: "Huỷ duyệt hoàn thu trước", group: "ledger" },
  deposit_refund_paid: { label: "Ghi chi hoàn thu trước", group: "ledger" },
  deposit_transferred_out: { label: "Chuyển tiền sang đơn mới", group: "ledger" },
  deposit_transferred_in: { label: "Nhận tiền chuyển từ đơn huỷ", group: "ledger" },
  deposit_outside_recorded: { label: "Ghi đã hoàn ngoài hệ thống", group: "ledger" },
  deposit_outside_confirmed: { label: "Xác nhận đã hoàn ngoài hệ thống", group: "ledger" },
  deposit_outside_rejected: { label: "Từ chối dòng đã hoàn ngoài hệ thống", group: "ledger" },
  // Sổ đại lý đợt 1 (ADR-0077, ADR-0078 B1; module pricing): thêm / đóng dòng mức hoa hồng và điều khoản người bán — `order_id` NULL; `detail` = mô tả lời thường
  // ("<đối tượng> · <phạm vi> · <mức>"), KHÔNG SĐT, không tiền khách.
  prc_commission_rule_added: { label: "Thêm mức hoa hồng", group: "ledger" },
  prc_commission_rule_closed: { label: "Ngừng mức hoa hồng", group: "ledger" },
  prc_supply_term_added: { label: "Thêm điều khoản người bán", group: "ledger" },
  prc_supply_term_closed: { label: "Ngừng điều khoản người bán", group: "ledger" },
  // ADR-0117 lần 1: Kế toán / Quản trị / Toàn quyền thêm, tắt, bật LOẠI ĐỐI TÁC — `detail` = tên loại (đã cấm số điện thoại / email trong tên), không mã thô.
  prc_partner_type_added: { label: "Thêm loại đối tác", group: "ledger" },
  prc_partner_type_off: { label: "Tắt loại đối tác", group: "ledger" },
  prc_partner_type_on: { label: "Bật lại loại đối tác", group: "ledger" },
  // ADR-0117 lần 2: mức TA dùng chung — `detail` = tên mức / «tên loại → tên mức · từ … đến …» (tên đã cấm số điện thoại / email), không mã thô. Dòng của mức đi qua
  // `prc_commission_rule_added` / `_closed` (đối tượng «mức TA <tên>»).
  prc_rate_tier_added: { label: "Thêm chính sách hoa hồng", group: "ledger" },
  prc_rate_tier_off: { label: "Tắt chính sách hoa hồng", group: "ledger" },
  prc_rate_tier_on: { label: "Bật lại chính sách hoa hồng", group: "ledger" },
  prc_role_tier_set: { label: "Áp dụng chính sách hoa hồng cho loại", group: "ledger" },
  prc_role_tier_closed: { label: "Ngừng áp dụng chính sách hoa hồng cho loại", group: "ledger" },
  prc_party_tier_set: { label: "Áp dụng chính sách hoa hồng riêng cho đối tác", group: "ledger" },
  prc_party_tier_closed: { label: "Ngừng áp dụng chính sách hoa hồng riêng của đối tác", group: "ledger" },
  // ADR-0148 Đ1: nút «Sửa» huỷ dòng chưa đơn nào chụp và thay hẳn bằng dòng mới (đi cùng `_added` / `_set` của dòng mới). `detail` = «sửa · dòng <cũ> → <mới> · huỷ dòng cũ» —
  // KHÔNG chép lý do sửa (lý do ở cột `change_reason` của dòng mới). Sửa dòng ĐÃ có đơn chụp đóng dòng cũ ⇒ đi qua `_closed`.
  prc_commission_rule_voided: { label: "Huỷ mức hoa hồng nhập sai (đã thay bằng dòng sửa)", group: "ledger" },
  prc_role_tier_voided: { label: "Huỷ lần áp dụng chính sách cho loại (đã thay bằng dòng sửa)", group: "ledger" },
  prc_party_tier_voided: { label: "Huỷ chính sách riêng của đối tác (đã thay bằng dòng sửa)", group: "ledger" },
  // Khoá sổ tháng (ADR-0080 D1; module ky-so — route ở billing): `order_id` NULL; `detail` = "Khoá sổ tháng MM/YYYY" (không tiền, không SĐT).
  ledger_period_closed: { label: "Khoá sổ tháng", group: "ledger" },
  order_handler_changed: { label: "Đổi người phụ trách", group: "order" },
  order_claimed: { label: "Tự nhận phụ trách đơn", group: "order" },
  // ADR-0030 điều 1 (nút Từ chối): người phụ trách tự trả đơn. `detail` = CHỈ nhãn lý do (danh sách đóng `ly-do-tu-choi.ts`) — không tên (Q2 (a), chủ 2026-10-23).
  order_handler_refused: { label: "Trả đơn (Từ chối)", group: "order" },
  // ADR-0032 (hạn mức Từ chối): `detail` CHỈ là số (chuỗi / tuần / mức / chế độ) — không tên, không SĐT. Ẩn ở cả hai lớp lịch sử rút gọn (G3 kế hoạch
  // 2026-10-23): Toàn quyền đọc ở trang Nhật ký. `refuse_limit_hit` gắn đơn đang Từ chối; hai hành động sau không gắn đơn.
  refuse_limit_hit: { label: "Chạm hạn mức Từ chối", group: "order" },
  booker_changed: { label: "Đổi khách", group: "order" },
  exported_png: { label: "Xuất PNG", group: "order" },
  exported_pdf: { label: "Xuất PDF", group: "order" },
  staff_created: { label: "Tạo tài khoản", group: "staff" },
  staff_updated: { label: "Sửa hồ sơ nhân viên", group: "staff" },
  staff_suspended: { label: "Ngưng tài khoản", group: "staff" },
  staff_reactivated: { label: "Kích hoạt lại tài khoản", group: "staff" },
  staff_role_changed: { label: "Đổi vai trò", group: "staff" },
  refuse_counter_reset: { label: "Đặt lại số lần Từ chối", group: "staff" }, // ADR-0032 điều 7: đích = hồ sơ (một người) hoặc không đích (tất cả); không tên trong detail
  pin_reset: { label: "Đặt lại PIN", group: "staff" },
  pin_changed: { label: "Đổi PIN", group: "staff" },
  passkey_added: { label: "Bật đăng nhập Face ID", group: "staff" },
  passkey_removed: { label: "Gỡ đăng nhập Face ID", group: "staff" },
  pin_set_by_passkey: { label: "Đặt PIN mới bằng Face ID", group: "staff" },
  login_unlocked: { label: "Mở khoá đăng nhập", group: "staff" },
  staff_synced: { label: "Đồng bộ nhân viên từ Sheet", group: "staff" },
  permission_changed: { label: "Đổi quyền tài khoản", group: "staff" },
  account_roles_changed: { label: "Đổi vai trò và quyền tài khoản", group: "staff" },
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
  // ADR-0123 (kho tệp hồ sơ, lát H-2 Gói 2): `detail` CHỈ MÃ — "<tên loại giấy tờ> · tệp <mã tệp>" / "tệp <mã> · <mã lý do>"; KHÔNG tên tệp gốc, khoá kho, băm.
  party_attachment_added: { label: "Thêm ảnh giấy tờ", group: "party" },
  party_attachment_viewed: { label: "Mở ảnh giấy tờ", group: "party" },
  party_attachment_purged: { label: "Quyết xoá ảnh giấy tờ khỏi kho", group: "party" },
  party_attachment_purge_retried: { label: "Chạy lại xoá ảnh khỏi kho", group: "system" },
  // ADR-0124, ADR-0126 đ1 (lát H-3 Gói 2): `detail` CHỈ MÃ / NHÃN — "phiên bản <n>", "phiếu <mã> · <nhãn loại>[ · <tên loại giấy tờ>]"; KHÔNG ngày sinh, địa chỉ, số, nơi cấp,
  // chữ chính sách (Hiến chương 5.20).
  privacy_policy_published: { label: "Đăng chính sách riêng tư", group: "system" },
  privacy_consent_given: { label: "Đồng ý chính sách riêng tư", group: "party" },
  privacy_consent_withdrawn: { label: "Rút đồng ý chính sách riêng tư", group: "party" },
  self_submission_created: { label: "Gửi phiếu tự khai hồ sơ", group: "party" },
  self_submission_withdrawn: { label: "Rút phiếu tự khai hồ sơ", group: "party" },
  self_submission_accepted: { label: "Chấp nhận phiếu tự khai hồ sơ", group: "party" },
  self_submission_rejected: { label: "Từ chối phiếu tự khai hồ sơ", group: "party" },
  party_erasure_requested: { label: "Gửi yêu cầu xoá dữ liệu", group: "party" },
  party_erasure_withdrawn: { label: "Rút yêu cầu xoá dữ liệu", group: "party" },
  party_erased: { label: "Thực hiện yêu cầu xoá dữ liệu", group: "party" },
  party_erasure_rejected: { label: "Từ chối yêu cầu xoá dữ liệu", group: "party" },
  party_erasure_retried: { label: "Chạy lại việc xoá dữ liệu", group: "system" },
  sessions_anonymized: { label: "Ẩn danh IP và thông tin máy đã đăng xuất", group: "system" }, // ADR-0126 đ8: chỉ số phiên + mốc kết thúc, KHÔNG IP / User-Agent
  self_submission_number_viewed: { label: "Xem đủ số giấy tờ của phiếu tự khai", group: "party" },
  party_document_catalog_changed: { label: "Sửa danh mục giấy tờ của người", group: "party" },
  // ADR-0108 đ2: cài / đổi tài khoản nhận tiền của công ty chủ — target = hồ sơ công ty; `detail` = "cài|đổi tài khoản nhận tiền" (chữ cố định); KHÔNG chép số tài khoản (5.12).
  party_bank_account_changed: { label: "Đổi tài khoản nhận tiền", group: "party" },
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
  // ADR-0053 D9 (kế hoạch A4 T8, G-A4-20): tài xế báo bận / rút khung của CHÍNH mình — detail chỉ khoảng giờ (không lý do, không tên).
  driver_unavailability_added: { label: "Tài xế báo bận", group: "trip" },
  driver_unavailability_withdrawn: { label: "Tài xế rút khung bận", group: "trip" },
  // ADR-0049 D2 (lát 1.1): chính sách điều phối, điều kiện xuất bến, hạng bằng (Toàn quyền), danh mục lý do (Quản trị). `detail` chỉ mã, con số, nhãn
  // danh mục; không order_id, không target (khuôn expiry_policy_changed).
  dispatch_policy_changed: { label: "Đổi chính sách điều phối", group: "trip" },
  departure_rule_added: { label: "Thêm điều kiện cho xe chạy", group: "trip" },
  departure_rule_closed: { label: "Đóng điều kiện cho xe chạy", group: "trip" },
  license_capacity_changed: { label: "Đổi số khách theo hạng bằng", group: "trip" },
  trip_reason_added: { label: "Thêm lý do điều phối", group: "trip" },
  trip_reason_updated: { label: "Sửa lý do điều phối", group: "trip" },
  // ADR-0054 D10.1 (+ ADR nháp nơi trả mặc định, đã duyệt 1/10): mẫu đưa đón theo dịch vụ — `detail` = mã dịch vụ, chế độ cũ → mới, giờ gợi ý, nơi trả mặc định
  // (TÊN điểm danh mục). Không order_id, không dữ liệu cá nhân.
  transfer_template_set: { label: "Đổi mẫu đưa đón của dịch vụ", group: "trip" },
  trip_passengers_synced: { label: "Cập nhật khách theo đơn", group: "trip" }, // R-P29 (chủ lần 16) — route `cap-nhat-khach`; detail chỉ mã chuyến, mã đơn, nhãn nguyên nhân, SỐ ghế (ADR-0104 Đ2.11)
  trip_stops_synced: { label: "Cập nhật điểm theo đơn", group: "trip" }, // ADR-0050 VK1-B — route `cap-nhat-diem` (A13); detail chỉ mã đơn + tên nơi danh mục / "nơi tự do"
  // ADR-0104 Đ2.9: máy cập nhật chuyến theo đơn — một dòng mỗi KHÚC chuyến của lô đồng bộ (cùng lô với lệnh đơn); staff_id = người vừa sửa đơn; detail chỉ mã
  // chuyến, mã đơn, nhãn nguyên nhân cố định, số ghế trả / thêm (LC-18). KHÔNG phải một trong ba hành động tin có điều kiện (HANH_DONG_TIN_KHACH).
  trip_order_synced: { label: "Máy cập nhật chuyến theo đơn", group: "trip" },
  // ADR-0049 D1 (Task A13): lệnh KẾ HOẠCH của chuyến xe. orderId NULL, targetType "trip" (I17). "Sửa chuyến xe" mang tên `trip_edited` — `trip_updated`
  // đã là hành động của orders ("Sửa thông tin chuyến" của ĐƠN, nhóm order) nên không dùng lại (GA-37).
  trip_created: { label: "Tạo chuyến xe", group: "trip" },
  trip_edited: { label: "Sửa chuyến xe", group: "trip" },
  trip_cancelled: { label: "Huỷ chuyến xe", group: "trip" },
  trip_allocated: { label: "Xếp khách lên xe", group: "trip" },
  trip_allocation_removed: { label: "Rút khách khỏi xe", group: "trip" },
  trip_allocation_moved: { label: "Dời khách sang chuyến khác", group: "trip" },
  // ADR-0049 D1, D3 (Task A15): lệnh TIẾN ĐỘ — tài xế bấm hoặc văn phòng bấm thay (detail ghi "văn phòng bấm thay"; khai giờ: "xảy ra lúc HH:MM").
  trip_departed: { label: "Cho xe chạy", group: "trip" },
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
  // ADR-0097 Đ2, Đ3 (gói A1, V3-B): văn phòng sửa sai bằng sự kiện điều chỉnh có lý do — detail: mã chuyến, mã đơn, "một suất A → B · nhãn lý do" / nhãn lý do
  // thu hồi (không tên khách, không SĐT — Đ2.6).
  trip_allocation_corrected: { label: "Văn phòng điều chỉnh kết quả khách", group: "trip" },
  trip_departure_revoked: { label: "Văn phòng thu hồi lệnh cho xe chạy", group: "trip" },
  // ADR-0111 (gói A5): đề nghị chuyển khách giữa hai xe — target = chuyến ĐÍCH; detail chỉ mã hai chuyến, phạm vi, SỐ khách, nhãn lý do, mã điều kiện không
  // đạt (không tên khách, năm sinh, SĐT, chữ nơi gặp, khoá nơi — LC-18).
  trip_transfer_sent: { label: "Gửi đề nghị chuyển khách", group: "trip" },
  trip_transfer_withdrawn: { label: "Rút đề nghị chuyển khách", group: "trip" },
  trip_transfer_declined: { label: "Xe nhận không nhận khách", group: "trip" },
  trip_transfer_expired: { label: "Đề nghị chuyển khách hết giờ chờ", group: "trip" },
  trip_transfer_escalated: { label: "Đề nghị chuyển khách chờ văn phòng duyệt", group: "trip" },
  trip_transfer_confirmed: { label: "Chuyển khách sang xe khác", group: "trip" },
  trip_transfer_rejected: { label: "Văn phòng không duyệt đề nghị chuyển khách", group: "trip" },
  // ADR-0053 D8.4 (kế hoạch A4 T7, G-A4-20): tài xế từ chối chuyến mình đang lái trước hạn — detail: mã chuyến + mã lý do (không tên, không chữ tự do).
  trip_driver_refused: { label: "Tài xế từ chối chuyến", group: "trip" },
  // ADR-0051 GB1: mốc giờ hẹn của chặng — orderId NULL (I17); detail danh sách trắng (mã đơn, chiều, "giờ hẹn đón A → B", mã chuyến).
  trip_appt_called: { label: "Đã gọi báo khách giờ hẹn mới", group: "trip" },
  trip_appt_call_undone: { label: "Bỏ đánh dấu đã gọi báo", group: "trip" },
  // ADR-0057 T1 (kế hoạch Đợt 4 Task 4): bảng giá thuê xe — detail: tên nhà xe, tên tuyến / nhãn cỡ, số tiền, ngày hiệu lực (C10); không SĐT.
  // ADR-0057 T2 C10 (Task 10): Kế toán / Quản trị ghi chi phí chuyến xe thuê — detail: mã chuyến, tên nhà xe, tổng trước → sau, nhãn lý do; KHÔNG ghi chú (chữ tự do).
  trip_cost_adjusted: { label: "Điều chỉnh chi phí xe thuê", group: "trip" },
  trip_cost_reversed: { label: "Huỷ dòng chi phí xe thuê", group: "trip" },
  trip_cost_snapshot: { label: "Lấy lại giá bảng cho chuyến xe thuê", group: "trip" },
  trip_cost_agreed: { label: "Nhập giá thoả thuận chuyến xe thuê", group: "trip" },
  rental_rate_added: { label: "Thêm giá thuê xe", group: "trip" },
  rental_rate_closed: { label: "Kết thúc giá thuê xe", group: "trip" },
  route_saved: { label: "Lưu tuyến (bảng giá xe)", group: "trip" },
  vehicle_size_saved: { label: "Lưu cỡ xe (bảng giá xe)", group: "trip" },
  location_created: { label: "Thêm địa điểm", group: "location" },
  location_updated: { label: "Sửa địa điểm", group: "location" },
  maintenance_changed: { label: "Đổi chế độ bảo trì", group: "system" },
  refuse_policy_changed: { label: "Đổi hạn mức Từ chối", group: "system" }, // ADR-0032 điều 7: «Chế độ: … → …; liên tiếp … → …; mỗi tuần … → …»
  // ADR-0061 điều 6: Toàn quyền bật / tắt "Dịch vụ nhập tay" (POST /api/cai-dat/nhap-tay) — không gắn đơn (orderId NULL); detail "Bật" / "Tắt".
  manual_service_policy_changed: { label: "Đổi công tắc dịch vụ nhập tay", group: "system" },
  pickup_slot_policy_changed: { label: "Đổi khung giờ đón", group: "system" },
  // ADR-0136 Đ1, Đ5: cờ «cần xác nhận» theo dịch vụ / nhóm, công tắc «nội bộ tự xác nhận» — `detail` ghi mã dịch vụ / nhóm (không dữ liệu khách).
  confirm_flag_changed: { label: "Đổi cờ cần xác nhận", group: "system" },
  confirm_policy_changed: { label: "Đổi công tắc tự xác nhận", group: "system" },
  // ADR-0069 điều 5 + Hiến chương 5.12: ai đổi cài đặt trợ lý Hỗ trợ lúc nào — detail chỉ nêu PHẦN đã đổi, KHÔNG nội dung lời dặn / ngữ cảnh.
  tro_ly_settings_changed: { label: "Đổi cài đặt trợ lý Hỗ trợ", group: "system" },
  // ADR-0087 điều 6: Toàn quyền đổi giao diện công ty — detail = các ô đổi (nhãn: cũ → mới), không dữ liệu cá nhân. KHÔNG im lặng (ADR-0038).
  giao_dien_changed: { label: "Đổi giao diện", group: "system" },
  // ADR-0047 §6 (Đợt 8): máy còn gửi thân đơn / thông tin chuyến KIỂU CŨ — dòng ĐẾM cho cổng cắt; order_id NULL, detail = nhãn màn hình, không nội dung thân.
  client_outdated_body: { label: "Máy dùng Nền tảng bản cũ", group: "system" },
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
  catalog_groups_seeded: { label: "Gieo nhóm dịch vụ", group: "catalog" },
  // ADR-0149 Đ1: ô «Được đón không» của một dịch vụ — targetId = mã dịch vụ, detail "Theo nhóm → Không đón" (nhãn; không dữ liệu cá nhân).
  catalog_service_transfer_set: { label: "Đổi đưa đón của dịch vụ", group: "catalog" }, // do migration 0055 ghi một lần (detail "gieo 14 nhóm, N dịch vụ")
  feedback_created: { label: "Gửi yêu cầu góp ý", group: "feedback" },
  feedback_replied: { label: "Trả lời yêu cầu góp ý", group: "feedback" },
  feedback_status_changed: { label: "Đổi trạng thái yêu cầu góp ý", group: "feedback" },
  feedback_assigned: { label: "Đổi người xử lý yêu cầu góp ý", group: "feedback" },
  // ADR-0119 điều 8: thành viên nhóm tự nhận việc; targetId = id phiếu, detail CHỈ mã phiếu (YC-…).
  feedback_claimed: { label: "Nhận việc yêu cầu hỗ trợ", group: "feedback" },
  // ADR-0119 điều 8: chuyển phiếu sang nhóm khác; targetId = id phiếu, detail CHỈ mã phiếu (YC-…) — không tên nhóm, không lý do (lý do là ghi chú nội bộ).
  feedback_team_changed: { label: "Chuyển nhóm yêu cầu hỗ trợ", group: "feedback" },
  // ADR-0127 (đợt 2a): đổi mức ưu tiên; targetId = id phiếu, detail CHỈ mã phiếu + mức cũ → mới (vd "YC-0007: NORMAL → URGENT") — không tiêu đề, không mã đơn.
  feedback_priority_changed: { label: "Đổi mức ưu tiên yêu cầu hỗ trợ", group: "feedback" },
  // ADR-0144: tệp kèm tin vé hỗ trợ — targetId = id phiếu; detail CHỈ mã phiếu (khi đã có) + mã tệp (+ mã lý do khi quyết xoá) — không tên tệp, không khoá kho,
  // không băm (N3), không nội dung. Mở tệp: một dòng mỗi lần, ghi TRƯỚC khi đọc kho (Hiến chương 5.22). Chạy lại: targetType "system", detail chỉ số đếm.
  feedback_attachment_added: { label: "Đính kèm tệp vào yêu cầu hỗ trợ", group: "feedback" },
  feedback_attachment_viewed: { label: "Mở tệp kèm yêu cầu hỗ trợ", group: "feedback" },
  feedback_attachment_purged: { label: "Gỡ hoặc quyết xoá tệp kèm yêu cầu hỗ trợ", group: "feedback" },
  feedback_attachment_purge_retried: { label: "Chạy lại xoá tệp vé hỗ trợ khỏi kho", group: "system" },
  // ADR-0119 (Vé hỗ trợ đợt 1): targetId = id nhóm; detail CHỈ mã nhóm (+ vai với thành viên) — KHÔNG tên/mô tả nhóm, KHÔNG tên người, SĐT.
  feedback_team_created: { label: "Tạo nhóm hỗ trợ", group: "feedback" },
  feedback_team_updated: { label: "Sửa nhóm hỗ trợ", group: "feedback" },
  feedback_team_member_changed: { label: "Đổi thành viên nhóm hỗ trợ", group: "feedback" },
  notice_sent: { label: "Gửi thông báo", group: "notice" },
  notice_revoked: { label: "Thu hồi thông báo", group: "notice" },
  notice_acknowledged: { label: "Xác nhận đã hiểu thông báo", group: "notice" },
  session_policy_changed: { label: "Đổi chính sách đăng nhập", group: "staff" }, // ADR-0085 điều 9: quyền đổi + giá trị mới + số máy/số người — KHÔNG tên, SĐT, IP
  session_revoked: { label: "Đăng xuất một máy đang đăng nhập", group: "staff" }, // ADR-0075 điều 8: ai gỡ, tài khoản bị gỡ (target), mã phiên (detail) — KHÔNG IP/User-Agent
  // ADR-0074 điều 5 (tự phục vụ): detail CHỈ loại yếu tố ("TOTP") — KHÔNG khoá, mã, mã dự phòng, email.
  mfa_enabled: { label: "Bật bảo mật hai lớp", group: "staff" },
  mfa_removed: { label: "Gỡ bảo mật hai lớp", group: "staff" },
  mfa_recovery_regenerated: { label: "Tạo bộ mã dự phòng mới", group: "staff" },
  // ADR-0074 điều 5 (kế hoạch Task 6): Quản trị/Toàn quyền tắt lớp hai của người khác — chỉ người làm (staff_id) + người bị tắt (target); KHÔNG email, mã, chi tiết.
  // KHÔNG thuộc SILENT_AUDIT_ACTIONS (vòng sửa 1: chưa có ADR duyệt cho nó im lặng) — hiện như mọi thao tác thường.
  mfa_reset: { label: "Tắt bảo mật hai lớp của tài khoản", group: "staff" },
  // ADR-0121 đ4, đ7 + ADR-0125 đ5: TÊN đặt trước ở lát H-4 (chưa route nào ghi). Lát ADR-0121 PHẢI ghi đúng hai tên này, target_type 'staff', target_id = tài khoản,
  // staff_id = người làm, CÙNG LÔ với thay đổi — nếu không, vế "vĩnh viễn" của luật tách nhiệm vụ xác minh hở (view v_aud_cham_tai_khoan). KHÔNG chi tiết.
  mfa_grace_reopened: { label: "Mở lại đăng nhập 24 giờ khi chưa bật bảo mật hai lớp", group: "staff" },
  mfa_exception_set: { label: "Đặt ngoại lệ tạm bảo mật hai lớp", group: "staff" },
} as const satisfies Record<string, { label: string; group: AuditGroup; doiSoKhach?: true }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** ADR-0062 Đ1-a: hành động mang cờ `doiSoKhach` — kiểu DẪN từ AUDIT_ACTIONS (tham số hành động của insertMoneyAdjustment chỉ nhận kiểu này). */
export type HanhDongDoiSoKhach = { [K in AuditAction]: (typeof AUDIT_ACTIONS)[K] extends { doiSoKhach: true } ? K : never }[AuditAction];
// `@__PURE__`: hằng tính lúc nạp tệp — không chú thích thì esbuild phải giữ cả bảng AUDIT_ACTIONS trong gói của MỌI trang có nhập tệp này (vd qua web/format.ts),
// làm gói trang Đơn hàng vượt trần (bài src/goi-trang-nhe.test.ts). Có chú thích: trang không dùng hằng thì bỏ được cả lời gọi lẫn bảng.
export const HANH_DONG_DOI_SO_KHACH: readonly HanhDongDoiSoKhach[] = /* @__PURE__ */ (() => (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter(
  (a): a is HanhDongDoiSoKhach => (AUDIT_ACTIONS[a] as { doiSoKhach?: true }).doiSoKhach === true,
))();

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

/**
 * Sổ đại lý đợt 1, bước K-a (luật "ai thấy tiền của ai" — Hiến chương K4; đặc tả đợt 1: "có quyền Đối tác là áp"): hành động mà `detail` chở MỨC thương mại (tỷ lệ,
 * đ/khách, người bán). Trang Nhật ký (`GET /api/audit`) bỏ các dòng này khi người xem giữ quyền Đối tác — kể cả tài khoản lai Toàn quyền + Đối tác — như lịch sử đơn
 * lọc `order_terms_*` (`laDongThuongMai`). Theo tiền tố (`order_terms_`, `ord_terms_` — chụp bù của sổ đại lý đợt 2 —, `prc_`): hành động mới cùng tiền tố tự vào. Danh sách dựng ở máy chủ (`audit/repository.ts`) — tính ở đầu tệp dùng chung
 * này kéo cả bảng nhãn vào gói giao diện (bài `src/goi-trang-nhe.test.ts`). Bài canh: `src/so-la-thuong-mai-toan-nen-tang.test.ts`.
 */
export const laHanhDongThuongMai = (a: string): boolean => a.startsWith("order_terms_") || a.startsWith("ord_terms_") || a.startsWith("prc_");

export const isAuditAction = (v: unknown): v is AuditAction => typeof v === "string" && Object.hasOwn(AUDIT_ACTIONS, v);

export const auditLabel = (a: AuditAction): string => AUDIT_ACTIONS[a].label;
