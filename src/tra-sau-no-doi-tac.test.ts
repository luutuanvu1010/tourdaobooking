// ADR-0168 Đ2 mục 2 với ADR-0170/0171: số nợ Trả sau dùng ĐÚNG hàm mở vé `soChuaVeCongTy` (một bản). Lỗi kiểm độc lập lần hai (C-A): hạn mức 600.000, đơn Trả sau 600.000, đối tác ghi
// «Công ty thu» đủ, Kế toán nộp 1.000 ⇒ phép tính riêng ra nợ 0 và đơn thứ hai xác nhận được. Khung thử thật (tests/audit/xac-nhan-khung.mjs). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../tests/audit/harness.mjs";
import { ACC, ADM, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { addDays, vnToday } from "./shared/vn-date.ts";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801";
const BEN = `pty-${DT}`;
const DT2 = "88888888-8888-4888-8888-888888888802"; // Đối tác Hai: khai cọc trên đơn của họ rồi huỷ
const BEN2 = `pty-${DT2}`;
const TONG = 600_000; // ZB1: 2 người lớn × 300.000
type W = ReturnType<typeof setup>;

function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT}`, BEN, AT, AT);
  seedStaff(w.sqlite, { id: DT2, phone: "0900000022", name: "Đối Tác Hai", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT2}`, BEN2, AT, AT);
  return w;
}
const hanMuc = (w: W, so: number) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: so, soNgay: 7, lyDo: "thử" } });
async function nhapTS(w: W): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], paymentTerm: "CREDIT" } });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id as string;
}
const guiDon = (w: W, id: string, as: string = DT) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const thu = (w: W, id: string, as: string, nguoiThu: string, soTien = TONG) => w.call("POST", `/api/orders/${id}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu } });
const nop = (w: W, id: string, soTien: number) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: BEN, phanBo: [{ orderId: id, soTien }] } });
const donNo = async (w: W) => (await w.call("GET", `/api/tra-sau/han-muc/${BEN}/don`, { as: ACC })).json.don as { orderId: string; no: number; quaHan: boolean }[];
const dangNo = async (w: W) => ((await w.call("GET", "/api/tra-sau/han-muc", { as: ACC })).json.danhSach as { partyId: string; dangNo: number }[]).find((d) => d.partyId === BEN)?.dangNo;
const veDon = async (w: W, id: string) => (await w.call("GET", `/api/ve/don/${id}`, { as: ADM })).json;
function moVe(w: W, orderId: string) {
  w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES ('lo-ts', 'ZB1', 'ADULT', 'Vé thử', 'ACTIVE', ?, ?)").run(AT, AT);
  w.sqlite.prepare(`INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, stored_at, status, created_at, updated_at) VALUES ('ve-ts', 'lo-ts', 'BI.MAT.TS', '2026-01-01', '2099-12-31', 'k', 'image/png', 10, 'h', ?, 'AVAILABLE', ?, ?)`).run(AT, AT, AT);
  w.sqlite.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = 've-ts'").run();
  const dv = w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id as string;
  w.sqlite.prepare(`INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, revealed_at, created_at, updated_at) VALUES ('pb-ts', 've-ts', ?, ?, 'ADULT', 1, ?, ?, ?, ?)`).run(orderId, dv, AT, AT, AT, AT);
}

test("C-A: đối tác ghi «Công ty thu» đủ, Kế toán nộp 1.000 ⇒ nợ 599.000, đơn thứ hai vượt hạn mức, quá hạn thì vé chặn, huỷ đơn đã mở vé 409, nộp đủ thì nợ 0", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, TONG)).status, 201);
  const a = await nhapTS(w);
  const b = await nhapTS(w); // lưu được vì lúc lưu nợ còn 0
  assert.equal((await guiDon(w, a)).status, 200);
  assert.equal((await thu(w, a, DT, "cong_ty")).status, 201, "đối tác ghi «Công ty thu» đủ tiền");
  assert.equal((await nop(w, a, 1000)).status, 201);
  assert.deepEqual((await donNo(w)).map((x) => [x.orderId, x.no]), [[a, 599_000]], "danh sách nợ có đơn, còn 599.000");
  assert.equal(await dangNo(w), 599_000);
  const r2 = await guiDon(w, b);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "vuot_han_muc", "đơn thứ hai không xác nhận được");
  // quá hạn: vé chưa mở bị chặn; vé đã mở vẫn xem; huỷ đơn đã mở vé bị chặn
  w.sqlite.prepare("UPDATE orders SET credit_due_date = ? WHERE id = ?").run(addDays(vnToday(new Date()), -1), a);
  assert.equal((await veDon(w, a)).traSauQuaHan, true);
  moVe(w, a);
  const huy = await w.call("POST", `/api/orders/${a}/status`, { as: ADM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.deepEqual([huy.status, huy.json.error.code], [409, "tra_sau_con_no_da_mo_ve"], huy.text);
  assert.equal((await nop(w, a, 599_000)).status, 201);
  assert.deepEqual(await donNo(w), [], "nộp đủ: hết nợ");
  assert.equal(await dangNo(w), 0);
});

test("C-A: «Tôi thu» vẫn đúng như cũ — tiền ở tay đối tác thì nợ nguyên, nộp đủ thì 0", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  const a = await nhapTS(w);
  assert.equal((await guiDon(w, a)).status, 200);
  assert.equal((await thu(w, a, DT, "toi")).status, 201);
  assert.equal(await dangNo(w), TONG);
  assert.equal((await nop(w, a, 1000)).status, 201);
  assert.equal(await dangNo(w), TONG - 1000);
  assert.equal((await nop(w, a, TONG - 1000)).status, 201);
  assert.equal(await dangNo(w), 0);
});

test("C-A: «Bên kia đã nhận» (đại lý cầm tiền) còn nợ tới khi nộp đủ", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  const a = await nhapTS(w);
  assert.equal((await guiDon(w, a)).status, 200);
  assert.equal((await thu(w, a, ADM, "ben_dat")).status, 201);
  const khoan = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT'", a)[0].id);
  assert.equal((await w.call("POST", `/api/ledger/counterparty-receipts/${khoan}/confirm`, { as: ACC, body: {} })).status, 200);
  assert.equal(await dangNo(w), TONG, "tiền ở tay đại lý tới khi nộp");
  assert.equal((await nop(w, a, 1000)).status, 201);
  assert.equal(await dangNo(w), TONG - 1000);
  assert.equal((await nop(w, a, TONG - 1000)).status, 201);
  assert.equal(await dangNo(w), 0);
});

// ===== I-2 (vòng cuối): khoản chuyển từ đơn huỷ của đối tác khác là khoản KHAI — tiền còn ở tay người khai, tới khi họ nộp =====
/** Đối tác Hai khai cọc 200.000 trên đơn của họ, đơn huỷ, Quản trị duyệt chuyển, Kế toán ghi chuyển sang đơn nhận `nhan` (đã xác nhận). */
async function chuyenCocKhaiSang(w: W, nhan: string): Promise<void> {
  const r = await w.call("POST", "/api/orders", { as: DT2, body: { customerName: "Khách Hai", customerPhone: "0912345679", services: [svc("ZB1", inDays(3))], declaredDeposit: 200_000 } });
  assert.equal(r.status, 201, r.text);
  const cu = r.json.order.id as string;
  assert.equal((await guiDon(w, cu, DT2)).status, 200);
  const don = (await w.call("GET", `/api/orders/${cu}`, { as: DT2 })).json.order;
  assert.equal((await w.call("POST", `/api/orders/${cu}/status`, { as: DT2, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: don.updatedAt } })).status, 200);
  const ma = String(w.q("SELECT order_code AS c FROM orders WHERE id = ?", nhan)[0].c);
  const d = await w.call("POST", `/api/orders/${cu}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien: 200_000, lyDo: "Lập lại đơn cho khách", donNhan: ma } });
  assert.ok(d.status === 200 || d.status === 201, d.text);
  const c = await w.call("POST", `/api/orders/${cu}/coc/chuyen`, { as: ACC, body: { duyetId: d.json.duyetId, soTien: 200_000, ngayPhatSinh: inDays(0), nguoiGiu: { partyId: BEN2 } } });
  assert.equal(c.status, 201, c.text);
}
const nopHai = (w: W, id: string, soTien: number) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: BEN2, phanBo: [{ orderId: id, soTien }] } });

test("I-2: cọc 200.000 của Đối tác Hai chuyển sang đơn Trả sau 600.000 của bên đặt khác: nợ 600.000; Hai nộp đủ thì 400.000", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  const a = await nhapTS(w);
  assert.equal((await guiDon(w, a)).status, 200);
  await chuyenCocKhaiSang(w, a);
  assert.deepEqual((await donNo(w)).map((x) => [x.orderId, x.no]), [[a, 600_000]], "tiền còn ở tay người khai: nợ nguyên");
  assert.equal((await nopHai(w, a, 200_000)).status, 201);
  assert.deepEqual((await donNo(w)).map((x) => [x.orderId, x.no]), [[a, 400_000]], "Hai nộp đủ: giảm đúng 200.000");
});

test("I-2: cùng đường ở đơn Trả trước của đối tác: khoản chuyển còn khai thì vé không tính, Hai nộp thì tính", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const a = r.json.order.id as string;
  assert.equal((await guiDon(w, a)).status, 200);
  await chuyenCocKhaiSang(w, a);
  assert.equal((await app.tienDonVe(w.env.DB, a))?.daThu, 0, "200.000 còn ở tay người khai: chưa tính vào số mở vé");
  assert.equal((await nopHai(w, a, 200_000)).status, 201);
  assert.equal((await app.tienDonVe(w.env.DB, a))?.daThu, 200_000);
});
