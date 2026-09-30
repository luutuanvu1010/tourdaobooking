import assert from "node:assert/strict";
import { test } from "node:test";
import { dongLichSuNhom, gioNgayThang } from "./lich-su-nhom.ts";

test("gioNgayThang: giờ Việt Nam, dạng 'dd/mm hh:mm' (24 giờ)", () => {
  assert.equal(gioNgayThang("2026-09-30T07:05:00.000Z"), "30/09 14:05");
  assert.equal(gioNgayThang("2026-09-30T17:30:00.000Z"), "01/10 00:30", "qua nửa đêm giờ VN sang ngày mới");
  assert.equal(gioNgayThang("2026-01-02T00:00:00.000Z"), "02/01 07:00");
});

test("dongLichSuNhom: mới nhất trước; 'từ' lấy từ dòng cũ hơn kế tiếp, dòng cũ nhất từ 'Chưa phân loại'", () => {
  const ten = new Map([["id-lan", "Lan"]]);
  const dong = dongLichSuNhom(
    [
      { luc: "2026-09-30T08:10:00.000Z", createdBy: "id-lan", nhom: "Thể thao biển" },
      { luc: "2026-09-30T07:05:00.000Z", createdBy: null, nhom: "Tour đảo" },
    ],
    ten,
  );
  assert.deepEqual(dong, ["30/09 15:10 — Lan: Tour đảo → Thể thao biển", "30/09 14:05 — Hệ thống: Chưa phân loại → Tour đảo"]);
});

test("dongLichSuNhom: id không có trong danh sách → 'Người dùng cũ'; nhóm null → 'Chưa phân loại'", () => {
  const dong = dongLichSuNhom(
    [
      { luc: "2026-09-30T09:00:00.000Z", createdBy: "id-da-xoa", nhom: null },
      { luc: "2026-09-30T08:00:00.000Z", createdBy: "id-da-xoa", nhom: "Long Phú" },
    ],
    new Map(),
  );
  assert.deepEqual(dong, ["30/09 16:00 — Người dùng cũ: Long Phú → Chưa phân loại", "30/09 15:00 — Người dùng cũ: Chưa phân loại → Long Phú"]);
});

test("dongLichSuNhom: danh sách rỗng → rỗng", () => {
  assert.deepEqual(dongLichSuNhom([], new Map()), []);
});
