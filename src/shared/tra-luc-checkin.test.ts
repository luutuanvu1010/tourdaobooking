// Luật thuần «Trả lúc check-in» (ADR-0230 Đ2 mục 3): ai được chọn — dùng CHUNG cổng lưu đơn của máy chủ và form Tạo đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CHECKIN_CHI_TIEN_MAT, NHAN_TRA_LUC_CHECKIN, TRA_LUC_CHECKIN, cauNhacCheckin, checkinChiTienMat, traLucCheckinDuocChon, traLucCheckinHopLe } from "./tra-luc-checkin.ts";

test("tên đúng bảng tham chiếu; mã nội bộ TRA_LUC_CHECKIN", () => {
  assert.equal(NHAN_TRA_LUC_CHECKIN, "Trả lúc check-in");
  assert.equal(TRA_LUC_CHECKIN, "TRA_LUC_CHECKIN");
});

test("traLucCheckinHopLe: không chọn ⇒ luôn qua; chọn ⇒ chỉ Thanh toán ngay; đơn đối tác lập lúc công tắc Tắt ⇒ không; đơn văn phòng / đơn đối tác lúc Bật ⇒ qua", () => {
  assert.deepEqual(traLucCheckinHopLe({ chon: false, hinhThuc: "CREDIT", congTyThuLucLap: 0 }), { ok: true });
  assert.deepEqual(traLucCheckinHopLe({ chon: true, hinhThuc: "PREPAID", congTyThuLucLap: null }), { ok: true }, "văn phòng lập");
  assert.deepEqual(traLucCheckinHopLe({ chon: true, hinhThuc: "PREPAID", congTyThuLucLap: 1 }), { ok: true }, "đối tác, công tắc Bật");
  const tratSau = traLucCheckinHopLe({ chon: true, hinhThuc: "CREDIT", congTyThuLucLap: null });
  assert.equal(tratSau.ok, false);
  assert.equal(!tratSau.ok && tratSau.ma, "tra_luc_checkin_chi_thanh_toan_ngay");
  const tat = traLucCheckinHopLe({ chon: true, hinhThuc: "PREPAID", congTyThuLucLap: 0 });
  assert.equal(!tat.ok && tat.ma, "tra_luc_checkin_cong_tac_tat");
  assert.ok(!tat.ok && !/[A-Z_]{4,}/.test(tat.cau), "câu lời thường, không mã");
});

test("traLucCheckinDuocChon (form): văn phòng luôn thấy; đối tác thấy khi công tắc Bật VÀ luật Việc 2 còn nhận «Thanh toán ngay»", () => {
  assert.equal(traLucCheckinDuocChon({ laDoiTac: false, congTyThu: null, chonDuoc: ["PREPAID", "CREDIT"] }), true);
  assert.equal(traLucCheckinDuocChon({ laDoiTac: true, congTyThu: true, chonDuoc: ["PREPAID"] }), true, "đối tác không có Trả sau");
  assert.equal(traLucCheckinDuocChon({ laDoiTac: true, congTyThu: true, chonDuoc: ["CREDIT"] }), false, "đối tác có Trả sau dùng được — chỉ thấy «Trả sau» (ADR-0224)");
  assert.equal(traLucCheckinDuocChon({ laDoiTac: true, congTyThu: false, chonDuoc: ["PREPAID"] }), false, "công tắc Tắt");
  assert.equal(traLucCheckinDuocChon({ laDoiTac: true, congTyThu: null, chonDuoc: ["PREPAID"] }), false, "chưa biết công tắc ⇒ không hiện");
});

test("checkinChiTienMat: đơn «Trả lúc check-in» — phía Tour Đảo (Công ty, nhân viên) chỉ tiền mặt; bên đặt / nhà cung cấp và đối tác lập đơn tự thu thì miễn (cùng trigger 0187 mục 10)", () => {
  const k = (o: Partial<Parameters<typeof checkinChiTienMat>[0]>) => checkinChiTienMat({ traLucCheckin: true, collectorRole: "STAFF", method: "BANK_TRANSFER", nguoiThuLaDoiTacLapDon: false, ...o });
  assert.deepEqual(k({ traLucCheckin: false }), { ok: true });
  assert.deepEqual(k({ method: "CASH" }), { ok: true });
  assert.deepEqual(k({ collectorRole: "BOOKER" }), { ok: true });
  assert.deepEqual(k({ collectorRole: "SUPPLIER" }), { ok: true });
  assert.deepEqual(k({ nguoiThuLaDoiTacLapDon: true }), { ok: true });
  assert.deepEqual(k({}), { ok: false, ma: "tra_luc_checkin_chi_tien_mat", cau: CAU_CHECKIN_CHI_TIEN_MAT });
  assert.deepEqual(k({ collectorRole: "COMPANY", method: "OTHER" }), { ok: false, ma: "tra_luc_checkin_chi_tien_mat", cau: CAU_CHECKIN_CHI_TIEN_MAT });
});

test("cauNhacCheckin («Việc của tôi»): còn thu ⇒ số; đã đủ ⇒ báo đủ; chưa tải được sổ ⇒ không đoán số", () => {
  const d = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;
  assert.equal(cauNhacCheckin(1_500_000, d), `Trả lúc check-in — cần thu ${d(1_500_000)}`);
  assert.equal(cauNhacCheckin(0, d), "Trả lúc check-in — khách đã trả đủ");
  assert.equal(cauNhacCheckin(null, d), "Trả lúc check-in — cần thu tiền mặt");
});
