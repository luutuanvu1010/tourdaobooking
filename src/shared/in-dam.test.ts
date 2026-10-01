import assert from "node:assert/strict";
import { test } from "node:test";
import { tachInDam } from "./in-dam.ts";

test("tachInDam: cặp ** khép kín trên một dòng ⇒ đoạn đậm; chữ còn lại giữ nguyên", () => {
  assert.deepEqual(tachInDam("Bấm **Lưu thông tin** để lưu."), [
    { chu: "Bấm ", dam: false }, { chu: "Lưu thông tin", dam: true }, { chu: " để lưu.", dam: false },
  ]);
  assert.deepEqual(tachInDam("**Danh bạ › Hồ sơ mới**"), [{ chu: "Danh bạ › Hồ sơ mới", dam: true }]);
  assert.deepEqual(tachInDam("vào **A** rồi **B**"), [
    { chu: "vào ", dam: false }, { chu: "A", dam: true }, { chu: " rồi ", dam: false }, { chu: "B", dam: true },
  ]);
});

test("tachInDam: không có ** ⇒ một đoạn thường; chuỗi rỗng ⇒ danh sách rỗng; xuống dòng giữ nguyên", () => {
  assert.deepEqual(tachInDam("Làm thế này."), [{ chu: "Làm thế này.", dam: false }]);
  assert.deepEqual(tachInDam(""), []);
  assert.deepEqual(tachInDam("1. Bấm **Gửi**\n2. Xong"), [
    { chu: "1. Bấm ", dam: false }, { chu: "Gửi", dam: true }, { chu: "\n2. Xong", dam: false },
  ]);
});

test("tachInDam: ** lẻ, chưa đóng, rỗng hoặc đóng ở dòng khác ⇒ hiện nguyên văn, không vỡ câu", () => {
  for (const s of ["Bấm **Lưu", "Bấm Lưu**", "Bấm **** nhé", "Bấm ** ** nhé", "**Lưu\nthông tin**", "a ** b ** c", "***", "**"]) {
    assert.deepEqual(tachInDam(s), [{ chu: s, dam: false }], s);
  }
  // ** lẻ đứng trước một cặp hợp lệ: chỉ cặp hợp lệ được in đậm, ** lẻ giữ nguyên văn.
  assert.deepEqual(tachInDam("Bấm **Lưu và **Gửi** nhé"), [
    { chu: "Bấm **Lưu và ", dam: false }, { chu: "Gửi", dam: true }, { chu: " nhé", dam: false },
  ]);
});

test("tachInDam: không bao giờ sinh HTML — thẻ trong chữ vẫn là chữ", () => {
  const s = "Bấm **<b>Lưu</b>** và <img src=x onerror=1>";
  assert.deepEqual(tachInDam(s), [
    { chu: "Bấm ", dam: false }, { chu: "<b>Lưu</b>", dam: true }, { chu: " và <img src=x onerror=1>", dam: false },
  ]);
});
