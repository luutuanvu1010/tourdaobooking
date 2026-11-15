// GET /api/auth/config trả tên + MST của hồ sơ công ty chủ cho chân trang đăng nhập (ADR-0024 6.2) — chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
// Đọc hồ sơ lỗi KHÔNG được làm hỏng cấu hình đăng nhập (Turnstile, bảo trì, Face ID, phiên bản): 200, hai trường null.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";

const hoSo = (w: any) =>
  w.q(`SELECT p.display_name, o.tax_code FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
       WHERE r.role_type_code = 'OWNER_COMPANY' AND r.valid_to_date IS NULL`);

test("cấu hình đăng nhập: companyName = tên gọi, companyTaxCode = MST của hồ sơ công ty chủ (đọc từ CSDL); các trường cũ giữ nguyên", async () => {
  const w = world();
  const [ho] = hoSo(w);
  const r = await w.call("GET", "/api/auth/config");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.companyName, ho.display_name);
  assert.equal(r.json.companyTaxCode, ho.tax_code);
  assert.deepEqual(Object.keys(r.json).sort(), ["companyName", "companyTaxCode", "maintenance", "passkey", "supportPhone", "turnstileSiteKey", "version"]);
  assert.deepEqual(r.json.maintenance, { on: false, endsAt: null });
  // ADR-0202 (bổ sung 13/11, chủ «Có, nối luôn»): `supportPhone` = SĐT hỗ trợ công khai Toàn quyền lưu ở nội dung màn bảo trì — KHÔNG phải hotline / liên hệ của hồ sơ công ty.
  const { supportPhone, ...conLai } = r.json;
  assert.match(supportPhone, /^0\d{9}$/);
  assert.doesNotMatch(JSON.stringify(conLai), /hotline|phone|email|address/i, "ngoài SĐT hỗ trợ: chỉ tên + MST — không SĐT, email, địa chỉ của hồ sơ công ty");
});

test("đọc hồ sơ lỗi → cấu hình VẪN 200 với đủ trường cũ, hai trường mới null (chân trang giữ chữ tĩnh; Turnstile/Face ID không chết theo)", async () => {
  const w = world();
  w.sqlite.exec("ALTER TABLE pty_organization RENAME TO pty_organization_tam");
  const r = await w.call("GET", "/api/auth/config");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.companyName, null);
  assert.equal(r.json.companyTaxCode, null);
  for (const k of ["turnstileSiteKey", "maintenance", "passkey", "version"]) assert.ok(k in r.json, k);
});

test("đổi công ty chủ (chủ trả lời 2026-09-28): cấu hình đăng nhập trả tên + MST của hồ sơ MỚI", async () => {
  const w = world();
  const B = "12345678-1234-4234-8234-123456789abc";
  const at = "2026-09-28T00:00:00.000Z";
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${B}', 'ORGANIZATION', 'Pháp nhân Mới', 1, '${at}', '${at}')`);
  w.sqlite.exec(`INSERT INTO pty_organization (party_id, legal_name, tax_code, address, created_at, updated_at) VALUES ('${B}', 'CÔNG TY MỚI', '0312345678', '2 Đường Mới', '${at}', '${at}')`);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at)
                 VALUES ('12345678-1234-4234-8234-000000000002', '${B}', 'OWNER_COMPANY', '2026-09-28', '${at}', '${at}')`);
  const r = await w.call("GET", "/api/auth/config");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.companyName, "Pháp nhân Mới");
  assert.equal(r.json.companyTaxCode, "0312345678");
});
