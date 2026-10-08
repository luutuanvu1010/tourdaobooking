import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAU_HET_THANG_KHOA,
  GHI_CHU_KHOA_TOI_DA,
  cauDaKhoaXong,
  cauXacNhanKhoa,
  demKhoan,
  nhanNutKhoa,
  nhanNutXacNhanKhoa,
  thangDaKhoaMoiTruoc,
  tieuDeKeTiep,
} from "./khoa-thang-hien-thi.ts";

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

// Máy chủ (`docGhiChuKy` ở module ky-so, CHECK 200 của `ky_period_close.note`) vẫn là nơi quyết; hằng này chỉ để ô ghi chú ở giao diện không cho gõ quá. `src/shared/`
// không được import module nên bài này không so trực tiếp — bài `docGhiChuKy` ở `src/modules/ky-so/rules.test.ts` khoá con số 200 ở phía máy chủ.
test("giới hạn ghi chú ở giao diện là 200 ký tự (khớp máy chủ)", () => {
  assert.equal(GHI_CHU_KHOA_TOI_DA, 200);
});
