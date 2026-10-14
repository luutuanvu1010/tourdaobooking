// ADR-0118 Đ3 (Đợt 2 lượt 1, Task 3; kế hoạch docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md N-8…N-13): MÁY CHỦ từ chối ghi chặng đưa đón cho dịch vụ
// thuộc nhóm đã TẮT đưa đón — ở MỌI cửa ghi chặng — và chặn XÁC NHẬN đơn nháp còn chặng mở như vậy; vẫn cho ĐÓNG chặng và vẫn cho các lệnh khác (sửa số khách,
// ghi chú, huỷ). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Nhóm tắt dựng bằng SQL thẳng: `ctl_service_group` (gán) + `ctl_group.transfer_enabled = 0`.
//
// Sáu cửa ghi chặng (ADR Đ3(a) liệt kê bốn nhóm; người thi công thêm cửa thứ sáu `PUT /api/orders/:id/trip` — xem Ruling R-T trong nhật ký thi công):
//   1 POST /api/orders (lập)          2 PUT /api/orders/:id (lưu nháp, xoá–chèn lại)   3 POST /api/orders/:id/legs (thêm)
//   4 PUT /api/orders/:id/legs/:legId (sửa; cả nhánh nháp số người chiều về)             5 POST …/legs/:legId/replace (thay)   6 PUT /api/orders/:id/trip (thân sửa chuyến → thao tác chặng)
// và cửa XÁC NHẬN: POST /api/orders/:id/status {status: "confirmed"}.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ACC = "55555555-5555-4555-8555-555555555555";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const AT = "2026-09-01T00:00:00.000Z";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);
const D2 = inDays(5);
const TEN_NHOM = "Hòn Tằm"; // nhóm HTA gieo ở migration 0055

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB2', 'Vé cáp treo', 'perPax', 200000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
/** Gán ZA1 vào nhóm HTA (lịch sử gán chỉ-thêm) và đặt cờ đưa đón của HTA. */
let n = 0;
function nhomZA1(w: any, batDuaDon: boolean) {
  const co = w.q("SELECT COUNT(*) AS c FROM ctl_service_group WHERE service_code = 'ZA1'")[0].c as number;
  if (co === 0) w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', 'HTA', 1, ?, ?, ?)").run(`g-${++n}`, AT, AT, AT);
  w.sqlite.prepare("UPDATE ctl_group SET transfer_enabled = ? WHERE code = 'HTA'").run(batDuaDon ? 1 : 0);
}
const tat = (w: any) => nhomZA1(w, false);
const bat = (w: any) => nhomZA1(w, true);

const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" };
const MOI = { direction: "OUT", pickupDate: D, pickupTime: "07:00", pickupLocationId: null, pickupPlace: "Khách sạn Mới", dropoffLocationId: LOC, dropoffPlace: "" };
const svc = (extra: Record<string, unknown> = {}) => ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, ...extra });
const svcB = (extra: Record<string, unknown> = {}) => ({ kind: "catalog", catalogCode: "ZB2", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 200000 }, departDate: D, ...extra });
const body = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });

const soDon = (w: any) => w.q("SELECT COUNT(*) AS c FROM orders")[0].c as number;
const legRows = (w: any, id: string) => w.q("SELECT id, closed_at FROM ord_transfer_leg WHERE order_id = ? ORDER BY id", id).map((r: any) => ({ ...r }));
const soNhatKy = (w: any, id: string) => w.q("SELECT COUNT(*) AS c FROM audit_log WHERE order_id = ?", id)[0].c as number;
const mocDon = (w: any, id: string) => w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at as string;
async function tao(w: any, services: unknown[], extra: Record<string, unknown> = {}) {
  const r = await w.call("POST", "/api/orders", { as: SALES, body: body(services, extra) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
const xacNhan = (w: any, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const lay = async (w: any, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order;
const biTuChoi = (r: any, ten = "Tour đảo") => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "transfer_disabled");
  assert.match(r.json.error.message, new RegExp(ten));
  assert.match(r.json.error.message, new RegExp(TEN_NHOM), "nêu tên nhóm");
  assert.match(r.json.error.message, /đưa đón/);
};

// ---------------------------------------------------------------------------------------------------------- N-8 lập đơn

test("N-8: lập đơn CÓ chặng cho dịch vụ thuộc nhóm tắt → 409 transfer_disabled (nêu tên dịch vụ + nhóm), KHÔNG lưu đơn; đơn không chặng → 201", async () => {
  const w = setup();
  tat(w);
  const r = await w.call("POST", "/api/orders", { as: SALES, body: body([svc({ legs: [OUT] })]) });
  biTuChoi(r);
  assert.equal(soDon(w), 0, "không lưu đơn nào");
  assert.equal(w.q("SELECT COUNT(*) AS c FROM ord_transfer_leg")[0].c, 0);
  const khong = await w.call("POST", "/api/orders", { as: SALES, body: body([svc({ legs: [] })]) });
  assert.equal(khong.status, 201, khong.text);
  const khongKhoa = await w.call("POST", "/api/orders", { as: SALES, body: body([svc()]) });
  assert.equal(khongKhoa.status, 201, "thân không có khoá legs và không có giờ / nơi đón → không chặng");
  assert.equal(soDon(w), 2);
});

test("N-8: thân CŨ (giờ + nơi đón ở dịch vụ, không khoá legs) tự sinh chặng chiều đi → cũng bị từ chối; đơn nhiều dịch vụ: chỉ dịch vụ ở nhóm tắt bị bắt, nêu đúng tên nó", async () => {
  const w = setup();
  tat(w);
  const cu = await w.call("POST", "/api/orders", { as: SALES, body: body([svc({ pickupTime: "07:15", pickupPlace: "Nhà riêng Dò Tìm" })]) });
  biTuChoi(cu);
  const hai = await w.call("POST", "/api/orders", { as: SALES, body: body([svcB({ legs: [OUT] }), svc({ legs: [OUT] })]) });
  biTuChoi(hai, "Tour đảo");
  assert.doesNotMatch(hai.json.error.message, /Vé cáp treo/, "dịch vụ chưa phân loại không bị nêu tên");
  assert.equal(soDon(w), 0);
});

test("N-13: dịch vụ CHƯA PHÂN LOẠI (ZB2) và mã không có dòng gán luôn lập được đơn có chặng; nhóm BẬT lại thì dịch vụ cũ lập được ngay", async () => {
  const w = setup();
  tat(w);
  const khac = await w.call("POST", "/api/orders", { as: SALES, body: body([svcB({ legs: [OUT, RET] })]) });
  assert.equal(khac.status, 201, khac.text);
  bat(w);
  const lai = await w.call("POST", "/api/orders", { as: SALES, body: body([svc({ legs: [OUT, RET] })]) });
  assert.equal(lai.status, 201, lai.text);
  assert.equal(lai.json.order.services[0].legs.length, 2);
});

// ---------------------------------------------------------------------------------------------------------- N-9 lưu nháp

test("N-9: lưu nháp gửi lại chặng của dịch vụ nay ở nhóm tắt → 409 transfer_disabled; đơn KHÔNG đổi (mốc, chặng còn nguyên, không nhật ký); thân cũ (khoá vắng ⇒ chặng đang lưu đi tiếp) cũng bị từ chối", async () => {
  const w = setup();
  const o = await tao(w, [svc({ legs: [OUT, RET] })]);
  tat(w);
  const truoc = { moc: mocDon(w, o.id), legs: legRows(w, o.id), nk: soNhatKy(w, o.id) };
  const lai = o.services[0].legs.map((l: any) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" }));
  const r = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body([svc({ id: o.services[0].id, legs: lai })], { expectedUpdatedAt: o.updatedAt }) });
  biTuChoi(r);
  const cu = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body([svc({ id: o.services[0].id })], { expectedUpdatedAt: o.updatedAt, customerNote: "đổi ghi chú" }) });
  biTuChoi(cu);
  assert.equal(mocDon(w, o.id), truoc.moc, "đơn không đổi mốc");
  assert.deepEqual(legRows(w, o.id), truoc.legs, "chặng còn nguyên (không xoá nửa chừng)");
  assert.equal(soNhatKy(w, o.id), truoc.nk, "không nhật ký");
});

test("N-9: lưu nháp BỎ HẾT chặng của dịch vụ nhóm tắt (legs: []) → 200, chặng được gỡ khỏi nháp (đường thoát có hướng dẫn); bật lại nhóm thì lưu chặng được", async () => {
  const w = setup();
  const o = await tao(w, [svc({ legs: [OUT] })]);
  tat(w);
  const bo = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body([svc({ id: o.services[0].id, legs: [] })], { expectedUpdatedAt: o.updatedAt }) });
  assert.equal(bo.status, 200, bo.text);
  assert.equal(bo.json.order.services[0].legs.length, 0);
  bat(w);
  const them = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body([svc({ id: o.services[0].id, legs: [OUT] })], { expectedUpdatedAt: bo.json.order.updatedAt }) });
  assert.equal(them.status, 200, them.text);
  assert.equal(them.json.order.services[0].legs.length, 1);
});

test("N-9: lưu nháp đơn có dịch vụ nhóm tắt KHÔNG chặng + dịch vụ khác có chặng → 200 (chỉ chặng của dịch vụ nhóm tắt bị cấm)", async () => {
  const w = setup();
  tat(w);
  const o = await tao(w, [svc({ legs: [] }), svcB({ legs: [OUT] })]);
  const r = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body([svc({ id: o.services[0].id, legs: [] }), svcB({ id: o.services[1].id, legs: [OUT, RET] })], { expectedUpdatedAt: o.updatedAt }) });
  assert.equal(r.status, 200, r.text);
});

// ---------------------------------------------------------------------------------------------------------- N-10 ba route chặng + thay + sửa chuyến

async function donDaXacNhan(w: any) {
  const o = await tao(w, [svc({ legs: [OUT] })]);
  assert.equal((await xacNhan(w, o.id)).status, 200);
  return lay(w, o.id);
}
const LEG_EDIT = (l: any, over: Record<string, unknown> = {}) => ({
  pickupDate: l.pickupDate, pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...over,
});
/** Không đổi gì: chặng còn đúng như trước, mốc đơn giữ, không thêm nhật ký. */
function khongGhi(w: any, id: string, truoc: { moc: string; legs: unknown; nk: number }) {
  assert.equal(mocDon(w, id), truoc.moc, "mốc đơn không đổi");
  assert.deepEqual(legRows(w, id), truoc.legs, "chặng không đổi");
  assert.equal(soNhatKy(w, id), truoc.nk, "không thêm nhật ký");
}
const chup = (w: any, id: string) => ({ moc: mocDon(w, id), legs: legRows(w, id), nk: soNhatKy(w, id) });

test("N-10: đơn ĐÃ XÁC NHẬN, nhóm nay tắt — thêm chặng (POST /legs), sửa chặng (PUT /legs/:id) → 409 transfer_disabled, không ghi chặng, không nhật ký", async () => {
  const w = setup();
  const o = await donDaXacNhan(w);
  tat(w);
  const truoc = chup(w, o.id);
  const them = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: RET } });
  biTuChoi(them);
  const l = o.services[0].legs[0];
  const sua = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: LEG_EDIT(l, { pickupTime: "07:00" }) } });
  biTuChoi(sua);
  const ban = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as: ADM, body: { expectedUpdatedAt: l.updatedAt, leg: LEG_EDIT(l, { pickupPlace: "Khách sạn khác" }) } });
  biTuChoi(ban);
  khongGhi(w, o.id, truoc);
});

test("N-10: THAY chặng (POST /legs/:id/replace) → 409 transfer_disabled TRƯỚC khi ghi: chặng cũ VẪN MỞ, không chặng mới, không nhật ký", async () => {
  const w = setup();
  const o = await donDaXacNhan(w);
  tat(w);
  const truoc = chup(w, o.id);
  const r = await w.call("POST", `/api/orders/${o.id}/legs/${o.services[0].legs[0].id}/replace`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, leg: MOI } });
  biTuChoi(r);
  khongGhi(w, o.id, truoc);
  assert.equal(legRows(w, o.id).filter((x: any) => x.closed_at === null).length, 1);
});

test("N-10: ĐÓNG chặng (POST /legs/:id/close) VẪN 200 khi nhóm tắt — đó là đường thoát; sau khi đóng hết, thêm chặng vẫn bị từ chối", async () => {
  const w = setup();
  const o = await donDaXacNhan(w);
  tat(w);
  const l = o.services[0].legs[0];
  const r = await w.call("POST", `/api/orders/${o.id}/legs/${l.id}/close`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, reasonCode: "NOT_NEEDED" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.services[0].legs.length, 0);
  const moi = await lay(w, o.id);
  biTuChoi(await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: moi.updatedAt, serviceId: moi.services[0].id, leg: OUT } }));
});

test("N-10 (cửa thứ sáu, Ruling R-T): PUT /trip — thao tác THÊM / SỬA chặng bị từ chối (đổi ngày đi dời chặng ⇒ sửa chặng); chỉ đổi ghi chú / giờ khởi hành (không thao tác chặng) → 200; đóng hết chặng rồi đổi ngày đi → 200", async () => {
  const w = setup();
  const o = await donDaXacNhan(w);
  tat(w);
  const truoc = chup(w, o.id);
  const thanTrip = (over: Record<string, unknown>, moc = o.updatedAt) => ({
    expectedUpdatedAt: moc,
    services: o.services.map((s: any) => ({ id: s.id, departDate: s.departDate, departTime: s.departTime ?? "", checkinDate: s.checkinDate ?? "", checkinTime: s.checkinTime ?? "", checkinPlace: s.checkinPlace ?? "", note: s.note ?? "", ...over })),
  });
  const doiNgay = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: thanTrip({ departDate: D2 }) });
  biTuChoi(doiNgay);
  khongGhi(w, o.id, truoc);
  const ghiChu = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: thanTrip({ note: "Khách xin ghế trước" }) });
  assert.equal(ghiChu.status, 200, ghiChu.text);
  assert.equal(ghiChu.json.order.services[0].note, "Khách xin ghế trước");
  assert.equal(legRows(w, o.id).filter((x: any) => x.closed_at === null).length, 1, "chặng cũ không bị động đến");
  // Đường thoát: đóng chặng rồi đổi ngày đi.
  const l = ghiChu.json.order.services[0].legs[0];
  assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${l.id}/close`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, reasonCode: "NOT_NEEDED" } })).status, 200);
  const moi = await lay(w, o.id);
  const sau = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: moi.updatedAt, services: [{ id: moi.services[0].id, departDate: D2, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "Khách xin ghế trước" }] } });
  assert.equal(sau.status, 200, sau.text);
});

// ---------------------------------------------------------------------------------------------------------- N-11 / N-12 xác nhận

test("N-12: XÁC NHẬN đơn nháp còn chặng MỞ của dịch vụ nhóm tắt → 409 transfer_disabled, đơn VẪN nháp, không nhật ký xác nhận; đơn nháp không chặng → xác nhận 200", async () => {
  const w = setup();
  const co = await tao(w, [svc({ legs: [OUT] })]); // nháp tạo lúc nhóm còn bật
  const khong = await tao(w, [svc({ legs: [] })]);
  tat(w);
  const truoc = chup(w, co.id);
  const r = await xacNhan(w, co.id);
  biTuChoi(r);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", co.id)[0].status, "draft");
  khongGhi(w, co.id, truoc);
  assert.equal((await xacNhan(w, khong.id)).status, 200, "không chặng → xác nhận được");
  // Gỡ chặng khỏi nháp rồi xác nhận được (đường thoát).
  const bo = await w.call("PUT", `/api/orders/${co.id}`, { as: SALES, body: body([svc({ id: co.services[0].id, legs: [] })], { expectedUpdatedAt: co.updatedAt }) });
  assert.equal(bo.status, 200, bo.text);
  assert.equal((await xacNhan(w, co.id)).status, 200);
});

test("N-12: nhóm BẬT lại → đơn nháp có chặng xác nhận được (cờ đọc lúc xác nhận, không dính vào nháp)", async () => {
  const w = setup();
  const o = await tao(w, [svc({ legs: [OUT] })]);
  tat(w);
  biTuChoi(await xacNhan(w, o.id));
  bat(w);
  assert.equal((await xacNhan(w, o.id)).status, 200);
});

test("N-12: đơn ĐÃ XÁC NHẬN có chặng từ trước, nhóm nay tắt — vẫn sửa số khách (money-edit), ghi chú chuyến (PUT /trip) và HUỶ được; chặng cũ không bị khoá oan", async () => {
  const w = setup();
  const o = await donDaXacNhan(w);
  tat(w);
  const sk = await w.call("POST", `/api/orders/${o.id}/money-edit`, { as: SALES, body: { lyDo: "THEM_NGUOI", services: [{ id: o.services[0].id, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sk.status, 200, sk.text);
  const moi = await lay(w, o.id);
  const gc = await w.call("PUT", `/api/orders/${o.id}/trip`, {
    as: SALES, body: { expectedUpdatedAt: moi.updatedAt, services: [{ id: moi.services[0].id, departDate: moi.services[0].departDate, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "Ghi chú mới" }] },
  });
  assert.equal(gc.status, 200, gc.text);
  assert.equal(legRows(w, o.id).filter((x: any) => x.closed_at === null).length, 1, "chặng cũ còn mở");
  const huy = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(huy.status, 200, huy.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "cancelled");
});

// ---------------------------------------------------------------------------------------------------------- N-13 bật lại

test("N-13: nhóm BẬT lại → mọi cửa hoạt động (lập, thêm, sửa, thay chặng, xác nhận); nhóm đổi giữa chừng (dịch vụ chuyển sang nhóm bật) cũng mở lại", async () => {
  const w = setup();
  const o = await donDaXacNhan(w);
  tat(w);
  biTuChoi(await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: RET } }));
  bat(w);
  const them = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: RET } });
  assert.equal(them.status, 201, them.text);
  const l = them.json.order.services[0].legs.find((x: any) => x.direction === "OUT");
  const sua = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: LEG_EDIT(l, { pickupTime: "07:30" }) } });
  assert.equal(sua.status, 200, sua.text);
  const moi = await lay(w, o.id);
  const l2 = moi.services[0].legs.find((x: any) => x.direction === "OUT");
  const thay = await w.call("POST", `/api/orders/${o.id}/legs/${l2.id}/replace`, { as: SALES, body: { expectedUpdatedAt: moi.updatedAt, leg: MOI } });
  assert.equal(thay.status, 200, thay.text);
  // Chuyển dịch vụ sang nhóm khác (đang bật) khi nhóm cũ tắt: cờ theo nhóm HIỆN HÀNH.
  tat(w);
  const l3 = thay.json.order.services[0].legs.find((x: any) => x.direction === "OUT");
  biTuChoi(await w.call("PUT", `/api/orders/${o.id}/legs/${l3.id}`, { as: SALES, body: { expectedUpdatedAt: l3.updatedAt, leg: LEG_EDIT(l3, { pickupTime: "08:00" }) } }));
  w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', 'TDA', 2, ?, ?, ?)").run("g-chuyen", AT, AT, AT);
  const ok = await w.call("PUT", `/api/orders/${o.id}/legs/${l3.id}`, { as: SALES, body: { expectedUpdatedAt: l3.updatedAt, leg: LEG_EDIT(l3, { pickupTime: "08:00" }) } });
  assert.equal(ok.status, 200, ok.text);
});
