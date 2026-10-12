// ADR-0092 Đ6 — LỚP MÁY CHỦ của mã giao dịch, đứng RIÊNG (đặc tả QR §8.8: mỗi luật phải đỏ-trước-xanh ở CẢ lớp máy chủ lẫn lớp trigger).
// Bài ma-giao-dich-route.test.ts chạy với đủ trigger 0088: trigger bắt trước nên phần kiểm trước lô của máy chủ không bao giờ lộ ra. Ở đây năm trigger của luật
// (trùng, lệch, vượt, "Công ty đã nhận" cần mã, lô Thay cần mã) bị GỠ trong CSDL thử, nên chỉ còn máy chủ đứng giữa — mọi 409/400 dưới đây là của máy chủ.
// Giữ lại trigger (a) `bil_receipt_bank_txn_receipt` (lần thu hợp lệ mới gắn được mã — không phải điều bài này kiểm) và hai trigger chỉ-thêm.
// Mỗi ca chỉ phạm MỘT luật, và sau lời gọi bị từ chối thì KHÔNG dòng nào được ghi (mã nối, lần thu, phiếu, dòng sổ, nhật ký).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

/** Năm trigger của luật mã (0088) mà bài này gỡ để máy chủ đứng một mình. */
const TRIGGER_GO = [
  "bil_receipt_bank_txn_duplicate", "bil_receipt_bank_txn_amount_mismatch", "bil_receipt_bank_txn_over", "bil_debt_line_company_received_txn", "bil_posting_replacement_txn",
];

type W = ReturnType<typeof world>;
async function setup(): Promise<W> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  // Mở phiên trước để lần gọi đầu của mỗi người không làm đổi số dòng nhật ký / phiên trong ảnh chụp "không ghi gì".
  for (const as of [SALES, HDV, KT]) assert.equal((await w.call("GET", "/api/auth/me", { as })).status, 200);
  for (const t of TRIGGER_GO) w.sqlite.exec(`DROP TRIGGER ${t}`);
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
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const ck = (soTien: number, them: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", ...them });
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const cuoi = (w: W, orderId: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1", orderId)[0].id);
const dem = (w: W, bang: string) => Number(w.q(`SELECT count(*) AS n FROM ${bang}`)[0].n);
/** Ảnh chụp mọi nơi một lệnh ghi mã có thể để lại dấu: dòng nối mã, lần thu, phiếu, dòng sổ, nhật ký. */
const anh = (w: W) => ({
  maNoi: dem(w, "bil_receipt_bank_txn"), lanThu: dem(w, "bil_payment_receipt"), phieu: dem(w, "bil_posting"), dongSo: dem(w, "bil_debt_line"), nhatKy: dem(w, "audit_log"),
});

test("khung thử đúng như bài nói: năm trigger luật đã gỡ (SQL tay chèn trùng mã cùng đơn lọt qua), trigger (a) và hai trigger chỉ-thêm còn nguyên", async () => {
  const w = await setup();
  const ten = (n: string) => w.q("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = ?", n).length;
  for (const t of TRIGGER_GO) assert.equal(ten(t), 0, `${t} phải đã gỡ`);
  for (const t of ["bil_receipt_bank_txn_receipt", "bil_receipt_bank_txn_no_update", "bil_receipt_bank_txn_no_delete"]) assert.equal(ten(t), 1, `${t} phải còn`);
  // Hai lần thu CK – Công ty thu do HDV khai (chưa mã), rồi chèn tay hai dòng nối CÙNG mã CÙNG đơn: nếu trigger "trùng" còn thì câu thứ hai ném lỗi.
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r1 = cuoi(w, id);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r2 = cuoi(w, id);
  const chen = w.sqlite.prepare(`INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'KT0000', 800000, ?, ?, ?, ?)`);
  chen.run(uuid(), r1, AT, KT, AT, KT);
  assert.doesNotThrow(() => chen.run(uuid(), r2, AT, KT, AT, KT), "không còn trigger trùng ở CSDL thử");
});

test("máy chủ một mình — T1 trùng: hai lần thu cùng mã, cùng đơn ⇒ 409 bank_txn_duplicate, không ghi gì", async () => {
  const w = await setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(400_000, { maGiaoDich: "SV0001", soThucChuyen: 800_000 }))).status, 201);
  const truoc = anh(w);
  const x = await thu(w, KT, id, ck(400_000, { maGiaoDich: "SV0001", soThucChuyen: 800_000 }));
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "bank_txn_duplicate");
  assert.deepEqual(anh(w), truoc, "lệnh bị từ chối không để lại dòng nào");
});

test("máy chủ một mình — T2 lệch: mã đã ghi 800.000 ở đơn khác, nhập 700.000 ⇒ 409 bank_txn_amount_mismatch mang số đã ghi, không ghi gì", async () => {
  const w = await setup();
  const a = don(w);
  assert.equal((await thu(w, KT, a, ck(400_000, { maGiaoDich: "SV0002", soThucChuyen: 800_000 }))).status, 201);
  const b = don(w);
  const truoc = anh(w);
  const x = await thu(w, KT, b, ck(300_000, { maGiaoDich: "SV0002", soThucChuyen: 700_000 }));
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "bank_txn_amount_mismatch");
  assert.equal(x.json.error.soThucChuyen, 800_000, "mang số đã ghi để giao diện điền sẵn");
  assert.deepEqual(anh(w), truoc, "lệnh bị từ chối không để lại dòng nào");
});

test("máy chủ một mình — vượt: mã đã gắn 400.000 trong tổng thực chuyển 800.000, đơn khác thêm 500.000 ⇒ 409 bank_txn_over, không ghi gì; vừa đủ 400.000 thì được", async () => {
  const w = await setup();
  const a = don(w);
  assert.equal((await thu(w, KT, a, ck(400_000, { maGiaoDich: "SV0003", soThucChuyen: 800_000 }))).status, 201);
  const b = don(w);
  const truoc = anh(w);
  const x = await thu(w, KT, b, ck(500_000, { maGiaoDich: "SV0003", soThucChuyen: 800_000 }));
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "bank_txn_over");
  assert.deepEqual(anh(w), truoc, "lệnh bị từ chối không để lại dòng nào");
  assert.equal((await thu(w, KT, b, ck(400_000, { maGiaoDich: "SV0003", soThucChuyen: 800_000 }))).status, 201, "đối chứng: đúng bằng phần còn lại thì ghi được");
  assert.notDeepEqual(anh(w), truoc, "đối chứng: ảnh chụp có nhạy — lệnh được ghi thì ảnh đổi");
});

test("máy chủ một mình — đường 1: HDV khai CK – Công ty thu (sau mốc cắt), Kế toán bấm 'Công ty đã nhận' KHÔNG mã ⇒ 400 bank_txn_required, không ghi gì", async () => {
  const w = await setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  const truoc = anh(w);
  const x = await w.call("POST", `/api/ledger/company-receipts/${r}/confirm`, { as: KT, body: {} });
  assert.equal(x.status, 400, x.text);
  assert.equal(x.json.error.code, "bank_txn_required");
  assert.deepEqual(anh(w), truoc, "không phiếu 'Công ty đã nhận', không dòng đảo giữ hộ, không nhật ký");
});

test("máy chủ một mình — đường 2: Kế toán tự ghi CK – Công ty thu KHÔNG mã ⇒ 400 bank_txn_required, không ghi gì", async () => {
  const w = await setup();
  const id = don(w);
  const truoc = anh(w);
  const x = await thu(w, KT, id, ck(300_000));
  assert.equal(x.status, 400, x.text);
  assert.equal(x.json.error.code, "bank_txn_required");
  assert.deepEqual(anh(w), truoc, "không lần thu, không nhật ký");
});

test("máy chủ một mình — đường 3: Thay lần thu bằng lần thu mới CK – Công ty thu KHÔNG mã ⇒ 400 bank_txn_required, không ghi gì", async () => {
  const w = await setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(600_000, { maGiaoDich: "SV0004", soThucChuyen: 600_000 }))).status, 201);
  const r = cuoi(w, id);
  const truoc = anh(w);
  const x = await w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [r], moi: [ck(600_000)], lyDo: "Ghi nhầm ngày, ghi lại cho đúng" } });
  assert.equal(x.status, 400, x.text);
  assert.equal(x.json.error.code, "bank_txn_required");
  assert.deepEqual(anh(w), truoc, "không lần thu mới, không dòng đảo, không phiếu Thay, không nhật ký");
});
