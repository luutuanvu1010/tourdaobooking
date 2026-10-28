// ADR-0118 Đ3 (b) × ADR-0136 (dựng lại trên main 28/10): các cửa XÁC NHẬN ra đời SAU 14/10 — «Gửi xác nhận», «Còn vé» (quyết định của người xét duyệt), «Gửi đơn» của Đối tác
// (nhánh A và B) — cũng phải chặn đơn nháp còn lượt đưa đón MỞ của dịch vụ thuộc nhóm đã TẮT đưa đón, như cửa `POST /status` (bài N-12 ở dua-don-nhom-tat.test.ts).
// Chốt chặn đứng TRƯỚC cổng chọn Đón / Không đón (ADR-0134 Đ2) để câu báo nói đúng việc phải làm. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ADM, PARTNER, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-09-01T00:00:00.000Z";
const D = inDays(3);
/** Gán ZA1 vào nhóm HTA (Hòn Tằm, gieo ở 0055) và đặt cờ «Có đưa đón» của nhóm — bằng SQL thẳng như dua-don-nhom-tat.test.ts. */
function nhomZA1(w: any, batDuaDon: boolean) {
  const co = w.q("SELECT COUNT(*) AS c FROM ctl_service_group WHERE service_code = 'ZA1'")[0].c as number;
  if (co === 0) w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', 'HTA', 1, ?, ?, ?)").run(crypto.randomUUID(), AT, AT, AT);
  w.sqlite.prepare("UPDATE ctl_group SET transfer_enabled = ? WHERE code = 'HTA'").run(batDuaDon ? 1 : 0);
}
const coLuot = () => [svc("ZA1", D, [leg(D, "06:30")])];
const yeuCauMo = (w: any, id: string) => w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id);
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status as string;
const capNhat = (w: any, id: string) => w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at as string;
const biChan = (r: any, huongDan: RegExp) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "transfer_disabled", r.text);
  assert.match(r.json.error.message, /Tour đảo/);
  assert.match(r.json.error.message, /Hòn Tằm/, "nêu tên nhóm");
  assert.match(r.json.error.message, huongDan);
};

test("Gửi xác nhận: đơn nháp «cần xác nhận» còn lượt đưa đón, nhóm nay tắt → 409 transfer_disabled, KHÔNG mở yêu cầu; bỏ lượt (Không đón) rồi gửi → 201", async () => {
  const w = setup();
  nhomZA1(w, true);
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, coLuot());
  nhomZA1(w, false);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} });
  biChan(r, /bỏ lượt đưa đón/i);
  assert.equal(yeuCauMo(w, o.id).length, 0, "không mở yêu cầu khi bị chặn");
  const luu = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", D)], expectedUpdatedAt: capNhat(w, o.id) } });
  assert.equal(luu.status, 200, luu.text);
  const lai = await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} });
  assert.equal(lai.status, 201, lai.text);
});

test("Còn vé: yêu cầu đã mở, nhóm tắt SAU khi gửi → người xét duyệt bấm Còn vé nhận 409 transfer_disabled (câu nói người lập Rút lại); đơn VẪN nháp, yêu cầu VẪN mở", async () => {
  const w = setup();
  nhomZA1(w, true);
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, coLuot());
  assert.equal((await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
  const y = yeuCauMo(w, o.id)[0];
  nhomZA1(w, false);
  const r = await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: y.id, updatedAt: capNhat(w, o.id) } });
  biChan(r, /Rút lại/);
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(yeuCauMo(w, o.id).length, 1, "yêu cầu chưa bị khép");
  nhomZA1(w, true);
  const ok = await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: y.id, updatedAt: capNhat(w, o.id) } });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(trangThai(w, o.id), "confirmed");
});

test("Gửi đơn của Đối tác — nhánh B (không cần xác nhận): nhóm tắt → 409 transfer_disabled, đơn VẪN nháp; nhánh A (cần xác nhận) cũng 409, không mở yêu cầu", async () => {
  const w = setup();
  nhomZA1(w, true);
  const b = await lap(w, PARTNER, coLuot());
  datCo(w, "SERVICE", "ZB1", true); // cờ của dịch vụ KHÁC: đơn `b` vẫn đi nhánh B
  nhomZA1(w, false);
  const rb = await w.call("POST", `/api/orders/${b.id}/gui-don`, { as: PARTNER, body: {} });
  biChan(rb, /bỏ lượt đưa đón/i);
  assert.equal(trangThai(w, b.id), "draft");
  nhomZA1(w, true);
  datCo(w, "SERVICE", "ZA1", true);
  const a = await lap(w, PARTNER, coLuot());
  nhomZA1(w, false);
  const ra = await w.call("POST", `/api/orders/${a.id}/gui-don`, { as: PARTNER, body: {} });
  biChan(ra, /bỏ lượt đưa đón/i);
  assert.equal(yeuCauMo(w, a.id).length, 0, "nhánh A không mở yêu cầu khi bị chặn");
});

test("Chốt chặn đứng TRƯỚC cổng chọn đón: nháp «Đón» còn lượt ở nhóm tắt nhận transfer_disabled (không phải pickup_choice_required) ở Xác nhận đơn", async () => {
  const w = setup();
  nhomZA1(w, true);
  const o = await lap(w, A, coLuot());
  nhomZA1(w, false);
  const r = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  biChan(r, /bỏ lượt đưa đón/i);
});
