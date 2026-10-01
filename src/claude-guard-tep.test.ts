// Bộ kiểm cho hàng rào "tệp cấm sửa" (.claude/hooks/guard-tep-lib.mjs + móc guard-tep.mjs, PreToolUse cho công cụ sửa tệp) — CLAUDE.md §7, §8.
// Ba luật trước đây chỉ dựa vào kỷ luật: (1) không sửa migration đã áp — ở đây siết thành "đã có trên main"; (2) không ghi tệp bí mật (.dev.vars, .env);
// (3) không sửa thẳng ở checkout gốc (phải ở git worktree riêng). Mỗi bài dựng một kho git GIẢ ở thư mục tạm (có nhánh main, một worktree) rồi hỏi hàng rào
// trên đường dẫn thật — có cả ca PHẢI CHẶN lẫn ca PHẢI CHO QUA. Đặc tả: docs/superpowers/specs/2026-10-01-ba-hook-moi.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { danhGiaSuaTep, khoChungCua } from "../.claude/hooks/guard-tep-lib.mjs";

const HERE = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function ghi(tep: string, noiDung = "x\n") {
  mkdirSync(dirname(tep), { recursive: true });
  writeFileSync(tep, noiDung);
}

/** Kho giả: checkout gốc ở nhánh main (có migrations/0001_a.sql, src/a.ts, .gitignore) + một worktree `.claude/worktrees/x` trên nhánh khác. */
function khoGia() {
  const goc = mkdtempSync(join(tmpdir(), "td-guard-tep-"));
  const git = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.name=thu", "-c", "user.email=thu@example.com", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(goc, "init", "-q", "-b", "main");
  ghi(join(goc, "migrations/0001_a.sql"), "CREATE TABLE a (id INTEGER);\n");
  ghi(join(goc, "src/a.ts"), "export const a = 1;\n");
  ghi(join(goc, ".dev.vars.example"), "SESSION_SECRET=\n");
  ghi(join(goc, ".gitignore"), "public/js/\n.dev.vars\n.claude/worktrees/\n");
  git(goc, "add", "-A");
  git(goc, "commit", "-q", "-m", "khởi tạo");
  const wt = join(goc, ".claude/worktrees/x");
  git(goc, "worktree", "add", "-q", "-b", "nhanh-x", wt);
  ghi(join(wt, "migrations/0002_b.sql"), "CREATE TABLE b (id INTEGER);\n"); // migration MỚI của nhánh, chưa có trên main
  return { goc, wt, khoChung: khoChungCua(goc) as string, don: () => rmSync(goc, { recursive: true, force: true }) };
}

test("guard-tep: migration đã có trên main bị chặn; migration mới của nhánh thì sửa được", () => {
  const k = khoGia();
  try {
    const hoi = (p: string, cwd = k.wt) => danhGiaSuaTep(p, { cwd, khoChung: k.khoChung });
    for (const p of [join(k.wt, "migrations/0001_a.sql"), "migrations/0001_a.sql", join(k.goc, "migrations/0001_a.sql")]) {
      const v = hoi(p);
      assert.equal(v.deny, true, `phải CHẶN: ${p}`);
      if (v.deny) {
        assert.equal(v.rule, "migration-da-len-main");
        assert.match(v.reason, /migration/);
      }
    }
    for (const p of [join(k.wt, "migrations/0002_b.sql"), join(k.wt, "migrations/0003_chua-co.sql"), join(k.wt, "migrations/README.md")]) assert.equal(hoi(p).deny, false, `phải CHO QUA: ${p}`);
  } finally {
    k.don();
  }
});

test("guard-tep: tệp bí mật (.dev.vars, .env, .env.*) bị chặn ở mọi nơi trong kho; tệp mẫu .example thì không", () => {
  const k = khoGia();
  try {
    const hoi = (p: string) => danhGiaSuaTep(p, { cwd: k.wt, khoChung: k.khoChung });
    for (const p of [join(k.wt, ".dev.vars"), join(k.goc, ".dev.vars"), join(k.wt, ".env"), join(k.wt, ".env.production"), join(k.wt, "web/.env.local"), join(k.wt, ".dev.vars.staging")]) {
      const v = hoi(p);
      assert.equal(v.deny, true, `phải CHẶN: ${p}`);
      if (v.deny) assert.equal(v.rule, "tep-bi-mat");
    }
    for (const p of [join(k.wt, ".dev.vars.example"), join(k.wt, ".env.example"), join(k.wt, "src/env.ts"), join(k.wt, "docs/dev.vars.md")]) assert.equal(hoi(p).deny, false, `phải CHO QUA: ${p}`);
  } finally {
    k.don();
  }
});

test("guard-tep: sửa thẳng ở checkout gốc bị chặn (tệp có sẵn, tệp mới, thư mục chưa tồn tại); trong worktree thì cho qua; tệp bị gitignore ở gốc cho qua", () => {
  const k = khoGia();
  try {
    const hoi = (p: string, cwd = k.goc) => danhGiaSuaTep(p, { cwd, khoChung: k.khoChung });
    for (const p of [join(k.goc, "src/a.ts"), "src/a.ts", join(k.goc, "src/moi.ts"), join(k.goc, "docs/a/b/c/moi.md"), join(k.goc, "README.md")]) {
      const v = hoi(p);
      assert.equal(v.deny, true, `phải CHẶN: ${p}`);
      if (v.deny) {
        assert.equal(v.rule, "checkout-goc");
        assert.match(v.reason, /worktree/);
      }
    }
    for (const p of [join(k.wt, "src/a.ts"), join(k.wt, "src/moi.ts"), join(k.wt, "docs/a/b/c/moi.md"), join(k.goc, "public/js/app.js")]) assert.equal(hoi(p).deny, false, `phải CHO QUA: ${p}`);
    assert.equal(hoi("src/a.ts", k.wt).deny, false, "đường dẫn tương đối tính theo thư mục hiện tại (worktree)");
  } finally {
    k.don();
  }
});

test("guard-tep: tệp ngoài kho, tệp của kho KHÁC, đầu vào thiếu — không phán", () => {
  const k = khoGia();
  const khac = khoGia();
  const ngoai = mkdtempSync(join(tmpdir(), "td-guard-tep-ngoai-"));
  try {
    const hoi = (p: unknown) => danhGiaSuaTep(p as string, { cwd: k.goc, khoChung: k.khoChung });
    for (const p of [join(ngoai, "ghi-chu.md"), join(ngoai, "a/b/.dev.vars"), join(khac.goc, "src/a.ts"), join(khac.goc, "migrations/0001_a.sql"), "", null, undefined, 42]) {
      assert.equal(hoi(p).deny, false, `phải CHO QUA: ${String(p)}`);
    }
    assert.equal(danhGiaSuaTep(join(k.goc, "src/a.ts"), { cwd: k.goc, khoChung: null }).deny, false, "không biết kho của mình thì không phán");
  } finally {
    k.don();
    khac.don();
    rmSync(ngoai, { recursive: true, force: true });
  }
});

test("guard-tep: script móc thật — chặn bằng JSON deny, im lặng khi cho qua / công cụ khác / đầu vào hỏng / tệp của kho khác", () => {
  const k = khoGia();
  try {
    const run = (stdin: string, env: Record<string, string> = { CLAUDE_PROJECT_DIR: k.goc }) => spawnSync("node", [".claude/hooks/guard-tep.mjs"], { cwd: HERE, input: stdin, encoding: "utf8", env: { ...process.env, ...env } });
    const vao = (tool_name: string, tool_input: Record<string, string>, cwd = k.wt) => JSON.stringify({ hook_event_name: "PreToolUse", tool_name, tool_input, cwd });
    for (const stdin of [
      vao("Edit", { file_path: join(k.wt, "migrations/0001_a.sql") }),
      vao("Write", { file_path: join(k.wt, ".dev.vars") }),
      vao("MultiEdit", { file_path: join(k.goc, "src/a.ts") }),
      vao("NotebookEdit", { notebook_path: join(k.goc, "so-tay.ipynb") }),
      vao("Write", { file_path: "src/moi.ts" }, k.goc),
    ]) {
      const r = run(stdin);
      assert.equal(r.status, 0, r.stderr);
      const out = JSON.parse(r.stdout || "{}");
      assert.equal(out.hookSpecificOutput?.hookEventName, "PreToolUse");
      assert.equal(out.hookSpecificOutput?.permissionDecision, "deny", `móc phải chặn: ${stdin}`);
      assert.match(out.hookSpecificOutput.permissionDecisionReason, /^Bị chặn: /);
    }
    for (const stdin of [vao("Edit", { file_path: join(k.wt, "src/a.ts") }), vao("Write", { file_path: join(k.wt, "migrations/0002_b.sql") }), vao("Read", { file_path: join(k.goc, "src/a.ts") }), vao("Bash", { command: "rm -rf src" }), vao("Edit", {}), "không phải JSON", ""]) {
      const r = run(stdin);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, "", `phải im lặng với: ${stdin.slice(0, 60)}`);
    }
    // Không có CLAUDE_PROJECT_DIR ⇒ móc lấy kho chứa chính nó; tệp của kho GIẢ là "kho khác" ⇒ không phán.
    const r = spawnSync("node", [".claude/hooks/guard-tep.mjs"], { cwd: HERE, input: vao("Edit", { file_path: join(k.goc, "src/a.ts") }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: "" } });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "");
  } finally {
    k.don();
  }
});

test("settings.json: khai móc guard-tep cho mọi công cụ sửa tệp (Edit, Write, MultiEdit, NotebookEdit)", () => {
  const s = JSON.parse(read(".claude/settings.json"));
  const nhom = (s.hooks?.PreToolUse ?? []).filter((h: { hooks: { command: string }[] }) => h.hooks.some((x) => x.command.includes(".claude/hooks/guard-tep.mjs")));
  assert.equal(nhom.length, 1, "phải có đúng một nhóm móc guard-tep");
  for (const congCu of ["Edit", "Write", "MultiEdit", "NotebookEdit"]) assert.match(congCu, new RegExp(`^(?:${nhom[0].matcher})$`), `matcher phải khớp ${congCu}`);
  assert.doesNotMatch("Bash", new RegExp(`^(?:${nhom[0].matcher})$`));
});
