// Kho tệp hồ sơ (ADR-0123, lát H-2 Gói 2) trên API thật + D1 local tạm + kho R2 MÔ PHỎNG của `wrangler dev` (miniflare, cùng thư mục --persist-to của nhóm).
// KHÔNG phải kho R2 thật của Cloudflare — giới hạn ghi ở kế hoạch H-2. Ca: Quản trị không tải / mở được; Toàn quyền tải PNG, HTML bị từ chối; tải xuống đúng byte,
// no-store + nosniff; nhật ký không chứa khoá kho / băm; gộp hồ sơ ⇒ ảnh mở qua dòng giấy tờ mới; hàng chờ xoá đọc được, chạy lại được.
// Vòng sửa cuối H-2 (m3): route danh sách ảnh; một tệp "tải dở dang" GIEO bằng SQL (dòng D1) + `wrangler r2 object put --local` (đối tượng trong kho mô phỏng
// của CHÍNH nhóm — cùng --persist-to) để lệnh chạy lại xoá THẬT trên kho mô phỏng; hàng chờ xoá được đọc khi KHÔNG rỗng.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ACCOUNTS, BASE, call, session, sql, sqlRows } from "./lib.mjs";

const PERSIST = process.env.E2E_PERSIST_TO;
const KHO_TEN = "tourdao-sales-ho-so";
/** Lệnh R2 CỤC BỘ (luôn `--local`; không bao giờ chạm kho thật). Trả mã thoát (lỗi ⇒ khác 0, không ném). */
async function r2Local(args) {
  const a = ["wrangler", "r2", "object", ...args, "--local"];
  if (PERSIST) a.push("--persist-to", PERSIST);
  try {
    await promisify(execFile)("npx", a, { encoding: "utf8" });
    return 0;
  } catch (e) {
    return typeof e.code === "number" ? e.code : 1;
  }
}

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

r = await call(ADMIN, "GET", duong(A, did));
assert.equal(r.status, 403, "Quản trị xem được danh sách ảnh");
r = await call(TOAN_QUYEN, "GET", duong(A, did));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.tep.map((x) => x.id), [tid]);
assert.deepEqual(Object.keys(r.body.tep[0]).sort(), ["id", "kichThuoc", "loai", "taiLuc"]);
const dsTho = JSON.stringify(r.body);
console.log("✓ danh sách ảnh: Quản trị 403, Toàn quyền 200 (chỉ mã, loại, cỡ, lúc)");

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
assert.ok(!dsTho.includes(dong.k) && !dsTho.includes(dong.h), "danh sách ảnh lộ khoá kho / băm");
console.log("✓ nhật ký và danh sách ảnh chỉ mã");

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

// Gieo một tệp "tải dở dang" (stored_at rỗng, tạo 20 phút trước — quá mốc 10 phút của lệnh chạy lại) nối vào dòng CCCD hiện hành của B, và đặt đối tượng
// thật vào kho mô phỏng dưới đúng khoá đó (như khi Worker đã đặt kho rồi chết trước bước đánh dấu).
const [toanQuyenId] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.superAdmin.phone}'`);
const doDang = randomUUID();
const khoaDoDang = `pty/${randomBytes(16).toString("hex")}`;
const truoc20 = new Date(Date.now() - 20 * 60_000).toISOString();
await sql(
  "INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, purged_at, purge_reason, r2_deleted_at, created_at, created_by, updated_at, updated_by) " +
    `VALUES ('${doDang}', '${B}', '${khoaDoDang}', 'png', ${PNG.length}, '${"a".repeat(64)}', NULL, NULL, NULL, NULL, '${truoc20}', '${toanQuyenId.id}', '${truoc20}', '${toanQuyenId.id}'); ` +
    "INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) " +
    `VALUES ('${doDang}', 'PERSON_DOCUMENT', '${didB}', '${truoc20}', '${toanQuyenId.id}', '${truoc20}', '${toanQuyenId.id}');`,
);
const tepTam = join(mkdtempSync(join(tmpdir(), "ho-so-tep-")), "do-dang.png");
writeFileSync(tepTam, PNG);
assert.equal(await r2Local(["put", `${KHO_TEN}/${khoaDoDang}`, "--file", tepTam]), 0, "không đặt được đối tượng vào kho R2 mô phỏng");
assert.equal(await r2Local(["get", `${KHO_TEN}/${khoaDoDang}`, "--pipe"]), 0, "đối tượng vừa đặt không đọc lại được từ kho mô phỏng");
console.log("✓ gieo tệp tải dở dang (dòng D1 + đối tượng trong kho mô phỏng)");

r = await call(TOAN_QUYEN, "GET", "/api/parties/tep-cho-xoa");
assert.equal(r.status, 200);
assert.ok(r.body.tep.some((x) => x.id === doDang && x.trangThai === "TAI_DO_DANG"), `hàng chờ xoá không có tệp dở dang vừa gieo: ${JSON.stringify(r.body)}`);
assert.ok(!JSON.stringify(r.body).includes(khoaDoDang), "hàng chờ xoá lộ khoá kho");
assert.doesNotMatch(JSON.stringify(r.body), /pty\/[0-9a-f]{32}/);
assert.equal((await call(ADMIN, "GET", "/api/parties/tep-cho-xoa")).status, 403);
r = await call(TOAN_QUYEN, "POST", "/api/parties/tep-cho-xoa/chay-lai", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.daXoa >= 1, `chạy lại không xoá tệp nào: ${JSON.stringify(r.body)}`);
const [sau] = await sqlRows(`SELECT purged_at p, purge_reason l, r2_deleted_at x, content_hash h FROM pty_attachment WHERE id = '${doDang}'`);
assert.ok(sau.p && sau.x && sau.h === null, `dòng tệp dở dang chưa đi hết ba mốc: ${JSON.stringify(sau)}`);
assert.notEqual(await r2Local(["get", `${KHO_TEN}/${khoaDoDang}`, "--pipe"]), 0, "kho mô phỏng vẫn còn đối tượng sau lệnh chạy lại");
r = await call(TOAN_QUYEN, "GET", "/api/parties/tep-cho-xoa");
assert.ok(!r.body.tep.some((x) => x.id === doDang), "tệp đã xoá kho vẫn nằm ở hàng chờ xoá");
console.log("✓ hàng chờ xoá: Toàn quyền đọc (không rỗng, chỉ mã) + chạy lại xoá THẬT khỏi kho mô phỏng; Quản trị 403");
