// Bài "lịch sử đơn cho người NỘI BỘ" (ADR-0131 Quyết định 1–2): lớp nội bộ là danh sách CHO PHÉP, mọi dòng không tên và không mã người làm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS } from "./audit-actions.ts";
import type { AuditEntryDto } from "./contracts.ts";
import { LICH_SU_DOI_TAC_CHO_PHEP } from "./lich-su-doi-tac.ts";
import { LICH_SU_NOI_BO_AN, LICH_SU_NOI_BO_CHO_PHEP, daPhanLoaiChoNoiBo, lichSuNoiBo } from "./lich-su-noi-bo.ts";

const TEN = "Tên Độc Nhất 7391";
const dong = (action: string, detail: string | null = null, staffId: string | null = "u1", staffName = TEN): AuditEntryDto =>
  ({ action, staffId, staffName, at: "2026-10-18T00:00:00.000Z", detail }) as AuditEntryDto;

/** Bản CHỦ DUYỆT chép tay từ TRANG-GHEP.md mục 4. Đổi danh sách trong mã = đổi bài này cùng lúc. */
const DUYET = {
  created: "giu", updated: "giu", trip_updated: "giu", order_leg_added: "giu", order_leg_updated: "giu", order_leg_closed: "giu", order_leg_short_notice: "giu",
  order_passenger_changed: "giu", confirmed: "giu", cancelled: "giu", order_cancelled_by_field: "giu", order_cancel_reason_classified: "giu",
  order_money_adjusted: "giu", order_money_adjusted_by_field: "giu", payment_recorded: "giu", order_delivered: "giu", order_completed: "giu",
  order_confirm_requested: "giu", order_confirm_withdrawn: "giu", // ADR-0136 Task 3.3: khuôn cố định, không dữ liệu khách
  order_handler_changed: "giu", order_claimed: "bo", order_handler_refused: "giu", booker_changed: "giu",
  order_terms_captured: "giu", order_terms_recaptured: "giu", order_terms_manual: "giu",
  ledger_company_received: "giu", ledger_refund: "giu", ledger_adjustment_withdrawn: "giu", ledger_bank_txn_linked: "giu", deposit_refund_paid: "giu",
  deposit_transferred_out: "giu", deposit_transferred_in: "giu",
  ledger_adjustment: "giu", ledger_adjustment_requested: "giu", ledger_adjustment_approved: "giu", ledger_adjustment_rejected: "giu", ledger_adjustment_affected: "giu",
  ledger_receipt_replaced: "giu", ledger_reversal: "giu",
  deposit_refund_approved: "giu", deposit_transfer_approved: "giu", deposit_approval_voided: "giu", deposit_outside_recorded: "giu",
  deposit_outside_confirmed: "giu", deposit_outside_rejected: "giu",
};

test("mọi hành động của AUDIT_ACTIONS nằm ở ĐÚNG MỘT danh sách nội bộ", () => {
  for (const a of Object.keys(AUDIT_ACTIONS)) {
    assert.ok(daPhanLoaiChoNoiBo(a), `${a} chưa phân loại cho nội bộ`);
    const ca = Object.hasOwn(LICH_SU_NOI_BO_CHO_PHEP, a), an = (LICH_SU_NOI_BO_AN as readonly string[]).includes(a);
    assert.ok(ca !== an, `${a} phải ở đúng một danh sách (cho phép=${ca}, ẩn=${an})`);
  }
  assert.equal(new Set(LICH_SU_NOI_BO_AN).size, LICH_SU_NOI_BO_AN.length, "danh sách ẩn có mã trùng");
});

test("nội bộ thấy ít nhất mọi thứ Đối tác thấy", () => {
  for (const a of Object.keys(LICH_SU_DOI_TAC_CHO_PHEP)) assert.ok(Object.hasOwn(LICH_SU_NOI_BO_CHO_PHEP, a), `${a} Đối tác thấy mà nội bộ không`);
});

test("danh sách cho phép khớp bản chủ duyệt", () => {
  assert.deepEqual(LICH_SU_NOI_BO_CHO_PHEP, DUYET);
});

test("lichSuNoiBo bỏ tên và mã người làm ở mọi dòng, kể cả dòng hệ thống", () => {
  const ra = lichSuNoiBo([dong("updated", "x"), dong("confirmed", null, null, "Hệ thống (tự động)")], false);
  assert.equal(ra.length, 2);
  for (const e of ra) assert.ok(e.staffId === null && e.staffName === "", `${e.action} còn người làm`);
  const s = JSON.stringify(ra);
  assert.ok(!s.includes(TEN) && !s.includes("u1") && !s.includes("Hệ thống"));
});

test("dòng 'Văn phòng' của đặt gấp cũng thành nhãn rỗng", () => {
  const [e] = lichSuNoiBo([dong("order_leg_short_notice", "Chiều đi · Điều chỉnh khẩn cấp (văn phòng)", null, "Văn phòng")], false);
  assert.deepEqual([e.staffId, e.staffName], [null, ""]);
});

test("order_claimed giữ dòng, bỏ chữ", () => {
  const ra = lichSuNoiBo([dong("order_claimed", `từ chưa có người phụ trách sang ${TEN}`)], false);
  assert.equal(ra.length, 1);
  assert.equal(ra[0].detail, null);
});

test("order_handler_refused (Q2 (a), chủ 2026-10-23): giữ dòng VÀ chữ — chữ chỉ là nhãn lý do; không tên, không mã người làm", () => {
  const ra = lichSuNoiBo([dong("order_handler_refused", "Bận lịch khác")], false);
  assert.equal(ra.length, 1);
  assert.equal(ra[0].detail, "Bận lịch khác");
  assert.deepEqual([ra[0].staffId, ra[0].staffName], [null, ""]);
});

test("exported_png bị ẩn; dòng nhập kế toán chỉ khi có ô", () => {
  assert.deepEqual(lichSuNoiBo([dong("exported_png")], false), []);
  assert.deepEqual(lichSuNoiBo([dong("exported_png")], true), []);
  const nk = dong("order_accounting_entry_marked", "nguyên chữ");
  assert.deepEqual(lichSuNoiBo([nk], false), []);
  const ra = lichSuNoiBo([nk], true);
  assert.equal(ra.length, 1);
  assert.equal(ra[0].detail, "nguyên chữ");
  assert.ok(ra[0].staffId === null && ra[0].staffName === "");
});

test("chữ giữ nguyên ở dòng cho thấy; không sửa mảng vào", () => {
  const vao = [dong("trip_updated", "Tour đảo: giờ đi 08:00 → 09:00")];
  const ra = lichSuNoiBo(vao, false);
  assert.equal(ra[0].detail, "Tour đảo: giờ đi 08:00 → 09:00");
  assert.equal(vao[0].staffName, TEN, "mảng vào bị sửa");
});
