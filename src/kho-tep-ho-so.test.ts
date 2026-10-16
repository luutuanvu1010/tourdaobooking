// HÀNG RÀO KHO TỆP HỒ SƠ (ADR-0123; Hiến chương 5.22; kế hoạch 2026-10-16-goi-2-h2-kho-tep). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/parties/ (không kể *.test.ts) nhắc tới binding HO_SO — module khác muốn tệp thì gọi hàm công bố của parties;
//   (2) không có đường dẫn ký sẵn (presign / X-Amz-) ở bất kỳ đâu trong src/ — đường dẫn ký sẵn qua mặt can() lúc tải.
// Task 4 thêm (3), (4): thứ tự trong route tải xuống / tải lên.
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý (đổi tên biến env, gọi qua hàm trung gian ở tệp khác của parties vẫn qua) — đọc mã vẫn là việc của người kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("./", import.meta.url));
function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tepTs(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}
const TEP = tepTs(SRC).map((p) => ({ p: relative(SRC, p).replaceAll("\\", "/"), src: readFileSync(p, "utf8") }));

test("(1) binding HO_SO chỉ được nhắc trong src/modules/parties/", () => {
  const ngoai = TEP.filter((f) => /\bHO_SO\b/.test(f.src) && !f.p.startsWith("modules/parties/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài parties chạm kho tệp hồ sơ");
});

test("(2) không có đường dẫn ký sẵn của R2 trong src/", () => {
  const co = TEP.filter((f) => /presign|X-Amz-|createSignedUrl|signedUrl/i.test(f.src)).map((f) => f.p);
  assert.deepEqual(co, []);
});
