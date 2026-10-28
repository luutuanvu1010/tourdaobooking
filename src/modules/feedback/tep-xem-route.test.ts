// Tệp kèm tin vé hỗ trợ — phần XEM, GỠ, DỌN (ADR-0144 đ3, đ4, đ5, đ6; đặc tả docs/superpowers/specs/2026-10-28-dinh-kem-ve-ho-tro §5 câu 2, 3, 5) qua route THẬT
// (tests/audit/harness.mjs + kho R2 giả `w.r2HoTro`). Ai đọc được TIN thì mở được tệp của tin (cùng đoạn lọc ghi chú nội bộ TIN_CHO_NGUOI_XEM); mọi cách hỏng ⇒ 404,
// không đọc kho, không ghi nhật ký. Mở: nhật ký TRƯỚC khi đọc kho. Gỡ / hàng chờ / chạy lại: chỉ Toàn quyền (ô feedback.triage).
// Nhật ký không chứa khoá kho / băm (doNhatKyHang — "fbk_attachment.content_hash", "fbk_attachment.storage_key").
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT_TV = U(3), KT_TN = U(4), NS_TV = U(5), QT = U(6), PARTNER = U(7), SALES2 = U(8), HR2 = U(9);
const KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su", KY_THUAT = "fbk-team-ky-thuat";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const tep = (...ds: Uint8Array[]) => ds.map((u) => ({ noiDung: b64(u) }));

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [KT_TN, "0900000004", ["ACCOUNTING"]],
    [NS_TV, "0900000005", ["HR"]], [QT, "0900000006", ["ADMIN"]], [PARTNER, "0900000007", ["PARTNER"]], [SALES2, "0900000008", ["SALES"]], [HR2, "0900000009", ["HR"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
  const now = new Date().toISOString();
  const them = (team: string, staff: string, role: "LEAD" | "MEMBER") =>
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-${team}-${staff}', '${team}', '${staff}', '${role}', '${now}', '${now}', '${now}')`);
  them(KE_TOAN, KT_TV, "MEMBER"); them(KE_TOAN, KT_TN, "LEAD"); them(NHAN_SU, NS_TV, "MEMBER");
  return w;
}
const tao = (w: any, as: string, teamId: string, files?: Uint8Array[]) =>
  w.call("POST", "/api/feedback", { as, body: { kind: "QUESTION", title: "Hỏi", body: "Có ảnh.", clientRequestId: crypto.randomUUID(), context: {}, teamId, ...(files ? { tep: tep(...files) } : {}) } });
const traLoi = (w: any, id: string, as: string, files: Uint8Array[], internal = false) =>
  w.call("POST", `/api/feedback/${id}/messages`, { as, body: { body: "Gửi thêm tệp.", internal, tep: tep(...files) } });
const mo = (w: any, id: string, tid: string, as: string, headers: Record<string, string> = {}) => w.call("GET", `/api/feedback/${id}/tep/${tid}`, { as, headers });
const go = (w: any, id: string, tid: string, as: string) => w.call("POST", `/api/feedback/${id}/tep/${tid}/go`, { as, body: {} });
const choXoa = (w: any, as = SUPER) => w.call("GET", "/api/feedback/tep-cho-xoa", { as });
const chayLai = (w: any, as = SUPER) => w.call("POST", "/api/feedback/tep-cho-xoa/chay-lai", { as, body: {} });
const nhatKy = (w: any, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => String(r.detail ?? ""));
const khoaCua = (w: any, tid: string): string => w.q("SELECT storage_key FROM fbk_attachment WHERE id = ?", tid)[0].storage_key;
/** Vé của SALES gửi Kế toán: tin đầu kèm PNG + PDF; ghi chú nội bộ của KT_TV kèm PNG. */
async function veCoTep(w: any) {
  const a = await tao(w, SALES, KE_TOAN, [PNG, PDF]);
  assert.equal(a.status, 201, a.text);
  const n = await traLoi(w, a.json.ticket.id, KT_TV, [PNG], true);
  assert.equal(n.status, 201, n.text);
  const [png, pdf] = a.json.messages[0].tep.map((t: any) => t.id as string);
  return { id: a.json.ticket.id as string, code: a.json.ticket.code as string, png, pdf, noiBo: n.json.messages.at(-1).tep[0].id as string };
}

test("mở tệp: người gửi, thành viên nhóm, Toàn quyền nhận đúng byte; header no-store, nosniff, CSP sandbox; ảnh inline, PDF tải về; nhật ký TRƯỚC khi đọc kho, chỉ mã", async () => {
  const w = setup();
  const v = await veCoTep(w);
  let nhatKyLucDoc = -1;
  w.r2HoTro.khiGet = () => { nhatKyLucDoc = nhatKy(w, "feedback_attachment_viewed").length; };
  for (const [i, as] of [SALES, KT_TV, SUPER].entries()) {
    const r = await mo(w, v.id, v.png, as);
    assert.equal(r.status, 200, `${as} ${r.text}`);
    assert.deepEqual(r.bytes, PNG);
    assert.equal(nhatKyLucDoc, i + 1, "lúc đọc kho, dòng nhật ký của lần mở này ĐÃ có");
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.match(r.headers.get("content-security-policy") ?? "", /sandbox/);
    assert.equal(r.headers.get("cross-origin-resource-policy"), "same-origin");
    assert.equal(r.headers.get("content-disposition"), `inline; filename="ho-tro-${v.png.slice(0, 8)}.png"`);
  }
  const p = await mo(w, v.id, v.pdf, SALES);
  assert.equal(p.status, 200, p.text);
  assert.equal(p.headers.get("content-disposition"), `attachment; filename="ho-tro-${v.pdf.slice(0, 8)}.pdf"`);
  assert.deepEqual(nhatKy(w, "feedback_attachment_viewed"), [...Array(3).fill(`${v.code} · tệp ${v.png}`), `${v.code} · tệp ${v.pdf}`]);
  // Ghi chú nội bộ: người xử lý mở được.
  assert.equal((await mo(w, v.id, v.noiBo, KT_TV)).status, 200);
  assert.equal((await mo(w, v.id, v.noiBo, SUPER)).status, 200);
});

test("bảy ca 404 — người ngoài vé; thành viên nhóm khác; người gửi mở tệp ghi chú nội bộ; Quản trị / Nhân sự với vé nhóm nhạy cảm; tệp của vé khác ghép :id vé mình; tệp chưa lưu; tệp đã gỡ — không đọc kho, không nhật ký", async () => {
  const w = setup();
  const v = await veCoTep(w);
  const khac = await tao(w, SALES2, KE_TOAN, [PNG]);
  const tKhac = khac.json.messages[0].tep[0].id as string;
  w.sqlite.exec("CREATE TRIGGER thu_chua_luu BEFORE UPDATE OF stored_at ON fbk_attachment BEGIN SELECT RAISE(ABORT, 'thu'); END");
  const dd = await traLoi(w, v.id, SALES, [PDF]);
  w.sqlite.exec("DROP TRIGGER thu_chua_luu");
  const tChuaLuu = dd.json.messages.at(-1).tep[0].id as string;
  assert.equal(dd.json.messages.at(-1).tep[0].trangThai, "DANG_TAI");
  const daGo = (await tao(w, SALES, KE_TOAN, [PNG])).json;
  assert.equal((await go(w, daGo.ticket.id, daGo.messages[0].tep[0].id, SUPER)).status, 200);
  const doc = w.r2HoTro.soLan.get;
  const xem = nhatKy(w, "feedback_attachment_viewed").length;
  const ca: [string, string, string, string][] = [
    ["người ngoài vé", v.id, v.png, SALES2],
    ["thành viên nhóm khác", v.id, v.png, NS_TV],
    ["người gửi mở tệp ghi chú nội bộ", v.id, v.noiBo, SALES],
    ["Quản trị, vé nhóm nhạy cảm", v.id, v.png, QT],
    ["Nhân sự không thuộc nhóm, vé nhóm nhạy cảm", v.id, v.png, HR2],
    ["tệp vé khác ghép :id vé mình", v.id, tKhac, SALES],
    ["tệp vé mình ghép :id vé khác", khac.json.ticket.id, v.png, SALES2],
    ["tệp vé khác ghép :id vé mình — Toàn quyền", v.id, tKhac, SUPER],
    ["tệp chưa lưu", v.id, tChuaLuu, SALES],
    ["tệp đã gỡ", daGo.ticket.id, daGo.messages[0].tep[0].id, SALES],
    ["mã tệp sai dạng", v.id, "khong-phai-ma", SALES],
    ["mã vé sai dạng", "khong-phai-ma", v.png, SALES],
  ];
  for (const [ten, id, tid, as] of ca) {
    const r = await mo(w, id, tid, as);
    assert.equal(r.status, 404, `${ten}: ${r.text}`);
    assert.equal(r.json.error.message, "Không tìm thấy tệp này.", ten);
  }
  assert.equal(w.r2HoTro.soLan.get, doc, "không ca nào đọc kho");
  assert.equal(nhatKy(w, "feedback_attachment_viewed").length, xem, "không ca nào ghi nhật ký mở");
});

test("chuyển nhóm: nhóm MỚI không mở được tệp trong ghi chú nội bộ của nhóm cũ (404), vẫn mở được tệp tin công khai; nhóm cũ mất quyền với cả hai", async () => {
  const w = setup();
  const v = await veCoTep(w);
  const c = await w.call("POST", `/api/feedback/${v.id}/transfer`, { as: SUPER, body: { teamId: NHAN_SU, reason: "Nhầm nhóm" } });
  assert.equal(c.status, 200, c.text);
  assert.equal((await mo(w, v.id, v.noiBo, NS_TV)).status, 404);
  assert.equal((await mo(w, v.id, v.png, NS_TV)).status, 200);
  assert.equal((await mo(w, v.id, v.png, KT_TV)).status, 404);
  assert.equal((await mo(w, v.id, v.noiBo, KT_TV)).status, 404);
  assert.equal((await mo(w, v.id, v.noiBo, SUPER)).status, 200, "Toàn quyền đọc mọi ghi chú");
});

test("sec-fetch-site: cross-site / same-site / giá trị lạ ⇒ 403, không nhật ký, không đọc kho; same-origin / none / vắng ⇒ 200", async () => {
  const w = setup();
  const v = await veCoTep(w);
  for (const s of ["cross-site", "same-site", "la"]) {
    const r = await mo(w, v.id, v.png, SALES, { "sec-fetch-site": s });
    assert.equal(r.status, 403, `${s} ${r.text}`);
  }
  assert.equal(w.r2HoTro.soLan.get, 0);
  assert.equal(nhatKy(w, "feedback_attachment_viewed").length, 0);
  for (const s of ["same-origin", "none"]) assert.equal((await mo(w, v.id, v.png, SALES, { "sec-fetch-site": s })).status, 200, s);
  assert.equal((await mo(w, v.id, v.png, SALES)).status, 200);
});

test("ghi nhật ký mở tệp hỏng ⇒ lỗi, KHÔNG đọc kho; kho mất đối tượng ⇒ 404; kho chưa bật ⇒ 503", async () => {
  const w = setup();
  const v = await veCoTep(w);
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((x) => /INSERT INTO audit_log/.test(x.sql))) throw new Error("d1_hong");
    return goc(stmts);
  };
  const r = await mo(w, v.id, v.png, SALES);
  w.env.DB.batch = goc;
  assert.equal(r.status, 500, r.text);
  assert.equal(w.r2HoTro.soLan.get, 0, "thiếu dòng nhật ký thì không trả tệp");
  await w.r2HoTro.delete(khoaCua(w, v.png));
  assert.equal((await mo(w, v.id, v.png, SALES)).status, 404);
  w.env.HO_TRO = undefined;
  assert.equal((await mo(w, v.id, v.pdf, SALES)).status, 503);
});

test("tài khoản bên ngoài (Đối tác) mở tệp trên vé của chính mình ⇒ 200; tệp vé người khác ⇒ 404", async () => {
  const w = setup();
  const a = await tao(w, PARTNER, KY_THUAT, [PNG]);
  assert.equal(a.status, 201, a.text);
  assert.equal((await mo(w, a.json.ticket.id, a.json.messages[0].tep[0].id, PARTNER)).status, 200);
  const v = await veCoTep(w);
  assert.equal((await mo(w, v.id, v.png, PARTNER)).status, 404);
});

test("gỡ tệp: chỉ Toàn quyền (người gửi, thành viên, Trưởng nhóm, Quản trị ⇒ 403, không đổi gì); Toàn quyền ⇒ 200 GO_TEP, băm rỗng, đã xoá khỏi kho, DTO «đã gỡ»; lần hai ⇒ 409; tệp vé khác ⇒ 404", async () => {
  const w = setup();
  const v = await veCoTep(w);
  for (const as of [SALES, KT_TV, KT_TN, QT]) {
    const r = await go(w, v.id, v.png, as);
    assert.equal(r.status, 403, `${as} ${r.text}`);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_attachment WHERE purged_at IS NOT NULL")[0].n, 0);
  assert.equal(w.r2HoTro.soLan.delete, 0);
  const key = khoaCua(w, v.png);
  const r = await go(w, v.id, v.png, SUPER);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.messages[0].tep.map((t: any) => [t.id, t.trangThai]), [[v.png, "DA_GO"], [v.pdf, "DA_LUU"]]);
  const d = w.q("SELECT purged_at, purge_reason, content_hash, r2_deleted_at, updated_by FROM fbk_attachment WHERE id = ?", v.png)[0];
  assert.equal(d.purge_reason, "GO_TEP");
  assert.equal(d.content_hash, null);
  assert.ok(d.purged_at && d.r2_deleted_at);
  assert.equal(d.updated_by, SUPER);
  assert.equal(w.r2HoTro.co(key), false);
  assert.deepEqual(nhatKy(w, "feedback_attachment_purged"), [`tệp ${v.png} · GO_TEP`]);
  const nguoiGui = await w.call("GET", `/api/feedback/${v.id}`, { as: SALES });
  assert.equal(nguoiGui.json.messages[0].tep[0].trangThai, "DA_GO", "người gửi thấy «Tệp đã được gỡ»");
  assert.equal((await go(w, v.id, v.png, SUPER)).status, 409);
  assert.equal((await mo(w, v.id, v.png, SUPER)).status, 404);
  const khac = (await tao(w, SALES2, KE_TOAN, [PNG])).json;
  assert.equal((await go(w, v.id, khac.messages[0].tep[0].id, SUPER)).status, 404, "tệp vé khác ghép :id");
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_attachment WHERE purged_at IS NOT NULL")[0].n, 1);
});

test("gỡ khi kho xoá hỏng ⇒ 200, dòng «chờ xoá» hiện ở hàng chờ; chạy lại xoá xong ⇒ hàng rỗng, nhật ký tổng chỉ số đếm; chạy lại khi không có việc ⇒ không ghi nhật ký; hàng chờ / chạy lại chỉ Toàn quyền", async () => {
  const w = setup();
  const v = await veCoTep(w);
  for (const as of [SALES, KT_TN, QT]) {
    assert.equal((await choXoa(w, as)).status, 403, as);
    assert.equal((await chayLai(w, as)).status, 403, as);
  }
  w.r2HoTro.hong.delete = true;
  assert.equal((await go(w, v.id, v.png, SUPER)).status, 200);
  const h = await choXoa(w);
  assert.equal(h.status, 200, h.text);
  assert.deepEqual(h.json.tep.map((t: any) => [t.id, t.trangThai, t.lyDo]), [[v.png, "CHO_XOA", "GO_TEP"]]);
  assert.equal(h.json.conNua, false);
  assert.doesNotMatch(h.text, /fbk\/[0-9a-f]{32}/, "hàng chờ không lộ khoá kho");
  w.r2HoTro.hong.delete = false;
  const c = await chayLai(w);
  assert.equal(c.status, 200, c.text);
  assert.deepEqual(c.json, { daXoa: 1, conLai: 0 });
  assert.equal((await choXoa(w)).json.tep.length, 0);
  assert.deepEqual(nhatKy(w, "feedback_attachment_purge_retried"), ["đã xoá 1, còn 0"]);
  assert.deepEqual((await chayLai(w)).json, { daXoa: 0, conLai: 0 });
  assert.equal(nhatKy(w, "feedback_attachment_purge_retried").length, 1, "không có việc ⇒ không ghi nhật ký");
});

test("tải dở dang quá 10 phút: hàng chờ hiện TAI_DO_DANG; chạy lại quyết xoá TAI_LEN_DO_DANG rồi xoá kho; tệp dở dang vừa tạo không bị đụng", async () => {
  const w = setup();
  const v = await veCoTep(w);
  const tin = w.q("SELECT id FROM fbk_message WHERE ticket_id = ? AND author_id = ? ORDER BY created_at LIMIT 1", v.id, SALES)[0].id;
  const cu = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const keyCu = `fbk/${"c".repeat(32)}`;
  w.sqlite.exec(`INSERT INTO fbk_attachment (id, message_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES ('do-dang-cu', '${tin}', '${keyCu}', 'png', 9, '${"e".repeat(64)}', '${cu}', '${SALES}', '${cu}', '${SALES}')`);
  await w.r2HoTro.put(keyCu, PNG);
  w.sqlite.exec("CREATE TRIGGER thu_chua_luu BEFORE UPDATE OF stored_at ON fbk_attachment BEGIN SELECT RAISE(ABORT, 'thu'); END");
  const moi = (await traLoi(w, v.id, SALES, [PDF])).json.messages.at(-1).tep[0].id as string;
  w.sqlite.exec("DROP TRIGGER thu_chua_luu");
  const h = await choXoa(w);
  assert.deepEqual(h.json.tep.map((t: any) => [t.id, t.trangThai, t.lyDo]), [["do-dang-cu", "TAI_DO_DANG", null]], "tệp vừa tạo chưa quá mốc — chưa vào hàng");
  const c = await chayLai(w);
  assert.deepEqual(c.json, { daXoa: 1, conLai: 0 });
  const d = w.q("SELECT purge_reason, content_hash, r2_deleted_at FROM fbk_attachment WHERE id = 'do-dang-cu'")[0];
  assert.deepEqual([d.purge_reason, d.content_hash], ["TAI_LEN_DO_DANG", null]);
  assert.ok(d.r2_deleted_at);
  assert.equal(w.r2HoTro.co(keyCu), false);
  assert.deepEqual(nhatKy(w, "feedback_attachment_purged"), ["tệp do-dang-cu · TAI_LEN_DO_DANG"]);
  const m = w.q("SELECT stored_at, purged_at FROM fbk_attachment WHERE id = ?", moi)[0];
  assert.deepEqual([m.stored_at, m.purged_at], [null, null], "tệp dở dang vừa tạo không bị quyết xoá");
});

test("nhật ký không chứa khoá kho / băm (mở, gỡ, chạy lại)", async () => {
  const w = setup();
  const v = await veCoTep(w);
  await mo(w, v.id, v.png, SALES);
  await mo(w, v.id, v.noiBo, KT_TV);
  w.r2HoTro.hong.delete = true;
  await go(w, v.id, v.pdf, SUPER);
  w.r2HoTro.hong.delete = false;
  await chayLai(w);
  const ds = doNhatKyHang(w.sqlite, ["fbk_attachment.content_hash", "fbk_attachment.storage_key"]);
  assert.deepEqual(ds.rong, []);
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
});

test("gỡ tệp đang tải (chưa lưu, chưa quyết xoá) ⇒ 409 «đang tải», không đổi gì — tránh đối tượng kho mồ côi khi lệnh gỡ chen giữa lúc đọc lại và lúc đặt kho", async () => {
  const w = setup();
  const v = await veCoTep(w);
  w.sqlite.exec("CREATE TRIGGER thu_chua_luu BEFORE UPDATE OF stored_at ON fbk_attachment BEGIN SELECT RAISE(ABORT, 'thu'); END");
  const dd = (await traLoi(w, v.id, SALES, [PDF])).json.messages.at(-1).tep[0].id as string;
  w.sqlite.exec("DROP TRIGGER thu_chua_luu");
  const r = await go(w, v.id, dd, SUPER);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Tệp này đang được tải lên. Thử lại sau ít phút.");
  const d = w.q("SELECT purged_at, r2_deleted_at FROM fbk_attachment WHERE id = ?", dd)[0];
  assert.deepEqual([d.purged_at, d.r2_deleted_at], [null, null]);
  assert.equal(w.r2HoTro.soLan.delete, 0);
});
