import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAU_HET_THANG_KHOA,
  GOI_Y_GHI_CHU_KHOA,
  cauDaKhoaXong,
  cauXacNhanKhoa,
  demKhoan,
  nhanNutKhoa,
  nhanNutXacNhanKhoa,
  thangDaKhoaMoiTruoc,
  tieuDeKeTiep,
} from "./khoa-thang-hien-thi.ts";
import { GHI_CHU_KHOA_TOI_DA } from "./ky-khoa.ts";
import { SO_DO_TRANG } from "./so-do-trang.ts";

// Mục «chờ» của bảng kiểm đọc `choXacNhanCongTy` = câu PENDING_COMPANY: từ sổ đại lý đợt 2 câu này gồm CẢ khoản Công ty thu chuyển khoản chờ «Xác nhận
// đã nhận» LẪN khoản khách trả bên kia (đại lý / quầy nhà cung cấp) chờ «Bên kia đã nhận» — nhãn không được nói riêng «Công ty thu» (chủ dự án 2026-10-25
// chọn chữ). Đọc qua sơ đồ trang (sinh từ chuỗi literal của web/khoa-thang.ts) vì trợ lý Hỗ trợ cũng kể nhãn này cho người dùng.
test("bảng kiểm khoá tháng: mục khoản chờ tên «Khoản thu chờ đối chiếu», không nói riêng «Công ty thu»", () => {
  const trang = SO_DO_TRANG.find((t) => t.duongDan === "/khoa-thang");
  assert.ok(trang, "sơ đồ trang thiếu /khoa-thang");
  assert.ok(trang.khiChay.muc.includes("Khoản thu chờ đối chiếu"), `mục khi chạy: ${trang.khiChay.muc.join(" | ")}`);
  assert.ok(!trang.khiChay.muc.some((m) => m.includes("Công ty thu")), "còn nhãn cũ «Khoản Công ty thu …»");
});

// Câu hộp xác nhận là hàng rào con người duy nhất trước một việc không đảo ngược (đặc tả §13: khoá nhầm tháng chỉ cứu được bằng khôi phục cả cơ sở dữ liệu).
test("hộp xác nhận nêu đúng tháng, nói KHÔNG mở lại được và đường cứu duy nhất", () => {
  const cau = cauXacNhanKhoa("2026-09");
  assert.equal(cau, "Khoá sổ tháng 09/2026? Việc này KHÔNG mở lại được. Muốn sửa sau khi khoá chỉ còn cách khôi phục cả cơ sở dữ liệu.");
  assert.match(cau, /KHÔNG mở lại được/);
  assert.match(cau, /khôi phục cả cơ sở dữ liệu/);
});

test("nhãn tháng là MM/YYYY, kể cả qua năm", () => {
  assert.equal(nhanNutKhoa("2026-01"), "Khoá tháng 01/2026");
  assert.equal(nhanNutXacNhanKhoa("2026-12"), "Xác nhận khoá tháng 12/2026");
  assert.equal(cauDaKhoaXong("2025-12"), "Đã khoá sổ tháng 12/2025.");
  assert.equal(tieuDeKeTiep("2026-10"), "Tháng khoá được kế tiếp: 10/2026");
});

test("hết tháng để khoá: tiêu đề không có tháng, câu giải thích đúng nguyên văn", () => {
  assert.equal(tieuDeKeTiep(null), "Tháng khoá được kế tiếp");
  assert.equal(CAU_HET_THANG_KHOA, "Chưa có tháng nào khoá được (tháng hiện tại chưa qua).");
});

test("các tháng đã khoá: mới nhất đứng đầu, qua năm vẫn đúng, không đổi mảng gốc", () => {
  const goc = ["2025-11", "2026-01", "2025-12", "2026-02"];
  assert.deepEqual(thangDaKhoaMoiTruoc(goc), ["2026-02", "2026-01", "2025-12", "2025-11"]);
  assert.deepEqual(goc, ["2025-11", "2026-01", "2025-12", "2026-02"]);
  assert.deepEqual(thangDaKhoaMoiTruoc([]), []);
});

test("số khoản của khối bảng kiểm: rỗng ghi 'Không có'", () => {
  assert.equal(demKhoan(0), "Không có");
  assert.equal(demKhoan(1), "1 khoản");
  assert.equal(demKhoan(12), "12 khoản");
});

// Máy chủ (`docGhiChuKy` ở module ky-so, CHECK 200 của `ky_period_close.note`) vẫn là nơi quyết. Hằng độ dài nằm MỘT chỗ ở `ky-khoa.ts`: `docGhiChuKy` và ô ghi chú ở giao diện
// cùng import nó — bài `docGhiChuKy` ở `src/modules/ky-so/rules.test.ts` khoá con số 200 ở phía máy chủ bằng chuỗi 200/201 ký tự.
test("giới hạn ghi chú ở giao diện là 200 ký tự (khớp máy chủ)", () => {
  assert.equal(GHI_CHU_KHOA_TOI_DA, 200);
});

// Gợi ý dưới ô ghi chú (vòng sửa 1): ngày viết dạng 30/09/2026 (luật ghi chú không chặn), không số điện thoại / số tài khoản.
test("gợi ý ô ghi chú chỉ cách viết ngày an toàn và nhắc không ghi số điện thoại / số tài khoản", () => {
  assert.equal(GOI_Y_GHI_CHU_KHOA, "Ghi ngày dạng 30/09/2026. Không ghi số điện thoại hay số tài khoản.");
});
