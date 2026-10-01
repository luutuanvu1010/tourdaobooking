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

// Bước 0 (ADR-0070 điều 3): sinh lại kho tri thức của trợ lý (sơ đồ trang, bố cục, cấu trúc app) TRƯỚC khi chạy bài — bài luôn chạy trên bản khớp mã.
// Bộ sinh lỗi (thiếu tên lời thường, chữ có tên kỹ thuật) ⇒ npm test đỏ. Tệp sinh vừa ĐỔI (trong git đang cũ) ⇒ vẫn chạy bài trên bản mới, rồi thoát ≠ 0
// để người sửa commit tệp sinh (thay cho bài "chạy lại ra đúng tệp", bài đó xanh hiển nhiên sau bước này).
let sinhLoi = null;
let sinhDoi = [];
try {
  const { ghiTatCa } = await import("./sinh-so-do-trang.mjs");
  sinhDoi = ghiTatCa();
  console.log(sinhDoi.length ? `▶ Bước 0 — đã sinh lại kho trợ lý: ${sinhDoi.join(", ")}` : "▶ Bước 0 — kho trợ lý khớp mã");
} catch (e) {
  sinhLoi = e instanceof Error ? e.message : String(e);
  console.error(`✘ Bước 0 — bộ sinh kho trợ lý lỗi: ${sinhLoi}`);
}

console.log(`▶ Bước 1/2 — bộ kiểm chính (${chinh.length} tệp, song song; trừ ${TEP_DO_GIO})`);
const b1 = spawnSync(process.execPath, ["--test", ...chinh], { cwd: ROOT, stdio: "inherit" });
console.log(`\n▶ Bước 2/2 — bài đo giờ của hook, chạy MỘT MÌNH (${TEP_DO_GIO}, --test-concurrency=1)`);
const b2 = spawnSync(process.execPath, ["--test", "--test-concurrency=1", TEP_DO_GIO], { cwd: ROOT, stdio: "inherit" });

const ma = (r) => (r.status === null ? 1 : r.status);
console.log(`\n── npm test: bước 1 thoát ${ma(b1)}, bước 2 thoát ${ma(b2)}`);
if (sinhLoi) {
  console.error(`✘ npm test ĐỎ vì bộ sinh kho trợ lý lỗi (bước 0): ${sinhLoi}`);
  process.exit(1);
}
if (sinhDoi.length) {
  console.error(`✘ npm test ĐỎ: đã sinh lại ${sinhDoi.join(", ")} — tệp trong git đang cũ so với mã. Commit các tệp này rồi chạy lại (lần sau sẽ xanh).`);
  process.exit(1);
}
process.exit(ma(b1) !== 0 ? ma(b1) : ma(b2));
