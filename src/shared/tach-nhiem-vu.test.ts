// ADR-0187 Đ3 mức (a): luật thuần «tự ghi đơn mình lập».
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauTrangThaiSoat, dauTuGhiThan, NHAN_CAN_SOAT, NHAN_TU_GHI, NUT_DA_SOAT, tuGhiDonMinhLap } from "./tach-nhiem-vu.ts";
import { AUDIT_ACTIONS, HANH_DONG_GHI_TIEN } from "./audit-actions.ts";

test("tuGhiDonMinhLap: đúng khi người gọi là người lập; sai khi khác người, đơn không rõ người lập", () => {
  assert.equal(tuGhiDonMinhLap("a", "a"), true);
  assert.equal(tuGhiDonMinhLap("a", "b"), false);
  assert.equal(tuGhiDonMinhLap(null, "a"), false);
  assert.equal(tuGhiDonMinhLap(undefined, "a"), false);
  assert.equal(tuGhiDonMinhLap("", ""), false, "chuỗi rỗng không phải người lập");
});

test("dauTuGhiThan: chỉ thêm cờ khi có dấu", () => {
  assert.deepEqual(dauTuGhiThan(true), { tuGhiDonMinhLap: true });
  assert.deepEqual(dauTuGhiThan(false), {});
});

test("chữ nguyên văn ADR-0187 Đ3 mức (a) đã duyệt", () => {
  assert.equal(NHAN_TU_GHI, "Tự ghi đơn mình lập");
  assert.equal(NHAN_CAN_SOAT, "Cần người thứ hai soát");
  assert.equal(NUT_DA_SOAT, "Đã soát");
  assert.equal(cauTrangThaiSoat({ nguoiSoat: null, soatLuc: null }, (s) => s), "Chưa soát");
  assert.equal(cauTrangThaiSoat({ nguoiSoat: "Kế Toán B", soatLuc: "x" }, (s) => `[${s}]`), "Đã soát · Kế Toán B · [x]");
});

test("HANH_DONG_GHI_TIEN: đúng tập hành động nhật ký mà các route của O_GHI_TIEN ghi (đổi tập = đổi bài có chủ đích); không gồm hành động của luồng thường", () => {
  assert.deepEqual([...HANH_DONG_GHI_TIEN].sort(), [
    "attribution_posted", "attribution_reversed", // phan-dinh/:id/ghi, /huy — ledger.write
    "deposit_refund_paid", // coc/chi — payment.refund
    "deposit_transferred_in", "deposit_transferred_out", // coc/chuyen — ledger.write
    "ledger_company_received", "ledger_counterparty_confirmed", // company-receipts, counterparty-receipts confirm — ledger.write
    "ledger_receipt_replaced", // receipt-replacements — ledger.write
    "ledger_refund", // refunds — payment.refund
    "ledger_reversal", // adjustments (dao_lan_thu / dao_dong) — ledger.write
    "ledger_settlement", // settlements — ledger.write
    "order_accounting_entry_marked", "order_accounting_entry_unmarked", // nhap-ke-toan — accounting.entry.mark
    "order_completed", // completed — order.complete
  ]);
  for (const a of ["created", "payment_recorded", "order_delivered", "ledger_adjustment", "ledger_adjustment_approved"]) assert.ok(!HANH_DONG_GHI_TIEN.includes(a as never), `${a} không phải hành động ghi tiền của O_GHI_TIEN`);
  for (const a of HANH_DONG_GHI_TIEN) assert.equal((AUDIT_ACTIONS[a] as { ghiTien?: true }).ghiTien, true);
  assert.deepEqual({ ...AUDIT_ACTIONS.ledger_self_write_reviewed }, { label: "Đã soát dòng tiền tự ghi đơn mình lập", group: "ledger" });
});
