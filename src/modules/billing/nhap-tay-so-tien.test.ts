// ADR-0061 điều 7 + tiêu chí 6 (kiểm độc lập VỪA-1): tiền của DÒNG NHẬP TAY đi qua sổ tiền như dịch vụ danh mục — một cách tính (Hiến chương 5.4). Chạy THẬT
// trên khung thử (ứng dụng thật + SQLite): đơn danh mục + nhập tay lập qua POST /api/orders (công tắc BẬT) → biên nhận `GET /api/orders/:id/receipt`
// (ReceiptDto: dòng nhập tay, tổng, đã trả, còn lại) → HDV sửa số khách dịch vụ danh mục (phải thu đi qua `phaiThuCua` → `effectiveSubtotal`, đọc lại dòng
// nhập tay từ CSDL) → "Đã giao" chặn khi thiếu, qua khi đủ — đúng từng đồng. Không thay xác nhận sổ vàng SV-SC-05 của chủ / Kế toán.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const homNay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

test("ADR-0061 điều 7: đơn danh mục + nhập tay — biên nhận, còn lại sau một lần thu, sửa số khách (phải thu tính lại gồm dòng nhập tay), Đã giao khi đủ", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: HDV, phone: "0900000002", name: "Nam", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUPER, phone: "0900000003", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Vé Hòn Tằm', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  assert.equal((await w.call("POST", "/api/cai-dat/nhap-tay", { as: SUPER, body: { batNhapTay: true } })).status, 200);

  // Lập: 2 người lớn × 500.000 (danh mục) + "Xe đưa đón riêng" 2 × 400.000 (nhập tay), giảm 100.000 ⇒ 1.700.000 (máy chủ tính).
  const lap = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678", discount: 100000,
      services: [
        { kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: homNay() },
        { kind: "manual", name: "Xe đưa đón riêng", pax: { adult: 2 }, departDate: homNay(), items: [{ description: "Xe 7 chỗ", detail: "2 chiều", quantity: 2, unitPrice: 400000 }] },
      ],
    },
  });
  assert.equal(lap.status, 201, lap.text);
  const id = lap.json.order.id;
  assert.deepEqual([lap.json.order.subtotal, lap.json.order.total], [1_800_000, 1_700_000]);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: SALES, body: { staffId: HDV } })).status, 200);

  // Biên nhận: dòng nhập tay có mặt, tổng / đã trả / còn lại từ billing.
  const bn = async () => {
    const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
    assert.equal(r.status, 200, r.text);
    return r.json.receipt;
  };
  let r = await bn();
  const dongNhapTay = r.services.flatMap((s: any) => s.items).find((i: any) => i.description === "Xe 7 chỗ");
  assert.deepEqual([dongNhapTay?.quantity, dongNhapTay?.unitPrice, dongNhapTay?.lineTotal], [2, 400000, 800000]);
  assert.deepEqual([r.subtotal, r.discount, r.total, r.daTra, r.conLai], [1_800_000, 100_000, 1_700_000, 0, 1_700_000]);

  // Một lần thu 1.000.000 (HDV thu tiền mặt) ⇒ còn lại 700.000.
  const thu1 = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(thu1.status, 201, thu1.text);
  r = await bn();
  assert.deepEqual([r.daTra, r.conLai], [1_000_000, 700_000]);

  // HDV sửa số khách dịch vụ DANH MỤC 2 → 3 ⇒ phải thu tính lại (effectiveSubtotal đọc lại MỌI dòng, kể cả nhập tay): 1.500.000 + 800.000 − 100.000 = 2.200.000.
  const svcDanhMuc = lap.json.order.services[0].id;
  const sua = await w.call("POST", `/api/orders/${id}/handler-money-edit`, {
    as: HDV, body: { reason: "Khách thêm người", services: [{ id: svcDanhMuc, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] },
  });
  assert.equal(sua.status, 200, sua.text);
  r = await bn();
  assert.deepEqual([r.total, r.daTra, r.conLai], [2_200_000, 1_000_000, 1_200_000], "phải thu gồm dòng nhập tay sau điều chỉnh");

  // "Đã giao" khi còn thiếu → từ chối; thu nốt 1.200.000 → Đã giao được, còn lại 0.
  const thieu = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(thieu.status, 409, thieu.text);
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", id)[0].delivered_at, null);
  const thu2 = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 1_200_000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(thu2.status, 201, thu2.text);
  const giao = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(giao.status, 200, giao.text);
  assert.notEqual(w.q("SELECT delivered_at FROM orders WHERE id = ?", id)[0].delivered_at, null);
  r = await bn();
  assert.deepEqual([r.total, r.daTra, r.conLai], [2_200_000, 2_200_000, 0]);
  const chup = w.q("SELECT due_snapshot FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id);
  assert.deepEqual(chup.map((x: any) => x.due_snapshot), [2_200_000], "phiếu Đã giao chụp đúng phải thu gồm dòng nhập tay");
});
