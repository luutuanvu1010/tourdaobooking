// ẢNH BIÊN LAI CHUYỂN KHOẢN (ADR-0196) trên API THẬT (wrangler dev, D1 local tạm, kho R2 cục bộ BIEN_LAI): Đối tác gửi đơn (nhánh B, đã xác nhận) → ghi «Công ty,
// chuyển khoản» thiếu ảnh 400 bien_lai_required (không khoản thu) → sai loại 415 → kèm PNG 201 (khoản đang đối chiếu, DTO chỉ trạng thái) → tiền mặt không cần ảnh
// → xem: Kế toán / Đối tác chính chủ 200 (image/png, no-store), Quản trị / Bán hàng 403 → gỡ: Kế toán 403, Toàn quyền thiếu lý do 400, có lý do 200, lần hai 409
// → DTO «DA_GO», xem 404 → hàng chờ dọn kho chỉ Toàn quyền → nhật ký không chép khoá kho.
// D1 chung với kịch bản khác: tài khoản Đối tác dùng một lần (tên theo Date.now()), mã danh mục riêng ZBL1 (cờ «cần xác nhận» tắt, trả về cuối kịch bản).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZBL1','Dịch vụ biên lai thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SUPER = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const tag = Date.now().toString(36);
const DT = (await gieoTaiKhoanLai(`Đối tác biên lai ${tag}`, ["PARTNER"])).cookie;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const anh = (b) => ({ noiDung: Buffer.from(b).toString("base64") });
const ck = (soTien, them = {}) => ({ soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", ...them });
const URL_CD = "/api/cai-dat/xac-nhan-don";

assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZBL1", canXacNhan: false })).status, 200);
try {
  const lap = await call(DT, "POST", "/api/orders", orderInput({
    customerName: `Khách Biên Lai E2E ${tag}`, customerPhone: "0913579135",
    services: [catalogService({ catalogCode: "ZBL1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 3 }, departDate: vnDate(4) })],
  }));
  assert.equal(lap.status, 201, JSON.stringify(lap.body));
  const id = lap.body.order.id;
  const g = await call(DT, "POST", `/api/orders/${id}/gui-don`, {});
  assert.equal(g.status, 200, JSON.stringify(g.body));
  const soKhoan = async () => (await sqlRows(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${id}'`))[0].n;

  let r = await call(DT, "POST", `/api/orders/${id}/payments`, ck(100000));
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "bien_lai_required");
  r = await call(DT, "POST", `/api/orders/${id}/payments`, ck(100000, { bienLai: anh(Buffer.from("<html>x</html>")) }));
  assert.equal(r.status, 415, JSON.stringify(r.body));
  assert.equal(await soKhoan(), 0);
  console.log("✓ Đối tác «Công ty, chuyển khoản»: thiếu ảnh 400 bien_lai_required, sai loại 415 — không khoản thu nào");

  r = await call(DT, "POST", `/api/orders/${id}/payments`, ck(100000, { bienLai: anh(PNG) }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.bienLaiChuaTaiXong, undefined, "kho cục bộ nhận ảnh");
  const rid = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE order_id = '${id}' ORDER BY created_at DESC LIMIT 1`))[0].id;
  const dong = (await sqlRows(`SELECT receipt_id, storage_key, stored_at, purged_at FROM bil_receipt_proof WHERE receipt_id = '${rid}'`))[0];
  assert.ok(dong && /^bln\/[0-9a-f]{32}$/.test(dong.storage_key) && dong.stored_at && dong.purged_at === null, JSON.stringify(dong));
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = '${rid}' AND kind_code = 'DECLARED'`))[0].n, 1, "vẫn chờ Kế toán");
  const t = await call(ACC, "GET", `/api/orders/${id}/payments`);
  assert.equal(t.body.lanThu.find((l) => l.id === rid).bienLai, "CO");
  assert.doesNotMatch(JSON.stringify(t.body), /bln\//);
  assert.equal((await call(DT, "POST", `/api/orders/${id}/payments`, { soTien: 10000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201, "tiền mặt không cần ảnh");
  console.log("✓ kèm PNG ⇒ 201, dòng ảnh đã lưu cùng khoản đang đối chiếu; DTO chỉ trạng thái; tiền mặt không cần ảnh");

  const xem = (c) => call(c, "GET", `/api/orders/${id}/payments/${rid}/bien-lai`);
  for (const [ten, c] of [["Kế toán", ACC], ["Đối tác chính chủ", DT], ["Toàn quyền", SUPER]]) {
    const x = await xem(c);
    assert.equal(x.status, 200, `${ten}: ${x.status}`);
    assert.equal(x.headers.get("content-type"), "image/png", ten);
    assert.equal(x.headers.get("cache-control"), "no-store", ten);
  }
  for (const [ten, c] of [["Quản trị", ADM], ["Bán hàng", SALES]]) assert.equal((await xem(c)).status, 403, ten);
  console.log("✓ xem ảnh: Kế toán, Đối tác chính chủ, Toàn quyền 200 (image/png, no-store); Quản trị, Bán hàng 403");

  const go = (c, body) => call(c, "POST", `/api/orders/${id}/payments/${rid}/bien-lai/go`, body);
  assert.equal((await go(ACC, { lyDo: "Gửi nhầm" })).status, 403);
  assert.equal((await go(SUPER, {})).status, 400);
  assert.equal((await go(SUPER, { lyDo: "Đối tác gửi nhầm ảnh" })).status, 200);
  assert.equal((await go(SUPER, { lyDo: "Lần hai" })).status, 409);
  assert.equal((await call(ACC, "GET", `/api/orders/${id}/payments`)).body.lanThu.find((l) => l.id === rid).bienLai, "DA_GO");
  assert.equal((await xem(ACC)).status, 404);
  assert.equal((await call(ACC, "GET", "/api/ledger/bien-lai-cho-xoa")).status, 403);
  assert.equal((await call(SUPER, "GET", "/api/ledger/bien-lai-cho-xoa")).status, 200);
  console.log("✓ gỡ: Kế toán 403, thiếu lý do 400, Toàn quyền 200, lần hai 409; DTO «DA_GO», xem 404; hàng chờ dọn kho chỉ Toàn quyền");

  const nk = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action LIKE 'payment_proof_%' AND (detail LIKE '%bln/%' OR detail LIKE '%${dong.storage_key.slice(4, 20)}%')`);
  assert.equal(nk[0].n, 0, "nhật ký không chép khoá kho");
  console.log("✓ nhật ký ảnh biên lai không chép khoá kho");
} finally {
  await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZBL1", canXacNhan: false });
}
