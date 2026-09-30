// Chủ quyết 30/9 "khoá chức năng phóng" (sau khi AI nêu một lần: người mắt kém sẽ không phóng to được — chủ vẫn chọn khoá).
// Ba lớp, vì iOS có thể bỏ qua viewport user-scalable=no: (1) viewport mọi trang; (2) `html { touch-action: pan-x pan-y }`; (3) chặn gesturestart ở web/pwa.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

test("mọi trang khoá phóng to ở viewport (maximum-scale=1, user-scalable=no)", () => {
  const thieu = readdirSync("public")
    .filter((f) => f.endsWith(".html"))
    .filter((f) => {
      const vp = readFileSync(`public/${f}`, "utf8").match(/name="viewport" content="([^"]*)"/)?.[1] ?? "";
      return !/maximum-scale=1\b/.test(vp) || !/user-scalable=no\b/.test(vp);
    });
  assert.deepEqual(thieu, []);
});

test("html chỉ cho cuộn (touch-action: pan-x pan-y) — không phóng to bằng chạm đúp hay hai ngón", () => {
  const css = readFileSync("public/app.css", "utf8");
  const quyTacHtml = [...css.matchAll(/(^|\n)html\s*\{([^}]*)\}/g)].map((m) => m[2]).join(";");
  assert.match(quyTacHtml, /touch-action:\s*pan-x pan-y/);
});

test("web/pwa.ts chặn cử chỉ chụm (gesturestart) và được gọi khi đăng ký service worker", () => {
  const src = readFileSync("web/pwa.ts", "utf8");
  assert.match(src, /gesturestart/);
  assert.match(src, /registerServiceWorker\(\): void \{\n\s*khoaPhongTo\(\);/);
});
