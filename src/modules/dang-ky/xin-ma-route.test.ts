// Route công khai đầu tiên của người đăng ký (ADR-0206 Đ6, Đ7, Đ8): xin mã gửi email, nhập mã, cấu hình, chính sách riêng tư — qua khung thử THẬT (tests/audit/harness.mjs).
// Thư đi bằng bộ gửi GIẢ gắn vào env (không bao giờ gửi thư thật); Turnstile hỏi `fetch` toàn cục đã thay bằng bản giả.
import { after, test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { DK_COOKIE } from "./phien.ts";

const DUONG_MA = "/api/dang-ky/ma";
const DUONG_XN = "/api/dang-ky/xac-nhan";
const IP = "203.0.113.9";
const TOT = "token-tot";
const goc = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  if (!String(url).includes("challenges.cloudflare.com")) return goc(url, init);
  const ok = new URLSearchParams(String(init?.body)).get("response") === TOT;
  return new Response(JSON.stringify({ success: ok, "error-codes": ok ? [] : ["invalid-input-response"] }), { status: 200 });
}) as typeof fetch;
after(() => { globalThis.fetch = goc; });

type Thu = { to: string; from: string; subject: string; text?: string; html?: string };

function setup(o: { mo?: boolean; chinhSach?: Record<string, number> } = {}) {
  const w = world();
  w.env.TURNSTILE_SECRET_KEY = "khoa-bi-mat-thu";
  w.env.TURNSTILE_SITE_KEY = "khoa-site-thu";
  w.env.FEEDBACK_MAIL_FROM = "no-reply@booking.tourdao.vn";
  const thu: Thu[] = [];
  w.env.EMAIL = { send: async (m: Thu) => { thu.push(m); } };
  if (o.mo !== false || o.chinhSach) datChinhSach(w, { registration_open: o.mo === false ? 0 : 1, ...(o.chinhSach ?? {}) });
  return { w, thu };
}
/** Thêm một dòng chính sách (bảng chỉ-thêm) chép dòng hiện hành, đổi vài cột. */
function datChinhSach(w: any, doi: Record<string, number>): void {
  const cu = w.sqlite.prepare("SELECT * FROM dk_policy ORDER BY valid_from_at DESC LIMIT 1").get() as Record<string, unknown>;
  const moi = { ...cu, ...doi, id: `thu-${Math.random().toString(36).slice(2)}`, valid_from_at: new Date(Date.parse(String(cu.valid_from_at)) + 1).toISOString() };
  const cot = Object.keys(moi);
  w.sqlite.prepare(`INSERT INTO dk_policy (${cot.join(",")}) VALUES (${cot.map(() => "?").join(",")})`).run(...Object.values(moi));
}
const xin = (w: any, email: unknown, o: { token?: string | null; ip?: string } = {}) =>
  w.call("POST", DUONG_MA, { body: { email, turnstileToken: o.token === undefined ? TOT : o.token }, headers: { "cf-connecting-ip": o.ip ?? IP } });
const xacNhan = (w: any, email: unknown, ma: unknown, ip = IP) => w.call("POST", DUONG_XN, { body: { email, ma }, headers: { "cf-connecting-ip": ip } });
const dau = (r: any): string => JSON.stringify([r.status, r.text, r.headers.get("content-type"), r.headers.get("cache-control"), r.headers.get("set-cookie")]);
const maTrongThu = (t: Thu): string => /\b(\d{6})\b/.exec(t.text ?? "")![1]!;
const phieu = (w: any): any[] => w.q("SELECT * FROM dk_registration ORDER BY created_at, rowid").map((x: any) => ({ ...x }));
const danhTinh = (w: any): any[] => w.q("SELECT * FROM dk_identity ORDER BY created_at, rowid").map((x: any) => ({ ...x }));
const soMa = (w: any): number => (w.q("SELECT count(*) AS n FROM dk_email_code")[0] as any).n;
function chenPhieu(w: any, email: string, trangThai: string, o: { activated?: boolean } = {}) {
  const at = new Date().toISOString();
  const id = "DK_" + email.replace(/[^a-z]/g, "").toUpperCase().padEnd(8, "X").slice(0, 8);
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'GUIDE', ?, ?)").run(id, at, at);
  const ident = `ident-${id}`;
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(ident, id, email, email, at, at);
  const duong: Record<string, string[]> = { DANG_DIEN: [], CHO_XAC_MINH: ["CHO_XAC_MINH"], DA_DUYET: ["CHO_XAC_MINH", "CHO_DUYET", "DA_DUYET"] };
  for (const t of duong[trangThai] ?? []) w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, id);
  if (o.activated) w.sqlite.prepare("UPDATE dk_registration SET activated_at = ? WHERE id = ?").run(at, id);
  return { id, ident };
}

test("thiếu khoá Turnstile ⇒ 503 «tạm ngừng nhận đăng ký»; không thư, không dòng mã; bộ đếm không tăng", async () => {
  const { w, thu } = setup();
  delete w.env.TURNSTILE_SECRET_KEY;
  const r = await xin(w, "an@example.com");
  assert.equal(r.status, 503, r.text);
  assert.match(r.json.error.message, /tạm ngừng nhận đăng ký/i);
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.equal(soMa(w), 0);
  assert.equal((w.q("SELECT count(*) AS n FROM login_attempt")[0] as any).n, 0);
});

test("Turnstile từ chối token ⇒ 403; thiếu token ⇒ 403; không thư", async () => {
  const { w, thu } = setup();
  assert.equal((await xin(w, "an@example.com", { token: "token-xau" })).status, 403);
  assert.equal((await xin(w, "an@example.com", { token: null })).status, 403);
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.equal(soMa(w), 0);
});

test("công tắc TẮT + email mới ⇒ 200 {ok:true} nhưng không thư, không dòng mã, không phiếu", async () => {
  const { w, thu } = setup({ mo: false });
  const r = await xin(w, "moi@example.com");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true });
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.equal(soMa(w), 0);
  assert.equal(phieu(w).length, 0);
});

test("công tắc MỞ: một thư tới đúng địa chỉ đã chuẩn hoá; chủ đề không có mã; thân không có liên kết; chỉ lưu BĂM của mã", async () => {
  const { w, thu } = setup();
  const r = await xin(w, "  An@Gmail.com ");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true });
  await w.choNen();
  assert.equal(thu.length, 1);
  const t = thu[0]!;
  assert.equal(t.to, "an@gmail.com");
  assert.equal(t.subject, "Mã xác nhận đăng ký Tour Đảo");
  const ma = maTrongThu(t);
  assert.equal(t.subject.includes(ma), false);
  assert.equal(/https?:|www\.|\.vn|\.com/i.test(`${t.text}${t.html}`.replace("an@gmail.com", "")), false, "thư không có liên kết hay tên miền");
  const d = w.q("SELECT * FROM dk_email_code")[0] as any;
  assert.notEqual(d.code_hash, ma);
  assert.equal(JSON.stringify(d).includes(ma), false);
  assert.equal(JSON.stringify(d).includes("gmail"), false, "khoá email cũng được băm");
  assert.equal(phieu(w).length, 0, "xin mã không mở phiếu");
});

test("công tắc TẮT nhưng email đã có phiếu đang mở, hoặc phiếu ĐÃ DUYỆT chưa kích hoạt ⇒ vẫn gửi mã (ADR-0206 Đ9); phiếu đã kích hoạt xong thì không", async () => {
  const { w, thu } = setup({ mo: false });
  chenPhieu(w, "dang@example.com", "DANG_DIEN");
  chenPhieu(w, "duyet@example.com", "DA_DUYET");
  chenPhieu(w, "xong@example.com", "DA_DUYET", { activated: true });
  for (const e of ["dang@example.com", "duyet@example.com", "xong@example.com", "la@example.com"]) assert.equal((await xin(w, e)).status, 200);
  await w.choNen();
  assert.deepEqual(thu.map((t) => t.to).sort(), ["dang@example.com", "duyet@example.com"]);
});

test("câu trả lời giống hệt (trạng thái, thân, tiêu đề): email mới, email đã có phiếu, công tắc tắt, vượt trần email, vượt trần địa chỉ, vượt trần toàn Nền tảng", async () => {
  const mau = dau(await xin(setup().w, "mau@example.com"));
  assert.match(mau, /"\{\\"ok\\":true\}"/);
  const ca: string[] = [];
  { const { w } = setup(); chenPhieu(w, "co@example.com", "CHO_XAC_MINH"); ca.push(dau(await xin(w, "co@example.com"))); }
  { const { w } = setup({ mo: false }); ca.push(dau(await xin(w, "tat@example.com"))); }
  { const { w } = setup(); for (let i = 0; i < 3; i++) await xin(w, "day@example.com"); ca.push(dau(await xin(w, "day@example.com"))); }
  { const { w } = setup({ chinhSach: { ask_per_network: 2 } }); for (let i = 0; i < 2; i++) await xin(w, `m${i}@example.com`); ca.push(dau(await xin(w, "m9@example.com"))); }
  { const { w } = setup({ chinhSach: { ask_global_per_hour: 1 } }); await xin(w, "a1@example.com", { ip: "198.51.100.1" }); ca.push(dau(await xin(w, "a2@example.com", { ip: "198.51.100.2" }))); }
  for (const c of ca) assert.equal(c, mau);
});

test("trần: 3 thư / 15 phút / email; 10 / 15 phút / địa chỉ mạng; 60 / giờ cho cả Nền tảng — vượt thì 200 và KHÔNG gửi", async () => {
  {
    const { w, thu } = setup();
    for (let i = 0; i < 5; i++) assert.equal((await xin(w, "mot@example.com")).status, 200);
    await w.choNen();
    assert.equal(thu.length, 3);
    assert.equal((await xin(w, "khac@example.com")).status, 200);
    await w.choNen();
    assert.equal(thu.length, 4, "email khác vẫn gửi được");
  }
  {
    const { w, thu } = setup();
    for (let i = 0; i < 12; i++) assert.equal((await xin(w, `ai${i}@example.com`, { ip: "198.51.100.7" })).status, 200);
    await w.choNen();
    assert.equal(thu.length, 10);
    assert.equal((await xin(w, "ngoai@example.com", { ip: "198.51.100.8" })).status, 200);
    await w.choNen();
    assert.equal(thu.length, 11);
  }
  {
    const { w, thu } = setup({ chinhSach: { ask_global_per_hour: 60, ask_per_network: 1000, ask_per_mailbox: 1000 } });
    for (let i = 0; i < 63; i++) assert.equal((await xin(w, `n${i}@example.com`, { ip: `198.51.100.${i % 200}` })).status, 200);
    await w.choNen();
    assert.equal(thu.length, 60);
    assert.equal(soMa(w), 60, "lượt vượt trần không để lại dòng mã");
  }
});

test("Review Focus 3: «An@Gmail.com » và «an@gmail.com» là MỘT danh tính — một phiếu, một dòng danh tính; hai cách viết dùng chung bộ đếm", async () => {
  const { w, thu } = setup();
  await xin(w, "An@Gmail.com ");
  await w.choNen();
  const r1 = await xacNhan(w, "an@gmail.com", maTrongThu(thu[0]!));
  assert.equal(r1.status, 200, r1.text);
  const id1 = phieu(w)[0].id;
  await xin(w, " AN@GMAIL.COM");
  await w.choNen();
  const r2 = await xacNhan(w, "An@Gmail.com", maTrongThu(thu[1]!));
  assert.equal(r2.status, 200, r2.text);
  assert.equal(phieu(w).length, 1);
  assert.equal(danhTinh(w).length, 1);
  assert.equal(danhTinh(w)[0].subject, "an@gmail.com");
  assert.equal(phieu(w)[0].id, id1);
  // bộ đếm chung: lần xin thứ 3 vẫn gửi, lần thứ 4 (viết khác hoa thường) không
  await xin(w, "an@gmail.com");
  await xin(w, "AN@gmail.com");
  await w.choNen();
  assert.equal(thu.length, 3);
});

test("email sai dạng ⇒ 400, không thư, không đụng bộ đếm", async () => {
  const { w, thu } = setup();
  for (const e of ["", "không-phải-email", "a@b", 42, null, "a b@c.vn"]) assert.equal((await xin(w, e)).status, 400, String(e));
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.equal((w.q("SELECT count(*) AS n FROM login_attempt")[0] as any).n, 0);
});

test("mã sai 5 lần ⇒ mã hết hiệu lực (kể cả nhập đúng sau đó); mã đúng dùng một lần", async () => {
  const { w, thu } = setup();
  await xin(w, "sai@example.com");
  await w.choNen();
  const ma = maTrongThu(thu[0]!);
  const sai = ma === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) assert.equal((await xacNhan(w, "sai@example.com", sai)).status, 401);
  const r = await xacNhan(w, "sai@example.com", ma);
  assert.equal(r.status, 401, "đã nhập sai 5 lần: mã đúng cũng hết hiệu lực");
  assert.equal(r.headers.get("set-cookie"), null);
  assert.equal(phieu(w).length, 0);
  // mã mới thay mã cũ; dùng một lần
  await xin(w, "sai@example.com");
  await w.choNen();
  const ma2 = maTrongThu(thu[1]!);
  assert.equal((await xacNhan(w, "sai@example.com", ma2)).status, 200);
  assert.equal((await xacNhan(w, "sai@example.com", ma2)).status, 401, "mã đã dùng");
});

test("mã cũ không dùng được sau khi xin mã mới; mã hết hạn ⇒ 401; không có mã ⇒ cùng câu 401", async () => {
  const { w, thu } = setup();
  await xin(w, "cu@example.com");
  await xin(w, "cu@example.com");
  await w.choNen();
  const [a, b] = [maTrongThu(thu[0]!), maTrongThu(thu[1]!)];
  const dungCu = a === b ? null : await xacNhan(w, "cu@example.com", a);
  if (dungCu) assert.equal(dungCu.status, 401);
  w.sqlite.prepare("UPDATE dk_email_code SET expires_at = ?").run(new Date(Date.now() - 1000).toISOString());
  const het = await xacNhan(w, "cu@example.com", b);
  assert.equal(het.status, 401);
  const khong = await xacNhan(w, "chua-xin@example.com", "123456");
  assert.equal(khong.status, 401);
  assert.equal(khong.text, het.text, "không có mã và mã hết hạn: cùng một câu");
  assert.equal(phieu(w).length, 0);
});

test("nhập đúng mã: mở phiếu ĐANG ĐIỀN + danh tính + dòng lịch sử; cấp cookie td_dang_ky HttpOnly mới; trả {trangThai}; vào lại không mở phiếu thứ hai", async () => {
  const { w, thu } = setup();
  await xin(w, "moi@example.com");
  await w.choNen();
  const t0 = Date.now();
  const r = await xacNhan(w, "moi@example.com", maTrongThu(thu[0]!));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { trangThai: "DANG_DIEN" });
  const p = phieu(w);
  assert.equal(p.length, 1);
  assert.equal(p[0].status, "DANG_DIEN");
  assert.equal(p[0].kind, "PERSON");
  assert.match(p[0].id, /^DK_[A-Z]{8}$/);
  assert.equal(danhTinh(w)[0].subject, "moi@example.com");
  assert.deepEqual(w.q("SELECT actor_kind, command FROM dk_event WHERE registration_id = ?", p[0].id).map((x: any) => ({ ...x })), [{ actor_kind: "REGISTRANT", command: "MO_PHIEU" }]);
  const sc = r.headers.get("set-cookie") ?? "";
  assert.match(sc, new RegExp(`^${DK_COOKIE}=dk1\\.${p[0].id}\\.${danhTinh(w)[0].id}\\.`));
  for (const x of ["HttpOnly", "SameSite=Lax", "Secure", "Path=/api/dang-ky"]) assert.ok(sc.includes(x), x);
  const phan = sc.split(";")[0]!.split("=")[1]!.split(".");
  assert.ok(Number(phan[3]) >= t0 - 1000 && Number(phan[3]) <= Date.now() + 1000, "mã mới là phiên mới: mốc bắt đầu = bây giờ");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal((w.q("SELECT attempts FROM dk_email_code")[0] as any).attempts, 5, "mã đúng đã tiêu: số lần nhập về trần, dòng giữ để trần theo giờ đếm đúng");
  // vào lại
  await xin(w, "moi@example.com");
  await w.choNen();
  const r2 = await xacNhan(w, "moi@example.com", maTrongThu(thu[1]!));
  assert.equal(r2.status, 200);
  assert.deepEqual(r2.json, { trangThai: "DANG_DIEN" });
  assert.equal(phieu(w).length, 1);
  assert.equal(danhTinh(w).length, 1);
});

test("phiếu đang xử lý trả đúng trạng thái; phiếu ĐÃ DUYỆT chưa kích hoạt trả trạng thái của nó, KHÔNG mở phiếu mới, cookie trỏ đúng phiếu đó", async () => {
  const { w, thu } = setup();
  const x = chenPhieu(w, "cho@example.com", "CHO_XAC_MINH");
  const y = chenPhieu(w, "duyet@example.com", "DA_DUYET");
  await xin(w, "cho@example.com");
  await xin(w, "duyet@example.com");
  await w.choNen();
  const r1 = await xacNhan(w, "cho@example.com", maTrongThu(thu.find((t) => t.to === "cho@example.com")!));
  assert.deepEqual(r1.json, { trangThai: "CHO_XAC_MINH" });
  assert.ok((r1.headers.get("set-cookie") ?? "").includes(`dk1.${x.id}.${x.ident}.`));
  const r2 = await xacNhan(w, "duyet@example.com", maTrongThu(thu.find((t) => t.to === "duyet@example.com")!));
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(r2.json, { trangThai: "DA_DUYET" });
  assert.ok((r2.headers.get("set-cookie") ?? "").includes(`dk1.${y.id}.${y.ident}.`));
  assert.equal(phieu(w).length, 2, "không mở phiếu mới");
});

test("công tắc TẮT lúc nhập mã và email chưa có phiếu ⇒ 409 «tạm ngừng nhận đăng ký mới», mã còn nguyên, không mở phiếu", async () => {
  const { w } = setup({ mo: false });
  const at = new Date().toISOString();
  // Dựng thẳng một dòng mã hợp lệ (bình thường công tắc tắt thì không gửi mã cho email mới).
  const { w: w2, thu } = setup();
  await xin(w2, "kia@example.com");
  await w2.choNen();
  datChinhSach(w2, { registration_open: 0 });
  const r = await xacNhan(w2, "kia@example.com", maTrongThu(thu[0]!));
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /tạm ngừng nhận đăng ký mới/);
  assert.equal(phieu(w2).length, 0);
  assert.equal(soMa(w2), 1, "mã chưa bị tiêu");
  assert.equal(r.headers.get("set-cookie"), null);
  void w; void at;
});

test("bảo trì BẬT ⇒ 503 `maintenance` cho cả xin mã lẫn nhập mã; không thư, không dòng, không bộ đếm; TẮT lại thì chạy", async () => {
  const { w, thu } = setup();
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 1, ends_at = NULL WHERE id = 'default'");
  const a = await xin(w, "bt@example.com");
  assert.equal(a.status, 503);
  assert.equal(a.json.error.code, "maintenance");
  const b = await xacNhan(w, "bt@example.com", "123456");
  assert.equal(b.status, 503);
  assert.equal(b.json.error.code, "maintenance");
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.equal(soMa(w), 0);
  assert.equal((w.q("SELECT count(*) AS n FROM login_attempt")[0] as any).n, 0);
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  assert.equal((await xin(w, "bt@example.com")).status, 200);
  await w.choNen();
  assert.equal(thu.length, 1);
});

test("khoá bộ đếm riêng `dk:`: 20 lần xin mã không tăng bộ đếm `ip:` / `phone:` của đăng nhập; khoá lưu không chứa email hay địa chỉ mạng ở dạng rõ", async () => {
  const { w } = setup({ chinhSach: { ask_per_network: 1000, ask_per_mailbox: 1000, ask_global_per_hour: 1000 } });
  const dem = (like: string) => (w.q("SELECT count(*) AS n FROM login_attempt WHERE key LIKE ?", like)[0] as any).n;
  const truoc = [dem("ip:%"), dem("phone:%"), dem("mfa:%")];
  for (let i = 0; i < 20; i++) await xin(w, `lan${i}@example.com`);
  assert.deepEqual([dem("ip:%"), dem("phone:%"), dem("mfa:%")], truoc);
  assert.ok(dem("dk:%") >= 40, "mỗi lần xin tính vào hai khoá dk:");
  const khoa = (w.q("SELECT key FROM login_attempt WHERE key LIKE 'dk:%'") as any[]).map((x) => x.key).join("\n");
  assert.equal(khoa.includes("example.com"), false);
  assert.equal(khoa.includes(IP), false);
  // đăng nhập của nhân viên cùng địa chỉ mạng không bị ảnh hưởng: bộ đếm ip: vẫn 0
  assert.equal(dem("ip:%"), 0);
});

test("gửi thư hỏng ⇒ vẫn cùng câu trả lời; log chỉ có lý do cố định, không có địa chỉ, mã hay địa chỉ mạng", async () => {
  const { w } = setup();
  w.env.EMAIL = { send: async (m: Thu) => { throw new Error(`E_PROVIDER gửi tới ${m.to} hỏng ${m.text}`); } };
  const dong: string[] = [];
  const goc = { e: console.error, w: console.warn, l: console.log };
  console.error = (...a: unknown[]) => void dong.push(a.join(" "));
  console.warn = (...a: unknown[]) => void dong.push(a.join(" "));
  console.log = (...a: unknown[]) => void dong.push(a.join(" "));
  let r: any;
  try {
    r = await xin(w, "hong@example.com");
    await w.choNen();
  } finally {
    console.error = goc.e; console.warn = goc.w; console.log = goc.l;
  }
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
  const log = dong.join("\n");
  assert.match(log, /dk_mail_failed/);
  for (const cam of ["hong@example.com", "E_PROVIDER", IP]) assert.equal(log.includes(cam), false, cam);
});

test("nhật ký và lịch sử không chứa email, mã hay địa chỉ mạng (khuôn giay-to-khong-lo-so): quét sau khi chạy xin mã + nhập mã", async () => {
  const { w, thu } = setup();
  await xin(w, "kin@example.com");
  await w.choNen();
  const ma = maTrongThu(thu[0]!);
  // dòng mã còn nguyên lúc quét (chống bài rỗng): quét TRƯỚC khi nhập đúng
  doNhatKyHang(w.sqlite, ["dk_email_code.code_hash"]);
  await xacNhan(w, "kin@example.com", ma);
  const kho = JSON.stringify([w.q("SELECT * FROM audit_log"), w.q("SELECT * FROM dk_event")]);
  for (const cam of ["kin@example.com", ma, IP]) assert.equal(kho.includes(cam), false, cam);
});

test("GET /api/chinh-sach-rieng-tu: chưa có bản ⇒ {dangCapNhat:true}; có bản ⇒ ĐÚNG ba khoá phienBan, hieuLucTu, noiDung (không mục đích, không số ngày)", async () => {
  const { w } = setup();
  const chua = await w.call("GET", "/api/chinh-sach-rieng-tu");
  assert.equal(chua.status, 200, chua.text);
  assert.deepEqual(chua.json, { dangCapNhat: true });
  const at = new Date(Date.now() - 60_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cs-1', 1, 'mục đích bí mật', 'Toàn văn chính sách.', ?, ?, 'nguoi-dang', ?, 'nguoi-dang')").run(at, at, at);
  const co = await w.call("GET", "/api/chinh-sach-rieng-tu");
  assert.equal(co.status, 200);
  assert.deepEqual(co.json, { phienBan: 1, hieuLucTu: at, noiDung: "Toàn văn chính sách." });
  assert.equal(co.text.includes("mục đích bí mật"), false);
  // bản chưa tới ngày hiệu lực không hiện
  const sau = new Date(Date.now() + 3_600_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cs-2', 2, 'x', 'Bản tương lai.', ?, ?, 'nguoi-dang', ?, 'nguoi-dang')").run(sau, at, at);
  assert.equal((await w.call("GET", "/api/chinh-sach-rieng-tu")).json.phienBan, 1);
});

test("GET /api/dang-ky/cau-hinh: công tắc, loại đối tác mở, mục bắt buộc, phiên bản chính sách riêng tư; không cần cookie; không lộ con số chống lạm dụng", async () => {
  const { w } = setup();
  datChinhSach(w, { registration_open: 1 });
  const at = new Date(Date.now() - 60_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cs-1', 1, 'm', 'Toàn văn.', ?, ?, 'x', ?, 'x')").run(at, at, at);
  const r = await w.call("GET", "/api/dang-ky/cau-hinh");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanDangKy, true);
  assert.deepEqual(r.json.loaiMo, []);
  assert.ok(Array.isArray(r.json.mucBatBuoc) && r.json.mucBatBuoc.length >= 1);
  for (const m of r.json.mucBatBuoc) assert.deepEqual(Object.keys(m).sort(), ["ma", "nhan"]);
  assert.equal(r.json.chinhSachRiengTu, 1);
  for (const cam of ["ask_per", "code_", "anonymize", "session_"]) assert.equal(r.text.includes(cam), false);
  const tat = setup({ mo: false });
  assert.equal((await tat.w.call("GET", "/api/dang-ky/cau-hinh")).json.nhanDangKy, false);
  assert.equal((await tat.w.call("GET", "/api/dang-ky/cau-hinh")).json.chinhSachRiengTu, null);
});

test("cửa sổ đếm theo dòng chính sách `ask_window_minutes`: đổi dòng chính sách thì cửa sổ đổi (không cố định 15 phút)", async () => {
  const cu = (w: any, phut: number) => w.sqlite.prepare("UPDATE login_attempt SET at = at - ?").run(phut * 60_000);
  { // cửa sổ 30 phút: lượt xin cách đây 20 phút VẪN tính (mặc định 15 phút thì đã hết)
    const { w, thu } = setup({ chinhSach: { ask_window_minutes: 30, ask_per_mailbox: 1 } });
    await xin(w, "cs@example.com");
    cu(w, 20);
    await xin(w, "cs@example.com");
    await w.choNen();
    assert.equal(thu.length, 1, "vẫn trong cửa sổ 30 phút ⇒ không gửi lượt hai");
    cu(w, 20); // tổng 40 phút > 30
    await xin(w, "cs@example.com");
    await w.choNen();
    assert.equal(thu.length, 2, "ra khỏi cửa sổ 30 phút ⇒ gửi lại được");
  }
  { // cửa sổ 5 phút: lượt xin cách đây 10 phút đã hết
    const { w, thu } = setup({ chinhSach: { ask_window_minutes: 5, ask_per_mailbox: 1 } });
    await xin(w, "cs@example.com");
    cu(w, 10);
    await xin(w, "cs@example.com");
    await w.choNen();
    assert.equal(thu.length, 2);
  }
  { // đăng nhập (15 phút) không dọn dòng dk: của cửa sổ dài hơn
    const { w } = setup({ chinhSach: { ask_window_minutes: 60 } });
    await xin(w, "cs2@example.com");
    cu(w, 30);
    await w.call("POST", "/api/auth/login", { body: { phone: "0900000000", pin: "000000" } });
    assert.ok((w.q("SELECT count(*) AS n FROM login_attempt WHERE key LIKE 'dk:%'")[0] as any).n >= 2);
  }
});
