// Kho tệp hồ sơ qua route THẬT (tests/audit/harness.mjs + kho R2 giả; ADR-0123; lát H-2 Gói 2). Tải lên: chỉ Toàn quyền (ruling Q1), ghi D1 TRƯỚC rồi đặt kho
// (ruling Q2), loại theo chữ ký, trần 10 MB. Tải xuống: 403 không ghi nhật ký; nhật ký có TRƯỚC khi đọc kho; nhật ký lỗi ⇒ không đọc kho; header no-store + nosniff.
// Nhật ký không chứa khoá kho / băm (bộ dò doNhatKyHang — PHU_TRACH của "pty_attachment.content_hash", "pty_attachment.storage_key").
// KHÔNG thử được với kho R2 thật (kế hoạch: "Giới hạn không vượt được").
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { TOI_DA_BYTE, TOI_DA_THAN } from "./tep.ts";

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

const choXoa = (w: any) => w.call("GET", "/api/parties/tep-cho-xoa", { as: SUP });
const chayLai = (w: any, as = SUP) => w.call("POST", "/api/parties/tep-cho-xoa/chay-lai", { as, body: {} });

test("Review Focus 3: kho hỏng khi đặt VÀ khi xoá ⇒ dòng 'chờ xoá' hiện ở danh sách (chỉ mã, không khoá kho); tải xuống 404 dù kho còn đối tượng; chạy lại ⇒ xoá xong", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tot = (await taiLen(w, g)).json.tep.id as string;
  const keyTot = w.q("SELECT storage_key k FROM pty_attachment WHERE id = ?", tot)[0].k;
  // Quyết xoá thẳng một tệp ĐÃ lưu (giả lập phiếu xoá của H-5) mà kho hỏng khi xoá: còn đối tượng trong kho
  w.r2.hong.delete = true;
  w.r2.hong.put = true;
  assert.equal((await taiLen(w, g)).status, 500);
  w.r2.hong.put = false;
  w.sqlite.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'PHIEU_XOA_GIA', content_hash = NULL WHERE id = ?").run(new Date().toISOString(), tot);
  const ds = await choXoa(w);
  assert.equal(ds.status, 200);
  assert.deepEqual(ds.json.tep.map((t: any) => t.trangThai).sort(), ["CHO_XOA", "CHO_XOA"]);
  assert.doesNotMatch(ds.text, /pty\/[0-9a-f]{32}/, "danh sách không lộ khoá kho");
  assert.ok(w.r2.co(keyTot), "kho còn đối tượng");
  assert.equal((await w.call("GET", `${duong(g)}/${tot}`, { as: SUP })).status, 404, "đã quyết xoá thì không phục vụ, dù kho còn");
  const hong = await chayLai(w);
  assert.deepEqual(hong.json, { daXoa: 0, conLai: 2 });
  w.r2.hong.delete = false;
  const lanh = await chayLai(w);
  assert.deepEqual(lanh.json, { daXoa: 2, conLai: 0 });
  assert.equal(w.r2.co(keyTot), false);
  assert.deepEqual((await choXoa(w)).json.tep, []);
  assert.deepEqual(nhatKy(w, "party_attachment_purge_retried"), ["đã xoá 0, còn 2", "đã xoá 2, còn 0"]);
});

test("tải dở dang (stored_at rỗng) quá 10 phút ⇒ hiện TAI_DO_DANG; chạy lại quyết xoá TAI_LEN_DO_DANG rồi xoá kho; dòng vừa tạo (< 10 phút) và dòng đã lưu KHÔNG bị đụng", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const daLuu = (await taiLen(w, g)).json.tep.id as string;
  const cu = new Date(Date.now() - 11 * 60_000).toISOString();
  const chen = (id: string, k: number, luc: string) => {
    w.sqlite.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, 'png', 3, ?, ?, ?, ?, ?)`).run(id, g.id, `pty/${String(k).padStart(32, "0")}`, "e".repeat(64), luc, SUP, luc, SUP);
    w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, ?, ?, ?)").run(id, g.did, luc, SUP, luc, SUP);
  };
  chen("dd-cu", 1, cu);
  chen("dd-moi", 2, new Date().toISOString());
  await w.r2.put(`pty/${"1".padStart(32, "0")}`, new Uint8Array([1]));
  assert.deepEqual((await choXoa(w)).json.tep.map((t: any) => [t.id, t.trangThai]), [["dd-cu", "TAI_DO_DANG"]]);
  assert.deepEqual((await chayLai(w)).json, { daXoa: 1, conLai: 0 });
  const r = (id: string) => w.q("SELECT purge_reason p, r2_deleted_at d, stored_at s FROM pty_attachment WHERE id = ?", id)[0];
  assert.equal(r("dd-cu").p, "TAI_LEN_DO_DANG");
  assert.ok(r("dd-cu").d);
  assert.equal(r("dd-moi").p, null, "dòng vừa tạo chưa bị đụng");
  assert.equal(r(daLuu).p, null, "dòng đã lưu không bị đụng");
  assert.deepEqual(nhatKy(w, "party_attachment_purged"), ["tệp dd-cu · TAI_LEN_DO_DANG"]);
});

test("hàng chờ xoá: Quản trị / Bán hàng → 403 ở cả xem lẫn chạy lại (ruling Q4); thiếu kho ⇒ chạy lại 503", async () => {
  const w = setup();
  for (const as of [ADM, SALES]) {
    assert.equal((await w.call("GET", "/api/parties/tep-cho-xoa", { as })).status, 403);
    assert.equal((await chayLai(w, as)).status, 403);
  }
  delete w.env.HO_SO;
  assert.equal((await chayLai(w)).status, 503);
});

test("Review Focus 4: gộp hồ sơ ⇒ ảnh mở được qua dòng giấy tờ MỚI của hồ sơ chính; ảnh đã quyết xoá không đi theo", async () => {
  const w = setup();
  const TEN = "Người Gộp Ảnh";
  const g = await nguoiCoCccd(w, TEN);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  w.r2.hong.put = true;
  assert.equal((await taiLen(w, g)).status, 500); // ảnh hỏng: đã quyết xoá TAI_LEN_LOI
  w.r2.hong.put = false;
  const hong = w.q("SELECT id FROM pty_attachment WHERE purged_at IS NOT NULL")[0].id as string;
  const B = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN, contacts: [] } })).json.party.id as string;
  const r = await w.call("POST", `/api/parties/${g.id}/merge`, { as: ADM, body: { intoPartyId: B, xacNhan: TEN } });
  assert.equal(r.status, 200, r.text);
  const ds = await w.call("GET", `/api/parties/${B}/documents`, { as: ADM });
  const did = ds.json.documents.find((d: any) => d.typeCode === "CCCD" && d.current).id as string;
  assert.notEqual(did, g.did);
  assert.deepEqual((await w.call("GET", `/api/parties/${B}/documents/${did}/tep`, { as: SUP })).json.tep.map((t: any) => t.id), [tid]);
  const x = await w.call("GET", `/api/parties/${B}/documents/${did}/tep/${tid}`, { as: SUP });
  assert.equal(x.status, 200);
  assert.deepEqual([...x.bytes], [...PNG]);
  assert.deepEqual(w.q("SELECT target_id t FROM audit_log WHERE action = 'party_attachment_viewed'").map((v: any) => v.t), [B]);
  assert.equal(w.q("SELECT count(*) n FROM pty_attachment_link WHERE attachment_id = ?", hong)[0].n, 1, "ảnh đã quyết xoá không nối sang hồ sơ chính");
});

// ---- Vòng sửa nhóm C (người kiểm độc lập 2026-10-17) ----
test("m-1: tải xuống chỉ cho qua sec-fetch-site same-origin / none / vắng — same-site cũng bị chặn (403, không nhật ký, không đọc kho)", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  for (const sfs of ["same-site", "cross-site", "la-ky"]) {
    assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as: SUP, headers: { "sec-fetch-site": sfs } })).status, 403, sfs);
  }
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
  assert.equal(w.r2.soLan.get, 0);
  for (const sfs of ["same-origin", "none"]) {
    assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as: SUP, headers: { "sec-fetch-site": sfs } })).status, 200, sfs);
  }
});

test("m-3: đánh dấu đã lưu không đổi được dòng (tệp bị quyết xoá giữa chừng) ⇒ 500, KHÔNG báo 201; tệp nằm ở hàng chờ xoá", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const datGoc = w.r2.put;
  w.r2.put = async (...a: unknown[]) => {
    const r = await datGoc(...a);
    w.sqlite.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'PHIEU_XOA_GIA', content_hash = NULL WHERE stored_at IS NULL AND purged_at IS NULL").run(new Date().toISOString());
    return r;
  };
  const r = await taiLen(w, g);
  assert.equal(r.status, 500, r.text);
  assert.equal(r.json.error.message, "Không tải tệp lên được. Thử lại sau ít phút.");
  const row = w.q("SELECT id, stored_at FROM pty_attachment")[0];
  assert.equal(row.stored_at, null);
  assert.deepEqual((await w.call("GET", "/api/parties/tep-cho-xoa", { as: SUP })).json.tep.map((t: any) => [t.id, t.trangThai]), [[row.id, "CHO_XOA"]]);
});

test("m-4: dòng giấy tờ bị gia hạn thay giữa lúc kiểm và lúc ghi lô ⇒ 409 document_not_current (trigger attachment_link_target_stale), không 500; không dòng, không đặt kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  w.chenTruocLo(
    (stmts: any[]) => stmts.some((s) => JSON.stringify(s.args).includes("party_attachment_added")),
    async () => {
      const gh = await w.call("POST", `/api/parties/${g.id}/documents/${g.did}/renew`, { as: ADM, body: { expiryDate: "2040-01-01" } });
      assert.equal(gh.status, 201, gh.text);
    },
  );
  const r = await taiLen(w, g);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "document_not_current");
  assert.equal(soTep(w), 0);
  assert.equal(w.r2.soLan.put, 0);
});

test("m-5: chạy lại khi không có việc ⇒ {0, 0} và KHÔNG ghi nhật ký; hàng chờ quá 50 dòng ⇒ trả 50 dòng CŨ NHẤT + conNua", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  assert.deepEqual((await chayLai(w)).json, { daXoa: 0, conLai: 0 });
  assert.deepEqual(nhatKy(w, "party_attachment_purge_retried"), [], "không việc thì không dòng nhật ký");
  const chen = w.sqlite.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, purged_at, purge_reason, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'png', 3, NULL, ?, 'PHIEU_XOA_GIA', ?, ?, ?, ?)`);
  for (let i = 0; i < 51; i++) {
    const luc = new Date(Date.parse("2026-10-01T00:00:00.000Z") + i * 60_000).toISOString();
    chen.run(`cx-${String(i).padStart(2, "0")}`, g.id, `pty/${String(i).padStart(32, "0")}`, luc, luc, SUP, luc, SUP);
  }
  const ds = (await choXoa(w)).json;
  assert.equal(ds.tep.length, 50);
  assert.equal(ds.tep[0].id, "cx-00", "cũ nhất trước");
  assert.equal(ds.conNua, true);
  w.sqlite.prepare("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = 'cx-50'").run(new Date().toISOString());
  assert.equal((await choXoa(w)).json.conNua, false);
});

test("M14: Content-Length khai lớn hơn trần thân ⇒ 413 TRƯỚC khi đọc thân (thân nhỏ hợp lệ vẫn bị chặn); không dòng, không đặt kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const r = await taiLen(w, g, PNG, SUP, { "content-length": String(TOI_DA_THAN + 1) });
  assert.equal(r.status, 413, r.text);
  assert.equal(r.json.error.code, "file_too_large");
  assert.equal(soTep(w), 0);
  assert.equal(w.r2.soLan.put, 0);
});

test("M15: tải xuống tệp CHƯA lưu xong (stored_at rỗng) ⇒ 404 dù kho có đối tượng; không nhật ký, không đọc kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const at = new Date().toISOString();
  const key = `pty/${"a".repeat(32)}`;
  w.sqlite.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'png', 3, ?, ?, ?, ?, ?)`).run("0000aaaa-1111-4111-8111-111111111111", g.id, key, "e".repeat(64), at, SUP, at, SUP);
  w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, ?, ?, ?)")
    .run("0000aaaa-1111-4111-8111-111111111111", g.did, at, SUP, at, SUP);
  await w.r2.put(key, PNG);
  const soDocTruoc = w.r2.soLan.get;
  assert.equal((await w.call("GET", `${duong(g)}/0000aaaa-1111-4111-8111-111111111111`, { as: SUP })).status, 404);
  assert.equal(w.r2.soLan.get, soDocTruoc);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
});

test("M17: tải xuống với mã dòng giấy tờ của hồ sơ KHÁC trên đường dẫn hồ sơ này ⇒ 404 (đúng tệp, đúng dòng nhưng sai hồ sơ)", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const khac = await nguoiCoCccd(w, "Người Khác");
  const tidKhac = (await taiLen(w, khac)).json.tep.id as string;
  assert.equal((await w.call("GET", `/api/parties/${g.id}/documents/${khac.did}/tep/${tidKhac}`, { as: SUP })).status, 404);
  assert.equal((await w.call("GET", `/api/parties/${g.id}/documents/${khac.did}/tep`, { as: SUP })).status, 404, "danh sách cũng vậy");
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
  assert.equal(w.r2.soLan.get, 0);
});

test("M19: gộp không mang tệp ĐÃ LƯU rồi bị quyết xoá (stored_at VÀ purged_at có); tệp còn hiệu lực vẫn đi theo", async () => {
  const w = setup();
  const TEN = "Người Gộp Xoá";
  const g = await nguoiCoCccd(w, TEN);
  const giu = (await taiLen(w, g)).json.tep.id as string;
  const xoa = (await taiLen(w, g, PDF)).json.tep.id as string;
  w.sqlite.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'PHIEU_XOA_GIA', content_hash = NULL WHERE id = ?").run(new Date().toISOString(), xoa);
  assert.ok(w.q("SELECT stored_at s FROM pty_attachment WHERE id = ?", xoa)[0].s, "tệp bị xoá đã từng lưu xong");
  const B = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN, contacts: [] } })).json.party.id as string;
  const r = await w.call("POST", `/api/parties/${g.id}/merge`, { as: ADM, body: { intoPartyId: B, xacNhan: TEN } });
  assert.equal(r.status, 200, r.text);
  const did = (await w.call("GET", `/api/parties/${B}/documents`, { as: ADM })).json.documents.find((d: any) => d.typeCode === "CCCD" && d.current).id as string;
  assert.deepEqual((await w.call("GET", `/api/parties/${B}/documents/${did}/tep`, { as: SUP })).json.tep.map((t: any) => t.id), [giu]);
  assert.equal(w.q("SELECT count(*) n FROM pty_attachment_link WHERE attachment_id = ?", xoa)[0].n, 1);
});

test("ADR-0126 (lát H-5 việc 5): tải ảnh lên dòng giấy tờ đã ẩn danh → 409 document_erased, không dòng tệp, không đối tượng kho, không nhật ký", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  w.sqlite.prepare("UPDATE pty_person_document SET erased_at = ?, document_number = 'XOA' || upper(replace(id, '-', '')), number_key = 'XOA' || upper(replace(id, '-', '')), issued_place = NULL WHERE id = ?")
    .run("2026-10-17T00:00:00.000Z", g.did);
  const r = await taiLen(w, g);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "document_erased");
  assert.equal(soTep(w), 0);
  assert.equal(w.r2.soLan.put, 0);
  assert.deepEqual(nhatKy(w, "party_attachment_added"), []);
});
