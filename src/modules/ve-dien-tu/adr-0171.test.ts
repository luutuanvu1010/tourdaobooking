// ADR-0171: siết ba đường vé và tiền sau kiểm độc lập ADR-0170. Qua ứng dụng THẬT (khung thử xac-nhan-khung, SQLite tạm). Tên, SĐT là GIẢ.
//   Đ1: người giữ quyền Đối tác không tự sửa số khách đơn đã mở vé (hai route).
//   Đ2: đường dẫn khách — vé đã mở vẫn xem; vé chưa mở chờ đủ tiền; số thứ tự vé không dồn.
//   Đ3: chuyển cọc ghi đúng người đang giữ; máy chủ từ chối «Công ty giữ» khi đơn cũ còn người chưa nộp.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, ADM, LAI, PARTNER, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const PF = "88888888-8888-4888-8888-888888888889"; // Đối tác + Hướng dẫn viên (lai), đang phụ trách
const CAU_SUA = "Đơn đã mở vé nên bạn không tự sửa số khách được. Liên hệ văn phòng.";
const CAU_CHUA_KIEM_SUA = "Chưa kiểm tra được vé của đơn này nên chưa sửa số khách được. Bạn thử lại sau.";
const IP = (n: number) => ({ "cf-connecting-ip": `203.0.113.${n}` });

function dung() {
  const w = setup();
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${PARTNER}`, `pty-${PARTNER}`, AT, AT);
  seedStaff(w.sqlite, { id: PF, phone: "0900000018", name: "Lai PF", perms: ["PARTNER", "FIELD"] });
  return w;
}
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
async function nhapKho(w: any, soVe: number) {
  const lo = await w.call("POST", "/api/ve/lo", { as: ADM, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: Buffer.from(PNG(i + 1)).toString("base64"), maVe: `BI.MAT.${i + 1}`, tuNgay: "2026-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: ADM, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: ADM, body: {} })).status, 200);
}
/** Đơn ZA1 (2 khách) đã xác nhận. `handler` = người phụ trách chọn sẵn (gán thẳng dòng HANDLE đang mở). */
async function donDaXacNhan(w: any, dat: string, handler?: string) {
  const r = await w.call("POST", "/api/orders", { as: dat, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const x = await w.xacNhanDon(id, dat); // người giữ quyền Đối tác (kể cả lai) đi đường «Gửi đơn»
  assert.equal(x.status, 200, x.text);
  if (handler) w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)").run(crypto.randomUUID(), id, `pty-${handler}`, AT, AT, AT);
  return id;
}
const moVe = (w: any, id: string) => w.sqlite.prepare("UPDATE vdt_allocation SET revealed_at = ? WHERE order_id = ? AND released_at IS NULL").run(AT, id);
const soVeGiu = (w: any, id: string) => Number(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL", id)[0].n);
const dichVuId = (w: any, id: string) => w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id as string;
const pax = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });
const suaKhach = (w: any, id: string, as: string, soNguoi: number) => w.call("POST", `/api/orders/${id}/money-edit`, { as, body: { lyDo: soNguoi > 2 ? "THEM_NGUOI" : "BOT_NGUOI", services: [{ id: dichVuId(w, id), pax: pax(soNguoi) }] } });
const suaKhachHdv = (w: any, id: string, as: string, soNguoi: number) => w.call("POST", `/api/orders/${id}/handler-money-edit`, { as, body: { reason: "Khách đổi số người", services: [{ id: dichVuId(w, id), pax: pax(soNguoi) }] } });
const dauVet = (w: any, id: string) => ({
  capNhat: String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at),
  dieuChinh: Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action LIKE 'order_money%'", id)[0].n),
  ve: soVeGiu(w, id),
});

// ===================================== Đ1 =====================================
test("Đ1: tài khoản lai Bán hàng + Đối tác, đơn đã mở vé: tăng VÀ giảm số khách đều 409, đơn không đổi; chưa mở vé: 200; Quản trị: 200", async () => {
  const w = dung();
  await nhapKho(w, 8);
  const daMo = await donDaXacNhan(w, LAI);
  moVe(w, daMo);
  const truoc = dauVet(w, daMo);
  for (const n of [4, 1]) {
    const r = await suaKhach(w, daMo, LAI, n);
    assert.equal(r.status, 409, `${n}: ${r.text}`);
    assert.equal(r.json.error.code, "don_da_mo_ve");
    assert.equal(r.json.error.message, CAU_SUA);
  }
  assert.deepEqual(dauVet(w, daMo), truoc, "đơn và nhật ký không đổi");
  const chua = await donDaXacNhan(w, LAI);
  const ok = await suaKhach(w, chua, LAI, 3);
  assert.equal(ok.status, 200, ok.text);
  const qt = await suaKhach(w, daMo, ADM, 3);
  assert.equal(qt.status, 200, `Quản trị không bị chặn: ${qt.text}`);
});

test("Đ1: không đọc được tình trạng vé thì chặn 409 «chưa kiểm tra được», đơn không đổi", async () => {
  const w = dung();
  await nhapKho(w, 4);
  const id = await donDaXacNhan(w, LAI);
  w.sqlite.exec("PRAGMA legacy_alter_table = ON; ALTER TABLE vdt_allocation RENAME TO vdt_allocation_hong");
  const truoc = Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n);
  const capTruoc = String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at);
  const r = await suaKhach(w, id, LAI, 3);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, CAU_CHUA_KIEM_SUA, "không nói «đã mở vé» khi chưa đọc được");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n), truoc);
  assert.equal(String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at), capTruoc);
});

test("Đ1: đường Hướng dẫn viên (handler-money-edit): tài khoản lai Đối tác + Hướng dẫn viên đang phụ trách bị chặn khi đã mở vé; chưa mở vé thì sửa được", async () => {
  const w = dung();
  await nhapKho(w, 8);
  const daMo = await donDaXacNhan(w, A, PF);
  moVe(w, daMo);
  const truoc = dauVet(w, daMo);
  for (const n of [4, 1]) {
    const r = await suaKhachHdv(w, daMo, PF, n);
    assert.equal(r.status, 409, `${n}: ${r.text}`);
    assert.equal(r.json.error.message, CAU_SUA);
  }
  assert.deepEqual(dauVet(w, daMo), truoc);
  const chua = await donDaXacNhan(w, A, PF);
  const ok = await suaKhachHdv(w, chua, PF, 3);
  assert.equal(ok.status, 200, ok.text);
});

test("Đ1: người không giữ quyền Đối tác (Bán hàng thường) sửa số khách đơn đã mở vé vẫn qua", async () => {
  const w = dung();
  await nhapKho(w, 8);
  const id = await donDaXacNhan(w, A);
  moVe(w, id);
  assert.equal((await suaKhach(w, id, A, 3)).status, 200);
});

// ===================================== Đ2 =====================================
async function donCoDuongDan(w: any) {
  await nhapKho(w, 8);
  const id = await donDaXacNhan(w, PARTNER);
  const phaiThu = async () => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order.total as number;
  const thu = (soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal((await thu(await phaiThu())).status, 201);
  const d = await w.call("POST", "/api/ve/duong-dan", { as: PARTNER, body: { orderId: id } });
  assert.equal(d.status, 200, d.text);
  const token = String(d.json.duongDan).replace("/ve/", "");
  return { id, token, phaiThu, thu };
}
const trang = (w: any, token: string, n = 1) => w.call("GET", `/ve/${token}`, { headers: IP(n) });
const anh = (w: any, token: string, slot: number, n = 1) => w.call("GET", `/api/ve-khach/${token}/anh/${slot}`, { headers: IP(n) });
const slotTrang = (t: string) => [...t.matchAll(/\/anh\/(\d+)"/g)].map((m) => Number(m[1]));

test("Đ2: số khách 2→4 chưa thu thêm: trang khách thấy 2 vé (số 1, 2), ảnh vé 3, 4 là 404, không nhật ký, không dấu, không đọc kho; thu đủ: thấy 4 vé, vé 1, 2 giữ nguyên số", async () => {
  const w = dung();
  const { id, token, phaiThu, thu } = await donCoDuongDan(w);
  const t0 = await trang(w, token);
  assert.deepEqual(slotTrang(t0.text), [1, 2]);
  const anh1Truoc = (await anh(w, token, 1)).bytes;
  assert.equal((await suaKhach(w, id, ADM, 4)).status, 200);
  assert.equal(soVeGiu(w, id), 4);
  const dauLo = () => w.q("SELECT slot_no, revealed_at FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL ORDER BY slot_no", id).map((x: any) => x.revealed_at !== null);
  assert.deepEqual(dauLo(), [true, true, false, false], "chỉ hai vé của đường dẫn đã lộ");
  const nk = Number(w.q("SELECT count(*) AS n FROM audit_log")[0].n);
  const kho = w.r2VeDienTu.soLan.get;
  const t1 = await trang(w, token);
  assert.equal(t1.status, 200);
  assert.deepEqual(slotTrang(t1.text), [1, 2], "chỉ thấy hai vé đã mở");
  assert.match(t1.text, /Còn 2 vé chưa sẵn sàng\. Bạn liên hệ người đặt giúp\./);
  assert.doesNotMatch(t1.text, /tiền|₫|thu đủ|thiếu/i, "trang khách không nói chuyện tiền");
  for (const s of [3, 4]) { const r = await anh(w, token, s); assert.equal(r.status, 404, `vé ${s}`); }
  assert.deepEqual(dauLo(), [true, true, false, false], "không đóng dấu");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log")[0].n), nk, "không nhật ký");
  assert.equal(w.r2VeDienTu.soLan.get, kho, "không đọc kho");
  // vé đã mở vẫn tải được dù đơn đang thiếu tiền
  const a1 = await anh(w, token, 1);
  assert.equal(a1.status, 200);
  assert.deepEqual([...a1.bytes], [...anh1Truoc], "vé 1 vẫn là vé 1");
  assert.equal((await anh(w, token, 2)).status, 200);
  // thu đủ phần tăng
  const du = (await phaiThu()) - Number(w.q("SELECT sum(amount) AS n FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", id)[0].n);
  assert.ok(du > 0);
  for (const x of [du - 1000, 1000]) { const r = await thu(x); assert.equal(r.status, 201, r.text); } // hai khoản khác số: tránh cảnh báo «có thể trùng»
  const t2 = await trang(w, token);
  assert.deepEqual(slotTrang(t2.text), [1, 2, 3, 4], "đủ tiền thì thấy cả 4 vé, số cũ giữ nguyên");
  assert.doesNotMatch(t2.text, /chưa sẵn sàng/);
  assert.equal((await anh(w, token, 3)).status, 200);
  assert.equal((await anh(w, token, 4)).status, 200);
  assert.deepEqual([...(await anh(w, token, 1)).bytes], [...anh1Truoc], "vé 1 vẫn là vé 1 sau khi vé mới hiện");
  assert.deepEqual(dauLo(), [true, true, true, true]);
});

test("Đ2: số thứ tự không dồn — chỉ vé số 2 đã mở thì trang chỉ có vé số 2 (không đánh lại thành số 1)", async () => {
  const w = dung();
  await nhapKho(w, 8);
  const id = await donDaXacNhan(w, PARTNER);
  const tong = (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order.total as number;
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const pb = w.q("SELECT id FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL ORDER BY slot_no", id).map((x: any) => String(x.id));
  assert.equal((await w.call("GET", `/api/ve/anh/${pb[1]}`, { as: ADM })).status, 200, "chỉ vé số 2 lộ");
  assert.equal((await suaKhach(w, id, ADM, 4)).status, 200);
  const token = "T".repeat(43);
  const { bamToken } = await import("./duong-dan-khach.ts");
  w.sqlite.prepare("INSERT INTO vdt_guest_link (id, order_id, token_hash, expires_at, created_at, updated_at) VALUES ('l1', ?1, ?2, '2099-01-01T00:00:00.000Z', ?3, ?3)").run(id, await bamToken(token), AT);
  const t = await trang(w, token);
  assert.deepEqual(slotTrang(t.text), [2]);
  assert.match(t.text, /Còn 3 vé chưa sẵn sàng/);
  assert.equal((await anh(w, token, 1)).status, 404);
  assert.equal((await anh(w, token, 2)).status, 200);
});

test("Đ2: không đọc được tiền thì coi như chưa đạt — vé chưa mở không hiện, không trả ảnh; vé đã mở vẫn xem", async () => {
  const w = dung();
  const { id, token } = await donCoDuongDan(w);
  assert.equal((await suaKhach(w, id, ADM, 4)).status, 200);
  w.sqlite.exec("DROP VIEW v_ord_order_owner; CREATE VIEW v_ord_order_owner AS SELECT id, staff_id FROM orders WHERE 0");
  const t = await trang(w, token);
  assert.deepEqual(slotTrang(t.text), [1, 2]);
  assert.equal((await anh(w, token, 3)).status, 404);
  assert.equal((await anh(w, token, 1)).status, 200);
});

test("Đ2: đơn của nhân viên văn phòng cũng theo cổng tiền (không riêng đơn đối tác); đủ tiền thì hiện đủ", async () => {
  const w = dung();
  await nhapKho(w, 8);
  const id = await donDaXacNhan(w, A);
  const tong = async () => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order.total as number;
  const thu = (soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  const t0 = await tong();
  assert.equal((await thu(t0)).status, 201);
  const d = await w.call("POST", "/api/ve/duong-dan", { as: ADM, body: { orderId: id } });
  assert.equal(d.status, 200, d.text);
  const token = String(d.json.duongDan).replace("/ve/", "");
  assert.equal((await suaKhach(w, id, ADM, 4)).status, 200);
  assert.deepEqual(slotTrang((await trang(w, token)).text), [1, 2]);
  assert.equal((await anh(w, token, 3)).status, 404);
  const t1 = await tong();
  assert.ok(t1 > t0);
  for (const x of [t1 - t0 - 1000, 1000]) { const r = await thu(x); assert.equal(r.status, 201, r.text); }
  assert.deepEqual(slotTrang((await trang(w, token)).text), [1, 2, 3, 4]);
});

// ===================================== Đ3 =====================================
const NGAY = inDays(0);
async function lapCoc(w: any, as: string, coc: number) {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", declaredDeposit: coc, services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  return r.json.order as { id: string; orderCode: string };
}
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const veDon = async (w: any, id: string) => { const r = await w.call("GET", `/api/ve/don/${id}`, { as: ADM }); assert.equal(r.status, 200, r.text); return r.json; };
const nop = (w: any, id: string, soTien: number, ben: string = PARTNER) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: `pty-${ben}`, phanBo: [{ orderId: id, soTien }] } });
const soDongSo = (w: any, ...ids: string[]) => ids.map((id) => Number(w.q("SELECT (SELECT count(*) FROM bil_payment_receipt WHERE order_id = ?1) + (SELECT count(*) FROM bil_debt_line WHERE order_id = ?1) AS n", id)[0].n));
/** Đơn cũ do đối tác khai cọc `coc` (đối tác đang giữ), huỷ, đơn nhận mới, Quản trị duyệt chuyển `soTien`. */
async function donCuDuyetChuyen(w: any, coc: number, soTien: number, truocDuyet?: (cuId: string) => Promise<void>) {
  const cu = await lapCoc(w, PARTNER, coc);
  assert.equal((await guiDon(w, cu.id, PARTNER)).status, 200);
  if (truocDuyet) await truocDuyet(cu.id);
  const don = (await w.call("GET", `/api/orders/${cu.id}`, { as: PARTNER })).json.order;
  assert.equal((await w.call("POST", `/api/orders/${cu.id}/status`, { as: PARTNER, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: don.updatedAt } })).status, 200);
  const moi = await lapCoc(w, PARTNER, 0);
  assert.equal((await guiDon(w, moi.id, PARTNER)).status, 200);
  const d = await w.call("POST", `/api/orders/${cu.id}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien, lyDo: "Lập lại đơn cho khách", donNhan: moi.orderCode } });
  assert.ok(d.status === 200 || d.status === 201, d.text);
  return { cu, moi, duyetId: d.json.duyetId as string };
}
const chuyen = (w: any, cuId: string, duyetId: string, soTien: number, nguoiGiu: unknown) => w.call("POST", `/api/orders/${cuId}/coc/chuyen`, { as: ACC, body: { duyetId, soTien, ngayPhatSinh: NGAY, nguoiGiu } });

test("Đ3: đơn cũ còn đối tác giữ: gửi «cong_ty» bị từ chối, không ghi gì; DTO nêu mã người giữ; ghi đúng đối tác thì đơn mới khoá tới khi nộp đủ", async () => {
  const w = dung();
  const { cu, moi, duyetId } = await donCuDuyetChuyen(w, 600000, 600000);
  const truoc = soDongSo(w, cu.id, moi.id);
  const tu = await chuyen(w, cu.id, duyetId, 600000, "cong_ty");
  assert.equal(tu.status, 409, tu.text);
  assert.equal(tu.json.error.code, "coc_con_nguoi_giu");
  assert.match(tu.json.error.message, /chưa nộp tiền về công ty/);
  assert.deepEqual(soDongSo(w, cu.id, moi.id), truoc, "không ghi nửa nào");
  const pay = await w.call("GET", `/api/orders/${cu.id}/payments`, { as: ACC });
  assert.equal(pay.status, 200, pay.text);
  assert.deepEqual(pay.json.coc.nguoiGiu.map((g: any) => [g.partyId, g.soTien]), [[`pty-${PARTNER}`, 600000]]);
  const ok = await chuyen(w, cu.id, duyetId, 600000, { partyId: pay.json.coc.nguoiGiu[0].partyId });
  assert.equal(ok.status, 201, ok.text);
  assert.equal((await veDon(w, moi.id)).thuDu, false, "tiền còn ở tay đối tác: đơn mới khoá");
  assert.equal((await nop(w, moi.id, 600000)).status, 201);
  assert.equal((await veDon(w, moi.id)).thuDu, true);
});

test("Đ3: đơn cũ đã nộp đủ (không ai giữ): «cong_ty» chuyển như cũ, đơn mới mở", async () => {
  const w = dung();
  const { cu, moi, duyetId } = await donCuDuyetChuyen(w, 600000, 600000);
  assert.equal((await nop(w, cu.id, 600000)).status, 201, "đối tác nộp về công ty trước");
  const ok = await chuyen(w, cu.id, duyetId, 600000, "cong_ty");
  assert.equal(ok.status, 201, ok.text);
  assert.equal((await veDon(w, moi.id)).thuDu, true);
});

test("Đ3: nhiều người cùng giữ: «cong_ty» bị từ chối; chọn từng người, không vượt phần người đó giữ; hết người giữ mới tới «cong_ty»", async () => {
  const w = dung();
  // Quản trị cũng thu 300.000 «Tôi thu» trên đơn cũ (trước khi huỷ) ⇒ hai người cùng giữ
  const { cu, moi, duyetId } = await donCuDuyetChuyen(w, 350000, 600000, async (cuId) => { assert.equal((await w.call("POST", `/api/orders/${cuId}/payments`, { as: ADM, body: { soTien: 250000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201); });
  const pay = await w.call("GET", `/api/orders/${cu.id}/payments`, { as: ACC });
  const giu = pay.json.coc.nguoiGiu as { partyId: string; soTien: number }[];
  assert.deepEqual(giu.map((g) => g.partyId).sort(), [`pty-${ADM}`, `pty-${PARTNER}`].sort());
  const truoc = soDongSo(w, cu.id, moi.id);
  assert.equal((await chuyen(w, cu.id, duyetId, 600000, "cong_ty")).status, 409);
  const vuot = await chuyen(w, cu.id, duyetId, 600000, { partyId: `pty-${PARTNER}` });
  assert.notEqual(vuot.status, 201, "vượt phần người đó giữ");
  assert.deepEqual(soDongSo(w, cu.id, moi.id), truoc);
  assert.equal((await chuyen(w, cu.id, duyetId, 350000, { partyId: `pty-${PARTNER}` })).status, 201);
  assert.equal((await chuyen(w, cu.id, duyetId, 250000, "cong_ty")).status, 409, "Quản trị vẫn giữ 250.000");
  assert.equal((await chuyen(w, cu.id, duyetId, 250000, { partyId: `pty-${ADM}` })).status, 201);
});
