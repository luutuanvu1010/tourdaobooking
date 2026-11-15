// ADR-0178 Đ1 mục 2 — Task A1: dấu «Khách của đối tác trả cho Công ty» chụp MỘT lần lúc lập đơn của tài khoản Đối tác.
//   - Đối tác lập: dấu = công tắc lúc đó (1 Bật / 0 Tắt); văn phòng lập: NULL; tài khoản lai (có Đối tác) cũng chụp.
//   - Hàm đọc ném lỗi ⇒ 503 `kenh_thu_chua_doc_duoc`, không có đơn; người không phải Đối tác không bị hỏi công tắc (đọc lỗi cũng lập được).
//   - Lưu nháp lại không đổi dấu; đổi công tắc sau đó cũng không đổi dấu (Review Focus 1); CSDL cấm đổi.
//   - Đường THẬT của `src/index.ts` tiêm `kenhThuHienTai` (quên tiêm ⇒ router trả 1 ⇒ bài này đỏ).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { A, LAI, PARTNER, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

type W = ReturnType<typeof setup>;
const dung = (kenhThuGia?: () => Promise<0 | 1>): W => setup(kenhThuGia ? { kenhThuGia } : {});
const lap = (w: W, as: string) => w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))] } });
const dau = (w: W, id: string) => w.q("SELECT company_collects_snapshot AS d FROM orders WHERE id = ?", id)[0].d;
const soDon = (w: W) => Number(w.q("SELECT count(*) AS n FROM orders")[0].n);

test("Đối tác lập khi công tắc trả 0 ⇒ dấu 0; trả 1 ⇒ dấu 1", async () => {
  let v: 0 | 1 = 0;
  const w = dung(async () => v);
  const r0 = await lap(w, PARTNER);
  assert.equal(r0.status, 201, r0.text);
  assert.equal(dau(w, r0.json.order.id), 0);
  v = 1;
  const r1 = await lap(w, PARTNER);
  assert.equal(r1.status, 201, r1.text);
  assert.equal(dau(w, r1.json.order.id), 1);
});

test("văn phòng lập ⇒ dấu NULL, kể cả khi công tắc Tắt; tài khoản lai chụp như Đối tác", async () => {
  const w = dung(async () => 0);
  const r = await lap(w, A);
  assert.equal(r.status, 201, r.text);
  assert.equal(dau(w, r.json.order.id), null);
  const l = await lap(w, LAI);
  assert.equal(l.status, 201, l.text);
  assert.equal(dau(w, l.json.order.id), 0);
});

test("hàm đọc ném lỗi ⇒ Đối tác bị 503 kenh_thu_chua_doc_duoc, không tạo đơn; văn phòng vẫn lập được", async () => {
  const w = dung(async () => {
    throw new Error("d1 hỏng");
  });
  const r = await lap(w, PARTNER);
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "kenh_thu_chua_doc_duoc");
  assert.equal(soDon(w), 0);
  const v = await lap(w, A);
  assert.equal(v.status, 201, v.text);
});

test("hàm đọc trả null ⇒ cũng 503", async () => {
  const w = dung(async () => null as unknown as 0);
  const r = await lap(w, PARTNER);
  assert.equal(r.status, 503, r.text);
  assert.equal(soDon(w), 0);
});

test("lưu nháp lại không đổi dấu; đổi công tắc sau đó vẫn giữ dấu cũ (Review Focus 1); CSDL cấm đổi", async () => {
  let v: 0 | 1 = 1;
  const w = dung(async () => v);
  const don = (await lap(w, PARTNER)).json.order;
  assert.equal(dau(w, don.id), 1);
  v = 0;
  const doc = (await w.call("GET", `/api/orders/${don.id}`, { as: PARTNER })).json.order;
  const luu = await w.call("PUT", `/api/orders/${don.id}`, { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: doc.updatedAt, services: [{ ...svc("ZB1", inDays(3)), id: doc.services[0].id }] } });
  assert.equal(luu.status, 200, luu.text);
  assert.equal(dau(w, don.id), 1, "lưu nháp lúc công tắc Tắt không đổi dấu Bật");
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET company_collects_snapshot = 0 WHERE id = ?").run(don.id), /company_collects_locked/);
});

test("đường thật của gốc lắp ráp tiêm hàm đọc: không có dòng ⇒ 1; thêm dòng Tắt ⇒ 0", async () => {
  const x = setup();
  const r1 = await lap(x, PARTNER);
  assert.equal(r1.status, 201, r1.text);
  assert.equal(dau(x, r1.json.order.id), 1, "chưa có dòng công tắc ⇒ Bật");
  const BANG = ["bil", "partner_channel_setting"].join("_"); // `orders` không nhắc bảng của billing (ADR-0024 điều 4): bài chỉ gieo dòng công tắc, tên ghép để máy canh không đọc nhầm
  const Z = "2000-01-01T00:00:00.000Z";
  x.sqlite.prepare(`INSERT INTO ${BANG} (id, company_collects, valid_from, valid_to, created_at, created_by, updated_at, updated_by) VALUES ('k1', 0, ?, NULL, ?, NULL, ?, NULL)`).run(Z, Z, Z);
  const r0 = await lap(x, PARTNER);
  assert.equal(r0.status, 201, r0.text);
  assert.equal(dau(x, r0.json.order.id), 0, "gốc lắp ráp phải tiêm kenhThuHienTai (quên tiêm ⇒ router trả 1)");
});
