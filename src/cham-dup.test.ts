// Chủ báo 30/9: trên điện thoại, lỡ chạm hai lần liên tiếp làm trang phóng to. Canh: (1) `html` có `touch-action: manipulation`
// (tắt phóng to khi chạm đúp, vẫn cho hai ngón phóng to); (2) KHÔNG trang nào chặn phóng to hẳn (`user-scalable=no`, `maximum-scale=1`) — người mắt kém cần.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

test("html có touch-action: manipulation (không phóng to khi lỡ chạm đúp)", () => {
  const css = readFileSync("public/app.css", "utf8");
  const quyTacHtml = [...css.matchAll(/(^|\n)html\s*\{([^}]*)\}/g)].map((m) => m[2]).join(";");
  assert.match(quyTacHtml, /touch-action:\s*manipulation/);
});

test("không trang nào chặn phóng to bằng hai ngón (user-scalable=no / maximum-scale=1)", () => {
  const sai = readdirSync("public")
    .filter((f) => f.endsWith(".html"))
    .filter((f) => /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(readFileSync(`public/${f}`, "utf8")));
  assert.deepEqual(sai, []);
});
