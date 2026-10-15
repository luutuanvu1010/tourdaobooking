// Vé hỗ trợ đợt 1 (ADR-0119) trên khung thử (ỨNG DỤNG THẬT + SQLite dựng từ migrations).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT_TV = U(3), KT_TN = U(4), NS_TV = U(5), QT = U(6), PARTNER = U(7), KT_GUI = U(8), LAI = U(9), TXDT = U(0);
const KY_THUAT = "fbk-team-ky-thuat", KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";
const NOW = "2026-10-15T00:00:00.000Z";

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [KT_TN, "0900000004", ["ACCOUNTING"]],
    [NS_TV, "0900000005", ["HR"]], [QT, "0900000006", ["ADMIN"]], [PARTNER, "0900000007", ["PARTNER"]], [KT_GUI, "0900000008", ["ACCOUNTING"]],
    [LAI, "0900000009", ["SALES", "PARTNER"]], [TXDT, "0900000010", ["DRIVER_PARTNER"]], // tài khoản lai (nội bộ + bên ngoài) và tài xế đối tác
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

test("bên ngoài kể cả tài khoản lai (SALES+PARTNER) và tài xế đối tác: gửi nhóm khác Kỹ thuật ⇒ 403; danh sách nhóm chỉ có Kỹ thuật", async () => {
  const w = setup();
  for (const as of [LAI, TXDT]) {
    const r = await tao(w, as, KE_TOAN);
    assert.equal(r.status, 403, `${as} ${r.text}`);
    assert.equal((await tao(w, as, KY_THUAT)).status, 201, as);
    const g = await w.call("GET", "/api/feedback/teams", { as });
    assert.equal(g.status, 200, g.text);
    assert.deepEqual(g.json.teams.map((t: any) => t.id), [KY_THUAT], as);
  }
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket WHERE team_id <> '${KY_THUAT}'`)[0].n, 0);
});

test("tin đầu và tin trả lời mang team_id của phiếu (không phải mặc định Kỹ thuật)", async () => {
  const w = setup();
  const a = await tao(w, SALES, KE_TOAN);
  assert.equal(a.status, 201, a.text);
  const id = a.json.ticket.id;
  const r = await w.call("POST", `/api/feedback/${id}/messages`, { as: SALES, body: { body: "Bổ sung thông tin.", internal: false } });
  assert.equal(r.status, 201, r.text);
  const tin = w.q(`SELECT team_id FROM fbk_message WHERE ticket_id = '${id}' ORDER BY created_at, rowid`);
  assert.equal(tin.length, 2);
  assert.deepEqual(tin.map((m: any) => m.team_id), [KE_TOAN, KE_TOAN]);
});

test("gửi lại cùng clientRequestId (dù đổi nhóm) ⇒ 200, cùng phiếu, nhóm không đổi", async () => {
  const w = setup();
  const crid = crypto.randomUUID();
  const a = await tao(w, SALES, KE_TOAN, { clientRequestId: crid });
  assert.equal(a.status, 201, a.text);
  const b = await tao(w, SALES, NHAN_SU, { clientRequestId: crid });
  assert.equal(b.status, 200, b.text);
  assert.equal(b.json.ticket.id, a.json.ticket.id);
  assert.equal(b.json.ticket.teamId, KE_TOAN);
  assert.equal(w.q(`SELECT team_id FROM fbk_ticket WHERE id = '${a.json.ticket.id}'`)[0].team_id, KE_TOAN);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket")[0].n, 1);
});

// ---- Quản lý nhóm (Việc 4): chỉ Toàn quyền ------------------------------------------------------------------------
const admin = (w: any, method: string, path: string, as: string, body?: unknown) => w.call(method, `/api/feedback/admin/teams${path}`, { as, ...(body ? { body } : {}) });

test("quản lý nhóm: chỉ Toàn quyền; Quản trị, Nhân sự, thành viên và Trưởng nhóm đều 403", async () => {
  const w = setup();
  for (const as of [QT, NS_TV, KT_TN, SALES, PARTNER]) {
    assert.equal((await admin(w, "GET", "", as)).status, 403, as);
    assert.equal((await admin(w, "POST", "", as, { code: "MOI", name: "Nhóm mới", description: "", sensitive: false })).status, 403, as);
    assert.equal((await admin(w, "PATCH", `/${KY_THUAT}`, as, { sensitive: true })).status, 403, as);
    assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, as, { role: "MEMBER" })).status, 403, as);
    assert.equal((await admin(w, "DELETE", `/${KE_TOAN}/members/${KT_TV}`, as)).status, 403, as);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_team")[0].n, 4, "không tạo thêm nhóm");
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_team_member WHERE valid_to_at IS NOT NULL")[0].n, 0, "không gỡ ai");
  const g = await admin(w, "GET", "", SUPER);
  assert.equal(g.status, 200, g.text);
  const kt = g.json.teams.find((t: any) => t.id === KE_TOAN);
  assert.equal(kt.active, true);
  assert.deepEqual(kt.members.map((m: any) => [m.staffId, m.role]).sort(), [[KT_GUI, "MEMBER"], [KT_TN, "LEAD"], [KT_TV, "MEMBER"]].sort());
  assert.ok(kt.members.every((m: any) => typeof m.name === "string" && m.name.length > 0), "tên người đọc qua view nhãn");
});

test("Toàn quyền tạo nhóm, sửa cờ nhạy cảm, ngưng nhóm; mã trùng ⇒ 409; nhật ký không ghi mô tả", async () => {
  const w = setup();
  const t = await admin(w, "POST", "", SUPER, { code: "BAN_HANG", name: "Bán hàng", description: "Hỏi đáp bán hàng", sensitive: false });
  assert.equal(t.status, 201, t.text);
  assert.equal((await admin(w, "POST", "", SUPER, { code: "BAN_HANG", name: "Trùng", description: "", sensitive: false })).status, 409);
  assert.equal((await admin(w, "POST", "", SUPER, { code: "ban hang", name: "Sai mã", description: "", sensitive: false })).status, 400);
  const id = t.json.team.id;
  assert.equal((await admin(w, "PATCH", `/${id}`, SUPER, { sensitive: true })).json.team.sensitive, true);
  assert.equal((await admin(w, "PATCH", `/${id}`, SUPER, { active: false })).json.team.active, false);
  assert.equal((await admin(w, "PATCH", `/${id}`, SUPER, {})).status, 400, "không có trường nào để sửa");
  assert.equal((await admin(w, "PATCH", `/${crypto.randomUUID()}`, SUPER, { active: false })).status, 404);
  const nhatKy = w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'feedback_team_%' ORDER BY rowid");
  assert.deepEqual(nhatKy.map((r: any) => r.action), ["feedback_team_created", "feedback_team_updated", "feedback_team_updated"]);
  assert.ok(nhatKy.every((r: any) => !String(r.detail ?? "").includes("Hỏi đáp bán hàng") && !String(r.detail ?? "").includes("Bán hàng")), "tên, mô tả nhóm không vào nhật ký");
  // Nhóm đã ngưng không nhận phiếu mới.
  assert.equal((await tao(w, SALES, id)).status, 400);
});

test("thành viên: thêm, đổi vai, gỡ (kết thúc hiệu lực); người không tồn tại hoặc đã khoá ⇒ 400; gỡ rồi mất quyền ngay", async () => {
  const w = setup();
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, SUPER, { role: "MEMBER" })).status, 200);
  assert.deepEqual((await w.call("GET", "/api/feedback/teams", { as: SALES })).json.mine, [{ teamId: KY_THUAT, role: "MEMBER" }]);
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, SUPER, { role: "LEAD" })).status, 200);
  assert.equal(w.q(`SELECT role FROM fbk_team_member WHERE team_id='${KY_THUAT}' AND staff_id='${SALES}' AND valid_to_at IS NULL`)[0].role, "LEAD");
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, SUPER, { role: "BOSS" })).status, 400);
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/khong-co`, SUPER, { role: "MEMBER" })).status, 400);
  assert.equal((await admin(w, "PUT", `/khong-co/members/${SALES}`, SUPER, { role: "MEMBER" })).status, 404);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${QT}'`);
  const khoa = await admin(w, "PUT", `/${KY_THUAT}/members/${QT}`, SUPER, { role: "MEMBER" });
  assert.equal(khoa.status, 400, khoa.text);
  assert.equal(khoa.json.error.message, "Tài khoản không tồn tại hoặc đã khoá.");
  assert.equal((await admin(w, "DELETE", `/${KY_THUAT}/members/${SALES}`, SUPER)).status, 200);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_team_member WHERE team_id='${KY_THUAT}' AND staff_id='${SALES}' AND valid_to_at IS NULL`)[0].n, 0);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_team_member WHERE team_id='${KY_THUAT}' AND staff_id='${SALES}'`)[0].n, 2, "dòng cũ giữ lại làm lịch sử");
  assert.deepEqual((await w.call("GET", "/api/feedback/teams", { as: SALES })).json.mine, [], "gỡ rồi mất tư cách ngay");
  assert.equal((await admin(w, "DELETE", `/${KY_THUAT}/members/${SALES}`, SUPER)).status, 404, "gỡ người không còn là thành viên ⇒ 404");
  const nhatKy = w.q("SELECT action, detail FROM audit_log WHERE action = 'feedback_team_member_changed' ORDER BY rowid");
  assert.equal(nhatKy.length, 3, "thêm, đổi vai, gỡ — mỗi lần một dòng; lần lỗi không ghi");
  assert.ok(nhatKy.every((r: any) => !String(r.detail ?? "").includes("NV ")), "không ghi tên người");
});

test("R6: tài khoản bên ngoài (PARTNER, tài xế đối tác, tài khoản lai) không thể làm thành viên nhóm ⇒ 400", async () => {
  const w = setup();
  for (const as of [PARTNER, TXDT, LAI]) {
    const r = await admin(w, "PUT", `/${KY_THUAT}/members/${as}`, SUPER, { role: "MEMBER" });
    assert.equal(r.status, 400, `${as} ${r.text}`);
    assert.equal(r.json.error.message, "Tài khoản bên ngoài không thể làm thành viên nhóm hỗ trợ.");
  }
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_team_member WHERE staff_id IN ('${PARTNER}', '${TXDT}', '${LAI}')`)[0].n, 0);
});

test("không ngưng được nhóm Kỹ thuật (nhóm mặc định cho phiếu cũ và tài khoản bên ngoài) ⇒ 409; nhóm khác ngưng được", async () => {
  const w = setup();
  const r = await admin(w, "PATCH", `/${KY_THUAT}`, SUPER, { active: false });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "conflict");
  assert.equal(r.json.error.message, "Không thể ngưng nhóm Kỹ thuật: đây là nhóm mặc định cho phiếu cũ và tài khoản bên ngoài.");
  assert.equal(w.q(`SELECT active FROM fbk_team WHERE id = '${KY_THUAT}'`)[0].active, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_team_updated'")[0].n, 0, "lần bị chặn không ghi nhật ký");
  assert.equal((await admin(w, "PATCH", `/${KY_THUAT}`, SUPER, { sensitive: true })).status, 200, "sửa trường khác của Kỹ thuật vẫn được");
  assert.equal((await admin(w, "PATCH", `/${KY_THUAT}`, SUPER, { active: true })).status, 200);
  assert.equal((await admin(w, "PATCH", `/${NHAN_SU}`, SUPER, { active: false })).json.team.active, false);
});

// ---- Việc 5a: phiếu xem được theo quyenPhieu; ghi chú nội bộ theo nhóm ---------------------------------------------
const d = (w: any, id: string, as: string) => w.call("GET", `/api/feedback/${id}`, { as });
const traLoi = (w: any, id: string, as: string, body: string, internal = false) => w.call("POST", `/api/feedback/${id}/messages`, { as, body: { body, internal } });

test("thành viên nhóm nhận đọc được phiếu và ghi chú nội bộ của nhóm; người ngoài nhóm 404; người gửi không thấy ghi chú nội bộ", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_TV, "Ghi chú nội bộ kế toán", true)).status, 201);
  const tv = await d(w, id, KT_TV);
  assert.equal(tv.status, 200, tv.text);
  assert.ok(tv.json.messages.some((m: any) => m.internal), "thành viên thấy ghi chú nội bộ");
  assert.equal(tv.json.perms.xuLy, true);
  const gui = await d(w, id, SALES);
  assert.equal(gui.status, 200);
  assert.ok(gui.json.messages.every((m: any) => !m.internal), "người gửi KHÔNG thấy ghi chú nội bộ");
  assert.equal(gui.json.perms.xuLy, false);
  for (const as of [NS_TV, QT, PARTNER]) assert.equal((await d(w, id, as)).status, 404, as);
  assert.equal((await d(w, id, SUPER)).status, 200);
});

test("người gửi tự là thành viên nhóm nhận: không ghi được ghi chú nội bộ trên phiếu của mình (403) và không thấy ghi chú", async () => {
  const w = setup();
  const id = (await tao(w, KT_GUI, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_GUI, "tự ghi", true)).status, 403);
  assert.equal((await traLoi(w, id, KT_TV, "nhóm ghi", true)).status, 201);
  assert.ok((await d(w, id, KT_GUI)).json.messages.every((m: any) => !m.internal));
});

test("thành viên bị khoá tài khoản hoặc bị gỡ khỏi nhóm: mất quyền đọc ngay", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await d(w, id, KT_TV)).status, 200);
  await admin(w, "DELETE", `/${KE_TOAN}/members/${KT_TV}`, SUPER);
  assert.equal((await d(w, id, KT_TV)).status, 404);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TN}'`);
  assert.equal((await d(w, id, KT_TN)).status, 401, "tài khoản khoá không còn phiên hợp lệ");
});

test("ghi chú nội bộ theo nhóm: chuyển phiếu sang nhóm khác thì nhóm mới không đọc ghi chú của nhóm cũ; Toàn quyền đọc tất cả", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_TV, "ghi chú kế toán", true)).status, 201);
  // Mô phỏng phiếu đã chuyển sang Nhân sự (route chuyển nhóm làm ở 5b).
  w.sqlite.exec(`UPDATE fbk_ticket SET team_id = '${NHAN_SU}' WHERE id = '${id}'`);
  const ns = await d(w, id, NS_TV);
  assert.equal(ns.status, 200, ns.text);
  assert.ok(ns.json.messages.every((m: any) => !m.internal), "nhóm mới không thấy ghi chú nhóm cũ");
  assert.equal((await traLoi(w, id, NS_TV, "ghi chú nhân sự", true)).status, 201);
  const ns2 = await d(w, id, NS_TV);
  assert.deepEqual(ns2.json.messages.filter((m: any) => m.internal).map((m: any) => m.body), ["ghi chú nhân sự"]);
  assert.equal((await d(w, id, KT_TV)).status, 404, "nhóm cũ mất quyền ngay");
  const sp = await d(w, id, SUPER);
  assert.deepEqual(sp.json.messages.filter((m: any) => m.internal).map((m: any) => m.body), ["ghi chú kế toán", "ghi chú nhân sự"]);
  assert.equal(sp.json.perms.xuLy, true);
  assert.equal(sp.json.perms.chuyenNhom, true);
});

test("perms: Trưởng nhóm giao việc và chuyển nhóm được; thành viên thường không; canTriage = perms.xuLy", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const tn = (await d(w, id, KT_TN)).json;
  assert.deepEqual(tn.perms, { xuLy: true, giaoViec: true, chuyenNhom: true });
  assert.equal(tn.canTriage, true);
  const tv = (await d(w, id, KT_TV)).json;
  assert.deepEqual(tv.perms, { xuLy: true, giaoViec: false, chuyenNhom: false });
  assert.deepEqual((await d(w, id, SALES)).json.perms, { xuLy: false, giaoViec: false, chuyenNhom: false });
});

test("R6b: tài khoản bên ngoài có dòng thành viên cũ (chèn thẳng SQL): /teams trả mine rỗng và không đọc được phiếu nhóm", async () => {
  const w = setup();
  w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-cu-partner', '${KE_TOAN}', '${PARTNER}', 'LEAD', '${NOW}', '${NOW}', '${NOW}')`);
  const g = await w.call("GET", "/api/feedback/teams", { as: PARTNER });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json.mine, []);
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await d(w, id, PARTNER)).status, 404);
  assert.equal((await traLoi(w, id, PARTNER, "chen", true)).status, 404);
});

// ---- Việc 5b: hàng đợi nhóm, chưa đọc riêng từng người, thống kê và huy hiệu theo nhóm -----------------------------
const nhan = (w: any, id: string, as: string) => w.call("POST", `/api/feedback/${id}/claim`, { as });
const xuLy = (w: any, id: string, as: string, body: unknown) => w.call("PATCH", `/api/feedback/${id}/xu-ly`, { as, body });
const hang = (w: any, as: string, q = "") => w.call("GET", `/api/feedback/queue?team=${KE_TOAN}${q}`, { as });
const huy = async (w: any, as: string) => (await w.call("GET", "/api/feedback/badge", { as })).json.queue;

test("hàng đợi nhóm: thành viên và Toàn quyền xem được; người ngoài nhóm, Quản trị, Nhân sự, bên ngoài ⇒ 403; thiếu team ⇒ 400", async () => {
  const w = setup();
  await tao(w, SALES, KE_TOAN);
  for (const as of [KT_TV, KT_TN, SUPER]) assert.equal((await hang(w, as)).json.tickets.length, 1, as);
  for (const as of [NS_TV, QT, SALES, PARTNER]) assert.equal((await hang(w, as)).status, 403, as);
  assert.equal((await w.call("GET", "/api/feedback/queue", { as: SUPER })).status, 400);
  assert.equal((await hang(w, SUPER, "&loc=KHAC")).status, 400);
  assert.equal((await hang(w, SUPER, "&status=KHAC")).status, 400);
  assert.equal((await w.call("GET", "/api/feedback/queue?team=khong-co", { as: SUPER })).status, 404);
});

test("hàng đợi không chứa phiếu do chính người xem gửi (trừ khi là phiếu của người khác); lọc MINE / UNASSIGNED", async () => {
  const w = setup();
  const a = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await tao(w, KT_GUI, KE_TOAN);
  assert.equal((await hang(w, KT_GUI)).json.tickets.length, 1, "phiếu tự gửi nằm ở 'của tôi', không ở hàng đợi");
  assert.equal((await nhan(w, a, KT_TV)).status, 200, "nhận việc qua route claim — đường thật");
  assert.equal((await hang(w, KT_TV, "&loc=MINE")).json.tickets.length, 1);
  assert.equal((await hang(w, KT_TN, "&loc=MINE")).json.tickets.length, 0);
  assert.equal((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.length, 1);
  // Người giữ phiếu bị khoá tài khoản ⇒ phiếu coi như chưa ai nhận.
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TV}'`);
  assert.equal((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.length, 2);
  assert.equal((await hang(w, KT_TN, "&status=NEW")).json.tickets.length, 1, "nhận việc đưa phiếu Mới sang Đã tiếp nhận");
  assert.equal((await hang(w, KT_TN, "&status=ACK")).json.tickets.length, 1);
  assert.equal((await hang(w, KT_TN, "&status=DONE")).json.tickets.length, 0);
});

test("chưa đọc tính RIÊNG từng người: một người mở không làm người kia hết chấm đỏ", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TV })).json.queue, 1);
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TN })).json.queue, 1);
  await d(w, id, KT_TV); // KT_TV mở phiếu
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TV })).json.queue, 0);
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TN })).json.queue, 1, "người kia vẫn còn chấm đỏ");
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: NS_TV })).json.queue, 0, "nhóm khác không đếm phiếu nhóm này");
  // Cờ unread trên hàng đợi cũng riêng từng người.
  assert.equal((await hang(w, KT_TV)).json.tickets[0].unread, false);
  assert.equal((await hang(w, KT_TN)).json.tickets[0].unread, true);
  // Có hoạt động mới (người gửi trả lời) ⇒ chấm đỏ quay lại với người đã mở. Lùi mốc đã xem để hai lần ghi không trùng mili giây.
  w.sqlite.exec(`UPDATE fbk_ticket_read SET seen_at = '2000-01-01T00:00:00.000Z' WHERE ticket_id = '${id}'`);
  assert.equal((await traLoi(w, id, SALES, "Bổ sung.")).status, 201);
  assert.equal(await huy(w, KT_TV), 1);
  // Toàn quyền đếm mọi nhóm; người gửi không đếm phiếu của mình ở "queue".
  assert.equal(await huy(w, SUPER), 1);
  assert.equal(await huy(w, SALES), 0);
});

test("người làm tự ghi mốc đã xem trong cùng lô: trả lời / đổi trạng thái không làm chính mình có chấm đỏ, người khác vẫn có", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_TV, "Đã nhận, đang xem.")).status, 201);
  assert.equal(await huy(w, KT_TV), 0, "người trả lời đã xem");
  assert.equal(await huy(w, KT_TN), 1);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_read WHERE ticket_id = '${id}' AND staff_id = '${KT_TV}'`)[0].n, 1);
  w.sqlite.exec(`UPDATE fbk_ticket_read SET seen_at = '2000-01-01T00:00:00.000Z' WHERE ticket_id = '${id}'`); // tránh trùng mili giây
  const r = await w.call("PATCH", `/api/feedback/${id}`, { as: SUPER, body: { status: "ACK" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(await huy(w, SUPER), 0, "Toàn quyền đổi trạng thái ⇒ đã xem");
  assert.equal(await huy(w, KT_TV), 1, "đổi trạng thái là hoạt động mới với người khác");
  // Upsert: mở lại phiếu chỉ cập nhật một dòng, updated_at = seen_at.
  await d(w, id, KT_TV);
  const row = w.q(`SELECT seen_at, updated_at FROM fbk_ticket_read WHERE ticket_id = '${id}' AND staff_id = '${KT_TV}'`);
  assert.equal(row.length, 1);
  assert.equal(row[0].updated_at, row[0].seen_at);
  // Người gửi mở: ghi mốc người gửi (hết chấm "mine").
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: SALES })).json.mine, 1);
  await d(w, id, SALES);
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: SALES })).json.mine, 0);
});

test("thống kê tuần của hàng đợi chỉ đếm phiếu của nhóm đó", async () => {
  const w = setup();
  await tao(w, SALES, KE_TOAN);
  await tao(w, SALES, NHAN_SU, { clientRequestId: crypto.randomUUID() });
  const n = (await hang(w, KT_TV)).json.stats.reduce((s: number, r: any) => s + r.count, 0);
  assert.equal(n, 1);
});

test("R6b: tài khoản bên ngoài có dòng thành viên chèn thẳng SQL: /queue ⇒ 403, huy hiệu queue = 0", async () => {
  const w = setup();
  w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-cu-partner', '${KE_TOAN}', '${PARTNER}', 'LEAD', '${NOW}', '${NOW}', '${NOW}')`);
  await tao(w, SALES, KE_TOAN);
  assert.equal((await hang(w, PARTNER)).status, 403);
  assert.equal(await huy(w, PARTNER), 0);
});

test("huy hiệu không đếm phiếu do chính thành viên gửi vào nhóm mình (chỉ đếm phiếu của người khác)", async () => {
  const w = setup();
  await tao(w, KT_GUI, KE_TOAN);
  assert.equal(await huy(w, KT_GUI), 0, "phiếu tự gửi không vào huy hiệu hàng đợi");
  assert.equal(await huy(w, KT_TV), 1, "thành viên khác vẫn đếm phiếu đó");
  await tao(w, SALES, KE_TOAN);
  assert.equal(await huy(w, KT_GUI), 1, "phiếu của người khác thì đếm");
  assert.equal(await huy(w, KT_TV), 2);
});

// ---- Việc 5c: nhận việc, giao việc, đổi trạng thái theo nhóm --------------------------------------------------------
test("nhận việc: thành viên nhận được, phiếu Mới ⇒ Đã tiếp nhận; người ngoài nhóm và người gửi ⇒ 404/403", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await nhan(w, id, NS_TV)).status, 404);
  assert.equal((await nhan(w, id, SALES)).status, 403, "người gửi đọc được nhưng không xử lý");
  const r = await nhan(w, id, KT_TV);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, KT_TV);
  assert.equal(r.json.ticket.status, "ACK");
  assert.equal(r.json.ticket.assigneeActive, true);
  // Sự kiện và nhật ký: đúng một dòng mỗi thứ; nhật ký chỉ mã phiếu.
  const ev = w.q(`SELECT type, from_value, to_value, actor_id FROM fbk_ticket_event WHERE ticket_id = '${id}'`).map((e: any) => ({ ...e }));
  assert.deepEqual(ev, [{ type: "CLAIMED", from_value: null, to_value: KT_TV, actor_id: KT_TV }]);
  const nk = w.q(`SELECT detail FROM audit_log WHERE action = 'feedback_claimed' AND target_id = '${id}'`);
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /^YC-\d+$/);
  assert.equal(await huy(w, KT_TV), 0, "người nhận việc coi như đã xem");
  // Đã có người giữ (còn hoạt động) ⇒ 409, không ghi thêm gì.
  const lai = await nhan(w, id, KT_TN);
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "taken");
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}'`)[0].n, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_claimed'")[0].n, 1);
});

test("người gửi tự là thành viên nhóm nhận: không nhận việc được phiếu của mình (403)", async () => {
  const w = setup();
  const id = (await tao(w, KT_GUI, KE_TOAN)).json.ticket.id;
  assert.equal((await nhan(w, id, KT_GUI)).status, 403);
  assert.equal((await xuLy(w, id, KT_GUI, { status: "ACK" })).status, 403);
});

test("hai người nhận việc cùng lúc: đúng một người thắng, người kia 409", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const [a, b] = await Promise.all([nhan(w, id, KT_TV), nhan(w, id, KT_TN)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409], `${a.text} | ${b.text}`);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}' AND type = 'CLAIMED'`)[0].n, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_claimed'")[0].n, 1);
});

test("phiếu do người đã khoá giữ: coi như chưa ai nhận, người khác nhận được", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TV}'`);
  assert.equal((await d(w, id, KT_TN)).json.ticket.assigneeActive, false, "giao diện coi như chưa ai nhận");
  const r = await nhan(w, id, KT_TN);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, KT_TN);
  assert.equal(r.json.ticket.status, "ACK", "đã ở Đã tiếp nhận thì giữ nguyên");
  const ev = w.q(`SELECT from_value, to_value FROM fbk_ticket_event WHERE ticket_id = '${id}' ORDER BY at, rowid`);
  assert.deepEqual(ev.map((e: any) => [e.from_value, e.to_value]), [[null, KT_TV], [KT_TV, KT_TN]]);
});

test("nhận việc phiếu đã đóng ⇒ 409", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  w.sqlite.exec(`UPDATE fbk_ticket SET status_code = 'DONE' WHERE id = '${id}'`);
  assert.equal((await nhan(w, id, KT_TV)).status, 409);
});

test("giao việc cho người khác: chỉ Trưởng nhóm/Toàn quyền, người nhận phải là thành viên nhóm", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await xuLy(w, id, KT_TV, { assigneeId: KT_TN })).status, 403, "thành viên thường không giao người khác");
  assert.equal((await xuLy(w, id, KT_TN, { assigneeId: NS_TV })).status, 400, "người nhận không thuộc nhóm");
  const ok = await xuLy(w, id, KT_TN, { assigneeId: KT_TV });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.ticket.assigneeId, KT_TV);
  const ev = w.q(`SELECT type, from_value, to_value, actor_id FROM fbk_ticket_event WHERE ticket_id = '${id}'`).map((e: any) => ({ ...e }));
  assert.deepEqual(ev, [{ type: "ASSIGNED", from_value: null, to_value: KT_TV, actor_id: KT_TN }]);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_assigned'")[0].n, 1);
});

test("giao việc: không giao cho người đã khoá, cho người gửi phiếu, hay thành viên thường giành phiếu người khác đang giữ", async () => {
  const w = setup();
  const id = (await tao(w, KT_GUI, KE_TOAN)).json.ticket.id;
  assert.equal((await xuLy(w, id, KT_TN, { assigneeId: KT_GUI })).status, 400, "người gửi không xử lý phiếu của chính mình");
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TV}'`);
  assert.equal((await xuLy(w, id, KT_TN, { assigneeId: KT_TV })).status, 400, "người đã khoá");
  w.sqlite.exec(`UPDATE staff SET active = 1 WHERE id = '${KT_TV}'`);
  assert.equal((await nhan(w, id, KT_TN)).status, 200);
  assert.equal((await xuLy(w, id, KT_TV, { assigneeId: KT_TV })).status, 403, "thành viên thường không tự gán đè lên người đang giữ");
  assert.equal((await xuLy(w, id, KT_TV, { assigneeId: null })).status, 403, "thành viên thường không gỡ người giữ");
  // Toàn quyền qua tuyến cũ cũng chỉ giao được cho thành viên nhóm giữ phiếu (câu PATCH_TICKET dùng chung).
  assert.equal((await w.call("PATCH", `/api/feedback/${id}`, { as: SUPER, body: { assigneeId: NS_TV } })).status, 400);
  assert.equal((await w.call("PATCH", `/api/feedback/${id}`, { as: SUPER, body: { assigneeId: KT_TV } })).status, 200);
  assert.equal(w.q(`SELECT assignee_id FROM fbk_ticket WHERE id = '${id}'`)[0].assignee_id, KT_TV);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}'`)[0].n, 1, "tuyến cũ không ghi sự kiện (giữ nguyên)");
});

test("đổi trạng thái theo bảng luật hiện có; thành viên nhóm khác 404; người gửi 403", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await xuLy(w, id, KT_TV, { status: "DONE" })).status, 409, "Mới ⇒ Xong không hợp lệ");
  assert.equal((await xuLy(w, id, KT_TV, { status: "ACK" })).status, 200);
  assert.equal((await xuLy(w, id, NS_TV, { status: "ACK" })).status, 404);
  assert.equal((await xuLy(w, id, SALES, { status: "IN_PROGRESS" })).status, 403);
  assert.equal((await xuLy(w, id, KT_TV, {})).status, 400, "không có gì để đổi");
  const r = await xuLy(w, id, KT_TV, { status: "IN_PROGRESS" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.status, "IN_PROGRESS");
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'feedback_status_changed' ORDER BY rowid").map((x: any) => x.detail.replace(/^YC-\d+: /, "")), ["NEW → ACK", "ACK → IN_PROGRESS"]);
  assert.equal(await huy(w, KT_TV), 0, "người đổi trạng thái coi như đã xem");
  assert.equal((await xuLy(w, id, SUPER, { status: "DONE", resolvedIn: "20261015" })).status, 200, "Toàn quyền dùng tuyến mới được");
});

// ---- R10 (ruling điều phối): người giữ hợp lệ = tài khoản còn hoạt động VÀ còn là thành viên nhóm giữ phiếu, hoặc đang giữ Toàn quyền ---------------
test("R10: người giữ bị gỡ khỏi nhóm (tài khoản còn hoạt động) ⇒ coi như chưa ai nhận, hiện ở lọc UNASSIGNED, người khác nhận được", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await nhan(w, id, KT_TV)).status, 200);
  assert.equal((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.length, 0, "đang có người giữ hợp lệ");
  assert.equal((await admin(w, "DELETE", `/${KE_TOAN}/members/${KT_TV}`, SUPER)).status, 200);
  assert.equal((await d(w, id, KT_TN)).json.ticket.assigneeActive, false, "người giữ không còn trong nhóm ⇒ chưa ai nhận");
  assert.deepEqual((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.map((t: any) => t.id), [id]);
  const r = await nhan(w, id, KT_GUI);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, KT_GUI);
  assert.equal(r.json.ticket.assigneeActive, true);
});

test("R10: Toàn quyền nhận việc/đổi trạng thái dù không là thành viên; phiếu vẫn «đã có người nhận», thành viên khác nhận ⇒ 409", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const r = await nhan(w, id, SUPER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, SUPER);
  assert.equal(r.json.ticket.assigneeActive, true, "Toàn quyền giữ phiếu là người giữ hợp lệ");
  assert.equal((await d(w, id, KT_TN)).json.ticket.assigneeActive, true);
  assert.equal((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.length, 0);
  const b = await nhan(w, id, KT_TV);
  assert.equal(b.status, 409, b.text);
  assert.equal(w.q(`SELECT assignee_id FROM fbk_ticket WHERE id = '${id}'`)[0].assignee_id, SUPER);
  assert.equal((await xuLy(w, id, SUPER, { status: "IN_PROGRESS" })).status, 200);
});

// ---- R11 (ruling điều phối): đóng kẽ hở thời điểm với chuyển nhóm — phiếu đổi nhóm giữa lúc route kiểm quyền và lúc chạy lô --------------------------
/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng người khác vừa ghi giữa lúc route đọc và lúc ghi — mẫu orders/thuong-mai-route.test.ts). */
function chenTruocLo(w: any, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}
const doiNhomThang = (w: any, id: string, team: string) => () => w.sqlite.exec(`UPDATE fbk_ticket SET team_id = '${team}' WHERE id = '${id}'`);

test("R11a: nhận việc đúng lúc phiếu vừa chuyển sang nhóm khác ⇒ 409, không gán người, không sự kiện, không nhật ký", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  chenTruocLo(w, /UPDATE fbk_ticket SET\s+assignee_id = \?2/, doiNhomThang(w, id, NHAN_SU));
  const r = await nhan(w, id, KT_TV);
  assert.equal(r.status, 409, r.text);
  assert.equal(w.q(`SELECT assignee_id FROM fbk_ticket WHERE id = '${id}'`)[0].assignee_id, null);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}'`)[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_claimed'")[0].n, 0);
});

test("R11b: ghi chú nội bộ đúng lúc phiếu vừa chuyển nhóm ⇒ 409 stale, không chèn tin mang nhãn nhóm mới; chạm trần tin nhắn vẫn 429", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  chenTruocLo(w, /INSERT INTO fbk_message/, doiNhomThang(w, id, NHAN_SU));
  const r = await traLoi(w, id, KT_TV, "Bí mật của Kế toán", true);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(r.json.error.message, "Phiếu vừa đổi nhóm, hãy tải lại.");
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_message WHERE ticket_id = '${id}' AND internal = 1`)[0].n, 0, "không có ghi chú nào mang nhãn Nhân sự");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_replied'")[0].n, 0);
  // Trần tin nhắn (không đổi nhóm) vẫn là 429 — phân biệt bằng đọc lại phiếu.
  const id2 = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const at = new Date().toISOString();
  for (let i = 0; i < 30; i++) {
    w.sqlite.exec(`INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, updated_at, team_id) VALUES ('tran-${i}', '${id2}', '${KT_TV}', 'x', 1, '${at}', '${at}', '${KE_TOAN}')`);
  }
  assert.equal((await traLoi(w, id2, KT_TV, "quá trần", true)).status, 429);
});

// ---- Việc 5d: chuyển nhóm ------------------------------------------------------------------------------------------
const chuyen = (w: any, id: string, as: string, teamId: string, reason = "Nhầm nhóm") => w.call("POST", `/api/feedback/${id}/transfer`, { as, body: { teamId, reason } });

test("chuyển nhóm: Trưởng nhóm/Toàn quyền được; thành viên thường 403; người ngoài 404; lý do bắt buộc; nhóm đích phải đang dùng", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await chuyen(w, id, KT_TV, NHAN_SU)).status, 403);
  assert.equal((await chuyen(w, id, NS_TV, NHAN_SU)).status, 404);
  assert.equal((await chuyen(w, id, KT_TN, NHAN_SU, "")).status, 400);
  assert.equal((await chuyen(w, id, KT_TN, NHAN_SU, "   ")).status, 400, "lý do chỉ có khoảng trắng");
  assert.equal((await chuyen(w, id, KT_TN, NHAN_SU, "x".repeat(301))).status, 400, "lý do quá 300 ký tự");
  assert.equal((await chuyen(w, id, KT_TN, "khong-co")).status, 400);
  w.sqlite.exec(`UPDATE fbk_team SET active = 0 WHERE id = 'fbk-team-dieu-hanh'`);
  assert.equal((await chuyen(w, id, KT_TN, "fbk-team-dieu-hanh")).status, 400, "nhóm đã ngưng");
  assert.equal(w.q(`SELECT team_id FROM fbk_ticket WHERE id = '${id}'`)[0].team_id, KE_TOAN, "các lần hỏng không đổi gì");
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket_event")[0].n, 0);
  const r = await chuyen(w, id, KT_TN, NHAN_SU);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.teamId, NHAN_SU);
  assert.deepEqual(r.json.perms, { xuLy: false, giaoViec: false, chuyenNhom: false }, "Trưởng nhóm cũ không còn quyền trên phiếu");
  assert.ok(r.json.messages.every((m: any) => !m.internal), "phản hồi cho Trưởng nhóm cũ không kèm ghi chú nội bộ của nhóm mới");
  // Nhật ký: đúng một dòng, chỉ mã phiếu.
  const nk = w.q(`SELECT detail FROM audit_log WHERE action = 'feedback_team_changed' AND target_id = '${id}'`);
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /^YC-\d+$/);
  // Toàn quyền chuyển tiếp được.
  const s = await chuyen(w, id, SUPER, KY_THUAT, "Thật ra là lỗi kỹ thuật");
  assert.equal(s.status, 200, s.text);
  assert.equal(s.json.ticket.teamId, KY_THUAT);
  assert.equal(s.json.perms.chuyenNhom, true);
});

test("sau chuyển nhóm: bỏ người xử lý, Đang xử lý ⇒ Đã tiếp nhận; Trưởng nhóm cũ mất quyền; nhóm mới không đọc ghi chú nội bộ của nhóm cũ", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  await xuLy(w, id, KT_TV, { status: "IN_PROGRESS" });
  await traLoi(w, id, KT_TV, "Bí mật của Kế toán", true);
  const r = await chuyen(w, id, KT_TN, NHAN_SU, "Việc của Nhân sự");
  assert.equal(r.json.ticket.assigneeId, null);
  assert.equal(r.json.ticket.status, "ACK");
  assert.equal((await d(w, id, KT_TN)).status, 404, "Trưởng nhóm cũ mất quyền ngay");
  const moi = await d(w, id, NS_TV);
  assert.equal(moi.status, 200);
  const noiBo = moi.json.messages.filter((m: any) => m.internal).map((m: any) => m.body);
  assert.ok(!noiBo.some((b: string) => b.includes("Bí mật của Kế toán")), "ghi chú nhóm cũ không lộ cho nhóm mới");
  assert.ok(noiBo.some((b: string) => b.includes("Việc của Nhân sự")), "lý do chuyển là ghi chú nội bộ của nhóm MỚI");
  assert.ok((await d(w, id, SUPER)).json.messages.some((m: any) => m.body.includes("Bí mật của Kế toán")), "Toàn quyền đọc tất cả");
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id='${id}' AND type='TEAM_CHANGED'`)[0].n, 1);
  const ev = w.q(`SELECT from_value, to_value, actor_id FROM fbk_ticket_event WHERE ticket_id='${id}' AND type='TEAM_CHANGED'`)[0];
  assert.deepEqual([ev.from_value, ev.to_value, ev.actor_id], [KE_TOAN, NHAN_SU, KT_TN]);
  assert.ok(!(await d(w, id, SALES)).json.messages.some((m: any) => m.body.includes("Việc của Nhân sự")), "người gửi không thấy lý do chuyển (ghi chú nội bộ)");
});

test("chuyển sang chính nhóm đang giữ hoặc chuyển lúc phiếu đã đổi nhóm ⇒ 409", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await chuyen(w, id, KT_TN, KE_TOAN)).status, 409);
  // Phiếu vừa được người khác chuyển sang Kỹ thuật đúng lúc Trưởng nhóm Kế toán bấm chuyển sang Nhân sự.
  chenTruocLo(w, /UPDATE fbk_ticket SET team_id = \?2/, doiNhomThang(w, id, KY_THUAT));
  const r = await chuyen(w, id, KT_TN, NHAN_SU);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(w.q(`SELECT team_id FROM fbk_ticket WHERE id = '${id}'`)[0].team_id, KY_THUAT);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket_event")[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_message WHERE internal = 1")[0].n, 0, "không chèn ghi chú lý do khi lô thua cổng");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_team_changed'")[0].n, 0);
});

test("phiếu nhóm nhạy cảm: Quản trị và Nhân sự (không thuộc nhóm) không có đường tắt ở /claim, /xu-ly, /transfer", async () => {
  const w = setup();
  const kt = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const ns = (await tao(w, SALES, NHAN_SU)).json.ticket.id;
  // NS_TV là thành viên Nhân sự nên chỉ thử trên phiếu Kế toán; Quản trị thử cả hai.
  const ca: [string, string][] = [[QT, kt], [QT, ns], [NS_TV, kt]];
  for (const [as, id] of ca) {
    assert.equal((await nhan(w, id, as)).status, 404, `${as} claim`);
    assert.equal((await xuLy(w, id, as, { status: "ACK" })).status, 404, `${as} xu-ly`);
    assert.equal((await chuyen(w, id, as, KY_THUAT)).status, 404, `${as} transfer`);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket WHERE status_code <> 'NEW' OR assignee_id IS NOT NULL")[0].n, 0);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket WHERE team_id = '${KY_THUAT}'`)[0].n, 0);
  // Thành viên thường của nhóm nhạy cảm: thấy được nhưng không chuyển được (403).
  assert.equal((await chuyen(w, ns, NS_TV, KY_THUAT)).status, 403);
});

// ---- Vòng sửa 1 (người kiểm 5d) ---------------------------------------------------------------------------------------
test("PATCH_TICKET theo nhóm: đổi trạng thái / giao việc đúng lúc phiếu vừa chuyển nhóm ⇒ 409 stale (cả /xu-ly lẫn tuyến cũ), không sự kiện, không nhật ký", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const PATCH_RE = /assignee_id = CASE WHEN \?3 = 1/;
  const kiemKhongGhi = (nhan: string) => {
    assert.equal(w.q(`SELECT status_code FROM fbk_ticket WHERE id = '${id}'`)[0].status_code, "NEW", nhan);
    assert.equal(w.q(`SELECT assignee_id FROM fbk_ticket WHERE id = '${id}'`)[0].assignee_id, null, nhan);
    assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}'`)[0].n, 0, nhan);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action IN ('feedback_status_changed', 'feedback_assigned')")[0].n, 0, nhan);
  };
  // /xu-ly: thành viên đổi trạng thái.
  chenTruocLo(w, PATCH_RE, doiNhomThang(w, id, NHAN_SU));
  let r = await xuLy(w, id, KT_TV, { status: "ACK" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(r.json.error.message, "Phiếu vừa đổi nhóm, hãy tải lại.");
  kiemKhongGhi("xu-ly trạng thái");
  // /xu-ly: Trưởng nhóm giao việc (người nhận thuộc nhóm MỚI — không được gán chéo).
  w.sqlite.exec(`UPDATE fbk_ticket SET team_id = '${KE_TOAN}' WHERE id = '${id}'`);
  chenTruocLo(w, PATCH_RE, () => { w.sqlite.exec(`UPDATE fbk_ticket SET team_id = '${NHAN_SU}' WHERE id = '${id}'`); });
  w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-ns-kttv', '${NHAN_SU}', '${KT_TV}', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`);
  r = await xuLy(w, id, KT_TN, { assigneeId: KT_TV });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Phiếu vừa đổi nhóm, hãy tải lại.");
  kiemKhongGhi("xu-ly giao việc");
  // Tuyến cũ (Toàn quyền).
  w.sqlite.exec(`UPDATE fbk_ticket SET team_id = '${KE_TOAN}' WHERE id = '${id}'`);
  chenTruocLo(w, PATCH_RE, doiNhomThang(w, id, NHAN_SU));
  r = await w.call("PATCH", `/api/feedback/${id}`, { as: SUPER, body: { status: "ACK" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Phiếu vừa đổi nhóm, hãy tải lại.");
  kiemKhongGhi("tuyến cũ");
});

test("Toàn quyền nhận việc rồi bị khoá ⇒ assigneeActive false, hiện ở UNASSIGNED, thành viên nhận được", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await nhan(w, id, SUPER)).status, 200);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${SUPER}'`);
  assert.equal((await d(w, id, KT_TN)).json.ticket.assigneeActive, false);
  assert.deepEqual((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.map((t: any) => t.id), [id]);
  const r = await nhan(w, id, KT_TV);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, KT_TV);
});

test("R13: phiếu đã đóng (Đã xong/Từ chối) không chuyển nhóm ⇒ 409 conflict, kể cả khi phiếu vừa đóng giữa lúc kiểm và lúc ghi", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  for (const st of ["DONE", "DECLINED"]) {
    w.sqlite.exec(`UPDATE fbk_ticket SET status_code = '${st}' WHERE id = '${id}'`);
    const r = await chuyen(w, id, KT_TN, NHAN_SU);
    assert.equal(r.status, 409, `${st} ${r.text}`);
    assert.equal(r.json.error.code, "conflict");
    assert.equal(r.json.error.message, "Phiếu đã đóng, hãy mở lại trước khi chuyển nhóm.");
  }
  w.sqlite.exec(`UPDATE fbk_ticket SET status_code = 'ACK' WHERE id = '${id}'`);
  chenTruocLo(w, /UPDATE fbk_ticket SET team_id = \?2/, () => { w.sqlite.exec(`UPDATE fbk_ticket SET status_code = 'DONE' WHERE id = '${id}'`); });
  const r = await chuyen(w, id, KT_TN, NHAN_SU);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "conflict");
  assert.equal(w.q(`SELECT team_id FROM fbk_ticket WHERE id = '${id}'`)[0].team_id, KE_TOAN);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket_event")[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_team_changed'")[0].n, 0);
});

test("nhật ký tạo phiếu nhóm nhạy cảm KHÔNG ghi tiêu đề (phiếu vẫn tra được qua target_id)", async () => {
  const w = setup();
  const r = await tao(w, SALES, NHAN_SU, { title: "Xin giấy xác nhận lương" });
  const dong = w.q("SELECT detail, target_id FROM audit_log WHERE action = 'feedback_created'")[0];
  assert.ok(!String(dong.detail).includes("lương"));
  assert.equal(dong.detail, "phiếu nhóm nhạy cảm");
  assert.equal(dong.target_id, r.json.ticket.id);
  await tao(w, SALES, KY_THUAT, { title: "Lỗi nút lưu" });
  assert.ok(w.q("SELECT detail FROM audit_log WHERE action = 'feedback_created' ORDER BY rowid DESC")[0].detail.includes("Lỗi nút lưu"), "nhóm thường giữ hành vi cũ");
});

// Mức route: cờ `sensitive` phải được truyền ở CẢ HAI điểm gọi scheduleMail (created, user_replied). Mailer giả bắt thư thật sự gửi đi.
function thuGia() {
  const w = setup();
  w.sqlite.exec(`UPDATE pty_party SET display_name = 'Hoàng Quý Danh' WHERE id = 'pty-${SALES}'; UPDATE pty_person SET given_name = 'Hoàng Quý Danh' WHERE party_id = 'pty-${SALES}'`);
  const thu: { subject: string; html: string }[] = [];
  w.env.EMAIL = { send: async (m: { subject: string; html: string }) => void thu.push(m) };
  w.env.FEEDBACK_NOTIFY_EMAIL = "admin@example.com";
  w.env.FEEDBACK_MAIL_FROM = "hotro@example.com";
  return { w, thu };
}
const DAU_VET = ["Xin giấy xác nhận lương", "Nội dung riêng tư lương", "Hoàng Quý Danh", "Trả lời riêng tư lương"];

for (const [ten, nhom, nhay] of [["nhạy cảm (Nhân sự)", NHAN_SU, true], ["thường (Kỹ thuật)", KY_THUAT, false]] as const) {
  test(`thư email thật sự gửi đi, phiếu nhóm ${ten}: ${nhay ? "không lộ tiêu đề/người gửi/nội dung" : "giữ tiêu đề như cũ"}`, async () => {
    const { w, thu } = thuGia();
    const r = await tao(w, SALES, nhom, { title: DAU_VET[0], body: DAU_VET[1] });
    await w.choNen();
    assert.equal(thu.length, 1);
    const id = r.json.ticket.id;
    const traLoiRes = await traLoi(w, id, SALES, DAU_VET[3]);
    assert.equal(traLoiRes.status, 201);
    await w.choNen();
    assert.equal(thu.length, 2, "cả created và user_replied đều gửi thư");
    for (const m of thu) {
      const tatCa = `${m.subject}\n${m.html}`;
      assert.ok(m.subject.includes(nhay ? "Nhân sự" : "Kỹ thuật") && /YC-\d+/.test(m.subject));
      if (nhay) for (const d of DAU_VET) assert.ok(!tatCa.includes(d), `thư không được lộ «${d}»`);
      else assert.ok(m.subject.includes(DAU_VET[0]), "nhóm thường: tiêu đề còn trong thư");
    }
  });
}
