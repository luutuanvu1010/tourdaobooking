// ADR-0074 điều 2–3 (kế hoạch Phần B Task 4): cổng lớp hai ở đăng nhập PIN + route xác minh mã, máy được tin. Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs) — không mạng, không Turnstile. Bản e2e trên wrangler dev thật: tests/e2e/hai-lop.mjs.
// Cũng là bài KHÔNG LỘ cho route mới (đặc tả §6 quy tắc 5): khoá TOTP, mã, mã dự phòng, token máy tin không có trong thân trả về, nhật ký, log máy.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";
import { encryptSecret, recoveryHash, sha256Hex } from "./mfa-crypto.ts";
import { base32Encode, totpCode, TOTP_PERIOD } from "./totp.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const DOI_TAC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PIN = "135790";
const KHOA = Buffer.alloc(32, 7).toString("base64"); // khoá mã hoá hai lớp GIẢ của bài
const BI_MAT = new Uint8Array(20).map((_, i) => (i * 37 + 11) & 255); // khoá TOTP GIẢ
const MA_DU_PHONG = ["abcd-efgh", "jkmn-pqrs", "tuvw-xyz2"];

async function setup() {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: DOI_TAC, phone: "0900000005", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  const at = new Date().toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES ('f1', ?, 'TOTP', ?, NULL, 0, ?, NULL, ?, ?, ?, ?)",
  ).run(SALES, await encryptSecret(KHOA, BI_MAT), at, at, SALES, at, SALES);
  for (const [i, m] of MA_DU_PHONG.entries()) {
    w.sqlite.prepare(
      "INSERT INTO aut_mfa_recovery_code (id, staff_id, batch_id, code_hash, created_at, created_by, updated_at, updated_by, used_at, revoked_at) VALUES (?, ?, 'b1', ?, ?, ?, ?, ?, NULL, NULL)",
    ).run(`r${i}`, SALES, await recoveryHash(SALES, m.replace("-", "")), at, SALES, at, SALES);
  }
  return w;
}
const ma = (lech = 0) => totpCode(BI_MAT, Math.floor(Date.now() / (TOTP_PERIOD * 1000)) + lech);
const cookieTen = (r: any, ten: string): string | null => {
  const c = (r.headers.getSetCookie() as string[]).find((x) => x.startsWith(`${ten}=`) && !x.startsWith(`${ten}=;`));
  return c ? c.split(";")[0]! : null;
};
const setCookieTen = (r: any, ten: string): string | undefined => (r.headers.getSetCookie() as string[]).find((x) => x.startsWith(`${ten}=`));
let ipn = 0;
const ip = () => `203.0.113.${(++ipn % 250) + 1}`;
const pinLogin = (w: any, phone: string, cookie?: string) =>
  w.call("POST", "/api/auth/login", { body: { phone, pin: PIN }, headers: { "cf-connecting-ip": ip(), ...(cookie ? { cookie } : {}) } });
const verify = (w: any, pending: string | null, body: unknown, them?: string) =>
  w.call("POST", "/api/auth/mfa/verify", { body, headers: { "cf-connecting-ip": ip(), cookie: [pending, them].filter(Boolean).join("; ") } });
const phienSong = (w: any, id: string) => w.q("SELECT id, method, trusted_device_id FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", id);

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

test("PIN đúng của tài khoản đã bật lớp hai: không cấp td_session, trả next=mfa + cookie chờ; last_login_at chưa ghi", async () => {
  const w = await setup();
  const r = await pinLogin(w, "0900000001");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { next: "mfa", factors: ["TOTP", "RECOVERY"], emailMask: null });
  assert.equal(cookieTen(r, "td_session"), null, "không được cấp phiên trước bước hai");
  const c = setCookieTen(r, "td_mfa_pending")!;
  assert.match(c, /^td_mfa_pending=mfa1\./);
  assert.match(c, /Path=\/api\/auth\/mfa; Max-Age=300; HttpOnly; SameSite=Lax; Secure/);
  assert.equal(phienSong(w, SALES).length, 0);
  assert.equal(w.q("SELECT last_login_at FROM staff WHERE id = ?", SALES)[0].last_login_at, null, "chưa qua bước hai thì chưa tính là đăng nhập");
});

test("cookie chờ KHÔNG mở được route cần đăng nhập (kể cả dán vào tên td_session)", async () => {
  const w = await setup();
  const pending = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: pending } })).status, 401);
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: pending.replace("td_mfa_pending=", "td_session=") } })).status, 401);
});

test("mã TOTP đúng → 200 + td_session (PIN_MFA) + xoá cookie chờ; dùng lại đúng mã ở lần đăng nhập mới → 401", async () => {
  const w = await setup();
  const pending = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const code = await ma();
  const r = await verify(w, pending, { method: "TOTP", code, trustDevice: false });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.staff.id, SALES);
  assert.equal("recoveryLeft" in r.json, false);
  const s = cookieTen(r, "td_session")!;
  assert.ok(s);
  assert.match(setCookieTen(r, "td_mfa_pending")!, /^td_mfa_pending=; Path=\/api\/auth\/mfa; Max-Age=0/);
  assert.equal(cookieTen(r, "td_trusted"), null, "không chọn tin máy thì không cấp td_trusted");
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: s } })).status, 200);
  assert.deepEqual(phienSong(w, SALES).map((x: any) => x.method), ["PIN_MFA"]);
  assert.notEqual(w.q("SELECT last_login_at FROM staff WHERE id = ?", SALES)[0].last_login_at, null);

  const pending2 = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const lai = await verify(w, pending2, { method: "TOTP", code, trustDevice: false });
  assert.equal(lai.status, 401);
  assert.deepEqual(lai.json.error, { code: "invalid_code", message: "Mã không đúng hoặc đã dùng. Kiểm giờ tự động trên điện thoại nếu sai nhiều lần." });
  assert.equal(cookieTen(lai, "td_session"), null);
  // Mã của bước kế tiếp (đồng hồ điện thoại nhanh 30 giây) vẫn nhận.
  assert.equal((await verify(w, pending2, { method: "TOTP", code: await ma(1), trustDevice: false })).status, 200);
});

test("hạn mức theo TÀI KHOẢN: 5 mã sai, mỗi lần một cookie chờ mới → lần 6 là 429 (kể cả mã đúng)", async () => {
  const w = await setup();
  for (let i = 0; i < 5; i++) {
    const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
    assert.equal((await verify(w, p, { method: "TOTP", code: "000000", trustDevice: false })).status, 401, `lần ${i + 1}`);
  }
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const r = await verify(w, p, { method: "TOTP", code: await ma(), trustDevice: false });
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "too_many_attempts");
  assert.ok(Number(r.headers.get("retry-after")) > 0);
  assert.equal(phienSong(w, SALES).length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 5);
});

test("mã đúng xoá bộ đếm mfa:<id>; PIN đúng không xoá bộ đếm mfa (hai bộ đếm riêng)", async () => {
  const w = await setup();
  for (let i = 0; i < 3; i++) {
    const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
    await verify(w, p, { method: "TOTP", code: "000000", trustDevice: false });
  }
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 3, "PIN đúng không xoá lượt sai của bước hai");
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await verify(w, p, { method: "TOTP", code: await ma(), trustDevice: false })).status, 200);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 0);
});

test("mã dự phòng dùng được MỘT lần, trả recoveryLeft", async () => {
  const w = await setup();
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const r = await verify(w, p, { method: "RECOVERY", code: "ABCD-EFGH", trustDevice: false });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.recoveryLeft, 2);
  const p2 = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await verify(w, p2, { method: "RECOVERY", code: "abcd-efgh", trustDevice: false })).status, 401);
  assert.equal((await verify(w, p2, { method: "RECOVERY", code: "jkmnpqrs", trustDevice: false })).status, 200);
});

test("tin máy này: td_trusted 30 ngày (Path=/api/auth); lần PIN sau mang td_trusted → { staff } ngay, PIN_TRUSTED; đổi PIN sau đó → hỏi lại mã", async () => {
  const w = await setup();
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  const r = await verify(w, p, { method: "TOTP", code: await ma(), trustDevice: true });
  assert.equal(r.status, 200, r.text);
  assert.match(setCookieTen(r, "td_trusted")!, /^td_trusted=[A-Za-z0-9_-]{43}; Path=\/api\/auth; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure$/);
  const tin = cookieTen(r, "td_trusted")!;
  const [may] = w.q("SELECT id, token_hash, expires_at FROM aut_trusted_device WHERE staff_id = ?", SALES);
  assert.equal(may.token_hash, await sha256Hex(tin.slice("td_trusted=".length)), "CSDL chỉ giữ băm");
  assert.ok(Math.abs(Date.parse(may.expires_at) - Date.now() - 30 * 86400_000) < 60_000);
  assert.equal(phienSong(w, SALES)[0].trusted_device_id, may.id);

  const lai = await pinLogin(w, "0900000001", tin);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.staff.id, SALES);
  assert.ok(cookieTen(lai, "td_session"));
  assert.deepEqual(phienSong(w, SALES).map((x: any) => [x.method, x.trusted_device_id]), [["PIN_TRUSTED", may.id]]);

  // Token máy tin của tài khoản KHÁC không có tác dụng (khớp theo staff_id).
  const doiTac = await pinLogin(w, "0900000005", tin);
  assert.deepEqual(phienSong(w, DOI_TAC).map((x: any) => x.method), ["PIN"], doiTac.text);

  // Lưới credentials_changed_at: máy tin tạo TRƯỚC lần đổi thông tin đăng nhập thì hết tác dụng.
  w.sqlite.prepare("UPDATE staff SET credentials_changed_at = ? WHERE id = ?").run(Date.now() + 1000, SALES);
  const sau = await pinLogin(w, "0900000001", tin);
  assert.equal(sau.json.next, "mfa", sau.text);
});

test("cookie chờ hỏng / thiếu / hết hạn → 401 mfa_expired; thân sai method → 400", async () => {
  const w = await setup();
  const het = { code: "mfa_expired", message: "Đã quá 5 phút, đăng nhập lại." };
  assert.deepEqual((await verify(w, null, { method: "TOTP", code: await ma(), trustDevice: false })).json.error, het);
  assert.deepEqual((await verify(w, "td_mfa_pending=mfa1.x.1.verify.abc", { method: "TOTP", code: await ma(), trustDevice: false })).json.error, het);
  const s = cookieTen(await w.call("POST", "/api/auth/login", { body: { phone: "0900000005", pin: PIN } }), "td_session")!;
  assert.equal((await verify(w, s.replace("td_session=", "td_mfa_pending="), { method: "TOTP", code: await ma(), trustDevice: false })).status, 401, "token phiên không làm cookie chờ được");
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  assert.equal((await verify(w, p, { method: "SMS", code: "123456", trustDevice: false })).status, 400);
  // Đổi PIN sau khi có cookie chờ → cookie chờ hết tác dụng (lưới credentials_changed_at).
  w.sqlite.prepare("UPDATE staff SET credentials_changed_at = ? WHERE id = ?").run(Date.now() + 1000, SALES);
  assert.deepEqual((await verify(w, p, { method: "TOTP", code: await ma(), trustDevice: false })).json.error, het);
});

test("bảo trì bật: /api/auth/mfa/verify của tài khoản không phải Toàn quyền → 503, không tiêu lượt thử", async () => {
  const w = await setup();
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 3600_000).toISOString()}' WHERE id = 'default'`);
  const r = await verify(w, p, { method: "TOTP", code: await ma(), trustDevice: false });
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "maintenance");
  assert.equal(phienSong(w, SALES).length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 0);
});

test("tài khoản nội bộ chưa bật, hết ân hạn (hoặc NULL) → 403 mfa_setup_required; còn ân hạn → phiên PIN; bên ngoài chưa bật → phiên PIN", async () => {
  const w = await setup();
  w.sqlite.exec(`UPDATE aut_mfa_factor SET valid_to_at = '${new Date().toISOString()}'`);
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = NULL WHERE id = ?").run(SALES);
  const chan = await pinLogin(w, "0900000001");
  assert.equal(chan.status, 403);
  assert.deepEqual(chan.json.error, { code: "mfa_setup_required", message: "Tài khoản cần bật bảo mật hai lớp. Liên hệ Quản trị để được hỗ trợ." });
  assert.equal(chan.headers.get("set-cookie"), null);
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), SALES);
  assert.equal((await pinLogin(w, "0900000001")).status, 403);
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(new Date(Date.now() + 86400_000).toISOString(), SALES);
  const con = await pinLogin(w, "0900000001");
  assert.equal(con.status, 200, con.text);
  assert.equal(con.json.staff.id, SALES);
  assert.deepEqual(phienSong(w, SALES).map((x: any) => x.method), ["PIN"]);
  const dt = await pinLogin(w, "0900000005");
  assert.equal(dt.json.staff.id, DOI_TAC);
});

test("cửa sổ 24 giờ sau khi bị tắt lớp hai: next=mfa_enroll + cookie chờ purpose enroll (cookie này không qua được verify)", async () => {
  const w = await setup();
  w.sqlite.exec(`UPDATE aut_mfa_factor SET valid_to_at = '${new Date().toISOString()}'`);
  w.sqlite.prepare("UPDATE staff SET mfa_enroll_until = ? WHERE id = ?").run(new Date(Date.now() + 86400_000).toISOString(), SALES);
  const r = await pinLogin(w, "0900000001");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { next: "mfa_enroll" });
  assert.equal(cookieTen(r, "td_session"), null);
  const p = cookieTen(r, "td_mfa_pending")!;
  assert.match(p, /\.enroll\./);
  assert.equal((await verify(w, p, { method: "TOTP", code: await ma(), trustDevice: false })).json.error.code, "mfa_expired");
});

test("thiếu MFA_ENCRYPTION_KEY: bước mã TOTP trả 503 (không 500, không cấp phiên), log mfa_key_missing không in khoá", async () => {
  const w = await setup();
  const p = cookieTen(await pinLogin(w, "0900000001"), "td_mfa_pending")!;
  delete w.env.MFA_ENCRYPTION_KEY;
  const { kq: r, log } = await batLog(async () => verify(w, p, { method: "TOTP", code: await ma(), trustDevice: false }));
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "mfa_unavailable");
  assert.match(log, /mfa_key_missing/);
  assert.equal(phienSong(w, SALES).length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 0, "lỗi cấu hình không tiêu lượt thử của người dùng");
});

test("KHÔNG LỘ: khoá TOTP (base32, mã hoá), mã, mã dự phòng, token máy tin không có trong thân trả về, nhật ký, log máy", async () => {
  const w = await setup();
  const enc = w.q("SELECT secret_enc FROM aut_mfa_factor WHERE id = 'f1'")[0].secret_enc as string;
  const code = await ma();
  const { kq, log } = await batLog(async () => {
    const than: string[] = [];
    const r1 = await pinLogin(w, "0900000001");
    than.push(r1.text);
    const p = cookieTen(r1, "td_mfa_pending")!;
    than.push((await verify(w, p, { method: "TOTP", code: "999999", trustDevice: false })).text);
    const ok = await verify(w, p, { method: "TOTP", code, trustDevice: true });
    than.push(ok.text);
    than.push((await verify(w, p, { method: "RECOVERY", code: MA_DU_PHONG[1], trustDevice: false })).text);
    return { than, tin: cookieTen(ok, "td_trusted")!.slice("td_trusted=".length) };
  });
  const dau = [base32Encode(BI_MAT), enc, enc.split(".")[2]!, code, "999999", ...MA_DU_PHONG, ...MA_DU_PHONG.map((m) => m.replace("-", "")), kq.tin];
  const nhatKy = JSON.stringify(w.q("SELECT * FROM audit_log"));
  for (const d of dau) {
    for (const t of kq.than) assert.ok(!t.includes(d), `thân trả về chứa "${d}"`);
    assert.ok(!nhatKy.includes(d), `nhật ký chứa "${d}"`);
    assert.ok(!log.includes(d), `log máy chứa "${d}"`);
  }
  for (const t of kq.than) assert.doesNotMatch(t, /secret|code_hash|token_hash/);
});
