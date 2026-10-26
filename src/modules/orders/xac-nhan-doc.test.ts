// ADR-0136 Đ6, Đ9 — Task 3.3 (lát 3): danh sách chờ `GET /api/orders/cho-xac-nhan` (không tên / SĐT / email khách) và nới đọc CÓ GIỚI HẠN chi tiết đơn ĐANG CHỜ cho người xét duyệt
// (DTO đã cắt, tiền chỉ đọc, hành khách / biên nhận vẫn 404). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { quaHanXacNhan } from "../../shared/xac-nhan-don.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, ADM, B, H, INTERN, LAI, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc, vnSau } from "../../../tests/audit/xac-nhan-khung.mjs";

const gui = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const rut = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as, body: {} });
const HR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

async function choXacNhan(w: any, as = A) {
  datCo(w, "SERVICE", "ZA1", true);
  const ngay = inDays(3);
  const o = await lap(w, as, [svc("ZA1", ngay, [leg(ngay, "07:00")])], { customerEmail: "khach@example.com", customerNote: "Dị ứng hải sản" });
  assert.equal((await gui(w, o.id, as)).status, 201);
  return o;
}

test("quaHanXacNhan: đồng hồ TIÊM ĐƯỢC (không đọc giờ thật) — quá hạn khi bây giờ SAU hạn, đúng hạn chưa quá", () => {
  const han = "2026-10-26T03:15:00.000Z";
  assert.equal(quaHanXacNhan(han, Date.parse(han) - 1), false);
  assert.equal(quaHanXacNhan(han, Date.parse(han)), false);
  assert.equal(quaHanXacNhan(han, Date.parse(han) + 1), true);
});

test("(b) danh sách chờ: Kế toán, HDV, Quản trị, Toàn quyền, Bán hàng thấy đơn; JSON KHÔNG chứa SĐT, email, ghi chú, tên khách; có hạn + dịch vụ + tiền; HCNS, Đối tác, Thực tập → 403", async () => {
  const w = setup();
  const o = await choXacNhan(w);
  await lap(w, A); // nháp chưa gửi: không có trong danh sách
  seedStaff(w.sqlite, { id: HR, phone: "0900000010", name: "Nhân sự", perms: ["HR"] });
  for (const ai of [ACC, H, ADM, SUP, B, A]) {
    const r = await w.call("GET", "/api/orders/cho-xac-nhan", { as: ai });
    assert.equal(r.status, 200, `${ai}: ${r.text}`);
    assert.equal(r.json.don.length, 1, ai);
    const d = r.json.don[0];
    assert.equal(d.orderId, o.id);
    assert.equal(d.orderCode, o.orderCode);
    assert.deepEqual(d.dichVu, ["Tour đảo"]);
    assert.equal(d.soKhach, 2);
    assert.equal(d.gioDon, "07:00");
    assert.equal(d.tong, 1_000_000);
    assert.equal(typeof d.quaHan, "boolean");
    assert.equal(d.hanLuc, w.q("SELECT deadline_at h FROM ord_confirm_request WHERE order_id = ?", o.id)[0].h);
    assert.deepEqual(d.vi, ["DICH_VU"]);
    assert.equal(d.canDatGap, false);
    for (const cam of ["0912345678", "khach@example.com", "Dị ứng", "Khách Thử"]) assert.ok(!r.text.includes(cam), `${ai}: lộ ${cam}`);
  }
  for (const ai of [HR, PARTNER, INTERN]) assert.equal((await w.call("GET", "/api/orders/cho-xac-nhan", { as: ai })).status, 403, ai);
});

test("danh sách chờ: đơn rút lại / đã quyết biến mất; đơn chờ vì chặng dưới mốc có nhãn canDatGap (vi DAT_GAP)", async () => {
  const w = setup();
  const a = await choXacNhan(w);
  const gio = vnSau(60);
  const m = await lap(w, A, [svc("ZB1", gio.date, [leg(gio.date, gio.time)])]);
  assert.equal((await gui(w, m.id, A)).status, 201);
  const ds = async () => (await w.call("GET", "/api/orders/cho-xac-nhan", { as: ACC })).json.don as any[];
  assert.deepEqual((await ds()).map((d) => [d.orderId, d.canDatGap]).sort(), [[a.id, false], [m.id, true]].sort());
  assert.equal((await rut(w, a.id, A)).status, 200);
  assert.deepEqual((await ds()).map((d) => d.orderId), [m.id]);
});

test("chi tiết đơn ĐANG CHỜ (Đ6): Kế toán / HDV chưa phụ trách / Bán hàng khác → 200 DTO đã cắt (không SĐT, email, tên, ghi chú), tiền còn; hành khách 404; nháp KHÔNG chờ → 404; Rút lại → 404 lại", async () => {
  const w = setup();
  const o = await choXacNhan(w);
  const khongCho = await lap(w, A);
  for (const ai of [ACC, H, B, ADM, SUP]) {
    const r = await w.call("GET", `/api/orders/${o.id}`, { as: ai });
    assert.equal(r.status, 200, `${ai}: ${r.text}`);
    const d = r.json.order;
    assert.equal(d.customerPhone, "");
    assert.equal(d.customerEmail, null);
    assert.equal(d.customerNote, null);
    assert.equal(d.paymentNote, null);
    assert.equal(d.customerName, "");
    assert.equal(d.total, 1_000_000, "tiền vẫn có (chỉ đọc)");
    assert.equal(d.status, "draft");
    assert.deepEqual(r.json.history, [], "người xét duyệt không đọc lịch sử");
    assert.equal(r.json.canModify, false);
    assert.equal(r.json.suaSoKhach, null);
    for (const cam of ["0912345678", "khach@example.com", "Dị ứng", "Khách Thử"]) assert.ok(!r.text.includes(cam), `${ai}: lộ ${cam}`);
    assert.equal((await w.call("GET", `/api/orders/${o.id}/passengers`, { as: ai })).status, 404, `${ai}: hành khách`);
    assert.equal((await w.call("GET", `/api/orders/${khongCho.id}`, { as: ai })).status, 404, `${ai}: nháp không chờ`);
  }
  // người lập vẫn thấy đầy đủ
  const rA = await w.call("GET", `/api/orders/${o.id}`, { as: A });
  assert.equal(rA.json.order.customerPhone, "0912345678");
  // không có ô xét duyệt → như cũ (nháp người khác 404)
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: INTERN })).status, 404);
  assert.equal((await rut(w, o.id, A)).status, 200);
  for (const ai of [ACC, H, B]) assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: ai })).status, 404, `${ai}: sau Rút lại`);
});

test("(r) tài khoản lai Bán hàng + Đối tác mở chi tiết đơn chờ CỦA NGƯỜI KHÁC → 200 DTO đã cắt như người xét duyệt (không phải DTO hẹp của Đối tác)", async () => {
  const w = setup();
  const o = await choXacNhan(w);
  const r = await w.call("GET", `/api/orders/${o.id}`, { as: LAI });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.customerPhone, "");
  assert.equal(r.json.order.total, 1_000_000);
  assert.ok(Array.isArray(r.json.order.services) && r.json.order.services.length === 1);
});


test("(q) lịch chung điều phối: chặng của nháp CHỈ hiện khi có yêu cầu xác nhận còn mở; chưa gửi / Rút lại → vắng; ca đặt gấp mang cờ datGap", async () => {
  const w = setup();
  const { legLichChungNhapRows } = await import("./chang-hanh-khach-repo.ts");
  const hang = async () => (await legLichChungNhapRows(w.env.DB, inDays(0), inDays(10))) as any[];
  datCo(w, "SERVICE", "ZA1", true);
  const ngay = inDays(3);
  const o = await lap(w, A, [svc("ZA1", ngay, [leg(ngay, "07:00")])]);
  assert.deepEqual(await hang(), [], "nháp chưa gửi");
  assert.equal((await gui(w, o.id, A)).status, 201);
  const r = await hang();
  assert.equal(r.length, 1);
  assert.equal(r[0].order_id, o.id);
  assert.equal(r[0].pickup_time, "07:00");
  assert.deepEqual(Object.keys(r[0]).sort(), ["dat_gap", "id", "order_code", "order_id", "pickup_date", "pickup_time"], "chỉ khoá, mã đơn, ngày giờ, cờ đặt gấp");
  assert.equal((await rut(w, o.id, A)).status, 200);
  assert.deepEqual(await hang(), [], "sau Rút lại");
});
