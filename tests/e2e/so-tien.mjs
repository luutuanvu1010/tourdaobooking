// Sổ tiền lượt 1 (ADR-0024 đ1–5, ADR-0025, ADR-0026): "Đã giao – đã thu đủ", "Hoàn thành", lần thu, sổ công nợ.
// Kế hoạch: docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md; sổ thi công: docs/superpowers/plans/2026-09-30-so-tien-luot-1-thi-cong-nhat-ky.md.
//
// CA R1 (spike, Task 6b bước đầu — rủi ro R1): "một câu hỏng (kể cả RAISE của trigger) thì CẢ lô D1 huỷ". Cách vá C1/V1 của kế hoạch dựa hoàn toàn vào
// điều này. Kịch bản TỰ cài một trigger RAISE tạm trên D1 local tạm (không móc thử nghiệm nào trong mã chạy thật) cho câu THỨ BA của lô đổi người phụ
// trách (`PUT /api/orders/:id/handler`: đóng dòng cũ → mở dòng mới → nhật ký), rồi kiểm KHÔNG câu nào được lưu, rồi gỡ trigger.
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, orderInput, session, sql, sqlRows } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const fld = await me(await session(ACCOUNTS.field));
const fldB = await me(await session(ACCOUNTS.fieldB));

// ---- CA R1: RAISE ở câu thứ 3 của một db.batch() → cả lô quay lại
{
  const r = await call(A, "POST", "/api/orders", { ...orderInput(), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const orderId = r.body.order.id;
  const truoc = await sqlRows(`SELECT id, party_id, valid_to_at FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY rowid`);
  assert.equal(truoc.length, 1, "đơn có đúng một dòng HANDLE (người được chọn lúc lập)");
  const nhatKyTruoc = (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${orderId}'`))[0].n;
  await sql(`CREATE TRIGGER e2e_spike_r1 BEFORE INSERT ON audit_log WHEN NEW.action = 'order_handler_changed' AND NEW.order_id = '${orderId}'
    BEGIN SELECT RAISE(ABORT, 'e2e_spike_r1'); END`);
  try {
    const doi = await call(A, "PUT", `/api/orders/${orderId}/handler`, { staffId: fldB.id });
    assert.equal(doi.status, 500, `lô hỏng ở câu thứ 3 phải là lỗi máy chủ: ${doi.status} ${JSON.stringify(doi.body)}`);
    const sau = await sqlRows(`SELECT id, party_id, valid_to_at FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY rowid`);
    assert.deepEqual(sau, truoc, "câu 1 (đóng dòng cũ) và câu 2 (mở dòng mới) KHÔNG được lưu khi câu 3 bị trigger RAISE");
    const nhatKySau = (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${orderId}'`))[0].n;
    assert.equal(nhatKySau, nhatKyTruoc, "không dòng nhật ký nào");
  } finally {
    await sql("DROP TRIGGER IF EXISTS e2e_spike_r1");
  }
  // Gỡ trigger rồi làm lại đúng lệnh đó → thành công (chứng minh ca trên đỏ vì trigger, không vì lệnh sai).
  const lai = await call(A, "PUT", `/api/orders/${orderId}/handler`, { staffId: fldB.id });
  assert.equal(lai.status, 200, JSON.stringify(lai.body));
  console.log("✓ ca R1: RAISE của trigger ở câu thứ 3 trong db.batch() → cả lô quay lại (D1 local)");
}
