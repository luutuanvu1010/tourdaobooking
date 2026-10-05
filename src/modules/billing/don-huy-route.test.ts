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

const lyDoHienHanh = (w: W, orderId: string) => {
  const r = w.q(`SELECT group_code, reason_code, note, legacy FROM ord_cancel_reason r WHERE order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason x WHERE x.reclassifies_id = r.id)`, orderId)[0];
  return r ? ({ ...r } as { group_code: string; reason_code: string; note: string | null; legacy: number }) : undefined;
};

test("NT-L1 (đ8): huỷ thiếu lý do → 400; lý do lạ → 400; 'Khác' thiếu ghi chú → 400; ghi chú có SĐT → 400; đơn không đổi", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  for (const [lyDo, ghiChu] of [[undefined, undefined], ["BLA", undefined], ["OTHER", undefined], ["OTHER", "gọi 0912345678"]] as const) {
    const r = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "cancelled", ...(lyDo ? { lyDo } : {}), ...(ghiChu ? { ghiChu } : {}) } });
    assert.equal(r.status, 400, `${lyDo}/${ghiChu}: ${r.text}`);
  }
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0]!.status, "confirmed");
  assert.equal(lyDoHienHanh(w, id), undefined, "không dòng lý do nào");
});

test("NT-L2 (Đ-2, H-C4): nhóm 'Công ty huỷ' — Bán hàng → 403; Quản trị, Toàn quyền → được; dòng lý do lưu đúng nhóm; nhật ký ghi nhãn", async () => {
  const w = setup();
  const a = donDaXacNhan(w);
  const r403 = await huy(w, SALES, a, "THOI_TIET");
  assert.equal(r403.status, 403, r403.text);
  assert.match(r403.json.error.message, /Quản trị hoặc Toàn quyền/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", a)[0]!.status, "confirmed");
  assert.equal((await huy(w, ADMIN, a, "THOI_TIET")).status, 200);
  assert.deepEqual(lyDoHienHanh(w, a), { group_code: "CONG_TY_HUY", reason_code: "THOI_TIET", note: null, legacy: 0 });
  const b = donDaXacNhan(w);
  assert.equal((await huy(w, SA, b, "HET_CHO")).status, 200);
  assert.equal(lyDoHienHanh(w, b)!.group_code, "CONG_TY_HUY");
  const c = donDaXacNhan(w);
  assert.equal((await huy(w, SALES, c, "SAI_THONG_TIN")).status, 200, "Bán hàng chọn được 'lập lại'");
  assert.equal(lyDoHienHanh(w, c)!.group_code, "LAP_LAI");
  const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'cancelled'", c)[0] as { detail: string };
  assert.equal(nk.detail, "Sai thông tin — lập lại đơn (Huỷ để lập lại / trùng đơn)", "nhật ký ghi nhãn, không mã thô");
});

test("NT-L4 (lời chủ (a)): HDV huỷ 'Không liên hệ được với khách' → nhóm khách huỷ; 'Khác' → chưa kết luận, ghi chú lưu; nhật ký giữ nguyên văn", async () => {
  const w = setup();
  const a = donDaXacNhan(w);
  const r = await w.call("POST", `/api/orders/${a}/handler-cancel`, { as: HDV, body: { reason: "not_reachable" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(lyDoHienHanh(w, a), { group_code: "KHACH_HUY", reason_code: "KHONG_LIEN_HE", note: null, legacy: 0 });
  const b = donDaXacNhan(w);
  assert.equal((await w.call("POST", `/api/orders/${b}/handler-cancel`, { as: HDV, body: { reason: "other", note: "Khách ốm nặng" } })).status, 200);
  assert.deepEqual(lyDoHienHanh(w, b), { group_code: "CHUA_KET_LUAN", reason_code: "OTHER", note: "Khách ốm nặng", legacy: 0 });
  assert.equal((w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_cancelled_by_field'", b)[0] as { detail: string }).detail, "Khách ốm nặng");
});

test("NT-L5/L6 (X-2): phân loại — Bán hàng, Kế toán → 403; đơn chưa huỷ → 409; chưa kết luận → Quản trị phân loại 201 + Location; lần hai / đã kết luận → 409", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  const pl = (as: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${id}/cancel-reason`, { as, body });
  assert.equal((await pl(ADMIN, { nhom: "KHACH_HUY", lyDo: "Đã gọi khách" })).status, 409, "đơn chưa huỷ");
  assert.equal((await huy(w, SALES, id, "OTHER", "Khách ốm")).status, 200);
  assert.equal((await pl(SALES, { nhom: "KHACH_HUY", lyDo: "x" })).status, 403);
  assert.equal((await pl(KT, { nhom: "KHACH_HUY", lyDo: "x" })).status, 403);
  assert.equal((await pl(ADMIN, { nhom: "CHUA_KET_LUAN", lyDo: "x" })).status, 400);
  assert.equal((await pl(ADMIN, { nhom: "KHACH_HUY" })).status, 400, "lý do bắt buộc");
  const ok = await pl(ADMIN, { nhom: "CONG_TY_HUY", lyDo: "Tàu hỏng — lỗi nhà cung cấp" });
  assert.equal(ok.status, 201, ok.text);
  assert.equal(ok.headers.get("location"), `/order?id=${id}`);
  assert.equal(lyDoHienHanh(w, id)!.group_code, "CONG_TY_HUY");
  assert.equal((await pl(SA, { nhom: "KHACH_HUY", lyDo: "Đổi ý" })).status, 409, "đã kết luận → không đổi nhóm lần nữa (NT-L6)");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_cancel_reason_classified'", id)[0]!.n, 1);
  const khac = donDaXacNhan(w);
  assert.equal((await huy(w, SALES, khac, "KHACH_DOI_Y")).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${khac}/cancel-reason`, { as: ADMIN, body: { nhom: "CONG_TY_HUY", lyDo: "x" } })).status, 409, "khách huỷ đã kết luận");
});

test("NT-H10 (đ13, H-C9): lần thu lên đơn ĐÃ HUỶ — Bán hàng, HDV → 403 (cờ ghi thu tắt); Kế toán, Toàn quyền → 201", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await huy(w, SALES, id)).status, 200);
  assert.equal((await thu(w, SALES, id, 100_000)).status, 403);
  assert.equal((await thu(w, HDV, id, 100_000)).status, 403);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: SALES })).json.coTheGhiThu, false);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json.coTheGhiThu, true);
  assert.equal((await thu(w, KT, id, 100_000, "cong_ty")).status, 201);
  assert.equal((await thu(w, SA, id, 50_000, "cong_ty")).status, 201);
});
