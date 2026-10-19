// ADR-0114 D3 — "mỗi đơn có ít nhất một người lớn đi cùng" qua route THẬT (ứng dụng thật + SQLite), cả bốn cửa:
//  1. `POST /api/orders` (lập đơn) và `PUT /api/orders/:id` (lưu nháp): `validateOrder` → 400 `invalid_input` với câu cố định (khuôn thông báo lỗi nhập liệu).
//  2. `POST /api/orders/:id/status` sang `confirmed`: đọc số khách ĐÃ LƯU → 409 `thieu_nguoi_lon`, đơn vẫn nháp.
//  3. `POST /api/orders/:id/money-edit` (văn phòng) và `POST /api/orders/:id/handler-money-edit` (hướng dẫn viên): MỘT luật `planMoneyEdit` → 409 `thieu_nguoi_lon`
//     CHỈ KHI lần sửa đưa tổng người đi kèm từ ≥ 1 xuống 0; đơn cũ không có người lớn không bị chặn thêm; dịch vụ nhập tay (ô số khách ở người lớn) tính là người lớn.
// Luật thuần và ca biên: nguoi-di-kem.test.ts, rules.test.ts, money-edit-plan.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CAU_THIEU_NGUOI_LON } from "../../shared/nguoi-di-kem.ts";

const ID = {
  SALES: "11111111-1111-4111-8111-111111111111",
  ACC: "33333333-3333-4333-8333-333333333333",
  FIELD: "44444444-4444-4444-8444-444444444444",
  SUPER: "55555555-5555-4555-8555-555555555555",
} as const;
type W = ReturnType<typeof world>;
type Pax = { adult: number; child: number; senior: number; infant: number };
const P = (adult: number, child = 0, senior = 0): Pax => ({ adult, child, senior, infant: 0 });
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const SEEN = { adult: 500000, child: 300000, senior: 400000, infant: 50000 };
const AT = "2026-10-01T00:00:00.000Z";
let seq = 0;

/** `batNhapTay` = Toàn quyền bật công tắc dịch vụ nhập tay (mặc định tắt — ADR-0061) cho bài cần dịch vụ nhập tay. */
async function setup(batNhapTay = false): Promise<W> {
  const w = world();
  seedStaff(w.sqlite, { id: ID.SUPER, phone: "0900000100", name: "Em", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ID.SALES, phone: "0900000101", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ID.ACC, phone: "0900000102", name: "Cúc", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ID.FIELD, phone: "0900000103", name: "Dũng", perms: ["FIELD"] });
  w.sqlite.exec(
    "INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 400000, 50000, 1, '2026-01-01', '2026-01-01')",
  );
  if (batNhapTay) assert.equal((await w.call("POST", "/api/cai-dat/nhap-tay", { as: ID.SUPER, body: { batNhapTay: true } })).status, 200);
  return w;
}
const dichVu = (pax: Pax, over: Record<string, unknown> = {}) => ({ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax, catalogPriceSeen: SEEN, departDate: vnDay(3), ...over });
const nhapTay = (adult: number) => ({ kind: "manual", pickupChoice: "KHONG_DON", name: "Xe đưa đón", pax: P(adult), items: [{ description: "Xe 7 chỗ", quantity: 1, unitPrice: 200000 }], departDate: vnDay(3) });
const lap = (w: W, services: unknown[], nhap = false) =>
  w.call("POST", "/api/orders", { as: ID.SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", discount: 0, services } }).then(async (r: any) => {
    if (r.status === 201 && !nhap) assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: ID.SALES, body: { status: "confirmed" } })).status, 200);
    return r;
  });
const soDon = (w: W) => w.q("SELECT COUNT(*) AS n FROM orders")[0].n as number;
const soDong = (w: W, orderId: string) => w.q("SELECT COUNT(*) AS n FROM order_money_adjustment WHERE order_id = ?", orderId)[0].n as number;
const soNhatKy = (w: W, orderId: string) => w.q("SELECT COUNT(*) AS n FROM audit_log WHERE order_id = ?", orderId)[0].n as number;
const trangThai = (w: W, orderId: string) => w.q("SELECT status FROM orders WHERE id = ?", orderId)[0].status as string;

/**
 * Đơn NHÁP "cũ" chèn thẳng SQL (như đơn lập trước ADR-0114): không qua `validateOrder`, nên có thể không có người lớn. `xacNhanSan` = lật sang đã xác nhận bằng SQL
 * (dịch vụ + dòng tiền chèn lúc còn nháp, rồi mới lật — trigger đóng băng chặn chèn dịch vụ vào đơn đã xác nhận).
 */
function donCu(w: W, pax: Pax, xacNhanSan: boolean): string {
  const id = `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
  const gia = pax.adult * 500000 + pax.child * 300000 + pax.senior * 400000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Cũ', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-NL-${seq}`, ID.SALES, gia, gia, gia, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', ?, ?, ?, ?, ?)")
    .run(`${id}-s0`, id, pax.adult, pax.child, pax.senior, pax.infant, vnDay(3));
  const dong: [string, number, number][] = [["adult", pax.adult, 500000], ["child", pax.child, 300000], ["senior", pax.senior, 400000]];
  for (const [ma, n, don] of dong) {
    if (n > 0) {
      w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZA1', ?, ?, ?, ?, ?, ?)")
        .run(`${id}-s0-${ma}`, id, `${id}-s0`, ma, `Tour đảo — ${ma}`, n, don, don, n * don);
    }
  }
  if (xacNhanSan) w.sqlite.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(id);
  return id;
}
const xacNhan = (w: W, id: string) => w.call("POST", `/api/orders/${id}/status`, { as: ID.SALES, body: { status: "confirmed" } });

// ---------------------------------------------------------------- cửa 1: lập đơn + lưu nháp

test("D3 lập đơn: chỉ trẻ em → 400 câu cố định, KHÔNG tạo đơn; có người lớn, hoặc toàn người cao tuổi → 201", async () => {
  const w = await setup();
  const r = await lap(w, [dichVu(P(0, 2))], true);
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, CAU_THIEU_NGUOI_LON);
  assert.equal(soDon(w), 0, "không tạo đơn nào");
  assert.equal((await lap(w, [dichVu(P(1, 2))], true)).status, 201);
  assert.equal((await lap(w, [dichVu(P(0, 0, 2))], true)).status, 201, "toàn người cao tuổi lập được (điều khoản 1)");
});

test("D3 lập đơn: tính trên CẢ ĐƠN — dịch vụ danh mục chỉ trẻ em + dịch vụ nhập tay có số khách (người lớn) → 201, không bị từ chối oan", async () => {
  const w = await setup(true);
  const r = await lap(w, [dichVu(P(0, 2)), nhapTay(2)], true);
  assert.equal(r.status, 201, r.text);
  const khong = await lap(w, [dichVu(P(0, 2)), nhapTay(0)], true);
  assert.equal(khong.status, 400, "nhập tay không có ai: vẫn thiếu người lớn");
  assert.equal(khong.json.error.message, CAU_THIEU_NGUOI_LON);
});

test("D3 lưu nháp: sửa nháp thành chỉ trẻ em → 400 câu cố định, số khách đã lưu không đổi; sửa thành có người lớn → 200", async () => {
  const w = await setup();
  const d = await lap(w, [dichVu(P(2))], true);
  assert.equal(d.status, 201, d.text);
  const id = d.json.order.id as string;
  const luu = (pax: Pax) =>
    w.call("PUT", `/api/orders/${id}`, {
      as: ID.SALES,
      body: { customerName: "Khách Thử", customerPhone: "0912345678", discount: 0, expectedUpdatedAt: lanCuoi(w, id), services: [dichVu(pax, { id: dichVuId(w, id) })] },
    });
  const treEm = await luu(P(0, 2));
  assert.equal(treEm.status, 400, treEm.text);
  assert.equal(treEm.json.error.message, CAU_THIEU_NGUOI_LON);
  assert.equal(w.q("SELECT pax_adult, pax_child FROM order_service WHERE order_id = ?", id)[0].pax_adult, 2, "bản đã lưu giữ nguyên");
  const ok = await luu(P(1, 2));
  assert.equal(ok.status, 200, ok.text);
});
const lanCuoi = (w: W, id: string) => w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at as string;
const dichVuId = (w: W, id: string) => w.q("SELECT id FROM order_service WHERE order_id = ? ORDER BY sort_order", id)[0].id as string;

// ---------------------------------------------------------------- cửa 2: chuyển sang xác nhận

test("D3 xác nhận: nháp cũ không có người lớn → 409 thieu_nguoi_lon, đơn vẫn nháp; đối chứng cùng đơn có người lớn, hay toàn người cao tuổi → 200", async () => {
  const w = await setup();
  const thieu = donCu(w, P(0, 2), false);
  const r = await xacNhan(w, thieu);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "thieu_nguoi_lon");
  assert.equal(r.json.error.message, CAU_THIEU_NGUOI_LON);
  assert.equal(trangThai(w, thieu), "draft", "vẫn là đơn nháp");
  assert.equal((await xacNhan(w, donCu(w, P(1, 2), false))).status, 200, "đối chứng: có người lớn");
  assert.equal((await xacNhan(w, donCu(w, P(0, 0, 2), false))).status, 200, "đối chứng: toàn người cao tuổi");
});

// ---------------------------------------------------------------- cửa 3: sửa số khách (hai đường, một luật)

test("D3 sửa số khách: bớt người lớn cuối cùng → 409 thieu_nguoi_lon Ở CẢ HAI đường (văn phòng và hướng dẫn viên), không ghi dòng điều chỉnh, không nhật ký; bớt chừa lại người lớn → 200", async () => {
  const w = await setup();
  const d = await lap(w, [dichVu(P(1, 1))]);
  const id = d.json.order.id as string;
  const svc = d.json.order.services[0].id as string;
  assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: ID.SALES, body: { staffId: ID.FIELD } })).status, 200);
  const [dong0, nk0] = [soDong(w, id), soNhatKy(w, id)];

  const vp = await w.call("POST", `/api/orders/${id}/money-edit`, { as: ID.ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: svc, pax: P(0, 1) }] } });
  assert.equal(vp.status, 409, vp.text);
  assert.equal(vp.json.error.code, "thieu_nguoi_lon");
  assert.equal(vp.json.error.message, CAU_THIEU_NGUOI_LON);

  const hdv = await w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: ID.FIELD, body: { reason: "Khách bớt người", services: [{ id: svc, pax: P(0, 1) }] } });
  assert.equal(hdv.status, 409, hdv.text);
  assert.equal(hdv.json.error.code, "thieu_nguoi_lon");
  assert.equal(hdv.json.error.message, CAU_THIEU_NGUOI_LON);

  assert.deepEqual([soDong(w, id), soNhatKy(w, id)], [dong0, nk0], "bị từ chối thì không ghi gì");
  assert.equal((await w.call("POST", `/api/orders/${id}/money-edit`, { as: ID.ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: svc, pax: P(1, 0) }] } })).status, 200, "đối chứng: còn người lớn");
});

test("D3 sửa số khách: đơn có dịch vụ nhập tay (số khách ở người lớn) — bớt người lớn của dịch vụ danh mục không bị từ chối oan", async () => {
  const w = await setup(true);
  const d = await lap(w, [dichVu(P(1, 1)), nhapTay(2)]);
  const id = d.json.order.id as string;
  const svc = d.json.order.services[0].id as string;
  const r = await w.call("POST", `/api/orders/${id}/money-edit`, { as: ID.ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: svc, pax: P(0, 1) }] } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.daGhi, true);
});

test("D3 sửa số khách: đơn CŨ đã xác nhận không có người lớn — tăng trẻ em hay thêm người lớn đều qua (không chặn thêm)", async () => {
  const w = await setup();
  const id = donCu(w, P(0, 2), true);
  const svc = dichVuId(w, id);
  const sua = (pax: Pax) => w.call("POST", `/api/orders/${id}/money-edit`, { as: ID.ACC, body: { lyDo: "THEM_NGUOI", services: [{ id: svc, pax }] } });
  const tang = await sua(P(0, 3));
  assert.equal(tang.status, 200, tang.text);
  const bot = await sua(P(0, 1));
  assert.equal(bot.status, 200, bot.text);
  assert.equal(soDong(w, id), 2, "cả hai lần sửa đều được ghi");
});
