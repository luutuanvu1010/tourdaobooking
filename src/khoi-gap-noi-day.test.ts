// Hàng rào NỐI DÂY của khối gập màn Tạo đơn bốn bước (sau kiểm độc lập 14/10/2026): luật thuần (tự mở khi có dữ liệu, chặng gọn) đã có bài riêng ở src/shared, nhưng phần NỐI chúng vào giao diện
// (gọi mở khối khi nháp có dữ liệu, khi Lưu báo lỗi ở máy khách, khi máy chủ 400) chỉ có kịch bản Chrome `docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/chup-anh.mjs` canh — ngoài `npm test`.
// Bài này là lưới VĂN BẢN rẻ: khẳng định các lời gọi nối dây còn nằm trong mã (bỏ một lời gọi ⇒ đỏ). Nó KHÔNG chứng minh khối thật sự mở trên màn hình — việc đó vẫn do kịch bản Chrome làm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/** Đọc tệp, bỏ chú thích `//` và `/* … *\/` để lời gọi nằm trong chú thích không được tính. */
const mã = (duongDan: string): string =>
  readFileSync(new URL(`../${duongDan}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

const orderForm = mã("web/order-form.ts");
const khoiDuaDon = mã("web/khoi-dua-don.ts");
const khoiGap = mã("web/khoi-gap.ts");
const tripFields = mã("web/trip-fields.ts");
const serviceCard = mã("web/service-card.ts");

const dem = (s: string, mau: RegExp): number => (s.match(new RegExp(mau.source, mau.flags.includes("g") ? mau.flags : `${mau.flags}g`)) ?? []).length;

test("nối dây khối gập (web/order-form.ts): khối khách tự mở khi nháp có email / ghi chú", () => {
  assert.match(orderForm, /customerEmail"\)\.value !== ""\s*\|\|\s*field\("customerNote"\)\.value\.trim\(\) !== ""\)\s*gapKhach\.mo\(\)/, "mất lời gọi gapKhach.mo() khi nháp có email / ghi chú");
});

test("nối dây khối gập: Thông tin chuyến của thẻ tự mở khi đã có giá trị; ô ngày khách có mặt hiện khi đã có giá trị", () => {
  assert.match(orderForm, /openTrip:\s*open \?\? coGiaTriChuyen\(d\.trip\)/, "mất luật tự mở Thông tin chuyến khi có giá trị");
  assert.match(tripFields, /canHienNgayCoMat\(trip\.checkinDate\)\s*\|\|\s*moNgay/, "mất luật hiện ô ngày khách có mặt khi đã có giá trị");
  assert.match(serviceCard, /tripDetails\.open = true/, "mất chỗ tự mở Thông tin chuyến khi cuộn tới / lỗi");
});

test("nối dây khối gập: Lưu báo lỗi ở máy khách ⇒ mở khối chứa từng ô lỗi và ô đích (lớp 2 của hai lớp dự phòng)", () => {
  assert.match(orderForm, /for \(const o of invalid\.cacO\) moKhoiChua\(o\)/, "mất lời gọi moKhoiChua cho mọi ô lỗi");
  assert.match(orderForm, /moKhoiChua\(dich\)/, "mất lời gọi moKhoiChua cho ô đích");
});

test("nối dây khối gập: máy chủ từ chối (400) ⇒ mở khối của thẻ nêu tên, hoặc mở hết biểu mẫu khi không chỉ ra ô", () => {
  assert.ok(dem(orderForm, /moMoiKhoiGap\(/) >= 2, "onSaveError phải gọi moMoiKhoiGap ở cả nhánh nêu 'Dịch vụ n' (thẻ) lẫn nhánh chung (cả form)");
  assert.match(orderForm, /if \(the\) moMoiKhoiGap\(the\)/);
  assert.match(orderForm, /moMoiKhoiGap\(formEl\)/);
});

test("nối dây khối gập (web/khoi-dua-don.ts): chặng gọn / chi tiết tự mở khi có giá trị và khi lỗi (lớp 1 của hai lớp dự phòng)", () => {
  assert.match(khoiDuaDon, /changNenGon\(l, i \+ 1, o\.soKhach\(\), o\.ngayDi\(\), coOSoHieu\(l, laSanBay\)\)\) moChang\.add\(l\.key\)/, "mất luật quyết chặng gọn / mở lúc dựng");
  assert.match(khoiDuaDon, /chiTietChangCoGiaTri\(l\)\) moChiTiet\.add\(l\.key\)/, "mất luật tự mở Thêm chi tiết khi có xe riêng / số chỗ");
  assert.match(khoiDuaDon, /r\?\.gapChang\?\.mo\(\)/, "mất lời gọi mở chặng gọn khi chặng có lỗi");
  assert.match(khoiDuaDon, /r\?\.gapChiTiet\?\.mo\(\)/, "mất lời gọi mở Thêm chi tiết khi ô trong đó có lỗi");
});

test("nối dây thẻ dịch vụ gập (18/10/2026): thân thẻ đăng ký khối gập; thẻ có lỗi chặn Lưu không gập được; nháp nạp lại / thẻ được câu lỗi nêu tên thì mở", () => {
  assert.match(serviceCard, /taoKhoiGap\(\{ ma: `the-\$\{draft\.key\}`, nhan: "", than,/, "thân thẻ không còn đăng ký khối gập (moKhoiChua / moMoiKhoiGap không mở được thẻ gập)");
  assert.match(serviceCard, /else if \(!mustStayOpen\(\)\) gap\.dong\(\)/, "setOpen(false) không còn từ chối gập thẻ có lỗi chặn Lưu");
  assert.match(serviceCard, /if \(mustStayOpen\(\) && !gap\.laMo\(\)\) gap\.mo\(\)/, "lỗi chặn Lưu vừa hiện mà thẻ gập không tự mở");
  assert.match(orderForm, /theMoKhiNap\(d, orderDate, laSanBay\)/, "nháp nạp lại không còn hỏi luật mở thẻ (có lỗi / giá trị dòng gập không cho thấy)");
  assert.match(orderForm, /entries\[failure\.focusService\]\?\.card\.setOpen\(true\)/, "máy chủ nêu 'Dịch vụ n' mà thẻ gập không mở");
});

test("nối dây khối gập (web/khoi-gap.ts): moKhoiChua và moMoiKhoiGap thật sự gọi mo() của khối đã đăng ký", () => {
  assert.match(khoiGap, /dangKy\.get\(n\)\?\.mo\(\)/, "moKhoiChua / moMoiKhoiGap không còn mở khối");
  assert.ok(dem(khoiGap, /dangKy\.get\(n\)\?\.mo\(\)/) >= 2, "cả hai hàm phải mở khối đã đăng ký");
  assert.match(khoiGap, /\.open = true/, "hai hàm cũng phải mở <details> đóng");
});
