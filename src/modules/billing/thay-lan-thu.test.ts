// "Sửa khoản thu đã ghi" + I1 mọi lúc sau Đã giao (ADR-0088 đ1–đ5, đ8 — TNV-G3 phần thi công được; đ9 phân định trách nhiệm DỪNG chờ chủ) — hành vi qua ROUTE THẬT
// trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch). Lớp CSDL (0083) ở src/migrations-thay-lan-thu.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN 1.000.000, ngày đi hôm nay (bấm Đã giao được), người phụ trách = HDV. */
function don(w: W): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-${seq}`, SALES, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id); // 0112: máy chủ chụp lúc xác nhận — thiếu bản chụp thì trigger bil_posting_delivered_terms chặn «Đã giao»
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown = "toi", hinhThuc = "CASH") =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc, nguoiThu } });
const thay = (w: W, as: string, body: Record<string, unknown>) => w.call("POST", "/api/ledger/receipt-replacements", { as, body });
const lanThu = (w: W, orderId: string, soTien: number) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND amount = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY created_at", orderId, soTien)[0].id);
const tien = async (w: W, orderId: string) => (await w.call("GET", `/api/orders/${orderId}/payments`, { as: KT })).json;
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
/** Đơn đã ở bước Đã giao: HDV thu 600.000 (thật ra khách CHUYỂN KHOẢN cho công ty — ghi nhầm người thu) + 400.000 tiền mặt, rồi bấm Đã giao. */
async function daGiaoGhiNham(w: W): Promise<string> {
  const id = don(w);
  assert.equal((await thu(w, HDV, id, 600_000)).status, 201);
  assert.equal((await thu(w, HDV, id, 400_000)).status, 201);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(g.status, 200, g.text);
  return id;
}

test("G3 (tình huống 30, KD06): sau Đã giao — 'Đảo' đơn lẻ ⇒ 409 chỉ đường 'Sửa khoản thu đã ghi'; Thay 600.000 HDV → 600.000 Công ty thu – CK ⇒ 201, đã thu giữ 1.000.000, HDV còn giữ 400.000, nhật ký số trước / sau", async () => {
  const w = setup();
  const id = await daGiaoGhiNham(w);
  const r600 = lanThu(w, id, 600_000);
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: r600, lyDo: "ghi nhầm người thu" } });
  assert.equal(dao.status, 409, dao.text);
  assert.equal(dao.json.error.code, "receipt_after_delivered");
  assert.match(dao.json.error.message, /Sửa khoản thu đã ghi/);
  const r = await thay(w, KT, { orderId: id, cu: [r600], moi: [{ soTien: 600_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTH0001", soThucChuyen: 600_000 }], lyDo: "Khách chuyển khoản cho công ty, HDV ghi nhầm" });
  assert.equal(r.status, 201, r.text);
  const t = await tien(w, id);
  assert.equal(t.daThu, 1_000_000, "đã thu không đổi (I1)");
  assert.deepEqual(t.keToan.dangGiu.map((d: { soTien: number }) => d.soTien), [400_000], "HDV chỉ còn giữ 400.000 tiền mặt");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'REPLACEMENT'", id), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND replacement_id IS NOT NULL", id), 2, "một lần thu mới + một dòng đảo mang dấu nối");
  const nk = String(w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'ledger_receipt_replaced'", id)[0].detail);
  assert.match(nk, /thay 1 khoản thu \(600\.000 ₫\) bằng 1 khoản thu \(600\.000 ₫\) · đã thu trước 1\.000\.000 ₫ → sau 1\.000\.000 ₫/);
});

test("đ2 + đ1: Thay làm lệch I1 (600.000 → 500.000 sau Đã giao) ⇒ 409 replacement_i1, KHÔNG ghi gì; lý do < 10 ký tự ⇒ 400; ngày phát sinh ngoài tháng đang mở ⇒ 400; Bán hàng ⇒ 403; lần thu đơn khác ⇒ 404", async () => {
  const w = setup();
  const id = await daGiaoGhiNham(w);
  const r600 = lanThu(w, id, 600_000);
  const n0 = dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id);
  const lech = await thay(w, KT, { orderId: id, cu: [r600], moi: [{ soTien: 500_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${HDV}` } }], lyDo: "HDV ghi nhầm số tiền thu" });
  assert.equal(lech.status, 409, lech.text);
  assert.equal(lech.json.error.code, "replacement_i1");
  assert.match(lech.json.error.message, /phải bằng phải thu của đơn lúc Đã giao \(1\.000\.000 ₫\)/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), n0);
  const dung = { orderId: id, cu: [r600], moi: [{ soTien: 600_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTH0002", soThucChuyen: 600_000 }] };
  assert.equal((await thay(w, KT, { ...dung, lyDo: "nhầm" })).status, 400);
  const truocThang = `${vnHomNay().slice(0, 4)}-01-01` < `${vnHomNay().slice(0, 8)}01` ? `${vnHomNay().slice(0, 4)}-01-01` : "2025-12-31";
  assert.equal((await thay(w, KT, { ...dung, lyDo: "Khách chuyển khoản cho công ty", ngayPhatSinh: truocThang })).status, 400, "tháng đã qua");
  assert.equal((await thay(w, SALES, { ...dung, lyDo: "Khách chuyển khoản cho công ty" })).status, 403);
  const khac = don(w);
  assert.equal((await thu(w, HDV, khac, 100_000)).status, 201);
  assert.equal((await thay(w, KT, { ...dung, cu: [lanThu(w, khac, 100_000)], lyDo: "Khách chuyển khoản cho công ty" })).status, 404);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), n0);
});

test("đ2 (A-B18): TRƯỚC Đã giao Thay dùng được, kể cả đổi số (I1 chưa áp); N → M: hai lần thu cũ → một lần thu mới", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, 300_000)).status, 201);
  assert.equal((await thu(w, HDV, id, 200_000)).status, 201);
  const r = await thay(w, KT, { orderId: id, cu: [lanThu(w, id, 300_000), lanThu(w, id, 200_000)], moi: [{ soTien: 450_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTH0003", soThucChuyen: 450_000 }], lyDo: "Gộp hai lần ghi nhầm thành một chuyển khoản" });
  assert.equal(r.status, 201, r.text);
  assert.equal((await tien(w, id)).daThu, 450_000);
});

test("đ4 (iv): hoàn cho khách SAU Đã giao ⇒ 409 câu nguyên văn ADR (chờ phân định trách nhiệm — đ9); đ5: Hoàn thành khi I1 lệch ⇒ 409 + lý do trên màn đơn", async () => {
  const w = setup();
  const id = await daGiaoGhiNham(w);
  const h = await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: "cong_ty" } });
  assert.equal(h.status, 409, h.text);
  assert.equal(h.json.error.code, "refund_after_delivered");
  assert.equal(h.json.error.message, "Đơn đã ở bước Đã giao — hoàn cho khách cần phân định trách nhiệm trước; báo Quản trị.");
  // HDV nộp đủ để chỉ còn điều kiện I1; dữ liệu cũ lệch (SQL tay, gỡ trigger 0083 trong DB thử) ⇒ Hoàn thành bị chặn.
  assert.equal((await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 1_000_000 }] } })).status, 201);
  w.sqlite.exec("DROP TRIGGER bil_receipt_after_delivered");
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
    reverses_id, created_at, updated_at) SELECT 'dao-tay', order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, id, ?, ?
    FROM bil_payment_receipt WHERE id = ?`).run(AT, AT, lanThu(w, id, 400_000));
  const t = await tien(w, id);
  assert.equal(t.coTheHoanThanh, false);
  assert.equal(t.lyDoChuaHoanThanh.ma, "due_mismatch");
  const c = await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} });
  assert.equal(c.status, 409, c.text);
  assert.match(c.json.error.message, /Sửa khoản thu đã ghi/);
});

test("kiểm độc lập vòng 3 (CAO): khoản 'Công ty thu – CK' do HDV khai còn CHỜ XÁC NHẬN ⇒ Thay bị từ chối 409 (ADR-0088 đ4 (i); ADR-0120: khoản đang đối chiếu, không dòng giữ hộ); lần thu tiền mặt HDV giữ: Thay giữ đúng người thu thì HDV vẫn giữ", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, 600_000, "cong_ty", "BANK_TRANSFER")).status, 201, "HDV khai Công ty thu – CK");
  assert.equal((await thu(w, HDV, id, 400_000)).status, 201);
  const ck = lanThu(w, id, 600_000);
  const r = await thay(w, KT, { orderId: id, cu: [ck], moi: [{ soTien: 500_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTH0004", soThucChuyen: 500_000 }], lyDo: "HDV khai nhầm số chuyển khoản" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "ck_cho_xac_nhan");
  assert.deepEqual((await tien(w, id)).keToan.dangGiu.map((d: { soTien: number }) => d.soTien), [400_000], "ADR-0120: HDV chỉ giữ 400.000 tiền mặt; 600.000 đang đối chiếu không tạo nợ");
  const giu = await thay(w, KT, { orderId: id, cu: [lanThu(w, id, 400_000)], moi: [{ soTien: 350_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${HDV}` } }], lyDo: "HDV ghi nhầm số tiền mặt" });
  assert.equal(giu.status, 201, giu.text);
  assert.deepEqual((await tien(w, id)).keToan.dangGiu.map((d: { soTien: number }) => d.soTien), [350_000]);
  const nk = String(w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'ledger_receipt_replaced'", id)[0].detail);
  assert.doesNotMatch(nk, /đổi người thu/);
});

test("kiểm độc lập vòng 3 (THẤP 3): đơn Đã giao đã lệch từ trước (mọi lần thu bị đảo trước bản vá) — Thay KHÔNG lần thu cũ (N = 0) ghi bù đúng số ⇒ 201, Hoàn thành được; thừa ⇒ 409; đơn chưa Đã giao ⇒ 400 (ghi lần thu như thường)", async () => {
  const w = setup();
  const id = await daGiaoGhiNham(w);
  w.sqlite.exec("DROP TRIGGER bil_receipt_after_delivered");
  for (const so of [600_000, 400_000]) {
    w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
      reverses_id, created_at, updated_at) SELECT ?, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, id, ?, ?
      FROM bil_payment_receipt WHERE id = ?`).run(`dao-cu-${so}`, AT, AT, lanThu(w, id, so));
  }
  assert.equal((await tien(w, id)).daThu, 0, "dữ liệu cũ: tiền biến khỏi sổ");
  const thua = await thay(w, KT, { orderId: id, cu: [], moi: [{ soTien: 1_100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Ghi bù hai lần thu bị đảo nhầm" });
  assert.equal(thua.json.error.code, "replacement_i1");
  const bu = await thay(w, KT, { orderId: id, cu: [], moi: [{ soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${HDV}` } }], lyDo: "Ghi bù hai lần thu bị đảo nhầm" });
  assert.equal(bu.status, 201, bu.text);
  assert.equal((await tien(w, id)).daThu, 1_000_000);
  const chua = don(w);
  assert.equal((await thay(w, KT, { orderId: chua, cu: [], moi: [{ soTien: 1_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Ghi bù khi chưa Đã giao" })).status, 400);
});

test("kiểm độc lập vòng 4: hồ sơ người thu (nguoiThuPartyId) CHỈ Kế toán / Toàn quyền thấy — Bán hàng và HDV nhận null", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, 300_000)).status, 201);
  const ids = async (as: string) => (await w.call("GET", `/api/orders/${id}/payments`, { as })).json.lanThu.map((l: { nguoiThuPartyId: string | null }) => l.nguoiThuPartyId);
  assert.deepEqual(await ids(KT), [`pty-${HDV}`]);
  assert.deepEqual(await ids(SALES), [null]);
  assert.deepEqual(await ids(HDV), [null]);
});

test("hai lớp tách riêng: gỡ trigger 0083 trong DB thử — máy chủ VẪN trả 409 cho đảo đơn lẻ và hoàn sau Đã giao (không dựa một mình vào CSDL)", async () => {
  const w = setup();
  const id = await daGiaoGhiNham(w);
  w.sqlite.exec("DROP TRIGGER bil_receipt_after_delivered");
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: lanThu(w, id, 600_000), lyDo: "ghi nhầm người thu" } });
  assert.equal(dao.json.error.code, "receipt_after_delivered");
  const h = await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: "cong_ty" } });
  assert.equal(h.json.error.code, "refund_after_delivered");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), 2, "không ghi gì");
});
