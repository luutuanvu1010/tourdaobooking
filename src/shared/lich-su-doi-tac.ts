// LỊCH SỬ ĐƠN CHO ĐỐI TÁC — DANH SÁCH CHO PHÉP (kiểm toán trước sử dụng 13/10/2026, lỗi D-1; chủ chốt cách vá).
// Người giữ quyền Đối tác (`holdsPartner` — kể cả tài khoản lai, "có quyền Đối tác là áp") chỉ thấy các hành động ở `LICH_SU_DOI_TAC_CHO_PHEP`, mỗi hành động kèm CÁCH
// giữ chữ `detail`; mọi hành động còn lại ẩn. Đổi chiều so với cách cũ (lọc kiểu CHẶN: mỗi loại dòng nhật ký thêm sau tự lộ cho Đối tác).
// Tên người làm GIỮ NGUYÊN trên các dòng được phép (như tin "đơn đổi sau xác nhận" — ADR-0062 đã cho Đối tác thấy tên người sửa); có ẩn tên nhân viên hay không là
// QUYẾT ĐỊNH CỦA CHỦ (xem báo cáo thi công D-1) — chưa làm.
// Ngoại lệ DUY NHẤT ngoài danh sách: dòng nhập phần mềm kế toán (`order_accounting_entry_*`) vẫn hiện cho tài khoản LAI có ô `accounting.entry.view` (ADR-0060 điều 3 (ii):
// luật theo ô, không theo danh tính "Đối tác"; Đối tác thuần không có ô nên không thấy).
// HÀNG RÀO MÁY: mọi hành động của `AUDIT_ACTIONS` phải nằm ở MỘT trong hai danh sách (`CHO_PHEP` hoặc `AN`) — thiếu thì `npm run typecheck` đỏ (kiểu `ChuaPhanLoai`
// bên dưới) và bài `src/lich-su-don-doi-tac.test.ts` đỏ. Bài đó còn khoá danh sách cho phép bằng một bản chủ duyệt đặt trong bài: đổi danh sách = đổi bài cùng lúc.
// Thuần, không I/O; chỉ MÁY CHỦ dùng (giao diện không import) nên không vào gói trang. Dùng ở `GET /api/orders/:id` (src/modules/orders/index.ts).
import type { AuditAction } from "./audit-actions.ts";
import type { AuditEntryDto } from "./contracts.ts";
import { NHOM_HUY_NHAN } from "./ly-do-huy.ts";
import { laDongNhapKeToan } from "./nhap-ke-toan.ts";
import { DAU_LY_DO } from "./tin-doi-don.ts";

/**
 * Cách giữ chữ `detail` của MỘT hành động được cho phép:
 * - `giu`: khuôn chữ cố định hoặc dữ liệu của chính đơn (giờ, chặng, số khách đổi) — không câu tự do của nhân viên;
 * - `bo`: bỏ hẳn (chữ có thể chứa lệch giá, ghi chú, lý do tự do);
 * - `chi-nhom-huy`: dòng huỷ — chỉ giữ NHÃN NHÓM lý do huỷ (công khai sẵn ở khối cọc), bỏ câu lý do (ghi chú "Khác" là chữ tự do);
 * - `cat-ly-do`: cắt đoạn " · lý do: …" (khuôn `ghepLyDo` của sửa số khách — lý do tự gõ luôn ở cuối).
 */
export type CachGiuChiTiet = "giu" | "bo" | "chi-nhom-huy" | "cat-ly-do";

/** Hành động Đối tác ĐƯỢC thấy (giao diện chi tiết đơn của Đối tác hiện đúng các dòng này). Mọi hành động khác: ẩn. Chủ dự án duyệt danh sách này. */
export const LICH_SU_DOI_TAC_CHO_PHEP = {
  created: "bo", // chữ cũ: lệch giá danh mục, ghi chú đổi bên đặt
  updated: "bo",
  trip_updated: "giu", // "<dịch vụ>: giờ đi 08:00 → 09:00, đổi điểm đón" — dữ liệu của chính đơn; chữ địa điểm / ghi chú chỉ ghi "đổi"
  order_leg_added: "giu", // chặng đưa đón: giờ / nơi của chính đơn (chữ tự do đã che dãy số — moTaChang)
  order_leg_updated: "giu",
  order_leg_closed: "giu",
  order_leg_short_notice: "giu", // đã rút gọn trước đó theo R-P21 ("Đặt gấp — Quản trị đã duyệt", người làm = "Quản trị")
  order_passenger_changed: "giu", // "thêm N, sửa N, huỷ N khách" — không tên, không năm sinh
  confirmed: "bo", // chữ cũ: lệch giá danh mục
  cancelled: "chi-nhom-huy",
  order_cancelled_by_field: "bo", // chữ cũ: nhãn lý do của hướng dẫn viên (ca "Khác" là chữ tự do)
  order_money_adjusted: "cat-ly-do",
  order_money_adjusted_by_field: "cat-ly-do",
  payment_recorded: "giu", // "trả trước" / "lúc Đã giao"
  order_delivered: "bo",
  order_completed: "bo",
} as const satisfies Partial<Record<AuditAction, CachGiuChiTiet>>;

/**
 * Hành động Đối tác KHÔNG được thấy — liệt kê tường minh để thêm hành động mới buộc phải có quyết định (kiểu `ChuaPhanLoai` + bài kiểm). Gồm: dòng sổ tiền / cọc /
 * đối soát (nội dung kế toán nội bộ, tên Kế toán, lý do duyệt), mức hoa hồng (đã ẩn từ sổ đại lý đợt 1), dấu nhập phần mềm kế toán (ADR-0060), phân loại lý do huỷ (chữ
 * tự do), phụ trách / nhận đơn, đổi khách, xuất PNG / PDF, và mọi hành động không gắn đơn (tài khoản, hồ sơ, xe, điều phối, danh mục, góp ý, thông báo, hệ thống).
 */
export const LICH_SU_DOI_TAC_AN = [
  // Nhóm đơn
  "order_cancel_reason_classified", "order_terms_captured", "order_terms_recaptured", "order_terms_manual", "order_accounting_entry_marked", "order_accounting_entry_unmarked",
  "order_handler_changed", "order_claimed", "booker_changed", "exported_png", "exported_pdf",
  // Sổ tiền, cọc đơn huỷ, đối soát
  "ledger_company_received", "ledger_settlement", "ledger_refund", "ledger_adjustment", "ledger_adjustment_requested", "ledger_adjustment_approved", "ledger_adjustment_rejected", "ledger_adjustment_withdrawn", "ledger_adjustment_affected",
  "ledger_receipt_replaced", "ledger_reversal", "ledger_bank_txn_linked",
  "deposit_refund_approved", "deposit_transfer_approved", "deposit_approval_voided", "deposit_refund_paid", "deposit_transferred_out", "deposit_transferred_in",
  "deposit_outside_recorded", "deposit_outside_confirmed", "deposit_outside_rejected", "prc_commission_rule_added", "prc_commission_rule_closed", "prc_supply_term_added",
  "prc_supply_term_closed", "prc_partner_type_added", "prc_partner_type_off", "prc_partner_type_on", "ledger_period_closed",
  // Không gắn đơn: tài khoản, hồ sơ
  "staff_created", "staff_updated", "staff_suspended", "staff_reactivated", "staff_role_changed", "pin_reset", "pin_changed", "passkey_added", "passkey_removed",
  "pin_set_by_passkey", "login_unlocked", "staff_synced", "permission_changed", "account_roles_changed", "session_policy_changed", "session_revoked",
  "party_created", "party_updated", "party_contact_changed", "party_role_added", "party_role_ended", "party_relationship_changed", "party_merged", "party_document_added",
  "party_document_renewed", "party_document_corrected", "party_document_number_viewed", "party_document_catalog_changed", "party_bank_account_changed",
  // Xe, điều phối
  "vehicle_created", "vehicle_updated", "vehicle_document_added", "vehicle_document_renewed", "vehicle_document_corrected", "vehicle_document_type_changed",
  "expiry_policy_changed", "vehicle_unavailability_added", "vehicle_unavailability_withdrawn",
  "driver_unavailability_added", "driver_unavailability_withdrawn", "dispatch_policy_changed", "departure_rule_added", "departure_rule_closed", "license_capacity_changed",
  "trip_reason_added", "trip_reason_updated", "transfer_template_set", "trip_passengers_synced", "trip_stops_synced", "trip_order_synced", "trip_created", "trip_edited",
  "trip_cancelled", "trip_allocated", "trip_allocation_removed", "trip_allocation_moved", "trip_departed", "trip_stop_arrived", "trip_passenger_boarded",
  "trip_passenger_no_show", "trip_passenger_cancelled_at_stop", "trip_passenger_dropped", "trip_stops_reordered", "trip_ended", "trip_ended_interrupted",
  "trip_stop_added_running", "trip_allocation_office_cancelled", "trip_passenger_named", "trip_allocation_corrected", "trip_departure_revoked", "trip_transfer_sent",
  "trip_transfer_withdrawn", "trip_transfer_declined", "trip_transfer_expired", "trip_transfer_escalated", "trip_transfer_confirmed", "trip_transfer_rejected",
  "trip_driver_refused", "trip_appt_called", "trip_appt_call_undone", "trip_cost_adjusted", "trip_cost_reversed", "trip_cost_snapshot", "trip_cost_agreed",
  "rental_rate_added", "rental_rate_closed", "route_saved", "vehicle_size_saved",
  // Địa điểm, danh mục, hệ thống, góp ý, thông báo
  "location_created", "location_updated", "maintenance_changed", "manual_service_policy_changed", "tro_ly_settings_changed", "giao_dien_changed", "client_outdated_body",
  "catalog_synced", "catalog_overridden", "catalog_override_cleared", "catalog_hidden", "catalog_unhidden", "catalog_group_created", "catalog_group_updated",
  "catalog_group_assigned", "catalog_groups_seeded", "feedback_created", "feedback_replied", "feedback_status_changed", "feedback_assigned",
  "feedback_team_created", "feedback_team_updated", "feedback_team_member_changed", "notice_sent", "notice_revoked",
  "notice_acknowledged",
] as const satisfies readonly AuditAction[];

/** Hành động mới trong `AUDIT_ACTIONS` chưa có ở danh sách nào ⇒ kiểu này khác `never` và dòng ngay dưới không biên dịch (`npm run typecheck` đỏ). */
type ChuaPhanLoai = Exclude<AuditAction, keyof typeof LICH_SU_DOI_TAC_CHO_PHEP | (typeof LICH_SU_DOI_TAC_AN)[number]>;
export const _phanLoaiDay: [ChuaPhanLoai] extends [never] ? true : never = true;

/** Hành động đã có chỗ ở một trong hai danh sách (bài kiểm dùng; kiểu `ChuaPhanLoai` lo phía biên dịch). */
export const daPhanLoaiChoDoiTac = (action: string): boolean =>
  Object.hasOwn(LICH_SU_DOI_TAC_CHO_PHEP, action) || (LICH_SU_DOI_TAC_AN as readonly string[]).includes(action);

/** `detail` của dòng huỷ → chỉ nhãn nhóm lý do huỷ. Khuôn ghi: "<nhãn lý do | ghi chú tự do> (<nhãn nhóm>)" — lấy đúng nhãn nhóm đứng cuối, không nhận ra thì null. */
function nhomHuyCuaChiTiet(detail: string): string | null {
  for (const nhan of Object.values(NHOM_HUY_NHAN)) if (detail.endsWith(` (${nhan})`)) return nhan;
  return null;
}

function giuChiTiet(cach: CachGiuChiTiet, detail: string | null): string | null {
  if (detail === null) return null;
  switch (cach) {
    case "giu": return detail;
    case "bo": return null;
    case "chi-nhom-huy": return nhomHuyCuaChiTiet(detail);
    case "cat-ly-do": {
      const i = detail.indexOf(DAU_LY_DO);
      // KIỂU ĐÓNG: không thấy dấu tách lý do (dòng ghi trước 8/10/2026, commit 62f97d74: toàn câu là lý do tự gõ của hướng dẫn viên) ⇒ bỏ cả chi tiết, không trả nguyên văn.
      return i < 0 ? null : detail.slice(0, i);
    }
  }
}

/**
 * Lịch sử đơn cho người giữ quyền Đối tác: chỉ hành động trong danh sách cho phép, `detail` theo cách của từng hành động; tên / id người làm giữ nguyên. `xemNhapKeToan` =
 * người xem qua ô `accounting.entry.view` của đơn này (tài khoản lai — ADR-0060): thêm các dòng nhập phần mềm kế toán, nguyên văn. Dựng dòng MỚI, không sửa mảng vào.
 * Gọi SAU `lichSuTheoVai(…, false)` (rút gọn dấu đặt gấp — R-P21, kể cả tài khoản lai có ô xem đủ).
 */
export function lichSuChoDoiTac(history: readonly AuditEntryDto[], xemNhapKeToan: boolean): AuditEntryDto[] {
  return history.flatMap((e) => {
    if (xemNhapKeToan && laDongNhapKeToan(e.action)) return [{ ...e }];
    if (!Object.hasOwn(LICH_SU_DOI_TAC_CHO_PHEP, e.action)) return [];
    const cach = LICH_SU_DOI_TAC_CHO_PHEP[e.action as keyof typeof LICH_SU_DOI_TAC_CHO_PHEP];
    return [{ ...e, detail: giuChiTiet(cach, e.detail) }];
  });
}
