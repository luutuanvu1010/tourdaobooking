// ADR-0131 Quyết định 1–2 (tiêu chí 1–3, 6): người KHÔNG qua `audit.view` đọc lịch sử đơn (`GET /api/orders/:id` → `history`) qua lớp rút gọn — chỉ hành động trong danh sách
// cho phép, KHÔNG tên và KHÔNG mã người làm. Toàn quyền (`audit.view`) thấy đủ như cũ. Tài khoản lai có quyền Đối tác nhận lớp Đối tác (nhánh `holdsPartner` xét trước).
// Khung thử: tests/audit (cả ứng dụng + SQLite thật). Dòng nhật ký gieo THẲNG vào `audit_log`, người làm là một nhân viên thứ ba có tên độc nhất để dò rò.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LICH_SU_DOI_TAC_CHO_PHEP } from "./shared/lich-su-doi-tac.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { ACC, ADM, FIELD, INTERN, NGAY, PARTNER, SALES, SUP, setup } from "../tests/audit/dieu-phoi-khung.mjs";

type W = ReturnType<typeof setup>;
type Dong = { action: string; staffId: string | null; staffName: string; at: string; detail: string | null };
const AT = "2026-10-01T00:00:00.000Z";
const TEN = "Người Làm Độc Nhất 5821";
const NGUOI = "cccccccc-cccc-4ccc-8ccc-cccccccccc01"; // nhân viên thứ ba: không lập, không phụ trách đơn nào
const LAI_SB = "cccccccc-cccc-4ccc-8ccc-cccccccccc02"; // SALES + PARTNER
const LAI_SUP = "cccccccc-cccc-4ccc-8ccc-cccccccccc03"; // SUPER_ADMIN + PARTNER
let seq = 0;
const uuid = () => `dddddddd-dddd-4ddd-8ddd-${String(++seq).padStart(12, "0")}`;

function dungWorld(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: NGUOI, phone: "0900000031", name: TEN, perms: ["SALES"] });
  seedStaff(w.sqlite, { id: LAI_SB, phone: "0900000032", name: "Lai Bán Hàng", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: LAI_SUP, phone: "0900000033", name: "Lai Toàn Quyền", perms: ["SUPER_ADMIN", "PARTNER"] });
  return w;
}
/** Đơn nháp (gieo SQL) của `chu`; `hdv` = người đang phụ trách (dòng HANDLE của điều phối), nếu có. */
function nhapDon(w: W, chu: string, hdv: string | null = null): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-KT-${seq}`, chu, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'DV', 'manual', 1, ?)`).run(`${id}-s`, id, NGAY);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  if (hdv) {
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at)
      VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)`).run(uuid(), id, `pty-${hdv}`, AT, AT, AT);
  }
  return id;
}
/** Bốn dòng của nhân viên thứ ba gắn đơn: hai hành động cho phép, `order_claimed` (chữ chứa tên), `exported_png` (ẩn). */
function gieoDong(w: W, orderId: string): void {
  const ghi = w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, 'order', ?, ?, ?)");
  const dong: [string, string][] = [
    ["trip_updated", "đổi giờ đón chặng đi"],
    ["order_money_adjusted", "số khách: Tour đảo: người lớn 4 → 3 · lý do: khách bớt người"],
    ["order_claimed", `từ chưa có người phụ trách sang ${TEN}`],
    ["exported_png", "xuất ảnh"],
  ];
  dong.forEach(([a, d], i) => ghi.run(uuid(), orderId, NGUOI, a, orderId, d, `2026-10-02T00:00:0${i}.000Z`));
}
const lichSu = async (w: W, as: string, id: string): Promise<{ r: { text: string }; h: Dong[] }> => {
  const r = await w.call("GET", `/api/orders/${id}`, { as });
  assert.equal(r.status, 200, `${as}: ${r.text}`);
  return { r, h: r.json.history as Dong[] };
};
function dungDon(w: W) {
  // Đơn của SALES, HDV đang phụ trách = FIELD (SALES / ACC / ADM / FIELD / SUP cùng mở đơn này); PARTNER và INTERN mỗi người một đơn của mình.
  const chung = nhapDon(w, SALES, FIELD), doiTac = nhapDon(w, PARTNER), thucTap = nhapDon(w, INTERN);
  for (const d of [chung, doiTac, thucTap]) gieoDong(w, d);
  return { chung, doiTac, thucTap };
}

test("ADR-0131 TC1: sáu vai không thấy tên / mã người làm ở bất kỳ đâu", async () => {
  const w = dungWorld();
  const { chung, doiTac, thucTap } = dungDon(w);
  for (const [as, don] of [[SALES, chung], [ACC, chung], [ADM, chung], [FIELD, chung], [PARTNER, doiTac], [INTERN, thucTap]] as const) {
    const { r, h } = await lichSu(w, as, don);
    assert.ok(h.length > 0, `${as}: lịch sử rỗng — bài rỗng không chứng minh gì`);
    assert.ok(!r.text.includes(TEN), `${as}: lộ tên người làm`);
    assert.ok(!r.text.includes(NGUOI), `${as}: lộ mã người làm`);
    for (const e of h) {
      assert.equal(typeof e.staffName, "string", `${as}: ${e.action} staffName không phải chuỗi`);
      assert.equal(e.staffName, "", `${as}: ${e.action} còn tên`);
      assert.equal(e.staffId, null, `${as}: ${e.action} còn mã`);
    }
  }
});

test("ADR-0131 TC2: Toàn quyền thấy đủ, có tên", async () => {
  const w = dungWorld();
  const { chung } = dungDon(w);
  const { h } = await lichSu(w, SUP, chung);
  const chuyen = h.find((e) => e.action === "trip_updated");
  assert.equal(chuyen?.staffName, TEN);
  assert.equal(chuyen?.staffId, NGUOI);
  assert.ok(h.some((e) => e.action === "exported_png"), "Toàn quyền mất dòng exported_png");
  const nhan = h.find((e) => e.action === "order_claimed");
  assert.ok(nhan?.detail?.includes(`sang ${TEN}`), "Toàn quyền mất chữ order_claimed");
});

test("ADR-0131 TC3: order_claimed không chữ, exported_png không tới người không qua audit.view", async () => {
  const w = dungWorld();
  const { chung } = dungDon(w);
  const { h } = await lichSu(w, ACC, chung);
  const nhan = h.find((e) => e.action === "order_claimed");
  assert.ok(nhan, "dòng order_claimed phải còn (chỉ bỏ chữ)");
  assert.ok(!nhan.detail, `order_claimed còn chữ: ${nhan.detail}`);
  assert.ok(!h.some((e) => e.action === "exported_png"), "exported_png lọt tới Kế toán");
  assert.ok(h.some((e) => e.action === "trip_updated" && e.detail === "đổi giờ đón chặng đi"), "trip_updated mất chữ");
});

test("ADR-0131 Review Focus 1–2: tài khoản lai SALES+PARTNER và SUPER_ADMIN+PARTNER nhận lớp Đối tác không tên", async () => {
  const w = dungWorld();
  const cho = Object.keys(LICH_SU_DOI_TAC_CHO_PHEP);
  for (const lai of [LAI_SB, LAI_SUP]) {
    const don = nhapDon(w, lai);
    gieoDong(w, don);
    const { r, h } = await lichSu(w, lai, don);
    assert.ok(h.length > 0);
    assert.ok(!r.text.includes(TEN) && !r.text.includes(NGUOI), `${lai}: lộ người làm`);
    for (const e of h) assert.deepEqual([e.staffId, e.staffName], [null, ""], `${lai}: ${e.action}`);
    const acts = [...new Set(h.map((e) => e.action))];
    for (const a of acts) assert.ok(cho.includes(a), `${lai}: ${a} ngoài lớp Đối tác`);
    assert.ok(!acts.includes("order_claimed") && !acts.includes("exported_png"), `${lai}: không phải lớp Đối tác`);
  }
});

test("ADR-0030 điều 1 + Q2 (a): dòng order_handler_refused — nội bộ thấy dòng + nhãn lý do, không tên; Đối tác / lai không thấy; Toàn quyền thấy tên", async () => {
  const w = dungWorld();
  const ghi = w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, 'order_handler_refused', 'order', ?, 'Bận lịch khác', ?)");
  const chung = nhapDon(w, SALES, FIELD), lai = nhapDon(w, LAI_SB);
  for (const d of [chung, lai]) ghi.run(uuid(), d, NGUOI, d, "2026-10-02T00:00:09.000Z");
  for (const as of [SALES, ACC, ADM, FIELD]) {
    const { r, h } = await lichSu(w, as, chung);
    const tc = h.find((e) => e.action === "order_handler_refused");
    assert.ok(tc, `${as}: mất dòng Từ chối`);
    assert.equal(tc.detail, "Bận lịch khác", `${as}: chữ lý do`);
    assert.deepEqual([tc.staffId, tc.staffName], [null, ""], `${as}: lộ người làm`);
    assert.ok(!r.text.includes(TEN) && !r.text.includes(NGUOI), `${as}: lộ người làm ở đâu đó`);
  }
  const { h: hSup } = await lichSu(w, SUP, chung);
  const tcSup = hSup.find((e) => e.action === "order_handler_refused");
  assert.equal(tcSup?.staffName, TEN, "Toàn quyền phải thấy tên");
  const { h: hLai } = await lichSu(w, LAI_SB, lai);
  assert.ok(!hLai.some((e) => e.action === "order_handler_refused"), "tài khoản lai (lớp Đối tác) thấy dòng Từ chối");
});
