// Bảng «động từ → cấp nút» (ADR-0234 Đ4): đếm nút của bộ thành phần chung (`h("button"|"a", { class: "nut", … }, "Chữ")` trong web/*.ts) có động từ đầu
// nằm trong bảng mà cấp (`data-cap`) khác bảng. TRẦN CHỈ ĐƯỢC HẠ: đợt khung gốc nào đưa nút về đúng bảng thì hạ trần về đúng số đếm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CAP_THEO_DONG_TU, capTheoChu } from "./shared/cap-nut.ts";

/** Đo 24/11/2026 (đợt gốc ngôn ngữ thị giác, chưa đổi màn nào). */
const TRAN_LECH = 21;

const NUT = /h\("(?:button|a)", \{([^}]*\bclass: "nut"[^}]*)\}, "([^"]+)"/g;
function lech(): string[] {
  const ra: string[] = [];
  const thu = new URL("../web/", import.meta.url);
  for (const tep of readdirSync(thu).filter((t) => t.endsWith(".ts")).sort()) {
    for (const m of readFileSync(new URL(tep, thu), "utf8").matchAll(NUT)) {
      const dung = capTheoChu(m[2]!);
      if (!dung) continue;
      const cap = /"data-cap": "([a-z-]+)"/.exec(m[1]!)?.[1] ?? "(không cấp)";
      if (/"data-tong": "san-ho"/.test(m[1]!)) continue;
      if (cap !== dung) ra.push(`${tep}: «${m[2]}» là ${cap}, bảng là ${dung}`);
    }
  }
  return ra;
}

test("bảng động từ → cấp nút chỉ dùng bốn cấp của bộ thành phần", () => {
  for (const [tu, cap] of Object.entries(CAP_THEO_DONG_TU)) assert.match(cap, /^(chinh|phu|loi|nguy-hiem)$/, tu);
  assert.equal(capTheoChu("  Lưu thay đổi"), "chinh");
  assert.equal(capTheoChu("Xem ảnh"), null);
});

test("số nút lệch bảng động từ → cấp nút không vượt trần", () => {
  const ds = lech();
  assert.ok(ds.length <= TRAN_LECH, `${ds.length} nút lệch bảng > trần ${TRAN_LECH} (ADR-0234 Đ4; trần chỉ được hạ):\n${ds.join("\n")}`);
});
