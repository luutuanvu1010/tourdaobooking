// ADR-0154 Đ1.2, Đ1.7 — kế hoạch lượt 2 Task 1.2: «Gửi đơn» của tài khoản Đối tác khi LƯỢT ĐẦU của một dịch vụ chọn Đón mà chưa có giờ → luôn nhánh A (dù dịch vụ không «cần xác nhận»),
// máy chủ chụp cờ «cần chốt giờ» vào `ord_confirm_request.pickup_time_required`. Luật KHÔNG nằm trong `tinhCanXacNhan` nên đơn văn phòng không đổi. Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs). Bài không phụ thuộc giờ thật: ngày đi cách ≥ 3 ngày.
//
// Hai nhóm bài:
//   - BÀI ĐỔI HÀNH VI (đỏ trước khi thi công): (a), (a2), (k), (q), (d2), Review Focus 4, dịch vụ cờ + chốt giờ, danh sách chờ / chi tiết đơn nhận CHOT_GIO; (E3, ruling R7 — sau kiểm độc lập) thứ tự lượt đầu «chiều đi trước chiều về».
//   - BÀI GHIM HÀNH VI KHÔNG ĐỔI (xanh cả trước lẫn sau, ghim để lần sửa sau không phá): (b), (d1), (e), (l), (p), (q2), «văn phòng không bao giờ mang cờ», «khoản thu đã có».
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_BAO_GUI_DON } from "../../shared/gui-don-cau-bao.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, B, LAI, LOC, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const RET = (d: string | null, t: string | null) => ({ ...leg(d, t), direction: "RETURN" });
const NGAY = () => inDays(3);
const mo = (w: any, orderId: string) => w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? ORDER BY submitted_at, rowid", orderId);
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const rutLai = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as, body: {} });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const status = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
/** Dịch vụ thường (không cờ «cần xác nhận») có MỘT lượt đón chiều đi, giờ `t` (null = chưa có giờ). */
const dichVuDon = (t: string | null) => svc("ZB1", NGAY(), [leg(NGAY(), t)]);
/** Sửa nháp: gửi lại dịch vụ với `legs` khác, giữ id dịch vụ (cách dựng của xac-nhan-lech-tien.test.ts). */
async function sua(w: any, id: string, as: string, dichVu: any) {
  const doc = (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
  return w.call("PUT", `/api/orders/${id}`, { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: doc.updatedAt, services: [{ ...dichVu, id: doc.services[0].id }] } });
}

test("(a) Đối tác, dịch vụ thường, Đón không giờ → 201 nhánh A, vi = [CHOT_GIO], cờ chụp = 1, đơn vẫn nháp, câu A nguyên văn", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon(null)]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.equal(r.json.thongBao, CAU_BAO_GUI_DON.A);
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
  assert.equal(trangThai(w, o.id), "draft");
  const y = mo(w, o.id);
  assert.equal(y.length, 1);
  assert.equal(y[0].pickup_time_required, 1);
  assert.equal(y[0].decided_at, null);
});

test("(a2) Review Focus 1: chiều đi trống giờ + chiều về có giờ gợi ý cùng ngày → vẫn nhánh A (lượt đầu là chiều đi, không phải legs[0] của xepChang)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null), RET(NGAY(), "16:00")])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
  assert.equal(mo(w, o.id)[0].pickup_time_required, 1);
});

test("(E3, ruling R7) chiều về ở NGÀY SỚM HƠN và có giờ gợi ý, chiều đi trống giờ → vẫn nhánh A, cờ 1 (chiều đi trước chiều về bất kể ngày); đối chứng: chiều đi có giờ thì chiều về trống không cần → nhánh B", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null), RET(inDays(2), "16:00")])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
  assert.equal(mo(w, o.id)[0].pickup_time_required, 1);
  const w2 = setup();
  const ok = await lap(w2, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), "07:30"), RET(inDays(2), null)])]);
  const rb = await guiDon(w2, ok.id, PARTNER);
  assert.equal(rb.status, 200, rb.text);
  assert.equal(rb.json.nhanh, "B", "lượt đầu là chiều đi (có giờ); chiều về ở ngày sớm hơn không giờ không bị đòi");
});

test("(b) Không đón → nhánh B như cũ: 200, đơn đã xác nhận, không mở yêu cầu (đúng đơn đối chứng của gui-don-route.test.ts (2))", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY())]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(r.json.thongBao, CAU_BAO_GUI_DON.B);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(mo(w, o.id).length, 0, "nhánh B không mở yêu cầu");
});

test("(k) chỉ có chiều về, không giờ → nhánh A (lượt đầu của dịch vụ là chiều về duy nhất)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [RET(NGAY(), null)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
});

test("(q) tài khoản lai Bán hàng + Đối tác, Đón không giờ → nhánh A, cờ = 1 (luật theo QUYỀN Đối tác của người lập, kể cả lai)", async () => {
  const w = setup();
  const o = await lap(w, LAI, [dichVuDon(null)]);
  const r = await guiDon(w, o.id, LAI);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
  assert.equal(mo(w, o.id)[0].pickup_time_required, 1);
});

test("(q2) lượt đầu CÓ giờ qua API (cách ≥ 3 ngày, qua cổng 6 giờ) → nhánh B, không mở yêu cầu, không cờ (ADR-0154 Đ1.7: không phải lỗ)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon("08:00")]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(mo(w, o.id).length, 0);
});

test("(d1) đơn nháp của đối tác chưa gửi, Đón không giờ: người lập /status 409 partner_submit_required; Bán hàng khác 404; Toàn quyền 404 — không đường xác nhận nào khác (Đ1.7)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon(null)]);
  const t = await status(w, o.id, PARTNER);
  assert.equal(t.status, 409, t.text);
  assert.equal(t.json.error.code, "partner_submit_required");
  assert.equal((await status(w, o.id, B)).status, 404);
  assert.equal((await status(w, o.id, SUP)).status, 404);
  assert.equal(trangThai(w, o.id), "draft");
});

test("(d2) cùng đơn SAU khi vào nhánh A (yêu cầu đang mở): người lập /status vẫn 409 (khoá khi chờ — mã `confirm_pending_locked` đến trước mã partner_submit_required); người khác 404", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon(null)]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  const t = await status(w, o.id, PARTNER);
  assert.equal(t.status, 409, t.text);
  assert.equal(t.json.error.code, "confirm_pending_locked");
  assert.equal((await status(w, o.id, B)).status, 404);
  assert.equal((await status(w, o.id, SUP)).status, 404);
  assert.equal(trangThai(w, o.id), "draft");
});

// m-1 (kiểm độc lập Đợt 1): bài này chỉ ghim ĐIỀU KIỆN CẦN của phí đón theo nơi (câu đã áp số 6) — Đón không giờ vẫn lưu đúng nơi đón / nơi trả như đơn có giờ, cùng tổng tiền. Chưa có mã
// tính phí đón (ADR-0147) nên CHƯA kiểm số tiền phí đón; ai thêm mã đó phải thêm bài tiền riêng.
test("(e) điều kiện cần của phí đón theo nơi (câu đã áp số 6): Đón không giờ và đơn cùng nơi có giờ ra CÙNG tổng tiền, CÙNG nơi đón / nơi trả đã lưu (form đối tác vẫn gửi Nơi đón, Nơi trả); chưa kiểm tiền phí đón", async () => {
  const w = setup();
  const khongGio = await lap(w, PARTNER, [dichVuDon(null)]);
  const coGio = await lap(w, PARTNER, [dichVuDon("08:00")]);
  const doc = (id: string) => ({
    tong: w.q("SELECT total FROM orders WHERE id = ?", id)[0].total,
    chang: w.q("SELECT pickup_place, dropoff_location_id, dropoff_place FROM ord_transfer_leg WHERE order_id = ? AND closed_at IS NULL", id),
  });
  assert.deepEqual(doc(khongGio.id), doc(coGio.id));
  assert.equal(doc(khongGio.id).chang.length, 1);
  assert.equal(doc(khongGio.id).chang[0].pickup_place, "Khách sạn Dò Tìm");
  assert.equal(doc(khongGio.id).chang[0].dropoff_location_id, LOC);
});

test("(l) tài khoản lai thôi giữ quyền Đối tác khi đơn còn nháp, Đón không giờ: trước khi thôi quyền /status 409 partner_submit_required; sau khi thôi /status 200 confirmed (Đ1.7 — đúng như hôm nay)", async () => {
  const w = setup();
  const o = await lap(w, LAI, [dichVuDon(null)]);
  const truoc = await status(w, o.id, LAI);
  assert.equal(truoc.status, 409, truoc.text);
  assert.equal(truoc.json.error.code, "partner_submit_required");
  assert.equal(trangThai(w, o.id), "draft");
  w.sqlite.prepare("UPDATE stf_permission SET valid_to_at = ?, updated_at = ? WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(new Date().toISOString(), new Date().toISOString(), LAI);
  const sau = await status(w, o.id, LAI);
  assert.equal(sau.status, 200, sau.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(mo(w, o.id).length, 0);
});

test("(p) đối tác lưu nháp có Đón mà Ghi chú trống → 201, không 400 (ghi chú không bắt buộc; giờ cũng không)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon(null)]); // `lap` khẳng định 201
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(o.services[0].note ?? null, null);
});

test("văn phòng không bao giờ mang cờ: Bán hàng Gửi xác nhận đơn có cờ dịch vụ và Đón không giờ → cờ = 0, vi chỉ [DICH_VU]", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, [svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.yeuCau.vi, ["DICH_VU"]);
  assert.equal(mo(w, o.id)[0].pickup_time_required, 0);
  // và Bán hàng thuần xác nhận thẳng đơn thường Đón không giờ như hôm nay
  const thuong = await lap(w, A, [dichVuDon(null)]);
  assert.equal((await status(w, thuong.id, A)).status, 200);
  assert.equal(mo(w, thuong.id).length, 0);
});

test("Review Focus 4 (chiều 1): nhánh A → Rút lại → PUT sang Không đón → gửi lại → nhánh B; yêu cầu cũ giữ cờ = 1, không mở yêu cầu mới", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon(null)]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  assert.equal((await rutLai(w, o.id, PARTNER)).status, 200);
  const luu = await sua(w, o.id, PARTNER, svc("ZB1", NGAY()));
  assert.equal(luu.status, 200, luu.text);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
  const ys = mo(w, o.id);
  assert.equal(ys.length, 1, "chỉ yêu cầu cũ (đã rút lại)");
  assert.equal(ys[0].outcome, "RUT_LAI");
  assert.equal(ys[0].pickup_time_required, 1, "cờ của yêu cầu đã khép không đổi");
});

test("Review Focus 4 (chiều 2): Không đón → sửa sang Đón không giờ → gửi → nhánh A, yêu cầu mới cờ = 1; Rút lại, sửa lại có giờ → gửi lại → nhánh B", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY())]);
  assert.equal((await sua(w, o.id, PARTNER, dichVuDon(null))).status, 200);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.equal(mo(w, o.id)[0].pickup_time_required, 1);
  assert.equal((await rutLai(w, o.id, PARTNER)).status, 200);
  assert.equal((await sua(w, o.id, PARTNER, dichVuDon("08:00"))).status, 200);
  const lai = await guiDon(w, o.id, PARTNER);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
});

test("dịch vụ cờ «cần xác nhận» + Đón không giờ: vi đúng [DICH_VU, CHOT_GIO] (hai lý do cùng nêu), cờ = 1", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, [svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.yeuCau.vi, ["DICH_VU", "CHOT_GIO"]);
  assert.equal(mo(w, o.id)[0].pickup_time_required, 1);
});

test("khoản thu đã có: nhánh A (kể cả vì CHOT_GIO) bị chặn 409 confirm_blocked_has_payment như gui-don-route.test.ts — không rơi sang nhánh B", async () => {
  const w = setup({ daThuGia: 1 });
  const o = await lap(w, PARTNER, [dichVuDon(null)]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "confirm_blocked_has_payment");
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(mo(w, o.id).length, 0);
});

test("danh sách chờ và chi tiết đơn: yêu cầu mang cờ nêu CHOT_GIO với người xét (Kế toán) và với người lập; đơn văn phòng không có", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [dichVuDon(null)]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  const ds = await w.call("GET", "/api/orders/cho-xac-nhan", { as: ACC });
  assert.equal(ds.status, 200, ds.text);
  const dong = (ds.json.don as any[]).find((d) => d.orderId === o.id);
  assert.ok(dong, "đơn có trong danh sách chờ");
  assert.deepEqual(dong.vi, ["CHOT_GIO"]);
  const chiTiet = await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER });
  assert.equal(chiTiet.status, 200, chiTiet.text);
  assert.deepEqual(chiTiet.json.xacNhan.yeuCau.vi, ["CHOT_GIO"]);
  const xet = await w.call("GET", `/api/orders/${o.id}`, { as: ACC });
  assert.deepEqual(xet.json.xacNhan.yeuCau.vi, ["CHOT_GIO"]);
  // đơn văn phòng cờ dịch vụ: vi không có CHOT_GIO
  datCo(w, "SERVICE", "ZA1", true);
  const vp = await lap(w, A, [svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  assert.equal((await w.call("POST", `/api/orders/${vp.id}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
  const ds2 = await w.call("GET", "/api/orders/cho-xac-nhan", { as: ACC });
  const dongVp = (ds2.json.don as any[]).find((d) => d.orderId === vp.id);
  assert.deepEqual(dongVp.vi, ["DICH_VU"]);
});
