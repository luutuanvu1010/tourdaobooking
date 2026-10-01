// Bộ kiểm cho "cổng xanh" (.claude/hooks/cong-xanh-lib.mjs + móc cong-xanh.mjs, sự kiện Stop của phiên chính) — CLAUDE.md §4 "Không nói xong khi
// test/typecheck chưa chạy hoặc đỏ". Trước đây bộ kiểm chỉ chạy khi AI nhớ chạy (kho không có CI, không có git hook). Cổng: cây làm việc KHÁC main (có
// commit riêng hoặc thay đổi chưa commit) thì lúc AI định dừng, máy tự chạy kiểm kiểu + bộ kiểm chính; đỏ ⇒ giữ AI lại kèm tên bài đỏ. Lối ra duy nhất khi
// chưa xanh: câu trả lời cuối ghi nguyên văn "BỘ KIỂM CHƯA XANH" (chủ dự án luôn biết sự thật). Mỗi bài dựng một kho git GIẢ ở thư mục tạm.
// Đặc tả: docs/superpowers/specs/2026-10-01-ba-hook-moi.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAU_KHAI, TEP_DO_GIO, canhCong, chayBoKiem, trangThaiCay } from "../.claude/hooks/cong-xanh-lib.mjs";
import { khoChungCua } from "../.claude/hooks/guard-tep-lib.mjs";

const HERE = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function ghi(tep: string, noiDung = "x\n") {
  mkdirSync(dirname(tep), { recursive: true });
  writeFileSync(tep, noiDung);
}
const gitO = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.name=thu", "-c", "user.email=thu@example.com", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Kho giả có `npm run typecheck` (đỏ khi có tệp `kieu-do`) và một bài kiểm (đỏ khi có tệp `bai-do`); bài đo giờ giả LUÔN đỏ (cổng phải bỏ qua nó).
 * Checkout gốc ở main + worktree `.claude/worktrees/x` trên nhánh khác, lúc đầu giống hệt main. */
function khoGia() {
  const goc = mkdtempSync(join(tmpdir(), "td-cong-xanh-"));
  gitO(goc, "init", "-q", "-b", "main");
  ghi(join(goc, "package.json"), JSON.stringify({ name: "kho-gia", private: true, type: "module", scripts: { typecheck: "node kiem-kieu.mjs" } }));
  ghi(join(goc, "kiem-kieu.mjs"), 'import { existsSync } from "node:fs";\nif (existsSync("kieu-do")) { console.log("src/a.ts(1,1): error TS2322: kiểu giả không khớp."); process.exit(2); }\n');
  ghi(join(goc, "src/a.test.ts"), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { existsSync } from "node:fs";\ntest("bài giả A", () => assert.equal(existsSync(new URL("../bai-do", import.meta.url)), false));\n');
  ghi(join(goc, TEP_DO_GIO), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("bài đo giờ giả luôn đỏ", () => assert.fail("cổng không được chạy bài này"));\n');
  ghi(join(goc, ".gitignore"), ".claude/worktrees/\n");
  gitO(goc, "add", "-A");
  gitO(goc, "commit", "-q", "-m", "khởi tạo");
  const wt = join(goc, ".claude/worktrees/x");
  gitO(goc, "worktree", "add", "-q", "-b", "nhanh-x", wt);
  return { goc, wt, khoChung: khoChungCua(goc) as string, don: () => rmSync(goc, { recursive: true, force: true }) };
}

/** Bộ chạy giả: đếm số lần được gọi, trả kết quả đặt sẵn. */
function chayGia(ketQua: { xanh: boolean; tomTat: string }) {
  const dem = { lan: 0 };
  return { dem, chay: () => (dem.lan++, ketQua) };
}
const DO = { xanh: false, tomTat: "Bộ kiểm chính: ĐỎ — bài giả A" };
const XANH = { xanh: true, tomTat: "" };

test("cổng xanh: cây giống hệt main và sạch thì KHÔNG chạy gì, cho dừng (phiên hỏi đáp không bị chậm)", () => {
  const k = khoGia();
  try {
    for (const cwd of [k.wt, k.goc, join(k.wt, "src")]) {
      const g = chayGia(DO);
      assert.deepEqual(canhCong({ hook_event_name: "Stop", cwd }, { khoChung: k.khoChung, chay: g.chay }), { chan: false });
      assert.equal(g.dem.lan, 0, `không được chạy bộ kiểm ở ${cwd}`);
    }
    assert.equal(trangThaiCay(k.wt).khac, false);
  } finally {
    k.don();
  }
});

test("cổng xanh: có thay đổi + bộ kiểm ĐỎ ⇒ giữ lại, lý do có tên bài đỏ và câu phải khai; cùng trạng thái thì không chạy lại; đổi mã thì chạy lại", () => {
  const k = khoGia();
  try {
    ghi(join(k.wt, "src/a.ts"), "export const a = 1;\n"); // thay đổi chưa commit (tệp mới)
    assert.equal(trangThaiCay(k.wt).khac, true);
    const g = chayGia(DO);
    const hoi = (them: Record<string, unknown> = {}) => canhCong({ hook_event_name: "Stop", cwd: k.wt, last_assistant_message: "Đã làm xong.", ...them }, { khoChung: k.khoChung, chay: g.chay });
    const v = hoi();
    assert.equal(v.chan, true);
    if (v.chan) {
      assert.match(v.lyDo, /bài giả A/);
      assert.ok(v.lyDo.includes(CAU_KHAI), "lý do phải nêu câu cần khai");
      assert.match(v.lyDo, /claude-cong-xanh\.log/, "lý do phải chỉ tới nhật ký đầy đủ");
    }
    assert.equal(g.dem.lan, 1);
    assert.equal(hoi({ stop_hook_active: true }).chan, true, "lần dừng kế tiếp vẫn bị giữ");
    assert.equal(g.dem.lan, 1, "cùng trạng thái mã thì dùng kết quả đã nhớ, không chạy lại");
    ghi(join(k.wt, "src/a.ts"), "export const a = 2;\n"); // đổi nội dung tệp chưa theo dõi ⇒ dấu vân khác
    hoi();
    assert.equal(g.dem.lan, 2, "mã đổi thì phải chạy lại");
  } finally {
    k.don();
  }
});

test("cổng xanh: chưa xanh mà câu trả lời cuối KHAI nguyên văn thì cho dừng; không khai thì không; thiếu câu trả lời + đang lặp thì cho qua có khai", () => {
  const k = khoGia();
  try {
    ghi(join(k.wt, "src/a.test.ts"), "// sửa dở\n");
    const g = chayGia(DO);
    const hoi = (input: Record<string, unknown>) => canhCong({ hook_event_name: "Stop", cwd: k.wt, ...input }, { khoChung: k.khoChung, chay: g.chay });
    assert.equal(hoi({ last_assistant_message: "Xong rồi, mọi thứ ổn." }).chan, true);
    assert.equal(hoi({ last_assistant_message: "Bộ kiểm còn đỏ một bài." }).chan, true, "nói chệch câu thì không tính");
    assert.equal(hoi({ last_assistant_message: `Chưa xong.\n\n${CAU_KHAI}: bài giả A, đang chờ chủ trả lời.` }).chan, false);
    assert.equal(hoi({ last_assistant_message: "bộ  kiểm chưa\nxanh — bài giả A" }).chan, false, "không phân biệt hoa thường và khoảng trắng");
    assert.equal(hoi({ last_assistant_message: "bộ kiểm chưa xanh".normalize("NFD") }).chan, false, "không phân biệt dạng tổ hợp dấu");
    assert.equal(hoi({}).chan, true, "thiếu câu trả lời, chưa lặp ⇒ vẫn giữ");
    assert.equal(hoi({ last_assistant_message: "  \n" }).chan, true, "câu trả lời rỗng, chưa lặp ⇒ vẫn giữ");
    for (const thieu of [{}, { last_assistant_message: "" }, { last_assistant_message: " \n " }]) {
      const v = hoi({ ...thieu, stop_hook_active: true });
      assert.equal(v.chan, false, "thiếu/rỗng câu trả lời + đang lặp ⇒ cho qua (không khoá phiên)");
      assert.match((v as { ghiChu?: string }).ghiChu ?? "", /cho qua có khai/);
    }
    assert.equal(hoi({ last_assistant_message: "Xong.", stop_hook_active: true }).chan, true, "CÓ câu trả lời mà không khai thì đang lặp vẫn giữ");
  } finally {
    k.don();
  }
});

test("cổng xanh: xanh thì cho dừng và nhớ kết quả; commit riêng trên nhánh (cây sạch) vẫn tính là khác main; checkout gốc bẩn cũng bị canh", () => {
  const k = khoGia();
  try {
    ghi(join(k.wt, "src/b.ts"), "export const b = 1;\n");
    gitO(k.wt, "add", "-A");
    gitO(k.wt, "commit", "-q", "-m", "thêm b");
    assert.equal(trangThaiCay(k.wt).khac, true, "có commit đi trước main");
    const g = chayGia(XANH);
    const hoi = (cwd: string) => canhCong({ hook_event_name: "Stop", cwd, last_assistant_message: "Xong." }, { khoChung: k.khoChung, chay: g.chay });
    assert.deepEqual(hoi(k.wt), { chan: false });
    assert.deepEqual(hoi(k.wt), { chan: false });
    assert.equal(g.dem.lan, 1, "đã xanh với đúng trạng thái này thì không chạy lại");
    const dau = trangThaiCay(k.wt).dauVan;
    gitO(k.wt, "update-ref", "refs/remotes/origin/main", "HEAD"); // main trên mạng đã có commit này (main cục bộ còn chậm) ⇒ không còn "đi trước"
    assert.equal(trangThaiCay(k.wt).khac, false, "worktree trùng origin/main và sạch thì không tính là khác");
    ghi(join(k.wt, "src/b.ts"), "export const b = 2;\n");
    assert.equal(trangThaiCay(k.wt).khac, true);
    assert.notEqual(trangThaiCay(k.wt).dauVan, dau, "sửa tệp đã theo dõi ⇒ dấu vân khác");

    const g2 = chayGia(DO);
    ghi(join(k.goc, "src/a.test.ts"), "// sửa thẳng ở gốc\n");
    assert.equal(canhCong({ hook_event_name: "Stop", cwd: k.goc, last_assistant_message: "Xong." }, { khoChung: k.khoChung, chay: g2.chay }).chan, true);
  } finally {
    k.don();
  }
});

test("cổng xanh: thư mục ngoài kho, kho KHÁC, đầu vào thiếu — không phán, không chạy", () => {
  const k = khoGia();
  const khac = khoGia();
  const ngoai = mkdtempSync(join(tmpdir(), "td-cong-xanh-ngoai-"));
  try {
    ghi(join(khac.wt, "src/a.ts"), "x\n");
    const g = chayGia(DO);
    for (const cwd of [ngoai, khac.wt, join(ngoai, "khong-co"), undefined, ""]) {
      assert.deepEqual(canhCong({ hook_event_name: "Stop", cwd }, { khoChung: k.khoChung, chay: g.chay }), { chan: false }, String(cwd));
    }
    assert.deepEqual(canhCong({ hook_event_name: "Stop", cwd: khac.wt }, { khoChung: null, chay: g.chay }), { chan: false });
    assert.equal(g.dem.lan, 0);
  } finally {
    k.don();
    khac.don();
    rmSync(ngoai, { recursive: true, force: true });
  }
});

test("cổng xanh: bộ chạy THẬT — xanh khi kiểm kiểu và bài kiểm đạt (bỏ qua bài đo giờ); đỏ kèm tên bài / dòng lỗi kiểu khi hỏng", () => {
  const k = khoGia();
  try {
    const log = join(k.goc, "nhat-ky.log");
    const xanh = chayBoKiem(k.wt, log);
    assert.equal(xanh.xanh, true, `${xanh.tomTat}\n${existsSync(log) ? readFileSync(log, "utf8") : ""}`);
    ghi(join(k.wt, "bai-do"));
    const doBai = chayBoKiem(k.wt, log);
    assert.equal(doBai.xanh, false);
    assert.match(doBai.tomTat, /bài giả A/);
    assert.doesNotMatch(doBai.tomTat, /đo giờ giả/, "bài đo giờ không thuộc cổng");
    assert.match(readFileSync(log, "utf8"), /not ok/);
    ghi(join(k.wt, "kieu-do"));
    const doCaHai = chayBoKiem(k.wt, log);
    assert.equal(doCaHai.xanh, false);
    assert.match(doCaHai.tomTat, /error TS2322/);
    assert.match(doCaHai.tomTat, /bài giả A/, "kiểm kiểu đỏ vẫn chạy tiếp bộ kiểm để thấy đủ");
  } finally {
    k.don();
  }
});

test("cổng xanh: script móc thật — đỏ thì in JSON block, khai đúng câu / xanh / sự kiện khác / đầu vào hỏng thì im lặng", () => {
  const k = khoGia();
  try {
    const run = (stdin: string) => spawnSync("node", [".claude/hooks/cong-xanh.mjs"], { cwd: HERE, input: stdin, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: k.goc } });
    const vao = (them: Record<string, unknown>) => JSON.stringify({ hook_event_name: "Stop", cwd: k.wt, last_assistant_message: "Xong.", ...them });
    ghi(join(k.wt, "bai-do"));
    const r = run(vao({}));
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /bài giả A/);
    assert.ok(out.reason.includes(CAU_KHAI));
    // Trợ lý con (SubagentStop) cố ý KHÔNG bị canh: báo cáo của nó đi qua SubagentHandback, câu khai không tới được cổng (kiểm độc lập I-1).
    for (const stdin of [vao({ last_assistant_message: `${CAU_KHAI}: bài giả A.` }), vao({ hook_event_name: "SubagentStop" }), vao({ hook_event_name: "PreToolUse" }), "không phải JSON", ""]) {
      const q = run(stdin);
      assert.equal(q.status, 0, q.stderr);
      assert.equal(q.stdout, "", `phải im lặng với: ${stdin.slice(0, 60)}`);
    }
    rmSync(join(k.wt, "bai-do"));
    ghi(join(k.wt, "src/moi.ts"), "export const moi = 1;\n");
    const ok = run(vao({}));
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, "", "xanh thì im lặng");
  } finally {
    k.don();
  }
});

test("cổng xanh: bài đo giờ bị loại khỏi cổng là ĐÚNG tệp mà npm test chạy riêng; câu khai cố định", () => {
  assert.match(read("scripts/chay-test.mjs"), new RegExp(`const TEP_DO_GIO = "${TEP_DO_GIO.replaceAll("/", "\\/").replaceAll(".", "\\.")}";`));
  assert.equal(CAU_KHAI, "BỘ KIỂM CHƯA XANH");
  const lib = read(".claude/hooks/cong-xanh-lib.mjs") + read(".claude/hooks/cong-xanh.mjs");
  assert.doesNotMatch(lib, /process\.env\.(?!CLAUDE_PROJECT_DIR\b)\w+/, "cổng không có công tắc bằng biến môi trường (chỉ đọc CLAUDE_PROJECT_DIR)");
});

test("settings.json: khai cổng xanh cho Stop (hạn chờ đủ dài); KHÔNG khai cho SubagentStop", () => {
  const s = JSON.parse(read(".claude/settings.json"));
  const mocCua = (suKien: string) =>
    (s.hooks?.[suKien] ?? []).flatMap((n: { matcher?: string; hooks: { command: string; timeout?: number }[] }) => n.hooks.map((h) => ({ ...h, matcher: n.matcher }))).filter((h: { command: string }) => h.command.includes(".claude/hooks/cong-xanh.mjs"));
  const cong = mocCua("Stop");
  assert.equal(cong.length, 1, "Stop: phải có đúng một móc cổng xanh");
  assert.ok(!cong[0].matcher, "Stop không dùng matcher (móc phải chạy ở mọi lần dừng)");
  assert.ok((cong[0].timeout ?? 0) >= 1200, "hạn chờ của móc phải ≥ 1200 giây (kiểm kiểu tối đa 5 phút + bộ kiểm tối đa 12 phút)");
  // Bật cổng cho trợ lý con thì phải giải được I-1 trước (câu khai nằm trong báo cáo SubagentHandback, móc SubagentStop không đọc được).
  assert.equal(mocCua("SubagentStop").length, 0, "chưa canh trợ lý con — xem đặc tả mục Giới hạn");
});
