// KÍCH HOẠT qua route thật (ADR-0207 Đ7; đợt 1 Task 9): người được duyệt tự đặt PIN bằng `POST /api/dang-ky/phieu/dat-pin` — cookie đăng ký + MÃ EMAIL MỚI. Khung thử THẬT
// (tests/audit/harness.mjs, SQLite thật); phiếu đi bước xác minh + duyệt bằng ROUTE thật (như duyet-route.test.ts), nên tài khoản tắt, hạn kích hoạt, danh tính do mã thật ghi.
// Mã email: một ca đi đường thật `POST /api/dang-ky/ma` (Turnstile và hộp thư GIẢ, như xin-ma-route.test.ts); các ca khác gieo dòng mã băm bằng đúng `khoaBam` của route.
import { after, test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, SECRET } from "../../../tests/audit/harness.mjs";
import { DK_COOKIE, khoaBam, taoPhienDangKy } from "./phien.ts";

const goc = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  if (!String(url).includes("challenges.cloudflare.com")) return goc(url, init);
  return new Response(JSON.stringify({ success: new URLSearchParams(String(init?.body)).get("response") === "token-tot", "error-codes": [] }), { status: 200 });
}) as typeof fetch;
after(() => { globalThis.fetch = goc; });

const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "99999999-9999-4999-8999-999999999999";
const AT = "2026-11-10T00:00:00.000Z";
const DT = "0912 345 678";
const DT_KHOA = "0912345678";
const PIN = "246813";
const MUC = ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"];
let dem = 0;

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', 'x', '${AT}', 'x')`);
  return w;
}
/** Phiếu đã gửi bản khai 1, đi xác minh + duyệt bằng route thật ⇒ ĐÃ DUYỆT, tài khoản TẮT. Trả mã phiếu, mã danh tính, email (subject). */
async function phieuDaDuyet(w: any): Promise<{ id: string; ident: string; email: string }> {
  const id = `DK_${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(dem % 18, (dem % 18) + 8)}`;
  dem++;
  const ident = `ident-${id}`;
  const email = `khach-${id.toLowerCase()}@example.com`;
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'TRAVEL_AGENCY', ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(ident, id, email, "lien-he@example.com", AT, AT);
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, 'Phạm', 'Thử Nghiệm', '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, 'CCCD', '079 000 000 111', '079000000111', '2021-01-02', 'Cục thử', '2040-01-02', 'pol', ?, ?, ?)`)
    .run(`sub-${id}`, id, DT, DT_KHOA, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
  for (const m of MUC) assert.equal((await w.call("POST", `/api/dang-ky/phieu/${id}/ket-luan`, { as: ADM, body: { phienBan: 1, muc: m, dat: true } })).status, 200, m);
  assert.equal((await w.call("POST", `/api/dang-ky/phieu/${id}/dat`, { as: ADM, body: { phienBan: 1, hoSo: { kieu: "MOI" } } })).status, 200);
  const r = await w.call("POST", `/api/dang-ky/phieu/${id}/duyet`, { as: HR, body: { roleCode: "TRAVEL_AGENCY", phienBan: 1 } });
  assert.equal(r.status, 200, r.text);
  return { id, ident, email };
}
const cookie = async (id: string, ident: string, nowMs = Date.now()) => `${DK_COOKIE}=${await taoPhienDangKy(SECRET, id, ident, nowMs)}`;
/** Gieo một mã email MỚI cho `email`, băm đúng như route xin mã (khoá băm có khoá của phien.ts). */
async function gieoMa(w: any, email: string, ma = "482915", o: { tuoiPhut?: number } = {}): Promise<string> {
  const id = crypto.randomUUID();
  const emailKey = await khoaBam(SECRET, "email", email);
  const tao = Date.now() - (o.tuoiPhut ?? 0) * 60_000;
  w.sqlite.prepare("INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)")
    .run(id, emailKey, await khoaBam(SECRET, "ma", `${id}:${emailKey}:${ma}`), new Date(tao + 10 * 60_000).toISOString(), new Date(tao).toISOString(), new Date(tao).toISOString());
  return ma;
}
const datPin = async (w: any, ck: string | null, body: unknown) => w.call("POST", "/api/dang-ky/phieu/dat-pin", { body, headers: ck ? { cookie: ck } : {} });
const tk = (w: any) => w.q("SELECT * FROM staff WHERE phone = ?", DT_KHOA)[0];
const reg = (w: any, id: string) => w.q("SELECT * FROM dk_registration WHERE id = ?", id)[0];
const dt = (w: any, ident: string) => w.q("SELECT * FROM dk_identity WHERE id = ?", ident)[0];
const n = (w: any, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const dangNhap = (w: any, pin: string) => w.call("POST", "/api/auth/login", { body: { phone: DT_KHOA, pin, turnstileToken: "token-tot" }, headers: { "cf-connecting-ip": "198.51.100.7" } });
function batLog(): { dong: string[]; tra: () => void } {
  const dong: string[] = [];
  const g = { log: console.log, warn: console.warn, error: console.error };
  for (const k of ["log", "warn", "error"] as const) console[k] = (...a: unknown[]) => { dong.push(a.map(String).join(" ")); };
  return { dong, tra: () => Object.assign(console, g) };
}

test("(1) Đường thật: xin mã MỚI → đặt PIN ⇒ tài khoản bật, không cookie td_session, phiên đăng ký kết thúc; đăng nhập bằng PIN vừa đặt qua route thật vào được; không staff_reactivated", async () => {
  const w = setup();
  w.env.TURNSTILE_SECRET_KEY = "khoa-bi-mat-thu";
  w.env.FEEDBACK_MAIL_FROM = "no-reply@booking.tourdao.vn";
  const thu: { to: string; text?: string }[] = [];
  w.env.EMAIL = { send: async (m: { to: string; text?: string }) => { thu.push(m); } };
  const { id, ident, email } = await phieuDaDuyet(w);
  const log = batLog();
  try {
    assert.equal((await dangNhap(w, PIN)).status, 401, "trước kích hoạt: tài khoản tắt");
    const xin = await w.call("POST", "/api/dang-ky/ma", { body: { email, turnstileToken: "token-tot" }, headers: { "cf-connecting-ip": "203.0.113.9" } });
    assert.equal(xin.status, 200, xin.text);
    await w.choNen();
    assert.equal(thu.length, 1);
    assert.equal(thu[0]!.to, email, "mã gửi tới email đã chứng minh của danh tính");
    const ma = /\b(\d{6})\b/.exec(thu[0]!.text ?? "")![1]!;
    const r = await datPin(w, await cookie(id, ident), { ma, pin: PIN });
    assert.equal(r.status, 200, r.text);
    const sc = r.headers.get("set-cookie") ?? "";
    assert.equal(/td_session=/.test(sc), false, "không cấp phiên td_session");
    assert.match(sc, new RegExp(`^${DK_COOKIE}=;.*Max-Age=0`), "phiên đăng ký kết thúc");
    assert.equal(/pin|\d{6}/i.test(r.text.replace(/daKichHoat/, "")), false, "phản hồi không chứa PIN");
    const t = tk(w);
    assert.equal(t.active, 1);
    assert.ok(t.credentials_changed_at, "đẩy credentials_changed_at");
    assert.equal(n(w, "SELECT count(*) n FROM aut_session WHERE staff_id = ?", t.id), 0, "route kích hoạt không ghi phiên nào");
    const p = reg(w, id);
    assert.ok(p.activated_at);
    assert.equal(p.status, "DA_DUYET");
    assert.deepEqual(w.q("SELECT kind, decided_by FROM dk_decision WHERE registration_id = ? AND kind = 'KICH_HOAT'", id).map((x: any) => ({ ...x })), [{ kind: "KICH_HOAT", decided_by: t.id }]);
    const d = dt(w, ident);
    assert.ok(d.erased_at, "danh tính ẩn danh");
    assert.equal(d.contact_email, null);
    assert.match(d.subject, /^XOA/);
    assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command = 'KICH_HOAT' AND actor_kind = 'REGISTRANT'", id), 1);
    assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE command = 'KICH_HOAT_LECH'"), 0, "lệnh dấu không bao giờ nằm lại");
    const nk = w.q("SELECT staff_id, agent_code, target_type, target_id, detail FROM audit_log WHERE action = 'registration_activated'").map((x: any) => ({ ...x }));
    assert.equal(nk.length, 1);
    assert.equal(nk[0].staff_id, t.id, "do CHÍNH tài khoản mới đứng tên");
    assert.equal(nk[0].agent_code, null);
    assert.equal(nk[0].target_id, id);
    assert.equal(n(w, "SELECT count(*) n FROM audit_log WHERE action = 'staff_reactivated'"), 0);
    const ok = await dangNhap(w, PIN);
    assert.equal(ok.status, 200, ok.text);
    assert.equal(n(w, "SELECT count(*) n FROM aut_session WHERE staff_id = ?", t.id), 1, "phiên do route Đăng nhập cấp");
    // Nhật ký, lịch sử, log không mang email, PIN, số điện thoại.
    const chu = [JSON.stringify(w.q("SELECT * FROM audit_log")), JSON.stringify(w.q("SELECT * FROM dk_event")), ...log.dong].join("\n");
    for (const bi of [email, "lien-he@example.com", PIN, DT_KHOA]) assert.equal(chu.includes(bi), false, `lộ ${bi}`);
  } finally {
    log.tra();
  }
});

test("(2) Thiếu mã / mã sai / mã đã dùng để vào phiên ⇒ 401; cookie đang mở một mình KHÔNG kích hoạt được; không đổi dòng nào", async () => {
  const w = setup();
  const { id, ident, email } = await phieuDaDuyet(w);
  const ck = await cookie(id, ident);
  assert.equal((await datPin(w, ck, { pin: PIN })).status, 401, "thiếu mã");
  await gieoMa(w, email, "482915");
  assert.equal((await datPin(w, ck, { ma: "000000", pin: PIN })).status, 401, "mã sai");
  // Mã dùng để vào phiên (nhập mã) đã bị tiêu ⇒ không dùng lại cho đặt PIN.
  await gieoMa(w, email, "135799");
  const vao = await w.call("POST", "/api/dang-ky/xac-nhan", { body: { email, ma: "135799" } });
  assert.equal(vao.status, 200, vao.text);
  assert.equal(vao.json.trangThai, "DA_DUYET");
  assert.equal((await datPin(w, ck, { ma: "135799", pin: PIN })).status, 401, "mã đã tiêu");
  assert.equal(tk(w).active, 0);
  assert.equal(reg(w, id).activated_at, null);
  assert.equal(dt(w, ident).contact_email, "lien-he@example.com");
  assert.equal(n(w, "SELECT count(*) n FROM dk_decision WHERE kind = 'KICH_HOAT'"), 0);
  assert.equal((await datPin(w, null, { ma: "135799", pin: PIN })).status, 401, "không cookie");
});

test("(3) Đặt PIN lần hai ⇒ 409; PIN cũ vẫn dùng được (không ghi đè)", async () => {
  const w = setup();
  const { id, ident, email } = await phieuDaDuyet(w);
  const ck = await cookie(id, ident);
  assert.equal((await datPin(w, ck, { ma: await gieoMa(w, email), pin: PIN })).status, 200);
  const hash = tk(w).pin_hash;
  const r = await datPin(w, ck, { ma: "111222", pin: "975318" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "activation_not_pending");
  assert.equal(tk(w).pin_hash, hash);
  assert.equal((await dangNhap(w, PIN)).status, 200);
});

test("(4) Quá hạn đặt PIN ⇒ 409 activation_expired TRƯỚC khi kiểm mã (mã không bị đốt); câu chốt cũng RAISE khi hạn qua giữa lúc kiểm và lúc ghi", async () => {
  const w = setup();
  const { id, ident, email } = await phieuDaDuyet(w);
  w.sqlite.prepare("UPDATE dk_registration SET activation_deadline_at = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), id);
  const ma = await gieoMa(w, email);
  const r = await datPin(w, await cookie(id, ident), { ma, pin: PIN });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "activation_expired");
  assert.equal(n(w, "SELECT count(*) n FROM dk_email_code WHERE attempts > 0"), 0, "mã chưa bị đốt");
  // Hạn qua NGAY TRƯỚC lô (sau mọi kiểm của route): câu chốt (trigger dk_activation_late) làm hỏng cả lô.
  w.sqlite.prepare("UPDATE dk_registration SET activation_deadline_at = ? WHERE id = ?").run(new Date(Date.now() + 3_600_000).toISOString(), id);
  w.chenTruocLo((stmts: any[]) => stmts.length >= 6, () => { w.sqlite.prepare("UPDATE dk_registration SET activation_deadline_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), id); });
  const r2 = await datPin(w, await cookie(id, ident), { ma: await gieoMa(w, email, "553311"), pin: PIN });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "activation_expired");
  assert.match(r2.json.error.message, /xin mã mới/, "mã đã bị tiêu trước lô ⇒ câu báo bảo xin mã mới");
  assert.equal(tk(w).active, 0);
  assert.equal(reg(w, id).activated_at, null);
  assert.equal(dt(w, ident).contact_email, "lien-he@example.com");
});

test("(5) Câu canh 0 dòng: tài khoản đã bật (khác đường) ⇒ cả lô hỏng, 409; không dòng quyết định, PIN không đổi, danh tính không ẩn danh, phiếu chưa có mốc kích hoạt", async () => {
  const w = setup();
  const { id, ident, email } = await phieuDaDuyet(w);
  w.sqlite.prepare("UPDATE staff SET active = 1 WHERE phone = ?").run(DT_KHOA);
  const hash = tk(w).pin_hash;
  const r = await datPin(w, await cookie(id, ident), { ma: await gieoMa(w, email), pin: PIN });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "activation_not_pending");
  assert.match(r.json.error.message, /xin mã mới/, "lô hỏng sau khi mã đã tiêu ⇒ câu báo bảo xin mã mới");
  assert.equal(n(w, "SELECT count(*) n FROM dk_decision WHERE kind = 'KICH_HOAT'"), 0);
  assert.equal(tk(w).pin_hash, hash);
  assert.equal(reg(w, id).activated_at, null);
  assert.equal(dt(w, ident).contact_email, "lien-he@example.com");
  assert.equal(n(w, "SELECT count(*) n FROM audit_log WHERE action = 'registration_activated'"), 0);
  assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE command IN ('KICH_HOAT', 'KICH_HOAT_LECH')"), 0);
});

test("(6) PIN sai dạng / quá dễ ⇒ 400 và mã KHÔNG bị tiêu (dùng lại với PIN hợp lệ được)", async () => {
  const w = setup();
  const { id, ident, email } = await phieuDaDuyet(w);
  const ck = await cookie(id, ident);
  const ma = await gieoMa(w, email);
  for (const pin of ["12345", "123456", "abcdef", 246813]) assert.equal((await datPin(w, ck, { ma, pin })).status, 400, String(pin));
  assert.equal((await datPin(w, ck, { ma, pin: PIN })).status, 200);
});

test("(7) Cookie của phiếu chưa duyệt ⇒ 409; cookie sai chữ ký ⇒ 401", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES ('DK_ZZZZZZZZ', 'PERSON', 'DANG_DIEN', '', ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES ('ident-z', 'DK_ZZZZZZZZ', 'EMAIL', 'z@example.com', 'z@example.com', ?, ?)").run(AT, AT);
  const r = await datPin(w, await cookie("DK_ZZZZZZZZ", "ident-z"), { ma: await gieoMa(w, "z@example.com"), pin: PIN });
  assert.equal(r.status, 409, r.text);
  assert.equal((await datPin(w, `${DK_COOKIE}=dk1.DK_ZZZZZZZZ.ident-z.1.2.xxxx`, { ma: "1", pin: PIN })).status, 401);
});

test("(T12) Danh sách tài khoản: tài khoản vừa duyệt mang chuaKichHoat = true (giao diện gọi «Chưa kích hoạt», không phải «Ngưng»); đặt PIN xong ⇒ false; tài khoản ngưng thường ⇒ false", async () => {
  const w = setup();
  w.env.TURNSTILE_SECRET_KEY = "khoa-bi-mat-thu";
  w.env.FEEDBACK_MAIL_FROM = "no-reply@booking.tourdao.vn";
  const thu: { to: string; text?: string }[] = [];
  w.env.EMAIL = { send: async (m: { to: string; text?: string }) => { thu.push(m); } };
  seedStaff(w.sqlite, { id: "11111111-1111-4111-8111-111111111119", phone: "0900000019", name: "Đã Ngưng", perms: ["SALES"] });
  w.sqlite.exec("UPDATE staff SET active = 0 WHERE phone = '0900000019'");
  const { id, ident, email } = await phieuDaDuyet(w);
  const dong = async () => {
    const r = await w.call("GET", "/api/staff", { as: HR });
    assert.equal(r.status, 200, r.text);
    return new Map((r.json.staff as { phone: string; chuaKichHoat: boolean }[]).map((s) => [s.phone, s.chuaKichHoat]));
  };
  let m = await dong();
  assert.equal(m.get(DT_KHOA), true, "vừa duyệt, chưa đặt PIN");
  // Vòng sửa 1 (I-1, rail nút theo cờ): cờ máy chủ của dòng chưa kích hoạt không mời bấm Đặt lại PIN / Tắt bảo mật hai lớp (máy chủ trả 409).
  const dongDu = ((await w.call("GET", "/api/staff", { as: HR })).json.staff as { phone: string; datLaiPinDuoc: boolean; canResetMfa: boolean }[]).find((s) => s.phone === DT_KHOA)!;
  assert.equal(dongDu.datLaiPinDuoc, false);
  assert.equal(dongDu.canResetMfa, false);
  assert.equal(m.get("0900000019"), false, "ngưng thường");
  assert.equal(m.get("0900000003"), false, "đang bật");
  assert.equal((await w.call("POST", "/api/dang-ky/ma", { body: { email, turnstileToken: "token-tot" }, headers: { "cf-connecting-ip": "203.0.113.19" } })).status, 200);
  await w.choNen();
  const ma = /\b(\d{6})\b/.exec(thu[0]!.text ?? "")![1]!;
  assert.equal((await datPin(w, await cookie(id, ident), { ma, pin: PIN })).status, 200);
  m = await dong();
  assert.equal(m.get(DT_KHOA), false, "đã kích hoạt");
});

test("(T12b) Danh sách tài khoản hỏi «chưa kích hoạt» bằng ĐÚNG MỘT truy vấn, dù có nhiều tài khoản tắt (không truy vấn theo dòng — vòng sửa 1, I-1)", async () => {
  const w = setup();
  for (let i = 0; i < 12; i++) {
    seedStaff(w.sqlite, { id: `11111111-1111-4111-8111-1111111111${String(i).padStart(2, "0")}`, phone: `09000002${String(i).padStart(2, "0")}`, name: `Tắt ${i}`, perms: ["SALES"] });
  }
  w.sqlite.exec("UPDATE staff SET active = 0 WHERE phone LIKE '09000002%'");
  await phieuDaDuyet(w);
  const goc = w.env.DB.prepare.bind(w.env.DB);
  const cau: string[] = [];
  w.env.DB.prepare = (sql: string) => { if (/FROM dk_registration/.test(sql)) cau.push(sql); return goc(sql); };
  try {
    const r = await w.call("GET", "/api/staff", { as: HR });
    assert.equal(r.status, 200, r.text);
    assert.equal(cau.length, 1, `số câu đọc dk_registration: ${cau.length}`);
    assert.match(cau[0]!, /SELECT DISTINCT staff_id FROM dk_registration/);
    const tat = (r.json.staff as { phone: string; chuaKichHoat: boolean }[]).filter((s) => s.chuaKichHoat).map((s) => s.phone);
    assert.deepEqual(tat, [DT_KHOA]);
  } finally {
    w.env.DB.prepare = goc;
  }
});
