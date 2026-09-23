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
  trienKhai: (deps: Deps & { now?: () => Date }) => Promise<number>;
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
function harness(script: Record<string, RunResult>, answers: string[] = [], isTTY = true) {
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
      const r = script[k];
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
    "git diff --name-only --diff-filter=A origin/main main -- migrations/": out("migrations/0023_auth_passkey.sql\n"),
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
  "git diff --name-only --diff-filter=A origin/main main -- migrations/",
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
  const script = dayLenScript({ "git diff --name-only --diff-filter=A origin/main main -- migrations/": out("") });
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
  { name: "chủ trả lời k", answers: ["k"], reason: /Không đẩy/, lastCall: "git diff --name-only --diff-filter=A origin/main main -- migrations/" },
  { name: "chủ trả lời 'có' (không đúng c)", answers: ["có"], reason: /Không đẩy/ },
  { name: "chủ trả lời 'C' hoa", answers: ["C"], reason: /Không đẩy/ },
  { name: "chủ bấm Enter", answers: [""], reason: /Không đẩy/ },
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
const LIST = "CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote";
const TT = "CI=1 npx wrangler d1 time-travel info tourdao-sales-db --json";
const APPLY = "CI=1 npx wrangler d1 migrations apply tourdao-sales-db --remote";
const DEPLOY = "CI=1 npx wrangler deploy";
const AUDIT = "node scripts/audit-invariants.mjs --db remote";
function tkScript(over: Record<string, RunResult> = {}): Record<string, RunResult> {
  return {
    "git rev-parse --abbrev-ref HEAD": out("main\n"),
    "git status --porcelain": out(""),
    "git fetch origin": OK,
    "git rev-parse main": out(`${HEAD}\n`),
    "git rev-parse origin/main": out(`${HEAD}\n`),
    "git log -1 --oneline --no-decorate main": out("ccccccc Thêm Face ID\n"),
    [LIST]: out(LIST_0023),
    "npm test": OK,
    "npm run typecheck": OK,
    "npm run build:web": OK,
    [TT]: out('{\n  "bookmark": "00000085-0000024c-00004e3f-abc"\n}\n'),
    [APPLY]: OK,
    [DEPLOY]: out("Uploaded tourdao-sales\nCurrent Version ID: 3245256e-1111-2222-3333-444455556666\n"),
    [AUDIT]: OK,
    ...over,
  };
}
const TK_PREFIX = ["git rev-parse --abbrev-ref HEAD", "git status --porcelain", "git fetch origin", "git rev-parse main", "git rev-parse origin/main", "git log -1 --oneline --no-decorate main", LIST, "npm test", "npm run typecheck", "npm run build:web"];
const NOW = () => new Date("2026-09-23T03:04:05.000Z");

test("trien-khai (tiêu chí 4): còn migration + trả lời c, c → áp migration → deploy → kiểm dữ liệu, đúng thứ tự", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, APPLY, DEPLOY, AUDIT]);
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
  assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT]);
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
    assert.deepEqual(h.calls, [...TK_PREFIX, DEPLOY, AUDIT]);
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
  for (const k of ["npm test", "npm run typecheck", "npm run build:web", APPLY, AUDIT]) assert.equal(seen[k]?.stream, true, `${k} phải stream`);
  assert.equal(seen[DEPLOY]?.tee, true, "deploy phải vừa hiện vừa bắt đầu ra (để lấy Version ID)");
  assert.ok(!seen[LIST]?.stream && !seen[TT]?.stream, "lệnh đọc phải bắt đầu ra để phân tích");
});
