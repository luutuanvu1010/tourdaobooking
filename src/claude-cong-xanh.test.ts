// Bộ kiểm cho "cổng xanh bản nhẹ" — móc Stop (.claude/hooks/cong-xanh-lib.mjs + cong-xanh.mjs), kế hoạch 2026-11-15 việc 2.2.
// Mỗi ca dựng một kho git GIẢ ở thư mục tạm (nhánh main + nhánh làm việc; package.json có lệnh typecheck giả) rồi hỏi cổng thật: cổng chạy `npm run typecheck`
// và `node --test` các *.test.ts nằm trong THƯ MỤC có tệp đổi (so với main, cộng phần chưa lưu). Không ca nào chạy `npm test` đủ bộ hay bài của kho thật.
// Trần thời gian tiêm qua tham số thư viện (`tranMs`), không qua biến môi trường.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { canhCong, tepDoi, TRAN_MS, TOI_DA_BAI } from "../.claude/hooks/cong-xanh-lib.mjs";
import { khoChungCua } from "../.claude/hooks/guard-tep-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const git = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.name=thu", "-c", "user.email=thu@example.com", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
function ghi(tep: string, noiDung: string) {
  mkdirSync(dirname(tep), { recursive: true });
  writeFileSync(tep, noiDung);
}
const BAI_XANH = 'import { test } from "node:test";\ntest("xanh", () => {});\n';
const baiDo = (ten: string) => `import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest(${JSON.stringify(ten)}, () => { assert.equal(1, 2); });\n`;

/** Kho giả: main có package.json (typecheck giả), src/a.ts + src/a.test.ts xanh, lib/hong.test.ts ĐỎ (thư mục khác — chỉ chạy khi lib/ có tệp đổi). Đứng ở nhánh `lam`. */
function khoGia(typecheck = "node -e 0") {
  const dir = mkdtempSync(join(tmpdir(), "td-cong-xanh-"));
  git(dir, "init", "-q", "-b", "main");
  ghi(join(dir, "package.json"), JSON.stringify({ name: "thu", private: true, scripts: { typecheck } }));
  ghi(join(dir, "src/a.ts"), "export const a = 1;\n");
  ghi(join(dir, "src/a.test.ts"), BAI_XANH);
  ghi(join(dir, "lib/hong.test.ts"), baiDo("bài cũ đỏ ở thư mục khác"));
  ghi(join(dir, "docs/x.md"), "x\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "khởi tạo");
  git(dir, "checkout", "-q", "-b", "lam");
  return { dir, khoChung: khoChungCua(dir) as string, don: () => rmSync(dir, { recursive: true, force: true }) };
}
const hoi = (k: { dir: string; khoChung: string }, them: Record<string, unknown> = {}, tranMs?: number) => canhCong({ cwd: k.dir, stop_hook_active: false, ...them }, { khoChung: k.khoChung, ...(tranMs ? { tranMs } : {}) });

test("cổng xanh: hằng số đúng kế hoạch (trần 90 giây, tối đa 10 tên bài đỏ)", () => {
  assert.equal(TRAN_MS, 90_000);
  assert.equal(TOI_DA_BAI, 10);
});

test("cổng xanh: cây giống main, sạch → im lặng (không chạy gì)", () => {
  const k = khoGia("node -e \"process.exit(1)\""); // typecheck đỏ: nếu cổng lỡ chạy thì sẽ chặn
  try {
    assert.deepEqual(hoi(k), { chan: false });
  } finally {
    k.don();
  }
});

test("cổng xanh: tệp đổi = so với main (đã lưu) + phần chưa lưu + tệp mới; không tính thư mục không đổi", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/a.ts"), "export const a = 2;\n");
    git(k.dir, "commit", "-q", "-am", "đổi a");
    ghi(join(k.dir, "docs/x.md"), "y\n");
    ghi(join(k.dir, "web/moi.ts"), "export {};\n");
    assert.deepEqual(tepDoi(k.dir)?.sort(), ["docs/x.md", "src/a.ts", "web/moi.ts"]);
  } finally {
    k.don();
  }
});

test("cổng xanh: đổi tệp ở thư mục có bài ĐỎ → chặn, nêu tên bài đỏ (tối đa 10, phần dư ghi số)", () => {
  const k = khoGia();
  try {
    const ten = Array.from({ length: 12 }, (_, i) => `bài đỏ số ${i + 1}`);
    ghi(join(k.dir, "src/b.test.ts"), `import { test } from "node:test";\nimport assert from "node:assert/strict";\n${ten.map((t) => `test(${JSON.stringify(t)}, () => { assert.equal(1, 2); });`).join("\n")}\n`);
    const v = hoi(k);
    assert.equal(v.chan, true);
    if (!v.chan) return;
    assert.match(v.lyDo, /bài đỏ số 1\b/);
    assert.match(v.lyDo, /bài đỏ số 10\b/);
    assert.doesNotMatch(v.lyDo, /bài đỏ số 11\b/);
    assert.match(v.lyDo, /và 2 bài đỏ nữa/);
    assert.doesNotMatch(v.lyDo, /bài cũ đỏ ở thư mục khác/, "lib/ không có tệp đổi thì không chạy bài ở đó");
  } finally {
    k.don();
  }
});

test("cổng xanh: đổi tệp ở thư mục bài XANH → im lặng; bài đỏ ở thư mục KHÔNG đổi thì không chạy", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/a.ts"), "export const a = 3;\n");
    assert.deepEqual(hoi(k), { chan: false });
  } finally {
    k.don();
  }
});

test("cổng xanh: typecheck đỏ → chặn, nói rõ là kiểm kiểu", () => {
  const k = khoGia("node -e \"console.log('src/a.ts(1,1): error TS2322: sai kiểu'); process.exit(2)\"");
  try {
    ghi(join(k.dir, "docs/x.md"), "đổi tài liệu\n");
    const v = hoi(k);
    assert.equal(v.chan, true);
    if (v.chan) {
      assert.match(v.lyDo, /typecheck/);
      assert.match(v.lyDo, /error TS2322/);
    }
  } finally {
    k.don();
  }
});

test("cổng xanh: stop_hook_active = true → cho dừng ngay, không chạy gì (không vòng lặp)", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/b.test.ts"), baiDo("đỏ"));
    const t0 = Date.now();
    assert.deepEqual(hoi(k, { stop_hook_active: true }), { chan: false });
    assert.ok(Date.now() - t0 < 500, "không được chạy bài khi stop_hook_active");
  } finally {
    k.don();
  }
});

test("cổng xanh: quá trần thời gian → chỉ cảnh báo, KHÔNG chặn", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/cham.test.ts"), 'import { test } from "node:test";\ntest("chậm", async () => { await new Promise((r) => setTimeout(r, 8000)); });\n');
    const t0 = Date.now();
    const v = hoi(k, {}, 2500);
    assert.equal(v.chan, false);
    if (!v.chan) assert.match(v.canhBao ?? "", /quá trần/);
    assert.ok(Date.now() - t0 < 7000, "phải cắt ở trần, không chờ bài chạy hết");
  } finally {
    k.don();
  }
});

test("cổng xanh: bài ĐỔI đỏ chạy TRƯỚC — đỏ thì chặn ngay dù bài cùng thư mục chậm quá trần", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/cham.test.ts"), 'import { test } from "node:test";\ntest("chậm", async () => { await new Promise((r) => setTimeout(r, 8000)); });\n');
    git(k.dir, "add", "-A");
    git(k.dir, "commit", "-q", "-m", "bài chậm có sẵn trên main");
    git(k.dir, "branch", "-f", "main", "HEAD");
    ghi(join(k.dir, "src/b.test.ts"), baiDo("bài đổi đỏ"));
    // Trần 6 giây: đủ cho typecheck giả + một bài đỏ kể cả khi máy bận; bài chậm cùng thư mục (8 giây) thì không bao giờ kịp.
    const v = hoi(k, {}, 6000);
    assert.equal(v.chan, true, "đỏ ở lượt 1 phải chặn, không chờ lượt 2");
    if (v.chan) {
      assert.match(v.lyDo, /bài đổi đỏ/);
      assert.doesNotMatch(v.lyDo, /cùng thư mục/, "đỏ ở lượt 1 thì bỏ lượt 2");
    }
  } finally {
    k.don();
  }
});

test("cổng xanh: quá trần được nhớ theo dấu vân — gọi lại khi mã chưa đổi thì cảnh báo ngay, không chạy lại", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/cham.test.ts"), 'import { test } from "node:test";\ntest("chậm", async () => { await new Promise((r) => setTimeout(r, 8000)); });\n');
    const v1 = hoi(k, {}, 2500);
    assert.equal(v1.chan, false);
    const nho = JSON.parse(readFileSync(join(k.dir, ".git/claude-cong-xanh.json"), "utf8"));
    assert.equal(nho.quaTran, true, "quá trần phải được nhớ");
    const v2 = hoi(k, {}, 2500);
    assert.equal(v2.chan, false);
    if (!v2.chan) assert.match(v2.canhBao ?? "", /quá trần .*đo lần trước, mã chưa đổi/, "mã chưa đổi ⇒ dùng kết quả nhớ, không chạy lại");
  } finally {
    k.don();
  }
});

test("cổng xanh: kết quả nhớ theo dấu vân của mã — mã không đổi thì không chạy lại", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/a.ts"), "export const a = 4;\n");
    assert.deepEqual(hoi(k), { chan: false });
    // Lần đầu: kết quả xanh được ghi vào tệp nhớ trong .git, gắn với dấu vân của mã.
    const nho = JSON.parse(readFileSync(join(k.dir, ".git/claude-cong-xanh.json"), "utf8"));
    assert.equal(nho.xanh, true);
    ghi(join(k.dir, "src/a.ts"), "export const a = 5;\n");
    ghi(join(k.dir, "src/b.test.ts"), baiDo("đỏ sau khi đổi mã"));
    const v = hoi(k);
    assert.equal(v.chan, true, "mã đổi ⇒ chạy lại, thấy đỏ");
  } finally {
    k.don();
  }
});

test("cổng xanh: ngoài kho của mình / cwd lạ / lỗi nội bộ → cho dừng", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/b.test.ts"), baiDo("đỏ"));
    assert.deepEqual(canhCong({ cwd: k.dir }, { khoChung: "/khong/phai/kho/nay" }), { chan: false });
    assert.deepEqual(canhCong({}, { khoChung: k.khoChung }), { chan: false });
    assert.deepEqual(canhCong(null, { khoChung: k.khoChung }), { chan: false });
  } finally {
    k.don();
  }
});

test("móc cong-xanh.mjs thật: đỏ → in {decision: block}; stop_hook_active → im; JSON hỏng → im, thoát 0", () => {
  const k = khoGia();
  try {
    ghi(join(k.dir, "src/b.test.ts"), baiDo("đỏ qua móc thật"));
    const chay = (input: string) => {
      const env: Record<string, string | undefined> = { ...process.env, CLAUDE_PROJECT_DIR: k.dir };
      delete env.NODE_TEST_CONTEXT;
      return spawnSync(process.execPath, [join(ROOT, ".claude/hooks/cong-xanh.mjs")], { input, encoding: "utf8", env, timeout: 60_000 });
    };
    const r = chay(JSON.stringify({ hook_event_name: "Stop", stop_hook_active: false, cwd: k.dir }));
    assert.equal(r.status, 0);
    const o = JSON.parse(r.stdout);
    assert.equal(o.decision, "block");
    assert.match(o.reason, /đỏ qua móc thật/);
    const r2 = chay(JSON.stringify({ hook_event_name: "Stop", stop_hook_active: true, cwd: k.dir }));
    assert.equal(r2.status, 0);
    assert.equal(r2.stdout, "");
    const r3 = chay("không phải json");
    assert.equal(r3.status, 0);
    assert.equal(r3.stdout, "");
  } finally {
    k.don();
  }
});
