// ADR-0136 Task 3.5: chữ hiển thị của bước xác nhận — thuần, đồng hồ TIÊM (`nowMs`), không tính lại hạn (hạn do máy chủ gửi, `hanXacNhan`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_TIEN_KHOA_KHI_CHO, dongChoXacNhan, nhanLyDoCanXacNhan, NHAN_NUT_XAC_NHAN, NHAN_KET_QUA, cauLoiGuiDon } from "./xac-nhan-hien-thi.ts";

const HAN = "2026-10-26T03:15:00.000Z"; // 10:15 giờ Việt Nam

test("dải chờ: còn N phút (làm tròn LÊN), đúng hạn chưa quá, sau hạn = Quá hạn", () => {
  const han = Date.parse(HAN);
  assert.deepEqual(dongChoXacNhan({ hanLuc: HAN, nowMs: han - 14 * 60_000 }), { text: "Chờ xác nhận · còn 14 phút", quaHan: false });
  assert.equal(dongChoXacNhan({ hanLuc: HAN, nowMs: han - 30_000 }).text, "Chờ xác nhận · còn 1 phút");
  assert.deepEqual(dongChoXacNhan({ hanLuc: HAN, nowMs: han }), { text: "Chờ xác nhận · còn 0 phút", quaHan: false });
  assert.deepEqual(dongChoXacNhan({ hanLuc: HAN, nowMs: han + 1 }), { text: "Chờ xác nhận · Quá hạn", quaHan: true });
});

test("dải chờ qua đêm (22:00–06:00 không tính): còn hơn 1 giờ thì nói GIỜ HẠN theo giờ Việt Nam, không nói «còn 500 phút»", () => {
  const han = Date.parse("2026-10-26T23:10:00.000Z"); // 06:10 sáng 27/10 giờ VN
  const r = dongChoXacNhan({ hanLuc: new Date(han).toISOString(), nowMs: han - 8 * 3600_000 });
  assert.equal(r.text, "Chờ xác nhận · hạn 06:10 27/10/2026");
  assert.equal(r.quaHan, false);
});

test("không lộ mã thô: lý do cần xác nhận và kết quả đều là chữ đời thường", () => {
  assert.equal(nhanLyDoCanXacNhan(["DICH_VU"]), "Có dịch vụ cần xác nhận còn vé.");
  assert.equal(nhanLyDoCanXacNhan(["DAT_GAP"]), "Có lượt đón dưới hạn chốt, cần Quản trị đặt gấp.");
  assert.equal(nhanLyDoCanXacNhan(["DICH_VU", "DAT_GAP"]), "Có dịch vụ cần xác nhận còn vé. Có lượt đón dưới hạn chốt, cần Quản trị đặt gấp.");
  assert.equal(nhanLyDoCanXacNhan([]), "");
  assert.deepEqual(NHAN_KET_QUA, { CON_VE: "Còn vé", HET_VE: "Hết vé", HUY: "Huỷ" });
  assert.equal(NHAN_NUT_XAC_NHAN.send, "Gửi xác nhận");
  assert.equal(NHAN_NUT_XAC_NHAN.withdraw, "Rút lại");
  assert.equal(NHAN_NUT_XAC_NHAN.submit, "Gửi đơn");
  for (const v of Object.values(NHAN_NUT_XAC_NHAN)) assert.ok(!/[A-Z_]{4,}/.test(v), v);
});

test("đơn đang chờ: tiền chỉ đọc — câu giải thích nói cách đổi tiền theo Hướng 2 (Huỷ rồi lập lại)", () => {
  assert.match(CAU_TIEN_KHOA_KHI_CHO, /Huỷ/);
  assert.match(CAU_TIEN_KHOA_KHI_CHO, /tiền/);
});

test("lỗi gửi đơn sau khi lưu: câu báo ở trang nháp nói rõ đơn ĐÃ LƯU và lý do máy chủ", () => {
  assert.equal(cauLoiGuiDon("Giá danh mục vừa đổi."), "Đơn đã được lưu nháp nhưng chưa gửi được: Giá danh mục vừa đổi.");
  assert.equal(cauLoiGuiDon(""), "Đơn đã được lưu nháp nhưng chưa gửi được. Hãy mở đơn và bấm Gửi đơn lại.");
});
