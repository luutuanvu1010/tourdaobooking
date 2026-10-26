// ADR-0136 Đ2, Đ3, Đ12 — Task 3.3 (lát 1): Gửi xác nhận / Rút lại / khoá khi chờ / chặn khi đơn đã có khoản thu / `/status` đòi Gửi xác nhận.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bài không phụ thuộc giờ thật: ngày đi cách ≥ 3 ngày, không dựng chặng dưới mốc trừ ca (m).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hanXacNhan } from "../../shared/xac-nhan-don.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, ACC, SUP, INTERN, datCo, inDays, lap, leg, setup, svc, vnSau } from "../../../tests/audit/xac-nhan-khung.mjs";

const mo = (w: any, orderId: string) => w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? ORDER BY submitted_at, rowid", orderId);
const nhatKy = (w: any, orderId: string, action: string) => w.q("SELECT * FROM audit_log WHERE order_id = ? AND action = ?", orderId, action);
const gui = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const rut = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as, body: {} });

test("gửi xác nhận: đơn có dịch vụ cần xác nhận → 201, yêu cầu mở, hạn = hanXacNhan(giờ gửi), đơn vẫn nháp, nhật ký không ghi SĐT/email", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  const r = await gui(w, o.id, A);
  assert.equal(r.status, 201, r.text);
  const y = mo(w, o.id);
  assert.equal(y.length, 1);
  assert.equal(y[0].decided_at, null);
  assert.equal(y[0].submitted_by, A);
  assert.equal(y[0].deadline_at, hanXacNhan(y[0].submitted_at));
  // Hạn kiểm ĐỘC LẬP với chính hàm hanXacNhan (bài không phụ thuộc giờ thật): ít nhất 15 phút, và đúng 15 phút khi gửi trong khung ngày 06:00–21:40 giờ VN.
  const dau = Date.parse(y[0].submitted_at);
  const phutVn = new Date(dau + 7 * 3600e3).getUTCHours() * 60 + new Date(dau).getUTCMinutes();
  assert.ok(Date.parse(y[0].deadline_at) - dau >= 15 * 60_000);
  if (phutVn >= 6 * 60 && phutVn <= 21 * 60 + 40) assert.equal(Date.parse(y[0].deadline_at) - dau, 15 * 60_000);
  assert.equal(r.json.yeuCau.id, y[0].id);
  assert.equal(r.json.yeuCau.hanLuc, y[0].deadline_at);
  assert.deepEqual(r.json.yeuCau.vi, ["DICH_VU"]);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "draft");
  const nk = nhatKy(w, o.id, "order_confirm_requested");
  assert.equal(nk.length, 1);
  assert.ok(!/\d{9,}|@/.test(String(nk[0].detail ?? "")), "nhật ký không có số điện thoại / thư");
});

test("gửi xác nhận: đơn không thuộc diện cần xác nhận → 409 confirm_not_required, không dòng yêu cầu", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, [svc("ZB1", inDays(3))]);
  const r = await gui(w, o.id, A);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "confirm_not_required");
  assert.equal(mo(w, o.id).length, 0);
});

test("gửi xác nhận: chỉ người lập (người khác kể cả Toàn quyền → 404); Kế toán không lập đơn; đơn đã xác nhận → không gửi được", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  for (const as of [B, ACC, SUP]) assert.equal((await gui(w, o.id, as)).status, 404, as);
  assert.equal(mo(w, o.id).length, 0);
  const t = await lap(w, A, [svc("ZB1", inDays(3))]);
  assert.equal((await w.call("POST", `/api/orders/${t.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const sau = await gui(w, t.id, A);
  assert.ok(sau.status === 409 || sau.status === 404, sau.text);
  assert.equal(mo(w, t.id).length, 0);
});

test("gửi xác nhận: gửi hai lần → lần hai 409 confirm_already_open; vẫn đúng MỘT yêu cầu mở", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  assert.equal((await gui(w, o.id, A)).status, 201);
  const r2 = await gui(w, o.id, A);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "confirm_already_open");
  assert.equal(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0].n, 1);
});

test("`/status` xác nhận đơn cần xác nhận → 409 confirm_request_required; đang chờ thì khoá (confirm_pending_locked) cả xác nhận lẫn huỷ; đơn thường vẫn xác nhận như cũ", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  const s1 = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(s1.status, 409, s1.text);
  assert.equal(s1.json.error.code, "confirm_request_required");
  assert.equal(s1.json.error.message, "Đơn có dịch vụ cần xác nhận, hãy bấm Gửi xác nhận.");
  assert.equal((await gui(w, o.id, A)).status, 201);
  for (const body of [{ status: "confirmed" }, { status: "cancelled", reason: "KHACH_DOI_Y" }]) {
    const s = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body });
    assert.equal(s.status, 409, s.text);
    assert.equal(s.json.error.code, "confirm_pending_locked");
  }
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "draft");
  const t = await lap(w, A, [svc("ZB1", inDays(3))]);
  assert.equal((await w.call("POST", `/api/orders/${t.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
});

test("Đ12: bỏ cờ khi đang chờ → /status vẫn khoá (không để lại yêu cầu mở trên đơn đã xác nhận); nháp MỚI của dịch vụ đó không còn phải gửi", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  assert.equal((await gui(w, o.id, A)).status, 201);
  datCo(w, "SERVICE", "ZA1", false, new Date().toISOString());
  const s = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(s.status, 409, s.text);
  assert.equal(s.json.error.code, "confirm_pending_locked");
  const moi = await lap(w, A);
  assert.equal((await w.call("POST", `/api/orders/${moi.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
});

test("khoá khi chờ (Review Focus 9): PUT đơn, PUT booker, POST chặng, POST hành khách → 409 confirm_pending_locked; rút lại → PUT 200", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  assert.equal((await gui(w, o.id, A)).status, 201);
  const khoa = async (kq: Promise<any>, nhan: string) => {
    const r = await kq;
    assert.equal(r.status, 409, `${nhan}: ${r.text}`);
    assert.equal(r.json.error.code, "confirm_pending_locked", nhan);
    assert.equal(r.json.error.message, "Đơn đang chờ xác nhận, hãy Rút lại trước khi sửa.");
  };
  const body = { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(4))], expectedUpdatedAt: o.updatedAt };
  await khoa(w.call("PUT", `/api/orders/${o.id}`, { as: A, body }), "PUT đơn");
  await khoa(w.call("PUT", `/api/orders/${o.id}/booker`, { as: A, body: { booker: { kind: "none" }, customerName: "Khách Thử", customerPhone: "0912345678" } }), "PUT booker");
  await khoa(w.call("POST", `/api/orders/${o.id}/legs`, { as: A, body: {} }), "POST legs");
  await khoa(w.call("POST", `/api/orders/${o.id}/passengers`, { as: A, body: { passengers: [] } }), "POST passengers");
  await khoa(w.call("PUT", `/api/orders/${o.id}/trip`, { as: A, body: {} }), "PUT trip");
  // Rút lại → mở khoá
  assert.equal((await rut(w, o.id, A)).status, 200);
  const moi = (await w.call("GET", `/api/orders/${o.id}`, { as: A })).json.order;
  const ok = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: { ...body, expectedUpdatedAt: moi.updatedAt } });
  assert.equal(ok.status, 200, ok.text);
});

test("rút lại: người lập rút → 200, yêu cầu khép RUT_LAI không có kết quả vé, nhật ký order_confirm_withdrawn; không có yêu cầu mở → 409; người khác → 404; gửi lại được (yêu cầu KHÁC)", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  assert.equal((await rut(w, o.id, A)).status, 409, "chưa có yêu cầu mở");
  assert.equal((await gui(w, o.id, A)).status, 201);
  assert.equal((await rut(w, o.id, B)).status, 404);
  assert.equal((await rut(w, o.id, SUP)).status, 404);
  const r = await rut(w, o.id, A);
  assert.equal(r.status, 200, r.text);
  const y = mo(w, o.id);
  assert.equal(y.length, 1);
  assert.equal(y[0].outcome, "RUT_LAI");
  assert.equal(y[0].ticket, null);
  assert.equal(y[0].decided_by, A);
  assert.equal(nhatKy(w, o.id, "order_confirm_withdrawn").length, 1);
  const g2 = await gui(w, o.id, A);
  assert.equal(g2.status, 201, g2.text);
  const y2 = mo(w, o.id);
  assert.equal(y2.length, 2);
  assert.notEqual(y2[0].id, y2[1].id);
});

test("Đ3 chưa có khoản thu: số đã thu > 0 → 409 confirm_blocked_has_payment, không dòng yêu cầu, đơn vẫn nháp; không tiêm hàm → 503 khoan_thu_chua_kiem; đã thu 0 → gửi được", async () => {
  for (const [tuyChon, status, ma] of [[{ daThuGia: 1 }, 409, "confirm_blocked_has_payment"], [{ khongTiemDaThu: true }, 503, "khoan_thu_chua_kiem"], [{ daThuGia: 0 }, 201, null]] as const) {
    const w = setup(tuyChon);
    datCo(w, "SERVICE", "ZA1", true);
    const o = await lap(w, A);
    const r = await gui(w, o.id, A);
    assert.equal(r.status, status, `${JSON.stringify(tuyChon)}: ${r.text}`);
    if (ma) {
      assert.equal(r.json.error.code, ma);
      assert.equal(mo(w, o.id).length, 0);
      assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "draft");
    }
    if (ma === "confirm_blocked_has_payment") assert.equal(r.json.error.message, "Đơn đã có khoản thu nên chưa gửi xác nhận được. Hãy báo Kế toán.");
  }
});

test("(m) đơn không có dịch vụ cờ nhưng chặng đón dưới mốc 6 giờ chưa đặt gấp → /status 409 confirm_request_required; gửi được (vi DAT_GAP), không bị short_notice_required", async () => {
  const w = setup();
  const gio = vnSau(60);
  const o = await lap(w, A, [svc("ZB1", gio.date, [leg(gio.date, gio.time)])]);
  const s = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(s.status, 409, s.text);
  assert.equal(s.json.error.code, "confirm_request_required");
  const r = await gui(w, o.id, A);
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.yeuCau.vi, ["DAT_GAP"]);
});

test("Thực tập cũng gửi xác nhận cho đơn của mình (Thực tập không tự xác nhận đơn cần xác nhận); Đối tác (chưa có Gửi đơn) không bị chặn bởi route này vì không có ô order.modify của người khác", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, INTERN, [svc("ZA1", inDays(3))]);
  const r = await gui(w, o.id, INTERN);
  assert.equal(r.status, 201, r.text);
});
