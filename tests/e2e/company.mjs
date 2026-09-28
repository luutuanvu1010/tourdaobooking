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

// --- QUYỀN trên hồ sơ công ty chủ (ADR-0024 6.4, 6.5 (i); ADR-0038 điều 7; chủ 2026-09-28): API thật, D1 local. Không đổi, không kết thúc vai (T5).
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const P = (path = "") => `/api/parties/${ho.id}${path}`;
const chiTiet = (await call(SALES, "GET", P())).body.party;
assert.equal(chiTiet.editable, false, "Bán hàng không thấy hồ sơ công ty chủ là sửa được");
assert.equal((await call(ADMIN, "GET", P())).body.party.editable, false, "Quản trị cũng không");
assert.equal((await call(TOAN_QUYEN, "GET", P())).body.party.editable, true);
const suaThan = (ten) => ({ displayName: ten, legalName: chiTiet.legalName, taxCode: chiTiet.taxCode, address: chiTiet.address, invoiceEmail: chiTiet.invoiceEmail, active: chiTiet.active, expectedUpdatedAt: chiTiet.updatedAt });
const vaiCongTyChu = chiTiet.roles.find((x) => x.roleTypeCode === "OWNER_COMPANY" && x.validTo === null);
assert.ok(vaiCongTyChu, "hồ sơ công ty chủ có dòng vai Công ty chủ đang mở");
// Mọi lệnh GHI của khối này nằm trong try/finally (người kiểm độc lập T2b): `finally` khôi phục tên + Hotline của hồ sơ công ty chủ (phòng khi một ca 403
// hỏng mà lọt ghi) và cho hồ sơ tạm "Đại lý T2b" ngưng dùng (không xoá cứng). Dòng nhật ký là chỉ-thêm (trigger audit_append_only) — không xoá được, cố ý.
let khac = null;
try {
  r = await call(SALES, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại lý T2b ${String(Date.now()).slice(-6)}` });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  khac = r.body.party.id;
  const nhatKy = async (id) => (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE target_id = '${id}'`))[0].n;
  const truocNhatKy = [await nhatKy(ho.id), await nhatKy(khac)];
  for (const [ai, cookie, cach, method, path, body] of [
    ["Bán hàng", SALES, "sửa tên", "PUT", P(), suaThan("Kẻ Mạo Danh")],
    ["Bán hàng", SALES, "thêm liên hệ", "POST", P("/contacts"), { kind: "PHONE", value: "0911222333" }],
    ["Quản trị", ADMIN, "sửa tên", "PUT", P(), suaThan("Kẻ Mạo Danh")],
    ["Quản trị", ADMIN, "thêm liên hệ", "POST", P("/contacts"), { kind: "PHONE", value: "0911222333" }],
    ["Quản trị", ADMIN, "đóng Hotline", "POST", P(`/contacts/${hotline.id}/end`), {}],
    ["Quản trị", ADMIN, "thêm Khách hàng lên công ty chủ", "POST", P("/roles"), { roleTypeCode: "CUSTOMER" }],
    ["Quản trị", ADMIN, "gán Công ty chủ cho hồ sơ khác", "POST", `/api/parties/${khac}/roles`, { roleTypeCode: "OWNER_COMPANY" }],
    ["Quản trị", ADMIN, "kết thúc vai Công ty chủ", "POST", P(`/roles/${vaiCongTyChu.id}/end`), {}],
  ]) {
    r = await call(cookie, method, path, body);
    assert.equal(r.status, 403, `${ai} ${cach}: ${JSON.stringify(r.body)}`);
    assert.doesNotMatch(JSON.stringify(r.body), /Toàn quyền|SQLITE|constraint|UNIQUE/i, `${ai} ${cach}: chữ lỗi`);
  }
  r = await call(TOAN_QUYEN, "POST", P(`/roles/${vaiCongTyChu.id}/end`), {});
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "owner_company_locked");
  assert.doesNotMatch(JSON.stringify(r.body), /Toàn quyền|SQLITE|constraint|RAISE/i);
  // Ruling D17 (b): hồ sơ công ty chủ không ngưng dùng được, kể cả người giữ ô.
  r = await call(TOAN_QUYEN, "PUT", P(), { ...suaThan(chiTiet.displayName), active: false });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "owner_company_keep_active");
  // Ruling T8: đổi sang hồ sơ thiếu thông tin → 409 nêu mục thiếu (không đổi gì).
  r = await call(TOAN_QUYEN, "POST", `/api/parties/${khac}/roles`, { roleTypeCode: "OWNER_COMPANY" });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "owner_company_incomplete");
  assert.deepEqual([await nhatKy(ho.id), await nhatKy(khac)], truocNhatKy, "403/409 không ghi nhật ký");
  // Lớp CSDL trên D1 thật (local): SQL gõ tay đóng dòng công ty chủ cuối cùng bị trigger *_keep_last chặn (không đổi gì).
  await assert.rejects(sql("UPDATE pty_party_role SET valid_to_date = valid_from_date WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL"), /owner_company_last_open/);
  assert.equal((await sqlRows("SELECT count(*) AS n FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL"))[0].n, 1, "vẫn đúng một công ty chủ");
  r = await call(TOAN_QUYEN, "PUT", P(), suaThan(chiTiet.displayName));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(ADMIN, "POST", `/api/parties/${khac}/roles`, { roleTypeCode: "CUSTOMER" })).status, 201, "không chặn quá tay: hồ sơ tổ chức thường");
  assert.deepEqual((await call(null, "GET", "/api/company")).body.company, company, "không có gì đổi trên biên nhận");
} finally {
  await sql(`UPDATE pty_party SET display_name = ${quote(ho.display_name)} WHERE id = '${ho.id}'`);
  await sql(`UPDATE pty_contact_point SET valid_to_date = NULL WHERE id = '${hotline.id}'`);
  if (khac) await sql(`UPDATE pty_party SET active = 0 WHERE id = '${khac}'`);
}
console.log("✓ quyền: Bán hàng/Quản trị 403 ở sửa, liên hệ, công việc, gán Công ty chủ; kết thúc vai → 409 kể cả Toàn quyền; không nhật ký; vẫn đúng một");
console.log("E2E COMPANY OK");
