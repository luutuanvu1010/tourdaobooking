// Luật thuần khung bận (ADR-0055 VK2-A; kế hoạch Đợt 3 Task 2): chồng nửa mở, chuyến vướng khung (khớp trigger), khung trong ngày VN, nhãn giờ VN.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chongNuaMo, chuyenVuongKhung, khungTrongNgay, nhanKhoangGio } from "./khung-ban.ts";
import type { KhungChuyen } from "./dieu-phoi-kieu.ts";

const D = "2026-10-05";
const ms = (hhmm: string, d = 0) => Date.parse(`${D}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const kc = (o: Partial<KhungChuyen> & { id: string }): KhungChuyen => ({ ma: `CX-${o.id}`, xeId: "xe1", taiXePartyId: null, batDauMs: ms("09:00"), ketThucMs: ms("10:00"), ketThucThatMs: null, trangThai: "PLANNED", ...o });

test("chongNuaMo: chạm mép không chồng; lồng nhau chồng", () => {
  assert.equal(chongNuaMo(1, 2, 2, 3), false);
  assert.equal(chongNuaMo(1, 3, 2, 4), true);
  assert.equal(chongNuaMo(1, 10, 2, 3), true);
});

test("chuyenVuongKhung: chỉ chuyến PLANNED/RUNNING cùng xe chồng khung; huỷ, đã kết thúc, xe khác bị bỏ; so với giờ kết thúc DỰ KIẾN (khớp trigger)", () => {
  const k = { xeId: "xe1", batDauMs: ms("08:00"), ketThucMs: ms("17:00") };
  const ds = [
    kc({ id: "a" }), kc({ id: "b", trangThai: "CANCELLED" }), kc({ id: "c", trangThai: "ENDED", ketThucThatMs: ms("10:00") }),
    kc({ id: "d", xeId: "xe2" }), kc({ id: "e", trangThai: "RUNNING" }), kc({ id: "f", batDauMs: ms("17:00"), ketThucMs: ms("18:00") }),
  ];
  assert.deepEqual(chuyenVuongKhung(k, ds).map((c) => c.id), ["a", "e"]);
});

test("Review Focus 1 — khungTrongNgay chặn bằng nửa đêm VN: khung 23:00 D → 07:00 D+1 thuộc cả D và D+1; khung 00:00–07:00 D+1 KHÔNG thuộc D (dù 00:00 VN = 17:00 UTC ngày D)", () => {
  const qua = { id: "q", batDauMs: ms("23:00"), ketThucMs: ms("07:00", 1) };
  const sang = { id: "s", batDauMs: ms("00:00", 1), ketThucMs: ms("07:00", 1) };
  assert.deepEqual(khungTrongNgay([qua, sang], D).map((x) => x.id), ["q"]);
  assert.deepEqual(khungTrongNgay([qua, sang], "2026-10-06").map((x) => x.id), ["q", "s"]);
});

test("nhanKhoangGio: giờ VN, không phải UTC", () => {
  assert.equal(nhanKhoangGio(ms("23:00"), ms("07:00", 1)), "23:00 05/10 → 07:00 06/10");
});
