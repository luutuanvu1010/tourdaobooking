// Khối hiển thị THUẦN cho các màn B1–B6 (chưa nối trang — chờ route A13 / A15): src/shared/dieu-phoi-hien-thi.ts. Hình dữ liệu theo kế hoạch mục 1.8.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauTuChoiGioXayRa, dongDieuKienTaiXe, gioVn, nhanAiXuLy, nhanMocTienDo, nhanSomNhat } from "./dieu-phoi-hien-thi.ts";
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

test("nhanSomNhat (thành phần A trạng thái 3): làm tròn LÊN phút kế — 'Sớm nhất: 07:11'", () => {
  assert.equal(nhanSomNhat(vnLocalToMs("2026-09-30", "07:10")! + 1), "Sớm nhất: 07:11");
  assert.equal(nhanSomNhat(vnLocalToMs("2026-09-30", "07:11")!), "Sớm nhất: 07:11");
  assert.equal(nhanSomNhat(vnLocalToMs("2026-09-30", "23:59")! + 30_000), "Sớm nhất: 00:00");
});

test("cauTuChoiGioXayRa (thành phần A trạng thái 4): mỗi mã một câu lời thường (NHAN_GIO_XAY_RA); có 'sớm nhất' thì nối số", () => {
  for (const ma of MA_GIO_XAY_RA) assert.equal(cauTuChoiGioXayRa(ma), `${NHAN_GIO_XAY_RA[ma]}.`);
  assert.equal(cauTuChoiGioXayRa("LUI_QUA_KEP", vnLocalToMs("2026-09-30", "04:45")!), "Giờ khai lùi quá khoảng cho phép — sớm nhất 04:45.");
  assert.doesNotMatch(cauTuChoiGioXayRa("DAO_THU_TU"), /[A-Z]{2,}_/);
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

test("nhanAiXuLy (H14): 'Ai xử lý: <nhãn>' từ NHAN_AI_XU_LY — không mã", () => {
  assert.equal(nhanAiXuLy(lyDoGiu("NOI_HEN_DOI", "TD-1")), "Ai xử lý: Văn phòng");
  assert.equal(nhanAiXuLy(lyDoGiu("NGHI_THIEU")), "Ai xử lý: Quản trị");
  assert.equal(nhanAiXuLy(lyDoGiu("KHONG_CO_HANG_BANG")), "Ai xử lý: Toàn quyền");
});
