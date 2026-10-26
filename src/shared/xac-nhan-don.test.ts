// Luật thuần bước xác nhận đơn (ADR-0136 Đ1, Đ5, Đ9): «cần xác nhận» ba bước, hạn 15 phút trừ 22:00–06:00 giờ Việt Nam, ai quyết định được.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canXacNhan, duocQuyetDinh, hanXacNhan } from "./xac-nhan-don.ts";

/** Giờ Việt Nam "YYYY-MM-DDTHH:MM" → ISO UTC (trừ 7 giờ) để bài đọc theo giờ dân sự. */
const vn = (s: string): string => new Date(Date.parse(`${s}:00Z`) - 7 * 3600_000).toISOString();
const doiVn = (iso: string): string => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16);

test("hanXacNhan: ban ngày cộng thẳng 15 phút", () => {
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T10:00"))), "2026-10-26T10:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T21:45"))), "2026-10-26T22:00");
});

test("hanXacNhan: gửi sát 22:00 thì phần còn lại tính sang 06:00 hôm sau", () => {
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T21:50"))), "2026-10-27T06:05");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T21:55"))), "2026-10-27T06:10");
});

test("hanXacNhan: gửi trong khoảng đêm thì tính từ 06:00 (cả trước nửa đêm lẫn sau nửa đêm)", () => {
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T22:00"))), "2026-10-27T06:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T23:00"))), "2026-10-27T06:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-27T00:00"))), "2026-10-27T06:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-27T05:59"))), "2026-10-27T06:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-27T06:00"))), "2026-10-27T06:15");
});

test("hanXacNhan: kết quả là ISO UTC (đuôi Z) và giữ giây lẻ", () => {
  const r = hanXacNhan(vn("2026-10-26T10:00"));
  assert.match(r, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(hanXacNhan("2026-10-26T03:00:30.000Z"), "2026-10-26T03:15:30.000Z");
});

const khong = new Map<string, boolean>();
const dv = (ma: string | null, nhom: string | null = null) => ({ ma, nhom });

test("canXacNhan: nhóm «cần» → cần; dịch vụ không có dòng nào → không cần", () => {
  const nhomCan = new Map([["TOUR", true]]);
  assert.deepEqual(canXacNhan({ dichVu: [dv("A", "TOUR")], coDichVu: khong, coNhom: nhomCan, coChangDuoiMocChuaDatGap: false }), { can: true, vi: ["DICH_VU"] });
  assert.deepEqual(canXacNhan({ dichVu: [dv("A", "KHAC")], coDichVu: khong, coNhom: nhomCan, coChangDuoiMocChuaDatGap: false }), { can: false, vi: [] });
  assert.deepEqual(canXacNhan({ dichVu: [dv("A", null)], coDichVu: khong, coNhom: nhomCan, coChangDuoiMocChuaDatGap: false }), { can: false, vi: [] });
  assert.deepEqual(canXacNhan({ dichVu: [], coDichVu: khong, coNhom: nhomCan, coChangDuoiMocChuaDatGap: false }), { can: false, vi: [] });
});

test("canXacNhan: dòng dịch vụ thắng dòng nhóm, cả hai chiều", () => {
  const nhomCan = new Map([["TOUR", true]]);
  const dvKhongCan = new Map([["A", false]]);
  assert.equal(canXacNhan({ dichVu: [dv("A", "TOUR")], coDichVu: dvKhongCan, coNhom: nhomCan, coChangDuoiMocChuaDatGap: false }).can, false);
  const nhomKhong = new Map([["TOUR", false]]);
  const dvCan = new Map([["A", true]]);
  assert.equal(canXacNhan({ dichVu: [dv("A", "TOUR")], coDichVu: dvCan, coNhom: nhomKhong, coChangDuoiMocChuaDatGap: false }).can, true);
});

test("canXacNhan: đơn trộn dịch vụ thường + dịch vụ «cần» → cả đơn cần", () => {
  const r = canXacNhan({ dichVu: [dv("THUONG", "KHAC"), dv("VE", "TOUR")], coDichVu: khong, coNhom: new Map([["TOUR", true]]), coChangDuoiMocChuaDatGap: false });
  assert.deepEqual(r, { can: true, vi: ["DICH_VU"] });
});

test("canXacNhan: dịch vụ nhập tay (ma null) không gắn cờ được, kể cả khi nhóm có cờ «cần»", () => {
  const r = canXacNhan({ dichVu: [dv(null, "TOUR")], coDichVu: new Map([["null", true]]), coNhom: new Map([["TOUR", true]]), coChangDuoiMocChuaDatGap: false });
  assert.deepEqual(r, { can: false, vi: [] });
});

test("canXacNhan: chặng dưới mốc chưa đặt gấp → cần, lý do DAT_GAP; đủ hai lý do khi có cả hai", () => {
  assert.deepEqual(canXacNhan({ dichVu: [], coDichVu: khong, coNhom: khong, coChangDuoiMocChuaDatGap: true }), { can: true, vi: ["DAT_GAP"] });
  const r = canXacNhan({ dichVu: [dv("A", "TOUR")], coDichVu: khong, coNhom: new Map([["TOUR", true]]), coChangDuoiMocChuaDatGap: true });
  assert.deepEqual(r, { can: true, vi: ["DICH_VU", "DAT_GAP"] });
});

test("duocQuyetDinh: bảng chân trị đầy đủ", () => {
  for (const laNguoiLap of [false, true]) for (const laNoiBo of [false, true]) for (const coQuyenXetDuyet of [false, true]) for (const choTuXacNhan of [false, true]) {
    const mong = coQuyenXetDuyet && (!laNguoiLap || (laNoiBo && choTuXacNhan));
    assert.equal(duocQuyetDinh({ laNguoiLap, laNoiBo, coQuyenXetDuyet, choTuXacNhan }), mong, JSON.stringify({ laNguoiLap, laNoiBo, coQuyenXetDuyet, choTuXacNhan }));
  }
});

test("duocQuyetDinh: Thực tập / Đối tác lập thì không tự quyết dù công tắc bật; nội bộ tự lập + công tắc bật thì được", () => {
  assert.equal(duocQuyetDinh({ laNguoiLap: true, laNoiBo: false, coQuyenXetDuyet: true, choTuXacNhan: true }), false);
  assert.equal(duocQuyetDinh({ laNguoiLap: true, laNoiBo: true, coQuyenXetDuyet: true, choTuXacNhan: true }), true);
  assert.equal(duocQuyetDinh({ laNguoiLap: true, laNoiBo: true, coQuyenXetDuyet: true, choTuXacNhan: false }), false);
});
