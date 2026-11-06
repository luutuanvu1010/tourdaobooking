// Bộ kiểm cho hai lệnh chủ dự án tự gõ: `npm run day-len` và `npm run trien-khai` (đặc tả docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md).
// Chỉ kiểm LOGIC THUẦN ở scripts/release-lib.mjs bằng một bộ chạy lệnh GIẢ: không bài kiểm nào chạy git/wrangler thật, và KHÔNG bài nào gọi
// scripts/day-len.mjs hay scripts/trien-khai.mjs (chúng chạy bên trong chính `npm test` của lệnh day-len — gọi lồng sẽ đẩy thật).
// Bộ chạy giả NÉM LỖI khi gặp lệnh không có trong kịch bản: nhờ vậy danh sách lệnh đã gọi (so khớp nguyên thứ tự) là bằng chứng đầy đủ.
// Mẫu đầu ra wrangler ở src/release-lib.fixtures/ là đầu ra THẬT của `wrangler d1 migrations list … --local --persist-to <thư mục tạm>` (wrangler 4.135.0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

type RunResult = { code: number; stdout: string; stderr: string };
type RunOpts = { env?: Record<string, string>; stream?: boolean; tee?: boolean };
type Kho = { docBanGhi: (sha: string) => Promise<any>; ghiBanGhi: (sha: string, b: any) => Promise<void>; taiKetQua: (id: number) => Promise<any> };
type Deps = {
  run: (cmd: string, args: string[], opts?: RunOpts) => RunResult | Promise<RunResult>;
  ask: (q: string) => Promise<string>;
  isTTY: boolean;
  log: (line: string) => void;
  kho: Kho;
};
type Lib = {
  parsePendingMigrations: (out: string) => { ok: true; names: string[] } | { ok: false; reason: string };
  parseBookmark: (out: string) => string | null;
  parseVersionId: (out: string) => string | null;
  dayLen: (deps: Deps & { target?: string; now?: () => Date; sleep?: (ms: number) => Promise<void> }) => Promise<number>;
  trienKhai: (deps: Deps & { now?: () => Date; sleep?: (ms: number) => Promise<void>; version?: string; docMocTinDoi?: () => Promise<string>; docCacKho?: () => Promise<{ binding: string; ten: string }[] | null> }) => Promise<number>;
  DUOI_MIGRATION_TIN_DOI: string;
  coMigrationTinDoi: (pending: string[]) => boolean;
  kiemMocTinDoi: (pending: string[], mocIso: unknown, nowMs: number) => { ok: true; kiem: boolean } | { ok: false; reason: string };
  docMocTinDoiMacDinh: () => Promise<string>;
  NHAN_KHO: Record<string, string>;
  docCacKhoTuCauHinh: (text: string) => { binding: string; ten: string }[] | null;
  docCacKhoMacDinh: () => Promise<{ binding: string; ten: string }[] | null>;
  parseR2BucketNames: (out: string) => string[];
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

const HEAD = "c".repeat(40);
/** Bản ghi kết luận day-len hợp lệ cho HEAD (ADR-0176 Đ2.2) — mặc định của kho giả; từng ca sửa đúng một chỗ. */
const BAN_GHI_XANH = { sha: HEAD, luc: "2026-09-23T02:05:00.000Z", runId: 4242, runUrl: "https://github.com/luutuanvu1010/tourdaobooking/actions/runs/4242", ketQua: "xanh", xanhLuc: "2026-09-23T02:00:00Z", choQua: null, quyTrinh: null, soLieu: null, chang: [{ ten: "chờ GitHub kiểm", giay: 360 }], giayDayLen: 400 };
/** Kho bản ghi / kết quả tổng GIẢ (không đụng đĩa): `banGhi` theo sha, `ketQua` theo id lượt kiểm; ghi lại mọi lần ghi. */
function khoGia(banGhi: Record<string, any> = { [HEAD]: BAN_GHI_XANH }, ketQua: Record<number, any> = {}) {
  const daGhi: { sha: string; banGhi: any }[] = [];
  const kho: Kho = {
    docBanGhi: async (sha) => (sha in banGhi ? structuredClone(banGhi[sha]) : null),
    ghiBanGhi: async (sha, b) => void daGhi.push({ sha, banGhi: b }),
    taiKetQua: async (id) => (id in ketQua ? structuredClone(ketQua[id]) : null),
  };
  return { kho, daGhi };
}

/** Bộ chạy lệnh giả: kịch bản = bảng "chuỗi lệnh → kết quả"; lệnh lạ → ném lỗi (không cho lọt lệnh chưa lường). */
function harness(script: Record<string, RunResult | RunResult[]>, answers: string[] = [], isTTY = true, kho: Kho = khoGia().kho) {
  const calls: string[] = [];
  const lines: string[] = [];
  const questions: string[] = [];
  const deps: Deps = {
    kho,
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

// Đẩy nhánh chờ kiểm `cho-kiem/<sha>` (ADR-0176 Đ2.1) là bước BÌNH THƯỜNG trước câu c/k — không tính là nguy hiểm; đẩy main / deploy / áp migration thì có.
const DANGEROUS = /(?:^|\s)(?:git push origin main|wrangler deploy|migrations apply)(?:\s|$)|--force|(?:^|\s)-f(?:\s|$)/;
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

// ─────────────────────────── day-len (ADR-0176: chờ kiểm đủ bộ trên GitHub rồi mới đẩy main) ───────────────────────────

const { TEP_DIEU_KHIEN } = (await import(new URL("../scripts/kiem-phan.mjs", import.meta.url).href)) as { TEP_DIEU_KHIEN: string[] };
const OLD = "a".repeat(40);
const NEW = "b".repeat(40);
const GOC = "e".repeat(40);
const R = "luutuanvu1010/tourdaobooking";
const RUN_FIELDS = "databaseId,headSha,status,conclusion,url,attempt,event,createdAt,updatedAt";
const RUNLIST = (sha: string) => `gh run list -R ${R} --workflow kiem.yml --commit ${sha} --limit 20 --json ${RUN_FIELDS}`;
const RUNVIEW = (id: number) => `gh run view ${id} -R ${R} --json ${RUN_FIELDS},jobs`;
const RERUN = (id: number) => `gh run rerun ${id} -R ${R} --failed`;
const PUSH_CHO = `git push origin ${NEW}:refs/heads/cho-kiem/${NEW}`;
const CTRL_DIFF = `git diff --name-only --no-renames origin/main main -- ${TEP_DIEU_KHIEN.filter((t) => t !== "package.json").join(" ")}`;
const PKG = JSON.stringify({ scripts: { test: "node scripts/chay-test.mjs", typecheck: "tsc", "test:e2e": "node tests/e2e/run.mjs", "build:web": "esbuild a" }, devDependencies: { wrangler: "^4" } });
const luot = (o: Record<string, unknown> = {}) => ({ databaseId: 4242, headSha: NEW, status: "completed", conclusion: "success", url: "https://github.com/x/actions/runs/4242", attempt: 1, event: "push", createdAt: "2026-09-23T01:55:00Z", updatedAt: "2026-09-23T02:00:00Z", ...o });
const viewOf = (o: Record<string, unknown> = {}, jobs = [{ name: "npm test phần 1", status: "completed", conclusion: "success" }, { name: "Gom kết quả kiểm", status: "completed", conclusion: "success" }]) => out(JSON.stringify({ ...luot(o), jobs }));
const TONG = (o: Record<string, number> = {}) => ({ ok: true, baiDo: [], tong: { soTep: 833, soBai: 8033, soBoQua: 2, soKichBan: 79, ...o } });
const LUOT_GOC = { databaseId: 4100, headSha: GOC, status: "completed", conclusion: "success", createdAt: "2026-09-22T01:00:00Z" };
const DUNG_HONG = { "gh run list": 0 };
void DUNG_HONG;

/** Kịch bản day-len mà mọi bước đều đạt; từng ca sửa đúng một dòng. `coNhanh` = có tên nhánh (git rev-parse main gọi hai lần: mã cũ, rồi mã mới). */
function dayLenScript(over: Record<string, RunResult | RunResult[]> = {}, coNhanh = true): Record<string, RunResult | RunResult[]> {
  return {
    "git rev-parse --abbrev-ref HEAD": out("main\n"),
    "git status --porcelain": out(""),
    "git fetch origin": OK,
    "git merge-base --is-ancestor origin/main main": OK,
    "git merge-base --is-ancestor main worktree-x": OK,
    "git rev-parse main": coNhanh ? [out(`${OLD}\n`), out(`${NEW}\n`)] : [out(`${NEW}\n`)],
    "git merge --ff-only worktree-x": OK,
    "git rev-list --count origin/main..main": out("2\n"),
    "git log --oneline --no-decorate origin/main..main": out("b1 Thêm Face ID\nb2 Nhật ký\n"),
    "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/": out("migrations/0023_auth_passkey.sql\n"),
    "git rev-parse origin/main": out(`${GOC}\n`),
    [CTRL_DIFF]: out(""),
    "git show origin/main:package.json": out(PKG),
    "git show main:package.json": out(PKG),
    "gh auth status": OK,
    [PUSH_CHO]: OK,
    [RUNLIST(NEW)]: out(JSON.stringify([luot()])),
    [RUNVIEW(4242)]: viewOf(),
    [RUNLIST(GOC)]: out(JSON.stringify([LUOT_GOC])),
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
  "git rev-list --count origin/main..main",
  "git log --oneline --no-decorate origin/main..main",
  "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/",
  "git rev-parse main",
  "git rev-parse origin/main",
  CTRL_DIFF,
  "git show origin/main:package.json",
  "git show main:package.json",
  "gh auth status",
  PUSH_CHO,
  RUNLIST(NEW),
  RUNVIEW(4242),
  RUNLIST(GOC),
  "git push origin main",
  "git log -1 --oneline --no-decorate origin/main",
];
/** Đồng hồ giả: sleep(ms) làm đồng hồ tiến đúng ms (để thử hết giờ chờ mà không chờ thật). */
function dongHoGia(batDau = Date.parse("2026-09-23T02:00:00Z")) {
  let t = batDau;
  const waits: number[] = [];
  return { now: () => new Date(t), sleep: async (ms: number) => void (waits.push(ms), (t += ms)), waits, tien: (ms: number) => void (t += ms) };
}
function dl(script: Record<string, RunResult | RunResult[]>, answers: string[] = [], { tty = true, ketQua = { 4242: TONG(), 4100: TONG() } as Record<number, any> } = {}) {
  const k = khoGia({}, ketQua);
  const h = harness(script, answers, tty, k.kho);
  const d = dongHoGia();
  return { ...h, daGhi: k.daGhi, deps: { ...h.deps, now: d.now, sleep: d.sleep }, waits: d.waits };
}

test("day-len (ADR-0176 Đ2.1): mọi thứ đạt + c → đẩy cho-kiem/<sha> (không --force), chờ lượt đúng sha, ghi bản ghi XANH, rồi mới đẩy main", async () => {
  const h = dl(dayLenScript(), ["c"]);
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.deepEqual(h.calls, DAYLEN_HAPPY);
  assert.ok(!h.calls.some((c) => /--force|(?:^|\s)-f(?:\s|$)/.test(c)));
  assert.ok(!h.calls.some((c) => /^npm (test|run typecheck)$/.test(c)), "không còn chạy npm test / typecheck ở máy (Đ1.5)");
  assert.ok(h.calls.indexOf(PUSH_CHO) < h.calls.indexOf("git push origin main"));
  assert.match(h.text(), /0023_auth_passkey\.sql/);
  assert.match(h.text(), /PHẢI áp các migration này trước; dùng `npm run trien-khai`/);
  assert.match(h.text(), /2 commit/);
  assert.match(h.text(), /lần đẩy phụ/);
  assert.deepEqual(h.questions, ["Đẩy lên GitHub? (c/k) "]);
  assert.equal(h.daGhi.length, 1);
  const b = h.daGhi[0]!.banGhi;
  assert.equal(h.daGhi[0]!.sha, NEW);
  assert.equal(b.sha, NEW);
  assert.equal(b.ketQua, "xanh");
  assert.equal(b.runId, 4242);
  assert.equal(b.choQua, null);
  assert.equal(b.quyTrinh, null);
  assert.equal(b.xanhLuc, "2026-09-23T02:00:00Z");
  assert.ok(Number.isInteger(b.giayDayLen) && Array.isArray(b.chang));
});

test("day-len: không có tên nhánh → bỏ bước gộp; không có migration mới → nói rõ 'không có'", async () => {
  const script = dayLenScript({ "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/": out("") }, false);
  const h = dl(script, ["c"]);
  assert.equal(await lib.dayLen(h.deps), 0);
  const ky = DAYLEN_HAPPY.filter((c) => !/worktree-x/.test(c));
  ky.splice(ky.indexOf("git rev-parse main"), 1);
  assert.deepEqual(h.calls, ky);
  assert.match(h.text(), /Migration mới: không có/);
});

test("day-len: không có commit nào để đẩy → dừng êm, không hỏi, không đẩy gì (kể cả nhánh chờ kiểm)", async () => {
  const h = dl(dayLenScript({ "git rev-list --count origin/main..main": out("0\n") }));
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.ok(!h.calls.some((c) => c.startsWith("git push")));
  assert.deepEqual(h.questions, []);
});

const DAYLEN_REFUSALS: { name: string; over?: Record<string, RunResult | RunResult[]>; answers?: string[]; tty?: boolean; reason: RegExp; lastCall?: string; khongDayPhu?: boolean }[] = [
  { name: "không có TTY", tty: false, reason: /terminal thật/ },
  { name: "không ở main", over: { "git rev-parse --abbrev-ref HEAD": out("worktree-x\n") }, reason: /nhánh `main`/, lastCall: "git rev-parse --abbrev-ref HEAD" },
  { name: "cây bẩn", over: { "git status --porcelain": out(" M src/index.ts\n") }, reason: /chưa commit/, lastCall: "git status --porcelain" },
  { name: "git fetch lỗi", over: { "git fetch origin": FAIL }, reason: /git fetch/, lastCall: "git fetch origin" },
  { name: "origin/main không phải tổ tiên", over: { "git merge-base --is-ancestor origin/main main": FAIL }, reason: /đã có người đẩy/, lastCall: "git merge-base --is-ancestor origin/main main" },
  { name: "nhánh không tiến thẳng được", over: { "git merge-base --is-ancestor main worktree-x": FAIL }, reason: /không tiến thẳng/, lastCall: "git merge-base --is-ancestor main worktree-x" },
  { name: "ff-only lỗi", over: { "git merge --ff-only worktree-x": FAIL }, reason: /gộp/, lastCall: "git merge --ff-only worktree-x" },
  { name: "chủ trả lời k", answers: ["k"], reason: /Không đẩy/, lastCall: RUNLIST(GOC) },
  { name: "chủ trả lời 'có' (không đúng c)", answers: ["có"], reason: /Không đẩy/ },
  { name: "chủ trả lời 'C' hoa", answers: ["C"], reason: /Không đẩy/ },
  { name: "chủ bấm Enter", answers: [""], reason: /Không đẩy/ },
  // Mọi lệnh đọc trạng thái mà lỗi thì DỪNG, không bao giờ đoán (không bỏ sót).
  { name: "git rev-parse main lỗi (trước khi gộp)", over: { "git rev-parse main": FAIL }, reason: /không đọc được mã hiện tại của `main`/, lastCall: "git rev-parse main" },
  { name: "git rev-parse main trả rỗng", over: { "git rev-parse main": out("") }, reason: /không đọc được mã hiện tại của `main`/, lastCall: "git rev-parse main" },
  { name: "git rev-list --count lỗi", over: { "git rev-list --count origin/main..main": FAIL }, reason: /không đếm được số commit/, lastCall: "git rev-list --count origin/main..main" },
  { name: "git rev-list --count trả chữ lạ", over: { "git rev-list --count origin/main..main": out("abc\n") }, reason: /không đếm được số commit/, lastCall: "git rev-list --count origin/main..main" },
  { name: "git log danh sách commit lỗi", over: { "git log --oneline --no-decorate origin/main..main": FAIL }, reason: /không đọc được danh sách commit/, lastCall: "git log --oneline --no-decorate origin/main..main" },
  { name: "git diff migration lỗi", over: { "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/": FAIL }, reason: /không liệt kê được migration mới/, lastCall: "git diff --name-only --no-renames --diff-filter=A origin/main main -- migrations/" },
  { name: "không đọc được sha origin/main", over: { "git rev-parse origin/main": FAIL }, reason: /không đọc được mã commit/, lastCall: "git rev-parse origin/main", khongDayPhu: true },
  { name: "so tệp điều khiển kiểm lỗi", over: { [CTRL_DIFF]: FAIL }, reason: /tệp điều khiển việc kiểm/, lastCall: CTRL_DIFF, khongDayPhu: true },
  { name: "chưa đăng nhập gh", over: { "gh auth status": FAIL }, reason: /gh auth login/, lastCall: "gh auth status", khongDayPhu: true },
  { name: "đẩy nhánh chờ kiểm lỗi", over: { [PUSH_CHO]: FAIL }, reason: /nhánh chờ kiểm/, lastCall: PUSH_CHO },
  { name: "không đọc được danh sách lượt kiểm", over: { [RUNLIST(NEW)]: FAIL }, reason: /gh run list/, lastCall: RUNLIST(NEW) },
  { name: "lượt kiểm thuộc commit khác", over: { [RUNVIEW(4242)]: viewOf({ headSha: GOC }) }, reason: /thuộc commit/, lastCall: RUNVIEW(4242) },
  { name: "lượt kiểm đỏ + chủ chọn dừng (d)", over: { [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }, answers: ["d"], reason: /lượt kiểm đỏ — dừng/, lastCall: RUNVIEW(4242) },
  { name: "lượt kiểm đỏ + trả lời lạ (coi là dừng)", over: { [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }, answers: ["c"], reason: /lượt kiểm đỏ — dừng/ },
  { name: "lượt kiểm đỏ + cho qua mà không gõ lý do", over: { [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }, answers: ["q", "  "], reason: /không có lý do cho qua/ },
  { name: "lượt kiểm đỏ + lý do quá ngắn", over: { [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }, answers: ["q", "ok"], reason: /không có lý do cho qua/ },
  { name: "chạy lại phần đỏ lỗi", over: { [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }), [RERUN(4242)]: FAIL }, answers: ["r"], reason: /gh run rerun/, lastCall: RERUN(4242) },
  { name: "đổi quy trình kiểm mà không gõ lý do", over: { [CTRL_DIFF]: out(".github/workflows/kiem.yml\n"), "git diff --stat origin/main main -- .github/workflows/kiem.yml": out(" kiem.yml | 2 +-\n") }, answers: [""], reason: /không có lý do đổi quy trình kiểm/ },
];

for (const c of DAYLEN_REFUSALS) {
  test(`day-len (tiêu chí 1): từ chối và KHÔNG đẩy main khi ${c.name}`, async () => {
    const h = dl(dayLenScript(c.over), c.answers ?? [], { tty: c.tty ?? true });
    const code = await lib.dayLen({ ...h.deps, target: "worktree-x" });
    assert.notEqual(code, 0);
    assertNothingDangerous(h.calls);
    assert.ok(!h.calls.includes("git push origin main"));
    assert.equal(h.daGhi.length, 0, "không ghi bản ghi kết luận khi không đẩy");
    assert.match(h.text(), c.reason);
    if (c.tty === false) assert.deepEqual(h.calls, [], "ngoài TTY: không được gọi lệnh nào");
    if (c.lastCall) assert.equal(h.calls.at(-1), c.lastCall, "phải dừng NGAY ở bước hỏng");
    if (c.khongDayPhu) assert.ok(!h.calls.includes(PUSH_CHO), "hỏng trước bước đẩy phụ ⇒ không đẩy gì lên GitHub");
  });
}

test("day-len: đã gộp rồi mà lượt kiểm đỏ / trả lời k → in lệnh quay main về chỗ cũ, KHÔNG tự chạy", async () => {
  for (const [over, answers] of [[{ [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }, ["d"]], [{}, ["k"]]] as const) {
    const h = dl(dayLenScript(over), [...answers]);
    assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
    assert.ok(h.text().includes(`git reset --hard ${OLD}`), "phải in lệnh quay lại");
    assert.ok(!h.calls.some((c) => c.startsWith("git reset")), "không được tự chạy git reset");
  }
});

test("day-len: tên nhánh dạng tuỳ chọn (bắt đầu bằng '-') hoặc có ký tự lạ → từ chối trước khi gọi git", async () => {
  for (const target of ["--force", "-f", "a b", "x;rm", ""]) {
    const h = dl(dayLenScript());
    assert.notEqual(await lib.dayLen({ ...h.deps, target }), 0, target);
    assert.deepEqual(h.calls, [], `không gọi lệnh nào với tên nhánh ${JSON.stringify(target)}`);
  }
});

test("day-len: push main lỗi → thoát khác 0, báo rõ", async () => {
  const h = dl(dayLenScript({ "git push origin main": FAIL }), ["c"]);
  assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.match(h.text(), /git push origin main/);
});

test("day-len: lượt kiểm chưa hiện / đang chạy → chờ (sleep), in tiến độ từng phần, nhận khi xong; chỉ nhận lượt có head_sha đúng", async () => {
  const dangChay = out(JSON.stringify({ ...luot({ status: "in_progress", conclusion: "" }), jobs: [{ name: "npm test phần 1", status: "completed", conclusion: "success" }, { name: "e2e phần 1", status: "in_progress", conclusion: "" }] }));
  const h = dl(dayLenScript({ [RUNLIST(NEW)]: [out("[]"), out(JSON.stringify([luot({ headSha: GOC, databaseId: 1 })])), out(JSON.stringify([luot({ headSha: GOC, databaseId: 1 }), luot()]))], [RUNVIEW(4242)]: [dangChay, viewOf()] }), ["c"]);
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.equal(h.calls.filter((c) => c === RUNLIST(NEW)).length, 3);
  assert.equal(h.calls.filter((c) => c === RUNVIEW(4242)).length, 2);
  assert.ok(!h.calls.includes(RUNVIEW(1)), "không bao giờ đọc lượt của commit khác");
  assert.equal(h.waits.length, 3);
  assert.match(h.text(), /đang kiểm: 1\/2 phần xong/);
  assert.match(h.text(), /xong: 2\/2 phần xong/);
});

test("day-len: GitHub không có lượt kiểm sau 5 phút / lượt chạy quá 45 phút → DỪNG (không treo mãi), không đẩy main", async () => {
  const h1 = dl(dayLenScript({ [RUNLIST(NEW)]: out("[]") }));
  assert.notEqual(await lib.dayLen({ ...h1.deps, target: "worktree-x" }), 0);
  assert.match(h1.text(), /chưa có lượt kiểm/);
  assert.ok(!h1.calls.includes("git push origin main"));
  const h2 = dl(dayLenScript({ [RUNVIEW(4242)]: viewOf({ status: "in_progress", conclusion: "" }) }));
  assert.notEqual(await lib.dayLen({ ...h2.deps, target: "worktree-x" }), 0);
  assert.match(h2.text(), /chưa xong/);
  assert.ok(!h2.calls.includes("git push origin main"));
});

test("day-len (Đ3.1): lượt kiểm đỏ → nêu TÊN bài đỏ (từ tệp gom), hỏi r/d/q", async () => {
  const h = dl(dayLenScript({ [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }), ["d"], { ketQua: { 4242: { ...TONG(), ok: false, baiDo: ["e2e catalog", "src/x.test.ts: ca giả"] }, 4100: TONG() } });
  assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.match(h.text(), /✘ e2e catalog/);
  assert.match(h.text(), /✘ src\/x\.test\.ts: ca giả/);
  assert.match(h.questions[0] ?? "", /Chạy lại phần đỏ \(r/);
});

test("day-len (Đ3.1): đỏ mà không đọc được tệp gom → nêu tên PHẦN đỏ từ GitHub", async () => {
  const h = dl(dayLenScript({ [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }, [{ name: "e2e phần 3", status: "completed", conclusion: "failure" }, { name: "Gom kết quả kiểm", status: "completed", conclusion: "failure" }]) }), ["d"], { ketQua: {} });
  assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.match(h.text(), /✘ phần e2e phần 3/);
});

test("day-len (Đ3.1): đỏ + cho qua có lý do → bản ghi ghi lý do, tên bài đỏ; vẫn hỏi c/k rồi mới đẩy main", async () => {
  const h = dl(dayLenScript({ [RUNVIEW(4242)]: viewOf({ conclusion: "failure" }) }), ["q", "giá Sheet thật vừa đổi", "c"], { ketQua: { 4242: { ...TONG(), ok: false, baiDo: ["e2e catalog"] }, 4100: TONG() } });
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.ok(h.calls.includes("git push origin main"));
  const b = h.daGhi[0]!.banGhi;
  assert.equal(b.ketQua, "do");
  assert.equal(b.choQua.lyDo, "giá Sheet thật vừa đổi");
  assert.deepEqual(b.choQua.baiDo, ["e2e catalog"]);
  assert.equal(b.xanhLuc, null);
  assert.equal(h.questions.at(-1), "Đẩy lên GitHub? (c/k) ");
  assert.match(h.text(), /chủ cho qua: giá Sheet thật vừa đổi/);
});

test("day-len (Đ3.1): đỏ + chạy lại phần đỏ (r) → gh run rerun --failed, chờ lượt chạy lại (attempt mới) xanh rồi đi tiếp như xanh thường", async () => {
  const h = dl(dayLenScript({ [RUNVIEW(4242)]: [viewOf({ conclusion: "failure" }), viewOf({ conclusion: "failure" }), viewOf({ attempt: 2 })], [RERUN(4242)]: OK }), ["r", "c"]);
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.ok(h.calls.includes(RERUN(4242)));
  assert.equal(h.calls.filter((c) => c === RUNVIEW(4242)).length, 3, "lần đọc ngay sau rerun vẫn là lượt cũ (attempt 1) — phải chờ attempt 2");
  assert.equal(h.daGhi[0]!.banGhi.ketQua, "xanh");
  assert.equal(h.daGhi[0]!.banGhi.choQua, null);
});

test("day-len (Đ2.3 + Đ3.2): tệp điều khiển việc kiểm đổi (dù lượt kiểm XANH) → in tệp + khác biệt, đòi lý do, bản ghi ghi 'đổi quy trình kiểm'", async () => {
  const h = dl(dayLenScript({ [CTRL_DIFF]: out(".github/workflows/kiem.yml\nscripts/kiem-phan.mjs\n"), "git diff --stat origin/main main -- .github/workflows/kiem.yml scripts/kiem-phan.mjs": out(" 2 files changed\n") }), ["bỏ phần e2e số 6 vì gộp", "c"]);
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  const t = h.text();
  assert.match(t, /ĐỔI QUY TRÌNH KIỂM/);
  assert.match(t, /\.github\/workflows\/kiem\.yml/);
  assert.match(t, /2 files changed/);
  const b = h.daGhi[0]!.banGhi;
  assert.equal(b.ketQua, "xanh");
  assert.equal(b.quyTrinh.lyDo, "bỏ phần e2e số 6 vì gộp");
  assert.ok(b.quyTrinh.doi.some((x: string) => /kiem\.yml/.test(x)));
});

test("day-len (Đ2.3): package.json đổi lệnh test → đổi quy trình; đổi danh sách trang build:web → KHÔNG phải đổi quy trình", async () => {
  const pk = JSON.parse(PKG);
  const doiTest = JSON.stringify({ ...pk, scripts: { ...pk.scripts, test: "node --test src/a.test.ts" } });
  const h1 = dl(dayLenScript({ "git show main:package.json": out(doiTest), "git diff --stat origin/main main -- package.json": out(" package.json | 2 +-\n") }), ["bớt bài cho nhanh, chủ biết", "c"]);
  assert.equal(await lib.dayLen({ ...h1.deps, target: "worktree-x" }), 0);
  assert.ok(h1.daGhi[0]!.banGhi.quyTrinh.doi.some((x: string) => /package\.json \(scripts\.test\)/.test(x)));
  const doiBuild = JSON.stringify({ ...pk, scripts: { ...pk.scripts, "build:web": "esbuild a b" } });
  const h2 = dl(dayLenScript({ "git show main:package.json": out(doiBuild) }), ["c"]);
  assert.equal(await lib.dayLen({ ...h2.deps, target: "worktree-x" }), 0);
  assert.equal(h2.daGhi[0]!.banGhi.quyTrinh, null);
});

test("day-len (Đ2.3): số tệp / bài / kịch bản giảm, số bài bỏ qua tăng, hay origin/main KHÔNG có lượt kiểm để so (lần đầu) → đòi lý do", async () => {
  const ca: [string, Record<number, any>, Record<string, RunResult>, RegExp][] = [
    ["số bài giảm", { 4242: TONG({ soBai: 8000 }), 4100: TONG() }, {}, /số bài kiểm giảm: 8033 → 8000/],
    ["số tệp giảm", { 4242: TONG({ soTep: 832 }), 4100: TONG() }, {}, /số tệp kiểm giảm/],
    ["số kịch bản giảm", { 4242: TONG({ soKichBan: 78 }), 4100: TONG() }, {}, /số kịch bản e2e giảm/],
    ["bỏ qua tăng", { 4242: TONG({ soBoQua: 3 }), 4100: TONG() }, {}, /bỏ qua \(skip\/todo\) tăng: 2 → 3/],
    ["không có lượt của origin/main", { 4242: TONG() }, { [RUNLIST(GOC)]: out("[]") }, /không có lượt kiểm của origin\/main/],
    ["không tải được tệp gom của lượt này", { 4100: TONG() }, {}, /không đọc được số tệp/],
  ];
  for (const [ten, ketQua, over, re] of ca) {
    const h = dl(dayLenScript(over), ["", "c"], { ketQua });
    assert.notEqual(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0, `${ten}: không lý do ⇒ dừng`);
    assert.match(h.text(), re, ten);
    assert.ok(!h.calls.includes("git push origin main"), ten);
    const h2 = dl(dayLenScript(over), ["chủ đã biết và đồng ý", "c"], { ketQua });
    assert.equal(await lib.dayLen({ ...h2.deps, target: "worktree-x" }), 0, `${ten}: có lý do ⇒ đi tiếp`);
    assert.equal(h2.daGhi[0]!.banGhi.quyTrinh.lyDo, "chủ đã biết và đồng ý");
  }
});

test("day-len: số liệu tăng / bằng (thêm bài) → xanh thường, không hỏi lý do", async () => {
  const h = dl(dayLenScript(), ["c"], { ketQua: { 4242: TONG({ soBai: 8040, soTep: 834 }), 4100: TONG() } });
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.deepEqual(h.questions, ["Đẩy lên GitHub? (c/k) "]);
});

test("day-len: ghi bản ghi kết luận lỗi → KHÔNG đẩy main (trien-khai sẽ thiếu bản ghi)", async () => {
  const k = khoGia({}, { 4242: TONG(), 4100: TONG() });
  k.kho.ghiBanGhi = async () => {
    throw new Error("đĩa đầy");
  };
  const h = harness(dayLenScript(), ["c"], true, k.kho);
  const d = dongHoGia();
  assert.notEqual(await lib.dayLen({ ...h.deps, now: d.now, sleep: d.sleep, target: "worktree-x" }), 0);
  assert.ok(!h.calls.includes("git push origin main"));
  assert.match(h.text(), /không ghi được bản ghi kết luận kiểm \(đĩa đầy\)/);
});

test("day-len: thời gian từng chặng KHÔNG tính lúc chờ chủ trả lời (Đ1.1)", async () => {
  const k = khoGia({}, { 4242: TONG(), 4100: TONG() });
  const d = dongHoGia();
  const h = harness(dayLenScript({ [RUNVIEW(4242)]: [viewOf({ status: "in_progress", conclusion: "" }), viewOf()] }), [], true, k.kho);
  h.deps.ask = async () => {
    d.tien(30 * 60e3); // chủ suy nghĩ 30 phút ở câu c/k
    return "c";
  };
  assert.equal(await lib.dayLen({ ...h.deps, now: d.now, sleep: d.sleep, target: "worktree-x" }), 0);
  const b = k.daGhi[0]!.banGhi;
  assert.equal(b.giayDayLen, 15, "chỉ 15 giây chờ GitHub (một nhịp hỏi); 30 phút suy nghĩ không tính");
  assert.ok(b.chang.some((c: any) => c.ten === "chờ GitHub kiểm" && c.giay === 15));
});

// ─────────────────────────── trien-khai ───────────────────────────

const WHOAMI = "CI=1 npx wrangler whoami";
const WHOAMI_OK = out("👋 You are logged in with an OAuth Token, associated with the email x@y.z.\n");
/** ADR-0094 đ4 (L13): cổng chỉ-đọc kiểm TÊN khoá bí mật đã đặt (không đọc giá trị). Đầu ra mẫu theo dạng `--format json` của wrangler 4. */
const SECRETS = "CI=1 npx wrangler secret list --format json";
const SECRETS_OK = out('[\n  {\n    "name": "LAN_GUI_SECRET",\n    "type": "secret_text"\n  },\n  {\n    "name": "MFA_ENCRYPTION_KEY",\n    "type": "secret_text"\n  },\n  {\n    "name": "SESSION_SECRET",\n    "type": "secret_text"\n  }\n]\n');
const LIST = "CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote";
/** ADR-0123 (cổng 1e): kho tệp hồ sơ R2 đã tạo chưa. Dạng đầu ra theo MÃ NGUỒN wrangler 4.147.0 (`formatLabelledValues`: nhãn, dấu hai chấm, khoảng đệm) —
 *  CHƯA chụp từ tài khoản thật (AI không chạy lệnh Cloudflare; kế hoạch H-2 "Giới hạn"). */
const KHO = "CI=1 npx wrangler r2 bucket list";
const KHO_OK = out("\n ⛅️ wrangler 4.147.0\n───────────────────\nListing buckets...\nname:           tourdao-booking-anh\ncreation_date:  2026-09-01T00:00:00.000Z\n\nname:           tourdao-sales-ho-so\ncreation_date:  2026-10-16T03:00:00.000Z\n\nname:           tourdao-sales-ho-tro\ncreation_date:  2026-10-28T03:00:00.000Z\n\nname:           tourdao-sales-ve-dien-tu\ncreation_date:  2026-10-31T03:00:00.000Z\n");
/** Lỗi THẬT chủ dự án gặp 2026-10-01 (cũng 26/9, 29/9): lần gọi đầu bị từ chối, chạy lại là qua. */
const LOI_7403: RunResult = { code: 1, stdout: "", stderr: "✘ [ERROR] A request to the Cloudflare API (/accounts/381557e4e08091d31a3235baf2513df6/d1/database/bcd4c0ac/query) failed.\n\n  The given account is not valid or is not authorized to access this service [code: 7403]\n" };
const TT = "CI=1 npx wrangler d1 time-travel info tourdao-sales-db --json";
const APPLY = "CI=1 npx wrangler d1 migrations apply tourdao-sales-db --remote";
const DEPLOY = "CI=1 npx wrangler deploy";
const AUDIT = "node scripts/audit-invariants.mjs --db remote";
/** ADR-0176 Đ2.2: trien-khai ĐỌC check-run của đúng commit main (một lần, chỉ đọc) thay cho npm test / typecheck / e2e. */
const CHECKS = `gh api repos/luutuanvu1010/tourdaobooking/commits/${HEAD}/check-runs?per_page=100`;
const checkRun = (o: Record<string, unknown> = {}) => ({ name: "npm test phần 1", status: "completed", conclusion: "success", head_sha: HEAD, completed_at: "2026-09-23T01:58:00Z", app: { slug: "github-actions" }, ...o });
const GOM = (o: Record<string, unknown> = {}) => checkRun({ name: "Gom kết quả kiểm", completed_at: "2026-09-23T02:00:00Z", ...o });
const checksOut = (runs: unknown[], total = runs.length) => out(JSON.stringify({ total_count: total, check_runs: runs }));
const KHAC_SHA = "d".repeat(40);
const CHECKS_OK = checksOut([checkRun(), checkRun({ name: "e2e phần 1" }), GOM()]);
const GATE_PRE = "node scripts/kiem-phien-ban.mjs";
const GATE_POST = "node scripts/kiem-phien-ban.mjs --sau-deploy";
function tkScript(over: Record<string, RunResult | RunResult[]> = {}): Record<string, RunResult | RunResult[]> {
  return {
    "git rev-parse --abbrev-ref HEAD": out("main\n"),
    "git status --porcelain": out(""),
    "git fetch origin": OK,
    "git rev-parse main": out(`${HEAD}\n`),
    "git rev-parse origin/main": out(`${HEAD}\n`),
    "git rev-parse HEAD": out(`${HEAD}\n`),
    "git log -1 --oneline --no-decorate main": out("ccccccc Thêm Face ID\n"),
    [WHOAMI]: WHOAMI_OK,
    [SECRETS]: SECRETS_OK,
    [KHO]: KHO_OK,
    [LIST]: out(LIST_0023),
    [GATE_PRE]: out("ĐẠT: bản ở máy 1.4 mới hơn production 1.3.\n"),
    "npm run build:web": OK,
    [CHECKS]: CHECKS_OK,
    [TT]: out('{\n  "bookmark": "00000085-0000024c-00004e3f-abc"\n}\n'),
    [APPLY]: OK,
    [DEPLOY]: out("Uploaded tourdao-sales\nCurrent Version ID: 3245256e-1111-2222-3333-444455556666\n"),
    [AUDIT]: OK,
    [GATE_POST]: out("ĐẠT: production đã là 1.4.\n"),
    ...over,
  };
}
/** So lại mã trong thư mục với mã lúc bắt đầu (HEAD + cây sạch): sau e2e, ngay trước áp migration, ngay trước deploy (sự cố 2026-10-08). */
const CHECK = ["git rev-parse HEAD", "git status --porcelain"];
const TK_PREFIX = ["git rev-parse --abbrev-ref HEAD", "git status --porcelain", "git fetch origin", "git rev-parse main", "git rev-parse origin/main", "git log -1 --oneline --no-decorate main", WHOAMI, SECRETS, KHO, LIST, GATE_PRE, "npm run build:web", CHECKS, ...CHECK];
const NOW = () => new Date("2026-09-23T03:04:05.000Z");
/** Lệnh in cho chủ tự chạy khi migration ĐÃ áp mà Worker chưa deploy: (kiểm cây sạch → về đúng mã đã kiểm → kiểm lại → deploy) → kiểm dữ liệu → cổng sau → về main. */
function assertLenhDeployDungMa(t: string) {
  // Dòng đầu móc `&&`: cây bẩn (trước hoặc sau khi đổi mã) ⇒ máy tự dừng trước deploy, kể cả khi chủ dán cả khối một lần (đã thử trong `zsh -f -i` thật 8/10).
  const thuTu = [
    `test -z "$(git status --short)" && git switch --detach ${HEAD} && test -z "$(git status --short)" && CI=1 npx wrangler deploy || echo "DỪNG: chưa phát hành, hỏi người phụ trách kỹ thuật"`,
    "node scripts/audit-invariants.mjs --db remote",
    "node scripts/kiem-phien-ban.mjs --sau-deploy",
    "git switch main",
  ];
  // Mỗi lệnh phải là MỘT DÒNG TRƠN (bỏ mã màu và khoảng trắng đầu/cuối thì đúng bằng lệnh): chép-dán chạy được trong zsh, không chú thích cùng dòng.
  const dong = t.replace(/\x1b\[[0-9;]*m/g, "").split("\n").map((x) => x.trim());
  let tu = 0;
  for (const l of thuTu) {
    const i = dong.indexOf(l, tu);
    assert.ok(i >= 0, `thiếu, sai thứ tự, hoặc không đứng một mình trên dòng: lệnh "${l}" trong hướng dẫn deploy tay`);
    tu = i + 1;
  }
}

test("trien-khai (tiêu chí 4): còn migration + trả lời c, c → áp migration → deploy → kiểm dữ liệu, đúng thứ tự", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
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
  assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
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
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY]);
  assert.match(h.text(), /\x1b\[31m/, "cảnh báo phải có màu đỏ");
  assert.match(h.text(), /CI=1 npx wrangler deploy/);
  // Lệnh tự chạy phải đưa về ĐÚNG mã đã qua kiểm và kiểm cây sạch TRƯỚC (git switch mang theo thay đổi chưa commit) — review 2026-10-08 M-a.
  assertLenhDeployDungMa(h.text());
});

const TK_REFUSALS: { name: string; over?: Record<string, RunResult>; tty?: boolean; answers?: string[]; reason: RegExp; lastCall?: string }[] = [
  { name: "không có TTY", tty: false, reason: /terminal thật/ },
  { name: "không ở main", over: { "git rev-parse --abbrev-ref HEAD": out("worktree-x\n") }, reason: /nhánh `main`/, lastCall: "git rev-parse --abbrev-ref HEAD" },
  { name: "cây bẩn", over: { "git status --porcelain": out("?? x.txt\n") }, reason: /chưa commit/, lastCall: "git status --porcelain" },
  { name: "git fetch lỗi", over: { "git fetch origin": FAIL }, reason: /git fetch/, lastCall: "git fetch origin" },
  { name: "main khác origin/main", over: { "git rev-parse origin/main": out(`${"d".repeat(40)}\n`) }, reason: /chưa đẩy|khác `origin\/main`/, lastCall: "git rev-parse origin/main" },
  { name: "migrations list lỗi", over: { [LIST]: FAIL }, reason: /migrations list/, lastCall: LIST },
  { name: "migrations list không đọc được", over: { [LIST]: out("Something new\n") }, reason: /không đọc được/, lastCall: LIST },
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
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY]);
  assert.ok(!h.calls.includes(DEPLOY));
  assert.equal(h.questions.length, 1);
  assert.match(h.text(), /KHÔNG deploy/);
});

test("trien-khai: deploy lỗi → không chạy kiểm dữ liệu, thoát khác 0", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE), [DEPLOY]: FAIL }), ["c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY]);
});

test("trien-khai (bước 7): kiểm dữ liệu thoát 1 = KHÔNG ĐẠT, thoát 2 = KHÔNG CHẠY ĐƯỢC (không phải sạch); cả hai thoát khác 0", async () => {
  for (const [code, label] of [[1, /Kiểm dữ liệu: KHÔNG ĐẠT/], [2, /KHÔNG CHẠY ĐƯỢC.*không phải dữ liệu sạch/]] as const) {
    const h = harness(tkScript({ [LIST]: out(LIST_NONE), [AUDIT]: { code, stdout: "", stderr: "" } }), ["c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
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
  for (const k of ["npm run build:web", APPLY, AUDIT, GATE_PRE, GATE_POST]) assert.equal(seen[k]?.stream, true, `${k} phải stream`);
  assert.equal(seen[DEPLOY]?.tee, true, "deploy phải vừa hiện vừa bắt đầu ra (để lấy Version ID)");
  assert.ok(!seen[LIST]?.stream && !seen[TT]?.stream && !seen[CHECKS]?.stream, "lệnh đọc phải bắt đầu ra để phân tích");
});

// ─────────────── ADR-0176 Đ2.2 + Đ3 (tiêu chí 3): trien-khai chỉ ĐỌC kết quả kiểm đủ bộ trên GitHub + bản ghi kết luận của day-len ───────────────

/** trien-khai với kho bản ghi giả `banGhi` (mặc định: bản ghi xanh hợp lệ cho HEAD). */
function tk(over: Record<string, RunResult | RunResult[]> = {}, answers: string[] = [], banGhi: Record<string, any> = { [HEAD]: BAN_GHI_XANH }) {
  return harness(tkScript(over), answers, true, khoGia(banGhi).kho);
}
const DEN_CHECKS = TK_PREFIX.slice(0, TK_PREFIX.indexOf(CHECKS) + 1);

test("trien-khai (ADR-0176 Đ1.5): KHÔNG chạy npm test / typecheck / e2e; build:web rồi MỘT lần đọc check-run của đúng commit; tóm tắt ghi lượt kiểm + lúc xanh", async () => {
  const h = tk({ [LIST]: out(LIST_NONE) }, ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.ok(!h.calls.some((c) => /^npm (test|run typecheck|run test:e2e)$/.test(c)));
  assert.equal(h.calls.filter((c) => c === CHECKS).length, 1);
  assert.ok(h.calls.indexOf("npm run build:web") < h.calls.indexOf(CHECKS));
  const t = h.text();
  assert.match(t, /Kiểm đủ bộ \(GitHub\): XANH lúc 2026-09-23T02:00:00Z/);
  assert.match(t, /Lượt kiểm: https:\/\/github\.com\/luutuanvu1010\/tourdaobooking\/actions\/runs\/4242/);
});

const DOC_KQ_REFUSALS: { name: string; over?: Record<string, RunResult | RunResult[]>; banGhi?: Record<string, any>; reason: RegExp; khongGoiGh?: boolean }[] = [
  { name: "không có bản ghi của day-len (commit không qua day-len)", banGhi: {}, reason: /không có bản ghi kết luận kiểm/, khongGoiGh: true },
  { name: "bản ghi của commit khác", banGhi: { [HEAD]: { ...BAN_GHI_XANH, sha: KHAC_SHA } }, reason: /không khớp commit/, khongGoiGh: true },
  { name: "đổi quy trình kiểm mà bản ghi không có lý do (Đ3.2)", banGhi: { [HEAD]: { ...BAN_GHI_XANH, quyTrinh: { doi: ["tệp điều khiển việc kiểm đổi: .github/workflows/kiem.yml"], lyDo: "" } } }, reason: /quy trình kiểm đã đổi mà không có lý do/, khongGoiGh: true },
  { name: "gh api lỗi", over: { [CHECKS]: FAIL }, reason: /không đọc được kết quả kiểm trên GitHub/ },
  { name: "gh api trả JSON lạ", over: { [CHECKS]: out("<html>") }, reason: /không đọc được kết quả kiểm trên GitHub/ },
  { name: "thiếu kết quả (không check-run nào)", over: { [CHECKS]: checksOut([]) }, reason: /không có kết quả kiểm nào do GitHub Actions tạo/ },
  { name: "không do GitHub Actions tạo (ứng dụng khác / ai đó đăng)", over: { [CHECKS]: checksOut([GOM({ app: { slug: "ai-do" } })]) }, reason: /không có kết quả kiểm nào do GitHub Actions tạo/ },
  { name: "sai commit", over: { [CHECKS]: checksOut([GOM({ head_sha: KHAC_SHA })]) }, reason: /thuộc commit khác/ },
  { name: "thiếu việc gom", over: { [CHECKS]: checksOut([checkRun()]) }, reason: /thiếu kết quả "Gom kết quả kiểm"/ },
  { name: "đang chạy", over: { [CHECKS]: checksOut([checkRun({ status: "in_progress", conclusion: null }), GOM()]) }, reason: /còn đang chạy/ },
  { name: "việc gom đang chạy", over: { [CHECKS]: checksOut([GOM({ status: "queued", conclusion: null, completed_at: null })]) }, reason: /còn đang chạy/ },
  { name: "quá 24 giờ", over: { [CHECKS]: checksOut([GOM({ completed_at: "2026-09-22T03:00:00Z" })]) }, reason: /cũ hơn 24 giờ/ },
  { name: "đỏ mà không có bản ghi cho qua", over: { [CHECKS]: checksOut([checkRun({ name: "e2e phần 2", conclusion: "failure" }), GOM({ conclusion: "failure" })]) }, reason: /ĐỎ \(e2e phần 2, Gom kết quả kiểm\) và chủ chưa cho qua/ },
  { name: "một phần đỏ dù việc gom xanh", over: { [CHECKS]: checksOut([checkRun({ conclusion: "cancelled" }), GOM()]) }, reason: /ĐỎ \(npm test phần 1\)/ },
  { name: "đỏ, bản ghi có cho qua nhưng lý do rỗng", over: { [CHECKS]: checksOut([GOM({ conclusion: "failure" })]) }, banGhi: { [HEAD]: { ...BAN_GHI_XANH, ketQua: "do", choQua: { lyDo: " ", baiDo: [] } } }, reason: /chủ chưa cho qua/ },
  { name: "quá một trang kết quả", over: { [CHECKS]: checksOut([GOM()], 150) }, reason: /quá một trang/ },
];
for (const c of DOC_KQ_REFUSALS) {
  test(`trien-khai (ADR-0176 tiêu chí 3): DỪNG trước migration / deploy khi ${c.name}`, async () => {
    const h = tk(c.over ?? {}, ["c", "c"], c.banGhi ?? { [HEAD]: BAN_GHI_XANH });
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assertNothingDangerous(h.calls);
    assert.deepEqual(h.questions, [], "không hỏi áp / deploy khi kết quả kiểm không đạt");
    assert.match(h.text(), c.reason);
    assert.match(h.text(), /CHƯA có gì bị đổi trên production/);
    assert.deepEqual(h.calls, c.khongGoiGh ? DEN_CHECKS.slice(0, -1) : DEN_CHECKS, "dừng NGAY ở bước đọc kết quả");
  });
}

test("trien-khai (Đ3.1): lượt kiểm ĐỎ + bản ghi cho qua của ĐÚNG commit → đi tiếp; tóm tắt in lý do và bài đỏ để chép vào HANDOFF", async () => {
  const banGhi = { [HEAD]: { ...BAN_GHI_XANH, ketQua: "do", xanhLuc: null, choQua: { lyDo: "giá Sheet thật vừa đổi", baiDo: ["e2e catalog"], luc: "2026-09-23T02:01:00Z" } } };
  const h = tk({ [CHECKS]: checksOut([checkRun({ name: "e2e phần 2", conclusion: "failure" }), GOM({ conclusion: "failure" })]) }, ["c", "c"], banGhi);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
  const t = h.text();
  assert.match(t, /Kiểm đủ bộ \(GitHub\): ĐỎ \(e2e phần 2, Gom kết quả kiểm\) — chủ cho qua ở day-len, lý do: giá Sheet thật vừa đổi/);
  assert.match(t, /Cho qua lượt kiểm đỏ — lý do của chủ: giá Sheet thật vừa đổi \(bài đỏ: e2e catalog\)/);
});

test("trien-khai (Đ3.2): bản ghi có 'đổi quy trình kiểm' KÈM lý do → đi tiếp; tóm tắt in lý do", async () => {
  const banGhi = { [HEAD]: { ...BAN_GHI_XANH, quyTrinh: { doi: ["tệp điều khiển việc kiểm đổi: scripts/kiem-phan.mjs"], lyDo: "chia lại phần e2e" } } };
  const h = tk({ [LIST]: out(LIST_NONE) }, ["c"], banGhi);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.match(h.text(), /Đổi quy trình kiểm — lý do của chủ: chia lại phần e2e \(tệp điều khiển việc kiểm đổi: scripts\/kiem-phan\.mjs\)/);
});

test("trien-khai (Đ2.5): tóm tắt ghi thời gian từng chặng, KHÔNG tính lúc chờ chủ trả lời; cộng day-len từ bản ghi; vượt 10 phút thì cảnh báo, không chặn", async () => {
  let t = Date.parse("2026-09-23T03:00:00Z");
  const now = () => new Date(t);
  const h = tk({ [LIST]: out(LIST_NONE) });
  const run = h.deps.run;
  h.deps.run = (cmd, args, opts) => {
    t += 20_000; // mỗi lệnh 20 giây
    return run(cmd, args, opts);
  };
  h.deps.ask = async () => {
    t += 3600_000; // chủ suy nghĩ một giờ
    return "c";
  };
  assert.equal(await lib.trienKhai({ ...h.deps, now }), 0);
  const txt = h.text();
  assert.match(txt, /day-len 6 phút 40 giây \(chờ GitHub kiểm 6 phút 00 giây\)/);
  const m = /trien-khai (\d+) phút (\d+) giây/.exec(txt);
  assert.ok(m, "phải có thời gian trien-khai");
  assert.ok(Number(m![1]) < 10, "một giờ chủ suy nghĩ không được tính");
  assert.match(txt, /cổng chỉ-đọc .*; build và đọc kết quả kiểm .*; migration .*; deploy .*; kiểm sau deploy/);
  assert.match(txt, /CẢNH BÁO:.*vượt mục tiêu khoảng 10 phút/);
  const h2 = tk({ [LIST]: out(LIST_NONE) }, ["c"]);
  assert.equal(await lib.trienKhai({ ...h2.deps, now: NOW }), 0);
  assert.doesNotMatch(h2.text(), /vượt mục tiêu/);
});

test("trien-khai: quy trình .github/workflows/kiem.yml có việc gom ĐÚNG tên lib đọc, chỉ chạy khi đẩy cho-kiem/** (không chạy khi đẩy main — không kiểm hai lần)", () => {
  const yml = readFileSync(new URL("../.github/workflows/kiem.yml", import.meta.url), "utf8");
  const libX = lib as unknown as { VIEC_GOM: string; WORKFLOW: string };
  assert.equal(libX.WORKFLOW, "kiem.yml");
  assert.ok(yml.includes(`name: ${libX.VIEC_GOM}\n`), "tên việc gom phải khớp VIEC_GOM");
  assert.match(yml, /push:\n\s+branches: \["cho-kiem\/\*\*"\]/);
  assert.doesNotMatch(yml, /branches:.*\bmain\b/);
  assert.match(yml, /tests\/e2e\/run\.mjs --phan \$\{\{ matrix\.phan \}\}/, "phần e2e chạy bằng --phan (có audit-invariants cuối phần)");
  assert.match(yml, /kiem-phan\.mjs gom/);
  // Chạy lại phần đỏ (Đ3.1): artifact cùng tên của lượt trước phải được GHI ĐÈ, không thì việc tải lên báo trùng tên và gom đọc báo cáo cũ (kiểm độc lập C1).
  const soTai = (yml.match(/uses: actions\/upload-artifact@v4/g) ?? []).length;
  assert.equal(soTai, 4);
  assert.equal((yml.match(/^\s+overwrite: true$/gm) ?? []).length, soTai, "mọi bước tải báo cáo phải có overwrite: true");
  assert.match(yml, /needs: \[chia, rieng, test, e2e\]\n\s+if: always\(\)/, "việc gom chạy cả khi phần khác đỏ, và đợi mọi phần");
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

test("trien-khai (cổng trước): chạy NGAY sau bước đọc migration, TRƯỚC build và đọc kết quả kiểm", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
  await lib.trienKhai({ ...h.deps, now: NOW });
  assert.equal(h.calls.indexOf(GATE_PRE), h.calls.indexOf(LIST) + 1);
  assert.ok(h.calls.indexOf(GATE_PRE) < h.calls.indexOf("npm run build:web"));
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
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
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
  assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
  assert.deepEqual(s.waits, []);
  assert.match(h.text(), /- Cổng phiên bản sau deploy: ĐẠT/);
});

test("trien-khai (cổng sau): hỏng lần đầu, đạt ở lần thử lại → sleep đúng 1 lần, thoát 0", async () => {
  for (const first of [1, 2]) {
    const h = harness(tkScript({ [LIST]: out(LIST_NONE) }), ["c"]);
    withPostSeq(h, [{ code: first, stdout: "", stderr: "" }, OK]);
    const s = fakeSleep();
    assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: s.sleep }), 0);
    assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST, GATE_POST]);
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
    assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST, GATE_POST]);
    assert.equal(s.waits.length, 1);
    const t = h.text();
    assert.ok(t.includes(label), t);
    assert.match(t, /node scripts\/kiem-phien-ban\.mjs --sau-deploy/);
    for (const line of [/- Ngày giờ:/, /- Commit:/, /- Kiểm đủ bộ \(GitHub\):/, /- Thời gian /, /- Migration đã áp:/, /- Worker Version ID:/, /- Kiểm dữ liệu \(audit-invariants --db remote\): ĐẠT/, /- Phiên bản: 1\.4/, /- Cổng phiên bản trước deploy: ĐẠT/]) {
      assert.match(t, line);
    }
  }
});

test("trien-khai (cổng sau): audit KHÔNG ĐẠT mà cổng sau ĐẠT → vẫn thoát 1 (0 chỉ khi cả hai đạt)", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE), [AUDIT]: FAIL }), ["c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: fakeSleep().sleep }), 1);
  assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST]);
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
  assert.deepEqual(h.calls, [...TK_PREFIX, ...CHECK, DEPLOY, AUDIT, GATE_POST, GATE_POST]);
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

// ─────────── ADR-0094 đ4 (L13): cổng chỉ-đọc kiểm khoá bí mật bắt buộc (thiếu khoá ⇒ mọi API 500 sau deploy) ───────────

test("trien-khai (khoá — T15): kiểm tên khoá NGAY sau whoami, TRƯỚC lời gọi D1 và mọi bước ghi", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.ok(h.calls.indexOf(SECRETS) > h.calls.indexOf(WHOAMI) && h.calls.indexOf(SECRETS) < h.calls.indexOf(LIST), h.calls.join(" | "));
});

test("trien-khai (khoá — T15): thiếu LAN_GUI_SECRET hoặc SESSION_SECRET ⇒ DỪNG trước migration/deploy, câu lời thường chỉ lệnh secret put", async () => {
  for (const [thieu, dau] of [
    ["LAN_GUI_SECRET", '[{"name":"SESSION_SECRET","type":"secret_text"}]'],
    ["SESSION_SECRET", '[{"name":"LAN_GUI_SECRET","type":"secret_text"}]'],
    ["LAN_GUI_SECRET", "[]"],
  ] as const) {
    const h = harness(tkScript({ [SECRETS]: out(dau) }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0, dau);
    assert.ok(!h.calls.includes(LIST), "không chạm D1");
    assertNothingDangerous(h.calls);
    assert.ok(!h.calls.includes(DEPLOY) && !h.calls.includes(APPLY));
    const t = h.text();
    assert.match(t, new RegExp(`Chưa đặt khoá ${thieu}`));
    assert.match(t, new RegExp(`npx wrangler secret put ${thieu}`));
  }
});

test("trien-khai (khoá hai lớp — ADR-0074, kiểm độc lập I-1): thiếu MFA_ENCRYPTION_KEY ⇒ DỪNG trước migration/deploy, câu RIÊNG nói hậu quả + lệnh khoá 32 byte", async () => {
  for (const dau of ['[{"name":"SESSION_SECRET","type":"secret_text"},{"name":"LAN_GUI_SECRET","type":"secret_text"}]']) {
    const h = harness(tkScript({ [SECRETS]: out(dau) }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0, dau);
    assert.ok(!h.calls.includes(LIST), "không chạm D1");
    assertNothingDangerous(h.calls);
    assert.ok(!h.calls.includes(DEPLOY) && !h.calls.includes(APPLY));
    assert.equal(h.calls.at(-1), SECRETS, "phải dừng NGAY ở bước kiểm khoá");
    assert.ok(!h.calls.some((c) => /secret (put|get|delete)/.test(c)), "chỉ ĐỌC danh sách tên, không ghi, không đọc giá trị");
    const t = h.text();
    assert.match(t, /Chưa đặt khoá MFA_ENCRYPTION_KEY/);
    assert.match(t, /bảo mật hai lớp/, "nói rõ hậu quả: không ai bật được lớp hai");
    assert.match(t, /ngày thứ 15/, "nói rõ hậu quả: hết ân hạn thì tài khoản nội bộ không đăng nhập PIN được");
    assert.match(t, /openssl rand -base64 32/, "khoá phải đúng 32 byte");
    assert.doesNotMatch(t, /base64 48[^\n]*MFA_ENCRYPTION_KEY/, "không gợi ý khoá 48 byte cho khoá hai lớp");
    assert.match(t, /npx wrangler secret put MFA_ENCRYPTION_KEY/);
    assert.doesNotMatch(t, /MỌI màn hình/, "khoá hai lớp thiếu không làm MỌI API 500 — không dùng câu của khoá bắt buộc");
  }
  // Đủ ba khoá → đi tiếp, ghi đã có khoá hai lớp.
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.match(h.text(), /MFA_ENCRYPTION_KEY/);
});

test("trien-khai (khoá): lệnh secret list lỗi hoặc đầu ra không đọc được ⇒ DỪNG (không bao giờ coi là đạt)", async () => {
  for (const r of [FAIL, out("không phải JSON"), out('{"name":"LAN_GUI_SECRET"}')]) {
    const h = harness(tkScript({ [SECRETS]: r }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.ok(!h.calls.includes(LIST));
    assertNothingDangerous(h.calls);
  }
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

// ─────────────── cổng mốc tin đổi (ADR-0062; phiếu kiểm A3 C1, 2026-10-08) ───────────────
// Lần phát hành ĐẦU TIÊN mang migration 0086 phải đặt MOC_TIN_DOI (src/shared/thong-bao.ts) = lúc phát hành; mốc cũ ⇒ dòng đổi của tối đa 30 ngày trước
// hiện thành tin hàng loạt ngay ngày triển khai. Chỉ THÊM một điểm dừng sau cổng chỉ-đọc "migration nào chưa áp", trước mọi bước khác.

const LIST_0086 = LIST_0023.replace("0023_auth_passkey.sql", "0086_aud_order_change.sql");
const GIO = 3600e3;

// Cổng nhận migration theo ĐUÔI tên (số migration đổi được lúc gộp — CHANGE-GUIDE công thức d; người kiểm 8/10 đổi 0086 → 0087 thì cổng viết cứng tên CHẾT
// mà mọi bài vẫn xanh). Bài này khoá: trong migrations/ có ĐÚNG MỘT tệp mang đuôi cổng dùng, cổng nhận đúng tệp đó, và nhận cả khi tệp bị đổi số.
test("cổng mốc tin đổi nhận migration theo đuôi: migrations/ có ĐÚNG MỘT tệp *_aud_order_change.sql, cổng nhận tệp đó và mọi số khác của nó", () => {
  const tep = readdirSync(new URL("../migrations/", import.meta.url)).filter((f) => f.endsWith(lib.DUOI_MIGRATION_TIN_DOI));
  assert.equal(lib.DUOI_MIGRATION_TIN_DOI, "_aud_order_change.sql");
  assert.equal(tep.length, 1, `đúng một tệp mang đuôi cổng dùng: ${JSON.stringify(tep)}`);
  const t = Date.parse("2026-10-10T03:00:00.000Z");
  for (const ten of [tep[0]!, "0087_aud_order_change.sql", "0123_aud_order_change.sql"]) {
    assert.equal(lib.coMigrationTinDoi(["0001_x.sql", ten]), true, ten);
    assert.equal(lib.kiemMocTinDoi([ten], "2026-09-30T00:00:00.000Z", t).ok, false, `${ten}: mốc cũ phải dừng`);
  }
  assert.equal(lib.coMigrationTinDoi(["0086_aud_order_change_v2.sql", "0086_aud_order_event.sql"]), false, "đuôi khác không phải migration tin đổi");
});

test("kiemMocTinDoi: không có migration tin đổi trong danh sách chờ → không kiểm (kể cả mốc hỏng); có → mốc phải trong [lúc chạy − 24 giờ, lúc chạy + 24 giờ]", () => {
  const t = Date.parse("2026-10-10T03:00:00.000Z");
  const co = ["0086_aud_order_change.sql"];
  assert.deepEqual(lib.kiemMocTinDoi([], "rác", t), { ok: true, kiem: false });
  assert.deepEqual(lib.kiemMocTinDoi(["0087_x.sql"], "2026-09-30T00:00:00.000Z", t), { ok: true, kiem: false }, "các lần phát hành SAU (0086 đã áp) không vướng");
  assert.deepEqual(lib.kiemMocTinDoi(co, new Date(t - 24 * GIO).toISOString(), t), { ok: true, kiem: true }, "đúng biên −24 giờ vẫn đạt");
  assert.deepEqual(lib.kiemMocTinDoi(co, new Date(t + 24 * GIO).toISOString(), t), { ok: true, kiem: true }, "đúng biên +24 giờ vẫn đạt");
  for (const [moc, vi] of [
    [new Date(t - 24 * GIO - 1).toISOString(), "cũ hơn 24 giờ"],
    ["2026-09-30T00:00:00.000Z", "giá trị tạm"],
    [new Date(t + 24 * GIO + 1).toISOString(), "xa hơn 24 giờ về sau (gõ nhầm năm → tin bị câm tới lúc đó)"],
    ["2026-10-10", "thiếu giờ"],
    ["2026-13-45T00:00:00.000Z", "đúng khuôn nhưng ngày không có thật (không được ném lỗi)"],
    ["2026-10-10T03:00:00Z", "không đủ mili-giây (khác dạng toISOString)"],
    ["", "rỗng"],
    [undefined, "không phải chuỗi"],
  ] as const) {
    const k = lib.kiemMocTinDoi(co, moc, t);
    assert.equal(k.ok, false, `${vi}: phải dừng`);
    if (!k.ok) assert.match(k.reason, /MOC_TIN_DOI/, vi);
  }
});

test("docMocTinDoiMacDinh: đọc ĐÚNG hằng MOC_TIN_DOI của src/shared/thong-bao.ts (import thật, không chép giá trị)", async () => {
  const { MOC_TIN_DOI } = await import("./shared/thong-bao.ts");
  assert.equal(await lib.docMocTinDoiMacDinh(), MOC_TIN_DOI);
});

test("trien-khai (mốc tin đổi): 0086 còn chờ áp mà MOC_TIN_DOI cũ / hỏng / đọc lỗi → DỪNG ngay sau cổng migration, trước cổng phiên bản; chỉ đúng tệp cần sửa", async () => {
  const cu = async () => "2026-09-30T00:00:00.000Z";
  const loi = async () => { throw new Error("không nạp được"); };
  for (const doc of [cu, async () => "rác", loi]) {
    const h = harness(tkScript({ [LIST]: out(LIST_0086) }));
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, docMocTinDoi: doc }), 0);
    assert.equal(h.calls.at(-1), LIST, "dừng NGAY sau cổng migration");
    assert.ok(!h.calls.includes(GATE_PRE));
    assertNothingDangerous(h.calls);
    assert.deepEqual(h.questions, []);
    assert.match(h.text(), /MOC_TIN_DOI/);
    assert.match(h.text(), /src\/shared\/thong-bao\.ts/);
  }
});

test("trien-khai (mốc tin đổi): 0086 chờ áp + mốc đúng lúc phát hành → đi tiếp y như cũ; không có 0086 → không đọc mốc", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_0086) }), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, docMocTinDoi: async () => NOW().toISOString() }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY, ...CHECK, DEPLOY, AUDIT, GATE_POST]); // ghép main 1c471990: hai cổng "mã đổi giữa chừng" trước áp / trước deploy
  const h2 = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h2.deps, now: NOW, docMocTinDoi: async () => { throw new Error("không được đọc"); } }), 0);
});

// ─────────── mã trong thư mục đổi giữa chừng (sự cố 2026-10-08: `day-len` của phiên khác gộp vào CÙNG checkout lúc e2e đang chạy) ───────────
// Tiêu chí: mã đã qua kiểm phải là mã được áp migration / deploy. So lại HEAD + cây sạch ở ba chỗ: ngay sau build + đọc kết quả kiểm, ngay trước
// áp migration, ngay trước deploy (hai chỗ sau nằm SAU câu hỏi — chủ có thể để câu hỏi chờ lâu). Lệch ⇒ dừng, không hỏi; lệnh git lỗi ⇒ coi là lệch.
const KHAC = "d".repeat(40);
const DEN_E2E = TK_PREFIX.slice(0, -CHECK.length);

test("trien-khai (mã đổi): HEAD đổi trong lúc build / đọc kết quả → dừng NGAY sau bước đọc, không hỏi gì, không Time Travel / áp / deploy", async () => {
  {
    const h = harness(tkScript({ "git rev-parse HEAD": out(`${KHAC}\n`) }), ["c", "c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.calls, [...DEN_E2E, "git rev-parse HEAD"]);
    assert.deepEqual(h.questions, [], "mã đã đổi thì không hỏi c/k nào");
    assertNothingDangerous(h.calls);
    const t = h.text();
    assert.match(t, /dddddddd khác mã lúc bắt đầu cccccccc/);
    assert.match(t, /chạy lại `npm run trien-khai` từ đầu/);
  }
});

test("trien-khai (mã đổi): cây làm việc có thay đổi chưa commit sau bước đọc kết quả → dừng, không hỏi, không áp / deploy", async () => {
  const h = harness(tkScript({ "git status --porcelain": [out(""), out(" M src/index.ts\n")] }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, TK_PREFIX);
  assert.deepEqual(h.questions, []);
  assertNothingDangerous(h.calls);
  assert.match(h.text(), /thay đổi chưa commit: M src\/index\.ts/, "nêu tên tệp để chủ biết vì sao dừng");
});

test("trien-khai (mã đổi): nhiều tệp bẩn → nêu tối đa 10 tệp đầu và tổng số (review M1)", async () => {
  const tep = Array.from({ length: 12 }, (_, i) => `?? tam${i + 1}.txt`).join("\n");
  const h = harness(tkScript({ "git status --porcelain": [out(""), out(`${tep}\n`)] }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  const t = h.text();
  assert.match(t, /tam10\.txt; … \(12 tệp\)/);
  assert.doesNotMatch(t, /tam11\.txt/);
});

test("trien-khai (mã đổi): lệnh git lỗi lúc so lại → coi là đổi, dừng (không đoán là còn đúng)", async () => {
  for (const over of [{ "git rev-parse HEAD": FAIL }, { "git status --porcelain": [out(""), FAIL] }]) {
    const h = harness(tkScript(over), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
    assert.deepEqual(h.questions, []);
    assertNothingDangerous(h.calls);
    assert.match(h.text(), /không đọc được/);
  }
});

test("trien-khai (mã đổi): đổi trong lúc chờ câu 'Áp migration?' → trả lời c vẫn KHÔNG áp, KHÔNG deploy", async () => {
  const h = harness(tkScript({ "git rev-parse HEAD": [out(`${HEAD}\n`), out(`${KHAC}\n`)] }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, "git rev-parse HEAD"]);
  assert.equal(h.questions.length, 1);
  assertNothingDangerous(h.calls);
  assert.match(h.text(), /không áp migration, không deploy/);
});

test("trien-khai (mã đổi): không có migration, đổi trong lúc chờ câu deploy → trả lời c vẫn KHÔNG deploy", async () => {
  const h = harness(tkScript({ [LIST]: out(LIST_NONE), "git rev-parse HEAD": [out(`${HEAD}\n`), out(`${KHAC}\n`)] }), ["c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, "git rev-parse HEAD"]);
  assertNothingDangerous(h.calls);
});

test("trien-khai (mã đổi): migration ĐÃ áp rồi mã đổi lúc chờ câu deploy → KHÔNG deploy; cảnh báo đỏ + lệnh deploy đúng mã đã kiểm", async () => {
  const h = harness(tkScript({ "git rev-parse HEAD": [out(`${HEAD}\n`), out(`${HEAD}\n`), out(`${KHAC}\n`)] }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY, "git rev-parse HEAD"]);
  assert.ok(!h.calls.includes(DEPLOY));
  const t = h.text();
  assert.match(t, /\x1b\[31m/, "cảnh báo phải có màu đỏ");
  assert.match(t, /migration ĐÃ ÁP/);
  assert.ok(t.includes(`git switch --detach ${HEAD}`), "chỉ đúng mã đã qua kiểm");
  assert.match(t, /CI=1 npx wrangler deploy/);
  assert.match(t, /audit-invariants\.mjs --db remote/);
  assertLenhDeployDungMa(t);
  assert.doesNotMatch(t, /chạy lại `npm run trien-khai` từ đầu/, "migration đã áp thì KHÔNG được bảo chạy lại từ đầu");
});

test("trien-khai (mã đổi): migration ĐÃ áp rồi cây bẩn (HEAD không đổi) lúc chờ câu deploy → KHÔNG deploy; nêu tệp; lệnh tự chạy kiểm cây sạch trước khi đổi mã (review I1)", async () => {
  const h = harness(tkScript({ "git status --porcelain": [out(""), out(""), out(""), out(" M src/index.ts\n")] }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW }), 0);
  assert.deepEqual(h.calls, [...TK_PREFIX, TT, ...CHECK, APPLY, ...CHECK]);
  const t = h.text();
  assert.match(t, /thay đổi chưa commit: M src\/index\.ts/);
  assertLenhDeployDungMa(t);
  assert.doesNotMatch(t, /chạy lại `npm run trien-khai` từ đầu/);
});

// ─────────── ADR-0123 (kho tệp hồ sơ, lát H-2 Gói 2): cổng chỉ-đọc 1e — chủ đã tạo kho R2 chưa ───────────

test("trien-khai (kho tệp — cổng 1e): kiểm kho SAU khoá bí mật, TRƯỚC lời gọi D1; có kho ⇒ đi tiếp, ghi tên kho", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.ok(h.calls.indexOf(KHO) > h.calls.indexOf(SECRETS) && h.calls.indexOf(KHO) < h.calls.indexOf(LIST), h.calls.join(" | "));
  assert.match(h.text(), /Đã có kho tệp hồ sơ: tourdao-sales-ho-so/);
  assert.match(h.text(), /Đã có kho tệp vé hỗ trợ: tourdao-sales-ho-tro/, "ADR-0144: cổng 1e kiểm MỌI kho khai trong wrangler.jsonc");
  assert.match(h.text(), /Đã có kho vé điện tử: tourdao-sales-ve-dien-tu/, "ADR-0153: kho thứ ba");
});

test("trien-khai (kho tệp — cổng 1e, ADR-0144): có kho hồ sơ nhưng THIẾU kho vé hỗ trợ ⇒ DỪNG, chỉ lệnh tạo đúng kho thiếu; KHÔNG tự tạo", async () => {
  const h = harness(tkScript({ [KHO]: out("Listing buckets...\nname:           tourdao-sales-ho-so\ncreation_date:  2026-10-16T03:00:00.000Z\n") }), ["c", "c"]);
  assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.equal(h.calls.at(-1), KHO, "phải dừng NGAY ở cổng kho");
  assert.ok(!h.calls.some((c) => /r2 (bucket (create|delete|update)|object)/.test(c)), "cổng chỉ ĐỌC — không tạo / sửa kho");
  const t = h.text().replace(/\x1b\[[0-9;]*m/g, "");
  assert.match(t, /Chưa có kho tệp vé hỗ trợ tourdao-sales-ho-tro/);
  assert.match(t, /CHƯA có gì bị đổi trên production/);
  const dong = t.split("\n").map((x) => x.trim());
  assert.ok(dong.includes("npx wrangler r2 bucket create tourdao-sales-ho-tro"), "lệnh tạo đúng kho thiếu, đứng một mình trên dòng");
  assert.ok(!dong.includes("npx wrangler r2 bucket create tourdao-sales-ho-so"), "không bảo tạo lại kho đã có");
});

test("trien-khai (kho tệp — cổng 1e): chưa có kho (chỉ có tên GẦN giống, tên bị tô màu khác) ⇒ DỪNG trước migration, chỉ nguyên lệnh tạo kho, nêu thư mục; KHÔNG tự tạo", async () => {
  for (const r of [
    out("Listing buckets...\nname:           tourdao-booking-anh\ncreation_date:  2026-09-01T00:00:00.000Z\n"),
    out("Listing buckets...\nname:           tourdao-sales-ho-so-cu\ncreation_date:  2026-10-01T00:00:00.000Z\n"),
    out("Listing buckets...\n\x1b[2mname:\x1b[22m           khac\n"),
  ]) {
    const h = harness(tkScript({ [KHO]: r }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.equal(h.calls.at(-1), KHO, "phải dừng NGAY ở cổng kho");
    assert.ok(!h.calls.some((c) => /r2 (bucket (create|delete|update)|object)/.test(c)), "cổng chỉ ĐỌC — không tạo / sửa kho");
    assertNothingDangerous(h.calls);
    const t = h.text();
    assert.match(t, /Chưa có kho tệp hồ sơ tourdao-sales-ho-so/);
    assert.match(t, /CHƯA có gì bị đổi trên production/);
    assert.match(t, /ở thư mục tourdao-sales/, "C9: câu dừng nói rõ chạy lệnh ở thư mục nào");
    assert.doesNotMatch(t, /không đọc được đầu ra/, "m2: có đọc được danh sách kho — câu 'chưa có kho', không phải câu 'đầu ra lạ'");
    assert.ok(t.replace(/\x1b\[[0-9;]*m/g, "").split("\n").map((x) => x.trim()).includes("npx wrangler r2 bucket create tourdao-sales-ho-so"), "lệnh tạo kho đứng một mình trên dòng");
  }
});

test("trien-khai (kho tệp — cổng 1e, m2 + C13): đầu ra không có dòng 'name: …' nào (rỗng, dạng lạ, chỉ có 'bucket_name: tourdao-sales-ho-so') ⇒ DỪNG với câu 'không đọc được đầu ra', KHÔNG đạt giả", async () => {
  for (const r of [
    out("Listing buckets...\n"),
    out("Listing buckets...\nbucket_name:    tourdao-sales-ho-so\ncreation_date:  2026-10-16T03:00:00.000Z\n"),
    out('[{"name":"tourdao-sales-ho-so"}]\n'),
  ]) {
    const h = harness(tkScript({ [KHO]: r }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.equal(h.calls.at(-1), KHO, "phải dừng NGAY ở cổng kho");
    assert.ok(!h.calls.some((c) => /r2 (bucket (create|delete|update)|object)/.test(c)), "cổng chỉ ĐỌC");
    const t = h.text();
    assert.match(t, /không đọc được đầu ra của `wrangler r2 bucket list`/);
    assert.doesNotMatch(t, /Chưa có kho tệp hồ sơ/, "đầu ra lạ không được khẳng định 'chưa có kho'");
    assert.match(t, /CHƯA có gì bị đổi trên production/);
    assert.match(t, /ở thư mục tourdao-sales/);
  }
  assert.deepEqual(lib.parseR2BucketNames("bucket_name:    tourdao-sales-ho-so\n"), [], "C13: 'bucket_name:' không phải dòng 'name:'");
});

test("trien-khai (kho tệp — cổng 1e): tên kho tô màu đúng ⇒ vẫn nhận (bỏ mã màu trước khi đọc)", async () => {
  const h = harness(tkScript({ [KHO]: out("Listing buckets...\n\x1b[2mname:\x1b[22m           tourdao-sales-ho-so\n\x1b[2mname:\x1b[22m           tourdao-sales-ho-tro\n\x1b[2mname:\x1b[22m           tourdao-sales-ve-dien-tu\n") }), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
});

test("trien-khai (kho tệp — cổng 1e): lệnh lỗi (kể cả 7403) ⇒ DỪNG, không thử lại, không coi là đạt", async () => {
  for (const r of [FAIL, LOI_7403]) {
    const h = harness(tkScript({ [KHO]: r }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.equal(h.calls.filter((c) => c === KHO).length, 1);
    assert.ok(!h.calls.includes(LIST));
    assert.match(h.text(), /`wrangler r2 bucket list` lỗi/);
    assert.match(h.text(), /CHƯA có gì bị đổi trên production/, "C10: nhánh lệnh lỗi cũng nói chưa đổi gì");
  }
});

test("trien-khai (kho tệp — cổng 1e): không đọc được tên kho trong wrangler.jsonc ⇒ DỪNG trước mọi lời gọi R2 / D1", async () => {
  for (const docCacKho of [async () => null, async () => { throw new Error("ENOENT"); }]) {
    const h = harness(tkScript(), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {}, docCacKho }), 0);
    assert.ok(!h.calls.includes(KHO) && !h.calls.includes(LIST));
    assert.match(h.text(), /mục r2_buckets/);
  }
});

test("docCacKhoTuCauHinh: chỉ bỏ chú thích CẢ DÒNG; mọi kho theo thứ tự khai; một mục sai binding / tên sai khuôn, mục rỗng, JSON hỏng ⇒ null; tệp thật ⇒ ba kho", async () => {
  const cfg = (r2: unknown) => `{\n  // chú thích cả dòng\n  "name": "tourdao-sales",\n  "r2_buckets": ${JSON.stringify(r2)}\n}\n`;
  assert.deepEqual(lib.docCacKhoTuCauHinh(cfg([{ binding: "HO_SO", bucket_name: "tourdao-sales-ho-so" }])), [{ binding: "HO_SO", ten: "tourdao-sales-ho-so" }]);
  assert.deepEqual(lib.docCacKhoTuCauHinh(cfg([{ binding: "HO_SO", bucket_name: "a-b" }, { binding: "HO_TRO", bucket_name: "c-d" }])), [{ binding: "HO_SO", ten: "a-b" }, { binding: "HO_TRO", ten: "c-d" }]);
  assert.equal(lib.docCacKhoTuCauHinh(cfg([{ binding: "HO_SO", bucket_name: "Có Dấu" }])), null);
  assert.equal(lib.docCacKhoTuCauHinh(cfg([{ binding: "HO_SO", bucket_name: "a-b" }, { bucket_name: "c-d" }])), null, "một mục thiếu binding ⇒ không đoán");
  assert.equal(lib.docCacKhoTuCauHinh(cfg([])), null);
  assert.equal(lib.docCacKhoTuCauHinh('{ "name": "x" }'), null);
  assert.equal(lib.docCacKhoTuCauHinh('{ "r2_buckets": [] } // chú thích cuối dòng'), null, "chú thích cuối dòng làm hỏng tệp — phải lộ ra, không đoán");
  assert.equal(lib.NHAN_KHO.HO_SO, "kho tệp hồ sơ");
  assert.equal(lib.NHAN_KHO.HO_TRO, "kho tệp vé hỗ trợ");
  assert.deepEqual(await lib.docCacKhoMacDinh(), [{ binding: "HO_SO", ten: "tourdao-sales-ho-so" }, { binding: "HO_TRO", ten: "tourdao-sales-ho-tro" }, { binding: "VE_DIEN_TU", ten: "tourdao-sales-ve-dien-tu" }]);
});

test("parseR2BucketNames: bỏ mã màu, lấy mọi dòng 'name: <tên>'; không lấy dòng khác", () => {
  assert.deepEqual(lib.parseR2BucketNames("Listing buckets...\nname:   a-b\ncreation_date: x\n\n\x1b[2mname:\x1b[22m   c-d\nnamex: e\n"), ["a-b", "c-d"]);
  assert.deepEqual(lib.parseR2BucketNames(""), []);
});

test("day-len (kiểm độc lập N3): mốc so số liệu chỉ lấy lượt XANH của origin/main (lượt đỏ dù được cho qua không làm mốc)", async () => {
  const doGoc = { ...LUOT_GOC, databaseId: 4101, conclusion: "failure", createdAt: "2026-09-22T02:00:00Z" };
  const h = dl(dayLenScript({ [RUNLIST(GOC)]: out(JSON.stringify([doGoc, LUOT_GOC])) }), ["c"], { ketQua: { 4242: TONG(), 4100: TONG(), 4101: TONG({ soBai: 9999 }) } });
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0, "so với lượt xanh 4100 (bằng số) ⇒ xanh thường, không hỏi lý do");
  assert.deepEqual(h.questions, ["Đẩy lên GitHub? (c/k) "]);
});

test("day-len (kiểm độc lập N4): lượt kiểm nhận được đã cũ hơn 24 giờ → cảnh báo sớm (trien-khai sẽ dừng), kèm lệnh chạy lại", async () => {
  const h = dl(dayLenScript({ [RUNVIEW(4242)]: viewOf({ updatedAt: "2026-09-21T01:00:00Z" }) }), ["c"]);
  assert.equal(await lib.dayLen({ ...h.deps, target: "worktree-x" }), 0);
  assert.match(h.text(), /cũ hơn 24 giờ/);
  assert.match(h.text(), /gh run rerun 4242/);
});
