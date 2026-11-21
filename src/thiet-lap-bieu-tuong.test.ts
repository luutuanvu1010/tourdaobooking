// Việc 16 (21/11/2026): mỗi mục nhóm THIẾT LẬP của thanh bên có hình riêng — tiêu chí S6 ở docs/TIEU-CHI-GIAO-DIEN.md («cùng nghĩa cùng hình», nên khác nghĩa khác hình).
// Hình khai ở src/shared/muc-giao-dien.ts (`bieuTuong`), vẽ ở web/icons.ts; thanh bên máy tính (web/shell.ts) và trang /thiet-lap điện thoại (web/thiet-lap.ts) cùng đọc một chỗ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { THANH_BEN, THANH_TAB } from "./shared/muc-giao-dien.ts";

type Dong = { readonly nhom: string; readonly trang: string; readonly nhan: string; readonly bieuTuong?: string };
const ben = THANH_BEN as readonly Dong[];
const thietLap = ben.filter((c) => c.nhom === "THIẾT LẬP");
const icons = readFileSync(new URL("../web/icons.ts", import.meta.url), "utf8");
const coHinh = (ten: string) => new RegExp(`^\\s{2}(?:${ten}|"${ten}"): \\[`, "m").test(icons);

test("mọi mục THIẾT LẬP đều khai hình, và hình có trong web/icons.ts", () => {
  assert.ok(thietLap.length >= 25, `chỉ thấy ${thietLap.length} mục`);
  const thieu = thietLap.filter((c) => !c.bieuTuong).map((c) => c.nhan);
  assert.deepEqual(thieu, [], "mục chưa có hình");
  const sai = thietLap.filter((c) => !coHinh(c.bieuTuong!)).map((c) => `${c.nhan} → ${c.bieuTuong}`);
  assert.deepEqual(sai, [], "tên hình không có trong SHAPES");
});

test("không hai mục THIẾT LẬP chung một hình", () => {
  const theoHinh = new Map<string, string[]>();
  for (const c of thietLap) theoHinh.set(c.bieuTuong!, [...(theoHinh.get(c.bieuTuong!) ?? []), c.nhan]);
  const trung = [...theoHinh].filter(([, ds]) => ds.length > 1).map(([hinh, ds]) => `${hinh}: ${ds.join(", ")}`);
  assert.deepEqual(trung, []);
});

test("mục THIẾT LẬP không mượn hình đang mang nghĩa khác ở thanh bên / thanh tab (chỉ trùng khi cùng một trang)", () => {
  const khac = [...ben.filter((c) => c.nhom !== "THIẾT LẬP"), ...(THANH_TAB as readonly Dong[])];
  const muon = thietLap.flatMap((c) => khac.filter((k) => k.bieuTuong === c.bieuTuong && k.trang !== c.trang).map((k) => `${c.nhan} mượn «${c.bieuTuong}» của ${k.nhan}`));
  assert.deepEqual(muon, []);
});
