// Luật ghép "Đổi sang chặng khác" (C14) — thay-chang.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_THAY_CHANG, ghepThayChang, laLyDoThayChang } from "./thay-chang.ts";
import type { LyDoDongChang } from "./chang-dua-don.ts";

type Chieu = "OUT" | "RETURN";
const bo = (ten: string, direction: Chieu, lyDo: LyDoDongChang = "REPLACED") => ({ ten, leg: { direction }, lyDo });
const moi = (ten: string, direction: Chieu) => ({ ten, direction });
const tenCua = (k: { thay: { bo: { ten: string }; moi: { ten: string } }[]; boLe: { ten: string }[]; moiLe: { ten: string }[] }) => ({
  thay: k.thay.map((c) => `${c.bo.ten}>${c.moi.ten}`),
  boLe: k.boLe.map((b) => b.ten),
  moiLe: k.moiLe.map((m) => m.ten),
});

test("đúng một bỏ (REPLACED) ↔ một thêm cùng chiều → một cặp thay; không còn lệnh rời", () => {
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT")], [moi("m1", "OUT")])), { thay: ["b1>m1"], boLe: [], moiLe: [] });
});

test("mỗi chiều xét riêng: đi và về đều có cặp → hai cặp; thứ tự theo danh sách bỏ", () => {
  assert.deepEqual(tenCua(ghepThayChang([bo("bv", "RETURN"), bo("bd", "OUT")], [moi("md", "OUT"), moi("mv", "RETURN")])), { thay: ["bv>mv", "bd>md"], boLe: [], moiLe: [] });
});

test("lý do 'Nhập nhầm' (WRONG_ENTRY) cũng ghép — lệnh thay mang đúng lý do đó; 'Không cần nữa' (NOT_NEEDED) → giữ lệnh rời", () => {
  const k = ghepThayChang([bo("b1", "OUT", "WRONG_ENTRY")], [moi("m1", "OUT")]);
  assert.deepEqual(tenCua(k), { thay: ["b1>m1"], boLe: [], moiLe: [] });
  assert.equal(k.thay[0]!.bo.lyDo, "WRONG_ENTRY");
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT", "NOT_NEEDED")], [moi("m1", "OUT")])), { thay: [], boLe: ["b1"], moiLe: ["m1"] });
});

test("laLyDoThayChang: đúng hai mã REPLACED, WRONG_ENTRY (một nguồn cho máy chủ và giao diện)", () => {
  assert.deepEqual([...LY_DO_THAY_CHANG], ["REPLACED", "WRONG_ENTRY"]);
  for (const v of ["REPLACED", "WRONG_ENTRY"]) assert.equal(laLyDoThayChang(v), true, v);
  for (const v of ["NOT_NEEDED", "replaced", "", null, undefined, 1, "toString"]) assert.equal(laLyDoThayChang(v), false, String(v));
});

test("không xác định chắc → giữ rời: bỏ hai thêm một, bỏ một thêm hai, hai bỏ cùng chiều mà chỉ một REPLACED, khác chiều", () => {
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT"), bo("b2", "OUT")], [moi("m1", "OUT")])), { thay: [], boLe: ["b1", "b2"], moiLe: ["m1"] });
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT")], [moi("m1", "OUT"), moi("m2", "OUT")])), { thay: [], boLe: ["b1"], moiLe: ["m1", "m2"] });
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT"), bo("b2", "OUT", "NOT_NEEDED")], [moi("m1", "OUT")])), { thay: [], boLe: ["b1", "b2"], moiLe: ["m1"] });
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT")], [moi("m1", "RETURN")])), { thay: [], boLe: ["b1"], moiLe: ["m1"] });
});

test("một chiều ghép được, chiều kia không → chỉ ghép chiều đủ điều kiện; phần còn lại giữ nguyên thứ tự", () => {
  const k = ghepThayChang([bo("bd", "OUT"), bo("bv1", "RETURN"), bo("bv2", "RETURN")], [moi("mv", "RETURN"), moi("md", "OUT")]);
  assert.deepEqual(tenCua(k), { thay: ["bd>md"], boLe: ["bv1", "bv2"], moiLe: ["mv"] });
});

test("không bỏ / không thêm → rỗng; chỉ thêm → giữ rời", () => {
  assert.deepEqual(tenCua(ghepThayChang([], [])), { thay: [], boLe: [], moiLe: [] });
  assert.deepEqual(tenCua(ghepThayChang([], [moi("m1", "OUT")])), { thay: [], boLe: [], moiLe: ["m1"] });
});
