// Hàng đợi hỗ trợ một nhóm: nhiều trạng thái, tìm theo mã/tiêu đề, số đếm cho ba nút lọc (đặc tả DAC-TA-MAY-CHU, Task 7).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), KT_TV = U(3), KT_TN = U(4), KT_GUI = U(8);
const KE_TOAN = "fbk-team-ke-toan";
const NOW = "2026-10-15T00:00:00.000Z";
const TRANG_THAI = ["NEW", "ACK", "IN_PROGRESS", "DONE"];
const SO_PHIEU = 240;
const MO = "NEW,ACK,IN_PROGRESS";

interface Dong { seq: number; status: string; assignee: string | null; submitter: string; title: string }

/** 240 yêu cầu ở nhóm Kế toán (đủ để mỗi loc của «Đang mở» có hơn 50 dòng): trộn trạng thái; 1/3 do KT_TV nhận, 1/3 do KT_TN nhận, còn lại chưa ai; phiếu cuối do chính KT_TV gửi; #9 người giữ đã ngưng tài khoản. */
function setup() {
  const w = world();
  for (const [id, phone, perms] of [[SALES, "0900000001", ["SALES"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [KT_TN, "0900000004", ["ACCOUNTING"]], [KT_GUI, "0900000008", ["ACCOUNTING"]]] as [string, string, string[]][]) {
    seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms });
  }
  for (const s of [KT_TV, KT_TN, KT_GUI]) {
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-${s}', '${KE_TOAN}', '${s}', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`);
  }
  const dong: Dong[] = [];
  for (let i = 1; i <= SO_PHIEU; i++) {
    dong.push({
      seq: i, status: TRANG_THAI[i % 4], submitter: i === SO_PHIEU ? KT_TV : SALES, title: i === 5 ? "Lỗi in hoá đơn 100%_x" : `Hỏi về công nợ số ${i}`,
      assignee: i === 9 ? KT_GUI : [KT_TV, KT_TN, null][Math.floor(i / 4) % 3],
    });
  }
  for (const d of dong) {
    w.sqlite.exec(
      `INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, submitter_id, assignee_id, client_request_id, last_activity_at, created_at, updated_at, team_id)
       VALUES ('t-${d.seq}', ${d.seq}, 'QUESTION', '${d.status}', '${d.title}', '${d.submitter}', ${d.assignee ? `'${d.assignee}'` : "NULL"}, '${crypto.randomUUID()}',
               '2026-10-14T00:${String(d.seq).padStart(2, "0")}:00.000Z', '${NOW}', '${NOW}', '${KE_TOAN}')`,
    );
  }
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_GUI}'`);
  return { w, dong };
}

const url = (q: string) => `/api/feedback/queue?team=${KE_TOAN}${q}`;
async function taiHet(w: any, as: string, loc: string, status: string): Promise<{ tickets: any[]; trang: number }> {
  const tickets: any[] = [];
  let trang = 0;
  for (let offset = 0; ; offset += 50) {
    const r = await w.call("GET", url(`&loc=${loc}${status ? `&status=${status}` : ""}&limit=50&offset=${offset}`), { as });
    assert.equal(r.status, 200, r.text);
    trang++;
    assert.ok(trang <= 20, "phân trang không dừng: offset bị bỏ qua?");
    tickets.push(...r.json.tickets);
    if (r.json.tickets.length < 50) return { tickets, trang };
  }
}

test("dem khớp danh sách tải hết (hơn 50 yêu cầu), từng loc", async () => {
  const { w, dong } = setup();
  const mo = dong.filter((d) => MO.split(",").includes(d.status) && d.submitter !== KT_TV);
  const chua = mo.filter((d) => !d.assignee || d.assignee === KT_GUI);
  const cua = mo.filter((d) => d.assignee === KT_TV);
  assert.ok(mo.length > 40 && chua.length > 0 && cua.length > 0);
  const r = await w.call("GET", url(`&loc=ALL&status=${MO}`), { as: KT_TV });
  assert.deepEqual(r.json.dem, { tatCa: mo.length, chuaAiNhan: chua.length, cuaToi: cua.length });
  for (const [loc, soDong] of [["ALL", r.json.dem.tatCa], ["MINE", r.json.dem.cuaToi], ["UNASSIGNED", r.json.dem.chuaAiNhan]] as [string, number][]) {
    const { tickets, trang } = await taiHet(w, KT_TV, loc, MO);
    assert.ok(soDong > 50 && trang >= 2, `${loc} phải có hơn 50 dòng để thử phân trang (có ${soDong}, ${trang} trang)`);
    assert.equal(tickets.length, soDong, `${loc}: dem khớp số dòng tải hết`);
    assert.equal(new Set(tickets.map((t) => t.id)).size, tickets.length, `${loc}: không id lặp giữa các trang`);
    if (loc === "ALL") assert.ok(!tickets.some((t) => t.id === `t-${SO_PHIEU}`), "phiếu chính KT_TV gửi không có mặt");
    if (loc === "UNASSIGNED") assert.ok(tickets.some((t) => t.id === "t-9"), "phiếu người giữ ngưng tài khoản đếm vào chưa ai nhận");
  }
  // dem không phụ thuộc loc
  for (const loc of ["MINE", "UNASSIGNED"]) assert.deepEqual((await w.call("GET", url(`&loc=${loc}&status=${MO}`), { as: KT_TV })).json.dem, r.json.dem);
});

test("không lọc trạng thái: dem tính mọi trạng thái", async () => {
  const { w, dong } = setup();
  const r = await w.call("GET", url("&loc=ALL"), { as: KT_TV });
  assert.equal(r.json.dem.tatCa, dong.filter((d) => d.submitter !== KT_TV).length);
  assert.equal(r.json.tickets.length, 50);
});

test("q lọc theo mã và tiêu đề; dem theo q; ký tự % _ trong q là chữ thường", async () => {
  const { w } = setup();
  const ma = await w.call("GET", url("&q=YC-0008"), { as: KT_TV });
  assert.equal(ma.status, 200, ma.text);
  assert.deepEqual(ma.json.tickets.map((t: any) => t.code), ["YC-0008"]);
  assert.equal(ma.json.dem.tatCa, 1);
  assert.equal(ma.json.dem.chuaAiNhan, 1);
  const tieuDe = await w.call("GET", url(`&q=${encodeURIComponent("hoá đơn")}`), { as: KT_TV });
  assert.deepEqual(tieuDe.json.tickets.map((t: any) => t.code), ["YC-0005"]);
  assert.equal((await w.call("GET", url(`&q=${encodeURIComponent("100%_x")}`), { as: KT_TV })).json.tickets.length, 1);
  assert.equal((await w.call("GET", url("&q=%25"), { as: KT_TV })).json.tickets.length, 1, "% là chữ thường: chỉ khớp tiêu đề có dấu %, không khớp mọi dòng");
  assert.equal((await w.call("GET", url("&q=khong-co-chu-nay"), { as: KT_TV })).json.dem.tatCa, 0);
  assert.equal((await w.call("GET", url("&q=%20%20"), { as: KT_TV })).json.dem.tatCa, SO_PHIEU - 1, "q toàn khoảng trắng = không tìm");
  assert.equal((await w.call("GET", url(`&q=${"a".repeat(61)}`), { as: KT_TV })).status, 400);
  assert.equal((await w.call("GET", url(`&q=${"a".repeat(60)}`), { as: KT_TV })).status, 200);
});

test("status một mã vẫn chạy; nhiều mã lấy hợp", async () => {
  const { w, dong } = setup();
  const n = (...s: string[]) => dong.filter((d) => s.includes(d.status) && d.submitter !== KT_TV).length;
  assert.equal((await w.call("GET", url("&status=DONE"), { as: KT_TV })).json.dem.tatCa, n("DONE"));
  assert.equal((await w.call("GET", url("&status=NEW,DONE"), { as: KT_TV })).json.dem.tatCa, n("NEW", "DONE"));
  assert.equal((await w.call("GET", url("&status=NEW,NEW"), { as: KT_TV })).json.dem.tatCa, n("NEW"));
});

test("status rỗng hoặc mã lạ → 400", async () => {
  const { w } = setup();
  for (const s of ["", "NEW,", ",NEW", "NEW,LA", "new", "KHAC", "NE", "%20NEW"]) {
    const r = await w.call("GET", url(`&status=${s}`), { as: KT_TV });
    assert.equal(r.status, 400, `status=${s}`);
  }
});

test("người không thuộc nhóm vẫn 403 (dem không lộ số)", async () => {
  const { w } = setup();
  assert.equal((await w.call("GET", url("&status=NEW"), { as: SALES })).status, 403);
});
