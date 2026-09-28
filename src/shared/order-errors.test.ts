import { test } from "node:test";
import assert from "node:assert/strict";
import { NETWORK_BANNER, classifyOrderError } from "./order-errors.ts";

const ctx = { serviceNames: ["Tour 4 đảo Nha Trang", "Phao chuối"], formatMoney: (n: number) => `${n} ₫` };
const e = (status: number, code: string, message = "msg", details?: unknown) => classifyOrderError({ status, code, message, details }, ctx);

test("409 catalog_changed: banner cát, mỗi thay đổi một dòng 'Tên · Loại: cũ → mới', tải lại danh mục, giữ đơn giá đã thương lượng", () => {
  const b = e(409, "catalog_changed", "x", { changes: [{ serviceIndex: 0, catalogCode: "TD101", pax: "adult", seen: 1350000, current: 1400000 }, { serviceIndex: 1, catalogCode: "TTB03", pax: "adult", seen: 1500000, current: 1600000 }] });
  assert.equal(b.tone, "warning");
  assert.equal(b.title, "Giá danh mục vừa đổi. Đã cập nhật giá mới — bạn xem lại rồi lưu.");
  assert.deepEqual(b.lines.map((l) => l.text), ["Tour 4 đảo Nha Trang · Người lớn: 1350000 ₫ → 1400000 ₫", "Phao chuối · Người lớn: 1500000 ₫ → 1600000 ₫"]);
  assert.deepEqual([b.refreshCatalog, b.action, b.focusService], [true, "none", 0]);
});

test("409 catalog_changed thiếu thân hoặc chỉ số ngoài phạm vi: vẫn ra banner, tên dự phòng 'Dịch vụ n'", () => {
  assert.deepEqual(e(409, "catalog_changed").lines, []);
  assert.deepEqual(e(409, "catalog_changed", "x", { changes: [{ serviceIndex: 5, catalogCode: "X", pax: "child", seen: 1, current: 2 }] }).lines.map((l) => l.text), ["Dịch vụ 6 · Trẻ em: 1 ₫ → 2 ₫"]);
});

test("409 stale: nguy hiểm, nói rõ bản đang gõ sẽ mất, hành động tải lại đơn", () => {
  const b = e(409, "stale");
  assert.deepEqual([b.tone, b.title, b.action], ["danger", "Đơn vừa được người khác sửa. Hãy tải lại để xem bản mới.", "reload_order"]);
  assert.deepEqual(b.lines.map((l) => l.text), ["Tải lại sẽ bỏ các thay đổi bạn đang gõ."]);
});

test("409 client_outdated: thông tin, tải lại trang; 409 not_editable: nguy hiểm, khoá form, dùng lời của máy chủ", () => {
  assert.deepEqual([e(409, "client_outdated").tone, e(409, "client_outdated").title, e(409, "client_outdated").action], ["info", "Trang đã cũ. Hãy tải lại trang.", "reload_page"]);
  const n = e(409, "not_editable", "Chỉ sửa được đơn đang chờ xác nhận.");
  assert.deepEqual([n.tone, n.title, n.action], ["danger", "Chỉ sửa được đơn đang chờ xác nhận.", "lock_form"]);
});

test("409 incomplete_trip: mỗi dịch vụ thiếu một dòng '<tên> — <nhãn>' kèm serviceId cho liên kết 'Sửa'", () => {
  const b = e(409, "incomplete_trip", "x", {
    missing: [
      { serviceId: "s1", name: "Tour 4 đảo Nha Trang", reasons: ["no_date"] },
      { serviceId: "s2", name: "Phao chuối", reasons: ["too_far", "no_guests"] },
    ],
  });
  assert.equal(b.tone, "danger");
  assert.equal(b.title, "Chưa đủ thông tin chuyến để xác nhận đơn.");
  assert.deepEqual(b.lines, [
    { text: "Tour 4 đảo Nha Trang — chưa có ngày khởi hành", serviceId: "s1" },
    { text: "Phao chuối — ngày khởi hành quá xa (trên 365 ngày), chưa có khách", serviceId: "s2" },
  ]);
});

test("400 invalid_input: lời của máy chủ, cuộn tới thẻ n khi thông báo mở đầu bằng 'Dịch vụ n:'", () => {
  const b = e(400, "invalid_input", "Dịch vụ 2: cần ít nhất 1 khách không phải em bé.");
  assert.deepEqual([b.tone, b.title, b.focusService], ["danger", "Dịch vụ 2: cần ít nhất 1 khách không phải em bé.", 1]);
  assert.equal(e(400, "invalid_input", "Tên khách không hợp lệ.").focusService, null);
});

test("400 catalog_unavailable: nêu dịch vụ và gợi ý chọn lại từ danh mục", () => {
  const b = e(400, "catalog_unavailable", "Dịch vụ 1: dịch vụ TD101 không còn trong danh mục — hãy chọn dịch vụ khác hoặc nhập tay.");
  assert.equal(b.tone, "danger");
  assert.equal(b.focusService, 0);
  assert.deepEqual(b.lines.map((l) => l.text), ["Chọn lại dịch vụ này từ danh mục."]);
});

test("400 'Dịch vụ n: không thuộc đơn này' (PUT /trip): đơn vừa được lưu lại ở nơi khác → tải lại đơn, thông báo ngắn", () => {
  const b = e(400, "invalid_input", "Dịch vụ 1: không thuộc đơn này.");
  assert.deepEqual([b.tone, b.title, b.action], ["info", "Đơn vừa được lưu lại ở nơi khác. Đã tải lại đơn — hãy kiểm tra rồi sửa tiếp.", "reload_order"]);
});

test("400 invalid_assignee (lập đơn kèm người phụ trách vừa nghỉ/mất quyền — Task 1.8 phần b): tiêu đề ĐÚNG lời máy chủ, một dòng nói đơn chưa lưu + cách sửa; KHÔNG khoá form, không tải lại, không cuộn tới thẻ dịch vụ", () => {
  const b = e(400, "invalid_assignee", "Nhân viên này đã ngưng hoạt động, không thể giao phụ trách.");
  assert.deepEqual([b.tone, b.title, b.action, b.focusService, b.refreshCatalog], ["danger", "Nhân viên này đã ngưng hoạt động, không thể giao phụ trách.", "none", null, false]);
  assert.deepEqual(b.lines.map((l) => l.text), ["Đơn chưa được lưu. Bỏ chọn hoặc chọn người phụ trách khác rồi bấm Lưu lại."]);
  assert.equal(e(400, "invalid_assignee", "").title, "Có lỗi xảy ra, thử lại sau.", "thiếu lời máy chủ: câu chung");
});

test("403 / 404 / lỗi lạ: lời của máy chủ, nguy hiểm; thiếu lời thì câu chung", () => {
  assert.deepEqual([e(403, "forbidden", "Tài khoản này không được lập đơn.").title, e(403, "forbidden").tone], ["Tài khoản này không được lập đơn.", "danger"]);
  assert.equal(e(404, "not_found", "Không tìm thấy đơn.").title, "Không tìm thấy đơn.");
  assert.equal(e(500, "error", "").title, "Có lỗi xảy ra, thử lại sau.");
});

test("mất mạng: giữ nguyên dữ liệu đã gõ", () => {
  assert.deepEqual([NETWORK_BANNER.tone, NETWORK_BANNER.title, NETWORK_BANNER.action], ["danger", "Không kết nối được máy chủ.", "none"]);
  assert.deepEqual(NETWORK_BANNER.lines.map((l) => l.text), ["Dữ liệu bạn đã nhập vẫn còn — kiểm tra kết nối rồi bấm Lưu lại."]);
});
