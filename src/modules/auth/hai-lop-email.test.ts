// ADR-0074 điều 4, 7 (kế hoạch Phần C Task 2): mã email ở bước đăng nhập — `POST /api/auth/mfa/email` (gửi mã) + `POST /api/auth/mfa/verify` method "EMAIL".
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs), bộ gửi thư GIẢ gắn vào env.EMAIL — đây là nơi DUY NHẤT thấy đường gửi thành công (e2e trên
// wrangler dev không có người gửi nên luôn 502). Bản e2e: tests/e2e/hai-lop-email.mjs.
// Cũng là bài KHÔNG LỘ (đặc tả §6 quy tắc 5): mã, địa chỉ email đầy đủ không có trong thân trả về, nhật ký, log máy.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";
import { encryptSecret, sha256Hex } from "./mfa-crypto.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const PIN = "135790";
const KHOA = Buffer.alloc(32, 7).toString("base64");
const EMAIL = "tuan.bao@gmail.com";
const TU = "no-reply@tourdao.vn";
const LOI_502 = { code: "mail_failed", message: "Chưa gửi được email, thử lại hoặc dùng cách khác." };

type Thu = { to: string; from: string; subject: string; text?: string; html?: string };

async function setup(o: { mailer?: "ok" | "nem" | "khong"; from?: string | null } = {}) {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  const thu: Thu[] = [];
  const truocKhiGui: number[] = []; // số dòng mã có trong CSDL ngay lúc bộ gửi được gọi (ghi TRƯỚC, gửi SAU)
  if ((o.mailer ?? "ok") !== "khong") {
    w.env.EMAIL = {
      send: async (m: Thu) => {
        truocKhiGui.push(w.q("SELECT count(*) AS n FROM aut_mfa_email_code")[0].n);
        if (o.mailer === "nem") throw new Error(`E_PROVIDER_DETAIL gửi tới ${m.to} hỏng`);
        thu.push(m);
      },
    };
  }
  if (o.from !== null) w.env.FEEDBACK_MAIL_FROM = o.from ?? TU;
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADMIN, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  const at = new Date().toISOString();
  const yeuTo = w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?, ?)",
  );
  yeuTo.run("fe-sales", SALES, "EMAIL", null, EMAIL, at, at, SALES, at, SALES);
  // SALES2 chỉ có ứng dụng xác thực (không có yếu tố email). ADMIN có yếu tố email gieo thẳng (dữ liệu lệch ADR-0074 điều 7 — cổng phải từ chối).
  yeuTo.run("ft-sales2", SALES2, "TOTP", await encryptSecret(KHOA, new Uint8Array(20).fill(3)), null, at, at, SALES2, at, SALES2);
  yeuTo.run("fe-admin", ADMIN, "EMAIL", null, "admin@gmail.com", at, at, ADMIN, at, ADMIN);
  return { w, thu, truocKhiGui };
}

const cookieTen = (r: any, ten: string): string | null => {
  const c = (r.headers.getSetCookie() as string[]).find((x) => x.startsWith(`${ten}=`) && !x.startsWith(`${ten}=;`));
  return c ? c.split(";")[0]! : null;
};
let ipn = 0;
const ip = () => `198.51.100.${(++ipn % 250) + 1}`;
const pending = async (w: any, phone = "0900000001") => {
  const r = await w.call("POST", "/api/auth/login", { body: { phone, pin: PIN }, headers: { "cf-connecting-ip": ip() } });
  assert.equal(r.json.next, "mfa", r.text);
  return cookieTen(r, "td_mfa_pending")!;
};
const guiMa = (w: any, p: string | null) => w.call("POST", "/api/auth/mfa/email", { body: {}, headers: { "cf-connecting-ip": ip(), ...(p ? { cookie: p } : {}) } });
const verify = (w: any, p: string, code: string, them: Record<string, unknown> = {}) =>
  w.call("POST", "/api/auth/mfa/verify", { body: { method: "EMAIL", code, trustDevice: false, ...them }, headers: { "cf-connecting-ip": ip(), cookie: p } });
const maTrongThu = (t: Thu): string => /(\d{6})/.exec(t.text ?? "")![1]!;
const dongMa = (w: any, id = SALES) => w.q("SELECT id, purpose, email_hash, code_hash, attempts, used_at, revoked_at, expires_at, created_by FROM aut_mfa_email_code WHERE staff_id = ? ORDER BY created_at, rowid", id);
const phienSong = (w: any, id: string) => w.q("SELECT method FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", id);

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

test("đăng nhập PIN của tài khoản có yếu tố email: next=mfa, factors có EMAIL, emailMask che", async () => {
  const { w } = await setup();
  const r = await w.call("POST", "/api/auth/login", { body: { phone: "0900000001", pin: PIN }, headers: { "cf-connecting-ip": ip() } });
  assert.deepEqual(r.json, { next: "mfa", factors: ["EMAIL", "RECOVERY"], emailMask: "t***@gmail.com" });
});

test("gửi mã: 200 { sent, emailMask }; thư tới đúng địa chỉ, người gửi FEEDBACK_MAIL_FROM, không liên kết; dòng mã ghi TRƯỚC khi gửi, chỉ băm", async () => {
  const { w, thu, truocKhiGui } = await setup();
  const r = await guiMa(w, await pending(w));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { sent: true, emailMask: "t***@gmail.com" });
  assert.equal(thu.length, 1);
  assert.equal(thu[0]!.to, EMAIL);
  assert.equal(thu[0]!.from, TU);
  assert.ok(thu[0]!.text!.includes("Nếu không phải bạn, đổi PIN ngay và báo IT."));
  assert.doesNotMatch(JSON.stringify(thu[0]), /http|:\/\/|href/i);
  assert.deepEqual(truocKhiGui, [1], "dòng mã phải có trong CSDL trước lúc gửi (Hiến chương 5.16)");
  const [d] = dongMa(w);
  const code = maTrongThu(thu[0]!);
  assert.equal(d.purpose, "login");
  assert.equal(d.code_hash, await sha256Hex(`${SALES}:${d.id}:${code}`));
  assert.equal(d.email_hash, await sha256Hex(EMAIL));
  assert.equal(d.created_by, SALES);
  assert.ok(Math.abs(Date.parse(d.expires_at) - Date.now() - 600_000) < 60_000, "sống 10 phút");
  assert.ok(!JSON.stringify(w.q("SELECT * FROM aut_mfa_email_code")).includes(code), "CSDL không giữ mã thô");
});

test("mã trong thư đúng → 200 + td_session (PIN_MFA), xoá cookie chờ, mã đã dùng; dùng lại → 401", async () => {
  const { w, thu } = await setup();
  const p = await pending(w);
  await guiMa(w, p);
  const code = maTrongThu(thu[0]!);
  const r = await verify(w, p, code);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.staff.id, SALES);
  assert.ok(cookieTen(r, "td_session"));
  assert.deepEqual(phienSong(w, SALES).map((x: any) => x.method), ["PIN_MFA"]);
  assert.notEqual(dongMa(w)[0].used_at, null);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 0, "đúng mã thì xoá bộ đếm bước hai");
  const lai = await verify(w, await pending(w), code);
  assert.equal(lai.status, 401, lai.text);
  assert.equal(lai.json.error.code, "invalid_code");
  assert.equal(cookieTen(lai, "td_session"), null);
});

test("gửi mã mới huỷ mã cũ: mã cũ → 401 (đếm một lần sai trên mã mới); mã mới → 200", async () => {
  const { w, thu } = await setup();
  const p = await pending(w);
  await guiMa(w, p);
  await guiMa(w, p);
  const [cu, moi] = [maTrongThu(thu[0]!), maTrongThu(thu[1]!)];
  const rows = dongMa(w);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].revoked_at, null, "mã cũ bị huỷ");
  assert.equal(rows[1].revoked_at, null);
  if (cu !== moi) {
    const r = await verify(w, p, cu);
    assert.equal(r.status, 401, r.text);
    assert.equal(dongMa(w)[1].attempts, 1);
  }
  assert.equal((await verify(w, p, moi)).status, 200);
});

test("mã sai → 401, đếm attempts của mã và khoá chung mfa:<id>; mã hết hạn → 401; 5 lần sai → lần 6 là 429 (kể cả mã đúng)", async () => {
  const { w, thu } = await setup();
  const p = await pending(w);
  await guiMa(w, p);
  const code = maTrongThu(thu[0]!);
  const sai = code === "000000" ? "111111" : "000000";
  const r = await verify(w, p, sai);
  assert.equal(r.status, 401, r.text);
  assert.deepEqual(r.json.error, { code: "invalid_code", message: "Mã không đúng hoặc đã hết hạn. Bấm “Gửi mã qua email” để nhận mã mới." });
  assert.equal(dongMa(w)[0].attempts, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 1);
  for (let i = 0; i < 4; i++) assert.equal((await verify(w, p, "abcdef")).status, 401);
  const chan = await verify(w, p, code);
  assert.equal(chan.status, 429, chan.text);
  assert.equal(chan.json.error.code, "too_many_attempts");
  assert.equal(phienSong(w, SALES).length, 0);

  // Mã hết hạn (bộ đếm đã xoá để thấy riêng luật hạn).
  const b = await setup();
  const p2 = await pending(b.w);
  await guiMa(b.w, p2);
  b.w.sqlite.exec(`UPDATE aut_mfa_email_code SET expires_at = '${new Date(Date.now() - 1000).toISOString()}'`);
  assert.equal((await verify(b.w, p2, maTrongThu(b.thu[0]!))).status, 401);
});

test("địa chỉ của yếu tố đổi sau khi gửi → mã đã gửi tới địa chỉ cũ không dùng được; yếu tố email bị gỡ → 401", async () => {
  const { w, thu } = await setup();
  const p = await pending(w);
  await guiMa(w, p);
  w.sqlite.exec("UPDATE aut_mfa_factor SET email = 'khac@gmail.com' WHERE id = 'fe-sales'");
  assert.equal((await verify(w, p, maTrongThu(thu[0]!))).status, 401);

  const b = await setup();
  const p2 = await pending(b.w);
  await guiMa(b.w, p2);
  // Thêm TOTP để vẫn còn yếu tố (cookie chờ còn hợp lệ), rồi gỡ yếu tố email.
  const at = new Date().toISOString();
  b.w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES ('ft-s', ?, 'TOTP', ?, NULL, 0, ?, NULL, ?, ?, ?, ?)",
  ).run(SALES, await encryptSecret(KHOA, new Uint8Array(20).fill(9)), at, at, SALES, at, SALES);
  b.w.sqlite.exec(`UPDATE aut_mfa_factor SET valid_to_at = '${at}' WHERE id = 'fe-sales'`);
  assert.equal((await verify(b.w, p2, maTrongThu(b.thu[0]!))).status, 401);
});

test("hạn mức gửi: 3 thư / 15 phút mỗi tài khoản — lần 4 là 429, không ghi thêm dòng mã, không gửi; khoá theo TÀI KHOẢN (cookie chờ mới không lách được)", async () => {
  const { w, thu } = await setup();
  for (let i = 0; i < 3; i++) assert.equal((await guiMa(w, await pending(w))).status, 200, `lần ${i + 1}`);
  const r = await guiMa(w, await pending(w));
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "too_many_attempts");
  assert.ok(Number(r.headers.get("retry-after")) > 0);
  assert.equal(thu.length, 3);
  assert.equal(dongMa(w).length, 3);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa-mail:${SALES}`)[0].n, 3);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa:${SALES}`)[0].n, 0, "gửi thư không tiêu lượt nhập mã");
  // Tài khoản khác không bị vạ lây.
  const r2 = await guiMa(w, await pending(w, "0900000002"));
  assert.equal(r2.status, 409, "SALES2 không có yếu tố email — 409, không phải 429");
});

test("tài khoản không có yếu tố email → 409, không tiêu hạn mức gửi, không ghi dòng mã; verify EMAIL → 401", async () => {
  const { w, thu } = await setup();
  const p = await pending(w, "0900000002");
  const r = await guiMa(w, p);
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: "no_email_factor", message: "Tài khoản này chưa bật nhận mã qua email. Dùng ứng dụng xác thực hoặc mã dự phòng." });
  assert.equal(thu.length, 0);
  assert.equal(dongMa(w, SALES2).length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa-mail:${SALES2}`)[0].n, 0);
  assert.equal((await verify(w, p, "123456")).status, 401);
});

test("Quản trị có yếu tố email (dữ liệu lệch ADR-0074 điều 7): gửi mã → 409, không gửi thư; verify EMAIL → 401 (chỉ siết)", async () => {
  const { w, thu } = await setup();
  // Vòng sửa 2 (Minor 3): dòng EMAIL lệch ĐƠN ĐỘC không còn đưa tới bước hai (không tính là có yếu tố — bài ở accounts/hai-lop-email-bat.test.ts) ⇒ gieo
  // thêm ứng dụng xác thực để Quản trị có cookie chờ; cổng email vẫn phải từ chối.
  const at0 = new Date().toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES ('ft-admin', ?, 'TOTP', ?, NULL, 0, ?, NULL, ?, ?, ?, ?)",
  ).run(ADMIN, await encryptSecret(KHOA, new Uint8Array(20).fill(5)), at0, at0, ADMIN, at0, ADMIN);
  const p = await pending(w, "0900000003");
  const r = await guiMa(w, p);
  assert.equal(r.status, 409, r.text);
  assert.equal(thu.length, 0);
  assert.equal(dongMa(w, ADMIN).length, 0);
  // Gieo một mã mở biết trước cho ADMIN — vẫn không qua được.
  const at = new Date().toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_mfa_email_code (id, staff_id, purpose, email_hash, code_hash, created_at, created_by, updated_at, updated_by, expires_at) VALUES ('ea', ?, 'login', ?, ?, ?, ?, ?, ?, ?)",
  ).run(ADMIN, await sha256Hex("admin@gmail.com"), await sha256Hex(`${ADMIN}:ea:246810`), at, ADMIN, at, ADMIN, new Date(Date.now() + 600_000).toISOString());
  assert.equal((await verify(w, p, "246810")).status, 401);
  assert.equal(phienSong(w, ADMIN).length, 0);
});

test("gửi không được (thiếu người gửi / thiếu binding / nhà cung cấp lỗi) → 502 lời thường, dòng mã vẫn còn, có tính hạn mức; không lộ lỗi nhà cung cấp", async () => {
  for (const o of [{ from: null }, { mailer: "khong" as const }, { mailer: "nem" as const }]) {
    const { w } = await setup(o);
    const { kq: r, log } = await batLog(async () => guiMa(w, await pending(w)));
    assert.equal(r.status, 502, `${JSON.stringify(o)}: ${r.text}`);
    assert.deepEqual(r.json.error, LOI_502);
    assert.doesNotMatch(r.text + log, /E_PROVIDER_DETAIL|tuan\.bao/);
    assert.match(log, /mfa_mail_failed/);
    assert.equal(dongMa(w).length, 1, "dòng mã ghi trước, còn lại (hết hạn tự nhiên)");
    assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa-mail:${SALES}`)[0].n, 1);
  }
});

test("cookie chờ thiếu / hỏng / purpose enroll → 401 mfa_expired; bảo trì bật → 503, không ghi dòng mã, không tiêu hạn mức", async () => {
  const { w, thu } = await setup();
  const het = { code: "mfa_expired", message: "Đã quá 5 phút, đăng nhập lại." };
  assert.deepEqual((await guiMa(w, null)).json.error, het);
  assert.deepEqual((await guiMa(w, "td_mfa_pending=mfa1.x.1.verify.abc")).json.error, het);
  // purpose enroll (cửa sổ bật lại 24 giờ của tài khoản chưa có yếu tố) không gửi được mã đăng nhập.
  w.sqlite.prepare("UPDATE staff SET mfa_enroll_until = ? WHERE id = ?").run(new Date(Date.now() + 86400_000).toISOString(), SALES2);
  w.sqlite.exec(`UPDATE aut_mfa_factor SET valid_to_at = '${new Date().toISOString()}' WHERE staff_id = '${SALES2}'`);
  const e = await w.call("POST", "/api/auth/login", { body: { phone: "0900000002", pin: PIN }, headers: { "cf-connecting-ip": ip() } });
  assert.equal(e.json.next, "mfa_enroll");
  assert.deepEqual((await guiMa(w, cookieTen(e, "td_mfa_pending"))).json.error, het);

  const p = await pending(w);
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 3600_000).toISOString()}' WHERE id = 'default'`);
  const r = await guiMa(w, p);
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "maintenance");
  assert.equal(thu.length, 0);
  assert.equal(dongMa(w).length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM login_attempt WHERE key = ?", `mfa-mail:${SALES}`)[0].n, 0);
  assert.equal((await verify(w, p, "123456")).status, 503);
});

test("verify: thân method lạ → 400 (câu nhắc có email)", async () => {
  const { w } = await setup();
  const r = await w.call("POST", "/api/auth/mfa/verify", { body: { method: "SMS", code: "123456" }, headers: { "cf-connecting-ip": ip(), cookie: await pending(w) } });
  assert.equal(r.status, 400);
  assert.match(r.json.error.message, /email/);
});

test("KHÔNG LỘ: mã và địa chỉ email đầy đủ không có trong thân trả về, nhật ký, log máy", async () => {
  const { w, thu } = await setup();
  const { kq, log } = await batLog(async () => {
    const than: string[] = [];
    const r1 = await w.call("POST", "/api/auth/login", { body: { phone: "0900000001", pin: PIN }, headers: { "cf-connecting-ip": ip() } });
    than.push(r1.text);
    const p = cookieTen(r1, "td_mfa_pending")!;
    than.push((await guiMa(w, p)).text);
    than.push((await verify(w, p, "999999")).text);
    than.push((await verify(w, p, maTrongThu(thu[0]!))).text);
    return than;
  });
  const code = maTrongThu(thu[0]!);
  const nhatKy = JSON.stringify(w.q("SELECT * FROM audit_log"));
  for (const d of [code, EMAIL, "tuan.bao", "999999"]) {
    for (const t of kq) assert.ok(!t.includes(d), `thân trả về chứa "${d}"`);
    assert.ok(!nhatKy.includes(d), `nhật ký chứa "${d}"`);
    assert.ok(!log.includes(d), `log máy chứa "${d}"`);
  }
  for (const t of kq) assert.doesNotMatch(t, /code_hash|email_hash/);
});
