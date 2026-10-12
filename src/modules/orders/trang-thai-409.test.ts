// Câu 409 `invalid_transition` của `POST /api/orders/:id/status` (sổ đại lý đợt 1, Task 14, nợ (g); lỗi 2 của Task 13, có từ trước): trước đây câu viết «Không thể chuyển đơn từ "confirmed" sang "confirmed".» —
// lộ mã trạng thái thô ra người dùng, trái CLAUDE.md §7 (không chữ Anh lộ ra người dùng, kể cả mã trạng thái thô). Nay dùng nhãn tiếng Việt MỘT bảng (`STATUS_LABEL`, src/shared/order-status-label.ts).
// Mã trả về `invalid_transition` KHÔNG đổi (giao diện và kịch bản dựa vào mã). Route thật qua khung thử (SQLite thật + cả ứng dụng).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { STATUS_LABEL } from "../../shared/order-status-label.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
type W = ReturnType<typeof world>;
let seq = 0;

function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  return w;
}
/** Đơn NHÁP của SALES, khách lẻ, một dịch vụ có ngày đi hôm nay (đủ điều kiện để xác nhận được). */
function nhap(w: W): string {
  const id = `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-409-${seq}`, SALES, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)").run(`${id}-s0`, id, vnHomNay());
  w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)").run(`${id}-s0-i`, id, `${id}-s0`);
  return id;
}
const doiTrangThai = (w: W, id: string, status: "confirmed" | "cancelled") =>
  w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: status === "cancelled" ? { status, lyDo: "KHACH_DOI_Y" } : { status } });

/** Câu báo không được chứa MÃ trạng thái thô nào (quét cả bảng nhãn, không chỉ ba chữ nhớ tay). */
function khongMaTho(cau: string): void {
  for (const ma of Object.keys(STATUS_LABEL)) assert.ok(!new RegExp(`\\b${ma}\\b`, "i").test(cau), `câu báo lộ mã thô «${ma}»: ${cau}`);
}

test("xác nhận hai lần ⇒ 409 invalid_transition, câu tiếng Việt nêu trạng thái hiện tại bằng nhãn, không lộ mã thô", async () => {
  const w = setup();
  const id = nhap(w);
  assert.equal((await doiTrangThai(w, id, "confirmed")).status, 200);
  const r = await doiTrangThai(w, id, "confirmed");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "invalid_transition", "mã trả về không đổi");
  assert.equal(r.json.error.message, `Đơn đã ở trạng thái “${STATUS_LABEL.confirmed}” rồi.`);
  khongMaTho(r.json.error.message);
});

test("huỷ hai lần ⇒ 409 cùng dạng «đã ở trạng thái … rồi»; xác nhận đơn đã huỷ ⇒ 409 nêu cả hai nhãn", async () => {
  const w = setup();
  const id = nhap(w);
  assert.equal((await doiTrangThai(w, id, "cancelled")).status, 200);
  const hai = await doiTrangThai(w, id, "cancelled");
  assert.equal(hai.status, 409, hai.text);
  assert.equal(hai.json.error.code, "invalid_transition");
  assert.equal(hai.json.error.message, `Đơn đã ở trạng thái “${STATUS_LABEL.cancelled}” rồi.`);
  khongMaTho(hai.json.error.message);
  const xn = await doiTrangThai(w, id, "confirmed");
  assert.equal(xn.status, 409, xn.text);
  assert.equal(xn.json.error.code, "invalid_transition");
  assert.equal(xn.json.error.message, `Đơn đang ở trạng thái “${STATUS_LABEL.cancelled}”, không thể chuyển sang “${STATUS_LABEL.confirmed}”.`);
  khongMaTho(xn.json.error.message);
});
