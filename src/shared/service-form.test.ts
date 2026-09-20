import { test } from "node:test";
import assert from "node:assert/strict";
import type { OrderServiceDto } from "./contracts.ts";
import type { CatalogService } from "./order-lines.ts";
import {
  addManualLine, canAddService, draftFromDto, draftIssues, draftSubtotal, emptyLine, groupInfo, isLocked, newCatalogDraft, newManualDraft, orderIssues, orderSummary,
  cardCodes, guestDetail, paxSummary, previewLines, refreshFromCatalog, removeManualLine, setGuests, setManualLine, setPax, setUnitPrice, snapshotItem, toServiceInput, totalLines, unitLabel,
  type CatalogDraft, type ManualDraft,
} from "./service-form.ts";

const NO_NOTES = { child: null, senior: null, infant: null };
const tour: CatalogService = {
  code: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax",
  prices: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
  notes: { child: "Trẻ 5–10 tuổi", senior: "Từ 60 tuổi", infant: "Dưới 5 tuổi, miễn phí" },
};
const banana: CatalogService = { code: "TTB03", name: "Phao chuối", unit: "per5Pax", prices: { adult: 1500000, child: null, senior: null, infant: null }, notes: NO_NOTES };
const live = new Map([[tour.code, tour], [banana.code, banana]]);

const tourDraft = (adult: number, child = 0): CatalogDraft => setPax(setPax(newCatalogDraft(tour, "k1"), "adult", adult), "child", child);

const savedTour: OrderServiceDto = {
  id: "svc-1", kind: "catalog", catalogCode: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax",
  pax: { adult: 2, child: 1, senior: 0, infant: 0 },
  items: [
    { id: "i1", catalogCode: "TD101", paxCode: "adult", description: "Tour 4 đảo Nha Trang — Người lớn", detail: null, quantity: 2, unitPrice: 1300000, catalogPrice: 1350000, lineTotal: 2600000 },
    { id: "i2", catalogCode: "TD101", paxCode: "child", description: "Tour 4 đảo Nha Trang — Trẻ em", detail: "Trẻ 5–10 tuổi", quantity: 1, unitPrice: 950000, catalogPrice: 950000, lineTotal: 950000 },
  ],
  catalogStatus: "price_changed",
  departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: null, checkinTime: "07:15", checkinPlace: "Cảng Cầu Đá", note: null,
};
const savedManual: OrderServiceDto = {
  id: "svc-3", kind: "manual", catalogCode: null, name: "Xe đưa đón riêng", unit: "manual",
  pax: { adult: 3, child: 0, senior: 0, infant: 0 },
  items: [{ id: "i9", catalogCode: null, paxCode: null, description: "Xe 7 chỗ 2 chiều", detail: null, quantity: 1, unitPrice: 800000, catalogPrice: null, lineTotal: 800000 }],
  catalogStatus: null,
  departDate: "2026-09-20", departTime: "06:30", pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
};

// ---- tạo thẻ ----
test("newCatalogDraft: theo người → 1 người lớn, đơn giá mặc định = giá danh mục mọi loại có giá; theo nhóm → Số khách = 1", () => {
  const d = newCatalogDraft(tour, "k1");
  assert.deepEqual(d.pax, { adult: 1, child: 0, senior: 0, infant: 0 });
  assert.deepEqual(d.unitPrices, { adult: 1350000, child: 950000, senior: 1200000, infant: 0 });
  assert.deepEqual([d.kind, d.source, d.id, d.catalogStatus, d.trip.departDate, isLocked(d)], ["catalog", "live", null, null, "", false]);
  assert.deepEqual(newCatalogDraft(banana, "k2").pax, { adult: 1, child: 0, senior: 0, infant: 0 });
  assert.deepEqual(newCatalogDraft(banana, "k2").unitPrices, { adult: 1500000 });
});

test("newManualDraft: thẻ trống với đúng một dòng tiền trống, số khách 0", () => {
  const d = newManualDraft("k3");
  assert.deepEqual([d.kind, d.name, d.guests, d.lines], ["manual", "", 0, [emptyLine()]]);
  assert.deepEqual(emptyLine(), { description: "", detail: "", quantity: 1, unitPrice: 0 });
});

// ---- dòng tiền xem trước ----
test("previewLines theo người: 2 người lớn + 1 trẻ em → hai dòng, tạm tính 3.650.000 ₫ (số mẫu của đặc tả)", () => {
  const d = tourDraft(2, 1);
  const p = previewLines(d);
  assert.ok(p.ok);
  assert.deepEqual(p.lines.map((l) => [l.pax, l.quantity, l.unitPrice, l.lineTotal, l.catalogPrice, l.deviation]), [
    ["adult", 2, 1350000, 2700000, 1350000, null],
    ["child", 1, 950000, 950000, 950000, null],
  ]);
  assert.equal(p.lines[1]!.detail, "Trẻ 5–10 tuổi");
  assert.equal(draftSubtotal(d), 3650000);
});

test("previewLines theo nhóm: 7 khách với nhóm 5 → 2 lượt × 1.500.000 = 3.000.000 ₫; groupInfo cho dòng chữ '7 khách ÷ 5 = 2 lượt'", () => {
  const d = setPax(newCatalogDraft(banana, "k2"), "adult", 7);
  const p = previewLines(d);
  assert.ok(p.ok);
  assert.deepEqual(p.lines.map((l) => [l.quantity, l.unitPrice, l.lineTotal]), [[2, 1500000, 3000000]]);
  assert.deepEqual(groupInfo(d), { size: 5, guests: 7, trips: 2 });
  assert.equal(groupInfo(tourDraft(1)), null);
  assert.deepEqual(groupInfo(setPax(d, "adult", 0)), { size: 5, guests: 0, trips: 0 });
});

test("đơn giá sửa được: khác giá danh mục → deviation = đơn giá − giá danh mục (âm = thấp hơn); giá 0 vẫn hợp lệ", () => {
  const d = setUnitPrice(tourDraft(2), "adult", 1300000);
  const p = previewLines(d);
  assert.ok(p.ok);
  assert.deepEqual([p.lines[0]!.unitPrice, p.lines[0]!.catalogPrice, p.lines[0]!.deviation, p.lines[0]!.lineTotal], [1300000, 1350000, -50000, 2600000]);
  assert.equal(previewLines(setUnitPrice(tourDraft(2), "adult", 0)).ok, true);
  assert.equal(setUnitPrice(tourDraft(2), "adult", -5).unitPrices.adult, 0);
  assert.equal(setUnitPrice(tourDraft(2), "adult", 1.9).unitPrices.adult, 1);
});

test("dịch vụ nhập tay: dòng tiền tự nhập, catalogPrice null và deviation null KHÔNG BAO GIỜ (không có nhãn lệch giá)", () => {
  let d: ManualDraft = newManualDraft("k3");
  d = setManualLine(d, 0, { description: "Xe 7 chỗ 2 chiều", quantity: 1, unitPrice: 800000 });
  const p = previewLines(d);
  assert.ok(p.ok);
  assert.deepEqual(p.lines.map((l) => [l.pax, l.description, l.quantity, l.unitPrice, l.lineTotal, l.catalogPrice, l.deviation]), [[null, "Xe 7 chỗ 2 chiều", 1, 800000, 800000, null, null]]);
  assert.equal(draftSubtotal(d), 800000);
  assert.equal(draftSubtotal(addManualLine(d)), 800000); // dòng mới trống: 1 × 0 ₫
  assert.equal(addManualLine(d).lines.length, 2);
  assert.equal(removeManualLine(addManualLine(d), 0).lines.length, 1);
  assert.equal(setManualLine(d, 0, { quantity: -3 }).lines[0]!.quantity, 0);
  assert.equal(setGuests(d, 3.7).guests, 3);
});

// ---- lỗi chặn Lưu ----
test("draftIssues (danh mục): chưa có khách, chỉ em bé, vượt 50 khách; đúng 50 là hợp lệ", () => {
  assert.deepEqual(draftIssues(tourDraft(0)).map((i) => i.message), ["Nhập số khách."]);
  assert.deepEqual(draftIssues(setPax(tourDraft(0), "infant", 2)).map((i) => i.message), ["Cần ít nhất 1 khách không phải em bé."]);
  assert.deepEqual(draftIssues(tourDraft(30, 21)).map((i) => i.message), ["Tối đa 50 khách."]);
  assert.deepEqual(draftIssues(tourDraft(50)), []);
  assert.deepEqual(draftIssues(tourDraft(2, 1)), []);
  assert.deepEqual(draftIssues(setPax(newCatalogDraft(banana, "k2"), "adult", 0)).map((i) => i.message), ["Nhập số khách."]);
});

test("draftIssues (nhập tay): thiếu tên, thiếu mô tả dòng, số lượng 0, quá 50 dòng, quá 50 khách; đủ thì không lỗi", () => {
  let d: ManualDraft = newManualDraft("k3");
  assert.deepEqual(draftIssues(d).map((i) => i.message), ["Nhập tên dịch vụ.", "Dòng 1: nhập mô tả."]);
  d = setManualLine({ ...d, name: "Xe đưa đón riêng" }, 0, { description: "Xe 7 chỗ", quantity: 0, unitPrice: 800000 });
  assert.deepEqual(draftIssues(d).map((i) => i.message), ["Dòng 1: số lượng tối thiểu là 1."]);
  d = setManualLine(d, 0, { quantity: 1 });
  assert.deepEqual(draftIssues(d), []);
  assert.deepEqual(draftIssues({ ...d, lines: [] }).map((i) => i.message), ["Thêm ít nhất một dòng tiền."]);
  assert.deepEqual(draftIssues(setGuests(d, 51)).map((i) => i.message), ["Tối đa 50 khách."]);
  const many = { ...d, lines: Array.from({ length: 51 }, () => ({ description: "x", detail: "", quantity: 1, unitPrice: 1 })) };
  assert.ok(draftIssues(many).some((i) => i.message === "Tối đa 50 dòng tiền."));
});

test("orderIssues / canAddService / totalLines: trần 20 dịch vụ và 50 dòng tiền mỗi đơn", () => {
  const ok = [tourDraft(2, 1), setPax(newCatalogDraft(banana, "k2"), "adult", 7)];
  assert.equal(totalLines(ok), 3);
  assert.deepEqual(orderIssues(ok), []);
  assert.equal(canAddService(ok), true);
  const twenty = Array.from({ length: 20 }, (_, i) => ({ ...tourDraft(1), key: `k${i}` }));
  assert.equal(canAddService(twenty), false);
  assert.deepEqual(orderIssues([...twenty, tourDraft(1)]), ["Đơn tối đa 20 dịch vụ."]);
  const fifty = [{ ...newManualDraft("m"), name: "X", lines: Array.from({ length: 50 }, () => ({ description: "x", detail: "", quantity: 1, unitPrice: 1 })) }, tourDraft(1)];
  assert.deepEqual(orderIssues(fifty), ["Đơn tối đa 50 dòng tiền."]);
});

// ---- thân gửi lên ----
test("toServiceInput (danh mục): KHÔNG có items/quantity; unitPrices và catalogPriceSeen chỉ loại có khách; dịch vụ mới không có id", () => {
  const d = setUnitPrice(tourDraft(2, 1), "adult", 1300000);
  const withTrip = { ...d, trip: { ...d.trip, departDate: "2026-09-20", pickupPlace: "Khách sạn Sunrise" } };
  const input = toServiceInput(withTrip);
  assert.equal(input.kind, "catalog");
  assert.ok(!("items" in input) && !("quantity" in input) && !("id" in input));
  assert.deepEqual(input, {
    kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 1, senior: 0, infant: 0 },
    unitPrices: { adult: 1300000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 },
    departDate: "2026-09-20", departTime: "", pickupTime: "", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
  });
});

test("toServiceInput (nhập tay): số khách vận hành ở adult, dòng tiền đã cắt khoảng trắng; dịch vụ đã lưu mang id", () => {
  const d = setManualLine({ ...newManualDraft("k3"), id: "svc-3", name: "  Xe đưa đón riêng ", guests: 3 }, 0, { description: " Xe 7 chỗ 2 chiều ", detail: " ", quantity: 1, unitPrice: 800000 });
  assert.deepEqual(toServiceInput(d), {
    id: "svc-3", kind: "manual", name: "Xe đưa đón riêng", pax: { adult: 3, child: 0, senior: 0, infant: 0 },
    items: [{ description: "Xe 7 chỗ 2 chiều", detail: "", quantity: 1, unitPrice: 800000 }],
    departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
  });
});

// ---- dịch vụ đã lưu: bản chụp ----
test("snapshotItem: dựng lại bảng giá từ dòng đã lưu (giá danh mục lúc lập, ghi chú loại khách); thiếu catalogPrice → null", () => {
  assert.deepEqual(snapshotItem(savedTour), {
    code: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax",
    prices: { adult: 1350000, child: 950000, senior: null, infant: null }, notes: { child: "Trẻ 5–10 tuổi", senior: null, infant: null },
  });
  assert.equal(snapshotItem(savedManual), null);
  assert.equal(snapshotItem({ ...savedTour, items: [{ ...savedTour.items[0]!, catalogPrice: null }] }), null);
});

test("draftFromDto (danh mục): giữ bản chụp — đơn giá thương lượng, nhãn theo catalogStatus, thông tin chuyến ('' cho null)", () => {
  const d = draftFromDto(savedTour, live, "k1");
  assert.equal(d.kind, "catalog");
  if (d.kind !== "catalog") return;
  assert.deepEqual([d.id, d.source, d.catalogStatus, isLocked(d)], ["svc-1", "snapshot", "price_changed", false]);
  assert.deepEqual(d.unitPrices, { adult: 1300000, child: 950000 });
  assert.deepEqual(d.trip, { departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "07:15", checkinPlace: "Cảng Cầu Đá", note: "" });
  const p = previewLines(d);
  assert.ok(p.ok);
  assert.deepEqual(p.lines.map((l) => [l.quantity, l.unitPrice, l.catalogPrice, l.deviation]), [[2, 1300000, 1350000, -50000], [1, 950000, 950000, null]]);
  assert.deepEqual(toServiceInput(d), {
    id: "svc-1", kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 1, senior: 0, infant: 0 },
    unitPrices: { adult: 1300000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 },
    departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "07:15", checkinPlace: "Cảng Cầu Đá", note: "",
  });
});

test("thẻ bản chụp: ĐỔI số khách khi danh mục còn dịch vụ → chuyển sang giá hiện tại và bỏ nhãn cũ; đổi đơn giá thì vẫn là bản chụp", () => {
  const d = draftFromDto(savedTour, live, "k1") as CatalogDraft;
  const priced = setUnitPrice(d, "adult", 1250000);
  assert.deepEqual([priced.source, priced.catalogStatus, priced.unitPrices.adult], ["snapshot", "price_changed", 1250000]);
  const moved = setPax(d, "adult", 3);
  assert.deepEqual([moved.source, moved.catalogStatus, moved.item === tour, moved.pax.adult], ["live", null, true, 3]);
  assert.deepEqual(moved.unitPrices, { adult: 1350000, child: 950000, senior: 1200000, infant: 0 });
});

// Đặc tả §5.1: chỉ chuyển sang giá hiện tại khi ĐỔI số khách; số khách cuối cùng y như đã lưu thì phải giữ nguyên bản chụp (đơn giá thương lượng + nhãn), khớp nhánh `kept` của máy chủ.
const liveNewer = new Map([[tour.code, { ...tour, prices: { adult: 1400000, child: 1000000, senior: 1200000, infant: 0 } }]]);

test("setPax (I1): bấm '+' rồi '−' về đúng số khách đã lưu → QUAY LẠI bản chụp: giữ đơn giá thương lượng 1.300.000, nhãn price_changed, thân gửi lên không đổi", () => {
  const d = draftFromDto(savedTour, liveNewer, "k1") as CatalogDraft; // đã lưu 2 người lớn giá 1.300.000; danh mục hiện tại đã lên 1.400.000
  const before = toServiceInput(d);
  const plus = setPax(d, "adult", 3);
  assert.deepEqual([plus.source, plus.catalogStatus, plus.unitPrices.adult], ["live", null, 1400000]); // đổi số khách thật → giá hiện tại (không đổi hành vi)
  const back = setPax(plus, "adult", 2);
  assert.deepEqual([back.source, back.catalogStatus, back.unitPrices.adult, back.item.prices.adult], ["snapshot", "price_changed", 1300000, 1350000]);
  assert.deepEqual([back.name, back.unit, back.pax], [savedTour.name, savedTour.unit, savedTour.pax]);
  assert.deepEqual(back.unitPrices, { adult: 1300000, child: 950000 });
  assert.deepEqual(toServiceInput(back), before);
  const p = previewLines(back);
  assert.ok(p.ok);
  assert.deepEqual(p.lines.map((l) => [l.unitPrice, l.catalogPrice, l.deviation]), [[1300000, 1350000, -50000], [950000, 950000, null]]); // nhãn lệch giá đúng như trang đơn
});

test("setPax (I1): quay về số khách đã lưu qua nhiều loại (thêm trẻ em rồi bớt) cũng về bản chụp; chạm cùng giá trị không mất đơn giá đã sửa", () => {
  const d = draftFromDto(savedTour, liveNewer, "k1") as CatalogDraft;
  const senior = setPax(d, "senior", 1);
  assert.equal(senior.source, "live");
  assert.equal(setPax(senior, "senior", 0).source, "snapshot");
  const priced = setUnitPrice(d, "adult", 1250000); // vẫn là bản chụp
  const same = setPax(priced, "adult", 2); // gõ lại đúng số cũ: không được chuyển sang giá hiện tại, không được mất đơn giá vừa sửa
  assert.deepEqual([same.source, same.catalogStatus, same.unitPrices.adult], ["snapshot", "price_changed", 1250000]);
});

// I1-bis: khi quay về số khách đã lưu, đơn giá người dùng VỪA GÕ ở chế độ giá hiện tại (khác giá danh mục hiện tại — cùng heuristic với refreshFromCatalog) không được bị đè bằng đơn giá đã lưu.
test("setPax (I1-bis): live → gõ đơn giá 1.234.000 → quay về số đã lưu ⇒ bản chụp GIỮ 1.234.000; loại chưa gõ dùng đơn giá đã lưu; thân gửi lên khớp", () => {
  const d = draftFromDto(savedTour, liveNewer, "k1") as CatalogDraft; // đã lưu 2 người lớn 1.300.000 + 1 trẻ em 950.000; danh mục hiện tại 1.400.000 / 1.000.000
  const liveCard = setPax(d, "adult", 3);
  assert.deepEqual([liveCard.source, liveCard.unitPrices.adult, liveCard.unitPrices.child], ["live", 1400000, 1000000]);
  const typed = setUnitPrice(liveCard, "adult", 1234000);
  const back = setPax(typed, "adult", 2);
  assert.deepEqual([back.source, back.catalogStatus, back.unitPrices.adult, back.unitPrices.child], ["snapshot", "price_changed", 1234000, 950000]);
  const input = toServiceInput(back);
  assert.equal(input.kind, "catalog");
  if (input.kind === "catalog") {
    assert.deepEqual(input.unitPrices, { adult: 1234000, child: 950000 });
    assert.deepEqual(input.catalogPriceSeen, { adult: 1350000, child: 950000 }); // giá danh mục của BẢN CHỤP (đúng nhánh kept của máy chủ)
  }
  const p = previewLines(back);
  assert.ok(p.ok);
  assert.deepEqual(p.lines.map((l) => [l.unitPrice, l.catalogPrice, l.deviation]), [[1234000, 1350000, -116000], [950000, 950000, null]]);
});

test("setPax (I1-bis): live không gõ gì (đơn giá = mặc định) rồi quay về ⇒ vẫn 1.300.000 / 950.000; đơn giá gõ ở loại KHÁC vẫn giữ; gõ trên bản chụp rồi đổi số khách và quay về là bỏ (đặc tả §5.1)", () => {
  const d = draftFromDto(savedTour, liveNewer, "k1") as CatalogDraft;
  const back = setPax(setPax(d, "adult", 3), "adult", 2);
  assert.deepEqual([back.source, back.unitPrices.adult, back.unitPrices.child], ["snapshot", 1300000, 950000]);
  const child = setPax(setUnitPrice(setPax(d, "adult", 3), "child", 990000), "adult", 2); // chỉ trẻ em được gõ
  assert.deepEqual([child.source, child.unitPrices.adult, child.unitPrices.child], ["snapshot", 1300000, 990000]);
  const snapTyped = setUnitPrice(d, "adult", 1250000); // gõ khi còn là bản chụp…
  const away = setPax(snapTyped, "adult", 3); // …rồi ĐỔI số khách: chuyển sang giá hiện tại, giá đã gõ trên bản chụp mất theo thiết kế §5.1
  assert.deepEqual([away.source, away.unitPrices.adult], ["live", 1400000]);
  assert.equal(setPax(away, "adult", 2).unitPrices.adult, 1300000);
});

test("setPax (I1): ĐỔI số khách thật (khác đã lưu) vẫn chuyển sang giá hiện tại và bỏ nhãn cũ — cả khi đổi loại khác", () => {
  const d = draftFromDto(savedTour, liveNewer, "k1") as CatalogDraft;
  for (const moved of [setPax(d, "adult", 1), setPax(d, "child", 2), setPax(setPax(d, "adult", 3), "child", 0)]) {
    assert.deepEqual([moved.source, moved.catalogStatus, moved.item === liveNewer.get("TD101")], ["live", null, true]);
    assert.equal(moved.unitPrices.adult, 1400000);
  }
});

test("setPax (I1): thẻ mới (không có bản chụp đã lưu) và thẻ live không bản chụp giữ nguyên hành vi cũ", () => {
  const fresh = newCatalogDraft(tour, "k");
  assert.equal(fresh.saved, null);
  const there = setPax(setPax(fresh, "adult", 3), "adult", 1);
  assert.deepEqual([there.source, there.unitPrices, there.pax], ["live", { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, { adult: 1, child: 0, senior: 0, infant: 0 }]);
  const noSnap = draftFromDto({ ...savedTour, items: [{ ...savedTour.items[0]!, catalogPrice: null }] }, live, "k") as CatalogDraft; // thiếu giá danh mục → nhánh live không bản chụp
  assert.deepEqual([noSnap.source, noSnap.saved], ["live", null]);
  assert.equal(setPax(setPax(noSnap, "adult", 3), "adult", 2).source, "live");
});

test("thẻ bản chụp mà danh mục không còn dịch vụ → KHOÁ: đổi số khách không có tác dụng (nút 'Chọn lại từ danh mục')", () => {
  const d = draftFromDto(savedTour, new Map(), "k1") as CatalogDraft;
  assert.equal(isLocked(d), true);
  assert.equal(setPax(d, "adult", 5), d);
  assert.equal(previewLines(d).ok, true); // vẫn xem được và vẫn lưu/xác nhận được
  assert.deepEqual(draftIssues(d), []);
});

test("draftFromDto (nhập tay): giữ tên, số khách vận hành, dòng tiền; id dịch vụ để PUT khớp theo id", () => {
  const d = draftFromDto(savedManual, live, "k3");
  assert.equal(d.kind, "manual");
  if (d.kind !== "manual") return;
  assert.deepEqual([d.id, d.name, d.guests, d.lines], ["svc-3", "Xe đưa đón riêng", 3, [{ description: "Xe 7 chỗ 2 chiều", detail: "", quantity: 1, unitPrice: 800000 }]]);
  assert.equal(draftSubtotal(d), 800000);
});

// ---- tóm tắt tiền và nhãn ----
test("orderSummary: số mẫu của đặc tả — tạm tính 7.450.000 ₫, cọc 1.000.000 ₫, còn lại 6.450.000 ₫; cảnh báo giảm giá/cọc quá lớn", () => {
  const drafts = [tourDraft(2, 1), setPax(newCatalogDraft(banana, "k2"), "adult", 7), setManualLine(setGuests({ ...newManualDraft("k3"), name: "Xe" }, 3), 0, { description: "Xe 7 chỗ 2 chiều", unitPrice: 800000 })];
  assert.deepEqual(orderSummary(drafts, 0, 1000000), { subtotal: 7450000, discount: 0, total: 7450000, deposit: 1000000, remaining: 6450000, warning: null });
  assert.equal(orderSummary(drafts, 8000000, 0).warning, "Giảm giá đang lớn hơn tạm tính.");
  assert.equal(orderSummary(drafts, 0, 7500000).warning, "Tiền cọc đang lớn hơn tổng cộng.");
  assert.deepEqual(orderSummary([], 0, 0), { subtotal: 0, discount: 0, total: 0, deposit: 0, remaining: 0, warning: null });
});

test("unitLabel: chip đơn vị của thẻ", () => {
  assert.equal(unitLabel("perPax"), "theo người");
  assert.equal(unitLabel("per5Pax"), "theo nhóm 5 khách/lượt");
  assert.equal(unitLabel("manual"), "nhập tay");
  assert.equal(unitLabel("perHour"), "đơn vị perHour");
});

// ---- bổ sung sau khi chạy đột biến kế hoạch: kiểm cả hai vế của điều kiện, biên, làm tròn, hai loại thẻ khoá ----
const hourly: CatalogService = { code: "H1", name: "Thuê theo giờ", unit: "perHour", prices: { adult: 100000, child: null, senior: null, infant: null }, notes: NO_NOTES };
const lines = (n: number) => Array.from({ length: n }, () => ({ description: "x", detail: "", quantity: 1, unitPrice: 1 }));
/** Dòng đã lưu THIẾU giá danh mục (dữ liệu cũ): không dựng được bản chụp. */
const noPriceDto: OrderServiceDto = {
  id: "svc-9", kind: "catalog", catalogCode: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax",
  pax: { adult: 2, child: 0, senior: 0, infant: 0 },
  items: [{ id: "i1", catalogCode: "TD101", paxCode: "adult", description: "Tour 4 đảo Nha Trang — Người lớn", detail: null, quantity: 2, unitPrice: 1300000, catalogPrice: null, lineTotal: 2600000 }],
  catalogStatus: null,
  departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
};

test("orderSummary với giảm giá khác 0: tổng cộng = tạm tính − giảm; cọc so với TỔNG CỘNG (không phải tạm tính)", () => {
  const drafts = [tourDraft(2, 1)]; // 3.650.000
  assert.deepEqual(orderSummary(drafts, 650000, 1000000), { subtotal: 3650000, discount: 650000, total: 3000000, deposit: 1000000, remaining: 2000000, warning: null });
  assert.equal(orderSummary(drafts, 650000, 3200000).warning, "Tiền cọc đang lớn hơn tổng cộng."); // 3,2tr < tạm tính 3,65tr nhưng > tổng cộng 3tr
  assert.equal(orderSummary(drafts, 3650000, 0).warning, null); // giảm đúng bằng tạm tính: không cảnh báo
});

test("setManualLine chỉ đổi đúng dòng index; removeManualLine giữ đúng dòng còn lại", () => {
  let d: ManualDraft = newManualDraft("m");
  d = addManualLine(setManualLine(d, 0, { description: "A", unitPrice: 10 }));
  d = setManualLine(d, 1, { description: "B", unitPrice: 20 });
  assert.deepEqual(d.lines.map((l) => [l.description, l.unitPrice]), [["A", 10], ["B", 20]]);
  assert.deepEqual(removeManualLine(d, 0).lines.map((l) => l.description), ["B"]);
  assert.deepEqual(removeManualLine(d, 1).lines.map((l) => l.description), ["A"]);
});

test("draftFromDto: dòng đã lưu thiếu giá danh mục — danh mục còn dịch vụ → thẻ live giữ đơn giá đã lưu; danh mục hết → thẻ khoá dựng từ đơn giá đã lưu", () => {
  assert.equal(snapshotItem(noPriceDto), null);
  assert.equal(snapshotItem({ ...noPriceDto, items: [] }), null);
  const a = draftFromDto(noPriceDto, live, "k") as CatalogDraft;
  assert.deepEqual([a.source, a.item === tour, a.live === tour, isLocked(a), a.repick, a.unitPrices.adult], ["live", true, true, false, false, 1300000]);
  const pa = previewLines(a);
  assert.ok(pa.ok);
  assert.deepEqual(pa.lines.map((l) => [l.unitPrice, l.catalogPrice, l.deviation]), [[1300000, 1350000, -50000]]);
  const b = draftFromDto(noPriceDto, new Map(), "k") as CatalogDraft;
  assert.deepEqual([b.source, b.live, isLocked(b), b.item.prices], ["snapshot", null, true, { adult: 1300000, child: null, senior: null, infant: null }]);
});

test("thẻ khoá loại (2): dòng thiếu giá danh mục + danh mục hết → PHẢI chọn lại (máy chủ sẽ 400 catalog_unavailable); bản chụp đủ giá thì không bắt buộc", () => {
  const b = draftFromDto(noPriceDto, new Map(), "k") as CatalogDraft;
  assert.equal(b.repick, true);
  assert.deepEqual(draftIssues(b).map((i) => [i.code, i.message]), [["repick", "Dịch vụ này không còn trong danh mục — chọn lại từ danh mục hoặc nhập tay."]]);
  const c = draftFromDto(savedTour, new Map(), "k") as CatalogDraft;
  assert.deepEqual([isLocked(c), c.repick, draftIssues(c)], [true, false, []]);
});

test("refreshFromCatalog (sau 409 catalog_changed): giá mới cho thẻ live, GIỮ đơn giá đã thương lượng, đơn giá chưa đổi chuyển sang giá mới; thẻ bản chụp không đổi", () => {
  const negotiated = setUnitPrice(tourDraft(2, 1), "adult", 1300000);
  const newer: CatalogService = { ...tour, prices: { adult: 1400000, child: 1000000, senior: 1200000, infant: 0 } };
  const r = refreshFromCatalog(negotiated, newer);
  assert.equal(r.item, newer);
  assert.equal(r.live, newer);
  assert.deepEqual(r.unitPrices, { adult: 1300000, child: 1000000, senior: 1200000, infant: 0 });
  const input = toServiceInput(r);
  assert.equal(input.kind, "catalog");
  if (input.kind === "catalog") assert.deepEqual(input.catalogPriceSeen, { adult: 1400000, child: 1000000 });
  const snap = draftFromDto(savedTour, live, "k") as CatalogDraft;
  assert.equal(refreshFromCatalog(snap, newer), snap);
});

test("danh mục đổi tên/đơn vị sau khi lưu: chạm bộ đếm (bản chụp → hiện tại) hoặc refreshFromCatalog → thẻ theo tên/đơn vị MỚI, nhóm đúng", () => {
  const renamed: CatalogService = { code: "TD101", name: "Tour mới tên", unit: "per5Pax", prices: { adult: 1500000, child: null, senior: null, infant: null }, notes: NO_NOTES };
  const one: OrderServiceDto = { ...savedTour, unit: "perPax", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, items: [savedTour.items[0]!] };
  const moved = setPax(draftFromDto(one, new Map([["TD101", renamed]]), "k") as CatalogDraft, "adult", 7);
  assert.deepEqual([moved.unit, moved.name, unitLabel(moved.unit)], ["per5Pax", "Tour mới tên", "theo nhóm 5 khách/lượt"]);
  assert.deepEqual(groupInfo(moved), { size: 5, guests: 7, trips: 2 });
  const r = refreshFromCatalog(newCatalogDraft({ ...renamed, unit: "perPax", name: "Tên cũ" }, "k"), renamed);
  assert.deepEqual([r.unit, r.name], ["per5Pax", "Tour mới tên"]);
});

test("cardCodes: bản chụp chỉ nhớ loại đã có dòng tiền nhưng thẻ vẫn cho thêm loại khách của danh mục hiện tại; đổi số khách không đổi danh sách; thẻ khoá giữ loại của bản chụp", () => {
  const snap = draftFromDto(savedTour, live, "k") as CatalogDraft; // đã lưu người lớn + trẻ em → bản chụp không có giá người cao tuổi/em bé
  assert.deepEqual(cardCodes(snap), ["adult", "child", "senior", "infant"]);
  const moved = setPax(snap, "senior", 1); // chạm bộ đếm → chuyển sang giá hiện tại
  assert.equal(moved.source, "live");
  assert.deepEqual(cardCodes(moved), ["adult", "child", "senior", "infant"]);
  const locked = draftFromDto(savedTour, new Map(), "k") as CatalogDraft;
  assert.deepEqual(cardCodes(locked), ["adult", "child"]);
  assert.deepEqual(cardCodes(newCatalogDraft(banana, "g")), ["adult"]); // theo nhóm: một ô "Số khách"
  assert.deepEqual(cardCodes({ ...snap, live: null, pax: { ...snap.pax, senior: 2 } }), ["adult", "child", "senior"]); // đang có khách thì luôn hiện để giảm được
});

test("guestDetail: giá + ghi chú loại khách; theo nhóm 'mỗi lượt'; loại chưa có ở bản chụp lấy giá/ghi chú của danh mục hiện tại; giá 0 vẫn hiện", () => {
  const f = (n: number) => `${n}đ`;
  const d = newCatalogDraft(tour, "k");
  assert.equal(guestDetail(d, "adult", f), "1350000đ");
  assert.equal(guestDetail(d, "child", f), "950000đ · Trẻ 5–10 tuổi");
  assert.equal(guestDetail(d, "infant", f), "0đ · Dưới 5 tuổi, miễn phí");
  assert.equal(guestDetail(newCatalogDraft(banana, "g"), "adult", f), "1500000đ mỗi lượt, tối đa 5 khách");
  const snap = draftFromDto(savedTour, live, "k") as CatalogDraft;
  assert.equal(guestDetail(snap, "adult", f), "1350000đ"); // giá của BẢN CHỤP
  assert.equal(guestDetail(snap, "senior", f), "1200000đ · Từ 60 tuổi"); // loại mới: giá và ghi chú của danh mục hiện tại
  assert.equal(guestDetail(draftFromDto(savedTour, new Map(), "k") as CatalogDraft, "senior", f), ""); // danh mục không còn: không có giá
});

test("paxSummary: theo người liệt kê từng loại; theo nhóm và nhập tay chỉ 'N khách'; không khách → 'Chưa có khách'", () => {
  assert.equal(paxSummary({ adult: 2, child: 1, senior: 0, infant: 0 }, "perPax"), "2 người lớn · 1 trẻ em");
  assert.equal(paxSummary({ adult: 1, child: 0, senior: 2, infant: 3 }, "perPax"), "1 người lớn · 2 người cao tuổi · 3 em bé");
  assert.equal(paxSummary({ adult: 7, child: 0, senior: 0, infant: 0 }, "per5Pax"), "7 khách");
  assert.equal(paxSummary({ adult: 3, child: 0, senior: 0, infant: 0 }, "manual"), "3 khách");
  assert.equal(paxSummary({ adult: 0, child: 0, senior: 0, infant: 0 }, "perPax"), "Chưa có khách");
});

test("biên: nhập tay đúng 50 khách / 50 dòng hợp lệ; đơn đúng 20 dịch vụ / 50 dòng không lỗi", () => {
  const base = { ...newManualDraft("m"), name: "X", lines: lines(1) };
  assert.deepEqual(draftIssues(setGuests(base, 50)), []);
  assert.deepEqual(draftIssues({ ...base, lines: lines(50) }), []);
  assert.deepEqual(orderIssues(Array.from({ length: 20 }, (_, i) => ({ ...tourDraft(1), key: `k${i}` }))), []);
  assert.deepEqual(orderIssues([{ ...base, lines: lines(50) }]), []);
});

test("draftIssues (nhập tay): tên và mô tả toàn khoảng trắng bị coi là trống; thành tiền vượt trần", () => {
  const d = setManualLine({ ...newManualDraft("m"), name: "   " }, 0, { description: "   " });
  assert.deepEqual(draftIssues(d).map((i) => i.message), ["Nhập tên dịch vụ.", "Dòng 1: nhập mô tả."]);
  const big = setManualLine({ ...newManualDraft("m"), name: "X" }, 0, { description: "y", quantity: 200000, unitPrice: 1000000 });
  assert.deepEqual(draftIssues(big).map((i) => i.message), ["Dòng 1: thành tiền vượt giới hạn."]);
});

test("draftIssues (danh mục): đơn vị chưa hỗ trợ → lỗi 'preview' và tạm tính 0; thành tiền vượt trần 100 tỷ → lỗi 'amount'", () => {
  const h1 = newCatalogDraft(hourly, "h");
  assert.deepEqual(draftIssues(h1).map((i) => i.code), ["preview"]);
  assert.equal(draftSubtotal(h1), 0);
  assert.deepEqual(draftIssues(setUnitPrice(tourDraft(2), "adult", 1e11)).map((i) => [i.code, i.message]), [["amount", "Thành tiền vượt giới hạn."]]);
  assert.deepEqual(draftIssues(setUnitPrice(tourDraft(1), "adult", 1e11)), []);
});

test("làm tròn và kẹp: setPax cắt phần lẻ; đơn giá kẹp ở trần 100 tỷ", () => {
  assert.equal(setPax(tourDraft(1), "adult", 2.9).pax.adult, 2);
  assert.equal(setUnitPrice(tourDraft(1), "adult", 1e15).unitPrices.adult, 100_000_000_000);
  assert.equal(setManualLine(newManualDraft("m"), 0, { unitPrice: 1e15 }).lines[0]!.unitPrice, 100_000_000_000);
});
