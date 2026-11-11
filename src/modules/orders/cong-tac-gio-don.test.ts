// ADR-0193 câu (i) — kế hoạch 2026-11-08 Task 5B.2: công tắc «Bắt buộc giờ đón cho đơn đối tác» vào luật Gửi đơn. Công tắc KHÔNG đổi nhánh (`canChotGioCuaNguoiLap` giữ nguyên, Tắt vẫn
// nhánh A); nó chỉ quyết cờ «cần chốt giờ» chụp vào yêu cầu và lý do `CHOT_GIO` (`coChotGio`). Chụp tại mốc: đổi công tắc sau khi gửi không đổi cờ. Chạy CẢ ứng dụng trên SQLite thật.
// Ngày đi cách 3 ngày: không chạm câu (ii) (hạn chốt), không chạm mốc 6 giờ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_BAO_GUI_DON } from "../../shared/gui-don-cau-bao.ts";
import { coChotGio } from "./gio-don-cai-dat.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const NGAY = () => inDays(3);
const RET = (d: string | null, t: string | null) => ({ ...leg(d, t), direction: "RETURN" });
const yc = (w: any, orderId: string) => w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? ORDER BY submitted_at, rowid", orderId);
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
async function congTac(w: any, bat: boolean) {
  const r = await w.call("POST", "/api/cai-dat/bat-buoc-gio-don", { as: SUP, body: { bat } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.bat, bat);
}
function qd(w: any, id: string, as: string, extra: Record<string, unknown> = {}) {
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0];
  const y = yc(w, id).find((r: any) => r.decided_at === null);
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: y?.id, updatedAt: moc.u, ketQua: "CON_VE", ...extra } });
}

test("coChotGio: bảng chân trị — chỉ true khi đi nhánh A vì thiếu giờ VÀ công tắc Bật", () => {
  assert.equal(coChotGio(true, true), true);
  assert.equal(coChotGio(true, false), false);
  assert.equal(coChotGio(false, true), false);
  assert.equal(coChotGio(false, false), false);
});

test("Bật (mặc định): Đối tác, Đón chưa giờ ⇒ nhánh A, cờ = 1, vi = [CHOT_GIO] (hành vi ADR-0154 Đ1.2 không đổi)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
  assert.equal(yc(w, o.id)[0].pickup_time_required, 1);
});

test("Tắt: Đối tác, Đón chưa giờ ⇒ VẪN nhánh A (văn phòng xét), cờ = 0, vi rỗng; nhật ký «Gửi kiểm vé» không có «·» thừa; Còn vé không gửi giờ ⇒ 200 confirmed, chặng vẫn chưa giờ", async () => {
  const w = setup();
  await congTac(w, false);
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A", "câu (i) phương án đã duyệt: vẫn qua văn phòng");
  assert.equal(r.json.thongBao, CAU_BAO_GUI_DON.A);
  assert.deepEqual(r.json.yeuCau.vi, []);
  assert.equal(yc(w, o.id)[0].pickup_time_required, 0);
  const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_confirm_requested'", o.id);
  assert.equal(nk.length, 1);
  assert.equal(nk[0].detail, "Gửi kiểm vé", "vi rỗng: không còn đuôi « · »");
  const c = await qd(w, o.id, B);
  assert.equal(c.status, 200, c.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(w.q("SELECT pickup_time t FROM ord_transfer_leg WHERE order_id = ?", o.id)[0].t, null, "giờ chưa chốt: văn phòng điền sau");
});

test("Tắt: Đối tác, lượt đầu có giờ ⇒ nhánh B; Không đón ⇒ nhánh B (không đổi)", async () => {
  const w = setup();
  await congTac(w, false);
  const coGio = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), "07:30")])]);
  const r1 = await guiDon(w, coGio.id, PARTNER);
  assert.equal(r1.status, 200, r1.text);
  assert.equal(r1.json.nhanh, "B");
  const khong = await lap(w, PARTNER, [svc("ZB1", NGAY())]);
  const r2 = await guiDon(w, khong.id, PARTNER);
  assert.equal(r2.status, 200, r2.text);
  assert.equal(r2.json.nhanh, "B");
});

test("Tắt: dịch vụ cờ «cần xác nhận» + Đón chưa giờ ⇒ vi = [DICH_VU], cờ = 0; văn phòng Gửi xác nhận vẫn cờ = 0 như hôm nay", async () => {
  const w = setup();
  await congTac(w, false);
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, [svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.yeuCau.vi, ["DICH_VU"]);
  assert.equal(yc(w, o.id)[0].pickup_time_required, 0);
  const vp = await lap(w, A, [svc("ZA1", NGAY(), [leg(NGAY(), null)])]);
  const r2 = await w.call("POST", `/api/orders/${vp.id}/gui-xac-nhan`, { as: A, body: {} });
  assert.equal(r2.status, 201, r2.text);
  assert.deepEqual(r2.json.yeuCau.vi, ["DICH_VU"]);
  assert.equal(yc(w, vp.id)[0].pickup_time_required, 0);
});

test("Review Focus 4 — chụp tại mốc: Gửi đơn khi Bật (cờ = 1), Toàn quyền TẮT, Còn vé không giờ ⇒ vẫn 409 pickup_time_required, không ghi gì; chiều ngược: gửi khi Tắt, BẬT lại ⇒ Còn vé không giờ vẫn 200", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  await congTac(w, false);
  const c = await qd(w, o.id, B);
  assert.equal(c.status, 409, c.text);
  assert.equal(c.json.error.code, "pickup_time_required");
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(yc(w, o.id)[0].pickup_time_required, 1, "cờ đã chụp không đổi");
  const o2 = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  assert.equal((await guiDon(w, o2.id, PARTNER)).status, 201);
  assert.equal(yc(w, o2.id)[0].pickup_time_required, 0);
  await congTac(w, true);
  const c2 = await qd(w, o2.id, B);
  assert.equal(c2.status, 200, c2.text);
});

test("Tắt: chi tiết đơn (người xét và người lập) và danh sách chờ KHÔNG nêu CHOT_GIO; người lập vẫn thấy canXacNhan trước khi gửi (vẫn phải qua văn phòng)", async () => {
  const w = setup();
  await congTac(w, false);
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.xacNhan.canXacNhan, true, "nút trên trang đơn và route nói cùng một điều: nhánh A");
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  assert.deepEqual((await w.call("GET", `/api/orders/${o.id}`, { as: B })).json.xacNhan.yeuCau.vi, []);
  assert.deepEqual((await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.xacNhan.yeuCau.vi, []);
  const dong = ((await w.call("GET", "/api/orders/cho-xac-nhan", { as: B })).json.don as any[]).find((d) => d.orderId === o.id);
  assert.ok(dong);
  assert.deepEqual(dong.vi, []);
});

test("danh sách chờ: lượt đầu (chiều đi) CHƯA giờ mà chiều về có giờ gợi ý ⇒ gioDon = null cả khi cờ = 0 (giờ chiều về không được trông như giờ đón của đơn)", async () => {
  const w = setup();
  await congTac(w, false);
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null), RET(NGAY(), "16:00")])]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  assert.equal(yc(w, o.id)[0].pickup_time_required, 0);
  const dong = ((await w.call("GET", "/api/orders/cho-xac-nhan", { as: B })).json.don as any[]).find((d) => d.orderId === o.id);
  assert.equal(dong.gioDon, null);
});
