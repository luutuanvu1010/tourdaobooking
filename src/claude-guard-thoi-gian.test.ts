// BÀI ĐO GIỜ của hook `guard-remote` — tách khỏi src/claude-guard.test.ts theo chủ "Trả lời lần 15" (30/9, "Cho bài này chạy riêng"): `npm test`
// (scripts/chay-test.mjs) chạy bộ kiểm chính SONG SONG trừ tệp này, rồi chạy tệp này MỘT MÌNH (`--test-concurrency=1`); một trong hai đỏ ⇒ `npm test` thoát ≠ 0.
// Lý do: Vận chuyển thêm ~400 bài chạy cùng lúc làm máy nóng — CPU đo được của chính tiến trình vượt ngưỡng dù hook không đổi. Ngưỡng và cách đo GIỮ
// NGUYÊN (1500 ms CPU, 3 lần lấy nhanh nhất). Chạy trực tiếp `node --test src/claude-guard-thoi-gian.test.ts` (hay glob cũ "src/**/*.test.ts") thì bài
// VẪN chạy — không có công tắc bỏ qua.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateBash, interpreterHeredocs, scriptPaths } from "../.claude/hooks/guard-remote-lib.mjs";

test("guard-remote: lệnh dị dạng không làm hook quá giờ (timeout 10 s của hook)", () => {
  // Đo thời gian CPU của chính tiến trình (process.cpuUsage), không đo đồng hồ: máy bận vì việc khác (nhiều phiên song song)
  // từng đẩy thời gian đồng hồ lên 2–2,3 s và chặn nhầm `day-len`/`trien-khai`, trong khi hook vẫn chạy ~0,6 s. evaluateBash chạy
  // đồng bộ, không chờ I/O, nên chậm thật của hook = tốn CPU và vẫn bị bắt. Ngưỡng giữ 1500 ms (chủ chọn 2026-09-24).
  // TIỀN ĐỀ: guard-remote-lib.mjs thuần, không import, không đọc tệp/execSync/Atomics.wait. Thêm chờ đồng bộ vào đó thì test
  // này BỎ LỌT (kiểm độc lập đã chứng minh bằng Atomics.wait 1 s) — khi ấy phải đo lại bằng đồng hồ hoặc thêm test riêng.
  // ĐO 3 LẦN, LẤY LẦN NHANH NHẤT (chủ dự án duyệt 2026-09-24): trên MacBook Air, chip tự hạ xung khi nóng/bận nên CÙNG một
  // việc có lúc tốn 1,2 s, có lúc 1,77 s CPU — một lần đo đơn lẻ từng chặn nhầm `day-len` hai lần liền. Hook chậm THẬT thì
  // cả ba lần đều chậm → vẫn đỏ; ngưỡng giữ nguyên 1500 ms.
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const cpu = process.cpuUsage();
    evaluateBash("echo " + "$(".repeat(3000), { branch: "worktree-x" });
    evaluateBash("x".repeat(500_000), { branch: "worktree-x" });
    // Luật docs/adr (30/9): đầu vào dị dạng CÓ chữ docs/adr để đi vào nhánh kiểm mới (lọc nhanh không bỏ qua được).
    evaluateBash("python3 docs/adr " + "open(a ".repeat(40_000), { branch: "worktree-x" });
    evaluateBash("echo > docs/adr/" + " > docs/adr".repeat(20_000), { branch: "worktree-x" });
    // scriptPaths chạy trong móc (sau hai bước deny, trước bước ask): nhiều cờ `--ab` từng làm nó quay lui mũ 2 (treo hook ⇒ luật bị bỏ qua).
    scriptPaths("node" + " --ab".repeat(40) + " ;" + " python3 -x".repeat(20_000));
    // Heredoc KHÔNG ĐÓNG lặp lại, sát MAX_LENGTH, có chữ docs/adr (người kiểm độc lập 5/10): bản regex cũ của interpreterHeredocs quét tới cuối chuỗi
    // cho mỗi `<<` — bậc hai, ~6 s CPU riêng hàm này. Đo RIÊNG hàm (stripHeredocs của phần deny có chi phí tương tự từ trước — nợ ghi ở sổ hàng rào).
    interpreterHeredocs("cat docs/adr/x\n" + "python3 <<A\n".repeat(16_000));
    interpreterHeredocs("cat docs/adr/x\n" + "y <<A\n".repeat(33_000));
    const used = process.cpuUsage(cpu);
    runs.push(Math.round((used.user + used.system) / 1000));
  }
  const ms = Math.min(...runs);
  assert.ok(ms < 1500, `quá chậm: lần nhanh nhất ${ms} ms CPU (3 lần: ${runs.join(", ")} ms)`);
});
