// Tệp kèm tin vé hỗ trợ — phần GỬI (ADR-0144 đ2, đ3, đ5, đ8; đặc tả docs/superpowers/specs/2026-10-28-dinh-kem-ve-ho-tro §5 câu 1, 2 (gửi), 4, 5) qua route THẬT
// (tests/audit/harness.mjs + kho R2 giả `w.r2HoTro`). Tệp đi CÙNG tin trong một yêu cầu: lô D1 (vé/tin + dòng tệp có điều kiện tin đã chèn + nhật ký chỉ mã) TRƯỚC,
// đặt kho SAU, và phần sau lô không ném, không trả 5xx (né BL-TEP-PHAT-LAI-500). Ai đọc được tin thì thấy tệp của tin đó (cùng một đoạn lọc ghi chú nội bộ).
// Nhật ký không chứa khoá kho / băm (bộ dò doNhatKyHang — PHU_TRACH của "fbk_attachment.content_hash", "fbk_attachment.storage_key").
// KHÔNG thử được với kho R2 thật (như ADR-0123).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { TOI_DA_THAN_TIN_CO_TEP } from "../../shared/tep-dinh-kem.ts";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT_TV = U(3), NS_TV = U(5), PARTNER = U(7), TXDT = U(0);
const KY_THUAT = "fbk-team-ky-thuat", KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>"); // .html đổi đuôi .png
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const tep = (...ds: Uint8Array[]) => ds.map((u) => ({ noiDung: b64(u) }));
/** PNG giả cỡ `n` byte (đầu PNG thật, phần còn lại số 0). */
const pngCo = (n: number) => { const u = new Uint8Array(n); u.set(PNG.subarray(0, 8)); return u; };

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [NS_TV, "0900000005", ["HR"]],
    [PARTNER, "0900000007", ["PARTNER"]], [TXDT, "0900000010", ["DRIVER_PARTNER"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
  const now = new Date().toISOString();
  const them = (team: string, staff: string, role: "LEAD" | "MEMBER") =>
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-${team}-${staff}', '${team}', '${staff}', '${role}', '${now}', '${now}', '${now}')`);
  them(KE_TOAN, KT_TV, "MEMBER"); them(NHAN_SU, NS_TV, "MEMBER");
  return w;
}
const tao = (w: any, as: string, teamId: string, files: { noiDung: string }[] | undefined, over: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  w.call("POST", "/api/feedback", {
    as, headers,
    body: { kind: "QUESTION", title: "Hỏi về công nợ", body: "Ảnh chụp màn hình kèm theo.", clientRequestId: crypto.randomUUID(), context: {}, teamId, ...(files ? { tep: files } : {}), ...over },
  });
const traLoi = (w: any, id: string, as: string, files: { noiDung: string }[] | undefined, internal = false, headers: Record<string, string> = {}) =>
  w.call("POST", `/api/feedback/${id}/messages`, { as, headers, body: { body: "Gửi thêm tệp.", internal, ...(files ? { tep: files } : {}) } });
const soDong = (w: any): number => w.q("SELECT count(*) AS n FROM fbk_attachment")[0].n;
const soVe = (w: any): number => w.q("SELECT count(*) AS n FROM fbk_ticket")[0].n;
const nhatKy = (w: any, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => String(r.detail ?? ""));

test("gửi vé kèm PNG + PDF: 201, tepLoi 0; mỗi tệp một dòng gắn tin đầu, khoá fbk/<32 hex>, đã lưu; kho có đúng byte; DTO không khoá kho / băm; nhật ký chỉ mã", async () => {
  const w = setup();
  const r = await tao(w, SALES, KE_TOAN, tep(PNG, PDF));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.tepLoi, 0);
  const tin = r.json.messages[0];
  assert.deepEqual(tin.tep.map((t: any) => [t.loai, t.kichThuoc, t.trangThai]), [["png", PNG.length, "DA_LUU"], ["pdf", PDF.length, "DA_LUU"]]);
  for (const t of tin.tep) assert.deepEqual(Object.keys(t).sort(), ["id", "kichThuoc", "loai", "trangThai"], "DTO không có khoá kho, băm, tên tệp");
  assert.doesNotMatch(r.text, /fbk\/[0-9a-f]{32}|[0-9a-f]{64}/);
  const dong = w.q("SELECT id, message_id, storage_key, content_kind, content_hash, stored_at, purged_at, created_by FROM fbk_attachment ORDER BY created_at, rowid");
  assert.equal(dong.length, 2);
  for (const d of dong) {
    assert.equal(d.message_id, tin.id);
    assert.match(d.storage_key, /^fbk\/[0-9a-f]{32}$/);
    assert.match(d.content_hash, /^[0-9a-f]{64}$/);
    assert.ok(d.stored_at && d.purged_at === null && d.created_by === SALES);
    assert.ok(w.r2HoTro.co(d.storage_key), "kho vé hỗ trợ có đối tượng");
    assert.equal(w.r2.co(d.storage_key), false, "kho hồ sơ KHÔNG nhận tệp vé");
  }
  assert.equal(w.r2HoTro.soLan.put, 2);
  assert.equal(w.r2.soLan.put, 0);
  const lay = await w.env.HO_TRO.get(dong[0].storage_key);
  assert.deepEqual(new Uint8Array(await new Response(lay.body).arrayBuffer()), PNG);
  assert.equal(lay.httpMetadata.contentType, "image/png");
  assert.deepEqual(nhatKy(w, "feedback_attachment_added"), dong.map((d: any) => `tệp ${d.id}`));
  const vd = w.q("SELECT target_type, target_id FROM audit_log WHERE action = 'feedback_attachment_added'");
  assert.ok(vd.every((x: any) => x.target_type === "feedback" && x.target_id === r.json.ticket.id), "nhật ký gắn vé, không gắn tin");
});

test("trả lời kèm tệp: 201; thành viên nhóm thấy tệp ở chi tiết và tuyến làm mới; tin không kèm tệp có tep []", async () => {
  const w = setup();
  const v = await tao(w, SALES, KE_TOAN, undefined);
  assert.equal(v.status, 201, v.text);
  const id = v.json.ticket.id;
  assert.deepEqual(v.json.messages[0].tep, [], "tin không kèm tệp: mảng rỗng");
  assert.equal(v.json.tepLoi, 0);
  const since = new Date(Date.now() - 60_000).toISOString();
  const r = await traLoi(w, id, KT_TV, tep(PNG));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.tepLoi, 0);
  const tin = r.json.messages.at(-1);
  assert.deepEqual(tin.tep.map((t: any) => [t.loai, t.trangThai]), [["png", "DA_LUU"]]);
  for (const as of [SALES, KT_TV, SUPER]) {
    const d = await w.call("GET", `/api/feedback/${id}`, { as });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(d.json.messages.at(-1).tep.map((t: any) => t.id), [tin.tep[0].id], as);
    const m = await w.call("GET", `/api/feedback/${id}/messages?since=${encodeURIComponent(since)}`, { as });
    assert.equal(m.status, 200, m.text);
    assert.deepEqual(m.json.messages.find((x: any) => x.id === tin.id).tep.map((t: any) => t.id), [tin.tep[0].id], `${as} tuyến làm mới`);
  }
  assert.deepEqual(nhatKy(w, "feedback_attachment_added"), [`${v.json.ticket.code} · tệp ${tin.tep[0].id}`]);
});

test("ghi chú nội bộ kèm tệp: người xử lý gửi được; người gửi vé KHÔNG thấy tin lẫn tệp (chi tiết, tuyến làm mới); người gửi vé tự ghi chú nội bộ kèm tệp ⇒ 403, kho không nhận", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN, undefined)).json.ticket.id;
  const since = new Date(Date.now() - 60_000).toISOString();
  const r = await traLoi(w, id, KT_TV, tep(PDF), true);
  assert.equal(r.status, 201, r.text);
  const tepId = r.json.messages.at(-1).tep[0].id;
  for (const duong of [`/api/feedback/${id}`, `/api/feedback/${id}/messages?since=${encodeURIComponent(since)}`]) {
    const d = await w.call("GET", duong, { as: SALES });
    assert.equal(d.status, 200, d.text);
    assert.equal(d.text.includes(tepId), false, `${duong}: người gửi vé không thấy tệp của ghi chú nội bộ`);
  }
  const datTruoc = w.r2HoTro.soLan.put;
  const c = await traLoi(w, id, SALES, tep(PNG), true);
  assert.equal(c.status, 403, c.text);
  assert.equal(w.r2HoTro.soLan.put, datTruoc);
  assert.equal(soDong(w), 1);
});

test("tài khoản bên ngoài (Đối tác, Tài xế đối tác) gửi vé kèm tệp tới Kỹ thuật ⇒ 201; tới nhóm khác ⇒ 403, không vé, không dòng tệp, kho không nhận", async () => {
  const w = setup();
  for (const as of [PARTNER, TXDT]) {
    const ok = await tao(w, as, KY_THUAT, tep(PNG));
    assert.equal(ok.status, 201, `${as} ${ok.text}`);
    assert.equal(ok.json.messages[0].tep.length, 1);
    const truoc = { ve: soVe(w), dong: soDong(w), put: w.r2HoTro.soLan.put };
    const cam = await tao(w, as, KE_TOAN, tep(PNG));
    assert.equal(cam.status, 403, `${as} ${cam.text}`);
    assert.deepEqual({ ve: soVe(w), dong: soDong(w), put: w.r2HoTro.soLan.put }, truoc, as);
  }
  // Trả lời kèm tệp trên vé của chính mình (cùng quyền gửi tin).
  const id = (await tao(w, PARTNER, KY_THUAT, undefined)).json.ticket.id;
  const r = await traLoi(w, id, PARTNER, tep(PDF));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.messages.at(-1).tep[0].loai, "pdf");
});

test("tệp sai loại (HTML đổi đuôi, SVG) ⇒ 415; quá 5 tệp ⇒ 400; tổng quá 10 MB ⇒ 413; thân quá trần ⇒ 413; tep không phải mảng ⇒ 400 — không vé, không tin, không dòng tệp, kho không nhận (cả hai route)", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN, undefined)).json.ticket.id;
  const truoc = { ve: soVe(w), tin: w.q("SELECT count(*) AS n FROM fbk_message")[0].n };
  const lon = tep(pngCo(4 * 1024 * 1024), pngCo(4 * 1024 * 1024), pngCo(3 * 1024 * 1024));
  const ca: [string, { noiDung: string }[] | unknown, number, string, Record<string, string>][] = [
    ["HTML", tep(HTML), 415, "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.", {}],
    ["SVG", tep(PNG, SVG), 415, "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.", {}],
    ["6 tệp", tep(PNG, PNG, PNG, PNG, PNG, PNG), 400, "Mỗi tin đính kèm tối đa 5 tệp.", {}],
    ["tổng 11 MB", lon, 413, "Tổng các tệp của một tin không được quá 10 MB.", {}],
    ["Content-Length", tep(PNG), 413, "Tổng các tệp của một tin không được quá 10 MB.", { "content-length": String(TOI_DA_THAN_TIN_CO_TEP + 1) }],
    ["không phải mảng", { noiDung: b64(PNG) }, 400, "", {}],
  ];
  for (const [ten, files, ma, cau, h] of ca) {
    const a = await tao(w, SALES, KE_TOAN, files as any, {}, h);
    assert.equal(a.status, ma, `gửi vé — ${ten}: ${a.text}`);
    if (cau) assert.equal(a.json.error.message, cau, ten);
    const b = await traLoi(w, id, SALES, files as any, false, h);
    assert.equal(b.status, ma, `trả lời — ${ten}: ${b.text}`);
  }
  assert.deepEqual({ ve: soVe(w), tin: w.q("SELECT count(*) AS n FROM fbk_message")[0].n }, truoc, "không tạo vé / tin");
  assert.equal(soDong(w), 0);
  assert.equal(w.r2HoTro.soLan.put, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action IN ('feedback_created', 'feedback_replied')")[0].n, 1, "chỉ dòng của vé dựng bài");
});

test("chạm trần vé / trần tin, gửi lại cùng clientRequestId, vé vừa đổi nhóm — khi tin có tệp: đúng mã như hôm nay (429 / 200 vé cũ / 409), không dòng tệp, kho không nhận", async () => {
  const w = setup();
  // Gửi lại cùng clientRequestId: lần đầu 201 + tệp; lần hai 200 trả vé cũ, KHÔNG thêm dòng / không đặt kho lần nữa.
  const crid = crypto.randomUUID();
  const a = await tao(w, SALES, KE_TOAN, tep(PNG), { clientRequestId: crid });
  assert.equal(a.status, 201, a.text);
  const b = await tao(w, SALES, KE_TOAN, tep(PNG, PDF), { clientRequestId: crid });
  assert.equal(b.status, 200, b.text);
  assert.equal(b.json.ticket.id, a.json.ticket.id);
  assert.deepEqual([soDong(w), w.r2HoTro.soLan.put], [1, 1]);
  // Trần 5 vé / giờ (đã dùng 1): thêm 4 vé không tệp rồi vé thứ 6 kèm tệp ⇒ 429.
  for (let i = 0; i < 4; i++) assert.equal((await tao(w, SALES, KE_TOAN, undefined)).status, 201);
  const c = await tao(w, SALES, KE_TOAN, tep(PNG));
  assert.equal(c.status, 429, c.text);
  assert.deepEqual([soDong(w), w.r2HoTro.soLan.put], [1, 1]);
  // Trần 30 tin / giờ của người trả lời.
  const id = a.json.ticket.id;
  const at = new Date().toISOString();
  for (let i = 0; i < 30; i++) {
    w.sqlite.exec(`INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, updated_at, team_id) VALUES ('tran-${i}', '${id}', '${KT_TV}', 'x', 0, '${at}', '${at}', '${KE_TOAN}')`);
  }
  const d = await traLoi(w, id, KT_TV, tep(PNG));
  assert.equal(d.status, 429, d.text);
  assert.deepEqual([soDong(w), w.r2HoTro.soLan.put], [1, 1]);
  // Vé đổi nhóm giữa lúc kiểm quyền và lúc ghi (R11) ⇒ 409, tin và tệp đều không chèn.
  const id2 = (await tao(w, SUPER, KE_TOAN, undefined)).json.ticket.id;
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => /INSERT INTO fbk_message/.test(s.sql))) { w.env.DB.batch = goc; w.sqlite.exec(`UPDATE fbk_ticket SET team_id = '${NHAN_SU}' WHERE id = '${id2}'`); }
    return goc(stmts);
  };
  const e = await traLoi(w, id2, SUPER, tep(PNG));
  assert.equal(e.status, 409, e.text);
  assert.equal(e.json.error.code, "stale");
  assert.deepEqual([soDong(w), w.r2HoTro.soLan.put], [1, 1]);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_attachment_added'")[0].n, 1);
});

test("trần 20 tệp / giờ / tài khoản: đã có 20 tệp ⇒ gửi thêm 1 bị 429 TRƯỚC lô (không vé); tài khoản khác không bị ảnh hưởng", async () => {
  const w = setup();
  for (let i = 0; i < 4; i++) assert.equal((await tao(w, SALES, KE_TOAN, tep(PNG, PNG, PNG, PNG, PNG))).status, 201);
  assert.equal(soDong(w), 20);
  const veTruoc = soVe(w);
  const r = await tao(w, SALES, KE_TOAN, tep(PNG));
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.message, "Bạn gửi quá nhiều tệp trong một giờ, hãy thử lại sau.");
  assert.equal(soVe(w), veTruoc, "chặn trước lô: vé không được tạo");
  const id = w.q(`SELECT id FROM fbk_ticket WHERE submitter_id = '${SALES}' LIMIT 1`)[0].id;
  assert.equal((await traLoi(w, id, SALES, tep(PDF))).status, 429);
  assert.equal((await traLoi(w, id, SALES, undefined)).status, 201, "tin không kèm tệp vẫn gửi được");
  assert.equal((await tao(w, KT_TV, KE_TOAN, tep(PNG))).status, 201, "trần theo từng tài khoản");
});

test("kho hỏng khi đặt ⇒ 201, tin còn, tepLoi đúng; dòng tệp quyết xoá TAI_LEN_LOI + đã xoá khỏi kho; DTO không hiện tệp hỏng; gửi lại CÙNG vé ⇒ phát lại kết quả 201 (không phải «đã ghi» của 500)", async () => {
  const w = setup();
  w.r2HoTro.hong.put = true;
  const ve = crypto.randomUUID();
  const body = { kind: "QUESTION", title: "Hỏi", body: "Có ảnh.", clientRequestId: crypto.randomUUID(), context: {}, teamId: KE_TOAN, tep: tep(PNG, PDF) };
  const r = await w.call("POST", "/api/feedback", { as: SALES, body, headers: { "idempotency-key": ve } });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.tepLoi, 2);
  assert.deepEqual(r.json.messages[0].tep, [], "tệp hỏng không hiện");
  assert.equal(r.json.messages[0].body, "Có ảnh.", "tin vẫn lưu");
  const dong = w.q("SELECT id, stored_at, purged_at, purge_reason, content_hash, r2_deleted_at FROM fbk_attachment ORDER BY created_at, rowid");
  assert.equal(dong.length, 2, "dòng tệp có TRƯỚC khi đặt kho");
  for (const d of dong) {
    assert.equal(d.stored_at, null);
    assert.equal(d.purge_reason, "TAI_LEN_LOI");
    assert.equal(d.content_hash, null);
    assert.ok(d.purged_at && d.r2_deleted_at);
  }
  assert.deepEqual(nhatKy(w, "feedback_attachment_purged"), dong.map((d: any) => `tệp ${d.id} · TAI_LEN_LOI`));
  await w.choNen();
  const lai = await w.call("POST", "/api/feedback", { as: SALES, body, headers: { "idempotency-key": ve } });
  assert.equal(lai.status, 200, lai.text);
  assert.deepEqual([lai.json?.da_ghi_truoc_do, lai.json?.ket_qua], [true, "/feedback"], "vé ghi kết quả 201 (có địa chỉ), không phải 500 (ket_qua null)");
  assert.equal(soVe(w), 1);
});

test("đánh dấu đã lưu hỏng ⇒ 201, tepLoi 1, dòng còn «đang tải» (chưa lưu, chưa quyết xoá) — DTO DANG_TAI; kho đã có đối tượng", async () => {
  const w = setup();
  w.sqlite.exec("CREATE TRIGGER thu_hong_danh_dau BEFORE UPDATE OF stored_at ON fbk_attachment BEGIN SELECT RAISE(ABORT, 'thu_hong'); END");
  const r = await tao(w, SALES, KE_TOAN, tep(PNG));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.tepLoi, 1);
  assert.deepEqual(r.json.messages[0].tep.map((t: any) => t.trangThai), ["DANG_TAI"]);
  const d = w.q("SELECT storage_key, stored_at, purged_at FROM fbk_attachment")[0];
  assert.deepEqual([d.stored_at, d.purged_at], [null, null]);
  assert.ok(w.r2HoTro.co(d.storage_key));
});

test("kho tệp vé chưa bật (thiếu binding) mà tin có tệp ⇒ 503, không vé; tin không tệp vẫn gửi được", async () => {
  const w = setup();
  w.env.HO_TRO = undefined;
  const r = await tao(w, SALES, KE_TOAN, tep(PNG));
  assert.equal(r.status, 503, r.text);
  assert.equal(soVe(w), 0);
  assert.equal((await tao(w, SALES, KE_TOAN, undefined)).status, 201);
});

test("nhật ký không chứa khoá kho / băm của tệp vé (kể cả đường hỏng)", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN, tep(PNG, PDF))).json.ticket.id;
  await traLoi(w, id, KT_TV, tep(PNG), true);
  w.r2HoTro.hong.put = true;
  await traLoi(w, id, SALES, tep(PDF));
  const ds = doNhatKyHang(w.sqlite, ["fbk_attachment.content_hash", "fbk_attachment.storage_key"]);
  assert.deepEqual(ds.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
});

test("trần 20 tệp chạm TRONG lô (lần gửi khác chen vào sau lúc đếm trước): câu chèn có điều kiện chỉ nhận tới trần — 201, tepLoi = phần thiếu, kho chỉ nhận tệp có dòng", async () => {
  const w = setup();
  for (const n of [5, 5, 5, 3]) assert.equal((await tao(w, SALES, KE_TOAN, tep(...Array(n).fill(PNG)))).status, 201);
  assert.equal(soDong(w), 18);
  const tinCon = w.q(`SELECT a.message_id AS m FROM fbk_attachment a GROUP BY a.message_id HAVING count(*) = 3`)[0].m;
  const put = w.r2HoTro.soLan.put;
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => /INSERT INTO fbk_attachment/.test(s.sql))) {
      w.env.DB.batch = goc;
      const at = new Date().toISOString();
      w.sqlite.exec(`INSERT INTO fbk_attachment (id, message_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
        VALUES ('chen-1', '${tinCon}', 'fbk/${"a".repeat(32)}', 'png', 1, '${"b".repeat(64)}', '${at}', '${SALES}', '${at}', '${SALES}')`);
    }
    return goc(stmts);
  };
  const r = await tao(w, SALES, NHAN_SU, tep(PNG, PDF));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.tepLoi, 1);
  assert.deepEqual(r.json.messages[0].tep.map((t: any) => t.loai), ["png"]);
  assert.equal(soDong(w), 20);
  assert.equal(w.r2HoTro.soLan.put, put + 1, "chỉ đặt kho cho dòng có thật");
  assert.equal(w.q(`SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_attachment_added' AND target_id = '${r.json.ticket.id}'`)[0].n, 1, "nhật ký theo dòng đã chèn");
});
