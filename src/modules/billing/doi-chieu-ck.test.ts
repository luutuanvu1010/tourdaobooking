// ADR-0120 Điều 1 qua ROUTE THẬT (khung thử): khoản "Công ty thu – chuyển khoản" do người không phải Kế toán khai KHÔNG sinh dòng giữ hộ; khoản ở trạng thái
// ĐANG ĐỐI CHIẾU tới khi Kế toán bấm "Công ty đã nhận"; đơn còn khoản đang đối chiếu chưa "Đã giao" được; quá 3 ngày thì nhắc Kế toán; khoản CŨ (đã có dòng
// giữ hộ trước ngày áp luật) vẫn đảo dòng giữ hộ khi xác nhận. Bảng `bil_receipt_recon` (migration 0099) là dấu phân biệt.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";
import { nhacDoiChieu, SO_NGAY_NHAC_DOI_CHIEU } from "./rules.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const lui = (ngay: number) => new Date(Date.parse(`${vnHomNay()}T00:00:00Z`) - ngay * 86_400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `98989898-9898-4898-8898-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN `tong` đồng, ngày đi hôm nay, HDV phụ trách. */
function don(w: W, tong = 1_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id); // 0112: máy chủ chụp lúc xác nhận — thiếu bản chụp thì trigger bil_posting_delivered_terms chặn «Đã giao»
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const ck = (soTien: number, them: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", ...them });
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const xacNhan = (w: W, receiptId: string, body: unknown = {}, as = KT) => w.call("POST", `/api/ledger/company-receipts/${receiptId}/confirm`, { as, body });
const cuoi = (w: W, orderId: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1", orderId)[0].id);
const n = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const MA = (so: number, ma = "DC0001") => ({ maGiaoDich: ma, soThucChuyen: so });
const tien = async (w: W, as: string, orderId: string) => (await w.call("GET", `/api/orders/${orderId}/payments`, { as })).json;

/** Khoản CŨ (trước ngày áp luật): lần thu Công ty thu + phiếu RECEIPT + dòng giữ hộ trên HDV, dựng tay như mã cũ từng ghi. */
function khoanCu(w: W, orderId: string, soTien: number): string {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const rid = uuid();
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
    reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, ?, 'COMPANY', 'CASH', ?, 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?)`)
    .run(rid, orderId, soTien, ct, ct, vnHomNay(), AT, HDV, AT, HDV);
  const pid = uuid();
  w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'RECEIPT', ?, NULL, NULL, ?, NULL, ?, ?, ?, ?)`).run(pid, orderId, vnHomNay(), AT, HDV, AT, HDV);
  w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
    created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'HELD', ?, NULL, NULL, ?, NULL, ?, ?, ?, ?)`).run(uuid(), pid, `pty-${HDV}`, ct, soTien, orderId, rid, AT, HDV, AT, HDV);
  return rid;
}

test("khoản HDV khai CK – Công ty thu: KHÔNG dòng giữ hộ, nợ HDV không tăng; ghi một dấu ĐANG ĐỐI CHIẾU; Kế toán thấy khoản chờ xác nhận", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0, "không dòng nợ nào");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'DECLARED'", r), 1);
  assert.equal((await tien(w, HDV, id)).banDangGiu, 0, "HDV không nợ khoản này");
  assert.deepEqual((await tien(w, KT, id)).keToan.choXacNhan, [r]);
  const so = (await w.call("GET", "/api/ledger", { as: KT })).json;
  assert.deepEqual(so.choXacNhan.map((x: { receiptId: string; soTien: number }) => [x.receiptId, x.soTien]), [[r, 400_000]]);
});

test("đơn còn khoản đang đối chiếu chưa Đã giao được; Kế toán xác nhận ⇒ Đã giao được và nợ HDV vẫn 0", async () => {
  const w = setup();
  const id = don(w, 1_000_000);
  assert.equal((await thu(w, HDV, id, ck(1_000_000))).status, 201);
  const r = cuoi(w, id);
  let t = await tien(w, HDV, id);
  assert.equal(t.coTheGiao, false);
  assert.equal(t.lyDoChuaGiao.ma, "reconciling");
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "not_deliverable");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id), 0);
  const x = await xacNhan(w, r, MA(1_000_000));
  assert.equal(x.status, 200, x.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'CONFIRMED'", r), 1);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0, "xác nhận khoản mới không sinh dòng nợ nào");
  assert.equal(n(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_company_received'", id), 1, "lần xác nhận ghi nhật ký");
  t = await tien(w, HDV, id);
  assert.equal(t.coTheGiao, true);
  assert.deepEqual((await tien(w, KT, id)).keToan.choXacNhan, []);
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 200);
  assert.equal((await tien(w, HDV, id)).banDangGiu, 0);
});

test("HDV khai CK kèm bấm Đã giao trong một lệnh ⇒ bị chặn (còn khoản đang đối chiếu), không để lại gì", async () => {
  const w = setup();
  const id = don(w, 500_000);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: { lanThu: ck(500_000) } });
  assert.equal(g.status, 409, g.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), 0);
});

test("xác nhận hai lần ⇒ lần hai 409; xác nhận thiếu mã vẫn 400", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  assert.equal((await xacNhan(w, r)).json.error.code, "bank_txn_required");
  assert.equal((await xacNhan(w, r, MA(400_000))).status, 200);
  const hai = await xacNhan(w, r, MA(400_000, "DC0002"));
  assert.equal(hai.status, 409, hai.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'CONFIRMED'", r), 1);
});

test("Kế toán thấy tiền không về ⇒ đảo lần thu (đường có sẵn): khoản hết đối chiếu, đơn lại phải thu, không dòng nợ", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(1_000_000))).status, 201);
  const r = cuoi(w, id);
  const d = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: r, lyDo: "tiền chưa về tài khoản" } });
  assert.equal(d.status, 201, d.text);
  const t = await tien(w, KT, id);
  assert.deepEqual(t.keToan.choXacNhan, []);
  assert.equal(t.daThu, 0);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0);
  assert.equal((await xacNhan(w, r, MA(1_000_000))).status, 409, "khoản đã đảo thì không xác nhận nữa");
});

test("Kế toán / Toàn quyền tự ghi Công ty thu ⇒ không dấu đối chiếu, không dòng nợ", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(300_000, MA(300_000, "KT0001")))).status, 201);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0);
});

test("Bán hàng / HDV ghi 'tôi thu' (STAFF) vẫn sinh dòng giữ hộ như cũ (chỉ khoản Công ty thu đổi luật)", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, { soTien: 200_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD'", id), 1);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0);
});

test("TIỀN MẶT 'Công ty thu' do HDV khai: GIỮ luật H3 cũ — có dòng giữ hộ, HDV nợ, không vào đang đối chiếu, không bị chặn Đã giao; Kế toán xác nhận thì đảo dòng giữ hộ", async () => {
  const w = setup();
  const id = don(w, 300_000);
  const mat = { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" };
  assert.equal((await thu(w, HDV, id, mat)).status, 201);
  const r = cuoi(w, id);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD' AND receipt_id = ?", id, r), 1, "có dòng giữ hộ trên người khai");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0, "không dấu đối chiếu");
  let t = await tien(w, HDV, id);
  assert.equal(t.banDangGiu, 300_000, "HDV cầm tiền thật nên vẫn nợ");
  assert.notEqual(t.lyDoChuaGiao?.ma, "reconciling");
  assert.equal(t.coTheGiao, true, "tiền mặt không bị chặn Đã giao bởi đối chiếu");
  assert.deepEqual((await tien(w, KT, id)).keToan.choXacNhan, [r], "vẫn chờ Kế toán xác nhận theo dòng giữ hộ");
  assert.equal((await w.call("GET", "/api/ledger/coc", { as: KT })).json.doiChieu.length, 1, "nằm trong danh sách chờ xác nhận của sổ");
  assert.equal((await xacNhan(w, r)).status, 200);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND reverses_line_id IS NOT NULL", id), 1, "đảo dòng giữ hộ");
  t = await tien(w, HDV, id);
  assert.equal(t.banDangGiu, 0);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0);
});

test("lớp CSDL: dấu DECLARED chỉ cho lần thu CHUYỂN KHOẢN — tiền mặt bị trigger từ chối", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'DECLARED', ?, ?, ?, ?, ?)`).run(uuid(), cuoi(w, id), vnHomNay(), AT, HDV, AT, HDV), /recon_receipt_invalid/);
});

test("khoản CŨ (đã có dòng giữ hộ): vẫn đảo dòng giữ hộ khi xác nhận, không thêm dấu CONFIRMED", async () => {
  const w = setup();
  const id = don(w);
  const r = khoanCu(w, id, 400_000);
  assert.deepEqual((await tien(w, KT, id)).keToan.choXacNhan, [r], "khoản cũ vẫn chờ xác nhận theo dòng giữ hộ");
  assert.equal((await tien(w, HDV, id)).banDangGiu, 400_000);
  const x = await xacNhan(w, r);
  assert.equal(x.status, 200, x.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND reverses_line_id IS NOT NULL", id), 1);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0);
  assert.equal((await tien(w, HDV, id)).banDangGiu, 0);
});

test("khoản CŨ + ADR-0092 Đ2b vẫn giữ: Kế toán ghi 'Đã nộp' phần giữ hộ rồi 'Công ty đã nhận' ⇒ 409 kèm câu chỉ đường; sổ HDV không âm", async () => {
  const w = setup();
  const id = don(w);
  const r = khoanCu(w, id, 400_000);
  const nop = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 400_000 }] } });
  assert.equal(nop.status, 201, nop.text);
  const x = await xacNhan(w, r);
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "held_already_settled");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0);
});

test("nhắc đối chiếu: đúng 3 ngày chưa nhắc, 4 ngày nhắc (hàm thuần, theo ngày dân sự)", () => {
  assert.equal(SO_NGAY_NHAC_DOI_CHIEU, 3);
  assert.equal(nhacDoiChieu({ homNay: "2026-10-20", ngayKhai: "2026-10-17" }), false);
  assert.equal(nhacDoiChieu({ homNay: "2026-10-20", ngayKhai: "2026-10-16" }), true);
  assert.equal(nhacDoiChieu({ homNay: "2026-10-20", ngayKhai: "2026-10-20" }), false);
});

test("nhắc đối chiếu theo ngày khai trong sổ: khai cách đây 3 ngày ⇒ chưa; 4 ngày ⇒ có (ô đếm + danh sách)", async () => {
  const w = setup();
  const [a, b] = [don(w), don(w)];
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  for (const [orderId, ngay] of [[a, lui(3)], [b, lui(4)]] as const) {
    const rid = uuid();
    w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
      reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 100000, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?)`)
      .run(rid, orderId, ct, ct, ngay, AT, HDV, AT, HDV);
    w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'DECLARED', ?, ?, ?, ?, ?)`)
      .run(uuid(), rid, ngay, AT, HDV, AT, HDV);
  }
  const dem = (await w.call("GET", "/api/ledger/coc/dem", { as: KT })).json;
  assert.equal(dem.doiChieuQua3Ngay, 1);
  const ds = (await w.call("GET", "/api/ledger/coc", { as: KT })).json;
  assert.deepEqual(ds.doiChieu.map((x: { ngayKhai: string; qua3Ngay: boolean }) => [x.ngayKhai, x.qua3Ngay]), [[lui(3), false], [lui(4), true]]);
  assert.equal((await w.call("GET", "/api/ledger/coc/dem", { as: HDV })).status, 403);
});

test("lớp CSDL 0099: dấu chỉ-thêm; CONFIRMED cần DECLARED; chặn phiếu Đã giao khi còn đối chiếu; view cọc đếm khoản đang đối chiếu", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(1_000_000))).status, 201);
  const r = cuoi(w, id);
  assert.throws(() => w.sqlite.prepare("UPDATE bil_receipt_recon SET occurred_date = '2026-01-01' WHERE receipt_id = ?").run(r), /bil_append_only/);
  assert.throws(() => w.sqlite.prepare("DELETE FROM bil_receipt_recon WHERE receipt_id = ?").run(r), /bil_append_only/);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'DECLARED', ?, ?, ?, ?, ?)`).run(uuid(), r, vnHomNay(), AT, HDV, AT, HDV), /UNIQUE|recon/);
  assert.equal(Number(w.q("SELECT dang_doi_chieu AS v FROM v_bil_coc_don WHERE order_id = ?", id)[0]?.v ?? 0), 1_000_000);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'DELIVERED', ?, NULL, NULL, ?, 1000000, ?, ?, ?, ?)`).run(uuid(), id, vnHomNay(), AT, HDV, AT, HDV), /delivered_reconciling/);
  const nv = don(w);
  assert.equal((await thu(w, HDV, nv, { soTien: 50_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'DECLARED', ?, ?, ?, ?, ?)`).run(uuid(), cuoi(w, nv), vnHomNay(), AT, HDV, AT, HDV), /recon_receipt_invalid/, "chỉ lần thu vai Công ty mới có dấu đối chiếu");
  const khac = don(w);
  assert.equal((await thu(w, KT, khac, ck(100_000, MA(100_000, "KT0009")))).status, 201);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'CONFIRMED', ?, ?, ?, ?, ?)`).run(uuid(), cuoi(w, khac), vnHomNay(), AT, KT, AT, KT), /recon_not_declared/);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'CONFIRMED', ?, ?, ?, ?, ?)`).run(uuid(), r, vnHomNay(), AT, KT, AT, KT), /bank_txn_required/);
});
