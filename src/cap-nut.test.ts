// Bảng «động từ → cấp nút» (ADR-0234 Đ4): đếm nút của bộ thành phần chung (`h("button"|"a", { class: "nut", … }, "Chữ")` trong web/*.ts) có động từ đầu
// nằm trong bảng mà cấp (`data-cap`) khác bảng. TRẦN CHỈ ĐƯỢC HẠ: đợt khung gốc nào đưa nút về đúng bảng thì hạ trần về đúng số đếm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CAP_THEO_DONG_TU, capTheoChu } from "./shared/cap-nut.ts";

/** Đo 24/11/2026 (đợt gốc ngôn ngữ thị giác, chưa đổi màn nào). */
const TRAN_LECH = 21;

/** Mọi lời gọi `h("button"|"a", { … }, "Chữ")`: dò cặp ngoặc nhọn cân nhau (tham số có hàm `() => { … }` bên trong vẫn bắt được — soát độc lập 24/11). */
export function nutTrongMa(ma: string): Array<{ thamSo: string; chu: string }> {
  const ra: Array<{ thamSo: string; chu: string }> = [];
  for (const m of ma.matchAll(/h\(\s*"(?:button|a)",\s*\{/g)) {
    let sau = 1, j = m.index! + m[0].length;
    for (; j < ma.length && sau > 0; j++) { if (ma[j] === "{") sau++; else if (ma[j] === "}") sau--; }
    const thamSo = ma.slice(m.index! + m[0].length, j - 1);
    const chu = /^\s*,\s*"([^"]+)"/.exec(ma.slice(j))?.[1];
    if (chu && /\bclass:\s*"nut"/.test(thamSo)) ra.push({ thamSo, chu });
  }
  return ra;
}
function lech(): string[] {
  const ra: string[] = [];
  const thu = new URL("../web/", import.meta.url);
  for (const tep of readdirSync(thu).filter((t) => t.endsWith(".ts")).sort()) {
    for (const { thamSo, chu } of nutTrongMa(readFileSync(new URL(tep, thu), "utf8"))) {
      const dung = capTheoChu(chu);
      if (!dung || /"data-tong":\s*"san-ho"/.test(thamSo)) continue;
      const cap = /"data-cap":\s*"([a-z-]+)"/.exec(thamSo)?.[1] ?? "(không cấp)";
      if (cap !== dung) ra.push(`${tep}: «${chu}» là ${cap}, bảng là ${dung}`);
    }
  }
  return ra;
}

test("dò được nút có hàm trong tham số và nút viết nhiều dòng", () => {
  const ma = 'h("button", { type: "button", class: "nut", onclick: () => { lam(); }, "data-cap": "phu" }, "Lưu");\nh("a", {\n  class: "nut",\n  href: "/x",\n}, "Sửa");';
  assert.deepEqual(nutTrongMa(ma).map((n) => n.chu), ["Lưu", "Sửa"]);
});

test("bảng động từ → cấp nút chỉ dùng bốn cấp của bộ thành phần", () => {
  for (const [tu, cap] of Object.entries(CAP_THEO_DONG_TU)) assert.match(cap, /^(chinh|phu|loi|nguy-hiem)$/, tu);
  assert.equal(capTheoChu("  Lưu thay đổi"), "chinh");
  assert.equal(capTheoChu("Xem ảnh"), null);
});

test("số nút lệch bảng động từ → cấp nút không vượt trần", () => {
  const ds = lech();
  assert.ok(ds.length <= TRAN_LECH, `${ds.length} nút lệch bảng > trần ${TRAN_LECH} (ADR-0234 Đ4; trần chỉ được hạ):\n${ds.join("\n")}`);
});
