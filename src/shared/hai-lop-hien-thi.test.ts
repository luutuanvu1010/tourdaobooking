// Chữ hiển thị của bảo mật hai lớp (ADR-0074; kế hoạch Phần B Task 7): nhãn ở Quản lý tài khoản, dải nhắc ân hạn, câu 429 bước hai, tệp mã dự phòng.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAU_SAI_QUA_NHIEU_HAI_LOP, CHU_DO_MA_DU_PHONG, cauLoiHaiLop, daiNhacHaiLop, khoaDeDoc, maTotpTuO, nhanHaiLop, soNgayCon, tenTepMaDuPhong, vanBanMaDuPhong,
} from "./hai-lop-hien-thi.ts";

const NOW = Date.parse("2026-10-16T03:00:00.000Z"); // 10:00 giờ Việt Nam
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

test("số ngày còn lại: làm tròn lên; hết hạn hoặc thiếu → null", () => {
  assert.equal(soNgayCon(iso(NOW + 14 * DAY), NOW), 14);
  assert.equal(soNgayCon(iso(NOW + 13 * DAY + 1), NOW), 14);
  assert.equal(soNgayCon(iso(NOW + 1), NOW), 1);
  assert.equal(soNgayCon(iso(NOW), NOW), null);
  assert.equal(soNgayCon(iso(NOW - 1), NOW), null);
  assert.equal(soNgayCon(null, NOW), null);
  assert.equal(soNgayCon("rác", NOW), null);
});

test("dải nhắc: chỉ khi máy chủ báo bắt buộc; còn hạn → số ngày (dưới một ngày = 1 ngày); quá hạn (graceUntil null) → câu quá hạn", () => {
  assert.equal(daiNhacHaiLop({ required: false, graceUntil: null }, NOW), null);
  assert.equal(daiNhacHaiLop({ required: false, graceUntil: iso(NOW + 5 * DAY) }, NOW), null);
  assert.equal(daiNhacHaiLop({ required: true, graceUntil: iso(NOW + 5 * DAY) }, NOW), "Còn 5 ngày để bật bảo mật hai lớp — Bật ngay");
  assert.equal(daiNhacHaiLop({ required: true, graceUntil: iso(NOW + 2 * 3600_000) }, NOW), "Còn 1 ngày để bật bảo mật hai lớp — Bật ngay");
  assert.equal(daiNhacHaiLop({ required: true, graceUntil: null }, NOW), "Đã quá hạn bật bảo mật hai lớp — Bật ngay");
  // máy chủ trả hạn đã qua (đồng hồ máy lệch) → coi như quá hạn, không hiện số âm
  assert.equal(daiNhacHaiLop({ required: true, graceUntil: iso(NOW - DAY) }, NOW), "Đã quá hạn bật bảo mật hai lớp — Bật ngay");
});

test("nhãn ở Quản lý tài khoản: Đã bật / Chưa bật (hạn dd/mm theo giờ VN) / quá hạn / không hạn", () => {
  assert.equal(nhanHaiLop({ enabled: true, graceUntil: null }, NOW), "Hai lớp: Đã bật");
  // 2026-10-29T18:00Z = 01:00 ngày 30/10 giờ Việt Nam
  assert.equal(nhanHaiLop({ enabled: false, graceUntil: "2026-10-29T18:00:00.000Z" }, NOW), "Hai lớp: Chưa bật (hạn 30/10)");
  assert.equal(nhanHaiLop({ enabled: false, graceUntil: "2027-01-02T00:00:00.000Z" }, NOW), "Hai lớp: Chưa bật (hạn 02/01/2027)");
  assert.equal(nhanHaiLop({ enabled: false, graceUntil: "2026-10-10T00:00:00.000Z" }, NOW), "Hai lớp: Chưa bật (quá hạn 10/10)");
  assert.equal(nhanHaiLop({ enabled: false, graceUntil: null }, NOW), "Hai lớp: Chưa bật");
});

test("câu 429 ở bước hai: không hứa mở khoá bằng mã dự phòng (mã dự phòng cũng bị khoá chung bộ đếm)", () => {
  assert.equal(CAU_SAI_QUA_NHIEU_HAI_LOP, "Nhập sai quá nhiều lần. Chờ 15 phút hoặc nhờ Quản trị mở khoá.");
  assert.doesNotMatch(CAU_SAI_QUA_NHIEU_HAI_LOP, /dự phòng/);
  assert.equal(cauLoiHaiLop("too_many_attempts", "Nhập sai quá nhiều lần. Thử lại sau 15 phút hoặc nhờ người phụ trách hệ thống mở khoá."), CAU_SAI_QUA_NHIEU_HAI_LOP);
  assert.equal(cauLoiHaiLop("invalid_code", "Mã không đúng."), "Mã không đúng.");
});

test("ô mã 6 số: chỉ giữ chữ số, tối đa 6", () => {
  assert.equal(maTotpTuO("12 34-56"), "123456");
  assert.equal(maTotpTuO("1234567"), "123456");
  assert.equal(maTotpTuO("abc"), "");
});

test("khoá dạng dễ đọc: nhóm 4 ký tự; khoá gốc không đổi", () => {
  assert.equal(khoaDeDoc("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP");
  assert.equal(khoaDeDoc("ABCDE"), "ABCD E");
});

test("tệp mã dự phòng: đủ 10 mã đánh số, câu cảnh báo, không có SĐT/tên; tên tệp có ngày giờ VN", () => {
  const codes = Array.from({ length: 10 }, (_, i) => `ab${i}c-d2e${i}`);
  const t = vanBanMaDuPhong(codes, iso(NOW));
  for (const [i, c] of codes.entries()) assert.match(t, new RegExp(`^${i + 1}\\. ${c}$`, "m"));
  assert.match(t, /Mã dự phòng — Tour Đảo Booking/);
  assert.match(t, /10:00 16\/10\/2026/);
  assert.ok(t.includes(CHU_DO_MA_DU_PHONG));
  assert.equal(CHU_DO_MA_DU_PHONG, "Cất các mã này ở nơi an toàn — mỗi mã dùng một lần.");
  assert.equal(tenTepMaDuPhong(iso(NOW)), "ma-du-phong-tour-dao-2026-10-16.txt");
});
