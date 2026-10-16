// Kho tệp hồ sơ (ADR-0123, lát H-2 Gói 2) trên API thật + D1 local tạm + kho R2 MÔ PHỎNG của `wrangler dev` (miniflare, cùng thư mục --persist-to của nhóm).
// KHÔNG phải kho R2 thật của Cloudflare — giới hạn ghi ở kế hoạch H-2. Ca: Quản trị không tải / mở được; Toàn quyền tải PNG, HTML bị từ chối; tải xuống đúng byte,
// no-store + nosniff; nhật ký không chứa khoá kho / băm; gộp hồ sơ ⇒ ảnh mở qua dòng giấy tờ mới; hàng chờ xoá đọc được, chạy lại được.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, session, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const tag = String(Date.now()).slice(-6);
const TEN = `Khách Có Ảnh ${tag}`;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]), Buffer.from(tag)]);
const b64 = (b) => Buffer.from(b).toString("base64");
const taiVe = (cookie, path) => fetch(BASE + path, { headers: { cookie } }); // GET thô: thân là byte, không phải JSON

let r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const A = r.body.party.id;
r = await call(ADMIN, "POST", `/api/parties/${A}/documents`, { typeCode: "CCCD", number: `079${tag}000`, expiryDate: "2035-01-01" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const did = r.body.documents.find((d) => d.typeCode === "CCCD" && d.current).id;
const duong = (p, d) => `/api/parties/${p}/documents/${d}/tep`;
console.log("✓ hồ sơ + CCCD");

r = await call(ADMIN, "POST", duong(A, did), { noiDung: b64(PNG) });
assert.equal(r.status, 403, "Quản trị tải được ảnh (ruling Q1: chỉ Toàn quyền)");
r = await call(TOAN_QUYEN, "POST", duong(A, did), { noiDung: b64(Buffer.from("<html><script>alert(1)</script></html>")) });
assert.equal(r.status, 415);
r = await call(TOAN_QUYEN, "POST", duong(A, did), { noiDung: b64(PNG) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tid = r.body.tep.id;
assert.deepEqual(Object.keys(r.body.tep).sort(), ["id", "kichThuoc", "loai", "taiLuc"]);
console.log("✓ Quản trị 403, HTML 415, Toàn quyền tải PNG 201");

let t = await taiVe(TOAN_QUYEN, `${duong(A, did)}/${tid}`);
assert.equal(t.status, 200);
assert.deepEqual(Buffer.from(await t.arrayBuffer()), PNG, "byte tải về khác byte tải lên (kho mô phỏng)");
assert.equal(t.headers.get("cache-control"), "no-store");
assert.equal(t.headers.get("x-content-type-options"), "nosniff");
assert.equal((await taiVe(ADMIN, `${duong(A, did)}/${tid}`)).status, 403);
console.log("✓ tải xuống đúng byte, no-store + nosniff; Quản trị 403");

const [dong] = await sqlRows(`SELECT storage_key k, content_hash h FROM pty_attachment WHERE id = '${tid}'`);
const nk = await sqlRows(`SELECT action a, detail d FROM audit_log WHERE action LIKE 'party_attachment_%' AND target_id = '${A}'`);
assert.deepEqual(nk.map((x) => x.a).sort(), ["party_attachment_added", "party_attachment_viewed"]);
for (const x of nk) assert.ok(!String(x.d).includes(dong.k) && !String(x.d).includes(dong.h), `nhật ký ${x.a} chứa khoá kho / băm`);
console.log("✓ nhật ký chỉ mã");

r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const B = r.body.party.id;
r = await call(ADMIN, "POST", `/api/parties/${A}/merge`, { intoPartyId: B, xacNhan: TEN });
assert.equal(r.status, 200, JSON.stringify(r.body));
const didB = (await call(ADMIN, "GET", `/api/parties/${B}/documents`)).body.documents.find((d) => d.typeCode === "CCCD" && d.current).id;
t = await taiVe(TOAN_QUYEN, `${duong(B, didB)}/${tid}`);
assert.equal(t.status, 200, "sau gộp không mở được ảnh qua dòng giấy tờ mới");
assert.deepEqual(Buffer.from(await t.arrayBuffer()), PNG);
console.log("✓ gộp hồ sơ: ảnh mở qua dòng giấy tờ mới của hồ sơ chính");

r = await call(TOAN_QUYEN, "GET", "/api/parties/tep-cho-xoa");
assert.equal(r.status, 200);
assert.ok(Array.isArray(r.body.tep));
assert.doesNotMatch(JSON.stringify(r.body), /pty\/[0-9a-f]{32}/);
assert.equal((await call(ADMIN, "GET", "/api/parties/tep-cho-xoa")).status, 403);
r = await call(TOAN_QUYEN, "POST", "/api/parties/tep-cho-xoa/chay-lai", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(typeof r.body.daXoa, "number");
console.log("✓ hàng chờ xoá: Toàn quyền đọc + chạy lại; Quản trị 403");
