// ADR-0175 Đ3 mục 3 (kế hoạch vé Tour Đảo Task 13): vé ĐÃ DÙNG (lượt quét DA_TINH chưa bỏ) chặn huỷ ở mọi đường và chặn giảm số khách xuống dưới số đã dùng. Qua ứng dụng THẬT (SQLite tạm, đồng hồ giả).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, FIELD, LOC, NGAY, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import * as XN from "../../../tests/audit/xac-nhan-khung.mjs";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MA_TD = /TD1\.[A-Z2-7]{26}/;
const CAU = "Đơn có vé đã dùng. Bỏ lượt quét trước khi huỷ.";
const CAU_GIAM = "Số khách mới ít hơn số vé đã dùng của dịch vụ này. Bỏ lượt quét trước khi giảm khách.";

async function khoVe(w: any) {
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', 'TOUR_DAO', ?, ?, ?)").run(crypto.randomUUID(), AT, AT, AT);
  const lo = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: 6 }, (_x, i) => ({ noiDung: PNG(i + 1), maVe: "TD1." + B32[i]!.repeat(26), tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: ACC, body: { ve } })).json.themDuoc, 6);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: ACC, body: {} })).status, 200);
}
async function donDaMo(w: any, soNguoi = 2) {
  const d = await don(w, { soNguoi });
  const tong = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
  assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ADM, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } })).status, 200);
  return d;
}
const maCuaDon = (w: any, id: string): string[] =>
  w.q("SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY a.slot_no", id).map((r: { ma: string }) => r.ma);
const quet = (w: any, as: string, ma: string) => w.call("POST", "/api/ve/quet", { as, body: { ma } });
/** Quét tính đã dùng một vé của đơn; trả id lượt. */
async function quetTinh(w: any, id: string, as = FIELD, viTri = 0): Promise<string> {
  const r = await quet(w, as, maCuaDon(w, id)[viTri]!);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.mau, "XANH", r.text);
  assert.ok(r.json.lanQuetId);
  return r.json.lanQuetId as string;
}
const boLuot = (w: any, luotId: string, as = FIELD) => w.call("POST", `/api/ve/quet/${luotId}/bo`, { as, body: { lyDo: "Quét nhầm vé khách khác" } });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status as string;
const dem = (w: any, id: string) => ({
  giu: Number(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL", id)[0].n),
  huy: Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action IN ('order_cancelled','order_cancelled_by_field')", id)[0].n),
});
const huyStatus = (w: any, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
const huyHdv = (w: any, id: string) => w.call("POST", `/api/orders/${id}/handler-cancel`, { as: FIELD, body: { reason: "customer_requested" } });
const giaoViec = (w: any, id: string) =>
  w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)").run(crypto.randomUUID(), id, `pty-${FIELD}`, AT, AT, AT);
const dichVuId = (w: any, id: string) => w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id as string;
const pax = (adult: number, infant = 0) => ({ adult, child: 0, senior: 0, infant });
const suaKhach = (w: any, id: string, n: number, infant = 0) => w.call("POST", `/api/orders/${id}/money-edit`, { as: SALES, body: { lyDo: n > 2 ? "THEM_NGUOI" : "BOT_NGUOI", services: [{ id: dichVuId(w, id), pax: pax(n, infant) }] } });
const suaKhachHdv = (w: any, id: string, n: number, infant = 0) => w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: FIELD, body: { reason: "Khách đổi số người", services: [{ id: dichVuId(w, id), pax: pax(n, infant) }] } });

test("đơn có vé đã dùng: huỷ qua /status và handler-cancel đều 409 đúng câu; đơn, vé, nhật ký giữ nguyên; không lộ mã vé", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const d = await donDaMo(w);
    giaoViec(w, d.id);
    await quetTinh(w, d.id);
    const truoc = dem(w, d.id);
    for (const r of [await huyStatus(w, d.id), await huyStatus(w, d.id, ADM), await huyHdv(w, d.id)]) {
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "don_co_ve_da_dung");
      assert.equal(r.json.error.message, CAU);
      assert.doesNotMatch(r.text, MA_TD);
    }
    assert.equal(trangThai(w, d.id), "confirmed");
    assert.deepEqual(dem(w, d.id), truoc);
  } finally { tat(); }
});

test("bỏ lượt quét rồi huỷ → 200: đơn huỷ, vé chết (quét ra «Vé đã huỷ»); huỷ qua handler-cancel cũng vậy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const a = await donDaMo(w);
    const luot = await quetTinh(w, a.id);
    assert.equal((await huyStatus(w, a.id)).status, 409);
    assert.equal((await boLuot(w, luot)).status, 200);
    const ma = maCuaDon(w, a.id)[0]!;
    const h = await huyStatus(w, a.id);
    assert.equal(h.status, 200, h.text);
    assert.equal(trangThai(w, a.id), "cancelled");
    const sau = await quet(w, FIELD, ma);
    assert.equal(sau.json.ma, "VE_DA_HUY");
    assert.equal(sau.json.cau, "Vé đã huỷ");
    const b = await donDaMo(w);
    giaoViec(w, b.id);
    const luotB = await quetTinh(w, b.id);
    assert.equal((await huyHdv(w, b.id)).status, 409);
    assert.equal((await boLuot(w, luotB)).status, 200);
    const hb = await huyHdv(w, b.id);
    assert.equal(hb.status, 200, hb.text);
    assert.equal(trangThai(w, b.id), "cancelled");
  } finally { tat(); }
});

test("chỉ lượt CHI_XEM / TU_CHOI (Tài xế quét xem; quét lại vé đã dùng bị từ chối) thì huỷ được; huỷ đơn có vé đã mở chưa dùng → vé VOID", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const x = await quet(w, DRIVER, ma!);
    assert.equal(x.json.ghi, "CHI_XEM");
    assert.equal(Number(w.q("SELECT count(*) AS n FROM vdt_scan WHERE ket_qua = 'CHI_XEM'")[0].n), 1);
    const e = await donDaMo(w);
    const luotE = await quetTinh(w, e.id);
    assert.equal((await quet(w, FIELD, maCuaDon(w, e.id)[0]!)).json.ma, "DA_DUNG"); // lượt TU_CHOI có vé thật
    assert.equal((await boLuot(w, luotE)).status, 200);
    assert.equal(Number(w.q("SELECT count(*) AS n FROM vdt_scan WHERE ket_qua = 'TU_CHOI' AND order_id IS NOT NULL")[0].n) >= 1, true);
    for (const id of [d.id, e.id]) assert.equal((await huyStatus(w, id)).status, 200);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'VOID'")[0].n >= 3, true, "vé đã mở của đơn huỷ chết (VOID), không về kho");
    assert.equal((await quet(w, FIELD, ma!)).json.cau, "Vé đã huỷ");
  } finally { tat(); }
});

test("giảm số khách xuống dưới số đã dùng → 409 duoi_so_ve_da_dung ở money-edit và handler-money-edit; bằng số đã dùng thì không chặn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const d = await donDaMo(w, 2);
    giaoViec(w, d.id);
    await quetTinh(w, d.id, FIELD, 0);
    await quetTinh(w, d.id, FIELD, 1);
    const truoc = Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d.id)[0].n);
    const a = await suaKhach(w, d.id, 1);
    const b = await suaKhachHdv(w, d.id, 1);
    for (const r of [a, b]) {
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "duoi_so_ve_da_dung");
      assert.equal(r.json.error.message, CAU_GIAM);
    }
    assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d.id)[0].n), truoc, "không ghi gì");
    const giuNguyen = await suaKhach(w, d.id, 2); // bằng số đã dùng: không chặn (y nguyên số khách, không ghi)
    assert.equal(giuNguyen.status, 200, giuNguyen.text);
    const tang = await suaKhach(w, d.id, 3);
    assert.equal(tang.status, 200, tang.text);
  } finally { tat(); }
});

test("sau khi bỏ lượt quét, giảm khách xuống số mới được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const d = await donDaMo(w, 3);
    const luot1 = await quetTinh(w, d.id, FIELD, 0);
    await quetTinh(w, d.id, FIELD, 1);
    const chan = await suaKhach(w, d.id, 1);
    assert.equal(chan.status, 409, chan.text);
    assert.equal(chan.json.error.code, "duoi_so_ve_da_dung");
    assert.equal((await boLuot(w, luot1)).status, 200);
    const r = await suaKhach(w, d.id, 1);
    assert.equal(r.status, 200, r.text);
  } finally { tat(); }
});

// ===== Đơn nháp đang chờ xác nhận: rút lại và quyết định Huỷ cũng qua câu chặn (phòng thủ: đơn nháp vốn không giữ vé đã dùng — gieo thẳng lượt vào sổ để thấy hàng rào) =====
const gieoLuotDaTinh = (w: any, orderId: string, bo = false) => {
  w.sqlite.exec("PRAGMA foreign_keys = OFF");
  w.sqlite.prepare(`INSERT INTO vdt_scan (id, ticket_id, order_id, ket_qua, scanned_at, scanned_by, created_at, updated_at${bo ? ", voided_at, voided_by, void_reason" : ""}) VALUES (?, ?, ?, 'DA_TINH', ?, ?, ?, ?${bo ? ", ?, ?, ?" : ""})`)
    .run(...[crypto.randomUUID(), crypto.randomUUID(), orderId, AT, XN.A, AT, AT, ...(bo ? [AT, XN.A, "Bỏ lượt thử"] : [])]);
  w.sqlite.exec("PRAGMA foreign_keys = ON");
};
async function choXacNhan(w: any) {
  XN.datCo(w, "SERVICE", "ZA1", true);
  const ngay = XN.inDays(3);
  const o = await XN.lap(w, XN.A, [XN.svc("ZA1", ngay, [XN.leg(ngay, "07:00")])]);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: XN.A, body: {} })).status, 201);
  return o.id as string;
}
const rut = (w: any, id: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as: XN.A, body: {} });
const quyetHuy = (w: any, id: string) => {
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  const u = w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at;
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: XN.B, body: { yeuCauId: y.id, updatedAt: u, ketQua: "HET_VE" } });
};

test("rut-xac-nhan và quyet-dinh (Huỷ) 409 đúng câu khi đơn có lượt DA_TINH chưa bỏ; lượt đã bỏ thì không chặn", async () => {
  const w = XN.setup();
  const a = await choXacNhan(w);
  const b = await choXacNhan(w);
  gieoLuotDaTinh(w, a);
  gieoLuotDaTinh(w, b);
  const r1 = await rut(w, a);
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "don_co_ve_da_dung");
  assert.equal(r1.json.error.message, CAU);
  const r2 = await quyetHuy(w, b);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "don_co_ve_da_dung");
  assert.equal(r2.json.error.message, CAU);
  for (const id of [a, b]) assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id IN (?, ?) AND decided_at IS NULL", a, b)[0].n, 2, "yêu cầu vẫn mở");
  const c = await choXacNhan(w);
  gieoLuotDaTinh(w, c, true);
  assert.equal((await rut(w, c)).status, 200, "lượt đã bỏ không chặn");
});

// ===== Củng cố Task 13: đúng dòng dịch vụ, em bé không tính, và câu gác trong lô chống quét chen giữa lúc đọc và lúc ghi =====
/** Chèn thẳng một lượt DA_TINH (một khách) của vé còn lại cho đúng dòng dịch vụ — mô phỏng máy quét khác chen vào (khuôn bài 14/15 của quet-route.test.ts, nhưng chèn đúng trước LÔ ghi vì D1 giả soạn câu lúc chạy lô). */
const chenLuotDaTinh = (w: any, orderId: string, ticketCode: string, serviceId: string) => {
  const ve = w.q("SELECT id FROM vdt_ticket WHERE ticket_code = ?", ticketCode)[0].id as string;
  w.sqlite.prepare("INSERT INTO vdt_scan (id, ticket_id, order_id, order_service_id, so_khach, ket_qua, scanned_at, scanned_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 'DA_TINH', ?, ?, ?, ?)")
    .run(crypto.randomUUID(), ve, orderId, serviceId, AT, FIELD, AT, AT);
};
const soKhachLuu = (w: any, id: string) => w.q("SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = ?", id)[0].n as number;


/** Đơn ĐÃ XÁC NHẬN hai dòng dịch vụ: A = ZA1 (có vé, 2 khách, chặng đón), B = ZB1 (không vé, 2 khách). Đã thu đủ, đã giao vé dòng A. */
async function donHaiDong(w: any) {
  const lap = (code: string, gia: number, dongA: boolean) => ({
    kind: "catalog", catalogCode: code, pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: gia }, departDate: NGAY,
    pickupChoice: dongA ? "DON" : "KHONG_DON",
    legs: dongA ? [{ direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }] : [],
  });
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { customerName: "Khách Hai Dòng", customerPhone: "0912345678", services: [lap("ZA1", 777000, true), lap("ZB1", 300000, false)], passengers: Array.from({ length: 4 }, (_x, i) => ({ fullName: `Khách Hai Dòng ${i + 1}`, birthYear: 1990 + i, paxCode: "adult" })) },
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const tong = (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order.total as number;
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ADM, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: id, requestId: crypto.randomUUID() } })).status, 200);
  const dv = (ma: string) => w.q("SELECT id FROM order_service WHERE order_id = ? AND catalog_code = ?", id, ma)[0].id as string;
  return { id, a: dv("ZA1"), b: dv("ZB1") };
}

test("đơn hai dòng: vé đã dùng ở dòng A không chặn giảm khách dòng B; giảm dòng A xuống dưới số đã dùng vẫn bị chặn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB1', 'Tour bờ', 'perPax', 300000, 1, '2026-01-01', '2026-01-01')");
    w.sqlite.exec("INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, updated_at) VALUES ('co-ve-zb1', 'SERVICE', 'ZB1', 0, '2026-01-01T00:00:00.000Z', '2026-01-01', '2026-01-01')");
    const d = await donHaiDong(w);
    await quetTinh(w, d.id, FIELD, 0);
    await quetTinh(w, d.id, FIELD, 1); // dòng A đã dùng 2
    const body = (a: number, b: number) => ({ lyDo: "BOT_NGUOI", services: [{ id: d.a, pax: pax(a) }, { id: d.b, pax: pax(b) }] });
    const hai = await w.call("POST", `/api/orders/${d.id}/money-edit`, { as: SALES, body: body(2, 1) });
    assert.equal(hai.status, 200, hai.text); // B 2 → 1: B không có vé đã dùng, dù cả đơn đã dùng 2
    const chan = await w.call("POST", `/api/orders/${d.id}/money-edit`, { as: SALES, body: body(1, 1) });
    assert.equal(chan.status, 409, chan.text);
    assert.equal(chan.json.error.code, "duoi_so_ve_da_dung");
  } finally { tat(); }
});

test("dịch vụ có giá em bé: em bé không tính vào số khách so với vé đã dùng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    w.sqlite.exec("UPDATE catalog_item SET price_infant = 100000 WHERE code = 'ZA1'");
    // bản chụp giá lúc lập đơn phải có giá em bé thì sau này mới sửa thêm em bé được: lập đơn với 1 em bé
    const r = await w.call("POST", "/api/orders", {
      as: SALES,
      body: {
        customerName: "Khách Em Bé", customerPhone: "0912345678",
        services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 1 }, catalogPriceSeen: { adult: 777000, infant: 100000 }, departDate: NGAY, pickupChoice: "DON",
          legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }] }],
        passengers: [{ fullName: "Khách Em Bé 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Em Bé 2", birthYear: 1991, paxCode: "adult" }, { fullName: "Bé Một", birthYear: 2026, paxCode: "infant" }],
      },
    });
    assert.equal(r.status, 201, r.text);
    const d = { id: r.json.order.id as string };
    assert.equal((await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
    const tong = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
    assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ADM, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
    assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } })).status, 200);
    await quetTinh(w, d.id, FIELD, 0);
    await quetTinh(w, d.id, FIELD, 1); // đã dùng 2
    const them = await suaKhach(w, d.id, 2, 1); // giữ 2 người lớn, thêm 1 em bé: không dưới số đã dùng
    assert.equal(them.status, 200, them.text);
    const chan = await suaKhach(w, d.id, 1, 3); // 1 người lớn + 3 em bé: em bé không tính nên 1 < 2 vẫn chặn
    assert.equal(chan.status, 409, chan.text);
    assert.equal(chan.json.error.code, "duoi_so_ve_da_dung");
  } finally { tat(); }
});

for (const [ten, sua] of [["money-edit", suaKhach], ["handler-money-edit", suaKhachHdv]] as const) {
  test(`cạnh tranh: lượt quét chen giữa lúc đọc và lúc ghi ${ten} → 409 duoi_so_ve_da_dung, số khách không đổi, không ghi dòng điều chỉnh`, async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      await khoVe(w);
      const d = await donDaMo(w, 2);
      giaoViec(w, d.id);
      await quetTinh(w, d.id, FIELD, 0); // đã dùng 1: giảm xuống 1 qua phép kiểm lúc đọc
      const truocDong = soKhachLuu(w, d.id);
      const truocNhatKy = Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d.id)[0].n);
      const ma2 = maCuaDon(w, d.id)[1]!;
      w.chenTruocLo((stmts: any[]) => stmts.some((x) => /INSERT INTO order_money_adjustment/.test(x.sql)), () => chenLuotDaTinh(w, d.id, ma2, dichVuId(w, d.id))); // lô ghi đã soạn xong, chưa chạy: lượt quét chen vào đúng khe
      const r = await sua(w, d.id, 1);
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "duoi_so_ve_da_dung");
      assert.equal(r.json.error.message, CAU_GIAM);
      assert.doesNotMatch(r.text, MA_TD);
      assert.equal(w.q("SELECT count(*) AS n FROM vdt_scan WHERE ket_qua = 'DA_TINH'")[0].n, 2, "lượt chen vẫn còn (bài có thật)");
      assert.equal(soKhachLuu(w, d.id), truocDong, "không có dòng điều chỉnh mới");
      assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d.id)[0].n), truocNhatKy, "không nhật ký");
    } finally { tat(); }
  });
}
