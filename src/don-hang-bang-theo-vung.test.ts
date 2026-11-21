// Bảng thẳng cột của trang Đơn hàng bật theo bề rộng của VÙNG CHỨA nó, không theo bề rộng cửa sổ (sửa lỗi 21/11/2026).
// Lỗi cũ: bảng bật bằng `@media (min-width: 1100px)` nên quên thanh bên; cửa sổ 1.100 tới 1.199 vùng nội dung chỉ còn 804 tới 903 điểm, năm cột cố định
// và khoảng cách đã chiếm hết, cột tên khách co về 0 và tên gãy mỗi dòng một chữ (hồ sơ docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/BAO-CAO.md).
// Bài này khoá ba điều: (a) luật bảng nằm trong truy vấn theo khung chứa `don-bang`, không nằm trong `@media`; (b) mốc của khung chứa đủ chỗ cho mọi phần
// cố định cộng một cột tên rộng ít nhất TEN_TOI_THIEU điểm: nới một cột mà quên nâng mốc là đỏ; (c) public/orders.html có khung chứa bọc hàng tiêu đề và danh sách.
// Hành vi thật trên trình duyệt: docs/evidence/2026-11-21-sua-hai-loi-bo-cuc/kich-ban/do-hai-loi.mjs (cùng con số TEN_TOI_THIEU).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cssGoc = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/orders.html", import.meta.url), "utf8");
// Che chú thích bằng khoảng trắng (giữ nguyên vị trí ký tự) để dấu ngoặc trong chú thích không làm lệch phép dò khối.
const css = cssGoc.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));

/** Cột tên khách của bảng phải còn ít nhất chừng này điểm ở đúng mốc bật bảng (ở cửa sổ 1.280 trước khi sửa là 122). */
const TEN_TOI_THIEU = 96;

/** Giá trị điểm ảnh của một token ở `:root` (lần theo `var()` nếu token trỏ sang token khác). */
function px(ten: string, sau = 0): number {
  assert.ok(sau < 5, `token ${ten}: trỏ vòng`);
  const m = new RegExp(`(?:^|[\\s;{])${ten}:\\s*([^;]+);`).exec(css);
  assert.ok(m, `không thấy token ${ten} trong app.css`);
  const v = m[1]!.trim();
  const tro = /^var\((--[\w-]+)\)$/.exec(v);
  if (tro) return px(tro[1]!, sau + 1);
  const so = /^(\d+(?:\.\d+)?)px$/.exec(v);
  assert.ok(so, `token ${ten} = «${v}»: bài kiểm chỉ đọc được giá trị px`);
  return Number(so[1]);
}
/** Tổng điểm ảnh của một chuỗi giá trị kiểu `var(--s2) 1px var(--w-don-ngay)`; thứ không phải token hay px thì báo đỏ. */
const tong = (ds: readonly string[]): number =>
  ds.reduce((t, g) => {
    const tro = /^var\((--[\w-]+)\)$/.exec(g);
    if (tro) return t + px(tro[1]!);
    const so = /^(\d+(?:\.\d+)?)px$/.exec(g);
    assert.ok(so, `giá trị «${g}»: bài kiểm chỉ đọc được token hoặc px`);
    return t + Number(so[1]);
  }, 0);

/** Các khối `@…` đang mở tại vị trí `i` của tệp kiểu, từ ngoài vào trong. */
function khoiBao(i: number): string[] {
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
  return ngan.filter((s) => s.startsWith("@"));
}
/** Thân khai báo của luật có bộ chọn ĐÚNG bằng `boChon`, cùng vị trí của nó. */
function luat(boChon: string): { than: string; viTri: number } {
  const thoat = boChon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|[};{])\\s*${thoat}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `không thấy luật «${boChon}» trong app.css`);
  return { than: m[1]!, viTri: m.index + m[0].indexOf(boChon) };
}
const khai = (than: string, thuocTinh: string): string => {
  const m = new RegExp(`(?:^|;)\\s*${thuocTinh}:\\s*([^;]+);`).exec(than);
  assert.ok(m, `luật thiếu khai báo «${thuocTinh}»`);
  return m[1]!.trim();
};

const hang = luat("#list > .order-card .order-row");
const cot = khai(hang.than, "grid-template-columns").match(/minmax\([^)]*\)|var\([^)]*\)|\S+/g) ?? [];

test("bảng Đơn hàng: sáu cột, đúng một cột co giãn (tên khách), năm cột còn lại lấy bề rộng từ token", () => {
  assert.equal(cot.length, 6);
  assert.deepEqual(cot.filter((c) => !/^var\(--w-don-[\w-]+\)$/.test(c)), ["minmax(0, 1fr)"]);
});

test("bảng Đơn hàng bật theo bề rộng khung chứa `don-bang`, không theo bề rộng cửa sổ", () => {
  const bao = khoiBao(hang.viTri);
  assert.equal(bao.filter((b) => b.startsWith("@media")).length, 0, `luật bảng đang nằm trong ${bao.join(" › ")}: mốc theo cửa sổ không biết thanh bên rộng bao nhiêu`);
  assert.equal(bao.length, 1, `luật bảng phải nằm trong đúng một khối @container, đang là: ${bao.join(" › ") || "(không khối nào)"}`);
  assert.match(bao[0]!, /^@container don-bang \(min-width: \d+px\)$/);
  assert.match(css, /(?:^|[};])\s*\.don-bang\s*\{\s*container:\s*don-bang\s*\/\s*inline-size;\s*\}/, "thiếu luật khai `.don-bang` là khung chứa đo theo bề ngang");
});

test("mốc khung chứa đủ chỗ cho các phần cố định và một cột tên khách không hẹp hơn mức tối thiểu", () => {
  const moc = Number(/\(min-width: (\d+)px\)/.exec(khoiBao(hang.viTri).find((b) => b.startsWith("@container")) ?? "")?.[1]);
  assert.ok(Number.isFinite(moc), "không đọc được mốc của khung chứa");
  const cotCoDinh = tong(cot.filter((c) => c.startsWith("var(")));
  const khoangCach = (cot.length - 1) * tong([khai(hang.than, "column-gap")]);
  // Phần quanh hàng: viền hai bên của danh sách, đệm trái phải của mỗi dòng, nút xổ chi tiết và khoảng cách tới nó.
  assert.match(khai(luat("#list:has(> .order-card)").than, "border"), /^1px solid /);
  const dem = khai(luat("#list > .order-card").than, "padding").split(/\s+/);
  assert.equal(dem.length, 4, "đệm của dòng bảng phải viết đủ bốn phía để bài kiểm đọc được trái, phải");
  const dau = luat(".order-card-head").than;
  assert.match(dau, /display:\s*flex/);
  const quanhHang = 2 + tong([dem[1]!, dem[3]!]) + tong([khai(dau, "gap")]) + tong([khai(luat(".order-card-toggle").than, "width")]);
  const canCo = cotCoDinh + khoangCach + quanhHang;
  assert.ok(
    moc - canCo >= TEN_TOI_THIEU,
    `mốc ${moc} trừ phần cố định ${canCo} (cột ${cotCoDinh} + khoảng cách ${khoangCach} + quanh hàng ${quanhHang}) còn ${moc - canCo} điểm cho cột tên khách, cần ít nhất ${TEN_TOI_THIEU}: nâng mốc hoặc thu cột`,
  );
});

test("hàng tiêu đề cột dùng đúng bộ cột của dòng và nằm cùng khối khung chứa", () => {
  const tieuDe = luat(".don-bang-dau");
  // Luật mặc định (ẩn) đứng trước; luật hiện bảng là luật thứ hai, nằm trong khối khung chứa.
  const m = /\.don-bang-dau\s*\{([^}]*grid-template-columns[^}]*)\}/.exec(css);
  assert.ok(m, "không thấy luật hiện hàng tiêu đề cột");
  assert.equal(khai(m[1]!, "grid-template-columns"), khai(hang.than, "grid-template-columns"));
  assert.equal(khai(m[1]!, "column-gap"), khai(hang.than, "column-gap"));
  assert.deepEqual(khoiBao(m.index), khoiBao(hang.viTri));
  assert.equal(khai(tieuDe.than, "display"), "none", "ngoài khối khung chứa, hàng tiêu đề cột phải ẩn (dạng thẻ)");
});

test("public/orders.html: khung chứa `.don-bang` bọc hàng tiêu đề cột và danh sách", () => {
  assert.match(html, /<div class="don-bang">\s*<div class="don-bang-dau" aria-hidden="true">(?:<span[^>]*>[^<]*<\/span>){6}<\/div>\s*<div id="list"><\/div>\s*<\/div>/);
});
