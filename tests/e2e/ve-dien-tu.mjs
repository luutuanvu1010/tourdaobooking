// KHO VÉ ĐIỆN TỬ trên API THẬT (wrangler dev, D1 local tạm + R2 local; ADR-0153). Ca: nhập lô → xác nhận lô → lập + xác nhận đơn (giữ vé qua D1 THẬT, db.batch) →
// huỷ đơn (trả vé về kho) → chưa thu đủ thì ảnh 403 → đường dẫn khách sai token 404 → Kế toán 403. Dùng RIÊNG mã danh mục giả ZVD1; mọi vé của kịch bản nằm trong lô riêng.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZVD1','Vé điện tử thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SALES = await session(ACCOUNTS.salesA);
const KT = await session(ACCOUNTS.accountant);
const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const tag = Date.now().toString(36);
const den = vnDate(60);

// 1. Kế toán không vào được kho vé
assert.equal((await call(KT, "GET", "/api/ve/kho")).status, 403);

// 2. nhập lô 3 vé + xác nhận lô
const lo = await call(SALES, "POST", "/api/ve/lo", { catalogCode: "ZVD1", nhomKhach: "ADULT", tenSanPham: "Vé thử e2e" });
assert.equal(lo.status, 201, JSON.stringify(lo.body));
const them = await call(SALES, "POST", `/api/ve/lo/${lo.body.loId}/ve`, { ve: [1, 2, 3].map((i) => ({ noiDung: PNG(i), maVe: `E2E.${tag}.${i}`, tuNgay: vnDate(-1), denNgay: den })) });
assert.equal(them.status, 200, JSON.stringify(them.body));
assert.equal(them.body.themDuoc, 3);
assert.doesNotMatch(JSON.stringify(them.body), new RegExp(`E2E\\.${tag}`), "phản hồi không chứa mã vé đầy đủ");
assert.equal((await call(SALES, "POST", `/api/ve/lo/${lo.body.loId}/xac-nhan`, {})).status, 200);
const kho = (await call(SALES, "GET", "/api/ve/kho")).body.kho.find((d) => d.catalogCode === "ZVD1");
assert.deepEqual([kho.conTrong, kho.daGiu], [3, 0]);

// 3. lập + xác nhận đơn 2 khách ⇒ giữ 2 vé (db.batch thật)
const lap = async () => {
  const r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Vé E2E ${tag}`, customerPhone: "0913571357", services: [catalogService({ catalogCode: "ZVD1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(14) })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const x = await call(SALES, "POST", `/api/orders/${r.body.order.id}/status`, { status: "confirmed" });
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return r.body.order.id;
};
const id = await lap();
const dem = async (dk) => Number((await sqlRows(`SELECT count(*) AS n FROM vdt_allocation WHERE order_id = '${id}' AND ${dk}`))[0].n);
assert.equal(await dem("released_at IS NULL"), 2);
assert.equal(Number((await sqlRows("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'ALLOCATED' AND batch_id = '" + lo.body.loId + "'"))[0].n), 2);

// 4. chưa thu đủ ⇒ danh sách có số lượng nhưng không có mã xem ảnh; ảnh 403
const ds = await call(SALES, "GET", `/api/ve/don/${id}`);
assert.equal(ds.status, 200);
assert.equal(ds.body.thuDu, false);
assert.deepEqual(ds.body.veXem, []);
const aid = (await sqlRows(`SELECT id FROM vdt_allocation WHERE order_id = '${id}' AND released_at IS NULL LIMIT 1`))[0].id;
assert.equal((await call(SALES, "GET", `/api/ve/anh/${aid}`)).status, 403);

// 5. đường dẫn khách: token sai ⇒ 404 cùng thân; chưa thu đủ ⇒ không tạo được
assert.equal((await call(SALES, "POST", "/api/ve/duong-dan", { orderId: id, requestId: crypto.randomUUID() })).status, 403);
const sai = await call(undefined, "GET", `/ve/${"A".repeat(43)}`);
assert.equal(sai.status, 404);

// 6. cấp bù bằng tay không cấp thừa
assert.equal((await call(SALES, "POST", "/api/ve/cap", { orderId: id })).status, 200);
assert.equal(await dem("released_at IS NULL"), 2, "cấp lại không giữ thừa");

// 7. huỷ đơn ⇒ trả hết vé về kho
const h = await call(SALES, "POST", `/api/orders/${id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(h.status, 200, JSON.stringify(h.body));
assert.equal(await dem("released_at IS NULL"), 0);
assert.equal(Number((await sqlRows(`SELECT count(*) AS n FROM vdt_ticket WHERE status = 'AVAILABLE' AND batch_id = '${lo.body.loId}'`))[0].n), 3);

// 8. nhật ký không chứa mã vé
const nk = JSON.stringify(await sqlRows(`SELECT detail, target_id FROM audit_log WHERE action LIKE 've_%'`));
assert.doesNotMatch(nk, new RegExp(`E2E\\.${tag}|vdt/`));
console.log("ve-dien-tu e2e: ĐẠT");
