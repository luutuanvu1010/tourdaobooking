// ADR-0170 Đ2: đơn trả trước do tài khoản giữ quyền Đối tác lập chỉ mở vé khi tiền ĐÃ VỀ công ty. Qua ứng dụng THẬT (khung thử xac-nhan-khung, SQLite tạm).
// Tiêu chí là tình trạng của tiền, không phải ai ghi khoản. `thuDu` đọc bằng Quản trị qua GET /api/ve/don/:orderId (đối tác chưa có cổng vé — mở ở Task 3).
// Đơn của khung thử: 2 khách × 300.000 = 600.000 ₫. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, ADM, H, INTERN, LAI, PARTNER, SUP, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { datQuaHan } from "../../../tests/audit/tra-sau-moc.mjs";
import { CAU_DOI_TAC_CHO_NOP } from "../../shared/ve-cau-khoa.ts";

const AT = "2026-10-01T00:00:00.000Z";
const TONG = 600000;

function dung() {
  const w = setup();
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

// ===== Q-07 (Task 3.2 Đợt 3): câu khoá vé cho đối tác đang là người lập và còn số chờ nộp — cờ `nguoiLapCamTien` do máy chủ tính, câu ở `src/shared/ve-cau-khoa.ts` =====
// Bài DÒ giữ lại làm bài cố định (khẳng định ĐÚNG hành vi đã thấy 9/11, không phải hành vi mong muốn): `choNop` GỘP cả khoản đặt cọc do người KHÁC người lập cầm. Vì vậy câu
// «Tiền khách ở tay bạn…» (B-2 phương án 1) có thể sai người cầm tiền ⇒ dùng câu dự phòng B-2 (2). Hành vi này đổi thì xem lại câu.
test("dò Q-07: khoản đặt cọc Kế toán sửa người thu sang Bán hàng A (đối tác không còn cầm đồng nào) vẫn tính vào choNop của đơn đối tác", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], declaredDeposit: TONG } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} })).status, 200);
  assert.equal(w.q("SELECT company_collects_snapshot AS c FROM orders WHERE id = ?", id)[0].c, 1, "công tắc thu tiền đối tác Bật");
  const dongGoc = String(w.q("SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD' AND debtor_party_id = ?", id, `pty-${PARTNER}`)[0].id);
  const s = await w.call("POST", "/api/ledger/receipt-replacements", { as: ACC, body: { orderId: id, cu: [khoanDau(w, id)], moi: [{ soTien: TONG, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${A}` } }], lyDo: "Bán hàng A cầm tiền cọc" } });
  assert.equal(s.status, 201, s.text);
  const song = w.q("SELECT collector_party_id AS c, collector_role_code AS v, note FROM bil_payment_receipt r WHERE order_id = ? AND reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt y WHERE y.reverses_id = r.id)", id);
  assert.deepEqual(song.map((x: any) => [x.c, x.v, x.note]), [[`pty-${A}`, "STAFF", "Khách đặt cọc trước"]], "khoản sống mang dấu khoản khai, người cầm là A");
  assert.equal(w.q("SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND reverses_line_id = ?", id, dongGoc)[0].n, 1, "dòng giữ hộ gốc của đối tác đã bị đảo");
  const du = (ben: string) => Number(w.q("SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ? THEN amount WHEN creditor_party_id = ? THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = ?", ben, ben, id)[0].n);
  assert.equal(du(`pty-${PARTNER}`), 0, "đối tác không còn cầm đồng nào trên đơn");
  assert.equal(du(`pty-${A}`), TONG, "Bán hàng A cầm đủ tiền");
  const t = await app.tienDonVe(w.env.DB, id);
  assert.equal(t.choNop, TONG, "choNop GỘP số người khác cầm (hành vi đã thấy)");
  const v = await w.call("GET", `/api/ve/don/${id}`, { as: PARTNER });
  assert.equal(v.status, 200, v.text);
  assert.equal(v.json.choDoiTacNop, true);
  assert.equal(v.json.nguoiXemLaDoiTac, true);
  assert.equal(v.json.nguoiLapCamTien, true, "nên câu cho đối tác phải đúng cả khi tiền ở tay người khác: câu dự phòng B-2 (2)");
});

const duongDan = (w: any, id: string, as: string) => w.call("POST", "/api/ve/duong-dan", { as, body: { orderId: id } });
const veCua = async (w: any, id: string, as: string) => { const r = await w.call("GET", `/api/ve/don/${id}`, { as }); assert.equal(r.status, 200, r.text); return r.json; };
async function khoaCauMoi(w: any, id: string, as: string, moi: boolean, nhan: string) {
  const c = await duongDan(w, id, as);
  assert.equal(c.status, 403, `${nhan}: ${c.text}`);
  assert.equal(c.json.error.code, "chua_thu_du", nhan);
  if (moi) assert.equal(c.json.error.message, CAU_DOI_TAC_CHO_NOP, nhan);
  else assert.notEqual(c.json.error.message, CAU_DOI_TAC_CHO_NOP, nhan);
  assert.equal((await veCua(w, id, as)).nguoiLapCamTien, moi, nhan);
}

test("Q-07: công tắc Tắt, đối tác «Tôi thu» đủ: câu mới ở cả 403 lẫn cờ GET; Quản trị xem không có cờ", async () => {
  const w = setup({ kenhThuGia: async () => 0 });
  const id = await moDon(w, PARTNER);
  assert.equal(w.q("SELECT company_collects_snapshot AS c FROM orders WHERE id = ?", id)[0].c, 0);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "toi" })).status, 201);
  await khoaCauMoi(w, id, PARTNER, true, "Tắt + Tôi thu");
  assert.equal((await veDon(w, id)).nguoiLapCamTien, false, "Quản trị không phải đối tác");
});

test("Q-07: công tắc Bật, đối tác «Tôi thu» đủ: câu mới", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal(w.q("SELECT company_collects_snapshot AS c FROM orders WHERE id = ?", id)[0].c, 1);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "toi" })).status, 201);
  await khoaCauMoi(w, id, PARTNER, true, "Bật + Tôi thu");
});

test("Q-07: công tắc Bật, đối tác khai «Công ty thu»: giữ câu «Công ty chưa xác nhận…» (không có số chờ nộp)", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "cong_ty" })).status, 201);
  const v = await veCua(w, id, PARTNER);
  assert.equal(v.choDoiTacNop, true);
  await khoaCauMoi(w, id, PARTNER, false, "Bật + Công ty thu");
});

test("Q-07: đơn đã huỷ mà tiền «Tôi thu» còn ở tay đối tác: không ra câu mới", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "toi" })).status, 201);
  const h = await w.call("POST", `/api/orders/${id}/status`, { as: PARTNER, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(h.status, 200, h.text);
  assert.ok(((await app.tienDonVe(w.env.DB, id))?.choNop ?? 0) > 0, "tiền vẫn còn chờ nộp sau khi huỷ");
  await khoaCauMoi(w, id, PARTNER, false, "đơn huỷ");
});

test("Q-07: tài khoản lai Bán hàng + Đối tác phụ trách đơn đối tác khác lập: không ra câu mới (không phải người lập)", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { nguoiThu: "toi" })).status, 201);
  w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)").run(crypto.randomUUID(), id, `pty-${LAI}`, AT, AT, AT);
  assert.equal((await veCua(w, id, LAI)).nguoiXemLaDoiTac, true);
  await khoaCauMoi(w, id, LAI, false, "tài khoản lai, đơn người khác lập");
  await khoaCauMoi(w, id, PARTNER, true, "chính người lập vẫn nghe câu mới");
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
const CAU_CHUA_KIEM = "Chưa kiểm tra được vé của đơn này nên chưa huỷ được. Bạn thử lại sau.";
const PF = "88888888-8888-4888-8888-888888888889"; // Đối tác + Hướng dẫn viên (tài khoản lai), đang phụ trách
async function nhapKho(w: any, soVe: number, batDau = 1) {
  const lo = await w.call("POST", "/api/ve/lo", { as: ADM, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: Buffer.from(PNG(i + batDau)).toString("base64"), maVe: `BI.MAT.${i + batDau}`, tuNgay: "2026-01-01", denNgay: "2027-12-31" }));
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
  assert.equal(r1.json.error.message, CAU_CHUA_KIEM, "không đọc được thì KHÔNG nói «đã mở vé» (sai sự thật)");
  const r2 = await w.call("POST", `/api/orders/${b}/handler-cancel`, { as: PF, body: { reason: "customer_requested" } });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.message, CAU_CHUA_KIEM);
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

// ===== ADR-0170 Đ1: đối tác xem và gửi vé của đơn MÌNH lập (sáu route sang cổng `orders`, `ve.cap.send` cột Đối tác = own) =====
const PARTNER2 = "88888888-8888-4888-8888-888888888890";
const phanBo = (w: any, id: string) => w.q("SELECT id, revealed_at FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL ORDER BY slot_no", id) as { id: string; revealed_at: string | null }[];
const phaiThu = async (w: any, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order.total as number;
/** Đơn ZA1 của đối tác đã xác nhận, có 2 vé giữ, Kế toán ghi «Công ty thu» đủ tiền (tiền ĐÃ về công ty). */
async function donDoiTacDuTien(w: any, nhap = true) {
  if (nhap) await nhapKho(w, 3);
  const id = await donDaXacNhan(w, PARTNER);
  assert.equal((await thu(w, id, ACC, { soTien: await phaiThu(w, id), nguoiThu: "cong_ty" })).status, 201);
  assert.equal(phanBo(w, id).length, 2);
  return id;
}

test("Đ1: đối tác, đơn tự lập, Kế toán ghi đủ: xem danh sách, mở ảnh (có dấu lộ), giao (ghi một dòng), tạo và thu hồi đường dẫn, cấp bù", async () => {
  const w = dung();
  const id = await donDoiTacDuTien(w);
  const ds = await w.call("GET", `/api/ve/don/${id}`, { as: PARTNER });
  assert.equal(ds.status, 200, ds.text);
  assert.equal(ds.json.thuDu, true);
  assert.equal(ds.json.veXem.length, 2);
  assert.equal(phanBo(w, id)[0]!.revealed_at, null);
  const anh = await w.call("GET", `/api/ve/anh/${ds.json.veXem[0].id}`, { as: PARTNER });
  assert.equal(anh.status, 200);
  assert.ok(phanBo(w, id)[0]!.revealed_at, "mở ảnh đóng dấu lộ");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 've_xem_anh'", id)[0].n, 1);
  const g = await w.call("POST", "/api/ve/giao", { as: PARTNER, body: { orderId: id, requestId: crypto.randomUUID() } });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.daGiao, 2);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 've_giao'", id)[0].n, 1);
  const d = await w.call("POST", "/api/ve/duong-dan", { as: PARTNER, body: { orderId: id } });
  assert.equal(d.status, 200, d.text);
  const th = await w.call("POST", `/api/ve/duong-dan/${d.json.id}/thu-hoi`, { as: PARTNER, body: {} });
  assert.equal(th.status, 200, th.text);
  const cap = await w.call("POST", "/api/ve/cap", { as: PARTNER, body: { orderId: id } });
  assert.equal(cap.status, 200, cap.text);
  assert.equal(phanBo(w, id).length, 2, "cấp bù chạy lại không giữ thừa");
});

test("Đ1: đơn của đối tác khác và đơn văn phòng lập: sáu route 404/403, không đọc kho, không dấu lộ", async () => {
  const w = dung();
  seedStaff(w.sqlite, { id: PARTNER2, phone: "0900000019", name: "Đối tác khác", perms: ["PARTNER"] });
  await nhapKho(w, 6);
  const cua = await donDoiTacDuTien(w, false); // của PARTNER
  const vp = await donDaXacNhan(w, A); // văn phòng lập
  assert.equal((await thu(w, vp, ACC, { soTien: await phaiThu(w, vp), nguoiThu: "cong_ty" })).status, 201);
  for (const [id, as] of [[cua, PARTNER2], [vp, PARTNER], [vp, PARTNER2]] as [string, string][]) {
    const pb = phanBo(w, id)[0]!.id;
    const truoc = w.r2VeDienTu.soLan.get;
    const kq = [
      await w.call("GET", `/api/ve/don/${id}`, { as }),
      await w.call("GET", `/api/ve/anh/${pb}`, { as }),
      await w.call("POST", "/api/ve/giao", { as, body: { orderId: id, requestId: crypto.randomUUID() } }),
      await w.call("POST", "/api/ve/cap", { as, body: { orderId: id } }),
      await w.call("POST", "/api/ve/duong-dan", { as, body: { orderId: id } }),
    ];
    for (const r of kq) assert.ok(r.status === 404 || r.status === 403, `${as}/${id}: ${r.status} ${r.text}`);
    assert.equal(w.r2VeDienTu.soLan.get, truoc, "không đọc kho");
    assert.ok(phanBo(w, id).every((x) => x.revealed_at === null), "không dấu lộ");
  }
  // thu hồi đường dẫn của người khác: văn phòng tạo, đối tác không thu hồi được
  const link = await w.call("POST", "/api/ve/duong-dan", { as: ADM, body: { orderId: cua } });
  assert.equal(link.status, 200, link.text);
  const th = await w.call("POST", `/api/ve/duong-dan/${link.json.id}/thu-hoi`, { as: PARTNER2, body: {} });
  assert.ok(th.status === 404 || th.status === 403, th.text);
  assert.equal(w.q("SELECT revoked_at FROM vdt_guest_link WHERE id = ?", link.json.id)[0].revoked_at, null);
});

test("Đ1: Hướng dẫn viên đang phụ trách và Thực tập có đơn của mình vẫn 403 ở GET /api/ve/don/:orderId", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donDaXacNhan(w, A);
  w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)").run(crypto.randomUUID(), id, `pty-${H}`, AT, AT, AT);
  const f = await w.call("GET", `/api/ve/don/${id}`, { as: H });
  assert.equal(f.status, 403, f.text);
  const o = await w.call("POST", "/api/orders", { as: INTERN, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))] } });
  assert.equal(o.status, 201, o.text);
  const t = await w.call("GET", `/api/ve/don/${o.json.order.id}`, { as: INTERN });
  assert.equal(t.status, 403, t.text);
});

test("Đ1: đối tác không vào kho, lô, cài đặt vé; không phản hồi nào của đối tác chứa mã vé", async () => {
  const w = dung();
  const id = await donDoiTacDuTien(w);
  for (const [m, u] of [["GET", "/api/ve/kho"], ["GET", "/api/ve/lo"], ["POST", "/api/ve/lo"], ["GET", "/api/ve/cai-dat"], ["PUT", "/api/ve/cai-dat"], ["GET", "/api/ve/lo-da-huy"]] as [string, string][]) {
    assert.equal((await w.call(m, u, { as: PARTNER, ...(m === "GET" ? {} : { body: {} }) })).status, 403, `${m} ${u}`);
  }
  const ds = await w.call("GET", `/api/ve/don/${id}`, { as: PARTNER });
  const g = await w.call("POST", "/api/ve/giao", { as: PARTNER, body: { orderId: id, requestId: crypto.randomUUID() } });
  const d = await w.call("POST", "/api/ve/duong-dan", { as: PARTNER, body: { orderId: id } });
  for (const r of [ds, g, d]) assert.doesNotMatch(r.text, /BI\.MAT|vdt\//, r.text);
});

test("Đ1: đối tác đơn của mình nhưng tiền chưa về công ty (tự ghi «Tôi thu»): 403 chua_thu_du, đúng câu cho đối tác", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donDaXacNhan(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { soTien: await phaiThu(w, id), nguoiThu: "toi" })).status, 201);
  const r = await w.call("POST", "/api/ve/duong-dan", { as: PARTNER, body: { orderId: id } });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "chua_thu_du");
  assert.equal((await w.call("GET", `/api/ve/anh/${phanBo(w, id)[0]!.id}`, { as: PARTNER })).status, 403);
});

// ===== Vòng sửa 1: hai khe đua và 403 tuyệt đối =====
test("Đ3 khe đua: vé vừa được mở GIỮA lúc kiểm và lúc ghi lô huỷ ⇒ cả lô lui, 409 đúng câu, đơn còn confirmed, không dòng bil_* / audit_log mới (cả hai đường huỷ)", async () => {
  const w = dung();
  seedStaff(w.sqlite, { id: PF, phone: "0900000018", name: "Lai PF", perms: ["PARTNER", "FIELD"] });
  await nhapKho(w, 6);
  const a = await donDaXacNhan(w, PARTNER);
  const b = await donDaXacNhan(w, A, PF);
  for (const [id, goi] of [[a, () => huy(w, a, PARTNER)], [b, () => w.call("POST", `/api/orders/${b}/handler-cancel`, { as: PF, body: { reason: "customer_requested" } })]] as [string, () => Promise<any>][]) {
    assert.equal(soVeGiu(w, id), 2);
    const truoc = dem(w);
    // lúc kiểm (veDaMoCuaDon) chưa mở; ngay trước lô có câu bảo vệ, vé được mở (đối tác khác bấm xem ảnh)
    w.chenTruocLo((stmts: any[]) => stmts.some((x) => String(x.sql).includes("don_da_mo_ve")), async () => { moVe(w, id); });
    const r = await goi();
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.message, CAU_CHAN);
    assert.equal(trangThai(w, id), "confirmed");
    assert.deepEqual(dem(w), truoc);
    assert.equal(soVeGiu(w, id), 2, "vé không bị trả về kho");
  }
});

test("Đ3 khe đua: câu bảo vệ chỉ áp cho người giữ quyền Đối tác — văn phòng huỷ đơn đã mở vé vẫn qua", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donDaXacNhan(w, PARTNER);
  moVe(w, id);
  assert.equal((await huy(w, id, ADM)).status, 200);
});

test("Đ1 khe đua: lệnh huỷ chen vào giữa lúc đọc phân bổ và lúc đóng dấu ⇒ /anh 404, không đọc kho (đối tác và văn phòng)", async () => {
  for (const [as, dat] of [[PARTNER, PARTNER], [ADM, A]] as [string, string][]) {
    const w = dung();
    await nhapKho(w, 3);
    const id = await donDaXacNhan(w, dat);
    assert.equal((await thu(w, id, ACC, { soTien: await phaiThu(w, id), nguoiThu: "cong_ty" })).status, 201);
    const pb = phanBo(w, id)[0]!.id;
    const truoc = w.r2VeDienTu.soLan.get;
    w.chenTruocLo((stmts: any[]) => stmts.some((x) => String(x.sql).includes("SET revealed_at")), async () => {
      w.sqlite.prepare("UPDATE vdt_allocation SET released_at = ?, release_reason = 'DON_HUY' WHERE id = ?").run(AT, pb); // lô huỷ đã trả vé về kho
    });
    const r = await w.call("GET", `/api/ve/anh/${pb}`, { as });
    assert.equal(r.status, 404, `${as}: ${r.text}`);
    assert.equal(w.r2VeDienTu.soLan.get, truoc, "không đọc kho");
  }
});

test("Đ1: Hướng dẫn viên, Thực tập, Kế toán ở sáu route vé: 403 NGAY dù mã đơn / vé / đường dẫn không tồn tại", async () => {
  const w = dung();
  const ma = crypto.randomUUID();
  const pb = "0".repeat(32);
  for (const as of [H, INTERN]) {
    const kq = [
      await w.call("GET", `/api/ve/don/${ma}`, { as }),
      await w.call("GET", `/api/ve/anh/${pb}`, { as }),
      await w.call("POST", "/api/ve/giao", { as, body: { orderId: ma, requestId: crypto.randomUUID() } }),
      await w.call("POST", "/api/ve/cap", { as, body: { orderId: ma } }),
      await w.call("POST", "/api/ve/duong-dan", { as, body: { orderId: ma } }),
      await w.call("POST", `/api/ve/duong-dan/${ma}/thu-hoi`, { as, body: {} }),
    ];
    for (const r of kq) assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  // Kế toán vẫn xem được số lượng (order.view), không có ô gửi: GET mã không tồn tại 404 như cũ, năm route kia 403
  assert.equal((await w.call("GET", `/api/ve/don/${ma}`, { as: ACC })).status, 404);
  assert.equal((await w.call("POST", "/api/ve/cap", { as: ACC, body: { orderId: ma } })).status, 403);
});

// Sửa sau người kiểm độc lập: nộp MỘT PHẦN không được mở vé (khoản «Công ty thu» có dòng giữ hộ rời diện chờ xác nhận ngay khi nộp một phần). Đơn của khung thử 600.000 ₫.
for (const hinhThuc of ["CASH", "OTHER"]) {
  test(`đối tác ghi «Công ty thu» (${hinhThuc}) đủ tiền: nộp một phần vẫn khoá, nộp đủ mới mở`, async () => {
    const w = dung();
    const id = await moDon(w, PARTNER);
    assert.equal((await thu(w, id, PARTNER, { hinhThuc, nguoiThu: "cong_ty" })).status, 201);
    assert.equal((await veDon(w, id)).thuDu, false);
    assert.equal((await nop(w, id, 1000)).status, 201);
    assert.equal((await veDon(w, id)).thuDu, false, "nộp 1.000");
    assert.equal((await nop(w, id, TONG - 1000 - 1)).status, 201);
    assert.equal((await veDon(w, id)).thuDu, false, "thiếu 1 đồng");
    assert.equal((await nop(w, id, 1)).status, 201);
    assert.equal((await veDon(w, id)).thuDu, true, "nộp đủ");
  });
}

test("hai khoản «Công ty thu» 500.000 + 100.000: nộp 500.001 vẫn khoá; nộp đủ mở", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, PARTNER, { soTien: 500000, nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await thu(w, id, PARTNER, { soTien: 100000, nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await nop(w, id, 500001)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false);
  assert.equal((await nop(w, id, 99999)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true);
});

test("Quản trị ghi «Công ty thu» tiền mặt trên đơn đối tác, nộp một phần cho Quản trị: khoá; nộp đủ mở", async () => {
  const w = dung();
  const id = await moDon(w, PARTNER);
  assert.equal((await thu(w, id, ADM, { nguoiThu: "cong_ty" })).status, 201);
  const nopQT = (soTien: number) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: `pty-${ADM}`, phanBo: [{ orderId: id, soTien }] } });
  assert.equal((await nopQT(1000)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, false);
  assert.equal((await nopQT(TONG - 1000)).status, 201);
  assert.equal((await veDon(w, id)).thuDu, true);
});


// ===== Sau kiểm độc lập lần hai (I-B): đơn CREDIT (Trả sau) của đối tác mở vé theo hạn, không theo tiền đã thu =====
async function donTraSauDoiTac(w: any) {
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: `pty-${PARTNER}`, hanMuc: 50_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))], paymentTerm: "CREDIT" } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const x = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(x.status, 200, x.text);
  assert.equal(w.q("SELECT payment_term FROM orders WHERE id = ?", id)[0].payment_term, "CREDIT", "chống bài rỗng: đơn là Trả sau");
  return id;
}
const hetHan = (w: any, id: string) => datQuaHan(w.sqlite, id);

test("I-B: đơn Trả sau của đối tác, trong hạn, chưa thu đồng nào: tự mở /anh, /giao, /duong-dan 200", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donTraSauDoiTac(w);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id)[0].n, 0, "chưa thu đồng nào");
  const ds = await w.call("GET", `/api/ve/don/${id}`, { as: PARTNER });
  assert.equal(ds.status, 200, ds.text);
  assert.equal(ds.json.veXem.length, 2);
  assert.equal((await w.call("GET", `/api/ve/anh/${ds.json.veXem[0].id}`, { as: PARTNER })).status, 200);
  assert.equal((await w.call("POST", "/api/ve/giao", { as: PARTNER, body: { orderId: id, requestId: crypto.randomUUID() } })).status, 200);
  assert.equal((await w.call("POST", "/api/ve/duong-dan", { as: PARTNER, body: { orderId: id } })).status, 200);
});

test("I-B: đơn Trả sau quá hạn còn nợ: vé chưa mở 403, vé đã mở vẫn 200", async () => {
  const w = dung();
  await nhapKho(w, 3);
  const id = await donTraSauDoiTac(w);
  const pb = phanBo(w, id).map((x) => x.id);
  assert.equal((await w.call("GET", `/api/ve/anh/${pb[0]}`, { as: PARTNER })).status, 200, "mở vé 1 trong hạn");
  hetHan(w, id);
  const chan = await w.call("GET", `/api/ve/anh/${pb[1]}`, { as: PARTNER });
  assert.equal(chan.status, 403, chan.text);
  assert.equal(chan.json.error.code, "tra_sau_qua_han");
  assert.match(chan.json.error.message, /thanh toán phần còn nợ/, "đối tác không ghi được khoản thu nên câu không bảo «thu đủ tiền»");
  assert.doesNotMatch(chan.json.error.message, /Kế toán/);
  assert.equal((await w.call("GET", `/api/ve/anh/${pb[0]}`, { as: PARTNER })).status, 200, "vé đã mở vẫn xem");
  assert.equal((await w.call("POST", "/api/ve/giao", { as: PARTNER, body: { orderId: id, requestId: crypto.randomUUID() } })).status, 403, "giao cả đơn khi còn vé chưa mở");
});
