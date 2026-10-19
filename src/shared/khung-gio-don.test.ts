// Luật thuần khung giờ đón (ADR-0134 Đ5): danh sách 1–12 khung HH:MM, `tu < den`, không chồng nhau, sắp tăng; nhãn 24 giờ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_LUU_Y_MAC_DINH, KHUNG_MAC_DINH, kiemCauLuuY, kiemDanhSachKhung, laLuaChonDon, nhanKhung } from "./khung-gio-don.ts";

const MAC_DINH = [
  { tu: "07:30", den: "08:00" }, { tu: "08:00", den: "08:30" }, { tu: "08:30", den: "09:00" }, { tu: "09:00", den: "09:30" }, { tu: "09:30", den: "10:00" },
];

test("khung mặc định hợp lệ và nhãn 24 giờ", () => {
  const r = kiemDanhSachKhung(MAC_DINH);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.khung, MAC_DINH);
  assert.equal(nhanKhung({ tu: "07:30", den: "08:00" }), "07:30–08:00");
  assert.deepEqual(KHUNG_MAC_DINH, MAC_DINH);
  assert.equal(CAU_LUU_Y_MAC_DINH, "Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động.");
});

test("chồng nhau, ngược giờ, sai định dạng, rỗng, 13 khung, không sắp tăng, khoá lạ → lỗi tiếng Việt", () => {
  const loi = (raw: unknown): string => {
    const r = kiemDanhSachKhung(raw);
    assert.equal(r.ok, false, `phải lỗi: ${JSON.stringify(raw)}`);
    return r.ok ? "" : r.loi;
  };
  assert.match(loi([{ tu: "08:00", den: "09:00" }, { tu: "08:30", den: "09:30" }]), /chồng/);
  assert.match(loi([{ tu: "09:00", den: "08:00" }]), /trước/);
  assert.match(loi([{ tu: "09:00", den: "09:00" }]), /trước/);
  assert.match(loi([{ tu: "7:30", den: "08:00" }]), /HH:MM/);
  assert.match(loi([{ tu: "24:00", den: "24:30" }]), /HH:MM/);
  assert.match(loi([]), /ít nhất/);
  assert.match(loi("x"), /không hợp lệ/);
  assert.match(loi(null), /không hợp lệ/);
  assert.match(loi([null]), /không hợp lệ/);
  const muoiBa = Array.from({ length: 13 }, (_, i) => ({ tu: `${String(6 + i).padStart(2, "0")}:00`, den: `${String(6 + i).padStart(2, "0")}:30` }));
  assert.match(loi(muoiBa), /tối đa 12/);
  assert.match(loi([{ tu: "09:00", den: "09:30" }, { tu: "08:00", den: "08:30" }]), /tăng dần/);
  // 12 khung vẫn được
  assert.equal(kiemDanhSachKhung(muoiBa.slice(0, 12)).ok, true);
  // Hai khung nối liền (đầu khung sau = cuối khung trước) KHÔNG phải chồng nhau.
  assert.equal(kiemDanhSachKhung([{ tu: "08:00", den: "08:30" }, { tu: "08:30", den: "09:00" }]).ok, true);
  // Mọi câu lỗi tiếng Việt có dấu, không lộ khoá thô.
  for (const raw of [[], [{ tu: "x", den: "y" }], muoiBa]) assert.doesNotMatch(loi(raw), /\btu\b|\bden\b|undefined/);
});

test("kiểm câu lưu ý: 1–200 ký tự sau khi bỏ khoảng trắng hai đầu", () => {
  assert.deepEqual(kiemCauLuuY("  Giờ đón có thể đổi.  "), { ok: true, cau: "Giờ đón có thể đổi." });
  assert.equal(kiemCauLuuY("").ok, false);
  assert.equal(kiemCauLuuY("   ").ok, false);
  assert.equal(kiemCauLuuY(5).ok, false);
  assert.equal(kiemCauLuuY("a".repeat(200)).ok, true);
  assert.equal(kiemCauLuuY("a".repeat(201)).ok, false);
});

test("lựa chọn đón: chỉ DON / KHONG_DON", () => {
  assert.equal(laLuaChonDon("DON"), true);
  assert.equal(laLuaChonDon("KHONG_DON"), true);
  for (const v of ["don", "", null, undefined, 1, "PICKUP"]) assert.equal(laLuaChonDon(v), false);
});
