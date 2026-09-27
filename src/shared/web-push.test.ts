import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemDiaChi } from "./web-push.ts";

test("kiemDiaChi: nhận địa chỉ thật của các dịch vụ đẩy", () => {
  assert.equal(kiemDiaChi("https://fcm.googleapis.com/fcm/send/abc123"), true);
  assert.equal(kiemDiaChi("https://web.push.apple.com/QAAAA"), true);
  assert.equal(kiemDiaChi("https://wns2-abc.notify.windows.com/w/?token=x"), true);
  assert.equal(kiemDiaChi("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
});

test("kiemDiaChi: từ chối giao thức không phải https", () => {
  assert.equal(kiemDiaChi("http://fcm.googleapis.com/fcm/send/abc"), false);
});

test("kiemDiaChi: từ chối host không thuộc danh sách dịch vụ đẩy", () => {
  assert.equal(kiemDiaChi("https://example.com/x"), false);
});

test("kiemDiaChi: từ chối host giả trang bằng subdomain lồng (evil.push.apple.com.example.com)", () => {
  assert.equal(kiemDiaChi("https://evil.push.apple.com.example.com/x"), false);
});

test("kiemDiaChi: từ chối mẹo userinfo (host thật nằm sau @)", () => {
  assert.equal(kiemDiaChi("https://fcm.googleapis.com@evil.com/x"), false);
});

test("kiemDiaChi: từ chối chuỗi dài hơn 1024 ký tự", () => {
  assert.equal(kiemDiaChi(`https://fcm.googleapis.com/${"a".repeat(1020)}`), false);
});

test("kiemDiaChi: từ chối đầu vào không phải chuỗi, không ném lỗi", () => {
  assert.equal(kiemDiaChi(undefined), false);
  assert.equal(kiemDiaChi(null), false);
  assert.equal(kiemDiaChi(123), false);
  assert.equal(kiemDiaChi({}), false);
});

test("kiemDiaChi: từ chối chuỗi không phải URL hợp lệ, không ném lỗi", () => {
  assert.equal(kiemDiaChi("không phải url"), false);
  assert.equal(kiemDiaChi(""), false);
});
