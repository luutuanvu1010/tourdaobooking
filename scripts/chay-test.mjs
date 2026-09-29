// `npm test` — chủ "Trả lời lần 15" (30/9, "Cho bài này chạy riêng"):
//   bước 1: bộ kiểm chính, SONG SONG như cũ — mọi tệp của glob "src/**/*.test.ts" (fs.globSync, cùng nghĩa glob của `node --test`) TRỪ bài đo giờ của hook;
//   bước 2: bài đo giờ của hook (src/claude-guard-thoi-gian.test.ts) chạy MỘT MÌNH (`--test-concurrency=1`), sau bộ chính.
// Thoát ≠ 0 nếu một trong hai bước đỏ (bước 2 vẫn chạy khi bước 1 đỏ — thấy đủ kết quả). Không bỏ qua bài nào: tệp đo giờ phải CÓ trong glob (đổi tên /
// xoá mà quên sửa ở đây → dừng với lỗi, không lặng lẽ chạy thiếu). Kịch bản phát hành (scripts/release-lib.mjs) gọi `npm test` nên tự hưởng thay đổi.
import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEP_DO_GIO = "src/claude-guard-thoi-gian.test.ts";

const tatCa = globSync("src/**/*.test.ts", { cwd: ROOT }).map((f) => f.split("\\").join("/")).sort();
if (!tatCa.includes(TEP_DO_GIO)) {
  console.error(`✘ Không thấy ${TEP_DO_GIO} trong glob "src/**/*.test.ts" — sửa scripts/chay-test.mjs (không chạy thiếu bài đo giờ).`);
  process.exit(2);
}
const chinh = tatCa.filter((f) => f !== TEP_DO_GIO);

console.log(`▶ Bước 1/2 — bộ kiểm chính (${chinh.length} tệp, song song; trừ ${TEP_DO_GIO})`);
const b1 = spawnSync(process.execPath, ["--test", ...chinh], { cwd: ROOT, stdio: "inherit" });
console.log(`\n▶ Bước 2/2 — bài đo giờ của hook, chạy MỘT MÌNH (${TEP_DO_GIO}, --test-concurrency=1)`);
const b2 = spawnSync(process.execPath, ["--test", "--test-concurrency=1", TEP_DO_GIO], { cwd: ROOT, stdio: "inherit" });

const ma = (r) => (r.status === null ? 1 : r.status);
console.log(`\n── npm test: bước 1 thoát ${ma(b1)}, bước 2 thoát ${ma(b2)}`);
process.exit(ma(b1) !== 0 ? ma(b1) : ma(b2));
