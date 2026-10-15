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
