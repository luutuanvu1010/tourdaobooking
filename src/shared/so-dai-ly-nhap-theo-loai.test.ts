// ADR-0133 Task 5: đọc ô nhập «tách theo loại khách» và nhãn hiển thị — phần thuần của màn Hoa hồng đối tác (web/hoa-hong.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { docThanDongMucTa, docThanMuc, type FormDongMucTa, type FormMuc } from "./so-dai-ly-nhap.ts";
import { nhanMucDto } from "./hoa-hong-hien-thi.ts";

const goc: FormMuc = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", catalogCode: "", groupCode: "", tuNgay: "2026-10-19", denNgay: "", ghiChu: "", kieu: "PER_PAX", tyLe: "", moiKhach: "50.000" };

test("không bật «tách theo loại» ⇒ thân như cũ, không có theoLoai", () => {
  const r = docThanMuc(goc);
  assert.ok(r.ok);
  assert.equal("theoLoai" in r.body, false);
  const r2 = docThanMuc({ ...goc, theoLoai: false, treEm: "30.000" });
  assert.ok(r2.ok);
  assert.equal("theoLoai" in r2.body, false, "ô trẻ em còn chữ nhưng công tắc tắt ⇒ bỏ qua");
});

test("bật «tách theo loại»: hai ô điền thì gửi đúng số; ô trống = 0 (ADR-0133 điều 2)", () => {
  const r = docThanMuc({ ...goc, theoLoai: true, treEm: "30.000", nguoiCaoTuoi: "40000" });
  assert.ok(r.ok);
  assert.deepEqual((r.body as { theoLoai?: unknown }).theoLoai, { treEm: 30_000, nguoiCaoTuoi: 40_000 });
  const r2 = docThanMuc({ ...goc, theoLoai: true, treEm: "", nguoiCaoTuoi: "  " });
  assert.ok(r2.ok);
  assert.deepEqual((r2.body as { theoLoai?: unknown }).theoLoai, { treEm: 0, nguoiCaoTuoi: 0 });
});

test("bật «tách theo loại»: số sai ⇒ lỗi tiếng Việt ở ô «muc»; kiểu phần trăm thì công tắc không có nghĩa", () => {
  const r = docThanMuc({ ...goc, theoLoai: true, treEm: "abc", nguoiCaoTuoi: "" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.loi[0]!.truong, "muc");
    assert.match(r.loi[0]!.message, /[À-ỹ]/);
  }
  const qua = docThanMuc({ ...goc, theoLoai: true, treEm: "100.000.001", nguoiCaoTuoi: "" });
  assert.equal(qua.ok, false);
  const rate = docThanMuc({ ...goc, kieu: "RATE", tyLe: "12,5", moiKhach: "", theoLoai: true, treEm: "30.000" });
  assert.ok(rate.ok);
  assert.equal("theoLoai" in rate.body, false);
});

test("dòng của mức TA cũng nhận «tách theo loại»", () => {
  const f: FormDongMucTa = { phamVi: "ALL", catalogCode: "", groupCode: "", tuNgay: "2026-10-19", denNgay: "", ghiChu: "", kieu: "PER_PAX", tyLe: "", moiKhach: "50.000", theoLoai: true, treEm: "30.000", nguoiCaoTuoi: "" };
  const r = docThanDongMucTa(f);
  assert.ok(r.ok);
  assert.deepEqual((r.body as { theoLoai?: unknown }).theoLoai, { treEm: 30_000, nguoiCaoTuoi: 0 });
});

test("nhãn mức: có ba số thì nêu đủ, ô trống hiện «0đ»; không có thì như cũ", () => {
  assert.equal(nhanMucDto({ kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 }), "50.000đ/khách");
  const s = nhanMucDto({ kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000, theoLoai: { nguoiLon: 50_000, treEm: 30_000, nguoiCaoTuoi: 0 } });
  assert.equal(s, "người lớn 50.000đ · trẻ em 30.000đ · người cao tuổi 0đ/khách");
  assert.equal(nhanMucDto({ kieu: "RATE", tyLeBp: 1250, moiKhach: null, theoLoai: null }), "12,5%");
});
