// ADR-0038: (1) thao tác "im lặng" của Toàn quyền (đổi vai/quyền, bật/tắt bảo trì, đặt lại PIN, gỡ Face ID) vẫn GHI nhật ký nhưng chỉ Toàn quyền
// xem được; (2) Quản trị không còn đọc/xử lý Góp ý của người khác (feedback.view = own, feedback.triage = none); (6) trang Nhật ký chỉ Toàn quyền
// (`audit.view`). Vì (6), bộ lọc (1) là lớp phòng thủ thứ hai (ai đó được mở `audit.view` mà không giữ Toàn quyền) — kiểm ở tầng truy vấn `listAll`.
// Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs (cùng khuôn quan-tri-hoi-bang.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1, app } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const DIR = "99999999-9999-4999-8999-999999999999"; // giống vai IT: giữ cả ADMIN và SUPER_ADMIN (ADR-0072: vai Giám đốc nay chỉ ADMIN)

const SILENT = ["account_roles_changed", "permission_changed", "staff_role_changed", "maintenance_changed", "pin_reset", "passkey_removed", "session_policy_changed", "session_revoked"]; // ADR-0075 điều 8: thêm session_revoked; ADR-0085 điều 9: thêm session_policy_changed. mfa_reset (ADR-0074 Task 6) CỐ Ý không im lặng — chưa có ADR duyệt (vòng sửa 1). Gõ tay CÓ CHỦ Ý (không lấy từ SILENT_AUDIT_ACTIONS) để bỏ sót ở nguồn thì bài đỏ

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: DIR, phone: "0900000009", name: "Giám đốc", perms: ["ADMIN", "SUPER_ADMIN"] });
  let n = 0;
  const log = (actor: string, action: string) => {
    n += 1;
    const at = `2026-09-27T00:00:${String(n).padStart(2, "0")}.000Z`;
    w.sqlite.exec(`INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES ('log-${n}', NULL, '${actor}', '${action}', 'staff', '${SALES}', NULL, '${at}')`);
    return `log-${n}`;
  };
  return { w, log };
}

// bỏ dòng gieo của migration 0055 (id gieo-nhom-dich-vu, ADR-0058) — không phải dòng do bài này ghi
const ids = (r: any): string[] => r.json.entries.map((e: any) => e.id).filter((id: string) => id !== "gieo-nhom-dich-vu").sort();
/** Truy vấn của trang Nhật ký như người KHÔNG giữ Toàn quyền nhận (hideSilent = true), trả dạng giống kết quả route cho `ids()`. */
async function asNonSuper(w: any, opts: { action?: string; q?: string; limit?: number } = {}) {
  const json = await app.listAll(fakeD1(w.sqlite), { action: (opts.action ?? null) as any, q: opts.q ?? "", limit: opts.limit ?? 100, offset: 0, hideSilent: true });
  return { json };
}

test("ADR-0038 điều 6: Quản trị gọi trang Nhật ký → 403", async () => {
  const { w } = setup();
  assert.equal((await w.call("GET", "/api/audit", { as: ADM })).status, 403);
});

test("ADR-0038: người không giữ Toàn quyền KHÔNG nhận 8 thao tác im lặng do Toàn quyền làm (kể cả tài khoản giữ cả Quản trị lẫn Toàn quyền); nhận thao tác thường của Toàn quyền và mọi thao tác của Quản trị", async () => {
  const { w, log } = setup();
  const silentBySup = SILENT.map((a) => log(SUP, a));
  const silentByDir = SILENT.map((a) => log(DIR, a));
  const normalBySup = log(SUP, "location_created");
  // ADR-0074 Task 6, vòng sửa 1: Toàn quyền tắt bảo mật hai lớp của người khác là thao tác THƯỜNG (chưa có ADR cho nó im lặng) — người khác vẫn thấy.
  const mfaResetBySup = log(SUP, "mfa_reset");
  const silentByAdm = SILENT.map((a) => log(ADM, a));
  const seen = ids(await asNonSuper(w));
  for (const id of [...silentBySup, ...silentByDir]) assert.ok(!seen.includes(id), `không được thấy ${id}`);
  assert.deepEqual(seen, [normalBySup, mfaResetBySup, ...silentByAdm].sort());
});

test("ADR-0038: Toàn quyền thấy đủ mọi dòng nhật ký", async () => {
  const { w, log } = setup();
  const all = [...SILENT.map((a) => log(SUP, a)), ...SILENT.map((a) => log(DIR, a)), log(SUP, "location_created"), ...SILENT.map((a) => log(ADM, a))];
  for (const who of [SUP, DIR]) {
    const r = await w.call("GET", "/api/audit?limit=100", { as: who });
    assert.equal(r.status, 200);
    assert.deepEqual(ids(r), all.sort());
  }
});

test("ADR-0038: lọc theo hành động hay tìm theo tên cũng không lộ dòng im lặng; hasMore tính sau khi đã giấu", async () => {
  const { w, log } = setup();
  const bySup = log(SUP, "pin_reset");
  const byAdm = log(ADM, "pin_reset");
  let r: any = await asNonSuper(w, { action: "pin_reset" });
  assert.deepEqual(ids(r), [byAdm]);
  r = await asNonSuper(w, { q: "Chủ" });
  assert.ok(!ids(r).includes(bySup));
  r = await asNonSuper(w, { action: "pin_reset", limit: 1 });
  assert.deepEqual(ids(r), [byAdm]);
  assert.equal(r.json.hasMore, false, "dòng bị giấu không được làm hiện nút 'xem thêm'");
  r = await w.call("GET", "/api/audit?action=pin_reset", { as: SUP });
  assert.deepEqual(ids(r), [bySup, byAdm].sort());
});

test("ADR-0038: người vừa bị gỡ Toàn quyền → thao tác im lặng họ làm từ trước hiện lại cho Quản trị (quyết theo quyền hiện tại của người làm)", async () => {
  const { w, log } = setup();
  const id = log(DIR, "pin_reset");
  w.sqlite.exec(`UPDATE stf_permission SET valid_to_at = '2026-09-27T01:00:00.000Z' WHERE staff_id = '${DIR}' AND permission_type_code = 'SUPER_ADMIN'`);
  assert.ok(ids(await asNonSuper(w)).includes(id));
});

const ticket = () => ({ kind: "BUG", title: "Nút lưu không bấm được", body: "Bấm Lưu không thấy gì.", clientRequestId: crypto.randomUUID(), context: { path: "/order" } });

test("ADR-0038: Quản trị không đọc/xử lý được Góp ý của người khác; vẫn gửi và xem được của chính mình; Toàn quyền giữ nguyên", async () => {
  const { w } = setup();
  const other = await w.call("POST", "/api/feedback", { as: SALES, body: ticket() });
  assert.equal(other.status, 201, other.text);
  const otherId = other.json.ticket.id;
  assert.equal((await w.call("GET", "/api/feedback", { as: ADM })).status, 403, "hàng đợi");
  assert.equal((await w.call("GET", `/api/feedback/${otherId}`, { as: ADM })).status, 404, "không lộ sự tồn tại");
  assert.equal((await w.call("POST", `/api/feedback/${otherId}/messages`, { as: ADM, body: { body: "chen ngang" } })).status, 404);
  assert.equal((await w.call("PATCH", `/api/feedback/${otherId}`, { as: ADM, body: { status: "ACK" } })).status, 403);
  const badge = await w.call("GET", "/api/feedback/badge", { as: ADM });
  assert.equal(badge.status, 200);
  const mine = await w.call("POST", "/api/feedback", { as: ADM, body: ticket() });
  assert.equal(mine.status, 201, mine.text);
  assert.equal((await w.call("GET", `/api/feedback/${mine.json.ticket.id}`, { as: ADM })).status, 200);
  assert.equal((await w.call("GET", "/api/feedback", { as: SUP })).status, 200);
  assert.equal((await w.call("GET", `/api/feedback/${otherId}`, { as: SUP })).status, 200);
});
