// Logic thuần của hai lệnh CHỦ DỰ ÁN tự gõ (đặc tả docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md):
//   `npm run day-len [-- <nhánh>]`  → scripts/day-len.mjs    (gộp tiến thẳng vào main, kiểm, hỏi, rồi git push origin main)
//   `npm run trien-khai`            → scripts/trien-khai.mjs (cổng chỉ-đọc, kiểm, Time Travel, áp migration, deploy, kiểm dữ liệu)
// AI KHÔNG được chạy hai lệnh này (CLAUDE.md §8; hook .claude/hooks/guard-remote-lib.mjs + permissions.deny chặn). Lớp thứ hai: tự từ chối khi không có TTY.
//
// Mọi hàm nhận "bộ chạy lệnh" tiêm vào để test được bằng bộ chạy giả (src/release-lib.test.ts):
//   run(cmd, args, { env?, stream?, tee? }) → { code, stdout, stderr } (hoặc Promise của nó)
//     stream: lệnh dài, hiện trực tiếp cho chủ xem (không bắt đầu ra); tee: vừa hiện vừa bắt (deploy, để lấy Version ID).
//   ask(câu hỏi) → Promise<chuỗi trả lời>;  isTTY: boolean;  log(dòng).
// Hàm trả về MÃ THOÁT (0 = xong/không có gì làm; khác 0 = đã dừng). Không bao giờ tự chạy git reset, --force, rollback hay wrangler secret.

export const DB = "tourdao-sales-db";
const CI = { CI: "1" };
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const ANSI = /\x1b\[[0-9;]*m/g;
const MIGRATION_NAME = /\b\d{4}_[A-Za-z0-9_.-]*?\.sql\b/g;

/**
 * Đọc đầu ra của `wrangler d1 migrations list <db> --remote` (wrangler 4.x). GIẢ ĐỊNH (đã đối chiếu mã nguồn wrangler 4.135.0 và đầu ra thật
 * trên D1 cục bộ tạm, lưu ở src/release-lib.fixtures/): không còn gì → dòng "✅ No migrations to apply!"; còn → dòng "Migrations to be applied:"
 * rồi một bảng cli-table3 (cột "Name", mỗi dòng một tệp `NNNN_tên.sql`). Mọi dạng khác — không có dấu nào, có CẢ HAI dấu, có dấu "còn" mà không
 * đọc ra tên nào, có tên mà không có dấu — đều coi là KHÔNG đọc được, và người gọi phải DỪNG (không đoán).
 */
export function parsePendingMigrations(output) {
  const text = String(output ?? "").replace(ANSI, "");
  const none = /No migrations to apply/.test(text);
  const some = /Migrations to be applied:/.test(text);
  if (none && some) return { ok: false, reason: "đầu ra vừa báo 'không còn' vừa báo 'còn' migration — không đọc được" };
  if (none) {
    if (MIGRATION_NAME.test(text)) return { ok: false, reason: "báo 'không còn' migration nhưng lại có tên migration — không đọc được" };
    return { ok: true, names: [] };
  }
  if (some) {
    const after = text.slice(text.indexOf("Migrations to be applied:"));
    const names = [...after.matchAll(MIGRATION_NAME)].map((m) => m[0]);
    if (!names.length) return { ok: false, reason: "báo còn migration chờ áp nhưng không đọc ra tên nào — không đọc được" };
    return { ok: true, names };
  }
  return { ok: false, reason: "không thấy dòng 'No migrations to apply' hay 'Migrations to be applied' — không đọc được (wrangler đổi định dạng hoặc lỗi)" };
}

/** Điểm khôi phục từ `wrangler d1 time-travel info <db> --json` (`{"bookmark": "…"}`); dự phòng dạng chữ "The current bookmark is '…'". */
export function parseBookmark(output) {
  const text = String(output ?? "").replace(ANSI, "");
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a !== -1 && b > a) {
    try {
      const j = JSON.parse(text.slice(a, b + 1));
      if (typeof j?.bookmark === "string" && /^[\w-]+$/.test(j.bookmark)) return j.bookmark;
    } catch {
      /* thử dạng chữ bên dưới */
    }
  }
  const m = text.match(/bookmark (?:is|')\s*'?([\w-]+)'/);
  return m ? m[1] : null;
}

/** Id phiên bản Worker từ đầu ra `wrangler deploy` ("Current Version ID: <uuid>"). */
export function parseVersionId(output) {
  const m = String(output ?? "").replace(ANSI, "").match(/Current Version ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}

/** Tên nhánh an toàn để đưa vào git: không bắt đầu bằng '-' (tránh bị hiểu là tuỳ chọn như --force), chỉ ký tự thường gặp. */
export const isSafeBranchName = (name) => typeof name === "string" && /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(name) && !name.includes("..");

const NOT_TTY =
  "Lệnh này chỉ chạy trong terminal thật (TTY) do chủ dự án tự gõ. Không có TTY — ví dụ AI gọi qua công cụ — nên từ chối, không chạy git/wrangler nào.";

function makeStop(log) {
  return (msg, ...extra) => {
    log(`${RED}${BOLD}DỪNG:${RESET} ${msg}`);
    for (const l of extra) log(l);
    return 1;
  };
}

const trimOut = (r) => String(r?.stdout ?? "").trim();

/** Bước chung: đang ở main, cây làm việc sạch, fetch được. Trả về null khi đạt, hoặc mã thoát khi dừng. */
async function checkMainCleanFetched(run, stop) {
  const branch = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch.code !== 0 || trimOut(branch) !== "main") {
    return stop(`phải đứng ở nhánh \`main\` (đang ở: ${trimOut(branch) || "không xác định"}).`, "Chạy: git switch main");
  }
  const status = await run("git", ["status", "--porcelain"]);
  if (status.code !== 0 || trimOut(status) !== "") {
    return stop("cây làm việc còn thay đổi chưa commit. Commit hoặc bỏ các thay đổi đó rồi chạy lại.", trimOut(status));
  }
  const fetch = await run("git", ["fetch", "origin"]);
  if (fetch.code !== 0) return stop("`git fetch origin` lỗi (mất mạng hoặc hết quyền GitHub?).", String(fetch.stderr ?? "").trim());
  return null;
}

const yes = (answer) => String(answer ?? "").trim() === "c";

// ─────────────────────────────── day-len ───────────────────────────────

export async function dayLen({ run, ask, isTTY, log, target }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);
  if (target !== undefined && !isSafeBranchName(target)) return stop(`tên nhánh không hợp lệ: ${JSON.stringify(target)}. Không dùng tên bắt đầu bằng '-' hay có dấu cách.`);

  const pre = await checkMainCleanFetched(run, stop);
  if (pre !== null) return pre;

  const anc = await run("git", ["merge-base", "--is-ancestor", "origin/main", "main"]);
  if (anc.code !== 0) {
    return stop(
      "`origin/main` KHÔNG nằm trong lịch sử của `main` cục bộ — tức là đã có người đẩy thứ khác lên GitHub. Không đẩy để khỏi ghi đè.",
      "Xem khác biệt: git log --oneline main..origin/main",
      "Rồi gộp tay (hỏi người phụ trách kỹ thuật nếu chưa chắc), sau đó chạy lại lệnh này.",
    );
  }

  let oldMain = null;
  if (target !== undefined) {
    const ff = await run("git", ["merge-base", "--is-ancestor", "main", target]);
    if (ff.code !== 0) {
      return stop(`nhánh \`${target}\` không tiến thẳng được từ \`main\` (không có sẵn \`main\` trong lịch sử, hoặc không tồn tại). Không tạo merge commit tự động.`, `Cập nhật nhánh đó lên \`main\` mới nhất rồi chạy lại.`);
    }
    oldMain = trimOut(await run("git", ["rev-parse", "main"]));
    const merge = await run("git", ["merge", "--ff-only", target]);
    if (merge.code !== 0) return stop(`gộp tiến thẳng \`${target}\` vào \`main\` lỗi.`, String(merge.stderr ?? "").trim());
    log(`Đã gộp tiến thẳng \`${target}\` vào \`main\`.`);
  }
  const undo = () => (oldMain ? [`\`main\` đã được gộp tiến thẳng nhưng CHƯA đẩy. Muốn quay \`main\` về chỗ cũ thì tự chạy (lệnh này KHÔNG tự chạy):`, `  git reset --hard ${oldMain}`] : []);

  for (const [args, label] of [[["test"], "npm test"], [["run", "typecheck"], "npm run typecheck"]]) {
    log(`\n▶ ${label}`);
    const r = await run("npm", args, { stream: true });
    if (r.code !== 0) return stop(`\`${label}\` đỏ — không đẩy.`, ...undo());
  }

  const count = Number(trimOut(await run("git", ["rev-list", "--count", "origin/main..main"])));
  if (!Number.isFinite(count) || count <= 0) {
    log("Không có commit mới nào so với `origin/main` — không có gì để đẩy.");
    return 0;
  }
  const commits = trimOut(await run("git", ["log", "--oneline", "--no-decorate", "origin/main..main"]));
  const added = trimOut(await run("git", ["diff", "--name-only", "--diff-filter=A", "origin/main", "main", "--", "migrations/"]))
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.endsWith(".sql"));

  log("\n══════════ SẮP ĐẨY LÊN GITHUB ══════════");
  log(`${count} commit (origin/main..main):`);
  for (const l of commits.split("\n").filter(Boolean)) log(`  ${l}`);
  if (added.length) {
    log(`Migration mới (${added.length}):`);
    for (const m of added) log(`  ${m.replace(/^migrations\//, "")}`);
    log(`${RED}${BOLD}Lần triển khai tới PHẢI áp các migration này trước; dùng \`npm run trien-khai\`.${RESET}`);
  } else {
    log("Migration mới: không có.");
  }
  log("════════════════════════════════════════");

  if (!yes(await ask("Đẩy lên GitHub? (c/k) "))) return stop("Không đẩy (chỉ trả lời đúng `c` mới đẩy).", ...undo());

  const push = await run("git", ["push", "origin", "main"], { stream: true });
  if (push.code !== 0) return stop("`git push origin main` lỗi — GitHub CHƯA nhận. Đọc lỗi ở trên.");
  const last = trimOut(await run("git", ["log", "-1", "--oneline", "--no-decorate", "origin/main"]));
  log(`Đã đẩy. GitHub (origin/main) giờ là: ${last}`);
  return 0;
}

// ─────────────────────────────── trien-khai ───────────────────────────────

const pad = (n) => String(n).padStart(2, "0");
/** Ngày giờ dân sự theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè). */
function vnDateTime(d) {
  const v = new Date(d.getTime() + 7 * 3600_000);
  return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())} (giờ Việt Nam)`;
}

const DEPLOY_CMD = "CI=1 npx wrangler deploy";

export async function trienKhai({ run, ask, isTTY, log, now = () => new Date() }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);

  // 1. main, sạch, đúng bằng origin/main
  const pre = await checkMainCleanFetched(run, stop);
  if (pre !== null) return pre;
  const local = trimOut(await run("git", ["rev-parse", "main"]));
  const remote = trimOut(await run("git", ["rev-parse", "origin/main"]));
  if (!local || local !== remote) {
    return stop("`main` cục bộ khác `origin/main` — chỉ triển khai mã ĐÃ đẩy lên GitHub (mã chưa đẩy hoặc GitHub có commit mới hơn).", "Chạy `npm run day-len` (hoặc `git pull --ff-only`) trước.");
  }
  const commit = trimOut(await run("git", ["log", "-1", "--oneline", "--no-decorate", "main"]));

  // 2. cổng chỉ-đọc: migration nào chưa áp
  log("\n▶ Cổng chỉ-đọc: migration nào chưa áp trên production");
  const list = await run("npx", ["wrangler", "d1", "migrations", "list", DB, "--remote"], { env: CI });
  if (list.code !== 0) return stop("`wrangler d1 migrations list --remote` lỗi (chưa đăng nhập wrangler? mất mạng?).", String(list.stderr ?? "").trim().slice(0, 600));
  const parsed = parsePendingMigrations(`${list.stdout}\n${list.stderr ?? ""}`);
  if (!parsed.ok) return stop(`đầu ra \`migrations list\` ${parsed.reason}.`, String(list.stdout ?? "").slice(0, 800));
  const pending = parsed.names;
  log(pending.length ? `Còn ${pending.length} migration chưa áp: ${pending.join(", ")}` : "Không còn migration nào chưa áp.");

  // 3. kiểm mã
  for (const [args, label] of [[["test"], "npm test"], [["run", "typecheck"], "npm run typecheck"], [["run", "build:web"], "npm run build:web"]]) {
    log(`\n▶ ${label}`);
    const r = await run("npm", args, { stream: true });
    if (r.code !== 0) return stop(`\`${label}\` đỏ — không áp migration, không deploy.`);
  }

  // 4. migration
  let applied = [];
  let bookmark = null;
  if (pending.length) {
    log("\n══════════ MIGRATION CHƯA ÁP ══════════");
    for (const m of pending) log(`  ${m}`);
    const tt = await run("npx", ["wrangler", "d1", "time-travel", "info", DB, "--json"], { env: CI });
    bookmark = tt.code === 0 ? parseBookmark(tt.stdout) : null;
    if (!bookmark) return stop("không lấy được điểm khôi phục Time Travel — không áp migration khi chưa có điểm khôi phục.", String(tt.stderr ?? tt.stdout ?? "").trim().slice(0, 600));
    log(`Điểm khôi phục Time Travel (GHI LẠI): ${bookmark}`);
    log(`Lệnh khôi phục nếu cần (KHÔNG chạy lúc này; mất mọi thay đổi sau điểm này): npx wrangler d1 time-travel restore ${DB} --bookmark=${bookmark}`);
    if (!yes(await ask(`Áp ${pending.length} migration này lên production? (c/k) `))) return stop("Không áp migration, không deploy.");
    log("\n▶ Áp migration lên production");
    const ap = await run("npx", ["wrangler", "d1", "migrations", "apply", DB, "--remote"], { env: CI, stream: true });
    if (ap.code !== 0) {
      return stop(
        "áp migration LỖI — KHÔNG deploy. Kiểm lại bằng `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote`.",
        `Nếu cần khôi phục: npx wrangler d1 time-travel restore ${DB} --bookmark=${bookmark}`,
      );
    }
    applied = pending;
  }

  // 5. deploy
  const q = applied.length ? `Migration đã áp — PHẢI deploy ngay. Triển khai Worker lên production? (c/k) ` : "Triển khai Worker lên production? (c/k) ";
  if (!yes(await ask(q))) {
    if (applied.length) {
      log(`${RED}${BOLD}CẢNH BÁO: migration ĐÃ ÁP lên production nhưng Worker CHƯA deploy. Mã cũ đang chạy trên dữ liệu mới — deploy NGAY:${RESET}`);
      log(`${RED}  ${DEPLOY_CMD}${RESET}`);
      log(`${RED}  rồi: node scripts/audit-invariants.mjs --db remote${RESET}`);
      return 1;
    }
    return stop("Không deploy.");
  }
  log("\n▶ Deploy Worker");
  const dep = await run("npx", ["wrangler", "deploy"], { env: CI, tee: true });
  if (dep.code !== 0) return stop("`wrangler deploy` LỖI — Worker có thể CHƯA đổi. Đọc lỗi ở trên; không rollback tự động.");
  const versionId = parseVersionId(dep.stdout);

  // 7. kiểm dữ liệu
  log("\n▶ Kiểm bất biến dữ liệu (chỉ đọc)");
  const audit = await run("node", ["scripts/audit-invariants.mjs", "--db", "remote"], { stream: true });
  const auditText =
    audit.code === 0 ? "ĐẠT" : audit.code === 1 ? "KHÔNG ĐẠT (có bất biến bị vi phạm — xem các dòng ✗ ở trên)" : `KHÔNG CHẠY ĐƯỢC (mã ${audit.code}) — không phải dữ liệu sạch`;
  log(`Kiểm dữ liệu: ${auditText}`);

  // 8. khối tóm tắt
  log("\n══════════ DÁN VÀO docs/HANDOFF-N1.md (TRẠNG THÁI TRIỂN KHAI) ══════════");
  log(`- Ngày giờ: ${vnDateTime(now())}`);
  log(`- Commit: ${commit}`);
  log(`- Migration đã áp: ${applied.length ? applied.join(", ") : "không có"}`);
  if (bookmark) log(`- Điểm khôi phục Time Travel trước khi áp: ${bookmark}`);
  log(`- Worker Version ID: ${versionId ?? "chưa lấy được (xem đầu ra deploy ở trên hoặc `npx wrangler deployments list`)"}`);
  log(`- Kiểm dữ liệu (audit-invariants --db remote): ${auditText}`);
  log("═════════════════════════════════════════════════════════════════════");
  return audit.code === 0 ? 0 : 1;
}
