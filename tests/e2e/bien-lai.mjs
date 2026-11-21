// ẢNH BIÊN LAI CHUYỂN KHOẢN (ADR-0196) trên API THẬT (wrangler dev, D1 local tạm, kho R2 cục bộ BIEN_LAI): Đối tác gửi đơn (nhánh B, đã xác nhận) → ghi «Công ty,
// chuyển khoản» thiếu ảnh 400 bien_lai_required (không khoản thu) → sai loại 415 → kèm PNG 201 (khoản đang đối chiếu, DTO chỉ trạng thái) → tiền mặt không cần ảnh
// → xem: Kế toán / Đối tác chính chủ 200 (image/png, no-store), Quản trị / Bán hàng 403 → gỡ: Kế toán 403, Toàn quyền thiếu lý do 400, có lý do 200, lần hai 409
// → DTO «DA_GO», xem 404 → hàng chờ dọn kho chỉ Toàn quyền → nhật ký không chép khoá kho.
// Phí đưa đón Đợt C, Task 5: đơn có lượt đón 50.000 đ/khách × 3 ⇒ phải thu và biên nhận khách gồm phí (dòng «Phí đưa đón»); Đối tác chuyển khoản đủ số gồm phí kèm ảnh 201.
// Phí bật từ hôm nay rồi tắt ở `finally` (tests/e2e/lib-phi-don.mjs).
// D1 chung với kịch bản khác: tài khoản Đối tác dùng một lần (tên theo Date.now()), mã danh mục riêng ZBL1 (cờ «cần xác nhận» tắt, trả về cuối kịch bản).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";
import { conVeKemPhi, dungPhiDon, luotDon } from "./lib-phi-don.mjs";

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

// ADR-0225 Đ2: gỡ dấu «chỉ thu hộ tiền mặt» của MỘT đơn (giả lập đơn xác nhận trước ngày áp) trên D1 LOCAL tạm của e2e. Trigger canh dấu cấm về NULL nên tạm gỡ rồi dựng lại
// đúng thân trong migration 0184 (đọc từ tệp, không chép tay).
const THAN_CANH_DAU = readFileSync(new URL("../../migrations/0184_don_doi_tac_chi_tien_mat.sql", import.meta.url), "utf8")
  .match(/CREATE TRIGGER orders_partner_cash_only_guard[\s\S]*?END;/)[0];
async function donTruocNgayAp(orderId) {
  await sql("DROP TRIGGER IF EXISTS orders_partner_cash_only_guard");
  try {
    await sql(`UPDATE orders SET partner_cash_only = NULL WHERE id = '${orderId}'`);
  } finally {
    await sql(THAN_CANH_DAU.replace(/\s+/g, " "));
  }
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'trigger' AND name = 'orders_partner_cash_only_guard'`))[0].n, 1, "trigger canh dấu đã dựng lại");
}

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
  // ADR-0225 Đ2 (Việc 5, migration 0184): đơn đối tác xác nhận từ ngày áp chỉ thu hộ tiền mặt ⇒ «Công ty, chuyển khoản» (kể cả kèm ảnh) bị chặn 409, không khoản thu.
  assert.equal((await sqlRows(`SELECT partner_cash_only AS d FROM orders WHERE id = '${id}'`))[0].d, 1, "đơn Đối tác mang dấu chỉ tiền mặt");
  let r = await call(DT, "POST", `/api/orders/${id}/payments`, ck(100000, { bienLai: anh(PNG) }));
  assert.deepEqual([r.status, r.body.error?.code], [409, "don_doi_tac_chi_tien_mat"], JSON.stringify(r.body));
  assert.equal(await soKhoan(), 0);
  console.log("✓ ADR-0225: đơn đối tác mới — «Công ty, chuyển khoản» 409 don_doi_tac_chi_tien_mat, không khoản thu nào");
  // Ảnh biên lai (ADR-0196) nay chỉ còn ở đơn xác nhận TRƯỚC ngày áp: đưa đơn về tình huống đó rồi kiểm tiếp như cũ.
  await donTruocNgayAp(id);

  r = await call(DT, "POST", `/api/orders/${id}/payments`, ck(100000));
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

  // ---- Phí đưa đón (Đợt C, Task 5): phải thu, biên nhận khách và chuyển khoản kèm ảnh tính cả phí
  const phi = await dungPhiDon(ADM, { nhan: "BLA", muc: 50_000 });
  try {
    const lap2 = await call(DT, "POST", "/api/orders", orderInput({
      customerName: `Khách Biên Lai Phí E2E ${tag}`, customerPhone: "0913579138",
      services: [catalogService({ catalogCode: "ZBL1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 3 }, departDate: vnDate(4), legs: [luotDon(phi.ks.id)] })],
    }));
    assert.equal(lap2.status, 201, JSON.stringify(lap2.body));
    const id2 = lap2.body.order.id;
    // ADR-0214: nháp Đối tác không mang mức ⇒ Gửi đơn đi «chờ xác nhận»; văn phòng chọn mức ở Còn vé.
    const g2 = await call(DT, "POST", `/api/orders/${id2}/gui-don`, {});
    assert.equal(g2.status, 201, JSON.stringify(g2.body));
    const cv2 = await conVeKemPhi(ADM, id2, phi.phiDon);
    assert.equal(cv2.status, 200, JSON.stringify(cv2.body));
    assert.equal((await call(ACC, "GET", `/api/orders/${id2}/payments`)).body.phaiThu, 450000, "phải thu = 300.000 + phí 150.000");
    const bn = (await call(DT, "GET", `/api/orders/${id2}/receipt`)).body.receipt;
    assert.deepEqual([bn.subtotal, bn.total, bn.conLai], [450000, 450000, 450000]);
    assert.deepEqual(bn.phiDuaDon.map((d) => [d.quantity, d.unitPrice, d.lineTotal]), [[3, 50000, 150000]], "biên nhận khách có dòng phí đưa đón");
    await donTruocNgayAp(id2); // ADR-0225 Đ2: như trên
    const ck2 = await call(DT, "POST", `/api/orders/${id2}/payments`, ck(450000, { bienLai: anh(PNG) }));
    assert.equal(ck2.status, 201, JSON.stringify(ck2.body));
    assert.equal((await call(ACC, "GET", `/api/orders/${id2}/payments`)).body.lanThu.find((l) => l.soTien === 450000)?.bienLai, "CO", "khoản chuyển khoản đủ số gồm phí, có ảnh");
    console.log("✓ đơn có phí đưa đón: phải thu và biên nhận khách 450.000 (gồm phí 150.000), chuyển khoản đủ số kèm ảnh 201");
  } finally {
    await phi.donDep();
  }
} finally {
  await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZBL1", canXacNhan: false });
}
