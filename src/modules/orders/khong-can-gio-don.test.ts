// ADR-0228 Đ3 (việc 8): công tắc «Đơn đối tác không cần giờ đón». Bật ⇒ lượt đầu Đón chưa giờ KHÔNG còn đưa đơn Đối tác sang văn phòng xét (nhánh B nếu không lý do khác);
// TRỪ lượt đã vào hạn chốt (ADR-0193 (ii)) ⇒ vẫn nhánh A (đối tác không có ô giờ để tự sửa). Tắt (gieo) ⇒ như hôm nay. Đường cài đặt `/api/cai-dat/khong-can-gio-don`: chỉ Toàn quyền.
// Chạy CẢ ứng dụng trên SQLite thật; mốc THẬT 360 phút của khung thử ⇒ lượt chưa giờ đón HÔM NAY luôn vào hạn chốt; cách 3 ngày thì không.
import { test } from "node:test";
import assert from "node:assert/strict";
import { diNhanhAViThieuGio } from "./gio-don-cai-dat.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, H, INTERN, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const URL = "/api/cai-dat/khong-can-gio-don";
const XA = () => inDays(3);
const HOM_NAY = () => inDays(0);
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const dem = (w: any, sql: string): number => Number(w.q(sql)[0].n);
async function bat(w: any, v: boolean) {
  const r = await w.call("POST", URL, { as: SUP, body: { bat: v } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.bat, v);
}

test("diNhanhAViThieuGio: bảng chân trị — không thiếu giờ ⇒ false; Tắt ⇒ theo thiếu giờ; Bật ⇒ chỉ khi sát hạn chốt", () => {
  for (const kc of [true, false]) for (const sat of [true, false]) assert.equal(diNhanhAViThieuGio(false, kc, sat), false);
  assert.equal(diNhanhAViThieuGio(true, false, false), true);
  assert.equal(diNhanhAViThieuGio(true, false, true), true);
  assert.equal(diNhanhAViThieuGio(true, true, false), false);
  assert.equal(diNhanhAViThieuGio(true, true, true), true);
});

test("đường cài đặt: gieo Tắt; người khác Toàn quyền POST ⇒ 403, không ghi; Toàn quyền ⇒ 200 + một nhật ký không gắn đơn; gửi trạng thái đang có không ghi; thân sai 400", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { bat: false, doiDuoc: true });
  for (const ai of [ADM, A, INTERN, PARTNER, ACC, H]) assert.equal((await w.call("POST", URL, { as: ai, body: { bat: true } })).status, 403, `POST ${ai}`);
  assert.equal(dem(w, "SELECT count(*) n FROM ord_partner_pickup_time_optional_policy"), 1);
  await bat(w, true);
  await bat(w, true);
  assert.equal(dem(w, "SELECT count(*) n FROM ord_partner_pickup_time_optional_policy"), 2);
  const nk = w.q("SELECT order_id, target_type FROM audit_log WHERE action = 'pickup_time_optional_policy_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id ?? null, null);
  assert.equal(nk[0].target_type, "system");
  for (const ai of [ADM, A, PARTNER]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { bat: true, doiDuoc: false });
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", URL, { as: ai })).status, 403);
  for (const xau of ["co", 1, null]) assert.equal((await w.call("POST", URL, { as: SUP, body: { bat: xau } })).status, 400);
  assert.equal((await w.call("POST", URL, { as: SUP, body: { bat: false }, headers: { origin: null } })).status, 403, "thiếu Origin");
});

test("Bật: Đối tác, Đón chưa giờ, cách 3 ngày ⇒ nhánh B (xác nhận ngay), lượt vẫn chưa giờ; nút trên trang đơn trước khi gửi nói cùng điều (canXacNhan = false)", async () => {
  const w = setup();
  await bat(w, true);
  const o = await lap(w, PARTNER, [svc("ZB1", XA(), [leg(XA(), null)])]);
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.xacNhan.canXacNhan, false);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(w.q("SELECT pickup_time t FROM ord_transfer_leg WHERE order_id = ?", o.id)[0].t, null, "văn phòng chốt giờ sau");
});

test("Bật: lượt chưa giờ đón HÔM NAY (đã vào hạn chốt) ⇒ VẪN nhánh A, cờ theo công tắc «Bắt buộc giờ đón» (Bật ⇒ 1); trang đơn canXacNhan = true", async () => {
  const w = setup();
  await bat(w, true);
  const o = await lap(w, PARTNER, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.xacNhan.canXacNhan, true);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["CHOT_GIO"]);
  assert.equal(w.q("SELECT pickup_time_required p FROM ord_confirm_request WHERE order_id = ?", o.id)[0].p, 1);
});

test("Bật: dịch vụ cờ «cần xác nhận» + Đón chưa giờ ⇒ vẫn nhánh A vì dịch vụ, vi = [DICH_VU] (không CHOT_GIO), cờ = 0", async () => {
  const w = setup();
  await bat(w, true);
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, [svc("ZA1", XA(), [leg(XA(), null)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["DICH_VU"]);
  assert.equal(w.q("SELECT pickup_time_required p FROM ord_confirm_request WHERE order_id = ?", o.id)[0].p, 0);
});

test("Tắt (gieo) ⇒ như hôm nay: Đối tác, Đón chưa giờ cách 3 ngày ⇒ nhánh A, vi = [CHOT_GIO]; Bật rồi Tắt lại ⇒ về hành vi cũ", async () => {
  const w = setup();
  const o1 = await lap(w, PARTNER, [svc("ZB1", XA(), [leg(XA(), null)])]);
  const r1 = await guiDon(w, o1.id, PARTNER);
  assert.equal(r1.json.nhanh, "A");
  assert.deepEqual(r1.json.yeuCau.vi, ["CHOT_GIO"]);
  await bat(w, true);
  await bat(w, false);
  const o2 = await lap(w, PARTNER, [svc("ZB1", XA(), [leg(XA(), null)])]);
  assert.equal((await guiDon(w, o2.id, PARTNER)).json.nhanh, "A");
});

test("Bật: văn phòng (Bán hàng) không bị ảnh hưởng — luật thiếu giờ chỉ áp người lập giữ quyền Đối tác", async () => {
  const w = setup();
  await bat(w, true);
  const o = await lap(w, A, [svc("ZB1", XA(), [leg(XA(), null)])]);
  const r = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
});

test("ADR-0227 × ADR-0228: Bật «không cần giờ đón» + TẮT «Chặn đơn chưa có giờ đón khi sát ngày đón» ⇒ lượt chưa giờ đón HÔM NAY không còn bị chặn ⇒ nhánh B (xác nhận ngay); trang đơn nói cùng điều", async () => {
  const w = setup();
  await bat(w, true);
  const r0 = await w.call("POST", "/api/cai-dat/chan-chua-gio-sat-ngay", { as: SUP, body: { bat: false } });
  assert.equal(r0.status, 200, r0.text);
  const o = await lap(w, PARTNER, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.xacNhan.canXacNhan, false);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
});
