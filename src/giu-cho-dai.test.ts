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
  assert.match(doc("web/staff.ts"), /nhoKhoi\("add-card", can\(staff, "account\.view"\) && can\(staff, "account\.create"\)\)/);
  assert.match(doc("web/staff.ts"), /nhoKhoi\("xac-minh", can\(staff, "account\.view"\) && can\(staff, "party\.verify"\)\)/);
  const css = doc("public/app.css");
  assert.match(css, /html\[data-giu-khoi~="add-card"\] \[id="add-card"\]\[hidden\], html\[data-giu-khoi~="xac-minh"\] #xac-minh\[hidden\] \{ display: block !important; visibility: hidden; \}/);
  assert.match(doc("web/login.ts"), /k\.startsWith\(KHOA_KHOI\)\) sessionStorage\.removeItem\(k\)/, "đăng nhập xoá mọi chỗ giữ khối");
});

// Bước 2 lưới bố cục (14/11/2026, nợ chuyển từ bước 1 — chủ 13/11 «Làm ở bước 2»): thanh bên máy tính dựng muộn từng đẩy vùng nội dung ngang 0 → 248 px ở 70/78 trang
// (docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md, L4). Tệp đầu trang gắn sẵn lớp lưới hai cột khi đã có bản nhớ khung; web/shell.ts không đổi (trần gói).
test("thanh bên máy tính có chỗ từ lần vẽ đầu: tệp đầu trang gắn has-sidebar khi bản nhớ khung hợp lệ, tự gỡ nếu thanh bên không về", () => {
  const g = doc("web/giu-cho-dai.ts");
  assert.match(g, /docKhungNho\(localStorage\.getItem\(KHOA_KHUNG\)\)/, "cùng phép đọc bản nhớ với web/shell.ts — bản nhớ hỏng thì không giữ chỗ");
  assert.match(g, /document\.body\.classList\.add\("has-sidebar"\)/, "gắn lớp lưới ngay khi <body> có mặt");
  assert.match(g, /if \(!document\.getElementById\("sidebar"\)\) document\.body\.classList\.remove\("has-sidebar"\)/, "thanh bên không về thì gỡ cột trống");
  assert.doesNotMatch(doc("web/shell.ts"), /giuBen|giu-ben/, "gói trang không mang mã giữ chỗ thanh bên (trần dung lượng)");
});

// Bộ nhớ bị chặn (22/11/2026): kịch bản chip-nhom-smoke bước 12 cho getItem/setItem/removeItem của Storage ném SecurityError ⇒ «Uncaught SecurityError» ở mọi trang
// (tệp đầu trang chỉ phòng lúc LẤY sessionStorage ném). Safari riêng tư đời cũ thì đọc được nhưng setItem ném QuotaExceeded — trong bộ theo dõi #strips / hẹn giờ.
// Bài này CHẠY THẬT tệp đầu trang trên DOM giả tối thiểu: bộ nhớ hỏng kiểu nào cũng chỉ «không giữ chỗ / không nhớ, như trước», không ném, và chỗ giữ vẫn được thả;
// bộ nhớ dùng được thì hành vi giữ nguyên.
type Kho = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
const chan = (ten: string) => (): never => {
  throw new DOMException("bị chặn", ten);
};
const KHOA_KHOI_TRANG = "td_khoi:/order-form";
let lan = 0;
async function chayDauTrang(kho: Kho) {
  const nghe: Array<() => void> = [];
  const bien: Record<string, string> = {};
  const html = { dataset: {} as Record<string, string>, style: { setProperty: (k: string, v: string) => void (bien[k] = v) } };
  const trang = { dai: null as { offsetHeight: number; dataset: Record<string, string> } | null };
  const g = globalThis as Record<string, unknown>;
  g.document = {
    documentElement: html,
    body: { dataset: {} },
    querySelector: (s: string) => (s === "#strips > .dai" ? trang.dai : null),
    getElementById: (id: string) => (id === "strips" ? {} : null),
  };
  g.location = { pathname: "/order-form" };
  g.MutationObserver = class {
    constructor(f: () => void) {
      nghe.push(f);
    }
    observe(): void {}
    disconnect(): void {}
  };
  g.localStorage = { getItem: chan("SecurityError") }; // không có bản nhớ khung: chỉ còn hai bộ theo dõi của phần dải
  g.sessionStorage = kho;
  await import(`../web/giu-cho-dai.ts?lan=${++lan}`);
  // nghe[0] = bộ chờ #strips xuất hiện; gọi nó thì tệp gắn bộ theo dõi #strips (nho) vào nghe[1].
  const theoDai = (): void => {
    if (nghe.length < 2) nghe[0]!();
    nghe[1]!();
  };
  return { html, bien, trang, theoDai };
}

test("bộ nhớ bị chặn ở lệnh đọc / ghi / xoá (SecurityError): tệp đầu trang không ném, không giữ chỗ", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { html, trang, theoDai } = await chayDauTrang({ getItem: chan("SecurityError"), setItem: chan("SecurityError"), removeItem: chan("SecurityError") });
  assert.equal(html.dataset.giuDai, undefined, "đọc bị chặn ⇒ không giữ chỗ dải");
  assert.equal(html.dataset.giuKhoi, undefined, "đọc bị chặn ⇒ không giữ chỗ khối");
  trang.dai = { offsetHeight: 56, dataset: { loai: "thong-bao" } };
  assert.doesNotThrow(theoDai, "dải về mà ghi bị chặn: không ném");
  trang.dai = null;
  assert.doesNotThrow(theoDai, "hết dải mà xoá bị chặn: không ném");
  assert.doesNotThrow(() => t.mock.timers.tick(8000));
});

test("đọc được nhưng ghi ném (Safari riêng tư đời cũ, QuotaExceeded): dải về thì vẫn thôi giữ chỗ, không ném", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const luu = new Map([[KHOA_CAO_DAI, "56|bao-mat"], [KHOA_KHOI_TRANG, "add-card"]]);
  const { html, bien, trang, theoDai } = await chayDauTrang({ getItem: (k) => luu.get(k) ?? null, setItem: chan("QuotaExceededError"), removeItem: chan("QuotaExceededError") });
  assert.equal(bien["--dai-giu"], "56px");
  assert.equal(html.dataset.giuDai, "bao-mat");
  assert.equal(html.dataset.giuKhoi, "add-card");
  trang.dai = { offsetHeight: 60, dataset: { loai: "bao-mat" } };
  assert.doesNotThrow(theoDai, "ghi bị chặn trong bộ theo dõi #strips: không ném");
  assert.equal(html.dataset.giuDai, undefined, "dải đã về ⇒ thôi giữ chỗ dù không ghi được");
});

test("đọc được nhưng xoá ném: quá hạn chờ mà dải không về thì vẫn thả chỗ, không ném", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const luu = new Map([[KHOA_CAO_DAI, "56|thong-bao"]]);
  const { html } = await chayDauTrang({ getItem: (k) => luu.get(k) ?? null, setItem: chan("QuotaExceededError"), removeItem: chan("SecurityError") });
  assert.equal(html.dataset.giuDai, "thong-bao");
  assert.doesNotThrow(() => t.mock.timers.tick(8000), "hẹn giờ thả chỗ: xoá bị chặn không ném");
  assert.equal(html.dataset.giuDai, undefined, "quá hạn ⇒ thả chỗ");
});

test("bộ nhớ dùng được: giữ chỗ theo lần trước, dải về thì nhớ chiều cao + loại và thôi giữ, hết dải thì quên (hành vi cũ)", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const luu = new Map([[KHOA_CAO_DAI, "60|thong-bao"], [KHOA_KHOI_TRANG, "kv-tu-kiem"]]);
  const kho: Kho = { getItem: (k) => luu.get(k) ?? null, setItem: (k, v) => void luu.set(k, v), removeItem: (k) => void luu.delete(k) };
  const { html, bien, trang, theoDai } = await chayDauTrang(kho);
  assert.equal(bien["--dai-giu"], "60px");
  assert.equal(html.dataset.giuDai, "thong-bao");
  assert.equal(html.dataset.giuKhoi, "kv-tu-kiem");
  trang.dai = { offsetHeight: 48, dataset: { loai: "bao-tri" } };
  theoDai();
  assert.equal(luu.get(KHOA_CAO_DAI), "48|bao-tri");
  assert.equal(html.dataset.giuDai, undefined);
  trang.dai = null;
  theoDai();
  assert.equal(luu.has(KHOA_CAO_DAI), false, "hết dải thì quên");
});
