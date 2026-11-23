// TRẢ SAU THEO DỊCH VỤ trên API THẬT (wrangler dev, D1 local tạm; ADR-0230 Đ1, thi công ADR-0178 Đ2):
//  1) Toàn quyền gieo «Có vé» + «Vé do ai phát = Tour Đảo» (qua route catalog) cho ZSD1, «Có vé» + vé hãng ngoài cho ZSD2; nhập lô vé Tour Đảo; đặt dấu Trả sau theo dịch vụ 24 giờ cho ZSD1.
//  2) Đối tác KHÔNG hạn mức: đường hẹp `con-duoc-dung` kèm dịch vụ trả số giờ; gửi «Thanh toán ngay» ⇒ 409 (ADR-0224); lập «Trả sau» → Gửi đơn → xác nhận, `credit_basis = SERVICE`,
//     hạn trả = giờ xác nhận + 24 giờ, vé Tour Đảo xem được ngay (route vé) khi chưa trả đồng nào.
//  3) Thêm dịch vụ vé hãng ngoài ⇒ không còn Trả sau theo dịch vụ (đường hẹp trả null; gửi Trả sau ⇒ 409 khong_co_han_muc).
// Mã dịch vụ riêng ZSD1 / ZSD2, tài khoản đối tác dùng một lần. Mã vé TD1 sinh ngẫu nhiên, không in ra. KHÔNG đổi công ty chủ.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { ACCOUNTS, call, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
const tag = Date.now().toString(36);
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const maTD = () => "TD1." + Array.from(randomBytes(26), (b) => B32[b % 32]).join("");
let dem = 0;
const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); u.set(new TextEncoder().encode(`sd${tag}`), 20); return Buffer.from(u).toString("base64"); };
for (const [ma, ten, hang] of [["ZSD1", "Tour Đảo trả sau thử", 195], ["ZSD2", "Vé hãng ngoài trả sau thử", 196]]) {
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('${ma}','${ten}','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,${hang},1,${AT},${AT})
    ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);
}
const SA = await session(ACCOUNTS.superAdmin);
const KT = await session(ACCOUNTS.accountant);
const sv = (ma, n = 2) => ({ kind: "catalog", catalogCode: ma, pax: { adult: n }, catalogPriceSeen: { adult: 100000 }, departDate: vnDate(3), pickupChoice: "KHONG_DON" });

// ---- 1) dựng
for (const ma of ["ZSD1", "ZSD2"]) assert.equal((await call(SA, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma, coVe: true })).status, 200);
assert.equal((await call(SA, "POST", "/api/catalog/nguon-ve", { ma: "ZSD1", nguon: "TOUR_DAO" })).status, 200);
assert.equal((await call(SA, "POST", "/api/catalog/nguon-ve", { ma: "ZSD2", nguon: "HANG_NGOAI" })).status, 200);
{
  const lo = await call(KT, "POST", "/api/ve/lo", { catalogCode: "ZSD1", nhomKhach: "ADULT", tenSanPham: "Vé thử Trả sau theo dịch vụ", nguon: "TOUR_DAO", soVeDuKien: 4 });
  assert.equal(lo.status, 201, JSON.stringify(lo.body));
  const ve = Array.from({ length: 4 }, (_x, i) => { dem++; return { noiDung: PNG(dem), maVe: maTD(), tuNgay: vnDate(-1), denNgay: vnDate(60), soSeri: lo.body.soSeri[i] }; });
  assert.equal((await call(KT, "POST", `/api/ve/lo/${lo.body.loId}/ve`, { ve })).body?.themDuoc, 4);
  assert.equal((await call(KT, "POST", `/api/ve/lo/${lo.body.loId}/xac-nhan`, {})).status, 200);
}
let r = await call(SA, "POST", "/api/tra-sau/dich-vu", { targetKind: "SERVICE", targetCode: "ZSD1", gioTra: 24, gioAnHan: 0 });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ 1) Có vé, Vé do ai phát = Tour Đảo, lô vé Tour Đảo, dấu Trả sau theo dịch vụ 24 giờ cho ZSD1");

// ---- 2) đối tác không hạn mức
const tk = await call(SA, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đại Lý Trả Sau Dịch Vụ ${tag}`, phone: randomPhone(), roles: ["TRAVEL_AGENCY"] });
assert.equal(tk.status, 201, JSON.stringify(tk.body));
const DT = (await login(tk.body.staff.phone, tk.body.pin)).cookie;
r = await call(DT, "GET", "/api/tra-sau/con-duoc-dung?dv=ZSD1");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.coHanMuc, r.body.traSauDichVu], [false, { gioTra: 24 }], "không hạn mức, đơn đủ điều kiện ⇒ có số giờ");
r = await call(DT, "POST", "/api/orders", orderInput({ customerName: `Khách Trả Sau DV ${tag}`, customerPhone: "0913571360", paymentTerm: "PREPAID", services: [sv("ZSD1")] }));
assert.deepEqual([r.status, r.body?.error?.code], [409, "tra_sau_bat_buoc_doi_tac"], JSON.stringify(r.body));
r = await call(DT, "POST", "/api/orders", orderInput({ customerName: `Khách Trả Sau DV ${tag}`, customerPhone: "0913571360", paymentTerm: "CREDIT", services: [sv("ZSD1")] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const id = r.body.order.id;
r = await call(DT, "POST", `/api/orders/${id}/gui-don`, {});
assert.equal(r.status, 200, `gửi đơn Trả sau theo dịch vụ ⇒ xác nhận: ${JSON.stringify(r.body)}`);
const [d] = await sqlRows(`SELECT status, payment_term, credit_basis, confirmed_at, credit_due_at FROM orders WHERE id = '${id}'`);
assert.deepEqual([d.status, d.payment_term, d.credit_basis], ["confirmed", "CREDIT", "SERVICE"]);
assert.equal(Date.parse(d.credit_due_at) - Date.parse(d.confirmed_at), 24 * 3_600_000, "hạn trả = giờ xác nhận + 24 giờ");
r = await call(DT, "GET", `/api/ve/don/${id}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.veXem.length, 2, `vé Tour Đảo hiện ngay khi chưa trả (${JSON.stringify(r.body).slice(0, 300)})`);
assert.doesNotMatch(JSON.stringify(r.body), /TD1\.[A-Z2-7]{26}/, "không lộ mã vé");
r = await call(DT, "GET", "/api/tra-sau/cua-toi");
assert.deepEqual([r.body.dangNo, r.body.dangNoDichVu > 0], [0, true], "nợ theo dịch vụ tách khỏi nợ theo hạn mức");
console.log("✓ 2) Đối tác không hạn mức: chỉ «Trả sau»; Gửi đơn ⇒ xác nhận SERVICE, hạn trả +24 giờ, vé hiện ngay; nợ tách hai số");

// ---- 3) thêm vé hãng ngoài
r = await call(DT, "GET", "/api/tra-sau/con-duoc-dung?dv=ZSD1&dv=ZSD2");
assert.equal(r.body.traSauDichVu, null, "có vé hãng ngoài ⇒ không đủ điều kiện");
r = await call(DT, "POST", "/api/orders", orderInput({ customerName: `Khách Trả Sau DV ${tag}`, customerPhone: "0913571360", paymentTerm: "CREDIT", services: [sv("ZSD1"), sv("ZSD2")] }));
assert.deepEqual([r.status, r.body?.error?.code], [409, "khong_co_han_muc"], JSON.stringify(r.body));
console.log("✓ 3) Thêm dịch vụ vé hãng ngoài ⇒ không còn Trả sau theo dịch vụ (409 khong_co_han_muc)");
console.log("E2E TRA SAU DICH VU OK");
