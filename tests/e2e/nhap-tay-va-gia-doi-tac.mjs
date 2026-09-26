// DK-T3-01 (kiểm toán điểm khuất 24/9, HIGH) — ba luật máy chủ theo câu trả lời của chủ dự án ngày 2026-09-26:
//  R1 (MỌI tài khoản) — Câu 1: "loại bỏ hoàn toàn dịch vụ nhập tay khỏi giao diện … Sẽ mở lại khi cần thiết": POST/PUT /api/orders không nhận dịch vụ
//     nhập tay MỚI; dịch vụ nhập tay CŨ đã lưu của chính đơn bị "đóng băng" (tên + dòng tiền giữ nguyên), vẫn sửa được thông tin chuyến / số khách /
//     ngày cả đơn, và xoá được khỏi đơn nháp. Vi phạm → 400 invalid_input.
//  R2 (tài khoản CHỈ Đối tác — mọi quyền đều là PARTNER) — Câu 2: "đối tác vẫn phải trả một mức giá cố định cho công ty" + ADR-0014 điều 3 (ảnh xác
//     nhận luôn là giá bán lẻ): ở lập (POST), sửa (PUT) và xác nhận (POST /status → confirmed) mọi dòng tiền phải có giá danh mục và đơn giá = giá
//     danh mục → sai 403 forbidden. Nhân viên nội bộ không đổi gì.
//  R3 (tài khoản CHỈ Đối tác) — chủ dự án chốt 26/9: "đối tác được quyền giảm giá cho khách nhưng luôn phải trả một mức giá cố định (giá vốn) …
//     có thể đặt mức giảm tối đa là mức chiết khấu của công ty Tour đảo dành cho đối tác"; app CHƯA có bảng mức chiết khấu → chủ chọn "Tạm không cho
//     giảm" (trần = 0): giảm giá cấp đơn phải bằng 0 ở lập, sửa và xác nhận (xác nhận đọc giảm giá ĐÃ LƯU) → sai 403 forbidden. Nhân viên nội bộ không đổi.
// Đối tác nhận 403 ở /api/catalog nên dựng đơn bằng API trực tiếp. Dịch vụ nhập tay CŨ dựng bằng SQL trên D1 local tạm (`makeLegacyManual`).
import assert from "node:assert/strict";
import { ACCOUNTS, FAKE_CATALOG, call, catalogService, ensureFakeCatalog, login, makeLegacyManual, manualService, orderInput, randomPhone, session, sql, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const ZE1 = FAKE_CATALOG.ZE1.prices.adult; // giá danh mục người lớn của ZE1
const tag = Date.now().toString(36);
const lines = (o) => o.services.flatMap((s) => s.items);
const get = async (who, id) => (await call(who, "GET", `/api/orders/${id}`)).body.order;
const put = (who, order, services, extra = {}) => call(who, "PUT", `/api/orders/${order.id}`, orderInput({ services, expectedUpdatedAt: order.updatedAt, ...extra }));
const confirm = (who, order) => call(who, "POST", `/api/orders/${order.id}/status`, { status: "confirmed" });
const tripOf = (sv) => ({
  departDate: sv.departDate ?? "", departTime: sv.departTime ?? "", pickupTime: sv.pickupTime ?? "", pickupPlace: sv.pickupPlace ?? "",
  checkinDate: sv.checkinDate ?? "", checkinTime: sv.checkinTime ?? "", checkinPlace: sv.checkinPlace ?? "", note: sv.note ?? "",
});
/** Thân gửi lại NGUYÊN một dịch vụ nhập tay đã lưu, đúng như form gửi (`toServiceInput`: chi tiết rỗng = ""), rồi ghi đè `patch`. */
const manualAsStored = (sv, patch = {}) => ({
  id: sv.id, kind: "manual", name: sv.name, pax: { adult: sv.pax.adult }, ...tripOf(sv),
  items: sv.items.map((i) => ({ description: i.description, detail: i.detail ?? "", quantity: i.quantity, unitPrice: i.unitPrice })),
  ...patch,
});
/** Thân gửi lại NGUYÊN một dịch vụ danh mục đã lưu (cùng số khách, cùng đơn giá — giữ bản chụp). */
const catalogAsStored = (sv, patch = {}) => ({
  id: sv.id, kind: "catalog", catalogCode: sv.catalogCode, pax: { ...sv.pax }, ...tripOf(sv),
  unitPrices: Object.fromEntries(sv.items.map((i) => [i.paxCode, i.unitPrice])), catalogPriceSeen: Object.fromEntries(sv.items.map((i) => [i.paxCode, i.catalogPrice])),
  ...patch,
});
const FROZEN = /dịch vụ nhập tay đã ngừng/;
const RETAIL = /giá bán lẻ theo danh mục/;
const NO_DISCOUNT = /^Tài khoản đối tác chưa được giảm giá: mức giảm tối đa bằng mức chiết khấu Tour Đảo dành cho đối tác, mà mức này chưa được thiết lập\. Muốn giảm cho khách, nhờ văn phòng\.$/;
let r;

// ================================================ R1 — dịch vụ nhập tay (mọi tài khoản) ================================================
// 1) Không nhận dịch vụ nhập tay MỚI — đứng một mình hay cạnh dịch vụ danh mục; câu lỗi chỉ đúng dịch vụ (banner cuộn tới thẻ đó).
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `R1 mới ${tag}`, services: [manualService([{ description: "Xe 7 chỗ", quantity: 1, unitPrice: 800000 }])] }));
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_input");
assert.match(r.body.error.message, /^Dịch vụ 1: /);
assert.match(r.body.error.message, FROZEN);
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `R1 mới ${tag}`, services: [catalogService(), manualService([{ description: "Áo phao", quantity: 1, unitPrice: 1 }])] }));
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(r.body.error.message, /^Dịch vụ 2: dịch vụ nhập tay đã ngừng/);
assert.equal((await call(SALES, "GET", `/api/orders?q=${encodeURIComponent(`R1 mới ${tag}`)}`)).body.orders.length, 0, "không lưu đơn nào");
console.log("✓ R1: POST dịch vụ nhập tay mới → 400 (một mình hay cạnh dịch vụ danh mục), không lưu đơn");

// 2) Đơn CŨ (nháp) có dịch vụ nhập tay — dựng bằng SQL: dịch vụ danh mục ZE1 + dịch vụ thứ hai đổi thành nhập tay "Xe đưa đón cũ" 2 × 400.000.
const legacyDraft = async (who = SALES, customerName = `Đơn cũ ${tag}`) => {
  const x = await call(who, "POST", "/api/orders", orderInput({
    customerName, services: [catalogService({ pickupTime: "07:00" }), catalogService({ catalogCode: "ZE2", pax: { adult: 1 }, catalogPriceSeen: { ...FAKE_CATALOG.ZE2.prices } })],
  }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  await makeLegacyManual(x.body.order.id, x.body.order.services[1].id, { name: "Xe đưa đón cũ", description: "Xe 7 chỗ", detail: "2 chiều", quantity: 2, unitPrice: 400000 });
  return get(who, x.body.order.id);
};
let leg = await legacyDraft();
assert.deepEqual([leg.services[1].kind, leg.subtotal], ["manual", ZE1 + 800000], "đơn cũ dựng đúng");
const [cat0, man1] = leg.services;

// 2a) Gửi lại NGUYÊN dịch vụ nhập tay (kèm id, cùng tên + dòng tiền) → 200, dữ liệu giữ nguyên (không xoá cứng, không đổi tiền)
r = await put(SALES, leg, [catalogAsStored(cat0), manualAsStored(man1)], { customerNote: "giữ nguyên nhập tay" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.order.services[1].id, r.body.order.services[1].kind, r.body.order.services[1].name], [man1.id, "manual", "Xe đưa đón cũ"]);
assert.deepEqual(r.body.order.services[1].items.map((i) => [i.description, i.detail, i.quantity, i.unitPrice]), [["Xe 7 chỗ", "2 chiều", 2, 400000]]);
assert.equal(r.body.order.subtotal, ZE1 + 800000);
leg = r.body.order;
console.log("✓ R1: đơn cũ gửi lại NGUYÊN dịch vụ nhập tay → 200, giữ nguyên tên/dòng tiền");

// 2b) Đổi tên / mô tả / chi tiết / số lượng / đơn giá / thêm dòng / gửi như dịch vụ mới (không id) / mượn id của dịch vụ DANH MỤC → 400, đơn không đổi
const line0 = leg.services[1].items[0];
const asLine = (i) => ({ description: i.description, detail: i.detail ?? "", quantity: i.quantity, unitPrice: i.unitPrice });
const violations = [
  ["đổi đơn giá", manualAsStored(leg.services[1], { items: [{ ...asLine(line0), unitPrice: 1 }] })],
  ["đổi số lượng", manualAsStored(leg.services[1], { items: [{ ...asLine(line0), quantity: 3 }] })],
  ["đổi mô tả", manualAsStored(leg.services[1], { items: [{ ...asLine(line0), description: "Xe 16 chỗ" }] })],
  ["đổi chi tiết", manualAsStored(leg.services[1], { items: [{ ...asLine(line0), detail: "1 chiều" }] })],
  ["đổi tên", manualAsStored(leg.services[1], { name: "Xe đưa đón mới" })],
  ["thêm dòng", manualAsStored(leg.services[1], { items: [asLine(line0), { description: "Phụ phí", detail: "", quantity: 1, unitPrice: 1 }] })],
  ["gửi như mới (không id)", { ...manualAsStored(leg.services[1]), id: undefined }],
  ["mượn id của dịch vụ danh mục", manualAsStored(leg.services[1], { id: leg.services[0].id })],
];
for (const [what, svc] of violations) {
  const services = what === "mượn id của dịch vụ danh mục" ? [svc] : [catalogAsStored(leg.services[0]), svc];
  r = await put(SALES, leg, services);
  assert.equal(r.status, 400, `${what}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "invalid_input", what);
  assert.match(r.body.error.message, FROZEN, what);
}
const unchanged = await get(SALES, leg.id);
assert.equal(unchanged.updatedAt, leg.updatedAt, "bị từ chối thì đơn không đổi");
console.log(`✓ R1: ${violations.length} kiểu sửa dịch vụ nhập tay cũ (tên, mô tả, chi tiết, số lượng, đơn giá, thêm dòng, gửi như mới, mượn id) → 400, đơn không đổi`);

// 2c) Đổi NGÀY cả đơn (ADR-0021: một ngày cho cả đơn — đổi ngày đơn đổi cả dịch vụ nhập tay), số khách và thông tin chuyến của dịch vụ nhập tay → 200
r = await put(SALES, leg, [catalogAsStored(leg.services[0], { departDate: vnDate(9) }), manualAsStored(leg.services[1], { departDate: vnDate(9), pax: { adult: 5 }, pickupPlace: "KS Cũ" })]);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.order.services.map((s) => s.departDate), [vnDate(9), vnDate(9)]);
assert.deepEqual([r.body.order.services[1].pax.adult, r.body.order.services[1].pickupPlace, lines(r.body.order).at(-1).unitPrice], [5, "KS Cũ", 400000]);
leg = r.body.order;
console.log("✓ R1: đổi ngày cả đơn + số khách + điểm đón của dịch vụ nhập tay cũ → 200 (tiền giữ nguyên)");

// 2d) Nhân viên nội bộ vẫn xác nhận được đơn nháp cũ có dịch vụ nhập tay (luật R2 chỉ áp cho Đối tác)
r = await confirm(SALES, leg);
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ R1: nhân viên bán hàng xác nhận đơn nháp cũ có dịch vụ nhập tay → 200");

// 2e) Bỏ dịch vụ nhập tay khỏi đơn nháp → 200
const leg2 = await legacyDraft();
r = await put(SALES, leg2, [catalogAsStored(leg2.services[0])]);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.order.services.length, r.body.order.services[0].kind, r.body.order.subtotal], [1, "catalog", ZE1]);
console.log("✓ R1: xoá dịch vụ nhập tay cũ khỏi đơn nháp → 200");

// ================================ R2 (giá bán lẻ) + R3 (chưa được giảm giá) — tài khoản CHỈ Đối tác ================================
const phone = randomPhone();
r = await call(ADMIN, "POST", "/api/staff", { fullName: `Cộng Tác Viên ${tag}`, phone, roles: ["COLLABORATOR"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["PARTNER"], "vai Cộng tác viên → chỉ quyền Đối tác");
const P = (await login(phone, r.body.pin)).cookie;
assert.equal((await call(P, "GET", "/api/catalog")).status, 403, "đối chứng: Đối tác không đọc được danh mục (dựng đơn bằng API trực tiếp)");
const partnerCount = async (name) => (await call(P, "GET", `/api/orders?q=${encodeURIComponent(name)}`)).body.orders.length;

// 3) POST với đơn giá khác giá danh mục (thấp hơn, cao hơn) → 403, không lưu đơn
for (const [what, price] of [["thấp hơn", ZE1 - 10000], ["cao hơn", ZE1 + 10000]]) {
  const name = `ĐT lệch giá ${what} ${tag}`;
  r = await call(P, "POST", "/api/orders", orderInput({ customerName: name, services: [catalogService({ pax: { adult: 2 }, unitPrices: { adult: price } })] }));
  assert.equal(r.status, 403, `${what}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "forbidden");
  assert.match(r.body.error.message, RETAIL);
  assert.equal(await partnerCount(name), 0, `${what}: không lưu đơn`);
}
// dịch vụ nhập tay của Đối tác: R1 chặn trước (400, áp cho mọi tài khoản)
r = await call(P, "POST", "/api/orders", orderInput({ services: [manualService([{ description: "Tour 4 đảo", quantity: 2, unitPrice: 10000 }])] }));
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(r.body.error.message, FROZEN);
console.log("✓ R2: Đối tác lập đơn với đơn giá khác giá danh mục (thấp/cao) → 403; dịch vụ nhập tay → 400 (R1)");

// 4) R3: đúng giá danh mục + GIẢM GIÁ (dù 1₫ hay gần hết tiền) → 403, không lưu đơn; KHÔNG giảm giá → 201 (mặc định hoặc đơn giá tường minh = giá danh mục)
// Cùng MỘT thân yêu cầu (đúng giá, có giảm giá) gửi bằng nhân viên bán hàng ở mục 7 → 201: phân biệt đúng loại tài khoản.
const discountedBody = (discount) => orderInput({ customerName: `ĐT giảm giá ${discount} ${tag}`, services: [catalogService({ pax: { adult: 2 } })], discount });
for (const d of [1, 2 * ZE1 - 1000]) {
  r = await call(P, "POST", "/api/orders", discountedBody(d));
  assert.equal(r.status, 403, `giảm ${d}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "forbidden");
  assert.match(r.body.error.message, NO_DISCOUNT);
  assert.equal(await partnerCount(`ĐT giảm giá ${d} ${tag}`), 0, `giảm ${d}: không lưu đơn`);
}
r = await call(P, "POST", "/api/orders", orderInput({ customerName: `ĐT không giảm ${tag}`, services: [catalogService({ pax: { adult: 2 } })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
let po = r.body.order;
assert.deepEqual([lines(po)[0].unitPrice, lines(po)[0].catalogPrice, po.subtotal, po.discount, po.total], [ZE1, ZE1, 2 * ZE1, 0, 2 * ZE1]);
// gửi đơn giá TƯỜNG MINH bằng đúng giá danh mục, giảm giá 0 tường minh, cũng được
r = await call(P, "POST", "/api/orders", orderInput({ customerName: `ĐT giá tường minh ${tag}`, services: [catalogService({ pax: { adult: 1, child: 1 }, unitPrices: { ...FAKE_CATALOG.ZE1.prices } })], discount: 0 }));
assert.equal(r.status, 201, JSON.stringify(r.body));
console.log("✓ R3: Đối tác đúng giá danh mục + giảm giá (1₫ / gần hết tiền) → 403, không lưu; không giảm giá → 201");

// 5) PUT: hạ đơn giá → 403 (R2); giữ giá nhưng THÊM giảm giá → 403 (R3); cả hai lần đơn không đổi. Giữ giá, không giảm, đổi ghi chú → 200; tự xác nhận → 200
r = await put(P, po, [catalogAsStored(po.services[0], { unitPrices: { adult: ZE1 - 1 } })], { discount: 0 });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.match(r.body.error.message, RETAIL);
r = await put(P, po, [catalogAsStored(po.services[0])], { discount: 1000 });
assert.equal(r.status, 403, `R3 ở PUT: ${JSON.stringify(r.body)}`);
assert.equal(r.body.error.code, "forbidden");
assert.match(r.body.error.message, NO_DISCOUNT);
const poNow = await get(P, po.id);
assert.deepEqual([poNow.updatedAt, poNow.discount], [po.updatedAt, 0], "bị từ chối thì đơn không đổi");
r = await put(P, po, [catalogAsStored(po.services[0])], { discount: 0, customerNote: "Đối tác sửa ghi chú" });
assert.equal(r.status, 200, JSON.stringify(r.body));
po = r.body.order;
r = await confirm(P, po);
assert.equal(r.status, 200, `Đối tác tự xác nhận đơn đúng giá danh mục, không giảm giá → 200: ${JSON.stringify(r.body)}`);
console.log("✓ R2+R3: Đối tác PUT hạ đơn giá → 403; PUT thêm giảm giá → 403 (đơn không đổi); giữ giá + không giảm → 200; tự xác nhận → 200");

// 6) XÁC NHẬN đơn nháp CŨ của Đối tác có dòng lệch giá (dựng bằng SQL — trước bản vá API từng nhận) → 403, đơn vẫn nháp
r = await call(P, "POST", "/api/orders", orderInput({ customerName: `ĐT nháp cũ lệch giá ${tag}`, services: [catalogService({ pax: { adult: 2 } })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const skew = r.body.order;
await sql(`UPDATE order_item SET unit_price = 10000, line_total = quantity * 10000 WHERE order_id = '${skew.id}'`);
await sql(`UPDATE orders SET subtotal = 20000, total = 20000 - discount, remaining_amount = 20000 - discount - deposit_amount WHERE id = '${skew.id}'`);
r = await confirm(P, skew);
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.match(r.body.error.message, RETAIL);
assert.equal((await get(P, skew.id)).status, "draft", "đơn vẫn là nháp");
// … và đơn nháp CŨ của Đối tác có dịch vụ nhập tay (không có giá danh mục): xác nhận → 403; sửa (gửi nguyên) → 403; xoá dịch vụ nhập tay → 200
const pLeg = await legacyDraft(P, `ĐT nháp cũ nhập tay ${tag}`);
r = await confirm(P, pLeg);
assert.equal(r.status, 403, JSON.stringify(r.body));
r = await put(P, pLeg, [catalogAsStored(pLeg.services[0]), manualAsStored(pLeg.services[1])]);
assert.equal(r.status, 403, `R1 cho qua (gửi nguyên) nhưng dòng nhập tay không có giá danh mục → R2 chặn: ${JSON.stringify(r.body)}`);
r = await put(P, pLeg, [catalogAsStored(pLeg.services[0])]);
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ R2: Đối tác xác nhận nháp cũ lệch giá → 403 (vẫn nháp); nháp cũ có nhập tay: xác nhận/sửa 403, xoá dịch vụ nhập tay → 200");

// 6b) R3 ở XÁC NHẬN: đơn nháp của Đối tác đúng giá nhưng CÓ giảm giá đã lưu (dựng bằng SQL — trước bản vá API từng nhận) → 403, đơn vẫn nháp.
//     Cách gỡ: Đối tác sửa giảm giá về 0 (PUT → 200) rồi xác nhận → 200.
r = await call(P, "POST", "/api/orders", orderInput({ customerName: `ĐT nháp cũ có giảm giá ${tag}`, services: [catalogService({ pax: { adult: 2 } })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const disc = r.body.order;
await sql(`UPDATE orders SET discount = 5000, total = subtotal - 5000, remaining_amount = subtotal - 5000 - deposit_amount WHERE id = '${disc.id}'`);
const discStored = await get(P, disc.id);
assert.deepEqual([discStored.discount, discStored.total], [5000, 2 * ZE1 - 5000], "đơn nháp cũ dựng đúng");
r = await confirm(P, discStored);
assert.equal(r.status, 403, `R3 ở xác nhận: ${JSON.stringify(r.body)}`);
assert.equal(r.body.error.code, "forbidden");
assert.match(r.body.error.message, NO_DISCOUNT);
assert.equal((await get(P, disc.id)).status, "draft", "đơn vẫn là nháp");
r = await put(P, discStored, [catalogAsStored(discStored.services[0])], { discount: 0 });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await confirm(P, r.body.order);
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ R3: Đối tác xác nhận nháp cũ có giảm giá đã lưu → 403 (vẫn nháp); sửa giảm giá về 0 → 200, xác nhận → 200");

// 7) Nhân viên bán hàng (luật R2/R3 chỉ áp cho Đối tác): CÙNG thân yêu cầu với đơn giá thoả thuận → 201, xác nhận → 200; CÙNG thân yêu cầu có giảm giá
//    mà Đối tác vừa bị 403 ở mục 4 → 201; sửa thêm giảm giá → 200; xác nhận → 200.
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `NV giá thoả thuận ${tag}`, services: [catalogService({ pax: { adult: 2 }, unitPrices: { adult: ZE1 - 10000 } })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(lines(r.body.order)[0].unitPrice, ZE1 - 10000);
assert.equal((await confirm(SALES, r.body.order)).status, 200);
for (const d of [1, 2 * ZE1 - 1000]) {
  r = await call(SALES, "POST", "/api/orders", discountedBody(d));
  assert.equal(r.status, 201, `nhân viên, giảm ${d}: ${JSON.stringify(r.body)}`);
  assert.deepEqual([r.body.order.discount, r.body.order.total], [d, 2 * ZE1 - d]);
}
const so = r.body.order;
r = await put(SALES, so, [catalogAsStored(so.services[0])], { discount: 2 * ZE1 - 1 });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await confirm(SALES, r.body.order)).status, 200);
console.log("✓ R2+R3: nhân viên bán hàng cùng thân yêu cầu (đơn giá thoả thuận / có giảm giá) → 201, sửa thêm giảm giá → 200, xác nhận 200");

console.log("E2E NHẬP TAY + GIÁ ĐỐI TÁC OK");
