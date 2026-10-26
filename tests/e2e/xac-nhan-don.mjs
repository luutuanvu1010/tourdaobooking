// Bước XÁC NHẬN ĐƠN (ADR-0136, Task 3.3) trên API THẬT (wrangler dev, D1 local tạm). Các ca theo kế hoạch docs/superpowers/plans/2026-10-19-xac-nhan-don.md (Task 3.3, Step 1):
//   (a) cờ dịch vụ → /status 409 confirm_request_required; gửi 201; tự quyết khi công tắc tắt 403     (b) danh sách chờ không SĐT/email, chi tiết đã cắt, hành khách 404, HCNS 403
//   (c) Còn vé + đổi giờ   (d) Hết vé → HET_CHO, Huỷ khác   (e) đua hai người quyết định   (f) công tắc tự xác nhận   (g) bỏ cờ khi đang chờ   (j) đơn trộn   (k) cờ nhóm ba bước + mã lạ
//   (l) khoá khi chờ, Rút lại mở khoá   (m) chặng dưới mốc: gửi được, Còn vé 409 short_notice_required, Quản trị đặt gấp rồi Còn vé 200   (p) tài khoản lai quyết định đơn của người khác   (r) lai mở chi tiết đã cắt
// Ca (n) khoản thu và (q) lịch chung nằm ở bài khung thử (nháp không ghi thu được qua API; lịch chung đo qua hàm đọc). Ca Đối tác (gửi đơn) thuộc Task 3.4.
// D1 chung với kịch bản khác: dùng RIÊNG hai mã danh mục giả ZXN1 (hay bị đánh cờ) / ZXN2 và CUỐI KỊCH BẢN trả cờ + công tắc về như lúc đầu. Ngày đi ≥ 3 ngày (không dính mốc 6 giờ);
// ca (m) tính ngày giờ VN từ đồng hồ thật, không khẳng định cờ quá hạn.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZXN1','Dịch vụ xác nhận thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,95,1,${AT},${AT}),('ZXN2','Dịch vụ thường thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SALES = await session(ACCOUNTS.salesA);
const SALES_B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);
const SUPER = await session(ACCOUNTS.superAdmin);
const HR = await session(ACCOUNTS.hr);
const LAI = (await gieoTaiKhoanLai(`Lai Bán hàng + Đối tác xác nhận ${Date.now().toString(36)}`, ["SALES", "PARTNER"]).catch(() => null))?.cookie ?? null;

const URL_CD = "/api/cai-dat/xac-nhan-don";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const tag = Date.now().toString(36);
const dichVu = (ma, ngay, legs = [], extra = {}) => catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: ngay, legs, ...extra });
const chang = (ngay, gio) => ({ direction: "OUT", pickupDate: ngay, pickupTime: gio, pickupLocationId: null, pickupPlace: `Khách sạn Xác Nhận E2E ${tag}`, dropoffLocationId: LOC, dropoffPlace: "" });
const lap = async (who, services, extra = {}) => {
  const r = await call(who, "POST", "/api/orders", orderInput({ customerName: `Khách Xác Nhận E2E ${tag}`, customerPhone: "0913571357", customerEmail: "xacnhan.e2e@example.com", services, ...extra }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.order;
};
const lay = async (who, id) => (await call(who, "GET", `/api/orders/${id}`)).body.order;
const gui = (who, id) => call(who, "POST", `/api/orders/${id}/gui-xac-nhan`, {});
const rut = (who, id) => call(who, "POST", `/api/orders/${id}/rut-xac-nhan`, {});
const status = (who, id, s, extra = {}) => call(who, "POST", `/api/orders/${id}/status`, { status: s, ...extra });
const sqlMoc = async (id) => (await sqlRows(`SELECT updated_at AS u FROM orders WHERE id = '${id}'`))[0].u;
/** Quyết định bằng yêu cầu đang mở (đọc từ danh sách chờ) và mốc cập nhật hiện tại của đơn. */
const quyet = async (who, id, ketQua, extra = {}) => {
  const ds = (await call(ACC, "GET", "/api/orders/cho-xac-nhan")).body.don.find((d) => d.orderId === id);
  return call(who, "POST", `/api/orders/${id}/quyet-dinh`, { ketQua, yeuCauId: ds?.yeuCauId, updatedAt: await sqlMoc(id), ...extra });
};
const datCo = (pham, ma, canXacNhan) => call(SUPER, "POST", URL_CD, { pham, ma, canXacNhan });
const datCongTac = (bat) => call(SUPER, "POST", URL_CD, { tuXacNhanNoiBo: bat });
const khongLo = (txt) => { for (const cam of ["0913571357", "xacnhan.e2e@example.com", "Khách Xác Nhận E2E"]) assert.ok(!txt.includes(cam), `lộ ${cam}`); };
let r;

// Trạng thái đầu: trả về mặc định an toàn để ca kết quả không phụ thuộc lần chạy trước.
const dauCongTac = (await call(SUPER, "GET", URL_CD)).body.tuXacNhanNoiBo;
assert.equal((await datCo("SERVICE", "ZXN1", true)).status, 200);
assert.equal((await datCo("SERVICE", "ZXN2", false)).status, 200);
assert.equal((await datCongTac(false)).status, 200);
const ngay = vnDate(3);

try {
  // ---- (a) + (b) + (c) -------------------------------------------------------------------------------------------------------------------------------------
  const a = await lap(SALES, [dichVu("ZXN1", ngay, [chang(ngay, "07:00")])]);
  r = await status(SALES, a.id, "confirmed");
  assert.deepEqual([r.status, r.body.error?.code], [409, "confirm_request_required"], JSON.stringify(r.body));
  r = await gui(SALES, a.id);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const yc = r.body.yeuCau;
  assert.equal(yc.vi.join(), "DICH_VU");
  assert.equal((await gui(SALES, a.id)).status, 409, "đã có yêu cầu mở");
  // tự quyết khi công tắc tắt → 403 (người lập)
  const aMoc = await lay(SALES, a.id);
  r = await call(SALES, "POST", `/api/orders/${a.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: yc.id, updatedAt: aMoc.updatedAt });
  assert.equal(r.status, 403, `công tắc tắt: ${JSON.stringify(r.body)}`);
  // (b)
  for (const [ten, who] of [["Kế toán", ACC], ["HDV", FIELD], ["Quản trị", ADMIN], ["Toàn quyền", SUPER]]) {
    r = await call(who, "GET", "/api/orders/cho-xac-nhan");
    assert.equal(r.status, 200, `${ten}: ${JSON.stringify(r.body)}`);
    const d = r.body.don.find((x) => x.orderId === a.id);
    assert.ok(d, `${ten} thấy đơn chờ`);
    assert.equal(d.tong, 200000);
    khongLo(JSON.stringify(r.body));
  }
  assert.equal((await call(HR, "GET", "/api/orders/cho-xac-nhan")).status, 403, "Hành chính nhân sự không xét duyệt");
  for (const [ten, who] of [["Kế toán", ACC], ["HDV chưa phụ trách", FIELD]]) {
    r = await call(who, "GET", `/api/orders/${a.id}`);
    assert.equal(r.status, 200, `${ten}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.order.customerPhone, "");
    assert.equal(r.body.order.customerEmail, null);
    assert.equal(r.body.order.total, 200000, "tiền chỉ đọc");
    khongLo(JSON.stringify(r.body));
    assert.equal((await call(who, "GET", `/api/orders/${a.id}/passengers`)).status, 404, `${ten}: hành khách`);
  }
  // (l) khoá khi chờ
  r = await call(SALES, "PUT", `/api/orders/${a.id}`, orderInput({ services: [dichVu("ZXN1", ngay, [chang(ngay, "07:00")])], expectedUpdatedAt: aMoc.updatedAt }));
  assert.deepEqual([r.status, r.body.error?.code], [409, "confirm_pending_locked"], JSON.stringify(r.body));
  r = await call(SALES, "PUT", `/api/orders/${a.id}/booker`, { customerName: "Khách Mới", customerPhone: "0913571358", expectedUpdatedAt: aMoc.updatedAt });
  assert.equal(r.body.error?.code, "confirm_pending_locked", JSON.stringify(r.body));
  // (c) Còn vé + đổi giờ
  const legId = (await lay(SALES, a.id)).services[0].legs[0].id;
  r = await quyet(ACC, a.id, "CON_VE", { gioDon: [{ legId, pickupTime: "08:30" }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { ketQua: "CON_VE", trangThai: "confirmed" });
  const sau = await lay(SALES, a.id);
  assert.equal(sau.status, "confirmed");
  assert.equal(sau.services[0].legs[0].pickupTime, "08:30");
  assert.equal((await call(ACC, "GET", "/api/orders/cho-xac-nhan")).body.don.some((x) => x.orderId === a.id), false, "đã quyết thì rời danh sách chờ");
  console.log("✓ (a)(b)(c)(l): cờ dịch vụ → 409 rồi gửi 201; danh sách chờ + chi tiết đã cắt; khoá khi chờ; Kế toán Còn vé đổi giờ 08:30");

  // ---- (d) Hết vé / Huỷ ------------------------------------------------------------------------------------------------------------------------------------
  const d1 = await lap(SALES, [dichVu("ZXN1", ngay)]);
  assert.equal((await gui(SALES, d1.id)).status, 201);
  r = await quyet(ACC, d1.id, "HET_VE");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await lay(SALES, d1.id)).status, "cancelled");
  const d2 = await lap(SALES, [dichVu("ZXN1", ngay)]);
  assert.equal((await gui(SALES, d2.id)).status, 201);
  assert.equal((await quyet(ACC, d2.id, "HUY")).status, 400, "Huỷ thiếu lý do");
  r = await quyet(ACC, d2.id, "HUY", { lyDo: "KHACH_DOI_Y" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await lay(SALES, d2.id)).status, "cancelled");
  console.log("✓ (d): Hết vé và Huỷ có lý do → đơn cancelled; Huỷ thiếu lý do 400");

  // ---- (e) đua ---------------------------------------------------------------------------------------------------------------------------------------------
  const e = await lap(SALES, [dichVu("ZXN1", ngay)]);
  const eYc = (await gui(SALES, e.id)).body.yeuCau;
  const eMoc = await sqlMoc(e.id);
  const kq = await Promise.all([ACC, SUPER].map((who) => call(who, "POST", `/api/orders/${e.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: eYc.id, updatedAt: eMoc })));
  const ma = kq.map((x) => x.status).sort();
  assert.deepEqual(ma, [200, 409], `đua: ${JSON.stringify(kq.map((x) => x.body))}`);
  console.log("✓ (e): hai người cùng quyết định → đúng một 200, một 409");

  // ---- (f) công tắc ----------------------------------------------------------------------------------------------------------------------------------------
  assert.equal((await datCongTac(true)).status, 200);
  const f = await lap(SALES, [dichVu("ZXN1", ngay)]);
  const fYc = (await gui(SALES, f.id)).body.yeuCau;
  r = await call(SALES, "POST", `/api/orders/${f.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: fYc.id, updatedAt: await sqlMoc(f.id) });
  assert.equal(r.status, 200, `công tắc bật, người lập tự quyết: ${JSON.stringify(r.body)}`);
  for (const who of [ADMIN, SALES]) assert.equal((await call(who, "POST", URL_CD, { tuXacNhanNoiBo: false })).status, 403, "chỉ Toàn quyền đổi công tắc");
  assert.equal((await datCongTac(false)).status, 200);
  console.log("✓ (f): công tắc bật → người lập tự quyết 200; Quản trị / Bán hàng đổi công tắc 403");

  // ---- (g) bỏ cờ khi đang chờ ------------------------------------------------------------------------------------------------------------------------------
  const g = await lap(SALES, [dichVu("ZXN1", ngay)]);
  assert.equal((await gui(SALES, g.id)).status, 201);
  assert.equal((await datCo("SERVICE", "ZXN1", false)).status, 200);
  assert.equal((await quyet(ACC, g.id, "CON_VE")).status, 200, "bỏ cờ không làm đơn đang chờ mất quyết định");
  const g2 = await lap(SALES, [dichVu("ZXN1", ngay)]);
  assert.equal((await status(SALES, g2.id, "confirmed")).status, 200, "nháp mới của mã vừa bỏ cờ không phải gửi");
  assert.equal((await datCo("SERVICE", "ZXN1", true)).status, 200);
  console.log("✓ (g): bỏ cờ khi đang chờ vẫn quyết được; nháp mới không còn phải gửi");

  // ---- (j) trộn, (k) nhóm ----------------------------------------------------------------------------------------------------------------------------------
  const j = await lap(SALES, [dichVu("ZXN2", ngay), dichVu("ZXN1", ngay)]);
  assert.equal((await status(SALES, j.id, "confirmed")).body.error?.code, "confirm_request_required", "đơn trộn có một dịch vụ cờ → phải gửi");
  const thuong = await lap(SALES, [dichVu("ZXN2", ngay)]);
  assert.equal((await status(SALES, thuong.id, "confirmed")).status, 200, "đơn chỉ dịch vụ thường xác nhận như cũ");
  assert.equal((await datCo("SERVICE", "KHONG-CO-MA-NAY", true)).status, 400, "mã không có trong danh mục");
  assert.equal((await datCo("GROUP", "KHONG-CO-NHOM", true)).status, 400, "nhóm không có dịch vụ");
  console.log("✓ (j)(k): đơn trộn phải gửi; đơn thường xác nhận như cũ; mã / nhóm lạ 400");

  // ---- (l) Rút lại mở khoá ---------------------------------------------------------------------------------------------------------------------------------
  const l = await lap(SALES, [dichVu("ZXN1", ngay)]);
  assert.equal((await gui(SALES, l.id)).status, 201);
  assert.equal((await rut(SALES, l.id)).status, 200);
  const lMoc = await lay(SALES, l.id);
  r = await call(SALES, "PUT", `/api/orders/${l.id}`, orderInput({ customerName: `Khách Xác Nhận E2E ${tag}`, customerPhone: "0913571357", services: [dichVu("ZXN1", ngay)], expectedUpdatedAt: lMoc.updatedAt }));
  assert.equal(r.status, 200, `Rút lại rồi sửa được: ${JSON.stringify(r.body)}`);
  assert.equal((await call(SALES_B, "GET", `/api/orders/${l.id}`)).status, 404, "nháp không chờ của người khác vẫn 404");
  console.log("✓ (l): Rút lại mở khoá sửa");

  // ---- (m) chặng dưới mốc ----------------------------------------------------------------------------------------------------------------------------------
  const sau1h = new Date(Date.now() + 7 * 3600e3 + 60 * 60e3).toISOString();
  const [ngM, gioM] = [sau1h.slice(0, 10), sau1h.slice(11, 16)];
  const m = await lap(SALES, [dichVu("ZXN2", ngM, [chang(ngM, gioM)])]);
  assert.equal((await status(SALES, m.id, "confirmed")).body.error?.code, "confirm_request_required");
  r = await gui(SALES, m.id);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.body.yeuCau.vi.includes("DAT_GAP"));
  const dsM = (await call(ACC, "GET", "/api/orders/cho-xac-nhan")).body.don.find((x) => x.orderId === m.id);
  assert.equal(dsM.canDatGap, true);
  r = await quyet(ACC, m.id, "CON_VE");
  assert.deepEqual([r.status, r.body.error?.code], [409, "short_notice_required"], JSON.stringify(r.body));
  const mLeg = (await lay(SALES, m.id)).services[0].legs[0].id;
  r = await call(ADMIN, "POST", `/api/orders/${m.id}/legs/${mLeg}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" });
  assert.equal(r.status, 200, `Quản trị đặt gấp nháp đang chờ: ${JSON.stringify(r.body)}`);
  assert.equal((await quyet(ACC, m.id, "CON_VE")).status, 200);
  console.log("✓ (m): chặng dưới mốc gửi được, Còn vé 409 short_notice_required, Quản trị đặt gấp rồi Còn vé 200");

  // ---- (p)(r) tài khoản lai --------------------------------------------------------------------------------------------------------------------------------
  if (LAI) {
    const p = await lap(SALES, [dichVu("ZXN1", ngay)]);
    assert.equal((await gui(SALES, p.id)).status, 201);
    r = await call(LAI, "GET", `/api/orders/${p.id}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.order.customerPhone, "");
    r = await quyet(LAI, p.id, "CON_VE");
    assert.equal(r.status, 200, JSON.stringify(r.body));
    console.log("✓ (p)(r): tài khoản lai mở chi tiết đã cắt và quyết định đơn chờ của người khác");
  } else {
    console.log("- BỎ QUA (p)(r): không dựng được tài khoản lai Bán hàng + Đối tác");
  }
} finally {
  // Trả D1 chung về như lúc đầu: bỏ cờ hai mã thử, công tắc về giá trị cũ.
  await datCo("SERVICE", "ZXN1", false);
  await datCo("SERVICE", "ZXN2", false);
  await datCongTac(dauCongTac);
}
console.log("E2E XÁC NHẬN ĐƠN OK");
