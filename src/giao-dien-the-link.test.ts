import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
test("mọi trang nạp /giao-dien.css (KHÔNG nằm dưới /api — ADR-0102, để service worker đệm được) NGAY SAU /app.css (ADR-0087)", () => {
  const thieu = readdirSync(new URL("../public/", import.meta.url)).filter((f) => f.endsWith(".html"))
    .filter((f) => !readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8").includes('<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/giao-dien.css">'));
  assert.deepEqual(thieu, []);
});
