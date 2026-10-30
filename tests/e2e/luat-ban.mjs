// LUẬT BÁN THEO LOẠI ĐỐI TÁC + ĐẶC ĐIỂM DỊCH VỤ (ADR-0146 Đ3, Đ4, Đ6 (c), (d); ADR-0152 Đ2, Đ6 (k); kế hoạch docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md T14)
// trên API THẬT (wrangler dev, D1 local tạm):
//   0) dựng: loại đối tác MỚI (tên dùng một lần), hồ sơ bên đặt P mang loại, Q không loại; tài khoản Đối tác thử mang loại; đặc điểm + hai giá trị; hai nhóm;
//      dịch vụ giả ZLB1…ZLB5 (mã riêng, không dùng chung với kịch bản khác); các nháp lập TRƯỚC khi có luật (để thử cửa trên «nháp cũ»).
//   1) bốn luật — SERVICE ZLB1, GROUP G (ZLB2), ATTRIBUTE X = x1 (ZLB3), ATTRIBUTE X = x2 kèm nhóm G2 (ZLB4 trong G2 bị chặn; ZLB5 mang x2 ngoài G2 đặt được).
//   2) mỗi cửa ghi đơn của ADR-0146 Đ3 → 409 `sales_blocked` và KHÔNG ghi: lập đơn, lưu nháp, đổi bên đặt (nháp, đã xác nhận), `/status` (đơn «cần xác nhận» + bị chặn ⇒
//      `sales_blocked`, chủ chọn Q-1 (a)), Gửi xác nhận (không mở yêu cầu), Còn vé (đơn vẫn nháp, yêu cầu vẫn mở), Gửi đơn của Đối tác; Đối tác lập thẳng 409.
//   3) tắt loại còn luật → 409 `loai_con_luat_ban` (Đ6 (c)).
//   4) for-order: Đối tác thiếu ĐÚNG ZLB1…ZLB4 và hai chip nhóm rỗng; Bán hàng thấy đủ (Đ6 (d)).
//   5) R-1 trên D1 thật (CHECK có `date()`): luật bắt đầu hôm nay → «Kết thúc ngay» 200, ngày kết thúc = hôm qua → lập đơn 201 ngay.
//   6) dọn (ADR-0152 Đ6 (k)): kết thúc mọi luật, rút yêu cầu, trả cờ «cần xác nhận», đóng mọi dòng gắn, tắt đặc điểm, rồi tắt loại → 200 (đối chứng của 3).
// Dùng salesA / admin / superAdmin / accountant (không đổi tài khoản dùng chung); tài khoản Đối tác (vai Cộng tác viên) tạo một lần. KHÔNG đổi công ty chủ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADM = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const T = Date.now();
const CHU = String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ (tên không được chứa dãy ≥ 8 chữ số)
const HOM_NAY = vnDate(0);
const HOM_QUA = vnDate(-1);
const NGAY_DI = vnDate(7);
const maLoi = (r) => r.body?.error?.code;
const MA_THO = /\b(SERVICE|GROUP|ATTRIBUTE|LD_[A-Z]{8}|ZLB\d|[av][0-9a-f]{12})\b/;

// Lần đọc danh mục đầu tiên của D1 có thể đồng bộ Sheet (đặt in_sheet = 0 cho mã giả) ⇒ đọc trước, rồi mới chèn mã riêng.
assert.equal((await call(SALES, "GET", "/api/catalog/for-order")).status, 200);
const AT = "'2026-01-01T00:00:00.000Z'";
const DV = { ZLB1: "Tour đảo luật bán", ZLB2: "Tour nhóm luật bán", ZLB3: "Tour đặc điểm luật bán", ZLB4: "Tour nhóm đặc điểm luật bán", ZLB5: "Tour thường luật bán" };
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ${Object.entries(DV).map(([c, n], i) => `('${c}','${n} ${CHU}','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,${180 + i},1,${AT},${AT})`).join(",")}
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);
const dv = (ma) => ({ kind: "catalog", catalogCode: ma, pax: { adult: 2 }, catalogPriceSeen: { adult: 100000 }, departDate: NGAY_DI, pickupChoice: "KHONG_DON" });
const than = (ma, extra = {}) => ({ customerName: `Khách Luật Bán ${CHU}`, customerPhone: "0913 579 135", services: [dv(ma)], ...extra });
const lap = (who, ma, extra = {}) => call(who, "POST", "/api/orders", than(ma, extra));
const lapOk = async (who, ma, extra = {}) => {
  const r = await lap(who, ma, extra);
  assert.equal(r.status, 201, `lập đơn ${ma}: ${JSON.stringify(r.body)}`);
  return r.body.order.id;
};
const moc = async (id) => (await sqlRows(`SELECT updated_at AS u FROM orders WHERE id = '${id}'`))[0].u;
const dong = async (id) => (await sqlRows(`SELECT status, booker_party_id AS b, updated_at AS u FROM orders WHERE id = '${id}'`))[0];
const yeuCauMo = async (id) => sqlRows(`SELECT id FROM ord_confirm_request WHERE order_id = '${id}' AND decided_at IS NULL`);
const demDon = async () => (await sqlRows(`SELECT count(*) AS n FROM orders WHERE customer_name = 'Khách Luật Bán ${CHU}'`))[0].n;
const biChan = (r, ten, nhan) => {
  assert.equal(r.status, 409, `${nhan}: ${JSON.stringify(r.body)}`);
  assert.equal(maLoi(r), "sales_blocked", nhan);
  assert.match(r.body.error.message, new RegExp(`${ten} ${CHU}`), `${nhan}: câu nêu tên dịch vụ`);
  assert.match(r.body.error.message, /không bán cho loại đối tác của bên đặt này/, nhan);
  assert.doesNotMatch(r.body.error.message, MA_THO, `${nhan}: câu không lộ mã thô`);
};
const datCo = (ma, can) => call(SUPER, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma, canXacNhan: can });

// ---- 0) Dựng
let r = await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten: `Tài xế taxi ${CHU}` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const L = r.body.loai.code;
const hoSo = async (ten, loai) => {
  const x = await call(SUPER, "POST", "/api/parties", { kind: "PERSON", fullName: `${ten} ${CHU}`, contacts: [{ kind: "PHONE", value: randomPhone() }] });
  assert.equal(x.status, 201, JSON.stringify(x.body));
  if (loai) assert.equal((await call(SUPER, "POST", `/api/parties/${x.body.party.id}/roles`, { roleTypeCode: loai })).status, 201, "gắn loại cho hồ sơ bên đặt");
  return x.body.party.id;
};
const P = await hoSo("Tài Xế Pê", L);
const Q = await hoSo("Khách Quy", null);
// Tài khoản Đối tác tạo bằng vai Cộng tác viên (loại có sẵn) qua route thật, rồi gắn THÊM loại mới: hồ sơ hai loại, một loại có luật ⇒ vẫn bị chặn (ADR-0146 tiêu chí 7).
r = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đối Tác Luật Bán ${CHU}`, phone: randomPhone(), roles: ["COLLABORATOR"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const DT = { cookie: (await login(r.body.staff.phone, r.body.pin)).cookie };
DT.partyId = (await call(DT.cookie, "GET", "/api/auth/me")).body.staff.partyId;
r = await call(SUPER, "POST", `/api/parties/${DT.partyId}/roles`, { roleTypeCode: L });
assert.equal(r.status, 201, `gắn loại cho hồ sơ của tài khoản Đối tác: ${JSON.stringify(r.body)}`);
r = await call(ADM, "POST", "/api/catalog/dac-diem", { ten: `Vận chuyển cảng ${CHU}`, giaTri: [{ ten: "Gồm" }, { ten: "Không gồm" }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const X = r.body.dacDiem.code;
const [x1, x2] = r.body.dacDiem.giaTri.map((v) => v.code);
const gan = async (ma, giaTri, dangThay) => {
  const x = await call(SALES, "PUT", `/api/catalog/${ma}/dac-diem/${X}`, { giaTri, dangThay });
  assert.equal(x.status, 200, `Bán hàng gắn ${ma}: ${JSON.stringify(x.body)}`);
};
await gan("ZLB3", x1, null);
await gan("ZLB4", x2, null);
await gan("ZLB5", x2, null);
const nhom = async (ten, codes) => {
  const g = await call(ADM, "POST", "/api/catalog/groups", { name: `${ten} ${CHU}` });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  assert.equal((await call(ADM, "PUT", "/api/catalog/group-assignments", { codes, groupCode: g.body.group.code })).status, 200);
  return g.body.group.code;
};
const G = await nhom("Nhóm luật bán", ["ZLB2"]);
const G2 = await nhom("Nhóm đặc điểm luật bán", ["ZLB4"]);
// Nháp lập TRƯỚC khi có luật.
const nhapLuu = await lapOk(SALES, "ZLB1", { bookerPartyId: P });
const nhapDoi = await lapOk(SALES, "ZLB1", { bookerPartyId: Q });
const daXn = await lapOk(SALES, "ZLB1", { bookerPartyId: Q });
assert.equal((await call(SALES, "POST", `/api/orders/${daXn}/status`, { status: "confirmed" })).status, 200);
assert.equal((await datCo("ZLB1", true)).status, 200);
const canXn = await lapOk(SALES, "ZLB1", { bookerPartyId: P });
const conVe = await lapOk(SALES, "ZLB1", { bookerPartyId: P });
assert.equal((await call(SALES, "POST", `/api/orders/${conVe}/gui-xac-nhan`, {})).status, 201, "mở yêu cầu xác nhận trước khi có luật");
assert.equal((await datCo("ZLB1", false)).status, 200);
const khongCan = await lapOk(SALES, "ZLB1", { bookerPartyId: P });
const nhapDt = await lapOk(DT.cookie, "ZLB1");
assert.equal((await dong(nhapDt)).b, DT.partyId, "máy chủ ép bên đặt = hồ sơ của Đối tác");
const dsTruoc = (await call(DT.cookie, "GET", "/api/catalog/for-order")).body;
for (const ma of Object.keys(DV)) assert.ok(dsTruoc.items.some((i) => i.code === ma), `trước khi có luật Đối tác thấy ${ma}`);
console.log("✓ 0) loại mới, hồ sơ P (mang loại) / Q, tài khoản Đối tác mang loại, đặc điểm hai giá trị, hai nhóm, năm dịch vụ giả; nháp lập trước luật");

// ---- 1) Bốn luật (Bán hàng — ô sales.block.write)
const luatIds = [];
const themLuat = async (body) => {
  const x = await call(SALES, "POST", "/api/pricing/luat-ban", { loai: L, ...body });
  assert.equal(x.status, 201, `thêm luật ${JSON.stringify(body)}: ${JSON.stringify(x.body)}`);
  assert.equal(x.headers.get("location"), "/luat-ban");
  luatIds.push(x.body.luat.id);
  return x.body.luat.id;
};
await themLuat({ phamVi: "SERVICE", catalogCode: "ZLB1" });
await themLuat({ phamVi: "GROUP", groupCode: G });
await themLuat({ phamVi: "ATTRIBUTE", attributeCode: X, valueCode: x1 });
await themLuat({ phamVi: "ATTRIBUTE", attributeCode: X, valueCode: x2, groupCode: G2 });
assert.equal((await sqlRows(`SELECT count(*) AS n FROM prc_sales_block WHERE role_type_code = '${L}' AND valid_from_date = '${HOM_NAY}' AND valid_to_date IS NULL`))[0].n, 4, "bốn dòng bắt đầu hôm nay");
console.log("✓ 1) Bán hàng thêm bốn luật (dịch vụ, nhóm, đặc điểm, đặc điểm kèm nhóm) ⇒ 201 + Location /luat-ban");

// ---- 2) Mọi cửa ghi đơn
const truoc = await demDon();
biChan(await lap(SALES, "ZLB1", { bookerPartyId: P }), DV.ZLB1, "lập đơn (luật dịch vụ)");
biChan(await lap(SALES, "ZLB2", { bookerPartyId: P }), DV.ZLB2, "lập đơn (luật nhóm)");
r = await lap(SALES, "ZLB3", { bookerPartyId: P });
biChan(r, DV.ZLB3, "lập đơn (luật đặc điểm)");
assert.match(r.body.error.message, new RegExp(`\\(Vận chuyển cảng ${CHU}: Gồm\\)`), "câu nêu (đặc điểm: giá trị)");
biChan(await lap(SALES, "ZLB4", { bookerPartyId: P }), DV.ZLB4, "lập đơn (luật đặc điểm kèm nhóm, dịch vụ trong nhóm)");
assert.equal(await demDon(), truoc, "409 không ghi đơn nào");
await lapOk(SALES, "ZLB5", { bookerPartyId: P }); // x2 ngoài nhóm G2 ⇒ đặt được
for (const ma of ["ZLB1", "ZLB2", "ZLB3", "ZLB4"]) await lapOk(SALES, ma, { bookerPartyId: Q });
await lapOk(SALES, "ZLB1");
console.log("✓ 2a) lập đơn hộ bên đặt mang loại ⇒ 409 sales_blocked cho cả bốn kiểu luật (câu nêu tên dịch vụ, «(đặc điểm: giá trị)», không mã thô), không ghi; x2 ngoài nhóm, bên đặt không loại, không bên đặt ⇒ 201");

let u = await moc(nhapLuu);
biChan(await call(SALES, "PUT", `/api/orders/${nhapLuu}`, { ...than("ZLB1", { bookerPartyId: P }), expectedUpdatedAt: u }), DV.ZLB1, "lưu nháp cũ");
assert.equal(await moc(nhapLuu), u, "409 không ghi nháp");
for (const [id, nhan] of [[nhapDoi, "nháp"], [daXn, "đã xác nhận"]]) {
  u = await moc(id);
  biChan(await call(SALES, "PUT", `/api/orders/${id}/booker`, { customerName: `Khách Luật Bán ${CHU}`, customerPhone: "0913 579 135", bookerPartyId: P, expectedUpdatedAt: u }), DV.ZLB1, `đổi bên đặt (${nhan})`);
  assert.equal((await dong(id)).b, Q, `đổi bên đặt (${nhan}): bên đặt giữ nguyên`);
}
console.log("✓ 2b) lưu nháp cũ ⇒ 409; đổi bên đặt sang hồ sơ mang loại ⇒ 409 cả nháp lẫn đã xác nhận, bên đặt giữ nguyên");

assert.equal((await datCo("ZLB1", true)).status, 200);
try {
  biChan(await call(SALES, "POST", `/api/orders/${canXn}/status`, { status: "confirmed" }), DV.ZLB1, "/status đơn «cần xác nhận» + bị chặn (Q-1 (a))");
  biChan(await call(SALES, "POST", `/api/orders/${canXn}/gui-xac-nhan`, {}), DV.ZLB1, "Gửi xác nhận");
  assert.equal((await yeuCauMo(canXn)).length, 0, "Gửi xác nhận bị chặn không mở yêu cầu");
  assert.equal((await dong(canXn)).status, "draft");
  const [yc] = await yeuCauMo(conVe);
  assert.ok(yc, "yêu cầu mở trước khi có luật vẫn còn");
  biChan(await call(ADM, "POST", `/api/orders/${conVe}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: yc.id, updatedAt: await moc(conVe) }), DV.ZLB1, "Còn vé");
  assert.equal((await dong(conVe)).status, "draft", "Còn vé bị chặn: đơn vẫn nháp");
  assert.equal((await yeuCauMo(conVe)).length, 1, "Còn vé bị chặn: yêu cầu vẫn mở");
} finally {
  assert.equal((await datCo("ZLB1", false)).status, 200);
}
biChan(await call(SALES, "POST", `/api/orders/${khongCan}/status`, { status: "confirmed" }), DV.ZLB1, "/status đơn không cần xác nhận");
biChan(await call(SALES, "POST", `/api/orders/${khongCan}/gui-xac-nhan`, {}), DV.ZLB1, "Gửi xác nhận đơn không cần xác nhận (không phải confirm_not_required)");
biChan(await call(DT.cookie, "POST", `/api/orders/${nhapDt}/gui-don`, {}), DV.ZLB1, "Gửi đơn của Đối tác");
assert.equal((await dong(nhapDt)).status, "draft", "Gửi đơn bị chặn: đơn ở lại nháp");
assert.equal((await yeuCauMo(nhapDt)).length, 0);
biChan(await lap(DT.cookie, "ZLB1"), DV.ZLB1, "Đối tác lập thẳng");
const dtKhac = await lapOk(DT.cookie, "ZLB5");
assert.equal((await call(DT.cookie, "POST", `/api/orders/${dtKhac}/gui-don`, {})).status, 200, "Đối tác gửi đơn dịch vụ không bị chặn");
console.log("✓ 2c) /status «cần xác nhận» + bị chặn ⇒ sales_blocked (Q-1 (a)); Gửi xác nhận ⇒ 409 không mở yêu cầu; Còn vé ⇒ 409, đơn nháp, yêu cầu còn mở; đơn không cần xác nhận cũng 409 ở /status và Gửi xác nhận; Gửi đơn / lập thẳng của Đối tác ⇒ 409, dịch vụ khác gửi được");

// ---- 3) Tắt loại còn luật
r = await call(ACC, "POST", `/api/pricing/loai-doi-tac/${L}/tat`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "loai_con_luat_ban");
assert.doesNotMatch(r.body.error.message, MA_THO);
assert.equal((await sqlRows(`SELECT active AS a FROM pty_role_type WHERE code = '${L}'`))[0].a, 1, "409 không tắt loại");
console.log("✓ 3) tắt loại còn luật ⇒ 409 loai_con_luat_ban, loại vẫn bật");

// ---- 4) for-order
const ds = async (who) => {
  const x = await call(who, "GET", "/api/catalog/for-order");
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return { ma: new Set(x.body.items.map((i) => i.code)), nhom: new Set((x.body.groups ?? []).map((g) => g.code)) };
};
const dsDt = await ds(DT.cookie);
assert.deepEqual(Object.keys(DV).filter((m) => dsDt.ma.has(m)), ["ZLB5"], "Đối tác thiếu đúng bốn dịch vụ bị chặn");
assert.ok(!dsDt.nhom.has(G) && !dsDt.nhom.has(G2), "chip của nhóm không còn dịch vụ nào không hiện");
const dsBh = await ds(SALES);
assert.deepEqual(Object.keys(DV).filter((m) => dsBh.ma.has(m)), Object.keys(DV), "Bán hàng thấy đủ");
assert.ok(dsBh.nhom.has(G) && dsBh.nhom.has(G2), "Bán hàng thấy hai chip nhóm");
console.log("✓ 4) for-order: Đối tác mang loại thiếu đúng ZLB1–ZLB4, hai chip nhóm rỗng biến mất; Bán hàng thấy đủ");

// ---- 5) R-1 trên D1 thật: «Kết thúc ngay» luật bắt đầu hôm nay ⇒ ngày kết thúc = hôm qua (CHECK `date(valid_from_date, '-1 day')`), thôi chặn ngay
r = await call(SALES, "POST", `/api/pricing/luat-ban/${luatIds[0]}/ket-thuc`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await sqlRows(`SELECT valid_to_date AS d FROM prc_sales_block WHERE id = '${luatIds[0]}'`))[0].d, HOM_QUA, "Kết thúc ngay = hôm qua (khoảng rỗng)");
assert.equal((await call(SALES, "POST", `/api/pricing/luat-ban/${luatIds[0]}/ket-thuc`, {})).status, 409, "kết thúc lần hai ⇒ 409");
await lapOk(SALES, "ZLB1", { bookerPartyId: P });
u = await moc(nhapLuu);
assert.equal((await call(SALES, "PUT", `/api/orders/${nhapLuu}`, { ...than("ZLB1", { bookerPartyId: P }), expectedUpdatedAt: u })).status, 200, "nháp cũ lưu được ngay");
console.log("✓ 5) R-1 trên D1: «Kết thúc ngay» ⇒ 200, ngày kết thúc = hôm qua (CHECK date() chạy trên D1); lần hai 409; lập đơn 201 ngay, nháp cũ lưu được");

// ---- 6) Dọn
for (const id of luatIds.slice(1)) assert.equal((await call(SALES, "POST", `/api/pricing/luat-ban/${id}/ket-thuc`, {})).status, 200, `kết thúc luật ${id}`);
assert.equal((await call(SALES, "POST", `/api/orders/${conVe}/rut-xac-nhan`, {})).status, 200, "rút yêu cầu còn mở");
await gan("ZLB3", null, x1);
await gan("ZLB4", null, x2);
await gan("ZLB5", null, x2);
const dd = (await call(ADM, "GET", "/api/catalog/dac-diem")).body.dacDiem.find((a) => a.code === X);
r = await call(ADM, "PATCH", `/api/catalog/dac-diem/${X}`, { expectedUpdatedAt: dd.capNhatLuc, dangDung: false });
assert.equal(r.status, 200, `tắt đặc điểm thử: ${JSON.stringify(r.body)}`);
r = await call(ACC, "POST", `/api/pricing/loai-doi-tac/${L}/tat`, {});
assert.equal(r.status, 200, `kết thúc hết luật rồi tắt loại ⇒ 200: ${JSON.stringify(r.body)}`);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM ctl_attribute_assignment WHERE attribute_code = '${X}' AND valid_to_at IS NULL`))[0].n, 0, "không còn dòng gắn mở");
console.log("✓ 6) dọn: kết thúc mọi luật, rút yêu cầu, đóng dòng gắn, tắt đặc điểm; kết thúc hết luật rồi tắt loại ⇒ 200");
console.log("E2E LUAT BAN OK");
