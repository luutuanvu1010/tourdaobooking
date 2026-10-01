// Màn Danh mục (web/catalog.ts) không lộ MÃ đơn vị thô của Sheet ("perPax", "per5Pax"…) — nợ nhỏ 2026-10-01. Cột / dòng đơn vị hiện chữ người đọc qua
// `unitLabel` (src/shared/service-form.ts — cùng chữ với ô chọn dịch vụ và thẻ dịch vụ của form đơn: "theo người", "theo nhóm 5 khách/lượt").
// Ngoại lệ có chủ ý: đơn vị CHƯA HỖ TRỢ (không có nhãn) hiện nguyên chữ Sheet trong câu "… chưa hỗ trợ" để Quản trị biết sửa Sheet thế nào.
// GIỚI HẠN: bài quét văn bản — canh QUÊN ở màn này (tên biến `it.unit`), không canh màn khác.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { unitLabel } from "./shared/service-form.ts";

test("web/catalog.ts: mọi chỗ hiện it.unit đi qua unitLabel, trừ câu đơn vị chưa hỗ trợ", () => {
  const code = maskSource(readFileSync(new URL("../web/catalog.ts", import.meta.url), "utf8"), { strings: false, comments: true });
  const dong = code.split("\n").filter((l) => /\bit\.unit\b/.test(l));
  assert.ok(dong.length >= 2, "chống bài rỗng: màn có hiện đơn vị");
  for (const l of dong) {
    const tho = l.replace(/unitLabel\(it\.unit\)/g, "");
    if (!/\bit\.unit\b/.test(tho)) continue;
    assert.match(tho, /chưa (được )?hỗ trợ/, `it.unit hiện thô (không qua unitLabel) ở dòng: ${l.trim().slice(0, 160)}`);
  }
  assert.ok(code.includes("unitLabel(it.unit)"), "màn dùng unitLabel");
  assert.deepEqual([unitLabel("perPax"), unitLabel("per5Pax")], ["theo người", "theo nhóm 5 khách/lượt"]);
});
