// ĐẶT GẤP + MỐC TỐI THIỂU LÚC ĐẶT (ADR-0049 D2 "Mốc tối thiểu 6 giờ", D3 ô `order.leg.short_notice`; kế hoạch Task A10; TC-22 … TC-26, TC-43). Chạy CẢ ứng
// dụng trên SQLite thật (tests/audit/harness.mjs) với mốc THẬT (chính sách gieo 360 phút — KHÔNG dùng mốc giả của khung thử: bài canh cuối tệp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const NO_SUCH = "00000000-0000-4000-8000-000000000000";
const PHUT = 60_000;
/** Ngày + giờ VN cách bây giờ `phut` phút (giờ đón của chặng). */
const vnSau = (phut: number) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * PHUT).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const leg = (date: string, time: string, over: Record<string, unknown> = {}) =>
  ({ direction: "OUT", pickupDate: date, pickupTime: time, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "", ...over });
const svc = (departDate: string, legs: unknown[], extra: Record<string, unknown> = {}) =>
  ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate, legs, ...extra });
async function nhap(w: any, as: string, gio: { date: string; time: string }) {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [leg(gio.date, gio.time)])] } });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
const datGap = (w: any, o: any, as: string, body: unknown, legId = o.services[0].legs[0].id) => w.call("POST", `/api/orders/${o.id}/legs/${legId}/short-notice`, { as, body });
const cot = (w: any, legId: string) =>
  ({ ...w.q("SELECT short_notice_reason AS lyDo, short_notice_note AS ghiChu, short_notice_by AS nguoi, short_notice_at AS luc, short_notice_lead_minutes AS phut FROM ord_transfer_leg WHERE id = ?", legId)[0] });

// ---- Route đặt gấp (TC-22 phần quyền / thân; TC-28) -------------------------------------------------------------------------------------------------------
test("TC-22 route đặt gấp: Bán hàng, Kế toán, Thực tập, Đối tác → 403 (ô order.leg.short_notice chỉ Quản trị, Toàn quyền); không ghi, không nhật ký", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(120));
  const n0 = w.q("SELECT count(*) n FROM audit_log")[0].n;
  for (const as of [SALES, ACC, INTERN, PARTNER]) {
    const r = await datGap(w, o, as, { lyDo: "KHACH_DAT_SAT_GIO", ghiChu: "" });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(w.q("SELECT count(*) n FROM audit_log")[0].n, n0);
  assert.deepEqual(cot(w, o.services[0].legs[0].id), { lyDo: null, ghiChu: null, nguoi: null, luc: null, phut: null });
});

test("TC-22 route đặt gấp: Quản trị thiếu lý do / lý do lạ / ghi chú quá 120 → 400; đủ → 200, đủ năm cột (số phút = mốc hiện hành 360), ghi chú đã che dãy số; Toàn quyền cũng được", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(120));
  const legId = o.services[0].legs[0].id;
  for (const body of [{}, { lyDo: "LA" }, { lyDo: "khach_dat_sat_gio" }, { lyDo: "KHAC", ghiChu: "g".repeat(121) }, { lyDo: "KHAC", ghiChu: 5 }, null]) {
    const r = await datGap(w, o, ADM, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal(cot(w, legId).lyDo, null);
  const r = await datGap(w, o, ADM, { lyDo: "KHACH_DAT_SAT_GIO", ghiChu: "Khách gọi lúc 5 giờ, số 0905123456" });
  assert.equal(r.status, 200, r.text);
  const c = cot(w, legId);
  assert.equal(c.lyDo, "KHACH_DAT_SAT_GIO");
  assert.equal(c.nguoi, ADM);
  assert.equal(c.phut, 360, "số phút = mốc THẬT của chính sách gieo (chụp tại mốc)");
  assert.ok(typeof c.luc === "string" && c.luc.endsWith("Z"));
  assert.ok(!String(c.ghiChu).includes("0905123456"), "ghi chú đã che dãy số");
  assert.match(String(c.ghiChu), /^Khách gọi lúc 5 giờ/);
  const r2 = await datGap(w, o, SUP, { lyDo: "SU_CO_VAN_HANH" });
  assert.equal(r2.status, 200, "Toàn quyền đóng dấu lại (dấu mới thay dấu cũ — I14)");
  assert.deepEqual({ ...cot(w, legId), luc: undefined }, { lyDo: "SU_CO_VAN_HANH", ghiChu: null, nguoi: SUP, luc: undefined, phut: 360 });
});

test("TC-28 nhật ký order_leg_short_notice: có orderId, detail = mã đơn + chiều + NHÃN lý do — không ghi chú, không dãy số, không tên khách", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(120));
  assert.equal((await datGap(w, o, ADM, { lyDo: "KHACH_DAT_SAT_GIO", ghiChu: "Bí mật 0905123456 Khách Thử" })).status, 200);
  const nk = w.q("SELECT order_id, staff_id, detail FROM audit_log WHERE action = 'order_leg_short_notice'").map((x: any) => ({ ...x }));
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id, o.id);
  assert.equal(nk[0].staff_id, ADM);
  assert.equal(nk[0].detail, `${o.orderCode} · Chiều đi · đặt gấp: Khách đặt sát giờ`);
});

test("route đặt gấp: đơn / chặng lạ → 404; chặng đã đóng → 409; đơn đã huỷ → 409; khung thử KHÔNG tiêm mốc → 503 (không đoán con số)", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(24 * 60 * 3));
  assert.equal((await datGap(w, { ...o, id: NO_SUCH }, ADM, { lyDo: "KHAC" })).status, 404);
  assert.equal((await datGap(w, o, ADM, { lyDo: "KHAC" }, NO_SUCH)).status, 404);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const doc = (await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json.order;
  const l = doc.services[0].legs[0];
  assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${l.id}/close`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, reasonCode: "NOT_NEEDED" } })).status, 200);
  const dong = await datGap(w, o, ADM, { lyDo: "KHAC" }, l.id);
  assert.equal(dong.status, 409, dong.text);
  const o2 = await nhap(w, SALES, vnSau(24 * 60 * 3));
  assert.equal((await w.call("POST", `/api/orders/${o2.id}/status`, { as: SALES, body: { status: "cancelled" } })).status, 200);
  assert.equal((await datGap(w, o2, ADM, { lyDo: "KHAC" })).status, 409);
  // Khung thử KHÔNG tiêm mốc (TC-26): đơn + chặng dựng thẳng bằng SQL (lập nháp có chặng cũng bị chặn 503 ở thế giới này).
  const k = setup({ khongTiemMoc: true });
  const AT = new Date().toISOString();
  const oid = "00000000-0000-4001-8000-000000000001";
  const lid = "00000000-0000-4001-8000-000000000002";
  k.sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('${oid}', 'TD-SQL', '${SALES}', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  k.sqlite.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv-sql', '${oid}', 'Tour', 'perPax', 2, '${inDays(3)}')`);
  k.sqlite.exec(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, created_at, updated_at) VALUES ('${lid}', '${oid}', 'sv-sql', 'OUT', '${inDays(3)}', '06:30', 'Khách sạn A', '${AT}', '${AT}')`);
  const r = await datGap(k, { id: oid }, ADM, { lyDo: "KHAC" }, lid);
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "moc_toi_thieu_chua_co");
  assert.equal(cot(k, lid).lyDo, null, "không ghi");
});

// ---- Bài canh Ruling N-9 (iii): bài kiểm mốc đi đường THẬT --------------------------------------------------------------------------------------------------
test("Ruling N-9: tệp bài mốc / đặt gấp KHÔNG dùng mốc giả của khung thử — mọi thế giới ở đây chạy mốc THẬT (hoặc không tiêm cho TC-26)", () => {
  const TUY_CHON_MOC_GIA = ["mocGia", "ChoBaiKhongKiemMoc"].join("");
  const src = readFileSync(new URL("./dat-gap.test.ts", import.meta.url), "utf8");
  assert.ok(!src.includes(TUY_CHON_MOC_GIA), "bài mốc thật không được dùng mốc giả");
});
