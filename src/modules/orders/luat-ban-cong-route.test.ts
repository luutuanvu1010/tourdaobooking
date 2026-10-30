// CỔNG LUẬT BÁN ở bảy cửa ghi đơn (ADR-0146 Đ3, tiêu chí 1, 2, 3, 7, 9, 11, 12 theo R-7, 13; ADR-0152 tiêu chí 8, 9, 11, 15, 16, 17b; kế hoạch 2026-10-30 T8, R-2, R-4; chủ chọn
// Q-1 (a): cổng luật bán đứng TRƯỚC «cần xác nhận» ở `/status` và Gửi xác nhận). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
// Loại đối tác, hồ sơ bên đặt, vai, luật bán, đặc điểm, nhóm dịch vụ dựng bằng ROUTE thật. Dịch vụ danh mục và cờ «cần xác nhận» dùng khung chung `xac-nhan-khung.mjs` (chèn thẳng
// như mọi bài xác nhận). Hai ca của R-7 dựng «nháp cũ» bằng sửa thẳng bảng của chính `orders` (thiếu người lớn; lệch giá danh mục) — như các bài nháp cũ khác: lập / lưu nháp mới đã chặn ca đó.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, INTERN, PARTNER, SUP, datCo, inDays, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const D = inDays(3);
type W = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Loại đối tác + hồ sơ bên đặt mang loại (P), hồ sơ không mang loại (Q), luật bán — đều qua route. */
async function the(w: W) {
  const L = String((await w.call("POST", "/api/pricing/loai-doi-tac", { as: SUP, body: { ten: "Tài xế taxi thử" } })).json.loai.code);
  const hoSo = async (ten: string, so: string, loai: string | null) => {
    const r = await w.call("POST", "/api/parties", { as: SUP, body: { kind: "PERSON", fullName: ten, contacts: [{ kind: "PHONE", value: so }] } });
    assert.equal(r.status, 201, r.text);
    const id = String(r.json.party.id);
    if (loai) assert.equal((await w.call("POST", `/api/parties/${id}/roles`, { as: SUP, body: { roleTypeCode: loai } })).status, 201);
    return id;
  };
  return { L, hoSo, P: await hoSo("Tài Xế Pê", "0912000301", L), Q: await hoSo("Khách Quy", "0912000302", null) };
}
const luat = async (w: W, body: Record<string, unknown>) => {
  const r = await w.call("POST", "/api/pricing/luat-ban", { as: A, body });
  assert.equal(r.status, 201, r.text);
  return String(r.json.luat.id);
};
const than = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });
const lap = (w: W, as: string, services: unknown[], extra: Record<string, unknown> = {}) => w.call("POST", "/api/orders", { as, body: than(services, extra) });
async function lapOk(w: W, as: string, services: unknown[], extra: Record<string, unknown> = {}) {
  const r = await lap(w, as, services, extra);
  assert.equal(r.status, 201, r.text);
  return String(r.json.order.id);
}
const moc = (w: W, id: string) => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u as string;
const trangThai = (w: W, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status as string;
const yeuCauMo = (w: W, id: string) => w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id) as { id: string }[];
const demDon = (w: W) => Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
const luu = (w: W, as: string, id: string, services: unknown[], extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${id}`, { as, body: { ...than(services, extra), expectedUpdatedAt: moc(w, id) } });
const xacNhan = (w: W, as: string, id: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const biChan = (r: { status: number; text: string; json: any }, ten = /Tour đảo/) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "sales_blocked", r.text);
  assert.match(r.json.error.message, ten);
  assert.match(r.json.error.message, /không bán cho loại đối tác của bên đặt này/);
};

test("ADR-0146 tiêu chí 1, 2, 7 + Đ2: lập đơn hộ bên đặt mang loại bị chặn ⇒ 409, KHÔNG ghi đơn; dịch vụ khác, bên đặt không loại, không bên đặt ⇒ 201; hồ sơ hai loại (một có luật) ⇒ chặn", async () => {
  const w = setup();
  const { L, P, Q, hoSo } = await the(w);
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  const truoc = demDon(w);
  biChan(await lap(w, A, [svc("ZA1", D)], { bookerPartyId: P }));
  biChan(await lap(w, A, [svc("ZB1", D), svc("ZA1", D)], { bookerPartyId: P }));
  assert.equal(demDon(w), truoc, "409 không ghi dòng nào");
  await lapOk(w, A, [svc("ZB1", D)], { bookerPartyId: P });
  await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  await lapOk(w, A, [svc("ZA1", D)]);
  // Tiêu chí 7: hồ sơ mang hai loại, chỉ một loại có luật ⇒ vẫn chặn.
  const L2 = String((await w.call("POST", "/api/pricing/loai-doi-tac", { as: SUP, body: { ten: "Lễ tân thử" } })).json.loai.code);
  const P2 = await hoSo("Hai Loại", "0912000303", L2);
  assert.equal((await w.call("POST", `/api/parties/${P2}/roles`, { as: SUP, body: { roleTypeCode: L } })).status, 201);
  biChan(await lap(w, A, [svc("ZA1", D)], { bookerPartyId: P2 }));
});

test("ADR-0146 Đ3 «nháp cũ bị chặn khi lưu» + kết thúc luật (tiêu chí 5, A 12b): nháp lập trước luật ⇒ lưu 409; thêm dịch vụ bị chặn vào nháp ⇒ 409; kết thúc luật ⇒ lưu được ngay", async () => {
  const w = setup();
  const { L, P } = await the(w);
  const id = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P });
  const id2 = await lapOk(w, A, [svc("ZB1", D)], { bookerPartyId: P });
  const lb = await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  biChan(await luu(w, A, id, [svc("ZA1", D)], { bookerPartyId: P }));
  biChan(await luu(w, A, id2, [svc("ZB1", D), svc("ZA1", D)], { bookerPartyId: P }));
  assert.equal((await luu(w, A, id2, [svc("ZB1", D)], { bookerPartyId: P })).status, 200);
  assert.equal((await w.call("POST", `/api/pricing/luat-ban/${lb}/ket-thuc`, { as: A, body: {} })).status, 200);
  assert.equal((await luu(w, A, id, [svc("ZA1", D)], { bookerPartyId: P })).status, 200, "kết thúc luật: thôi chặn từ hôm nay");
});

test("ADR-0146 tiêu chí 3: đổi bên đặt sang hồ sơ bị chặn ⇒ 409 cả nháp lẫn đã xác nhận (bên đặt giữ nguyên); đổi sang hồ sơ không bị chặn ⇒ 200; không đổi bên đặt ⇒ không xét", async () => {
  const w = setup();
  const { L, P, Q, hoSo } = await the(w);
  const nhap = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  const daXn = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  assert.equal((await xacNhan(w, A, daXn)).status, 200);
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  const doi = (id: string, bookerPartyId: string) =>
    w.call("PUT", `/api/orders/${id}/booker`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId, expectedUpdatedAt: moc(w, id) } });
  for (const id of [nhap, daXn]) {
    biChan(await doi(id, P));
    assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, Q, "409 không đổi bên đặt");
  }
  assert.equal((await doi(nhap, Q)).status, 200, "không đổi bên đặt (chỉ gửi lại) ⇒ không xét luật");
  const R = await hoSo("Khách Rờ", "0912000304", null);
  assert.equal((await doi(daXn, R)).status, 200);
});

test("Q-1 (a) + tiêu chí 11, 13: /status trên đơn «cần xác nhận» + bị chặn ⇒ sales_blocked (không confirm_request_required); Gửi xác nhận ⇒ 409, không mở yêu cầu; Gửi xác nhận trên đơn không cần xác nhận + bị chặn ⇒ sales_blocked (không confirm_not_required)", async () => {
  const w = setup();
  const { L, P, Q } = await the(w);
  datCo(w, "SERVICE", "ZA1", true);
  const can = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P });
  const khong = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P });
  const doiChung = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  assert.equal((await xacNhan(w, A, doiChung)).json.error.code, "confirm_request_required", "đối chứng: bên đặt không loại ⇒ cổng «cần xác nhận» như cũ");
  biChan(await xacNhan(w, A, can));
  biChan(await w.call("POST", `/api/orders/${can}/gui-xac-nhan`, { as: A, body: {} }));
  assert.equal(yeuCauMo(w, can).length, 0, "không mở yêu cầu");
  assert.equal(trangThai(w, can), "draft");
  datCo(w, "SERVICE", "ZA1", false);
  biChan(await w.call("POST", `/api/orders/${khong}/gui-xac-nhan`, { as: A, body: {} }));
  biChan(await xacNhan(w, A, khong));
  assert.equal(trangThai(w, khong), "draft");
});

test("Còn vé (tiêu chí 11 A): yêu cầu mở TRƯỚC khi có luật ⇒ người xét duyệt bấm Còn vé nhận 409 sales_blocked; đơn VẪN nháp, yêu cầu VẪN mở", async () => {
  const w = setup();
  const { L, P } = await the(w);
  datCo(w, "SERVICE", "ZA1", true);
  const id = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P });
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  const y = yeuCauMo(w, id)[0]!;
  biChan(await w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: y.id, updatedAt: moc(w, id) } }));
  assert.equal(trangThai(w, id), "draft");
  assert.equal(yeuCauMo(w, id).length, 1);
});

test("ADR-0146 tiêu chí 11 + Đ4 cửa: Đối tác mang loại bị chặn — lập đơn thẳng 409; Gửi đơn nháp lập trước luật ⇒ 409, đơn ở lại nháp, không yêu cầu; dịch vụ khác đặt được", async () => {
  const w = setup();
  const { L } = await the(w);
  const hoSoDt = String(w.q("SELECT party_id AS p FROM staff WHERE id = ?", PARTNER)[0].p);
  const vai = await w.call("POST", `/api/parties/${hoSoDt}/roles`, { as: SUP, body: { roleTypeCode: L } });
  assert.equal(vai.status, 201, vai.text);
  const id = await lapOk(w, PARTNER, [svc("ZA1", D)]);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, hoSoDt, "máy chủ ép bên đặt = hồ sơ của Đối tác");
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  biChan(await lap(w, PARTNER, [svc("ZA1", D)]));
  const gui = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  biChan(gui);
  assert.equal(trangThai(w, id), "draft");
  assert.equal(yeuCauMo(w, id).length, 0);
  const khac = await lapOk(w, PARTNER, [svc("ZB1", D)]);
  assert.equal((await w.call("POST", `/api/orders/${khac}/gui-don`, { as: PARTNER, body: {} })).status, 200);
});

test("R-7 (Q-8 (a)) — tiêu chí 12 của ADR-0146: luật bán đứng ĐẦU kiemCongXacNhan — đơn vừa dính luật bán vừa dính từng cổng khác ⇒ luôn sales_blocked (đối chứng bên đặt không loại ⇒ cổng kia)", async () => {
  const w = setup({ mocGiaChoBaiKhongKiemMoc: 360 });
  const { L, P, Q } = await the(w);
  // (1) chưa chọn Đón / Không đón (ADR-0134 Đ2).
  const chuaChon = (b: string) => lapOk(w, A, [svc("ZA1", D, [], { pickupChoice: null })], { bookerPartyId: b });
  const [c1, c1q] = [await chuaChon(P), await chuaChon(Q)];
  // (2) thiếu người lớn — «nháp cũ» (lập / lưu nháp mới đã chặn): sửa thẳng số khách của chính bảng orders.
  const [c2, c2q] = [await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P }), await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q })];
  for (const id of [c2, c2q]) w.sqlite.prepare("UPDATE order_service SET pax_adult = 0, pax_child = 2 WHERE order_id = ?").run(id);
  // (3) nhóm tắt đưa đón (ADR-0118 Đ3 (b)) — nhóm, gán, tắt cờ bằng route.
  const g = (await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm có xe" } })).json.group;
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["ZA1"], groupCode: g.code } })).status, 200);
  const coXe = (b: string) => lapOk(w, A, [svc("ZA1", D, [leg(D, "07:00")])], { bookerPartyId: b });
  const [c3, c3q] = [await coXe(P), await coXe(Q)];
  const g2 = (await w.call("GET", "/api/catalog/groups", { as: ADM })).json.groups.find((x: { code: string }) => x.code === g.code);
  assert.equal((await w.call("PATCH", `/api/catalog/groups/${g.code}`, { as: ADM, body: { expectedUpdatedAt: g2.updatedAt, transferEnabled: false } })).status, 200);
  // (4) R2 giá danh mục của Thực tập — «nháp cũ» lệch giá (lập / lưu nháp mới đã chặn): sửa thẳng giá danh mục chụp trên dòng tiền của chính bảng orders.
  const [c4, c4q] = [await lapOk(w, INTERN, [svc("ZA1", D)], { bookerPartyId: P }), await lapOk(w, INTERN, [svc("ZA1", D)], { bookerPartyId: Q })];
  for (const id of [c4, c4q]) w.sqlite.prepare("UPDATE order_item SET catalog_price = unit_price + 50000 WHERE order_id = ?").run(id);
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  assert.equal((await xacNhan(w, A, c1q)).json.error.code, "pickup_choice_required");
  biChan(await xacNhan(w, A, c1));
  assert.equal((await xacNhan(w, A, c2q)).json.error.code, "thieu_nguoi_lon");
  biChan(await xacNhan(w, A, c2));
  assert.equal((await xacNhan(w, A, c3q)).json.error.code, "transfer_disabled");
  biChan(await xacNhan(w, A, c3));
  assert.equal((await xacNhan(w, INTERN, c4q)).status, 403, "đối chứng R2: Thực tập xác nhận dòng lệch giá ⇒ 403");
  biChan(await xacNhan(w, INTERN, c4));
});

test("ADR-0146 tiêu chí 9: gộp hồ sơ KHÔNG loại vào hồ sơ mang loại bị chặn ⇒ nháp bị chặn ở lần lưu / xác nhận kế tiếp; đơn đã xác nhận giữ nguyên", async () => {
  const w = setup();
  const { L, P, Q } = await the(w);
  const nhap = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  const daXn = await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  assert.equal((await xacNhan(w, A, daXn)).status, 200);
  await luat(w, { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" });
  const gop = await w.call("POST", `/api/parties/${Q}/merge`, { as: SUP, body: { intoPartyId: P, xacNhan: "Khách Quy" } });
  assert.equal(gop.status, 200, gop.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", nhap)[0].b, P);
  biChan(await xacNhan(w, A, nhap));
  assert.equal(trangThai(w, daXn), "confirmed", "đơn đã xác nhận không bị xét lại");
});

test("ADR-0152 tiêu chí 8, 9, 15, 16, 17b + 11 (Còn vé): luật theo ĐẶC ĐIỂM — câu báo nêu «(đặc điểm: giá trị)»; giá trị khác / ngoài nhóm đặt được; đổi giá trị: nháp bị chặn ở lần lưu kế, đơn đã xác nhận giữ nguyên, sửa số khách vẫn 200; tắt rồi bật lại, gắn lại ⇒ chặn lại", async () => {
  const w = setup();
  const { L, P, Q } = await the(w);
  const dd = (await w.call("POST", "/api/catalog/dac-diem", { as: ADM, body: { ten: "Vận chuyển cảng–đảo", giaTri: [{ ten: "Gồm" }, { ten: "Không gồm" }] } })).json.dacDiem;
  const [X, x1, x2] = [dd.code as string, dd.giaTri[0].code as string, dd.giaTri[1].code as string];
  const gan = async (code: string, giaTri: string | null, dangThay: string | null) =>
    assert.equal((await w.call("PUT", `/api/catalog/${code}/dac-diem/${X}`, { as: A, body: { giaTri, dangThay } })).status, 200);
  await gan("ZA1", x1, null);
  await gan("ZB1", x2, null);
  const daXn = await lapOk(w, A, [svc("ZB1", D)], { bookerPartyId: P });
  assert.equal((await xacNhan(w, A, daXn)).status, 200);
  const nhap = await lapOk(w, A, [svc("ZB1", D)], { bookerPartyId: P });
  datCo(w, "SERVICE", "ZB1", true);
  const choXn = await lapOk(w, A, [svc("ZB1", D)], { bookerPartyId: P });
  assert.equal((await w.call("POST", `/api/orders/${choXn}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
  datCo(w, "SERVICE", "ZB1", false);
  await luat(w, { loai: L, phamVi: "ATTRIBUTE", attributeCode: X, valueCode: x1 });
  // Tiêu chí 8.
  const r = await lap(w, A, [svc("ZA1", D)], { bookerPartyId: P });
  biChan(r);
  assert.match(r.json.error.message, /\(Vận chuyển cảng–đảo: Gồm\)/);
  await lapOk(w, A, [svc("ZB1", D)], { bookerPartyId: P });
  await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: Q });
  // Tiêu chí 9: luật kèm nhóm — dịch vụ mang x1 NGOÀI nhóm đặt được, TRONG nhóm bị chặn.
  const L2 = String((await w.call("POST", "/api/pricing/loai-doi-tac", { as: SUP, body: { ten: "Lễ tân thử" } })).json.loai.code);
  const P2 = String((await w.call("POST", "/api/parties", { as: SUP, body: { kind: "PERSON", fullName: "Lễ Tân Hai", contacts: [{ kind: "PHONE", value: "0912000309" }] } })).json.party.id);
  assert.equal((await w.call("POST", `/api/parties/${P2}/roles`, { as: SUP, body: { roleTypeCode: L2 } })).status, 201);
  const g = (await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm đảo xa" } })).json.group.code as string;
  await luat(w, { loai: L2, phamVi: "ATTRIBUTE", attributeCode: X, valueCode: x1, groupCode: g });
  await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P2 });
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["ZA1"], groupCode: g } })).status, 200);
  biChan(await lap(w, A, [svc("ZA1", D)], { bookerPartyId: P2 }));
  // Tiêu chí 15, 16, 11 (Còn vé): đổi ZB1 sang x1.
  await gan("ZB1", x1, x2);
  const truoc = w.q("SELECT status, updated_at, total FROM orders WHERE id = ?", daXn)[0];
  const nkTruoc = Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", daXn)[0].n);
  assert.deepEqual(w.q("SELECT status, updated_at, total FROM orders WHERE id = ?", daXn)[0], truoc);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", daXn)[0].n), nkTruoc, "không nhật ký trên đơn");
  const sv = String(w.q("SELECT id FROM order_service WHERE order_id = ?", daXn)[0].id);
  const sua = await w.call("POST", `/api/orders/${daXn}/money-edit`, { as: ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: sv, pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, `sửa số khách sau xác nhận không qua cổng luật bán: ${sua.text}`);
  biChan(await luu(w, A, nhap, [svc("ZB1", D)], { bookerPartyId: P }), /Tour thường/);
  const y = yeuCauMo(w, choXn)[0]!;
  biChan(await w.call("POST", `/api/orders/${choXn}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: y.id, updatedAt: moc(w, choXn) } }), /Tour thường/);
  await gan("ZB1", x2, x1);
  assert.equal((await luu(w, A, nhap, [svc("ZB1", D)], { bookerPartyId: P })).status, 200, "đổi ngược ⇒ lưu được");
  // 17b: bỏ x1 khỏi mọi dịch vụ, tắt x1, bật lại, gắn lại ⇒ luật cũ chặn lại.
  await gan("ZA1", null, x1);
  const gt = () => (w.call("GET", "/api/catalog/dac-diem", { as: ADM }) as Promise<any>).then((r: any) => r.json.dacDiem[0].giaTri.find((v: { code: string }) => v.code === x1));
  assert.equal((await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x1}`, { as: ADM, body: { expectedUpdatedAt: (await gt()).capNhatLuc, dangDung: false } })).status, 200);
  await lapOk(w, A, [svc("ZA1", D)], { bookerPartyId: P });
  assert.equal((await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x1}`, { as: ADM, body: { expectedUpdatedAt: (await gt()).capNhatLuc, dangDung: true } })).status, 200);
  await gan("ZA1", x1, null);
  biChan(await lap(w, A, [svc("ZA1", D)], { bookerPartyId: P }));
});
