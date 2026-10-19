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

test("docLenhNhapKeToan (kiểm độc lập, Hiến chương 5.12): số hoá đơn có dãy ≥ 10 chữ số liền → 400 (SĐT/MST dán nhầm); 9 chữ số liền, số có dấu ngăn vẫn được", () => {
  assert.equal(loi({ daNhap: true, soHoaDon: "0905123456", truocDo: null }), "Số hoá đơn có dãy số quá dài — có thể là SĐT/MST dán nhầm.");
  assert.match(loi({ daNhap: true, soHoaDon: "HD-4201234567", truocDo: null }), /quá dài/);
  assert.equal(docLenhNhapKeToan({ daNhap: true, soHoaDon: "HD-000123456", truocDo: null }).ok, true);
  assert.equal(docLenhNhapKeToan({ daNhap: true, soHoaDon: "00012345/2026", truocDo: null }).ok, true);
});

test("moTaDauNhap / lenhKhongDoi / laDongNhapKeToan / soNgayKhoang", () => {
  assert.equal(moTaDauNhap({ daNhap: true, soHoaDon: "HD-000123", lyDo: null }), "Đã nhập phần mềm kế toán · HD-000123");
  assert.equal(moTaDauNhap({ daNhap: true, soHoaDon: null, lyDo: null }), "Đã nhập phần mềm kế toán");
  assert.equal(moTaDauNhap({ daNhap: false, soHoaDon: null, lyDo: "huỷ" }), "Bỏ đánh dấu đã nhập phần mềm kế toán — lý do: huỷ");
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

test("bộ lọc màn Đơn hàng (loc-don.ts) × ADR-0060: tham số, chip, bỏ khoảng ngày bỏ luôn lọc dấu, kiểm khoảng ngày, bộ lọc nhớ sai bị bỏ", async () => {
  const { LOC_TRONG, boDieuKien, chipLocDon, docLocDaNho, kiemLocNhapKeToan, thamSoLocDon } = await import("./loc-don.ts");
  const loc = { ...LOC_TRONG, tu: "2026-10-01", den: "2026-10-31", nhapKeToan: "chua" as const };
  assert.deepEqual(thamSoLocDon(loc, "x"), [["tu", "2026-10-01"], ["den", "2026-10-31"], ["nhapKeToan", "chua"]]);
  assert.deepEqual(chipLocDon(loc, new Map()).map((c) => c.nhan), ["Ngày đi 01/10 – 31/10", "Chưa nhập PM kế toán"]);
  assert.equal(boDieuKien(loc, "ngay").nhapKeToan, null);
  assert.equal(boDieuKien(loc, "nhapKeToan").tu, "2026-10-01");
  assert.equal(kiemLocNhapKeToan(loc), null);
  assert.match(kiemLocNhapKeToan({ ...loc, den: null })!, /Từ ngày và Đến ngày/);
  assert.match(kiemLocNhapKeToan({ ...loc, den: "2027-01-01" })!, /tối đa 92 ngày/);
  assert.equal(kiemLocNhapKeToan({ ...LOC_TRONG }), null);
  assert.deepEqual(docLocDaNho(JSON.stringify({ nhapKeToan: "da" })), LOC_TRONG, "nhớ lọc dấu mà thiếu khoảng ngày → bỏ");
  assert.equal(docLocDaNho(JSON.stringify({ tu: "2026-10-01", den: "2026-10-02", nhapKeToan: "da" })).nhapKeToan, "da");
});
