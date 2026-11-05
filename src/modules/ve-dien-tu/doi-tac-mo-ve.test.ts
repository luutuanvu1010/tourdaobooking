// ADR-0170 Đ2: đơn trả trước do tài khoản giữ quyền Đối tác lập chỉ mở vé khi tiền ĐÃ VỀ công ty. Qua ứng dụng THẬT (khung thử xac-nhan-khung, SQLite tạm).
// Tiêu chí là tình trạng của tiền, không phải ai ghi khoản. `thuDu` đọc bằng Quản trị qua GET /api/ve/don/:orderId (đối tác chưa có cổng vé — mở ở Task 3).
// Đơn của khung thử: 2 khách × 300.000 = 600.000 ₫. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app } from "../../../tests/audit/harness.mjs";
import { A, ACC, ADM, LAI, PARTNER, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const TONG = 600000;

function dung() {
  const w = setup();
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${PARTNER}`, `pty-${PARTNER}`, AT, AT);
  return w;
}
async function moDon(w: any, as: string) {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const x = as === PARTNER ? await w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} }) : await w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return id;
}
const thu = (w: any, id: string, as: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${id}/payments`, { as, body: { soTien: TONG, hinhThuc: "CASH", ...body } });
const veDon = async (w: any, id: string) => { const r = await w.call("GET", `/api/ve/don/${id}`, { as: ADM }); assert.equal(r.status, 200, r.text); return r.json; };
const nop = (w: any, id: string, soTien: number) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: `pty-${PARTNER}`, phanBo: [{ orderId: id, soTien }] } });
const khoanDau = (w: any, id: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY rowid", id)[0].id);
const BANG: [string, string][] = [["CASH", "toi"], ["CASH", "cong_ty"], ["CASH", "ben_dat"], ["OTHER", "cong_ty"], ["BANK_TRANSFER", "cong_ty"], ["BANK_TRANSFER", "toi"]];

test("đối tác tự ghi đủ tiền: mọi hình thức × người thu đều KHOÁ vé (thuDu false)", async () => {
  for (const [hinhThuc, nguoiThu] of BANG) {
    const w = dung();
    const id = await moDon(w, PARTNER);
    const r = await thu(w, id, PARTNER, { hinhThuc, nguoiThu });
    assert.equal(r.status, 201, `${hinhThuc}/${nguoiThu}: ${r.text}`);
    assert.equal((await veDon(w, id)).thuDu, false, `${hinhThuc}/${nguoiThu}`);
  }
});

test("Kế toán sửa khoản «Tôi thu» mà người thu vẫn là đối tác: vẫn khoá; sửa sang «Công ty thu»: mở", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "toi" })).status, 201);
  const cu = khoanDau(w, id);
  const giu = await w.call("POST", "/api/ledger/receipt-replacements", { as: ACC, body: { orderId: id, cu: [cu], moi: [{ soTien: TONG, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${PARTNER}` } }], lyDo: "Sửa lại ghi chú khoản thu" } });
  assert.equal(giu.status, 201, giu.text);
  assert.equal((await veDon(w, id)).thuDu, false, "khoản mới mang tên Kế toán, dòng giữ hộ vẫn trên đối tác");
  const cu2 = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' AND id NOT IN (SELECT reverses_id FROM bil_payment_receipt WHERE reverses_id IS NOT NULL)", id).map((x: any) => String(x.id));
  const ve = await w.call("POST", "/api/ledger/receipt-replacements", { as: ACC, body: { orderId: id, cu: cu2, moi: [{ soTien: TONG, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Khách trả thẳng cho công ty" } });
  assert.equal(ve.status, 201, ve.text);
  assert.equal((await veDon(w, id)).thuDu, true, "tiền đã về công ty");
});

test("văn phòng ghi «bên đặt nhận» (lời khai): khoá; «Bên kia đã nhận»: vẫn khoá tới khi đối tác nộp; nộp đủ: mở", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, ADM, { nguoiThu: "ben_dat" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false, "lời khai chưa ai xác nhận");
  const k = await w.call("POST", `/api/ledger/counterparty-receipts/${khoanDau(w, id)}/confirm`, { as: ACC, body: {} });
  assert.equal(k.status, 200, k.text);
  assert.equal((await veDon(w, id)).thuDu, false, "tiền ở tay đối tác tới khi nộp");
  assert.equal((await nop(w, id, TONG)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true);
});

test("đối tác khai «Công ty thu»: khoá tới khi Kế toán xác nhận «Công ty đã nhận»", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false);
  const x = await w.call("POST", `/api/ledger/company-receipts/${khoanDau(w, id)}/confirm`, { as: ACC, body: {} });
  assert.equal(x.status, 200, x.text);
  assert.equal((await veDon(w, id)).thuDu, true);
});

test("Kế toán tự ghi «Công ty thu»: tính ngay, mở", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, ACC, { nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true);
});

test("đơn Bán hàng lập, tự ghi «Tôi thu»: mở như cũ (luồng nhân viên không đổi)", async () => {
  const w = dung();
  const id = await moDon(w, A);
  assert.equal((await thu(w, id, A, { nguoiThu: "toi" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true);
});

test("tài khoản đã thôi quyền Đối tác: khoản giữ hộ cũ thôi bị trừ (xét theo quyền hiện tại)", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "toi" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false);
  w.sqlite.prepare("UPDATE stf_permission SET permission_type_code = 'SALES' WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(PARTNER);
  assert.equal((await veDon(w, id)).thuDu, true);
});

test("Kế toán thu một phần, phần còn lại đối tác tự ghi: khoá tới khi phần tự ghi về công ty; nộp đủ rồi không bị khoá lại", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, ACC, { soTien: 350000, nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await thu(w, id, PARTNER, { soTien: 250000, nguoiThu: "toi" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false, "250.000 còn ở tay đối tác");
  assert.equal((await nop(w, id, 100000)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false, "nộp một phần vẫn khoá");
  assert.equal((await nop(w, id, 150000)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true, "nộp đủ: mở, không tính hai lần");
});

test("câu nói đúng người nghe: người xem giữ quyền Đối tác (tài khoản lai) nghe «Công ty chưa xác nhận…», nhân viên nghe «Đang chờ đối tác nộp…»", async () => {
  const w = dung();
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${LAI}`, `pty-${LAI}`, AT, AT);
  const r = await w.call("POST", "/api/orders", { as: LAI, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: LAI, body: {} });
  assert.ok(g.status === 200 || g.status === 201, g.text);
  assert.equal((await thu(w, id, LAI, { nguoiThu: "cong_ty" })).status, 201);
  const nv = await veDon(w, id);
  assert.equal(nv.choDoiTacNop, true);
  assert.equal(nv.nguoiXemLaDoiTac, false, "Quản trị xem: không phải đối tác");
  const chan = async (as: string) => w.call("POST", "/api/ve/duong-dan", { as, body: { orderId: id } });
  const a = await chan(ADM);
  assert.equal(a.status, 403, a.text);
  assert.match(a.json.error.message, /Đang chờ đối tác nộp tiền về công ty/);
  const l = await chan(LAI);
  assert.equal(l.status, 403, l.text);
  assert.equal(l.json.error.code, "chua_thu_du");
  assert.match(l.json.error.message, /Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé\./);
  const lv = await w.call("GET", `/api/ve/don/${id}`, { as: LAI });
  assert.equal(lv.status, 200, lv.text);
  assert.equal(lv.json.nguoiXemLaDoiTac, true);
});

// Đọc không được thì không mở (ADR-0170 Đ2 mục 3): cả hai ca sẽ mở nếu đọc được (Kế toán đã ghi «Công ty thu» đủ tiền).
test("người lập đang giữ quyền Đối tác nhưng mất hồ sơ: tienDonVe trả null, vé khoá và không báo chờ nộp", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, ACC, { nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true, "đọc được thì mở");
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(PARTNER);
  assert.equal(await app.tienDonVe(w.env.DB, id), null, "tienDonVe trả null khi không đọc được hồ sơ người lập");
  const v = await veDon(w, id);
  assert.equal(v.thuDu, false);
  assert.equal(v.choDoiTacNop, false);
  const chan = await w.call("POST", "/api/ve/duong-dan", { as: ADM, body: { orderId: id } });
  assert.equal(chan.status, 403, chan.text);
  assert.equal(chan.json.error.code, "chua_thu_du");
});

test("không đọc được chủ đơn: vé khoá (không rơi về nhánh nhân viên)", async () => {
  const w = dung();
  const id = await moDon(w, A);
  assert.equal((await thu(w, id, A, { nguoiThu: "toi" })).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true, "đọc được thì mở");
  assert.notEqual(await app.tienDonVe(w.env.DB, id), null);
  w.sqlite.exec("DROP VIEW v_ord_order_owner; CREATE VIEW v_ord_order_owner AS SELECT id, staff_id FROM orders WHERE 0");
  assert.equal(await app.tienDonVe(w.env.DB, id), null);
});
