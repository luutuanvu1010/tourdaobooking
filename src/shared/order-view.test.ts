import { test } from "node:test";
import assert from "node:assert/strict";
import type { OrderItemDto, OrderServiceDto } from "./contracts.ts";
import { catalogTag, orderActions, serviceView, type OrderActions } from "./order-view.ts";

const NO_TRIP = { departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
const item = (o: Partial<OrderItemDto> = {}): OrderItemDto => ({
  id: "i1", catalogCode: "TD101", paxCode: "adult", description: "Tour 4 đảo Nha Trang — Người lớn", detail: null,
  quantity: 2, unitPrice: 1350000, catalogPrice: 1350000, lineTotal: 2700000, ...o,
});
const svc = (o: Partial<OrderServiceDto> = {}): OrderServiceDto => ({
  id: "s1", kind: "catalog", catalogCode: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax", pax: { adult: 2, child: 1, senior: 0, infant: 0 },
  items: [item(), item({ id: "i2", paxCode: "child", description: "Tour 4 đảo Nha Trang — Trẻ em", quantity: 1, unitPrice: 900000, catalogPrice: 950000, lineTotal: 900000 })],
  catalogStatus: null, ...NO_TRIP, ...o,
});

test("serviceView (theo người): chip đơn vị, mã, số khách từng loại, dòng tiền kèm độ lệch so với giá danh mục, tổng dịch vụ", () => {
  const v = serviceView(svc());
  assert.deepEqual([v.id, v.name, v.code, v.unit, v.pax, v.subtotal, v.tag], ["s1", "Tour 4 đảo Nha Trang", "TD101", "theo người", "2 người lớn · 1 trẻ em", 3600000, null]);
  assert.deepEqual(v.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.lineTotal, l.catalogPrice, l.deviation]), [
    ["Tour 4 đảo Nha Trang — Người lớn", 2, 1350000, 2700000, 1350000, null],
    ["Tour 4 đảo Nha Trang — Trẻ em", 1, 900000, 900000, 950000, -50000],
  ]);
});

test("serviceView (nhập tay): không mã, chip 'nhập tay', số khách vận hành, KHÔNG BAO GIỜ có độ lệch giá", () => {
  const v = serviceView(svc({
    kind: "manual", catalogCode: null, name: "Xe đưa đón riêng", unit: "manual", pax: { adult: 3, child: 0, senior: 0, infant: 0 },
    items: [item({ catalogCode: null, paxCode: null, description: "Xe 7 chỗ 2 chiều", detail: "Cả đoàn", quantity: 1, unitPrice: 800000, catalogPrice: null, lineTotal: 800000 })],
  }));
  assert.deepEqual([v.code, v.unit, v.pax, v.subtotal], [null, "nhập tay", "3 khách", 800000]);
  assert.deepEqual(v.lines.map((l) => [l.detail, l.deviation]), [["Cả đoàn", null]]);
});

test("serviceView (theo nhóm): '7 khách', chip nhóm; số lượt nằm ở dòng tiền", () => {
  const v = serviceView(svc({
    name: "Phao chuối", catalogCode: "TTB03", unit: "per5Pax", pax: { adult: 7, child: 0, senior: 0, infant: 0 },
    items: [item({ catalogCode: "TTB03", description: "Phao chuối — Người lớn", quantity: 2, unitPrice: 1500000, catalogPrice: 1500000, lineTotal: 3000000 })],
  }));
  assert.deepEqual([v.unit, v.pax, v.subtotal, v.lines[0]!.quantity], ["theo nhóm 5 khách/lượt", "7 khách", 3000000, 2]);
});

test("serviceView: thông tin chuyến — chưa có ngày → dòng cảnh báo; check-in không ngày = 'Cùng ngày khởi hành'", () => {
  assert.deepEqual(serviceView(svc()).trip, [{ label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }]);
  const v = serviceView(svc({ departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinTime: "09:00", note: "Đón trước cổng" }));
  assert.deepEqual(v.trip, [
    { label: "Khởi hành", value: "20/09/2026 · 07:30", warn: false },
    { label: "Đón", value: "07:00 · Bến Cầu Đá", warn: false },
    { label: "Check-in", value: "Cùng ngày khởi hành · 09:00", warn: false },
    { label: "Ghi chú", value: "Đón trước cổng", warn: false },
  ]);
});

test("catalogTag: chỉ hai trạng thái có nhãn; ok/null không nhãn; serviceView mang nhãn theo catalogStatus", () => {
  assert.deepEqual(catalogTag("price_changed"), { tone: "warning", text: "Giá danh mục đã đổi" });
  assert.deepEqual(catalogTag("unavailable"), { tone: "muted", text: "Dịch vụ đã ẩn khỏi danh mục" });
  assert.equal(catalogTag("ok"), null);
  assert.equal(catalogTag(null), null);
  assert.equal(serviceView(svc({ catalogStatus: "unavailable" })).tag?.text, "Dịch vụ đã ẩn khỏi danh mục");
});

test("serviceView: đơn giá cao hơn giá danh mục → độ lệch dương; giá 0 (em bé miễn phí) khớp giá danh mục 0 → không lệch", () => {
  const v = serviceView(svc({ items: [item({ unitPrice: 1400000, catalogPrice: 1350000, lineTotal: 2800000 }), item({ id: "i3", paxCode: "infant", quantity: 1, unitPrice: 0, catalogPrice: 0, lineTotal: 0 })] }));
  assert.deepEqual(v.lines.map((l) => l.deviation), [50000, null]);
});

test("orderActions: nút theo trạng thái và quyền; đơn đã xác nhận khoá dịch vụ/tiền và chỉ còn sửa chuyến", () => {
  const A = (o: Partial<OrderActions>): OrderActions => ({ edit: false, confirm: false, editTrip: false, cancel: false, noPermission: false, locked: false, ...o });
  assert.deepEqual(orderActions("draft", true), A({ edit: true, confirm: true, cancel: true }));
  assert.deepEqual(orderActions("draft", false), A({ noPermission: true }));
  assert.deepEqual(orderActions("confirmed", true), A({ editTrip: true, cancel: true, locked: true }));
  assert.deepEqual(orderActions("confirmed", false), A({ noPermission: true, locked: true }));
  assert.deepEqual(orderActions("cancelled", true), A({}));
  assert.deepEqual(orderActions("cancelled", false), A({ noPermission: true }));
});
