// Luật thuần của màn "Việc của tôi" cho hướng dẫn viên (Task 1.8 ADR-0030, bản thiết kế "Viec cua toi - HDV v2" của chủ dự án).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EDIT_REASON_QUICK, departLabel, moneyEditServices, myJobChip, orderDepartDate, paxSummary, relLabel, sortMyJobs, telHref,
} from "./viec-cua-toi.ts";

const pax = (adult = 0, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });

test("relLabel: Hôm nay / Ngày mai / Còn N ngày / Đã đi N ngày trước — tính trên chuỗi ngày, qua tháng và năm", () => {
  assert.equal(relLabel("2026-09-27", "2026-09-27"), "Hôm nay");
  assert.equal(relLabel("2026-09-28", "2026-09-27"), "Ngày mai");
  assert.equal(relLabel("2026-09-29", "2026-09-27"), "Còn 2 ngày");
  assert.equal(relLabel("2026-10-02", "2026-09-27"), "Còn 5 ngày", "qua tháng");
  assert.equal(relLabel("2027-01-01", "2026-12-31"), "Ngày mai", "qua năm");
  assert.equal(relLabel("2026-09-26", "2026-09-27"), "Đã đi 1 ngày trước");
  assert.equal(relLabel("2026-09-20", "2026-09-27"), "Đã đi 7 ngày trước");
});

test("relLabel: chưa có ngày đi → chuỗi rỗng (thẻ chỉ hiện mã đơn, không bịa nhãn)", () => {
  assert.equal(relLabel(null, "2026-09-27"), "");
});

test("relLabel không phụ thuộc múi giờ máy (đổi TZ giữa chừng vẫn cùng kết quả)", () => {
  const before = process.env.TZ;
  try {
    for (const tz of ["UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      process.env.TZ = tz;
      assert.equal(relLabel("2026-10-01", "2026-09-30"), "Ngày mai", tz);
      assert.equal(departLabel("2026-09-28"), "Thứ Hai, 28/09", tz);
    }
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});

test("departLabel: 'Thứ …, DD/MM' theo lịch; chưa có ngày → 'Chưa có ngày đi'", () => {
  assert.equal(departLabel("2026-09-27"), "Chủ nhật, 27/09");
  assert.equal(departLabel("2026-09-28"), "Thứ Hai, 28/09");
  assert.equal(departLabel("2026-10-02"), "Thứ Sáu, 02/10");
  assert.equal(departLabel("2026-10-03"), "Thứ Bảy, 03/10");
  assert.equal(departLabel(null), "Chưa có ngày đi");
});

test("orderDepartDate: ngày đi của đơn = ngày khởi hành LỚN NHẤT (cùng định nghĩa tripDeparted/hàng chờ), bỏ dịch vụ chưa có ngày", () => {
  assert.equal(orderDepartDate(["2026-09-28", null, "2026-09-30", ""]), "2026-09-30");
  assert.equal(orderDepartDate([null, ""]), null);
  assert.equal(orderDepartDate([]), null);
});

test("paxSummary: tổng khách + chi tiết theo loại (chữ thường, bỏ loại 0, đúng thứ tự người lớn → em bé)", () => {
  assert.deepEqual(paxSummary(pax(8, 2)), { total: 10, detail: "8 người lớn, 2 trẻ em" });
  assert.deepEqual(paxSummary(pax(4, 1, 1)), { total: 6, detail: "4 người lớn, 1 trẻ em, 1 người cao tuổi" });
  assert.deepEqual(paxSummary(pax(7, 0, 0, 1)), { total: 8, detail: "7 người lớn, 1 em bé" });
  assert.deepEqual(paxSummary(pax()), { total: 0, detail: "" });
});

test("myJobChip: chờ xác nhận = cát; đã xác nhận còn ngày đi = xanh; đã xác nhận qua ngày đi = 'Đã đi tour' xám", () => {
  assert.deepEqual(myJobChip("draft", false), { label: "Chờ xác nhận", tone: "warn" });
  assert.deepEqual(myJobChip("draft", true), { label: "Chờ xác nhận", tone: "warn" }, "nháp qua ngày đi vẫn là chờ xác nhận (bản thiết kế: isPast chỉ khi đã xác nhận)");
  assert.deepEqual(myJobChip("confirmed", false), { label: "Đã xác nhận", tone: "ok" });
  assert.deepEqual(myJobChip("confirmed", true), { label: "Đã đi tour", tone: "muted" });
});

test("sortMyJobs: đơn chưa đi (kể cả nháp) lên trước theo ngày gần nhất, chưa có ngày cuối nhóm; đơn đã đi tour xuống cuối, mới nhất trước", () => {
  const list = [
    { orderCode: "A", status: "confirmed" as const, departDate: "2026-09-25", departed: true },
    { orderCode: "B", status: "confirmed" as const, departDate: "2026-10-01", departed: false },
    { orderCode: "C", status: "draft" as const, departDate: "2026-09-30", departed: false },
    { orderCode: "D", status: "confirmed" as const, departDate: "2026-09-20", departed: true },
    { orderCode: "E", status: "draft" as const, departDate: null, departed: false },
    { orderCode: "F", status: "draft" as const, departDate: "2026-09-26", departed: true },
  ];
  assert.deepEqual(sortMyJobs(list).map((x) => x.orderCode), ["F", "C", "B", "E", "A", "D"]);
  assert.deepEqual(list.map((x) => x.orderCode), ["A", "B", "C", "D", "E", "F"], "không đổi mảng gốc");
});

test("telHref: bỏ dấu cách/chấm/gạch, giữ dấu + đầu số quốc tế", () => {
  assert.equal(telHref("0903 222 333"), "tel:0903222333");
  assert.equal(telHref("0905.214-887"), "tel:0905214887");
  assert.equal(telHref("+84 905 214 887"), "tel:+84905214887");
});

test("EDIT_REASON_QUICK: đúng ba chữ gợi ý (cùng bộ chữ ADR-0030 S23-9, bỏ 'Khác' vì ô vẫn là chữ tự do)", () => {
  assert.deepEqual([...EDIT_REASON_QUICK], ["Khách thêm người", "Khách bớt người", "Đổi dịch vụ"]);
});

test("moneyEditServices: thân gửi máy chủ liệt kê ĐỦ mọi dịch vụ danh mục (kể cả dịch vụ không sửa được loại nào), bỏ dịch vụ nhập tay; chỉ loại khách sửa được mới lấy số mới", () => {
  const services = [
    { id: "s1", catalogCode: "ZA1", pax: pax(2, 1), editablePaxCodes: ["adult" as const] },
    { id: "s2", catalogCode: null, pax: pax(3), editablePaxCodes: [] },
    { id: "s3", catalogCode: "ZB2", pax: pax(4), editablePaxCodes: [] },
  ];
  const draft = new Map([["s1", { adult: 5, child: 9 }], ["s2", { adult: 7 }]]);
  assert.deepEqual(moneyEditServices(services, draft), [
    { id: "s1", pax: pax(5, 1) },
    { id: "s3", pax: pax(4) },
  ]);
  assert.deepEqual(moneyEditServices(services, new Map()), [
    { id: "s1", pax: pax(2, 1) },
    { id: "s3", pax: pax(4) },
  ], "không sửa gì → gửi y nguyên số đang có");
});
