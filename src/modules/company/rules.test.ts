// Luật thuần của module company (ADR-0024 6.2): danh sách trắng năm trường công khai dựng từ định danh hồ sơ công ty chủ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCompanyDto } from "./rules.ts";

const DU = { legalName: "CÔNG TY THỬ", taxCode: "0312345678", address: "1 Đường Thử, Phường Thử", hotline: "0901 234 567", email: "lien.he@thu.vn" };

test("toCompanyDto: đủ trường → đúng năm khoá của CompanyDto (không partyId, tên gọi, Zalo)", () => {
  const dto = toCompanyDto({ ...DU, partyId: "x", displayName: "Tên gọi", zalo: "0901" } as typeof DU);
  assert.deepEqual(dto, { name: DU.legalName, taxCode: DU.taxCode, address: DU.address, hotline: DU.hotline, email: DU.email });
  assert.deepEqual(Object.keys(dto!), ["name", "taxCode", "address", "hotline", "email"]);
});

test("toCompanyDto: email trống → null; thiếu tên pháp lý / MST / địa chỉ / hotline (null hoặc toàn khoảng trắng) → null (route trả 404)", () => {
  assert.equal(toCompanyDto({ ...DU, email: null })!.email, null);
  assert.equal(toCompanyDto({ ...DU, email: "  " })!.email, null);
  assert.equal(toCompanyDto(null), null);
  for (const k of ["legalName", "taxCode", "address", "hotline"] as const) {
    assert.equal(toCompanyDto({ ...DU, [k]: null }), null, `${k} null`);
    assert.equal(toCompanyDto({ ...DU, [k]: "   " }), null, `${k} trống`);
  }
});
