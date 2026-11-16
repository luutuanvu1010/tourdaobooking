#!/usr/bin/env node
// `npm run day-len [-- <nhánh>]` — CHỦ DỰ ÁN tự gõ trong terminal (AI không được chạy: CLAUDE.md §8, hook guard-remote chặn).
// Gộp tiến thẳng <nhánh> vào main (nếu có), HỎI HẾT ngay đầu (lý do đổi luật / quy trình kiểm, tóm tắt, câu c/x/k — ADR-0215), đẩy đúng commit lên nhánh
// chờ kiểm `cho-kiem/<mã>`, chờ GitHub kiểm đủ bộ (ADR-0179), ghi bản ghi kết luận vào .git/tourdao-kiem/, rồi `git push origin main`.
// Chọn `c`: lệnh tự chạy tới khi xong, giữ máy thức (caffeinate) và báo bằng thông báo macOS. Đặc tả: docs/superpowers/specs/2026-11-16-kiem-nhanh-a-b.md.
// Logic: scripts/release-lib.mjs.
import { spawn } from "node:child_process";
import { dayLen } from "./release-lib.mjs";
import { ask, isTTY, log, run } from "./release-shell.mjs";

/** Thông báo macOS kèm tiếng (cùng cách hook báo tin cấp máy). Chữ đi qua tham số (argv), không ghép vào mã AppleScript. Lỗi gì cũng bỏ qua. */
function thongBao(tieuDe, noiDung) {
  try {
    const p = spawn("osascript", ["-e", "on run argv", "-e", 'display notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"', "-e", "end run", String(tieuDe), String(noiDung)], { stdio: "ignore" });
    p.on("error", () => {});
  } catch {
    /* không có osascript (không phải macOS) — bỏ qua */
  }
}

/** Giữ máy thức tới khi CHÍNH tiến trình này thoát (`caffeinate -w <pid>` tự dừng theo). Lỗi gì cũng bỏ qua. */
function giuThuc() {
  try {
    const p = spawn("caffeinate", ["-i", "-w", String(process.pid)], { stdio: "ignore", detached: true });
    p.on("error", () => {});
    p.unref();
  } catch {
    /* không có caffeinate (không phải macOS) — bỏ qua */
  }
}

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length > 1) {
  log("Dùng: npm run day-len [-- <tên-nhánh>]");
  process.exit(1);
}
process.exitCode = await dayLen({ run, ask, isTTY, log, target: args[0], thongBao, giuThuc });
