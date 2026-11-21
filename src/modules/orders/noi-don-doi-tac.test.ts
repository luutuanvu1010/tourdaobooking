// ADR-0221 — kế hoạch 2026-11-21, lượt 1: «Đối tác không nhập nơi đón». Ba phần:
//  (A) lập / lưu nháp: người gọi giữ quyền Đối tác VÀ công tắc bật ⇒ lượt chiều đi không nơi đón được máy chủ ghi chữ tạm; mọi trường hợp khác 400 như trước;
//  (B) cổng 409 `pickup_place_required` THEO DỮ LIỆU ở mọi đường xác nhận (`/status`, Còn vé, Gửi đơn không bao giờ tự xác nhận đơn còn chữ tạm);
//  (C) Còn vé nhận `noiDon[]`, ghi nơi đón thật trong CÙNG lô xác nhận, ghi kép `order_service.pickup_place` cho lượt chiều đi đầu, có nhật ký; chữ tạm bị từ chối.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Khuôn con-ve-chot-gio.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, LAI, LOC, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { NOI_DON_CHUA_GHI } from "../../shared/chang-dua-don.ts";

const NGAY = () => inDays(3);
const CAU_409 = "Còn lượt đưa đón chưa có nơi đón. Ghi nơi đón rồi bấm Còn vé, xác nhận đơn.";
/** Lượt chiều đi KHÔNG nơi đón (form đối tác lúc công tắc bật gửi đúng thế này: nơi đón rỗng, giờ rỗng). */
const khongNoi = (gio: string | null = null) => ({ ...leg(NGAY(), gio), pickupLocationId: null, pickupPlace: "" });
const than = (services: unknown[]) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services });
const bat = async (w: any, b = true) => assert.equal((await w.call("POST", "/api/cai-dat/noi-don-doi-tac", { as: SUP, body: { bat: b } })).status, 200);
const changCua = (w: any, id: string) => w.q("SELECT id, direction, pickup_location_id loc, pickup_place place, pickup_time gio, updated_by ub FROM ord_transfer_leg WHERE order_id = ? AND closed_at IS NULL ORDER BY direction, id", id).map((r: any) => ({ ...r }));
const cotCu = (w: any, id: string) => w.q("SELECT pickup_place p FROM order_service WHERE order_id = ? ORDER BY sort_order", id).map((r: any) => r.p);
const trangThai = (w: any, id: string) => w.q("SELECT status s FROM orders WHERE id = ?", id)[0].s;
const soNhatKy = (w: any, id: string) => w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", id)[0].n;
const hoSo = (w: any, id: string) => JSON.stringify({ c: changCua(w, id), s: cotCu(w, id), t: trangThai(w, id), n: soNhatKy(w, id), yc: w.q("SELECT id, decided_at FROM ord_confirm_request WHERE order_id = ?", id).map((r: any) => ({ ...r })) });
function qd(w: any, id: string, as: string, extra: Record<string, unknown> = {}) {
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0];
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: y?.id, updatedAt: moc.u, ketQua: "CON_VE", ...extra } });
}
const la409 = (r: any, legIds: string[]) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "pickup_place_required");
  assert.equal(r.json.error.message, CAU_409);
  assert.deepEqual(r.json.error.legs, legIds.map((legId) => ({ legId })));
};
/** Công tắc bật, Đối tác lập đơn một lượt không nơi đón (không giờ), Gửi đơn ⇒ đơn chờ văn phòng. */
async function donCho(w: any, dichVu: unknown[] = [svc("ZB1", NGAY(), [khongNoi()])]) {
  await bat(w);
  const o = await lap(w, PARTNER, dichVu);
  const g = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(g.status, 201, g.text);
  assert.equal(g.json.nhanh, "A");
  return { id: o.id as string, o, legId: o.services[0].legs[0].id as string };
}

// ---- (A) lập / lưu nháp ----
test("(A1) công tắc TẮT (mặc định): Đối tác gửi lượt không nơi đón ⇒ 400 «cần nơi đón», không tạo đơn", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: than([svc("ZB1", NGAY(), [khongNoi()])]) });
  assert.equal(r.status, 400, r.text);
  assert.match(r.json.error.message, /cần nơi đón/);
  assert.equal(w.q("SELECT count(*) n FROM orders")[0].n, 0);
});

test("(A2) công tắc BẬT: Đối tác và tài khoản lai lập được; lượt mang chữ tạm, cột cũ order_service.pickup_place NULL; Bán hàng, Toàn quyền vẫn 400", async () => {
  const w = setup();
  await bat(w);
  for (const ai of [PARTNER, LAI]) {
    const r = await w.call("POST", "/api/orders", { as: ai, body: than([svc("ZB1", NGAY(), [khongNoi()])]) });
    assert.equal(r.status, 201, `${ai}: ${r.text}`);
    const c = changCua(w, r.json.order.id);
    assert.equal(c.length, 1);
    assert.deepEqual([c[0].loc, c[0].place], [null, NOI_DON_CHUA_GHI]);
    assert.deepEqual(cotCu(w, r.json.order.id), [null], "cột cũ không mang chữ tạm");
  }
  for (const ai of [A, SUP]) {
    const r = await w.call("POST", "/api/orders", { as: ai, body: than([svc("ZB1", NGAY(), [khongNoi()])]) });
    assert.equal(r.status, 400, `${ai}: ${r.text}`);
    assert.match(r.json.error.message, /cần nơi đón/);
  }
});

test("(A3) công tắc BẬT: chỉ lượt CHIỀU ĐI được điền; chiều về không nơi đón vẫn 400; lượt có nơi thật giữ nguyên", async () => {
  const w = setup();
  await bat(w);
  const ve = { ...khongNoi("16:00"), direction: "RETURN" };
  const sai = await w.call("POST", "/api/orders", { as: PARTNER, body: than([svc("ZB1", NGAY(), [khongNoi(), ve])]) });
  assert.equal(sai.status, 400, sai.text);
  assert.match(sai.json.error.message, /cần nơi đón/);
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  assert.equal(changCua(w, o.id)[0].place, "Khách sạn Dò Tìm");
});

test("(A4) lưu nháp (PUT): BẬT ⇒ Đối tác lưu lại lượt với nơi đón rỗng được (chữ tạm); TẮT ⇒ 400, nháp giữ nguyên", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  const sua = (upd: string) => w.call("PUT", `/api/orders/${o.id}`, { as: PARTNER, body: { ...than([{ ...svc("ZB1", NGAY(), [{ ...khongNoi(), id: o.services[0].legs[0].id }]), id: o.services[0].id }]), expectedUpdatedAt: upd } });
  const tat = await sua(o.updatedAt);
  assert.equal(tat.status, 400, tat.text);
  assert.match(tat.json.error.message, /cần nơi đón/);
  assert.equal(changCua(w, o.id)[0].place, "Khách sạn Dò Tìm");
  await bat(w);
  const r = await sua(o.updatedAt);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([changCua(w, o.id)[0].loc, changCua(w, o.id)[0].place], [null, NOI_DON_CHUA_GHI]);
  assert.deepEqual(cotCu(w, o.id), [null]);
});

// ---- (B) cổng xác nhận theo dữ liệu ----
test("(B1) Còn vé không kèm noiDon ⇒ 409 pickup_place_required kèm legs, không ghi gì; đơn vẫn chờ", async () => {
  const w = setup();
  const { id, legId } = await donCho(w);
  const truoc = hoSo(w, id);
  la409(await qd(w, id, B, { gioDon: [{ legId, pickupTime: "09:00" }] }), [legId]);
  assert.equal(hoSo(w, id), truoc, "không ghi gì");
  la409(await qd(w, id, B, { gioDon: [{ legId, pickupTime: "09:00" }], noiDon: [] }), [legId]);
  assert.equal(hoSo(w, id), truoc);
});

test("(B2) cổng theo DỮ LIỆU: công tắc bị TẮT sau lúc đối tác gửi ⇒ Còn vé vẫn 409; điền nơi đón thì qua", async () => {
  const w = setup();
  const { id, legId } = await donCho(w);
  await bat(w, false);
  la409(await qd(w, id, B, { gioDon: [{ legId, pickupTime: "09:00" }] }), [legId]);
  const r = await qd(w, id, B, { gioDon: [{ legId, pickupTime: "09:00" }], noiDon: [{ legId, pickupPlace: "Khách sạn Sao Mai" }] });
  assert.equal(r.status, 200, r.text);
});

test("(B3) /status: Bán hàng gõ thẳng chữ tạm vào nơi đón rồi bấm xác nhận ⇒ 409 pickup_place_required, đơn nháp, không ghi gì", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", NGAY(), [{ ...leg(NGAY(), "09:00"), pickupPlace: NOI_DON_CHUA_GHI }])]);
  const truoc = hoSo(w, o.id);
  la409(await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } }), [o.services[0].legs[0].id]);
  assert.equal(hoSo(w, o.id), truoc);
});

test("(B4) Gửi đơn: lượt mang chữ tạm ĐÃ CÓ GIỜ, dịch vụ không cần kiểm vé ⇒ vẫn nhánh A (không tự xác nhận); đơn chờ văn phòng", async () => {
  const w = setup();
  const { id } = await donCho(w, [svc("ZB1", NGAY(), [khongNoi("09:00")])]);
  assert.equal(trangThai(w, id), "draft");
  assert.equal(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].n, 1);
});

test("(B5) Hết vé / Huỷ trên đơn còn chữ tạm KHÔNG cần nơi đón ⇒ 200", async () => {
  const w = setup();
  const { id } = await donCho(w);
  const r = await qd(w, id, B, { ketQua: "HET_VE" });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, id), "cancelled");
});

test("(B6) GHIM: đơn không có chữ tạm đi như trước — Còn vé không noiDon ⇒ 200", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, [svc("ZA1", NGAY(), [leg(NGAY(), "09:00")])]);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
  const r = await qd(w, o.id, B);
  assert.equal(r.status, 200, r.text);
  assert.equal(changCua(w, o.id)[0].place, "Khách sạn Dò Tìm");
});

// ---- (C) Còn vé ghi nơi đón ----
test("(C1) noiDon chữ tự do ⇒ 200 confirmed; lượt có nơi thật, người sửa = người xét; cột cũ order_service.pickup_place khớp; nhật ký confirmed nêu «nơi đón»", async () => {
  const w = setup();
  const { id, legId } = await donCho(w);
  const r = await qd(w, id, B, { gioDon: [{ legId, pickupTime: "09:00" }], noiDon: [{ legId, pickupPlace: "  Khách sạn Sao Mai " }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ketQua: "CON_VE", trangThai: "confirmed" });
  const c = changCua(w, id)[0];
  assert.deepEqual([c.loc, c.place, c.gio, c.ub], [null, "Khách sạn Sao Mai", "09:00", B]);
  assert.deepEqual(cotCu(w, id), ["Khách sạn Sao Mai"]);
  const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id);
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /ghi nơi đón/);
});

test("(C2) noiDon điểm danh mục ⇒ lượt giữ id điểm, chữ NULL; cột cũ = tên điểm", async () => {
  const w = setup();
  const { id, legId } = await donCho(w);
  const r = await qd(w, id, B, { gioDon: [{ legId, pickupTime: "09:00" }], noiDon: [{ legId, pickupLocationId: LOC }] });
  assert.equal(r.status, 200, r.text);
  const c = changCua(w, id)[0];
  assert.deepEqual([c.loc, c.place], [LOC, null]);
  const ten = w.q("SELECT name FROM v_loc_location_label WHERE id = ?", LOC)[0].name;
  assert.deepEqual(cotCu(w, id), [ten]);
});

test("(C3) noiDon sai ⇒ 400, không ghi gì: chữ tạm, cả hai, không cái nào, lượt lạ, nhắc hai lần, không phải mảng, điểm không có thật, lượt đã có nơi đón thật", async () => {
  const w = setup();
  const { id, legId } = await donCho(w, [svc("ZB1", NGAY(), [khongNoi()]), svc("ZA1", NGAY(), [leg(NGAY(), "10:00")])]);
  const coNoi = w.q("SELECT id FROM ord_transfer_leg WHERE order_id = ? AND pickup_place = 'Khách sạn Dò Tìm'", id)[0].id;
  const truoc = hoSo(w, id);
  const gio = [{ legId, pickupTime: "09:00" }];
  const ds: unknown[] = [
    [{ legId, pickupPlace: NOI_DON_CHUA_GHI }],
    [{ legId, pickupLocationId: LOC, pickupPlace: "A" }],
    [{ legId }],
    [{ legId, pickupPlace: "" }],
    [{ legId: crypto.randomUUID(), pickupPlace: "A" }],
    [{ legId, pickupPlace: "A" }, { legId, pickupPlace: "B" }],
    "sai",
    [{ legId, pickupLocationId: crypto.randomUUID() }],
    [{ legId, pickupPlace: "A" }, { legId: coNoi, pickupPlace: "Đổi nơi của lượt đã có" }],
  ];
  for (const noiDon of ds) {
    const r = await qd(w, id, B, { gioDon: gio, noiDon });
    assert.equal(r.status, 400, `${JSON.stringify(noiDon)}: ${r.text}`);
    assert.equal(hoSo(w, id), truoc, JSON.stringify(noiDon));
  }
});

test("(C4) hai dịch vụ cùng thiếu: điền một ⇒ 409 nêu lượt còn thiếu, không lượt nào đổi; điền đủ ⇒ 200", async () => {
  const w = setup();
  const { id, o } = await donCho(w, [svc("ZB1", NGAY(), [khongNoi()]), svc("ZA1", NGAY(), [khongNoi()])]);
  const [l1, l2] = [o.services[0].legs[0].id, o.services[1].legs[0].id];
  const gio = [{ legId: l1, pickupTime: "09:00" }, { legId: l2, pickupTime: "09:30" }];
  const truoc = hoSo(w, id);
  la409(await qd(w, id, B, { gioDon: gio, noiDon: [{ legId: l1, pickupPlace: "Khách sạn Một" }] }), [l2]);
  assert.equal(hoSo(w, id), truoc);
  const r = await qd(w, id, B, { gioDon: gio, noiDon: [{ legId: l1, pickupPlace: "Khách sạn Một" }, { legId: l2, pickupPlace: "Khách sạn Hai" }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(cotCu(w, id), ["Khách sạn Một", "Khách sạn Hai"]);
});

test("(C5) lô THUA (đơn vừa đổi mốc) ⇒ không ghi nơi đón: lượt vẫn mang chữ tạm", async () => {
  const w = setup();
  const { id, legId } = await donCho(w);
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  const r = await w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: B, body: { yeuCauId: y.id, updatedAt: "2000-01-01T00:00:00.000Z", ketQua: "CON_VE", gioDon: [{ legId, pickupTime: "09:00" }], noiDon: [{ legId, pickupPlace: "Khách sạn Sao Mai" }] } });
  assert.equal(r.status, 409, r.text);
  assert.equal(changCua(w, id)[0].place, NOI_DON_CHUA_GHI);
});
