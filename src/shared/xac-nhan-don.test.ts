// Luật thuần bước xác nhận đơn (ADR-0136 Đ1, Đ5, Đ9): «cần xác nhận» ba bước, hạn 15 phút tính trong giờ hành chính 07:00–17:00 giờ Việt Nam (ADR-0142 Đ5), ai quyết định được.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canXacNhan, duocQuyetDinh, hanXacNhan } from "./xac-nhan-don.ts";

/** Giờ Việt Nam "YYYY-MM-DDTHH:MM" → ISO UTC (trừ 7 giờ) để bài đọc theo giờ dân sự. */
const vn = (s: string): string => new Date(Date.parse(`${s}:00Z`) - 7 * 3600_000).toISOString();
const doiVn = (iso: string): string => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16);

const K = { tuPhut: 420, denPhut: 1020 }; // 07:00–17:00 (ADR-0142 Đ5)

test("hanXacNhan: trong giờ hành chính cộng thẳng 15 phút", () => {
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T10:00"), K)), "2026-10-26T10:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T16:45"), K)), "2026-10-26T17:00");
});

test("hanXacNhan: gửi sát 17:00 thì phần còn lại tính sang 07:00 hôm sau", () => {
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T16:50"), K)), "2026-10-27T07:05");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T16:55"), K)), "2026-10-27T07:10");
});

test("hanXacNhan: gửi ngoài giờ hành chính thì tính từ 07:00 (từ 17:00 đến nửa đêm lẫn sau nửa đêm đến 07:00)", () => {
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T17:00"), K)), "2026-10-27T07:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-26T22:00"), K)), "2026-10-27T07:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-27T00:00"), K)), "2026-10-27T07:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-27T06:59"), K)), "2026-10-27T07:15");
  assert.equal(doiVn(hanXacNhan(vn("2026-10-27T07:00"), K)), "2026-10-27T07:15");
});

test("hanXacNhan: kết quả là ISO UTC (đuôi Z) và giữ giây lẻ", () => {
  const r = hanXacNhan(vn("2026-10-26T10:00"), K);
  assert.match(r, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(hanXacNhan("2026-10-26T03:00:30.000Z", K), "2026-10-26T03:15:30.000Z");
});

const KHONG_UU_TIEN = { uuTienCuaNguoiKhac: false, laQuanTriHoacToanQuyen: false, giuDoiTac: false };
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
    const co = { uuTienCuaNguoiKhac: false, laQuanTriHoacToanQuyen: false, giuDoiTac: false };
    assert.equal(duocQuyetDinh({ laNguoiLap, laNoiBo, coQuyenXetDuyet, choTuXacNhan, ...co }), mong, JSON.stringify({ laNguoiLap, laNoiBo, coQuyenXetDuyet, choTuXacNhan }));
  }
});

test("duocQuyetDinh: Thực tập / Đối tác lập thì không tự quyết dù công tắc bật; nội bộ tự lập + công tắc bật thì được", () => {
  assert.equal(duocQuyetDinh({ laNguoiLap: true, laNoiBo: false, coQuyenXetDuyet: true, choTuXacNhan: true, ...KHONG_UU_TIEN }), false);
  assert.equal(duocQuyetDinh({ laNguoiLap: true, laNoiBo: true, coQuyenXetDuyet: true, choTuXacNhan: true, ...KHONG_UU_TIEN }), true);
  assert.equal(duocQuyetDinh({ laNguoiLap: true, laNoiBo: true, coQuyenXetDuyet: true, choTuXacNhan: false, ...KHONG_UU_TIEN }), false);
});

test("duocQuyetDinh: đang trong ưu tiên của Bán hàng khác thì không ai quyết, trừ Quản trị / Toàn quyền không giữ quyền Đối tác (ADR-0142 Đ5)", () => {
  const nen = { laNguoiLap: false, laNoiBo: true, coQuyenXetDuyet: true, choTuXacNhan: false, uuTienCuaNguoiKhac: true };
  assert.equal(duocQuyetDinh({ ...nen, laQuanTriHoacToanQuyen: false, giuDoiTac: false }), false);
  assert.equal(duocQuyetDinh({ ...nen, laQuanTriHoacToanQuyen: true, giuDoiTac: false }), true);
  assert.equal(duocQuyetDinh({ ...nen, laQuanTriHoacToanQuyen: true, giuDoiTac: true }), false);
  // Không có ưu tiên của người khác thì luật cũ giữ nguyên, kể cả với tài khoản lai.
  assert.equal(duocQuyetDinh({ ...nen, uuTienCuaNguoiKhac: false, laQuanTriHoacToanQuyen: true, giuDoiTac: true }), true);
  // Quản trị vẫn phải có ô xét duyệt.
  assert.equal(duocQuyetDinh({ ...nen, coQuyenXetDuyet: false, laQuanTriHoacToanQuyen: true, giuDoiTac: false }), false);
});
