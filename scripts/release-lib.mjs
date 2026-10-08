// Logic thuần của hai lệnh CHỦ DỰ ÁN tự gõ (đặc tả docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md):
//   `npm run day-len [-- <nhánh>]`  → scripts/day-len.mjs    (gộp tiến thẳng vào main, kiểm, hỏi, rồi git push origin main)
//   `npm run trien-khai`            → scripts/trien-khai.mjs (cổng chỉ-đọc, cổng số phiên bản, kiểm, Time Travel, áp migration, deploy, kiểm dữ liệu, cổng số phiên bản sau deploy)
// AI KHÔNG được chạy hai lệnh này (CLAUDE.md §8; hook .claude/hooks/guard-remote-lib.mjs + permissions.deny chặn). Lớp thứ hai: tự từ chối khi không có TTY.
//
// Mọi hàm nhận "bộ chạy lệnh" tiêm vào để test được bằng bộ chạy giả (src/release-lib.test.ts):
//   run(cmd, args, { env?, stream?, tee? }) → { code, stdout, stderr } (hoặc Promise của nó)
//     stream: lệnh dài, hiện trực tiếp cho chủ xem (không bắt đầu ra); tee: vừa hiện vừa bắt (deploy, để lấy Version ID).
//   ask(câu hỏi) → Promise<chuỗi trả lời>;  isTTY: boolean;  log(dòng).
// Hàm trả về MÃ THOÁT (0 = xong/không có gì làm; khác 0 = đã dừng). Không bao giờ tự chạy git reset, --force, rollback hay wrangler secret.

export const DB = "tourdao-sales-db";
const CI = { CI: "1" };

/** Khoá bí mật Worker BẮT BUỘC (thiếu ⇒ mọi API 500): khoá phiên + khoá HMAC lớp chống ghi trùng (ADR-0094 đ4). */
export const KHOA_BAT_BUOC = ["SESSION_SECRET", "LAN_GUI_SECRET"];

/** Tên khoá từ `wrangler secret list --format json` (mảng `{ name, type }`), hoặc null nếu đầu ra không đọc được. Không bao giờ đọc giá trị khoá. */
export function parseSecretNames(output) {
  const i = output.indexOf("[");
  const j = output.lastIndexOf("]");
  if (i === -1 || j < i) return null;
  try {
    const x = JSON.parse(output.slice(i, j + 1));
    if (!Array.isArray(x) || !x.every((e) => e && typeof e === "object" && typeof e.name === "string")) return null;
    return x.map((e) => e.name);
  } catch {
    return null;
  }
}
/**
 * CỔNG MỐC TIN ĐỔI (ADR-0062; phiếu kiểm A3 C1, 2026-10-08). Tin "đơn đổi sau xác nhận" chỉ tính dòng nhật ký từ MOC_TIN_DOI (src/shared/thong-bao.ts) —
 * lần phát hành ĐẦU TIÊN mang migration 0086 mà mốc còn cũ thì dòng đổi của tối đa 30 ngày trước hiện thành tin hàng loạt ngay ngày triển khai; mốc xa về sau
 * (gõ nhầm năm) thì tin bị câm tới lúc đó. Hàm thuần: 0086 không còn chờ áp ⇒ không kiểm (các lần phát hành sau không vướng); còn chờ ⇒ mốc phải đúng dạng
 * toISOString và nằm trong [lúc chạy − 24 giờ, lúc chạy + 24 giờ].
 */
export const MIGRATION_TIN_DOI = "0086_aud_order_change.sql";
const MOC_TIN_DOI_LECH_TOI_DA_MS = 24 * 3600e3;
export function kiemMocTinDoi(pending, mocIso, nowMs) {
  if (!pending.includes(MIGRATION_TIN_DOI)) return { ok: true, kiem: false };
  const sua = "sửa hằng MOC_TIN_DOI trong src/shared/thong-bao.ts thành thời điểm phát hành (giờ UTC, dạng 2026-10-10T03:00:00.000Z)";
  const ms = typeof mocIso === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(mocIso) ? Date.parse(mocIso) : NaN;
  if (Number.isNaN(ms) || new Date(ms).toISOString() !== mocIso) {
    return { ok: false, reason: `MOC_TIN_DOI không đúng dạng thời điểm ISO (${String(mocIso)}) — ${sua}.` };
  }
  const lech = ms - nowMs;
  if (lech < -MOC_TIN_DOI_LECH_TOI_DA_MS) return { ok: false, reason: `MOC_TIN_DOI (${mocIso}) cũ hơn 24 giờ so với lúc phát hành — lần phát hành đầu mang ${MIGRATION_TIN_DOI} sẽ hiện tin đổi cũ hàng loạt; ${sua}.` };
  if (lech > MOC_TIN_DOI_LECH_TOI_DA_MS) return { ok: false, reason: `MOC_TIN_DOI (${mocIso}) xa hơn 24 giờ về sau — tin đổi sẽ không hiện tới lúc đó; ${sua}.` };
  return { ok: true, kiem: true };
}
/** Đọc hằng thật bằng import (Node 22 chạy .ts trực tiếp) — không chép giá trị (bài src/release-lib.test.ts "docMocTinDoiMacDinh"). */
export async function docMocTinDoiMacDinh() {
  return (await import(new URL("../src/shared/thong-bao.ts", import.meta.url).href)).MOC_TIN_DOI;
}

const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const ANSI = /\x1b\[[0-9;]*m/g;
// KHÔNG có cờ /g: regex /g mang lastIndex giữa các lần gọi (test() rồi matchAll() có thể bỏ sót tên). Cần tìm tất cả thì dựng regex /g mới tại chỗ.
const MIGRATION_NAME = /\b\d{4}_[A-Za-z0-9_.-]*?\.sql\b/;

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
    const names = [...after.matchAll(new RegExp(MIGRATION_NAME.source, "g"))].map((m) => m[0]);
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

/** Tên kịch bản e2e đỏ từ đầu ra tests/e2e/run.mjs (dòng "✘ <tên>"; gồm cả "✘ audit-invariants"). Không đọc được → []. */
export function parseE2eFailures(output) {
  return [...String(output ?? "").replace(ANSI, "").matchAll(/^✘ (\S+)/gm)].map((m) => m[1]);
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
    const head = await run("git", ["rev-parse", "main"]);
    oldMain = head.code === 0 ? trimOut(head) : "";
    // Phải biết mã cũ TRƯỚC khi gộp, để lệnh quay lại luôn in được; không biết thì không gộp.
    if (!/^[0-9a-f]{7,64}$/i.test(oldMain)) return stop("không đọc được mã hiện tại của `main` (`git rev-parse main` lỗi) — không gộp, không đẩy.", String(head.stderr ?? "").trim());
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

  // Mọi lệnh đọc dưới đây mà lỗi thì DỪNG — không bao giờ đoán "không có gì để đẩy" hay "không có migration mới".
  const countRun = await run("git", ["rev-list", "--count", "origin/main..main"]);
  const countText = trimOut(countRun);
  if (countRun.code !== 0 || !/^\d+$/.test(countText)) {
    return stop("không đếm được số commit sắp đẩy (`git rev-list --count origin/main..main` lỗi hoặc trả kết quả lạ) — không đẩy.", String(countRun.stderr ?? "").trim(), ...undo());
  }
  const count = Number(countText);
  if (count === 0) {
    log("Không có commit mới nào so với `origin/main` — không có gì để đẩy.");
    return 0;
  }
  const logRun = await run("git", ["log", "--oneline", "--no-decorate", "origin/main..main"]);
  if (logRun.code !== 0) return stop("không đọc được danh sách commit sắp đẩy (`git log origin/main..main` lỗi) — không đẩy.", String(logRun.stderr ?? "").trim(), ...undo());
  const commits = trimOut(logRun);
  const diffRun = await run("git", ["diff", "--name-only", "--no-renames", "--diff-filter=A", "origin/main", "main", "--", "migrations/"]);
  if (diffRun.code !== 0) return stop("không liệt kê được migration mới (`git diff … migrations/` lỗi) — không đẩy khi chưa biết có migration mới hay không.", String(diffRun.stderr ?? "").trim(), ...undo());
  const added = trimOut(diffRun)
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
// Cổng số phiên bản (chủ quyết 2026-09-23; công thức t). Hợp đồng mã thoát của kiem-phien-ban.mjs: 0 ĐẠT · 1 CHƯA ĐẠT · 2 KHÔNG CHẠY ĐƯỢC.
const GATE = "scripts/kiem-phien-ban.mjs";
const GATE_POST_CMD = `node ${GATE} --sau-deploy`;
const GATE_PRE_Q =
  "Bản ở máy không mới hơn production (quên thêm mục nhật ký thay đổi?). Chỉ chọn c nếu đang deploy lại ĐÚNG bản đang chạy. Vẫn tiếp tục? (c/k) ";
/** Chờ trước khi thử lại cổng sau (Cloudflare cần vài giây để bản mới tới mọi nơi). */
const POST_GATE_RETRY_MS = 20_000;
const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Lỗi Cloudflare 7403 ("The given account is not valid or is not authorized to access this service"). */
const LOI_7403 = /\[code: 7403\]|not authorized to access this service/i;
const is7403 = (r) => LOI_7403.test(`${r.stdout ?? ""}\n${r.stderr ?? ""}`.replace(ANSI, ""));
/** Chờ trước khi thử lại cổng chỉ-đọc gặp 7403. */
const RETRY_7403_MS = 5_000;

/**
 * @param version số phiên bản ở máy (mục đầu CHANGELOG) — vỏ scripts/trien-khai.mjs truyền vào; lib không tự import mã ứng dụng.
 * @param sleep chờ trước khi thử lại cổng sau; test truyền hàm tức thì.
 */
export async function trienKhai({ run, ask, isTTY, log, now = () => new Date(), sleep = realSleep, version, docMocTinDoi = docMocTinDoiMacDinh }) {
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

  // 1b. đăng nhập Cloudflare — phòng ngừa lỗi 7403 (chủ dự án 2026-10-01: "lỗi này tôi bị nhiều lần rồi"; đã gặp 26/9, 29/9, 1/10).
  // Vé đăng nhập OAuth của wrangler sống 1 giờ; lời gọi D1 ĐẦU TIÊN sau khi vé hết hạn từng bị Cloudflare từ chối 7403 thay vì tự làm mới,
  // chạy lại là qua (giả thuyết mạnh, chưa tái hiện được chính lỗi). `wrangler whoami` chỉ đọc, làm mới vé trước khi chạm D1.
  log("\n▶ Kiểm đăng nhập Cloudflare (làm mới vé đăng nhập)");
  const who = await run("npx", ["wrangler", "whoami"], { env: CI });
  if (who.code !== 0 || !/You are logged in/i.test(`${who.stdout}\n${who.stderr ?? ""}`)) {
    return stop("chưa đăng nhập Cloudflare (hoặc vé đăng nhập hỏng).", "Chạy `npx wrangler login` (chọn đúng tài khoản Lưu Tuấn Vũ) rồi chạy lại `npm run trien-khai`.");
  }

  // 1c. cổng chỉ-đọc: khoá bí mật BẮT BUỘC đã đặt chưa (ADR-0094 đ4, T15) — chỉ đọc TÊN, không bao giờ đọc giá trị. Thiếu khoá thì sau deploy MỌI API
  // trả 500; nên dừng ở đây, TRƯỚC migration / deploy. Lệnh lỗi hay đầu ra lạ ⇒ dừng (không bao giờ coi là đạt).
  log("\n▶ Cổng chỉ-đọc: khoá bí mật bắt buộc đã đặt trên Cloudflare chưa");
  const sec = await run("npx", ["wrangler", "secret", "list", "--format", "json"], { env: CI });
  if (sec.code !== 0) return stop("`wrangler secret list` lỗi — chưa kiểm được khoá bí mật nên KHÔNG đi tiếp.", String(sec.stderr ?? "").trim().slice(0, 400));
  const tenKhoa = parseSecretNames(String(sec.stdout ?? ""));
  if (tenKhoa === null) return stop("không đọc được danh sách khoá bí mật (đầu ra `wrangler secret list` lạ) — KHÔNG đi tiếp.", String(sec.stdout ?? "").slice(0, 400));
  const thieuKhoa = KHOA_BAT_BUOC.filter((k) => !tenKhoa.includes(k));
  if (thieuKhoa.length) {
    return stop(
      `${thieuKhoa.map((k) => `Chưa đặt khoá ${k}`).join("; ")} trên Cloudflare — triển khai lúc này sẽ làm MỌI màn hình báo lỗi. CHƯA có gì bị đổi trên production.`,
      `Chạy trong Terminal, ở thư mục tourdao-sales:\n${thieuKhoa.map((k) => `  openssl rand -base64 48 | tr -d '\\n' | npx wrangler secret put ${k}`).join("\n")}\nrồi chạy lại \`npm run trien-khai\`.`,
    );
  }
  log(`Đã có đủ khoá: ${KHOA_BAT_BUOC.join(", ")}.`);

  // 2. cổng chỉ-đọc: migration nào chưa áp. Lỗi 7403 ở bước CHỈ ĐỌC này được thử lại đúng MỘT lần; bước ghi (áp migration, deploy) không bao giờ tự thử lại.
  log("\n▶ Cổng chỉ-đọc: migration nào chưa áp trên production");
  const LIST_ARGS = ["wrangler", "d1", "migrations", "list", DB, "--remote"];
  let list = await run("npx", LIST_ARGS, { env: CI });
  if (list.code !== 0 && is7403(list)) {
    log("Cloudflare trả lỗi 7403 (thường do vé đăng nhập vừa hết hạn) — chờ 5 giây rồi thử lại một lần.");
    await sleep(RETRY_7403_MS);
    list = await run("npx", LIST_ARGS, { env: CI });
  }
  if (list.code !== 0 && is7403(list)) {
    return stop(
      "Cloudflare vẫn trả lỗi 7403 (\"tài khoản không hợp lệ hoặc không có quyền\") sau một lần thử lại. CHƯA có gì bị đổi trên production.",
      "Làm lần lượt: (1) chạy lại `npm run trien-khai`; (2) nếu vẫn lỗi: `npx wrangler logout` rồi `npx wrangler login` (chọn đúng tài khoản Lưu Tuấn Vũ), rồi chạy lại.\n" + String(list.stderr ?? "").trim().slice(0, 400),
    );
  }
  if (list.code !== 0) return stop("`wrangler d1 migrations list --remote` lỗi (chưa đăng nhập wrangler? mất mạng?).", String(list.stderr ?? "").trim().slice(0, 600));
  const parsed = parsePendingMigrations(`${list.stdout}\n${list.stderr ?? ""}`);
  if (!parsed.ok) return stop(`đầu ra \`migrations list\` ${parsed.reason}.`, String(list.stdout ?? "").slice(0, 800));
  const pending = parsed.names;
  log(pending.length ? `Còn ${pending.length} migration chưa áp: ${pending.join(", ")}` : "Không còn migration nào chưa áp.");

  // 2a. cổng mốc tin đổi (ADR-0062; phiếu kiểm A3 C1) — CHỈ khi lần này mang 0086; chỉ đọc một hằng trong mã, không gọi gì ra ngoài.
  if (pending.includes(MIGRATION_TIN_DOI)) {
    log("\n▶ Cổng mốc tin đổi (lần phát hành đầu mang 0086)");
    let moc;
    try {
      moc = await docMocTinDoi();
    } catch (e) {
      return stop("không đọc được MOC_TIN_DOI trong src/shared/thong-bao.ts — CHƯA có gì bị đổi trên production.", String(e?.message ?? e).slice(0, 300));
    }
    const k = kiemMocTinDoi(pending, moc, now().getTime());
    if (!k.ok) return stop(`${k.reason} CHƯA có gì bị đổi trên production.`, "Báo AI sửa mốc (một dòng trong src/shared/thong-bao.ts), gộp lại vào main, rồi chạy lại `npm run trien-khai`.");
    log(`MOC_TIN_DOI = ${moc}: đạt.`);
  }

  // 2b. cổng số phiên bản TRƯỚC deploy (chỉ đọc): bản ở máy phải MỚI HƠN production — bắt lỗi quên thêm mục nhật ký thay đổi.
  // 1 = chưa đạt: hỏi (deploy lại đúng bản đang chạy là trường hợp hợp lệ duy nhất). 2 hay mã lạ = không chạy được: DỪNG, không bao giờ coi là đạt.
  log("\n▶ Cổng số phiên bản (bản ở máy phải mới hơn production)");
  const preGate = await run("node", [GATE], { stream: true });
  let preGateText = "ĐẠT";
  if (preGate.code === 1) {
    log(`${RED}${BOLD}Cổng phiên bản trước deploy: KHÔNG ĐẠT${RESET}`);
    if (!yes(await ask(GATE_PRE_Q))) return stop("cổng phiên bản không đạt — không áp migration, không deploy.", "Thêm mục mới vào đầu nhật ký thay đổi (công thức t ở docs/CHANGE-GUIDE.md), commit, đẩy, rồi chạy lại.");
    preGateText = "KHÔNG ĐẠT (chủ chọn tiếp tục)";
  } else if (preGate.code !== 0) {
    return stop(`cổng phiên bản KHÔNG CHẠY ĐƯỢC (mã ${preGate.code}) — không phải đạt; không áp migration, không deploy.`, `Kiểm lại bằng: node ${GATE}`);
  }

  // 3. kiểm mã
  for (const [args, label] of [[["test"], "npm test"], [["run", "typecheck"], "npm run typecheck"], [["run", "build:web"], "npm run build:web"]]) {
    log(`\n▶ ${label}`);
    const r = await run("npm", args, { stream: true });
    if (r.code !== 0) return stop(`\`${label}\` đỏ — không áp migration, không deploy.`);
  }

  // 3b. e2e ĐỦ BỘ (như runbook cũ). Đỏ thì KHÔNG tự chặn cũng KHÔNG tự cho qua: nêu kịch bản đỏ và để chủ phán (vd kịch bản
  // catalog đỏ vì giá trên Google Sheet thật vừa đổi, không phải lỗi mã). Chỉ trả lời đúng `c` mới đi tiếp.
  log("\n▶ npm run test:e2e (đủ bộ, cần mạng, vài phút)");
  const e2e = await run("npm", ["run", "test:e2e"], { tee: true });
  let e2eText = "xanh";
  if (e2e.code !== 0) {
    const red = parseE2eFailures(e2e.stdout);
    const which = red.length ? red.join(", ") : "không đọc được tên kịch bản (xem đầu ra ở trên)";
    log(`${RED}${BOLD}e2e ĐỎ:${RESET} ${which}`);
    if (!yes(await ask("Có kịch bản e2e đỏ. Vẫn tiếp tục? (c/k) "))) return stop("e2e đỏ — không áp migration, không deploy.");
    e2eText = `ĐỎ (chủ chọn tiếp tục): ${which}`;
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

  // 7b. cổng số phiên bản SAU deploy (chỉ đọc; chạy SAU kiểm dữ liệu để không xen giữa deploy và audit): production phải BẰNG bản ở máy.
  // Hỏng lần đầu thì chờ rồi thử lại MỘT lần. Lỗi gì ở đây cũng không được bỏ qua khối tóm tắt.
  log("\n▶ Cổng số phiên bản sau deploy (production phải bằng bản ở máy)");
  const postGate = async () => {
    try {
      return (await run("node", [GATE, "--sau-deploy"], { stream: true })).code;
    } catch {
      return 127;
    }
  };
  let postCode = await postGate();
  if (postCode !== 0) {
    log(`Cổng phiên bản sau deploy chưa đạt (mã ${postCode}) — chờ ${POST_GATE_RETRY_MS / 1000} giây rồi thử lại một lần.`);
    try {
      await sleep(POST_GATE_RETRY_MS);
    } catch {
      /* chờ lỗi thì vẫn thử lại ngay */
    }
    postCode = await postGate();
  }
  const postGateText = postCode === 0 ? "ĐẠT" : postCode === 1 ? "KHÔNG ĐẠT" : `KHÔNG CHẠY ĐƯỢC (mã ${postCode})`;
  log(`Cổng phiên bản sau deploy: ${postGateText}`);
  if (postCode !== 0) log(`${RED}${BOLD}Kiểm lại tay sau vài phút:${RESET} ${GATE_POST_CMD}`);

  // 8. khối tóm tắt
  log("\n══════════ DÁN VÀO docs/HANDOFF-N1.md (TRẠNG THÁI TRIỂN KHAI) ══════════");
  log(`- Ngày giờ: ${vnDateTime(now())}`);
  log(`- Commit: ${commit}`);
  log(`- e2e: ${e2eText}`);
  log(`- Migration đã áp: ${applied.length ? applied.join(", ") : "không có"}`);
  if (bookmark) log(`- Điểm khôi phục Time Travel trước khi áp: ${bookmark}`);
  log(`- Worker Version ID: ${versionId ?? "chưa lấy được (xem đầu ra deploy ở trên hoặc `npx wrangler deployments list`)"}`);
  log(`- Kiểm dữ liệu (audit-invariants --db remote): ${auditText}`);
  log(`- Phiên bản: ${version ?? "không rõ (vỏ không truyền số phiên bản)"}`);
  log(`- Cổng phiên bản trước deploy: ${preGateText}`);
  log(`- Cổng phiên bản sau deploy: ${postGateText}`);
  if (postCode !== 0) log(`  (kiểm lại tay: ${GATE_POST_CMD})`);
  log("═════════════════════════════════════════════════════════════════════");
  return audit.code === 0 && postCode === 0 ? 0 : 1;
}
