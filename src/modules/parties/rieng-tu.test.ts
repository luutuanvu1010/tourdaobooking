// ADR-0122 đ5 + Hiến chương 5.23: ai xem / ghi được ngày sinh và liên hệ ĐỊA CHỈ. Bảng ca theo vai thật (không chép lại công thức).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { PartyDto } from "../../shared/contracts.ts";
import { anTruongRiengTu, ghiDuocRiengTu, laLienHeRiengTu, xemDuocRiengTu } from "./rieng-tu.ts";

const CA: [string, Parameters<typeof xemDuocRiengTu>[0], boolean, boolean][] = [
  // tên ca, người xem, xem được, ghi được
  ["Bán hàng xem hồ sơ khách (không ô)", { coO: false, laChinhChu: false, hoSoCoTaiKhoan: false, quanDuocTaiKhoan: false }, false, false],
  ["Bán hàng xem hồ sơ của CHÍNH MÌNH", { coO: false, laChinhChu: true, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: false }, true, false],
  ["Quản trị xem hồ sơ khách không tài khoản", { coO: true, laChinhChu: false, hoSoCoTaiKhoan: false, quanDuocTaiKhoan: false }, true, true],
  ["Quản trị xem hồ sơ tài khoản Bán hàng (quản được)", { coO: true, laChinhChu: false, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: true }, true, true],
  ["Quản trị xem hồ sơ Quản trị khác / Toàn quyền (không quản được)", { coO: true, laChinhChu: false, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: false }, false, false],
  ["Toàn quyền xem hồ sơ của CHÍNH MÌNH", { coO: true, laChinhChu: true, hoSoCoTaiKhoan: true, quanDuocTaiKhoan: true }, true, false],
];

test("xemDuocRiengTu / ghiDuocRiengTu: theo vai thật — chính chủ xem không ghi; cấp bậc chặn Quản trị", () => {
  for (const [ten, v, xem, ghi] of CA) {
    assert.equal(xemDuocRiengTu(v), xem, `xem — ${ten}`);
    assert.equal(ghiDuocRiengTu(v), ghi, `ghi — ${ten}`);
  }
});

test("laLienHeRiengTu: chỉ ADDRESS", () => {
  assert.equal(laLienHeRiengTu("ADDRESS"), true);
  assert.equal(laLienHeRiengTu("PHONE"), false);
  assert.equal(laLienHeRiengTu("EMAIL"), false);
});

test("anTruongRiengTu: bỏ KHOÁ birthDate và dòng ADDRESS, giữ SĐT / email; không sửa đối tượng gốc", () => {
  const goc = {
    id: "p", kind: "PERSON", displayName: "An", active: true, primaryPhone: "0911222333", roleCodes: [], familyName: null, middleName: null, givenName: "An",
    gender: null, birthDate: "1988-04-23", legalName: null, taxCode: null, address: null, invoiceEmail: null,
    contacts: [
      { id: "c1", kind: "PHONE", value: "0911222333", label: null, isPrimary: true, validFrom: "2026-10-16", validTo: null },
      { id: "c2", kind: "ADDRESS", value: "12 Trần Phú", label: null, isPrimary: true, validFrom: "2026-10-16", validTo: null },
    ],
    roles: [], relationships: [], createdAt: "x", updatedAt: "y", accountLinked: false, editable: true, mergedInto: null, mergedFrom: [],
  } satisfies PartyDto;
  const an = anTruongRiengTu(goc);
  assert.equal("birthDate" in an, false);
  assert.deepEqual(an.contacts.map((c) => c.kind), ["PHONE"]);
  assert.equal(goc.birthDate, "1988-04-23");
  assert.equal(goc.contacts.length, 2);
});
