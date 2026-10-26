// ADR-0135 Đ7 + Đ8 (chủ duyệt 19/10/2026), kế hoạch Đợt 2 Task 2.2: đơn NHÁP không ghi thu được (kể cả đơn nhận của lệnh chuyển cọc); QR thanh toán chỉ cho đơn
// ĐÃ XÁC NHẬN (mọi đơn). Chạy cả ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // Bán hàng — người lập
const B = "11111111-1111-4111-8111-222222222222"; // Bán hàng khác
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const QTKT = "88888888-8888-4888-8888-888888888888"; // Quản trị kiêm Kế toán (người duyệt ≠ người chuyển)

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: QTKT, phone: "0900000009", name: "Kiêm hai việc", perms: ["ADMIN", "ACCOUNTING"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const body = () => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
});
async function lap(w: any, as: string): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as, body: body() });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
async function xacNhan(w: any, as: string, id: string) {
  const r = await w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
}
const thu = (w: any, as: string, id: string, soTien = 100_000) => w.call("POST", `/api/orders/${id}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu: "toi" } });
const soLanThu = (w: any, ...ids: string[]) => Number(w.q(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id IN (${ids.map(() => "?").join(", ")})`, ...ids)[0].n);

test("ghi thu lên đơn nháp: người lập → 409 order_draft_no_payment (câu đúng), không ghi gì; người khác → 404; sau xác nhận → 201", async () => {
  const w = setup();
  const id = await lap(w, A);
  const r = await thu(w, A, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "order_draft_no_payment");
  assert.equal(r.json.error.message, "Đơn chưa xác nhận, chưa ghi thu được.");
  assert.equal(soLanThu(w, id), 0);
  for (const ai of [B, KT, ADM, SUP]) assert.equal((await thu(w, ai, id)).status, 404, `người khác (${ai}) ghi thu lên nháp không được lộ 409`);
  assert.equal(soLanThu(w, id), 0);
  await xacNhan(w, A, id);
  assert.equal((await thu(w, A, id)).status, 201);
  assert.equal(soLanThu(w, id), 1);
});

test("GET /payments: coTheGhiThu false với nháp (cả người lập), true sau xác nhận", async () => {
  const w = setup();
  const id = await lap(w, A);
  const truoc = await w.call("GET", `/api/orders/${id}/payments`, { as: A });
  assert.equal(truoc.status, 200, truoc.text);
  assert.equal(truoc.json.coTheGhiThu, false);
  await xacNhan(w, A, id);
  const sau = await w.call("GET", `/api/orders/${id}/payments`, { as: A });
  assert.equal(sau.json.coTheGhiThu, true);
});

/** Đơn huỷ nguồn có 500.000 do Kế toán giữ + khoản duyệt chuyển sang đơn nhận (đã xác nhận lúc duyệt). */
async function duyetChuyenSangDonNhan(w: any) {
  const a = await lap(w, A);
  await xacNhan(w, A, a);
  assert.equal((await thu(w, KT, a, 500_000)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${a}/status`, { as: ADM, body: { status: "cancelled", lyDo: "THOI_TIET" } })).status, 200);
  const b = await lap(w, B);
  await xacNhan(w, B, b);
  const maB = w.q("SELECT order_code FROM orders WHERE id = ?", b)[0].order_code as string;
  const d = await w.call("POST", `/api/orders/${a}/coc/duyet`, { as: QTKT, body: { loai: "chuyen", soTien: 500_000, lyDo: "Dời lịch do thời tiết", donNhan: maB } });
  assert.equal(d.status, 201, d.text);
  const nguoiGiu = { partyId: w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id };
  return { a, b, chuyen: { duyetId: d.json.duyetId, soTien: 500_000, nguoiGiu } };
}

test("chuyển cọc mà đơn NHẬN là nháp ⇒ 409 order_draft_no_payment ở đơn nhận, không ghi nửa nào; đơn nhận đã xác nhận ⇒ 201", async () => {
  const w = setup();
  const { a, b, chuyen } = await duyetChuyenSangDonNhan(w);
  // Đưa đơn nhận về nháp bằng SQL: mô phỏng đơn nhận không phải đơn đã xác nhận (cổng đặt ở đơn nhận, không ở đơn nguồn).
  w.sqlite.exec("DROP TRIGGER orders_status_transition"); // chỉ trong bài này: trigger 0017 không cho lùi xác nhận → nháp
  w.sqlite.prepare("UPDATE orders SET status = 'draft' WHERE id = ?").run(b);
  const truoc = soLanThu(w, a, b);
  const r = await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body: chuyen });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "order_draft_no_payment");
  assert.equal(soLanThu(w, a, b), truoc);
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(b);
  assert.equal((await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body: chuyen })).status, 201);
});

test("duyệt chuyển cọc sang MÃ của đơn nháp người khác ⇒ như không tìm thấy (billing không lộ mã đơn nháp)", async () => {
  const w = setup();
  const a = await lap(w, A);
  await xacNhan(w, A, a);
  assert.equal((await thu(w, KT, a, 500_000)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${a}/status`, { as: ADM, body: { status: "cancelled", lyDo: "THOI_TIET" } })).status, 200);
  const nhapB = await lap(w, B);
  const maNhap = w.q("SELECT order_code FROM orders WHERE id = ?", nhapB)[0].order_code as string;
  const d = await w.call("POST", `/api/orders/${a}/coc/duyet`, { as: QTKT, body: { loai: "chuyen", soTien: 500_000, lyDo: "Dời lịch do thời tiết", donNhan: maNhap } });
  assert.equal(d.status, 400, d.text);
  assert.equal(d.json.error.message, "Không tìm thấy đơn nhận tiền.");
});

// ---------------- QR ----------------
async function caiTaiKhoan(w: any) {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const r = await w.call("PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { as: SUP, body: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null } });
  assert.equal(r.status, 200, r.text);
}
const qr = (w: any, as: string, id: string) => w.call("GET", `/api/orders/${id}/qr-thanh-toan`, { as });

test("QR: đơn nháp (người lập) ⇒ 409 qr_requires_confirmed kể cả khi đã cài tài khoản; người khác ⇒ 404; sau xác nhận ⇒ 200", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const id = await lap(w, A);
  const r = await qr(w, A, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "qr_requires_confirmed");
  assert.equal((await qr(w, B, id)).status, 404);
  await xacNhan(w, A, id);
  assert.equal((await qr(w, A, id)).status, 200);
});

test("QR: đơn đã huỷ cũng 409 qr_requires_confirmed (áp mọi đơn không phải đã xác nhận)", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const id = await lap(w, A);
  await xacNhan(w, A, id);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  assert.equal((await qr(w, A, id)).json.error.code, "qr_requires_confirmed");
});
