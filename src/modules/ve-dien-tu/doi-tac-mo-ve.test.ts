// ADR-0170 Đ2: đơn trả trước do tài khoản giữ quyền Đối tác lập chỉ mở vé khi tiền ĐÃ VỀ công ty. Qua ứng dụng THẬT (khung thử xac-nhan-khung, SQLite tạm).
// Tiêu chí là tình trạng của tiền, không phải ai ghi khoản. `thuDu` đọc bằng Quản trị qua GET /api/ve/don/:orderId (đối tác chưa có cổng vé — mở ở Task 3).
// Đơn của khung thử: 2 khách × 300.000 = 600.000 ₫. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../../../tests/audit/harness.mjs";
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

// ===== ADR-0170 Đ3: đối tác không tự huỷ đơn đã mở vé (hai đường huỷ: POST /status và POST /handler-cancel) =====
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const CAU_CHAN = "Đơn đã mở vé nên bạn không tự huỷ được. Liên hệ văn phòng.";
const PF = "88888888-8888-4888-8888-888888888889"; // Đối tác + Hướng dẫn viên (tài khoản lai), đang phụ trách
async function nhapKho(w: any, soVe: number) {
  const lo = await w.call("POST", "/api/ve/lo", { as: ADM, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: Buffer.from(PNG(i + 1)).toString("base64"), maVe: `BI.MAT.${i + 1}`, tuNgay: "2026-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: ADM, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: ADM, body: {} })).status, 200);
}
/** Đơn ZA1 (2 khách) đã xác nhận, kho 3 vé ⇒ giữ 2 vé. `dat` = người lập; `handler` = người phụ trách chọn sẵn. */
async function donDaXacNhan(w: any, dat: string, handler?: string) {
  const r = await w.call("POST", "/api/orders", { as: dat, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const x = dat === PARTNER ? await w.call("POST", `/api/orders/${id}/gui-don`, { as: dat, body: {} }) : await w.call("POST", `/api/orders/${id}/status`, { as: dat, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "confirmed");
  // Tài khoản lai Đối tác + HDV không chọn được qua route (409 invalid_assignee) nên gán thẳng dòng HANDLE đang mở — đủ để `isAssigned` đúng.
  if (handler) w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)").run(crypto.randomUUID(), id, `pty-${handler}`, AT, AT, AT);
  return id;
}
const moVe = (w: any, id: string) => w.sqlite.prepare("UPDATE vdt_allocation SET revealed_at = ? WHERE order_id = ? AND released_at IS NULL").run(AT, id);
const soVeGiu = (w: any, id: string) => Number(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL", id)[0].n);
const trangThai = (w: any, id: string) => String(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status);
function dem(w: any) {
  const bang = w.q("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'bil\\_%' ESCAPE '\\' ORDER BY name").map((x: any) => String(x.name));
  return { audit: Number(w.q("SELECT count(*) AS n FROM audit_log")[0].n), bil: bang.map((t: string) => Number(w.q(`SELECT count(*) AS n FROM ${t}`)[0].n)) };
}
const huy = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });

test("Đ3: đối tác huỷ đơn đã mở vé qua /status: 409 đúng câu, đơn giữ nguyên, sổ không đổi; hai lần song song cùng 409", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donDaXacNhan(w, PARTNER);
  assert.equal(soVeGiu(w, id), 2);
  moVe(w, id);
  const truoc = dem(w);
  const [a, b] = await Promise.all([huy(w, id, PARTNER), huy(w, id, PARTNER)]);
  for (const r of [a, b]) { assert.equal(r.status, 409, r.text); assert.equal(r.json.error.message, CAU_CHAN); }
  assert.equal(trangThai(w, id), "confirmed");
  assert.deepEqual(dem(w), truoc);
});

test("Đ3: tài khoản lai Đối tác + Hướng dẫn viên đang phụ trách huỷ đơn đã mở vé qua handler-cancel: 409; đơn chưa mở vé: huỷ được", async () => {
  const w = dung();
  seedStaff(w.sqlite, { id: PF, phone: "0900000018", name: "Lai PF", perms: ["PARTNER", "FIELD"] });
  await nhapKho(w, 3);
  const id = await donDaXacNhan(w, A, PF);
  moVe(w, id);
  const truoc = dem(w);
  const r = await w.call("POST", `/api/orders/${id}/handler-cancel`, { as: PF, body: { reason: "customer_requested" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, CAU_CHAN);
  assert.equal(trangThai(w, id), "confirmed");
  assert.deepEqual(dem(w), truoc);
  const chua = await donDaXacNhan(w, A, PF);
  const ok = await w.call("POST", `/api/orders/${chua}/handler-cancel`, { as: PF, body: { reason: "customer_requested" } });
  assert.equal(ok.status, 200, ok.text);
});

test("Đ3: đối tác huỷ đơn CHƯA mở vé: 200; Quản trị huỷ đơn ĐÃ mở vé: 200", async () => {
  const w = dung();
  await nhapKho(w, 6);
  const chua = await donDaXacNhan(w, PARTNER);
  assert.equal((await huy(w, chua, PARTNER)).status, 200);
  assert.equal(trangThai(w, chua), "cancelled");
  const da = await donDaXacNhan(w, PARTNER);
  moVe(w, da);
  assert.equal((await huy(w, da, ADM)).status, 200);
  assert.equal(trangThai(w, da), "cancelled");
});

test("Đ3: không đọc được vé đã mở thì chặn (veDaMoCuaDon trả null) — cả hai đường huỷ", async () => {
  const w = dung();
  seedStaff(w.sqlite, { id: PF, phone: "0900000018", name: "Lai PF", perms: ["PARTNER", "FIELD"] });
  await nhapKho(w, 6);
  const a = await donDaXacNhan(w, PARTNER); // chưa mở vé nào: đọc được thì huỷ được
  const b = await donDaXacNhan(w, A, PF);
  w.sqlite.exec("PRAGMA legacy_alter_table = ON; ALTER TABLE vdt_allocation RENAME TO vdt_allocation_hong");
  const truoc = dem(w);
  const r1 = await huy(w, a, PARTNER);
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.message, CAU_CHAN);
  const r2 = await w.call("POST", `/api/orders/${b}/handler-cancel`, { as: PF, body: { reason: "customer_requested" } });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(trangThai(w, a), "confirmed");
  assert.equal(trangThai(w, b), "confirmed");
  assert.deepEqual(dem(w), truoc);
});

test("Đ3: GET /api/orders/:id trả coVeDaMo CHỈ cho người giữ quyền Đối tác; nhân viên không có khoá", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donDaXacNhan(w, PARTNER);
  const truoc = await w.call("GET", `/api/orders/${id}`, { as: PARTNER });
  assert.equal(truoc.status, 200, truoc.text);
  assert.equal(truoc.json.coVeDaMo, false);
  moVe(w, id);
  assert.equal((await w.call("GET", `/api/orders/${id}`, { as: PARTNER })).json.coVeDaMo, true);
  const nv = await w.call("GET", `/api/orders/${id}`, { as: ADM });
  assert.equal(nv.status, 200, nv.text);
  assert.equal("coVeDaMo" in nv.json, false, "nhân viên không thấy cờ");
});
