// Hồ sơ mở rộng (ADR-0122 đ5, lát H-1 Gói 2) trên API thật + D1 local tạm: ngày sinh và liên hệ ĐỊA CHỈ chỉ Quản trị / Toàn quyền thấy; Bán hàng, Kế toán không thấy,
// không tìm ra qua chữ số của địa chỉ, không ghi được (403); Bán hàng đổi tên không làm mất ngày sinh; nhật ký không chứa ngày sinh / địa chỉ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sqlRows } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const KE_TOAN = await session(ACCOUNTS.accountant);
const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const tag = String(Date.now()).slice(-6);
const SO_NHA = `9${tag}`; // chữ số riêng của lần chạy — dò tìm kiếm và nhật ký
const DIA_CHI = `${SO_NHA} Đường Thử E2E, Nha Trang`;
const NGAY_SINH = "1988-04-23";

let r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: `Khách Riêng Tư ${tag}`, birthDate: NGAY_SINH, contacts: [{ kind: "ADDRESS", value: DIA_CHI }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const id = r.body.party.id;
assert.equal(r.body.party.birthDate, NGAY_SINH);
assert.ok(r.body.party.contacts.some((c) => c.kind === "ADDRESS" && c.value === DIA_CHI));
console.log("✓ Quản trị tạo hồ sơ kèm ngày sinh + địa chỉ");

for (const [ten, ck] of [["Bán hàng", SALES], ["Kế toán", KE_TOAN]]) {
  r = await call(ck, "GET", `/api/parties/${id}`);
  assert.equal(r.status, 200, ten);
  assert.equal("birthDate" in r.body.party, false, `${ten} thấy khoá birthDate`);
  assert.doesNotMatch(JSON.stringify(r.body), new RegExp(`${SO_NHA}|${NGAY_SINH}`), `${ten} thấy ngày sinh / địa chỉ`);
}
assert.equal((await call(TOAN_QUYEN, "GET", `/api/parties/${id}`)).body.party.birthDate, NGAY_SINH);
console.log("✓ Bán hàng, Kế toán không thấy; Toàn quyền thấy");

r = await call(SALES, "GET", `/api/parties?q=${SO_NHA}`);
assert.equal(r.status, 200);
assert.equal(r.body.parties.some((p) => p.id === id), false, "tìm theo chữ số địa chỉ ra hồ sơ");
console.log("✓ tìm kiếm không khớp địa chỉ");

let hien = (await call(SALES, "GET", `/api/parties/${id}`)).body.party;
r = await call(SALES, "PUT", `/api/parties/${id}`, { fullName: `Khách Đổi Tên ${tag}`, active: true, expectedUpdatedAt: hien.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
hien = (await call(ADMIN, "GET", `/api/parties/${id}`)).body.party;
assert.equal(hien.birthDate, NGAY_SINH, "Bán hàng đổi tên làm mất ngày sinh");
console.log("✓ Bán hàng đổi tên, ngày sinh còn nguyên");

r = await call(SALES, "PUT", `/api/parties/${id}`, { fullName: hien.displayName, active: true, expectedUpdatedAt: hien.updatedAt, birthDate: "1990-01-01" });
assert.equal(r.status, 403);
assert.equal(r.body.error.code, "personal_forbidden");
r = await call(SALES, "POST", `/api/parties/${id}/contacts`, { kind: "ADDRESS", value: "1 Đường Khác" });
assert.equal(r.status, 403);
const dc = hien.contacts.find((c) => c.kind === "ADDRESS");
r = await call(SALES, "POST", `/api/parties/${id}/contacts/${dc.id}/end`, {});
assert.equal(r.status, 403);
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `Khách Mới ${tag}`, birthDate: "1990-01-01", contacts: [] });
assert.equal(r.status, 403);
console.log("✓ Bán hàng ghi ngày sinh / địa chỉ → 403");

const nk = await sqlRows(`SELECT detail FROM audit_log WHERE target_id = '${id}'`);
assert.ok(nk.length >= 2);
for (const { detail } of nk) assert.doesNotMatch(String(detail ?? ""), new RegExp(`${SO_NHA}|${NGAY_SINH}|Đường Thử`), "nhật ký chứa ngày sinh / địa chỉ");
console.log("✓ nhật ký không chứa ngày sinh / địa chỉ");
