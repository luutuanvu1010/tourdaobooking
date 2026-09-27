// Thông tin công ty (module company): GET /api/company công khai, chỉ trả trường được phép. Từ T2b (ADR-0024 điều 6, 6.2, 6.3) nguồn là HỒ SƠ CÔNG TY CHỦ
// (module parties, hàm ownerCompany) — không còn đọc cột pháp lý của company_profile. So với giá trị đọc từ D1, KHÔNG gõ số của công ty.
// Kịch bản KHÔNG đổi công ty chủ (D1 dùng chung, không khôi phục được trong ngày — Ruling T5 của nhật ký thi công T2b): việc đổi kiểm ở harness + Chrome.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql, sqlRows } from "./lib.mjs";

const COMPANY_KEYS = ["address", "email", "hotline", "name", "taxCode"];
const quote = (v) => (v === null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);

// --- nguồn: hồ sơ công ty chủ (đúng một, gieo ở migration *_ho_so_cong_ty_chu chép từ company_profile) và dòng company_profile gốc
const hoRows = await sqlRows(`SELECT p.id, p.display_name, o.legal_name, o.tax_code, o.address FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id
  LEFT JOIN pty_organization o ON o.party_id = p.id WHERE r.role_type_code = 'OWNER_COMPANY' AND r.valid_to_date IS NULL`);
assert.equal(hoRows.length, 1, "D1 tạm phải có đúng một hồ sơ công ty chủ");
const ho = hoRows[0];
const [goc] = await sqlRows("SELECT id, company_name, tax_code, address, hotline, zalo_number, email, logo_url, updated_at, updated_by FROM company_profile");
assert.ok(goc, "D1 tạm phải có dòng công ty gieo ở migration 0002");
const lienHe = await sqlRows(`SELECT id, contact_kind_code, label, valid_to_date FROM pty_contact_point WHERE party_id = '${ho.id}'`);
const hotline = lienHe.find((c) => c.contact_kind_code === "PHONE" && c.label === "Hotline" && c.valid_to_date === null);
const email = lienHe.find((c) => c.contact_kind_code === "EMAIL" && c.valid_to_date === null);
assert.ok(hotline, "hồ sơ công ty chủ có liên hệ Hotline đang mở");

// --- công khai: chưa đăng nhập vẫn 200; không lưu đệm; đúng hình dạng; giá trị = bản chép từ company_profile (biên nhận không đổi so với trước T2b)
let r = await call(null, "GET", "/api/company");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.match(r.headers.get("content-type"), /^application\/json/);
assert.equal(r.headers.get("cache-control"), "no-store", "mọi /api/* không được lưu đệm");
assert.deepEqual(Object.keys(r.body), ["company"]);
assert.deepEqual(Object.keys(r.body.company).sort(), COMPANY_KEYS, "chỉ đúng năm trường được phép lộ (không zalo/logo/người sửa)");
const company = r.body.company;
assert.deepEqual(company, { name: goc.company_name, taxCode: goc.tax_code, address: goc.address, hotline: goc.hotline, email: goc.email });
assert.equal(company.name, ho.legal_name, "tên trên biên nhận = tên pháp lý của hồ sơ công ty chủ");
assert.doesNotMatch(JSON.stringify(r.body), /zalo|logo|updated_by|updatedBy|partyId|displayName/i, "không lộ cột nội bộ");
console.log("✓ công khai: 200 khi chưa đăng nhập, no-store, đúng năm trường, giá trị = bản chép từ company_profile");

// --- đã đăng nhập (mọi quyền) thấy đúng như vậy; chỉ đọc: ghi bị từ chối
const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
for (const cookie of [SALES, ADMIN]) assert.deepEqual((await call(cookie, "GET", "/api/company")).body.company, company);
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  r = await call(ADMIN, method, "/api/company", { name: "Sửa thử" });
  assert.equal(r.status, 405, `${method} /api/company phải bị chặn (sửa hồ sơ công ty ở Danh bạ, không ở route này)`);
  assert.match(r.headers.get("allow"), /GET/);
}
assert.deepEqual((await call(null, "GET", "/api/company")).body.company, company, "không có gì bị sửa");
console.log("✓ đã đăng nhập đọc như nhau; ghi bị chặn (405)");

// --- ĐỌC TỪ HỒ SƠ CÔNG TY CHỦ (6.3): sửa company_profile KHÔNG đổi API; sửa hồ sơ thì đổi theo; đóng email → null; hết Hotline → 404. Luôn khôi phục.
try {
  await sql("UPDATE company_profile SET company_name = 'KHÔNG ĐƯỢC ĐỌC', address = 'KHÔNG ĐƯỢC ĐỌC', email = 'khong@duoc.doc' WHERE id = 'default'");
  assert.deepEqual((await call(null, "GET", "/api/company")).body.company, company, "cột pháp lý của company_profile thôi được đọc");

  await sql(`UPDATE pty_organization SET legal_name = 'CÔNG TY THỬ E2E' WHERE party_id = '${ho.id}'`);
  r = await call(null, "GET", "/api/company");
  assert.equal(r.body.company.name, "CÔNG TY THỬ E2E");
  assert.equal(r.body.company.taxCode, company.taxCode, "trường không đổi thì giữ nguyên");

  if (email) {
    await sql(`UPDATE pty_contact_point SET valid_to_date = valid_from_date WHERE id = '${email.id}'`);
    r = await call(null, "GET", "/api/company");
    assert.equal(r.status, 200);
    assert.equal(r.body.company.email, null, "không còn email đang mở → null (giao diện tự ẩn dòng)");
  }

  await sql(`UPDATE pty_contact_point SET valid_to_date = valid_from_date WHERE id = '${hotline.id}'`);
  r = await call(null, "GET", "/api/company");
  assert.equal(r.status, 404);
  assert.equal(r.body.error.code, "not_found");
  assert.match(r.body.error.message, /công ty/);
  console.log("✓ đọc từ hồ sơ công ty chủ: company_profile không còn là nguồn, sửa hồ sơ thì đổi theo, email đóng → null, hết Hotline → 404");
} finally {
  await sql(`UPDATE pty_organization SET legal_name = ${quote(ho.legal_name)} WHERE party_id = '${ho.id}'`);
  await sql(`UPDATE pty_contact_point SET valid_to_date = NULL WHERE id IN ('${hotline.id}'${email ? `, '${email.id}'` : ""})`);
  const cols = Object.keys(goc);
  await sql(`UPDATE company_profile SET ${cols.map((c) => `${c} = ${quote(goc[c])}`).join(", ")} WHERE id = 'default'`);
}
assert.deepEqual((await call(null, "GET", "/api/company")).body.company, company, "đã khôi phục nguyên trạng");
console.log("E2E COMPANY OK");
