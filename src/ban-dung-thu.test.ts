// ADR-0223 (bản dùng thử) trên khung thử thật (tests/audit/harness.mjs — CẢ ứng dụng, D1 giả = SQLite, không mạng):
// bản chính thức không đổi gì; bản dùng thử: chọn vai sau PIN, khoá / mở, chặn cửa, chống dò theo địa chỉ mạng, làm sạch giữ khoá, hai khoá an toàn.
// Tên người / hồ sơ ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1, app } from "../tests/audit/harness.mjs";
import { gieoDuLieuMau, xuatBanMau } from "../scripts/ban-mau-lib.mjs";
import { ID_DUNG_THU, ID_TOAN_QUYEN_DEMO, SDT_DUNG_THU, SDT_TOAN_QUYEN_DEMO, BANG_DAU } from "./shared/ban-dung-thu.ts";

const PIN = "482913";
const PIN_TQ = "735102";
const COMMIT = "c".repeat(40);
const TEN_MIG = readdirSync(new URL("../migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort();
type W = ReturnType<typeof world>;

let banMauDem: ReturnType<typeof xuatBanMau> | null = null;
async function banMau() {
  if (banMauDem) return banMauDem;
  const g = world();
  await gieoDuLieuMau(g, seedStaff);
  banMauDem = xuatBanMau(g.sqlite, { commit: COMMIT, tenMigration: TEN_MIG });
  return banMauDem;
}

/** Bật bản dùng thử trên một world: biến bật, D1 khoá thứ hai, bí mật PIN, phần tĩnh giả chứa bản mẫu. `nap` = nạp bản mẫu như lần nạp đầu. */
async function demo(o: { nap?: boolean; bat?: boolean } = {}): Promise<W> {
  const w = world();
  const mau = await banMau();
  if (o.nap !== false) {
    const xoa = w.sqlite.prepare("SELECT type, name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'").all() as { type: string; name: string }[];
    w.sqlite.exec("PRAGMA foreign_keys = OFF");
    for (const v of xoa.filter((x) => x.type === "view")) w.sqlite.exec(`DROP VIEW "${v.name}"`);
    for (const t of xoa.filter((x) => x.type === "table")) w.sqlite.exec(`DROP TABLE "${t.name}"`);
    for (const c of mau.cau) w.sqlite.exec(c);
    w.sqlite.exec("PRAGMA foreign_keys = ON");
  }
  const env = w.env as Record<string, unknown>;
  if (o.bat !== false) env.BAN_DUNG_THU = "bat";
  env.KHOA_DUNG_THU = fakeD1(new DatabaseSync(":memory:"));
  env.DUNG_THU_PIN = PIN;
  env.DUNG_THU_PIN_TOAN_QUYEN = PIN_TQ;
  env.ASSETS = {
    fetch: async (r: Request) => {
      const p = new URL(r.url).pathname;
      if (p === "/__ban-mau.json") return new Response(JSON.stringify(mau));
      if (p === "/ban-thu.json") return new Response(JSON.stringify({ commit: COMMIT }));
      return new Response("", { status: 404 });
    },
  };
  return w;
}

const lamMoi = (w: W, now = Date.now()) => (app.lamMoiBanDungThu as (e: unknown, n: number) => Promise<{ ok: boolean; lyDo?: string }>)(w.env, now);
const dangNhap = (w: W, phone: string, pin: string, ip = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) =>
  w.call("POST", "/api/auth/login", { body: { phone, pin }, headers: { "cf-connecting-ip": ip } });

test("bản chính thức (không BAN_DUNG_THU): không có đường riêng, không chặn gì, lệnh làm mới từ chối và không ghi", async () => {
  const w = await demo({ bat: false });
  assert.equal((await w.call("GET", "/api/dung-thu")).status, 404);
  assert.equal((await w.call("POST", "/api/account/dung-thu-vai", { as: ID_DUNG_THU, body: { role: "SALES" } })).status, 404);
  assert.notEqual((await w.call("POST", "/api/dang-ky/ma", { body: {} })).status, 403, "đăng ký công khai vẫn đi tới route thật");
  w.sqlite.exec("CREATE TABLE thu_dau (x)");
  const kq = await lamMoi(w);
  assert.equal(kq.ok, false);
  assert.equal(w.q("SELECT count(*) n FROM sqlite_master WHERE name = 'thu_dau'")[0].n, 1, "không xoá gì");
});

test("chống dò PIN: bản chính thức khoá SĐT sau 5 lần sai; bản dùng thử thì SĐT dùng thử chỉ đếm theo địa chỉ mạng", async () => {
  const chinh = await demo({ bat: false });
  const ip = () => `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  for (let i = 0; i < 5; i++) await dangNhap(chinh, SDT_DUNG_THU, "000111", ip());
  assert.equal((await dangNhap(chinh, SDT_DUNG_THU, "000111", ip())).status, 429);

  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  for (let i = 0; i < 6; i++) assert.equal((await dangNhap(w, SDT_DUNG_THU, "000111", ip())).status, 401);
  const ok = await dangNhap(w, SDT_DUNG_THU, PIN, ip());
  assert.equal(ok.status, 200, ok.text);
});

test("chọn vai sau PIN: chỉ tài khoản dùng thử, mọi vai trừ Toàn quyền, không hết hạn 60 phút", async () => {
  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  const tt = await w.call("GET", "/api/dung-thu");
  assert.equal(tt.status, 200);
  assert.equal(tt.json.khoa, false);
  assert.equal(tt.json.sdtDungThu, SDT_DUNG_THU);
  assert.ok(!tt.json.vai.some((v: { code: string }) => v.code === "SUPER_ADMIN"));

  assert.equal((await w.call("POST", "/api/account/dung-thu-vai", { as: ID_DUNG_THU, body: { role: "SUPER_ADMIN" } })).status, 400);
  const r = await w.call("POST", "/api/account/dung-thu-vai", { as: ID_DUNG_THU, body: { role: "ACCOUNTING" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["ACCOUNTING"]);
  w.sqlite.prepare("UPDATE aut_session SET last_seen_at = ? WHERE staff_id = ?").run(new Date(Date.now() - 3 * 3600_000).toISOString(), ID_DUNG_THU);
  const me = await w.call("GET", "/api/auth/me", { as: ID_DUNG_THU });
  assert.equal(me.json.actingRole, "ACCOUNTING", "không hết hạn sau 3 giờ");

  assert.equal((await w.call("POST", "/api/account/dung-thu-vai", { as: ID_TOAN_QUYEN_DEMO, body: { role: "SALES" } })).status, 403, "Toàn quyền không dùng đường này");
});

test("vai Đối tác: tài khoản dùng thử lập đơn nháp được (hồ sơ mang vai Công ty lữ hành)", async () => {
  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  assert.equal((await w.call("POST", "/api/account/dung-thu-vai", { as: ID_DUNG_THU, body: { role: "PARTNER" } })).status, 200);
  const me = await w.call("GET", "/api/auth/me", { as: ID_DUNG_THU });
  assert.deepEqual(me.json.staff.permissions, ["PARTNER"]);
  assert.ok(me.json.benDatCuaToi, "có bên đặt của tôi (hồ sơ đối tác)");
});

test("khoá / mở: chỉ Toàn quyền thật; khoá thì đăng nhập dùng thử 403 và phiên đang mở bị chặn; giữ nguyên sau làm mới", async () => {
  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  await w.call("POST", "/api/account/dung-thu-vai", { as: ID_DUNG_THU, body: { role: "ADMIN" } });
  assert.equal((await w.call("POST", "/api/dung-thu/khoa", { as: ID_DUNG_THU, body: { khoa: true } })).status, 403, "vai Quản trị đang chọn không khoá được");
  const k = await w.call("POST", "/api/dung-thu/khoa", { as: ID_TOAN_QUYEN_DEMO, body: { khoa: true } });
  assert.equal(k.status, 200, k.text);
  assert.equal((await w.call("GET", "/api/dung-thu")).json.khoa, true);
  const dn = await dangNhap(w, SDT_DUNG_THU, PIN);
  assert.equal(dn.status, 403);
  assert.equal(dn.json.error?.code ?? dn.json.code, "ban_dung_thu_khoa");
  assert.equal((await w.call("GET", "/api/orders", { as: ID_DUNG_THU })).status, 403, "phiên đang mở bị chặn khi khoá");
  assert.equal((await dangNhap(w, SDT_TOAN_QUYEN_DEMO, PIN_TQ)).status, 200, "Toàn quyền vẫn vào được");

  assert.equal((await lamMoi(w)).ok, true);
  assert.equal((await w.call("GET", "/api/dung-thu")).json.khoa, true, "khoá nằm ngoài phần bị làm sạch");
  assert.equal((await w.call("POST", "/api/dung-thu/khoa", { as: ID_TOAN_QUYEN_DEMO, body: { khoa: false } })).status, 200);
  assert.equal((await dangNhap(w, SDT_DUNG_THU, PIN)).status, 200);
});

test("chặn cửa: đăng ký công khai, tài khoản dùng thử đổi PIN / Face ID, sửa hai tài khoản dùng chung, tải bản mẫu", async () => {
  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  assert.equal((await w.call("POST", "/api/dang-ky/ma", { body: {} })).status, 403);
  assert.equal((await w.call("PUT", "/api/dang-ky/phieu", { body: {} })).status, 403);
  assert.equal((await w.call("POST", "/api/account/change-pin", { as: ID_DUNG_THU, body: { currentPin: PIN, newPin: "193847" } })).status, 403);
  assert.equal((await w.call("POST", "/api/account/passkeys/options", { as: ID_DUNG_THU, body: {} })).status, 403);
  await w.call("POST", "/api/account/dung-thu-vai", { as: ID_DUNG_THU, body: { role: "ADMIN" } });
  assert.equal((await w.call("POST", `/api/staff/${ID_TOAN_QUYEN_DEMO}/reset-pin`, { as: ID_DUNG_THU, body: {} })).status, 403);
  assert.equal((await w.call("PATCH", `/api/staff/${ID_DUNG_THU}`, { as: ID_DUNG_THU, body: { active: false } })).status, 403);
  assert.equal((await w.call("GET", "/__ban-mau.json")).status, 404);
});

test("làm sạch: xoá dữ liệu người thử, giữ tài khoản mẫu; PIN đặt từ bí mật; đối tác + mức hoa hồng mẫu còn", async () => {
  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  w.sqlite.exec("CREATE TABLE thu_dau (x)");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('nguoi-thu-them', 'ORGANIZATION', 'Do người thử thêm', 1, ?1, ?1)").run(new Date().toISOString());
  const kq = await lamMoi(w);
  assert.equal(kq.ok, true, kq.lyDo);
  assert.equal(w.q("SELECT count(*) n FROM sqlite_master WHERE name = 'thu_dau'")[0].n, 0);
  assert.equal(w.q("SELECT count(*) n FROM pty_party WHERE id = 'nguoi-thu-them'")[0].n, 0);
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE id IN (?, ?)", ID_DUNG_THU, ID_TOAN_QUYEN_DEMO)[0].n, 2);
  assert.ok(Number(w.q("SELECT count(*) n FROM pty_party WHERE display_name LIKE '%mẫu%'")[0].n) >= 3);
  assert.equal(w.q("SELECT count(*) n FROM d1_migrations")[0].n, TEN_MIG.length);
  assert.ok(w.q("SELECT mfa_grace_until g FROM staff WHERE id = ?", ID_TOAN_QUYEN_DEMO)[0].g, "ân hạn hai lớp của Toàn quyền tính lại");
  assert.equal((await dangNhap(w, SDT_DUNG_THU, PIN)).status, 200);
  assert.equal((await dangNhap(w, SDT_TOAN_QUYEN_DEMO, PIN_TQ)).status, 200);
});

test("hai khoá an toàn: thiếu biến bật HOẶC thiếu bảng dấu HOẶC thiếu D1 khoá HOẶC thiếu PIN thì từ chối, không ghi", async () => {
  const thieuDau = await demo({ nap: false }); // D1 chưa nạp bản mẫu ⇒ không có bảng dấu (như D1 chính thức)
  assert.match(String((await lamMoi(thieuDau)).lyDo), /bảng dấu/);
  assert.ok(Number(thieuDau.q("SELECT count(*) n FROM sqlite_master WHERE type = 'table'")[0].n) > 100, "không xoá gì");

  const thieuBat = await demo({ bat: false });
  assert.match(String((await lamMoi(thieuBat)).lyDo), /BAN_DUNG_THU/);
  assert.equal(thieuBat.q(`SELECT count(*) n FROM ${BANG_DAU}`)[0].n, 1);

  const thieuKhoa = await demo();
  delete (thieuKhoa.env as Record<string, unknown>).KHOA_DUNG_THU;
  assert.match(String((await lamMoi(thieuKhoa)).lyDo), /KHOA_DUNG_THU/);

  const thieuPin = await demo();
  delete (thieuPin.env as Record<string, unknown>).DUNG_THU_PIN;
  assert.match(String((await lamMoi(thieuPin)).lyDo), /PIN/);
});

test("lượt lịch chạy: dấu chờ nạp (sau len-demo) ⇒ làm sạch ngay dù ngoài mốc; dấu thường ⇒ chỉ ở mốc giờ chẵn", async () => {
  const chay = (w: W, t: number) => (app.lamMoiNeuDenMoc as (e: unknown, n: number) => Promise<void>)(w.env, t);
  const ngoaiMoc = Date.parse("2026-11-22T00:30:00Z"); // 07:30 VN
  const w = await demo();
  w.sqlite.exec("CREATE TABLE thu_dau (x)");
  await chay(w, ngoaiMoc);
  assert.equal(w.q("SELECT count(*) n FROM sqlite_master WHERE name = 'thu_dau'")[0].n, 1, "dấu thường, ngoài mốc ⇒ không làm");
  w.sqlite.exec(`UPDATE ${BANG_DAU} SET gia_tri = 'demo-cho-nap'`);
  await w.r2.put("anh-nguoi-thu.jpg", new Uint8Array([1, 2, 3]));
  await w.r2VeDienTu.put("ve-nguoi-thu.png", new Uint8Array([4]));
  await chay(w, ngoaiMoc);
  assert.equal(await w.r2.head("anh-nguoi-thu.jpg"), null, "kho hồ sơ được dọn");
  assert.equal(await w.r2VeDienTu.head("ve-nguoi-thu.png"), null, "kho vé được dọn");
  assert.equal(w.q("SELECT count(*) n FROM sqlite_master WHERE name = 'thu_dau'")[0].n, 0, "chờ nạp ⇒ làm ngay");
  assert.equal(w.q(`SELECT gia_tri g FROM ${BANG_DAU}`)[0].g, "demo", "sau khi nạp, dấu về thường");
  assert.equal((await dangNhap(w, SDT_DUNG_THU, PIN)).status, 200);
});

test("cửa vào chuẩn hoá đường dẫn như bộ định tuyến: «//», «/api//…», id mã hoá phần trăm không lách được chặn", async () => {
  const w = await demo();
  assert.equal((await lamMoi(w)).ok, true);
  const ADMIN_KHAC = "e0000000-0000-4000-8000-000000000001";
  seedStaff(w.sqlite, { id: ADMIN_KHAC, phone: "0900000150", name: "Quản Trị Khác", perms: ["ADMIN"] });
  for (const p of ["/api//account/change-pin", "//api/account/change-pin", "/api/account//change-pin"]) {
    const r = await w.call("POST", p, { as: ID_DUNG_THU, body: { currentPin: PIN, newPin: "193847" } });
    assert.equal(r.status, 403, `${p}: ${r.text}`);
  }
  for (const p of ["/api//dang-ky/ma", "//api/dang-ky/ma"]) assert.equal((await w.call("POST", p, { body: {} })).status, 403, p);
  const idMa = "%64" + ID_DUNG_THU.slice(1);
  for (const p of [`/api/staff/${idMa}/reset-pin`, `/api/staff//${ID_DUNG_THU}/unlock`, `/api/staff/${idMa}`]) {
    const r = await w.call(p.endsWith("reset-pin") || p.endsWith("unlock") ? "POST" : "PATCH", p, { as: ADMIN_KHAC, body: p.endsWith(idMa) ? { active: false } : {} });
    assert.equal(r.status, 403, `${p}: ${r.text}`);
  }
  assert.equal(w.q("SELECT active a FROM staff WHERE id = ?", ID_DUNG_THU)[0].a, 1);
  assert.equal((await w.call("POST", "/api/dung-thu/khoa", { as: ID_TOAN_QUYEN_DEMO, body: { khoa: true } })).status, 200);
  for (const p of ["/api//auth/login", "//api/auth/login"]) {
    const r = await w.call("POST", p, { body: { phone: SDT_DUNG_THU, pin: PIN }, headers: { "cf-connecting-ip": "10.7.7.7" } });
    assert.equal(r.status, 403, `${p}: ${r.text}`);
  }
  assert.equal((await w.call("GET", "//api/orders", { as: ID_DUNG_THU })).status, 403);
  assert.equal((await w.call("GET", "//__ban-mau.json")).status, 404);
});
