// Route tải tệp của phiếu đăng ký (ADR-0208 Đ2, Đ3; ADR-0206 Đ5, Đ7) qua khung thử THẬT (tests/audit/harness.mjs + kho R2 giả). Công khai + kiểm cookie đăng ký trong thân route.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { DK_COOKIE, taoPhienDangKy } from "./phien.ts";

const PHIEU = "DK_ABCDEFGH";
const IDENT = "ident-1";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const DUONG = "/api/dang-ky/phieu/tep";
const TRUOC = "CCCD_MAT_TRUOC";
const SAU = "CCCD_MAT_SAU";

function setup(trangThai = "DANG_DIEN") {
  const w = world();
  const at = new Date().toISOString();
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'GUIDE', ?, ?)").run(PHIEU, at, at);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', 'a@example.com', 'a@example.com', ?, ?)").run(IDENT, PHIEU, at, at);
  const DUONG_DEN: Record<string, string[]> = { CAN_BO_SUNG: ["CHO_XAC_MINH", "CAN_BO_SUNG"], CHO_XAC_MINH: ["CHO_XAC_MINH"], CHO_DUYET: ["CHO_XAC_MINH", "CHO_DUYET"] };
  for (const t of DUONG_DEN[trangThai] ?? (trangThai === "DANG_DIEN" ? [] : [trangThai])) w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, PHIEU);
  return w;
}
async function cookie(w: any, nowMs = Date.now(), ident = IDENT): Promise<string> {
  return `${DK_COOKIE}=${await taoPhienDangKy(w.env.SESSION_SECRET, PHIEU, ident, nowMs)}`;
}
async function tai(w: any, o: { slot?: unknown; bytes?: Uint8Array; cookie?: string | null; headers?: Record<string, string>; body?: unknown; khongContentLength?: boolean } = {}) {
  const ck = o.cookie === undefined ? await cookie(w) : o.cookie;
  const body = o.body !== undefined ? o.body : { o: o.slot ?? TRUOC, noiDung: b64(o.bytes ?? PNG) };
  // Khung thử không tự đặt Content-Length; trình duyệt thật luôn gửi — bài đặt đúng cỡ thân JSON (route công khai đòi có).
  const cl = o.khongContentLength ? {} : { "content-length": String(Buffer.byteLength(JSON.stringify(body))) };
  const headers: Record<string, string> = { ...(ck ? { cookie: ck } : {}), ...cl, ...(o.headers ?? {}) };
  return w.call("POST", DUONG, { body, headers });
}
const dongTep = (w: any): any[] => w.q("SELECT id, slot, storage_key, content_hash, stored_at, purged_at, purge_reason FROM pty_registration_attachment ORDER BY created_at, rowid").map((x: any) => ({ ...x }));
const heic = (n: number): Uint8Array => { const u = new Uint8Array(n); u.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]); return u; };

test("tải PNG: 200; dòng chờ + dòng lịch sử; kho có đúng byte; cookie cấp lại HttpOnly/SameSite=Lax/Secure giữ mốc bắt đầu; DTO chỉ «đã gửi» theo ô, không khoá kho, không băm", async () => {
  const w = setup();
  const t0 = Date.now() - 60_000;
  const r = await tai(w, { cookie: await cookie(w, t0) });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { tep: [{ o: TRUOC, trangThai: "DA_GUI" }] });
  assert.equal(r.text.includes("pty/"), false);
  const d = dongTep(w);
  assert.equal(d.length, 1);
  assert.match(d[0].storage_key, /^pty\/[0-9a-f]{32}$/);
  assert.ok(d[0].stored_at);
  assert.ok(w.r2.co(d[0].storage_key));
  assert.deepEqual(w.q("SELECT actor_kind, actor_ref, command FROM dk_event WHERE registration_id = ?", PHIEU).map((x: any) => ({ ...x })), [{ actor_kind: "REGISTRANT", actor_ref: IDENT, command: "THEM_TEP" }]);
  const sc = r.headers.get("set-cookie") ?? "";
  assert.match(sc, new RegExp(`^${DK_COOKIE}=dk1\\.`));
  for (const x of ["HttpOnly", "SameSite=Lax", "Secure", "Path=/api/dang-ky"]) assert.ok(sc.includes(x), x);
  const parts = sc.split(";")[0]!.split("=")[1]!.split(".");
  assert.equal(Number(parts[3]), t0, "mốc bắt đầu phiên giữ nguyên");
  assert.ok(Number(parts[4]) > t0, "mốc thao tác cuối được làm mới (hạn không thao tác trượt)");
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("không cookie, cookie sai chữ ký, danh tính không thuộc phiếu: 401; không chạm kho, không dòng nào", async () => {
  const w = setup();
  assert.equal((await tai(w, { cookie: null })).status, 401);
  assert.equal((await tai(w, { cookie: `${DK_COOKIE}=dk1.${PHIEU}.${IDENT}.1.2.xxxx` })).status, 401);
  assert.equal((await tai(w, { cookie: await cookie(w, Date.now(), "ident-la") })).status, 401);
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(dongTep(w).length, 0);
});

test("cookie đăng nhập nhân viên (td_session) không thay được cookie đăng ký", async () => {
  const w = setup();
  assert.equal((await tai(w, { cookie: "td_session=abc.def" })).status, 401);
});

test("sai chữ ký, SVG, HTML ⇒ 415; ô lạ / thân hỏng ⇒ 400; không chạm kho, không dòng", async () => {
  const w = setup();
  for (const s of ["<html><script>alert(1)</script></html>", '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "chỉ là chữ"]) {
    const r = await tai(w, { bytes: new TextEncoder().encode(s) });
    assert.equal(r.status, 415, r.text);
    assert.equal(r.json.error.message, "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.");
  }
  assert.equal((await tai(w, { slot: "O_LA" })).status, 400);
  assert.equal((await tai(w, { body: { o: TRUOC, noiDung: "@@@@" } })).status, 400);
  assert.equal((await tai(w, { body: { o: TRUOC } })).status, 400);
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(dongTep(w).length, 0);
});

test("trần 5 MB: Content-Length quá trần ⇒ 413 TRƯỚC khi đọc thân; thân giải ra 5 MB + 1 byte ⇒ 413; đúng 5 MB qua", async () => {
  const w = setup();
  const r = await tai(w, { headers: { "content-length": String(50 * 1024 * 1024) } });
  assert.equal(r.status, 413, r.text);
  assert.equal(r.json.error.message, "Tệp lớn hơn 5 MB.");
  const qua = new Uint8Array(5 * 1024 * 1024 + 1); qua.set(PNG);
  assert.equal((await tai(w, { bytes: qua })).status, 413);
  assert.equal(dongTep(w).length, 0);
  const vua = new Uint8Array(5 * 1024 * 1024); vua.set(PNG);
  assert.equal((await tai(w, { bytes: vua })).status, 200);
});

test("Review Focus 2: ảnh HEIC 4,9 MB nhận được (trần theo byte của tệp, không theo ảnh đã thu nhỏ)", async () => {
  const w = setup();
  const r = await tai(w, { bytes: heic(Math.floor(4.9 * 1024 * 1024)) });
  assert.equal(r.status, 200, r.text);
  assert.equal(dongTep(w)[0].stored_at !== null, true);
});

test("tệp thứ 9 của phiếu (kể cả tệp đã thay) ⇒ 409; không thêm dòng", async () => {
  const w = setup();
  for (let i = 0; i < 8; i++) {
    const u = new Uint8Array(PNG.length + 1); u.set(PNG); u[PNG.length] = i; // nội dung khác nhau ⇒ băm khác ⇒ mỗi lần là một tệp mới (thay tệp cùng ô)
    assert.equal((await tai(w, { bytes: u })).status, 200, `lần ${i + 1}`);
  }
  const u9 = new Uint8Array(PNG.length + 1); u9.set(PNG); u9[PNG.length] = 99;
  const r = await tai(w, { bytes: u9 });
  assert.equal(r.status, 409, r.text);
  assert.equal(dongTep(w).length, 8);
});

test("phiếu không ở ĐANG ĐIỀN / CẦN BỔ SUNG ⇒ 409; CẦN BỔ SUNG tải được", async () => {
  for (const st of ["CHO_XAC_MINH", "CHO_DUYET", "TU_CHOI", "DA_RUT", "HET_HAN"]) {
    const w = setup(st);
    const r = await tai(w);
    // phiếu kết thúc: trigger hạ danh tính «đang mở» nên phiên cũng hết (401); phiếu đang xử lý: 409
    assert.equal(r.status, ["TU_CHOI", "DA_RUT", "HET_HAN"].includes(st) ? 401 : 409, `${st}: ${r.text}`);
    assert.equal(w.r2.soLan.put, 0);
    assert.equal(dongTep(w).length, 0);
  }
  const w = setup("CAN_BO_SUNG");
  assert.equal((await tai(w)).status, 200);
});

test("bấm hai lần cùng tệp cùng ô ⇒ MỘT dòng, một lần đặt kho; thay tệp khác cùng ô ⇒ dòng cũ bị gỡ và xoá khỏi kho", async () => {
  const w = setup();
  assert.equal((await tai(w)).status, 200);
  assert.equal((await tai(w)).status, 200);
  assert.equal(dongTep(w).length, 1);
  assert.equal(w.r2.soLan.put, 1);
  const cu = dongTep(w)[0];
  const khac = new Uint8Array(PNG.length + 1); khac.set(PNG); khac[PNG.length] = 5;
  const r = await tai(w, { bytes: khac });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { tep: [{ o: TRUOC, trangThai: "DA_GUI" }] });
  const d = dongTep(w);
  assert.equal(d.length, 2);
  assert.deepEqual([d[0].purge_reason, d[0].content_hash], ["THAY_TEP", null]);
  assert.equal(w.r2.co(cu.storage_key), false, "tệp cũ đã xoá khỏi kho sau lô");
  assert.ok(w.r2.co(d[1].storage_key));
  // ô khác không ảnh hưởng
  assert.equal((await tai(w, { slot: SAU })).status, 200);
  assert.equal(dongTep(w).filter((x) => x.purged_at === null).length, 2);
});

test("kho giả lỗi ⇒ 200 «chưa tải xong» (không 5xx), dòng «tải dở dang»; gửi lại cùng tệp ⇒ xong, vẫn MỘT dòng", async () => {
  const w = setup();
  w.r2.hong.put = true;
  const r = await tai(w);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { tep: [{ o: TRUOC, trangThai: "CHUA_TAI_XONG" }] });
  assert.equal(dongTep(w)[0].stored_at, null);
  w.r2.hong.put = false;
  const r2 = await tai(w);
  assert.equal(r2.status, 200);
  assert.deepEqual(r2.json, { tep: [{ o: TRUOC, trangThai: "DA_GUI" }] });
  const d = dongTep(w);
  assert.equal(d.length, 1);
  assert.ok(d[0].stored_at && w.r2.co(d[0].storage_key));
});

test("20 tệp mỗi giờ mỗi địa chỉ mạng (đọc dk_policy): vượt ⇒ 429, địa chỉ khác vẫn tải được", async () => {
  const w = setup();
  const t = new Date().toISOString();
  w.sqlite.prepare(`INSERT INTO dk_policy (id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour,
    session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, files_per_network_hour, phieu_required_items, valid_from_at, created_at, updated_at)
    SELECT 'test-2', registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour,
    session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, 2, phieu_required_items, ?, ?, ?
    FROM dk_policy WHERE id = 'gieo-0170'`).run(t, t, t);
  const ip = (x: string) => ({ "cf-connecting-ip": x });
  const khac = (i: number) => { const u = new Uint8Array(PNG.length + 1); u.set(PNG); u[PNG.length] = i; return u; };
  assert.equal((await tai(w, { bytes: khac(1), headers: ip("1.1.1.1") })).status, 200);
  assert.equal((await tai(w, { bytes: khac(2), headers: ip("1.1.1.1") })).status, 200);
  const r = await tai(w, { bytes: khac(3), headers: ip("1.1.1.1") });
  assert.equal(r.status, 429, r.text);
  assert.equal((await tai(w, { bytes: khac(4), headers: ip("2.2.2.2") })).status, 200);
});

test("Đ3: KHÔNG có route đọc tệp nhận cookie đăng ký — GET trên đường tải không trả byte; không route GET nào của dang-ky nhắc tệp", async () => {
  const w = setup();
  await tai(w);
  const key = dongTep(w)[0].storage_key;
  const g = await w.call("GET", DUONG, { headers: { cookie: await cookie(w) } });
  assert.notEqual(g.status, 200);
  assert.equal(g.text.includes(key), false);
  const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  // Route CÔNG KHAI (nơi duy nhất cookie đăng ký được nhận) không có đường GET nào nhắc tệp. Đường GET tệp của người xác minh (ADR-0207 Đ9, cổng accounts, nhật ký trước) KHÔNG nhận cookie đăng ký.
  const gets = [...index.matchAll(/route\(\s*"GET",\s*"([^"]+)",\s*"([^"]+)"/g)].map((m) => ({ p: m[1]!, access: m[2]! }));
  assert.deepEqual(gets.filter((g) => g.access === "public" && /tep|file|anh/i.test(g.p)), []);
});

test("nhật ký không chứa khoá kho / băm của tệp chờ (bộ dò doNhatKyHang — PHU_TRACH của hai cột N3 của pty_registration_attachment), kể cả đường kho hỏng", async () => {
  const w = setup();
  await tai(w);
  w.r2.hong.put = true;
  await tai(w, { slot: SAU });
  const ds = doNhatKyHang(w.sqlite, ["pty_registration_attachment.content_hash", "pty_registration_attachment.storage_key"]);
  assert.deepEqual(ds.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
  const sk = w.q("SELECT command, reason_code FROM dk_event").map((x: any) => JSON.stringify(x)).join("");
  assert.equal(/pty\/[0-9a-f]{32}/.test(sk), false, "lịch sử phiếu không mang khoá kho");
});

const soLuotMang = (w: any): number => w.q("SELECT count(*) n FROM dk_upload_attempt")[0].n;
const soSuKien = (w: any): number => w.q("SELECT count(*) n FROM dk_event WHERE command = 'THEM_TEP'")[0].n;

test("Fix 1 — bảo trì BẬT ⇒ 503 `maintenance` cho người đăng ký (ADR-0206 Đ8), không dòng, không kho, không lượt đếm; TẮT lại thì tải được", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 1, ends_at = NULL WHERE id = 'default'");
  const r = await tai(w);
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "maintenance");
  assert.deepEqual([dongTep(w).length, w.r2.soLan.put, soSuKien(w), soLuotMang(w)], [0, 0, 0, 0]);
  assert.equal((await tai(w, { cookie: null })).status, 503, "chặn TRƯỚC khi kiểm cookie");
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  assert.equal((await tai(w)).status, 200);
});

test("Fix 2 — vượt trần trong khe đua (câu chèn đổi 0 dòng) ⇒ KHÔNG dòng lịch sử THEM_TEP và tệp cũ cùng ô không bị gỡ", async () => {
  const w = setup();
  const at = new Date().toISOString();
  // Giả khe đua: kiểm trước ở route thấy ít hơn trần, nhưng đến lúc chèn đã đủ — nhét tám dòng tệp chờ SAU lượt kiểm trước bằng cách hạ trần xuống 1 sau khi đã có 1 tệp.
  assert.equal((await tai(w)).status, 200);
  const cu = dongTep(w)[0];
  const { cauTepChoMoi } = await import("../parties/tep-cho.ts");
  const { suKienThemTepStatement } = await import("./repository.ts");
  const moi = cauTepChoMoi(w.env.DB, { registrationId: PHIEU, slot: TRUOC, contentKind: "png", byteSize: 3, contentHash: "e".repeat(64), actorRef: IDENT, toiDaMoiPhieu: 1 }, at);
  const kq = await w.env.DB.batch([moi.statements[0], suKienThemTepStatement(w.env.DB, { registrationId: PHIEU, identityId: IDENT, at }), moi.statements[1]]);
  assert.equal(kq[0].meta.changes, 0);
  assert.equal(soSuKien(w), 1, "chỉ còn dòng lịch sử của lần tải thành công trước");
  assert.equal(dongTep(w).length, 1);
  assert.equal(dongTep(w)[0].purged_at, null, cu.id);
});

test("Fix 3 — câu ghi tệp có điều kiện trạng thái phiếu: phiếu rời ĐANG ĐIỀN giữa lúc kiểm và lúc ghi ⇒ cả lô hỏng, không dòng tệp", async () => {
  const w = setup();
  const at = new Date().toISOString();
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(PHIEU);
  const { cauTepChoMoi } = await import("../parties/tep-cho.ts");
  const { suKienThemTepStatement } = await import("./repository.ts");
  const moi = cauTepChoMoi(w.env.DB, { registrationId: PHIEU, slot: TRUOC, contentKind: "png", byteSize: 3, contentHash: "f".repeat(64), actorRef: IDENT, toiDaMoiPhieu: 8 }, at);
  await assert.rejects(w.env.DB.batch([moi.statements[0], suKienThemTepStatement(w.env.DB, { registrationId: PHIEU, identityId: IDENT, at }), moi.statements[1]]), /dk_event_tep_status/);
  assert.equal(dongTep(w).length, 0, "lô hỏng ⇒ dòng tệp đã chèn bị huỷ");
  assert.equal(soSuKien(w), 0);
});

test("Fix 4 — chỗ theo địa chỉ mạng chỉ đặt SAU khi tệp qua kiểm tra, và không đặt khi gửi lại cùng tệp (tải dở dang)", async () => {
  const w = setup();
  for (const x of [{ bytes: new TextEncoder().encode("<html/>") }, { slot: "O_LA" }, { body: { o: TRUOC, noiDung: "@@@@" } }]) await tai(w, x);
  assert.equal(soLuotMang(w), 0, "tệp bị từ chối 415/400 không tốn lượt");
  w.r2.hong.put = true;
  await tai(w);
  assert.equal(soLuotMang(w), 1);
  w.r2.hong.put = false;
  assert.equal((await tai(w)).status, 200);
  assert.equal(soLuotMang(w), 1, "gửi lại đúng tệp sau «tải dở dang» không tốn thêm lượt");
});

test("Fix 5 — thiếu Content-Length ⇒ 411, không đọc thân, không dòng", async () => {
  const w = setup();
  const r = await tai(w, { khongContentLength: true });
  assert.equal(r.status, 411, r.text);
  assert.deepEqual([dongTep(w).length, w.r2.soLan.put, soLuotMang(w)], [0, 0, 0]);
});

test("ADR-0212 Đ4, Đ7: ô ảnh GPKD, giấy phép thêm chỉ nhận khi chính sách riêng tư đang hiệu lực có dấu thu thông tin tổ chức; đóng ⇒ 409, không chạm kho", async () => {
  const w = setup();
  const chinhSach = (v: number, coToChuc: 0 | 1) => {
    const at = new Date(Date.now() - 3_600_000).toISOString();
    w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES (?, ?, 'mục đích', 'Toàn văn.', ?, ?, 'x', ?, 'x', ?)")
      .run(`cs-${v}`, v, at, at, at, coToChuc);
  };
  for (const slot of ["GPKD", "GIAY_PHEP_THEM"]) {
    const r = await tai(w, { slot });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "org_section_closed");
  }
  chinhSach(1, 0);
  assert.equal((await tai(w, { slot: "GPKD" })).status, 409, "bản hiệu lực chưa có dấu");
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(dongTep(w).length, 0);
  chinhSach(2, 1);
  const r = await tai(w, { slot: "GPKD" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { tep: [{ o: "GPKD", trangThai: "DA_GUI" }] });
  assert.equal((await tai(w, { slot: "GIAY_PHEP_THEM", bytes: heic(40) })).status, 200);
  assert.equal((await tai(w, { slot: TRUOC })).status, 200, "ô cá nhân không đổi");
});

// ---- Gỡ tệp chờ của chính người đăng ký (đợt 2 Task 8, ruling điều phối: ngõ cụt `org_photo_without_org`) ----
const DUONG_GO = DUONG; // gỡ = nhánh `go: true` của chính route tải tệp (không thêm route: gói Đơn hàng không còn khoảng dư — src/goi-trang-nhe.test.ts)
async function go(w: any, o: { slot?: unknown; cookie?: string | null; headers?: Record<string, string> } = {}) {
  const ck = o.cookie === undefined ? await cookie(w) : o.cookie;
  const body = { o: o.slot ?? TRUOC, go: true };
  return w.call("POST", DUONG_GO, { body, headers: { ...(ck ? { cookie: ck } : {}), "content-length": String(Buffer.byteLength(JSON.stringify(body))), ...(o.headers ?? {}) } });
}
function moPhanToChuc(w: any): void {
  const at = new Date(Date.now() - 3_600_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES ('cs-go', 1, 'mục đích', 'Toàn văn.', ?, ?, 'x', ?, 'x', 1)").run(at, at, at);
}

test("gỡ tệp chờ: ô có tệp ⇒ 200, tệp bị quyết gỡ, kho xoá, DTO không còn ô đó, có dòng lịch sử GO_TEP không mang tên ô; ô khác giữ nguyên", async () => {
  const w = setup();
  moPhanToChuc(w);
  assert.equal((await tai(w, { slot: "GPKD" })).status, 200);
  assert.equal((await tai(w, { slot: TRUOC })).status, 200);
  const khoa = dongTep(w).find((d) => d.slot === "GPKD").storage_key;
  const r = await go(w, { slot: "GPKD" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { tep: [{ o: TRUOC, trangThai: "DA_GUI" }] });
  const d = dongTep(w);
  assert.equal(d.find((x) => x.slot === "GPKD").purge_reason, "NGUOI_DANG_KY_GO");
  assert.equal(d.find((x) => x.slot === TRUOC).purged_at, null);
  assert.equal(w.r2.co(khoa), false, "kho đã xoá");
  const su = w.q("SELECT actor_kind, command, reason_code FROM dk_event WHERE command = 'GO_TEP'").map((x: any) => ({ ...x }));
  assert.deepEqual(su, [{ actor_kind: "REGISTRANT", command: "GO_TEP", reason_code: null }]);
  assert.match(r.headers.get("set-cookie") ?? "", new RegExp(`^${DK_COOKIE}=dk1\\.`));
  // Gỡ lại ô đã trống: 200, không dòng lịch sử thêm (không có gì để gỡ).
  assert.equal((await go(w, { slot: "GPKD" })).status, 200);
  assert.equal(w.q("SELECT count(*) n FROM dk_event WHERE command = 'GO_TEP'")[0].n, 1);
});

test("gỡ tệp chờ: gỡ được cả khi phần tổ chức đã đóng (lối thoát khỏi org_photo_without_org); sau khi gỡ có thể tải lại ô khác", async () => {
  const w = setup();
  moPhanToChuc(w);
  assert.equal((await tai(w, { slot: "GPKD" })).status, 200);
  const at = new Date(Date.now() - 60_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES ('cs-go-2', 2, 'mục đích', 'Toàn văn.', ?, ?, 'x', ?, 'x', 0)").run(at, at, at);
  assert.equal((await tai(w, { slot: "GPKD" })).status, 409, "phần tổ chức đã đóng");
  assert.equal((await go(w, { slot: "GPKD" })).status, 200);
  assert.deepEqual(w.q("SELECT count(*) n FROM pty_registration_attachment WHERE purged_at IS NULL")[0].n, 0);
});

test("gỡ tệp chờ: không cookie, ô lạ, phiếu đã gửi (CHỜ XÁC MINH) ⇒ 401, 400, 409; tệp nguyên vẹn; bảo trì ⇒ 503", async () => {
  const w = setup();
  assert.equal((await tai(w)).status, 200);
  assert.equal((await go(w, { cookie: null })).status, 401);
  assert.equal((await go(w, { slot: "O_LA" })).status, 400);
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 1, ends_at = NULL WHERE id = 'default'");
  assert.equal((await go(w)).status, 503);
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(PHIEU);
  const r = await go(w);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_not_editable");
  assert.equal(dongTep(w)[0].purged_at, null);
});

test("gỡ tệp chờ: dòng lịch sử đứng trước và canh trạng thái phiếu; phiếu rời ĐANG ĐIỀN giữa lúc kiểm và lúc ghi ⇒ không gỡ gì", async () => {
  const w = setup();
  assert.equal((await tai(w)).status, 200);
  const { cauGoTepChoCuaONeuTruocDoi } = await import("../parties/tep-cho.ts");
  const { suKienGoTepStatement } = await import("./repository.ts");
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(PHIEU);
  const at = new Date().toISOString();
  const kq = await w.env.DB.batch([suKienGoTepStatement(w.env.DB, { registrationId: PHIEU, identityId: IDENT, at }), cauGoTepChoCuaONeuTruocDoi(w.env.DB, PHIEU, TRUOC, at)]);
  assert.deepEqual(kq.map((x: any) => x.meta.changes), [0, 0]);
  assert.equal(dongTep(w)[0].purged_at, null);
});
