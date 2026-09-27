// GET /api/company (công khai, cho biên nhận) đọc hồ sơ công ty chủ qua hàm công bố ownerCompany của parties (ADR-0024 6.2, 6.3) — chạy CẢ ứng dụng
// trên SQLite thật qua khung tests/audit/harness.mjs. So với giá trị đọc từ CSDL, không gõ số của công ty.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";

const CT = (w: any): string => w.q("SELECT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL")[0].party_id;
/** Năm trường biên nhận cần, đọc thẳng từ dòng company_profile (nguồn đã chép sang hồ sơ công ty chủ ở migration). */
const banChep = (w: any) => {
  const r = w.q("SELECT company_name, tax_code, address, hotline, email FROM company_profile WHERE id = 'default'")[0];
  return { name: r.company_name, taxCode: r.tax_code, address: r.address, hotline: r.hotline, email: r.email };
};

test("GET /api/company: 200 khi chưa đăng nhập, đúng năm khoá, giá trị = bản chép từ company_profile (biên nhận không đổi so với trước T2b)", async () => {
  const w = world();
  const r = await w.call("GET", "/api/company");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json), ["company"]);
  assert.deepEqual(r.json.company, banChep(w));
});

test("6.3: nguồn là hồ sơ công ty chủ — sửa company_profile KHÔNG đổi API; sửa hồ sơ thì đổi theo; đóng email → null; hết Hotline → 404", async () => {
  const w = world();
  const id = CT(w);
  const truoc = banChep(w);
  w.sqlite.exec("UPDATE company_profile SET company_name = 'KHÔNG ĐƯỢC ĐỌC', tax_code = '0000000000', address = 'KHÔNG ĐƯỢC ĐỌC', hotline = '0999 999 999', email = 'khong@duoc.doc' WHERE id = 'default'");
  let r = await w.call("GET", "/api/company");
  assert.deepEqual(r.json.company, truoc, "cột pháp lý của company_profile thôi được đọc");
  w.sqlite.prepare("UPDATE pty_organization SET legal_name = 'CÔNG TY THỬ' WHERE party_id = ?").run(id);
  r = await w.call("GET", "/api/company");
  assert.equal(r.json.company.name, "CÔNG TY THỬ");
  w.sqlite.prepare("UPDATE pty_contact_point SET valid_to_date = valid_from_date WHERE party_id = ? AND contact_kind_code = 'EMAIL'").run(id);
  r = await w.call("GET", "/api/company");
  assert.equal(r.status, 200);
  assert.equal(r.json.company.email, null);
  w.sqlite.prepare("UPDATE pty_contact_point SET valid_to_date = valid_from_date WHERE party_id = ? AND label = 'Hotline'").run(id);
  r = await w.call("GET", "/api/company");
  assert.equal(r.status, 404);
  assert.equal(r.json.error.code, "not_found");
  assert.match(r.json.error.message, /công ty/);
});

test("đổi công ty chủ (chủ trả lời 2026-09-28): chèn dòng vai mới cho hồ sơ tổ chức khác → GET /api/company trả hồ sơ mới ngay", async () => {
  const w = world();
  const B = "12345678-1234-4234-8234-123456789abc";
  const at = "2026-09-28T00:00:00.000Z";
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${B}', 'ORGANIZATION', 'Pháp nhân Mới', 1, '${at}', '${at}')`);
  w.sqlite.exec(`INSERT INTO pty_organization (party_id, legal_name, tax_code, address, created_at, updated_at) VALUES ('${B}', 'CÔNG TY MỚI', '0312345678', '2 Đường Mới', '${at}', '${at}')`);
  w.sqlite.exec(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
                 VALUES ('12345678-1234-4234-8234-000000000001', '${B}', 'PHONE', '0901 234 567', '0901234567', 'Hotline', 1, '2026-01-01', '${at}', '${at}')`);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at)
                 VALUES ('12345678-1234-4234-8234-000000000002', '${B}', 'OWNER_COMPANY', '2099-01-01', '${at}', '${at}')`);
  const r = await w.call("GET", "/api/company");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.company, { name: "CÔNG TY MỚI", taxCode: "0312345678", address: "2 Đường Mới", hotline: "0901 234 567", email: null });
});
