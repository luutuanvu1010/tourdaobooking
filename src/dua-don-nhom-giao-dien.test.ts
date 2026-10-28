// Nối dây GIAO DIỆN của ADR-0118 (Đợt 2 lượt 1, Task 5; kế hoạch N-17…N-20): lưới VĂN BẢN rẻ cho phần web không chạy được trong node:test —
// hành vi thuần do src/shared/chon-nhanh.test.ts canh, cổng thật do src/modules/orders/dua-don-nhom-tat.test.ts canh; bài này bắt "mất dây" (xoá nhầm một lời gọi) và luật giao diện chung
// (không innerHTML, chữ tiếng Việt có dấu, giá trị CSS đi vào token). Chạy Chrome thật là việc của kịch bản riêng (CHƯA chạy ở lượt này nếu báo cáo ghi vậy).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url).pathname;
const doc = (rel: string): string => readFileSync(`${ROOT}${rel}`, "utf8");
/** Bỏ chú thích để lời giải thích không làm đỏ oan / xanh oan. */
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

const WEB = ["web/order-form.ts", "web/khoi-dua-don.ts", "web/service-card.ts", "web/catalog.ts", "web/locations.ts"] as const;

test("web: các tệp chạm ADR-0118 không dùng innerHTML (dựng bằng h())", () => {
  for (const f of WEB) assert.doesNotMatch(boChuThich(doc(f)), /innerHTML|outerHTML|insertAdjacentHTML/, f);
});

test("N-17: khối Đưa đón dựng hàng nút «Chọn nhanh» bằng luật thuần (apChonNhanh / oChonNhanhCuaChang) dưới đúng ô; form truyền điểm đã lọc (diemChonNhanh) và bảng Sửa đưa đón thì không", () => {
  const kd = boChuThich(doc("web/khoi-dua-don.ts"));
  assert.match(kd, /apChonNhanh\(legs, i, d\.id\)/);
  assert.match(kd, /oChonNhanhCuaChang\(l\) !== loai/);
  // Màn Tạo đơn thiết kế lại 18/10: nơi đón / nơi trả của form là MỘT ô có gợi ý (`cotNoiMotO`) — hàng nút nằm trong cột đó, cho CẢ hai ô (dựng lại trên main 28/10).
  assert.match(kd, /function cotNoiMotO[\s\S]*?hangChonNhanh\(l, i, loai\)[\s\S]*?\n  \}\n/, "cột nơi một ô của form mang hàng nút chọn nhanh");
  assert.match(kd, /cotNoiMotO\(l, i, "don"/);
  assert.match(kd, /cotNoiMotO\(l, i, "tra"/);
  assert.match(kd, /"data-action": "chon-nhanh"/);
  assert.match(kd, /"Chọn nhanh nơi trả"/);
  assert.match(kd, /"Chọn nhanh nơi đón"/);
  const of = boChuThich(doc("web/order-form.ts"));
  assert.match(of, /diemNhanh = viTri\.nhanh/);
  assert.match(of, /nhanh: diemChonNhanh\(r\.locations\)/);
  assert.match(of, /diemNhanh: \(\) => diemNhanh/);
  const sheet = boChuThich(doc("web/sheet-dua-don.ts"));
  assert.doesNotMatch(sheet, /diemNhanh/, "bảng «Sửa đưa đón» của trang đơn không có hàng nút (ADR Đ5: form Tạo đơn)");
});

test("N-19: nhóm tắt đưa đón — form ẩn khối, không tạo chặng sẵn, bỏ chặng của nháp cũ và sau 409 transfer_disabled; thẻ tự ẩn/hiện theo cờ", () => {
  const of = boChuThich(doc("web/order-form.ts"));
  assert.match(of, /for \(const c of res\.items\) choDuaDon\.set\(c\.code, c\.transferEnabled\)/);
  assert.match(of, /const tatDuaDon = choDuaDon\.get\(item\.code\) === false;/);
  assert.match(of, /tatDuaDon \? \{ legs: \[\] as ChangNhap\[\], taoSan: null \}/);
  // Một hàm cho nháp nạp lại và cho sau 409: bỏ chặng + «Không đón» (Ruling R-M, ghép ADR-0118 với ADR-0134 — 28/10).
  assert.match(of, /function theoNhomDuaDon\(d: ServiceDraft\)[\s\S]*?boChangKhiTatDuaDon\(d\.legs, false\)[\s\S]*?pickupChoice: chonDonTheoNhom\(false, d\.pickupChoice\)/);
  assert.match(of, /const nap = theoNhomDuaDon\(draftFromDto\(s, live, newKey\(\)\)\)/, "nạp nháp đi qua theoNhomDuaDon");
  assert.match(of, /const nap = theoNhomDuaDon\(en\.draft\)/, "sau 409 transfer_disabled đi qua theoNhomDuaDon");
  assert.match(of, /pickupChoice: chonDonTheoNhom\(!tatDuaDon, chonDonGoiY\(tao\.legs\.length\)\)/, "thêm dịch vụ nhóm tắt → «Không đón»");
  assert.match(of, /toServiceInput\(\{ \.\.\.e\.draft, pickupChoice: chonDonTheoNhom\(coDuaDon\(e\.draft\), e\.draft\.pickupChoice\) \}, suaSoVe\)/, "gói gửi máy chủ: dịch vụ nhóm tắt luôn «Không đón»");
  assert.match(of, /coDuaDon: \(\) => coDuaDon\(entry\.draft\)/);
  assert.match(of, /err\.code === "transfer_disabled" \? await boChangNhomVuaTat\(\)/);
  const sc = boChuThich(doc("web/service-card.ts"));
  assert.equal([...sc.matchAll(/duaDon\.root\.hidden = o\.duaDon\.coDuaDon\?\.\(\) === false/g)].length, 2, "ẩn lúc dựng và lúc update");
});

test("N-20: màn Danh mục có công tắc «Có đưa đón» gửi transferEnabled; màn Địa điểm có cột / ô «Chọn nhanh» luôn gửi quickPickOrder qua docChonNhanh", () => {
  const cat = boChuThich(doc("web/catalog.ts"));
  assert.match(cat, /"Có đưa đón"/);
  assert.match(cat, /doiNhom\(g, \{ transferEnabled: !g\.transferEnabled \}\)/);
  assert.match(cat, /role: "switch"/);
  const loc = boChuThich(doc("web/locations.ts"));
  assert.match(loc, /docChonNhanh\(nhanh\.value\)/);
  assert.match(loc, /quickPickOrder: q\.value/);
  assert.match(loc, /"Chọn nhanh \(1–99\)"/);
  assert.match(doc("public/locations.html"), /<th>Chọn nhanh<\/th>/);
});

test("giao diện ADR-0118: CSS mới chỉ dùng token (không màu thập lục / px trần trong khối .dd-nhanh, .nhom-dua-don); chữ mới có dấu tiếng Việt", () => {
  const css = doc("public/app.css").split("\n").filter((l) => /^\.(dd-nhanh|nhom-dua-don)/.test(l));
  assert.ok(css.length >= 4, `thấy ${css.length} dòng CSS mới`);
  for (const l of css) {
    assert.doesNotMatch(l, /#[0-9a-fA-F]{3,8}\b/, l);
    assert.doesNotMatch(l, /:\s*\d+(\.\d+)?px/, l);
  }
  const chu = [doc("web/khoi-dua-don.ts"), doc("web/catalog.ts"), doc("web/locations.ts"), doc("src/shared/chon-nhanh.ts")].join("\n");
  for (const cau of ["Chọn nhanh nơi trả", "Có đưa đón", "đã bỏ", "không có đưa đón", "Để trống nếu không cần"]) assert.ok(chu.includes(cau), cau);
  assert.doesNotMatch(chu, /Chon nhanh|Co dua don|Chua phan loai/, "không chữ không dấu lộ ra người dùng");
});
