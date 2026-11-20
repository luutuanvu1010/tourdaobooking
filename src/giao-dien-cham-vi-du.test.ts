// Bài kiểm máy chấm bộ ví dụ thử (scripts/giao-dien/cham-vi-du.mjs): đọc dòng PHÁT HIỆN của người chấm và đối chiếu với ca mong đợi.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error tệp .mjs không có kiểu
import { docPhatHien, chamCa } from "../scripts/giao-dien/cham-vi-du.mjs";

const dong = (ma: string, muc: string, cho = "thanh bước", thay = "hai ô cùng hỏi tên khách", vi = "vi phạm S1") =>
  `PHÁT HIỆN | ${ma} | ${muc} | SALES:/order-form @390 | SALES-order-form-390-man-1-y0.jpg | ${cho} | ${thay} | ${vi} | sửa đi`;
const caCay = { ma: "ca-01", nhom: "cay", mongDoi: { ma: ["S1", "S3"], tuKhoa: ["tên khách"] } };

test("docPhatHien: đọc đúng dòng mẫu 9 ô", () => {
  const r = docPhatHien(`Tiêu đề\n${dong("S1", "Nặng")}\nchữ khác`);
  assert.equal(r.dongSaiKhuon, 0);
  assert.equal(r.phatHien.length, 1);
  const p = r.phatHien[0];
  assert.deepEqual(p.ma, ["S1"]);
  assert.equal(p.muc, "Nặng");
  assert.equal(p.o, "SALES:/order-form @390");
  assert.equal(p.anh, "SALES-order-form-390-man-1-y0.jpg");
});

test("docPhatHien: ô mã gộp tách theo dấu phẩy hoặc khoảng trắng", () => {
  assert.deepEqual(docPhatHien(dong("S4, S8", "Nhỏ (gộp)")).phatHien[0].ma, ["S4", "S8"]);
  assert.deepEqual(docPhatHien(dong("S4 S8 T4", "Nhỏ")).phatHien[0].ma, ["S4", "S8", "T4"]);
});

test("docPhatHien: mức chuẩn hoá theo phần đầu, không phân biệt hoa thường; phần sau bỏ qua", () => {
  assert.equal(docPhatHien(dong("S8", "Nhỏ (gộp)")).phatHien[0].muc, "Nhỏ");
  assert.equal(docPhatHien(dong("S8", "nặng")).phatHien[0].muc, "Nặng");
  assert.equal(docPhatHien(dong("S8", "CHẶN VIỆC")).phatHien[0].muc, "Chặn việc");
  const hai = docPhatHien(dong("S8", "Quan trọng"));
  assert.equal(hai.phatHien.length, 0);
  assert.equal(hai.dongSaiKhuon, 1);
});

test("docPhatHien: dòng gộp nhiều ảnh, nhiều khổ vẫn hợp lệ", () => {
  const l = "PHÁT HIỆN | S8 | Nhỏ (gộp) | SALES:/order @390 và @1280 | a.jpg; b.jpg | x | y | z | w";
  const r = docPhatHien(l);
  assert.equal(r.dongSaiKhuon, 0);
  assert.equal(r.phatHien[0].anh, "a.jpg; b.jpg");
});

test("docPhatHien: dòng sai khuôn bị đếm, không nuốt im lặng", () => {
  const thieuO = "PHÁT HIỆN | S1 | Nặng | SALES:/order-form @390 | a.jpg | chỗ | thấy | vì sao"; // 8 ô
  const maSai = dong("X9", "Nặng");
  const r = docPhatHien([thieuO, maSai, dong("S1", "Nặng")].join("\n"));
  assert.equal(r.dongSaiKhuon, 2);
  assert.equal(r.phatHien.length, 1);
});

test("chamCa: đúng mã, đúng từ khoá ⇒ bắt được, bằng mã chính", () => {
  const r = chamCa(caCay, docPhatHien(dong("S1", "Nặng")).phatHien);
  assert.equal(r.bat, true);
  assert.equal(r.batBangMaChinh, true);
});

test("chamCa: mã sai thì không bắt", () => {
  assert.equal(chamCa(caCay, docPhatHien(dong("S9", "Nặng")).phatHien).bat, false);
});

test("chamCa: đúng mã mà thiếu từ khoá thì không bắt", () => {
  assert.equal(chamCa(caCay, docPhatHien(dong("S1", "Nặng", "ô số điện thoại", "số điện thoại lặp", "lặp")).phatHien).bat, false);
});

test("chamCa: mã thay thế thì bắt nhưng batBangMaChinh là sai", () => {
  const r = chamCa(caCay, docPhatHien(dong("S3", "Nặng")).phatHien);
  assert.equal(r.bat, true);
  assert.equal(r.batBangMaChinh, false);
});

test("docPhatHien: dòng từ hai mã trở lên đánh dấu gop, đếm soDongGop; dòng một mã thì không", () => {
  const r = docPhatHien([dong("S4, S8", "Nhỏ (gộp)"), dong("S1", "Nặng")].join("\n"));
  assert.equal(r.dongSaiKhuon, 0);
  assert.equal(r.soDongGop, 1);
  assert.equal(r.phatHien[0].gop, true);
  assert.equal(r.phatHien[1].gop, false);
});

test("chamCa: ca chỉ có dòng gộp chứa mã đúng và từ khoá đúng ⇒ KHÔNG bắt; thêm dòng một mã ⇒ bắt", () => {
  const gop = docPhatHien(dong("S8, S1", "Nhỏ (gộp)")).phatHien;
  const chiGop = chamCa(caCay, gop);
  assert.equal(chiGop.bat, false);
  assert.equal(chiGop.batBangMaChinh, false);
  assert.deepEqual(chiGop.maNeu, ["S8", "S1"]);
  const them = chamCa(caCay, [...gop, ...docPhatHien(dong("S1", "Nặng")).phatHien]);
  assert.equal(them.bat, true);
  assert.equal(them.batBangMaChinh, true);
  assert.equal(them.khop.length, 1);
});

test("chamCa: từ khoá so không phân biệt hoa thường", () => {
  assert.equal(chamCa(caCay, docPhatHien(dong("S1", "Nặng", "Ô TÊN KHÁCH", "x", "y")).phatHien).bat, true);
});

test("chamCa: ca không cấy chỉ liệt kê Nặng và Chặn việc", () => {
  const ca = { ma: "ca-17", nhom: "khong-cay", mongDoi: null };
  const ph = docPhatHien([dong("S1", "Nhỏ"), dong("S2", "Nặng"), dong("S3", "Chặn việc"), dong("S4", "Nhỏ (gộp)")].join("\n")).phatHien;
  const r = chamCa(ca, ph);
  assert.equal(r.nang.length, 2);
  assert.deepEqual(r.nang.map((p: { ma: string[] }) => p.ma[0]).sort(), ["S2", "S3"]);
});
