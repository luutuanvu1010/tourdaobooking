// ADR-0154 Đ1.3, Đ1.4 — kế hoạch lượt 2 Task 1.3: bảng «Còn vé» (`POST /api/orders/:id/quyet-dinh`) với yêu cầu mang cờ «cần chốt giờ»: cổng giờ (409 `pickup_time_required`), đặt gấp
// THEO TỪNG LƯỢT (`datGap` trong từng phần tử `gioDon`, dấu ghi trong CÙNG lô với giờ và xác nhận), ghi kép cột cũ `order_service.pickup_time` theo lượt đi đầu (T6).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); mốc 6 giờ là mốc THẬT 360 phút, ca dưới mốc dựng bằng `vnSau` (giờ VN thật, qua nửa đêm vẫn đúng).
//
// Bài GHIM hành vi không đổi (xanh cả trước lẫn sau khi thi công): (c3), (c4), (j), «chặng khác không bắt buộc» (khi cờ = 0). Các bài còn lại đổi hành vi (đỏ trước).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, B, PARTNER, datCo, inDays, lap, leg, setup, svc, vnSau } from "../../../tests/audit/xac-nhan-khung.mjs";

const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };

const DAT_GAP = { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" };
const RET = (d: string | null, t: string | null) => ({ ...leg(d, t), direction: "RETURN" });
const NGAY = () => inDays(3);
const q = (w: any, orderId: string) => ({
  moc: w.q("SELECT updated_at u, status s FROM orders WHERE id = ?", orderId)[0],
  yc: w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? ORDER BY submitted_at, rowid", orderId),
});
const rut = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as, body: {} });
/** Gửi quyết định với đúng mốc + yêu cầu ĐANG LƯU (người xét vừa đọc). */
function qd(w: any, id: string, as: string, extra: Record<string, unknown>) {
  const { moc, yc } = q(w, id);
  const y = yc.find((r: any) => r.decided_at === null);
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: y?.id, updatedAt: moc.u, ...extra } });
}
// node:sqlite trả dòng có prototype null: bung thành đối tượng thường để so sánh sâu với đối tượng chữ.
const chang = (w: any, legId: string) => ({ ...w.q("SELECT pickup_date d, pickup_time t FROM ord_transfer_leg WHERE id = ?", legId)[0] });
const dau = (w: any, legId: string) => ({ ...w.q("SELECT short_notice_reason r, short_notice_by b, short_notice_lead_minutes m, short_notice_note n FROM ord_transfer_leg WHERE id = ?", legId)[0] });
const KHONG_DAU = { r: null, b: null, m: null, n: null };
const nhatKy = (w: any, id: string, action: string) => w.q("SELECT * FROM audit_log WHERE order_id = ? AND action = ?", id, action);
const cotCu = (w: any, id: string) => w.q("SELECT pickup_time t FROM order_service WHERE order_id = ? ORDER BY sort_order", id).map((r: any) => r.t);
const hoSo = (w: any, id: string) => ({
  chang: w.q("SELECT id, pickup_date, pickup_time, short_notice_reason FROM ord_transfer_leg WHERE order_id = ? ORDER BY id", id),
  dichVu: w.q("SELECT id, depart_date, pickup_time FROM order_service WHERE order_id = ? ORDER BY id", id),
  don: q(w, id),
  soDongNhatKy: w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", id)[0].n,
});
const laXacNhan = (stmts: { sql: string }[]) => stmts.some((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql));

/** Đơn của Đối tác, mỗi dịch vụ có lượt đầu Đón KHÔNG giờ, đã Gửi đơn → yêu cầu mang cờ «cần chốt giờ» = 1. */
async function chotGio(w: any, dichVu: any[] = [svc("ZB1", NGAY(), [leg(NGAY(), null)])]) {
  const o = await lap(w, PARTNER, dichVu);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(r.status, 201, r.text);
  assert.equal(q(w, o.id).yc[0].pickup_time_required, 1, "chống bài rỗng: yêu cầu mang cờ");
  return { id: o.id, o, legId: o.services[0].legs[0].id as string };
}
/** Đơn của Bán hàng, dịch vụ cờ «cần xác nhận», Gửi xác nhận → yêu cầu KHÔNG mang cờ chốt giờ. */
async function choVanPhong(w: any, dichVu: any[]) {
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, dichVu);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} });
  assert.equal(r.status, 201, r.text);
  assert.equal(q(w, o.id).yc[0].pickup_time_required, 0);
  return { id: o.id, o };
}

test("(c) yêu cầu mang cờ, Còn vé không gửi giờ → 409 pickup_time_required kèm legs; đơn nháp, chặng NULL, yêu cầu còn mở, không dòng nhật ký mới", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  const truoc = hoSo(w, id);
  const r = await qd(w, id, ACC, { ketQua: "CON_VE" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "pickup_time_required");
  assert.equal(r.json.error.message, "Còn lượt đưa đón chưa có giờ đón. Ghi giờ đón rồi bấm Còn vé.");
  assert.deepEqual(r.json.error.legs, [{ legId }]);
  assert.deepEqual(hoSo(w, id), truoc, "không ghi gì");
  assert.equal(q(w, id).moc.s, "draft");
  assert.equal(chang(w, legId).t, null);
  // gửi giờ rỗng cho lượt khác (lạ) cũng không qua: lỗi đầu vào đến TRƯỚC cổng giờ, vẫn không ghi
  const sai = await qd(w, id, ACC, { ketQua: "CON_VE", gioDon: [] });
  assert.equal(sai.status, 409, sai.text);
  assert.equal(sai.json.error.code, "pickup_time_required");
});

test("(c2) mang cờ + gửi giờ cho lượt đầu → 200 confirmed, chặng có giờ, cột cũ order_service.pickup_time = giờ đó, yêu cầu khép XAC_NHAN", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  const r = await qd(w, id, ACC, { ketQua: "CON_VE", gioDon: [{ legId, pickupTime: "09:00" }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ketQua: "CON_VE", trangThai: "confirmed" });
  assert.equal(chang(w, legId).t, "09:00");
  assert.deepEqual(cotCu(w, id), ["09:00"]);
  assert.deepEqual(dau(w, legId), KHONG_DAU, "giờ xa hạn chốt: không dấu");
  assert.equal(q(w, id).yc[0].outcome, "XAC_NHAN");
  assert.equal(q(w, id).moc.s, "confirmed");
});

test("(c3) GHIM: có giờ dưới hạn chốt, không datGap → 409 short_notice_required như cũ; không ghi gì", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  const g = vnSau(60);
  const truoc = hoSo(w, id);
  const r = await qd(w, id, B, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId, pickupTime: g.time }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "short_notice_required");
  assert.deepEqual(hoSo(w, id), truoc);
});

test("(c4) GHIM: Hết vé và Huỷ trên yêu cầu mang cờ KHÔNG cần giờ → 200", async () => {
  const w = setup();
  const a = await chotGio(w);
  assert.equal((await qd(w, a.id, ACC, { ketQua: "HET_VE" })).status, 200);
  assert.equal(q(w, a.id).moc.s, "cancelled");
  const b = await chotGio(w);
  assert.equal((await qd(w, b.id, ACC, { ketQua: "HUY", lyDo: "KHACH_DOI_Y" })).status, 200);
  assert.equal(q(w, b.id).moc.s, "cancelled");
});

test("(i) đi trong ngày, giờ còn 2 tiếng, Bán hàng kèm datGap → 200: năm cột dấu có giá trị (mốc 360), nhật ký order_leg_short_notice, confirmed, chặng đúng ngày giờ mới", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  const g = vnSau(120);
  const r = await qd(w, id, B, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(r.status, 200, r.text);
  assert.equal(q(w, id).moc.s, "confirmed");
  assert.deepEqual(chang(w, legId), { d: g.date, t: g.time });
  assert.deepEqual(dau(w, legId), { r: "KHACH_DOAN_GOI_GAP", b: B, m: 360, n: null });
  const nk = nhatKy(w, id, "order_leg_short_notice");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, B);
  assert.match(nk[0].detail, / · đặt gấp: Khách đoàn gọi gấp$/);
  assert.match(nhatKy(w, id, "confirmed")[0].detail, /đặt gấp: Khách đoàn gọi gấp/);
  assert.deepEqual(cotCu(w, id), [g.time]);
  assert.equal(q(w, id).yc[0].outcome, "XAC_NHAN");
});

test("(i2) Kế toán (không có ô đặt gấp): không datGap → 409 short_notice_required; kèm datGap qua API → 403 forbidden (câu đã áp số 2); cả hai không ghi gì", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  const g = vnSau(120);
  const truoc = hoSo(w, id);
  const khong = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId, pickupTime: g.time }] });
  assert.equal(khong.status, 409, khong.text);
  assert.equal(khong.json.error.code, "short_notice_required");
  const co = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(co.status, 403, co.text);
  assert.equal(co.json.error.code, "forbidden");
  assert.deepEqual(hoSo(w, id), truoc);
  assert.equal(nhatKy(w, id, "order_leg_short_notice").length, 0);
});

test("(i3) giờ trên 6 tiếng: không datGap → 200, cả năm cột NULL; kèm datGap → 409 short_notice_not_needed, không ghi gì; lý do hỏng → 400", async () => {
  const w = setup();
  const a = await chotGio(w);
  const truoc = hoSo(w, a.id);
  const khongCan = await qd(w, a.id, B, { ketQua: "CON_VE", gioDon: [{ legId: a.legId, pickupTime: "08:30", datGap: DAT_GAP }] });
  assert.equal(khongCan.status, 409, khongCan.text);
  assert.equal(khongCan.json.error.code, "short_notice_not_needed");
  const hong = await qd(w, a.id, B, { ketQua: "CON_VE", gioDon: [{ legId: a.legId, pickupTime: "08:30", datGap: { lyDo: "LY_DO_LA" } }] });
  assert.equal(hong.status, 400, hong.text);
  assert.deepEqual(hoSo(w, a.id), truoc);
  const ok = await qd(w, a.id, B, { ketQua: "CON_VE", gioDon: [{ legId: a.legId, pickupTime: "08:30" }] });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(dau(w, a.legId), KHONG_DAU);
  assert.equal(nhatKy(w, a.id, "order_leg_short_notice").length, 0);
});

test("(i4) chặng ĐÃ có giờ dưới hạn chốt (giờ không đổi), kèm datGap → 200, có dấu (câu dấu đứng ngoài nhánh «giờ đổi»)", async () => {
  const w = setup();
  const g = vnSau(60);
  const { id, o } = await choVanPhong(w, [svc("ZA1", g.date, [leg(g.date, g.time)])]);
  const legId = o.services[0].legs[0].id;
  const truoc = await qd(w, id, B, { ketQua: "CON_VE" });
  assert.equal(truoc.status, 409, truoc.text);
  assert.equal(truoc.json.error.code, "short_notice_required");
  const r = await qd(w, id, B, { ketQua: "CON_VE", gioDon: [{ legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(r.status, 200, r.text);
  assert.equal(q(w, id).moc.s, "confirmed");
  assert.deepEqual(chang(w, legId), { d: g.date, t: g.time });
  assert.deepEqual(dau(w, legId), { r: "KHACH_DOAN_GOI_GAP", b: B, m: 360, n: null });
  assert.equal(nhatKy(w, id, "order_leg_short_notice").length, 1);
});

test("(j) GHIM: đơn Bán hàng có cờ dịch vụ, Đón không giờ, không gửi giờ → 200 như hôm nay, chặng vẫn NULL (cờ chốt giờ chỉ của đơn Đối tác)", async () => {
  const w = setup();
  const { id, o } = await choVanPhong(w, [svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  const r = await qd(w, id, ACC, { ketQua: "CON_VE" });
  assert.equal(r.status, 200, r.text);
  assert.equal(q(w, id).moc.s, "confirmed");
  assert.equal(chang(w, o.services[0].legs[0].id).t, null);
});

test("Review Focus 2: hai dịch vụ cùng mang lượt đầu trống giờ, chỉ gửi giờ MỘT dịch vụ → 409, không dịch vụ nào đổi", async () => {
  const w = setup();
  const c = await chotGio(w, [svc("ZB1", NGAY(), [leg(NGAY(), null)]), svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  const legs = c.o.services.map((s: any) => s.legs[0].id as string);
  const truoc = hoSo(w, c.id);
  const r = await qd(w, c.id, ACC, { ketQua: "CON_VE", gioDon: [{ legId: legs[0], pickupTime: "09:00" }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "pickup_time_required");
  assert.deepEqual(r.json.error.legs, [{ legId: legs[1] }], "chỉ nêu lượt còn thiếu");
  assert.deepEqual(hoSo(w, c.id), truoc, "không dịch vụ nào đổi");
  const ok = await qd(w, c.id, ACC, { ketQua: "CON_VE", gioDon: legs.map((legId: string, i: number) => ({ legId, pickupTime: i === 0 ? "09:00" : "10:00" })) });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(legs.map((l: string) => chang(w, l).t), ["09:00", "10:00"]);
});

test("Review Focus 3: đổi ngày đi sang HÔM NAY cùng lúc ghi giờ còn 2 tiếng — hạn chốt và dấu tính theo ngày MỚI: thiếu datGap 409 (không ghi); có datGap 200 và dấu nằm trên chặng ở ngày mới", async () => {
  const w = setup();
  const g = vnSau(120);
  const a = await chotGio(w);
  const truoc = hoSo(w, a.id);
  const thieu = await qd(w, a.id, B, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId: a.legId, pickupTime: g.time }] });
  assert.equal(thieu.status, 409, thieu.text);
  assert.equal(thieu.json.error.code, "short_notice_required");
  assert.deepEqual(hoSo(w, a.id), truoc);
  const co = await qd(w, a.id, B, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId: a.legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(co.status, 200, co.text);
  assert.deepEqual(chang(w, a.legId), { d: g.date, t: g.time });
  assert.equal(dau(w, a.legId).r, "KHACH_DOAN_GOI_GAP", "dấu ghi trên chặng ở NGÀY MỚI (không im lặng bỏ qua vì lệch ngày)");
  assert.equal(q(w, a.id).moc.s, "confirmed");
  // đổi ngày đi sang sau 6 ngày, cùng giờ trong ngày: 200, không dấu
  const b = await chotGio(w);
  const xa = await qd(w, b.id, B, { ketQua: "CON_VE", ngayDi: inDays(6), gioDon: [{ legId: b.legId, pickupTime: g.time }] });
  assert.equal(xa.status, 200, xa.text);
  assert.deepEqual(chang(w, b.legId), { d: inDays(6), t: g.time });
  assert.deepEqual(dau(w, b.legId), KHONG_DAU);
  // datGap gửi cho ngày mới còn xa: không cần → 409 short_notice_not_needed
  const c = await chotGio(w);
  const khongCan = await qd(w, c.id, B, { ketQua: "CON_VE", ngayDi: inDays(6), gioDon: [{ legId: c.legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(khongCan.status, 409, khongCan.text);
  assert.equal(khongCan.json.error.code, "short_notice_not_needed");
});

test("Review Focus 3 (chặng đang trống ngày): dấu ghi đúng chặng dù ngày đang lưu là NULL — câu dấu khớp trạng thái dòng SAU câu đổi ngày, giờ, không theo ngày dự phòng", async () => {
  const w = setup();
  const g = vnSau(120);
  const { id, legId } = await chotGio(w);
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = NULL WHERE id = ?").run(legId);
  const r = await qd(w, id, B, { ketQua: "CON_VE", gioDon: [{ legId, pickupTime: g.time, datGap: DAT_GAP }], ngayDi: g.date });
  assert.equal(r.status, 200, r.text);
  assert.equal(dau(w, legId).r, "KHACH_DOAN_GOI_GAP");
  assert.equal(chang(w, legId).d, g.date, "ngày chặng được điền khi xác nhận");
});

test("chặng khác không bắt buộc: lượt đầu có giờ gửi lên, chiều về vẫn NULL → 200 (cờ = 1 chỉ đòi lượt ĐẦU)", async () => {
  const w = setup();
  const c = await chotGio(w, [svc("ZB1", NGAY(), [leg(NGAY(), null), RET(NGAY(), null)])]);
  const legs = c.o.services[0].legs;
  const di = legs.find((l: any) => l.direction === "OUT").id;
  const ve = legs.find((l: any) => l.direction === "RETURN").id;
  const r = await qd(w, c.id, ACC, { ketQua: "CON_VE", gioDon: [{ legId: di, pickupTime: "09:00" }] });
  assert.equal(r.status, 200, r.text);
  assert.equal(chang(w, di).t, "09:00");
  assert.equal(chang(w, ve).t, null);
});

test("T6 ghi kép theo LƯỢT ĐI ĐẦU: hai chiều đi cùng nơi (09:30 và trống) — gửi 08:00 cho lượt sau → cột cũ = 08:00; gửi 10:00 → giữ 09:30; R-ORD-7 đếm 0 cả hai", async () => {
  const r7 = CHECKS.find((c) => c.code === "R-ORD-7")!;
  const dem = (w: any) => Number(Object.values(w.q(r7.sql.replace(/\s+/g, " ").trim())[0] ?? { n: 0 })[0]);
  for (const [gui, mong] of [["08:00", "08:00"], ["10:00", "09:30"]] as const) {
    const w = setup();
    const { id, o } = await choVanPhong(w, [svc("ZA1", NGAY(), [leg(NGAY(), "09:30"), leg(NGAY(), null)])]);
    const lgs = o.services[0].legs as { id: string; pickupTime: string | null }[];
    const trong = lgs.find((l) => l.pickupTime === null)!.id;
    assert.deepEqual(cotCu(w, id), ["09:30"], "chống bài rỗng: cột cũ đang là giờ của lượt đi đầu");
    assert.equal(dem(w), 0, "trước khi Còn vé");
    const r = await qd(w, id, ACC, { ketQua: "CON_VE", gioDon: [{ legId: trong, pickupTime: gui }] });
    assert.equal(r.status, 200, `${gui}: ${r.text}`);
    assert.deepEqual(cotCu(w, id), [mong], `gửi ${gui} cho lượt sau`);
    assert.equal(dem(w), 0, `R-ORD-7 sau Còn vé (gửi ${gui})`);
  }
});

test("ĐUA: Rút lại chen giữa lúc đọc và lúc ghi — lô thua: không dấu, không giờ, không cột cũ, không dòng nhật ký đặt gấp; yêu cầu RUT_LAI", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  const g = vnSau(120);
  const truoc = chang(w, legId);
  w.chenTruocLo(laXacNhan, async () => { assert.equal((await rut(w, id, PARTNER)).status, 200); });
  const r = await qd(w, id, B, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(q(w, id).moc.s, "draft");
  assert.deepEqual(q(w, id).yc.map((y: any) => y.outcome), ["RUT_LAI"]);
  assert.deepEqual(chang(w, legId), truoc, "giờ, ngày không đổi");
  assert.deepEqual(dau(w, legId), KHONG_DAU, "không dấu");
  assert.equal(nhatKy(w, id, "order_leg_short_notice").length, 0);
  assert.equal(nhatKy(w, id, "confirmed").length, 0);
  assert.deepEqual(cotCu(w, id), [null]);
});

// ---- SỬA SAU KIỂM (người kiểm độc lập Đợt 1, N-1, ruling R6) ----------------------------------------------------------------------------------------
// `db.batch` KHÔNG lui khi câu xác nhận đổi 0 dòng: các câu đổi giờ / đóng dấu (chỉ mang `CON_MO`) vẫn ghi dù `ORDER_CONFIRM` thua vì một vế KHÁC (ngày đi quá khứ / trống, dịch vụ không khách).
// Route phải chặn các vế đó TRƯỚC khi dựng lô, với đúng câu trả lời `chanDoanXacNhan` (incomplete_trip) như hôm nay.
/** Đơn nháp để quá ngày đi: dịch vụ và chặng đều ở HÔM QUA (yêu cầu chờ không tự đóng — ADR-0136 Đ9). */
const quaNgayDi = (w: any, id: string) => {
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(-1), id);
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = ? WHERE order_id = ?").run(inDays(-1), id);
};

test("(N-1) đơn quá ngày đi, người xét Bán hàng gửi giờ kèm datGap → 409 incomplete_trip và KHÔNG ghi gì (không giờ, không dấu, không nhật ký, không cột cũ, yêu cầu còn mở); Kế toán sau đó vẫn 409 short_notice_required; gửi ngayDi hợp lệ thì xác nhận được", async () => {
  const w = setup();
  const { id, legId } = await chotGio(w);
  quaNgayDi(w, id);
  const truoc = hoSo(w, id);
  const r = await qd(w, id, B, { ketQua: "CON_VE", gioDon: [{ legId, pickupTime: "09:00", datGap: DAT_GAP }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "incomplete_trip");
  assert.deepEqual(r.json.error.missing.map((m: any) => m.reasons), [["past_date"]]);
  assert.deepEqual(hoSo(w, id), truoc, "không ghi gì");
  assert.equal(chang(w, legId).t, null, "chặng vẫn trống giờ");
  assert.deepEqual(dau(w, legId), KHONG_DAU, "năm cột dấu NULL");
  assert.equal(nhatKy(w, id, "order_leg_short_notice").length, 0);
  assert.deepEqual(cotCu(w, id), [null], "cột cũ order_service.pickup_time không đổi");
  assert.equal(q(w, id).yc.filter((y: any) => y.decided_at === null).length, 1, "yêu cầu còn mở");
  assert.equal(q(w, id).moc.s, "draft");
  // (2) hệ quả cũ: dấu mồ côi mở đường cho người KHÔNG có ô đặt gấp xác nhận chặng dưới hạn chốt. Nay không còn dấu nào ⇒ Kế toán nhận 409 như đối chứng.
  const g = vnSau(60);
  const ke = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: g.date, gioDon: [{ legId, pickupTime: g.time }] });
  assert.equal(ke.status, 409, ke.text);
  assert.equal(ke.json.error.code, "short_notice_required");
  assert.deepEqual(hoSo(w, id), truoc, "Kế toán bị chặn cũng không ghi gì");
  // (3) cùng đơn quá ngày: gửi ngày đi hợp lệ thì vẫn xác nhận được (chặn chỉ nhằm vế ngày SAU khi áp ngayDi)
  const ok = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: inDays(3), gioDon: [{ legId, pickupTime: "09:00" }] });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(q(w, id).moc.s, "confirmed");
  assert.deepEqual(chang(w, legId), { d: inDays(3), t: "09:00" });
  assert.deepEqual(dau(w, legId), KHONG_DAU);
});

// ---- N-2, ruling R8: khoá hàng rào `CON_MO` của câu đóng dấu ---------------------------------------------------------------------------------------
// Bài ĐUA ở trên dùng chặng CHƯA có giờ nên câu đổi giờ (cũng mang `CON_MO`) thua trước và câu dấu thua theo vì vế `pickup_time IS ?9` lệch, không vì `CON_MO` của chính nó (đột biến M1b của người kiểm
// vẫn xanh). Ca THẬT SỰ cần `CON_MO` của câu dấu: chặng ĐÃ có giờ, giờ KHÔNG đổi (không câu đổi giờ nào), dưới hạn chốt, kèm datGap — chỉ còn Rút lại chen giữa lúc đọc và lúc ghi giữ dấu khỏi bị ghi.
test("(N-2) ĐUA ca giờ KHÔNG đổi: chặng đã có giờ dưới hạn chốt, kèm datGap, người lập Rút lại chen trước lô → không dấu mồ côi, không dòng nhật ký đặt gấp, đơn còn nháp, yêu cầu RUT_LAI", async () => {
  const w = setup();
  const g = vnSau(60);
  const { id, o } = await choVanPhong(w, [svc("ZA1", g.date, [leg(g.date, g.time)])]);
  const legId = o.services[0].legs[0].id as string;
  const truoc = chang(w, legId);
  w.chenTruocLo(laXacNhan, async () => { assert.equal((await rut(w, id, A)).status, 200); });
  const r = await qd(w, id, B, { ketQua: "CON_VE", gioDon: [{ legId, pickupTime: g.time, datGap: DAT_GAP }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(q(w, id).moc.s, "draft");
  assert.deepEqual(q(w, id).yc.map((y: any) => y.outcome), ["RUT_LAI"]);
  assert.deepEqual(chang(w, legId), truoc, "giờ, ngày không đổi");
  assert.deepEqual(dau(w, legId), KHONG_DAU, "không dấu mồ côi");
  assert.equal(nhatKy(w, id, "order_leg_short_notice").length, 0, "không dòng nhật ký mồ côi");
  assert.equal(nhatKy(w, id, "confirmed").length, 0);
});

// ---- N-3, ruling R7: thứ tự lượt đầu «chiều đi trước chiều về bất kể ngày» -----------------------------------------------------------------------------
test("(E4, R7) đơn nhiều ngày có cờ (đi D chưa giờ, về D+1 giờ gợi ý 16:00): người xét CHỈ đổi ngày đi, không ghi giờ → 409 pickup_time_required (nêu chiều đi), không ghi gì; ghi giờ chiều đi thì xác nhận được", async () => {
  const w = setup();
  const d = inDays(3);
  const c = await chotGio(w, [svc("ZB1", d, [leg(d, null), RET(inDays(4), "16:00")])]);
  const di = c.o.services[0].legs.find((l: any) => l.direction === "OUT").id as string;
  const truoc = hoSo(w, c.id);
  const r = await qd(w, c.id, ACC, { ketQua: "CON_VE", ngayDi: inDays(8) });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "pickup_time_required");
  assert.deepEqual(r.json.error.legs, [{ legId: di }], "nêu đúng chiều đi chưa giờ, không phải chiều về đã có giờ gợi ý");
  assert.deepEqual(hoSo(w, c.id), truoc, "không ghi gì (kể cả ngày đi)");
  assert.equal(q(w, c.id).moc.s, "draft");
  const ok = await qd(w, c.id, ACC, { ketQua: "CON_VE", ngayDi: inDays(8), gioDon: [{ legId: di, pickupTime: "09:00" }] });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(chang(w, di), { d: inDays(8), t: "09:00" });
});

test("(N-1b) mọi vế câu xác nhận mà câu đổi giờ không phủ: dịch vụ không có ngày đi, hoặc một dịch vụ không còn khách → 409 incomplete_trip, KHÔNG ghi giờ (trước: giờ vẫn được ghi rồi lô thua)", async () => {
  for (const [ten, hong, mong] of [
    ["ngày đi trống", (w: any, id: string) => { w.sqlite.prepare("UPDATE order_service SET depart_date = NULL WHERE order_id = ?").run(id); w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = NULL WHERE order_id = ?").run(id); }, ["no_date"]],
    ["dịch vụ thứ hai không khách", (w: any, id: string) => w.sqlite.prepare("UPDATE order_service SET pax_adult = 0, pax_child = 0, pax_senior = 0, pax_infant = 0 WHERE order_id = ? AND sort_order = 1").run(id), ["no_guests"]],
  ] as const) {
    const w = setup();
    const c = await chotGio(w, [svc("ZB1", NGAY(), [leg(NGAY(), null)]), svc("ZB1", NGAY(), [])]);
    hong(w, c.id);
    const truoc = hoSo(w, c.id);
    const r = await qd(w, c.id, ACC, { ketQua: "CON_VE", gioDon: [{ legId: c.legId, pickupTime: "09:00" }] });
    assert.equal(r.status, 409, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "incomplete_trip", ten);
    assert.ok(r.json.error.missing.some((m: any) => m.reasons.includes(mong[0])), `${ten}: nêu đúng lý do ${mong[0]}`);
    assert.deepEqual(hoSo(w, c.id), truoc, `${ten}: không ghi gì`);
    assert.equal(chang(w, c.legId).t, null, `${ten}: giờ không được ghi`);
  }
});
