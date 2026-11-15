// Chống đọc lặp ở trang Quét vé (ADR-0175 Đ3, đặc tả §2.5): cùng mã trong 3 giây TÍNH TỪ LÚC ĐÓNG màn kết quả thì không gửi lại.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHONG_LAP_MS, batDauDong, xetDocLap } from "./chong-doc-lap.ts";

test("lần đầu, hoặc không có dấu cũ: gửi và ghi dấu", () => {
  const r = xetDocLap(null, "A", 1000);
  assert.equal(r.gui, true);
  assert.deepEqual(r.cuoi, { ma: "A", luc: 1000 });
});

test("cùng mã trong 3 giây sau khi ĐÓNG màn kết quả: không gửi; dù màn kết quả đã hiện hơn 3 giây", () => {
  let cuoi = xetDocLap(null, "A", 1000).cuoi; // đọc lúc 1000, màn kết quả mở rất lâu
  cuoi = batDauDong(cuoi, 20_000); // đóng lúc 20.000
  const r = xetDocLap(cuoi, "A", 20_000 + CHONG_LAP_MS - 1);
  assert.equal(r.gui, false);
});

test("mã khác: gửi ngay, kể cả trong 3 giây", () => {
  const cuoi = batDauDong(xetDocLap(null, "A", 0).cuoi, 100);
  const r = xetDocLap(cuoi, "B", 200);
  assert.equal(r.gui, true);
  assert.deepEqual(r.cuoi, { ma: "B", luc: 200 });
});

test("cùng mã nhưng quá 3 giây kể từ lần thấy cuối: gửi lại", () => {
  const cuoi = batDauDong(xetDocLap(null, "A", 0).cuoi, 100);
  assert.equal(xetDocLap(cuoi, "A", 100 + CHONG_LAP_MS).gui, true);
});

test("camera vẫn thấy cùng mã liên tục thì cửa sổ trượt theo: không gửi lặp", () => {
  let cuoi = xetDocLap(null, "A", 0).cuoi;
  for (let t = 250; t <= 10_000; t += 250) {
    const r = xetDocLap(cuoi, "A", t);
    assert.equal(r.gui, false, `t=${t}`);
    cuoi = r.cuoi;
  }
});

test("đóng khi chưa có dấu: giữ null", () => { assert.equal(batDauDong(null, 5), null); });
