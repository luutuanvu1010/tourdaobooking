// Logic thuần của hai lệnh CHỦ DỰ ÁN tự gõ (đặc tả docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md):
//   `npm run day-len [-- <nhánh>]`  → scripts/day-len.mjs    (gộp tiến thẳng vào main, đẩy nhánh chờ kiểm, chờ GitHub kiểm đủ bộ, hỏi, rồi đẩy ĐÚNG mã đã kiểm lên main: git push origin <mã>:refs/heads/main)
//   `npm run trien-khai`            → scripts/trien-khai.mjs (cổng chỉ-đọc gồm khoá bí mật và kho tệp hồ sơ, cổng số phiên bản, build, ĐỌC kết quả kiểm trên GitHub, Time Travel, áp migration, deploy, kiểm dữ liệu, cổng số phiên bản sau deploy)
// Từ ADR-0179 (2026-11-06): npm test / typecheck / e2e chạy MỘT lần trên máy GitHub (.github/workflows/kiem.yml), không chạy lại ở máy khi phát hành.
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
/**
 * Khoá mã hoá bảo mật hai lớp (ADR-0074 Phần B) — kiểm RIÊNG, không nằm trong KHOA_BAT_BUOC: thiếu khoá này KHÔNG làm mọi API 500, mà máy chủ trả 503 ở mọi
 * thao tác lớp hai (không ai bật được; hết ân hạn 14 ngày thì tài khoản nội bộ không đăng nhập PIN được). Khoá phải ĐÚNG 32 byte (`openssl rand -base64 32`).
 */
export const KHOA_HAI_LOP = "MFA_ENCRYPTION_KEY";
/**
 * Kho R2 của Worker (cổng 1e): ADR-0123 kho tệp hồ sơ (`HO_SO`), ADR-0144 kho tệp vé hỗ trợ (`HO_TRO`), ADR-0153 kho vé điện tử (`VE_DIEN_TU`). Tên kho đọc từ wrangler.jsonc — MỘT nguồn (kế hoạch H-2
 * kho tệp, ruling R2, R10). Nhãn để in câu dừng; binding chưa có nhãn vẫn được kiểm (nhãn chung).
 */
export const NHAN_KHO = { HO_SO: "kho tệp hồ sơ", HO_TRO: "kho tệp vé hỗ trợ", VE_DIEN_TU: "kho vé điện tử", BIEN_LAI: "kho biên lai chuyển khoản", ANH_DICH_VU: "kho ảnh đại diện dịch vụ", ANH_BAN_GIAO: "kho ảnh bàn giao" };
const HAU_QUA_THIEU_KHO = {
  HO_SO: "ảnh giấy tờ không tải lên hay mở được", HO_TRO: "tệp đính kèm vé hỗ trợ không gửi hay mở được", VE_DIEN_TU: "ảnh vé điện tử không nhập hay mở được",
  BIEN_LAI: "ảnh biên lai không gửi hay mở được", // ADR-0196 Đ4
  ANH_DICH_VU: "ảnh đại diện dịch vụ không tải lên hay xem được", // ADR-0201 Đ3
  ANH_BAN_GIAO: "ảnh bàn giao không gửi hay mở được", // ADR-0232 Đ3
};
const nhanKho = (binding) => NHAN_KHO[binding] ?? `kho R2 ${binding}`;
/**
 * MỌI kho R2 trong nội dung wrangler.jsonc theo thứ tự khai (`[{ binding, ten }]`), hoặc null. Chỉ bỏ chú thích CẢ DÒNG (luật của tệp — như
 * src/cau-hinh-toc-do.test.ts); chú thích cuối dòng làm JSON hỏng ⇒ null. Mục rỗng, hay MỘT mục thiếu binding / tên sai khuôn ⇒ null ⇒ cổng dừng (không đoán).
 */
export function docCacKhoTuCauHinh(text) {
  try {
    const cfg = JSON.parse(String(text).split("\n").filter((d) => !/^\s*\/\//.test(d)).join("\n"));
    const ds = Array.isArray(cfg?.r2_buckets) ? cfg.r2_buckets : [];
    const ra = ds.map((b) => ({ binding: b?.binding, ten: b?.bucket_name }));
    const hopLe = (k) => typeof k.binding === "string" && /^[A-Z][A-Z0-9_]*$/.test(k.binding) && typeof k.ten === "string" && /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(k.ten);
    return ra.length > 0 && ra.every(hopLe) ? ra : null;
  } catch {
    return null;
  }
}
/** Đọc tệp thật (bài src/release-lib.test.ts "docCacKhoTuCauHinh" ghim kết quả). */
export async function docCacKhoMacDinh() {
  const { readFile } = await import("node:fs/promises");
  return docCacKhoTuCauHinh(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
}

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
 * Nhận migration theo ĐUÔI tên (số migration đổi được lúc gộp — CHANGE-GUIDE công thức d; viết cứng "0086_…" thì đổi số là cổng chết lặng lẽ). Bài
 * src/release-lib.test.ts khoá: migrations/ có đúng MỘT tệp mang đuôi này và cổng nhận đúng tệp đó.
 */
export const DUOI_MIGRATION_TIN_DOI = "_aud_order_change.sql";
export const coMigrationTinDoi = (pending) => pending.some((n) => n.endsWith(DUOI_MIGRATION_TIN_DOI));
const MOC_TIN_DOI_LECH_TOI_DA_MS = 24 * 3600e3;
export function kiemMocTinDoi(pending, mocIso, nowMs) {
  const tep = pending.find((n) => n.endsWith(DUOI_MIGRATION_TIN_DOI));
  if (tep === undefined) return { ok: true, kiem: false };
  const sua = "sửa hằng MOC_TIN_DOI trong src/shared/thong-bao.ts thành thời điểm phát hành (giờ UTC, dạng 2026-10-10T03:00:00.000Z)";
  const ms = typeof mocIso === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(mocIso) ? Date.parse(mocIso) : NaN;
  if (Number.isNaN(ms) || new Date(ms).toISOString() !== mocIso) {
    return { ok: false, reason: `MOC_TIN_DOI không đúng dạng thời điểm ISO (${String(mocIso)}) — ${sua}.` };
  }
  const lech = ms - nowMs;
  if (lech < -MOC_TIN_DOI_LECH_TOI_DA_MS) return { ok: false, reason: `MOC_TIN_DOI (${mocIso}) cũ hơn 24 giờ so với lúc phát hành — lần phát hành đầu mang ${tep} sẽ hiện tin đổi cũ hàng loạt; ${sua}.` };
  if (lech > MOC_TIN_DOI_LECH_TOI_DA_MS) return { ok: false, reason: `MOC_TIN_DOI (${mocIso}) xa hơn 24 giờ về sau — tin đổi sẽ không hiện tới lúc đó; ${sua}.` };
  return { ok: true, kiem: true };
}
/** Đọc hằng thật bằng import (Node 22 chạy .ts trực tiếp) — không chép giá trị (bài src/release-lib.test.ts "docMocTinDoiMacDinh"). */
export async function docMocTinDoiMacDinh() {
  return (await import(new URL("../src/shared/thong-bao.ts", import.meta.url).href)).MOC_TIN_DOI;
}

const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const ANSI = /\x1b\[[0-9;]*m/g;
/** Tên kho từ đầu ra `wrangler r2 bucket list` (wrangler 4.x: mỗi kho một khối "name: <tên>" / "creation_date: …"). Bỏ mã màu trước. Dạng theo mã nguồn 4.147.0. */
export function parseR2BucketNames(output) {
  const text = String(output ?? "").replace(ANSI, "");
  return [...text.matchAll(/^\s*name:\s+(\S+)\s*$/gm)].map((m) => m[1]);
}
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

/** Tên nhánh an toàn để đưa vào git: không bắt đầu bằng '-' (tránh bị hiểu là tuỳ chọn như --force), chỉ ký tự thường gặp. */
export const isSafeBranchName = (name) => typeof name === "string" && /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(name) && !name.includes("..");

export const NOT_TTY =
  "Lệnh này chỉ chạy trong terminal thật (TTY) do chủ dự án tự gõ. Không có TTY — ví dụ AI gọi qua công cụ — nên từ chối, không chạy git/wrangler nào.";

export function makeStop(log) {
  return (msg, ...extra) => {
    log(`${RED}${BOLD}DỪNG:${RESET} ${msg}`);
    for (const l of extra) log(l);
    return 1;
  };
}

export const trimOut = (r) => String(r?.stdout ?? "").trim();

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

export const yes = (answer) => String(answer ?? "").trim() === "c";

/**
 * Mã trong thư mục còn ĐÚNG mã đã qua các bước kiểm không: HEAD = commit ghi lúc bắt đầu VÀ cây làm việc sạch. Trả về null khi còn đúng, hoặc câu nói
 * chỗ đổi. Lệnh git lỗi ⇒ coi là đổi (không đoán). Sự cố 2026-10-08: `npm run day-len` của phiên khác gộp vào CÙNG checkout gốc lúc e2e đang chạy —
 * máy chủ thử tự nạp mã mới trên D1 thiếu migration mới, e2e đỏ giả; trả lời "c" lúc đó sẽ áp migration và deploy mã chưa qua kiểm.
 */
async function maDaDoi(run, goc) {
  const head = await run("git", ["rev-parse", "HEAD"]);
  const h = trimOut(head);
  if (head.code !== 0 || !h) return "không đọc được mã hiện tại (`git rev-parse HEAD` lỗi)";
  if (h !== goc) return `mã hiện tại ${h.slice(0, 8)} khác mã lúc bắt đầu ${goc.slice(0, 8)}`;
  const st = await run("git", ["status", "--porcelain"]);
  if (st.code !== 0) return "không đọc được trạng thái thư mục (`git status` lỗi)";
  const tep = trimOut(st);
  if (tep !== "") {
    const dong = tep.split("\n");
    return `thư mục có thay đổi chưa commit: ${dong.slice(0, 10).join("; ")}${dong.length > 10 ? `; … (${dong.length} tệp)` : ""}`;
  }
  return null;
}
const MA_DOI_HUONG_DAN = "Thường do `npm run day-len` hay lệnh git khác chạy ở CÙNG thư mục trong lúc triển khai. Chờ việc đó xong rồi chạy lại `npm run trien-khai` từ đầu.";

/** Migration ĐÃ áp mà Worker chưa deploy: in lệnh deploy ĐÚNG mã đã qua kiểm (không tự chạy). Kiểm cây sạch trước và sau khi đổi sang mã đó — `git switch`
 *  mang theo thay đổi chưa commit, deploy lúc đó đưa mã chưa kiểm lên production. */
function inLenhDeployDungMa(log, ma) {
  log(`${RED}${BOLD}CẢNH BÁO: migration ĐÃ ÁP lên production nhưng Worker CHƯA deploy. Mã cũ đang chạy trên dữ liệu mới — deploy NGAY đúng mã đã kiểm (${ma.slice(0, 8)}).${RESET}`);
  // Mỗi lệnh một dòng TRƠN (chép-dán chạy được trong zsh): lời giải thích ở dòng riêng, không ngoặc / `#` cạnh lệnh — zsh tương tác không coi `#` là
  // chú thích, `git status --short # …` sẽ lọc theo đường dẫn và báo "sạch" giả. Kiểm cây sạch + đổi mã + deploy là MỘT dòng móc `&&`: chủ dán cả khối
  // một lần thì máy vẫn tự dừng trước deploy khi cây bẩn (không dựa vào mắt người đọc kết quả `git status`). Không dùng dấu `!` (zsh mở rộng lịch sử).
  const buoc = [
    [
      "Bước 1, kiểm thư mục sạch, về đúng mã đã kiểm, phát hành. Dòng này tự dừng trước khi phát hành nếu thư mục có thay đổi chưa commit",
      [`test -z "$(git status --short)" && git switch --detach ${ma} && test -z "$(git status --short)" && ${DEPLOY_CMD} || echo "DỪNG: chưa phát hành, hỏi người phụ trách kỹ thuật"`],
    ],
    ["Bước 2, kiểm dữ liệu và so số phiên bản", ["node scripts/audit-invariants.mjs --db remote", GATE_POST_CMD]],
    ["Bước 3, về lại nhánh chính", ["git switch main"]],
  ];
  log(`${RED}Chờ lệnh git đang chạy ở thư mục này xong (nếu có). Rồi ở thư mục tourdao-sales, chạy LẦN LƯỢT từng dòng lệnh thụt vào dưới đây:${RESET}`);
  for (const [giaiThich, lenh] of buoc) {
    log(`${RED}${giaiThich}${RESET}`);
    for (const l of lenh) log(`${RED}  ${l}${RESET}`);
  }
}

// ─────────────────────────────── kiểm đủ bộ trên GitHub (ADR-0179) ───────────────────────────────

/** Kho GitHub (công khai — Actions miễn phí, ADR-0179 Bối cảnh). Mọi lệnh `gh` nêu tường minh `-R` để không phụ thuộc thư mục đang đứng. */
export const REPO = "luutuanvu1010/tourdaobooking";
export const WORKFLOW = "kiem.yml";
/** Tên việc gom trong .github/workflows/kiem.yml — hợp đồng (bài src/release-lib.test.ts đọc tệp quy trình để khoá). */
export const VIEC_GOM = "Gom kết quả kiểm";
/** Ứng dụng GitHub tạo check-run khi Actions chạy. Chỉ nhận check-run của ứng dụng này (không nhận "commit status" ai có khoá API cũng đăng được — Đ2.2). */
export const UNG_DUNG_ACTIONS = "github-actions";
export const HAN_KET_QUA_MS = 24 * 3600e3;
/** Mục tiêu tổng thời gian một lần phát hành (Đ1.1) — vượt thì cảnh báo, không chặn. */
export const MUC_TIEU_GIAY = 600;
/** Mục tiêu một lượt kiểm GitHub, từ lúc đẩy nhánh chờ kiểm tới lúc có kết luận (chủ dự án 25/11/2026: «tối đa 5 phút») — vượt thì cảnh báo, không chặn. */
export const MUC_TIEU_KIEM_GIAY = 300;
const CHO_LUOT_HIEN_MS = 5 * 60e3;
const CHO_LUOT_XONG_MS = 45 * 60e3;
// 25/11/2026 (rút lượt kiểm ≤ 5 phút): 15 → 5 giây — kết luận tới tay chủ chậm nhất 5 giây sau khi GitHub xong (~60 lần hỏi cho một lượt 5 phút, xa trần
// 5.000 lần/giờ của gh).
const NHIP_HOI_MS = 5e3;
/** 17/11: một lần `gh run view` chập mạng từng làm day-len dừng dù lượt kiểm đã xanh. Đọc lỗi liền nhau tới số này thì chờ một nhịp rồi hỏi lại; lần kế tiếp lỗi nữa thì dừng. */
export const SO_LAN_DOC_LOI_TOI_DA = 3;
const LY_DO_TOI_THIEU = 5;
const isSha = (s) => typeof s === "string" && /^[0-9a-f]{40}$/.test(s);
export const nhanhChoKiem = (sha) => `cho-kiem/${sha}`;
const LENH_CHAY_LAI = (runId) => (runId ? `gh run rerun ${runId} -R ${REPO}` : `gh workflow run ${WORKFLOW} -R ${REPO} --ref <nhánh cho-kiem/…>`);

/**
 * Bản ghi kết luận của day-len cho MỘT commit (Đ2.2, Đ3): `<git-common-dir>/tourdao-kiem/<sha>.json` — trong `.git` (ngoài cây mã, không commit), dùng chung
 * giữa checkout gốc và mọi worktree. Chỉ day-len (chủ gõ, TTY) ghi; trien-khai đọc. Nằm trên máy nên chỉ chặn nhầm/quên, không chống cố ý làm giả; hook chặn
 * AI ghi thư mục này. taiKetQua(runId) tải tệp tổng của việc gom (`ket-qua-tong`) — số tệp / bài / bỏ qua để so (Đ2.3). Test truyền kho giả.
 */
export function khoKiemThat(run) {
  const thuMuc = async () => {
    const r = await run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
    if (r.code !== 0 || !trimOut(r)) throw new Error("không tìm được thư mục .git dùng chung (`git rev-parse --git-common-dir` lỗi)");
    const { join } = await import("node:path");
    return join(trimOut(r), "tourdao-kiem");
  };
  return {
    async docBanGhi(sha) {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      try {
        return JSON.parse(await readFile(join(await thuMuc(), `${sha}.json`), "utf8"));
      } catch {
        return null;
      }
    },
    async ghiBanGhi(sha, banGhi) {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const d = await thuMuc();
      await mkdir(d, { recursive: true });
      await writeFile(join(d, `${sha}.json`), `${JSON.stringify(banGhi, null, 1)}\n`);
    },
    async taiKetQua(runId) {
      const { mkdtemp, readFile, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      const tmp = await mkdtemp(join(tmpdir(), "tourdao-ket-qua-"));
      try {
        const r = await run("gh", ["run", "download", String(runId), "-R", REPO, "-n", "ket-qua-tong", "-D", tmp]);
        if (r.code !== 0) return null;
        return JSON.parse(await readFile(join(tmp, "ket-qua-tong.json"), "utf8"));
      } catch {
        return null;
      } finally {
        await rm(tmp, { recursive: true, force: true }).catch(() => {});
      }
    },
  };
}

const parseJson = (r) => {
  if (r.code !== 0) return null;
  try {
    return JSON.parse(String(r.stdout ?? ""));
  } catch {
    return null;
  }
};
const RUN_FIELDS = "databaseId,headSha,status,conclusion,url,attempt,event,createdAt,updatedAt";
async function cacLuot(run, sha) {
  return parseJson(await run("gh", ["run", "list", "-R", REPO, "--workflow", WORKFLOW, "--commit", sha, "--limit", "20", "--json", RUN_FIELDS]));
}
async function xemLuot(run, id) {
  return parseJson(await run("gh", ["run", "view", String(id), "-R", REPO, "--json", `${RUN_FIELDS},jobs`]));
}

/** Đồng hồ chặng: thời gian mỗi chặng KHÔNG tính lúc chờ chủ trả lời (Đ1.1). `ask` bọc lại để cộng thời gian chờ. */
function dongHo(now, ask) {
  let moc = now().getTime();
  let choChu = 0;
  const chang = [];
  return {
    ask: async (q) => {
      const a = now().getTime();
      try {
        return await ask(q);
      } finally {
        choChu += now().getTime() - a;
      }
    },
    moc(ten) {
      const t = now().getTime();
      chang.push({ ten, giay: Math.max(0, Math.round((t - moc - choChu) / 1000)) });
      moc = t;
      choChu = 0;
    },
    chang,
    tong: () => chang.reduce((s, c) => s + c.giay, 0),
  };
}
const phut = (giay) => `${Math.floor(giay / 60)} phút ${String(giay % 60).padStart(2, "0")} giây`;

/** Chờ lượt kiểm của đúng sha hiện lên rồi chạy xong (hoặc lượt chạy lại `attemptToiThieu`). In tiến độ từng phần khi đổi. Trả { luot } hoặc { loi }. */
async function choLuot(run, log, sleep, now, sha, { id = null, attemptToiThieu = 1 } = {}) {
  const batDau = now().getTime();
  let luotId = id;
  // Số lần đọc lỗi LIỀN NHAU (một lần đọc được thì về 0). Lỗi thoáng qua thì hỏi lại; quá trần thì dừng — không bao giờ đoán xanh.
  let docLoi = 0;
  while (luotId === null) {
    const ds = await cacLuot(run, sha);
    if (ds === null) {
      if (++docLoi > SO_LAN_DOC_LOI_TOI_DA) return { loi: `không đọc được danh sách lượt kiểm (\`gh run list\` lỗi ${docLoi} lần liền — mất mạng hay chưa đăng nhập gh?)` };
      log(`  (\`gh run list\` lỗi — chờ ${NHIP_HOI_MS / 1e3} giây rồi hỏi lại, lần ${docLoi}/${SO_LAN_DOC_LOI_TOI_DA})`);
      await sleep(NHIP_HOI_MS);
      continue;
    }
    docLoi = 0;
    const dung = ds.filter((l) => l?.headSha === sha).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (dung.length) luotId = dung[0].databaseId;
    else {
      if (now().getTime() - batDau > CHO_LUOT_HIEN_MS) return { loi: `quá ${CHO_LUOT_HIEN_MS / 60e3} phút mà GitHub chưa có lượt kiểm cho commit ${sha.slice(0, 8)} (quy trình ${WORKFLOW} có trên commit đó không?)` };
      await sleep(NHIP_HOI_MS);
    }
  }
  let inCu = "";
  for (;;) {
    const l = await xemLuot(run, luotId);
    if (l === null) {
      if (++docLoi > SO_LAN_DOC_LOI_TOI_DA) return { loi: `không đọc được lượt kiểm ${luotId} (\`gh run view\` lỗi ${docLoi} lần liền)` };
      log(`  (\`gh run view\` lỗi — chờ ${NHIP_HOI_MS / 1e3} giây rồi hỏi lại, lần ${docLoi}/${SO_LAN_DOC_LOI_TOI_DA})`);
      await sleep(NHIP_HOI_MS);
      continue;
    }
    docLoi = 0;
    if (l.headSha !== sha) return { loi: `lượt kiểm ${luotId} thuộc commit ${String(l.headSha).slice(0, 8)}, không phải ${sha.slice(0, 8)}` };
    const jobs = Array.isArray(l.jobs) ? l.jobs : [];
    const xong = jobs.filter((j) => j.status === "completed").length;
    const do_ = jobs.filter((j) => j.status === "completed" && j.conclusion !== "success" && j.conclusion !== "skipped").map((j) => j.name);
    const dong = `  ${l.status === "completed" ? "xong" : "đang kiểm"}: ${xong}/${jobs.length} phần xong${do_.length ? `, ĐỎ: ${do_.join(", ")}` : ""}`;
    if (dong !== inCu) {
      log(dong);
      inCu = dong;
    }
    if (l.status === "completed" && (l.attempt ?? 1) >= attemptToiThieu) return { luot: l };
    if (now().getTime() - batDau > CHO_LUOT_XONG_MS) return { loi: `quá ${CHO_LUOT_XONG_MS / 60e3} phút mà lượt kiểm ${luotId} chưa xong (${l.url ?? ""})` };
    await sleep(NHIP_HOI_MS);
  }
}

/** Đ2.3: các tệp điều khiển việc kiểm khác nhau giữa origin/main và main (băm git). package.json chỉ so KHOA_PACKAGE. Trả mảng tên, hoặc null khi lệnh lỗi. */
async function tepDieuKhienDoi(run) {
  const { TEP_DIEU_KHIEN, KHOA_PACKAGE } = await import("./kiem-phan.mjs");
  const khac = TEP_DIEU_KHIEN.filter((t) => t !== "package.json");
  const d = await run("git", ["diff", "--name-only", "--no-renames", "origin/main", "main", "--", ...khac]);
  if (d.code !== 0) return null;
  const doi = trimOut(d).split("\n").filter(Boolean);
  const pk = await Promise.all(["origin/main", "main"].map((r) => run("git", ["show", `${r}:package.json`])));
  if (pk.some((r) => r.code !== 0)) return null;
  let cu;
  let moi;
  try {
    [cu, moi] = pk.map((r) => JSON.parse(String(r.stdout)));
  } catch {
    return null;
  }
  // Khoá "scripts.<tên>" = một lệnh trong mục scripts (tên có thể chứa ":" như test:e2e); khoá khác = mục cấp đầu (engines, devDependencies).
  const layKhoa = (o, k) => (k.startsWith("scripts.") ? o?.scripts?.[k.slice("scripts.".length)] : o?.[k]);
  for (const k of KHOA_PACKAGE) if (JSON.stringify(layKhoa(cu, k)) !== JSON.stringify(layKhoa(moi, k))) doi.push(`package.json (${k})`);
  return doi;
}

/**
 * Tệp LUẬT chi phối AI (kế hoạch 2026-11-15 việc 2.1; Hiến pháp N9): đổi chúng KHÔNG làm đổi cách kiểm (khác TEP_DIEU_KHIEN), nhưng chủ phải thấy MỌI lần
 * đổi ở một chỗ trước khi nhập bản chính, nên day-len liệt kê và đòi lý do riêng. Thư mục = mọi tệp bên dưới; "src/modules/*\/CLAUDE.md" là pathspec glob của git.
 */
export const TEP_LUAT = ["CLAUDE.md", "src/CLAUDE.md", "web/CLAUDE.md", "src/modules/*/CLAUDE.md", ".claude", "playbook", "docs/adr"];

/** 2.1: tệp luật khác nhau giữa origin/main và main. Trả mảng đường dẫn (có thể rỗng), hoặc null khi lệnh lỗi. */
async function tepLuatDoi(run) {
  const d = await run("git", ["diff", "--name-only", "--no-renames", "origin/main", "main", "--", ...TEP_LUAT]);
  if (d.code !== 0) return null;
  return trimOut(d).split("\n").map((x) => x.trim()).filter(Boolean);
}

/** Đ2.3: số tệp / bài / kịch bản giảm hay số bài bỏ qua tăng so với lượt kiểm của origin/main. Thiếu một bên ⇒ một dòng "không so được". */
export function soSanhSoLieu(cu, moi) {
  const so = (x) => x?.tong && ["soTep", "soBai", "soBoQua", "soKichBan"].every((k) => Number.isInteger(x.tong[k]));
  if (!so(moi)) return ["không đọc được số tệp / số bài của lượt kiểm này (tệp ket-qua-tong)"];
  if (!so(cu)) return ["không có lượt kiểm của origin/main để so số tệp / số bài (lần đầu dùng quy trình mới, hoặc origin/main chưa qua day-len mới)"];
  const ra = [];
  for (const [k, ten] of [["soTep", "số tệp kiểm"], ["soBai", "số bài kiểm"], ["soKichBan", "số kịch bản e2e"]]) if (moi.tong[k] < cu.tong[k]) ra.push(`${ten} giảm: ${cu.tong[k]} → ${moi.tong[k]}`);
  if (moi.tong.soBoQua > cu.tong.soBoQua) ra.push(`số bài bỏ qua (skip/todo) tăng: ${cu.tong.soBoQua} → ${moi.tong.soBoQua}`);
  return ra;
}

async function hoiLyDo(ask, cau) {
  const a = String((await ask(cau)) ?? "").trim();
  return a.replace(/\s/g, "").length >= LY_DO_TOI_THIEU ? a : null;
}

// ─────────────────────────────── day-len ───────────────────────────────

/**
 * Hai dòng in cho chủ khi `main` trên máy ĐÃ gộp mà CHƯA đẩy: lời giải thích + MỘT dòng lệnh quay về TỰ KIỂM (day-len không bao giờ tự chạy nó).
 * Sự cố 2026-11-21: dòng cũ là `git reset --hard <mã cũ>` trần; chạy nó khi một lệnh `day-len` khác đã nối thêm vào `main` thì xoá luôn phần của lệnh đó khỏi
 * `main` trên máy. Dòng mới chỉ quay khi thư mục đang ở nhánh `main` VÀ `main` còn ở ĐÚNG mã lệnh này để lại (`sha`). Phép kiểm chạy lúc chủ CHẠY dòng đó, không
 * phải lúc in (chủ có thể chạy muộn, sau khi lệnh khác đã gộp). Một dòng trơn chép-dán được trong zsh: không `!`, không `#`, không dấu huyền (như
 * inLenhDeployDungMa). Bài src/release-lib-quay-ve.test.ts chạy đúng dòng này trong vỏ lệnh thật với kho git tạm.
 */
export function lenhQuayVe(oldMain, sha) {
  return [
    "`main` đã được gộp tiến thẳng nhưng CHƯA đẩy. Muốn quay `main` về chỗ cũ thì tự chạy dòng dưới (lệnh này KHÔNG tự chạy). Dòng đó tự kiểm trước: chỉ quay khi `main` trên máy còn ở đúng chỗ lệnh này để lại; đã có lệnh nhập khác nhập thêm vào thì nó in DỪNG và không đổi gì:",
    `  test "$(git rev-parse --abbrev-ref HEAD) $(git rev-parse HEAD)" = "main ${sha}" && git reset --hard ${oldMain} || echo "DỪNG: chưa quay về. main trên máy không còn ở chỗ lệnh này để lại, có thể đã có phần của lệnh nhập khác. Hỏi người phụ trách kỹ thuật"`,
  ];
}

/**
 * `main` trên máy đang ở đâu so với mã ĐÃ KIỂM của lệnh này — đọc lại NGAY TRƯỚC khi đẩy (sự cố 2026-11-21: trong lúc lệnh chờ chủ trả lời / chờ GitHub kiểm,
 * một lệnh `day-len` khác chạy ở cùng thư mục nối thẳng `main` trên máy lên mã của nó). Lệnh đọc lỗi ⇒ `loi` (không đoán). `git merge-base --is-ancestor`
 * thoát 0 = là tổ tiên, 1 = không, mã khác = lệnh lỗi. Trả `kieu`:
 *  - "dung-cho": vẫn đúng mã đã kiểm;
 *  - "di-truoc": đã có thêm lần lưu sau mã đã kiểm, GitHub chưa có mã đã kiểm ⇒ đẩy ĐÚNG mã đã kiểm, phần thêm chờ lệnh nhập của nó;
 *  - "da-co-tren-github": `origin/main` đã chứa mã đã kiểm (lệnh nhập chạy sau đã đẩy trước, kèm phần của nó) ⇒ không còn gì để đẩy (đẩy lùi sẽ bị từ chối);
 *  - "khong-con": `main` trên máy không còn chứa mã đã kiểm (có người quay `main` về chỗ khác) ⇒ dừng, không đẩy.
 */
async function viTriMain(run, sha) {
  const r = await run("git", ["rev-parse", "main"]);
  const mainNay = trimOut(r);
  if (r.code !== 0 || !isSha(mainNay)) return { kieu: "loi", ly: "không đọc lại được mã của `main` trên máy (`git rev-parse main` lỗi)" };
  if (mainNay === sha) return { kieu: "dung-cho", mainNay };
  // So bằng MÃ vừa đọc, không bằng tên `main`: tên có thể đổi tiếp giữa hai lệnh.
  const conChua = await run("git", ["merge-base", "--is-ancestor", sha, mainNay]);
  if (conChua.code === 1) return { kieu: "khong-con", mainNay };
  if (conChua.code !== 0) return { kieu: "loi", ly: "không so được `main` trên máy với mã đã kiểm (`git merge-base --is-ancestor` lỗi)" };
  const daCo = await run("git", ["merge-base", "--is-ancestor", sha, "origin/main"]);
  if (daCo.code === 0) return { kieu: "da-co-tren-github", mainNay };
  if (daCo.code !== 1) return { kieu: "loi", ly: "không so được mã đã kiểm với `origin/main` (`git merge-base --is-ancestor` lỗi)" };
  return { kieu: "di-truoc", mainNay };
}

/**
 * ADR-0179 Đ2.1 + ADR-0215 Đ2: gộp tiến thẳng → HỎI HẾT câu biết được trước khi kiểm (lý do đổi tệp điều khiển kiểm, lý do đổi tệp luật), in tóm tắt, hỏi
 * một câu c/x/k → đẩy ĐÚNG commit lên `cho-kiem/<sha>` (không --force, không đẩy main) → chờ lượt kiểm của đúng sha → so số liệu với origin/main (Đ2.3) →
 * đọc lại `main` trên máy (viTriMain) → ghi bản ghi kết luận → đẩy ĐÚNG mã đã kiểm lên `main` (`git push origin <sha>:refs/heads/main`, KHÔNG theo tên
 * `main` — sự cố 2026-11-21: tên đó có thể đã bị lệnh nhập khác nối lên mã chưa kiểm; «kiểm xong mới đẩy `main`», ADR-0179 Đ2.1).
 *  - `c` (tự động): chủ rời máy được; đỏ ⇒ tự chạy lại phần đỏ ĐÚNG MỘT lần, vẫn đỏ ⇒ dừng; số liệu lạ / lượt cũ hơn 24 giờ ⇒ dừng; mọi lần dừng và lần
 *    đẩy xong đều có thông báo macOS. Không bao giờ tự «cho qua».
 *  - `x` (ngồi chờ): đúng luồng ADR-0179 — đỏ thì hỏi r/d/q (cho qua gõ lý do, Đ3.1), số liệu lạ thì đòi lý do (Đ3.2), cuối cùng hỏi c/k.
 * Không còn chạy npm test / typecheck ở máy (đã chạy MỘT lần trên GitHub, Đ1.5).
 * @param kho docBanGhi / ghiBanGhi / taiKetQua (mặc định khoKiemThat(run)); test truyền kho giả. @param sleep, now tiêm cho test.
 * @param thongBao (tieuDe, noiDung) — thông báo macOS; @param giuThuc () — giữ máy thức tới khi lệnh thoát. Mặc định không làm gì (test);
 *   `scripts/day-len.mjs` truyền bản thật (osascript, caffeinate).
 */
export const CAU_CHON_DAY_LEN = "Chọn: c = kiểm xanh thì TỰ đẩy lên GitHub (bạn rời máy được) · x = ngồi chờ, xem kết quả rồi mới quyết · k = dừng. (c/x/k) ";
export async function dayLen({ run, ask: askGoc, isTTY, log, target, now = () => new Date(), sleep = realSleep, kho, thongBao = () => {}, giuThuc = () => {} }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);
  if (target !== undefined && !isSafeBranchName(target)) return stop(`tên nhánh không hợp lệ: ${JSON.stringify(target)}. Không dùng tên bắt đầu bằng '-' hay có dấu cách.`);
  const kk = kho ?? khoKiemThat(run);
  const dh = dongHo(now, askGoc);
  const ask = dh.ask;

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
  // Mã `main` NGAY SAU bước gộp: mã đem đi kiểm, và là mã DUY NHẤT lệnh này được đẩy lên `main` trên GitHub. Từ đây KHÔNG tin tên `main` còn trỏ tới nó: một
  // lệnh `day-len` khác chạy ở cùng thư mục có thể nối thẳng `main` lên mã của nó trong lúc lệnh này chờ (sự cố 2026-11-21).
  const sha = trimOut(await run("git", ["rev-parse", "main"]));
  if (!isSha(sha)) {
    // Không có mã thì không dựng được dòng quay về tự kiểm ⇒ không in dòng `git reset` nào (không bao giờ in dòng trần).
    return stop("không đọc được mã commit của `main` (`git rev-parse main` lỗi) — không đẩy.", ...(oldMain ? ["`main` đã được gộp tiến thẳng nhưng CHƯA đẩy. Vì không đọc được mã hiện tại nên lệnh không in dòng quay về; hỏi người phụ trách kỹ thuật trước khi làm gì tiếp."] : []));
  }
  const undo = () => (oldMain ? lenhQuayVe(oldMain, sha) : []);

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

  const goc = trimOut(await run("git", ["rev-parse", "origin/main"]));
  if (!isSha(goc)) return stop("không đọc được mã commit của `origin/main` (`git rev-parse origin/main` lỗi) — không đẩy.", ...undo());

  // Đ2.3 — so TRƯỚC khi đẩy gì: chỉ day-len có mốc so đúng (origin/main trước khi đẩy).
  const doiQuyTrinh = await tepDieuKhienDoi(run);
  if (doiQuyTrinh === null) return stop("không so được các tệp điều khiển việc kiểm với `origin/main` (`git diff` / `git show` lỗi) — không đẩy.", ...undo());
  const doiLuat = await tepLuatDoi(run);
  if (doiLuat === null) return stop("không so được các tệp luật (CLAUDE.md, .claude/, playbook/, docs/adr/) với `origin/main` (`git diff` lỗi) — không đẩy.", ...undo());

  const gh = await run("gh", ["auth", "status"]);
  if (gh.code !== 0) return stop("chưa đăng nhập GitHub CLI (`gh auth status` lỗi) — không đọc được kết quả kiểm trên GitHub.", "Chạy: gh auth login (chọn GitHub.com, tài khoản luutuanvu1010), rồi chạy lại.", ...undo());
  dh.moc("chuẩn bị ở máy");

  // ADR-0215 Đ2.1 — mọi câu biết được TRƯỚC khi kiểm: hỏi ngay, trước lần đẩy phụ (chủ trả lời hết trong phút đầu).
  // Đ2.3 + Đ3.2 (ADR-0179) — tệp điều khiển việc kiểm đổi ⇒ không phải xanh thường: in tệp + khác biệt, đòi lý do.
  let quyTrinh = null;
  if (doiQuyTrinh.length) {
    const canhBao = doiQuyTrinh.map((t) => `tệp điều khiển việc kiểm đổi: ${t}`);
    log(`\n${RED}${BOLD}ĐỔI QUY TRÌNH KIỂM (không coi là xanh thường):${RESET}`);
    for (const c of canhBao) log(`  • ${c}`);
    const tepThat = [...new Set(doiQuyTrinh.map((t) => t.replace(/ \(.*\)$/, "")))];
    const df = await run("git", ["diff", "--stat", "origin/main", "main", "--", ...tepThat]);
    if (df.code === 0 && trimOut(df)) log(trimOut(df));
    log(`Xem đủ khác biệt: git diff origin/main main -- ${tepThat.join(" ")}`);
    const lyDo = await hoiLyDo(ask, `Gõ LÝ DO đổi quy trình kiểm (ít nhất ${LY_DO_TOI_THIEU} chữ); để trống = dừng: `);
    if (!lyDo) return stop("không có lý do đổi quy trình kiểm — không đẩy `main`.", ...undo());
    quyTrinh = { doi: canhBao, lyDo };
  }

  // 2.1 — khối RIÊNG cho tệp luật (N9): liệt kê từng tệp, đòi lý do riêng (không gộp với lý do đổi quy trình kiểm).
  let luat = null;
  if (doiLuat.length) {
    log(`\n${RED}${BOLD}TỆP LUẬT ĐÃ ĐỔI (CLAUDE.md, .claude/, playbook/, docs/adr/ — luật chi phối AI):${RESET}`);
    for (const t of doiLuat) log(`  • ${t}`);
    const df = await run("git", ["diff", "--stat", "origin/main", "main", "--", ...doiLuat]);
    if (df.code === 0 && trimOut(df)) log(trimOut(df));
    log(`Xem đủ khác biệt: git diff origin/main main -- ${doiLuat.join(" ")}`);
    const lyDo = await hoiLyDo(ask, `Gõ LÝ DO đổi tệp luật (ít nhất ${LY_DO_TOI_THIEU} chữ); để trống = dừng: `);
    if (!lyDo) return stop("không có lý do đổi tệp luật — không đẩy `main`.", ...undo());
    luat = { doi: doiLuat, lyDo };
  }

  const inTomTat = (dongKiem) => {
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
    log(dongKiem);
    if (quyTrinh) log(`Đổi quy trình kiểm — lý do: ${quyTrinh.lyDo}`);
    if (luat) log(`Tệp luật đã đổi — lý do: ${luat.lyDo} (${luat.doi.length} tệp)`);
    log("════════════════════════════════════════");
  };
  inTomTat("Kiểm đủ bộ trên GitHub: chưa chạy (sẽ chạy ngay sau câu hỏi này).");
  // ADR-0215 Đ2.1 — một câu ba lựa chọn, chỉ nhận đúng chữ thường. `c` thay câu «Đẩy lên GitHub? (c/k)» đang hỏi sau khi kiểm.
  const chon = String((await ask(CAU_CHON_DAY_LEN)) ?? "").trim();
  if (chon !== "c" && chon !== "x") return stop("Không đẩy (chỉ đúng chữ `c` hay `x` thường mới đi tiếp).", ...undo());
  const tuDong = chon === "c";
  // Chế độ tự động: mọi lần dừng từ đây đều kèm thông báo macOS (chủ có thể đã rời máy). `main` trên GitHub không đổi khi dừng.
  const dung = (...dong) => {
    if (tuDong) thongBao("Tour Đảo — CHƯA đẩy lên bản chính", String(dong[0] ?? ""));
    return stop(...dong);
  };
  if (tuDong) {
    log(`\n${BOLD}Bạn có thể rời máy.${RESET} Để nguyên cửa sổ Terminal này mở (đóng là dừng; \`main\` trên GitHub không đổi). Kiểm xanh thì lệnh tự đẩy và báo bằng thông báo trên máy.`);
    giuThuc();
  }

  // Đ2.1 — MỘT lần đẩy phụ: đúng commit lên nhánh chờ kiểm (công khai như mọi nhánh của kho). Không --force; KHÔNG đẩy main ở bước này.
  const nhanh = nhanhChoKiem(sha);
  log(`\n▶ Đẩy commit ${sha.slice(0, 8)} lên nhánh chờ kiểm \`${nhanh}\` (lần đẩy phụ, chưa đụng \`main\` trên GitHub) để GitHub kiểm đủ bộ`);
  const dayPhu = await run("git", ["push", "origin", `${sha}:refs/heads/${nhanh}`], { stream: true });
  if (dayPhu.code !== 0) return dung(`đẩy nhánh chờ kiểm \`${nhanh}\` lỗi — GitHub chưa kiểm. \`main\` trên GitHub chưa đổi.`, ...undo());

  log("▶ Chờ GitHub kiểm đủ bộ (npm test, typecheck, e2e — chia nhiều máy chạy cùng lúc)");
  const batDauCho = now().getTime();
  let w = await choLuot(run, log, sleep, now, sha);
  if (w.loi) return dung(`${w.loi} — không đẩy \`main\`.`, ...undo());
  // Mục tiêu chủ đặt 25/11/2026: lượt kiểm ≤ 5 phút từ lúc đẩy nhánh chờ kiểm tới lúc có kết luận. Vượt thì nói ra (không chặn) để biết lúc cần chia lại.
  const giayCho = Math.round((now().getTime() - batDauCho) / 1000);
  log(giayCho > MUC_TIEU_KIEM_GIAY ? `${YELLOW}Lượt kiểm mất ${Math.floor(giayCho / 60)} phút ${giayCho % 60} giây — vượt mục tiêu ${MUC_TIEU_KIEM_GIAY / 60} phút; báo AI để chia lại phần kiểm.${RESET}` : `Lượt kiểm mất ${Math.floor(giayCho / 60)} phút ${giayCho % 60} giây (mục tiêu ≤ ${MUC_TIEU_KIEM_GIAY / 60} phút).`);
  let luot = w.luot;
  let ketQua = luot.conclusion === "success" ? "xanh" : "do";
  let choQua = null;
  // Tải tệp gom lỗi ⇒ coi như không đọc được số liệu (soSanhSoLieu báo, chế độ c dừng có thông báo) — không để lệnh sập lặng lẽ khi chủ đã rời máy.
  const taiTong = (id) => Promise.resolve().then(() => kk.taiKetQua(id)).catch(() => null);
  let tong = await taiTong(luot.databaseId);
  let daTuChayLai = false;
  // Đ3.1 — đỏ: nêu tên bài / kịch bản đỏ. `x`: hỏi chạy lại / dừng / cho qua có lý do. `c` (ADR-0215 Đ2.3): tự chạy lại ĐÚNG MỘT lần, vẫn đỏ ⇒ dừng.
  while (ketQua === "do") {
    const baiDo = Array.isArray(tong?.baiDo) && tong.baiDo.length ? tong.baiDo : (luot.jobs ?? []).filter((j) => j.conclusion && j.conclusion !== "success" && j.conclusion !== "skipped").map((j) => `phần ${j.name}`);
    log(`${RED}${BOLD}Lượt kiểm ĐỎ${RESET} (${luot.url ?? ""}):`);
    for (const b of baiDo.length ? baiDo : ["không đọc được tên bài đỏ — mở đường dẫn ở trên để xem"]) log(`  ✘ ${b}`);
    let tl;
    if (tuDong) {
      if (daTuChayLai) return dung("lượt kiểm vẫn ĐỎ sau một lần tự chạy lại — không đẩy `main`.", `Tên bài đỏ ở trên. Sửa xong thì chạy lại \`npm run day-len\`; muốn cho qua có lý do thì chạy lại và chọn \`x\`.`, ...undo());
      log("▶ Tự chạy lại phần đỏ một lần (e2e từng đỏ giả rồi chạy lại xanh)");
      daTuChayLai = true;
      tl = "r";
    } else {
      tl = String((await ask("Chạy lại phần đỏ (r — khuyến nghị: e2e từng đỏ giả rồi chạy lại xanh) / dừng (d) / cho qua (q)? ")) ?? "").trim();
    }
    if (tl === "r") {
      const rr = await run("gh", ["run", "rerun", String(luot.databaseId), "-R", REPO, "--failed"]);
      if (rr.code !== 0) return dung(`không chạy lại được lượt kiểm (\`gh run rerun\` lỗi). Tự chạy: ${LENH_CHAY_LAI(luot.databaseId)} --failed rồi chạy lại \`npm run day-len\`.`, ...undo());
      log("▶ Đã yêu cầu chạy lại phần đỏ — chờ kết quả");
      w = await choLuot(run, log, sleep, now, sha, { id: luot.databaseId, attemptToiThieu: (luot.attempt ?? 1) + 1 });
      if (w.loi) return dung(`${w.loi} — không đẩy \`main\`.`, ...undo());
      luot = w.luot;
      ketQua = luot.conclusion === "success" ? "xanh" : "do";
      tong = await taiTong(luot.databaseId);
    } else if (tl === "q") {
      const lyDo = await hoiLyDo(ask, `Gõ LÝ DO cho qua (ít nhất ${LY_DO_TOI_THIEU} chữ, ví dụ "giá Sheet thật vừa đổi"); để trống = dừng: `);
      if (!lyDo) return stop("không có lý do cho qua — không đẩy `main`.", ...undo());
      choQua = { lyDo, baiDo, luc: now().toISOString() };
      break;
    } else {
      return stop("lượt kiểm đỏ — dừng, không đẩy `main`.", `Sửa xong thì chạy lại \`npm run day-len\`; hay chạy lại riêng lượt kiểm: ${LENH_CHAY_LAI(luot.databaseId)} --failed`, ...undo());
    }
  }
  dh.moc("chờ GitHub kiểm");
  // Lượt nhận được có thể là lượt CŨ của cùng commit (chạy lại day-len sau khi trả lời k): quá 24 giờ thì trien-khai sẽ dừng — báo sớm (kiểm độc lập N4).
  // Chế độ tự động (ADR-0215 Đ2.4): không tự đẩy một lượt cũ — dừng, chủ chạy lại lượt kiểm.
  const xongLuc = Date.parse(luot.updatedAt ?? "");
  if (Number.isFinite(xongLuc) && now().getTime() - xongLuc > HAN_KET_QUA_MS) {
    if (tuDong) return dung(`lượt kiểm nhận được xong lúc ${luot.updatedAt}, cũ hơn 24 giờ — không tự đẩy \`main\`.`, `Chạy lại lượt kiểm: ${LENH_CHAY_LAI(luot.databaseId)}, chờ xanh rồi chạy lại \`npm run day-len\`.`, ...undo());
    log(`${RED}${BOLD}CẢNH BÁO:${RESET} lượt kiểm này xong lúc ${luot.updatedAt}, cũ hơn 24 giờ — \`npm run trien-khai\` sẽ dừng. Chạy lại trước khi triển khai: ${LENH_CHAY_LAI(luot.databaseId)}`);
  }

  // Đ2.3 + Đ3.2 — điều chỉ biết SAU khi kiểm: số tệp/bài giảm, số bỏ qua tăng, không đọc được số liệu, không có lượt xanh của origin/main để so.
  let tongGoc = null;
  const dsGoc = await cacLuot(run, goc);
  // Mốc so chỉ là lượt XANH của origin/main (lượt đỏ dù được cho qua không làm mốc — kiểm độc lập N3).
  const luotGoc = (dsGoc ?? []).filter((l) => l?.headSha === goc && l.status === "completed" && l.conclusion === "success").sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  if (luotGoc) tongGoc = await taiTong(luotGoc.databaseId);
  const canhBaoSau = soSanhSoLieu(tongGoc, tong);
  if (canhBaoSau.length) {
    log(`\n${RED}${BOLD}ĐỔI QUY TRÌNH KIỂM (không coi là xanh thường):${RESET}`);
    for (const c of canhBaoSau) log(`  • ${c}`);
    if (tuDong) return dung("số liệu kiểm khác lượt của `origin/main` — không tự đẩy `main`.", "Chạy lại `npm run day-len` và chọn `x` để xem rồi gõ lý do.", ...undo());
    const lyDo = await hoiLyDo(ask, `Gõ LÝ DO đổi quy trình kiểm (ít nhất ${LY_DO_TOI_THIEU} chữ); để trống = dừng: `);
    if (!lyDo) return stop("không có lý do đổi quy trình kiểm — không đẩy `main`.", ...undo());
    quyTrinh = { doi: [...(quyTrinh?.doi ?? []), ...canhBaoSau], lyDo: quyTrinh ? `${quyTrinh.lyDo}; ${lyDo}` : lyDo };
  }

  inTomTat(`Kiểm đủ bộ trên GitHub: ${ketQua === "xanh" ? "XANH" : `ĐỎ — chủ cho qua: ${choQua?.lyDo}`} (${luot.url ?? ""})`);
  dh.moc("so sánh và tóm tắt");

  if (!tuDong && !yes(await ask("Đẩy lên GitHub? (c/k) "))) return stop("Không đẩy (chỉ trả lời đúng `c` mới đẩy).", ...undo());

  // Sự cố 2026-11-21 — đọc lại `main` trên máy NGAY TRƯỚC khi đẩy (sau câu hỏi cuối: không còn lần chờ nào giữa lần đọc này và lần đẩy). Việc đọc lại chỉ để
  // quyết lời báo và để dừng khi `main` đã bị quay về; thứ được đẩy thì LUÔN là đúng mã đã kiểm (xem lệnh đẩy bên dưới), không phụ thuộc lần đọc này.
  const viTri = await viTriMain(run, sha);
  if (viTri.kieu === "loi") return dung(`${viTri.ly} — không đẩy \`main\`.`, ...undo());
  if (viTri.kieu === "khong-con") {
    // `main` đã bị đổi rồi nên không in dòng quay về (dòng đó chỉ đúng khi `main` còn ở chỗ lệnh này để lại).
    return dung(
      `\`main\` trên máy không còn chứa bản đã kiểm ${sha.slice(0, 8)} (đang ở ${viTri.mainNay.slice(0, 8)}): có người đã quay \`main\` về chỗ khác trong lúc lệnh này chờ — không đẩy \`main\`.`,
      `Bản đã kiểm vẫn còn nguyên ở nhánh chờ kiểm \`${nhanh}\` trên GitHub. ${target !== undefined ? `Muốn đưa lên thì chạy lại \`npm run day-len -- ${target}\` (lượt kiểm đã có nên lần sau qua nhanh).` : "Hỏi người phụ trách kỹ thuật cách đưa lại lên."}`,
    );
  }
  if (viTri.kieu === "da-co-tren-github") {
    // Không ghi bản ghi kết luận: `trien-khai` đọc bản ghi của ĐỈNH `main`, bản ghi đó do lệnh đã đẩy ghi.
    log(`\nBản đã kiểm ${sha.slice(0, 8)} đã nằm trong \`main\` trên GitHub rồi (thường do một lệnh \`npm run day-len\` khác chạy sau đã đẩy lên trước, kèm cả phần của nó). Lệnh này không cần đẩy gì thêm.`);
    if (tuDong) thongBao("Tour Đảo — ĐÃ có trên bản chính", `Bản đã kiểm ${sha.slice(0, 8)} đã được một lệnh nhập khác đẩy lên.`);
    return 0;
  }

  // Bản ghi kết luận ghi TRƯỚC khi đẩy main: trien-khai đòi bản ghi của đúng commit (Đ2.2). Ghi lỗi ⇒ không đẩy (trien-khai sẽ dừng vì thiếu bản ghi).
  const banGhi = {
    sha,
    luc: now().toISOString(),
    runId: luot.databaseId,
    runUrl: luot.url ?? null,
    ketQua,
    xanhLuc: ketQua === "xanh" ? (luot.updatedAt ?? null) : null,
    choQua,
    quyTrinh,
    luat,
    soLieu: tong?.tong ?? null,
    chang: dh.chang,
    giayDayLen: dh.tong(),
  };
  try {
    await kk.ghiBanGhi(sha, banGhi);
  } catch (e) {
    return dung(`không ghi được bản ghi kết luận kiểm (${e instanceof Error ? e.message : String(e)}) — không đẩy \`main\`.`, ...undo());
  }

  // Đẩy theo MÃ, không theo tên `main`: GitHub nhận đúng commit có lượt kiểm ở trên, dù `main` trên máy đang ở đâu (đẩy theo tên sẽ đưa cả phần chưa kiểm của
  // lệnh nhập khác lên — sự cố 2026-11-21). Không `--force`, không dấu `+` ⇒ vẫn chỉ nối thẳng: GitHub từ chối nếu `main` của nó không nằm trong lịch sử mã này.
  const push = await run("git", ["push", "origin", `${sha}:refs/heads/main`], { stream: true });
  if (push.code !== 0) {
    return dung("đẩy bản đã kiểm lên `main` trên GitHub lỗi — GitHub CHƯA nhận. Đọc lỗi ở trên.", "Thường chỉ cần chạy lại `npm run day-len` (lượt kiểm đã có nên lần sau qua nhanh); nếu GitHub đang có thứ mới hơn máy thì lần chạy lại sẽ nói rõ.");
  }
  const last = trimOut(await run("git", ["log", "-1", "--oneline", "--no-decorate", "origin/main"]));
  log(`Đã đẩy. GitHub (origin/main) giờ là: ${last}`);
  if (viTri.kieu === "di-truoc") {
    log(`${BOLD}LƯU Ý:${RESET} \`main\` trên máy đang đi trước bản vừa đẩy (ở ${viTri.mainNay.slice(0, 8)}): trong lúc lệnh này chờ, \`main\` trên máy đã có thêm lần lưu (thường do một lệnh \`npm run day-len\` khác đã nhập thêm phần của nó vào). Lệnh này CHỈ đẩy đúng bản đã kiểm ${sha.slice(0, 8)}; phần nhập thêm kia CHƯA lên GitHub và chờ lệnh nhập của chính nó kiểm xong.`);
    log("Trong lúc đó `npm run trien-khai` sẽ từ chối (vì `main` trên máy khác GitHub): chờ lệnh nhập kia xong rồi mới triển khai.");
  }
  if (tuDong) thongBao("Tour Đảo — ĐÃ đẩy lên bản chính", last);
  log(`Thời gian day-len (không tính lúc chờ trả lời): ${phut(dh.tong())} — ${dh.chang.map((c) => `${c.ten} ${phut(c.giay)}`).join("; ")}.`);
  return 0;
}

/**
 * trien-khai bước 3b (ADR-0179 Đ2.2, Đ3): đọc check-run của ĐÚNG sha qua `gh api` (chỉ đọc) + bản ghi kết luận của day-len. Trả { ok: true, ketQuaText, banGhi }
 * hoặc { ok: false, ly, huongDan }. Chỉ nhận check-run của ứng dụng GitHub Actions; việc gom phải xong, xanh (hoặc đỏ CÓ bản ghi cho qua), ≤ 24 giờ.
 */
export async function docKetQuaKiem({ run, kho, sha, nowMs }) {
  const banGhi = await kho.docBanGhi(sha).catch(() => null);
  // Bản ghi của day-len vẫn dùng được sau khi chạy lại lượt kiểm (bản ghi gắn với commit, không gắn với giờ) — chỉ cần chạy lại trien-khai.
  const chayLai = (id) => [`Chạy lại lượt kiểm: ${LENH_CHAY_LAI(id)}`, "chờ lượt đó xanh rồi chạy lại `npm run trien-khai`. Vẫn đỏ thì báo người phụ trách kỹ thuật (muốn cho qua phải đi qua `npm run day-len` với một lần lưu mới)."];
  if (!banGhi || typeof banGhi !== "object") return { ok: false, ly: `không có bản ghi kết luận kiểm của \`npm run day-len\` cho commit ${sha.slice(0, 8)} (commit lên main không qua day-len trên máy này?).`, huongDan: ["Báo người phụ trách kỹ thuật tạo một lần lưu mới, đưa lên bằng `npm run day-len`, rồi chạy lại `npm run trien-khai`."] };
  if (banGhi.sha !== sha) return { ok: false, ly: `bản ghi kết luận kiểm không khớp commit (${String(banGhi.sha).slice(0, 8)} ≠ ${sha.slice(0, 8)}).`, huongDan: ["Chạy lại `npm run day-len`."] };
  if (Array.isArray(banGhi.quyTrinh?.doi) && banGhi.quyTrinh.doi.length && !String(banGhi.quyTrinh.lyDo ?? "").trim()) return { ok: false, ly: "bản ghi nói quy trình kiểm đã đổi mà không có lý do của chủ.", huongDan: ["Chạy lại `npm run day-len`."] };
  if (Array.isArray(banGhi.luat?.doi) && banGhi.luat.doi.length && !String(banGhi.luat.lyDo ?? "").trim()) return { ok: false, ly: "bản ghi nói tệp luật đã đổi mà không có lý do của chủ.", huongDan: ["Chạy lại `npm run day-len`."] };
  const r = await run("gh", ["api", `repos/${REPO}/commits/${sha}/check-runs?per_page=100`]);
  const j = parseJson(r);
  if (!j || !Array.isArray(j.check_runs)) return { ok: false, ly: "không đọc được kết quả kiểm trên GitHub (`gh api … check-runs` lỗi — mất mạng hay chưa đăng nhập gh?).", huongDan: ["Kiểm `gh auth status` rồi chạy lại `npm run trien-khai`."] };
  if (Number(j.total_count) > j.check_runs.length) return { ok: false, ly: `commit có ${j.total_count} kết quả kiểm, quá một trang đọc (100) — không đọc đủ thì không kết luận.`, huongDan: ["Báo người phụ trách kỹ thuật."] };
  const cua = j.check_runs.filter((c) => c?.app?.slug === UNG_DUNG_ACTIONS);
  if (!cua.length) return { ok: false, ly: `commit ${sha.slice(0, 8)} không có kết quả kiểm nào do GitHub Actions tạo.`, huongDan: chayLai(banGhi.runId) };
  if (cua.some((c) => c.head_sha !== sha)) return { ok: false, ly: "kết quả kiểm GitHub trả về thuộc commit khác.", huongDan: chayLai(banGhi.runId) };
  const gom = cua.filter((c) => c.name === VIEC_GOM);
  if (gom.length !== 1) return { ok: false, ly: gom.length ? `có ${gom.length} kết quả "${VIEC_GOM}" cho cùng commit — không kết luận được.` : `thiếu kết quả "${VIEC_GOM}" (lượt kiểm chưa chạy hết, hoặc quy trình không có việc gom).`, huongDan: chayLai(banGhi.runId) };
  const dangChay = cua.filter((c) => c.status !== "completed");
  if (dangChay.length) return { ok: false, ly: `lượt kiểm còn đang chạy (${dangChay.map((c) => c.name).join(", ")}).`, huongDan: ["Chờ lượt kiểm xong rồi chạy lại `npm run trien-khai`."] };
  const xong = Date.parse(gom[0].completed_at);
  if (!Number.isFinite(xong)) return { ok: false, ly: `không đọc được giờ xong của "${VIEC_GOM}".`, huongDan: chayLai(banGhi.runId) };
  if (nowMs - xong > HAN_KET_QUA_MS) return { ok: false, ly: `kết quả kiểm cũ hơn 24 giờ (xong lúc ${gom[0].completed_at}).`, huongDan: chayLai(banGhi.runId) };
  const do_ = cua.filter((c) => c.conclusion !== "success" && c.conclusion !== "skipped").map((c) => c.name);
  if (gom[0].conclusion !== "success" && !do_.includes(VIEC_GOM)) do_.push(VIEC_GOM);
  if (do_.length) {
    if (!banGhi.choQua || !String(banGhi.choQua.lyDo ?? "").trim()) return { ok: false, ly: `lượt kiểm ĐỎ (${do_.join(", ")}) và chủ chưa cho qua ở \`npm run day-len\`.`, huongDan: chayLai(banGhi.runId) };
    return { ok: true, banGhi, ketQuaText: `ĐỎ (${do_.join(", ")}) — chủ cho qua ở day-len, lý do: ${banGhi.choQua.lyDo}` };
  }
  return { ok: true, banGhi, ketQuaText: `XANH lúc ${gom[0].completed_at}${banGhi.quyTrinh ? " (có đổi quy trình kiểm — xem lý do bên dưới)" : ""}` };
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
 * @param docCacKho đọc các kho R2 khai trong wrangler.jsonc; test truyền hàm giả.
 */
export async function trienKhai({ run, ask: askGoc, isTTY, log, now = () => new Date(), sleep = realSleep, version, docMocTinDoi = docMocTinDoiMacDinh, docCacKho = docCacKhoMacDinh, kho }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);
  const kk = kho ?? khoKiemThat(run);
  const dh = dongHo(now, askGoc);
  const ask = dh.ask;

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
  // 1d. cùng danh sách TÊN ở trên (không gọi thêm lệnh, không đọc giá trị): khoá mã hoá bảo mật hai lớp. Câu báo riêng vì hậu quả và độ dài khoá khác.
  if (!tenKhoa.includes(KHOA_HAI_LOP)) {
    return stop(
      `Chưa đặt khoá ${KHOA_HAI_LOP} trên Cloudflare. Nếu triển khai lúc này thì không ai bật được bảo mật hai lớp, và từ ngày thứ 15 sau khi phát hành, mọi tài khoản nội bộ sẽ không đăng nhập bằng PIN được nữa. CHƯA có gì bị đổi trên production.`,
      `Chạy trong Terminal, ở thư mục tourdao-sales:\n  1) openssl rand -base64 32\n     (sinh khoá đúng 32 byte; cất chuỗi in ra vào trình quản lý mật khẩu — mất khoá thì mọi người phải bật lại lớp hai)\n  2) npx wrangler secret put ${KHOA_HAI_LOP}\n     (dán chuỗi vừa sinh khi được hỏi)\nrồi chạy lại \`npm run trien-khai\`.`,
    );
  }
  log(`Đã có đủ khoá: ${[...KHOA_BAT_BUOC, KHOA_HAI_LOP].join(", ")}.`);

  // 1e. cổng chỉ-đọc: MỌI kho R2 khai trong wrangler.jsonc (ADR-0123 kho tệp hồ sơ; ADR-0144 kho tệp vé hỗ trợ) đã được CHỦ tạo chưa. Tên kho đọc từ
  // wrangler.jsonc (một nguồn). Thiếu một kho thì Worker mới không gửi / mở được tệp của kho đó (Cloudflare có từ chối deploy hay không: chưa kiểm). Lệnh lỗi
  // (kể cả 7403) hay không thấy đúng tên ⇒ DỪNG, không thử lại. KHÔNG BAO GIỜ tự tạo kho — chỉ in lệnh cho chủ.
  log("\n▶ Cổng chỉ-đọc: các kho tệp đã tạo trên Cloudflare chưa");
  let cacKho = null;
  try {
    cacKho = await docCacKho();
  } catch {
    cacKho = null;
  }
  if (!cacKho || cacKho.length === 0) {
    return stop("không đọc được tên kho tệp (mục r2_buckets) trong wrangler.jsonc — CHƯA có gì bị đổi trên production.", "Báo AI kiểm lại wrangler.jsonc rồi chạy lại `npm run trien-khai`.");
  }
  const khoR2 = await run("npx", ["wrangler", "r2", "bucket", "list"], { env: CI });
  if (khoR2.code !== 0) {
    return stop("`wrangler r2 bucket list` lỗi — chưa kiểm được các khoR2 tệp nên KHÔNG đi tiếp. CHƯA có gì bị đổi trên production.", String(khoR2.stderr ?? "").trim().slice(0, 400));
  }
  const tenCacKho = parseR2BucketNames(String(khoR2.stdout ?? ""));
  // Không đọc ra tên khoR2 nào (đầu ra lạ — wrangler đổi dạng — hoặc tài khoản chưa có khoR2 nào): câu RIÊNG, không khẳng định "chưa có khoR2" (m2 vòng sửa cuối H-2).
  if (tenCacKho.length === 0) {
    const ten = cacKho.map((k) => k.ten);
    return stop(
      "không đọc được đầu ra của `wrangler r2 bucket list` (không thấy dòng \"name: …\" nào — dạng đầu ra lạ, hoặc tài khoản chưa có khoR2 nào) — chưa kiểm được các khoR2 tệp nên KHÔNG đi tiếp. CHƯA có gì bị đổi trên production.",
      `Chạy trong Terminal, ở thư mục tourdao-sales, để xem tận mắt:\n  npx wrangler r2 bucket list\nThiếu dòng "name: …" của khoR2 nào thì tạo khoR2 đó:\n${ten.map((t) => `  npx wrangler r2 bucket create ${t}`).join("\n")}\nrồi chạy lại \`npm run trien-khai\`. CÓ đủ các dòng đó mà lệnh vẫn dừng ở đây thì báo AI (dạng đầu ra của wrangler đã đổi).\n` +
        String(khoR2.stdout ?? "").slice(0, 400),
    );
  }
  const thieu = cacKho.find((k) => !tenCacKho.includes(k.ten));
  if (thieu) {
    const hauQua = HAU_QUA_THIEU_KHO[thieu.binding] ?? "tệp của khoR2 này không lưu hay mở được";
    return stop(
      `Chưa có ${nhanKho(thieu.binding)} ${thieu.ten} trên Cloudflare — triển khai lúc này thì ${hauQua}. CHƯA có gì bị đổi trên production.`,
      `Chạy trong Terminal, ở thư mục tourdao-sales:\n  npx wrangler r2 bucket create ${thieu.ten}\nKiểm lại (phải thấy dòng "name: ${thieu.ten}"):\n  npx wrangler r2 bucket list\nrồi chạy lại \`npm run trien-khai\`.`,
    );
  }
  for (const k of cacKho) log(`Đã có ${nhanKho(k.binding)}: ${k.ten}.`);

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

  // 2a. cổng mốc tin đổi (ADR-0062; phiếu kiểm A3 C1) — CHỈ khi lần này mang migration *_aud_order_change.sql; chỉ đọc một hằng trong mã, không gọi ra ngoài.
  if (coMigrationTinDoi(pending)) {
    log("\n▶ Cổng mốc tin đổi (lần phát hành đầu mang migration view tin đổi)");
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

  dh.moc("cổng chỉ-đọc");

  // 3. sản phẩm để deploy (1 giây). npm test / typecheck / e2e KHÔNG chạy lại ở đây (ADR-0179 Đ1.5): đã chạy MỘT lần trên GitHub cho đúng commit này.
  log("\n▶ npm run build:web");
  const build = await run("npm", ["run", "build:web"], { stream: true });
  if (build.code !== 0) return stop("`npm run build:web` đỏ — không áp migration, không deploy.");

  // 3b. ĐỌC kết quả kiểm đủ bộ trên GitHub cho ĐÚNG commit main (Đ2.2) + bản ghi kết luận của day-len (Đ3). Thiếu / đang chạy / đỏ không có cho qua /
  // quá 24 giờ / sai commit / không do GitHub Actions tạo / đổi quy trình kiểm mà không có lý do ⇒ DỪNG, chưa đổi gì trên production.
  log("\n▶ Đọc kết quả kiểm đủ bộ trên GitHub (chỉ đọc)");
  const kq = await docKetQuaKiem({ run, kho: kk, sha: local, nowMs: now().getTime() });
  if (!kq.ok) return stop(`${kq.ly} CHƯA có gì bị đổi trên production.`, ...(kq.huongDan ?? []));
  log(`Kiểm đủ bộ: ${kq.ketQuaText}`);
  // 3c. mã trong thư mục còn đúng mã lúc bắt đầu không (build:web có thể chạy lâu; phiên khác có thể gộp vào cùng thư mục — sự cố 2026-10-08).
  const doiSauKiem = await maDaDoi(run, local);
  if (doiSauKiem) return stop(`mã trong thư mục đã đổi trong lúc kiểm (${doiSauKiem}) — kết quả kiểm không còn đúng cho mã sắp đưa lên; không áp migration, không deploy.`, MA_DOI_HUONG_DAN);
  dh.moc("build và đọc kết quả kiểm");

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
    // So lại SAU câu hỏi (câu hỏi có thể chờ lâu), sát lệnh ghi.
    const doiTruocAp = await maDaDoi(run, local);
    if (doiTruocAp) return stop(`mã trong thư mục đã đổi sau khi kiểm (${doiTruocAp}) — không áp migration, không deploy.`, MA_DOI_HUONG_DAN);
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
  dh.moc("migration");

  // 5. deploy
  const q = applied.length ? `Migration đã áp — PHẢI deploy ngay. Triển khai Worker lên production? (c/k) ` : "Triển khai Worker lên production? (c/k) ";
  if (!yes(await ask(q))) {
    if (applied.length) {
      inLenhDeployDungMa(log, local);
      return 1;
    }
    return stop("Không deploy.");
  }
  const doiTruocDeploy = await maDaDoi(run, local);
  if (doiTruocDeploy) {
    if (applied.length) {
      log(`${RED}${BOLD}DỪNG: mã trong thư mục đã đổi sau khi kiểm (${doiTruocDeploy}) — KHÔNG deploy mã chưa qua kiểm.${RESET}`);
      inLenhDeployDungMa(log, local);
      return 1;
    }
    return stop(`mã trong thư mục đã đổi sau khi kiểm (${doiTruocDeploy}) — không deploy.`, MA_DOI_HUONG_DAN);
  }
  log("\n▶ Deploy Worker");
  const dep = await run("npx", ["wrangler", "deploy"], { env: CI, tee: true });
  if (dep.code !== 0) return stop("`wrangler deploy` LỖI — Worker có thể CHƯA đổi. Đọc lỗi ở trên; không rollback tự động.");
  const versionId = parseVersionId(dep.stdout);
  dh.moc("deploy");

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

  dh.moc("kiểm sau deploy");

  // 8. khối tóm tắt
  const giayDayLen = Number.isInteger(kq.banGhi?.giayDayLen) ? kq.banGhi.giayDayLen : null;
  const tongGiay = (giayDayLen ?? 0) + dh.tong();
  log("\n══════════ DÁN VÀO docs/HANDOFF-N1.md (TRẠNG THÁI TRIỂN KHAI) ══════════");
  log(`- Ngày giờ: ${vnDateTime(now())}`);
  log(`- Commit: ${commit}`);
  log(`- Kiểm đủ bộ (GitHub): ${kq.ketQuaText}`);
  log(`- Lượt kiểm: ${kq.banGhi?.runUrl ?? "không rõ"}`);
  if (kq.banGhi?.choQua) log(`- Cho qua lượt kiểm đỏ — lý do của chủ: ${kq.banGhi.choQua.lyDo} (bài đỏ: ${(kq.banGhi.choQua.baiDo ?? []).join("; ") || "không rõ"})`);
  if (kq.banGhi?.quyTrinh) log(`- Đổi quy trình kiểm — lý do của chủ: ${kq.banGhi.quyTrinh.lyDo} (${(kq.banGhi.quyTrinh.doi ?? []).join("; ")})`);
  if (kq.banGhi?.luat) log(`- Tệp luật đã đổi — lý do của chủ: ${kq.banGhi.luat.lyDo} (${(kq.banGhi.luat.doi ?? []).join("; ")})`);
  log(`- Migration đã áp: ${applied.length ? applied.join(", ") : "không có"}`);
  if (bookmark) log(`- Điểm khôi phục Time Travel trước khi áp: ${bookmark}`);
  log(`- Worker Version ID: ${versionId ?? "chưa lấy được (xem đầu ra deploy ở trên hoặc `npx wrangler deployments list`)"}`);
  log(`- Kiểm dữ liệu (audit-invariants --db remote): ${auditText}`);
  log(`- Phiên bản: ${version ?? "không rõ (vỏ không truyền số phiên bản)"}`);
  log(`- Cổng phiên bản trước deploy: ${preGateText}`);
  log(`- Cổng phiên bản sau deploy: ${postGateText}`);
  if (postCode !== 0) log(`  (kiểm lại tay: ${GATE_POST_CMD})`);
  const changDayLen = Array.isArray(kq.banGhi?.chang) ? kq.banGhi.chang.filter((c) => typeof c?.ten === "string" && Number.isInteger(c?.giay)) : [];
  log(`- Thời gian (không tính lúc chờ chủ trả lời): day-len ${giayDayLen === null ? "không rõ" : phut(giayDayLen)}${changDayLen.length ? ` (${changDayLen.map((c) => `${c.ten} ${phut(c.giay)}`).join("; ")})` : ""}; trien-khai ${phut(dh.tong())} (${dh.chang.map((c) => `${c.ten} ${phut(c.giay)}`).join("; ")}); TỔNG ${phut(tongGiay)}`);
  if (tongGiay > MUC_TIEU_GIAY) log(`${RED}${BOLD}CẢNH BÁO:${RESET} tổng ${phut(tongGiay)} vượt mục tiêu khoảng ${MUC_TIEU_GIAY / 60} phút (ADR-0179 Đ1.1) — báo người phụ trách kỹ thuật kèm các số đo trên (không chặn).`);
  log("═════════════════════════════════════════════════════════════════════");
  return audit.code === 0 && postCode === 0 ? 0 : 1;
}
