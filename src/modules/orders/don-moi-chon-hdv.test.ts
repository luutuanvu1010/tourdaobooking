// Đơn mới KHÔNG tự gắn người lập; người lập chọn hướng dẫn viên ngay trong lô tạo đơn (ADR-0030 S20-4, ADR-0020 điều 1, Q-C). Hành vi API thật
// (POST /api/orders) trên SQLite thật qua khung tests/audit/harness.mjs (cùng khuôn xem-don-theo-quyen.test.ts, dispatch/nhan-don.test.ts).
// Trọng tâm:
//  - không chọn → không có dòng `HANDLE` nào, nhật ký chỉ `created` (mọi quyền lập đơn được, kể cả Bán hàng/Quản trị/Toàn quyền — trước đây tự gắn);
//  - chọn người hợp lệ → MỘT lô: đơn + đúng một dòng `HANDLE` mở + nhật ký `order_handler_changed` ("từ chưa có người phụ trách sang <tên>"), và
//    `dsp_assignment.valid_from_at` = `created_at` của dòng nhật ký `created` = `created_at` của dòng `order_handler_changed` (CÙNG một mốc `at` của
//    lô — hệ thống Thông báo dựa vào phép so này để xếp đơn "chờ nhận" hay "đã có người");
//  - chọn người KHÔNG đủ điều kiện (`checkAssignee` của dispatch: đã ngưng, chưa có hồ sơ, tài khoản lai, không đủ cấp, không tồn tại) → 400
//    `invalid_assignee` và KHÔNG có đơn nào được tạo;
//  - Thực tập / Đối tác gửi kèm người được chọn → 403 (G4: không có `dispatch.assign`), đứng TRƯỚC mọi 400, không tạo đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LAI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // FIELD + PARTNER (tài khoản lai)
const NGHI = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // FIELD đã ngưng hoạt động
const KHONG_HO_SO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // FIELD chưa có hồ sơ (staff.party_id NULL)
const KHONG_CO = "00000000-0000-4000-8000-00000000abcd"; // không có tài khoản nào

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000010", name: "Lai Đôi", perms: ["FIELD", "PARTNER"] });
  seedStaff(w.sqlite, { id: NGHI, phone: "0900000011", name: "Đã Nghỉ", perms: ["FIELD"] });
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${NGHI}'`);
  seedStaff(w.sqlite, { id: KHONG_HO_SO, phone: "0900000012", name: "Chưa Hồ Sơ", perms: ["FIELD"] });
  w.sqlite.exec(`UPDATE staff SET party_id = NULL WHERE id = '${KHONG_HO_SO}'`);
  // API không nhận dịch vụ nhập tay mới (DK-T3-01) → đơn thử dùng dịch vụ danh mục giả; Đối tác phải dùng đúng giá danh mục (R2).
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  depositAmount: 200000, depositMethod: "cash", ...extra,
});
const count = (w: any, sql: string, ...a: unknown[]) => w.q(sql, ...a)[0].n;
const actionsOf = (w: any, orderId: string) => w.q("SELECT action FROM audit_log WHERE order_id = ? ORDER BY created_at, rowid", orderId).map((r: any) => r.action);
/** Ảnh chụp "không có gì được ghi": số đơn, số dòng phân công, số dòng nhật ký. */
const snapshot = (w: any) => [count(w, "SELECT count(*) n FROM orders"), count(w, "SELECT count(*) n FROM dsp_assignment"), count(w, "SELECT count(*) n FROM audit_log")];

test("(1) lập đơn KHÔNG chọn hướng dẫn viên → không có dòng HANDLE nào, nhật ký chỉ 'created' — với Bán hàng, Quản trị, Toàn quyền, Thực tập, Đối tác (trước đây: ba quyền đầu tự gắn người lập)", async () => {
  for (const [label, as] of [["Bán hàng", SALES], ["Quản trị", ADM], ["Toàn quyền", SUP], ["Thực tập", INTERN], ["Đối tác", PARTNER]] as const) {
    const w = setup();
    const r = await w.call("POST", "/api/orders", { as, body: orderBody() });
    assert.equal(r.status, 201, `${label}: ${r.text}`);
    const orderId = r.json.order.id;
    assert.equal(count(w, "SELECT count(*) n FROM dsp_assignment WHERE order_id = ?", orderId), 0, `${label}: đơn mới không có dòng phân công nào (không tự gắn người lập — ADR-0030 S20-4)`);
    assert.deepEqual(actionsOf(w, orderId), ["created"], `${label}: nhật ký chỉ có dòng lập đơn`);
  }
});

test("(1b) handlerStaffId: null (hoặc vắng) = không chọn — đơn vẫn tạo, không có dòng HANDLE", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: orderBody({ handlerStaffId: null }) });
  assert.equal(r.status, 201, r.text);
  assert.equal(count(w, "SELECT count(*) n FROM dsp_assignment WHERE order_id = ?", r.json.order.id), 0);
  assert.deepEqual(actionsOf(w, r.json.order.id), ["created"]);
});

test("(2) Bán hàng lập đơn kèm hướng dẫn viên hợp lệ → đúng một dòng HANDLE mở mang hồ sơ HDV, nhật ký 'created' + 'order_handler_changed', CÙNG một mốc thời gian", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: orderBody({ handlerStaffId: FIELD }) });
  assert.equal(r.status, 201, r.text);
  const orderId = r.json.order.id;
  const rows = w.q("SELECT party_id, task_kind_code, status_code, valid_from_at, valid_to_at, created_by, order_service_id FROM dsp_assignment WHERE order_id = ?", orderId);
  assert.equal(rows.length, 1, "đúng một dòng phân công");
  assert.deepEqual(
    { ...rows[0], valid_from_at: undefined },
    { party_id: `pty-${FIELD}`, task_kind_code: "HANDLE", status_code: "PENDING", valid_from_at: undefined, valid_to_at: null, created_by: SALES, order_service_id: null },
    "dòng HANDLE hạt đơn, đang mở, mang hồ sơ HDV, người thao tác = người lập",
  );
  const logs = w.q("SELECT action, staff_id, detail, created_at FROM audit_log WHERE order_id = ? ORDER BY created_at, rowid", orderId);
  assert.deepEqual(logs.map((l: any) => l.action), ["created", "order_handler_changed"]);
  assert.equal(logs[1].detail, "từ chưa có người phụ trách sang Hướng Dẫn", "nhật ký chỉ ghi tên (không SĐT)");
  assert.equal(logs[1].staff_id, SALES, "người thao tác = người lập");
  // Ràng buộc dữ liệu cho hệ thống Thông báo: CÙNG một mốc `at` của lô tạo đơn, lệch 1 mili-giây cũng sai.
  const createdAt = logs[0].created_at;
  assert.equal(rows[0].valid_from_at, createdAt, "valid_from_at của dòng HANDLE phải BẰNG ĐÚNG created_at của dòng nhật ký 'created'");
  assert.equal(logs[1].created_at, createdAt, "dòng 'order_handler_changed' cùng mốc với 'created'");
  assert.equal(w.q("SELECT created_at FROM orders WHERE id = ?", orderId)[0].created_at, createdAt, "và cùng mốc với orders.created_at");
});

test("(2b) Quản trị, Toàn quyền lập kèm HDV; Bán hàng chọn CHÍNH MÌNH → 201, đúng một dòng HANDLE của người được chọn", async () => {
  for (const [label, as, pick] of [["Quản trị chọn HDV", ADM, FIELD], ["Toàn quyền chọn HDV", SUP, FIELD], ["Bán hàng chọn chính mình", SALES, SALES]] as const) {
    const w = setup();
    const r = await w.call("POST", "/api/orders", { as, body: orderBody({ handlerStaffId: pick }) });
    assert.equal(r.status, 201, `${label}: ${r.text}`);
    const rows = w.q("SELECT party_id FROM dsp_assignment WHERE order_id = ? AND valid_to_at IS NULL", r.json.order.id);
    assert.deepEqual(rows.map((x: any) => x.party_id), [`pty-${pick}`], label);
  }
});

test("(3) chọn người KHÔNG đủ điều kiện (đã ngưng, chưa có hồ sơ, tài khoản lai, kế toán, không tồn tại) → 400 invalid_assignee, KHÔNG có đơn nào được tạo", async () => {
  for (const [label, pick] of [["đã ngưng", NGHI], ["chưa có hồ sơ", KHONG_HO_SO], ["tài khoản lai FIELD+PARTNER", LAI], ["kế toán", ACC], ["không tồn tại", KHONG_CO]] as const) {
    const w = setup();
    const before = snapshot(w);
    const r = await w.call("POST", "/api/orders", { as: SALES, body: orderBody({ handlerStaffId: pick }) });
    assert.equal(r.status, 400, `${label}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_assignee", label);
    assert.deepEqual(snapshot(w), before, `${label}: số đơn / dòng phân công / dòng nhật ký không đổi`);
  }
});

test("(3b) handlerStaffId sai dạng (không phải mã tài khoản) → 400 invalid_input, không tạo đơn", async () => {
  for (const bad of ["", "không phải id", 7, true, { id: FIELD }]) {
    const w = setup();
    const before = snapshot(w);
    const r = await w.call("POST", "/api/orders", { as: SALES, body: orderBody({ handlerStaffId: bad }) });
    assert.equal(r.status, 400, `${JSON.stringify(bad)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", JSON.stringify(bad));
    assert.deepEqual(snapshot(w), before, JSON.stringify(bad));
  }
});

test("(4) Thực tập, Đối tác gửi kèm handlerStaffId → 403 (không có dispatch.assign — G4), số đơn không đổi; 403 đứng TRƯỚC 400 (kể cả thân đơn sai / id sai dạng)", async () => {
  for (const [label, as] of [["Thực tập", INTERN], ["Đối tác", PARTNER]] as const) {
    for (const [what, body] of [
      ["HDV hợp lệ", orderBody({ handlerStaffId: FIELD })],
      ["id sai dạng", orderBody({ handlerStaffId: "" })],
      ["thân đơn sai", { handlerStaffId: FIELD }],
    ] as const) {
      const w = setup();
      const before = snapshot(w);
      const r = await w.call("POST", "/api/orders", { as, body });
      assert.equal(r.status, 403, `${label} — ${what}: ${r.text}`);
      assert.equal(r.json.error.code, "forbidden", `${label} — ${what}`);
      assert.deepEqual(snapshot(w), before, `${label} — ${what}: không ghi gì`);
    }
  }
});
