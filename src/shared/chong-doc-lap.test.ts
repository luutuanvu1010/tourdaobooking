// Chống đọc lặp ở trang Quét vé (ADR-0175 Đ3, đặc tả §2.5 «vài giây»): cùng mã trong 3 giây TÍNH TỪ LÚC ĐÓNG màn kết quả thì không gửi lại; mốc cố định, hết mốc thì gửi lại.
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

test("camera thấy cùng mã liên tục: mốc 3 giây CỐ ĐỊNH, không trượt — tới mốc thì gửi lại (lỗi treo 21/11, Việc 9)", () => {
  // Sau «Quét tiếp» lúc 5.000, vé A vẫn nằm trước camera, ~4 khung mỗi giây. Trước đây mỗi lần thấy lại dời mốc thêm ⇒ không bao giờ gửi, không báo gì.
  let cuoi = batDauDong(xetDocLap(null, "A", 0).cuoi, 5000);
  const daGui: number[] = [];
  for (let t = 5250; t <= 12_000; t += 250) {
    const r = xetDocLap(cuoi, "A", t);
    if (r.gui) daGui.push(t);
    cuoi = r.cuoi;
  }
  assert.equal(daGui[0], 5000 + CHONG_LAP_MS, "gửi lại đúng lúc hết 3 giây kể từ lúc đóng");
  assert.ok(daGui.length >= 1);
});

test("không gửi thì giữ nguyên dấu cũ (mốc không dời)", () => {
  const cuoi = batDauDong(xetDocLap(null, "A", 0).cuoi, 1000);
  assert.deepEqual(xetDocLap(cuoi, "A", 2500).cuoi, cuoi);
});

test("đóng khi chưa có dấu: giữ null", () => { assert.equal(batDauDong(null, 5), null); });
