import { test } from "node:test";
import assert from "node:assert/strict";
import type { EffectiveService } from "../../shared/order-lines.ts";
import {
  catalogStatusOf, confirmGaps, confirmWindow, describeTripChange, describeTripUpdates, snapshotService, summarizeDeviations, validateService, validateTrip, validateTripUpdate,
  type ServiceContext, type StoredService,
} from "./service-rules.ts";

const NOTES = { child: "Trẻ em cao từ 1 m đến 1,4 mét", senior: "Người cao tuổi >= 60 tuổi", infant: "Luôn miễn phí" };
const tour: EffectiveService = { code: "TD101", name: "Tour 3 đảo", unit: "perPax", prices: { adult: 850000, child: 595000, senior: 850000, infant: 0 }, notes: NOTES, visible: true };
const banana: EffectiveService = { code: "TTB03", name: "Phao chuối", unit: "per5Pax", prices: { adult: 1000000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null }, visible: true };
const jetski: EffectiveService = { code: "TTB06", name: "Motor nước", unit: "perPax", prices: { adult: 800000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null }, visible: true };
const catalog = (...s: EffectiveService[]) => new Map(s.map((x) => [x.code, x]));
const ctx = (stored: StoredService[] = [], ...s: EffectiveService[]): ServiceContext => ({ catalog: catalog(...(s.length ? s : [tour, banana, jetski])), stored });

const P = (adult = 0, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const catalogInput = (extra: Record<string, unknown> = {}) => ({
  kind: "catalog", catalogCode: "TD101", pax: P(2, 1), catalogPriceSeen: { adult: 850000, child: 595000 }, departDate: "2026-09-25", ...extra,
});
function ok(raw: unknown, c: ServiceContext = ctx()) {
  const r = validateService(raw, 0, c);
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.value;
}
function bad(raw: unknown, c: ServiceContext = ctx()) {
  const r = validateService(raw, 0, c);
  assert.ok(!r.ok);
  return r;
}

// ---- dịch vụ danh mục: dòng tiền do máy chủ sinh ----
test("danh mục: máy chủ sinh dòng tiền theo số khách, mang catalogPrice + loại khách, không nhận số lượng từ client", () => {
  const v = ok({ ...catalogInput(), items: [{ description: "hack", quantity: 99, unitPrice: 1 }] });
  assert.deepEqual(v.items.map((i) => [i.paxCode, i.quantity, i.unitPrice, i.catalogPrice, i.lineTotal, i.catalogCode]), [
    ["adult", 2, 850000, 850000, 1700000, "TD101"],
    ["child", 1, 595000, 595000, 595000, "TD101"],
  ]);
  assert.equal(v.items[1]!.detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  assert.equal(v.items[0]!.detail, null);
  assert.deepEqual([v.kind, v.name, v.unit, v.id], ["catalog", "Tour 3 đảo", "perPax", null]);
});

test("danh mục: đơn giá thương lượng lưu unitPrice khác catalogPrice (Q7: chỉ ghi nhận, không chặn)", () => {
  const v = ok(catalogInput({ unitPrices: { adult: 800000 } }));
  assert.deepEqual(v.items.map((i) => [i.unitPrice, i.catalogPrice]), [[800000, 850000], [595000, 595000]]);
  assert.equal(ok(catalogInput({ unitPrices: { adult: 0 } })).items[0]!.unitPrice, 0);
});

test("danh mục: dịch vụ nhóm — số khách ở adult, số lượng = ceil(khách / cỡ nhóm)", () => {
  const v = ok({ kind: "catalog", catalogCode: "TTB03", pax: P(7), catalogPriceSeen: { adult: 1000000 } });
  assert.deepEqual(v.items.map((i) => [i.quantity, i.unitPrice, i.lineTotal, i.paxCode]), [[2, 1000000, 2000000, "adult"]]);
});

test("danh mục: loại khách không có giá → lỗi; đơn giá cho loại không có khách → lỗi", () => {
  assert.match(bad({ kind: "catalog", catalogCode: "TTB06", pax: P(1, 1), catalogPriceSeen: { adult: 800000 } }).message, /không có giá cho trẻ em/);
  assert.match(bad(catalogInput({ pax: P(2), unitPrices: { child: 1 } })).message, /không có khách loại này/);
  assert.match(bad(catalogInput({ unitPrices: { hack: 1 } })).message, /loại khách "hack"/);
  assert.match(bad(catalogInput({ unitPrices: { adult: 1.5 } })).message, /số nguyên/);
  assert.match(bad(catalogInput({ unitPrices: { adult: -1 } })).message, /đơn giá/);
});

test("danh mục: dịch vụ tính theo nhóm không nhận số khách loại khác adult", () => {
  const r = bad({ kind: "catalog", catalogCode: "TTB03", pax: P(3, 1), catalogPriceSeen: { adult: 1000000 } });
  assert.match(r.message, /Dịch vụ 1: .*tính theo nhóm/);
  ok({ kind: "catalog", catalogCode: "TTB03", pax: P(3), catalogPriceSeen: { adult: 1000000 } });
});

test("danh mục: cần ≥ 1 khách không phải em bé; trần 50 khách; số khách phải là số nguyên", () => {
  assert.match(bad(catalogInput({ pax: P(0, 0, 0, 2), catalogPriceSeen: { infant: 0 } })).message, /không phải em bé/);
  assert.match(bad(catalogInput({ pax: P(0) })).message, /không phải em bé/);
  assert.match(bad(catalogInput({ pax: P(30, 21) })).message, /tối đa 50 khách/);
  assert.match(bad(catalogInput({ pax: P(51) })).message, /số khách người lớn/);
  assert.match(bad(catalogInput({ pax: { adult: 1.5 } })).message, /số nguyên/);
  assert.match(bad(catalogInput({ pax: undefined })).message, /thiếu số khách/);
  ok(catalogInput({ pax: P(50), catalogPriceSeen: { adult: 850000 } }));
});

test("BK5: giá danh mục đã xem khác giá hiện tại → catalog_changed kèm chi tiết; thiếu giá đã xem → lỗi đầu vào", () => {
  const r = bad(catalogInput({ catalogPriceSeen: { adult: 900000, child: 595000 } }));
  assert.equal(r.code, "catalog_changed");
  assert.deepEqual(r.details, [{ serviceIndex: 0, catalogCode: "TD101", pax: "adult", seen: 900000, current: 850000 }]);
  const missing = bad(catalogInput({ catalogPriceSeen: { adult: 850000 } }));
  assert.equal(missing.code, undefined);
  assert.match(missing.message, /thiếu giá danh mục đã xem cho trẻ em/);
});

test("danh mục: mã sai dạng / không có / đang ẩn → lỗi; ẩn = catalog_unavailable", () => {
  assert.match(bad(catalogInput({ catalogCode: "có dấu" })).message, /mã dịch vụ/);
  assert.equal(bad(catalogInput({ catalogCode: "NOPE" })).code, "catalog_unavailable");
  assert.equal(bad(catalogInput(), ctx([], { ...tour, visible: false })).code, "catalog_unavailable");
  assert.equal(bad(catalogInput({ catalogCode: "TD101" }), ctx([], banana)).code, "catalog_unavailable");
});

test("danh mục: đơn vị chưa hỗ trợ → lỗi rõ", () => {
  assert.match(bad(catalogInput(), ctx([], { ...tour, unit: "perGroup" })).message, /chưa hỗ trợ/);
});

// ---- Q11: bản chụp cho nháp cũ ----
const stored: StoredService = {
  id: "sv1", catalogCode: "TD101", name: "Tour 3 đảo (cũ)", unit: "perPax", pax: P(2, 1),
  items: [
    { paxCode: "adult", detail: null, catalogPrice: 850000 },
    { paxCode: "child", detail: "Trẻ em cao từ 1 m đến 1,4 mét", catalogPrice: 595000 },
  ],
};

test("bản chụp: cùng id + mã + số khách → giữ tên/đơn vị/giá đã lưu dù danh mục đã ẩn hoặc đã đổi giá", () => {
  const hidden = ctx([stored], { ...tour, visible: false });
  const v = ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(2, 1) }, hidden);
  assert.deepEqual([v.id, v.name, v.unit], ["sv1", "Tour 3 đảo (cũ)", "perPax"]);
  assert.deepEqual(v.items.map((i) => [i.unitPrice, i.catalogPrice]), [[850000, 850000], [595000, 595000]]);
  assert.equal(v.items[1]!.detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  // Sheet đổi giá 850k → 700k: vẫn giữ 850k, không cần catalogPriceSeen
  const moved = ctx([stored], { ...tour, prices: { ...tour.prices, adult: 700000 } });
  assert.equal(ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(2, 1) }, moved).items[0]!.catalogPrice, 850000);
  // người dùng vẫn sửa được đơn giá thương lượng trên bản chụp
  assert.deepEqual(ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(2, 1), unitPrices: { adult: 800000 } }, moved).items.map((i) => [i.unitPrice, i.catalogPrice]), [[800000, 850000], [595000, 595000]]);
});

test("bản chụp: đổi số khách hoặc đổi dịch vụ → phải tra danh mục còn hiện; id cũ vẫn giữ", () => {
  const hidden = ctx([stored], { ...tour, visible: false });
  assert.equal(bad({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(3, 1), catalogPriceSeen: { adult: 850000, child: 595000 } }, hidden).code, "catalog_unavailable");
  const live = ctx([stored]);
  const v = ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(3, 1), catalogPriceSeen: { adult: 850000, child: 595000 } }, live);
  assert.deepEqual([v.id, v.name], ["sv1", "Tour 3 đảo"]); // tên/giá lấy lại từ danh mục hiện tại
  // id lạ (không thuộc đơn này) không được hưởng bản chụp và không được mượn id
  const stranger = bad({ kind: "catalog", catalogCode: "TD101", id: "other", pax: P(2, 1) }, hidden);
  assert.equal(stranger.code, "catalog_unavailable");
});

test("snapshotService: dựng lại giá + ghi chú loại khách; thiếu dữ liệu → null", () => {
  const snap = snapshotService(stored)!;
  assert.deepEqual(snap.prices, { adult: 850000, child: 595000, senior: null, infant: null });
  assert.equal(snap.notes.child, "Trẻ em cao từ 1 m đến 1,4 mét");
  assert.equal(snapshotService({ ...stored, catalogCode: null }), null);
  assert.equal(snapshotService({ ...stored, items: [{ paxCode: null, detail: null, catalogPrice: null }] }), null);
  assert.equal(snapshotService({ ...stored, items: [] }), null);
});

// ---- dịch vụ nhập tay (Q10) ----
const manualInput = (extra: Record<string, unknown> = {}) => ({
  kind: "manual", name: " Thuê áo phao ", pax: P(3), items: [{ description: "Áo phao", quantity: 3, unitPrice: 50000, detail: "size L" }], ...extra,
});

test("nhập tay: tiền nhập tự do, số khách chỉ là thông tin vận hành (không khớp dòng tiền cũng được)", () => {
  const v = ok(manualInput({ pax: P(7) }));
  assert.deepEqual([v.kind, v.catalogCode, v.unit, v.name], ["manual", null, "manual", "Thuê áo phao"]);
  assert.deepEqual(v.items.map((i) => [i.description, i.quantity, i.unitPrice, i.lineTotal, i.paxCode, i.catalogPrice, i.catalogCode]), [["Áo phao", 3, 50000, 150000, null, null, null]]);
  assert.equal(ok(manualInput({ pax: P(0) })).pax.adult, 0); // 0 khách lưu nháp được; chỉ chặn lúc xác nhận
});

test("chuyến: U+2028/2029 và ký tự điều hướng hai chiều bị bỏ (không giả xuống dòng, không đảo chiều chữ trong mẫu xuất); giữ nối độ rộng 0 của emoji", () => {
  const r = validateTrip({ note: "a b c‮d⁦e", pickupPlace: "x‏y‎z", checkinPlace: "👨‍👩" }, "D");
  assert.ok(r.ok);
  assert.equal(r.value.note, "a b c d e");
  assert.equal(r.value.pickupPlace, "x y z");
  assert.equal(r.value.checkinPlace, "👨‍👩");
});

test("nhập tay: tên và dòng tiền bắt buộc, kiểm số nguyên/khoảng như dòng nhập tay cũ", () => {
  assert.match(bad(manualInput({ name: "  " })).message, /tên dịch vụ/);
  assert.match(bad(manualInput({ items: [] })).message, /ít nhất một dòng/);
  assert.match(bad(manualInput({ items: [{ description: "x", quantity: 1, unitPrice: "5" }] })).message, /đơn giá/);
  assert.match(bad(manualInput({ items: [{ description: "x", quantity: 0, unitPrice: 5 }] })).message, /số lượng/);
  assert.match(bad(manualInput({ items: [{ description: "", quantity: 1, unitPrice: 5 }] })).message, /mô tả/);
  assert.match(bad(manualInput({ items: [{ description: "x", quantity: 100000, unitPrice: 100000000000 }] })).message, /vượt giới hạn/);
  assert.match(bad({ kind: "khac" }).message, /loại dịch vụ/);
  assert.match(bad(null).message, /không hợp lệ/);
});

test("nhập tay: id trỏ tới dịch vụ đã lưu của đơn được giữ; id lạ bị bỏ", () => {
  assert.equal(ok(manualInput({ id: "sv1" }), ctx([{ ...stored, id: "sv1" }])).id, "sv1");
  assert.equal(ok(manualInput({ id: "zzz" }), ctx([stored])).id, null);
});

// ---- thông tin chuyến ----
test("chuyến: chuẩn hoá rỗng → null, bỏ ký tự điều khiển, ghi chú giữ xuống dòng", () => {
  const r = validateTrip({ departDate: "2026-09-25", departTime: " 07:30 ", pickupTime: "", pickupPlace: "KS A\n\t50 Trần Phú\u0007", checkinPlace: "  ", note: "ăn chay\r\nsay sóng\u0000ok" }, "Dịch vụ 1");
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    departDate: "2026-09-25", departTime: "07:30", pickupTime: null, pickupPlace: "KS A 50 Trần Phú", checkinDate: null, checkinTime: null, checkinPlace: null, note: "ăn chay\nsay sóng ok",
  });
});

test("chuyến: ngày phải đúng lịch, giờ HH:MM 00:00–23:59, độ dài giới hạn", () => {
  for (const [field, value, re] of [
    ["departDate", "2026-02-30", /ngày khởi hành/], ["departDate", "20/09/2026", /ngày khởi hành/], ["checkinDate", "2026-13-01", /ngày check-in/],
    ["departTime", "24:00", /giờ khởi hành/], ["pickupTime", "7:30", /giờ đón/], ["checkinTime", "07:60", /giờ check-in/], ["departDate", 20260925, /ngày khởi hành/],
    ["pickupPlace", "x".repeat(201), /tối đa 200/], ["checkinPlace", "x".repeat(201), /tối đa 200/], ["note", "x".repeat(1001), /tối đa 1000/],
  ] as const) {
    const r = validateTrip({ [field]: value }, "Dịch vụ 1");
    assert.ok(!r.ok, `${field}=${String(value)}`);
    assert.match(r.message, re);
  }
  assert.ok(validateTrip({ pickupPlace: "x".repeat(200), note: "x".repeat(1000) }, "D").ok);
});

// ---- điều kiện xác nhận (Q4 + Q12) ----
test("khoảng xác nhận: từ hôm nay đến +365 ngày", () => {
  assert.deepEqual(confirmWindow("2026-09-19"), { from: "2026-09-19", to: "2027-09-19" });
});

test("confirmGaps: thiếu ngày / quá khứ / quá xa / 0 khách — mỗi dịch vụ một danh sách lý do", () => {
  const today = "2026-09-19";
  const s = (id: string, departDate: string | null, guests = 1) => ({ id, name: `DV ${id}`, departDate, pax: P(guests) });
  assert.deepEqual(confirmGaps([s("a", "2026-09-19"), s("b", "2027-09-19")], today), []); // hai đầu khoảng đều được
  assert.deepEqual(confirmGaps([s("a", null), s("b", "2026-09-18"), s("c", "2027-09-20"), s("d", "2026-10-01", 0), s("e", null, 0)], today), [
    { serviceId: "a", name: "DV a", reasons: ["no_date"] },
    { serviceId: "b", name: "DV b", reasons: ["past_date"] },
    { serviceId: "c", name: "DV c", reasons: ["too_far"] },
    { serviceId: "d", name: "DV d", reasons: ["no_guests"] },
    { serviceId: "e", name: "DV e", reasons: ["no_date", "no_guests"] },
  ]);
});

// ---- trạng thái so với danh mục hiện tại ----
test("catalogStatusOf: nhập tay = null; ẩn/mất/đổi đơn vị = unavailable; đổi giá = price_changed", () => {
  const svc = { catalogCode: "TD101", unit: "perPax", items: stored.items };
  assert.equal(catalogStatusOf({ ...svc, catalogCode: null }, tour), null);
  assert.equal(catalogStatusOf(svc, undefined), "unavailable");
  assert.equal(catalogStatusOf(svc, { ...tour, visible: false }), "unavailable");
  assert.equal(catalogStatusOf(svc, { ...tour, unit: "per5Pax" }), "unavailable");
  assert.equal(catalogStatusOf(svc, { ...tour, prices: { ...tour.prices, child: 600000 } }), "price_changed");
  assert.equal(catalogStatusOf(svc, tour), "ok");
});

// ---- sửa trường vận hành (Q9) ----
test("sửa trường vận hành: đơn nháp không kiểm khoảng ngày; xác nhận thì không xoá ngày và ngày ĐỔI phải trong khoảng", () => {
  const today = "2026-09-19";
  const cur = [{ id: "a", departDate: "2026-09-10" }, { id: "b", departDate: "2026-10-01" }];
  const input = (services: unknown[]) => ({ expectedUpdatedAt: "2026-09-19T01:00:00.000Z", services });
  // nháp: ngày quá khứ, bỏ trống ngày đều được
  assert.ok(validateTripUpdate(input([{ id: "a", departDate: "2020-01-01" }, { id: "b" }]), cur, "draft", today).ok);
  // xác nhận: giữ nguyên ngày đã qua để sửa ghi chú → được
  const keep = validateTripUpdate(input([{ id: "a", departDate: "2026-09-10", note: "đã đi rồi" }]), cur, "confirmed", today);
  assert.ok(keep.ok);
  assert.equal(keep.ok && keep.value.updates[0]!.trip.note, "đã đi rồi");
  // xác nhận: đổi sang quá khứ / quá xa / xoá ngày → chặn
  assert.match((validateTripUpdate(input([{ id: "b", departDate: "2026-09-18" }]), cur, "confirmed", today) as { message: string }).message, /từ 2026-09-19 đến 2027-09-19/);
  assert.ok(!validateTripUpdate(input([{ id: "b", departDate: "2027-09-20" }]), cur, "confirmed", today).ok);
  assert.match((validateTripUpdate(input([{ id: "b" }]), cur, "confirmed", today) as { message: string }).message, /phải có ngày khởi hành/);
  assert.ok(validateTripUpdate(input([{ id: "b", departDate: "2026-09-19" }]), cur, "confirmed", today).ok); // đầu khoảng
});

test("sửa trường vận hành: kiểm đầu vào (expectedUpdatedAt, id thuộc đơn, không trùng, trường chuyến hợp lệ)", () => {
  const cur = [{ id: "a", departDate: "2026-10-01" }];
  const msg = (v: unknown) => {
    const r = validateTripUpdate(v, cur, "draft", "2026-09-19");
    assert.ok(!r.ok);
    return r.message;
  };
  assert.match(msg(null), /không hợp lệ/);
  assert.match(msg({ services: [{ id: "a" }] }), /expectedUpdatedAt/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [] }), /ít nhất một dịch vụ/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [{ id: "zzz" }] }), /không thuộc đơn này/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [{ id: "a" }, { id: "a" }] }), /trùng/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [{ id: "a", departTime: "24:00" }] }), /giờ khởi hành/);
  assert.match(msg({ expectedUpdatedAt: "x", services: Array.from({ length: 21 }, () => ({ id: "a" })) }), /Tối đa 20/);
});

// ---- mô tả cho nhật ký ----
test("summarizeDeviations: chỉ dòng lệch giá, gọn, không có dữ liệu cá nhân", () => {
  const line = (over: object) => ({ catalogCode: "TD101", paxCode: "adult" as const, unitPrice: 800000, catalogPrice: 850000, ...over });
  assert.equal(summarizeDeviations([line({}), line({ unitPrice: 850000 }), line({ catalogCode: null, catalogPrice: null })]), "lệch giá danh mục: TD101 người lớn 850.000 ₫ → 800.000 ₫");
  assert.equal(summarizeDeviations([line({ unitPrice: 850000 })]), undefined);
  assert.equal(summarizeDeviations([]), undefined);
  const many = summarizeDeviations(Array.from({ length: 8 }, (_, i) => line({ catalogCode: `T${i}` })), 3)!;
  assert.match(many, /… và 5 dòng khác$/);
  assert.equal(many.split(";").length, 4);
});

test("describeTripChange: ngày/giờ ghi trước → sau, địa điểm và ghi chú chỉ ghi 'đổi' (không lộ dữ liệu cá nhân)", () => {
  const before = { departDate: "2026-09-25", departTime: null, pickupTime: "06:30", pickupPlace: "KS Novotel, phòng 1205", checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
  const after = { ...before, departDate: "2026-09-26", departTime: "08:00", pickupTime: null, pickupPlace: "Sân bay Cam Ranh", note: "ăn chay" };
  const s = describeTripChange("Tour 3 đảo", before, after)!;
  assert.equal(s, "Tour 3 đảo: ngày khởi hành 2026-09-25 → 2026-09-26, giờ khởi hành (trống) → 08:00, giờ đón 06:30 → (trống), đổi điểm đón, đổi ghi chú");
  assert.ok(!s.includes("Novotel") && !s.includes("Cam Ranh") && !s.includes("ăn chay"));
  assert.equal(describeTripChange("X", before, { ...before }), null);
});

test("describeTripUpdates: gộp nhiều dịch vụ; không đổi gì → null; id lạ bị bỏ qua", () => {
  const t = { departDate: "2026-09-25", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
  const cur = [{ id: "a", name: "A", trip: t }, { id: "b", name: "B", trip: t }];
  assert.equal(describeTripUpdates(cur, [{ id: "a", trip: t }, { id: "b", trip: t }]), null);
  assert.equal(describeTripUpdates(cur, [{ id: "a", trip: { ...t, departTime: "07:00" } }, { id: "b", trip: { ...t, note: "x" } }, { id: "zzz", trip: t }]), "A: giờ khởi hành (trống) → 07:00 | B: đổi ghi chú");
});

// ---- hằng dùng chung với giao diện (A2 Task 1) ----
test("hằng và confirmWindow xuất từ service-rules là CÙNG giá trị với shared/trip-rules (một nguồn với giao diện)", async () => {
  const shared = await import("../../shared/trip-rules.ts");
  const rules = await import("./service-rules.ts");
  assert.equal(rules.MAX_SERVICES, shared.MAX_SERVICES);
  assert.equal(rules.MAX_LINES_PER_ORDER, shared.MAX_LINES_PER_ORDER);
  assert.equal(rules.MAX_DAYS_AHEAD, shared.MAX_DAYS_AHEAD);
  assert.equal(rules.confirmWindow, shared.confirmWindow);
});
