// Nút lưu trong thẻ (`.dp-cs-actions`) chỉ được giấu ở điện thoại khi thanh nút dính đáy `#cs-bottom` THẬT SỰ đang hiện để thay nó (sửa lỗi 21/11/2026).
// Lỗi cũ: `@media (max-width: 640px) { .dp-cs-actions { display: none; } }` giấu vô điều kiện, trong khi chỉ nhánh Toàn quyền của trang Chính sách điều phối
// bật thanh đáy. Hậu quả ở điện thoại: Quản trị đổi hai số hạn chốt xong không có nút «Lưu hạn chốt» (phát hiện mức Chặn việc của đợt đánh giá 20/11,
// docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md màn 62); thẻ Hạn mức Từ chối của Toàn quyền cũng mất nút «Lưu cài đặt» vì cùng lớp kiểu.
// Bài này khoá: (a) không luật nào giấu `.dp-cs-actions` mà không đòi thanh đáy đang hiện; (b) hai mốc giấu / hiện bù nhau đúng một điểm ảnh;
// (c) `#cs-bottom` là con trực tiếp của vùng nội dung và mặc định ẩn; (d) chỗ nào bật thanh đáy thì chỗ đó đã đặt nút vào thanh.
// Hành vi thật trên trình duyệt: docs/evidence/2026-11-21-sua-hai-loi-bo-cuc/kich-ban/do-hai-loi.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const doc = (duong: string): string => readFileSync(new URL(duong, import.meta.url), "utf8");
// Che chú thích bằng khoảng trắng để dấu ngoặc trong chú thích không làm lệch phép tách luật.
const css = doc("../public/app.css").replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
const html = doc("../public/chinh-sach-dieu-phoi.html");
const trang = doc("../web/chinh-sach-dieu-phoi.ts");

const DIEU_KIEN_THANH_DAY = "#cs-bottom:not([hidden])";

/** Mọi luật lá (bộ chọn + thân khai báo) của tệp kiểu, kèm vị trí. */
const luatLa = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ boChon: m[1]!.trim(), than: m[2]!, viTri: m.index }));
/** Điều kiện `@media` bọc ngoài vị trí `i` (rỗng nếu không có). */
function mediaBao(i: number): string[] {
  const ngan: string[] = [];
  let dau = 0;
  for (let k = 0; k < i; k++) {
    const c = css[k];
    if (c === "{") {
      ngan.push(css.slice(dau, k).trim());
      dau = k + 1;
    } else if (c === "}") {
      ngan.pop();
      dau = k + 1;
    } else if (c === ";") dau = k + 1;
  }
  return ngan.filter((s) => s.startsWith("@media"));
}
const giau = luatLa.filter((l) => l.boChon.includes(".dp-cs-actions") && /(?:^|;)\s*display:\s*none\b/.test(l.than));

test("không luật nào giấu nút lưu trong thẻ mà không đòi thanh nút dính đáy đang hiện", () => {
  assert.ok(luatLa.length > 1000, `chỉ tách được ${luatLa.length} luật: phép tách hỏng`);
  assert.ok(luatLa.some((l) => l.boChon === ".dp-cs-actions"), "không thấy luật gốc `.dp-cs-actions`: lớp đã đổi tên, sửa bài kiểm theo");
  const voDieuKien = giau.filter((l) => !l.boChon.split(",").every((b) => b.includes(DIEU_KIEN_THANH_DAY)));
  assert.deepEqual(voDieuKien.map((l) => `${mediaBao(l.viTri).join(" ")} { ${l.boChon} }`), [], "luật giấu vô điều kiện làm mất nút lưu ở mọi biểu mẫu không có thanh đáy");
});

test("luật giấu chỉ áp cho biểu mẫu chính sách và chỉ ở khổ điện thoại; thanh đáy ẩn đúng từ điểm ảnh kế tiếp", () => {
  assert.equal(giau.length, 1, "phải có đúng một luật giấu nút lưu trong thẻ (lúc thanh đáy thay nó)");
  const l = giau[0]!;
  assert.match(l.boChon, /^main:has\(> #cs-bottom:not\(\[hidden\]\)\) #cs-form \.dp-cs-actions$/);
  assert.deepEqual(mediaBao(l.viTri), ["@media (max-width: 640px)"]);
  assert.match(css, /@media \(min-width: 641px\) \{ \.vc-bottom-bar \{ display: none; \} \}/, "thanh đáy phải ẩn từ 641: lệch mốc thì có khổ không nút nào hoặc hai nút");
});

test("trang Chính sách điều phối: thanh đáy là con trực tiếp của vùng nội dung, mặc định ẩn, cùng vùng với biểu mẫu", () => {
  const main = /<main>([\s\S]*)<\/main>/.exec(html)?.[1] ?? "";
  assert.match(main, /\n  <div id="cs-bottom" class="vc-bottom-bar thanh-hanh-dong-cuoi" hidden><\/div>\n/);
  assert.match(main, /<form id="cs-form" class="khoi"/); // khuôn Thiết lập của khung gốc (đợt D3, 26/11/2026): biểu mẫu là một khối
});

// Thanh đáy là nút lưu của biểu mẫu chính sách. 21/11/2026 nó đứng ngay sau biểu mẫu, TRƯỚC thẻ Hạn mức, để lúc cuộn xuống thẻ Hạn mức thanh không dính đè lên
// nút «Lưu cài đặt» của thẻ (trợ lý chấm giao diện 21/11: hai nút nền đặc cùng một màn, mức Nặng). Từ đợt D3 khung gốc (26/11/2026) «Lưu cài đặt» nằm trong bảng
// trượt sau nút «Sửa» của thẻ, nên thanh về CUỐI vùng nội dung như thanh dính đáy của khung (đứng giữa trang thì lúc dính vẫn giữ chỗ trong dòng chảy: khoảng hở
// 109 px ngoài thang giữa hai khối). Bài này khoá: thanh đứng sau cả biểu mẫu lẫn thẻ Hạn mức, và thẻ Hạn mức không còn nút nền đặc nằm thẳng trên trang.
test("thanh đáy đứng cuối vùng nội dung, sau biểu mẫu chính sách và thẻ Hạn mức; thẻ Hạn mức không có nút chính trên trang", () => {
  const main = /<main>([\s\S]*)<\/main>/.exec(html)?.[1] ?? "";
  const bieuMau = main.indexOf('<div id="cs-layout"');
  const thanhDay = main.indexOf('<div id="cs-bottom"');
  const hanMuc = main.indexOf('<section id="hm-the"');
  assert.ok(bieuMau >= 0 && thanhDay >= 0 && hanMuc >= 0, "trang thiếu một trong ba khối: biểu mẫu chính sách, thanh đáy, thẻ Hạn mức");
  assert.ok(bieuMau < hanMuc && hanMuc < thanhDay, "thứ tự trong trang phải là: biểu mẫu chính sách, thẻ Hạn mức, rồi thanh đáy");
  assert.ok(/<div id="cs-bottom"[^>]*><\/div>\s*$/.test(main), "thanh đáy phải là phần tử cuối của vùng nội dung");
  const the = doc("../web/han-muc-tu-choi-the.ts");
  assert.match(the, /moBangTruot\(\{ title: "Cài đặt hạn mức Từ chối"[^\n]*foot: \[dong, luu\]/, "«Lưu cài đặt» phải nằm ở chân bảng trượt, không thẳng trên thẻ");
});

// Thanh đáy nay có lúc nằm trong trang (đã thôi dính) và trôi ngang qua thanh trên dính của khung. Hai thanh vốn cùng một lớp xếp chồng (`--z-dinh`), phần tử
// đứng sau trong trang vẽ đè lên: đo 21/11 trước khi sửa, điểm giữa thanh trên là nút của thanh đáy. Thanh đáy của trang này phải xếp dưới thanh trên một bậc.
test("thanh đáy xếp dưới thanh trên dính của khung: lúc trôi qua không đè lên tiêu đề trang", () => {
  const l = luatLa.find((x) => x.boChon === "#cs-bottom");
  assert.ok(l, "thiếu luật riêng cho `#cs-bottom`");
  assert.match(l.than, /(?:^|;)\s*z-index:\s*calc\(var\(--z-dinh\) - 1\);/);
  assert.match(css, /#topbar \{ position: sticky; top: 0; z-index: var\(--z-dinh\);/, "thanh trên của khung không còn ở lớp `--z-dinh`: xem lại bậc của thanh đáy");
});

// Nút lưu trong thẻ nằm ở CUỐI thẻ, câu báo «Đã lưu…» nằm ở ĐẦU trang (hoặc đầu thẻ Hạn mức). Ở điện thoại hai chỗ này thường không cùng một màn:
// bấm lưu xong phải đưa câu báo vào tầm nhìn, và câu báo không được chui dưới thanh trên dính (cùng khuôn với dải báo lỗi `#error`).
test("bấm lưu xong, câu báo được đưa vào tầm nhìn: nhánh hai số của Quản trị và thẻ Hạn mức Từ chối", () => {
  const dau = trang.indexOf("async function veMocRieng");
  const het = trang.indexOf("\nasync function main");
  assert.ok(dau > 0 && het > dau, "không tách được hàm veMocRieng: sửa bài kiểm theo");
  const nhanhQuanTri = trang.slice(dau, het);
  const cuon = String.raw`\.scrollIntoView\(\{ block: "nearest" \}\);`;
  assert.match(nhanhQuanTri, new RegExp(String.raw`showError\(okEl, "Đã lưu hạn chốt mới[^"]*"\);\s*okEl` + cuon), "lưu xong: phải cuộn tới câu báo đã lưu");
  assert.match(nhanhQuanTri, new RegExp(String.raw`showError\(errorEl, loiCua\(err\)\);\s*errorEl` + cuon), "máy chủ từ chối: phải cuộn tới dải báo lỗi");
  assert.match(nhanhQuanTri, new RegExp(String.raw`showError\(errorEl, "Chưa đổi gì[^"]*"\);[^}]*errorEl` + cuon), "chưa đổi gì: phải cuộn tới câu nhắc");
  // Thẻ Hạn mức: chỉ biểu mẫu cài đặt xin cuộn (tham số thứ ba); «Đặt lại» từng dòng giữ nguyên chỗ đứng.
  const theHanMuc = doc("../web/han-muc-tu-choi-the.ts");
  assert.match(theHanMuc, new RegExp(String.raw`showError\(box, cau\);\s*if \(cuon\) box` + cuon), "thẻ Hạn mức: phải có nhánh cuộn tới câu báo của thẻ");
  assert.match(theHanMuc, /taiLai\("Đã lưu cài đặt hạn mức[^"]*", false, true\)/, "thẻ Hạn mức: lưu cài đặt xong phải xin cuộn tới câu báo");
  assert.match(theHanMuc, /await taiLai\(`Đã đặt lại cho \$\{r\.soNguoi\} người\.`\);/, "«Đặt lại» không xin cuộn");
});

test("câu báo của trang không chui dưới thanh trên dính khi được cuộn tới", () => {
  const khoangChua = (than: string): string | undefined => /(?:^|;)\s*scroll-margin-top:\s*([^;]+);/.exec(than)?.[1]?.trim();
  // Luật gốc của dải báo lỗi `#error` giữ nguyên văn (bài src/cot-cap-dai-ly-noi-day.test.ts so chữ luật đó); câu báo của trang này có luật riêng, cùng giá trị.
  const cuaLoi = luatLa.find((x) => x.boChon === "#error" && khoangChua(x.than) !== undefined);
  assert.ok(cuaLoi, "không thấy luật chừa chỗ của `#error`");
  const l = luatLa.find((x) => x.boChon.split(",").some((b) => b.trim() === "#cs-ok") && khoangChua(x.than) !== undefined);
  assert.ok(l, "không luật nào chừa chỗ cho thanh trên khi cuộn tới `#cs-ok`");
  assert.equal(khoangChua(l.than), "calc(var(--bar-h) + env(safe-area-inset-top) + var(--s3))");
  assert.equal(khoangChua(l.than), khoangChua(cuaLoi.than), "câu báo đã lưu phải chừa đúng bằng dải báo lỗi `#error`");
  const ds = l.boChon.split(",").map((b) => b.trim());
  for (const bc of ["#cs-ok", "#hm-the .alert"]) assert.ok(ds.includes(bc), `luật chừa chỗ cho thanh trên thiếu «${bc}»`);
});

test("mã trang: bật thanh đáy ở đâu thì đặt nút lưu vào thanh ở đó", () => {
  const bat = trang.split("bottomEl.hidden = false").length - 1;
  const datNut = trang.split("replaceChildren(bottomEl,").length - 1;
  assert.ok(bat >= 1, "không thấy chỗ nào bật thanh đáy: bài kiểm cần xem lại");
  assert.equal(bat, datNut, "số chỗ bật thanh đáy phải bằng số chỗ đặt nút vào thanh");
  for (const doan of trang.split(/\n(?=(?:async )?function )/).filter((d) => d.includes("bottomEl.hidden = false")))
    assert.ok(doan.includes("replaceChildren(bottomEl,"), "một hàm bật thanh đáy mà không đặt nút vào thanh");
});
