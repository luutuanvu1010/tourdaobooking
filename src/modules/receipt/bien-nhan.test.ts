// Biên nhận theo DANH SÁCH TRẮNG (ADR-0026 đ11; kế hoạch Task 8 — NT-B1). Hai lớp:
//  (1) luật thuần `dungBienNhan`: đưa số lạ 480017 vào MỌI ô KHÔNG được phép của đơn (id, người lập, người đặt, ghi chú thanh toán, ghi chú vận hành, mã/giá
//      danh mục, chặng, trạng thái danh mục…) → JSON biên nhận không có số đó; khoá của ReceiptDto bằng ĐÚNG danh sách (thêm trường = sửa bài này);
//  (2) route thật trên khung thử: đơn + sổ mang số lạ ở mọi ô bí mật của đơn / sổ (ghi chú lần thu, tên người thu, hình thức…) → `GET /api/orders/:id/receipt`
//      không lộ; đã trả / còn lại lấy từ billing (một hàm).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CompanyDto, OrderDetailDto } from "../../shared/contracts.ts";
import { dungBienNhan } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const LA = "480017";
const coLo = (json: string) => json.includes(LA) || json.includes("480.017");
const COMPANY: CompanyDto = { name: "CÔNG TY TNHH TOUR ĐẢO", taxCode: "4201969169", address: "Nha Trang", hotline: "0845 256 256", email: null };

const donBiMat = (): OrderDetailDto => ({
  id: `ord-${LA}`, orderCode: "TD-20260930-0001", staffId: `stf-${LA}`, staffName: `NV ${LA}`, bookerPartyId: `pty-${LA}`, bookerName: `Đại lý ${LA}`,
  status: "confirmed", customerName: "Trần Văn Bình", customerPhone: "0901234567", customerEmail: null, customerNote: null,
  subtotal: 1_000_000, discount: 0, total: 1_000_000, paymentNote: `ghi chú thanh toán ${LA}`, createdAt: "2026-09-30T01:00:00.000Z", updatedAt: `upd-${LA}`,
  confirmedAt: `cf-${LA}`, deliveredAt: null, completedAt: null,
  services: [{
    id: `svc-${LA}`, kind: "catalog", catalogCode: `TD${LA}`, name: "Vé Hòn Tằm", unit: "perPax", pax: { adult: 2, child: 0, senior: 0, infant: 0 },
    items: [{ id: `it-${LA}`, catalogCode: `TD${LA}`, paxCode: "adult", description: "Người lớn", detail: null, quantity: 2, unitPrice: 500_000, catalogPrice: Number(LA), lineTotal: 1_000_000 }],
    catalogStatus: "ok", legs: [{ id: `leg-${LA}` } as never],
    departDate: "2026-10-01", departTime: null, pickupTime: "07:00", pickupPlace: "Khách sạn", checkinDate: null, checkinTime: null, checkinPlace: null, note: `ghi chú vận hành ${LA}`,
  }],
});

test("NT-B1 (luật): số lạ 480017 ở mọi ô KHÔNG được phép của đơn không lọt vào ReceiptDto; khoá đúng danh sách trắng", () => {
  const r = dungBienNhan(donBiMat(), COMPANY, { daTra: 300_000, conLai: 700_000 });
  assert.equal(coLo(JSON.stringify(r)), false, JSON.stringify(r));
  assert.deepEqual(Object.keys(r).sort(), [
    "company", "conLai", "createdAt", "customerEmail", "customerName", "customerNote", "customerPhone", "daTra", "discount", "orderCode", "services", "status", "subtotal", "total",
  ]);
  assert.deepEqual(Object.keys(r.services[0]!).sort(), ["checkinDate", "checkinPlace", "checkinTime", "departDate", "departTime", "items", "name", "pax", "pickupPlace", "pickupTime", "unit"]);
  assert.deepEqual(Object.keys(r.services[0]!.items[0]!).sort(), ["description", "detail", "lineTotal", "quantity", "unitPrice"]);
  assert.deepEqual([r.daTra, r.conLai, r.status.nhan], [300_000, 700_000, "Đã xác nhận"]);
  assert.equal(dungBienNhan({ ...donBiMat(), deliveredAt: "x" }, COMPANY, { daTra: 1, conLai: 0 }).status.nhan, "Đã giao – đã thu đủ");
});

test("NT-B1 (route thật): GET /api/orders/:id/receipt — số lạ ở ô bí mật của đơn và SỔ (ghi chú lần thu, tên người thu) không lộ; đã trả / còn lại từ billing; khuôn quyền chi tiết đơn", async () => {
  const w = world();
  const SALES = "11111111-1111-4111-8111-111111111111";
  const HDV = "22222222-2222-4222-8222-222222222222";
  const DT = "66666666-6666-4666-8666-666666666666";
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: `Bán ${LA}`, perms: ["SALES"] });
  seedStaff(w.sqlite, { id: HDV, phone: "0900000002", name: `Người thu ${LA}`, perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000007", name: "Đối Tác", perms: ["PARTNER"] });
  const id = "99999999-9999-4999-8999-000000000001";
  const AT = "2026-09-01T00:00:00.000Z";
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, payment_note, created_at, updated_at)
    VALUES (?, 'TD-BN-1', ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?, ?)`).run(id, SALES, `nội bộ ${LA}`, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date, note) VALUES ('svc-bn', ?, 'Vé', 'perPax', 2, '2026-10-01', ?)`).run(id, `vận hành ${LA}`);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, catalog_code, catalog_price, pax_code)
    VALUES ('it-bn', ?, 'svc-bn', 'Người lớn', 2, 500000, 1000000, 'ZX1', ?, 'adult')`).run(id, Number(LA));
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('a-bn', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(id, `pty-${HDV}`, AT, AT, AT);
  const thu = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 300_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "toi", ghiChu: `lần thu ${LA}` } });
  assert.equal(thu.status, 201, thu.text);
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(coLo(r.text), false, r.text);
  assert.doesNotMatch(r.text, /Chuyển khoản|BANK_TRANSFER|Người thu/, "không hình thức thu, không tên người thu");
  assert.deepEqual([r.json.receipt.daTra, r.json.receipt.conLai, r.json.receipt.total], [300_000, 700_000, 1_000_000]);
  assert.equal((await w.call("GET", `/api/orders/${id}/receipt`, { as: DT })).status, 403, "Đối tác đơn người khác");
  assert.equal((await w.call("GET", `/api/orders/${id}/receipt`, { as: HDV })).status, 200, "HDV đang phụ trách");
});
