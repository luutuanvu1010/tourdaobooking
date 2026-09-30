import { test } from "node:test";
import assert from "node:assert/strict";
import type { TripInfoDto } from "./contracts.ts";
import { emptyTrip, formatDm, formatDmy, tripFromDto, tripPayload, tripRows, tripSheetDateIssues, tripSheetRowDate, tripSummaryLine, tripWarnings } from "./trip-form.ts";
import { vnToday } from "./vn-date.ts";

const TODAY = "2026-09-19";
const trip = (extra: Partial<ReturnType<typeof emptyTrip>> = {}) => ({ ...emptyTrip(), ...extra });
const codes = (t: ReturnType<typeof emptyTrip>, today = TODAY) => tripWarnings(t, today).map((w) => w.code);

const dto: TripInfoDto = {
  departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise, 12 Trần Phú",
  checkinDate: null, checkinTime: "07:15", checkinPlace: "Cảng Cầu Đá", note: "Bé dị ứng hải sản",
};
const NONE: TripInfoDto = { departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };

test("emptyTrip: mọi trường rỗng; tripFromDto: null → \"\" (checkinDate null = cùng ngày khởi hành)", () => {
  assert.deepEqual(emptyTrip(), { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });
  assert.deepEqual(tripFromDto(NONE), emptyTrip());
  assert.deepEqual(tripFromDto(dto), {
    departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise, 12 Trần Phú",
    checkinDate: "", checkinTime: "07:15", checkinPlace: "Cảng Cầu Đá", note: "Bé dị ứng hải sản",
  });
});

test("formatDmy / formatDm: đúng khuôn dd/mm/yyyy và dd/mm; giá trị lạ trả nguyên", () => {
  assert.equal(formatDmy("2026-09-20"), "20/09/2026");
  assert.equal(formatDm("2026-09-20"), "20/09");
  assert.equal(formatDmy("hôm nay"), "hôm nay");
  assert.equal(formatDm("2026-02-30"), "2026-02-30");
});

test("tripWarnings: ngày đã qua / quá 365 ngày; biên hôm nay và +365 KHÔNG cảnh báo; ngày trống KHÔNG cảnh báo", () => {
  assert.deepEqual(codes(trip({ departDate: "2026-09-18" })), ["past_date"]);
  assert.deepEqual(codes(trip({ departDate: TODAY })), []);
  assert.deepEqual(codes(trip({ departDate: "2027-09-19" })), []);
  assert.deepEqual(codes(trip({ departDate: "2027-09-20" })), ["too_far"]);
  assert.deepEqual(codes(trip()), []);
  assert.equal(tripWarnings(trip({ departDate: "2026-09-18" }), TODAY)[0]!.message, "Ngày khởi hành đã qua — vẫn lưu được, nhưng chưa thể xác nhận.");
  assert.equal(tripWarnings(trip({ departDate: "2027-09-20" }), TODAY)[0]!.message, "Ngày khởi hành quá 365 ngày — vẫn lưu được, nhưng chưa thể xác nhận.");
});

test("tripWarnings dùng `today` do nơi gọi cấp: 00:30 giờ VN vẫn là ngày hôm sau (không dùng ngày UTC)", () => {
  const today = vnToday(new Date("2026-09-19T17:30:00Z")); // 00:30 ngày 20/09 giờ Việt Nam
  assert.equal(today, "2026-09-20");
  assert.deepEqual(codes(trip({ departDate: "2026-09-19" }), today), ["past_date"]);
  assert.deepEqual(codes(trip({ departDate: "2026-09-20" }), today), []);
});

test("tripWarnings: giờ đón sau giờ khởi hành → cảnh báo; bằng nhau hoặc thiếu một giờ → không", () => {
  assert.deepEqual(codes(trip({ departDate: TODAY, departTime: "07:30", pickupTime: "08:00" })), ["pickup_after_depart"]);
  assert.equal(tripWarnings(trip({ departTime: "07:30", pickupTime: "08:00" }), TODAY)[0]!.message, "Giờ đón sau giờ khởi hành — kiểm tra lại.");
  assert.deepEqual(codes(trip({ departTime: "07:30", pickupTime: "07:30" })), []);
  assert.deepEqual(codes(trip({ departTime: "07:30" })), []);
  assert.deepEqual(codes(trip({ pickupTime: "08:00" })), []);
});

test("tripSummaryLine (bản 1.39): \"Đón <giờ> · <nơi>\", KHÔNG có ngày (cả đơn một ngày, ADR-0021); có giờ check-in thì thêm; thiếu cả giờ lẫn nơi đón → cảnh báo", () => {
  assert.deepEqual(tripSummaryLine(trip({ departDate: "2026-09-20", departTime: "07:45", pickupTime: "07:30", pickupPlace: "KS Mường Thanh Luxury" })), {
    text: "Đón 07:30 · KS Mường Thanh Luxury",
    warn: false,
  });
  assert.deepEqual(tripSummaryLine(trip({ pickupTime: "07:30", pickupPlace: "KS Mường Thanh Luxury", checkinTime: "08:15", checkinPlace: "Cảng Cầu Đá" })), {
    text: "Đón 07:30 · KS Mường Thanh Luxury · Check-in 08:15",
    warn: false,
  });
  assert.deepEqual(tripSummaryLine(trip({ departDate: "2026-09-20", pickupTime: "07:30" })), { text: "Đón 07:30", warn: false }, "chỉ có giờ đón");
  assert.deepEqual(tripSummaryLine(trip({ pickupPlace: "Bến Cầu Đá" })), { text: "Đón tại Bến Cầu Đá", warn: false }, "chỉ có nơi đón");
  assert.deepEqual(tripSummaryLine(trip({ departDate: "2026-09-20" })), { text: "Chưa có giờ / nơi đón", warn: true }, "có ngày nhưng chưa có giờ/nơi đón");
  assert.deepEqual(tripSummaryLine(trip()), { text: "Chưa có giờ / nơi đón", warn: true });
  assert.deepEqual(tripSummaryLine(trip({ checkinTime: "08:15" })), { text: "Chưa có giờ / nơi đón · Check-in 08:15", warn: true }, "có check-in nhưng chưa có đón");
});

test("tripRows: các dòng hiển thị ở trang đơn; check-in trống ngày = \"Cùng ngày khởi hành\"; trường rỗng bị bỏ", () => {
  assert.deepEqual(tripRows(dto), [
    { label: "Khởi hành", value: "20/09/2026 · 07:30", warn: false },
    { label: "Đón", value: "07:00 · Khách sạn Sunrise, 12 Trần Phú", warn: false },
    { label: "Check-in", value: "Cùng ngày khởi hành · 07:15 · Cảng Cầu Đá", warn: false },
    { label: "Ghi chú", value: "Bé dị ứng hải sản", warn: false },
  ]);
  assert.deepEqual(tripRows(NONE), [{ label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }]);
  assert.deepEqual(tripRows({ ...NONE, departDate: "2026-09-20", checkinDate: "2026-09-21", checkinTime: "06:00" }), [
    { label: "Khởi hành", value: "20/09/2026", warn: false },
    { label: "Check-in", value: "21/09/2026 · 06:00", warn: false },
  ]);
  assert.deepEqual(tripRows({ ...NONE, departDate: "2026-09-20", pickupPlace: "Bến Cầu Đá" }), [
    { label: "Khởi hành", value: "20/09/2026", warn: false },
    { label: "Đón", value: "Bến Cầu Đá", warn: false },
  ]);
  // chỉ có ngày check-in (không giờ, không nơi) vẫn hiện dòng Check-in
  assert.deepEqual(tripRows({ ...NONE, departDate: "2026-09-20", checkinDate: "2026-09-21" }), [
    { label: "Khởi hành", value: "20/09/2026", warn: false },
    { label: "Check-in", value: "21/09/2026", warn: false },
  ]);
});

test("tripRows(t, ngày của đơn) (bản 1.39): ngày khởi hành TRÙNG ngày của đơn → bỏ dòng \"Khởi hành\", còn giờ thì giữ dòng \"Giờ khởi hành\"; khác ngày (đơn cũ lệch ngày) hoặc chưa có ngày → như cũ", () => {
  assert.deepEqual(tripRows(dto, "2026-09-20"), [
    { label: "Giờ khởi hành", value: "07:30", warn: false },
    { label: "Đón", value: "07:00 · Khách sạn Sunrise, 12 Trần Phú", warn: false },
    { label: "Check-in", value: "Cùng ngày khởi hành · 07:15 · Cảng Cầu Đá", warn: false },
    { label: "Ghi chú", value: "Bé dị ứng hải sản", warn: false },
  ]);
  assert.deepEqual(tripRows({ ...NONE, departDate: "2026-09-20", pickupPlace: "Bến Cầu Đá" }, "2026-09-20"), [{ label: "Đón", value: "Bến Cầu Đá", warn: false }], "trùng ngày, không giờ: bỏ hẳn");
  assert.deepEqual(tripRows(dto, "2026-09-21")[0], { label: "Khởi hành", value: "20/09/2026 · 07:30", warn: false }, "đơn cũ lệch ngày: giữ ngày");
  assert.deepEqual(tripRows(NONE, null), [{ label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }], "chưa có ngày: giữ cảnh báo");
  assert.deepEqual(tripRows(dto, null)[0], { label: "Khởi hành", value: "20/09/2026 · 07:30", warn: false });
});

test("tripSheetDateIssues (ADR-0021, một ô ngày cho cả đơn): không để trống; đổi ngày phải trong khoảng; ngày đã lưu (dù đã qua) giữ nguyên thì vẫn lưu được; đơn cũ lệch ngày để trống = giữ ngày cũ", () => {
  assert.deepEqual(tripSheetDateIssues("2026-09-20", ["2026-09-20", "2026-09-20"], TODAY), []);
  assert.deepEqual(tripSheetDateIssues("2026-09-10", ["2026-09-10"], TODAY), []); // chuyến đã đi: chỉ sửa ghi chú, không đổi ngày
  assert.deepEqual(tripSheetDateIssues("", ["2026-09-20", "2026-09-20"], TODAY), ["Ngày khởi hành không được để trống."]);
  assert.deepEqual(tripSheetDateIssues("2026-09-18", ["2026-09-20", "2026-09-20"], TODAY), ["Ngày khởi hành phải từ 19/09/2026 đến 19/09/2027."]); // báo MỘT lần, không lặp theo dịch vụ
  assert.deepEqual(tripSheetDateIssues("2027-09-20", ["2026-09-20"], TODAY), ["Ngày khởi hành phải từ 19/09/2026 đến 19/09/2027."]);
  assert.deepEqual(tripSheetDateIssues("2027-09-19", ["2026-09-20"], TODAY), []);
  assert.deepEqual(tripSheetDateIssues("2026-13-40", [null], TODAY), ["Ngày khởi hành không hợp lệ."]);
  // đơn cũ lệch ngày: để trống = giữ ngày cũ từng dịch vụ (không lỗi); gom về ngày đã qua của một dịch vụ = ĐỔI ngày dịch vụ kia → phải trong khoảng
  assert.deepEqual(tripSheetDateIssues("", ["2026-09-20", "2026-09-25"], TODAY), []);
  assert.deepEqual(tripSheetDateIssues("2026-09-10", ["2026-09-10", "2026-09-25"], TODAY), ["Ngày khởi hành phải từ 19/09/2026 đến 19/09/2027."]);
  assert.deepEqual(tripSheetDateIssues("2026-09-25", ["2026-09-20", "2026-09-25"], TODAY), []);
});

test("tripSheetRowDate: ô cả đơn có ngày → mọi dịch vụ lấy ngày đó; ô trống → giữ ngày đã lưu của từng dịch vụ", () => {
  assert.equal(tripSheetRowDate("2026-09-25", "2026-09-20"), "2026-09-25");
  assert.equal(tripSheetRowDate("", "2026-09-20"), "2026-09-20");
  assert.equal(tripSheetRowDate("", null), "");
});

test("tripPayload: PUT /trip thay TOÀN BỘ — mọi dịch vụ, mọi trường (\"\" giữ nguyên để xoá), kèm expectedUpdatedAt", () => {
  const a = { id: "svc-a", trip: trip({ departDate: "2026-09-20", note: "x" }) };
  const b = { id: "svc-b", trip: emptyTrip() };
  assert.deepEqual(tripPayload([a, b], "2026-09-19T09:00:00.000Z"), {
    expectedUpdatedAt: "2026-09-19T09:00:00.000Z",
    services: [
      { id: "svc-a", departDate: "2026-09-20", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "x" },
      { id: "svc-b", departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" },
    ],
  });
});
