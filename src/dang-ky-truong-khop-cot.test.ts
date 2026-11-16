// BÀI KHỚP CỘT (ADR-0212 Đ9; đợt 2 Task 3). Đỏ khi biểu mẫu đăng ký, máy chủ và nơi lưu lệch nhau, theo bốn chiều:
//   (1) ô biểu mẫu dựng từ tệp ánh xạ và `web/dang-ky.ts` không tự khai ô tay;  (2) trường máy chủ nhận = khoá của tệp ánh xạ;
//   (3) cột `dk_submission` trừ cột hệ thống = cột tệp ánh xạ trỏ tới;  (4) cột người dùng khai của `pty_person`, `pty_person_document` đều có trường trỏ tới.
// Task 5 thêm `dk_submission_org`, `pty_organization*`: chỉ thêm tên bảng vào BANG_PHIEU / BANG_HO_SO và khoá ở COT_HE_THONG.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { CHO_O, COT_HE_THONG, KHU_CA_NHAN, TRUONG_DANG_KY, TRUONG_GIAY_TO, TRUONG_GUI, dungThanGui, oCuaKhu, oCuaPhan, truongDung, truongGiayTo, truongGuiMucNgoai } from "./shared/dang-ky-truong.ts";

const BANG_PHIEU = ["dk_submission"];
const BANG_HO_SO = ["pty_person", "pty_person_document"];

function cotCua(): Map<string, string[]> {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const out = new Map<string, string[]>();
  for (const t of [...BANG_PHIEU, ...BANG_HO_SO]) out.set(t, (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
  return out;
}
const COT = cotCua();
const sap = (xs: Iterable<string>) => [...new Set(xs)].sort();
const KHOA = sap(TRUONG_DANG_KY.map((t) => t.khoa));
const KHOA_CO_O = sap(TRUONG_DANG_KY.filter((t) => t.o).map((t) => t.khoa));
const web = readFileSync(new URL("../web/dang-ky.ts", import.meta.url), "utf8");
/** Bỏ chú thích để câu chữ trong chú thích không làm đỏ/xanh giả. */
const webMa = web.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

test("(1) ô biểu mẫu: oCuaPhan/oCuaKhu trả đúng tập khoá có ô; web/dang-ky.ts dựng ô từ tệp ánh xạ, không khai ô tay", () => {
  assert.deepEqual(sap(oCuaPhan("CA_NHAN").map((o) => o.khoa)), KHOA_CO_O);
  assert.deepEqual(sap(KHU_CA_NHAN.flatMap((k) => oCuaKhu("CA_NHAN", k).map((o) => o.khoa))), KHOA_CO_O, "có ô mà không thuộc khu nào ⇒ không bao giờ hiện");
  // Trường không có ô chỉ được là: dữ kiện trang tự đưa, giá trị cố định, hoặc cột «chờ ô» có tên.
  for (const t of TRUONG_DANG_KY.filter((x) => !x.o)) {
    const hopLe = t.khoa === "chinhSachPhienBan" || t.coDinh !== undefined || CHO_O.some((c) => t.cot.includes(c.cot));
    assert.ok(hopLe, `trường ${t.khoa} không có ô, không cố định, không nằm trong CHO_O`);
  }
  assert.match(webMa, /oCuaKhu\(/, "web/dang-ky.ts phải dựng ô bằng oCuaKhu");
  assert.match(webMa, /dungThanGui\(/, "web/dang-ky.ts phải dựng thân gửi bằng dungThanGui");
  for (const k of KHU_CA_NHAN) assert.match(webMa, new RegExp(`khuO\\(\\s*"${k}"`), `web/dang-ky.ts không dựng khu «${k}»`);
  assert.doesNotMatch(webMa, /oCuaKhu\([^)]*\)\s*\.(filter|slice|splice|pop|shift|reverse)\b/, "bớt ô sau khi dựng làm lệch tập ô");
  assert.doesNotMatch(webMa, /oCuaPhan\([^)]*\)\s*\.(filter|slice|splice|pop|shift|reverse)\b/, "bớt ô sau khi dựng làm lệch tập ô");
  // Không viết tay tên trường: dạng chuỗi ("hoTen") hoặc khoá đối tượng (hoTen:).
  const ten = sap(KHOA.flatMap((k) => k.split(".")));
  for (const k of ten) {
    assert.doesNotMatch(webMa, new RegExp(`["'\`]${k}["'\`]`), `web/dang-ky.ts viết tay tên trường «${k}»`);
    assert.doesNotMatch(webMa, new RegExp(`(^|[{,\\s])${k}\\s*:`), `web/dang-ky.ts viết tay khoá «${k}:»`);
  }
});

test("(2) máy chủ nhận đúng tập khoá của tệp ánh xạ", () => {
  assert.deepEqual(sap(TRUONG_GUI), sap(truongGuiMucNgoai()));
  assert.deepEqual(sap(TRUONG_GIAY_TO), sap(truongGiayTo()));
  assert.deepEqual(sap([...TRUONG_GUI.filter((k) => k !== "giayTo"), ...TRUONG_GIAY_TO.map((k) => `giayTo.${k}`)].concat("giayTo")), sap([...KHOA, "giayTo"]));
  // Route thật dùng đúng hàm kiểm của tệp ánh xạ, không giữ danh sách tay.
  const route = readFileSync(new URL("./modules/dang-ky/phieu-route.ts", import.meta.url), "utf8");
  assert.match(route, /dang-ky-truong\.ts/);
  assert.match(route, /truongDung\(body\)/, "route gửi phiếu phải kiểm thân bằng truongDung");
  assert.doesNotMatch(route, /const TRUONG_(GUI|GIAY_TO)\b|"gioiTinh",/, "phieu-route.ts khai tay danh sách trường nhận");
  // Hành vi thật của hàm kiểm: mỗi khoá được nhận, khoá lạ bị từ chối.
  for (const k of KHOA) {
    const [a, b] = k.split(".");
    assert.equal(truongDung(b ? { giayTo: { [b]: "x" } } : { [a!]: "x" }), true, `máy chủ không nhận «${k}»`);
  }
  assert.equal(truongDung({ truongLa: "x" }), false);
  assert.equal(truongDung({ giayTo: { truongLa: "x" } }), false);
  // Thân dựng từ giá trị MỌI ô phải được máy chủ nhận.
  const giaTri = Object.fromEntries(KHOA_CO_O.map((k) => [k, "1"]));
  assert.equal(truongDung(dungThanGui(giaTri, 3)), true);
});

test("(3) cột dk_submission trừ cột hệ thống = cột tệp ánh xạ trỏ tới (kể cả cột «chờ ô»)", () => {
  const homNay = new Date().toISOString().slice(0, 10);
  for (const c of CHO_O) assert.ok(c.hetHan >= homNay, `cột «chờ ô» ${c.cot} quá hạn ${c.hetHan}: phải thêm ô (ADR-0212 Đ8)`);
  for (const bang of BANG_PHIEU) {
    const he = new Set(COT_HE_THONG[bang]);
    const cuaBang = (COT.get(bang) ?? []).filter((c) => !he.has(c));
    const troToi = TRUONG_DANG_KY.filter((t) => t.bang === bang).flatMap((t) => t.cot);
    assert.deepEqual(sap(troToi), sap(cuaBang), `${bang}: cột lệch tệp ánh xạ`);
    for (const c of COT_HE_THONG[bang] ?? []) assert.ok(COT.get(bang)!.includes(c), `${bang}: cột hệ thống «${c}» không còn trong bảng`);
  }
});

test("(4) mọi cột người dùng khai của hồ sơ người đều có trường trỏ tới", () => {
  const troToi = new Set([...TRUONG_DANG_KY.flatMap((t) => (t.noiLuu === "CHI_PHIEU" ? [] : t.noiLuu))]);
  for (const bang of BANG_HO_SO) {
    const he = new Set(COT_HE_THONG[bang]);
    for (const c of COT.get(bang)!) if (!he.has(c)) assert.ok(troToi.has(`${bang}.${c}`), `${bang}.${c}: không trường nào trỏ tới (xếp loại: trường mới hoặc COT_HE_THONG)`);
    for (const c of COT_HE_THONG[bang] ?? []) assert.ok(COT.get(bang)!.includes(c), `${bang}: cột hệ thống «${c}» không còn trong bảng`);
  }
  for (const n of troToi) {
    const [bang, cot] = n.split(".");
    if (BANG_HO_SO.includes(bang!)) assert.ok(COT.get(bang!)!.includes(cot!), `${n} không phải cột thật`);
  }
});
