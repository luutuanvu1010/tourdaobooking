// Kho tệp hồ sơ qua route THẬT (tests/audit/harness.mjs + kho R2 giả; ADR-0123; lát H-2 Gói 2). Tải lên: chỉ Toàn quyền (ruling Q1), ghi D1 TRƯỚC rồi đặt kho
// (ruling Q2), loại theo chữ ký, trần 10 MB. Tải xuống: 403 không ghi nhật ký; nhật ký có TRƯỚC khi đọc kho; nhật ký lỗi ⇒ không đọc kho; header no-store + nosniff.
// Nhật ký không chứa khoá kho / băm (bộ dò doNhatKyHang — PHU_TRACH của "pty_attachment.content_hash", "pty_attachment.storage_key").
// KHÔNG thử được với kho R2 thật (kế hoạch: "Giới hạn không vượt được").
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { TOI_DA_BYTE } from "./tep.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
let soCccd = 100000;
async function nguoiCoCccd(w: any, ten = "Người Có Ảnh"): Promise<{ id: string; did: string }> {
  const p = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten, contacts: [] } });
  assert.equal(p.status, 201, p.text);
  const id = p.json.party.id as string;
  const d = await w.call("POST", `/api/parties/${id}/documents`, { as: ADM, body: { typeCode: "CCCD", number: `079000${++soCccd}`, expiryDate: "2035-01-01" } });
  assert.equal(d.status, 201, d.text);
  return { id, did: d.json.documents.find((x: any) => x.typeCode === "CCCD" && x.current).id as string };
}
const duong = (g: { id: string; did: string }) => `/api/parties/${g.id}/documents/${g.did}/tep`;
const nhatKy = (w: any, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => String(r.detail ?? ""));
const soTep = (w: any): number => w.q("SELECT count(*) n FROM pty_attachment")[0].n;
async function taiLen(w: any, g: { id: string; did: string }, u: Uint8Array = PNG, as = SUP, headers: Record<string, string> = {}) {
  return w.call("POST", duong(g), { as, body: { noiDung: b64(u) }, headers });
}

test("Toàn quyền tải PNG: 201 + Location; dòng tệp + dòng nối + nhật ký chỉ mã; kho có đúng byte dưới khoá pty/<32 hex>; stored_at có", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const r = await taiLen(w, g);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.headers.get("location"), `/parties?id=${g.id}`);
  const tep = r.json.tep;
  assert.deepEqual(Object.keys(tep).sort(), ["id", "kichThuoc", "loai", "taiLuc"], "DTO không có khoá kho, băm, tên tệp");
  assert.deepEqual([tep.loai, tep.kichThuoc], ["png", PNG.length]);
  const row = w.q("SELECT party_id, storage_key, content_kind, byte_size, content_hash, stored_at, purged_at, created_by FROM pty_attachment WHERE id = ?", tep.id)[0];
  assert.match(row.storage_key, /^pty\/[0-9a-f]{32}$/);
  assert.equal(row.storage_key.includes(g.id), false, "khoá kho không mang mã hồ sơ");
  assert.equal(row.party_id, g.id);
  assert.match(row.content_hash, /^[0-9a-f]{64}$/);
  assert.ok(row.stored_at && row.purged_at === null && row.created_by === SUP);
  assert.deepEqual(w.q("SELECT target_kind k, target_id t FROM pty_attachment_link WHERE attachment_id = ?", tep.id).map((x: any) => ({ ...x })), [{ k: "PERSON_DOCUMENT", t: g.did }]);
  assert.ok(w.r2.co(row.storage_key));
  const dt = nhatKy(w, "party_attachment_added");
  assert.equal(dt.length, 1);
  assert.equal(dt[0], `Căn cước công dân (CCCD) · tệp ${tep.id}`);
});

test("không đủ quyền: Quản trị (ghi giấy tờ, không mở ảnh — ruling Q1) và Bán hàng → 403; không chạm kho, không dòng nào", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  for (const as of [ADM, SALES]) assert.equal((await taiLen(w, g, PNG, as)).status, 403, as);
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(soTep(w), 0);
});

test("nội dung sai: HTML → 415, SVG → 415 (câu tiếng Việt); base64 hỏng / thiếu → 400; không chạm kho, không dòng", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  for (const s of ["<html><body><script>alert(1)</script></body></html>", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>']) {
    const r = await taiLen(w, g, new TextEncoder().encode(s));
    assert.equal(r.status, 415, r.text);
    assert.equal(r.json.error.message, "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.");
  }
  for (const body of [{ noiDung: "@@@@" }, {}, { noiDung: "" }]) assert.equal((await w.call("POST", duong(g), { as: SUP, body })).status, 400);
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(soTep(w), 0);
});

test("Review Focus 1: đúng 10 MB qua (201); 10 MB + 1 byte → 413 'Tệp lớn hơn 10 MB.'", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const vua = new Uint8Array(TOI_DA_BYTE); vua.set(PNG);
  assert.equal((await taiLen(w, g, vua)).status, 201);
  const qua = new Uint8Array(TOI_DA_BYTE + 1); qua.set(PNG);
  const r = await taiLen(w, g, qua);
  assert.equal(r.status, 413);
  assert.equal(r.json.error.message, "Tệp lớn hơn 10 MB.");
  assert.equal(soTep(w), 1);
});

test("dòng giấy tờ: đã gia hạn thay → 409; mã giấy tờ của hồ sơ khác → 404; hồ sơ không tồn tại → 404", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const khac = await nguoiCoCccd(w, "Người Khác");
  assert.equal((await taiLen(w, { id: khac.id, did: g.did })).status, 404);
  assert.equal((await taiLen(w, { id: "pty-khong-co", did: g.did })).status, 404);
  const gh = await w.call("POST", `/api/parties/${g.id}/documents/${g.did}/renew`, { as: ADM, body: { expiryDate: "2040-01-01" } });
  assert.equal(gh.status, 201, gh.text);
  const r = await taiLen(w, g);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "document_not_current");
});

test("Review Focus 3 (phần tải lên): kho hỏng khi đặt ⇒ 500; dòng tệp ĐÃ có (D1 trước), đã quyết xoá TAI_LEN_LOI, băm rỗng, đã-xoá-khỏi-kho; nhật ký chỉ mã", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  w.r2.hong.put = true;
  const r = await taiLen(w, g);
  assert.equal(r.status, 500);
  assert.equal(r.json.error.message, "Không tải tệp lên được. Thử lại sau ít phút.");
  const row = w.q("SELECT id, stored_at, purged_at, purge_reason, content_hash, r2_deleted_at FROM pty_attachment")[0];
  assert.ok(row, "dòng tệp phải có TRƯỚC khi đặt kho (ruling Q2)");
  assert.equal(row.stored_at, null);
  assert.equal(row.purge_reason, "TAI_LEN_LOI");
  assert.equal(row.content_hash, null);
  assert.ok(row.purged_at && row.r2_deleted_at);
  assert.deepEqual(nhatKy(w, "party_attachment_purged"), [`tệp ${row.id} · TAI_LEN_LOI`]);
  assert.equal((await w.call("GET", duong(g), { as: SUP })).json.tep.length, 0, "tệp hỏng không hiện ở danh sách");
});

test("Review Focus 5: bấm hai lần cùng mã lần gửi ⇒ MỘT tệp, kho chỉ nhận MỘT lần đặt (lớp chống ghi trùng phát lại)", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const ve = crypto.randomUUID();
  const r1 = await taiLen(w, g, PNG, SUP, { "idempotency-key": ve });
  assert.equal(r1.status, 201, r1.text);
  await w.choNen();
  const r2 = await taiLen(w, g, PNG, SUP, { "idempotency-key": ve });
  // Phát lại theo hợp đồng ADR-0094 đ6 (R2: lớp vé KHÔNG lưu thân phản hồi): 200 { da_ghi_truoc_do, ket_qua = Location lần đầu } + Idempotent-Replayed.
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual([r2.json?.da_ghi_truoc_do, r2.json?.ket_qua, r2.headers.get("idempotent-replayed")], [true, `/parties?id=${g.id}`, "true"]);
  assert.equal(soTep(w), 1);
  assert.equal(w.r2.soLan.put, 1);
});

test("danh sách ảnh của dòng giấy tờ: chỉ tệp đã lưu; DTO không khoá kho / băm; Quản trị → 403", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  await taiLen(w, g);
  await taiLen(w, g, PDF);
  const r = await w.call("GET", duong(g), { as: SUP });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.tep.map((t: any) => t.loai).sort(), ["pdf", "png"]);
  assert.doesNotMatch(r.text, /pty\/[0-9a-f]{32}|[0-9a-f]{64}/);
  assert.equal((await w.call("GET", duong(g), { as: ADM })).status, 403);
});

test("tải xuống: Toàn quyền 200, đúng byte; no-store, nosniff, CSP sandbox; ảnh inline, PDF attachment; nhật ký 'Mở ảnh' có TRƯỚC khi đọc kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const anh = (await taiLen(w, g)).json.tep.id as string;
  const pdf = (await taiLen(w, g, PDF)).json.tep.id as string;
  let nhatKyLucDoc = -1;
  w.r2.khiGet = () => { nhatKyLucDoc = nhatKy(w, "party_attachment_viewed").length; };
  const r = await w.call("GET", `${duong(g)}/${anh}`, { as: SUP });
  assert.equal(r.status, 200);
  assert.deepEqual([...r.bytes], [...PNG]);
  assert.equal(nhatKyLucDoc, 1, "lúc đọc kho, dòng nhật ký đã có");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("content-security-policy"), "default-src 'none'; sandbox");
  assert.equal(r.headers.get("content-type"), "image/png");
  assert.match(r.headers.get("content-disposition") ?? "", /^inline; filename="giay-to-[0-9a-f]{8}\.png"$/);
  const p = await w.call("GET", `${duong(g)}/${pdf}`, { as: SUP });
  assert.match(p.headers.get("content-disposition") ?? "", /^attachment; /);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), [`Căn cước công dân (CCCD) · tệp ${anh}`, `Căn cước công dân (CCCD) · tệp ${pdf}`]);
});

test("tải xuống bị từ chối: Quản trị / Bán hàng → 403; Toàn quyền nhưng yêu cầu từ trang khác → 403; mã tệp của dòng khác, mã lạ → 404 — KHÔNG dòng nhật ký 'Mở ảnh', KHÔNG đọc kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const khac = await nguoiCoCccd(w, "Người Khác");
  const tid = (await taiLen(w, g)).json.tep.id as string;
  for (const as of [ADM, SALES]) assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as })).status, 403);
  assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as: SUP, headers: { "sec-fetch-site": "cross-site" } })).status, 403, "trang khác nhúng / gọi tới (ruling R4)");
  assert.equal((await w.call("GET", `${duong(khac)}/${tid}`, { as: SUP })).status, 404, "tệp của hồ sơ khác qua đường dẫn hồ sơ này");
  assert.equal((await w.call("GET", `${duong(g)}/${crypto.randomUUID()}`, { as: SUP })).status, 404);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
  assert.equal(w.r2.soLan.get, 0);
});

test("ghi nhật ký lỗi ⇒ KHÔNG trả tệp: lô nhật ký 'Mở ảnh' hỏng → 500, kho không bị đọc", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => JSON.stringify(s.args).includes("party_attachment_viewed")), () => { throw new Error("nhat_ky_gia_hong"); });
  const r = await w.call("GET", `${duong(g)}/${tid}`, { as: SUP });
  assert.equal(r.status, 500);
  assert.equal(w.r2.soLan.get, 0);
  assert.equal(r.bytes.length > 0 && r.bytes[0] === 0x89, false, "thân không phải ảnh");
});

test("kho chưa bật (thiếu binding HO_SO) ⇒ 503 ở tải lên và tải xuống; không ghi CSDL", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  delete w.env.HO_SO;
  assert.equal((await taiLen(w, g)).status, 503);
  assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as: SUP })).status, 503);
  assert.equal(soTep(w), 1);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
});

test("nhật ký không chứa khoá kho / băm (bộ dò toàn tuyến, Hiến chương 5.20)", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  await w.call("GET", `${duong(g)}/${tid}`, { as: SUP });
  w.r2.hong.put = true;
  await taiLen(w, g); // đường hỏng cũng ghi nhật ký — phải sạch
  const ds = doNhatKyHang(w.sqlite, ["pty_attachment.content_hash", "pty_attachment.storage_key"]);
  assert.deepEqual(ds.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
});
