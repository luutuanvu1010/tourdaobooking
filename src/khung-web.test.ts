// Hàm dựng của khung gốc giao diện (web/khung.ts, ADR-0222 Đ3): màn dựng bố cục bằng các hàm này thay vì tự đặt lớp và số.
// Bài này khoá cấu trúc mỗi hàm cho ra (lớp, thuộc tính, quan hệ nhãn ↔ ô) vì tệp kiểu của khung (phần «Khung gốc giao diện» của public/app.css) bám đúng cấu trúc đó.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dungDomGia, type NutGia } from "./dom-gia.ts";

dungDomGia();
const K = await import("../web/khung.ts");
const { h } = await import("../web/dom.ts");
const g = (e: unknown): NutGia => e as NutGia;
const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");

const nutThu = (cap: string, chu: string, them: Record<string, unknown> = {}): HTMLElement => h("button", { type: "button", class: "nut", "data-cap": cap, ...them }, chu);

test("khoi: một vỏ khối — đầu khối có tiêu đề, nút của khối, mô tả, rồi thân; gắn aria-labelledby khi tiêu đề có id", () => {
  const sua = nutThu("phu", "Đổi khách");
  const k = g(K.khoi({ tieuDe: "Khách hàng", idTieuDe: "kh-td", viec: [sua], moTa: "Người đặt đơn." }, h("p", null, "thân")));
  assert.equal(k.tag, "section");
  assert.equal(k.className, "khoi");
  assert.equal(k.getAttribute("aria-labelledby"), "kh-td");
  assert.deepEqual(k.children.map((c) => `${c.tag}.${c.className}`), ["header.khoi-dau", "div.khoi-viec", "p.khoi-mo-ta", "p."]);
  const td = k.querySelector("h2")!;
  assert.equal(td.textContent, "Khách hàng");
  assert.equal(td.getAttribute("id"), "kh-td");
  assert.equal(k.querySelector(".khoi-viec")!.children[0], g(sua));
});

test("khoi: kiểu bảng, nút luôn ở đầu khối, thẻ gốc và lớp thêm theo tuỳ chọn; không tiêu đề thì không có đầu khối", () => {
  const k = g(K.khoi({ tieuDe: "Địa điểm", kieu: "bang", viec: [nutThu("chinh", "Thêm địa điểm")], viecODau: true, the: "div", thuoc: { id: "ds" } }));
  assert.equal(k.tag, "div");
  assert.equal(k.getAttribute("data-kieu"), "bang");
  assert.equal(k.getAttribute("id"), "ds");
  assert.equal(k.querySelector(".khoi-viec")!.getAttribute("data-cho"), "dau");
  const tran = g(K.khoi({}, h("p", null, "x")));
  assert.equal(tran.querySelector(".khoi-dau"), null);
  assert.equal(tran.hasAttribute("aria-labelledby"), false);
  assert.equal(g(K.khoi({ tieuDe: "Dịch vụ", capTieuDe: "h3" })).querySelector("h3")!.textContent, "Dịch vụ");
});

test("truong: nhãn trên ô nối với ô bằng for; số cột vào data-cot; lỗi và gợi ý đứng sau ô", () => {
  const o = h("input", { id: "xe-plate", class: "o" });
  const loi = h("div", { id: "xe-plate-error", class: "truong-loi", hidden: true });
  const t = g(K.truong("Biển số", o, { cot: 6, loi, goiY: "In trên giấy đăng ký xe" }));
  assert.equal(t.className, "truong");
  assert.equal(t.getAttribute("data-cot"), "6");
  assert.deepEqual(t.children.map((c) => c.tag), ["label", "input", "div", "div"]);
  assert.equal(t.children[0]!.getAttribute("for"), "xe-plate");
  assert.equal(t.children[0]!.textContent, "Biển số");
  assert.equal(t.children[3]!.className, "truong-goi-y");
});

test("truong: điều khiển nhóm (bộ đếm, chọn một) dùng nhãn div có id để nhóm trỏ tới bằng aria-labelledby", () => {
  const nhom = h("div", { class: "bo-dem", role: "group", "aria-labelledby": "xe-seats-label" });
  const t = g(K.truong("Số người được chở", nhom, { idNhan: "xe-seats-label" }));
  assert.equal(t.children[0]!.tag, "div");
  assert.equal(t.children[0]!.className, "nhan");
  assert.equal(t.children[0]!.getAttribute("id"), "xe-seats-label");
  assert.equal(t.hasAttribute("data-cot"), false, "không khai cột = kín hàng");
});

test("cap: cặp nhãn và giá trị; kiểu số canh phải, dòng nhấn mạnh", () => {
  const c = g(K.cap("Tổng cộng", "5.445.000 ₫", { kieu: "so", manh: true }));
  assert.equal(c.className, "cap");
  assert.equal(c.getAttribute("data-kieu"), "so");
  assert.equal(c.hasAttribute("data-nhan-manh"), true);
  assert.deepEqual(c.children.map((x) => x.textContent), ["Tổng cộng", "5.445.000 ₫"]);
  const thuong = g(K.cap("Tên", [h("strong", null, "Lê Hoàng Châu")]));
  assert.equal(thuong.hasAttribute("data-kieu"), false);
  assert.equal(thuong.children.length, 2);
});

test("thanhDay: thanh dính đáy mang lớp để thanh tab nhường chỗ; haiCot: cột chính trước, cột phụ sau", () => {
  const d = g(K.thanhDay({ id: "xe-bottom" }, nutThu("chinh", "Lưu", { type: "submit" })));
  assert.equal(d.className, "thanh-day thanh-hanh-dong-cuoi");
  assert.equal(d.getAttribute("id"), "xe-bottom");
  const hc = g(K.haiCot([h("p", null, "a")], [h("p", null, "b")]));
  assert.equal(hc.className, "hai-cot");
  assert.deepEqual(hc.children.map((c) => c.className), ["cot-chinh", "cot-phu"]);
});

test("các vùng của khuôn: mỗi hàm một lớp, giữ thuộc tính truyền vào và lớp thêm", () => {
  for (const [ham, lop] of [["luoi", "luoi"], ["thanhNut", "thanh-nut"], ["thanhViec", "thanh-viec"], ["thanhLoc", "thanh-loc"], ["dauTrang", "dau-trang"], ["dsDong", "ds-dong"], ["vungPhu", "vung-phu"]] as const) {
    const e = g(K[ham]({ id: "x", class: "them" }, h("span", null, "con")));
    assert.equal(e.className, `${lop} them`, ham);
    assert.equal(e.getAttribute("id"), "x", ham);
    assert.equal(e.children.length, 1, ham);
    assert.equal(g(K[ham](null)).className, lop, ham);
  }
});

test("khuonCot: ghép khuôn cột của bảng lưới từ TÊN cột của thang, không nhận số", () => {
  assert.equal(
    K.khuonCot({ cot: ["vua", "gian", "ngan"], vung: ["ngay ten khach", ". sdt ."] }),
    '"ngay ten khach" auto ". sdt ." auto / var(--kg-cot-vua) minmax(var(--kg-cot-gian), 1fr) var(--kg-cot-ngan)',
  );
  assert.throws(() => K.khuonCot({ cot: ["vua", "gian"], vung: ["ngay ten khach"] }), /3 vùng.*2 cột/);
  assert.throws(() => K.khuonCot({ cot: ["vua", "120px" as never], vung: ["a b"] }), /tên cột/);
  assert.throws(() => K.khuonCot({ cot: ["vua", "vua"], vung: ["a b"] }), /đúng một cột co giãn/);
});

test("datKhuonBang và o: đặt khuôn cột lên khối bảng, ô khai vùng bằng tên", () => {
  const k = h("section", { class: "khoi" });
  K.datKhuonBang(k, { cot: ["vua", "gian"], vung: ["a b"] }, { cot: ["vua", "gian", "ngan"], vung: ["a b c"] });
  const kieu = g(k).getAttribute("style") ?? "";
  assert.match(kieu, /--kg-bang-vua:\s*"a b" auto \/ var\(--kg-cot-vua\) minmax\(var\(--kg-cot-gian\), 1fr\)/);
  assert.match(kieu, /--kg-bang-rong:\s*"a b c" auto \/ /);
  const mot = h("section", { class: "khoi" });
  K.datKhuonBang(mot, { cot: ["vua", "gian"], vung: ["a b"] });
  assert.match(g(mot).getAttribute("style") ?? "", /--kg-bang-rong:\s*"a b" auto \/ var\(--kg-cot-vua\)/, "không khai khuôn rộng thì dùng lại khuôn vừa");
  assert.deepEqual(K.o("ten"), { "data-o": "ten", style: "--kg-o:ten" });
  assert.throws(() => K.o("tên có dấu"), /tên vùng/);
});

// ---------- Bảng Đơn hàng: khuôn cột khai ở src/shared/bang-don.ts phải vừa vùng nội dung tại đúng mốc bật bảng ----------
// Thay bài src/don-hang-bang-theo-vung.test.ts (sửa lỗi 21/11: cột tên khách co về 0 khi cửa sổ 1.100–1.199). Trong khung, bảng bật theo vùng «trang» ở mốc 800 và 1040;
// cột tên khách là cột co giãn, không hẹp hơn --kg-cot-gian. Bài này cộng lại mọi phần cố định từ token: nới một cột mà quên thì đỏ.

const px = (ten: string, sau = 0): number => {
  assert.ok(sau < 6, `token ${ten}: trỏ vòng`);
  const m = new RegExp(`(?:^|[\\s;{])${ten}:\\s*([^;]+);`).exec(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  assert.ok(m, `không thấy token ${ten} trong app.css`);
  const v = m[1]!.trim();
  const tro = /^var\((--[\w-]+)\)$/.exec(v);
  if (tro) return px(tro[1]!, sau + 1);
  const so = /^(\d+(?:\.\d+)?)px$/.exec(v);
  assert.ok(so, `token ${ten} = «${v}»: bài kiểm chỉ đọc được giá trị px`);
  return Number(so[1]);
};

test("bảng Đơn hàng: ở mốc 800 và 1040, các cột cố định, khe, đệm dòng và nút xổ còn chừa đủ cột tên khách tối thiểu", async () => {
  const { BANG_DON } = await import("./shared/bang-don.ts");
  const gian = px("--kg-cot-gian");
  // Phần quanh hàng trong phần khung: đệm trái của dòng = đệm khối ở vùng nội dung từ 560 (--s5); đệm phải --s2; nút xổ cao rộng bằng --kg-cao-nut; khoảng cách tới nút xổ 0.
  const quanhHang = px("--s5") + px("--s2") + px("--kg-cao-nut");
  for (const [moc, khuon] of [[800, BANG_DON.vua], [1040, BANG_DON.rong]] as const) {
    const coDinh = khuon.cot.filter((c: string) => c !== "gian").reduce((t: number, c: string) => t + px(`--kg-cot-${c}`), 0);
    const khe = (khuon.cot.length - 1) * px("--kg-khe");
    const con = moc - quanhHang - coDinh - khe;
    assert.ok(con >= gian, `mốc ${moc}: sau phần cố định (cột ${coDinh} + khe ${khe} + quanh hàng ${quanhHang}) còn ${con} cho cột tên khách, cần ít nhất ${gian}`);
  }
  // Phần khung phải khớp các giả định trên: đệm dòng, khoảng cách tới nút xổ, khuôn cột của hàng tiêu đề.
  assert.match(css, /body\[data-khung-goc\] \.bang-luoi > \.the-dong \{ padding: 0 var\(--s2\) 0 var\(--kg-dem\);/);
  assert.match(css, /body\[data-khung-goc\] \.bang-luoi \.the-dong-dau \{ gap: 0; \}/);
  assert.match(css, /body\[data-khung-goc\] \.bang-dau \{ display: grid; grid-template: var\(--kg-bang-vua\);[^}]*padding: 0 calc\(var\(--s2\) \+ var\(--kg-cao-nut\)\) 0 var\(--kg-dem\);/);
});

test("bảng Đơn hàng: mỗi hàng vùng đủ số cột; vùng của mọi ô thẻ đơn đều có trong cả hai khuôn", async () => {
  const { BANG_DON, VUNG_O_DON } = await import("./shared/bang-don.ts");
  for (const k of [BANG_DON.vua, BANG_DON.rong]) {
    for (const hang of k.vung) assert.equal(hang.trim().split(/\s+/).length, k.cot.length, `hàng «${hang}»`);
    const co = new Set(k.vung.flatMap((hang: string) => hang.trim().split(/\s+/)));
    for (const v of Object.values(VUNG_O_DON) as string[]) assert.ok(co.has(v), `khuôn ${k.cot.length} cột thiếu vùng «${v}»`);
  }
  assert.equal(BANG_DON.vua.cot.length, 5);
  assert.equal(BANG_DON.rong.cot.length, 6);
});
