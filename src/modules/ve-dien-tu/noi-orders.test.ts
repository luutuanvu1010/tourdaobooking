// Nối kho vé vào xác nhận, huỷ, sửa số khách của `orders` (ADR-0153 Đ1 mục 4; kế hoạch Task 5) qua ứng dụng THẬT (khung thử điều phối: đồng hồ giả, dịch vụ ZA1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { soanTraVeKhiHuy } from "./noi-orders.ts";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

/** Nhập một lô ĐÃ XÁC NHẬN `soVe` vé ADULT cho ZA1 bằng đường thật (hạn phủ ngày đi 2027-03-11). */
async function nhapKho(w: any, soVe: number, nhom = "ADULT", ma = "NK") {
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: nhom, tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: b64(PNG(i + 1)), maVe: `${ma}${nhom}${i + 1}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  const r = await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: SALES, body: {} })).status, 200);
}
const dem = (w: any, dk: string) => w.q(`SELECT count(*) AS n FROM vdt_allocation WHERE ${dk}`)[0].n as number;
const giu = (w: any) => dem(w, "released_at IS NULL");
const svc = (w: any, id: string) => w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id as string;
const pax = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });

test("xacNhanDonVaCapVeSauLo: xác nhận đơn xong thì giữ đúng số vé theo số khách; nhật ký chỉ có số lượng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, 5);
    const d = await don(w, { soNguoi: 2 });
    assert.equal(giu(w), 2);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'ALLOCATED'")[0].n, 2);
    const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 've_giu_cho'", d.id);
    assert.ok(nk.length >= 1);
    assert.doesNotMatch(nk.map((x: any) => x.detail).join("\n"), /NK|vdt\//);
  } finally { tat(); }
});

test("khoThieu_xacNhanVanThanhCong_hienThieuVe: kho trống thì đơn vẫn xác nhận, không giữ vé nào", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
    assert.equal(giu(w), 0);
  } finally { tat(); }
});

test("khoLoiGiuaChung_xacNhanVanThanhCong: lô cấp vé lỗi (kho không bật) vẫn không làm xác nhận thất bại", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, 3);
    w.sqlite.exec("DROP TABLE vdt_allocation"); // cấp vé sẽ ném lỗi
    const d = await don(w, { soNguoi: 1 });
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
  } finally { tat(); }
});

test("baDuongHuyDeuTraVe: huỷ đơn qua /status trả hết vé chưa lộ về kho", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, 5);
    const d = await don(w, { soNguoi: 2 });
    assert.equal(giu(w), 2);
    const r = await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(r.status, 200, r.text);
    assert.equal(giu(w), 0);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'AVAILABLE'")[0].n, 5);
    assert.ok(w.q("SELECT 1 FROM audit_log WHERE order_id = ? AND action = 've_tra_ve'", d.id).length >= 1);
  } finally { tat(); }
});

test("suaSoKhachTangGiamDungSoVe: money-edit tăng thì cấp thêm, giảm thì trả bớt (chỉ vé chưa lộ)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, 6);
    const d = await don(w, { soNguoi: 2 });
    const tang = await w.call("POST", `/api/orders/${d.id}/money-edit`, { as: SALES, body: { lyDo: "THEM_NGUOI", services: [{ id: svc(w, d.id), pax: pax(4) }] } });
    assert.equal(tang.status, 200, tang.text);
    assert.equal(giu(w), 4);
    const giam = await w.call("POST", `/api/orders/${d.id}/money-edit`, { as: SALES, body: { lyDo: "BOT_NGUOI", services: [{ id: svc(w, d.id), pax: pax(1) }] } });
    assert.equal(giam.status, 200, giam.text);
    assert.equal(giu(w), 1);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'AVAILABLE'")[0].n, 5);
  } finally { tat(); }
});

test("suaSoKhachBoiHdv_capHoacTraVe: HDV sửa số khách qua handler-money-edit cũng cấp / trả vé", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, 6);
    const FIELD = "44444444-4444-4444-8444-444444444444";
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const r = await w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as: FIELD, body: { reason: "Khách thêm người", services: [{ id: svc(w, d.id), pax: pax(3) }] } });
    assert.equal(r.status, 200, r.text);
    assert.equal(giu(w), 3);
  } finally { tat(); }
});

test("huyThua_khongTraVe: câu trả vé của lô huỷ có cổng — đơn còn `confirmed` (lô huỷ thua) thì không trả vé nào (phía thắng đã có bài baDuongHuyDeuTraVe)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, 3);
    const d = await don(w, { soNguoi: 2 });
    assert.equal(giu(w), 2);
    const nhatKy = () => w.env.DB.prepare("SELECT 1"); // nhật ký giả: bài này chỉ canh cổng trạng thái
    const cau = await soanTraVeKhiHuy(w.env.DB, { orderId: d.id, lyDo: "DON_HUY", by: SALES, at: new Date().toISOString(), homNay: "2027-03-11" }, nhatKy as never);
    await w.env.DB.batch(cau);
    assert.equal(giu(w), 2, "đơn chưa huỷ ⇒ không trả");
  } finally { tat(); }
});

test("capBuBangTay: đơn xác nhận lúc kho trống được cấp vé khi bấm Cấp vé sau khi nhập kho; bấm lại không cấp thừa; Kế toán 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 }); // kho trống lúc xác nhận
    assert.equal(giu(w), 0);
    await nhapKho(w, 5);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: "55555555-5555-4555-8555-555555555555", body: { orderId: d.id } })).status, 403);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.equal(giu(w), 2);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.equal(giu(w), 2, "bấm lại không cấp thừa");
  } finally { tat(); }
});

test("baiKienTruc_ordersKhongImportVeDienTu: orders và dispatch không import module ve-dien-tu", () => {
  for (const f of ["orders/index.ts", "orders/xac-nhan-route.ts", "orders/repository.ts", "dispatch/index.ts"]) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /from\s+["'][^"']*ve-dien-tu/, f);
  }
});
