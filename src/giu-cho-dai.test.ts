// Bước 1 khung chung (N10, 13/11/2026): dải đầu trang chèn muộn (tin quan trọng, nhắc bảo mật) từng đẩy cả trang xuống 53–61 px ở mọi trang — nhảy bố cục.
// Cách chữa: tệp đầu trang web/giu-cho-dai.ts (chạy đồng bộ trong <head>, trước lần vẽ đầu) nhớ CHIỀU CAO + TÊN LOẠI dải lần trước trong thẻ (sessionStorage),
// đặt `--dai-giu` + `data-giu-dai`; CSS giữ chỗ cho `#strips` viết sẵn trong HTML; dải về thì thôi giữ, quá hạn chờ thì thả.
// Bài này khoá các mối nối dễ bị sửa nhầm (đọc mã nguồn, không chạy DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KHOA_CAO_DAI } from "./shared/dai-chu.ts";

const doc = (tep: string): string => readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8");

test("mọi trang có khung: tệp giữ chỗ chạy đồng bộ trong <head> (không defer, không module) và #strips viết sẵn ngay sau thanh trên", () => {
  const tep = readdirSync(fileURLToPath(new URL("../public", import.meta.url))).filter((f) => f.endsWith(".html"));
  let n = 0;
  for (const f of tep) {
    const s = doc(`public/${f}`);
    if (!s.includes('<header id="topbar"></header>')) continue;
    n++;
    const head = s.slice(0, s.indexOf("</head>"));
    assert.match(head, /<script src="\/js\/giu-cho-dai\.js"><\/script>/, `${f}: thiếu tệp giữ chỗ dải trong <head>`);
    assert.match(s, /<header id="topbar"><\/header>\n<div id="strips"><\/div>/, `${f}: #strips phải viết sẵn ngay sau thanh trên`);
  }
  assert.ok(n >= 50, `đọc được quá ít trang có khung (${n})`);
});

test("CSS giữ chỗ #strips rỗng theo --dai-giu; trang biểu mẫu không giữ chỗ cho dải bảo mật", () => {
  const css = doc("public/app.css");
  assert.match(css, /html\[data-giu-dai\] #strips:empty \{ min-height: var\(--dai-giu\); \}/);
  assert.match(css, /html\[data-giu-dai="bao-mat"\] body\[data-khuon="bieu-mau"\] #strips:empty \{ min-height: 0; \}/);
});

test("tệp đầu trang tự nhớ (theo dõi #strips) và tự thả chỗ khi dải không về — không cần mã nào trong gói trang", () => {
  const g = doc("web/giu-cho-dai.ts");
  assert.match(g, /new MutationObserver\(nho\)\.observe\(strips, \{ childList: true \}\)/, "nhớ / quên theo #strips");
  assert.match(g, /setTimeout\(\(\) => \{\n\s+if \(!document\.querySelector\("#strips > \.dai"\)\) nho\(\);\n\s+tha\(\);\n\s+\}, CHO_DAI\)/, "quá hạn chờ thì quên và thả");
  assert.match(g, /html\.dataset\.giuDai === "bao-mat" && document\.body\.dataset\.khuon === "bieu-mau"/, "trang biểu mẫu không quên trí nhớ dải bảo mật");
  assert.doesNotMatch(doc("web/shell.ts"), /giuCho|thaGiuCho/, "gói trang không mang mã giữ chỗ dải (trần dung lượng)");
});

test("chỉ nhớ chiều cao + tên loại (không nội dung); trang đăng nhập xoá khoá", () => {
  const g = doc("web/giu-cho-dai.ts");
  assert.match(g, /ss\.setItem\(KHOA_CAO_DAI, `\$\{d\.offsetHeight\}\|\$\{d\.dataset\.loai \?\? ""\}`\)/, "chỉ chiều cao + loại");
  assert.doesNotMatch(g, /textContent|innerText|dai-cau/, "không đọc câu của dải");
  assert.match(g, /ss\.getItem\(KHOA_CAO_DAI\)/);
  assert.match(doc("web/login.ts"), /sessionStorage\.removeItem\(KHOA_CAO_DAI\)/, "người sau trên cùng thẻ không thừa hưởng chỗ giữ");
  assert.equal(KHOA_CAO_DAI, "td_dai_cao");
});

test("khối theo quyền: tệp đầu trang đặt data-giu-khoi theo trang; trang ghi bằng nhoKhoi; giữ chỗ khung biểu mẫu là VÔ HÌNH (không bấm được trước khi mã gắn xử lý)", () => {
  assert.match(doc("web/giu-cho-dai.ts"), /ss\.getItem\(KHOA_KHOI \+ location\.pathname\)/);
  assert.match(doc("web/catalog.ts"), /nhoKhoi\("kv-tu-kiem", can\(staff, "settings\.ops"\)\)/, "cùng điều kiện với khối thật");
  assert.match(doc("web/staff.ts"), /nhoKhoi\("add-card", can\(staff, "account\.create"\)\)/);
  assert.match(doc("web/staff.ts"), /nhoKhoi\("xac-minh", can\(staff, "party\.verify"\)\)/);
  const css = doc("public/app.css");
  assert.match(css, /html\[data-giu-khoi~="add-card"\] \[id="add-card"\]\[hidden\], html\[data-giu-khoi~="xac-minh"\] #xac-minh\[hidden\] \{ display: block !important; visibility: hidden; \}/);
  assert.match(doc("web/login.ts"), /k\.startsWith\(KHOA_KHOI\)\) sessionStorage\.removeItem\(k\)/, "đăng nhập xoá mọi chỗ giữ khối");
});
