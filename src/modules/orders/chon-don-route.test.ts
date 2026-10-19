// ADR-0134 (accepted 2026-10-19) — chọn Đón / Không đón theo dịch vụ, khung giờ đón trên chặng, chính sách khung giờ. Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs). Bản e2e trên API thật: tests/e2e/chon-don.mjs. Kế hoạch 2026-10-19-xac-nhan-don Task 1.2; Review Focus 6.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUPER = "66666666-6666-4666-8666-666666666666";
const FIELD = "44444444-4444-4444-8444-444444444444";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUPER, phone: "0900000006", name: "Toàn quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = (over: Record<string, unknown> = {}) =>
  ({ direction: "OUT", pickupDate: "", pickupTime: "07:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: null, dropoffPlace: "", ...over });
const svc = (over: Record<string, unknown> = {}) =>
  ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, legs: [], ...over });
const tao = async (w: any, services: unknown[], as = SALES) => {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services } });
  return r;
};
const xacNhan = (w: any, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const luuNhap = (w: any, o: any, services: unknown[], as = SALES) =>
  w.call("PUT", `/api/orders/${o.id}`, { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services, expectedUpdatedAt: o.updatedAt } });

test("lưu nháp KHÔNG chọn đón → 201 (pickupChoice null); xác nhận → 409 pickup_choice_required, câu đúng dịch vụ; đơn vẫn nháp", async () => {
  const w = setup();
  const r = await tao(w, [svc({ pickupChoice: "KHONG_DON" }), svc({ pickupChoice: null })]);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.order.services[0].pickupChoice, "KHONG_DON");
  assert.equal(r.json.order.services[1].pickupChoice, null);
  const x = await xacNhan(w, r.json.order.id);
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "pickup_choice_required");
  assert.equal(x.json.error.message, "Dịch vụ thứ 2 chưa chọn Đón hay Không đón.");
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", r.json.order.id)[0].status, "draft");
});

test("thân cũ (không khoá pickupChoice ở mọi dịch vụ) → 201, NULL, không lỗi; lưu lại nháp bằng thân cũ giữ lựa chọn đang lưu; trộn khoá (có / không) giữa các dịch vụ → 400", async () => {
  const w = setup();
  const cu = await tao(w, [svc(), svc()]);
  assert.equal(cu.status, 201, cu.text);
  assert.deepEqual(cu.json.order.services.map((s: any) => s.pickupChoice), [null, null]);
  assert.equal(w.q("SELECT count(*) AS n FROM order_service WHERE pickup_choice IS NULL")[0].n, 2);
  const tron = await tao(w, [svc({ pickupChoice: "DON", legs: [OUT()] }), svc()]);
  assert.equal(tron.status, 400, tron.text);
  assert.match(tron.json.error.message, /không đồng nhất/);
  // Khoá vắng ở mọi dịch vụ khi LƯU LẠI nháp (máy cũ) = GIỮ lựa chọn đang lưu của dịch vụ đó; dịch vụ mới thêm vào thì NULL.
  const co = await tao(w, [svc({ pickupChoice: "KHONG_DON" })]);
  const giu = await luuNhap(w, co.json.order, [svc({ id: co.json.order.services[0].id }), svc()]);
  assert.equal(giu.status, 200, giu.text);
  assert.deepEqual(giu.json.order.services.map((s: any) => s.pickupChoice), ["KHONG_DON", null]);
  const sai = await tao(w, [svc({ pickupChoice: "PICKUP" })]);
  assert.equal(sai.status, 400, sai.text);
  assert.match(sai.json.error.message, /^Dịch vụ 1: /);
});

test("Đón mà 0 chặng → 409; Không đón mà còn chặng → 409; Đón + 1 chặng và Không đón + 0 chặng → xác nhận 200", async () => {
  const w = setup();
  const a = await tao(w, [svc({ pickupChoice: "DON" })]);
  assert.equal((await xacNhan(w, a.json.order.id)).json.error.code, "pickup_choice_required");
  const b = await tao(w, [svc({ pickupChoice: "KHONG_DON", legs: [OUT()] })]);
  assert.equal((await xacNhan(w, b.json.order.id)).json.error.code, "pickup_choice_required");
  const c = await tao(w, [svc({ pickupChoice: "DON", legs: [OUT()] }), svc({ pickupChoice: "KHONG_DON" })]);
  assert.equal(c.status, 201, c.text);
  const x = await xacNhan(w, c.json.order.id);
  assert.equal(x.status, 200, x.text);
  assert.equal(x.json.order.status, "confirmed");
  // Sửa lựa chọn ở bản nháp rồi xác nhận được: lưu nháp đổi NULL → KHONG_DON.
  const d = await tao(w, [svc()]);
  const luu = await luuNhap(w, d.json.order, [svc({ id: d.json.order.services[0].id, pickupChoice: "KHONG_DON" })]);
  assert.equal(luu.status, 200, luu.text);
  assert.equal(luu.json.order.services[0].pickupChoice, "KHONG_DON");
  assert.equal((await xacNhan(w, d.json.order.id)).status, 200);
});

test("khung giờ: chặng pickupTime 07:30 + pickupSlotEnd 08:00 → đọc lại đúng; cuối khung không sau giờ đón / thiếu giờ đón / sai dạng → 400", async () => {
  const w = setup();
  const r = await tao(w, [svc({ pickupChoice: "DON", legs: [OUT({ pickupSlotEnd: "08:00" })] })]);
  assert.equal(r.status, 201, r.text);
  const l = r.json.order.services[0].legs[0];
  assert.equal(l.pickupTime, "07:30");
  assert.equal(l.pickupSlotEnd, "08:00");
  const g = await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES });
  assert.equal(g.json.order.services[0].legs[0].pickupSlotEnd, "08:00");
  // Giờ khác: không gửi cuối khung → null.
  const k = await tao(w, [svc({ pickupChoice: "DON", legs: [OUT({ pickupTime: "14:15" })] })]);
  assert.equal(k.json.order.services[0].legs[0].pickupSlotEnd, null);
  for (const bad of [OUT({ pickupSlotEnd: "07:30" }), OUT({ pickupSlotEnd: "07:00" }), OUT({ pickupTime: "", pickupSlotEnd: "08:00" }), OUT({ pickupSlotEnd: "8:00" })]) {
    const x = await tao(w, [svc({ pickupChoice: "DON", legs: [bad] })]);
    assert.equal(x.status, 400, `${JSON.stringify(bad)}: ${x.text}`);
    assert.match(x.json.error.message, /cuối khung/);
  }
});

test("đơn đã xác nhận có khung: sửa giờ đón qua route sửa chặng → 200, cuối khung tự xoá (không 500); giữ giờ cũ đổi nơi → giữ cuối khung", async () => {
  const w = setup();
  const r = await tao(w, [svc({ pickupChoice: "DON", legs: [OUT({ pickupTime: "08:00", pickupSlotEnd: "08:30" })] })]);
  assert.equal((await xacNhan(w, r.json.order.id)).status, 200);
  const o = (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES })).json.order;
  const l = o.services[0].legs[0];
  const sua = (leg: Record<string, unknown>, expected: string) => w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: expected, leg } });
  const base = { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: l.pickupPlace, dropoffLocationId: null, dropoffPlace: "" };
  const giuGio = await sua({ ...base, pickupPlace: "Khách sạn Khác" }, l.updatedAt);
  assert.equal(giuGio.status, 200, giuGio.text);
  assert.equal(w.q("SELECT pickup_slot_end FROM ord_transfer_leg WHERE id = ?", l.id)[0].pickup_slot_end, "08:30");
  const l2 = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order.services[0].legs[0];
  const doiGio = await sua({ ...base, pickupPlace: "Khách sạn Khác", pickupTime: "14:15" }, l2.updatedAt);
  assert.equal(doiGio.status, 200, doiGio.text);
  const db = w.q("SELECT pickup_time, pickup_slot_end FROM ord_transfer_leg WHERE id = ?", l.id)[0];
  assert.deepEqual({ ...db }, { pickup_time: "14:15", pickup_slot_end: null });
});

test("Review Focus 6: đơn đã xác nhận TRƯỚC ngày áp dụng (pickup_choice NULL) → huỷ được 200, sửa chặng được 200 — không bị đòi chọn lại", async () => {
  const w = setup();
  const r = await tao(w, [svc({ pickupChoice: "DON", legs: [OUT()] })]);
  assert.equal((await xacNhan(w, r.json.order.id)).status, 200);
  w.sqlite.prepare("UPDATE order_service SET pickup_choice = NULL WHERE order_id = ?").run(r.json.order.id); // giả đơn cũ
  const o = (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES })).json.order;
  assert.equal(o.services[0].pickupChoice, null);
  const l = o.services[0].legs[0];
  const s = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, {
    as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: "09:00", pickupLocationId: null, pickupPlace: l.pickupPlace, dropoffLocationId: null, dropoffPlace: "" } },
  });
  assert.equal(s.status, 200, s.text);
  const h = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(h.status, 200, h.text);
});

test("chính sách khung giờ: GET (người lập đơn) thấy 5 khung mặc định + câu lưu ý; chỉ-HDV 403; POST Bán hàng / Quản trị 403, Toàn quyền 200 + nhật ký không gắn đơn; thân sai 400", async () => {
  const w = setup();
  const g = await w.call("GET", "/api/cai-dat/khung-gio-don", { as: SALES });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.khung.length, 5);
  assert.deepEqual(g.json.khung[0], { tu: "07:30", den: "08:00" });
  assert.equal(g.json.luuY, "Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động.");
  assert.equal(g.json.doiDuoc, false);
  assert.equal((await w.call("GET", "/api/cai-dat/khung-gio-don", { as: PARTNER })).status, 200, "Đối tác lập đơn → đọc được");
  assert.equal((await w.call("GET", "/api/cai-dat/khung-gio-don", { as: FIELD })).status, 403);
  const moi = { khung: [{ tu: "06:00", den: "06:30" }, { tu: "06:30", den: "07:00" }], luuY: "Giờ có thể đổi." };
  assert.equal((await w.call("POST", "/api/cai-dat/khung-gio-don", { as: SALES, body: moi })).status, 403);
  assert.equal((await w.call("POST", "/api/cai-dat/khung-gio-don", { as: ADM, body: moi })).status, 403);
  const sai = await w.call("POST", "/api/cai-dat/khung-gio-don", { as: SUPER, body: { khung: [{ tu: "09:00", den: "08:00" }], luuY: "x" } });
  assert.equal(sai.status, 400, sai.text);
  assert.match(sai.json.error.message, /trước giờ kết thúc/);
  assert.equal((await w.call("POST", "/api/cai-dat/khung-gio-don", { as: SUPER, body: { khung: moi.khung, luuY: "" } })).status, 400);
  const p = await w.call("POST", "/api/cai-dat/khung-gio-don", { as: SUPER, body: moi });
  assert.equal(p.status, 200, p.text); // khuôn công tắc nhập tay: 200 (không tạo trang mới nên không có Location — luật H7 của khung thử)
  assert.deepEqual(p.json, { khung: moi.khung, luuY: moi.luuY, doiDuoc: true });
  const g2 = await w.call("GET", "/api/cai-dat/khung-gio-don", { as: SUPER });
  assert.deepEqual(g2.json, { khung: moi.khung, luuY: moi.luuY, doiDuoc: true });
  const nk = w.q("SELECT staff_id, order_id, target_type FROM audit_log WHERE action = 'pickup_slot_policy_changed'").map((x: any) => ({ ...x }));
  assert.deepEqual(nk, [{ staff_id: SUPER, order_id: null, target_type: "system" }]);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_pickup_slot_policy")[0].n, 2);
});
