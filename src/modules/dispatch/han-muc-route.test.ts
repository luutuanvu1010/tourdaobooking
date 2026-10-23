// Hạn mức «Từ chối» (ADR-0032; kế hoạch 2026-10-23 mục 8 HM-1…HM-15): hành vi API THẬT trên SQLite thật qua khung tests/audit/harness.mjs (khuôn tu-choi.test.ts).
// Đọc thẳng `dsp_release_event`, `dsp_assignment`, `audit_log` để kiểm dữ liệu sau lệnh. Luật đếm thuần + bản SQL: src/shared/han-muc-tu-choi.test.ts,
// src/modules/dispatch/han-muc-sql.test.ts; lô ghi: service.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const FIELD2 = "55555555-5555-4555-8555-555555555555";
const SUP = "66666666-6666-4666-8666-666666666666";
const ACC = "77777777-7777-4777-8777-777777777777";
const ACC_FIELD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SALES_FIELD = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PARTNER = "88888888-8888-4888-8888-888888888888";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn A", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: FIELD2, phone: "0900000005", name: "Hướng Dẫn B", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000006", name: "Toàn quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000007", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ACC_FIELD, phone: "0900000012", name: "Kế Toán Kiêm", perms: ["ACCOUNTING", "FIELD"] });
  seedStaff(w.sqlite, { id: SALES_FIELD, phone: "0900000013", name: "Bán Hàng Kiêm", perms: ["SALES", "FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678", ...extra,
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
});
/** Đơn đã xác nhận, CHƯA có người phụ trách (do Bán hàng An lập). */
async function donCho(w: any): Promise<string> {
  const created = await w.call("POST", "/api/orders", { as: SALES, body: orderBody() });
  assert.equal(created.status, 201, created.text);
  const id = created.json.order.id;
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  return id;
}
const nhan = (w: any, id: string, as: string) => w.call("PUT", `/api/orders/${id}/handler`, { as, body: { staffId: as } });
const giao = (w: any, id: string, as: string, staffId: string) => w.call("PUT", `/api/orders/${id}/handler`, { as, body: { staffId } });
const suKien = (w: any, where = "1 = 1", ...a: unknown[]): any[] =>
  w.q(`SELECT party_id, order_id, kind_code, reason_code, occurred_at, created_by FROM dsp_release_event WHERE ${where} ORDER BY seq`, ...a).map((r: any) => ({ ...r }));

// ---- HM-13: mọi đường MỞ dòng phụ trách ghi sự kiện cùng lô ----
test("HM-13: lập đơn có chọn HDV → 1 ASSIGN; tự Nhận → 1 CLAIM; giao đơn chưa có người → 1 ASSIGN; đổi người A→B → 1 ASSIGN cho B, 0 cho A; nhánh thua → 0", async () => {
  const w = setup();
  const lap = await w.call("POST", "/api/orders", { as: SALES, body: orderBody({ handlerStaffId: FIELD }) });
  assert.equal(lap.status, 201, lap.text);
  const d1 = lap.json.order.id;
  const mo1 = w.q("SELECT valid_from_at FROM dsp_assignment WHERE order_id = ?", d1)[0].valid_from_at;
  assert.deepEqual(suKien(w, "order_id = ?", d1), [{ party_id: `pty-${FIELD}`, order_id: d1, kind_code: "ASSIGN", reason_code: null, occurred_at: mo1, created_by: SALES }]);

  const d2 = await donCho(w);
  assert.equal((await nhan(w, d2, FIELD)).status, 200);
  assert.equal((await nhan(w, d2, FIELD2)).status, 409, "thua: đã có người");
  assert.deepEqual(suKien(w, "order_id = ?", d2).map((e: any) => [e.party_id, e.kind_code, e.created_by]), [[`pty-${FIELD}`, "CLAIM", FIELD]]);

  const d3 = await donCho(w);
  assert.equal((await giao(w, d3, ADM, FIELD)).status, 200);
  assert.equal((await giao(w, d3, ADM, FIELD2)).status, 200, "đổi người A→B");
  assert.deepEqual(suKien(w, "order_id = ?", d3).map((e: any) => [e.party_id, e.kind_code, e.created_by]), [[`pty-${FIELD}`, "ASSIGN", ADM], [`pty-${FIELD2}`, "ASSIGN", ADM]]);
  // Mọi dòng HANDLE mở có đúng sự kiện CLAIM/ASSIGN cùng người, cùng đơn, cùng mốc (lưới R-DSP-6).
  const thieu = w.q(`SELECT count(*) n FROM dsp_assignment a WHERE a.task_kind_code = 'HANDLE' AND NOT EXISTS (SELECT 1 FROM dsp_release_event e
    WHERE e.party_id = a.party_id AND e.order_id = a.order_id AND e.kind_code IN ('CLAIM', 'ASSIGN') AND e.occurred_at = a.valid_from_at)`)[0].n;
  assert.equal(thieu, 0);
});
