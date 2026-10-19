// DK-T3-01 (kiểm toán điểm khuất 24/9, HIGH) — ba luật máy chủ theo câu trả lời của chủ dự án ngày 2026-09-26:
//  R1 — Câu 1: "loại bỏ hoàn toàn dịch vụ nhập tay khỏi giao diện … Sẽ mở lại khi cần thiết". ADR-0061 (accepted 2026-09-30) MỞ LẠI CÓ ĐIỀU KIỆN — NỚI
//     hàng rào đã duyệt (Điều 9.4; chủ duyệt ADR-0061 là duyệt việc nới; dòng R1 ở docs/SO-HANG-RAO.md): R1 nay áp khi công tắc nhập tay TẮT, với người
//     không có ô order.service.manual, và LUÔN với tài khoản có quyền Đối tác (kể cả lai). Các ca R1 "mọi tài khoản" cũ (mục 1–2) chạy khi công tắc TẮT
//     (mặc định sau migration 0052); mục 9 bật công tắc bằng Toàn quyền và kiểm tiêu chí 2–5 của ADR-0061, rồi TẮT lại (D1 chung với kịch bản khác).
//     Khi R1 áp: POST/PUT /api/orders không nhận dịch vụ nhập tay MỚI; dịch vụ nhập tay CŨ đã lưu của chính đơn bị "đóng băng" (tên + dòng tiền giữ
//     nguyên), vẫn sửa được thông tin chuyến / số khách / ngày cả đơn, và xoá được khỏi đơn nháp. Vi phạm → 400 invalid_input.
//  R2 (tài khoản CÓ quyền Đối tác — kể cả kèm quyền khác, chủ chốt 26/9 "Có quyền Đối tác là áp") — Câu 2: "đối tác vẫn phải trả một mức giá cố định cho công ty" + ADR-0014 điều 3 (ảnh xác
//     nhận luôn là giá bán lẻ): ở lập (POST), sửa (PUT) và xác nhận (POST /status → confirmed) mọi dòng tiền phải có giá danh mục và đơn giá = giá
//     danh mục → sai 403 forbidden. Nhân viên nội bộ không đổi gì.
//  R3 (tài khoản có quyền Đối tác) — chủ dự án chốt 26/9: "đối tác được quyền giảm giá cho khách nhưng luôn phải trả một mức giá cố định (giá vốn) …
//     có thể đặt mức giảm tối đa là mức chiết khấu của công ty Tour đảo dành cho đối tác"; app CHƯA có bảng mức chiết khấu → chủ chọn "Tạm không cho
//     giảm" (trần = 0): giảm giá cấp đơn phải bằng 0 ở lập, sửa và xác nhận (xác nhận đọc giảm giá ĐÃ LƯU) → sai 403 forbidden. Nhân viên nội bộ không đổi.
// Đơn của Đối tác dựng bằng API trực tiếp (từ 1.15 Đối tác đọc được danh mục — ADR-0028; kịch bản không cần giao diện). Dịch vụ nhập tay CŨ dựng bằng SQL trên D1 local tạm (`makeLegacyManual`).
import assert from "node:assert/strict";
import { ACCOUNTS, FAKE_CATALOG, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, login, makeLegacyManual, manualService, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const FIELD = await session(ACCOUNTS.field);
const congTac = async () => (await call(SUPER, "GET", "/api/cai-dat/nhap-tay")).body;
const datCongTac = (who, on) => call(who, "POST", "/api/cai-dat/nhap-tay", { batNhapTay: on });
// D1 local tạm dùng chung: lần chạy trước đứt giữa chừng có thể để công tắc BẬT — đưa về TẮT (mặc định sau migration 0052) rồi mới kiểm.
if ((await congTac()).batNhapTay) assert.equal((await datCongTac(SUPER, false)).status, 200);
assert.equal((await congTac()).batNhapTay, false, "đầu kịch bản: công tắc nhập tay TẮT");
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
/** ADR-0134: lựa chọn đón gửi tường minh (dịch vụ gieo bằng SQL chưa có) — tính lại từ lượt đón SAU khi ghi đè (không chép lựa chọn cũ: ghi đè thêm điểm đón thì phải thành "Đón"): còn giờ/điểm đón (khoá cũ sinh chặng) hoặc chặng → "DON". */
const chonDonCua = (sv, patch) => patch.pickupChoice ?? ((patch.pickupPlace ?? sv.pickupPlace) || (patch.pickupTime ?? sv.pickupTime) || sv.legs?.length ? "DON" : "KHONG_DON");
const manualAsStored = (sv, patch = {}) => ({
  id: sv.id, kind: "manual", name: sv.name, pax: { adult: sv.pax.adult }, ...tripOf(sv),
  items: sv.items.map((i) => ({ description: i.description, detail: i.detail ?? "", quantity: i.quantity, unitPrice: i.unitPrice })),
  ...patch, pickupChoice: chonDonCua(sv, patch),
});
/** Thân gửi lại NGUYÊN một dịch vụ danh mục đã lưu (cùng số khách, cùng đơn giá — giữ bản chụp). */
const catalogAsStored = (sv, patch = {}) => ({
  id: sv.id, kind: "catalog", catalogCode: sv.catalogCode, pax: { ...sv.pax }, ...tripOf(sv),
  unitPrices: Object.fromEntries(sv.items.map((i) => [i.paxCode, i.unitPrice])), catalogPriceSeen: Object.fromEntries(sv.items.map((i) => [i.paxCode, i.catalogPrice])),
  ...patch, pickupChoice: chonDonCua(sv, patch),
});
const FROZEN = /dịch vụ nhập tay đang tắt/; // ADR-0061: câu R1 theo lý do — công tắc TẮT
const FROZEN_DOI_TAC = /tài khoản có quyền Đối tác không dùng được dịch vụ nhập tay/;
const FROZEN_KHONG_O = /tài khoản này không được dùng dịch vụ nhập tay/;
const RETAIL = /giá bán lẻ theo danh mục/;
const NO_DISCOUNT = /^Tài khoản đối tác chưa được giảm giá: mức giảm tối đa bằng mức chiết khấu Tour Đảo dành cho đối tác, mà mức này chưa được thiết lập\. Muốn giảm cho khách, nhờ văn phòng\.$/;
let r;

// ============================================ R1 — dịch vụ nhập tay (công tắc TẮT — ADR-0061) ============================================
// 1) Không nhận dịch vụ nhập tay MỚI — đứng một mình hay cạnh dịch vụ danh mục; câu lỗi chỉ đúng dịch vụ (banner cuộn tới thẻ đó).
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `R1 mới ${tag}`, services: [manualService([{ description: "Xe 7 chỗ", quantity: 1, unitPrice: 800000 }])] }));
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_input");
assert.match(r.body.error.message, /^Dịch vụ 1: /);
assert.match(r.body.error.message, FROZEN);
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `R1 mới ${tag}`, services: [catalogService(), manualService([{ description: "Áo phao", quantity: 1, unitPrice: 1 }])] }));
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(r.body.error.message, /^Dịch vụ 2: dịch vụ nhập tay đang tắt/);
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

// ================================ R2 (giá bán lẻ) + R3 (chưa được giảm giá) — tài khoản Đối tác ====================================
const phone = randomPhone();
r = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Cộng Tác Viên ${tag}`, phone, roles: ["COLLABORATOR"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["PARTNER"], "vai Cộng tác viên → chỉ quyền Đối tác");
const P = (await login(phone, r.body.pin)).cookie;
// KHÔNG gọi GET /api/catalog ở đây: kịch bản này chạy TRƯỚC catalog.mjs trên D1 chưa từng đồng bộ — lời gọi đầu tiên tự kéo Sheet thật
// (CHANGE-GUIDE §4 mục 23) và ẩn danh mục giả ZE*. Quyền đọc danh mục của Đối tác/Thực tập (ADR-0028) do catalog.mjs kiểm.
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
// dịch vụ nhập tay của Đối tác: R1 chặn trước (400 — ADR-0061: tài khoản có quyền Đối tác luôn bị chặn, câu nói rõ lý do Đối tác)
r = await call(P, "POST", "/api/orders", orderInput({ services: [manualService([{ description: "Tour 4 đảo", quantity: 2, unitPrice: 10000 }])] }));
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(r.body.error.message, FROZEN_DOI_TAC);
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

// 8) Tài khoản CÓ quyền Đối tác kèm quyền nội bộ (gán qua đường quản trị cũ — không kèm vai, nên luật LC-1 của mô hình vai không chạy) vẫn theo luật
// giá Đối tác (chủ dự án chốt 2026-09-26: "Có quyền Đối tác là áp"). Đường lách do người kiểm độc lập chứng minh 26/9: PARTNER+FIELD lập đơn 1đ → 201.
// ADR-0083 điều 1b: đường cũ nay CHẶN tạo tài khoản lai (400); tài khoản lai cũ vẫn có thể còn trong dữ liệu (điều 1c) → gieo SQL để thử luật giá.
r = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đối Tác Lai ${tag}`, phone: randomPhone(), permissions: ["PARTNER", "FIELD"] });
assert.equal(r.status, 400, `ADR-0083 1b: đường cũ không tạo tài khoản lai: ${JSON.stringify(r.body)}`);
const PH = (await gieoTaiKhoanLai(`Đối Tác Lai ${tag}`, ["PARTNER", "FIELD"])).cookie;
r = await call(PH, "POST", "/api/orders", orderInput({ customerName: `ĐT lai lệch giá ${tag}`, services: [catalogService({ pax: { adult: 2 }, unitPrices: { adult: 1 } })] }));
assert.equal(r.status, 403, `Đối tác lai, đơn giá 1đ: ${JSON.stringify(r.body)}`);
assert.match(r.body.error.message, RETAIL);
r = await call(PH, "POST", "/api/orders", orderInput({ customerName: `ĐT lai giảm giá ${tag}`, services: [catalogService({ pax: { adult: 2 } })], discount: 1 }));
assert.equal(r.status, 403, `Đối tác lai, giảm 1đ: ${JSON.stringify(r.body)}`);
assert.match(r.body.error.message, NO_DISCOUNT);
console.log("✓ R2+R3: tài khoản có quyền Đối tác KÈM quyền nội bộ (PARTNER+FIELD, dữ liệu lai cũ — gieo SQL; API nay chặn 400) → đơn giá lệch 403, giảm giá 403");

// ============================== ADR-0061 — công tắc "Dịch vụ nhập tay" (tiêu chí nghiệm thu 2–5) ==============================
// Tài khoản thêm cho mục này: Thực tập (INTERN), lai Đối tác + Bán hàng (SALES+PARTNER, gán qua đường quản trị cũ như mục 8).
const taoTk = async (ten, permissions) => {
  const ph = randomPhone();
  const x = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${ten} ${tag}`, phone: ph, permissions });
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return (await login(ph, x.body.pin)).cookie;
};
const INTERN = await taoTk("Thực Tập Nhập Tay", ["INTERN"]);
const LAI_SALES = (await gieoTaiKhoanLai(`Đối Tác Lai Bán ${tag}`, ["SALES", "PARTNER"])).cookie; // ADR-0083 1b: API không tạo lai nữa — gieo SQL
const nhapTayBody = (name) => orderInput({ customerName: name, services: [catalogService(), manualService([{ description: "Xe 7 chỗ", quantity: 2, unitPrice: 400000 }], { name: "Xe đưa đón riêng" })] });

// 9a) Quản trị bật công tắc → 403 forbidden, công tắc vẫn TẮT (tiêu chí 4 nửa đầu)
r = await datCongTac(ADMIN, true);
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.code, "forbidden");
assert.equal((await congTac()).batNhapTay, false);
// 9b) Toàn quyền bật → 200, có dòng nhật ký (tiêu chí 4 nửa sau); đọc lại: Bán hàng dùng được, lai Đối tác + Bán hàng thì không
r = await datCongTac(SUPER, true);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.batNhapTay, true);
try {
  const nk = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'manual_service_policy_changed' AND detail = 'Bật dịch vụ nhập tay' AND order_id IS NULL`);
  assert.ok(Number(nk[0].n) >= 1, `có dòng nhật ký bật: ${JSON.stringify(nk)}`);
  assert.deepEqual((await call(SALES, "GET", "/api/cai-dat/nhap-tay")).body, { batNhapTay: true, duocDung: true, doiDuoc: false });
  assert.deepEqual((await call(LAI_SALES, "GET", "/api/cai-dat/nhap-tay")).body, { batNhapTay: true, duocDung: false, doiDuoc: false });
  console.log("✓ ADR-0061: Quản trị bật công tắc → 403; Toàn quyền bật → 200 + nhật ký; Bán hàng dùng được, lai Đối tác + Bán hàng không");

  // 9c) Tiêu chí 2: Bán hàng, Quản trị lập đơn có dịch vụ nhập tay → 201; tổng tiền do máy chủ tính (giá danh mục ZE1 + 2 × 400.000)
  let donNhapTay;
  for (const [ten, who] of [["Bán hàng", SALES], ["Quản trị", ADMIN]]) {
    r = await call(who, "POST", "/api/orders", nhapTayBody(`NT bật ${ten} ${tag}`));
    assert.equal(r.status, 201, `${ten}: ${JSON.stringify(r.body)}`);
    assert.deepEqual([r.body.order.services[1].kind, r.body.order.subtotal], ["manual", ZE1 + 800000], ten);
    if (who === SALES) donNhapTay = r.body.order;
  }
  console.log("✓ ADR-0061 tiêu chí 2: công tắc BẬT — Bán hàng, Quản trị lập đơn có dịch vụ nhập tay → 201, tổng tiền máy chủ tính");

  // 9d) Tiêu chí 3 (POST): chỉ-HDV 403 forbidden; Thực tập, Đối tác, lai Đối tác + Bán hàng, lai Đối tác + HDV → 400 invalid_input
  const ca = [
    ["chỉ-HDV", FIELD, 403, "forbidden", null],
    ["Thực tập", INTERN, 400, "invalid_input", FROZEN_KHONG_O],
    ["Đối tác", P, 400, "invalid_input", FROZEN_DOI_TAC],
    ["lai Đối tác + Bán hàng", LAI_SALES, 400, "invalid_input", FROZEN_DOI_TAC],
    ["lai Đối tác + HDV", PH, 400, "invalid_input", FROZEN_DOI_TAC],
  ];
  for (const [ten, who, status, code, cau] of ca) {
    r = await call(who, "POST", "/api/orders", nhapTayBody(`NT chặn ${ten} ${tag}`));
    assert.equal(r.status, status, `${ten}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.error.code, code, ten);
    if (cau) assert.match(r.body.error.message, cau, ten);
  }
  console.log("✓ ADR-0061 tiêu chí 3 (POST): chỉ-HDV 403; Thực tập, Đối tác, lai Đối tác+Bán hàng, lai Đối tác+HDV 400 invalid_input");

  // 9e) Tiêu chí 3 (PUT sửa nháp): người có order.modify trên đơn của mình thêm dịch vụ nhập tay → cùng mã 400
  for (const [ten, who, cau] of [["Thực tập", INTERN, FROZEN_KHONG_O], ["Đối tác", P, FROZEN_DOI_TAC], ["lai Đối tác + Bán hàng", LAI_SALES, FROZEN_DOI_TAC]]) {
    const x = await call(who, "POST", "/api/orders", orderInput({ customerName: `NT sửa ${ten} ${tag}` }));
    assert.equal(x.status, 201, `${ten}: ${JSON.stringify(x.body)}`);
    r = await put(who, x.body.order, [catalogAsStored(x.body.order.services[0]), manualService([{ description: "Xe", quantity: 1, unitPrice: 1 }])]);
    assert.equal(r.status, 400, `${ten}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.error.code, "invalid_input", ten);
    assert.match(r.body.error.message, cau, ten);
  }
  console.log("✓ ADR-0061 tiêu chí 3 (PUT): Thực tập, Đối tác, lai Đối tác+Bán hàng sửa nháp thêm dịch vụ nhập tay → 400");

  // 9f) Hệ quả có chủ ý (ADR-0061): Quản trị thêm dịch vụ nhập tay vào đơn nháp CỦA ĐỐI TÁC → Đối tác không xác nhận được (R2, 403); nội bộ xác nhận thay
  const pd = (await call(P, "POST", "/api/orders", orderInput({ customerName: `NT nháp Đối tác ${tag}` }))).body.order;
  r = await put(ADMIN, pd, [catalogAsStored(pd.services[0]), manualService([{ description: "Phụ thu", quantity: 1, unitPrice: 50000 }])]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const pd2 = r.body.order;
  r = await confirm(P, pd2);
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.match(r.body.error.message, RETAIL);
  assert.equal((await confirm(ADMIN, pd2)).status, 200, "Quản trị xác nhận thay");
  console.log("✓ ADR-0061 hệ quả: nội bộ thêm nhập tay vào nháp của Đối tác → Đối tác xác nhận 403 (R2), Quản trị xác nhận thay 200");

  // 9g) Tiêu chí 5: Toàn quyền TẮT → đơn đã có dịch vụ nhập tay vẫn mở; sửa giá/tên dòng đó → 400; gửi nguyên → 200; xác nhận → 200
  r = await datCongTac(SUPER, false);
  assert.deepEqual([r.status, r.body.batNhapTay], [200, false]);
  const mo = await get(SALES, donNhapTay.id);
  assert.equal(mo.services[1].kind, "manual");
  r = await put(SALES, mo, [catalogAsStored(mo.services[0]), manualAsStored(mo.services[1], { items: [{ description: "Xe 7 chỗ", detail: "", quantity: 2, unitPrice: 1 }] })]);
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.match(r.body.error.message, FROZEN);
  r = await put(SALES, mo, [catalogAsStored(mo.services[0]), manualAsStored(mo.services[1], { name: "Xe khác" })]);
  assert.equal(r.status, 400, JSON.stringify(r.body));
  r = await put(SALES, mo, [catalogAsStored(mo.services[0]), manualAsStored(mo.services[1])], { customerNote: "giữ nguyên sau khi tắt" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await confirm(SALES, r.body.order)).status, 200);
  console.log("✓ ADR-0061 tiêu chí 5: tắt lại → đơn có nhập tay vẫn mở, sửa giá/tên 400, gửi nguyên 200, xác nhận 200");
} finally {
  // D1 chung: luôn TẮT lại công tắc cho kịch bản sau (mặc định sau migration 0052).
  if ((await congTac()).batNhapTay) await datCongTac(SUPER, false);
}
assert.equal((await congTac()).batNhapTay, false, "cuối kịch bản: công tắc TẮT");

// ============================== ADR-0100 — Thực tập theo luật giá R2/R3 (chỉ giá danh mục, không giảm giá) ==============================
// Chủ dự án 2026-10-03: "Thực tập như Đối tác, chỉ giá danh mục, không giảm." Luật ADR-0027 Đ2 áp cho tài khoản CÓ quyền Thực tập (kể cả kèm quyền nội bộ khác)
// ở cả ba cổng: lập đơn, sửa nháp, xác nhận. Trước bản vá chỉ Đối tác bị chặn: Thực tập lập đơn giá 100.000, giảm thêm rồi tự xác nhận → 201 rồi 200 (K-B-1, kiểm toán 12/10).
// INTERN (chỉ Thực tập, tạo bằng API ở mục ADR-0061); INTERN_SALES (Bán hàng + Thực tập, dữ liệu lai — gieo SQL như mục 8). Kịch bản cố ý KHÔNG gọi GET /api/catalog.
const CAU_THUC_TAP = "Tài khoản Thực tập chỉ dùng giá danh mục, không giảm giá — nhờ nhân viên Bán hàng nếu cần giá khác.";
const INTERN_SALES = (await gieoTaiKhoanLai(`Thực Tập Lai Bán ${tag}`, ["SALES", "INTERN"])).cookie;
const demDon = async (who, name) => {
  const x = await call(who, "GET", `/api/orders?q=${encodeURIComponent(name)}`);
  assert.equal(x.status, 200, `đếm đơn "${name}": ${JSON.stringify(x.body)}`);
  return x.body.orders.length;
};
const biChan = (x, cau, what) => {
  assert.equal(x.status, 403, `${what}: ${JSON.stringify(x.body)}`);
  assert.equal(x.body.error.code, "forbidden", what);
  assert.equal(x.body.error.message, cau, what);
};
// `ma` ngắn cho tên khách dùng để ĐẾM đơn qua `?q=`: D1 chỉ nhận mẫu LIKE tới khoảng 50 byte (`%chữ tìm%`), tiếng Việt có dấu tốn 2–3 byte mỗi ký tự — chữ tìm dài hơn thì `GET /api/orders` trả 500. Vì vậy tên ở đây ngắn, không dấu.
for (const [ten, who, ma] of [["Thực tập", INTERN, "a"], ["Thực tập + Bán hàng", INTERN_SALES, "b"]]) {
  // 10a) LẬP: đơn giá khác giá danh mục (thấp/cao) hoặc giảm giá (dù 1₫ hay gần hết tiền) → 403 đúng câu của Thực tập, không lưu đơn
  for (const [what, price] of [["thấp hơn", ZE1 - 10000], ["cao hơn", ZE1 + 10000]]) {
    const name = `TT${ma} gia ${price} ${tag}`;
    r = await call(who, "POST", "/api/orders", orderInput({ customerName: name, services: [catalogService({ pax: { adult: 2 }, unitPrices: { adult: price } })] }));
    biChan(r, CAU_THUC_TAP, `${ten}: đơn giá ${what}`);
    assert.equal(await demDon(who, name), 0, `${ten} ${what}: không lưu đơn`);
  }
  for (const d of [1, 2 * ZE1 - 1000]) {
    const name = `TT${ma} giam ${d} ${tag}`;
    r = await call(who, "POST", "/api/orders", { ...discountedBody(d), customerName: name });
    biChan(r, CAU_THUC_TAP, `${ten}: đúng giá + giảm ${d}`);
    assert.equal(await demDon(who, name), 0, `${ten} giảm ${d}: không lưu đơn`);
  }
  // 10b) LẬP đúng việc: đúng giá danh mục, không giảm (mặc định hoặc đơn giá tường minh = giá danh mục, giảm 0) → 201
  r = await call(who, "POST", "/api/orders", orderInput({ customerName: `TT đúng giá ${ten} ${tag}`, services: [catalogService({ pax: { adult: 2 } })] }));
  assert.equal(r.status, 201, `${ten}: ${JSON.stringify(r.body)}`);
  let to = r.body.order;
  assert.deepEqual([lines(to)[0].unitPrice, lines(to)[0].catalogPrice, to.subtotal, to.discount, to.total], [ZE1, ZE1, 2 * ZE1, 0, 2 * ZE1]);
  r = await call(who, "POST", "/api/orders", orderInput({ customerName: `TT giá tường minh ${ten} ${tag}`, services: [catalogService({ pax: { adult: 1, child: 1 }, unitPrices: { ...FAKE_CATALOG.ZE1.prices } })], discount: 0 }));
  assert.equal(r.status, 201, `${ten}: ${JSON.stringify(r.body)}`);
  // 10c) SỬA NHÁP: hạ đơn giá → 403; giữ giá nhưng thêm giảm giá → 403 (đơn không đổi); giữ giá, không giảm, đổi ghi chú → 200
  r = await put(who, to, [catalogAsStored(to.services[0], { unitPrices: { adult: ZE1 - 1 } })], { discount: 0 });
  biChan(r, CAU_THUC_TAP, `${ten}: PUT hạ đơn giá`);
  r = await put(who, to, [catalogAsStored(to.services[0])], { discount: 1000 });
  biChan(r, CAU_THUC_TAP, `${ten}: PUT thêm giảm giá`);
  const toNow = await get(who, to.id);
  assert.deepEqual([toNow.updatedAt, toNow.discount], [to.updatedAt, 0], `${ten}: bị từ chối thì đơn không đổi`);
  r = await put(who, to, [catalogAsStored(to.services[0])], { discount: 0, customerNote: "Thực tập sửa ghi chú" });
  assert.equal(r.status, 200, `${ten}: ${JSON.stringify(r.body)}`);
  to = r.body.order;
  // 10d) XÁC NHẬN: đơn đúng giá, không giảm → 200 (ADR-0100 Đ5: giữ việc Thực tập tự xác nhận đơn mình lập)
  r = await confirm(who, to);
  assert.equal(r.status, 200, `${ten} tự xác nhận đơn đúng giá danh mục, không giảm: ${JSON.stringify(r.body)}`);
  // 10e) XÁC NHẬN nháp CŨ lệch giá (dựng bằng SQL — trước bản vá API từng nhận) → 403, vẫn nháp
  r = await call(who, "POST", "/api/orders", orderInput({ customerName: `TT nháp cũ lệch giá ${ten} ${tag}`, services: [catalogService({ pax: { adult: 2 } })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const lech = r.body.order;
  await sql(`UPDATE order_item SET unit_price = 10000, line_total = quantity * 10000 WHERE order_id = '${lech.id}'`);
  await sql(`UPDATE orders SET subtotal = 20000, total = 20000 - discount, remaining_amount = 20000 - discount - deposit_amount WHERE id = '${lech.id}'`);
  biChan(await confirm(who, lech), CAU_THUC_TAP, `${ten}: xác nhận nháp cũ lệch giá`);
  assert.equal((await get(who, lech.id)).status, "draft", `${ten}: đơn vẫn là nháp`);
  // 10f) XÁC NHẬN nháp CŨ đúng giá nhưng CÓ giảm giá đã lưu → 403 (vẫn nháp); sửa giảm giá về 0 → 200, xác nhận → 200
  r = await call(who, "POST", "/api/orders", orderInput({ customerName: `TT nháp cũ có giảm giá ${ten} ${tag}`, services: [catalogService({ pax: { adult: 2 } })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const giam = r.body.order;
  await sql(`UPDATE orders SET discount = 5000, total = subtotal - 5000, remaining_amount = subtotal - 5000 - deposit_amount WHERE id = '${giam.id}'`);
  const giamLuu = await get(who, giam.id);
  assert.deepEqual([giamLuu.discount, giamLuu.total], [5000, 2 * ZE1 - 5000], `${ten}: nháp cũ dựng đúng`);
  biChan(await confirm(who, giamLuu), CAU_THUC_TAP, `${ten}: xác nhận nháp cũ có giảm giá đã lưu`);
  assert.equal((await get(who, giam.id)).status, "draft", `${ten}: đơn vẫn là nháp`);
  r = await put(who, giamLuu, [catalogAsStored(giamLuu.services[0])], { discount: 0 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await confirm(who, r.body.order)).status, 200, `${ten}: sửa giảm giá về 0 rồi xác nhận`);
  console.log(`✓ ADR-0100 (${ten}): lập lệch giá / giảm giá → 403 đúng câu, không lưu; đúng giá → 201; PUT hạ giá / thêm giảm → 403 (đơn không đổi); đúng giá tự xác nhận → 200; xác nhận nháp cũ lệch giá / có giảm giá → 403 (vẫn nháp), sửa về đúng → 200`);
}
// 10g) Đơn nháp CŨ của Thực tập có dịch vụ nhập tay (không có giá danh mục): xác nhận → 403 (R2); xoá dịch vụ nhập tay → 200, xác nhận → 200
const ttLeg = await legacyDraft(INTERN, `TT nháp cũ nhập tay ${tag}`);
biChan(await confirm(INTERN, ttLeg), CAU_THUC_TAP, "Thực tập: xác nhận nháp cũ có dịch vụ nhập tay");
r = await put(INTERN, ttLeg, [catalogAsStored(ttLeg.services[0])]);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await confirm(INTERN, r.body.order)).status, 200);
// 10h) Đối chứng: CÙNG thân yêu cầu bị Thực tập chặn thì Bán hàng thường vẫn 201 (giá thoả thuận / giảm giá); Đối tác vẫn 403 nhưng bằng câu của Đối tác
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `TT đối chứng Bán hàng ${tag}`, services: [catalogService({ pax: { adult: 2 }, unitPrices: { adult: ZE1 - 10000 } })], discount: 5000 }));
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(P, "POST", "/api/orders", orderInput({ customerName: `TT đối chứng Đối tác ${tag}`, services: [catalogService({ pax: { adult: 2 } })], discount: 1 }));
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.match(r.body.error.message, NO_DISCOUNT);
assert.notEqual(r.body.error.message, CAU_THUC_TAP, "Đối tác giữ câu của Đối tác");
console.log("✓ ADR-0100: Thực tập (cả Thực tập + Bán hàng) theo luật giá của Đối tác ở ba cổng; xác nhận nháp cũ có nhập tay → 403; Bán hàng thường vẫn giảm giá được, Đối tác vẫn bằng câu của Đối tác");

console.log("E2E NHẬP TAY + GIÁ ĐỐI TÁC OK");
