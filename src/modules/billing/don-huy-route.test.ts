// Đơn huỷ và cọc (ADR-0089) — hành vi qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch).
// Kế hoạch Đợt 1: NT-1 (bốn bề mặt "còn lại" = 0), NT-5 (biên nhận không đoán), NT-L* (lý do huỷ), NT-H10 (lần thu lên đơn huỷ), NT-H*/N* (duyệt, chi, chuyển,
// hoàn ngoài — Phần B).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const KT2 = "77777777-7777-4777-8777-777777777777";
const QTKT = "88888888-8888-4888-8888-888888888888";
const AT = "2026-09-01T00:00:00.000Z";
const vnNgay = (d: number) => new Date(Date.now() + 7 * 3600_000 + d * 86400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
export function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADMIN, "0900000004", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]], [DT, "0900000007", "Đối Tác", ["PARTNER"]],
    [KT2, "0900000008", "Mai Kế Toán", ["ACCOUNTING"]], [QTKT, "0900000009", "Kiêm Hai Việc", ["ADMIN", "ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN (tổng `total`, một dịch vụ ngày đi `depart`) của Bán hàng, người phụ trách = HDV. */
function donDaXacNhan(w: W, o: { total?: number; depart?: string | null } = {}): string {
  const id = uuid();
  const total = o.total ?? 2_000_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, total, total, total, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, o.depart === undefined ? vnNgay(30) : o.depart);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, total, total);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown = "toi") =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu } });
const huy = (w: W, as: string, orderId: string, lyDo: unknown = "KHACH_DOI_Y", ghiChu?: string) =>
  w.call("POST", `/api/orders/${orderId}/status`, { as, body: { status: "cancelled", lyDo, ...(ghiChu === undefined ? {} : { ghiChu }) } });

test("NT-1 (đ1, H-C8): đơn 2.000.000, thu 500.000, huỷ → 'còn lại' = 0 ở trang đơn, danh sách nhiều đơn và biên nhận (không còn 1.500.000)", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, id, 500_000)).status, 201);
  const h = await huy(w, SALES, id);
  assert.equal(h.status, 200, h.text);
  const p = await w.call("GET", `/api/orders/${id}/payments`, { as: SALES });
  assert.equal(p.status, 200, p.text);
  assert.deepEqual([p.json.conLai, p.json.du], [0, 0], "trang đơn");
  const b = await w.call("POST", "/api/ledger/balances", { as: SALES, body: { orderIds: [id] } });
  assert.equal(b.status, 200, b.text);
  assert.deepEqual([b.json.balances[id].conLai, b.json.balances[id].du], [0, 0], "danh sách / Trang chủ / Việc của tôi");
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.receipt.conLai, 0, "biên nhận gửi khách");
});
