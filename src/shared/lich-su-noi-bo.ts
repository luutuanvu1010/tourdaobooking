// LỊCH SỬ ĐƠN CHO NGƯỜI NỘI BỘ — LỚP THUẦN, DANH SÁCH CHO PHÉP (ADR-0131 Quyết định 1–2; mẫu: `lich-su-doi-tac.ts`, lỗi D-1).
// Người nội bộ KHÔNG giữ quyền đọc đủ nhật ký (chỉ Toàn quyền đọc đủ, ở trang Nhật ký) chỉ thấy các hành động ở `LICH_SU_NOI_BO_CHO_PHEP`, mỗi hành động kèm CÁCH giữ chữ
// `detail` (dùng lại bốn cách của D-1: `giu`, `bo`, `chi-nhom-huy`, `cat-ly-do`); mọi hành động còn lại ẩn. MỌI dòng trả ra đều không tên, không mã người làm
// (`anNguoiLam`: `staffId: null`, `staffName: ""`), kể cả dòng hệ thống và nhãn "Quản trị" của dòng đặt gấp.
// Ngoại lệ DUY NHẤT ngoài danh sách: dòng nhập phần mềm kế toán (`order_accounting_entry_*`) hiện khi người xem có ô `accounting.entry.view` của đơn (ADR-0060), đúng như
// lớp Đối tác — vì thế hai mã này nằm ở `LICH_SU_NOI_BO_AN`, không ở `CHO_PHEP`.
// Danh sách này chứa mọi thứ lớp Đối tác thấy (bài kiểm khoá) cộng nhóm "tiền của đơn trong sổ" (không gác thêm ô — ADR-0131 đ2b); khoá bằng bản chủ duyệt đặt trong
// `lich-su-noi-bo.test.ts`: đổi danh sách = đổi bài cùng lúc.
// HÀNG RÀO MÁY: mọi hành động của `AUDIT_ACTIONS` phải nằm ở MỘT trong hai danh sách — thiếu thì `npm run typecheck` đỏ (`_phanLoaiNoiBoDay`) và bài kiểm đỏ.
// Thuần, không I/O; chỉ MÁY CHỦ dùng. Gọi SAU `lichSuTheoVai`.
import type { AuditAction } from "./audit-actions.ts";
import type { AuditEntryDto } from "./contracts.ts";
import { anNguoiLam, giuChiTiet, type CachGiuChiTiet } from "./lich-su-doi-tac.ts";
import { laDongNhapKeToan } from "./nhap-ke-toan.ts";

/** Hành động người nội bộ ĐƯỢC thấy (chủ dự án duyệt — TRANG-GHEP.md mục 4). Mọi hành động khác: ẩn. */
export const LICH_SU_NOI_BO_CHO_PHEP = {
  // Đơn đổi gì
  created: "giu",
  updated: "giu",
  trip_updated: "giu",
  order_leg_added: "giu",
  order_leg_updated: "giu",
  order_leg_closed: "giu",
  order_leg_short_notice: "giu", // đã rút gọn trước bởi `lichSuTheoVai` cho người không có ô xem đủ (R-P21)
  order_passenger_changed: "giu",
  confirmed: "giu",
  cancelled: "giu",
  order_cancelled_by_field: "giu",
  order_cancel_reason_classified: "giu",
  order_money_adjusted: "giu",
  order_money_adjusted_by_field: "giu",
  payment_recorded: "giu",
  order_delivered: "giu",
  order_completed: "giu",
  order_handler_changed: "giu", // "từ <phụ trách cũ> sang <mới>" — dữ liệu của đơn, dòng không nói ai bấm
  order_claimed: "bo", // khuôn "… sang <tên>" luôn là CHÍNH người bấm: giữ dòng, bỏ chữ
  order_handler_refused: "giu", // chữ CHỈ là nhãn lý do (danh sách đóng) — không tên; Q2 (a) chủ 2026-10-23
  booker_changed: "giu",
  // Tiền của đơn trong sổ (không gác thêm ô — ADR-0131 đ2b)
  order_terms_captured: "giu",
  order_terms_recaptured: "giu",
  order_terms_manual: "giu",
  ledger_company_received: "giu",
  ledger_refund: "giu",
  ledger_adjustment_withdrawn: "giu",
  ledger_bank_txn_linked: "giu",
  deposit_refund_paid: "giu",
  deposit_transferred_out: "giu",
  deposit_transferred_in: "giu",
  ledger_adjustment: "giu",
  ledger_adjustment_requested: "giu",
  ledger_adjustment_approved: "giu",
  ledger_adjustment_rejected: "giu",
  ledger_adjustment_affected: "giu",
  ledger_receipt_replaced: "giu",
  ledger_reversal: "giu",
  deposit_refund_approved: "giu",
  deposit_transfer_approved: "giu",
  deposit_approval_voided: "giu",
  deposit_outside_recorded: "giu",
  deposit_outside_confirmed: "giu",
  deposit_outside_rejected: "giu",
} as const satisfies Partial<Record<AuditAction, CachGiuChiTiet>>;

/**
 * Hành động người nội bộ KHÔNG được thấy — liệt kê tường minh để thêm hành động mới buộc phải có quyết định. Gồm: dấu nhập phần mềm kế toán (hiện qua ngoại lệ ô, xem đầu
 * tệp), xuất PNG / PDF (không còn chỗ ghi trong mã), và mọi hành động không gắn đơn (tài khoản, hồ sơ, xe, điều phối, danh mục, địa điểm, góp ý, thông báo, hệ thống,
 * `ledger_settlement`, `ledger_period_closed`, `prc_*`).
 */
export const LICH_SU_NOI_BO_AN = [
  "order_accounting_entry_marked", "order_accounting_entry_unmarked", "exported_png", "exported_pdf", "ledger_settlement", "prc_commission_rule_added",
  "prc_commission_rule_closed", "prc_supply_term_added", "prc_supply_term_closed", "prc_partner_type_added", "prc_partner_type_off",
  "prc_partner_type_on", "prc_rate_tier_added", "prc_rate_tier_off", "prc_rate_tier_on", "prc_role_tier_set", "prc_role_tier_closed",
  "ledger_period_closed", "staff_created", "staff_updated", "staff_suspended", "staff_reactivated", "staff_role_changed", "pin_reset", "pin_changed",
  "passkey_added", "passkey_removed", "pin_set_by_passkey", "login_unlocked", "staff_synced", "permission_changed", "account_roles_changed",
  "session_policy_changed", "session_revoked", "mfa_enabled", "mfa_removed", "mfa_recovery_regenerated", "mfa_reset", "mfa_grace_reopened",
  "mfa_exception_set", "party_created", "party_updated", "party_contact_changed", "party_role_added", "party_role_ended", "party_relationship_changed",
  "party_merged", "party_document_added", "party_document_renewed", "party_document_corrected", "party_document_number_viewed",
  "party_document_catalog_changed", "party_bank_account_changed", "party_attachment_added", "party_attachment_viewed", "party_attachment_purged",
  "party_attachment_purge_retried", "privacy_policy_published", "privacy_consent_given", "privacy_consent_withdrawn", "self_submission_created",
  "self_submission_withdrawn", "self_submission_accepted", "self_submission_rejected", "self_submission_number_viewed", "party_erasure_requested",
  "party_erasure_withdrawn", "party_erased", "party_erasure_rejected", "party_erasure_retried", "sessions_anonymized", "vehicle_created",
  "vehicle_updated", "vehicle_document_added", "vehicle_document_renewed", "vehicle_document_corrected", "vehicle_document_type_changed",
  "expiry_policy_changed", "vehicle_unavailability_added", "vehicle_unavailability_withdrawn", "driver_unavailability_added",
  "driver_unavailability_withdrawn", "dispatch_policy_changed", "departure_rule_added", "departure_rule_closed", "license_capacity_changed",
  "trip_reason_added", "trip_reason_updated", "transfer_template_set", "trip_passengers_synced", "trip_stops_synced", "trip_order_synced",
  "trip_created", "trip_edited", "trip_cancelled", "trip_allocated", "trip_allocation_removed", "trip_allocation_moved", "trip_departed",
  "trip_stop_arrived", "trip_passenger_boarded", "trip_passenger_no_show", "trip_passenger_cancelled_at_stop", "trip_passenger_dropped",
  "trip_stops_reordered", "trip_ended", "trip_ended_interrupted", "trip_stop_added_running", "trip_allocation_office_cancelled", "trip_passenger_named",
  "trip_allocation_corrected", "trip_departure_revoked", "trip_transfer_sent", "trip_transfer_withdrawn", "trip_transfer_declined",
  "trip_transfer_expired", "trip_transfer_escalated", "trip_transfer_confirmed", "trip_transfer_rejected", "trip_driver_refused", "trip_appt_called",
  "trip_appt_call_undone", "trip_cost_adjusted", "trip_cost_reversed", "trip_cost_snapshot", "trip_cost_agreed", "rental_rate_added",
  "rental_rate_closed", "route_saved", "vehicle_size_saved", "location_created", "location_updated", "maintenance_changed",
  "manual_service_policy_changed", "pickup_slot_policy_changed", "tro_ly_settings_changed", "giao_dien_changed", "client_outdated_body", "catalog_synced", "catalog_overridden",
  "catalog_override_cleared", "catalog_hidden", "catalog_unhidden", "catalog_group_created", "catalog_group_updated", "catalog_group_assigned",
  "catalog_groups_seeded", "feedback_created", "feedback_replied", "feedback_status_changed", "feedback_assigned", "feedback_claimed",
  "feedback_team_changed", "feedback_priority_changed", "feedback_team_created", "feedback_team_updated", "feedback_team_member_changed", "notice_sent",
  "notice_revoked", "notice_acknowledged",
  // Sổ đại lý đợt 2 (chụp bù — ADR-0079 điều 7 b2; «Bên kia đã nhận» — ADR-0132 điều 2): loại dòng MỚI nên mặc định ẩn cho tới khi chủ dự án xếp loại (ADR-0131
  // «Nói thẳng hệ quả»). Chuyển sang `LICH_SU_NOI_BO_CHO_PHEP` = đổi bản chủ duyệt trong `lich-su-noi-bo.test.ts` cùng lúc.
  "ord_terms_backfilled", "ledger_counterparty_confirmed",
  // ADR-0032 (hạn mức Từ chối — G3 kế hoạch 2026-10-23): chạm hạn mức không đổi đơn và luôn nói về chính người bấm («tên người bấm chỉ Toàn quyền thấy»);
  // đổi cài đặt / đặt lại không gắn đơn. Toàn quyền đọc ở trang Nhật ký.
  "refuse_limit_hit", "refuse_policy_changed", "refuse_counter_reset",
] as const satisfies readonly AuditAction[];

/** Hành động mới trong `AUDIT_ACTIONS` chưa có ở danh sách nội bộ nào ⇒ kiểu này khác `never` và dòng ngay dưới không biên dịch (`npm run typecheck` đỏ). */
type ChuaPhanLoaiNoiBo = Exclude<AuditAction, keyof typeof LICH_SU_NOI_BO_CHO_PHEP | (typeof LICH_SU_NOI_BO_AN)[number]>;
export const _phanLoaiNoiBoDay: [ChuaPhanLoaiNoiBo] extends [never] ? true : never = true;

/** Hành động đã có chỗ ở một trong hai danh sách nội bộ (bài kiểm dùng; kiểu `ChuaPhanLoaiNoiBo` lo phía biên dịch). */
export const daPhanLoaiChoNoiBo = (action: string): boolean =>
  Object.hasOwn(LICH_SU_NOI_BO_CHO_PHEP, action) || (LICH_SU_NOI_BO_AN as readonly string[]).includes(action);

/**
 * Lịch sử đơn cho người nội bộ không đọc đủ nhật ký: chỉ hành động trong danh sách cho phép, `detail` theo cách của từng hành động, MỌI dòng bỏ tên / mã người làm.
 * `xemNhapKeToan` = người xem qua ô `accounting.entry.view` của đơn này (ADR-0060): thêm các dòng nhập phần mềm kế toán, nguyên chữ. Dựng dòng MỚI, không sửa mảng vào.
 * Gọi SAU `lichSuTheoVai` (rút gọn dấu đặt gấp — R-P21).
 */
export function lichSuNoiBo(history: readonly AuditEntryDto[], xemNhapKeToan: boolean): AuditEntryDto[] {
  return history.flatMap((e) => {
    if (xemNhapKeToan && laDongNhapKeToan(e.action)) return [anNguoiLam(e)];
    if (!Object.hasOwn(LICH_SU_NOI_BO_CHO_PHEP, e.action)) return [];
    const cach = LICH_SU_NOI_BO_CHO_PHEP[e.action as keyof typeof LICH_SU_NOI_BO_CHO_PHEP];
    return [anNguoiLam({ ...e, detail: giuChiTiet(cach, e.detail) })];
  });
}
