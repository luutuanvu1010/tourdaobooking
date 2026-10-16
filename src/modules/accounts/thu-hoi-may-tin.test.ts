// ADR-0075 điều 6(c) + đặc tả hai lớp §6 quy tắc 3 (Task 8, vòng sửa 1 — ruling điều phối 2026-10-15): máy được tin bị THU HỒI (dòng, không chỉ lưới
// credentials_changed_at) trong CÙNG lô với việc gây ra nó:
//   - Toàn quyền gỡ MỘT phiên → máy tin gắn với phiên đó (`aut_session.trusted_device_id`) bị thu hồi, lý do 'bi_go'; máy tin khác của tài khoản giữ nguyên;
//   - tự đổi PIN (change-pin, pin-by-passkey) → mọi máy tin 'doi_pin'; Quản trị đặt lại PIN → mọi máy tin 'dat_lai_pin'.
// (Tắt lớp hai 'tat_hai_lop' và ngưng 'ngung' có bài ở tat-hai-lop.test.ts.) Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs) — không mạng.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";
import { encryptSecret, sha256Hex } from "../auth/mfa-crypto.ts";

const BH = "0d000000-0000-4000-8000-000000000001"; // Bán hàng (nội bộ, đã bật lớp hai)
const QT = "0d000000-0000-4000-8000-000000000002"; // Quản trị
const TQ = "0d000000-0000-4000-8000-000000000003"; // Toàn quyền
const PHONE: Record<string, string> = { [BH]: "0903000001", [QT]: "0903000002", [TQ]: "0903000003" };
const PIN = "135790";
const KHOA = Buffer.alloc(32, 9).toString("base64"); // khoá mã hoá hai lớp GIẢ của bài
const NGAY = 86_400_000;

async function setup() {
  const w = world();
  w.env.MFA_ENCRYPTION_KEY = KHOA;
  seedStaff(w.sqlite, { id: BH, phone: PHONE[BH], name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: QT, phone: PHONE[QT], name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: TQ, phone: PHONE[TQ], name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  const at = new Date().toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES ('f-bh', ?, 'TOTP', ?, NULL, 0, ?, NULL, ?, ?, ?, ?)",
  ).run(BH, await encryptSecret(KHOA, new Uint8Array(20).fill(3)), at, at, BH, at, BH);
  return w;
}
type W = Awaited<ReturnType<typeof setup>>;

/** Gieo một máy tin của Bán hàng với token đã biết (CSDL chỉ giữ băm). Tạo lùi 1 phút để không vướng lưới credentials_changed_at của khung thử. */
async function gieoMayTin(w: W, id: string, tok: string) {
  const at = new Date(Date.now() - 60_000).toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_trusted_device (id, staff_id, token_hash, label, created_at, created_by, updated_at, updated_by, last_used_at, expires_at, revoked_at, revoke_reason) VALUES (?, ?, ?, 'iPhone', ?, ?, ?, ?, ?, ?, NULL, NULL)",
  ).run(id, BH, await sha256Hex(tok), at, BH, at, BH, at, new Date(Date.now() + 30 * NGAY).toISOString());
}
let ipn = 0;
const ip = () => `203.0.113.${(++ipn % 250) + 1}`;
const pinLogin = (w: W, tok?: string) =>
  w.call("POST", "/api/auth/login", { body: { phone: PHONE[BH], pin: PIN }, headers: { "cf-connecting-ip": ip(), ...(tok ? { cookie: `td_trusted=${tok}` } : {}) } });
const mayTin = (w: W) => w.q("SELECT id, revoke_reason AS l, updated_by AS b FROM aut_trusted_device WHERE staff_id = ? ORDER BY id", BH).map((x: any) => ({ ...x }));

const TOK_A = "may-tin-a-000000000000000000000000000000000";
const TOK_B = "may-tin-b-000000000000000000000000000000000";

test("ADR-0075 đ6(c): Toàn quyền gỡ phiên vào bằng máy tin A → máy A bị thu hồi 'bi_go' (cùng lô), máy B giữ nguyên; PIN với cookie cũ của A phải hỏi mã", async () => {
  const w = await setup();
  await gieoMayTin(w, "td-a", TOK_A);
  await gieoMayTin(w, "td-b", TOK_B);
  const vao = await pinLogin(w, TOK_A);
  assert.equal(vao.status, 200, vao.text);
  assert.ok(vao.json.staff, "máy tin A miễn bước hai trước khi bị gỡ");
  const [phien] = w.q("SELECT id, trusted_device_id AS t FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", BH);
  assert.equal(phien.t, "td-a");
  const r = await w.call("POST", `/api/sessions/${phien.id}/revoke`, { as: TQ, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(mayTin(w), [{ id: "td-a", l: "bi_go", b: TQ }, { id: "td-b", l: null, b: BH }]);
  const lai = await pinLogin(w, TOK_A);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.next, "mfa", "máy tin của phiên bị gỡ không còn miễn bước hai");
  assert.ok(!r.text.includes(TOK_A) && !w.q("SELECT detail FROM audit_log WHERE action = 'session_revoked'").some((x: any) => String(x.detail).includes("td-a")), "nhật ký / phản hồi không mang token hay mã máy tin");
});

test("ADR-0075 đ6(c): gỡ phiên KHÔNG vào bằng máy tin → không thu hồi máy tin nào; phiên đã kết thúc (409) → không đụng máy tin", async () => {
  const w = await setup();
  await gieoMayTin(w, "td-a", TOK_A);
  await w.token(BH); // phiên PIN thường (trusted_device_id NULL)
  const [phien] = w.q("SELECT id FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", BH);
  assert.equal((await w.call("POST", `/api/sessions/${phien.id}/revoke`, { as: TQ, body: {} })).status, 200);
  assert.deepEqual(mayTin(w), [{ id: "td-a", l: null, b: BH }]);
  // Phiên vào bằng máy tin, đã đăng xuất từ trước → 409, máy tin giữ nguyên.
  assert.ok((await pinLogin(w, TOK_A)).json.staff);
  const [p2] = w.q("SELECT id FROM aut_session WHERE staff_id = ? AND trusted_device_id = 'td-a'", BH);
  w.sqlite.prepare("UPDATE aut_session SET ended_at = ?, end_reason = 'dang_xuat' WHERE id = ?").run(new Date().toISOString(), p2.id);
  assert.equal((await w.call("POST", `/api/sessions/${p2.id}/revoke`, { as: TQ, body: {} })).status, 409);
  assert.deepEqual(mayTin(w), [{ id: "td-a", l: null, b: BH }]);
});

test("đặc tả §6.3: tự đổi PIN → mọi máy tin thu hồi 'doi_pin'; Quản trị đặt lại PIN → 'dat_lai_pin' (dòng, không chỉ lưới credentials_changed_at)", async () => {
  const w = await setup();
  await gieoMayTin(w, "td-a", TOK_A);
  await gieoMayTin(w, "td-b", TOK_B);
  const r = await w.call("POST", "/api/account/change-pin", { as: BH, body: { currentPin: PIN, newPin: "246813" }, headers: { "cf-connecting-ip": ip() } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(mayTin(w), [{ id: "td-a", l: "doi_pin", b: BH }, { id: "td-b", l: "doi_pin", b: BH }]);
  assert.deepEqual(w.q("SELECT count(*) AS n FROM aut_trusted_device WHERE staff_id = ? AND revoked_at IS NULL", BH)[0].n, 0);

  const w2 = await setup();
  await gieoMayTin(w2, "td-a", TOK_A);
  const d = await w2.call("POST", `/api/staff/${BH}/reset-pin`, { as: QT, body: {} });
  assert.equal(d.status, 200, d.text);
  assert.deepEqual(mayTin(w2), [{ id: "td-a", l: "dat_lai_pin", b: QT }]);
});
