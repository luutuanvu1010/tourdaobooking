import { test } from "node:test";
import assert from "node:assert/strict";
import { hetHan, ketNoiQuaHan, docHanGiay, kiemOrigin } from "./rules.ts";

test("hetHan: mốc hết hạn = bây giờ + hạn giây (đổi ra mili-giây)", () => {
  assert.equal(hetHan(1_000_000, 900), 1_000_000 + 900_000);
  assert.equal(hetHan(0, 5), 5000);
});

test("ketNoiQuaHan: lọc đúng phần tử đã tới hoặc quá mốc hết hạn (nửa mở, đúng mốc = quá hạn)", () => {
  const danhSach = [
    { id: "a", hetHan: 1000 },
    { id: "b", hetHan: 2000 },
    { id: "c", hetHan: 3000 },
  ];
  assert.deepEqual(ketNoiQuaHan(danhSach, 2000).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(ketNoiQuaHan(danhSach, 999).map((x) => x.id), []);
  assert.deepEqual(ketNoiQuaHan(danhSach, 3000).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(ketNoiQuaHan([], 999999), []);
});

test("docHanGiay: mặc định 900 khi vắng hoặc không phải số nguyên dương", () => {
  assert.equal(docHanGiay({}), 900);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: undefined }), 900);
  for (const raw of ["", "abc", "0", "-5", "10.5", "NaN", " ", "Infinity"]) {
    assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: raw }), 900, raw);
  }
});

test("docHanGiay: giới hạn [5, 3600] khi số nguyên dương hợp lệ nằm ngoài khoảng", () => {
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "1" }), 5);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "4" }), 5);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "5" }), 5);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "20" }), 20);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "3600" }), 3600);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "3601" }), 3600);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "999999" }), 3600);
});

test("kiemOrigin: true chỉ khi có header Origin và khớp đúng origin của url", () => {
  const url = new URL("https://booking.tourdao.vn/api/bang-tin");
  const cungOrigin = new Request(url, { headers: { Origin: "https://booking.tourdao.vn" } });
  assert.equal(kiemOrigin(cungOrigin, url), true);

  const khac = new Request(url, { headers: { Origin: "https://khac.tourdao.vn" } });
  assert.equal(kiemOrigin(khac, url), false);

  const vang = new Request(url);
  assert.equal(kiemOrigin(vang, url), false);
});

test("kiemOrigin: không dựa vào sec-fetch-site — Origin vắng vẫn từ chối dù sec-fetch-site same-origin", () => {
  const url = new URL("https://booking.tourdao.vn/api/bang-tin");
  const req = new Request(url, { headers: { "sec-fetch-site": "same-origin" } });
  assert.equal(kiemOrigin(req, url), false);
});
