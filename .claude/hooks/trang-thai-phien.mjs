#!/usr/bin/env node
// Móc SessionStart — "trang trạng thái do máy sinh" (đăng ký ở .claude/settings.json; kế hoạch 2026-11-15 việc 2.3). In văn bản thường ra stdout
// (Claude Code đưa vào ngữ cảnh phiên). Luôn thoát 0: lỗi ở bước nào thì bỏ bước đó (thư viện tự lo); lỗi ngoài dự kiến thì in một dòng và thoát 0.
// Kho được xét: `cwd` trong JSON đầu vào, không có thì CLAUDE_PROJECT_DIR, không có nữa thì thư mục đang đứng. Không có công tắc tạm.
import { readFileSync } from "node:fs";
import { taoTrangThai } from "./trang-thai-phien-lib.mjs";

// Lưới an toàn: dù có gì treo, móc tự thoát trước trần 10 giây của settings.json.
setTimeout(() => process.exit(0), 8000).unref();

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8")) ?? {};
} catch {
  input = {};
}
const root = (typeof input.cwd === "string" && input.cwd) || process.env.CLAUDE_PROJECT_DIR || process.cwd();
try {
  process.stdout.write(`${await taoTrangThai({ root })}\n`);
} catch (e) {
  process.stdout.write(`Trang trạng thái do máy sinh: lỗi nội bộ, bỏ qua (${e instanceof Error ? e.message : String(e)}).\n`);
}
process.exit(0);
