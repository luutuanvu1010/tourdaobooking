// Bộ kiểm cho hai lệnh chủ dự án tự gõ: `npm run day-len` và `npm run trien-khai` (đặc tả docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md).
// Chỉ kiểm LOGIC THUẦN ở scripts/release-lib.mjs bằng một bộ chạy lệnh GIẢ: không bài kiểm nào chạy git/wrangler thật, và KHÔNG bài nào gọi
// scripts/day-len.mjs hay scripts/trien-khai.mjs (chúng chạy bên trong chính `npm test` của lệnh day-len — gọi lồng sẽ đẩy thật).
// Bộ chạy giả NÉM LỖI khi gặp lệnh không có trong kịch bản: nhờ vậy danh sách lệnh đã gọi (so khớp nguyên thứ tự) là bằng chứng đầy đủ.
// Mẫu đầu ra wrangler ở src/release-lib.fixtures/ là đầu ra THẬT của `wrangler d1 migrations list … --local --persist-to <thư mục tạm>` (wrangler 4.135.0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type RunResult = { code: number; stdout: string; stderr: string };
type RunOpts = { env?: Record<string, string>; stream?: boolean; tee?: boolean };
type Deps = {
  run: (cmd: string, args: string[], opts?: RunOpts) => RunResult | Promise<RunResult>;
  ask: (q: string) => Promise<string>;
  isTTY: boolean;
  log: (line: string) => void;
};
type Lib = {
  parsePendingMigrations: (out: string) => { ok: true; names: string[] } | { ok: false; reason: string };
  parseBookmark: (out: string) => string | null;
  parseVersionId: (out: string) => string | null;
  dayLen: (deps: Deps & { target?: string }) => Promise<number>;
  trienKhai: (deps: Deps & { now?: () => Date; sleep?: (ms: number) => Promise<void>; version?: string }) => Promise<number>;
};
const lib = (await import(new URL("../scripts/release-lib.mjs", import.meta.url).href)) as Lib;

const fixture = (name: string) => readFileSync(new URL(`./release-lib.fixtures/${name}`, import.meta.url), "utf8");
const LIST_ALL_PENDING = fixture("migrations-list-con-cho.txt");
const LIST_NONE = fixture("migrations-list-khong-con.txt");
/** Cùng định dạng bảng cli-table3 như mẫu thật, chỉ một dòng (tình huống chờ 0023). */
const LIST_0023 = [
  "",
  " ⛅️ wrangler 4.135.0",
  "Resource location: remote ",
  "",
  "Migrations to be applied:",
  "┌───────────────────────┐",
  "│ Name                  │",
  "├───────────────────────┤",
  "│ 0023_auth_passkey.sql │",
  "└───────────────────────┘",
  "",
].join("\n");

const OK: RunResult = { code: 0, stdout: "", stderr: "" };
const out = (stdout: string): RunResult => ({ code: 0, stdout, stderr: "" });
const FAIL: RunResult = { code: 1, stdout: "", stderr: "lỗi giả" };

const key = (cmd: string, args: string[], opts?: RunOpts) =>
  `${opts?.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v} `).join("") : ""}${cmd} ${args.join(" ")}`.trim();

/** Bộ chạy lệnh giả: kịch bản = bảng "chuỗi lệnh → kết quả"; lệnh lạ → ném lỗi (không cho lọt lệnh chưa lường). */
function harness(script: Record<string, RunResult | RunResult[]>, answers: string[] = [], isTTY = true) {
  const calls: string[] = [];
  const lines: string[] = [];
  const questions: string[] = [];
  const deps: Deps = {
    isTTY,
    log: (l) => lines.push(l),
    ask: async (q) => {
      questions.push(q);
      if (!answers.length) throw new Error(`câu hỏi ngoài kịch bản: ${q}`);
      return answers.shift() as string;
    },
    run: (cmd, args, opts) => {
      const k = key(cmd, args, opts);
      calls.push(k);
      const v = script[k];
      // Mảng = chuỗi kết quả cho các lần gọi liên tiếp (ca thử lại); phần tử cuối dùng cho mọi lần sau.
      const r = Array.isArray(v) ? (v.length > 1 ? v.shift() : v[0]) : v;
      if (!r) throw new Error(`lệnh ngoài kịch bản: ${k}`);
      return r;
    },
  };
  return { deps, calls, lines, questions, text: () => lines.join("\n") };
}

const DANGEROUS = /(?:^|\s)(?:git push|wrangler deploy|migrations apply)(?:\s|$)|--force|(?:^|\s)-f(?:\s|$)/;
function assertNothingDangerous(calls: string[]) {
  const bad = calls.filter((c) => DANGEROUS.test(c) || /git reset|git merge(?![-\w])(?! --ff-only)/.test(c));
  assert.deepEqual(bad, [], `không được gọi lệnh nguy hiểm trên đường từ chối: ${bad.join(" | ")}`);
}

// ─────────────────────────── đọc đầu ra wrangler ───────────────────────────

test("parsePendingMigrations: đầu ra THẬT khi còn migration chờ → đủ 23 tên (mọi tệp migrations/ lúc chụp mẫu), đúng thứ tự", () => {
  const r = lib.parsePendingMigrations(LIST_ALL_PENDING);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.names.length, 23);
  assert.equal(r.names[0], "0001_staff.sql");
  assert.ok(r.names.includes("0016_feedback.sql") && r.names.includes("0016_maintenance.sql"));
  assert.equal(r.names.at(-1), "0023_auth_passkey.sql");
});

test("parsePendingMigrations: đầu ra THẬT 'No migrations to apply' → danh sách rỗng", () => {
  assert.deepEqual(lib.parsePendingMigrations(LIST_NONE), { ok: true, names: [] });
});

test("parsePendingMigrations: đầu ra lạ, mâu thuẫn hoặc có dấu mà không có tên → KHÔNG đọc được (phải dừng)", () => {
  for (const bad of ["", "Error: Authentication error [code: 10000]", "Migrations to be applied:\n┌──┐\n└──┘", "✅ No migrations to apply!\nMigrations to be applied:\n│ 0023_auth_passkey.sql │"]) {
    const r = lib.parsePendingMigrations(bad);
    assert.equal(r.ok, false, `phải từ chối: ${JSON.stringify(bad)}`);
    if (!r.ok) assert.match(r.reason, /[àáảãạăâđèéêìíòóôơùúưỳ]/i, "lý do phải là tiếng Việt có dấu");
  }
});

test("parsePendingMigrations: gọi nhiều lần liên tiếp cho kết quả như nhau (không mang trạng thái regex /g giữa các lần gọi)", () => {
  const trap = "✅ No migrations to apply!" + " ".repeat(500) + "0023_auth_passkey.sql";
  assert.equal(lib.parsePendingMigrations(trap).ok, false, "'không còn' mà có tên migration → không đọc được");
  const r = lib.parsePendingMigrations(LIST_ALL_PENDING);
  assert.equal(r.ok && r.names.length, 23, "lần gọi sau phải đọc đủ 23 tên");
  assert.equal(lib.parsePendingMigrations(trap).ok, false);
  assert.deepEqual(lib.parsePendingMigrations(LIST_NONE), { ok: true, names: [] });
});

test("parseBookmark / parseVersionId: đọc được JSON của time-travel info và dòng 'Current Version ID' của deploy", () => {
  assert.equal(lib.parseBookmark('{\n  "bookmark": "00000085-0000024c-00004e3f-abc"\n}'), "00000085-0000024c-00004e3f-abc");
  assert.equal(lib.parseBookmark("⚠️ The current bookmark is '00000085-0000024c-00004e3f-abc'"), "00000085-0000024c-00004e3f-abc");
  assert.equal(lib.parseBookmark("Error: không có quyền"), null);
  assert.equal(lib.parseVersionId("Uploaded tourdao-sales\nCurrent Version ID: 3245256e-1111-2222-3333-444455556666\n"), "3245256e-1111-2222-3333-444455556666");
  assert.equal(lib.parseVersionId("lỗi"), null);
});

// ─────────────────────────── day-len ───────────────────────────

const OLD = "a".repeat(40);
/** Kịch bản day-len mà mọi bước đều đạt; từng ca sửa đúng một dòng. */
function dayLenScript(over: Record<string, RunResult> = {}): Record<string, RunResult> {
  return {
    "git rev-parse --abbrev-ref HEAD": out("main\n"),
    "git status --porcelain": out(""),
    "git fetch origin": OK,
    "git merge-base --is-ancestor origin/main main": OK,
    "git merge-base --is-ancestor main worktree-x": OK,
    "git rev-parse main": out(`${OLD}\n`),
    "git merge --ff-only worktree-x": OK,
    "npm test": OK,
    "npm run typecheck": OK,
    "git rev-list --count origin/main..main": out("2\n"),
    "git log --oneline --no-decorate origin/main..main": out("b1 Thêm Face ID\nb2 Nhật ký\n"),
    "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/": out("migrations/0023_auth_passkey.sql\n"),
    "git push origin main": OK,
    "git log -1 --oneline --no-decorate origin/main": out("b1 Thêm Face ID\n"),
    ...over,
  };
}
const DAYLEN_HAPPY = [
  "git rev-parse --abbrev-ref HEAD",
  "git status --porcelain",
  "git fetch origin",
  "git merge-base --is-ancestor origin/main main",
  "git merge-base --is-ancestor main worktree-x",
  "git rev-parse main",
  "git merge --ff-only worktree-x",
  "npm test",
  "npm run typecheck",
  "git rev-list --count origin/main..main",
  "git log --oneline --no-decorate origin/main..main",
  "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/",
  "git push origin main",
  "git log -1 --oneline --no-decorate origin/main",
];

test("day-len (tiêu chí 2): mọi thứ đạt + trả lời c → ff-only rồi push, không --force; tóm tắt nêu đúng migration mới", async () => {
  const h = harness(dayLenScript(), ["c"]);
  const code = await lib.dayLen({ ...h.deps, target: "worktree-x" });
  assert.equal(code, 0);
  assert.deepEqual(h.calls, DAYLEN_HAPPY);
  assert.ok(!h.calls.some((c) => /--force|(?:^|\s)-f(?:\s|$)/.test(c)));
  assert.match(h.text(), /0023_auth_passkey\.sql/);
  assert.match(h.text(), /PHẢI áp các migration này trước; dùng `npm run trien-khai`/);
  assert.match(h.text(), /2 commit/);
  assert.deepEqual(h.questions, ["Đẩy lên GitHub? (c/k) "]);
});

test("day-len: không có tên nhánh → bỏ bước gộp; không có migration mới → nói rõ 'không có'", async () => {
  const script = dayLenScript({ "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/": out("") });
  const h = harness(script, ["c"]);
  assert.equal(await lib.dayLen(h.deps), 0);
  assert.deepEqual(
    h.calls,
    DAYLEN_HAPPY.filter((c) => !/worktree-x|git rev-parse main/.test(c)),
  );
  assert.match(h.text(), /Migration mới: không có/);
});

test("day-len: không có commit nào để đẩy → dừng êm, không hỏi, không push", async () => {
  const h = harness(dayLenScript({ "git rev-list --count origin/main..main": out("0\n") }));
  assert.equal(await lib.dayLen(h.deps), 0);
  assertNothingDangerous(h.calls);
  assert.deepEqual(h.questions, []);
});

const DAYLEN_REFUSALS: { name: string; over?: Record<string, RunResult>; answers?: string[]; tty?: boolean; target?: string; reason: RegExp; lastCall?: string }[] = [
  { name: "không có TTY", tty: false, reason: /terminal thật/ },
  { name: "không ở main", over: { "git rev-parse --abbrev-ref HEAD": out("worktree-x\n") }, reason: /nhánh `main`/, lastCall: "git rev-parse --abbrev-ref HEAD" },
  { name: "cây bẩn", over: { "git status --porcelain": out(" M src/index.ts\n") }, reason: /chưa commit/, lastCall: "git status --porcelain" },
  { name: "git fetch lỗi", over: { "git fetch origin": FAIL }, reason: /git fetch/, lastCall: "git fetch origin" },
  { name: "origin/main không phải tổ tiên", over: { "git merge-base --is-ancestor origin/main main": FAIL }, reason: /đã có người đẩy/, lastCall: "git merge-base --is-ancestor origin/main main" },
  { name: "nhánh không tiến thẳng được", over: { "git merge-base --is-ancestor main worktree-x": FAIL }, reason: /không tiến thẳng/, lastCall: "git merge-base --is-ancestor main worktree-x" },
  { name: "ff-only lỗi", over: { "git merge --ff-only worktree-x": FAIL }, reason: /gộp/, lastCall: "git merge --ff-only worktree-x" },
  { name: "test đỏ", over: { "npm test": FAIL }, reason: /npm test/, lastCall: "npm test" },
  { name: "typecheck đỏ", over: { "npm run typecheck": FAIL }, reason: /typecheck/, lastCall: "npm run typecheck" },
  { name: "chủ trả lời k", answers: ["k"], reason: /Không đẩy/, lastCall: "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/" },
  { name: "chủ trả lời 'có' (không đúng c)", answers: ["có"], reason: /Không đẩy/ },
  { name: "chủ trả lời 'C' hoa", answers: ["C"], reason: /Không đẩy/ },
  { name: "chủ bấm Enter", answers: [""], reason: /Không đẩy/ },
  // Sửa vòng 2: mọi lệnh git đọc trạng thái mà lỗi thì DỪNG, không bao giờ đoán (không bỏ sót).
  { name: "git rev-parse main lỗi (trước khi gộp)", over: { "git rev-parse main": FAIL }, reason: /không đọc được mã hiện tại của `main`/, lastCall: "git rev-parse main" },
  { name: "git rev-parse main trả rỗng", over: { "git rev-parse main": out("") }, reason: /không đọc được mã hiện tại của `main`/, lastCall: "git rev-parse main" },
  { name: "git rev-list --count lỗi", over: { "git rev-list --count origin/main..main": FAIL }, reason: /không đếm được số commit/, lastCall: "git rev-list --count origin/main..main" },
  { name: "git rev-list --count trả chữ lạ", over: { "git rev-list --count origin/main..main": out("abc\n") }, reason: /không đếm được số commit/, lastCall: "git rev-list --count origin/main..main" },
  { name: "git log danh sách commit lỗi", over: { "git log --oneline --no-decorate origin/main..main": FAIL }, reason: /không đọc được danh sách commit/, lastCall: "git log --oneline --no-decorate origin/main..main" },
  { name: "git diff migration lỗi", over: { "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/": FAIL }, reason: /không liệt kê được migration mới/, lastCall: "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/" },
];

for (const c of DAYLEN_REFUSALS) {
  test(`day-len (tiêu chí 1): từ chối và KHÔNG push khi ${c.name}`, async () => {
    const h = harness(dayLenScript(c.over), c.answers ?? [], c.tty ?? true);
    const code = await lib.dayLen({ ...h.deps, target: c.target ?? "worktree-x" });
    assert.notEqual(code, 0);
    assertNothingDangerous(h.calls);
    assert.ok(!h.calls.includes("git push origin main"));
    assert.match(h.text(), c.reason);
    if (c.tty === false) assert.deepEqual(h.calls, [], "ngoài TTY: không được gọi lệnh nào");
    if (c.lastCall) assert.equal(h.calls.at(-1), c.lastCall, "phải dừng NGAY ở bước hỏng");
  });
}

test("day-len: đã gộp rồi mà test đỏ / trả lời k → in lệnh quay main về chỗ cũ, KHÔNG tự chạy", async () => {
  for (const [over, answers] of [[{ "npm test": FAIL }, []], [{ "npm run typecheck": FAIL }, []], [{}, ["k"]]] as const) {
    const h = harness(dayLenScript(over), [...answers]);
    assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
    assert.ok(h.text().includes(`git reset --hard ${OLD}`), "phải in lệnh quay lại");
    assert.ok(!h.calls.some((c) => c.startsWith("git reset")), "không được tự chạy git reset");
  }
});

test("day-len: tên nhánh dạng tuỳ chọn (bắt đầu bằng '-') hoặc có ký tự lạ → từ chối trước khi gọi git", async () => {
  for (const target of ["--force", "-f", "a b", "x;rm", ""]) {
    const h = harness(dayLenScript());
    assert.notEqual(await lib.dayLen({ ...h.deps, target }), 0, target);
    assert.deepEqual(h.calls, [], `không gọi lệnh nào với tên nhánh ${JSON.stringify(target)}`);
  }
});

test("day-len: push lỗi → thoát khác 0, báo rõ", async () => {
  const h = harness(dayLenScript({ "git push origin main": FAIL }), ["c"]);
  assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.match(h.text(), /git push/);
});

// ─────────────────────────── trien-khai ───────────────────────────

const HEAD = "c".repeat(40);
const WHOAMI = "CI=1 npx wrangler whoami";
const WHOAMI_OK = out("👋 You are logged in with an OAuth Token, associated with the email x@y.z.\n");
const LIST = "CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote";
/** Lỗi THẬT chủ dự án gặp 2026-10-01 (cũng 26/9, 29/9): lần gọi đầu bị từ chối, chạy lại là qua. */
const LOI_7403: RunResult = { code: 1, stdout: "", stderr: "✘ [ERROR] A request to the Cloudflare API (/accounts/381557e4e08091d31a3235baf2513df6/d1/database/bcd4c0ac/query) failed.\n\n  The given account is not valid or is not authorized to access this service [code: 7403]\n" };
const TT = "CI=1 npx wrangler d1 time-travel info tourdao-sales-db --json";
const APPLY = "CI=1 npx wrangler d1 migrations apply tourdao-sales-db --remote";
const DEPLOY = "CI=1 npx wrangler deploy";
const AUDIT = "node scripts/audit-invariants.mjs --db remote";
const E2E = "npm run test:e2e";
const GATE_PRE = "node scripts/kiem-phien-ban.mjs";
const GATE_POST = "node scripts/kiem-phien-ban.mjs --sau-deploy";
function tkScript(over: Record<string, RunResult | RunResult[]> = {}): Record<string, RunResult | RunResult[]> {
  return {
    "git rev-parse --abbrev-ref HEAD": out("main\n"),
    "git status --porcelain": out(""),
    "git fetch origin": OK,
    "git rev-parse main": out(`${HEAD}\n`),
    "git rev-parse origin/main": out(`${HEAD}\n`),
    "git log -1 --oneline --no-decorate main": out("ccccccc Thêm Face ID\n"),
    [WHOAMI]: WHOAMI_OK,
    [LIST]: out(LIST_0023),
    [GATE_PRE]: out("ĐẠT: bản ở máy 1.4 mới hơn production 1.3.\n"),
    "npm test": OK,
    "npm run typecheck": OK,
    "npm run build:web": OK,
    [E2E]: out("▶ platform\n✔ platform (1.0s)\n\nE2E: 17/17 kịch bản xanh\n"),
    [TT]: out('{\n  "bookmark": "00000085-0000024c-00004e3f-abc"\n}\n'),
    [APPLY]: OK,
    [DEPLOY]: out("Uploaded tourdao-sales\nCurrent Version ID: 3245256e-1111-2222-3333-444455556666\n"),
    [AUDIT]: OK,
    [GATE_POST]: out("ĐẠT: production đã là 1.4.\n"),
    ...over,
  };
}
const TK_PREFIX = ["git rev-parse --abbrev-ref HEAD", "git status --porcelain", "git fetch origin", "git rev-parse main", "git rev-parse origin/main", "git log -1 --oneline --no-decorate main", WHOAMI, LIST, GATE_PRE, "npm test", "npm run typecheck", "npm run build:web", E2E];
const NOW = () => new Date("2026-09-23T03:04:05.000Z");

test("trien-khai (tiêu chí 4): còn migration + trả lời c, c → áp migration → deploy → kiểm dữ liệu, đúng thứ tự", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, APPLY, DEPLOY, AUDIT, GATE_POST]);
  assert.equal(h.questions.length, 2);
  assert.match(h.questions[0] ?? "", /Áp 1 migration này lên production\? \(c\/k\)/);
  assert.match(h.questions[1] ?? "", /PHẢI deploy ngay/);
  const t = h.text();
  assert.match(t, /0023_auth_passkey\.sql/);
  assert.match(t, /00000085-0000024c-00004e3f-abc/);
  assert.match(t, /wrangler d1 time-travel restore tourdao-sales-db --bookmark=00000085-0000024c-00004e3f-abc/);
  // khối tóm tắt để dán vào HANDOFF
  assert.match(t, /3245256e-1111-2222-3333-444455556666/);
  assert.match(t, /ccccccc Thêm Face ID/);
  assert.match(t, /2026-09-23 10:04/, "ngày giờ theo giờ Việt Nam");
  assert.match(t, /Kiểm dữ liệu: ĐẠT/);
});

test("trien-khai (cổng phiên bản): tóm tắt ghi số phiên bản ở máy và kết quả hai cổng", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, version: "1.4" }), 0);
  const t = h.text();
  assert.match(t, /- Phiên bản: 1\.4/);
  assert.match(t, /- Cổng phiên bản trước deploy: ĐẠT/);
  assert.match(t, /- Cổng phiên bản sau deploy: ĐẠT/);
});

test("trien-khai (tiêu chí 4): còn migration mà trả lời k → KHÔNG áp, KHÔNG deploy, thoát khác 0", async () => {
  for (const ans of ["k", "", "có", "C"]) {
    const h = harness(tkScript(), [ans]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, [...TK_PREFIX, TT]);
    assertNothingDangerous(h.calls);
  }
});

test("trien-khai (tiêu chí 5): không còn migration chờ → bỏ bước áp và Time Travel, vẫn hỏi deploy, rồi kiểm dữ liệu", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST]);
  assert.deepEqual(h.questions, ["Triển khai Worker lên production? (c/k) "]);
  assert.match(h.text(), /Migration đã áp: không có/);
});

test("trien-khai: không còn migration, trả lời k → không deploy, thoát khác 0, không cảnh báo 'đã áp'", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["k"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, TK_PREFIX);
});

test("trien-khai: ĐÃ áp migration mà trả lời k ở câu deploy → cảnh báo đỏ + in lệnh deploy để tự chạy, thoát khác 0", async () => {
  const h = harness(tkScript(), ["c", "k"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, APPLY]);
  assert.match(h.text(), /\x1b\[31m/, "cảnh báo phải có màu đỏ");
  assert.match(h.text(), /CI=1 npx wrangler deploy/);
});

const TK_REFUSALS: { name: string; over?: Record<string, RunResult>; tty?: boolean; answers?: string[]; reason: RegExp; lastCall?: string }[] = [
  { name: "không có TTY", tty: false, reason: /terminal thật/ },
  { name: "không ở main", over: { "git rev-parse --abbrev-ref HEAD": out("worktree-x\n") }, reason: /nhánh `main`/, lastCall: "git rev-parse --abbrev-ref HEAD" },
  { name: "cây bẩn", over: { "git status --porcelain": out("?? x.txt\n") }, reason: /chưa commit/, lastCall: "git status --porcelain" },
  { name: "git fetch lỗi", over: { "git fetch origin": FAIL }, reason: /git fetch/, lastCall: "git fetch origin" },
  { name: "main khác origin/main", over: { "git rev-parse origin/main": out(`${"d".repeat(40)}\n`) }, reason: /chưa đẩy|khác `origin\/main`/, lastCall: "git rev-parse origin/main" },
  { name: "migrations list lỗi", over: { [LIST]: FAIL }, reason: /migrations list/, lastCall: LIST },
  { name: "migrations list không đọc được", over: { [LIST]: out("Something new\n") }, reason: /không đọc được/, lastCall: LIST },
  { name: "test đỏ", over: { "npm test": FAIL }, reason: /npm test/, lastCall: "npm test" },
  { name: "typecheck đỏ", over: { "npm run typecheck": FAIL }, reason: /typecheck/, lastCall: "npm run typecheck" },
  { name: "build đỏ", over: { "npm run build:web": FAIL }, reason: /build:web/, lastCall: "npm run build:web" },
  { name: "không lấy được điểm Time Travel", over: { [TT]: out("Error: lỗi mạng") }, reason: /Time Travel/, lastCall: TT },
];

for (const c of TK_REFUSALS) {
  test(`trien-khai (tiêu chí 3): từ chối trước khi áp/deploy khi ${c.name}`, async () => {
    const h = harness(tkScript(c.over), c.answers ?? [], c.tty ?? true);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assertNothingDangerous(h.calls);
    assert.match(h.text(), c.reason);
    assert.deepEqual(h.questions, [], "không được hỏi áp/deploy khi đã hỏng");
    if (c.tty === false) assert.deepEqual(h.calls, [], "ngoài TTY: không được gọi lệnh nào");
    if (c.lastCall) assert.equal(h.calls.at(-1), c.lastCall, "phải dừng NGAY ở bước hỏng");
  });
}

test("trien-khai (tiêu chí 3): áp migration lỗi → dừng, KHÔNG deploy, không hỏi deploy", async () => {
  const h = harness(tkScript({ [APPLY]: FAIL }), ["c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, APPLY]);
  assert.ok(!h.calls.includes(DEPLOY));
  assert.equal(h.questions.length, 1);
  assert.match(h.text(), /KHÔNG deploy/);
});

test("trien-khai: deploy lỗi → không chạy kiểm dữ liệu, thoát khác 0", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE), [DEPLOY]: FAIL }), ["c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY]);
});

test("trien-khai (bước 7): kiểm dữ liệu thoát 1 = KHÔNG ĐẠT, thoát 2 = KHÔNG CHẠY ĐƯỢC (không phải sạch); cả hai thoát khác 0", async () => {
  for (const [code, label] of [[1, /Kiểm dữ liệu: KHÔNG ĐẠT/], [2, /KHÔNG CHẠY ĐƯỢC.*không phải dữ liệu sạch/]] as const) {
    const h = harness(tkScript({ [LIST]: out(LIST_NONE), [AUDIT]: { code, stdout: "", stderr: "" } }), ["c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST]);
    assert.match(h.text(), label);
  }
});

test("trien-khai: deploy không in Version ID → tóm tắt ghi 'chưa lấy được', không coi là lỗi", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE), [DEPLOY]: out("Uploaded\n") }), ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.match(h.text(), /chưa lấy được/);
});

test("trien-khai: lệnh dài chạy dạng hiện trực tiếp cho chủ xem (stream/tee), lệnh đọc thì bắt đầu ra", async () => {
  const seen: Record<string, RunOpts | undefined> = {};
  const h = harness(tkScript(), ["c", "c"]);
  const run = h.deps.run;
  h.deps.run = (cmd, args, opts) => {
    seen[key(cmd, args, opts)] = opts;
    return run(cmd, args, opts);
  };
  await lib.trienKhai({ ...h.deps, now: NOW });
  for (const k of ["npm test", "npm run typecheck", "npm run build:web", APPLY, AUDIT, GATE_PRE, GATE_POST]) assert.equal(seen[k]?.stream, true, `${k} phải stream`);
  assert.equal(seen[DEPLOY]?.tee, true, "deploy phải vừa hiện vừa bắt đầu ra (để lấy Version ID)");
  assert.equal(seen[E2E]?.tee, true, "e2e phải vừa hiện vừa bắt đầu ra (để nêu kịch bản đỏ)");
  assert.ok(!seen[LIST]?.stream && !seen[TT]?.stream, "lệnh đọc phải bắt đầu ra để phân tích");
});

// ─────────────── e2e ĐỦ BỘ trong trien-khai (sửa vòng 1, ruling của điều phối) ───────────────
const E2E_RED: RunResult = { code: 1, stdout: "▶ platform\n✔ platform (1.0s)\n\n▶ catalog\n✘ catalog\n\n▶ orders\n✘ orders\n\nE2E: 2/17 kịch bản LỖI\n", stderr: "" };
const E2E_Q = "Có kịch bản e2e đỏ. Vẫn tiếp tục? (c/k) ";

test("trien-khai (e2e): e2e đỏ + trả lời k (hoặc khác đúng c) → dừng, KHÔNG áp, KHÔNG deploy, nêu kịch bản đỏ", async () => {
  for (const ans of ["k", "", "C", "có"]) {
    const h = harness(tkScript({ [E2E]: E2E_RED }), [ans]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, TK_PREFIX);
    assertNothingDangerous(h.calls);
    assert.deepEqual(h.questions, [E2E_Q]);
    assert.match(h.text(), /catalog, orders/);
  }
});

test("trien-khai (e2e): e2e đỏ + trả lời c → đi tiếp đúng thứ tự: Time Travel → áp → deploy → kiểm dữ liệu", async () => {
  const h = harness(tkScript({ [E2E]: E2E_RED }), ["c", "c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, APPLY, DEPLOY, AUDIT, GATE_POST]);
  assert.equal(h.questions[0], E2E_Q);
  assert.match(h.questions[1] ?? "", /Áp 1 migration/);
  assert.match(h.text(), /e2e: ĐỎ \(chủ chọn tiếp tục\): catalog, orders/, "khối tóm tắt ghi rõ e2e đỏ mà vẫn triển khai");
});

test("trien-khai (e2e): e2e xanh → không có câu hỏi thêm", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.questions, ["Triển khai Worker lên production? (c/k) "]);
  assert.match(h.text(), /e2e: xanh/);
});

test("trien-khai (e2e): e2e đỏ mà không đọc được tên kịch bản → vẫn hỏi, nói rõ 'không đọc được tên'", async () => {
  const h = harness(tkScript({ [E2E]: { code: 1, stdout: "lỗi lạ\n", stderr: "" } }), ["k"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.questions, [E2E_Q]);
  assert.match(h.text(), /không đọc được tên/);
});

// ─────────────── cổng số phiên bản trong trien-khai (chủ quyết 2026-09-23) ───────────────
const GATE_PRE_Q = "Bản ở máy không mới hơn production (quên thêm mục nhật ký thay đổi?). Chỉ chọn c nếu đang deploy lại ĐÚNG bản đang chạy. Vẫn tiếp tục? (c/k) ";
const PRE_1: RunResult = { code: 1, stdout: "CHƯA ĐẠT: bản ở máy 1.3 không mới hơn production 1.3.\n", stderr: "" };
/** Danh sách lệnh khi dừng NGAY ở cổng trước. */
const UNTIL_PRE = TK_PREFIX.slice(0, TK_PREFIX.indexOf(GATE_PRE) + 1);

/** sleep giả: tức thì, ghi lại thời lượng mỗi lần chờ. */
function fakeSleep() {
  const waits: number[] = [];
  return { waits, sleep: async (ms: number) => void waits.push(ms) };
}
/** Cổng sau trả lần lượt các kết quả trong `seq` (lần 1, lần 2); lệnh khác đi qua kịch bản như cũ. */
function withPostSeq(h: ReturnType<typeof harness>, seq: RunResult[]) {
  const run = h.deps.run;
  h.deps.run = (cmd, args, opts) => {
    const r = run(cmd, args, opts);
    if (key(cmd, args, opts) !== GATE_POST) return r;
    const next = seq.shift();
    if (!next) throw new Error("cổng sau bị gọi quá số lần trong kịch bản");
    return next;
  };
}

test("trien-khai (cổng trước): chạy NGAY sau bước đọc migration, TRƯỚC npm test", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  await lib.trienKhai({ ...h.deps, now: NOW });
  assert.equal(h.calls.indexOf(GATE_PRE), h.calls.indexOf(LIST) + 1);
  assert.ok(h.calls.indexOf(GATE_PRE) < h.calls.indexOf("npm test"));
});

test("trien-khai (cổng trước): mã 1 + trả lời k (hoặc khác đúng c) → dừng, KHÔNG áp, KHÔNG deploy", async () => {
  for (const ans of ["k", "", "C", "có"]) {
    const h = harness(tkScript({ [GATE_PRE]: PRE_1 }), [ans]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, UNTIL_PRE, "dừng ngay ở cổng trước");
    assertNothingDangerous(h.calls);
    assert.deepEqual(h.questions, [GATE_PRE_Q]);
    assert.match(h.text(), /\x1b\[31m/, "thông báo phải có màu đỏ");
    assert.match(h.text(), /không áp migration, không deploy/);
  }
});

test("trien-khai (cổng trước): mã 1 + trả lời c → đi tiếp đủ bước; tóm tắt ghi 'KHÔNG ĐẠT (chủ chọn tiếp tục)'", async () => {
  const h = harness(tkScript({ [GATE_PRE]: PRE_1 }), ["c", "c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, APPLY, DEPLOY, AUDIT, GATE_POST]);
  assert.equal(h.questions[0], GATE_PRE_Q);
  assert.match(h.text(), /- Cổng phiên bản trước deploy: KHÔNG ĐẠT \(chủ chọn tiếp tục\)/);
});

test("trien-khai (cổng trước): mã 2 (hay mã lạ) → dừng, không hỏi, KHÔNG áp, KHÔNG deploy — không bao giờ coi là đạt", async () => {
  for (const code of [2, 3, 127]) {
    const h = harness(tkScript({ [GATE_PRE]: { code, stdout: "", stderr: "" } }), []);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, UNTIL_PRE);
    assertNothingDangerous(h.calls);
    assert.deepEqual(h.questions, []);
    assert.ok(h.text().includes(`KHÔNG CHẠY ĐƯỢC (mã ${code})`), h.text());
  }
});

test("trien-khai (cổng sau): đạt ngay → không chờ, không thử lại, thoát 0", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  const s = fakeSleep();
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: s.sleep }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST]);
  assert.deepEqual(s.waits, []);
  assert.match(h.text(), /- Cổng phiên bản sau deploy: ĐẠT/);
});

test("trien-khai (cổng sau): hỏng lần đầu, đạt ở lần thử lại → sleep đúng 1 lần, thoát 0", async () => {
  for (const first of [1, 2]) {
    const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
    withPostSeq(h, [{ code: first, stdout: "", stderr: "" }, OK]);
    const s = fakeSleep();
    assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: s.sleep }), 0);
    assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST, GATE_POST]);
    assert.equal(s.waits.length, 1);
    assert.ok((s.waits[0] ?? 0) > 0, "phải chờ một khoảng dương");
    assert.match(h.text(), /- Cổng phiên bản sau deploy: ĐẠT/);
  }
});

test("trien-khai (cổng sau): hỏng cả hai lần → audit vẫn chạy trước, tóm tắt vẫn in đủ, in lệnh chạy lại tay, thoát 1", async () => {
  for (const [code, label] of [[1, "- Cổng phiên bản sau deploy: KHÔNG ĐẠT"], [2, "- Cổng phiên bản sau deploy: KHÔNG CHẠY ĐƯỢC (mã 2)"]] as const) {
    const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
    withPostSeq(h, [{ code, stdout: "", stderr: "" }, { code, stdout: "", stderr: "" }]);
    const s = fakeSleep();
    assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: s.sleep, version: "1.4" }), 1);
    assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST, GATE_POST]);
    assert.equal(s.waits.length, 1);
    const t = h.text();
    assert.ok(t.includes(label), t);
    assert.match(t, /node scripts\/kiem-phien-ban\.mjs --sau-deploy/);
    for (const line of [/- Ngày giờ:/, /- Commit:/, /- e2e:/, /- Migration đã áp:/, /- Worker Version ID:/, /- Kiểm dữ liệu \(audit-invariants --db remote\): ĐẠT/, /- Phiên bản: 1\.4/, /- Cổng phiên bản trước deploy: ĐẠT/]) {
      assert.match(t, line);
    }
  }
});

test("trien-khai (cổng sau): audit KHÔNG ĐẠT mà cổng sau ĐẠT → vẫn thoát 1 (0 chỉ khi cả hai đạt)", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE), [AUDIT]: FAIL }), ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: fakeSleep().sleep }), 1);
  assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST]);
});

test("trien-khai (cổng sau): bộ chạy NÉM LỖI ở cổng sau → vẫn in đủ tóm tắt, ghi KHÔNG CHẠY ĐƯỢC, thoát 1", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  const run = h.deps.run;
  h.deps.run = (cmd, args, opts) => {
    if (key(cmd, args, opts) === GATE_POST) throw new Error("bộ chạy hỏng giả");
    return run(cmd, args, opts);
  };
  const s = fakeSleep();
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: s.sleep, version: "1.4" }), 1);
  assert.equal(s.waits.length, 1, "vẫn chờ rồi thử lại một lần");
  const t = h.text();
  assert.ok(t.includes("- Cổng phiên bản sau deploy: KHÔNG CHẠY ĐƯỢC"), t);
  assert.match(t, /- Phiên bản: 1\.4/);
  assert.match(t, /- Kiểm dữ liệu \(audit-invariants --db remote\): ĐẠT/);
  assert.match(t, /node scripts\/kiem-phien-ban\.mjs --sau-deploy/);
});

test("trien-khai (cổng sau): sleep NÉM LỖI → vẫn thử lại, vẫn in đủ tóm tắt, thoát 1 khi cả hai lần hỏng", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  withPostSeq(h, [FAIL, FAIL]);
  const sleep = async () => {
    throw new Error("chờ hỏng giả");
  };
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep, version: "1.4" }), 1);
  assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT, GATE_POST, GATE_POST]);
  const t = h.text();
  assert.ok(t.includes("- Cổng phiên bản sau deploy: KHÔNG ĐẠT"), t);
  assert.match(t, /- Phiên bản: 1\.4/);
  assert.match(t, /- Kiểm dữ liệu \(audit-invariants --db remote\): ĐẠT/);
});

// ─────────── phòng ngừa lỗi Cloudflare 7403 (chủ dự án 2026-10-01: "lỗi này tôi bị nhiều lần rồi") ───────────

test("trien-khai (7403): kiểm đăng nhập Cloudflare (wrangler whoami — làm mới vé đăng nhập) TRƯỚC lời gọi D1 đầu tiên", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.ok(h.calls.indexOf(WHOAMI) >= 0 && h.calls.indexOf(WHOAMI) < h.calls.indexOf(LIST), h.calls.join(" | "));
});

test("trien-khai (7403): chưa đăng nhập (whoami lỗi hoặc không thấy 'You are logged in') → DỪNG trước D1, chỉ cách wrangler login", async () => {
  for (const who of [FAIL, out("You are not authenticated. Please run `wrangler login`.\n")]) {
    const h = harness(tkScript({ [WHOAMI]: who }));
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.ok(!h.calls.includes(LIST), "không gọi D1 khi chưa đăng nhập");
    assertNothingDangerous(h.calls);
    assert.match(h.text(), /npx wrangler login/);
  }
});

test("trien-khai (7403): cổng chỉ-đọc gặp 7403 MỘT lần → chờ rồi tự thử lại đúng một lần, đi tiếp bình thường", async () => {
  const slept: number[] = [];
  const h = harness(tkScript({ [LIST]: [LOI_7403, out(LIST_0023)] }), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async (ms: number) => void slept.push(ms) }), 0);
  assert.equal(h.calls.filter((c) => c === LIST).length, 2);
  assert.deepEqual(slept.filter((ms) => ms === 5_000).length, 1, `chờ đúng 5 giây một lần: ${slept.join(",")}`);
  assert.match(h.text(), /7403/);
});

test("trien-khai (7403): gặp 7403 HAI lần → DỪNG, câu tiếng Việt chỉ cách xử lý; lỗi khác 7403 KHÔNG thử lại; không bước ghi nào chạy", async () => {
  const h = harness(tkScript({ [LIST]: [LOI_7403, LOI_7403] }));
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.equal(h.calls.filter((c) => c === LIST).length, 2);
  assertNothingDangerous(h.calls);
  const t = h.text();
  assert.match(t, /7403/);
  assert.match(t, /npm run trien-khai/);
  assert.match(t, /npx wrangler login/);

  const h2 = harness(tkScript({ [LIST]: FAIL }));
  assert.notEqual(await lib.trienKhai({ ...h2.deps, now: NOW, sleep: async () => {} }), 0);
  assert.equal(h2.calls.filter((c) => c === LIST).length, 1, "lỗi không phải 7403 (mất mạng…) → không thử lại");
});

test("trien-khai (7403): lỗi 7403 có chèn mã màu ANSI vẫn được nhận ra và thử lại", async () => {
  const mau: RunResult = { code: 1, stdout: "", stderr: "\x1b[31m✘ [ERROR]\x1b[0m The given account is not valid or is not \x1b[1mauthorized\x1b[0m to access this service [code: \x1b[1m7403\x1b[0m]\n" };
  const h = harness(tkScript({ [LIST]: [mau, out(LIST_0023)] }), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.equal(h.calls.filter((c) => c === LIST).length, 2);
});

test("trien-khai (7403): bước GHI gặp 7403 (áp migration, deploy) → KHÔNG BAO GIỜ tự thử lại, dừng", async () => {
  const h = harness(tkScript({ [APPLY]: LOI_7403 }), ["c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.equal(h.calls.filter((c) => c === APPLY).length, 1);
  assert.ok(!h.calls.includes(DEPLOY));

  const h2 = harness(tkScript({ [DEPLOY]: LOI_7403 }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h2.deps, now: NOW, sleep: async () => {} }), 0);
  assert.equal(h2.calls.filter((c) => c === DEPLOY).length, 1);
});
