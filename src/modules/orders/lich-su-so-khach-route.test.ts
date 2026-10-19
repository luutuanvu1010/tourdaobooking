// ADR-0114 D2 qua route THẬT (ứng dụng thật + SQLite): khoá `lichSuSoKhach` của `GET /api/orders/:id`.
// Hình dáng đã chọn (ba dòng cho SV-SK-07, đúng ADR): `khoi_tao` → `dieu_chinh` (mọi lần sửa trừ lần cuối) → `hien_hanh` (kết quả lần sửa cuối, mang `lanSua` của nó); đơn chưa sửa
// lần nào = `khoi_tao` + `hien_hanh` trùng số. Tạm tính mỗi dòng tính lại bằng MỘT nguồn `effectiveSubtotal` (không tin cột `subtotal_after` đã lưu). Chỉ người có
// `order.history.view` với đơn này nhận mảng, còn lại `null` (cùng điều kiện khối `history`). Luật thuần: src/shared/lich-su-so-khach.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

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
  seedStaff(w.sqlite, { id: ID.SUPER, phone: "0900000300", name: "Em", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ID.SALES, phone: "0900000301", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ID.SALES_B, phone: "0900000302", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ID.ACC, phone: "0900000303", name: "Cúc", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ID.FIELD, phone: "0900000304", name: "Dũng", perms: ["FIELD"] });
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
      services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: o.pax, catalogPriceSeen: { adult: 500000, child: 300000, infant: 50000 }, departDate: vnDay(3) }, ...(o.extra ?? [])],
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

test("D2 SV-SK-07 qua route: 4 người lớn (2.000.000) → 3 (1.500.000) → 5 (2.500.000) ⇒ ba dòng khởi tạo / điều chỉnh lần 1 / hiện hành lần 2; dòng cuối khớp tạm tính của đơn", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(4) });
  assert.equal((await sua(w, d.id, d.svc, P(3))).status, 200);
  assert.equal((await sua(w, d.id, d.svc, P(5), "THEM_NGUOI")).status, 200);
  const g = await chiTiet(w, d.id);
  assert.deepEqual(g.lichSuSoKhach, [
    { buoc: "khoi_tao", lanSua: null, soKhach: [{ tenDichVu: "Tour đảo", pax: P(4) }], tamTinh: 2_000_000 },
    { buoc: "dieu_chinh", lanSua: 1, soKhach: [{ tenDichVu: "Tour đảo", pax: P(3) }], tamTinh: 1_500_000 },
    { buoc: "hien_hanh", lanSua: 2, soKhach: [{ tenDichVu: "Tour đảo", pax: P(5) }], tamTinh: 2_500_000 },
  ]);
  assert.equal(g.lichSuSoKhach.at(-1).tamTinh, g.order.subtotal, "dòng hiện hành = tạm tính hiện hành của đơn");
  assert.deepEqual(g.lichSuSoKhach.at(-1).soKhach[0].pax, g.order.services[0].pax, "dòng hiện hành = số khách hiện hành của đơn");
});

test("D2 đơn chưa sửa lần nào: hai dòng trùng số; tạm tính lấy từ dòng tiền đã lưu, KHÔNG tin cột subtotal_after đã lưu thiếu của dòng điều chỉnh cũ", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(2) });
  const g0 = await chiTiet(w, d.id);
  assert.deepEqual(g0.lichSuSoKhach.map((x: any) => [x.buoc, x.lanSua, x.tamTinh]), [["khoi_tao", null, 1_000_000], ["hien_hanh", null, 1_000_000]]);
  // Bảng điều chỉnh CHỈ-THÊM (trigger chặn sửa / xoá) nên chèn thẳng một dòng cũ lưu SAI hai cột tiền (bài học Đợt E: nơi ghi cũ lưu thiếu); số khách của dòng đúng.
  w.sqlite.prepare("INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, 1, ?, ?, 1, 1)")
    .run("aaaaaaaa-0000-4000-8000-000000000001", d.id, JSON.stringify([{ serviceId: d.svc, pax: P(2) }]), JSON.stringify([{ serviceId: d.svc, pax: P(3) }]));
  const g1 = await chiTiet(w, d.id);
  assert.equal(g1.order.subtotal, 1_500_000, "đơn tính lại từ số khách, không từ cột đã lưu");
  assert.deepEqual(g1.lichSuSoKhach.map((x: any) => [x.buoc, x.lanSua, x.tamTinh]), [["khoi_tao", null, 1_000_000], ["hien_hanh", 1, 1_500_000]]);
});

test("D2 dịch vụ nhập tay hiện bằng nhãn 'dịch vụ nhập tay' (không chữ gõ tay), số khách và tiền của nó đứng nguyên ở mọi dòng", async () => {
  const w = await setup(true);
  const d = await taoDon(w, {
    pax: P(3),
    extra: [{ kind: "manual", pickupChoice: "KHONG_DON", name: "Xe riêng của anh Nam", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, departDate: vnDay(3), items: [{ description: "Xe 7 chỗ", quantity: 1, unitPrice: 200000 }] }],
  });
  assert.equal((await sua(w, d.id, d.svc, P(2))).status, 200);
  const g = await chiTiet(w, d.id);
  assert.deepEqual(g.lichSuSoKhach.map((x: any) => x.tamTinh), [1_700_000, 1_200_000]);
  for (const dong of g.lichSuSoKhach) {
    assert.deepEqual(dong.soKhach.map((s: any) => s.tenDichVu), ["Tour đảo", "dịch vụ nhập tay"]);
    assert.equal(dong.soKhach[1].pax.adult, 2);
  }
  assert.doesNotMatch(JSON.stringify(g.lichSuSoKhach), /anh Nam/);
});

test("D2 quyền: chỉ người có order.history.view với đơn này nhận lịch sử số khách; Bán hàng không lập đơn xem được đơn nhưng nhận null (cùng điều kiện khối `history`)", async () => {
  const w = await setup();
  const d = await taoDon(w, { pax: P(4) });
  assert.equal((await sua(w, d.id, d.svc, P(3))).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: ID.SALES, body: { staffId: ID.FIELD } })).status, 200);
  for (const [ai, nhan] of [[ID.ACC, "Kế toán"], [ID.SALES, "người lập"], [ID.SUPER, "Toàn quyền"], [ID.FIELD, "hướng dẫn viên đang phụ trách"]] as const) {
    const g = await chiTiet(w, d.id, ai);
    assert.ok(Array.isArray(g.lichSuSoKhach) && g.lichSuSoKhach.length === 2, `${nhan}: có lịch sử`);
    assert.ok(g.history.length > 0, `${nhan}: khối history cũng có (cùng điều kiện)`);
  }
  const b = await chiTiet(w, d.id, ID.SALES_B); // đã khẳng định status 200 trong chiTiet — không phải 403 mang thân lỗi
  assert.deepEqual(b.history, [], "Bán hàng B không có order.history.view với đơn này");
  assert.equal(b.lichSuSoKhach, null);
  assert.ok("lichSuSoKhach" in b, "khoá có mặt (null), không vắng");
});
