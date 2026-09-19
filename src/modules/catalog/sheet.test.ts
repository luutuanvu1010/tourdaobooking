import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCatalogSheet } from "./sheet.ts";

const HEADER = "Mã tour,Tên tour,Khoá giá,Đường dẫn,Đơn vị,Giá người lớn,Giá trẻ em,Ghi chú trẻ em,Giá người cao tuổi,Ghi chú người cao tuổi,Giá em bé,Ghi chú em bé,Ghi chú nội bộ";
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");

test("đọc dòng thật, kể cả ô có dấu phẩy trong ngoặc kép", () => {
  const r = parseCatalogSheet(
    csv(
      'TD101,Tour 3 đảo Hòn Mun: Hòn Mun - Làng Chài,tour-3-dao,duong-dan,perPax,850000,595000,"Trẻ em cao từ 1 m đến 1,4 mét",850000,Người cao tuổi >= 60 tuổi,0,"Luôn miễn phí, chiều cao dưới 1 mét",',
      'TD208,"Vé Vinwonders tiêu chuẩn + Buffet 350,000 VNĐ",k,d,perPax,1190000,855000,"Trẻ em cao từ 1 m đến 1,4 mét",1000000,,0,,',
      "TTB03,Phao chuối,phao-chuoi,phao-chuoi,per5Pax,1000000,,,,,,,",
    ),
  );
  assert.ok(r.ok);
  assert.equal(r.problems.length, 0);
  assert.deepEqual(r.items.map((i) => i.code), ["TD101", "TD208", "TTB03"]);
  const a = r.items[0]!;
  assert.deepEqual(a.prices, { adult: 850000, child: 595000, senior: 850000, infant: 0 }); // em bé 0 ≠ không có giá
  assert.equal(a.notes.child, "Trẻ em cao từ 1 m đến 1,4 mét");
  assert.equal(r.items[1]!.name, "Vé Vinwonders tiêu chuẩn + Buffet 350,000 VNĐ");
  assert.deepEqual(r.items[2]!.prices, { adult: 1000000, child: null, senior: null, infant: null });
  assert.equal(r.items[2]!.unit, "per5Pax");
});

test("KHÔNG mang theo cột booking/nội bộ (Khoá giá, Đường dẫn, Ghi chú nội bộ)", () => {
  const r = parseCatalogSheet(csv("TD112,Tour X,khoa-gia-bi-mat,duong-dan-bi-mat,perPax,855000,585000,,585000,,0,,Kiểm xem có trùng sản phẩm với TD107 không"));
  assert.ok(r.ok);
  const json = JSON.stringify(r.items);
  for (const secret of ["khoa-gia-bi-mat", "duong-dan-bi-mat", "Kiểm xem", "TD107"]) assert.ok(!json.includes(secret), secret);
});

test("dòng lỗi bị bỏ qua và báo rõ; dòng tốt vẫn vào", () => {
  const r = parseCatalogSheet(
    csv(
      "TD1,Tốt,k,d,perPax,100000,,,,,,,",
      ",Thiếu mã,k,d,perPax,1,,,,,,,",
      "TD1,Trùng mã,k,d,perPax,1,,,,,,,",
      "TD2,Giá lớn sai,k,d,perPax,abc,,,,,,,",
      "TD3,Giá lớn có dấu chấm,k,d,perPax,850.000,,,,,,,",
      "TD4,Giá trẻ em sai,k,d,perPax,1,-5,,,,,,",
      "TD5,,k,d,perPax,1,,,,,,,",
      "TD6,Thiếu đơn vị,k,d,,1,,,,,,,",
      "TD 7,Mã có khoảng trắng,k,d,perPax,1,,,,,,,",
      ",,,,,,,,,,,,",
    ),
  );
  assert.ok(r.ok);
  assert.deepEqual(r.items.map((i) => i.code), ["TD1"]);
  assert.equal(r.problems.length, 8);
  assert.match(r.problems.map((p) => p.message).join("\n"), /thiếu Mã tour[\s\S]*trùng Mã tour[\s\S]*Giá người lớn/);
});

test("đơn vị lạ vẫn nhận nhưng cảnh báo", () => {
  const r = parseCatalogSheet(csv("TD9,Lạ,k,d,perGroup,500000,,,,,,,"));
  assert.ok(r.ok);
  assert.equal(r.items.length, 1);
  assert.equal(r.warnings.length, 1);
});

test("thiếu cột bắt buộc", () => {
  const r = parseCatalogSheet("Mã tour,Tên tour\nTD1,A");
  assert.ok(!r.ok);
  assert.deepEqual(r.missing, ["Đơn vị", "Giá người lớn"]);
});
