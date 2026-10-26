// ADR-0136 Task 3.5 (L6): `GET /api/orders/:id` trả khối `xacNhan` — nguồn DUY NHẤT để giao diện biết đơn nháp đang chờ, cần xác nhận hay không, và ai quyết định được.
// Giao diện không suy ra các cờ này (cùng nguyên tắc `canModify`). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, B, H, INTERN, LAI, PARTNER, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const xem = async (w: any, id: string, as: string) => w.call("GET", `/api/orders/${id}`, { as });
const gui = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const idYeuCau = (w: any, id: string) => w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0]?.id ?? null;

test("người lập (Bán hàng) trước khi gửi: canXacNhan đúng theo cờ, chưa có yêu cầu; không cờ thì canXacNhan false", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const can = await lap(w, A);
  const r = await xem(w, can.id, A);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.xacNhan, { yeuCau: null, canXacNhan: true, quyetDinhDuoc: false });
  const khong = await lap(w, A, [svc("ZB1", inDays(3))]);
  assert.deepEqual((await xem(w, khong.id, A)).json.xacNhan, { yeuCau: null, canXacNhan: false, quyetDinhDuoc: false });
});

test("đang chờ: người lập thấy yêu cầu (id, hạn); Bán hàng lập + công tắc bật tự quyết được; Kế toán / HDV chưa phụ trách / Bán hàng khác thấy cùng yêu cầu và quyết được", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A);
  assert.equal((await gui(w, o.id, A)).status, 201);
  const yid = idYeuCau(w, o.id);
  const han = w.q("SELECT deadline_at h FROM ord_confirm_request WHERE id = ?", yid)[0].h;
  const lapNguoi = (await xem(w, o.id, A)).json.xacNhan;
  assert.equal(lapNguoi.yeuCau.id, yid);
  assert.equal(lapNguoi.yeuCau.hanLuc, han);
  assert.equal(lapNguoi.yeuCau.quaHan, false);
  assert.deepEqual(lapNguoi.yeuCau.vi, ["DICH_VU"]);
  assert.equal(lapNguoi.quyetDinhDuoc, true, "công tắc tự xác nhận mặc định BẬT");
  for (const ai of [ACC, H, B]) {
    const x = (await xem(w, o.id, ai)).json.xacNhan;
    assert.equal(x.yeuCau.id, yid, ai);
    assert.equal(x.quyetDinhDuoc, true, ai);
    assert.equal(x.canXacNhan, false, `${ai}: canXacNhan chỉ tính cho người lập`);
  }
});

test("Đối tác / tài khoản lai lập: đang chờ vẫn thấy yêu cầu nhưng KHÔNG tự quyết được; công tắc tắt thì Bán hàng cũng không", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const p = await lap(w, PARTNER);
  assert.equal((await w.call("POST", `/api/orders/${p.id}/gui-don`, { as: PARTNER, body: {} })).status, 201);
  const xp = (await xem(w, p.id, PARTNER)).json.xacNhan;
  assert.equal(xp.yeuCau.id, idYeuCau(w, p.id));
  assert.equal(xp.quyetDinhDuoc, false);
  const l = await lap(w, LAI);
  assert.equal((await w.call("POST", `/api/orders/${l.id}/gui-don`, { as: LAI, body: {} })).status, 201);
  assert.equal((await xem(w, l.id, LAI)).json.xacNhan.quyetDinhDuoc, false);
  assert.equal((await xem(w, l.id, ACC)).json.xacNhan.quyetDinhDuoc, true);
  // công tắc tắt
  const luc = new Date().toISOString();
  w.sqlite.prepare("INSERT INTO ord_confirm_policy (id, self_confirm_internal, valid_from_at, created_at, updated_at) VALUES (?, 0, ?, ?, ?)").run(crypto.randomUUID(), new Date(Date.now() + 1).toISOString(), luc, luc);
  const o = await lap(w, A);
  assert.equal((await gui(w, o.id, A)).status, 201);
  assert.equal((await xem(w, o.id, A)).json.xacNhan.quyetDinhDuoc, false);
});

test("Thực tập lập: không bao giờ tự quyết (không giữ ô xét duyệt)", async () => {
  const w = setup();
  const i = await lap(w, INTERN);
  const r = await xem(w, i.id, INTERN);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.xacNhan.quyetDinhDuoc, false);
});

test("đơn đã xác nhận: xacNhan null; khối xacNhan không chứa tên / SĐT / email khách", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", inDays(3))]);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await xem(w, o.id, A)).json.xacNhan, null);
  datCo(w, "SERVICE", "ZA1", true);
  const c = await lap(w, A, [svc("ZA1", inDays(3), [leg(inDays(3), "07:00")])], { customerEmail: "khach@example.com" });
  assert.equal((await gui(w, c.id, A)).status, 201);
  const r = await xem(w, c.id, ACC);
  assert.ok(!JSON.stringify(r.json.xacNhan).match(/0912345678|khach@example|Khách Thử/));
});
