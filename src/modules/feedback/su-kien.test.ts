// Sự kiện nhận việc / giao / chuyển nhóm của yêu cầu hỗ trợ + mailPending cho mọi người xử lý (Task 6, đặc tả DAC-TA-MAY-CHU). Khung thử: ỨNG DỤNG THẬT + SQLite dựng từ migrations.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT_TV = U(3), KT_TN = U(4), NS_TV = U(5), PARTNER = U(7), KT_GUI = U(8);
const KY_THUAT = "fbk-team-ky-thuat", KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";
const NOW = "2026-10-15T00:00:00.000Z";

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [KT_TN, "0900000004", ["ACCOUNTING"]],
    [NS_TV, "0900000005", ["HR"]], [PARTNER, "0900000007", ["PARTNER"]], [KT_GUI, "0900000008", ["ACCOUNTING"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms });
  const them = (team: string, staff: string, role: "LEAD" | "MEMBER") =>
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-${team}-${staff}', '${team}', '${staff}', '${role}', '${NOW}', '${NOW}', '${NOW}')`);
  them(KE_TOAN, KT_TV, "MEMBER"); them(KE_TOAN, KT_TN, "LEAD"); them(KE_TOAN, KT_GUI, "MEMBER"); them(NHAN_SU, NS_TV, "MEMBER");
  return w;
}
const tao = (w: any, as: string, teamId: string) =>
  w.call("POST", "/api/feedback", { as, body: { kind: "QUESTION", title: "Hỏi về công nợ", body: "Nội dung hỏi.", clientRequestId: crypto.randomUUID(), context: {}, teamId } });
const nhan = (w: any, id: string, as: string) => w.call("POST", `/api/feedback/${id}/claim`, { as });
const giao = (w: any, id: string, as: string, assigneeId: string) => w.call("PATCH", `/api/feedback/${id}/xu-ly`, { as, body: { assigneeId } });
const chuyen = (w: any, id: string, as: string, teamId: string, reason = "Nhầm nhóm") => w.call("POST", `/api/feedback/${id}/transfer`, { as, body: { teamId, reason } });
const xem = (w: any, id: string, as: string) => w.call("GET", `/api/feedback/${id}`, { as });
const cho = () => new Promise((r) => setTimeout(r, 5)); // dấu giờ mỗi lệnh khác nhau ⇒ thứ tự theo `at` ổn định

test("thành viên nhóm thấy ba sự kiện đúng thứ tự, tên đã đổi từ id", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await nhan(w, id, KT_TV)).status, 200);
  await cho();
  assert.equal((await giao(w, id, KT_TN, KT_GUI)).status, 200);
  await cho();
  assert.equal((await chuyen(w, id, SUPER, NHAN_SU, "Lý do riêng tư ZZZ")).status, 200);
  const r = await xem(w, id, NS_TV);
  assert.equal(r.status, 200, r.text);
  const ev = r.json.suKien;
  assert.deepEqual(ev.map((e: any) => e.loai), ["CLAIMED", "ASSIGNED", "TEAM_CHANGED"]);
  assert.equal(ev[0].den, "NV 3");
  assert.equal(ev[0].nguoi, "NV 3");
  assert.equal(ev[1].den, "NV 8");
  assert.equal(ev[1].nguoi, "NV 4");
  assert.equal(ev[2].tu, "Kế toán");
  assert.equal(ev[2].den, "Nhân sự");
  assert.ok(!JSON.stringify(ev).includes("ZZZ") && !JSON.stringify(ev).includes(KT_GUI), "không lộ lý do chuyển nhóm hay id");
});

test("người gửi (Bán hàng) nhận suKien rỗng", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  const r = await xem(w, id, SALES);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.suKien, []);
});

test("người gửi bên ngoài (Đối tác) sau chuyển nhóm + giao lại: suKien rỗng, thân phản hồi không chứa tên nhóm cũ", async () => {
  const w = setup();
  const id = (await tao(w, PARTNER, KY_THUAT)).json.ticket.id;
  assert.equal((await nhan(w, id, SUPER)).status, 200);
  await cho();
  assert.equal((await chuyen(w, id, SUPER, KE_TOAN, "Nhầm nhóm")).status, 200);
  await cho();
  assert.equal((await giao(w, id, KT_TN, KT_TV)).status, 200);
  const r = await xem(w, id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.suKien, []);
  assert.ok(!r.text.includes("Kỹ thuật"), "không lộ tên nhóm cũ");
  assert.ok(!r.text.includes("Nhầm nhóm"), "không lộ lý do");
  assert.ok(!r.text.includes("NV 2"), "không lộ người giữ cũ");
  const m = await w.call("GET", `/api/feedback/${id}/messages?since=${encodeURIComponent("2000-01-01T00:00:00.000Z")}`, { as: PARTNER });
  assert.equal(m.status, 200, m.text);
  assert.deepEqual(m.json.suKien, []);
});

test("messages?since chỉ trả sự kiện sau since", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  await cho();
  await giao(w, id, KT_TN, KT_GUI);
  const at = w.q(`SELECT at FROM fbk_ticket_event WHERE ticket_id = '${id}' AND type = 'CLAIMED'`)[0].at;
  const url = (s: string) => `/api/feedback/${id}/messages?since=${encodeURIComponent(s)}`;
  const m = await w.call("GET", url(at), { as: KT_TN });
  assert.equal(m.status, 200, m.text);
  assert.deepEqual(m.json.suKien.map((e: any) => e.loai), ["ASSIGNED"], "nghiêm ngặt: sự kiện đúng mốc không lặp lại");
  const tat = await w.call("GET", url("2000-01-01T00:00:00.000Z"), { as: KT_TN });
  assert.deepEqual(tat.json.suKien.map((e: any) => e.loai), ["CLAIMED", "ASSIGNED"]);
});

test("thành viên nhóm (không Toàn quyền) thấy mailPending ở chi tiết; người gửi thì không", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  w.sqlite.exec(`UPDATE fbk_ticket SET notified_at = NULL WHERE id = '${id}'`);
  assert.equal((await xem(w, id, KT_TV)).json.ticket.mailPending, true);
  assert.equal((await xem(w, id, SALES)).json.ticket.mailPending, false);
});
