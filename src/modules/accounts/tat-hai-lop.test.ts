// ADR-0074 điều 1, 5 (kế hoạch Phần B Task 6): Quản trị/Toàn quyền tắt bảo mật hai lớp của người khác (`POST /api/staff/:id/mfa-reset`) → cửa sổ 24 giờ bật lại
// ngay ở bước đăng nhập (`/api/auth/mfa/enroll/*`); ân hạn 14 ngày khi tài khoản bên ngoài được cấp quyền nội bộ hoặc tài khoản nội bộ được kích hoạt lại;
// nút "Mở khoá" gỡ cả khoá đếm `mfa:<id>`. ADR-0090 đ1(iv): tài khoản có quyền tiền chỉ Toàn quyền tắt. Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs) — không mạng. Bản e2e: tests/e2e/hai-lop.mjs (phần Task 6).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";
import { encryptSecret, recoveryHash } from "../auth/mfa-crypto.ts";
import { base32Decode, totpCode, TOTP_PERIOD } from "../auth/totp.ts";

const QT = "0c000000-0000-4000-8000-000000000001"; // Quản trị
const QT2 = "0c000000-0000-4000-8000-000000000002"; // Quản trị khác
const NS = "0c000000-0000-4000-8000-000000000003"; // Nhân sự
const KT = "0c000000-0000-4000-8000-000000000004"; // Kế toán (quyền tiền — ADR-0090)
const BH = "0c000000-0000-4000-8000-000000000005"; // Bán hàng
const TQ = "0c000000-0000-4000-8000-000000000006"; // Toàn quyền
const DT = "0c000000-0000-4000-8000-000000000007"; // Đối tác (bên ngoài)
const TQ2 = "0c000000-0000-4000-8000-000000000008"; // Toàn quyền khác
const PHONE: Record<string, string> = {
  [QT]: "0902000001", [QT2]: "0902000002", [NS]: "0902000003", [KT]: "0902000004", [BH]: "0902000005", [TQ]: "0902000006", [DT]: "0902000007", [TQ2]: "0902000008",
};
const PIN = "135790";
const KHOA = Buffer.alloc(32, 5).toString("base64"); // khoá mã hoá hai lớp GIẢ của bài
const BI_MAT = new Uint8Array(20).map((_, i) => (i * 29 + 3) & 255); // khoá TOTP GIẢ
const TIEN = "Tài khoản giữ tiền — chỉ người phụ trách hệ thống (Toàn quyền) làm việc này."; // ADR-0090 đ1, nguyên văn
const NGAY = 86_400_000;

async function setup() {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  seedStaff(w.sqlite, { id: QT, phone: PHONE[QT], name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: QT2, phone: PHONE[QT2], name: "Quản Trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: NS, phone: PHONE[NS], name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: KT, phone: PHONE[KT], name: "Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: BH, phone: PHONE[BH], name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: TQ, phone: PHONE[TQ], name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: DT, phone: PHONE[DT], name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: TQ2, phone: PHONE[TQ2], name: "Toàn Quyền Hai", perms: ["SUPER_ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  return w;
}
type W = Awaited<ReturnType<typeof setup>>;

/** Gieo yếu tố TOTP + 2 mã dự phòng + 1 máy được tin cho `id` (như đã tự bật trước đó). */
async function gieoHaiLop(w: W, id: string) {
  const at = new Date().toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'TOTP', ?, NULL, 0, ?, NULL, ?, ?, ?, ?)",
  ).run(`f-${id}`, id, await encryptSecret(KHOA, BI_MAT), at, at, id, at, id);
  for (const i of [0, 1]) {
    w.sqlite.prepare(
      "INSERT INTO aut_mfa_recovery_code (id, staff_id, batch_id, code_hash, created_at, created_by, updated_at, updated_by, used_at, revoked_at) VALUES (?, ?, 'b1', ?, ?, ?, ?, ?, NULL, NULL)",
    ).run(`r${i}-${id}`, id, await recoveryHash(id, `abcdefg${i + 2}`), at, id, at, id);
  }
  w.sqlite.prepare(
    "INSERT INTO aut_trusted_device (id, staff_id, token_hash, label, created_at, created_by, updated_at, updated_by, last_used_at, expires_at, revoked_at, revoke_reason) VALUES (?, ?, ?, 'iPhone', ?, ?, ?, ?, ?, ?, NULL, NULL)",
  ).run(`t-${id}`, id, `bam-${id}`, at, id, at, id, at, new Date(Date.now() + 30 * NGAY).toISOString());
}
const dem = (w: W, sql: string, ...a: unknown[]): number => Number((w.q(sql, ...a)[0] as { n: number }).n);
const han = (w: W, id: string) => ({ ...(w.q("SELECT mfa_grace_until AS g, mfa_enroll_until AS e FROM staff WHERE id = ?", id)[0] as { g: string | null; e: string | null }) });
const gan = (iso: string | null, moc: number, dungSai = 60_000) => iso !== null && Math.abs(Date.parse(iso) - moc) < dungSai;
const reset = (w: W, as: string, id: string) => w.call("POST", `/api/staff/${id}/mfa-reset`, { as, body: {} });

let ipn = 0;
const ip = () => `203.0.113.${(++ipn % 250) + 1}`;
const cookieTen = (r: any, ten: string): string | null => {
  const c = (r.headers.getSetCookie() as string[]).find((x) => x.startsWith(`${ten}=`) && !x.startsWith(`${ten}=;`));
  return c ? c.split(";")[0]! : null;
};
const pinLogin = (w: W, id: string) => w.call("POST", "/api/auth/login", { body: { phone: PHONE[id], pin: PIN }, headers: { "cf-connecting-ip": ip() } });
const enroll = (w: W, buoc: "start" | "confirm", cookie: string | null, body: unknown = {}) =>
  w.call("POST", `/api/auth/mfa/enroll/${buoc}`, { body, headers: { "cf-connecting-ip": ip(), cookie: cookie ?? "" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function buocAnToan(): Promise<number> {
  const du = Date.now() % (TOTP_PERIOD * 1000);
  if (du > TOTP_PERIOD * 1000 - 3000) await sleep(TOTP_PERIOD * 1000 - du + 50);
  return Math.floor(Date.now() / (TOTP_PERIOD * 1000));
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Tắt lớp hai

test("Quản trị tắt lớp hai của Bán hàng: 200; yếu tố, mã dự phòng, máy tin kết thúc; mọi phiên kết thúc 'tat_hai_lop'; cửa sổ bật lại 24 giờ; khoá đếm mfa: gỡ; nhật ký mfa_reset không chi tiết", async () => {
  const w = await setup();
  await gieoHaiLop(w, BH);
  await w.token(BH); // Bán hàng đang có một phiên sống
  for (let i = 0; i < 5; i++) w.sqlite.prepare("INSERT INTO login_attempt (id, key, at) VALUES (?, ?, ?)").run(`a${i}`, `mfa:${BH}`, Date.now());
  const truoc = Date.now();
  const r = await reset(w, QT, BH);
  assert.equal(r.status, 200, r.text);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL", BH), 0, "yếu tố kết thúc");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ?", BH), 1, "không xoá cứng");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ? AND revoked_at IS NULL AND used_at IS NULL", BH), 0, "mã dự phòng thu hồi");
  assert.deepEqual(w.q("SELECT revoke_reason AS l FROM aut_trusted_device WHERE staff_id = ?", BH).map((x: any) => x.l), ["tat_hai_lop"], "máy tin thu hồi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", BH), 0, "mọi phiên kết thúc");
  assert.deepEqual(w.q("SELECT DISTINCT end_reason AS l, ended_by AS b FROM aut_session WHERE staff_id = ?", BH).map((x: any) => ({ ...x })), [{ l: "tat_hai_lop", b: QT }]);
  assert.ok(Number(w.q("SELECT credentials_changed_at AS c FROM staff WHERE id = ?", BH)[0].c) >= truoc, "đá mọi phiên, cookie chờ, máy tin (lưới credentials_changed_at)");
  assert.ok(gan(han(w, BH).e, Date.now() + NGAY), `cửa sổ bật lại 24 giờ: ${han(w, BH).e}`);
  assert.equal(dem(w, "SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${BH}`), 0, "khoá đếm mfa: gỡ — bật lại không bị 429");
  assert.deepEqual(w.q("SELECT staff_id AS s, target_id AS t, detail AS d FROM audit_log WHERE action = 'mfa_reset'").map((x: any) => ({ ...x })), [{ s: QT, t: BH, d: null }]);
  assert.equal(r.json.staff.id, BH);
  assert.ok(!r.text.includes("secret") && !r.text.includes("code_hash"), "phản hồi không mang khoá / băm");
});

test("tắt lớp hai cho tài khoản CHƯA có yếu tố (hết ân hạn, bị chặn) vẫn 200 — đường Quản trị bật giúp (đặc tả §4.4)", async () => {
  const w = await setup();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(new Date(Date.now() - NGAY).toISOString(), BH);
  const chan = await pinLogin(w, BH);
  assert.equal(chan.status, 403, chan.text);
  assert.equal(chan.json.error.code, "mfa_setup_required");
  const r = await reset(w, QT, BH);
  assert.equal(r.status, 200, r.text);
  assert.ok(gan(han(w, BH).e, Date.now() + NGAY));
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_reset' AND target_id = ?", BH), 1);
  const l = await pinLogin(w, BH);
  assert.equal(l.status, 200, l.text);
  assert.deepEqual(l.json, { next: "mfa_enroll" });
  assert.equal(cookieTen(l, "td_session"), null);
  assert.ok(cookieTen(l, "td_mfa_pending"));
});

test("tắt lớp hai của Đối tác (bên ngoài): KHÔNG mở cửa sổ bật bắt buộc — ADR-G1 chưa duyệt; đăng nhập PIN như cũ", async () => {
  const w = await setup();
  await gieoHaiLop(w, DT);
  const r = await reset(w, QT, DT);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(han(w, DT), { g: null, e: null });
  const l = await pinLogin(w, DT);
  assert.equal(l.status, 200, l.text);
  assert.ok(cookieTen(l, "td_session"), "Đối tác vào thẳng");
});

test("ai tắt của ai (ADR-0074 đ5 + ADR-0090 đ1 iv + ADR-0071 đ1e): mã trả của route; cờ canResetMfa của GET /api/staff khớp đúng 'route trả 200'", async () => {
  const w = await setup();
  const ai = [QT, QT2, NS, KT, BH, TQ, DT, TQ2];
  const mong: Record<string, Record<string, number>> = {
    [QT]: { [QT]: 409, [QT2]: 403, [NS]: 403, [KT]: 403, [BH]: 200, [TQ]: 403, [DT]: 200, [TQ2]: 403 },
    [NS]: Object.fromEntries(ai.map((t) => [t, 403])),
    [TQ]: { [QT]: 200, [QT2]: 200, [NS]: 200, [KT]: 200, [BH]: 200, [TQ]: 409, [DT]: 200, [TQ2]: 200 },
    [BH]: Object.fromEntries(ai.map((t) => [t, 403])),
  };
  for (const actor of [QT, NS, TQ, BH]) {
    // Cờ đọc TRƯỚC khi tắt (tắt của chính người xem đá phiên của họ — không xảy ra vì tự tắt 409).
    const ds = actor === BH ? null : await w.call("GET", "/api/staff", { as: actor });
    for (const t of ai) {
      const r = await reset(w, actor, t);
      assert.equal(r.status, mong[actor]![t], `${actor} → ${t}: ${r.text}`);
      if (t === KT && actor === QT) assert.equal(r.json.error.message, TIEN);
      if (ds) {
        const dong = ds.json.staff.find((s: any) => s.id === t);
        assert.equal(dong.canResetMfa, r.status === 200, `cờ canResetMfa của ${actor} → ${t}`);
      }
    }
  }
  // Bị từ chối thì không ghi gì: Kế toán, Quản trị khác không có nhật ký do Quản trị tắt.
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_reset' AND staff_id = ? AND target_id IN (?, ?, ?)", QT, KT, QT2, TQ), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_reset' AND staff_id = ?", NS), 0);
});

test("id sai dạng / không có → 404, không ghi gì", async () => {
  const w = await setup();
  assert.equal((await reset(w, TQ, "khong-phai-uuid")).status, 404);
  assert.equal((await reset(w, TQ, "0c000000-0000-4000-8000-0000000000ff")).status, 404);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_reset'"), 0);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Bật lại ở bước đăng nhập (cửa sổ 24 giờ)

test("cửa sổ 24 giờ: PIN → next mfa_enroll; enroll/start trả khoá; mã sai 401; mã đúng → phiên PIN_MFA + 10 mã dự phòng; cửa sổ đóng; lần sau bị hỏi mã", async () => {
  const w = await setup();
  await gieoHaiLop(w, BH);
  assert.equal((await reset(w, QT, BH)).status, 200);
  const l = await pinLogin(w, BH);
  assert.deepEqual(l.json, { next: "mfa_enroll" });
  const cho = cookieTen(l, "td_mfa_pending")!;
  // Không cookie chờ → 401; cookie chờ của bước "verify" không mở được bước bật.
  assert.equal((await enroll(w, "start", null)).status, 401);
  const s = await enroll(w, "start", cho);
  assert.equal(s.status, 200, s.text);
  assert.deepEqual(Object.keys(s.json).sort(), ["otpauth", "secret", "setupToken"]);
  assert.ok(!s.text.includes(PHONE[BH]!), "không lộ SĐT");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL", BH), 0, "bắt đầu chưa ghi CSDL");
  const sai = await enroll(w, "confirm", cho, { setupToken: s.json.setupToken, code: "000000" });
  assert.equal(sai.status, 401, sai.text);
  assert.equal(sai.json.error.code, "invalid_code");
  assert.equal(cookieTen(sai, "td_session"), null);
  const buoc = await buocAnToan();
  const ok = await enroll(w, "confirm", cho, { setupToken: s.json.setupToken, code: await totpCode(base32Decode(s.json.secret), buoc) });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.staff.id, BH);
  assert.equal(ok.json.recoveryCodes.length, 10);
  assert.ok(cookieTen(ok, "td_session"), "có phiên");
  assert.ok((ok.headers.getSetCookie() as string[]).some((c) => c.startsWith("td_mfa_pending=;")), "xoá cookie chờ");
  assert.equal(w.q("SELECT method FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", BH)[0].method, "PIN_MFA");
  assert.equal(han(w, BH).e, null, "cửa sổ bật lại đóng trong cùng lô");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL AND kind = 'TOTP'", BH), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ? AND revoked_at IS NULL AND used_at IS NULL", BH), 10);
  assert.equal(dem(w, "SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${BH}`), 0, "mã đúng xoá bộ đếm");
  // Phiếu bật dùng lại (đã có yếu tố) → 409/401, không cấp phiên thứ hai.
  const lai = await enroll(w, "confirm", cho, { setupToken: s.json.setupToken, code: await totpCode(base32Decode(s.json.secret), buoc + 1) });
  assert.notEqual(lai.status, 200, lai.text);
  const sau = await pinLogin(w, BH);
  assert.equal(sau.json.next, "mfa", sau.text);
  // Không lộ: nhật ký không chứa khoá / mã dự phòng.
  const nk = JSON.stringify(w.q("SELECT * FROM audit_log"));
  for (const d of [s.json.secret, ...ok.json.recoveryCodes]) assert.ok(!nk.includes(d), `nhật ký chứa ${d}`);
});

test("bước bật: cookie chờ 'verify' bị từ chối; cửa sổ đã đóng → 403 mfa_setup_required; bảo trì → 503", async () => {
  const w = await setup();
  await gieoHaiLop(w, KT);
  const lv = await pinLogin(w, KT);
  assert.equal(lv.json.next, "mfa", lv.text);
  assert.equal((await enroll(w, "start", cookieTen(lv, "td_mfa_pending"))).status, 401, "cookie chờ bước mã không mở bước bật");
  assert.equal((await reset(w, TQ, BH)).status, 200);
  const l = await pinLogin(w, BH);
  const cho = cookieTen(l, "td_mfa_pending")!;
  w.sqlite.prepare("UPDATE staff SET mfa_enroll_until = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), BH);
  const het = await enroll(w, "start", cho);
  assert.equal(het.status, 403, het.text);
  assert.equal(het.json.error.code, "mfa_setup_required");
  w.sqlite.prepare("UPDATE staff SET mfa_enroll_until = ? WHERE id = ?").run(new Date(Date.now() + NGAY).toISOString(), BH);
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 3600_000).toISOString()}' WHERE id = 'default'`);
  const bt = await enroll(w, "start", cho);
  assert.equal(bt.status, 503, bt.text);
  assert.equal(bt.json.error.code, "maintenance");
  assert.equal((await enroll(w, "confirm", cho, { setupToken: "x", code: "123456" })).status, 503);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Ân hạn 14 ngày: bên ngoài → nội bộ (đổi quyền / vai), kích hoạt lại

test("(a) PUT /api/staff/:id/permissions: Đối tác được cấp quyền nội bộ → ân hạn = lúc đổi + 14 ngày; nội bộ → nội bộ không đổi hạn", async () => {
  const w = await setup();
  assert.deepEqual(han(w, DT), { g: null, e: null });
  const r = await w.call("PUT", `/api/staff/${DT}/permissions`, { as: TQ, body: { permissions: ["SALES"] } });
  assert.equal(r.status, 200, r.text);
  assert.ok(gan(han(w, DT).g, Date.now() + 14 * NGAY), `ân hạn: ${han(w, DT).g}`);
  const cu = han(w, BH).g;
  assert.equal((await w.call("PUT", `/api/staff/${BH}/permissions`, { as: TQ, body: { permissions: ["SALES", "FIELD"] } })).status, 200);
  assert.equal(han(w, BH).g, cu, "đã nội bộ → không gia hạn");
  const l = await pinLogin(w, DT);
  assert.ok(cookieTen(l, "td_session"), `trong ân hạn vào được: ${l.text}`);
});

test("(a) PUT /api/staff/:id/roles: vai bên ngoài → vai nội bộ → ân hạn 14 ngày; đã có yếu tố sống thì không đặt", async () => {
  const w = await setup();
  const r = await w.call("PUT", `/api/staff/${DT}/roles`, { as: TQ, body: { roles: ["SALES_STAFF"] } });
  assert.equal(r.status, 200, r.text);
  assert.ok(gan(han(w, DT).g, Date.now() + 14 * NGAY), `ân hạn: ${han(w, DT).g}`);
  // Đối tác đã tự bật lớp hai rồi mới được cấp quyền nội bộ → không cần ân hạn (đã có yếu tố).
  const DT2 = "0c000000-0000-4000-8000-000000000009";
  seedStaff(w.sqlite, { id: DT2, phone: "0902000009", name: "Đối Tác Hai", perms: ["PARTNER"] });
  await gieoHaiLop(w, DT2);
  assert.equal((await w.call("PUT", `/api/staff/${DT2}/roles`, { as: TQ, body: { roles: ["SALES_STAFF"] } })).status, 200);
  assert.equal(han(w, DT2).g, null);
});

test("(a) vòng sửa 1: hạn cũ đã qua khi trở lại nội bộ → KHÔNG gia hạn (giữ nguyên, đăng nhập PIN 403); mọi phiên mang từ giai đoạn bên ngoài kết thúc + nhật ký session_revoked; hạn còn → giữ", async () => {
  const w = await setup();
  const qua = new Date(Date.now() - NGAY).toISOString();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(qua, DT);
  await w.token(DT); // Đối tác đang có một phiên sống (bên ngoài, chưa bật — không bị hỏi lớp hai)
  assert.equal((await w.call("PUT", `/api/staff/${DT}/permissions`, { as: TQ, body: { permissions: ["SALES"] } })).status, 200);
  assert.equal(han(w, DT).g, qua, "hạn đã qua giữ nguyên — đi đường Quản trị tắt lớp hai (cửa sổ 24 giờ)");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", DT), 0, "phiên mang qua giai đoạn bên ngoài kết thúc trong cùng lô");
  assert.deepEqual(w.q("SELECT DISTINCT end_reason AS l, ended_by AS b FROM aut_session WHERE staff_id = ?", DT).map((x: any) => ({ ...x })), [{ l: "bi_go", b: TQ }]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'session_revoked' AND target_id = ? AND staff_id = ?", DT, TQ), 1);
  const chan = await pinLogin(w, DT);
  assert.equal(chan.status, 403, chan.text);
  assert.equal(chan.json.error.code, "mfa_setup_required");
  const con = new Date(Date.now() + 3 * NGAY).toISOString();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(con, DT);
  assert.equal((await w.call("PUT", `/api/staff/${DT}/permissions`, { as: TQ, body: { permissions: ["PARTNER"] } })).status, 200);
  assert.equal((await w.call("PUT", `/api/staff/${DT}/permissions`, { as: TQ, body: { permissions: ["SALES"] } })).status, 200);
  assert.equal(han(w, DT).g, con, "hạn còn hiệu lực giữ nguyên");
});

test("(b) kích hoạt lại tài khoản nội bộ CHƯA có ân hạn (NULL — ngưng lúc migration 0101 chạy), chưa có yếu tố → ân hạn 14 ngày; hạn đã qua → giữ nguyên (vòng sửa 1)", async () => {
  const w = await setup();
  w.sqlite.prepare("UPDATE staff SET active = 0, mfa_grace_until = NULL WHERE id = ?").run(BH);
  const r = await w.call("PATCH", `/api/staff/${BH}`, { as: NS, body: { active: true } });
  assert.equal(r.status, 200, r.text);
  assert.ok(gan(han(w, BH).g, Date.now() + 14 * NGAY), `ân hạn: ${han(w, BH).g}`);
  const l = await pinLogin(w, BH);
  assert.ok(cookieTen(l, "td_session"), l.text);
  // Hạn đã qua → KHÔNG gia hạn tự động (vòng sửa 1): vẫn 403, đi đường Quản trị tắt lớp hai.
  const qua = new Date(Date.now() - NGAY).toISOString();
  w.sqlite.prepare("UPDATE staff SET active = 0, mfa_grace_until = ? WHERE id = ?").run(qua, BH);
  assert.equal((await w.call("PATCH", `/api/staff/${BH}`, { as: NS, body: { active: true } })).status, 200);
  assert.equal(han(w, BH).g, qua);
  assert.equal((await pinLogin(w, BH)).status, 403);
  // Còn hạn → giữ; có yếu tố → không đặt; bên ngoài → không đặt.
  const con = new Date(Date.now() + 2 * NGAY).toISOString();
  w.sqlite.prepare("UPDATE staff SET active = 0, mfa_grace_until = ? WHERE id = ?").run(con, BH);
  assert.equal((await w.call("PATCH", `/api/staff/${BH}`, { as: NS, body: { active: true } })).status, 200);
  assert.equal(han(w, BH).g, con);
  await gieoHaiLop(w, KT);
  w.sqlite.prepare("UPDATE staff SET active = 0, mfa_grace_until = NULL WHERE id = ?").run(KT);
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: TQ, body: { active: true } })).status, 200);
  assert.equal(han(w, KT).g, null);
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(DT);
  assert.equal((await w.call("PATCH", `/api/staff/${DT}`, { as: NS, body: { active: true } })).status, 200);
  assert.equal(han(w, DT).g, null);
});

test("vòng sửa 1, ca kiểm độc lập: Bán hàng hết ân hạn → đổi vai Cộng tác viên (bên ngoài) → có phiên → đổi lại Bán hàng → phiên cũ 401 ở /api/auth/me", async () => {
  const w = await setup();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(new Date(Date.now() - NGAY).toISOString(), BH);
  assert.equal((await pinLogin(w, BH)).status, 403, "hết ân hạn: bị chặn");
  const r1 = await w.call("PUT", `/api/staff/${BH}/roles`, { as: TQ, body: { roles: ["COLLABORATOR"] } });
  assert.equal(r1.status, 200, r1.text);
  const l = await pinLogin(w, BH);
  const phien = cookieTen(l, "td_session");
  assert.ok(phien, `bên ngoài chưa bật: vào được — ${l.text}`);
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: phien! } })).status, 200);
  const r2 = await w.call("PUT", `/api/staff/${BH}/roles`, { as: TQ, body: { roles: ["SALES_STAFF"] } });
  assert.equal(r2.status, 200, r2.text);
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: phien! } })).status, 401, "phiên mang qua giai đoạn bên ngoài phải chết");
  assert.equal((await pinLogin(w, BH)).status, 403, "và đăng nhập lại vẫn bị chặn (không gia hạn tự động)");
});

test("vòng sửa 1: lên nội bộ mà CÒN ân hạn / có yếu tố → không kết thúc phiên", async () => {
  const w = await setup();
  await w.token(DT);
  assert.equal((await w.call("PUT", `/api/staff/${DT}/permissions`, { as: TQ, body: { permissions: ["SALES"] } })).status, 200);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", DT), 1, "hạn NULL → +14 ngày, phiên giữ");
  const DT2 = "0c000000-0000-4000-8000-000000000009";
  seedStaff(w.sqlite, { id: DT2, phone: "0902000009", name: "Đối Tác Hai", perms: ["PARTNER"] });
  await gieoHaiLop(w, DT2);
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(new Date(Date.now() - NGAY).toISOString(), DT2);
  await w.token(DT2);
  assert.equal((await w.call("PUT", `/api/staff/${DT2}/permissions`, { as: TQ, body: { permissions: ["SALES"] } })).status, 200);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", DT2), 1, "có yếu tố sống → phiên giữ");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'session_revoked'"), 0);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Mở khoá + danh sách

test("(c) khoá đếm mfa:<id> (5 lần sai): danh sách báo 'bị khoá'; nút Mở khoá của Quản trị gỡ cả mfa: lẫn phone:, nhật ký login_unlocked; Quản trị không mở khoá Quản trị khác", async () => {
  const w = await setup();
  for (let i = 0; i < 5; i++) w.sqlite.prepare("INSERT INTO login_attempt (id, key, at) VALUES (?, ?, ?)").run(`m${i}`, `mfa:${BH}`, Date.now());
  for (let i = 0; i < 5; i++) w.sqlite.prepare("INSERT INTO login_attempt (id, key, at) VALUES (?, ?, ?)").run(`q${i}`, `mfa:${QT2}`, Date.now());
  const ds = await w.call("GET", "/api/staff", { as: QT });
  assert.equal(ds.json.staff.find((s: any) => s.id === BH).locked, true, "khoá mfa: hiện là bị khoá");
  assert.equal(ds.json.staff.find((s: any) => s.id === KT).locked, false);
  const r = await w.call("POST", `/api/staff/${BH}/unlock`, { as: QT, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(dem(w, "SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${BH}`), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'login_unlocked' AND target_id = ?", BH), 1);
  assert.equal((await w.call("GET", "/api/staff", { as: QT })).json.staff.find((s: any) => s.id === BH).locked, false);
  assert.equal((await w.call("POST", `/api/staff/${QT2}/unlock`, { as: QT, body: {} })).status, 403);
  assert.equal(dem(w, "SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${QT2}`), 5, "không nới quyền mở khoá");
  assert.equal((await w.call("POST", `/api/staff/${BH}/unlock`, { as: NS, body: {} })).status, 403, "Nhân sự không mở khoá");
});

test("GET /api/staff: nhãn hai lớp mfa = { enabled, graceUntil } theo từng dòng", async () => {
  const w = await setup();
  await gieoHaiLop(w, KT);
  const ds = (await w.call("GET", "/api/staff", { as: TQ })).json.staff;
  const dong = (id: string) => ds.find((s: any) => s.id === id).mfa;
  assert.deepEqual(dong(KT), { enabled: true, graceUntil: null });
  assert.equal(dong(BH).enabled, false);
  assert.ok(gan(dong(BH).graceUntil, Date.now() + 14 * NGAY));
  assert.deepEqual(dong(DT), { enabled: false, graceUntil: null });
});
