// Luật thuần thân route khung bận của xe (ADR-0055 VK2-A A5–A6; kế hoạch Đợt 3 Task 6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiTietNhatKyKhung, kiemKhungBanMoi, kiemRutKhung, loiRangBuocKhungBan } from "./khung-ban.ts";

const ms = (d: string, hhmm: string) => Date.parse(`${d}T${hhmm}:00.000+07:00`);
const NOW = ms("2026-10-05", "10:00");
const than = (tu: [string, string], den: [string, string], lyDo = "BAN_XE_BAO_DUONG") => ({ batDau: { ngay: tu[0], gio: tu[1] }, ketThuc: { ngay: den[0], gio: den[1] }, lyDo });

test("kiemKhungBanMoi: giờ VN → mốc máy; qua nửa đêm được; bắt đầu trong quá khứ được nếu kết thúc sau bây giờ (K4)", () => {
  const r = kiemKhungBanMoi(than(["2026-10-05", "23:00"], ["2026-10-06", "07:00"]), NOW);
  assert.deepEqual(r, { ok: true, value: { batDauMs: ms("2026-10-05", "23:00"), ketThucMs: ms("2026-10-06", "07:00"), lyDo: "BAN_XE_BAO_DUONG" } });
  assert.equal(kiemKhungBanMoi(than(["2026-10-05", "08:00"], ["2026-10-05", "17:00"]), NOW).ok, true);
  assert.equal(kiemKhungBanMoi(than(["2026-10-05", "11:00"], ["2026-11-05", "11:00"]), NOW).ok, true, "đúng 31 ngày được");
});

test("kiemKhungBanMoi: kết thúc ≤ bắt đầu, khung đã kết thúc, quá 31 ngày, sai khuôn giờ, thiếu lý do → 400 câu lời thường", () => {
  for (const b of [
    than(["2026-10-05", "17:00"], ["2026-10-05", "08:00"]),
    than(["2026-10-05", "08:00"], ["2026-10-05", "08:00"]),
    than(["2026-10-04", "08:00"], ["2026-10-05", "09:00"]),
    than(["2026-10-05", "11:00"], ["2026-11-06", "11:00"]),
    { batDau: { ngay: "2026-10-05", gio: "8h" }, ketThuc: { ngay: "2026-10-05", gio: "17:00" }, lyDo: "BAN_XE_KHAC" },
    { batDau: { ngay: "2026-10-05", gio: "24:00" }, ketThuc: { ngay: "2026-10-05", gio: "17:00" }, lyDo: "BAN_XE_KHAC" },
    { ...than(["2026-10-05", "11:00"], ["2026-10-05", "12:00"]), lyDo: "" },
    { ...than(["2026-10-05", "11:00"], ["2026-10-05", "12:00"]), lyDo: "bao duong" },
  ]) {
    const r = kiemKhungBanMoi(b, NOW);
    assert.equal(r.ok, false, JSON.stringify(b));
    assert.doesNotMatch((r as { message: string }).message, /[A-Z]{2,}_/);
  }
  assert.equal(kiemKhungBanMoi(null, NOW).ok, false);
});

test("kiemRutKhung: cần version nguyên ≥ 1", () => {
  assert.deepEqual(kiemRutKhung({ version: 2 }), { ok: true, value: { version: 2 } });
  for (const b of [{}, { version: 0 }, { version: 1.5 }, { version: "2" }, null]) assert.equal(kiemRutKhung(b).ok, false, JSON.stringify(b));
});

test("nhật ký: biển số + khung giờ VN + nhãn lý do; không SĐT/số giấy tờ", () => {
  assert.equal(chiTietNhatKyKhung("79B-012.34", { batDauMs: ms("2026-10-05", "08:00"), ketThucMs: ms("2026-10-05", "17:00") }, "Bảo dưỡng"),
    "xe 79B-012.34: bận 08:00 05/10 → 17:00 05/10 · Bảo dưỡng");
  assert.match(chiTietNhatKyKhung("79B-012.34", { batDauMs: 0, ketThucMs: 60000 }, "Khác", true), /^xe 79B-012\.34: rút khung bận/);
});

test("loiRangBuocKhungBan: mã lớp CSDL KHÁC mã lớp route (khuôn R15); lỗi lạ → null", () => {
  assert.equal(loiRangBuocKhungBan("unavailability_overlaps_trip: …")!.code, "khung_ban_chong_chuyen_csdl");
  assert.equal(loiRangBuocKhungBan("vc_unavailability_append_only: …")!.code, "khung_ban_vua_doi");
  assert.equal(loiRangBuocKhungBan("unavailability_reason_group: …")!.status, 400);
  assert.equal(loiRangBuocKhungBan("FOREIGN KEY constraint failed")!.status, 400);
  assert.equal(loiRangBuocKhungBan("something else"), null);
});
