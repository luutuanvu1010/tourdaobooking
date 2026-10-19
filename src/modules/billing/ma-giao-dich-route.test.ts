// ADR-0092 Đ6 + ADR-0108 đ4 qua ROUTE THẬT (khung thử): ba đường ghi đòi mã, ba luật chặn, lối ra khai trùng sau Đã giao, ai thấy mã, nhật ký không chép mã,
// hai người bấm cùng lúc, khoản trước mốc. Đặc tả QR §5, §8.8; Review Focus 2, 3, 5.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const KT2 = "45454545-4545-4545-8545-454545454545";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [KT2, "0900000015", "Hoa Kế Toán", ["ACCOUNTING"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
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
const soDong = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);

test("đường 1: khoản HDV khai CK – Công ty thu ⇒ xác nhận thiếu mã 400; có mã (chuẩn hoá) 200; nhật ký không chép mã; tiền mặt không cần mã, gửi mã cho tiền mặt 400", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  let x = await xacNhan(w, r);
  assert.equal(x.status, 400, x.text);
  assert.equal(x.json.error.code, "bank_txn_required");
  x = await xacNhan(w, r, { maGiaoDich: "ft 2610.0812/345", soThucChuyen: 400_000 });
  assert.equal(x.status, 200, x.text);
  assert.equal(w.q("SELECT txn_code FROM bil_receipt_bank_txn WHERE receipt_id = ?", r)[0].txn_code, "FT26100812345");
  for (const d of w.q("SELECT detail FROM audit_log WHERE order_id = ?", id)) assert.doesNotMatch(String(d.detail ?? ""), /26100812345/);
  assert.equal((await thu(w, HDV, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  const tm = cuoi(w, id);
  assert.equal((await xacNhan(w, tm, { maGiaoDich: "FT0001", soThucChuyen: 100_000 })).status, 400);
  assert.equal((await xacNhan(w, tm)).status, 200);
});

test("ba luật chặn: trùng cùng đơn 409; lệch số thực chuyển 409 kèm số đã ghi; vượt 409; đúng thì 200", async () => {
  const w = setup();
  const a = don(w);
  assert.equal((await thu(w, HDV, a, ck(400_000))).status, 201);
  const r1 = cuoi(w, a);
  assert.equal((await thu(w, HDV, a, ck(400_000))).status, 201);
  const r2 = cuoi(w, a);
  assert.equal((await xacNhan(w, r1, { maGiaoDich: "XG0001", soThucChuyen: 800_000 })).status, 200);
  let x = await xacNhan(w, r2, { maGiaoDich: "XG0001", soThucChuyen: 800_000 });
  assert.equal(x.status, 409);
  assert.equal(x.json.error.code, "bank_txn_duplicate");
  const b = don(w);
  assert.equal((await thu(w, HDV, b, ck(300_000))).status, 201);
  const r3 = cuoi(w, b);
  x = await xacNhan(w, r3, { maGiaoDich: "XG0001", soThucChuyen: 700_000 });
  assert.equal(x.status, 409);
  assert.deepEqual([x.json.error.code, x.json.error.soThucChuyen], ["bank_txn_amount_mismatch", 800_000]);
  assert.equal((await xacNhan(w, r3, { maGiaoDich: "XG0001", soThucChuyen: 800_000 })).status, 200);
  const c = don(w);
  assert.equal((await thu(w, HDV, c, ck(200_000))).status, 201);
  x = await xacNhan(w, cuoi(w, c), { maGiaoDich: "XG0001", soThucChuyen: 800_000 });
  assert.equal(x.json.error.code, "bank_txn_over");
});

test("đường 2: Kế toán tự ghi CK – Công ty thu thiếu mã 400 (cả khi chọn người thu = hồ sơ công ty); có mã 201, không dòng giữ hộ; Bán hàng gửi mã 400; ô mã nhận 12 chữ số, ghi chú 12 chữ số vẫn 400", async () => {
  const w = setup();
  const id = don(w);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  assert.equal((await thu(w, KT, id, ck(300_000))).json.error.code, "bank_txn_required");
  assert.equal((await thu(w, KT, id, ck(300_000, { nguoiThu: { partyId: ct } }))).json.error.code, "bank_txn_required");
  assert.equal((await thu(w, KT, id, ck(300_000, { maGiaoDich: "123456789012", soThucChuyen: 300_000 }))).status, 201);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0);
  assert.equal((await thu(w, KT, id, ck(1_000, { maGiaoDich: "FT0002", soThucChuyen: 1_000, ghiChu: "sao kê 123456789012" }))).status, 400);
  assert.equal((await thu(w, KT, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await thu(w, SALES, id, ck(1_000, { maGiaoDich: "FT0003", soThucChuyen: 1_000 }))).status, 400);
  assert.equal((await thu(w, SALES, id, ck(1_000))).status, 201, "Bán hàng khai bình thường ⇒ giữ hộ, chưa cần mã");
});

test("đường 2 kèm Đã giao: Toàn quyền thiếu mã 400, có mã 200; Quản trị khai kèm Đã giao ⇒ không đòi mã nhưng bị chặn vì khoản đang đối chiếu (ADR-0120); Kế toán thuần ⇒ 403", async () => {
  const w = setup();
  const a = don(w);
  let g = await w.call("POST", `/api/orders/${a}/delivered`, { as: SA, body: { lanThu: ck(1_000_000) } });
  assert.equal(g.status, 400, g.text);
  g = await w.call("POST", `/api/orders/${a}/delivered`, { as: SA, body: { lanThu: ck(1_000_000, { maGiaoDich: "DG0001", soThucChuyen: 1_000_000 }) } });
  assert.equal(g.status, 200, g.text);
  const b = don(w);
  g = await w.call("POST", `/api/orders/${b}/delivered`, { as: ADM, body: { lanThu: ck(1_000_000) } });
  assert.equal(g.status, 409, g.text);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", b), 0, "lô bị chặn không để lại lần thu nào");
  assert.equal((await w.call("POST", `/api/orders/${don(w)}/delivered`, { as: KT, body: {} })).status, 403);
});

test("đường 3: Thay một lần thu có mã bằng lần thu mới CÙNG mã ⇒ 201; thiếu mã ⇒ 400; hai lần thu mới cùng mã cùng đơn ⇒ 409 trùng", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(600_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 }))).status, 201);
  const r = cuoi(w, id);
  const thay = (moi: unknown[]) => w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [r], moi, lyDo: "Ghi nhầm ngày, ghi lại cho đúng" } });
  assert.equal((await thay([ck(600_000)])).status, 400);
  assert.equal((await thay([ck(300_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 }), ck(300_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 })])).json.error.code, "bank_txn_duplicate");
  const ok = await thay([ck(600_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 })]);
  assert.equal(ok.status, 201, ok.text);
});

test("đảo lần thu có mã rồi ghi lại số thực chuyển khác ⇒ được (không còn lần thu nào khác giữ mã)", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(500_000, { maGiaoDich: "DA0001", soThucChuyen: 500_000 }))).status, 201);
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: cuoi(w, id), lyDo: "nhập nhầm số thực chuyển" } });
  assert.equal(dao.status, 201, dao.text);
  assert.equal((await thu(w, KT, id, ck(600_000, { maGiaoDich: "DA0001", soThucChuyen: 600_000 }))).status, 201);
});

test("khai trùng (ADR-0120): hai khoản HDV khai cùng một lần chuyển — khoản thứ hai bị chặn trùng mã, đơn chưa Đã giao được; Kế toán đảo khoản thừa, HDV không nợ gì", async () => {
  const w = setup();
  const id = don(w, 800_000);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r1 = cuoi(w, id);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r2 = cuoi(w, id);
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 409, "còn hai khoản đang đối chiếu");
  assert.equal((await xacNhan(w, r1, { maGiaoDich: "KT0001", soThucChuyen: 400_000 })).status, 200);
  assert.equal((await xacNhan(w, r2, { maGiaoDich: "KT0001", soThucChuyen: 400_000 })).json.error.code, "bank_txn_duplicate");
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 409, "khoản thứ hai vẫn đang đối chiếu");
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: r2, lyDo: "khai trùng cùng một lần chuyển" } });
  assert.equal(dao.status, 201, dao.text);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0, "HDV không nợ khoản nào");
});

test("ai thấy mã: Kế toán có khoá maGiaoDich/soThucChuyen; Bán hàng KHÔNG có khoá", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(300_000, { maGiaoDich: "XM0001", soThucChuyen: 300_000 }))).status, 201);
  const kt = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json;
  assert.deepEqual([kt.lanThu[0].maGiaoDich, kt.lanThu[0].soThucChuyen], ["XM0001", 300_000]);
  const sales = await w.call("GET", `/api/orders/${id}/payments`, { as: SALES });
  for (const l of sales.json.lanThu) assert.ok(!("maGiaoDich" in l) && !("soThucChuyen" in l));
  assert.doesNotMatch(sales.text, /XM0001/);
});

test("Review Focus 3: hai Kế toán bấm 'Công ty đã nhận' cùng lúc ⇒ một 200, một 409 (không 500)", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  // Hai Kế toán KHÁC nhau; mở phiên trước (hai lời gọi đầu cùng lúc của MỘT tài khoản đụng UNIQUE aut_session.staff_id của khung thử — không phải điều cần kiểm).
  for (const as of [KT, KT2]) assert.equal((await w.call("GET", "/api/auth/me", { as })).status, 200);
  const kq = await Promise.all([xacNhan(w, r, { maGiaoDich: "CL0001", soThucChuyen: 400_000 }, KT), xacNhan(w, r, { maGiaoDich: "CL0001", soThucChuyen: 400_000 }, KT2)]);
  assert.deepEqual(kq.map((x) => x.status).sort(), [200, 409], kq.map((x) => x.text).join(" | "));
});

test("Review Focus 5: khoản khai TRƯỚC mốc cắt ⇒ xác nhận không cần mã; nhập mã vẫn gắn", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const cu = cuoi(w, id);
  assert.equal((await thu(w, HDV, id, ck(300_000))).status, 201);
  const cu2 = cuoi(w, id);
  // Giả lập "khoản khai trước ngày phát hành": dời mốc cắt ra sau (bảng mốc chỉ-thêm ⇒ gỡ trigger chặn sửa TRONG CSDL thử này).
  w.sqlite.exec("DROP TRIGGER bil_audit_cutoff_no_update");
  w.sqlite.prepare("UPDATE bil_audit_cutoff SET cutoff_at = '2999-01-01T00:00:00.000Z' WHERE code = 'R-BIL-D6'").run();
  assert.equal((await xacNhan(w, cu)).status, 200);
  assert.equal((await xacNhan(w, cu2, { maGiaoDich: "TR0001", soThucChuyen: 300_000 })).status, 200);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_receipt_bank_txn WHERE receipt_id = ?", cu2), 1);
});
