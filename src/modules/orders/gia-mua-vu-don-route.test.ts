// «GIÁ MÙA VỤ» trên ĐƠN (ADR-0229 Đ4–Đ7b, Đ9) qua ứng dụng THẬT trên SQLite: chụp vào dòng đơn, BK5 theo ngày, vá Q11, chặn dời ngày sang mùa khác (cả quy tắc đã kết thúc),
// cổng «giá danh mục đã đổi» của Đối tác theo ngày đi, form của Đối tác không thấy mức tăng. Route quy tắc: src/modules/catalog/gia-mua-vu-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, PARTNER, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";

type W = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TU = inDays(5);
const DEN = inDays(9);
const TRONG = inDays(7);
const TRONG2 = inDays(8);
const NGOAI = inDays(12);
const GOC = 500000; // ZA1 người lớn
const MUA = 570000; // 500.000 × 1,1 + 20.000

function the(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: QL, phone: "0900000010", name: "Quản lý", perms: ["SALES", "SALES_MANAGER"] });
  return w;
}
async function quyTac(w: W, duyet = true): Promise<string> {
  const r = await w.call("POST", "/api/catalog/gia-mua-vu", { as: QL, body: { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN, phanTram: 10, soTien: 20000 } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.quyTac.id as string;
  if (duyet) assert.equal((await w.call("POST", `/api/catalog/gia-mua-vu/${id}/duyet`, { as: ACC, body: {} })).status, 200);
  return id;
}
const dv = (ngay: string, thay = GOC) => svc("ZA1", ngay, [], { catalogPriceSeen: { adult: thay } });
const than = (services: unknown[]) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services });
const lap = (w: W, services: unknown[], as = A) => w.call("POST", "/api/orders", { as, body: than(services) });
async function lapOk(w: W, services: unknown[], as = A): Promise<string> {
  const r = await lap(w, services, as);
  assert.equal(r.status, 201, r.text);
  return String(r.json.order.id);
}
const dong = (w: W, id: string) =>
  w.q("SELECT unit_price, catalog_price, base_price, seasonal_rule_id, seasonal_increase, quantity, line_total FROM order_item WHERE order_id = ? AND line_kind = 'SERVICE'", id)[0];
const tong = (w: W, id: string) => Number(w.q("SELECT subtotal FROM orders WHERE id = ?", id)[0].subtotal);
const moc = (w: W, id: string) => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u as string;
const luu = (w: W, id: string, services: unknown[], as = A) => w.call("PUT", `/api/orders/${id}`, { as, body: { ...than(services), expectedUpdatedAt: moc(w, id) } });
const xacNhan = (w: W, id: string, as = A) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
async function doiNgay(w: W, id: string, ngay: string) {
  const o = (await w.call("GET", `/api/orders/${id}`, { as: A })).json.order;
  return w.call("PUT", `/api/orders/${id}/trip`, { as: A, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: ngay }] } });
}

test("tiêu chí 2 + Đ5: trong mùa ⇒ 570.000 × 2 = 1.140.000, chụp giá gốc / quy tắc / số tăng; ngoài mùa ⇒ 1.000.000, chụp «không quy tắc»", async () => {
  const w = the();
  const q = await quyTac(w);
  const trong = await lapOk(w, [dv(TRONG, MUA)]);
  assert.deepEqual({ ...dong(w, trong) }, { unit_price: MUA, catalog_price: MUA, base_price: GOC, seasonal_rule_id: q, seasonal_increase: 70000, quantity: 2, line_total: 1140000 });
  assert.equal(tong(w, trong), 1140000);
  const ngoai = await lapOk(w, [dv(NGOAI)]);
  assert.deepEqual({ ...dong(w, ngoai) }, { unit_price: GOC, catalog_price: GOC, base_price: GOC, seasonal_rule_id: null, seasonal_increase: 0, quantity: 2, line_total: 1000000 });
});

test("Đ7 (BK5): form báo giá gốc cho ngày trong mùa ⇒ 409 catalog_changed, không ghi; quy tắc chờ duyệt không áp", async () => {
  const w = the();
  await quyTac(w, false);
  await lapOk(w, [dv(TRONG)]); // chờ duyệt: giá gốc
  await quyTac(w, false).catch(() => {}); // chồng ngày với bản chờ duyệt ⇒ không tạo thêm (đã có bài riêng)
  const w2 = the();
  await quyTac(w2);
  const r = await lap(w2, [dv(TRONG)]);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "catalog_changed");
  assert.equal(Number(w2.q("SELECT count(*) AS n FROM orders")[0].n), 0);
});

test("tiêu chí 4 (vá Q11): nháp lưu ngày ngoài mùa (1.000.000), đổi ngày vào mùa rồi lưu ⇒ 1.140.000; cùng ngày thì giữ bản chụp", async () => {
  const w = the();
  const id = await lapOk(w, [dv(NGOAI)]);
  await quyTac(w);
  const o = (await w.call("GET", `/api/orders/${id}`, { as: A })).json.order;
  const r = await luu(w, id, [{ ...dv(NGOAI), id: o.services[0].id }]);
  assert.equal(r.status, 200, r.text);
  assert.equal(tong(w, id), 1000000, "cùng ngày: giữ bản chụp");
  const r2 = await luu(w, id, [{ ...dv(TRONG, MUA), id: o.services[0].id }]);
  assert.equal(r2.status, 200, r2.text);
  assert.equal(tong(w, id), 1140000);
  assert.equal(dong(w, id).seasonal_increase, 70000);
});

test("tiêu chí 3 (Đ6): đơn xác nhận giữ 1.140.000 sau khi quy tắc kết thúc; dời trong khoảng quy tắc đã chụp ⇒ được, tiền giữ; ra ngoài ⇒ 409; đơn không quy tắc dời vào mùa ⇒ 409", async () => {
  const w = the();
  const q = await quyTac(w);
  const trong = await lapOk(w, [dv(TRONG, MUA)]);
  const ngoai = await lapOk(w, [dv(NGOAI)]);
  for (const id of [trong, ngoai]) assert.equal((await xacNhan(w, id)).status, 200);
  const bi = await doiNgay(w, ngoai, TRONG);
  assert.equal(bi.status, 409, bi.text);
  assert.equal(bi.json.error.code, "seasonal_date_changed");
  assert.equal((await w.call("POST", `/api/catalog/gia-mua-vu/${q}/ket-thuc`, { as: QL, body: {} })).status, 200);
  assert.equal(tong(w, trong), 1140000, "kết thúc quy tắc không đổi đơn đã xác nhận");
  const ok = await doiNgay(w, trong, TRONG2);
  assert.equal(ok.status, 200, ok.text);
  assert.equal(tong(w, trong), 1140000);
  const ra = await doiNgay(w, trong, NGOAI);
  assert.equal(ra.status, 409, ra.text);
  assert.equal(ra.json.error.code, "seasonal_date_changed");
  assert.match(ra.json.error.message, /huỷ đơn này và lập đơn mới/);
  assert.throws(() => w.sqlite.exec(`UPDATE order_item SET seasonal_increase = 0 WHERE order_id = '${trong}'`), /order_money_frozen/);
});

test("tiêu chí 1c (Đ7b): Đối tác lưu nháp trước khi quy tắc được duyệt rồi xác nhận ⇒ 409 gia_danh_muc_da_doi; nháp đúng giá mùa vụ ⇒ qua; nháp văn phòng chỉ hiện cờ", async () => {
  const w = the();
  const truoc = await lapOk(w, [dv(TRONG)], PARTNER);
  const vp = await lapOk(w, [dv(TRONG)]);
  await quyTac(w);
  const guiDon = (id: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  const bi = await guiDon(truoc);
  assert.equal(bi.status, 409, bi.text);
  assert.equal(bi.json.error.code, "gia_danh_muc_da_doi");
  const dung = await lapOk(w, [dv(TRONG, MUA)], PARTNER);
  const qua = await guiDon(dung);
  assert.equal(qua.status, 200, qua.text);
  const xem = (await w.call("GET", `/api/orders/${vp}`, { as: A })).json.order;
  assert.equal(xem.services[0].catalogStatus, "price_changed", "văn phòng: cờ «Giá danh mục đã đổi»");
  assert.equal((await xacNhan(w, vp)).status, 200, "văn phòng: không chặn");
});

test("tiêu chí 1d (Đ9): form của Đối tác có giá theo ngày nhưng không có mức tăng; văn phòng có; /api/catalog giữ giá gốc; DTO đơn không lộ bản chụp mùa vụ", async () => {
  const w = the();
  await quyTac(w);
  const doan = async (as: string) => (await w.call("GET", "/api/catalog/for-order", { as })).json.items.find((i: { code: string }) => i.code === "ZA1").giaTheoNgay;
  const dt = await doan(PARTNER);
  assert.deepEqual(dt, [{ tu: TU, den: DEN, prices: { adult: MUA, child: null, senior: null, infant: null } }]);
  assert.deepEqual((await doan(A))[0].mucTang, { phanTram: 10, soTien: 20000 });
  const vpDm = (await w.call("GET", "/api/catalog", { as: A })).json.items.find((i: { code: string }) => i.code === "ZA1");
  assert.equal(vpDm.giaTheoNgay, undefined);
  assert.equal(vpDm.prices.adult, GOC);
  const id = await lapOk(w, [dv(TRONG, MUA)], PARTNER);
  const txt = (await w.call("GET", `/api/orders/${id}`, { as: PARTNER })).text as string;
  assert.doesNotMatch(txt, /seasonal|basePrice|base_price|coSoHoaHong/);
});
