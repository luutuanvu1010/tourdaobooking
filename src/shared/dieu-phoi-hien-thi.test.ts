// Khối hiển thị THUẦN cho các màn B1–B6 (chưa nối trang — chờ route A13 / A15): src/shared/dieu-phoi-hien-thi.ts. Hình dữ liệu theo kế hoạch mục 1.8.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiThieuTenTuLam, dongDieuKienTaiXe, gioVn, nhanMocTienDo } from "./dieu-phoi-hien-thi.ts";
import { MA_GIO_XAY_RA, NHAN_GIO_XAY_RA } from "./gio-xay-ra.ts";
import { lyDoGiu } from "./ly-do-giu.ts";
import { vnLocalToMs } from "./vn-date.ts";

test("gioVn: nhận 'HH:MM' giữ nguyên hoặc mốc ISO → giờ Việt Nam", () => {
  assert.equal(gioVn("07:31"), "07:31");
  assert.equal(gioVn("2026-09-30T00:31:00.000Z"), "07:31");
  assert.equal(gioVn("2026-09-30T17:05:59.000Z"), "00:05");
});

test("nhanMocTienDo (thành phần B): tài xế tự bấm / văn phòng không đổi giờ → MỘT giờ; văn phòng khai → '07:31 · ghi lúc 07:45 — Hoa' + dấu; không tên thì không đoán", () => {
  assert.deepEqual(nhanMocTienDo({ gioXayRa: "07:31", gioGhiNhan: "07:31", vanPhongKhai: false }), { chu: "07:31", vanPhongKhai: false });
  assert.deepEqual(nhanMocTienDo({ gioXayRa: "2026-09-30T00:31:00.000Z", gioGhiNhan: "2026-09-30T00:45:00.000Z", vanPhongKhai: true, nguoiBam: "Hoa" }), {
    chu: "07:31 · ghi lúc 07:45 — Hoa", vanPhongKhai: true,
  });
  assert.deepEqual(nhanMocTienDo({ gioXayRa: "07:31", gioGhiNhan: "07:45", vanPhongKhai: true, nguoiBam: null }), { chu: "07:31 · ghi lúc 07:45", vanPhongKhai: true });
  // Văn phòng khai mà nguoiBam có SĐT lẫn vào (DTO sai) — không bao giờ hiện dãy số dài.
  assert.equal(nhanMocTienDo({ gioXayRa: "07:31", gioGhiNhan: "07:45", vanPhongKhai: true, nguoiBam: "Hoa 0913552108" }).chu, "07:31 · ghi lúc 07:45 — Hoa ••••••••••");
});



test("dongDieuKienTaiXe (V5 / V7 màn tài xế — bản đối chiếu 2.5, H15): chỉ điều kiện CÒN THIẾU kèm '(văn phòng lo)', không hạn, không số; đạt hết → 'Đủ điều kiện'", () => {
  assert.deepEqual(dongDieuKienTaiXe([]), ["Đủ điều kiện xuất bến"]);
  const thieu = [lyDoGiu("THIEU_TEN", "TD-20260930-0008 thiếu 2 tên"), lyDoGiu("DIEU_KIEN_GIAY_TO_XE", "79B-678.90"), lyDoGiu("CHINH_SACH_RONG")];
  assert.deepEqual(dongDieuKienTaiXe(thieu), [
    "Chưa đủ tên khách: TD-20260930-0008 thiếu 2 tên (văn phòng lo)",
    "Xe thiếu hoặc hết hạn giấy tờ bắt buộc: 79B-678.90 (văn phòng lo)",
    "Chưa có chính sách điều phối đang hiệu lực (văn phòng lo)",
  ]);
});

test("dongDieuKienTaiXe (Đợt 5 A-1b — chủ duyệt 5/10, chỉ tài xế công ty): tài xế tự bổ sung tên được (ô trip.passenger.add + trong ngày chạy) → dòng THIẾU TÊN chỉ chỗ tự làm; điều kiện khác và tài xế đối tác vẫn '(văn phòng lo)'", () => {
  const thieu = [lyDoGiu("THIEU_TEN", "TD-1 thiếu 2 tên"), lyDoGiu("CHINH_SACH_RONG")];
  assert.deepEqual(dongDieuKienTaiXe(thieu, true), [
    "Chưa đủ tên khách: TD-1 thiếu 2 tên (bấm Bổ sung tên ở khối Suất của khách, hoặc văn phòng lo)",
    "Chưa có chính sách điều phối đang hiệu lực (văn phòng lo)",
  ]);
  assert.deepEqual(dongDieuKienTaiXe(thieu, false), ["Chưa đủ tên khách: TD-1 thiếu 2 tên (văn phòng lo)", "Chưa có chính sách điều phối đang hiệu lực (văn phòng lo)"]);
  assert.deepEqual(dongDieuKienTaiXe(thieu), dongDieuKienTaiXe(thieu, false), "mặc định = không tự bổ sung (tài xế đối tác, ngày khác)");
  assert.deepEqual(dongDieuKienTaiXe([], true), ["Đủ điều kiện xuất bến"]);
});


test("chiThieuTenTuLam (Đợt 5 A-1b): chỉ khi MỌI điều kiện thiếu là thiếu tên VÀ tự bổ sung được", () => {
  assert.equal(chiThieuTenTuLam([lyDoGiu("THIEU_TEN", "TD-1 thiếu 1 tên")], true), true);
  assert.equal(chiThieuTenTuLam([lyDoGiu("THIEU_TEN", "TD-1 thiếu 1 tên")], false), false, "tài xế đối tác / ngày khác");
  assert.equal(chiThieuTenTuLam([lyDoGiu("THIEU_TEN", "TD-1 thiếu 1 tên"), lyDoGiu("CHINH_SACH_RONG")], true), false, "còn việc văn phòng");
  assert.equal(chiThieuTenTuLam([], true), false);
});
