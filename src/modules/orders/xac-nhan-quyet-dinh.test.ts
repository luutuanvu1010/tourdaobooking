// ADR-0136 Đ5, Đ7, Đ12 — Task 3.3 (lát 2): `POST /api/orders/:id/quyet-dinh` (Còn vé / Hết vé / Huỷ), bài ĐUA hai người quyết định cả hai chiều thua, và nhánh Đặt gấp trên nháp đang chờ.
// Chạy CẢ ứng dụng trên SQLite thật. Bài không phụ thuộc giờ trong ngày: chặng đón cách ≥ 3 ngày, trừ ca dưới mốc (dựng bằng vnSau, tính ngày giờ VN kể cả khi qua nửa đêm).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, B, H, INTERN, LAI, SUP, datCo, inDays, lap, leg, setup, svc, vnSau } from "../../../tests/audit/xac-nhan-khung.mjs";

const q = (w: any, orderId: string) => ({
  moc: w.q("SELECT updated_at u, status s FROM orders WHERE id = ?", orderId)[0],
  yc: w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? ORDER BY submitted_at, rowid", orderId),
});
const gui = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const rut = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as, body: {} });
/** Gửi quyết định với đúng mốc + yêu cầu ĐANG LƯU (người xét duyệt vừa đọc), hoặc với ảnh chụp cũ `chup`. */
function qd(w: any, id: string, as: string, extra: Record<string, unknown>, chup?: { moc: string; yc: string }) {
  const { moc, yc } = q(w, id);
  const y = yc.find((r: any) => r.decided_at === null);
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: chup?.yc ?? y?.id, updatedAt: chup?.moc ?? moc.u, ...extra } });
}
/** Đơn có cờ + chặng đón 07:00 sau 3 ngày + đã gửi xác nhận. */
async function choXacNhan(w: any, as = A): Promise<{ id: string; legId: string; ngay: string }> {
  datCo(w, "SERVICE", "ZA1", true);
  const ngay = inDays(3);
  const o = await lap(w, as, [svc("ZA1", ngay, [leg(ngay, "07:00")])]);
  assert.equal((await gui(w, o.id, as)).status, 201);
  return { id: o.id, legId: o.services[0].legs[0].id, ngay };
}
const chang = (w: any, legId: string) => w.q("SELECT pickup_date d, pickup_time t, pickup_slot_end e FROM ord_transfer_leg WHERE id = ?", legId)[0];
const nhatKy = (w: any, id: string, action: string) => w.q("SELECT * FROM audit_log WHERE order_id = ? AND action = ?", id, action);
const soQuyetDinh = (w: any, id: string) => nhatKy(w, id, "confirmed").length + nhatKy(w, id, "cancelled").length;

test("(c) Còn vé + đổi giờ 08:30–09:00 → đơn confirmed, chặng 08:30, yêu cầu khép XAC_NHAN/CON_VE, nhật ký confirmed «Còn vé, đổi giờ»", async () => {
  const w = setup();
  const { id, legId } = await choXacNhan(w);
  const r = await qd(w, id, ACC, { ketQua: "CON_VE", gioDon: [{ legId, pickupTime: "08:30", pickupSlotEnd: "09:00" }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ketQua: "CON_VE", trangThai: "confirmed" });
  assert.equal(q(w, id).moc.s, "confirmed");
  assert.equal(chang(w, legId).t, "08:30");
  assert.equal(chang(w, legId).e, "09:00");
  const y = q(w, id).yc;
  assert.equal(y.length, 1);
  assert.equal(y[0].outcome, "XAC_NHAN");
  assert.equal(y[0].ticket, "CON_VE");
  assert.equal(y[0].decided_by, ACC);
  const nk = nhatKy(w, id, "confirmed");
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /Còn vé, đổi giờ/);
  assert.equal(nk[0].staff_id, ACC);
});

test("đổi ngày đi dời cả dịch vụ lẫn chặng đón cùng ngày; ngày quá khứ / giờ sai / chặng lạ → 400 doi_gio_khong_hop_le, không ghi gì", async () => {
  const w = setup();
  const { id, legId, ngay } = await choXacNhan(w);
  for (const extra of [{ ngayDi: "2020-01-01" }, { ngayDi: "khong-phai-ngay" }, { gioDon: [{ legId, pickupTime: "25:99" }] }, { gioDon: [{ legId: "00000000-0000-4000-8000-000000000000", pickupTime: "08:00" }] }, { gioDon: [{ legId, pickupTime: "08:00", pickupSlotEnd: "07:00" }] }]) {
    const r = await qd(w, id, ACC, { ketQua: "CON_VE", ...extra });
    assert.equal(r.status, 400, `${JSON.stringify(extra)}: ${r.text}`);
    assert.equal(r.json.error.code, "doi_gio_khong_hop_le");
  }
  assert.equal(q(w, id).moc.s, "draft");
  assert.equal(chang(w, legId).t, "07:00");
  const moi = inDays(5);
  const r = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: moi });
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT depart_date d FROM order_service WHERE order_id = ?", id)[0].d, moi);
  assert.equal(chang(w, legId).d, moi);
  assert.notEqual(moi, ngay);
  assert.match(nhatKy(w, id, "confirmed")[0].detail, /Còn vé, đổi ngày/);
});

test("(i) Còn vé: giờ MỚI dưới mốc 6 giờ chưa đặt gấp → 409 short_notice_required, KHÔNG ghi gì (chặng, ngày, yêu cầu, đơn nguyên) — không qua mặt mốc bằng cách đổi sang khung sớm", async () => {
  const w = setup();
  const { id, legId, ngay } = await choXacNhan(w);
  const gio = vnSau(60);
  const truoc = { chang: chang(w, legId), ...q(w, id) };
  const r = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: gio.date, gioDon: [{ legId, pickupTime: gio.time }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "short_notice_required");
  assert.deepEqual(chang(w, legId), truoc.chang);
  assert.equal(w.q("SELECT depart_date d FROM order_service WHERE order_id = ?", id)[0].d, ngay);
  assert.deepEqual(q(w, id), { moc: truoc.moc, yc: truoc.yc });
});

test("(m) chặng sẵn dưới mốc: Kế toán Còn vé → 409 short_notice_required; Quản trị (không phải người lập) đặt gấp trên nháp ĐANG CHỜ → 200 (nháp không chờ vẫn 404); rồi Còn vé → 200", async () => {
  const w = setup();
  const gio = vnSau(60);
  const o = await lap(w, A, [svc("ZB1", gio.date, [leg(gio.date, gio.time)])]);
  assert.equal((await gui(w, o.id, A)).status, 201);
  const legId = o.services[0].legs[0].id;
  const r1 = await qd(w, o.id, ACC, { ketQua: "CON_VE" });
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "short_notice_required");
  const kh = await lap(w, A, [svc("ZB1", gio.date, [leg(gio.date, gio.time)])]);
  const khac = await w.call("POST", `/api/orders/${kh.id}/legs/${kh.services[0].legs[0].id}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" } });
  assert.equal(khac.status, 404, khac.text);
  const dg = await w.call("POST", `/api/orders/${o.id}/legs/${legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" } });
  assert.equal(dg.status, 200, dg.text);
  const r2 = await qd(w, o.id, ADM, { ketQua: "CON_VE" });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(q(w, o.id).moc.s, "confirmed");
});

test("(d) Hết vé: Kế toán (không có order.cancel.classify) → cancelled, lý do HET_CHO nhóm Công ty huỷ, yêu cầu HUY/HET_VE; Huỷ lý do khác như hộp huỷ (thiếu lý do 400; nhóm Công ty huỷ cần ô)", async () => {
  const w = setup();
  const a = await choXacNhan(w);
  const r = await qd(w, a.id, ACC, { ketQua: "HET_VE" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ketQua: "HET_VE", trangThai: "cancelled" });
  assert.equal(q(w, a.id).moc.s, "cancelled");
  const lyDo = w.q("SELECT reason_code c, group_code g FROM ord_cancel_reason WHERE order_id = ?", a.id);
  assert.deepEqual(lyDo.map((x: any) => [x.c, x.g]), [["HET_CHO", "CONG_TY_HUY"]]);
  assert.deepEqual(q(w, a.id).yc.map((y: any) => [y.outcome, y.ticket, y.decided_by]), [["HUY", "HET_VE", ACC]]);
  assert.equal(nhatKy(w, a.id, "cancelled").length, 1);

  const b = await choXacNhan(w);
  assert.equal((await qd(w, b.id, ACC, { ketQua: "HUY" })).status, 400, "thiếu lý do");
  assert.equal((await qd(w, b.id, ACC, { ketQua: "HUY", lyDo: "HET_CHO" })).status, 403, "nhóm Công ty huỷ cần order.cancel.classify");
  assert.equal(q(w, b.id).moc.s, "draft");
  const ok = await qd(w, b.id, ACC, { ketQua: "HUY", lyDo: "KHACH_DOI_Y" });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(q(w, b.id).yc.map((y: any) => [y.outcome, y.ticket]), [["HUY", "HUY"]]);
  assert.equal(w.q("SELECT reason_code c FROM ord_cancel_reason WHERE order_id = ?", b.id)[0].c, "KHACH_DOI_Y");
});

test("(e) ĐUA: hai người cùng quyết định một đơn (Còn vé vs Hết vé, cả hai thứ tự; Còn vé vs Còn vé) → đúng một 200, một 409, đúng MỘT dòng quyết định, đơn / yêu cầu / chặng khớp nhau", async () => {
  for (const cap of [["CON_VE", "HET_VE"], ["HET_VE", "CON_VE"], ["CON_VE", "CON_VE"]] as const) {
    const w = setup();
    const { id, legId } = await choXacNhan(w);
    const chup = { moc: q(w, id).moc.u, yc: q(w, id).yc[0].id };
    const gioX = [{ legId, pickupTime: "08:30", pickupSlotEnd: "09:00" }];
    const gioY = [{ legId, pickupTime: "09:00", pickupSlotEnd: "09:30" }];
    const [x, y] = await Promise.all([
      qd(w, id, ACC, { ketQua: cap[0], ...(cap[0] === "CON_VE" ? { gioDon: gioX } : {}) }, chup),
      qd(w, id, SUP, { ketQua: cap[1], ...(cap[1] === "CON_VE" ? { gioDon: gioY } : {}) }, chup),
    ]);
    assert.deepEqual([x.status, y.status].sort(), [200, 409], `${cap}: ${x.text} | ${y.text}`);
    const nguoiThang = x.status === 200 ? ACC : SUP;
    const don = q(w, id);
    assert.equal(don.yc.length, 1);
    assert.notEqual(don.yc[0].decided_at, null);
    assert.equal(soQuyetDinh(w, id), 1, `${cap}: đúng một dòng quyết định`);
    const conVe = don.moc.s === "confirmed";
    assert.equal(don.yc[0].ticket, conVe ? "CON_VE" : "HET_VE");
    assert.equal(don.yc[0].decided_by, nguoiThang);
    // chặng chỉ đổi theo ĐÚNG người thắng Còn vé; đơn huỷ thì chặng giữ 07:00
    assert.equal(chang(w, legId).t, conVe ? (nguoiThang === ACC ? "08:30" : "09:00") : "07:00");
    assert.equal((x.status === 200 ? y : x).json.error.code, "invalid_transition", "bên thua: đơn đã đổi trạng thái");
  }
});

test("ĐUA Rút lại vs quyết định: người xét duyệt cầm mốc + yêu cầu cũ, người lập Rút lại trước → quyết định THUA 409 (Còn vé / Hết vé), đơn vẫn nháp, yêu cầu RUT_LAI; Gửi lại y nguyên → yêu cầu KHÁC, quyết định cũ vẫn 409", async () => {
  for (const ketQua of ["CON_VE", "HET_VE"]) {
    const w = setup();
    const { id } = await choXacNhan(w);
    const cu = { moc: q(w, id).moc.u, yc: q(w, id).yc[0].id };
    assert.equal((await rut(w, id, A)).status, 200);
    const r = await qd(w, id, ACC, { ketQua }, cu);
    assert.equal(r.status, 409, `${ketQua}: ${r.text}`);
    assert.equal(q(w, id).moc.s, "draft");
    assert.equal(q(w, id).yc[0].outcome, "RUT_LAI");
    assert.equal(soQuyetDinh(w, id), 0);
    assert.equal((await gui(w, id, A)).status, 201);
    const r2 = await qd(w, id, ACC, { ketQua }, cu);
    assert.equal(r2.status, 409, `${ketQua} sau Gửi lại: ${r2.text}`);
    assert.equal(q(w, id).moc.s, "draft");
    assert.equal(q(w, id).yc.filter((y: any) => y.decided_at === null).length, 1);
  }
});

test("mốc cũ (đơn đã đổi trước khi người xét duyệt bấm) → 409 ngay, không ghi gì", async () => {
  const w = setup();
  const { id, legId } = await choXacNhan(w);
  const cu = { moc: q(w, id).moc.u, yc: q(w, id).yc[0].id };
  w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.parse(cu.moc) + 5000).toISOString(), id);
  for (const ketQua of ["CON_VE", "HET_VE"]) assert.equal((await qd(w, id, ACC, { ketQua }, cu)).status, 409, ketQua);
  assert.equal(chang(w, legId).t, "07:00");
  assert.equal(q(w, id).moc.s, "draft");
  assert.equal(soQuyetDinh(w, id), 0);
});

const laXacNhan = (stmts: { sql: string }[]) => stmts.some((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql));
const laHuy = (stmts: { sql: string }[]) => stmts.some((s) => /UPDATE orders SET status = 'cancelled'/.test(s.sql));

test("ĐUA THẬT thua ở khoá updated_at (người khác — gộp hồ sơ… — đổi đơn GIỮA lúc route đọc và lúc ghi): Còn vé kèm đổi ngày + giờ → 409, chặng + ngày + đơn + yêu cầu KHÔNG lệch nhau", async () => {
  const w = setup();
  const { id, legId, ngay } = await choXacNhan(w);
  const truoc = { chang: chang(w, legId), yc: q(w, id).yc };
  w.chenTruocLo(laXacNhan, () => { w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() + 60_000).toISOString(), id); });
  const r = await qd(w, id, ACC, { ketQua: "CON_VE", ngayDi: inDays(6), gioDon: [{ legId, pickupTime: "08:30", pickupSlotEnd: "09:00" }] });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(chang(w, legId), truoc.chang, "chặng không đổi giờ / ngày khi lô thua");
  assert.equal(w.q("SELECT depart_date d FROM order_service WHERE order_id = ?", id)[0].d, ngay);
  assert.equal(q(w, id).moc.s, "draft");
  assert.deepEqual(q(w, id).yc, truoc.yc, "yêu cầu vẫn mở");
  assert.equal(soQuyetDinh(w, id), 0);
});

test("ĐUA THẬT Rút lại chen GIỮA lúc đọc và lúc ghi: Còn vé (kèm đổi ngày + giờ) và Hết vé đều THUA 409 — đơn vẫn nháp, yêu cầu RUT_LAI, chặng + ngày nguyên, không dòng quyết định", async () => {
  for (const [ketQua, khop] of [["CON_VE", laXacNhan], ["HET_VE", laHuy]] as const) {
    const w = setup();
    const { id, legId, ngay } = await choXacNhan(w);
    const truoc = chang(w, legId);
    w.chenTruocLo(khop, async () => { assert.equal((await rut(w, id, A)).status, 200); });
    const r = await qd(w, id, ACC, { ketQua, ...(ketQua === "CON_VE" ? { ngayDi: inDays(6), gioDon: [{ legId, pickupTime: "08:30", pickupSlotEnd: "09:00" }] } : {}) });
    assert.equal(r.status, 409, `${ketQua}: ${r.text}`);
    assert.equal(q(w, id).moc.s, "draft", ketQua);
    assert.deepEqual(q(w, id).yc.map((y: any) => y.outcome), ["RUT_LAI"], ketQua);
    assert.deepEqual(chang(w, legId), truoc, ketQua);
    assert.equal(w.q("SELECT depart_date d FROM order_service WHERE order_id = ?", id)[0].d, ngay);
    assert.equal(soQuyetDinh(w, id), 0, ketQua);
    assert.equal(w.q("SELECT count(*) n FROM ord_cancel_reason WHERE order_id = ?", id)[0].n, 0, `${ketQua}: không dòng lý do huỷ mồ côi`);
  }
});

test("ĐUA THẬT Gửi lại chen sau Rút lại: người xét duyệt cầm yêu cầu cũ (đã khép) bấm Hết vé / Còn vé → 409; yêu cầu MỚI vẫn mở nguyên", async () => {
  for (const [ketQua, khop] of [["CON_VE", laXacNhan], ["HET_VE", laHuy]] as const) {
    const w = setup();
    const { id } = await choXacNhan(w);
    w.chenTruocLo(khop, async () => { assert.equal((await rut(w, id, A)).status, 200); assert.equal((await gui(w, id, A)).status, 201); });
    const r = await qd(w, id, ACC, { ketQua });
    assert.equal(r.status, 409, `${ketQua}: ${r.text}`);
    assert.equal(q(w, id).moc.s, "draft");
    assert.equal(q(w, id).yc.filter((y: any) => y.decided_at === null).length, 1);
    assert.equal(soQuyetDinh(w, id), 0);
  }
});

test("ai được quyết định (Đ5): HDV, Bán hàng khác, Quản trị, Toàn quyền → 200 qua order.confirm.review; Thực tập → 403; người lập Bán hàng tự quyết khi công tắc BẬT, TẮT thì 403", async () => {
  for (const [ai, status] of [[H, 200], [B, 200], [ADM, 200], [SUP, 200], [INTERN, 403]] as const) {
    const w = setup();
    const { id } = await choXacNhan(w);
    const r = await qd(w, id, ai, { ketQua: "CON_VE" });
    assert.equal(r.status, status, `${ai}: ${r.text}`);
    if (status === 403) assert.equal(q(w, id).moc.s, "draft");
  }
  const w1 = setup();
  const a = await choXacNhan(w1);
  assert.equal((await qd(w1, a.id, A, { ketQua: "CON_VE" })).status, 200, "công tắc mặc định BẬT");
  const w2 = setup();
  const b = await choXacNhan(w2);
  const luc = new Date().toISOString();
  w2.sqlite.prepare("INSERT INTO ord_confirm_policy (id, self_confirm_internal, valid_from_at, created_at, updated_at) VALUES (?, 0, ?, ?, ?)").run(crypto.randomUUID(), new Date(Date.now() + 1).toISOString(), luc, luc);
  await new Promise((r) => setTimeout(r, 5));
  const t = await qd(w2, b.id, A, { ketQua: "CON_VE" });
  assert.equal(t.status, 403, t.text);
  assert.equal(q(w2, b.id).moc.s, "draft");
});

test("(p) tài khoản lai Bán hàng + Đối tác: quyết định đơn chờ CỦA NGƯỜI KHÁC → 200 (hợp quyền qua hàng SALES); đơn chờ của CHÍNH họ → 403; nháp không chờ của người khác vẫn 404", async () => {
  const w = setup();
  const { id } = await choXacNhan(w, A);
  const khongCho = await lap(w, A);
  const r404 = await w.call("POST", `/api/orders/${khongCho.id}/quyet-dinh`, { as: LAI, body: { ketQua: "CON_VE", yeuCauId: crypto.randomUUID(), updatedAt: "x" } });
  assert.equal(r404.status, 404, r404.text);
  assert.equal((await qd(w, id, LAI, { ketQua: "CON_VE" })).status, 200);
  // Gửi xác nhận của người lập giữ Đối tác đóng ở Task 3.4 (partner_submit_required) — dựng yêu cầu bằng SQL.
  const w2 = setup();
  datCo(w2, "SERVICE", "ZA1", true);
  const o = await lap(w2, LAI);
  const at = new Date().toISOString();
  w2.sqlite.prepare("INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), o.id, at, LAI, at, at, at);
  const t = await qd(w2, o.id, LAI, { ketQua: "CON_VE" });
  assert.equal(t.status, 403, t.text);
  assert.equal(q(w2, o.id).moc.s, "draft");
});

test("đầu vào sai: ketQua lạ / thiếu yeuCauId / thiếu updatedAt → 400; yêu cầu KHÁC yêu cầu đang mở → 409; đơn đã xác nhận → 409; UUID sai → 404", async () => {
  const w = setup();
  const { id } = await choXacNhan(w);
  const { moc, yc } = q(w, id);
  const goi = (body: unknown) => w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: ACC, body });
  assert.equal((await goi({ ketQua: "XYZ", yeuCauId: yc[0].id, updatedAt: moc.u })).status, 400);
  assert.equal((await goi({ ketQua: "CON_VE", updatedAt: moc.u })).status, 400);
  assert.equal((await goi({ ketQua: "CON_VE", yeuCauId: yc[0].id })).status, 400);
  assert.equal((await goi({ ketQua: "CON_VE", yeuCauId: crypto.randomUUID(), updatedAt: moc.u })).status, 409);
  assert.equal((await w.call("POST", "/api/orders/khong-phai-uuid/quyet-dinh", { as: ACC, body: {} })).status, 404);
  assert.equal((await goi({ ketQua: "CON_VE", yeuCauId: yc[0].id, updatedAt: moc.u })).status, 200);
  assert.equal((await goi({ ketQua: "CON_VE", yeuCauId: yc[0].id, updatedAt: moc.u })).status, 409, "đã xác nhận rồi");
});
