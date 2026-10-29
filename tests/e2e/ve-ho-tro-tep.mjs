// Tệp kèm tin vé hỗ trợ (ADR-0144) trên API thật + D1 local tạm + kho R2 MÔ PHỎNG của `wrangler dev` (miniflare, cùng --persist-to của nhóm) — KHÔNG phải kho thật.
// Tài khoản gieo mới (không đụng trần 5 yêu cầu / giờ của kịch bản feedback chạy trước trong cùng nhóm). Ca: gửi kèm PNG + PDF (201, mọi tệp đã lưu); tải xuống đúng
// byte + header an toàn; người không đọc được vé 404, mở chéo trang 403; HTML 415, 6 tệp 400; Đối tác gửi kèm tệp tới Kỹ thuật (chủ dự án 28/10: mọi tài khoản);
// ghi chú nội bộ kèm tệp: người gửi không thấy tin, mở tệp 404; nhật ký chỉ mã (không khoá kho / băm); gỡ tệp chỉ Toàn quyền, gỡ xong 404, gỡ lần hai 409;
// hàng chờ xoá đọc được, chạy lại được.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, BASE, call, gieoTaiKhoanLai, session, sqlRows } from "./lib.mjs";

const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const NV = await gieoTaiKhoanLai("Người gửi thử tệp vé", ["SALES"]);
const NV_KHAC = await gieoTaiKhoanLai("Người ngoài thử tệp vé", ["SALES"]);
const DT = await gieoTaiKhoanLai("Đối tác thử tệp vé", ["PARTNER"]);
const tag = String(Date.now()).slice(-6);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]), Buffer.from(`anh-${tag}`)]);
const PDF = Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF ${tag}\n`);
const b64 = (b) => Buffer.from(b).toString("base64");
const yc = (over = {}) => ({ kind: "BUG", title: `Lỗi kèm ảnh ${tag}`, body: "Ảnh màn hình đính kèm.", clientRequestId: randomUUID(), context: { device: "e2e", standalone: false }, ...over });
const taiVe = (cookie, path, h = {}) => fetch(BASE + path, { headers: { cookie, ...h } }); // GET thô: thân là byte, không phải JSON

// --- Gửi kèm PNG + PDF ---
let r = await call(NV.cookie, "POST", "/api/feedback", yc({ tep: [{ noiDung: b64(PNG) }, { noiDung: b64(PDF) }] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.tepLoi, 0, "mọi tệp đã lên kho mô phỏng");
const ve = r.body.ticket;
const tin = r.body.messages[0];
assert.deepEqual(tin.tep.map((t) => [t.loai, t.trangThai, t.kichThuoc]), [["png", "DA_LUU", PNG.length], ["pdf", "DA_LUU", PDF.length]]);
assert.deepEqual(Object.keys(tin.tep[0]).sort(), ["id", "kichThuoc", "loai", "trangThai"], "DTO tệp chỉ mã, loại, cỡ, trạng thái");
const [ANH, TEP_PDF] = tin.tep;
const duong = (t) => `/api/feedback/${ve.id}/tep/${t.id}`;
console.log("✓ gửi yêu cầu kèm PNG + PDF: 201, tepLoi 0, hai tệp đã lưu");

// --- Tải xuống ---
let t = await taiVe(NV.cookie, duong(ANH));
assert.equal(t.status, 200);
assert.deepEqual(Buffer.from(await t.arrayBuffer()), PNG, "byte tải về khác byte tải lên");
assert.equal(t.headers.get("content-type"), "image/png");
assert.equal(t.headers.get("cache-control"), "no-store");
assert.equal(t.headers.get("x-content-type-options"), "nosniff");
assert.match(t.headers.get("content-disposition") ?? "", /^inline; filename="ho-tro-[0-9a-f]{8}\.png"$/);
t = await taiVe(NV.cookie, duong(TEP_PDF), { "sec-fetch-site": "same-origin" });
assert.equal(t.status, 200);
assert.match(t.headers.get("content-disposition") ?? "", /^attachment; /, "PDF tải về, không mở tại chỗ");
assert.equal((await taiVe(NV.cookie, duong(ANH), { "sec-fetch-site": "cross-site" })).status, 403, "mở chéo trang bị chặn");
assert.equal((await taiVe(NV_KHAC.cookie, duong(ANH))).status, 404, "người không đọc được vé: 404 (không lộ có tệp)");
console.log("✓ tải xuống đúng byte, header an toàn; chéo trang 403; người ngoài vé 404");

// --- Loại và số tệp ---
r = await call(NV.cookie, "POST", `/api/feedback/${ve.id}/messages`, { body: "kèm trang web", tep: [{ noiDung: b64(Buffer.from("<html><script>alert(1)</script></html>")) }] });
assert.equal(r.status, 415, JSON.stringify(r.body));
r = await call(NV.cookie, "POST", `/api/feedback/${ve.id}/messages`, { body: "sáu ảnh", tep: Array.from({ length: 6 }, () => ({ noiDung: b64(PNG) })) });
assert.equal(r.status, 400, JSON.stringify(r.body));
console.log("✓ HTML 415, 6 tệp 400");

// --- Đối tác: gửi kèm tệp tới Kỹ thuật được ---
r = await call(DT.cookie, "POST", "/api/feedback", yc({ title: `Đối tác gửi ảnh ${tag}`, tep: [{ noiDung: b64(PNG) }] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.ticket.teamId, "fbk-team-ky-thuat");
assert.equal(r.body.messages[0].tep[0].trangThai, "DA_LUU");
console.log("✓ Đối tác gửi kèm tệp tới Kỹ thuật: 201");

// --- Ghi chú nội bộ kèm tệp: người gửi không thấy ---
r = await call(TOAN_QUYEN, "POST", `/api/feedback/${ve.id}/messages`, { body: `Ảnh đối chiếu nội bộ ${tag}`, internal: true, tep: [{ noiDung: b64(PDF) }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const noiBo = r.body.messages.find((m) => m.internal && m.body.includes(tag));
assert.ok(noiBo && noiBo.tep.length === 1, "Toàn quyền thấy ghi chú nội bộ kèm tệp");
r = await call(NV.cookie, "GET", `/api/feedback/${ve.id}`);
assert.equal(r.status, 200);
assert.ok(!r.body.messages.some((m) => m.id === noiBo.id), "người gửi không thấy ghi chú nội bộ");
assert.equal((await taiVe(NV.cookie, `/api/feedback/${ve.id}/tep/${noiBo.tep[0].id}`)).status, 404, "người gửi mở tệp của ghi chú nội bộ: 404");
assert.equal((await taiVe(TOAN_QUYEN, `/api/feedback/${ve.id}/tep/${noiBo.tep[0].id}`)).status, 200);
console.log("✓ ghi chú nội bộ kèm tệp: người gửi không thấy tin, mở tệp 404");

// --- Nhật ký chỉ mã ---
const dong = await sqlRows(`SELECT storage_key k, content_hash h FROM fbk_attachment WHERE message_id = '${tin.id}'`);
const nk = await sqlRows(`SELECT action a, detail d FROM audit_log WHERE action LIKE 'feedback_attachment_%' AND target_id = '${ve.id}'`);
assert.ok(nk.filter((x) => x.a === "feedback_attachment_added").length >= 2 && nk.some((x) => x.a === "feedback_attachment_viewed"), JSON.stringify(nk.map((x) => x.a)));
for (const x of nk) for (const d of dong) assert.ok(!String(x.d).includes(d.k) && !String(x.d).includes(d.h), `nhật ký ${x.a} chứa khoá kho / băm`);
console.log("✓ nhật ký thêm / xem tệp chỉ mã");

// --- Gỡ tệp: chỉ Toàn quyền ---
assert.equal((await call(NV.cookie, "POST", `${duong(ANH)}/go`, {})).status, 403, "người gửi không gỡ được");
r = await call(TOAN_QUYEN, "POST", `${duong(ANH)}/go`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.messages[0].tep.find((x) => x.id === ANH.id).trangThai, "DA_GO");
assert.equal((await taiVe(NV.cookie, duong(ANH))).status, 404, "tệp đã gỡ: 404");
assert.equal((await taiVe(NV.cookie, duong(TEP_PDF))).status, 200, "tệp khác của tin vẫn tải được");
assert.equal((await call(TOAN_QUYEN, "POST", `${duong(ANH)}/go`, {})).status, 409, "gỡ lần hai: 409");
const [go] = await sqlRows(`SELECT purge_reason l, r2_deleted_at x FROM fbk_attachment WHERE id = '${ANH.id}'`);
assert.equal(go.l, "GO_TEP");
assert.ok(go.x, "đã xoá khỏi kho mô phỏng (r2_deleted_at có)");
console.log("✓ gỡ tệp: chỉ Toàn quyền, gỡ xong 404, gỡ lần hai 409, đã xoá khỏi kho");

// --- Hàng chờ xoá ---
assert.equal((await call(NV.cookie, "GET", "/api/feedback/tep-cho-xoa")).status, 403);
r = await call(TOAN_QUYEN, "GET", "/api/feedback/tep-cho-xoa");
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(TOAN_QUYEN, "POST", "/api/feedback/tep-cho-xoa/chay-lai", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ hàng chờ xoá: người thường 403, Toàn quyền đọc + chạy lại 200");

console.log("ve-ho-tro-tep: OK");
