// ADR-0085 — route chính sách đăng nhập (đặc tả §4.2–4.3, §6 quy tắc 1–8, §11 AC2–AC8, AC11) chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const LAI = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const PIN = "135790";

async function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000002", name: "Bình", perms: ["SALES", "ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000006", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  return w;
}
/** Đăng nhập route PIN thật từ một "máy"; trả cookie. */
async function dangNhap(w: any, phone: string, ua: string): Promise<string> {
  const r = await w.call("POST", "/api/auth/login", { body: { phone, pin: PIN }, headers: { "user-agent": ua } });
  assert.equal(r.status, 200, r.text);
  return r.headers.get("set-cookie")!.split(";")[0]!;
}
const me = (w: any, cookie: string) => w.call("GET", "/api/auth/me", { headers: { cookie } });
const docBan = async (w: any) => (await w.call("GET", "/api/sessions/policy", { as: SUP })).json.rows as { permissionCode: string; multi: boolean; banId: string | null }[];
const banCua = (rows: { permissionCode: string; banId: string | null }[], c: string) => rows.find((r) => r.permissionCode === c)!.banId;
const luu = (w: any, thayDoi: unknown) => w.call("PUT", "/api/sessions/policy", { as: SUP, body: { thayDoi } });
const choMotNhip = () => new Promise((r) => setTimeout(r, 30));

test("§6 quy tắc 1 (AC5): Quản trị, Nhân sự, Bán hàng → 403 ở cả ba route; Toàn quyền đọc được 9 dòng, bảng trống = Một máy", async () => {
  const w = await setup();
  for (const as of [ADM, HR, SALES]) {
    assert.equal((await w.call("GET", "/api/sessions/policy", { as })).status, 403);
    assert.equal((await w.call("GET", "/api/sessions/policy/preview?nhieuMay=", { as })).status, 403);
    assert.equal((await w.call("PUT", "/api/sessions/policy", { as, body: { thayDoi: [{ permissionCode: "SALES", multi: true, banDangXem: null }] } })).status, 403);
  }
  const rows = await docBan(w);
  assert.deepEqual(rows.map((r) => r.permissionCode), ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"]);
  assert.ok(rows.every((r) => r.multi === false && r.banId === null));
  assert.equal(w.q("SELECT count(*) n FROM aut_session_policy")[0].n, 0, "403 không ghi gì");
});

test("§6 quy tắc 2 (AC6): SUPER_ADMIN, mã lạ → 400; xem trước SUPER_ADMIN → 400", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "SUPER_ADMIN", multi: false, banDangXem: null }])).status, 400);
  assert.equal((await luu(w, [{ permissionCode: "BOSS", multi: true, banDangXem: null }])).status, 400);
  assert.equal((await w.call("GET", "/api/sessions/policy/preview?nhieuMay=SUPER_ADMIN", { as: SUP })).status, 400);
});

test("§6 quy tắc 5 (AC2, AC3): 'Bán hàng = Nhiều máy' → hai lần đăng nhập SALES cùng sống; đặt lại 'Một máy' → xem trước 1 máy/1 người, sau lưu còn đúng phiên mới nhất, máy kia 401 'Không còn quyền dùng nhiều máy'", async () => {
  const goi: unknown[] = [];
  const w = await setup({ ghiDe: { dongBangTin: async (_e: unknown, m: unknown) => void goi.push(m) } });
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  const m1 = await dangNhap(w, "0900000001", "iPhone");
  const m2 = await dangNhap(w, "0900000001", "Windows");
  assert.equal((await me(w, m1)).status, 200, "máy 1 vẫn sống khi máy 2 vào");
  assert.equal((await me(w, m2)).status, 200);
  const xt = await w.call("GET", "/api/sessions/policy/preview?nhieuMay=", { as: SUP });
  assert.deepEqual(xt.json, { soPhien: 1, soNguoi: 1 });
  goi.length = 0;
  const r = await luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: banCua(await docBan(w), "SALES") }]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.soPhien, 1);
  assert.equal((await me(w, m1)).status, 401);
  assert.equal((await me(w, m2)).status, 200);
  assert.equal((await w.call("POST", "/api/auth/session-ended", { headers: { cookie: m1 } })).json.reason, "Không còn quyền dùng nhiều máy");
  await choMotNhip();
  const daDong = w.q("SELECT id FROM aut_session WHERE staff_id = ? AND end_reason = 'mat_mien'", SALES).map((x: any) => x.id);
  assert.deepEqual(goi, [{ phienKetThuc: daDong }], "đúng MỘT lời gọi cho cả danh sách");
});

test("§6 quy tắc 8 + Review Focus 5 — DÂY THẬT (không ghiDe, hàm tiêm của gốc lắp ráp): siết tắt đăng ký của máy vừa kết thúc (mat-mien); máy giữ lại và đăng ký session_id NULL còn bật", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  const m1 = await dangNhap(w, "0900000001", "iPhone");
  const m2 = await dangNhap(w, "0900000001", "Windows");
  const ep1 = "https://fcm.googleapis.com/fcm/send/cs-may-1";
  const ep2 = "https://fcm.googleapis.com/fcm/send/cs-may-2";
  for (const [cookie, endpoint] of [[m1, ep1], [m2, ep2]] as const) {
    const r = await w.call("POST", "/api/account/thong-bao/may", { headers: { cookie }, body: { endpoint, thietBi: "Máy thử" } });
    assert.equal(r.status, 200, r.text);
  }
  // Một đăng ký cũ chưa gắn phiên (trước bản 1.58), cùng tài khoản.
  w.sqlite.exec(`INSERT INTO ntf_push_sub (id, staff_id, endpoint, thiet_bi, revoked_at, revoke_reason, created_at, created_by, updated_at, updated_by, session_id)
    VALUES ('cs-null', '${SALES}', 'https://fcm.googleapis.com/fcm/send/cs-null', 'Máy cũ', NULL, NULL, '2026-09-01T00:00:00.000Z', '${SALES}', '2026-09-01T00:00:00.000Z', NULL, NULL)`);
  const r = await luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: banCua(await docBan(w), "SALES") }]);
  assert.equal(r.status, 200, r.text);
  await choMotNhip();
  const dongCua = (ep: string) => w.q("SELECT revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = ? ORDER BY created_at DESC LIMIT 1", ep)[0];
  assert.equal(dongCua(ep1).revoke_reason, "mat-mien");
  assert.equal(dongCua(ep2).revoked_at, null, "máy giữ lại vẫn nhận thông báo");
  assert.equal(dongCua("https://fcm.googleapis.com/fcm/send/cs-null").revoked_at, null, "đăng ký chưa gắn phiên không bị tắt");
});

test("AC4: Bán hàng + Kế toán, chỉ Kế toán Nhiều máy → được nhiều máy", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "ACCOUNTING", multi: true, banDangXem: null }])).status, 200);
  const a = await dangNhap(w, "0900000002", "iPhone");
  const b = await dangNhap(w, "0900000002", "Windows");
  assert.equal((await me(w, a)).status, 200);
  assert.equal((await me(w, b)).status, 200);
});

test("§6 quy tắc 3 (AC7): hai lần lưu đè nhau từ cùng một bản → một 200, một 409; bên thua không ghi dòng nào, không đăng xuất máy nào", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  const ban = banCua(await docBan(w), "SALES");
  const [x, y] = await Promise.all([
    luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: ban }]),
    luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: ban }, { permissionCode: "HR", multi: true, banDangXem: null }]),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409]);
  const thua = x.status === 409 ? x : y;
  assert.match(thua.json.error.message, /Chính sách vừa được người khác đổi/);
  assert.equal(w.q("SELECT count(*) n FROM aut_session_policy WHERE valid_to_at IS NULL")[0].n, x.status === 200 ? 1 : 2);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'session_policy_changed'")[0].n, 2, "lần đầu + lần thắng; bên thua không có dòng nhật ký");
});

test("§6 quy tắc 6 + Review Focus 4: 50 tài khoản Đối tác hai máy → lô lưu có cùng số câu như 5 tài khoản; một lời gọi dongBangTin; mỗi người còn một phiên", async () => {
  const soCau: number[][] = [];
  for (const n of [5, 50]) {
    const goi: unknown[] = [];
    const w = await setup({ ghiDe: { dongBangTin: async (_e: unknown, m: unknown) => void goi.push(m) } });
    assert.equal((await luu(w, [{ permissionCode: "PARTNER", multi: true, banDangXem: null }])).status, 200);
    for (let i = 0; i < n; i++) {
      const id = `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, "0")}`;
      seedStaff(w.sqlite, { id, phone: `0911${String(i).padStart(6, "0")}`, name: `Đối tác ${i}`, perms: ["PARTNER"] });
      for (const [k, t] of [["a", "2026-10-01T00:00:00.000Z"], ["b", "2026-10-01T01:00:00.000Z"]] as const) {
        w.sqlite.prepare(
          "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
            "VALUES (?1, ?2, 'PIN', 0, NULL, 'Máy', NULL, NULL, ?3, ?3, ?4, NULL, NULL, NULL, ?2, ?3, NULL)",
        ).run(`${id}-${k}`, id, t, new Date(Date.now() + 86400_000).toISOString());
      }
    }
    const goc = w.env.DB.batch;
    const lo: number[] = [];
    w.env.DB.batch = async (stmts: unknown[]) => { lo.push(stmts.length); return goc(stmts); };
    const r = await luu(w, [{ permissionCode: "PARTNER", multi: false, banDangXem: banCua(await docBan(w), "PARTNER") }]);
    w.env.DB.batch = goc;
    assert.equal(r.status, 200, r.text);
    assert.deepEqual({ soPhien: r.json.soPhien, soNguoi: r.json.soNguoi }, { soPhien: n, soNguoi: n });
    soCau.push(lo);
    await choMotNhip();
    assert.equal(goi.filter((g: any) => "phienKetThuc" in g).length, 1);
    assert.equal(w.q("SELECT count(*) n FROM (SELECT staff_id FROM aut_session WHERE ended_at IS NULL GROUP BY staff_id HAVING count(*) > 1)")[0].n, 0);
  }
  assert.deepEqual(soCau[0], soCau[1], `số câu mỗi lô: ${JSON.stringify(soCau)}`);
});

test("§6 quy tắc 7 (AC11): nhật ký session_policy_changed im lặng, không tên/SĐT/IP; nới không đụng phiên", async () => {
  const w = await setup();
  const tk = await w.token(SALES);
  const truoc = w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES);
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  assert.deepEqual(w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES), truoc, "nới không ghi gì lên phiên");
  const [d] = w.q("SELECT staff_id, detail FROM audit_log WHERE action = 'session_policy_changed'");
  assert.equal(d.staff_id, SUP);
  assert.equal(d.detail, "Bán hàng → Nhiều máy; đăng xuất 0 máy của 0 người");
  assert.doesNotMatch(d.detail, /0900|An\b|Chủ|\d+\.\d+\.\d+\.\d+/);
  void tk;
});
