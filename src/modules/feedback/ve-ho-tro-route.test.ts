// Vé hỗ trợ đợt 1 (ADR-0119) trên khung thử (ỨNG DỤNG THẬT + SQLite dựng từ migrations).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT_TV = U(3), KT_TN = U(4), NS_TV = U(5), QT = U(6), PARTNER = U(7), KT_GUI = U(8);
const KY_THUAT = "fbk-team-ky-thuat", KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";
const NOW = "2026-10-15T00:00:00.000Z";

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [KT_TN, "0900000004", ["ACCOUNTING"]],
    [NS_TV, "0900000005", ["HR"]], [QT, "0900000006", ["ADMIN"]], [PARTNER, "0900000007", ["PARTNER"]], [KT_GUI, "0900000008", ["ACCOUNTING"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms });
  const them = (team: string, staff: string, role: "LEAD" | "MEMBER") =>
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-${team}-${staff}', '${team}', '${staff}', '${role}', '${NOW}', '${NOW}', '${NOW}')`);
  them(KE_TOAN, KT_TV, "MEMBER"); them(KE_TOAN, KT_TN, "LEAD"); them(KE_TOAN, KT_GUI, "MEMBER"); them(NHAN_SU, NS_TV, "MEMBER");
  return w;
}
const tao = (w: any, as: string, teamId?: string, over: Record<string, unknown> = {}) =>
  w.call("POST", "/api/feedback", { as, body: { kind: "QUESTION", title: "Hỏi về công nợ", body: "Nội dung hỏi.", clientRequestId: crypto.randomUUID(), context: {}, ...(teamId ? { teamId } : {}), ...over } });

test("gửi phiếu tới nhóm: lưu đúng nhóm; thiếu teamId ⇒ Kỹ thuật (bản web cũ vẫn gửi được)", async () => {
  const w = setup();
  const a = await tao(w, SALES, KE_TOAN);
  assert.equal(a.status, 201, a.text);
  assert.equal(a.json.ticket.teamId, KE_TOAN);
  assert.equal(a.json.ticket.teamName, "Kế toán");
  const b = await tao(w, SALES);
  assert.equal(b.status, 201, b.text);
  assert.equal(b.json.ticket.teamId, KY_THUAT);
});

test("nhóm không tồn tại hoặc đã ngưng ⇒ 400, không lưu gì", async () => {
  const w = setup();
  assert.equal((await tao(w, SALES, "khong-co")).status, 400);
  w.sqlite.exec(`UPDATE fbk_team SET active = 0 WHERE id = '${NHAN_SU}'`);
  const r = await tao(w, SALES, NHAN_SU);
  assert.equal(r.status, 400, r.text);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket")[0].n, 0);
});

test("bên ngoài (PARTNER): gửi Kỹ thuật được; nhóm khác ⇒ 403; danh sách nhóm chỉ có Kỹ thuật", async () => {
  const w = setup();
  assert.equal((await tao(w, PARTNER, KY_THUAT)).status, 201);
  const r = await tao(w, PARTNER, KE_TOAN);
  assert.equal(r.status, 403, r.text);
  const g = await w.call("GET", "/api/feedback/teams", { as: PARTNER });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json.teams.map((t: any) => t.id), [KY_THUAT]);
});

test("danh sách nhóm cho nội bộ: đủ nhóm đang dùng, kèm tư cách thành viên của chính người gọi", async () => {
  const w = setup();
  const g = await w.call("GET", "/api/feedback/teams", { as: KT_TN });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.teams.length, 4);
  assert.deepEqual(g.json.mine, [{ teamId: KE_TOAN, role: "LEAD" }]);
  assert.equal(g.json.isSuper, false);
  assert.equal((await w.call("GET", "/api/feedback/teams", { as: SUPER })).json.isSuper, true);
  assert.equal((await w.call("GET", "/api/feedback/teams")).status, 401);
});

test("người gửi chỉ thấy phiếu của mình ở /mine; người khác đọc chi tiết ⇒ 404", async () => {
  const w = setup();
  const a = await tao(w, SALES, KE_TOAN);
  assert.equal((await w.call("GET", `/api/feedback/${a.json.ticket.id}`, { as: QT })).status, 404);
  assert.equal((await w.call("GET", `/api/feedback/${a.json.ticket.id}`, { as: SALES })).status, 200);
});
