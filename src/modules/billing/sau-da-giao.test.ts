// NT-F7 (sổ tiền lượt 1 — ADR-0025 đ5, bản làm mới §3 mục 12; kế hoạch Task 6e): sau "Đã giao – đã thu đủ", MỌI route GHI của module `orders` và `dispatch`
// từ chối SỚM bằng câu tiếng Việt (409 `order_delivered`) — danh sách route SINH TỪ MODULE THẬT (gói bằng esbuild, như src/route-access.test.ts), không
// danh sách tay. Mỗi route có MỘT dòng ở bảng CA (thân gửi để đi tới đúng bước kiểm — route kiểm thân trước thì thân phải hợp lệ); route mới không có dòng →
// đỏ; miễn trừ có tên + lý do (khuôn `MIEN` của src/bang-tin-guard.test.ts), mục miễn trừ trỏ route không tồn tại → đỏ. Route của `billing` (Hoàn thành, sổ)
// KHÔNG thuộc danh sách này (chạy được sau Đã giao). SQL chạy tay bị trigger 0044 chặn: src/migrations-orders-da-giao.test.ts (NT-D3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import type { AppModule } from "../../shared/router.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const MODULES_DIR = fileURLToPath(new URL("..", import.meta.url));
const ROUTES: { module: string; method: string; path: string }[] = [];
for (const [dir, exp] of [["orders", "ordersModule"], ["dispatch", "dispatchModule"]] as const) {
  const built = await esbuild.build({ entryPoints: [join(MODULES_DIR, dir, "index.ts")], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, AppModule>;
  for (const r of mod[exp]!.routes) if (r.method !== "GET") ROUTES.push({ module: dir, method: r.method, path: r.path });
}

/** Miễn trừ có tên: route ghi KHÔNG chạm một đơn đã có. */
const MIEN: { route: string; lyDo: string }[] = [
  { route: "POST /api/orders", lyDo: "tạo đơn MỚI — không có đơn đã Đã giao nào để khoá" },
  // ADR-0061 điều 6 (miễn trừ có tên, chủ duyệt kèm ADR): bảng ord_manual_service_policy thuộc orders nên route nằm ở orders (chỉ module chủ ghi bảng).
  { route: "POST /api/cai-dat/nhap-tay", lyDo: "đổi chính sách nhập tay toàn hệ thống, không ghi đơn nào, không có đơn để khoá" },
  // ADR-0089 đ8: phân loại lý do huỷ chỉ chạy trên ĐƠN ĐÃ HUỶ; đơn đã Đã giao không huỷ được (ADR-0025 đ1) ⇒ route trả 409 invalid_state "đơn chưa huỷ".
  { route: "POST /api/orders/:id/cancel-reason", lyDo: "chỉ đơn đã huỷ — đơn đã Đã giao không bao giờ huỷ được (ADR-0025 đ1), route trả 409 invalid_state" },
];

const SA = "55555555-5555-4555-8555-555555555555";
const HDV = "22222222-2222-4222-8222-222222222222";
/** Bảng ca: route → thân gửi (đi tới đúng bước kiểm). Kỳ vọng mọi dòng: 409 `order_delivered`. */
const CA: Record<string, unknown> = {
  "PUT /api/orders/:id": {},
  "PUT /api/orders/:id/trip": {},
  "POST /api/orders/:id/legs": {},
  "PUT /api/orders/:id/legs/:legId": {},
  "POST /api/orders/:id/legs/:legId/close": {},
  "POST /api/orders/:id/legs/:legId/replace": {},
  "POST /api/orders/:id/legs/:legId/short-notice": { lyDo: "KHAC" },
  "POST /api/orders/:id/passengers": {},
  "PUT /api/orders/:id/booker": {},
  "POST /api/orders/:id/status": { status: "cancelled" },
  "PUT /api/orders/:id/handler": { staffId: HDV },
  "POST /api/orders/:id/handler-cancel": { reason: "customer_requested" },
  "POST /api/orders/:id/handler-money-edit": {},
  "POST /api/orders/:id/money-edit": {}, // ADR-0063 D1 (văn phòng sửa số khách) — 409 TRƯỚC khi đọc thân
  // Sổ đại lý đợt 1 (Task 5): ghi mức hoa hồng tay — thân HỢP LỆ (route kiểm thân trước đơn); đơn Đã giao ⇒ 409 order_delivered trước cả bước tìm bản chụp.
  "POST /api/orders/:id/thuong-mai/:serviceId": { lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } },
};
const khoa = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

test("NT-F7: danh sách route ghi của orders + dispatch (sinh từ module thật) = bảng CA ∪ MIEN; không mục thừa", () => {
  assert.ok(ROUTES.length >= 13, `chống bài rỗng: ${ROUTES.length} route ghi`);
  const that = ROUTES.map(khoa).sort();
  for (const m of MIEN) assert.ok(that.includes(m.route), `mục miễn trừ trỏ route không tồn tại: ${m.route}`);
  for (const k of Object.keys(CA)) assert.ok(that.includes(k), `dòng CA trỏ route không tồn tại: ${k}`);
  const thieu = that.filter((k) => !(k in CA) && !MIEN.some((m) => m.route === k));
  assert.deepEqual(thieu, [], "route ghi mới của orders/dispatch phải có dòng ở CA (quyết định: bị khoá sau Đã giao) hoặc miễn trừ có lý do");
});

test("NT-F7: sau Đã giao, MỌI route ghi của orders + dispatch (Toàn quyền gọi — qua mọi ô) trả 409 order_delivered bằng câu tiếng Việt; dữ liệu đơn không đổi", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000006", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: HDV, phone: "0900000002", name: "Nam HDV", perms: ["FIELD"] });
  const id = "99999999-9999-4999-8999-000000000001";
  const legId = "99999999-9999-4999-8999-000000000002";
  const AT = "2026-09-01T00:00:00.000Z";
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, 'TD-KHOA', ?, 'draft', 'Khách Giả', '0900000099', 100000, 100000, 100000, ?, ?)`).run(id, SA, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('svc-khoa', ?, 'Vé', 'perPax', 1, ?)`).run(id, homNay);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('it-khoa', ?, 'svc-khoa', 'Người lớn', 1, 100000, 100000)`).run(id);
  w.sqlite.prepare(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, 'svc-khoa', 'OUT', ?, 'Khách sạn', ?, ?)`)
    .run(legId, id, homNay, AT, AT);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('a-khoa', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(id, `pty-${HDV}`, AT, AT, AT);
  w.sqlite.prepare(`UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?`).run(AT, SA, AT, id);
  const truoc = JSON.stringify(w.q("SELECT * FROM orders WHERE id = ?", id));
  for (const r of ROUTES.filter((x) => !MIEN.some((m) => m.route === khoa(x)))) {
    const path = r.path.replace(":id", id).replace(":legId", legId);
    const res = await w.call(r.method, path, { as: SA, body: CA[khoa(r)] });
    assert.equal(res.status, 409, `${khoa(r)} (${r.module}): ${res.text}`);
    assert.equal(res.json?.error?.code, "order_delivered", `${khoa(r)}: ${res.text}`);
    assert.match(res.json.error.message, /^Đơn đã ở bước Đã giao – đã thu đủ/, khoa(r));
  }
  assert.equal(JSON.stringify(w.q("SELECT * FROM orders WHERE id = ?", id)), truoc, "đơn không đổi");
  const chiTiet = await w.call("GET", `/api/orders/${id}`, { as: SA });
  assert.equal(chiTiet.json.canModify, false, "chi tiết đơn đã Đã giao: không còn nút sửa");
});

test("T-1 (kiểm độc lập): ĐUA — route đọc 'chưa Đã giao', người khác bấm Đã giao ngay trước lô ghi → trigger 0044 chặn, route trả 409 order_delivered tiếng Việt (không 500), dữ liệu không đổi", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000006", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  const id = "99999999-9999-4999-8999-000000000011";
  const AT = "2026-09-01T00:00:00.000Z";
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, 'TD-DUA', ?, 'draft', 'Khách Giả', '0900000099', 100000, 100000, 100000, ?, ?)`).run(id, SA, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('svc-dua', ?, 'Vé', 'perPax', 1, ?)`).run(id, homNay);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('it-dua', ?, 'svc-dua', 'Người lớn', 1, 100000, 100000)`).run(id);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  // Bọc lô ghi KẾ TIẾP: "người khác" bấm Đã giao ngay trước lô (tất định — khuôn chenTruocLo của lo-ghi.test.ts).
  const goc = w.env.DB.batch;
  let daChen = false;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    daChen = true;
    w.sqlite.prepare(`UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?`).run(AT, SA, id);
    return goc(stmts);
  };
  const orig = console.warn;
  console.warn = () => {};
  let res;
  try {
    res = await w.call("POST", `/api/orders/${id}/status`, { as: SA, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  } finally {
    console.warn = orig;
  }
  assert.equal(daChen, true, "route đi qua db.batch (ca đua thật sự xảy ra)");
  assert.equal(res.status, 409, res.text);
  assert.equal(res.json?.error?.code, "order_delivered", res.text);
  assert.match(res.json.error.message, /^Đơn đã ở bước Đã giao – đã thu đủ/);
  assert.doesNotMatch(res.text, /SQLITE|D1_ERROR/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "confirmed", "lô huỷ: đơn không bị huỷ");
});
