// ADR-0075 điều 6: máy bị đăng xuất vì máy khác đăng nhập phải tắt hẳn — đóng Bảng tin của ĐÚNG phiên bị thay, tắt thông báo màn hình khoá của mọi
// đăng ký của tài khoản trừ đăng ký mang phiên mới (kể cả đăng ký cũ session_id NULL — Review Focus 3, chạy cả khi không phiên nào bị thay).
// Chạy CẢ ứng dụng (router + mọi module) trên SQLite thật qua tests/audit/harness.mjs, đăng nhập bằng route PIN thật.
// `ctx.dongBangTin` là bắn-và-quên → đợi một nhịp trước khi đọc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { hashPin } from "./modules/staff/password.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUP = "77777777-7777-4777-8777-777777777777";
const PIN = "135790";

async function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const h = await hashPin(PIN);
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(h);
  return w;
}
const dangNhap = async (w: any, phone: string) => {
  const r = await w.call("POST", "/api/auth/login", { body: { phone, pin: PIN } });
  assert.equal(r.status, 200, r.text);
};
const phienSong = (w: any, id: string): string[] => w.q("SELECT id FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", id).map((r: any) => r.id);
const choMotNhip = () => new Promise((r) => setTimeout(r, 30));

test("đăng nhập tài khoản một máy gọi dongBangTin({ staffId, sessionIds: <phiên vừa bị thay>, giuPhien: <phiên mới> }) — kể cả khi không phiên nào bị thay; tài khoản miễn một máy không gọi", async () => {
  const goi: unknown[] = [];
  const w = await setup({ ghiDe: { dongBangTin: async (_env: unknown, muc: unknown) => void goi.push(muc) } });
  // Phiên P0 (do khung thử cấp như lô đăng nhập thật) + một phiên ĐÃ hết hạn chưa kết thúc (dữ liệu cũ, single = 0): chỉ P0 được tính là "bị thay".
  assert.equal((await w.call("GET", "/api/auth/me", { as: SALES })).status, 200);
  const [p0] = phienSong(w, SALES);
  w.sqlite.exec(`INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by)
    VALUES ('het-han', '${SALES}', 'PIN', 0, NULL, 'Cũ', NULL, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z', NULL, NULL, NULL, '${SALES}', '2026-01-01T00:00:00.000Z', NULL)`);
  await dangNhap(w, "0900000001");
  await choMotNhip();
  const [p1] = phienSong(w, SALES);
  assert.notEqual(p1, p0);
  assert.deepEqual(goi, [{ staffId: SALES, sessionIds: [p0], giuPhien: p1 }], "chỉ phiên bị thay (không gồm phiên hết hạn)");

  // Không phiên sống nào (đã đăng xuất) → vẫn gọi, sessionIds rỗng: đăng ký thông báo cũ của tài khoản vẫn phải tắt.
  w.sqlite.exec(`UPDATE aut_session SET ended_at = '2026-10-01T00:00:00.000Z', end_reason = 'dang_xuat' WHERE id = '${p1}'`);
  goi.length = 0;
  await dangNhap(w, "0900000001");
  await choMotNhip();
  const [p2] = phienSong(w, SALES);
  assert.deepEqual(goi, [{ staffId: SALES, sessionIds: [], giuPhien: p2 }]);

  // Toàn quyền (miễn luật một máy): không ai bị thay, không tắt máy nào.
  goi.length = 0;
  await dangNhap(w, "0900000007");
  await dangNhap(w, "0900000007");
  await choMotNhip();
  assert.equal(phienSong(w, SUP).length, 2);
  assert.deepEqual(goi, []);
});

test("đăng nhập tài khoản một máy tắt MỌI đăng ký thông báo của tài khoản (cả dòng cũ session_id NULL), lý do bi-thay; đăng ký mang phiên mới còn bật", async () => {
  const w = await setup();
  const epCu = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  const r0 = await w.call("POST", "/api/account/thong-bao/may", { as: SALES, body: { endpoint: epCu, thietBi: "iPhone" } });
  assert.equal(r0.status, 200, r0.text);
  const [p0] = phienSong(w, SALES);
  assert.equal(w.q("SELECT session_id FROM ntf_push_sub WHERE endpoint = ?", epCu)[0].session_id, p0, "đăng ký máy ghi mã phiên đang đăng nhập");
  const epNull = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`; // đăng ký trước phát hành: không có mã phiên
  w.sqlite.prepare("INSERT INTO ntf_push_sub (id, staff_id, endpoint, thiet_bi, created_at, updated_at) VALUES (?, ?, ?, 'Máy cũ', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')").run(randomUUID(), SALES, epNull);
  const epKhac = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  assert.equal((await w.call("POST", "/api/account/thong-bao/may", { as: SUP, body: { endpoint: epKhac, thietBi: "Máy tính" } })).status, 200);

  await dangNhap(w, "0900000001");
  await choMotNhip();
  for (const ep of [epCu, epNull]) {
    const d = w.q("SELECT revoked_at, revoke_reason, updated_by FROM ntf_push_sub WHERE endpoint = ?", ep)[0];
    assert.ok(d.revoked_at, `${ep} phải bị tắt`);
    assert.equal(d.revoke_reason, "bi-thay");
    assert.equal(d.updated_by, null);
  }
  assert.equal(w.q("SELECT revoked_at FROM ntf_push_sub WHERE endpoint = ?", epKhac)[0].revoked_at, null, "tài khoản khác không bị đụng");

  // Máy mới đăng ký lại (web/shell.ts làm sau đăng nhập) → dòng đang bật mang phiên mới; lần đăng nhập SAU (máy khác) tắt nó.
  const [p1] = phienSong(w, SALES);
  assert.equal((await w.call("POST", "/api/account/thong-bao/may", { as: SALES, body: { endpoint: epCu, thietBi: "iPhone" } })).status, 200);
  assert.deepEqual(w.q("SELECT session_id FROM ntf_push_sub WHERE endpoint = ? AND revoked_at IS NULL", epCu).map((r: any) => r.session_id), [p1]);
});

test("trạm Bảng tin chỉ nhận { sessionIds } của phiên bị thay — KHÔNG kèm staffId (đóng theo tài khoản là đóng luôn máy mới); không phiên nào bị thay → không gọi trạm", async () => {
  const w = await setup();
  const goiTram: unknown[] = [];
  w.env.BANG_TIN = { getByName: () => ({ dongCua: async (muc: unknown) => void goiTram.push(muc) }) };
  assert.equal((await w.call("GET", "/api/auth/me", { as: SALES })).status, 200);
  const [p0] = phienSong(w, SALES);
  await dangNhap(w, "0900000001");
  await choMotNhip();
  assert.deepEqual(goiTram, [{ sessionIds: [p0] }]);
  const [p1] = phienSong(w, SALES);
  w.sqlite.exec(`UPDATE aut_session SET ended_at = '2026-10-01T00:00:00.000Z', end_reason = 'dang_xuat' WHERE id = '${p1}'`);
  goiTram.length = 0;
  await dangNhap(w, "0900000001");
  await choMotNhip();
  assert.deepEqual(goiTram, []);
});
