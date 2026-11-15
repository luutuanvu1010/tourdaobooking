// Tập route đóng của người đăng ký (ADR-0206 Đ6): mọi tệp dưới src/ gọi `docPhienDangKy` phải nằm đúng trong danh sách này.
// Thêm route dùng cookie đăng ký ⇒ thêm tệp vào đây (có chủ ý); lọt thêm tệp lạ hoặc mất tệp ⇒ đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");

/** Các tệp (ngoài phien.ts và bài kiểm) gọi docPhienDangKy. Bắt đầu rỗng; các task sau thêm. */
const ROUTE_DANG_KY: readonly string[] = [];

function tep(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tep(p) : p.endsWith(".ts") ? [p] : [];
  });
}

test("chỉ đúng danh sách tệp khai mới gọi docPhienDangKy (ADR-0206 Đ6)", () => {
  const goi = tep(SRC)
    .map((p) => relative(ROOT, p).split(sep).join("/"))
    .filter((p) => !p.endsWith(".test.ts") && p !== "src/modules/dang-ky/phien.ts")
    .filter((p) => /\bdocPhienDangKy\b/.test(readFileSync(join(ROOT, p), "utf8")));
  assert.deepEqual(goi.sort(), [...ROUTE_DANG_KY].sort());
});
