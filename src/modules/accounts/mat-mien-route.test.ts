// ADR-0085 Q2 điều 7 (thay ADR-0075 điều 3): tài khoản MẤT "được nhiều máy" (bỏ Toàn quyền / vai IT, hoặc bỏ quyền mà chính sách đặt Nhiều máy) qua
// PUT /api/staff/:id/permissions hay PUT /api/staff/:id/roles → chỉ còn phiên còn sống mới nhất (single = 1), các phiên khác 'mat_mien'; máy bị kết thúc mất
// Bảng tin + thông báo (ADR-0075 điều 6). ĐƯỢC nhiều máy → KHÔNG ghi gì lên phiên (đặc tả §4.4). Câu phiên chạy ở lô THỨ HAI khi lô quyền có câu chốt
// "quản trị viên cuối" — chỉ khi câu chốt đã thắng (AC8). Chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const SUP2 = "55555555-5555-4555-8555-555555555555";
const ADM2 = "44444444-4444-4444-8444-444444444444";

function setup() {
  const goi: any[] = [];
  const w = world({ ghiDe: { dongBangTin: async (_env: unknown, muc: unknown) => { goi.push(muc); } } });
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: SUP2, phone: "0900000005", name: "IT Hai", perms: ["SUPER_ADMIN"] });
  return { w, goi };
}
const maPhien = (token: string) => token.split(".")[2]!;
const callWith = (w: any, token: string, method: string, path: string) => w.call(method, path, { headers: { cookie: `td_session=${token}` } });
/** Một máy KHÁC của tài khoản (dòng phiên chèn thẳng, mới hơn phiên của token). */
function mayKhac(w: any, id: string, staff: string, single: 0 | 1, createdAt = new Date().toISOString()) {
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PIN', ?3, NULL, 'Máy Mac · Chrome', NULL, NULL, ?4, ?4, ?5, NULL, NULL, NULL, ?2, ?4, NULL)",
  ).run(id, staff, single, createdAt, new Date(Date.now() + 86400_000).toISOString());
}
/** Lùi giờ cấp của phiên token về 1 giờ trước (để phiên chèn sau là "mới nhất"). */
const lui = (w: any, sid: string) => {
  const t = new Date(Date.now() - 3600_000).toISOString();
  w.sqlite.prepare("UPDATE aut_session SET created_at = ?2, last_seen_at = ?2 WHERE id = ?1").run(sid, t);
};
const song = (w: any, staff: string) => w.q("SELECT id, single FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY id", staff).map((r: any) => ({ ...r }));
/** Đặt chính sách thẳng vào bảng (bài route không kiểm route lưu chính sách — có bài riêng). */
const datChinhSach = (w: any, code: string, multi: 0 | 1) =>
  w.sqlite.exec(`INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, created_at, updated_at) VALUES ('pol-${code}', '${code}', ${multi}, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
/**
 * Chèn "quản trị viên kia bị ngưng" NGAY TRƯỚC lô đổi quyền của route (lô ĐẦU TIÊN có câu ghi stf_permission) — tức SAU lời kiểm trước lô
 * (countActiveAdmins = 2), nên câu chốt TRONG lô thua. Ghi lại SQL của mọi lô chạy SAU lô đó, để khẳng định lô phiên không chạy. Phiên của người gọi phải được
 * cấp TRƯỚC khi bọc (khung thử chèn phiên thẳng bằng SQLite, nhưng cứ cấp trước cho chắc).
 */
function ngungGiuaChung(w: any, nguoiKia: string) {
  const goc = w.env.DB.batch;
  const st = { daChen: false, loSau: [] as string[][] };
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (st.daChen) st.loSau.push(stmts.map((s) => s.sql));
    else if (stmts.some((s) => /stf_permission/.test(s.sql))) {
      st.daChen = true;
      w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${nguoiKia}'`);
    }
    return goc(stmts);
  };
  return { st, traLai: () => { w.env.DB.batch = goc; } };
}
const coLoPhien = (loSau: string[][]) => loSau.some((lo) => lo.some((sql) => /aut_session/.test(sql)));

test("ADR-0085 Q2 điều 7: Toàn quyền bỏ quyền Toàn quyền của tài khoản đang mở 2 máy → còn ĐÚNG phiên mới nhất (single=1); máy cũ 'mat_mien' + 401; Bảng tin đóng đúng máy cũ", async () => {
  const { w, goi } = setup();
  const tk = await w.token(SUP2);
  const cu = maPhien(tk);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", cu)[0].single, 0, "Toàn quyền: phiên nhiều máy");
  lui(w, cu);
  mayKhac(w, "may-moi", SUP2, 0);
  const r = await w.call("PUT", `/api/staff/${SUP2}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SUP2), [{ id: "may-moi", single: 1 }]);
  const d = w.q("SELECT end_reason, ended_by, updated_by, ended_at FROM aut_session WHERE id = ?", cu)[0];
  assert.deepEqual({ ...d, ended_at: typeof d.ended_at }, { end_reason: "mat_mien", ended_by: SUP, updated_by: SUP, ended_at: "string" });
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401, "máy cũ bị đăng xuất");
  assert.ok(goi.some((g) => JSON.stringify(g) === JSON.stringify({ staffId: SUP2, sessionIds: [cu], giuPhien: "may-moi" })), JSON.stringify(goi));
});

test("ADR-0085 §4.4: tài khoản ĐƯỢC nhiều máy (cấp Toàn quyền, hoặc thêm quyền mà chính sách đặt Nhiều máy) → KHÔNG ghi gì lên phiên; không gọi Bảng tin theo phiên", async () => {
  const { w, goi } = setup();
  datChinhSach(w, "ACCOUNTING", 1);
  const tk = await w.token(SALES);
  const truoc = w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES);
  assert.equal(truoc[0].single, 1);
  for (const perms of [["SALES", "ACCOUNTING"], ["SALES", "ACCOUNTING", "SUPER_ADMIN"]]) {
    const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body: { permissions: perms } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES), truoc, `nới (${perms}) không ghi phiên`);
  }
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
  assert.ok(!goi.some((g) => "sessionIds" in g), JSON.stringify(goi));
});

test("ADR-0085 Q2 điều 7: gán vai IT → nhiều máy (phiên đang mở KHÔNG bị ghi); bỏ vai IT (gỡ ADMIN — đường câu chốt) → còn phiên mới nhất, máy cũ 401", async () => {
  const { w, goi } = setup();
  const tk = await w.token(SALES);
  const cu = maPhien(tk);
  const len = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["IT"] } });
  assert.equal(len.status, 200, len.text);
  assert.deepEqual(song(w, SALES), [{ id: cu, single: 1 }], "nới không ghi phiên (đặc tả §4.4): phiên cũ single = 1 sống cạnh phiên mới single = 0");
  lui(w, cu);
  mayKhac(w, "may-moi", SALES, 0);
  const xuong = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } });
  assert.equal(xuong.status, 200, xuong.text);
  assert.deepEqual(song(w, SALES), [{ id: "may-moi", single: 1 }]);
  assert.equal(w.q("SELECT end_reason FROM aut_session WHERE id = ?", cu)[0].end_reason, "mat_mien");
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401);
  assert.ok(goi.some((g) => JSON.stringify(g) === JSON.stringify({ staffId: SALES, sessionIds: [cu], giuPhien: "may-moi" })), JSON.stringify(goi));
});

test("ADR-0085 §4.4: bỏ quyền mà chính sách đặt Nhiều máy (ACCOUNTING) → còn đúng phiên mới nhất, máy cũ 'mat_mien' + 401, Bảng tin dạng giữ-phiên", async () => {
  const { w, goi } = setup();
  datChinhSach(w, "ACCOUNTING", 1);
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('s-acc', '${SALES}', 'ACCOUNTING', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`);
  const tk = await w.token(SALES);
  const cu = maPhien(tk);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", cu)[0].single, 0, "khung thử cấp phiên theo chính sách thật: nhiều máy");
  lui(w, cu);
  mayKhac(w, "may-moi", SALES, 0);
  const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SALES), [{ id: "may-moi", single: 1 }]);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401);
  assert.ok(goi.some((g) => JSON.stringify(g) === JSON.stringify({ staffId: SALES, sessionIds: [cu], giuPhien: "may-moi" })), JSON.stringify(goi));
});

// ADR-0090 đ1(ii): Quản trị không còn gỡ vai Kế toán — ví dụ đổi từ Kế toán sang Hướng dẫn viên (cùng ý AC9: Quản trị đổi vai làm mất miễn nhiều máy).
test("ADR-0085 Q2 điều 7 + AC9: QUẢN TRỊ đổi vai (Hướng dẫn viên → Nhân viên kinh doanh) khi chính sách 'Hướng dẫn viên = Nhiều máy' → máy thừa đăng xuất ngay", async () => {
  const { w } = setup();
  datChinhSach(w, "FIELD", 1);
  w.sqlite.exec(`UPDATE stf_permission SET permission_type_code = 'FIELD' WHERE staff_id = '${SALES}'`);
  const tk = await w.token(SALES);
  const cu = maPhien(tk);
  lui(w, cu);
  mayKhac(w, "may-moi", SALES, 0);
  const r = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: ADM, body: { roles: ["SALES_STAFF"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SALES), [{ id: "may-moi", single: 1 }]);
  assert.equal(w.q("SELECT end_reason, ended_by FROM aut_session WHERE id = ?", cu)[0].ended_by, ADM);
});

test("ADR-0085 §6 quy tắc 4 (AC8): 'ADMIN = Nhiều máy', gỡ ADMIN mà câu chốt TRONG LÔ thua (quản trị viên kia bị ngưng giữa lời kiểm trước và lô) → 409, KHÔNG phiên nào kết thúc", async () => {
  const { w } = setup();
  datChinhSach(w, "ADMIN", 1);
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000004", name: "Quản trị Hai", perms: ["ADMIN"] });
  const tk = await w.token(ADM);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", maPhien(tk))[0].single, 0, "Quản trị nhiều máy theo chính sách");
  mayKhac(w, "may-hai", ADM, 0);
  await w.token(SUP); // phiên của người gọi cấp TRƯỚC khi bọc lô
  const truoc = w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", ADM);
  assert.equal(truoc.length, 2);
  const chen = ngungGiuaChung(w, ADM2);
  const r = await w.call("PUT", `/api/staff/${ADM}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  chen.traLai();
  assert.equal(r.status, 409, r.text);
  assert.ok(chen.st.daChen, "lô đổi quyền đã chạy (chèn ngưng giữa chừng có tác dụng)");
  assert.ok(!coLoPhien(chen.st.loSau), `lô phiên không được chạy khi câu chốt thua: ${JSON.stringify(chen.st.loSau)}`);
  assert.deepEqual(w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", ADM), truoc);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
});

// Bài cũ (ADR-0075) ngưng ADM TRƯỚC request nên bị chặn ở lời kiểm trước lô (countActiveAdmins → checkAccountChange) — rỗng nghĩa với câu phiên. Nay chèn
// ngưng GIỮA lời kiểm và lô (cùng kỹ thuật bài AC8) để câu chốt TRONG lô thua thật.
test("ADR-0085 Q2 điều 7: bỏ Toàn quyền + ADMIN bị câu chốt TRONG LÔ từ chối (quản trị viên kia bị ngưng giữa chừng, 409) → không phiên nào đổi", async () => {
  const { w } = setup();
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('sup2-admin', '${SUP2}', 'ADMIN', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`);
  const tk = await w.token(SUP2);
  mayKhac(w, "may-hai", SUP2, 0);
  await w.token(SUP);
  const truoc = w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", SUP2);
  const chen = ngungGiuaChung(w, ADM);
  const r = await w.call("PUT", `/api/staff/${SUP2}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  chen.traLai();
  assert.equal(r.status, 409, r.text);
  assert.ok(chen.st.daChen);
  assert.ok(!coLoPhien(chen.st.loSau), JSON.stringify(chen.st.loSau));
  assert.deepEqual(w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", SUP2), truoc);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
});

// Kiểm độc lập cuối I1: route ĐỔI VAI cũng có câu chốt "quản trị viên cuối" (gỡ ADMIN) — câu phiên đi cùng lô vai (lô thứ hai), chỉ khi câu chốt đã thắng.
// Cùng kỹ thuật bài AC8: quản trị viên kia bị ngưng GIỮA lời kiểm trước và lô ⇒ câu chốt trong lô thua ⇒ 409, không phiên nào kết thúc.
test("ADR-0085 §6 quy tắc 4 (AC8, route đổi vai): 'ADMIN = Nhiều máy', đổi vai làm mất ADMIN mà câu chốt TRONG LÔ thua → 409, KHÔNG phiên nào kết thúc", async () => {
  const { w } = setup();
  datChinhSach(w, "ADMIN", 1);
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000004", name: "Quản trị Hai", perms: ["ADMIN"] });
  const tk = await w.token(ADM);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", maPhien(tk))[0].single, 0, "Quản trị nhiều máy theo chính sách");
  mayKhac(w, "may-hai", ADM, 0);
  await w.token(SUP); // phiên của người gọi cấp TRƯỚC khi bọc lô
  const truoc = w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", ADM);
  assert.equal(truoc.length, 2);
  const chen = ngungGiuaChung(w, ADM2);
  const r = await w.call("PUT", `/api/staff/${ADM}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } });
  chen.traLai();
  assert.equal(r.status, 409, r.text);
  assert.ok(chen.st.daChen, "lô đổi quyền của route đổi vai đã chạy (chèn ngưng giữa chừng có tác dụng)");
  assert.ok(!coLoPhien(chen.st.loSau), `lô phiên không được chạy khi câu chốt thua: ${JSON.stringify(chen.st.loSau)}`);
  assert.deepEqual(w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", ADM), truoc);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
});
