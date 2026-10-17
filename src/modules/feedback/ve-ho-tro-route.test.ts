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

test("huy hiệu hàng đợi không đếm phiếu đã đóng (Đã xong / Từ chối); người gửi trả lời mở lại thì đếm lại", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal(await huy(w, KT_TN), 1, "phiếu Mới: có chấm");
  assert.equal((await xuLy(w, id, KT_TV, { status: "ACK" })).status, 200);
  assert.equal((await xuLy(w, id, KT_TV, { status: "DONE" })).status, 200);
  assert.equal(await huy(w, KT_TN), 0, "phiếu đã xong: người chưa mở không còn bị đếm");
  assert.equal(await huy(w, SUPER), 0, "Toàn quyền cũng vậy");
  w.sqlite.exec(`UPDATE fbk_ticket_read SET seen_at = '2000-01-01T00:00:00.000Z' WHERE ticket_id = '${id}'`);
  assert.equal((await traLoi(w, id, SALES, "Vẫn chưa được.")).status, 201); // người gửi trả lời ⇒ mở lại thành Đã tiếp nhận
  assert.equal(await huy(w, KT_TN), 1, "phiếu mở lại: đếm lại");
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

// ---- Đợt 2a Việc 2 (ADR-0127 quyết định 2): mức ưu tiên ---------------------------------------------------------------------
const nkUuTien = (w: any) => w.q("SELECT staff_id, target_id, detail FROM audit_log WHERE action = 'feedback_priority_changed' ORDER BY rowid").map((x: any) => ({ ...x }));

test("mức ưu tiên: thành viên nhóm đặt Cao ⇒ 200, DTO mang priority, đúng một dòng nhật ký «mã: cũ → mới», không ghi nhầm feedback_assigned", async () => {
  const w = setup();
  const t = (await tao(w, SALES, KE_TOAN)).json.ticket;
  assert.equal(t.priority, "NORMAL", "phiếu mới luôn Thường");
  const r = await xuLy(w, t.id, KT_TV, { priority: "HIGH" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.priority, "HIGH");
  assert.equal(w.q(`SELECT priority FROM fbk_ticket WHERE id = '${t.id}'`)[0].priority, "HIGH");
  assert.deepEqual(nkUuTien(w), [{ staff_id: KT_TV, target_id: t.id, detail: `${t.code}: NORMAL → HIGH` }]);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action IN ('feedback_assigned', 'feedback_status_changed')")[0].n, 0);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${t.id}'`)[0].n, 0, "không thêm loại vào fbk_ticket_event");
  assert.equal(await huy(w, KT_TV), 0, "người đặt coi như đã xem (cùng lô)");
});

test("mức ưu tiên: người gửi ⇒ 403, người ngoài nhóm ⇒ 404, giá trị lạ ⇒ 400; không đổi gì, không nhật ký", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await xuLy(w, id, SALES, { priority: "URGENT" })).status, 403);
  assert.equal((await xuLy(w, id, NS_TV, { priority: "URGENT" })).status, 404);
  assert.equal((await xuLy(w, id, QT, { priority: "URGENT" })).status, 404, "Quản trị không có đường tắt");
  const lạ = await xuLy(w, id, KT_TV, { priority: "LOW" });
  assert.equal(lạ.status, 400, lạ.text);
  assert.equal(w.q(`SELECT priority FROM fbk_ticket WHERE id = '${id}'`)[0].priority, "NORMAL");
  assert.equal(nkUuTien(w).length, 0);
});

test("mức ưu tiên đi cùng đổi trạng thái: hai dòng nhật ký (trạng thái + ưu tiên), cùng một lô; đặt lại đúng mức cũ vẫn ghi (như giao việc)", async () => {
  const w = setup();
  const t = (await tao(w, SALES, KE_TOAN)).json.ticket;
  const r = await xuLy(w, t.id, KT_TV, { status: "ACK", priority: "URGENT" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.status, "ACK");
  assert.equal(r.json.ticket.priority, "URGENT");
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'feedback_status_changed'").map((x: any) => x.detail), [`${t.code}: NEW → ACK`]);
  assert.equal((await xuLy(w, t.id, KT_TV, { priority: "URGENT" })).status, 200);
  assert.deepEqual(nkUuTien(w).map((x: any) => x.detail), [`${t.code}: NORMAL → URGENT`, `${t.code}: URGENT → URGENT`]);
});

test("mức ưu tiên phiếu nhóm nhạy cảm: nhật ký chỉ mã phiếu + mức, không tiêu đề", async () => {
  const w = setup();
  const t = (await tao(w, SALES, NHAN_SU, { title: "Xin giấy xác nhận lương" })).json.ticket;
  assert.equal((await xuLy(w, t.id, NS_TV, { priority: "HIGH" })).status, 200);
  const [dong] = nkUuTien(w);
  assert.equal(dong.detail, `${t.code}: NORMAL → HIGH`);
  assert.ok(!String(dong.detail).includes("lương"));
});

test("mức ưu tiên đúng lúc phiếu vừa chuyển nhóm ⇒ 409 stale, không đổi, không nhật ký (khoá lạc quan theo nhóm như đợt 1)", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  chenTruocLo(w, /assignee_id = CASE WHEN \?3 = 1/, doiNhomThang(w, id, NHAN_SU));
  const r = await xuLy(w, id, KT_TV, { priority: "URGENT" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Phiếu vừa đổi nhóm, hãy tải lại.");
  assert.equal(w.q(`SELECT priority FROM fbk_ticket WHERE id = '${id}'`)[0].priority, "NORMAL");
  assert.equal(nkUuTien(w).length, 0);
});

test("tuyến cũ PATCH /api/feedback/:id (Toàn quyền): thân chỉ có priority ⇒ 200, ghi feedback_priority_changed, không ghi feedback_assigned", async () => {
  const w = setup();
  const t = (await tao(w, SALES, KE_TOAN)).json.ticket;
  const r = await w.call("PATCH", `/api/feedback/${t.id}`, { as: SUPER, body: { priority: "HIGH" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.priority, "HIGH");
  assert.deepEqual(nkUuTien(w).map((x: any) => x.detail), [`${t.code}: NORMAL → HIGH`]);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_assigned'")[0].n, 0);
});

test("người gửi kèm priority khi tạo phiếu ⇒ bị bỏ qua, phiếu vẫn Thường", async () => {
  const w = setup();
  const r = await tao(w, SALES, KE_TOAN, { priority: "URGENT" });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.ticket.priority, "NORMAL");
  assert.equal(w.q(`SELECT priority FROM fbk_ticket WHERE id = '${r.json.ticket.id}'`)[0].priority, "NORMAL");
});

test("hàng đợi nhóm (và hàng đợi admin) sắp Khẩn → Cao → Thường rồi hoạt động gần nhất; «của tôi» giữ thứ tự thời gian", async () => {
  const w = setup();
  const mk = async (title: string) => (await tao(w, SALES, KE_TOAN, { title })).json.ticket.id as string;
  const U = await mk("U"), H = await mk("H"), N1 = await mk("N1"), N2 = await mk("N2");
  assert.equal((await xuLy(w, U, KT_TV, { priority: "URGENT" })).status, 200);
  assert.equal((await xuLy(w, H, KT_TV, { priority: "HIGH" })).status, 200);
  // U cũ nhất, N1 mới nhất, H và N2 ở giữa: thứ tự đúng khác cả thứ tự thời gian lẫn thứ tự chữ (xuôi hay ngược).
  const moc: [string, string][] = [[U, "2026-10-01T00:00:00.000Z"], [H, "2026-10-02T00:00:00.000Z"], [N2, "2026-10-03T00:00:00.000Z"], [N1, "2026-10-04T00:00:00.000Z"]];
  for (const [id, at] of moc) w.sqlite.exec(`UPDATE fbk_ticket SET last_activity_at = '${at}' WHERE id = '${id}'`);
  const tieuDe = (ds: any[]) => ds.map((x: any) => x.title);
  const q = await hang(w, KT_TN);
  assert.equal(q.status, 200, q.text);
  assert.deepEqual(tieuDe(q.json.tickets), ["U", "H", "N1", "N2"]);
  assert.deepEqual(q.json.tickets.map((x: any) => x.priority), ["URGENT", "HIGH", "NORMAL", "NORMAL"]);
  const a = await w.call("GET", "/api/feedback", { as: SUPER });
  assert.equal(a.status, 200, a.text);
  assert.deepEqual(tieuDe(a.json.tickets), ["U", "H", "N1", "N2"]);
  const mine = await w.call("GET", "/api/feedback/mine", { as: SALES });
  assert.deepEqual(tieuDe(mine.json.tickets), ["N1", "N2", "H", "U"], "người gửi giữ thứ tự cũ");
});

test("câu 403 của tuyến xử lý (kể cả thân chỉ có priority) nói đúng việc: «Chỉ nhóm xử lý được xử lý phiếu.»", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  for (const body of [{ priority: "URGENT" }, { status: "IN_PROGRESS" }]) {
    const r = await xuLy(w, id, SALES, body);
    assert.equal(r.status, 403, r.text);
    assert.equal(r.json.error.message, "Chỉ nhóm xử lý được xử lý phiếu.");
  }
});

// ---- Việc 3 (ADR-0127 quyết định 3): mã đơn liên quan ---------------------------------------------------------------------------------------------
// Đơn gieo thẳng bảng orders (khung thử); id dạng UUID như đơn thật. Mã TD-YYYYMMDD-NNNN ⇒ thứ tự mã = thứ tự thời gian.
const DON = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const MA = (n: number) => `TD-20261001-${String(n).padStart(4, "0")}`;
function gieoDon(w: any, n: number, staffId: string, status = "confirmed") {
  w.sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
                 VALUES ('${DON(n)}', '${MA(n)}', '${staffId}', '${status}', 'Khách Bí Mật', '0911222333', '${NOW}', '${NOW}')`);
}
const donCuaToi = (w: any, as: string) => w.call("GET", "/api/feedback/my-orders", { as });
const CAU_DON_SAI = "Không gắn được đơn này: chỉ gắn được đơn do chính bạn lập.";

test("my-orders: chỉ đơn do chính người gọi lập, sắp mã giảm dần, tối đa 30, chỉ id/orderCode/status (không tiền, khách, SĐT)", async () => {
  const w = setup();
  for (let n = 1; n <= 31; n++) gieoDon(w, n, SALES, n === 31 ? "draft" : "confirmed");
  gieoDon(w, 40, SUPER); // đơn người khác, mã LỚN hơn mọi đơn của SALES
  const r = await donCuaToi(w, SALES);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.orders.length, 30);
  assert.deepEqual(r.json.orders.map((o: any) => o.orderCode), Array.from({ length: 30 }, (_, i) => MA(31 - i)));
  assert.deepEqual(r.json.orders[0], { id: DON(31), orderCode: MA(31), status: "draft" });
  for (const o of r.json.orders) assert.deepEqual(Object.keys(o).sort(), ["id", "orderCode", "status"]);
  assert.deepEqual(Object.keys(r.json), ["orders"]);
  assert.ok(!r.text.includes("Khách Bí Mật") && !r.text.includes("0911222333"), "không lộ tên khách / SĐT");
  assert.ok(!r.text.includes(MA(40)), "không lộ đơn của người khác");
});

test("my-orders: Đối tác chỉ thấy đơn họ lập; tuyến tĩnh không bị hiểu là id phiếu; chưa đăng nhập ⇒ 401", async () => {
  const w = setup();
  gieoDon(w, 1, PARTNER); gieoDon(w, 2, SALES);
  const r = await donCuaToi(w, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.orders, [{ id: DON(1), orderCode: MA(1), status: "confirmed" }]);
  assert.equal((await w.call("GET", "/api/feedback/my-orders")).status, 401);
});

test("my-orders: tài khoản không có quyền xem đơn (Nhân sự, tài xế đối tác) hoặc vừa bị rút quyền ⇒ 403, không lộ mã đơn cũ", async () => {
  const w = setup();
  gieoDon(w, 1, NS_TV); gieoDon(w, 2, TXDT); gieoDon(w, 3, SALES);
  for (const as of [NS_TV, TXDT]) {
    const r = await donCuaToi(w, as);
    assert.equal(r.status, 403, `${as} ${r.text}`);
    assert.equal(r.json.error.message, "Tài khoản của bạn không xem được đơn hàng.");
  }
  assert.equal((await donCuaToi(w, SALES)).status, 200);
  // Rút quyền Bán hàng, chỉ còn Nhân sự: cùng phiên đăng nhập đọc lại quyền mỗi request ⇒ 403 của THÂN route (không phải 401 / câu của cổng).
  w.sqlite.exec(`UPDATE stf_permission SET valid_to_at = '${NOW}' WHERE staff_id = '${SALES}' AND permission_type_code = 'SALES'`);
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${SALES}-HR', '${SALES}', 'HR', '${NOW}', '${NOW}', '${NOW}')`);
  const r = await donCuaToi(w, SALES);
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.message, "Tài khoản của bạn không xem được đơn hàng.");
  assert.ok(!r.text.includes(MA(3)));
});

test("gửi phiếu kèm đơn của mình ⇒ phiếu chụp mã đơn lúc gửi; người gửi, thành viên nhóm, Toàn quyền đều thấy mã; nhật ký không ghi mã đơn", async () => {
  const w = setup();
  gieoDon(w, 7, SALES);
  const r = await tao(w, SALES, KE_TOAN, { orderId: DON(7) });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.ticket.orderId, DON(7));
  assert.equal(r.json.ticket.orderCode, MA(7));
  const id = r.json.ticket.id;
  assert.deepEqual({ ...w.q(`SELECT order_id, order_code FROM fbk_ticket WHERE id = '${id}'`)[0] }, { order_id: DON(7), order_code: MA(7) });
  // Chụp lúc gửi: mã đơn đổi về sau, phiếu vẫn giữ mã cũ.
  w.sqlite.exec(`UPDATE orders SET order_code = 'TD-20261001-9999' WHERE id = '${DON(7)}'`);
  for (const as of [SALES, KT_TV, SUPER]) {
    const d = await w.call("GET", `/api/feedback/${id}`, { as });
    assert.equal(d.status, 200, `${as} ${d.text}`);
    assert.equal(d.json.ticket.orderCode, MA(7), as);
  }
  const q = await hang(w, KT_TV);
  assert.equal(q.json.tickets[0].orderCode, MA(7));
  const nk = w.q(`SELECT action, detail FROM audit_log WHERE target_id = '${id}'`);
  assert.ok(nk.length > 0);
  for (const x of nk) assert.ok(!String(x.detail ?? "").includes(MA(7)) && !String(x.detail ?? "").includes(DON(7)), JSON.stringify(x));
  // Không gắn đơn ⇒ cả hai cột NULL.
  const k = await tao(w, SALES, KE_TOAN);
  assert.equal(k.status, 201, k.text);
  assert.equal(k.json.ticket.orderId, null);
  assert.equal(k.json.ticket.orderCode, null);
  const n = await tao(w, SALES, KE_TOAN, { orderId: null });
  assert.equal(n.status, 201, n.text);
  assert.equal(n.json.ticket.orderCode, null);
});

test("gắn đơn của người khác, đơn không tồn tại, mã sai dạng, hay tài khoản không có quyền xem đơn ⇒ CÙNG 400 và CÙNG câu (không dò đơn), không tạo phiếu", async () => {
  const w = setup();
  gieoDon(w, 1, SUPER); gieoDon(w, 2, NS_TV);
  const ca: [string, unknown][] = [[SALES, DON(1)], [SALES, DON(99)], [SALES, "khong-phai-uuid"], [SALES, 12345], [NS_TV, DON(2)], [PARTNER, DON(1)]];
  const than = new Set<string>();
  for (const [as, orderId] of ca) {
    const r = await tao(w, as, as === PARTNER ? KY_THUAT : KE_TOAN, { orderId });
    assert.equal(r.status, 400, `${as} ${String(orderId)} ${r.text}`);
    assert.equal(r.json.error.message, CAU_DON_SAI);
    than.add(r.text);
  }
  assert.equal(than.size, 1, `mọi ca trả CÙNG một thân: ${[...than].join(" | ")}`);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket")[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_created'")[0].n, 0);
});

test("gửi kèm đơn của mình VÀ priority: đơn được gắn, priority vẫn bị bỏ qua (Việc 2 không vỡ)", async () => {
  const w = setup();
  gieoDon(w, 5, SALES);
  const r = await tao(w, SALES, KE_TOAN, { orderId: DON(5), priority: "URGENT" });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.ticket.orderCode, MA(5));
  assert.equal(r.json.ticket.priority, "NORMAL");
});

// ---- ADR-0127 Việc 4: tuyến làm mới GET …/:id/messages?since= và tuyến thành viên GET …/teams/:id/members (hai tuyến CHỈ ĐỌC) -------------------
const moi = (w: any, id: string, as: string | undefined, since?: string) =>
  w.call("GET", `/api/feedback/${id}/messages${since === undefined ? "" : `?since=${encodeURIComponent(since)}`}`, { as });
const thanhVien = (w: any, team: string, as: string | undefined, ticket?: string) =>
  w.call("GET", `/api/feedback/teams/${team}/members${ticket === undefined ? "" : `?ticket=${encodeURIComponent(ticket)}`}`, { as });
const XUA = "2000-01-01T00:00:00.000Z";
/** Chèn thẳng một tin (dấu giờ tuỳ ý — mô phỏng tin có created_at tính TRƯỚC lô ghi, ghi xong sau). */
const chenTin = (w: any, ticketId: string, id: string, at: string, o: { internal?: 0 | 1; team?: string; author?: string; body?: string } = {}) =>
  w.sqlite.exec(`INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by, team_id)
    VALUES ('${id}', '${ticketId}', '${o.author ?? SALES}', '${o.body ?? `tin ${id}`}', ${o.internal ?? 0}, '${at}', '${o.author ?? SALES}', '${at}', '${o.author ?? SALES}', '${o.team ?? KE_TOAN}')`);

test("tuyến làm mới: phiếu lạ / id sai dạng / người không đọc được ⇒ 404 TRƯỚC khi xét since; người đọc được thiếu hoặc sai since ⇒ 400 (không 500)", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await moi(w, id, undefined, XUA)).status, 401);
  assert.equal((await moi(w, "khong-phai-uuid", SALES, XUA)).status, 404);
  assert.equal((await moi(w, U(5).replace(/5/g, "a"), SALES, XUA)).status, 404, "phiếu không có");
  for (const as of [NS_TV, QT, PARTNER, TXDT]) {
    assert.equal((await moi(w, id, as)).status, 404, `${as}: người ngoài thiếu since vẫn 404 (không lộ phiếu có thật)`);
    assert.equal((await moi(w, id, as, "abc")).status, 404, as);
  }
  const thieu = await moi(w, id, SALES);
  assert.equal(thieu.status, 400, thieu.text);
  assert.equal(thieu.json.error.code, "invalid_input");
  for (const sai of ["", "abc", "2026-10-17", "2026-10-17T03:04:05+07:00", "2026-02-30T00:00:00Z", "1e12"]) {
    const r = await moi(w, id, KT_TV, sai);
    assert.equal(r.status, 400, `${JSON.stringify(sai)}: ${r.text}`);
  }
});

test("tuyến làm mới — quyền: người gửi không thấy ghi chú nội bộ; thành viên / Trưởng nhóm / Toàn quyền thấy; người ngoài, Quản trị, Nhân sự, đối tác, tài khoản lai, tài xế đối tác ⇒ 404; bộ lọc GIỐNG HỆT tuyến chi tiết", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_TV, "Ghi chú nội bộ Kế toán", true)).status, 201);
  assert.equal((await traLoi(w, id, KT_TN, "Trả lời công khai", false)).status, 201);
  // R6b: đối tác còn dòng Trưởng nhóm cũ (chèn thẳng SQL) vẫn không đọc được.
  w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-cu-p', '${KE_TOAN}', '${PARTNER}', 'LEAD', '${NOW}', '${NOW}', '${NOW}')`);
  w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-cu-l', '${KE_TOAN}', '${LAI}', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`);
  const coNoiBo = (r: any) => r.json.messages.some((m: any) => m.internal);
  const sales = await moi(w, id, SALES, XUA);
  assert.equal(sales.status, 200, sales.text);
  assert.equal(coNoiBo(sales), false, "người gửi không thấy ghi chú nội bộ");
  assert.ok(!sales.text.includes("Ghi chú nội bộ Kế toán"));
  assert.deepEqual(sales.json.messages.map((m: any) => m.body), ["Nội dung hỏi.", "Trả lời công khai"]);
  assert.deepEqual(Object.keys(sales.json).sort(), ["messages", "ticket"]);
  assert.deepEqual(Object.keys(sales.json.ticket).sort(), ["assigneeActive", "assigneeId", "assigneeName", "priority", "status", "teamId"]);
  assert.deepEqual(sales.json.ticket, { status: "NEW", assigneeId: null, assigneeName: null, assigneeActive: false, priority: "NORMAL", teamId: KE_TOAN });
  for (const as of [KT_TV, KT_TN, SUPER]) {
    const r = await moi(w, id, as, XUA);
    assert.equal(r.status, 200, `${as} ${r.text}`);
    assert.ok(coNoiBo(r), `${as} thấy ghi chú nội bộ của nhóm mình`);
  }
  for (const as of [NS_TV, QT, PARTNER, LAI, TXDT]) {
    const r = await moi(w, id, as, XUA);
    assert.equal(r.status, 404, `${as}: ${r.text}`);
    assert.ok(!r.text.includes("Ghi chú") && !r.text.includes("Trả lời"), as);
  }
  // Cùng bộ lọc với tuyến chi tiết (dùng chung đoạn SQL + noiBo của quyenPhieu): danh sách tin trùng khít cho mọi người đọc được.
  for (const as of [SALES, KT_TV, KT_TN, SUPER]) {
    const a = (await moi(w, id, as, XUA)).json.messages;
    const b = (await d(w, id, as)).json.messages;
    assert.deepEqual(a, b, `${as}: tuyến làm mới và tuyến chi tiết phải trả cùng tin`);
  }
  // Người gửi là thành viên chính nhóm nhận (R2): vẫn không thấy ghi chú nội bộ trên phiếu của mình.
  const cuaGui = (await tao(w, KT_GUI, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, cuaGui, KT_TV, "Nội bộ về phiếu KT_GUI", true)).status, 201);
  const g = await moi(w, cuaGui, KT_GUI, XUA);
  assert.equal(g.status, 200, g.text);
  assert.equal(coNoiBo(g), false, "người gửi kiêm thành viên nhóm vẫn không thấy ghi chú nội bộ");
});

test("tuyến làm mới sau chuyển nhóm: thành viên / Trưởng nhóm cũ ⇒ 404; nhóm mới chỉ thấy ghi chú của nhóm mình; Toàn quyền thấy cả hai; phần đầu phiếu theo nhóm mới", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  await xuLy(w, id, KT_TN, { priority: "HIGH" });
  const truoc = await moi(w, id, KT_TV, XUA);
  assert.deepEqual(truoc.json.ticket, { status: "ACK", assigneeId: KT_TV, assigneeName: "NV 3", assigneeActive: true, priority: "HIGH", teamId: KE_TOAN });
  assert.equal((await traLoi(w, id, KT_TV, "Bí mật Kế toán", true)).status, 201);
  assert.equal((await chuyen(w, id, KT_TN, NHAN_SU, "Việc của Nhân sự")).status, 200);
  assert.equal((await moi(w, id, KT_TV, XUA)).status, 404, "thành viên nhóm cũ mất quyền ngay");
  assert.equal((await moi(w, id, KT_TN, XUA)).status, 404, "Trưởng nhóm cũ mất quyền ngay");
  const ns = await moi(w, id, NS_TV, XUA);
  assert.equal(ns.status, 200, ns.text);
  const noiBo = ns.json.messages.filter((m: any) => m.internal).map((m: any) => m.body);
  assert.ok(!noiBo.some((b: string) => b.includes("Bí mật Kế toán")), "nhóm mới không thấy ghi chú nhóm cũ");
  assert.ok(noiBo.some((b: string) => b.includes("Việc của Nhân sự")));
  assert.deepEqual(ns.json.ticket, { status: "ACK", assigneeId: null, assigneeName: null, assigneeActive: false, priority: "HIGH", teamId: NHAN_SU });
  assert.ok((await moi(w, id, SUPER, XUA)).json.messages.some((m: any) => m.body === "Bí mật Kế toán"));
  assert.ok(!(await moi(w, id, SALES, XUA)).json.messages.some((m: any) => m.internal), "người gửi vẫn không thấy ghi chú nào");
});

test("tuyến làm mới: chỉ tin created_at > since (bằng since thì không), cũ trước mới sau, tối đa 100; since thiếu phần nghìn giây vẫn so đúng", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  chenTin(w, id, "m-dung-moc", "2030-01-01T00:00:00.000Z");
  chenTin(w, id, "m-nua-giay", "2030-01-01T00:00:00.500Z");
  const r = await moi(w, id, SALES, "2030-01-01T00:00:00Z");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.messages.map((m: any) => m.id), ["m-nua-giay"], "bằng mốc ⇒ không trả; «…:00Z» được chuẩn hoá nên tin «…:00.500Z» không bị bỏ sót");
  for (let i = 0; i < 105; i++) chenTin(w, id, `m-${String(i).padStart(3, "0")}`, new Date(Date.UTC(2031, 0, 1, 0, 0, i)).toISOString());
  const dau = await moi(w, id, SALES, "2030-12-31T00:00:00.000Z");
  assert.equal(dau.json.messages.length, 100, "trần 100 tin mỗi lần");
  assert.equal(dau.json.messages[0].id, "m-000", "cũ trước (lấy 100 tin CŨ NHẤT sau mốc để khách tiến dần, không nhảy cóc)");
  assert.equal(dau.json.messages[99].id, "m-099");
  const sau = await moi(w, id, SALES, dau.json.messages[99].createdAt);
  assert.deepEqual(sau.json.messages.map((m: any) => m.id), ["m-100", "m-101", "m-102", "m-103", "m-104"]);
  assert.deepEqual(Object.keys(sau.json.messages[0]).sort(), ["authorId", "authorName", "body", "createdAt", "id", "internal", "mine"]);
});

test("ca ghi lệch thứ tự dấu giờ: tin ghi xong SAU mang dấu SỚM hơn vẫn tới khách nhờ lùi 30 giây + bỏ trùng theo id (không mất tin)", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const T2 = "2030-06-01T00:00:10.000Z", T1 = "2030-06-01T00:00:05.000Z"; // T1 < T2
  // Lệnh ghi B (dấu T2) xong trước; khách làm mới đúng lúc này nhận B.
  chenTin(w, id, "tin-B", T2, { author: KT_TV, body: "B" });
  const lan1 = await moi(w, id, KT_TN, "2030-06-01T00:00:00.000Z");
  assert.deepEqual(lan1.json.messages.map((m: any) => m.id), ["tin-B"]);
  // Lệnh ghi A có dấu T1 (Worker tính TRƯỚC lô ghi) nhưng ghi xong SAU B.
  chenTin(w, id, "tin-A", T1, { author: KT_GUI, body: "A" });
  const cuoi = lan1.json.messages.at(-1).createdAt; // mốc lấy từ tin cuối MÁY CHỦ đã trả, không từ đồng hồ trình duyệt
  // Không lùi: A bị bỏ sót vĩnh viễn — lý do của quy tắc lùi 30 giây (đặc tả 2.1).
  assert.deepEqual((await moi(w, id, KT_TN, cuoi)).json.messages.map((m: any) => m.id), [], "since = mốc tin cuối ⇒ mất A");
  const lui = new Date(Date.parse(cuoi) - 30_000).toISOString();
  const lan2 = await moi(w, id, KT_TN, lui);
  assert.deepEqual(lan2.json.messages.map((m: any) => m.id), ["tin-A", "tin-B"], "lùi 30 giây ⇒ thấy cả A và B");
  // Phía khách (Việc 5 làm ở web/feedback.ts): gộp với danh sách đang có, bỏ trùng theo id ⇒ đủ A và B, B không lặp.
  const dangCo = new Map<string, any>(lan1.json.messages.map((m: any) => [m.id, m]));
  for (const m of lan2.json.messages) if (!dangCo.has(m.id)) dangCo.set(m.id, m);
  assert.deepEqual([...dangCo.keys()].sort(), ["tin-A", "tin-B"]);
});

test("tuyến làm mới KHÔNG ghi gì: không mốc «đã xem» (fbk_ticket_read, submitter_seen_at), không đổi phiếu, không nhật ký — chấm đỏ vẫn còn", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  for (const as of [SALES, KT_TV, KT_TN]) await w.call("GET", "/api/feedback/teams", { as }); // phiên đăng nhập tạo trước khi chụp
  const anh = () => JSON.stringify({
    read: w.q("SELECT ticket_id, staff_id, seen_at, created_by, updated_at, updated_by FROM fbk_ticket_read ORDER BY ticket_id, staff_id").map((r: any) => ({ ...r })),
    phieu: w.q(`SELECT * FROM fbk_ticket WHERE id = '${id}'`).map((r: any) => ({ ...r })),
    audit: w.q("SELECT count(*) AS n FROM audit_log")[0].n,
    tin: w.q("SELECT count(*) AS n FROM fbk_message")[0].n,
    suKien: w.q("SELECT count(*) AS n FROM fbk_ticket_event")[0].n,
  });
  // (1) KT_TV CHƯA từng mở phiếu (chưa có dòng đọc): làm mới nhiều lần không tạo dòng.
  const a0 = anh();
  assert.equal(await huy(w, KT_TV), 1);
  for (let i = 0; i < 3; i++) assert.equal((await moi(w, id, KT_TV, XUA)).status, 200);
  assert.equal(anh(), a0, "làm mới khi chưa từng mở: không ghi gì");
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_read WHERE staff_id = '${KT_TV}'`)[0].n, 0);
  assert.equal(await huy(w, KT_TV), 1, "chấm đỏ không tắt vì tự làm mới");
  // (2) Đã có dòng đọc (mở chi tiết), rồi có tin mới: làm mới không đẩy seen_at (upsert cũng không được — so cả giá trị, không chỉ đếm).
  assert.equal((await d(w, id, KT_TV)).status, 200);
  assert.equal(await huy(w, KT_TV), 0);
  assert.equal((await traLoi(w, id, KT_TN, "Trả lời công khai")).status, 201);
  assert.equal(await huy(w, KT_TV), 1);
  const a1 = anh();
  for (let i = 0; i < 3; i++) assert.equal((await moi(w, id, KT_TV, XUA)).status, 200);
  assert.equal(anh(), a1, "làm mới khi đã có dòng đọc: seen_at không đổi");
  assert.equal(await huy(w, KT_TV), 1);
  // (3) Người gửi: có phản hồi công khai mới ⇒ chấm đỏ «của tôi»; làm mới không ghi submitter_seen_at.
  const mine = async () => (await w.call("GET", "/api/feedback/badge", { as: SALES })).json.mine;
  assert.equal(await mine(), 1);
  const a2 = anh();
  for (let i = 0; i < 3; i++) assert.equal((await moi(w, id, SALES, XUA)).status, 200);
  assert.equal(anh(), a2, "người gửi làm mới: submitter_seen_at và dòng đọc không đổi");
  assert.equal(await mine(), 1);
  // Đối chứng: mở chi tiết thì CÓ ghi (bài trên không xanh giả vì ảnh chụp mù).
  assert.equal((await d(w, id, SALES)).status, 200);
  assert.notEqual(anh(), a2, "đối chứng: tuyến chi tiết ghi mốc đã xem");
  assert.equal(await mine(), 0);
});

test("tuyến thành viên: Trưởng nhóm đúng nhóm và Toàn quyền ⇒ 200; thành viên thường, Trưởng nhóm nhóm khác, người ngoài, Quản trị, đối tác (kể cả còn dòng Trưởng nhóm cũ) ⇒ 403; nhóm không có ⇒ 404", async () => {
  const w = setup();
  w.sqlite.exec(`UPDATE fbk_team_member SET role = 'LEAD' WHERE staff_id = '${NS_TV}' AND team_id = '${NHAN_SU}'`); // NS_TV: Trưởng nhóm Nhân sự
  w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-cu-p', '${KE_TOAN}', '${PARTNER}', 'LEAD', '${NOW}', '${NOW}', '${NOW}')`);
  assert.equal((await thanhVien(w, KE_TOAN, undefined)).status, 401);
  for (const as of [KT_TN, SUPER]) {
    const r = await thanhVien(w, KE_TOAN, as);
    assert.equal(r.status, 200, `${as} ${r.text}`);
    assert.deepEqual(Object.keys(r.json), ["members"]);
    assert.deepEqual(r.json.members.map((m: any) => [m.staffId, m.role]).sort(), [[KT_GUI, "MEMBER"], [KT_TN, "LEAD"], [KT_TV, "MEMBER"]].sort(), as);
    for (const m of r.json.members) {
      assert.deepEqual(Object.keys(m).sort(), ["name", "role", "staffId"]);
      assert.match(m.name, /^NV \d$/, "tên đọc qua v_stf_staff_label");
    }
    assert.ok(!r.text.includes("09000000"), "không SĐT");
  }
  for (const as of [KT_TV, KT_GUI, NS_TV, SALES, QT, PARTNER, LAI, TXDT]) {
    const r = await thanhVien(w, KE_TOAN, as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.ok(!r.text.includes("NV "), `${as}: 403 không lộ tên thành viên`);
  }
  assert.equal((await thanhVien(w, NHAN_SU, NS_TV)).status, 200, "Trưởng nhóm Nhân sự xem được nhóm của mình");
  assert.equal((await thanhVien(w, "khong-co", SUPER)).status, 404);
  assert.equal((await thanhVien(w, "khong-co", KT_TN)).status, 404);
  assert.equal((await thanhVien(w, "SAI DANG!", SUPER)).status, 404);
});

test("tuyến thành viên: chỉ người đang hiệu lực + còn hoạt động; loại người gửi phiếu đang giao (?ticket=, chỉ phiếu CỦA nhóm này), tài khoản bên ngoài còn dòng cũ; không ghi gì", async () => {
  const w = setup();
  const phieuGui = (await tao(w, KT_GUI, KE_TOAN)).json.ticket.id; // người gửi là thành viên chính nhóm nhận
  const phieuNhomKhac = (await tao(w, KT_TV, NHAN_SU)).json.ticket.id; // KT_TV gửi sang Nhân sự
  const ids = async (ticket?: string) => (await thanhVien(w, KE_TOAN, KT_TN, ticket)).json.members.map((m: any) => m.staffId).sort();
  assert.deepEqual(await ids(phieuGui), [KT_TN, KT_TV].sort(), "loại người gửi phiếu đang giao");
  assert.deepEqual(await ids(phieuNhomKhac), [KT_GUI, KT_TN, KT_TV].sort(), "phiếu của nhóm khác không loại ai (không dò người gửi phiếu nhóm khác)");
  assert.deepEqual(await ids("khong-phai-id"), [KT_GUI, KT_TN, KT_TV].sort());
  // Tài khoản bên ngoài còn dòng thành viên cũ (đối tác, tài khoản lai, tài xế đối tác) ⇒ không có trong danh sách (R6).
  for (const [k, s] of [["p", PARTNER], ["l", LAI], ["t", TXDT]]) {
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-ngoai-${k}', '${KE_TOAN}', '${s}', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`);
  }
  assert.deepEqual(await ids(), [KT_GUI, KT_TN, KT_TV].sort(), "bên ngoài bị loại");
  // Bị gỡ khỏi nhóm ⇒ không còn; tài khoản bị khoá ⇒ không còn.
  assert.equal((await admin(w, "DELETE", `/${KE_TOAN}/members/${KT_GUI}`, SUPER)).status, 200);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TV}'`);
  assert.deepEqual(await ids(), [KT_TN]);
  const truoc = [w.q("SELECT count(*) AS n FROM audit_log")[0].n, w.q("SELECT count(*) AS n FROM fbk_team_member")[0].n, w.q("SELECT count(*) AS n FROM fbk_ticket_read")[0].n];
  await ids(phieuGui);
  assert.deepEqual([w.q("SELECT count(*) AS n FROM audit_log")[0].n, w.q("SELECT count(*) AS n FROM fbk_team_member")[0].n, w.q("SELECT count(*) AS n FROM fbk_ticket_read")[0].n], truoc);
});

// ---- Việc 4 vòng sửa 1 (Ruling R6, đặc tả 2.4): không giao phiếu cho tài khoản BÊN NGOÀI còn dòng thành viên cũ — cả /xu-ly lẫn tuyến cũ của Toàn quyền --------
const giaoQua = [
  ["xu-ly (Trưởng nhóm)", (w: any, id: string, body: unknown) => xuLy(w, id, KT_TN, body)],
  ["tuyến cũ (Toàn quyền)", (w: any, id: string, body: unknown) => w.call("PATCH", `/api/feedback/${id}`, { as: SUPER, body })],
] as const;

test("R6 giao việc: người nhận là đối tác / tài khoản lai / tài xế đối tác còn dòng thành viên cũ ⇒ 400 cùng câu lỗi; không đổi người giữ, không sự kiện, không nhật ký — ở cả hai route", async () => {
  for (const [ten, giao] of giaoQua) {
    for (const [k, s] of [["p", PARTNER], ["l", LAI], ["t", TXDT]] as const) {
      const w = setup();
      w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-ngoai-${k}', '${KE_TOAN}', '${s}', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`);
      const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
      await nhan(w, id, KT_TV);
      const nk0 = w.q(`SELECT count(*) AS n FROM audit_log WHERE target_id = '${id}'`)[0].n;
      const r = await giao(w, id, { assigneeId: s });
      assert.equal(r.status, 400, `${ten} ${k}: ${r.text}`);
      assert.deepEqual(r.json.error, { code: "invalid_input", message: "Người xử lý phải là thành viên đang hoạt động của nhóm giữ phiếu (không phải người gửi)." }, `${ten} ${k}: cùng câu lỗi, không lộ loại tài khoản`);
      assert.equal(w.q(`SELECT assignee_id FROM fbk_ticket WHERE id = '${id}'`)[0].assignee_id, KT_TV, `${ten} ${k}: người giữ không đổi`);
      assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}' AND type = 'ASSIGNED'`)[0].n, 0, `${ten} ${k}: không sự kiện ASSIGNED`);
      assert.equal(w.q(`SELECT count(*) AS n FROM audit_log WHERE target_id = '${id}'`)[0].n, nk0, `${ten} ${k}: không dòng nhật ký`);
    }
  }
});

test("R6 giao việc — đối chứng: bỏ gán, tự gán, giao cho thành viên nội bộ, gửi lại đúng người đang giữ đều 200 (ở cả hai route)", async () => {
  for (const [ten, giao] of giaoQua) {
    const w = setup();
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-ngoai-p', '${KE_TOAN}', '${PARTNER}', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`);
    const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
    const noiBo = await giao(w, id, { assigneeId: KT_TV });
    assert.equal(noiBo.status, 200, `${ten} giao nội bộ: ${noiBo.text}`);
    assert.equal(noiBo.json.ticket.assigneeId, KT_TV);
    const lai = await giao(w, id, { assigneeId: KT_TV });
    assert.equal(lai.status, 200, `${ten} gửi lại đúng người đang giữ: ${lai.text}`);
    const bo = await giao(w, id, { assigneeId: null });
    assert.equal(bo.status, 200, `${ten} bỏ gán: ${bo.text}`);
    assert.equal(bo.json.ticket.assigneeId, null);
    if (ten.startsWith("xu-ly")) {
      const tu = await giao(w, id, { assigneeId: KT_TN });
      assert.equal(tu.status, 200, `Trưởng nhóm tự giao cho mình: ${tu.text}`);
      assert.equal(tu.json.ticket.assigneeId, KT_TN);
    }
  }
});

test("tuyến làm mới: phần đầu phiếu có assigneeActive — người giữ bị khoá ⇒ false (giao diện khỏi hiện tên như người đang giữ)", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await moi(w, id, KT_TN, XUA)).json.ticket.assigneeActive, false, "chưa ai giữ");
  await nhan(w, id, KT_TV);
  assert.equal((await moi(w, id, KT_TN, XUA)).json.ticket.assigneeActive, true);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TV}'`);
  const r = await moi(w, id, KT_TN, XUA);
  assert.equal(r.json.ticket.assigneeId, KT_TV);
  assert.equal(r.json.ticket.assigneeActive, false, "người giữ đã khoá");
});
