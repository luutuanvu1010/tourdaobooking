// Giữ vé đúng nguồn qua ứng dụng THẬT (ADR-0175 Đ1.5): gốc lắp ráp đọc ô «Vé do ai phát» qua `orders.dichVuChoVe` (→ `catalog.nguonVeTheoMa`) rồi đưa sang kho vé.
// Kèm kiểm của kế hoạch Task 5: «thiếu vé» ở GET /api/ve/don không tính đơn huỷ và dịch vụ «Không vé».
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

async function nhapKho(w: any, nguon: "HANG_NGOAI" | "TOUR_DAO", soVe: number, lech: number) {
  const as = nguon === "TOUR_DAO" ? ACC : SALES;
  const lo = await w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: nguon === "TOUR_DAO" ? "TD1." + B32[i + lech]!.repeat(26) : `HN${i + 1 + lech}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as, body: {} })).status, 200);
  return lo.json.loId as string;
}
const datNguon = (w: any, nguon: "HANG_NGOAI" | "TOUR_DAO", luc: string) =>
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', ?, ?, ?, ?)").run(crypto.randomUUID(), nguon, luc, AT, AT);
const nguonVeGiu = (w: any, id: string) =>
  w.q("SELECT b.source AS s FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id JOIN vdt_batch b ON b.id = t.batch_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY a.slot_no", id).map((x: any) => x.s);
const thieu = async (w: any, id: string) => {
  const r = await w.call("GET", `/api/ve/don/${id}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  return r.json.dichVu.flatMap((d: { nhom: { thieu: number }[] }) => d.nhom.map((n) => n.thieu));
};

test("dịch vụ đặt «Vé do ai phát» = Tour Đảo: xác nhận đơn giữ vé lô Tour Đảo, không lấy lô hãng ngoài cùng mã", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, "HANG_NGOAI", 3, 0);
    await nhapKho(w, "TOUR_DAO", 3, 10);
    datNguon(w, "TOUR_DAO", AT);
    const d = await don(w, { soNguoi: 2 });
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.deepEqual(nguonVeGiu(w, d.id), ["TOUR_DAO", "TOUR_DAO"]);
  } finally { tat(); }
});

test("dịch vụ không có dòng «Vé do ai phát»: giữ vé lô hãng ngoài như cũ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapKho(w, "TOUR_DAO", 3, 10);
    await nhapKho(w, "HANG_NGOAI", 3, 0);
    const d = await don(w, { soNguoi: 2 });
    await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } });
    assert.deepEqual(nguonVeGiu(w, d.id), ["HANG_NGOAI", "HANG_NGOAI"]);
  } finally { tat(); }
});

test("đơn huỷ không báo thiếu vé ở GET /api/ve/don", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    assert.deepEqual(await thieu(w, d.id), [2], "đơn còn hiệu lực, kho rỗng ⇒ thiếu 2");
    const h = await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(h.status, 200, h.text);
    assert.ok((await thieu(w, d.id)).every((n: number) => n === 0), "đơn huỷ không còn thiếu vé");
  } finally { tat(); }
});
