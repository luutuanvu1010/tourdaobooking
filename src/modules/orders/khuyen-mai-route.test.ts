// ADR-0114 D1 qua route THẬT (ứng dụng thật + SQLite): khoá `canhBaoKhuyenMai` của phản hồi `POST /api/orders/:id/money-edit` và của `GET /api/orders/:id`.
// Giảm giá đơn > 0 VÀ số khách trả tiền (người lớn + trẻ em + người cao tuổi, mọi dịch vụ) hiện hành < số lúc xác nhận ⇒ câu cố định (không chữ số); tính từ trạng thái
// hiện hành (không lưu cờ) nên 10 → 2 → 3 vẫn nhắc; CHỈ cảnh báo — tiền và `canhBaoTongAm` không đổi; đường hướng dẫn viên không lộ khoá này. Luật thuần: so-khach-van-phong.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CAU_GIAM_GIA_VUOT, CAU_KHUYEN_MAI_KHI_BOT_KHACH } from "../../shared/so-khach-van-phong.ts";

const ID = {
  SALES: "11111111-1111-4111-8111-111111111111", // người lập
  SALES_B: "22222222-2222-4222-8222-222222222222", // Bán hàng KHÔNG lập đơn: xem được mọi đơn (order.view = any) nhưng không có order.history.view với đơn này
  ACC: "33333333-3333-4333-8333-333333333333",
  FIELD: "44444444-4444-4444-8444-444444444444",
  SUPER: "55555555-5555-4555-8555-555555555555",
} as const;
type W = ReturnType<typeof world>;
type Pax = { adult: number; child: number; senior: number; infant: number };
const P = (adult: number, child = 0): Pax => ({ adult, child, senior: 0, infant: 0 });
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

async function setup(batNhapTay = false): Promise<W> {
  const w = world();
  seedStaff(w.sqlite, { id: ID.SUPER, phone: "0900000200", name: "Em", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ID.SALES, phone: "0900000201", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ID.SALES_B, phone: "0900000202", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ID.ACC, phone: "0900000203", name: "Cúc", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ID.FIELD, phone: "0900000204", name: "Dũng", perms: ["FIELD"] });
  w.sqlite.exec(
    "INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 50000, 1, '2026-01-01', '2026-01-01')",
  );
  if (batNhapTay) assert.equal((await w.call("POST", "/api/cai-dat/nhap-tay", { as: ID.SUPER, body: { batNhapTay: true } })).status, 200);
  return w;
}
async function taoDon(w: W, o: { pax: Pax; discount?: number; extra?: unknown[] }) {
  const r = await w.call("POST", "/api/orders", {
    as: ID.SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678", discount: o.discount ?? 0,
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: o.pax, catalogPriceSeen: { adult: 500000, child: 300000, infant: 50000 }, departDate: vnDay(3) }, ...(o.extra ?? [])],
    },
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: ID.SALES, body: { status: "confirmed" } })).status, 200);
  return { id, svc: r.json.order.services[0].id as string };
}
const sua = (w: W, orderId: string, svc: string, pax: Pax, lyDo = "BOT_NGUOI") => w.call("POST", `/api/orders/${orderId}/money-edit`, { as: ID.ACC, body: { lyDo, services: [{ id: svc, pax }] } });
const chiTiet = async (w: W, orderId: string, as: string = ID.ACC) => {
  const r = await w.call("GET", `/api/orders/${orderId}`, { as });
  assert.equal(r.status, 200, `${as}: ${r.text}`);
  return r.json;
};

// ---------------------------------------------------------------- D1

test("D1 ví dụ của chủ (SV-SK-12): 10 người lớn × 500.000, giảm giá 50.000, bớt còn 2 ⇒ nhắc khuyến mại, KHÔNG đổi số tiền, KHÔNG có cảnh báo giảm giá vượt", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(10), discount: 50000 });
  const r = await sua(w, d.id, d.svc, P(2));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH);
  assert.equal(r.json.canhBaoTongAm, null, "tạm tính 1.000.000 lớn hơn giảm giá 50.000: không có cảnh báo giảm giá vượt");
  assert.deepEqual([r.json.order.subtotal, r.json.order.discount, r.json.order.total], [1_000_000, 50_000, 950_000], "số tiền y như ADR-0109, giảm giá giữ nguyên");
  assert.doesNotMatch(r.json.canhBaoKhuyenMai, /\d/, "câu không có chữ số");
  assert.equal((await chiTiet(w, d.id)).canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH, "mở lại đơn (Kế toán không vừa sửa) vẫn thấy — tính từ trạng thái hiện hành");
});

test("D1 không nhắc: giảm giá bằng 0; tăng khách; số khách y nguyên; đơn chưa sửa lần nào (dù có giảm giá)", async () => {
  const w = await setup();
  const khongGiam = await taoDon(w, { pax: P(10), discount: 0 });
  const r0 = await sua(w, khongGiam.id, khongGiam.svc, P(2));
  assert.equal(r0.json.canhBaoKhuyenMai, null, "giảm giá 0");
  assert.equal((await chiTiet(w, khongGiam.id)).canhBaoKhuyenMai, null);

  const co = await taoDon(w, { pax: P(2), discount: 50000 });
  assert.equal((await chiTiet(w, co.id)).canhBaoKhuyenMai, null, "chưa sửa lần nào");
  const tang = await sua(w, co.id, co.svc, P(4), "THEM_NGUOI");
  assert.equal(tang.json.canhBaoKhuyenMai, null, "tăng khách");
  const yNguyen = await sua(w, co.id, co.svc, P(4), "THEM_NGUOI");
  assert.deepEqual([yNguyen.json.daGhi, yNguyen.json.canhBaoKhuyenMai], [false, null], "y nguyên số khách: không ghi, không nhắc");
});

test("D1 10 → 2 → 3 vẫn nhắc (so với lúc xác nhận, không so với lần sửa trước); đủ lại 10 thì hết nhắc; trẻ em và người lớn cùng tính; em bé thì không", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(10), discount: 50000 });
  assert.equal((await sua(w, d.id, d.svc, P(2))).json.canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH);
  const ba = await sua(w, d.id, d.svc, P(3), "THEM_NGUOI");
  assert.equal(ba.json.canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH, "tăng từ 2 lên 3 vẫn thấp hơn 10");
  assert.equal((await chiTiet(w, d.id)).canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH);
  assert.equal((await sua(w, d.id, d.svc, P(10), "THEM_NGUOI")).json.canhBaoKhuyenMai, null, "đủ lại số lúc xác nhận");
  assert.equal((await sua(w, d.id, d.svc, P(12), "THEM_NGUOI")).json.canhBaoKhuyenMai, null, "nhiều hơn lúc xác nhận");

  // Người lớn 5 + trẻ em 5 = 10 khách trả tiền; đổi thành 6 người lớn + 3 trẻ em (9) ⇒ nhắc; thêm em bé thì không làm tăng số khách trả tiền.
  const hon = await taoDon(w, { pax: { adult: 5, child: 5, senior: 0, infant: 1 }, discount: 50000 });
  const chinh = await sua(w, hon.id, hon.svc, { adult: 6, child: 3, senior: 0, infant: 1 });
  assert.equal(chinh.json.canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH);
  const emBe = await sua(w, hon.id, hon.svc, { adult: 6, child: 3, senior: 0, infant: 5 }, "THEM_NGUOI");
  assert.equal(emBe.json.canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH, "em bé không phải khách trả tiền");
});

test("D1 chạy ĐỘC LẬP với cảnh báo giảm giá vượt: hai câu có thể cùng hiện; số tiền và `canhBaoTongAm` không đổi so với ADR-0109", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(2), discount: 800000 }); // 1.000.000 − 800.000 = 200.000
  const r = await sua(w, d.id, d.svc, P(1));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.canhBaoTongAm, CAU_GIAM_GIA_VUOT);
  assert.equal(r.json.canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH);
  assert.deepEqual([r.json.order.subtotal, r.json.order.total, r.json.order.giamGiaHieuLuc], [500000, 0, 500000], "phải thu kẹp 0, đúng ADR-0109");
});

test("D1 đường hướng dẫn viên: phản hồi là kiểu khác, vẫn chỉ { ok } — không có khoá khuyến mại (khoá chỉ có ở phản hồi văn phòng và chi tiết đơn)", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(10), discount: 50000 });
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: ID.SALES, body: { staffId: ID.FIELD } })).status, 200);
  const r = await w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as: ID.FIELD, body: { reason: "Khách bớt người", services: [{ id: d.svc, pax: P(2) }] } });
  assert.equal(r.status, 200, r.text);
  assert.equal("canhBaoKhuyenMai" in r.json, false);
  assert.equal("canhBaoTongAm" in r.json, false);
  assert.equal((await chiTiet(w, d.id)).canhBaoKhuyenMai, CAU_KHUYEN_MAI_KHI_BOT_KHACH, "Kế toán mở đơn vẫn thấy nhắc");
});
