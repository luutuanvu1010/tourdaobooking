// HÀNG RÀO KHÔNG LỘ ĐỊA CHỈ EMAIL (ADR-0074 điều 4, 8; kế hoạch Phần C Task 4 Step 1; Global Constraints "email chỉ hiện dạng che"): đi qua MỌI route
// `/api/auth/mfa/*` và `/api/account/mfa*` (cộng phản hồi đăng nhập PIN và danh sách Quản lý tài khoản — hai nơi khác mang trạng thái hai lớp) trên
// SQLite thật (tests/audit/harness.mjs), cả đường đúng lẫn đường lỗi (400 địa chỉ sai khuôn, 400 thiếu mã hiện có, 401, 409, 429, 502, gỡ), rồi chặn khi:
//   (1) thân phản hồi chứa địa chỉ đầy đủ (so chữ thường, cả dạng người dùng gõ lẫn dạng chuẩn hoá) — dạng che `t***@gmail.com` được phép;
//   (2) nhật ký `audit_log` (mọi cột) chứa ký tự `@`;
//   (3) log máy (console.*) chứa ký tự `@`.
// "Mọi route" do MÃ quyết, không do danh sách tay: bài đọc khai `route("…", "/api/auth/mfa…" | "/api/account/mfa…"` trong src/modules/**, rồi đòi bài đã gọi
// đủ từng route — thêm route mới vào hai tiền tố mà không thêm ca ở đây ⇒ đỏ.
// Giới hạn: chỉ canh các đường bài đi qua; route khác (ngoài hai tiền tố) trả địa chỉ thì không thấy. Thư gửi đi (bộ gửi giả) ĐƯỢC mang địa chỉ người nhận.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { doNhatKyHang } from "../tests/audit/nhat-ky-hang.mjs";
import { hashPin } from "./modules/staff/password.ts";
import { encryptSecret } from "./modules/auth/mfa-crypto.ts";
import { totpCode, TOTP_PERIOD } from "./modules/auth/totp.ts";

const A = "0f000000-0000-4000-8000-000000000001"; // Bán hàng, chưa có yếu tố → bật email
const B = "0f000000-0000-4000-8000-000000000002"; // Bán hàng có ứng dụng xác thực + email → gỡ email
const C = "0f000000-0000-4000-8000-000000000003"; // Bán hàng chưa có yếu tố → 502, 429 gửi thư
const Q = "0f000000-0000-4000-8000-000000000004"; // Quản trị → 409
const TQ = "0f000000-0000-4000-8000-000000000005"; // Toàn quyền → xem danh sách tài khoản
const PHONE: Record<string, string> = { [A]: "0904000001", [B]: "0904000002", [C]: "0904000003", [Q]: "0904000004", [TQ]: "0904000005" };
const PIN = "246813";
const KHOA = Buffer.alloc(32, 9).toString("base64");
const BI_MAT = new Uint8Array(20).map((_, i) => (i * 13 + 7) & 255);
const DIA_CHI = {
  aGo: "Tuan.Bao@Gmail.com", // người dùng gõ chữ hoa
  aMoi: "tuan.bao.moi@gmail.com",
  b: "binh.email@yahoo.com",
  c: "cuong.thu@outlook.com",
  q: "quan.tri@gmail.com",
  sai: "sai khuon@gmail.com", // có dấu cách → 400, không được dội lại
};

type Thu = { to: string; text?: string };
type Goi = { method: string; path: string; status: number; text: string };

/** Route khai trong mã ở hai tiền tố, dạng "METHOD /đường/dẫn" (giữ `:id`). */
function routeTrongMa(): string[] {
  const goc = fileURLToPath(new URL("./modules/", import.meta.url));
  const out: string[] = [];
  const duyet = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) duyet(p);
      else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
        for (const m of readFileSync(p, "utf8").matchAll(/\broute\(\s*"([A-Z]+)",\s*"(\/api\/(?:auth\/mfa|account\/mfa)[^"]*)"/g)) out.push(`${m[1]} ${m[2]}`);
      }
    }
  };
  duyet(goc);
  return [...new Set(out)].sort();
}
/** "METHOD /đường/dẫn/thật" có khớp mẫu route "METHOD /đường/:id" không. */
const khop = (mau: string, that: string): boolean => {
  const [m1, p1] = mau.split(" ");
  const [m2, p2] = that.split(" ");
  return m1 === m2 && new RegExp(`^${p1!.replace(/:[a-zA-Z]+/g, "[^/]+")}$`).test(p2!);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function maTotp(): Promise<string> {
  const du = Date.now() % (TOTP_PERIOD * 1000);
  if (du > TOTP_PERIOD * 1000 - 3000) await sleep(TOTP_PERIOD * 1000 - du + 50);
  return totpCode(BI_MAT, Math.floor(Date.now() / (TOTP_PERIOD * 1000)));
}
const cookieTen = (r: { headers: Headers }, ten: string): string => {
  const c = r.headers.getSetCookie().find((x) => x.startsWith(`${ten}=`) && !x.startsWith(`${ten}=;`));
  assert.ok(c, `thiếu cookie ${ten}`);
  return c.split(";")[0]!;
};
let ipn = 0;
const ip = () => `192.0.2.${(++ipn % 250) + 1}`;

test("không lộ địa chỉ email: MỌI route /api/auth/mfa/* và /api/account/mfa* (đường đúng + lỗi), đăng nhập PIN, danh sách tài khoản — thân chỉ dạng che; nhật ký và log máy không có '@'", async () => {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  w.env.FEEDBACK_MAIL_FROM = "no-reply@tourdao.vn";
  const thu: Thu[] = [];
  let guiHong = false;
  w.env.EMAIL = {
    send: async (m: Thu) => {
      if (guiHong) throw new Error(`E_PROVIDER gửi tới ${m.to} hỏng`); // câu lỗi nhà cung cấp mang địa chỉ — máy chủ không được in lại
      thu.push(m);
    },
  };
  seedStaff(w.sqlite, { id: A, phone: PHONE[A], name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: B, phone: PHONE[B], name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: C, phone: PHONE[C], name: "Cường", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: Q, phone: PHONE[Q], name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: TQ, phone: PHONE[TQ], name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  const at = new Date().toISOString();
  const yeuTo = w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?, ?)",
  );
  yeuTo.run("kl-b-totp", B, "TOTP", await encryptSecret(KHOA, BI_MAT), null, at, at, B, at, B);
  yeuTo.run("kl-b-email", B, "EMAIL", null, DIA_CHI.b, at, at, B, at, B);
  yeuTo.run("kl-q-totp", Q, "TOTP", await encryptSecret(KHOA, BI_MAT), null, at, at, Q, at, Q);
  yeuTo.run("kl-q-email", Q, "EMAIL", null, DIA_CHI.q, at, at, Q, at, Q); // dòng lệch (R-AUT-MFA-4) — vẫn không được lộ

  const goi: Goi[] = [];
  const call = async (method: string, path: string, o: { as?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const r = await w.call(method, path, o);
    goi.push({ method, path, status: r.status, text: r.text });
    return r;
  };
  const coStatus = (path: string, status: number) => assert.ok(goi.some((g) => g.path === path && g.status === status), `chưa đi qua ${path} → ${status}`);
  const maTrongThu = (): string => /(\d{6})/.exec(thu.at(-1)!.text ?? "")![1]!;
  const pinLogin = (id: string) => call("POST", "/api/auth/login", { body: { phone: PHONE[id], pin: PIN }, headers: { "cf-connecting-ip": ip() } });

  const goc = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  let log = "";
  const ghi = (...a: unknown[]) => void (log += a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : String(x))).join(" ") + "\n");
  Object.assign(console, { log: ghi, info: ghi, warn: ghi, error: ghi });
  try {
    // ---- Trang Tôi: A bật email (400 sai khuôn → 200 gửi → 401 mã sai → 200 xác nhận), xem trạng thái, đổi địa chỉ bằng mã dự phòng.
    await call("POST", "/api/account/mfa/email/start", { as: A, body: { email: DIA_CHI.sai } });
    coStatus("/api/account/mfa/email/start", 400);
    await call("POST", "/api/account/mfa/email/start", { as: A, body: { email: DIA_CHI.aGo } });
    coStatus("/api/account/mfa/email/start", 200);
    const ma1 = maTrongThu();
    await call("POST", "/api/account/mfa/email/confirm", { as: A, body: { email: DIA_CHI.aGo, code: ma1 === "000000" ? "111111" : "000000" } });
    coStatus("/api/account/mfa/email/confirm", 401);
    const bat = await call("POST", "/api/account/mfa/email/confirm", { as: A, body: { email: DIA_CHI.aGo, code: ma1 } });
    assert.equal(bat.status, 200, bat.text);
    const duPhong = bat.json.recoveryCodes as string[];
    await call("GET", "/api/account/mfa", { as: A });
    coStatus("/api/account/mfa", 200);
    await call("POST", "/api/account/mfa/email/start", { as: A, body: { email: DIA_CHI.aMoi } });
    coStatus("/api/account/mfa/email/start", 400); // thiếu mã hiện có
    await call("POST", "/api/account/mfa/email/start", { as: A, body: { email: DIA_CHI.aMoi, currentCode: "0000-0000" } });
    coStatus("/api/account/mfa/email/start", 401);
    const doi = await call("POST", "/api/account/mfa/email/start", { as: A, body: { email: DIA_CHI.aMoi, currentCode: duPhong[0] } });
    assert.equal(doi.status, 200, doi.text);
    const doiXong = await call("POST", "/api/account/mfa/email/confirm", { as: A, body: { email: DIA_CHI.aMoi, code: maTrongThu() } });
    assert.equal(doiXong.status, 200, doiXong.text);
    await call("GET", "/api/account/mfa", { as: A });
    // Ứng dụng xác thực, mã dự phòng, gỡ yếu tố cuối (nội bộ → 409), quên máy.
    await call("POST", "/api/account/mfa/totp/start", { as: A });
    coStatus("/api/account/mfa/totp/start", 200);
    await call("POST", "/api/account/mfa/totp/confirm", { as: A, body: { setupToken: "hong", code: "123456" } });
    await call("POST", "/api/account/mfa/recovery/regenerate", { as: A, body: { code: "123456" } });
    coStatus("/api/account/mfa/recovery/regenerate", 409);
    await call("POST", "/api/account/mfa/remove", { as: A, body: { kind: "EMAIL", code: duPhong[1] } });
    coStatus("/api/account/mfa/remove", 409);
    await call("POST", `/api/account/mfa/trusted/${crypto.randomUUID()}/forget`, { as: A });
    await call("POST", "/api/account/mfa/trusted/forget-all", { as: A });
    // B (ứng dụng xác thực + email): ở bước đăng nhập bấm gửi mã khi nhà cung cấp hỏng → 502; rồi gỡ email ở trang Tôi → 200.
    const lb1 = await pinLogin(B);
    guiHong = true;
    await call("POST", "/api/auth/mfa/email", { body: {}, headers: { cookie: cookieTen(lb1, "td_mfa_pending"), "cf-connecting-ip": ip() } });
    coStatus("/api/auth/mfa/email", 502);
    guiHong = false;
    await call("GET", "/api/account/mfa", { as: B });
    const go = await call("POST", "/api/account/mfa/remove", { as: B, body: { kind: "EMAIL", code: await maTotp() } });
    assert.equal(go.status, 200, go.text);
    // C: 502 (nhà cung cấp ném lỗi có địa chỉ) → 200 → 200 → 429 hạn mức gửi thư.
    guiHong = true;
    await call("POST", "/api/account/mfa/email/start", { as: C, body: { email: DIA_CHI.c } });
    coStatus("/api/account/mfa/email/start", 502);
    guiHong = false;
    await call("POST", "/api/account/mfa/email/start", { as: C, body: { email: DIA_CHI.c } });
    await call("POST", "/api/account/mfa/email/start", { as: C, body: { email: DIA_CHI.c } });
    await call("POST", "/api/account/mfa/email/start", { as: C, body: { email: DIA_CHI.c } });
    coStatus("/api/account/mfa/email/start", 429);
    // Quản trị: 409 ở cả hai bước; trạng thái của chính mình (dòng lệch) chỉ dạng che.
    await call("POST", "/api/account/mfa/email/start", { as: Q, body: { email: DIA_CHI.q } });
    coStatus("/api/account/mfa/email/start", 409);
    await call("POST", "/api/account/mfa/email/confirm", { as: Q, body: { email: DIA_CHI.q, code: "123456" } });
    coStatus("/api/account/mfa/email/confirm", 409);
    await call("GET", "/api/account/mfa", { as: Q });

    // ---- Bước đăng nhập: A PIN → gửi mã 200 (lần thứ ba trong 15 phút của A) → mã sai 401 → mã đúng 200; bước bật lại (cookie chờ purpose verify → bị từ chối).
    const l = await pinLogin(A);
    assert.equal(l.json?.next, "mfa", l.text);
    const cho = cookieTen(l, "td_mfa_pending");
    const h = () => ({ cookie: cho, "cf-connecting-ip": ip() });
    await call("POST", "/api/auth/mfa/email", { body: {}, headers: h() });
    coStatus("/api/auth/mfa/email", 200);
    const ma2 = maTrongThu();
    await call("POST", "/api/auth/mfa/enroll/start", { body: {}, headers: h() });
    await call("POST", "/api/auth/mfa/enroll/confirm", { body: { setupToken: "hong", code: "123456" }, headers: h() });
    await call("POST", "/api/auth/mfa/verify", { body: { method: "EMAIL", code: ma2 === "000000" ? "111111" : "000000", trustDevice: false }, headers: h() });
    coStatus("/api/auth/mfa/verify", 401);
    await call("POST", "/api/auth/mfa/verify", { body: { method: "EMAIL", code: ma2, trustDevice: true }, headers: h() });
    coStatus("/api/auth/mfa/verify", 200);
    await pinLogin(Q); // vai lớn có dòng lệch: không liệt kê EMAIL
    // B đã gỡ email (còn ứng dụng xác thực): bấm gửi mã ở bước đăng nhập → 409.
    const lb = await pinLogin(B);
    await call("POST", "/api/auth/mfa/email", { body: {}, headers: { cookie: cookieTen(lb, "td_mfa_pending"), "cf-connecting-ip": ip() } });
    coStatus("/api/auth/mfa/email", 409);

    // ---- Danh sách Quản lý tài khoản (DTO của người khác).
    await call("GET", "/api/staff", { as: TQ });
    coStatus("/api/staff", 200);

    // Hiến chương 5.20 (lát H-0 Gói 2): bài này chịu trách nhiệm sinh dữ liệu thật cho các cột bí mật xác thực (N4) rồi dò chúng trong nhật ký.
    const dsN4 = doNhatKyHang(w.sqlite, ["staff.pin_hash", "aut_mfa_factor.secret_enc", "aut_mfa_recovery_code.code_hash", "aut_mfa_email_code.code_hash", "aut_trusted_device.token_hash"]);
    assert.deepEqual(dsN4.rong, [], "bài rỗng: cột N4 phụ trách chưa có dữ liệu thật");
    assert.deepEqual(dsN4.lo, [], "nhật ký chứa giá trị hạng N3/N4");
  } finally {
    Object.assign(console, goc);
  }

  // (0) Đủ route: mỗi route khai trong mã ở hai tiền tố đã được gọi ít nhất một lần.
  const khai = routeTrongMa();
  assert.ok(khai.length >= 13, `bài rỗng? chỉ thấy ${khai.length} route: ${khai.join(", ")}`);
  const daGoi = goi.map((g) => `${g.method} ${g.path}`);
  assert.deepEqual(khai.filter((mau) => !daGoi.some((x) => khop(mau, x))), [], "route chưa có ca trong bài không lộ — thêm ca cho route mới");
  assert.ok(thu.some((t) => t.to === DIA_CHI.aGo.toLowerCase()) && thu.some((t) => t.to === DIA_CHI.aMoi), "chống bài rỗng: thư thật sự đi tới hai địa chỉ của A");

  // (1) Thân phản hồi: không địa chỉ đầy đủ (chữ thường cả hai phía). Dạng che có '@' nên KHÔNG cấm '@' ở đây.
  const day = Object.values(DIA_CHI).flatMap((d) => [d.toLowerCase(), d.toLowerCase().split("@")[0]!]);
  for (const g of goi) {
    const t = g.text.toLowerCase();
    for (const d of day) assert.ok(!t.includes(d), `${g.method} ${g.path} → ${g.status} lộ «${d}»: ${g.text.slice(0, 200)}`);
  }
  assert.ok(goi.some((g) => g.text.includes("t***@gmail.com")), "chống bài rỗng: dạng che có xuất hiện");

  // (2) Nhật ký: không '@' ở bất kỳ cột nào.
  const nhatKy = w.q("SELECT * FROM audit_log");
  assert.ok(nhatKy.length >= 3, "chống bài rỗng: có nhật ký mfa_enabled / mfa_removed");
  for (const row of nhatKy) assert.ok(!JSON.stringify(row).includes("@"), `nhật ký có '@': ${JSON.stringify(row)}`);

  // (3) Log máy: không '@' (lỗi nhà cung cấp mang địa chỉ không được in lại).
  assert.ok(!log.includes("@"), `log máy có '@':\n${log.split("\n").filter((x) => x.includes("@")).join("\n")}`);
  assert.ok(log.includes("mfa_mail_failed"), "chống bài rỗng: log gửi hỏng có thật");
});
