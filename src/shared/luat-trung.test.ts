// Bảng luật trùng dùng chung (ADR-0092 đ6, đ6a): luật thuần.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LUAT_TRUNG, kiemTrung } from "./luat-trung.ts";

const uv = [{ soTien: 500_000, ngay: "2026-11-02" }];

test("không có ứng viên ⇒ qua, không ghi lý do", () => {
  assert.deepEqual(kiemTrung("lan_thu_tien_mat", { ungVien: [], boQua: undefined }), { ok: true, boQua: null });
});
test("có ứng viên, không bỏ qua ⇒ cảnh báo kèm ứng viên; bỏ qua sai dòng ⇒ vẫn cảnh báo", () => {
  const r = kiemTrung("lan_thu_tien_mat", { ungVien: uv, boQua: undefined });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.canhBao.ungVien, uv);
  assert.equal(kiemTrung("lan_thu_tien_mat", { ungVien: uv, boQua: { ma: "ma_giao_dich_khac_don", lyDo: "Hai lần thu thật của khách" } }).ok, false);
});
test("CT4: lý do ≥ 10 ký tự, không dãy số dài", () => {
  const ngan = kiemTrung("lan_thu_tien_mat", { ungVien: uv, boQua: { ma: "lan_thu_tien_mat", lyDo: "ngắn" } });
  assert.equal(ngan.ok, false);
  if (!ngan.ok) assert.match(ngan.lyDoLoi ?? "", /tối thiểu 10/);
  assert.equal(kiemTrung("lan_thu_tien_mat", { ungVien: uv, boQua: { ma: "lan_thu_tien_mat", lyDo: "khách gọi 0900000001 báo trả hai lần" } }).ok, false);
  assert.deepEqual(kiemTrung("lan_thu_tien_mat", { ungVien: uv, boQua: { ma: "lan_thu_tien_mat", lyDo: " Khách trả hai lần thật " } }), { ok: true, boQua: { ma: "lan_thu_tien_mat", lyDo: "Khách trả hai lần thật" } });
});
test("bảng khai đúng hai dòng: cả hai đều bắt lý do; dòng mã do Kế toán bỏ qua", () => {
  assert.deepEqual(Object.keys(LUAT_TRUNG).sort(), ["lan_thu_tien_mat", "ma_giao_dich_khac_don"]);
  assert.equal(LUAT_TRUNG.ma_giao_dich_khac_don.boQua, "ke_toan");
  assert.equal(LUAT_TRUNG.lan_thu_tien_mat.boQua, "nguoi_ghi");
});
