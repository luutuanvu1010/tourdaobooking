// Luật thuần «trường ẩn / bắt buộc theo chính sách giao diện» của Tạo đơn (ADR-0194 đợt 1, nhiệm vụ 4). Máy chủ quyết, không tin trình duyệt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { thanKhiAnTruong, thieuBatBuoc, truongTaoDon } from "./an-truong-giao-dien.ts";

const tg = (truong: string, an: boolean, batBuoc: boolean, man = "tao-don") => ({ man, truong, an, batBuoc }) as never;
const luu = { customerEmail: "luu@example.com", customerNote: "ghi chú lưu", paymentNote: "tt lưu" };

test("truongTaoDon: chỉ màn tao-don; tách tập ẩn và tập bắt buộc", () => {
  const r = truongTaoDon([tg("passengers", true, false), tg("customerEmail", false, true), tg("unit", true, false, "danh-sach-dich-vu")]);
  assert.deepEqual([...r.an], ["passengers"]);
  assert.deepEqual([...r.batBuoc], ["customerEmail"]);
});

test("thanKhiAnTruong: không ẩn gì ⇒ trả đúng thân gốc (cùng tham chiếu)", () => {
  const b = { customerName: "A", passengers: [] };
  assert.equal(thanKhiAnTruong(b, new Set(), null), b);
});

test("thanKhiAnTruong LẬP: bỏ khoá passengers; email / ghi chú / ghi chú thanh toán ẩn ⇒ rỗng; GIỮ mọi khoá khác; không sửa thân gốc", () => {
  const goc = { customerName: "A", customerPhone: "0900000001", customerEmail: "a@b.c", customerNote: "n", paymentNote: "p", passengers: [{ fullName: "X" }], services: [1] };
  const copy = JSON.parse(JSON.stringify(goc));
  const r = thanKhiAnTruong(goc, new Set(["passengers", "customerEmail", "customerNote", "paymentNote"]), null) as Record<string, unknown>;
  assert.equal("passengers" in r, false);
  assert.equal(r.customerEmail, ""); assert.equal(r.customerNote, ""); assert.equal(r.paymentNote, "");
  assert.equal(r.customerName, "A"); assert.deepEqual(r.services, [1]);
  assert.deepEqual(goc, copy);
});

test("thanKhiAnTruong SỬA nháp: trường ẩn GIỮ giá trị đang lưu (không bị ghi đè bằng rỗng hay giá trị trình duyệt gửi)", () => {
  const r = thanKhiAnTruong({ customerEmail: "gia@x.y", customerNote: "giả", paymentNote: "giả", passengers: [] }, new Set(["customerEmail", "paymentNote", "passengers"]), luu) as Record<string, unknown>;
  assert.equal(r.customerEmail, "luu@example.com");
  assert.equal(r.paymentNote, "tt lưu");
  assert.equal(r.customerNote, "giả", "không ẩn ⇒ giữ nguyên giá trị gửi");
  assert.equal("passengers" in r, false);
});

test("thanKhiAnTruong: thân không phải đối tượng ⇒ trả nguyên để validateOrder báo lỗi như hôm nay", () => {
  for (const x of [null, "x", 5, [1]]) assert.equal(thanKhiAnTruong(x, new Set(["passengers"]), null), x);
});

const v = (o: Record<string, unknown> = {}) => ({ customerEmail: null, customerNote: null, paymentNote: null, passengers: null, ...o }) as never;
test("thieuBatBuoc: không bắt buộc gì ⇒ null", () => assert.equal(thieuBatBuoc(v(), new Set(), null), null));
test("thieuBatBuoc: email / ghi chú / ghi chú thanh toán rỗng hoặc toàn khoảng trắng ⇒ câu tiếng Việt nêu đúng tên ô", () => {
  assert.match(thieuBatBuoc(v(), new Set(["customerEmail"]), null) ?? "", /Email khách/);
  assert.match(thieuBatBuoc(v({ customerEmail: "   " }), new Set(["customerEmail"]), null) ?? "", /Email khách/);
  assert.match(thieuBatBuoc(v(), new Set(["customerNote"]), null) ?? "", /Ghi chú khách/);
  assert.match(thieuBatBuoc(v(), new Set(["paymentNote"]), null) ?? "", /Ghi chú thanh toán/);
  assert.equal(thieuBatBuoc(v({ customerEmail: "a@b.c" }), new Set(["customerEmail"]), null), null);
});
test("thieuBatBuoc passengers: có danh sách ⇒ đạt; danh sách rỗng ⇒ thiếu; khoá vắng (null) ⇒ theo số khách đang lưu (sửa nháp) hoặc thiếu (lập)", () => {
  const b = new Set(["passengers"]);
  assert.equal(thieuBatBuoc(v({ passengers: [{}] }), b, null), null);
  assert.match(thieuBatBuoc(v({ passengers: [] }), b, null) ?? "", /Danh sách khách/);
  assert.match(thieuBatBuoc(v({ passengers: null }), b, null) ?? "", /Danh sách khách/, "lập: không có khoá = thiếu");
  assert.equal(thieuBatBuoc(v({ passengers: null }), b, 2), null, "sửa nháp: đang lưu 2 khách");
  assert.match(thieuBatBuoc(v({ passengers: null }), b, 0) ?? "", /Danh sách khách/);
});
