import { test } from "node:test";
import assert from "node:assert/strict";
import { docLenhNhapKeToan, lenhKhongDoi, laDongNhapKeToan, moTaDauNhap, soNgayKhoang } from "./nhap-ke-toan.ts";

const U = "11111111-1111-4111-8111-111111111111";
const loi = (raw: unknown) => {
  const r = docLenhNhapKeToan(raw);
  assert.equal(r.ok, false, JSON.stringify(raw));
  return (r as { message: string }).message;
};

test("docLenhNhapKeToan: đánh dấu có / không số; số giữ nguyên văn, bỏ khoảng trắng đầu cuối", () => {
  assert.deepEqual(docLenhNhapKeToan({ daNhap: true, soHoaDon: "  HD-000123 ", truocDo: null }), { ok: true, lenh: { daNhap: true, soHoaDon: "HD-000123", lyDo: null, truocDo: null } });
  assert.deepEqual(docLenhNhapKeToan({ daNhap: true, truocDo: U }), { ok: true, lenh: { daNhap: true, soHoaDon: null, lyDo: null, truocDo: U } });
  assert.deepEqual(docLenhNhapKeToan({ daNhap: true, soHoaDon: "", truocDo: null }), { ok: true, lenh: { daNhap: true, soHoaDon: null, lyDo: null, truocDo: null } });
});

test("docLenhNhapKeToan (A-4): bỏ dấu thiếu lý do → 400; có lý do → hợp lệ; kèm số → 400; lý do có dãy số dài → 400", () => {
  assert.match(loi({ daNhap: false, truocDo: U }), /phải ghi lý do/);
  assert.match(loi({ daNhap: false, lyDo: "   ", truocDo: U }), /phải ghi lý do/);
  assert.match(loi({ daNhap: false, lyDo: "nhầm", soHoaDon: "HD-1", truocDo: U }), /không kèm số/);
  assert.match(loi({ daNhap: false, lyDo: "gọi 0905 123 456", truocDo: U }), /số điện thoại/);
  assert.deepEqual(docLenhNhapKeToan({ daNhap: false, lyDo: " đơn huỷ ", truocDo: U }), { ok: true, lenh: { daNhap: false, soHoaDon: null, lyDo: "đơn huỷ", truocDo: U } });
});

test("docLenhNhapKeToan: thân sai kiểu, thiếu truocDo, số quá dài / ký tự lạ, lý do khi đánh dấu → 400 tiếng Việt", () => {
  loi(null);
  loi([]);
  loi({ daNhap: "true", truocDo: null });
  assert.match(loi({ daNhap: true }), /tải lại/);
  assert.match(loi({ daNhap: true, truocDo: "x" }), /tải lại/);
  assert.match(loi({ daNhap: true, soHoaDon: "H".repeat(51), truocDo: null }), /tối đa 50/);
  assert.match(loi({ daNhap: true, soHoaDon: "HD<1>", truocDo: null }), /chỉ gồm/);
  assert.match(loi({ daNhap: true, lyDo: "x", truocDo: null }), /Chỉ ghi lý do khi bỏ dấu/);
  assert.match(loi({ daNhap: false, lyDo: "x".repeat(301), truocDo: null }), /tối đa 300/);
});

test("moTaDauNhap / lenhKhongDoi / laDongNhapKeToan / soNgayKhoang", () => {
  assert.equal(moTaDauNhap({ daNhap: true, soHoaDon: "HD-000123", lyDo: null }), "Đã nhập phần mềm kế toán · HD-000123");
  assert.equal(moTaDauNhap({ daNhap: true, soHoaDon: null, lyDo: null }), "Đã nhập phần mềm kế toán");
  assert.equal(moTaDauNhap({ daNhap: false, soHoaDon: null, lyDo: "huỷ" }), "Bỏ dấu đã nhập phần mềm kế toán — lý do: huỷ");
  const l = (daNhap: boolean, soHoaDon: string | null) => ({ daNhap, soHoaDon, lyDo: daNhap ? null : "x", truocDo: null });
  assert.equal(lenhKhongDoi(null, l(false, null)), true);
  assert.equal(lenhKhongDoi(null, l(true, null)), false);
  assert.equal(lenhKhongDoi({ daNhap: true, soHoaDon: "A" }, l(true, "A")), true);
  assert.equal(lenhKhongDoi({ daNhap: true, soHoaDon: "A" }, l(true, "B")), false);
  assert.equal(lenhKhongDoi({ daNhap: false, soHoaDon: null }, l(false, null)), true);
  assert.equal(laDongNhapKeToan("order_accounting_entry_marked"), true);
  assert.equal(laDongNhapKeToan("confirmed"), false);
  assert.equal(soNgayKhoang("2026-10-01", "2026-10-01"), 1);
  assert.equal(soNgayKhoang("2026-10-01", "2026-12-31"), 92);
});
