import { test } from "node:test";
import assert from "node:assert/strict";
import { css } from "./http.ts";

test("css(): text/css utf-8, mặc định no-cache (hỏi lại theo ETag), giữ header thêm", async () => {
  const r = css(":root{}", 200, { etag: '"v3"' });
  assert.equal(r.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(r.headers.get("cache-control"), "no-cache");
  assert.equal(r.headers.get("etag"), '"v3"');
  assert.equal(await r.text(), ":root{}");
});
