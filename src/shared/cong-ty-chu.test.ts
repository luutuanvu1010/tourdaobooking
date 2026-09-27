// ADR-0024 điều 6 / 6.2 — hằng mã vai "Công ty chủ" và chữ chân trang đăng nhập (thuần, dùng chung server ↔ giao diện).
import { test } from "node:test";
import assert from "node:assert/strict";
import { OWNER_COMPANY_ROLE, chanTrangCongTy } from "./cong-ty-chu.ts";

test("mã vai công ty chủ là OWNER_COMPANY (dữ liệu ở migration *_ho_so_cong_ty_chu.sql — src/migrations-ho-so-cong-ty-chu.test.ts đối chiếu)", () => {
  assert.equal(OWNER_COMPANY_ROLE, "OWNER_COMPANY");
});

test("chanTrangCongTy: nhận tên + MST hợp lệ (cắt khoảng trắng); thiếu/sai → null để trang giữ chữ tĩnh", () => {
  assert.deepEqual(chanTrangCongTy({ companyName: "  Công ty Thử  ", companyTaxCode: " 0312345678 " }), { ten: "Công ty Thử", mst: "0312345678" });
  assert.deepEqual(chanTrangCongTy({ companyName: "Công ty Thử", companyTaxCode: "0312345678-001" }), { ten: "Công ty Thử", mst: "0312345678-001" });
  const bad: unknown[] = [
    null, undefined, 1, "x", {},
    { companyName: null, companyTaxCode: null },
    { companyName: "", companyTaxCode: "0312345678" },
    { companyName: "   ", companyTaxCode: "0312345678" },
    { companyName: "A", companyTaxCode: "123" },
    { companyName: "A", companyTaxCode: "031234567890123" },
    { companyName: "A", companyTaxCode: "03123x5678" },
    { companyName: "x".repeat(201), companyTaxCode: "0312345678" },
    { companyName: 5, companyTaxCode: "0312345678" },
  ];
  for (const b of bad) assert.equal(chanTrangCongTy(b), null, JSON.stringify(b));
});
