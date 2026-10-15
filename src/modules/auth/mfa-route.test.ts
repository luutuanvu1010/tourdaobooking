// ADR-0074 điều 5 (kế hoạch Phần B Task 5): TỰ bật / đổi / gỡ ứng dụng xác thực, mã dự phòng, quên máy được tin — route /api/account/mfa* (module accounts:
// lô ghi kèm nhật ký, mà auth không import audit). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bản e2e: tests/e2e/hai-lop.mjs (phần Task 5).
// Cũng là bài KHÔNG LỘ của các route này (đặc tả §6 quy tắc 5): khoá TOTP (thô / đã mã hoá), mã, mã dự phòng không có trong thân GET, nhật ký, log máy.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";
import { base32Decode, totpCode, TOTP_PERIOD } from "./totp.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADMIN = "44444444-4444-4444-8444-444444444444";
const DOI_TAC = "55555555-5555-4555-8555-555555555555";
const SALES2 = "11111111-1111-4111-8111-111111111112";
const PIN = "135790";
const KHOA = Buffer.alloc(32, 9).toString("base64"); // khoá mã hoá hai lớp GIẢ của bài
const MA_DU_PHONG_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{4}-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/;

async function setup() {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADMIN, phone: "0900000004", name: "Quản", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: DOI_TAC, phone: "0900000005", name: "Đối Tác", perms: ["PARTNER"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  return w;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Bước TOTP hiện tại; nếu sắp sang bước mới (< 3 giây) thì chờ qua mốc — bài dùng bước s−1, s, s+1 không bị trượt khỏi cửa sổ ±1 của máy chủ. */
async function buocAnToan(): Promise<number> {
  const du = Date.now() % (TOTP_PERIOD * 1000);
  if (du > TOTP_PERIOD * 1000 - 3000) await sleep(TOTP_PERIOD * 1000 - du + 50);
  return Math.floor(Date.now() / (TOTP_PERIOD * 1000));
}
const maCua = (b32: string, buoc: number) => totpCode(base32Decode(b32), buoc);
/** Dòng SQLite (node:sqlite trả đối tượng không prototype) → đối tượng thường để so deepEqual. */
const dong = (w: any, sql: string, ...a: unknown[]) => w.q(sql, ...a).map((x: any) => ({ ...x }));

let ipn = 0;
const ip = () => `198.51.100.${(++ipn % 250) + 1}`;
const cookieTen = (r: any, ten: string): string | null => {
  const c = (r.headers.getSetCookie() as string[]).find((x) => x.startsWith(`${ten}=`) && !x.startsWith(`${ten}=;`));
  return c ? c.split(";")[0]! : null;
};
const pinLogin = (w: any, phone: string, cookie?: string) =>
  w.call("POST", "/api/auth/login", { body: { phone, pin: PIN }, headers: { "cf-connecting-ip": ip(), ...(cookie ? { cookie } : {}) } });
const verify = (w: any, pending: string | null, body: unknown) =>
  w.call("POST", "/api/auth/mfa/verify", { body, headers: { "cf-connecting-ip": ip(), cookie: pending ?? "" } });
const start = (w: any, as: string) => w.call("POST", "/api/account/mfa/totp/start", { as, body: {} });
const confirm = (w: any, as: string, body: unknown) => w.call("POST", "/api/account/mfa/totp/confirm", { as, body });
const trangThai = (w: any, as: string) => w.call("GET", "/api/account/mfa", { as });

/** Bật TOTP lần đầu cho `as`: trả khoá base32 + 10 mã dự phòng + bước đã dùng lúc xác nhận. */
async function batLanDau(w: any, as: string) {
  const s = await start(w, as);
  assert.equal(s.status, 200, s.text);
  const buoc = (await buocAnToan()) - 1;
  const r = await confirm(w, as, { setupToken: s.json.setupToken, code: await maCua(s.json.secret, buoc) });
  assert.equal(r.status, 200, r.text);
  return { b32: s.json.secret as string, setupToken: s.json.setupToken as string, codes: r.json.recoveryCodes as string[], buoc };
}

/** Bắt mọi dòng log máy chủ trong lúc chạy `f` (bài không lộ). */
async function batLog<T>(f: () => Promise<T>): Promise<{ kq: T; log: string }> {
  const goc = { log: console.log, warn: console.warn, error: console.error };
  let log = "";
  const ghi = (...a: unknown[]) => void (log += a.map(String).join(" ") + "\n");
  console.log = ghi; console.warn = ghi; console.error = ghi;
  try {
    return { kq: await f(), log };
  } finally {
    Object.assign(console, goc);
  }
}

test("GET /api/account/mfa chưa bật: nội bộ bắt buộc (kèm hạn ân hạn), Quản trị chỉ TOTP, Đối tác không bắt buộc", async () => {
  const w = await setup();
  const s = await trangThai(w, SALES);
  assert.equal(s.status, 200, s.text);
  assert.equal(s.json.required, true);
  assert.ok(Date.parse(s.json.graceUntil) > Date.now() + 13 * 86400_000, "ân hạn 14 ngày từ lúc tạo");
  assert.deepEqual({ ...s.json, graceUntil: null }, { required: true, graceUntil: null, factors: [], allowed: ["TOTP", "EMAIL"], recoveryLeft: 0, trustedDevices: [] });
  assert.deepEqual((await trangThai(w, ADMIN)).json.allowed, ["TOTP"]);
  const dt = await trangThai(w, DOI_TAC);
  assert.equal(dt.json.required, false);
  assert.equal(dt.json.graceUntil, null);
  assert.deepEqual(dt.json.allowed, ["TOTP", "EMAIL"]);
});

test("bắt đầu bật: trả khoá base32 + otpauth (không SĐT) + phiếu bật; CHƯA ghi gì vào CSDL", async () => {
  const w = await setup();
  const r = await start(w, SALES);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ["otpauth", "secret", "setupToken"]);
  assert.match(r.json.secret, /^[A-Z2-7]{32}$/, "20 byte → 32 ký tự base32");
  assert.equal(r.json.otpauth, `otpauth://totp/Tour%20%C4%90%E1%BA%A3o%3AAn?secret=${r.json.secret}&issuer=Tour%20%C4%90%E1%BA%A3o&digits=6&period=30`);
  assert.ok(!r.text.includes("0900000001"), "không lộ SĐT");
  assert.match(r.json.setupToken, /^ts1\./);
  assert.ok(!r.json.setupToken.includes(r.json.secret), "phiếu chỉ mang khoá ĐÃ mã hoá");
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_factor")[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action LIKE 'mfa_%'")[0].n, 0);
});

test("xác nhận: mã sai → 401 không ghi gì; mã đúng → TOTP sống (bước đã dùng), 10 mã dự phòng một lần, nhật ký mfa_enabled chỉ ghi loại", async () => {
  const w = await setup();
  const s = await start(w, SALES);
  const sai = await confirm(w, SALES, { setupToken: s.json.setupToken, code: "000000" });
  assert.equal(sai.status, 401, sai.text);
  assert.equal(sai.json.error.code, "invalid_code");
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_factor")[0].n, 0);
  const buoc = await buocAnToan();
  const r = await confirm(w, SALES, { setupToken: s.json.setupToken, code: await maCua(s.json.secret, buoc) });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json), ["recoveryCodes"]);
  assert.equal(r.json.recoveryCodes.length, 10);
  for (const c of r.json.recoveryCodes) assert.match(c, MA_DU_PHONG_RE);
  assert.equal(new Set(r.json.recoveryCodes).size, 10);
  const [f] = w.q("SELECT kind, secret_enc, last_totp_step, created_by FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL", SALES);
  assert.equal(f.kind, "TOTP");
  assert.match(f.secret_enc, /^v1\./);
  assert.equal(f.last_totp_step, buoc, "bước vừa khớp đã tiêu — mã dùng để bật không đăng nhập được");
  assert.equal(f.created_by, SALES);
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ? AND used_at IS NULL AND revoked_at IS NULL", SALES)[0].n, 10);
  const nk = dong(w, "SELECT staff_id, action, target_type, target_id, detail FROM audit_log WHERE action LIKE 'mfa_%'");
  assert.deepEqual(nk, [{ staff_id: SALES, action: "mfa_enabled", target_type: "staff", target_id: SALES, detail: "TOTP" }]);
  const st = await trangThai(w, SALES);
  assert.equal(st.json.required, false);
  assert.equal(st.json.graceUntil, null);
  assert.equal(st.json.recoveryLeft, 10);
  assert.deepEqual(st.json.factors.map((x: any) => Object.keys(x).sort()), [["createdAt", "kind"]]);
  assert.equal(st.json.factors[0].kind, "TOTP");

  // Mã vừa dùng để bật không qua được bước hai của đăng nhập (chống dùng lại).
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.ok(p, "đã bật thì PIN đúng phải hỏi mã");
  assert.equal((await verify(w, p, { method: "TOTP", code: await maCua(s.json.secret, buoc), trustDevice: false })).status, 401);
  assert.equal((await verify(w, p, { method: "TOTP", code: await maCua(s.json.secret, buoc + 1), trustDevice: false })).status, 200);
});

test("phiếu bật: của người khác hoặc rác → 400 setup_expired; dùng lại phiếu sau khi đã bật → phải nhập mã hiện tại", async () => {
  const w = await setup();
  const s = await start(w, SALES);
  const buoc = await buocAnToan();
  const khac = await confirm(w, SALES2, { setupToken: s.json.setupToken, code: await maCua(s.json.secret, buoc) });
  assert.equal(khac.status, 400, khac.text);
  assert.equal(khac.json.error.code, "setup_expired");
  assert.equal((await confirm(w, SALES, { setupToken: "ts1.rac", code: "123456" })).json.error.code, "setup_expired");
  assert.equal((await confirm(w, SALES, { code: "123456" })).json.error.code, "setup_expired");
  assert.equal((await confirm(w, SALES, { setupToken: s.json.setupToken, code: await maCua(s.json.secret, buoc - 1) })).status, 200);
  const lai = await confirm(w, SALES, { setupToken: s.json.setupToken, code: await maCua(s.json.secret, buoc) });
  assert.equal(lai.status, 400, lai.text);
  assert.equal(lai.json.error.code, "current_code_required");
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ?", SALES)[0].n, 1);
});

test("đổi sang khoá mới: cần mã hiện tại (mã dự phòng được); thay TOTP cũ trong cùng lô, KHÔNG sinh bộ mã dự phòng mới", async () => {
  const w = await setup();
  const a = await batLanDau(w, SALES);
  const s2 = await start(w, SALES);
  const buoc = await buocAnToan();
  const ma2 = await maCua(s2.json.secret, buoc);
  const sai = await confirm(w, SALES, { setupToken: s2.json.setupToken, code: ma2, currentCode: "222222" });
  assert.equal(sai.status, 401, sai.text);
  assert.equal(sai.json.error.code, "invalid_code");
  const r = await confirm(w, SALES, { setupToken: s2.json.setupToken, code: ma2, currentCode: a.codes[0]!.toUpperCase() });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, {}, "đổi khoá không trả bộ mã mới");
  const rows = w.q("SELECT valid_to_at IS NULL AS song FROM aut_mfa_factor WHERE staff_id = ? ORDER BY created_at, id", SALES);
  assert.deepEqual(rows.map((x: any) => x.song).sort(), [0, 1]);
  assert.equal((await trangThai(w, SALES)).json.recoveryLeft, 9, "mã dự phòng đã dùng làm mã hiện tại bị tiêu");
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 0, "mã hiện tại đúng xoá bộ đếm");
  // Khoá cũ hết tác dụng ở đăng nhập, khoá mới dùng được.
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await verify(w, p, { method: "TOTP", code: await maCua(a.b32, buoc + 1), trustDevice: false })).status, 401);
  assert.equal((await verify(w, p, { method: "TOTP", code: await maCua(s2.json.secret, buoc + 1), trustDevice: false })).status, 200);
});

test("gỡ: tài khoản nội bộ không gỡ được yếu tố cuối (409, không tiêu lượt thử); Đối tác gỡ được — mã dự phòng, máy tin bị thu hồi, đăng nhập lại không hỏi mã", async () => {
  const w = await setup();
  const a = await batLanDau(w, SALES);
  const chan = await w.call("POST", "/api/account/mfa/remove", { as: SALES, body: { kind: "TOTP", code: a.codes[0] } });
  assert.equal(chan.status, 409, chan.text);
  assert.deepEqual(chan.json.error, { code: "mfa_last_factor", message: "Tài khoản nội bộ phải giữ ít nhất một cách xác thực." });
  assert.equal((await trangThai(w, SALES)).json.recoveryLeft, 10, "bị chặn thì không tiêu mã");
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL", SALES)[0].n, 1);
  assert.equal((await w.call("POST", "/api/account/mfa/remove", { as: SALES, body: { kind: "SMS", code: a.codes[0] } })).status, 400);

  const d = await batLanDau(w, DOI_TAC);
  assert.equal(d.codes.length, 10, "Đối tác tự bật được");
  const p = cookieTen(await pinLogin(w, "0900000005"), "td_mfa_pending")!;
  const v = await verify(w, p, { method: "TOTP", code: await maCua(d.b32, d.buoc + 1), trustDevice: true });
  assert.equal(v.status, 200, v.text);
  assert.equal((await w.call("POST", "/api/account/mfa/remove", { as: DOI_TAC, body: { kind: "EMAIL", code: d.codes[0] } })).status, 404, "chưa bật email");
  const sai = await w.call("POST", "/api/account/mfa/remove", { as: DOI_TAC, body: { kind: "TOTP", code: "zzzz-zzzz" } });
  assert.equal(sai.status, 401, sai.text);
  const go = await w.call("POST", "/api/account/mfa/remove", { as: DOI_TAC, body: { kind: "TOTP", code: d.codes[1] } });
  assert.equal(go.status, 200, go.text);
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL", DOI_TAC)[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ? AND used_at IS NULL AND revoked_at IS NULL", DOI_TAC)[0].n, 0);
  assert.deepEqual(dong(w, "SELECT revoke_reason FROM aut_trusted_device WHERE staff_id = ?", DOI_TAC), [{ revoke_reason: "tat_hai_lop" }]);
  assert.deepEqual(dong(w, "SELECT action, detail FROM audit_log WHERE staff_id = ? AND action LIKE 'mfa_%' ORDER BY rowid", DOI_TAC), [
    { action: "mfa_enabled", detail: "TOTP" },
    { action: "mfa_removed", detail: "TOTP" },
  ]);
  const lai = await pinLogin(w, "0900000005");
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.staff.id, DOI_TAC, "không còn yếu tố → Đối tác vào bằng PIN như cũ");
  // Bật lại: bộ mã cũ không sống lại, đúng 10 mã mới.
  const b = await batLanDau(w, DOI_TAC);
  assert.equal(b.codes.length, 10);
  assert.equal((await trangThai(w, DOI_TAC)).json.recoveryLeft, 10);
});

test("tạo bộ mã dự phòng mới: cần mã TOTP hiện tại; bộ cũ hết hiệu lực; nhật ký mfa_recovery_regenerated", async () => {
  const w = await setup();
  assert.equal((await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: "123456" } })).status, 409, "chưa bật thì không có gì để tạo lại");
  const a = await batLanDau(w, SALES);
  assert.equal((await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: "000000" } })).status, 401);
  assert.equal((await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: a.codes[0] } })).status, 401, "chỉ nhận mã TOTP");
  const r = await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: await maCua(a.b32, a.buoc + 1) } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.recoveryCodes.length, 10);
  for (const c of r.json.recoveryCodes) assert.ok(!a.codes.includes(c));
  assert.equal((await trangThai(w, SALES)).json.recoveryLeft, 10);
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ? AND revoked_at IS NOT NULL", SALES)[0].n, 10);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_recovery_regenerated' AND staff_id = ? AND detail = 'TOTP'", SALES)[0].n, 1);
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await verify(w, p, { method: "RECOVERY", code: a.codes[3], trustDevice: false })).status, 401, "mã của bộ cũ hết hiệu lực");
  const v = await verify(w, p, { method: "RECOVERY", code: r.json.recoveryCodes[0], trustDevice: false });
  assert.equal(v.status, 200, v.text);
  assert.equal(v.json.recoveryLeft, 9);
  assert.equal((await trangThai(w, SALES)).json.recoveryLeft, 9, "recoveryLeft giảm sau khi dùng ở đăng nhập");
});

test("hạn mức theo tài khoản cho mã hiện tại: 5 lần sai → lần 6 là 429 (cùng bộ đếm mfa:<id> của đăng nhập)", async () => {
  const w = await setup();
  const a = await batLanDau(w, SALES);
  for (let i = 0; i < 5; i++) {
    assert.equal((await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: "000000" } })).status, 401, `lần ${i + 1}`);
  }
  const r = await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: await maCua(a.b32, a.buoc + 1) } });
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "too_many_attempts");
  assert.ok(Number(r.headers.get("retry-after")) > 0);
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await verify(w, p, { method: "RECOVERY", code: a.codes[0], trustDevice: false })).status, 429, "bước hai của đăng nhập cũng bị khoá");
});

test("máy được tin: danh sách (thisDevice theo phiên), quên một máy, quên mọi máy → lần sau bị hỏi mã", async () => {
  const w = await setup();
  const a = await batLanDau(w, SALES);
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const v = await verify(w, p, { method: "RECOVERY", code: a.codes[0], trustDevice: true });
  assert.equal(v.status, 200, v.text);
  const tin = cookieTen(v, "td_trusted")!;
  const st = await trangThai(w, SALES);
  assert.equal(st.json.trustedDevices.length, 1);
  const may = st.json.trustedDevices[0];
  assert.deepEqual(Object.keys(may).sort(), ["createdAt", "id", "label", "lastUsedAt", "thisDevice"]);
  assert.equal(may.thisDevice, true, "phiên hiện tại cấp qua máy này");
  assert.equal((await w.call("POST", "/api/account/mfa/trusted/not-a-uuid/forget", { as: SALES, body: {} })).status, 404);
  assert.equal((await w.call("POST", `/api/account/mfa/trusted/${may.id}/forget`, { as: SALES2, body: {} })).status, 404, "không quên được máy của người khác");
  const q = await w.call("POST", `/api/account/mfa/trusted/${may.id}/forget`, { as: SALES, body: {} });
  assert.equal(q.status, 200, q.text);
  assert.equal((await w.call("POST", `/api/account/mfa/trusted/${may.id}/forget`, { as: SALES, body: {} })).status, 404, "đã quên");
  assert.deepEqual(dong(w, "SELECT revoke_reason, updated_by FROM aut_trusted_device WHERE id = ?", may.id), [{ revoke_reason: "quen_may", updated_by: SALES }]);
  assert.equal((await pinLogin(w, "0900000001", tin)).json.next, "mfa");

  // Quên mọi máy.
  const p2 = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const v2 = await verify(w, p2, { method: "RECOVERY", code: a.codes[1], trustDevice: true });
  const tin2 = cookieTen(v2, "td_trusted")!;
  assert.equal((await pinLogin(w, "0900000001", tin2)).json.staff?.id, SALES, "trước khi quên: vào thẳng");
  const all = await w.call("POST", "/api/account/mfa/trusted/forget-all", { as: SALES, body: {} });
  assert.equal(all.status, 200, all.text);
  assert.equal(all.json.revoked, 1);
  assert.equal((await pinLogin(w, "0900000001", tin2)).json.next, "mfa", "quên mọi máy → lần sau bị hỏi mã");
  assert.deepEqual((await trangThai(w, SALES)).json.trustedDevices, []);
});

test("thiếu MFA_ENCRYPTION_KEY: bắt đầu bật trả 503 + log mfa_key_missing (không in khoá); xác nhận cũng 503", async () => {
  const w = await setup();
  const s = await start(w, SALES);
  delete w.env.MFA_ENCRYPTION_KEY;
  const { kq, log } = await batLog(async () => [await start(w, SALES), await confirm(w, SALES, { setupToken: s.json.setupToken, code: await maCua(s.json.secret, await buocAnToan()) })]);
  for (const r of kq) {
    assert.equal(r.status, 503, r.text);
    assert.deepEqual(r.json.error, { code: "mfa_unavailable", message: "Máy chủ chưa cấu hình khoá bảo mật hai lớp. Báo IT." });
  }
  assert.match(log, /mfa_key_missing/);
  assert.ok(!log.includes(KHOA));
  assert.equal(w.q("SELECT count(*) AS n FROM aut_mfa_factor")[0].n, 0);
});

test("KHÔNG LỘ: GET /api/account/mfa, nhật ký, log máy không chứa khoá (thô / mã hoá), mã, mã dự phòng", async () => {
  const w = await setup();
  const { kq, log } = await batLog(async () => {
    const a = await batLanDau(w, SALES);
    const r = await w.call("POST", "/api/account/mfa/recovery/regenerate", { as: SALES, body: { code: await maCua(a.b32, a.buoc + 1) } });
    const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
    await verify(w, p, { method: "RECOVERY", code: r.json.recoveryCodes[0], trustDevice: true });
    const get = await trangThai(w, SALES);
    return { a, moi: r.json.recoveryCodes as string[], get: get.text, ma: await maCua(a.b32, a.buoc + 1) };
  });
  const enc = w.q("SELECT secret_enc FROM aut_mfa_factor WHERE staff_id = ?", SALES)[0].secret_enc as string;
  const dau = [kq.a.b32, enc, enc.split(".")[2]!, kq.ma, ...kq.a.codes, ...kq.moi, ...[...kq.a.codes, ...kq.moi].map((m) => m.replace("-", ""))];
  const nhatKy = JSON.stringify(w.q("SELECT * FROM audit_log"));
  for (const d of dau) {
    assert.ok(!kq.get.includes(d), `GET chứa "${d}"`);
    assert.ok(!nhatKy.includes(d), `nhật ký chứa "${d}"`);
    assert.ok(!log.includes(d), `log máy chứa "${d}"`);
  }
  assert.doesNotMatch(kq.get, /secret|code_hash|token_hash|setupToken/i);
});
