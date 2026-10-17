// RÀO "không con số thời hạn" (ADR-0126 đ2: con số chờ luật sư; mã chỉ đọc từ dữ liệu chính sách). Phá thử: viết `row.erasure_days ?? 20` vào repository.ts → (1) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("..", import.meta.url));
const tep = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? tep(p) : /\.(ts|mjs|sql|jsonc)$/.test(p) && !/\.test\.ts$/.test(p) ? [p] : [];
});
const NGUON = [...tep(join(GOC, "src")), ...tep(join(GOC, "web")), ...tep(join(GOC, "migrations")), ...tep(join(GOC, "scripts")), join(GOC, "wrangler.jsonc")];
const TEN = "(erasure_days|session_retention_days|hanXuLyXoaNgay|hanGiuPhienNgay)";

test("(1) không giá trị dự phòng / gán số cho số ngày thời hạn ở mã, migration, cấu hình", () => {
  const sai = NGUON.filter((p) => new RegExp(`${TEN}\\s*(\\?\\?|\\|\\||=(?!=))\\s*\\d`).test(readFileSync(p, "utf8").replace(/\/\/.*$|--.*$/gm, "")));
  assert.deepEqual(sai, []);
});

test("(2) không DEFAULT cho hai cột, không INSERT chính sách trong migration", () => {
  for (const p of NGUON.filter((x) => x.endsWith(".sql"))) {
    const s = readFileSync(p, "utf8").replace(/--.*$/gm, "");
    assert.doesNotMatch(s, /(erasure_days|session_retention_days)[^,\n]*DEFAULT/i, p);
    assert.doesNotMatch(s, /INSERT\s+INTO\s+pty_privacy_policy/i, p);
  }
});

test("(3) hạn xử lý phiếu chỉ tính trong câu SQL đọc dòng chính sách (không tính ở TypeScript)", () => {
  const repo = readFileSync(join(GOC, "src/modules/parties/repository.ts"), "utf8");
  assert.match(repo, /'\+' \|\| p\.erasure_days \|\| ' days'/);
});
