// ADR-0074 điều 4, 7 (kế hoạch Phần C Task 3): TỰ bật / đổi yếu tố email — `POST /api/account/mfa/email/start|confirm` (module accounts: lô ghi kèm nhật ký,
// mà auth không import audit) — và lô đổi quyền / vai kết thúc yếu tố email khi quyền SAU lô có Quản trị / Toàn quyền / Kế toán. Chạy CẢ ứng dụng trên
// SQLite thật (tests/audit/harness.mjs) với bộ gửi thư GIẢ ở env.EMAIL (đường gửi thành công chỉ thấy ở đây; e2e không có người gửi). Bản e2e:
// tests/e2e/hai-lop-email.mjs (phần Task 3). Cũng là bài KHÔNG LỘ: địa chỉ email đầy đủ và mã không có trong thân trả về, nhật ký, log máy.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";
import { encryptSecret } from "../auth/mfa-crypto.ts";
import { totpCode, TOTP_PERIOD } from "../auth/totp.ts";

const BH = "0e000000-0000-4000-8000-000000000001"; // Bán hàng
const DT = "0e000000-0000-4000-8000-000000000002"; // Đối tác (bên ngoài)
const QT = "0e000000-0000-4000-8000-000000000003"; // Quản trị
const KT = "0e000000-0000-4000-8000-000000000004"; // Kế toán
const TQ = "0e000000-0000-4000-8000-000000000005"; // Toàn quyền
const BH2 = "0e000000-0000-4000-8000-000000000006"; // Bán hàng có ứng dụng xác thực
const PHONE: Record<string, string> = { [BH]: "0903000001", [DT]: "0903000002", [QT]: "0903000003", [KT]: "0903000004", [TQ]: "0903000005", [BH2]: "0903000006" };
const PIN = "135790";
const KHOA = Buffer.alloc(32, 4).toString("base64");
const BI_MAT = new Uint8Array(20).map((_, i) => (i * 17 + 5) & 255);
const EMAIL = "Tuan.Bao@Gmail.com"; // người dùng gõ chữ hoa — máy chủ lưu dạng chuẩn hoá
const EMAIL_CHUAN = "tuan.bao@gmail.com";
const CHE = "t***@gmail.com";
const CAU_VAI_LON = "Tài khoản Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực.";
const NGAY = 86_400_000;

type Thu = { to: string; from: string; subject: string; text?: string };

async function setup(o: { mailer?: "ok" | "nem" } = {}) {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  w.env.FEEDBACK_MAIL_FROM = "no-reply@tourdao.vn";
  const thu: Thu[] = [];
  w.env.EMAIL = {
    send: async (m: Thu) => {
      if (o.mailer === "nem") throw new Error(`E_PROVIDER gửi tới ${m.to} hỏng`);
      thu.push(m);
    },
  };
  seedStaff(w.sqlite, { id: BH, phone: PHONE[BH], name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: DT, phone: PHONE[DT], name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: QT, phone: PHONE[QT], name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: KT, phone: PHONE[KT], name: "Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: TQ, phone: PHONE[TQ], name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: BH2, phone: PHONE[BH2], name: "Bán Hàng Hai", perms: ["SALES"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  await gieoYeuTo(w, BH2, "TOTP");
  return { w, thu };
}
type W = Awaited<ReturnType<typeof setup>>["w"];

async function gieoYeuTo(w: W, id: string, kind: "TOTP" | "EMAIL", email: string | null = null, at = new Date().toISOString()) {
  w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?, ?)",
  ).run(`f-${kind}-${id}-${Math.random()}`, id, kind, kind === "TOTP" ? await encryptSecret(KHOA, BI_MAT) : null, email, at, at, id, at, id);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Mã TOTP của bước hiện tại (chờ qua mốc nếu sắp sang bước mới — cửa sổ ±1 của máy chủ). `lech` = bước cộng thêm (mã mới hơn mã vừa tiêu). */
async function maTotp(lech = 0): Promise<string> {
  const du = Date.now() % (TOTP_PERIOD * 1000);
  if (du > TOTP_PERIOD * 1000 - 3000) await sleep(TOTP_PERIOD * 1000 - du + 50);
  return totpCode(BI_MAT, Math.floor(Date.now() / (TOTP_PERIOD * 1000)) + lech);
}
const start = (w: W, as: string, body: unknown) => w.call("POST", "/api/account/mfa/email/start", { as, body });
const confirm = (w: W, as: string, body: unknown) => w.call("POST", "/api/account/mfa/email/confirm", { as, body });
const maTrongThu = (t: Thu): string => /(\d{6})/.exec(t.text ?? "")![1]!;
const dem = (w: W, sql: string, ...a: unknown[]): number => Number((w.q(sql, ...a)[0] as { n: number }).n);
const yeuToSong = (w: W, id: string) => w.q("SELECT kind, email, updated_by AS b FROM aut_mfa_factor WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY kind", id).map((x: any) => ({ ...x }));
const han = (w: W, id: string): string | null => (w.q("SELECT mfa_grace_until AS g FROM staff WHERE id = ?", id)[0] as { g: string | null }).g;
const gan = (iso: string | null, moc: number) => iso !== null && Math.abs(Date.parse(iso) - moc) < 60_000;
const phienSong = (w: W, id: string) => dem(w, "SELECT count(*) AS n FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", id);
let ipn = 0;
const pinLogin = (w: W, id: string) => w.call("POST", "/api/auth/login", { body: { phone: PHONE[id], pin: PIN }, headers: { "cf-connecting-ip": `203.0.113.${(++ipn % 250) + 1}` } });

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

/** Bật email trọn vòng cho `as` (chưa có yếu tố khác hoặc kèm `currentCode`): trả phản hồi xác nhận. */
async function batEmail(w: W, thu: Thu[], as: string, email = EMAIL, currentCode?: string) {
  const s = await start(w, as, { email, ...(currentCode ? { currentCode } : {}) });
  assert.equal(s.status, 200, s.text);
  const r = await confirm(w, as, { email, code: maTrongThu(thu.at(-1)!) });
  assert.equal(r.status, 200, r.text);
  return r;
}

test("Bán hàng chưa có yếu tố: start gửi mã tới địa chỉ MỚI (trả dạng che) → confirm sai 401 → đúng: lưu yếu tố + 10 mã dự phòng + nhật ký mfa_enabled 'EMAIL'; không lộ địa chỉ / mã", async () => {
  const { w, thu } = await setup();
  const { kq: s, log } = await batLog(() => start(w, BH, { email: EMAIL }));
  assert.equal(s.status, 200, s.text);
  assert.deepEqual(s.json, { sent: true, emailMask: CHE });
  assert.equal(thu.length, 1);
  assert.equal(thu[0]!.to, EMAIL_CHUAN, "thư đi tới địa chỉ đã chuẩn hoá");
  assert.equal(yeuToSong(w, BH).length, 0, "start chưa lưu yếu tố");
  const ma = maTrongThu(thu[0]!);
  const sai = await confirm(w, BH, { email: EMAIL, code: ma === "000000" ? "111111" : "000000" });
  assert.equal(sai.status, 401, sai.text);
  assert.equal(yeuToSong(w, BH).length, 0);
  const { kq: r, log: log2 } = await batLog(() => confirm(w, BH, { email: EMAIL, code: ma }));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.recoveryCodes.length, 10, "yếu tố đầu tiên → 10 mã dự phòng");
  assert.deepEqual(yeuToSong(w, BH), [{ kind: "EMAIL", email: EMAIL_CHUAN, b: BH }]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ? AND used_at IS NULL AND revoked_at IS NULL", BH), 10);
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'mfa_enabled' AND staff_id = ?", BH).map((x: any) => x.detail), ["EMAIL"]);
  const lai = await confirm(w, BH, { email: EMAIL, code: ma });
  assert.notEqual(lai.status, 200, "mã đã dùng không dùng lại được");
  // GET trạng thái: email chỉ dạng che.
  const g = await w.call("GET", "/api/account/mfa", { as: BH });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json.factors.map((f: any) => ({ kind: f.kind, emailMask: f.emailMask })), [{ kind: "EMAIL", emailMask: CHE }]);
  // Đăng nhập PIN → bước hai có EMAIL, địa chỉ che.
  const l = await pinLogin(w, BH);
  assert.deepEqual(l.json, { next: "mfa", factors: ["EMAIL", "RECOVERY"], emailMask: CHE });
  // Không lộ: địa chỉ đầy đủ, mã không ở thân trả về (trừ khi người dùng tự gửi lên), nhật ký, log máy.
  const tatCa = [s.text, r.text, g.text, l.text, log, log2, JSON.stringify(w.q("SELECT * FROM audit_log"))].join("\n");
  assert.ok(!tatCa.toLowerCase().includes(EMAIL_CHUAN), "lộ địa chỉ đầy đủ");
  assert.ok(!tatCa.includes(ma), "lộ mã");
});

test("Quản trị / Toàn quyền / Kế toán: start và confirm → 409 đúng câu; không gửi thư, không ghi dòng mã", async () => {
  const { w, thu } = await setup();
  for (const id of [QT, TQ, KT]) {
    const s = await start(w, id, { email: EMAIL });
    assert.equal(s.status, 409, s.text);
    assert.equal(s.json.error.message, CAU_VAI_LON);
    const c = await confirm(w, id, { email: EMAIL, code: "123456" });
    assert.equal(c.status, 409, c.text);
    assert.equal(c.json.error.message, CAU_VAI_LON);
  }
  assert.equal(thu.length, 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_email_code"), 0);
  // GET trạng thái của Kế toán: lựa chọn được phép chỉ TOTP (giao diện không hiện lựa chọn Email).
  assert.deepEqual((await w.call("GET", "/api/account/mfa", { as: KT })).json.allowed, ["TOTP"]);
  assert.deepEqual((await w.call("GET", "/api/account/mfa", { as: BH })).json.allowed, ["TOTP", "EMAIL"]);
});

test("Đối tác (bên ngoài) tự bật email được (ADR-G1 bắt buộc chưa duyệt — tự nguyện)", async () => {
  const { w, thu } = await setup();
  await batEmail(w, thu, DT);
  assert.deepEqual(yeuToSong(w, DT).map((f: any) => f.kind), ["EMAIL"]);
});

test("Đã có ứng dụng xác thực: start đòi mã hiện có (thiếu 400, sai 401) → đúng: bật thêm email, KHÔNG sinh lại mã dự phòng", async () => {
  const { w, thu } = await setup();
  const thieu = await start(w, BH2, { email: EMAIL });
  assert.equal(thieu.status, 400, thieu.text);
  assert.equal(thieu.json.error.code, "current_code_required");
  const sai = await start(w, BH2, { email: EMAIL, currentCode: "000000" });
  assert.equal(sai.status, 401, sai.text);
  assert.equal(thu.length, 0, "mã hiện có sai → không gửi thư");
  const r = await batEmail(w, thu, BH2, EMAIL, await maTotp());
  assert.deepEqual(r.json, {}, "không phải yếu tố đầu tiên → không trả mã dự phòng");
  assert.deepEqual(yeuToSong(w, BH2).map((f: any) => f.kind), ["EMAIL", "TOTP"]);
});

test("Đổi địa chỉ: cần mã hiện có (mã dự phòng); mã gửi tới địa chỉ khác không xác nhận được; xác nhận xong yếu tố cũ hết hiệu lực", async () => {
  const { w, thu } = await setup();
  const dau = await batEmail(w, thu, BH);
  const duPhong = dau.json.recoveryCodes[0] as string;
  const s = await start(w, BH, { email: "moi@example.com", currentCode: duPhong });
  assert.equal(s.status, 200, s.text);
  assert.equal(s.json.emailMask, "m***@example.com");
  const ma = maTrongThu(thu.at(-1)!);
  const lech = await confirm(w, BH, { email: "khac@example.com", code: ma });
  assert.equal(lech.status, 401, "mã gửi tới moi@ không xác nhận địa chỉ khác");
  const r = await confirm(w, BH, { email: "moi@example.com", code: ma });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(yeuToSong(w, BH).map((f: any) => f.email), ["moi@example.com"]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = ? AND kind = 'EMAIL' AND valid_to_at IS NOT NULL", BH), 1);
});

test("Mã bật phát TRƯỚC khi có yếu tố mới (bật ứng dụng xác thực giữa start và confirm) → không xác nhận được", async () => {
  const { w, thu } = await setup();
  assert.equal((await start(w, BH, { email: EMAIL })).status, 200);
  await sleep(5);
  await gieoYeuTo(w, BH, "TOTP", null, new Date(Date.now() + 1000).toISOString());
  const r = await confirm(w, BH, { email: EMAIL, code: maTrongThu(thu.at(-1)!) });
  assert.notEqual(r.status, 200, r.text);
  assert.deepEqual(yeuToSong(w, BH).map((f: any) => f.kind), ["TOTP"]);
});

test("Được cấp Kế toán giữa start và confirm → confirm 409 (không chèn yếu tố lệch)", async () => {
  const { w, thu } = await setup();
  assert.equal((await start(w, BH, { email: EMAIL })).status, 200);
  assert.equal((await w.call("PUT", `/api/staff/${BH}/permissions`, { as: TQ, body: { permissions: ["SALES", "ACCOUNTING"] } })).status, 200);
  const r = await confirm(w, BH, { email: EMAIL, code: maTrongThu(thu.at(-1)!) });
  assert.equal(r.status, 409, r.text);
  assert.equal(yeuToSong(w, BH).length, 0);
});

test("Gửi hỏng → 502 lời thường (dòng mã vẫn ghi); hạn mức gửi 3 thư / 15 phút dùng chung khoá mfa-mail:<id> → lần 4: 429 câu gửi thư", async () => {
  const { w } = await setup({ mailer: "nem" });
  for (let i = 0; i < 3; i++) {
    const { kq: r, log } = await batLog(() => start(w, BH, { email: EMAIL }));
    assert.equal(r.status, 502, r.text);
    assert.deepEqual(r.json.error, { code: "mail_failed", message: "Chưa gửi được email, thử lại hoặc dùng cách khác." });
    assert.ok(!log.includes("E_PROVIDER") && !log.toLowerCase().includes(EMAIL_CHUAN), log);
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_email_code WHERE staff_id = ? AND purpose = 'enroll'", BH), 3);
  const r4 = await start(w, BH, { email: EMAIL });
  assert.equal(r4.status, 429, r4.text);
  assert.match(r4.json.error.message, /Đã gửi quá nhiều mã qua email/);
});

test("Gửi lại sau 502 với CÙNG vé (máy khách giữ vé khi 5xx) → máy chủ gửi thư MỚI, không báo 'đã ghi' (start không có lô ghi mang vé — NGOAI_VE guiMaBatEmail)", async () => {
  const { w } = await setup({ mailer: "nem" });
  const ve = crypto.randomUUID();
  const goi = () => w.call("POST", "/api/account/mfa/email/start", { as: BH, body: { email: EMAIL }, headers: { "idempotency-key": ve } });
  const r1 = await batLog(goi);
  assert.equal(r1.kq.status, 502, r1.kq.text);
  await w.choNen();
  const r2 = await batLog(goi);
  assert.equal(r2.kq.status, 502, `lần hai phải thử gửi lại, không phát lại: ${r2.kq.text}`);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_mfa_email_code WHERE staff_id = ? AND purpose = 'enroll'", BH), 2, "hai lần gửi → hai dòng mã");
  assert.equal(dem(w, "SELECT count(*) AS n FROM lg_lan_gui WHERE staff_id = ?", BH), 0, "start không ghi vé");
});

test("Địa chỉ sai khuôn → 400; thiếu mã ở confirm → 400", async () => {
  const { w } = await setup();
  assert.equal((await start(w, BH, { email: "khong-phai-email" })).status, 400);
  assert.equal((await confirm(w, BH, { email: EMAIL })).status, 400);
});

// ---- Lô đổi quyền / vai (ADR-0074 điều 7; kế hoạch Phần C Task 3; đặc tả §4.3 Q4 = A) ----

test("Bán hàng chỉ có email → gán vai Kế toán: yếu tố email hết hiệu lực trong CÙNG lô (người làm = Toàn quyền) + nhật ký; hạn NULL → ân hạn 14 ngày; VÒNG SỬA 1: mọi phiên + máy tin bị thu hồi (phiên/máy tin sinh từ email không còn hợp lệ)", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, BH, "EMAIL", EMAIL_CHUAN);
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = NULL WHERE id = ?").run(BH);
  await w.token(BH);
  const r = await w.call("PUT", `/api/staff/${BH}/roles`, { as: TQ, body: { roles: ["ACCOUNTANT"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(yeuToSong(w, BH), []);
  assert.deepEqual(w.q("SELECT updated_by AS b FROM aut_mfa_factor WHERE staff_id = ? AND kind = 'EMAIL'", BH).map((x: any) => x.b), [TQ]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_removed' AND target_id = ? AND staff_id = ?", BH, TQ), 1);
  assert.ok(gan(han(w, BH), Date.now() + 14 * NGAY), `ân hạn: ${han(w, BH)}`);
  assert.equal(phienSong(w, BH), 0, "vòng sửa 1: phiên đăng nhập bằng email kết thúc trong cùng lô");
  assert.deepEqual(w.q("SELECT DISTINCT end_reason AS l, ended_by AS b FROM aut_session WHERE staff_id = ?", BH).map((x: any) => ({ ...x })), [{ l: "bi_go", b: TQ }]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'session_revoked' AND target_id = ? AND staff_id = ?", BH, TQ), 1);
  const g = await w.call("GET", "/api/account/mfa", { as: BH });
  assert.deepEqual(g.json.factors, []);
  assert.deepEqual(g.json.allowed, ["TOTP"]);
  assert.equal(g.json.required, true);
});

test("Bán hàng chỉ có email, ân hạn ĐÃ QUA → cấp Kế toán (đường quyền kiểu cũ): kết thúc mọi phiên + session_revoked; không gia hạn; đăng nhập PIN 403", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, BH, "EMAIL", EMAIL_CHUAN);
  const qua = new Date(Date.now() - NGAY).toISOString();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(qua, BH);
  await w.token(BH);
  const r = await w.call("PUT", `/api/staff/${BH}/permissions`, { as: TQ, body: { permissions: ["SALES", "ACCOUNTING"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(yeuToSong(w, BH), []);
  assert.equal(han(w, BH), qua, "hạn đã qua giữ nguyên (không gia hạn — kẽ hở Phần B)");
  assert.equal(phienSong(w, BH), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'session_revoked' AND target_id = ? AND staff_id = ?", BH, TQ), 1, "đúng MỘT dòng (không kết thúc phiên hai lần)");
  assert.equal((await pinLogin(w, BH)).status, 403);
});

test("Bán hàng chỉ có email, ân hạn CÒN → cấp Kế toán: email hết hiệu lực, hạn giữ nguyên; vòng sửa 1: phiên kết thúc", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, BH, "EMAIL", EMAIL_CHUAN);
  const con = new Date(Date.now() + 3 * NGAY).toISOString();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run(con, BH);
  await w.token(BH);
  assert.equal((await w.call("PUT", `/api/staff/${BH}/permissions`, { as: TQ, body: { permissions: ["SALES", "ACCOUNTING"] } })).status, 200);
  assert.deepEqual(yeuToSong(w, BH), []);
  assert.equal(han(w, BH), con);
  assert.equal(phienSong(w, BH), 0);
});

test("Có cả ứng dụng xác thực lẫn email → lên Quản trị: chỉ email hết hiệu lực; TOTP giữ; hạn không đổi; vòng sửa 1: phiên + máy tin thu hồi toàn bộ (không tách được cái nào sinh từ email)", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, BH2, "EMAIL", EMAIL_CHUAN);
  const hanTruoc = han(w, BH2);
  await w.token(BH2);
  assert.equal((await w.call("PUT", `/api/staff/${BH2}/permissions`, { as: TQ, body: { permissions: ["SALES", "ADMIN"] } })).status, 200);
  assert.deepEqual(yeuToSong(w, BH2).map((f: any) => f.kind), ["TOTP"]);
  assert.equal(han(w, BH2), hanTruoc);
  assert.equal(phienSong(w, BH2), 0);
  const l = await pinLogin(w, BH2);
  assert.deepEqual(l.json, { next: "mfa", factors: ["TOTP", "RECOVERY"], emailMask: null });
});

test("Vòng sửa 1 (an ninh): đăng nhập bằng mã EMAIL + tin máy → được gán vai Kế toán → phiên cũ 401, máy tin thu hồi 'tat_hai_lop': PIN với cookie máy tin cũ phải hỏi mã (chỉ TOTP / dự phòng)", async () => {
  const { w, thu } = await setup();
  await gieoYeuTo(w, BH2, "EMAIL", EMAIL_CHUAN);
  const cookieTen = (r: any, ten: string): string | null => {
    const c = (r.headers.getSetCookie() as string[]).find((x) => x.startsWith(`${ten}=`) && !x.startsWith(`${ten}=;`));
    return c ? c.split(";")[0]! : null;
  };
  const ip = () => `203.0.113.${(++ipn % 250) + 1}`;
  const l = await pinLogin(w, BH2);
  assert.deepEqual([...l.json.factors].sort(), ["EMAIL", "RECOVERY", "TOTP"]); // cùng mốc tạo ⇒ thứ tự theo id ngẫu nhiên
  const cho = cookieTen(l, "td_mfa_pending")!;
  const g = await w.call("POST", "/api/auth/mfa/email", { body: {}, headers: { "cf-connecting-ip": ip(), cookie: cho } });
  assert.equal(g.status, 200, g.text);
  const v = await w.call("POST", "/api/auth/mfa/verify", { body: { method: "EMAIL", code: maTrongThu(thu.at(-1)!), trustDevice: true }, headers: { "cf-connecting-ip": ip(), cookie: cho } });
  assert.equal(v.status, 200, v.text);
  const phien = cookieTen(v, "td_session")!;
  const mayTin = cookieTen(v, "td_trusted")!;
  assert.ok(phien && mayTin);
  // Trước khi đổi quyền: máy tin bỏ qua bước hai.
  const truoc = await w.call("POST", "/api/auth/login", { body: { phone: PHONE[BH2], pin: PIN }, headers: { "cf-connecting-ip": ip(), cookie: mayTin } });
  assert.ok(cookieTen(truoc, "td_session"), `máy tin còn hiệu lực trước khi đổi quyền: ${truoc.text}`);
  const phienMoiNhat = cookieTen(truoc, "td_session")!;
  const r = await w.call("PUT", `/api/staff/${BH2}/roles`, { as: TQ, body: { roles: ["ACCOUNTANT"] } });
  assert.equal(r.status, 200, r.text);
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: phienMoiNhat } })).status, 401, "phiên sinh từ máy tin / email phải chết");
  assert.equal((await w.call("GET", "/api/auth/me", { headers: { cookie: phien } })).status, 401);
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_trusted_device WHERE staff_id = ? AND revoked_at IS NULL", BH2), 0);
  assert.deepEqual(w.q("SELECT DISTINCT revoke_reason AS l, updated_by AS b FROM aut_trusted_device WHERE staff_id = ?", BH2).map((x: any) => ({ ...x })), [{ l: "tat_hai_lop", b: TQ }]);
  const sau = await w.call("POST", "/api/auth/login", { body: { phone: PHONE[BH2], pin: PIN }, headers: { "cf-connecting-ip": ip(), cookie: mayTin } });
  assert.equal(cookieTen(sau, "td_session"), null, "máy tin cũ không còn bỏ qua bước hai");
  assert.deepEqual(sau.json, { next: "mfa", factors: ["TOTP", "RECOVERY"], emailMask: null });
});

test("Đối tác có email → cấp Kế toán (bên ngoài → nội bộ): email hết hiệu lực VÀ hạn NULL → ân hạn 14 ngày (yếu tố tính SAU lô)", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, DT, "EMAIL", EMAIL_CHUAN);
  assert.equal(han(w, DT), null);
  const r = await w.call("PUT", `/api/staff/${DT}/permissions`, { as: TQ, body: { permissions: ["ACCOUNTING"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(yeuToSong(w, DT), []);
  assert.ok(gan(han(w, DT), Date.now() + 14 * NGAY), `ân hạn: ${han(w, DT)}`);
});

test("Đổi vai KHÔNG có quyền lớn → yếu tố email giữ nguyên", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, BH, "EMAIL", EMAIL_CHUAN);
  const r = await w.call("PUT", `/api/staff/${BH}/roles`, { as: TQ, body: { roles: ["SALES_STAFF"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(yeuToSong(w, BH).map((f: any) => f.kind), ["EMAIL"]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'mfa_removed' AND target_id = ?", BH), 0);
});

test("Đăng nhập PIN: tài khoản quyền lớn có dòng EMAIL lệch → phản hồi KHÔNG liệt kê EMAIL, emailMask null", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, QT, "TOTP");
  await gieoYeuTo(w, QT, "EMAIL", "qt@gmail.com");
  const l = await pinLogin(w, QT);
  assert.deepEqual(l.json, { next: "mfa", factors: ["TOTP", "RECOVERY"], emailMask: null });
  // GET trạng thái: dòng lệch vẫn hiện để chính người đó gỡ được (dạng che), nhưng lựa chọn được phép chỉ TOTP.
  const g = await w.call("GET", "/api/account/mfa", { as: QT });
  assert.deepEqual(g.json.allowed, ["TOTP"]);
  assert.ok(!g.text.includes("qt@gmail.com"));
});

test("Quản lý tài khoản (GET /api/staff): nhãn «Đã bật» KHÔNG tính dòng EMAIL lệch của vai lớn — Quản trị chỉ có EMAIL lệch = chưa bật (kèm hạn ân hạn); có TOTP = đã bật; Bán hàng có EMAIL = đã bật", async () => {
  const { w } = await setup();
  await gieoYeuTo(w, QT, "EMAIL", "qt@gmail.com");
  await gieoYeuTo(w, KT, "TOTP");
  await gieoYeuTo(w, KT, "EMAIL", "kt@gmail.com");
  await gieoYeuTo(w, BH, "EMAIL", EMAIL_CHUAN);
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = ?").run("2099-01-01T00:00:00.000Z", QT);
  const r = await w.call("GET", "/api/staff", { as: TQ });
  assert.equal(r.status, 200, r.text);
  const mfa = (id: string) => r.json.staff.find((s: any) => s.id === id).mfa;
  assert.deepEqual(mfa(QT), { enabled: false, graceUntil: "2099-01-01T00:00:00.000Z" }, "Quản trị chỉ có dòng EMAIL lệch");
  assert.deepEqual(mfa(KT), { enabled: true, graceUntil: null }, "Kế toán có TOTP (EMAIL lệch không đổi gì)");
  assert.deepEqual(mfa(BH), { enabled: true, graceUntil: null }, "Bán hàng bật email");
  assert.ok(!r.text.includes("@gmail.com"), "danh sách không mang địa chỉ email");
});
