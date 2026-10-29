// HÀNG RÀO «Ô TÍCH TRONG NHÃN `check` KHÔNG BỊ KÉO DÀI» (chủ dự án 29/10/2026: ô «Tách theo loại khách» ở Hoa hồng đối tác nằm lệch giữa dòng,
// chữ bị đẩy sang phải gãy hai dòng).
// Nguyên nhân gốc: luật chung `input, select, textarea { display: block; width: 100% }` ở public/app.css áp CẢ cho ô tích / ô chọn một. Ô nằm trong
// `label.check` phải thoát luật đó bằng lớp `o-tick` (luật `label.check > input.o-tick`), hoặc `vc-check-inline`, hoặc style nội dòng có `width:auto`
// của mã cũ. Quên là lỗi lặp: lúc dựng hàng rào này có bốn chỗ (hoa-hong-hop, so-dai-ly-ui, chinh-sach-dang-nhap-ui, orders).
//
// Quét: MỌI tệp `web/**/*.ts` (bỏ *.test.ts, *.d.ts). Tìm `h("label", { class: "check" … }, X` — X là `h("input", {…})` viết tại chỗ, hoặc tên biến
// định nghĩa GẦN NHẤT phía trên trong cùng tệp bằng `h("input", {…})` hay bằng hàm trợ giúp `const f = (…) => h("input", {…})`. ĐỎ khi ô tích / ô chọn
// một không thoát luật, hoặc khi không tìm được định nghĩa (viết lại cho bài đọc được, đừng thêm ngoại lệ).
// Giới hạn: canh QUÊN, không canh CỐ Ý — không theo ô dựng qua nhiều tầng hàm, lớp ghép động, hay ô tích đặt SAU chữ trong nhãn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LOP_THOAT = /(^|\s)(o-tick|vc-check-inline)(\s|$)/;

function tepWeb(dir: string): string[] {
  const ra: string[] = [];
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) ra.push(...tepWeb(p));
    else if (ten.endsWith(".ts") && !ten.endsWith(".test.ts") && !ten.endsWith(".d.ts")) ra.push(p);
  }
  return ra;
}

/** Chỉ số ngay sau dấu `}` khép đối tượng mở ở `mo` — đếm trên bản đã che chuỗi và chú thích (chữ trong chuỗi không làm lệch). */
function dongNgoac(che: string, mo: number): number {
  let sau = 0;
  for (let i = mo; i < che.length; i++) {
    if (che[i] === "{") sau++;
    else if (che[i] === "}" && --sau === 0) return i + 1;
  }
  return -1;
}

/** Đối tượng thuộc tính của `h("input", {…})` bắt đầu đúng ở `tu` (bỏ khoảng trắng đầu); null nếu chỗ đó không phải lời gọi ấy. */
function propsInputTai(goc: string, che: string, tu: number): string | null {
  const m = /^\s*h\("input",\s*\{/.exec(goc.slice(tu));
  if (!m) return null;
  const mo = tu + m[0].length - 1;
  const dong = dongNgoac(che, mo);
  return dong < 0 ? null : goc.slice(mo, dong);
}

/** Định nghĩa GẦN NHẤT phía trên `truoc` của biến `ten` → thuộc tính ô nhập (qua `h("input", …)` hoặc một hàm trợ giúp một tầng). */
function propsCuaBien(goc: string, che: string, ten: string, truoc: number): string | null {
  const re = new RegExp(`(?:const|let)\\s+${ten}\\s*=\\s*`, "g");
  let cuoi: RegExpExecArray | null = null;
  for (let m = re.exec(che); m && m.index < truoc; m = re.exec(che)) cuoi = m;
  if (!cuoi) return null;
  const sau = cuoi.index + cuoi[0].length;
  const truc = propsInputTai(goc, che, sau);
  if (truc !== null) return truc;
  const goi = /^([A-Za-z_$][\w$]*)\(/.exec(goc.slice(sau));
  if (!goi) return null;
  const ham = new RegExp(`(?:const|let)\\s+${goi[1]}\\s*=\\s*\\([^)]*\\)(?:\\s*:\\s*[\\w<>.]+)?\\s*=>`).exec(che);
  return ham ? propsInputTai(goc, che, ham.index + ham[0].length) : null;
}

/** Ô tích / ô chọn một có thoát luật `width: 100%` không. Ô loại khác (chữ, số…) không thuộc hàng rào này. */
export function thoatLuat(props: string, goc: string): boolean {
  if (!/type:\s*"(checkbox|radio)"/.test(props)) return true;
  const lop = /class:\s*"([^"]*)"/.exec(props);
  if (lop && LOP_THOAT.test(lop[1])) return true;
  const kieu = /style:\s*(?:"([^"]*)"|([A-Za-z_$][\w$]*))/.exec(props);
  if (kieu) {
    const giaTri = kieu[1] ?? new RegExp(`const\\s+${kieu[2]}\\s*=\\s*"([^"]*)"`).exec(goc)?.[1] ?? "";
    if (/width:\s*auto/.test(giaTri)) return true;
  }
  return false;
}

/** Mọi ô đứng đầu một `label.check` trong mã `goc`: dòng, tên (biến hoặc «tại chỗ»), có thoát luật không. */
export function quetOTich(goc: string): { dong: number; ten: string; on: boolean }[] {
  const che = maskSource(goc);
  const timDuoc = maskSource(goc, { strings: false, comments: true });
  const ra: { dong: number; ten: string; on: boolean }[] = [];
  const re = /h\("label",\s*\{\s*class:\s*"check"/g;
  for (let m = re.exec(timDuoc); m; m = re.exec(timDuoc)) {
    const dongSo = goc.slice(0, m.index).split("\n").length;
    const ketThuc = dongNgoac(che, timDuoc.indexOf("{", m.index));
    const phay = /^\s*,/.exec(goc.slice(ketThuc));
    if (ketThuc < 0 || !phay) continue; // nhãn không có con
    const tu = ketThuc + phay[0].length;
    const taiCho = propsInputTai(goc, che, tu);
    if (taiCho !== null) {
      ra.push({ dong: dongSo, ten: "(tại chỗ)", on: thoatLuat(taiCho, goc) });
      continue;
    }
    const bien = /^\s*([A-Za-z_$][\w$]*)\s*,/.exec(goc.slice(tu));
    if (!bien) continue; // con đầu là chữ hoặc biểu thức khác — không phải ô
    const props = propsCuaBien(goc, che, bien[1], m.index);
    ra.push({ dong: dongSo, ten: bien[1], on: props !== null && thoatLuat(props, goc) });
  }
  return ra;
}

test("bộ bắt tự kiểm: bắt ô tích thiếu lớp (biến, tại chỗ, id khuôn mẫu); cho qua o-tick, vc-check-inline, style width:auto, hằng style, hàm trợ giúp", () => {
  const xau = [
    'const bat = h("input", { id: `${p}-theo-loai`, type: "checkbox" });\nh("label", { class: "check" }, bat, "Tách theo loại khách");',
    'h("label", { class: "check", "data-nhom": "x" },\n  h("input", { type: "checkbox", onchange: (e: Event) => { f(e); } }),\n  "Chữ");',
    'const i = h("input", { type: "radio", name: `pol-${code}` });\nreturn h("label", { class: "check" }, i, nhan);',
  ];
  for (const s of xau) assert.deepEqual(quetOTich(s).map((x) => x.on), [false], s);
  const tot = [
    'const t = h("input", { type: "checkbox", class: "o-tick" });\nh("label", { class: "check" }, t, "Chữ");',
    'const t = h("input", { type: "radio", class: "a o-tick" });\nh("label", { class: "check" }, t, "Chữ");',
    'const t = h("input", { type: "checkbox", class: "vc-check-inline" });\nh("label", { class: "check" }, t, "Chữ");',
    'const t = h("input", { type: "checkbox", style: "width:auto;display:inline" });\nh("label", { class: "check" }, t, "Chữ");',
    'const CHECK_STYLE = "width:auto;display:inline";\nconst b = h("input", { type: "checkbox", style: CHECK_STYLE });\nh("label", { class: "check" }, b, "Chữ");',
    'const checkbox = (checked: boolean) => h("input", { type: "checkbox", checked, style: "width:auto;display:inline" });\nconst a = checkbox(true);\nh("label", { class: "check" }, a, "Chữ");',
  ];
  for (const s of tot) assert.deepEqual(quetOTich(s).map((x) => x.on), [true], s);
  // biến cùng tên ở hai hàm: lấy định nghĩa gần nhất phía trên nhãn
  const haiHam = 'const b = h("input", { type: "checkbox", class: "o-tick" });\nh("label", { class: "check" }, b, "1");\nconst b = h("input", { type: "checkbox" });\nh("label", { class: "check" }, b, "2");';
  assert.deepEqual(quetOTich(haiHam).map((x) => x.on), [true, false]);
  // không tìm được định nghĩa → đỏ
  assert.deepEqual(quetOTich('h("label", { class: "check" }, khongCo, "Chữ");').map((x) => x.on), [false]);
});

test("mọi ô tích / ô chọn một đứng đầu label.check ở web/ đều thoát luật width: 100% (lớp o-tick)", () => {
  const loi: string[] = [];
  let dem = 0;
  for (const tep of tepWeb(join(ROOT, "web"))) {
    for (const o of quetOTich(readFileSync(tep, "utf8"))) {
      dem++;
      if (!o.on) loi.push(`${relative(ROOT, tep)}:${o.dong} — ô «${o.ten}» thiếu lớp o-tick`);
    }
  }
  assert.ok(dem >= 15, `bộ quét chỉ thấy ${dem} ô — có thể đã hỏng (lúc dựng thấy 18)`);
  assert.deepEqual(loi, [], `Ô tích trong label.check bị luật width: 100% kéo dài; thêm class: "o-tick":\n${loi.join("\n")}`);
});
