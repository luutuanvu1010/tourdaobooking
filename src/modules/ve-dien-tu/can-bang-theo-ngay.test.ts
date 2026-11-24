// V1 (kiểm toán 14/11): dời ngày đi của đơn ĐÃ XÁC NHẬN (`PUT /api/orders/:id/trip`) thì kho vé cân lại THEO NGÀY — vé chưa mở mà hạn không còn trùm ngày mới về kho rồi cấp bù vé hợp ngày;
// vé đã mở mà lệch ngày bị vô hiệu (không về kho — luật một chiều) để đơn thành «thiếu»; vé đã quét giữ nguyên. Qua ứng dụng THẬT (SQLite tạm, đồng hồ giả).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { NGAY, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const NGAY_MOI = "2027-03-14";
const AT = "2026-01-01T00:00:00.000Z";
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };

/** Lô `soVe` vé hạn [tu, den], mã `<tienTo>1…`; `lech` làm ảnh khác nhau giữa các lô (băm không trùng). */
async function nhapLo(w: any, soVe: number, tienTo: string, tu: string, den: string, lech: number) {
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: `${tienTo}${i + 1}`, tuNgay: tu, denNgay: den }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: SALES, body: {} })).status, 200);
}
const loCu = (w: any, n = 2) => nhapLo(w, n, "A", "2027-03-01", NGAY, 0); // hợp ngày đi cũ, hết hạn trước ngày mới
const loMoi = (w: any, n = 2) => nhapLo(w, n, "B", "2027-03-13", "2027-03-20", 20); // hợp ngày mới
const trangThaiVe = (w: any, ma: string) => w.q("SELECT status FROM vdt_ticket WHERE ticket_code = ?", ma)[0].status as string;
const maDangGiu = (w: any, id: string): string[] =>
  w.q("SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY t.ticket_code", id).map((r: { ma: string }) => r.ma);
const thieuCua = async (w: any, id: string) => {
  const r = await w.call("GET", `/api/ve/don/${id}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  return (r.json.dichVu.flatMap((d: { nhom: { thieu: number }[] }) => d.nhom) as { thieu: number }[]).reduce((t, n) => t + n.thieu, 0);
};
const soDongTraVe = (w: any, id: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 've_tra_ve'", id)[0].n);
const moDon = async (w: any, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order;
/** `PUT /trip` đổi ngày đi (ngày đưa đón đi theo) hoặc chỉ ghi chú. */
async function suaChuyen(w: any, id: string, v: { ngay?: string; ghiChu?: string }) {
  const o = await moDon(w, id);
  const s = o.services[0];
  return w.call("PUT", `/api/orders/${id}/trip`, {
    as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: s.id, departDate: v.ngay ?? s.departDate, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: v.ghiChu ?? "" }] },
  });
}
const loTraVeChuaLo = (w: any, id: string) => w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND released_at IS NOT NULL AND release_reason = 'GIAM_SO_KHACH'", id)[0].n as number;
const moVe = (w: any, ma: string) => w.sqlite.prepare("UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE ticket_id = (SELECT id FROM vdt_ticket WHERE ticket_code = ?) AND released_at IS NULL").run(AT, AT, ma);

test("(a) dời ngày: hai vé chưa mở hết hạn trước ngày mới về kho AVAILABLE; kho có vé hợp ngày mới thì đơn giữ đủ hai vé mới", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loCu(w);
    const d = await don(w, { soNguoi: 2 });
    assert.deepEqual(maDangGiu(w, d.id), ["A1", "A2"]);
    await loMoi(w);
    const r = await suaChuyen(w, d.id, { ngay: NGAY_MOI });
    assert.equal(r.status, 200, r.text);
    assert.equal(trangThaiVe(w, "A1"), "AVAILABLE");
    assert.equal(trangThaiVe(w, "A2"), "AVAILABLE");
    assert.deepEqual(maDangGiu(w, d.id), ["B1", "B2"]);
    assert.equal(await thieuCua(w, d.id), 0);
    assert.ok(soDongTraVe(w, d.id) >= 1, "có dấu vết trả vé");
  } finally { tat(); }
});

test("(b) dời ngày mà kho không có vé hợp ngày mới: hai vé cũ về kho, đơn không giữ vé lệch ngày và báo thiếu 2", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loCu(w);
    const d = await don(w, { soNguoi: 2 });
    assert.equal((await suaChuyen(w, d.id, { ngay: NGAY_MOI })).status, 200);
    assert.deepEqual(maDangGiu(w, d.id), []);
    assert.equal(trangThaiVe(w, "A1"), "AVAILABLE");
    assert.equal(trangThaiVe(w, "A2"), "AVAILABLE");
    assert.equal(await thieuCua(w, d.id), 2);
  } finally { tat(); }
});

test("(c) vé ĐÃ MỞ mà lệch ngày: không về kho (vô hiệu), đơn báo thiếu; kho có vé mới thì được cấp vé mới", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loCu(w, 1);
    const d = await don(w, { soNguoi: 1 });
    moVe(w, "A1");
    assert.equal((await suaChuyen(w, d.id, { ngay: NGAY_MOI })).status, 200);
    assert.equal(trangThaiVe(w, "A1"), "VOID", "vé đã mở không về kho");
    assert.deepEqual(maDangGiu(w, d.id), []);
    assert.equal(await thieuCua(w, d.id), 1);
    // biến thể có vé mới trong kho: dời lần nữa (vẫn lệch với vé đã vô hiệu = không còn gì để cân) — cấp bù đi đường «Cấp vé» hiện có
    await loMoi(w, 1);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.deepEqual(maDangGiu(w, d.id), ["B1"]);
    assert.equal(await thieuCua(w, d.id), 0);
  } finally { tat(); }
});

test("(c2) hai vé, một đã mở: vé đã mở vô hiệu, vé chưa mở về kho; kho có vé hợp ngày mới thì cấp đủ hai", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loCu(w);
    const d = await don(w, { soNguoi: 2 });
    moVe(w, "A1");
    await loMoi(w);
    assert.equal((await suaChuyen(w, d.id, { ngay: NGAY_MOI })).status, 200);
    assert.equal(trangThaiVe(w, "A1"), "VOID");
    assert.equal(trangThaiVe(w, "A2"), "AVAILABLE");
    assert.deepEqual(maDangGiu(w, d.id), ["B1", "B2"]);
  } finally { tat(); }
});

test("(d) dời ngày mà vé vẫn trùm ngày mới: không đổi gì (không trả vé, không ghi nhật ký trả vé)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await nhapLo(w, 2, "C", "2027-03-01", "2027-03-31", 40);
    const d = await don(w, { soNguoi: 2 });
    const truoc = soDongTraVe(w, d.id);
    assert.equal((await suaChuyen(w, d.id, { ngay: NGAY_MOI })).status, 200);
    assert.deepEqual(maDangGiu(w, d.id), ["C1", "C2"]);
    assert.equal(trangThaiVe(w, "C1"), "ALLOCATED");
    assert.equal(loTraVeChuaLo(w, d.id), 0);
    assert.equal(soDongTraVe(w, d.id), truoc);
  } finally { tat(); }
});

test("(e) vé ĐÃ QUÉT (đã dùng): giữ nguyên dù lệch ngày; vé chưa mở còn lại thì về kho", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loCu(w);
    const d = await don(w, { soNguoi: 2 });
    moVe(w, "A1");
    const dv = w.q("SELECT id FROM order_service WHERE order_id = ?", d.id)[0].id as string;
    const ve = w.q("SELECT id FROM vdt_ticket WHERE ticket_code = 'A1'")[0].id as string;
    w.sqlite.prepare("INSERT INTO vdt_scan (id, ticket_id, order_id, order_service_id, so_khach, ket_qua, scanned_at, scanned_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 'DA_TINH', ?, ?, ?, ?)")
      .run(crypto.randomUUID(), ve, d.id, dv, AT, SALES, AT, AT);
    assert.equal((await suaChuyen(w, d.id, { ngay: NGAY_MOI })).status, 200);
    assert.equal(trangThaiVe(w, "A1"), "ALLOCATED", "vé đã dùng không đụng");
    assert.deepEqual(maDangGiu(w, d.id), ["A1"]);
    assert.equal(trangThaiVe(w, "A2"), "AVAILABLE");
  } finally { tat(); }
});

test("(f) route /trip chỉ cân vé khi ĐỔI NGÀY đi: ghi chú đơn thuần không đụng vé, đổi ngày thì cân", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loCu(w);
    const d = await don(w, { soNguoi: 2 });
    // Giả lập lệch sẵn (ngày dịch vụ đã khác hạn vé) để lệnh có gì đó để cân nếu route gọi hàm cân.
    w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(NGAY_MOI, d.id);
    assert.equal((await suaChuyen(w, d.id, { ghiChu: "Chỉ đổi ghi chú" })).status, 200);
    assert.deepEqual(maDangGiu(w, d.id), ["A1", "A2"], "không đổi ngày thì không gọi hàm cân");
    // Đổi ngày thật (sang ngày khác nữa): hàm cân chạy và trả hai vé lệch.
    assert.equal((await suaChuyen(w, d.id, { ngay: "2027-03-15" })).status, 200);
    assert.deepEqual(maDangGiu(w, d.id), []);
    assert.equal(trangThaiVe(w, "A1"), "AVAILABLE");
  } finally { tat(); }
});
