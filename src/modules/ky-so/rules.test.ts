import { test } from "node:test";
import assert from "node:assert/strict";
import { cauKyKhoa, docGhiChuKy, kiemKhoaKy, kyCua, kyDaKhoaTu, ngayCuoiThang, thangKeTiep, thangKhoaDuocKeTiep } from "./rules.ts";

test("kyCua, thangKeTiep, cauKyKhoa", () => {
  assert.equal(kyCua("2026-10-08"), "2026-10");
  assert.equal(thangKeTiep("2026-12"), "2027-01");
  assert.equal(thangKeTiep("2026-09"), "2026-10");
  assert.equal(cauKyKhoa("2026-10"), "Tháng 10/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)");
  assert.equal(kyDaKhoaTu(new Set(["2026-09"]))("2026-09-30"), true);
  assert.equal(kyDaKhoaTu(new Set(["2026-09"]))("2026-10-01"), false);
});

test("kiemKhoaKy: chỉ tháng đã qua (400); trùng / không liền kề / sau tháng sổ sớm nhất (409)", () => {
  const goc = { homNay: "2026-10-08", daKhoa: [] as string[], thangSoSomNhat: "2026-08" };
  assert.deepEqual(kiemKhoaKy({ ...goc, period: "2026-08" }), { ok: true });
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-10" }) as { status: number }).status, 400, "tháng hiện tại");
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-11" }) as { status: number }).status, 400, "tháng tương lai");
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-13" }) as { status: number }).status, 400);
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-09" }) as { status: number }).status, 409, "tháng đầu sau tháng có dòng sổ sớm nhất");
  assert.deepEqual(kiemKhoaKy({ ...goc, period: "2026-07" }), { ok: true }, "tháng đầu trước tháng sổ sớm nhất: được");
  assert.equal((kiemKhoaKy({ ...goc, daKhoa: ["2026-08"], period: "2026-08" }) as { status: number }).status, 409, "trùng");
  assert.equal((kiemKhoaKy({ ...goc, daKhoa: ["2026-07"], period: "2026-09" }) as { status: number }).status, 409, "không liền kề");
  assert.deepEqual(kiemKhoaKy({ ...goc, daKhoa: ["2026-07", "2026-08"], period: "2026-09" }), { ok: true });
  assert.deepEqual(kiemKhoaKy({ ...goc, thangSoSomNhat: null, period: "2026-09" }), { ok: true }, "chưa có dòng sổ nào");
});

test("thangKhoaDuocKeTiep", () => {
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: ["2026-08"], thangSoSomNhat: "2026-08" }), "2026-09");
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: ["2026-09"], thangSoSomNhat: "2026-08" }), null, "tháng 10 chưa qua");
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: [], thangSoSomNhat: "2026-08" }), "2026-08");
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: [], thangSoSomNhat: null }), "2026-09");
});

test("ngayCuoiThang: ngày cuối của tháng, kể cả tháng 2 năm nhuận", () => {
  assert.equal(ngayCuoiThang("2026-09"), "2026-09-30");
  assert.equal(ngayCuoiThang("2026-12"), "2026-12-31");
  assert.equal(ngayCuoiThang("2026-02"), "2026-02-28");
  assert.equal(ngayCuoiThang("2028-02"), "2028-02-29");
});

test("docGhiChuKy: tuỳ chọn, ≤ 200 ký tự, không dãy ≥ 8 chữ số (SĐT / số tài khoản)", () => {
  assert.deepEqual(docGhiChuKy(undefined), { ok: true, value: null });
  assert.deepEqual(docGhiChuKy(null), { ok: true, value: null });
  assert.deepEqual(docGhiChuKy(""), { ok: true, value: null });
  assert.deepEqual(docGhiChuKy("  Đã đối chiếu  "), { ok: true, value: "Đã đối chiếu" });
  assert.deepEqual(docGhiChuKy("x".repeat(200)), { ok: true, value: "x".repeat(200) });
  assert.deepEqual(docGhiChuKy("x".repeat(201)), { ok: false, message: "Ghi chú tối đa 200 ký tự." });
  assert.deepEqual(docGhiChuKy(123), { ok: false, message: "Ghi chú tối đa 200 ký tự." });
  assert.deepEqual(docGhiChuKy("gọi 0912 345 678"), { ok: false, message: "Ghi chú không được chứa số điện thoại / số tài khoản." });
});

// Gợi ý ở ô ghi chú của màn Khoá sổ tháng («Ghi ngày dạng 30/09/2026») dựa vào đây: dấu gạch chéo tách các nhóm số nên ngày không thành dãy ≥ 8 chữ số; ngày viết bằng dấu chấm / gạch
// nối thì dính luật (đã nêu cho chủ ở sổ thi công Task 12, không nới ở vòng này).
test("docGhiChuKy: ngày 30/09/2026 qua; 30.09.2026 và 2026-09-30 bị chặn như dãy số dài", () => {
  assert.deepEqual(docGhiChuKy("Đối chiếu xong ngày 30/09/2026"), { ok: true, value: "Đối chiếu xong ngày 30/09/2026" });
  const chan = { ok: false, message: "Ghi chú không được chứa số điện thoại / số tài khoản." };
  assert.deepEqual(docGhiChuKy("Đối chiếu xong ngày 30.09.2026"), chan);
  assert.deepEqual(docGhiChuKy("Đối chiếu xong ngày 2026-09-30"), chan);
});
