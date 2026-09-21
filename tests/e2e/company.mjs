// Thông tin công ty (module company): GET /api/company công khai, chỉ trả trường được phép, dữ liệu đọc từ D1 (không chép cứng).
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql, sqlRows } from "./lib.mjs";

const COMPANY_KEYS = ["address", "email", "hotline", "name", "taxCode"];
const quote = (v) => (v === null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);

// --- công khai: chưa đăng nhập vẫn 200; không lưu đệm; đúng hình dạng và đúng giá trị sau migration
let r = await call(null, "GET", "/api/company");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.match(r.headers.get("content-type"), /^application\/json/);
assert.equal(r.headers.get("cache-control"), "no-store", "mọi /api/* không được lưu đệm");
assert.deepEqual(Object.keys(r.body), ["company"]);
assert.deepEqual(Object.keys(r.body.company).sort(), COMPANY_KEYS, "chỉ đúng năm trường được phép lộ (không zalo/logo/người sửa)");
const company = r.body.company;
assert.equal(company.name, "CÔNG TY TNHH TOUR ĐẢO");
assert.equal(company.taxCode, "4201969169");
assert.match(company.address, /^19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà$/);
assert.equal(company.hotline, "0845 256 256");
assert.equal(company.email, "Tourdaotravel@gmail.com", "migration company_email đã điền email");
assert.doesNotMatch(JSON.stringify(r.body), /zalo|logo|updated_by|updatedBy/i, "không lộ cột nội bộ");
console.log("✓ công khai: 200 khi chưa đăng nhập, no-store, đúng năm trường và giá trị");

// --- đã đăng nhập (mọi quyền) thấy đúng như vậy; chỉ đọc: ghi bị từ chối
const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
for (const cookie of [SALES, ADMIN]) assert.deepEqual((await call(cookie, "GET", "/api/company")).body.company, company);
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  r = await call(ADMIN, method, "/api/company", { name: "Sửa thử" });
  assert.equal(r.status, 405, `${method} /api/company phải bị chặn (sửa hồ sơ công ty chưa làm)`);
  assert.match(r.headers.get("allow"), /GET/);
}
assert.deepEqual((await call(null, "GET", "/api/company")).body.company, company, "không có gì bị sửa");
console.log("✓ đã đăng nhập đọc như nhau; ghi bị chặn (405)");

// --- dữ liệu ĐỌC TỪ D1, không chép cứng: đổi trong D1 thì API đổi theo; email trống → null; mất dòng → 404. Luôn khôi phục nguyên trạng.
const [original] = await sqlRows("SELECT id, company_name, tax_code, address, hotline, zalo_number, email, logo_url, updated_at, updated_by FROM company_profile");
assert.ok(original, "D1 tạm phải có dòng công ty gieo ở migration 0002");
try {
  await sql("UPDATE company_profile SET company_name = 'CÔNG TY THỬ E2E', email = 'thu@e2e.test' WHERE id = 'default'");
  r = await call(null, "GET", "/api/company");
  assert.equal(r.body.company.name, "CÔNG TY THỬ E2E");
  assert.equal(r.body.company.email, "thu@e2e.test");
  assert.equal(r.body.company.taxCode, company.taxCode, "trường không đổi thì giữ nguyên");

  await sql("UPDATE company_profile SET email = NULL WHERE id = 'default'");
  r = await call(null, "GET", "/api/company");
  assert.equal(r.status, 200);
  assert.equal(r.body.company.email, null, "chưa khai email → null (giao diện tự ẩn dòng)");

  await sql("DELETE FROM company_profile WHERE id = 'default'");
  r = await call(null, "GET", "/api/company");
  assert.equal(r.status, 404);
  assert.equal(r.body.error.code, "not_found");
  assert.match(r.body.error.message, /công ty/);
  console.log("✓ đọc từ D1: đổi theo dữ liệu, email trống → null, mất dòng → 404");
} finally {
  const cols = Object.keys(original);
  const exists = (await sqlRows("SELECT count(*) AS n FROM company_profile"))[0].n > 0;
  if (!exists) await sql(`INSERT INTO company_profile (${cols.join(", ")}) VALUES (${cols.map((c) => quote(original[c])).join(", ")})`);
  else await sql(`UPDATE company_profile SET ${cols.map((c) => `${c} = ${quote(original[c])}`).join(", ")} WHERE id = 'default'`);
}
assert.deepEqual((await call(null, "GET", "/api/company")).body.company, company, "đã khôi phục nguyên trạng");
console.log("E2E COMPANY OK");
