import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_TU_CHOI_PHAT_LAI, NGUONG_DANG_XU_LY_MS, ketQuaDeLuu, kiemKhoa, phanLoai, thanPhatLai } from "./lan-gui-luat.ts";

test("kiemKhoa: 16–64 ký tự [A-Za-z0-9-]; biên 15/16/64/65", () => {
  assert.equal(kiemKhoa("a".repeat(15)), false);
  assert.equal(kiemKhoa("a".repeat(16)), true);
  assert.equal(kiemKhoa("a".repeat(64)), true);
  assert.equal(kiemKhoa("a".repeat(65)), false);
  assert.equal(kiemKhoa(crypto.randomUUID()), true);
  for (const x of ["abc def ghi jkl mno", "aaaaaaaaaaaaaaa_b", "aaaaaaaaaaaaaaaá", "aaaaaaaaaaaaaaa\n", ""]) assert.equal(kiemKhoa(x), false, JSON.stringify(x));
});

const at = (ms: number) => new Date(ms).toISOString();
const T0 = Date.parse("2026-10-03T01:00:00.000Z");
const dong = (o: Partial<{ van_tay: string; ma_tra: number | null; ma_loi: string | null; ket_qua: string | null; created_at: string }>) => ({
  van_tay: "vt", ma_tra: null, ma_loi: null, ket_qua: null, created_at: at(T0), ...o,
});

test("phanLoai: khác vân tay ⇒ khac_noi_dung (kể cả khi đã có kết quả)", () => {
  assert.equal(phanLoai(dong({ ma_tra: 201 }), "khac", T0), "khac_noi_dung");
  assert.equal(phanLoai(dong({}), "khac", T0), "khac_noi_dung");
});

test("phanLoai: đã có kết quả ⇒ phat_lai; ma_tra ≥ 500 ⇒ phat_lai_khong_ro", () => {
  assert.equal(phanLoai(dong({ ma_tra: 201 }), "vt", T0), "phat_lai");
  assert.equal(phanLoai(dong({ ma_tra: 409, ma_loi: "x" }), "vt", T0), "phat_lai");
  assert.equal(phanLoai(dong({ ma_tra: 500 }), "vt", T0), "phat_lai_khong_ro");
});

test("phanLoai: chưa có kết quả — < 10 giây ⇒ dang_xu_ly; ≥ 10 giây ⇒ phat_lai_khong_ro (biên 9,999 / 10,000)", () => {
  assert.equal(NGUONG_DANG_XU_LY_MS, 10_000);
  assert.equal(phanLoai(dong({}), "vt", T0 + 9_999), "dang_xu_ly");
  assert.equal(phanLoai(dong({}), "vt", T0 + 10_000), "phat_lai_khong_ro");
  assert.equal(phanLoai(dong({ created_at: "hỏng" }), "vt", T0), "phat_lai_khong_ro", "mốc hỏng: không treo 409 mãi");
});

test("thanPhatLai: thành công ⇒ 200 {da_ghi_truoc_do, ket_qua}", () => {
  assert.deepEqual(thanPhatLai(dong({ ma_tra: 201, ket_qua: "/order?id=abc" }), "phat_lai"), { status: 200, body: { da_ghi_truoc_do: true, ket_qua: "/order?id=abc" } });
  assert.deepEqual(thanPhatLai(dong({ ma_tra: 200 }), "phat_lai"), { status: 200, body: { da_ghi_truoc_do: true, ket_qua: null } });
});

test("thanPhatLai: không rõ kết quả ⇒ 200 với ket_qua null (kể cả khi lỡ có ket_qua)", () => {
  assert.deepEqual(thanPhatLai(dong({ ma_tra: 500, ket_qua: "/x" }), "phat_lai_khong_ro"), { status: 200, body: { da_ghi_truoc_do: true, ket_qua: null } });
  assert.deepEqual(thanPhatLai(dong({}), "phat_lai_khong_ro"), { status: 200, body: { da_ghi_truoc_do: true, ket_qua: null } });
});

test("thanPhatLai: lần đầu bị từ chối mà vẫn ghi vé ⇒ đúng mã + mã lỗi cũ + câu cố định (không lưu câu chữ cũ)", () => {
  assert.deepEqual(thanPhatLai(dong({ ma_tra: 409, ma_loi: "last_admin" }), "phat_lai"), {
    status: 409, body: { error: { code: "last_admin", message: CAU_TU_CHOI_PHAT_LAI } },
  });
  assert.deepEqual(thanPhatLai(dong({ ma_tra: 400 }), "phat_lai"), { status: 400, body: { error: { code: "error", message: CAU_TU_CHOI_PHAT_LAI } } });
});

test("ketQuaDeLuu: chỉ giữ đường dẫn nội bộ chỉ chứa id; còn lại null (T16, T19)", () => {
  assert.equal(ketQuaDeLuu("/order?id=7f0c2c1e-1d2b-4c1a-9a51-0e2b8a1d2c3f"), "/order?id=7f0c2c1e-1d2b-4c1a-9a51-0e2b8a1d2c3f");
  assert.equal(ketQuaDeLuu("/parties"), "/parties");
  for (const x of [null, "", "https://evil.com/x", "//evil.com", "/\\evil.com", "/order?id=abc&ten=Nguyễn", "/order?q=0901234567 x", "/a/b?id=1#frag"]) assert.equal(ketQuaDeLuu(x), null, String(x));
});
