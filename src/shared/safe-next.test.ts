import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

const BASE = "https://sales.tourdao.vn/login";
const lands = (next: string | null) => new URL(safeNext(next), BASE);

test("giữ đường dẫn nội bộ hợp lệ", () => {
  for (const p of ["/", "/order?id=0f8c2a1e-1111-4222-8333-944455556666", "/order-form", "/audit?action=created&q=TD-2026", "/staff#x"]) {
    assert.equal(safeNext(p), p);
  }
});

test("chặn chuyển hướng ra ngoài (open redirect)", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "\\\\evil.com", "https://evil.com", "evil.com", "/%0d%0a", "/ evil", "/\tevil", "/\u0000", "javascript:alert(1)", "", null]) {
    const url = lands(bad);
    assert.equal(url.origin, "https://sales.tourdao.vn", `thoát ra ngoài với ${JSON.stringify(bad)} → ${url.href}`);
  }
  assert.equal(safeNext("/\\evil.com"), "/");
  assert.equal(safeNext("//evil.com"), "/");
});
