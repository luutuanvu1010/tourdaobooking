// Đường ray cho mục "Git, triển khai, an toàn" của CLAUDE.md (Hiến pháp P16): chặn lệnh Bash mà AI KHÔNG được tự chạy khi chưa có lệnh rõ của chủ dự án —
// git push, merge vào main, wrangler deploy/secret/rollback, ghi D1 remote, chạy kịch bản/curl ghi lên production.
// Hàm thuần (không I/O) để test được: evaluateBash(command, { branch }) → { deny: false } | { deny: true, rule, reason }.
//
// GIỚI HẠN (nói thẳng, không coi là an toàn tuyệt đối): đây là khớp mẫu chuỗi lệnh, chặn NHẦM/QUÊN chứ không chống người cố ý
// lách (nháy quanh `push`, biến shell `$g push`, `| bash`, `node -e`, base64, script tự viết). Vì vậy nó chỉ là MỘT trong hai lớp:
// lớp kia là `permissions.deny` ở .claude/settings.json (cũng khớp chuỗi nên yếu cùng chỗ: P21 mới đạt một phần).
// Thân heredoc (dữ liệu, vd nội dung tài liệu/commit) được BỎ khỏi phần kiểm, trừ khi heredoc nạp vào một shell.

const GIT = "(?<![\\w-])git(?:\\s+(?:-C\\s+\\S+|-c\\s+\\S+|--(?:git-dir|work-tree|namespace|exec-path)\\s+\\S+|--[a-z][a-z-]*(?:=\\S+)?|-[a-zA-Z]))*";
const WRANGLER = "(?<![\\w-])wrangler(?:@\\S+|\\.m?js)?";

/** Quy tắc khớp trên lệnh đã bỏ nội dung trong dấu nháy (vd `git commit -m "… git push …"` không bị chặn). Việc tách lệnh
 * lồng trong `$(...)`/dấu huyền (xem `substitutions()`, `backticks()`) cũng chỉ tính phần NGOÀI nháy đơn — bên trong nháy
 * đơn, `$(...)`/dấu huyền không phải lệnh lồng vì shell không giải nghĩa chúng ở đó (khác nháy kép, nơi có giải nghĩa). */
const RULES = [
  { id: "git-push", re: new RegExp(`${GIT}\\s+push(?![\\w-])`), reason: "git push" },
  { id: "gh-pr-merge", re: /(?<![\w-])gh\s+pr\s+merge(?![\w-])/, reason: "gh pr merge" },
  {
    id: "wrangler-remote-write",
    re: new RegExp(`${WRANGLER}(?:\\s+\\S+){0,6}?\\s+(?:deploy|publish|rollback|delete|secret|versions\\s+(?:deploy|upload|secret)|triggers)(?![\\w-])`),
    reason: "wrangler deploy/secret/rollback/versions deploy|upload/triggers/delete",
  },
  { id: "wrangler-dev-remote", re: new RegExp(`${WRANGLER}(?:\\s+\\S+){0,3}?\\s+dev(?:\\s+\\S+)*?\\s+--remote(?![\\w-])`), reason: "wrangler dev --remote (chạy Worker trên D1 thật)" },
  {
    id: "d1-remote-write",
    re: new RegExp(`${WRANGLER}(?:\\s+\\S+){0,3}?\\s+d1\\s+(?:execute|migrations\\s+apply|time-travel\\s+restore|create|delete|export|import|insights)(?![\\w-])`),
    reason: "wrangler d1 ghi/đọc-dữ-liệu không kèm --local",
    unlessLocal: true, // chỉ miễn khi có --local NGAY TRONG đoạn lệnh đó (tách theo && || ; | xuống dòng)
  },
  { id: "npm-migrate-remote", re: /(?<![\w-])(?:npm|pnpm|yarn|bun)(?:\s+\S+){0,3}?\s+db:migrate:remote(?![\w-])/, reason: "npm run db:migrate:remote" },
  { id: "npm-dev-remote", re: /(?<![\w-])(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?dev\s+--\s+.*--remote(?![\w-])/, reason: "npm run dev -- --remote (D1 thật)" },
  { id: "import-staff-remote", re: /import-staff\.mjs[^\n;&|]*--db[ =]+remote/, reason: "import-staff.mjs --db remote (ghi tài khoản lên production)" },
  {
    // Hai lệnh CHỦ DỰ ÁN tự gõ (docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md): `npm run day-len` (git push) và
    // `npm run trien-khai` (áp migration remote + wrangler deploy). Chặn dạng npm/pnpm/yarn/bun, dạng `node … scripts/<tên>.mjs`, và dạng
    // chạy thẳng tệp ở ĐẦU một đoạn lệnh (`./scripts/day-len.mjs`). Đọc/sửa/commit tệp (cat, git add, grep…) KHÔNG bị chặn.
    // Lớp thứ hai: chính hai kịch bản tự từ chối khi không có TTY.
    id: "release-owner-only",
    re: new RegExp(
      [
        "(?<![\\w-])(?:npm|pnpm|yarn|bun)(?:\\s+\\S+){0,3}?\\s+run(?:-script)?(?:\\s+-\\S+)*\\s+(?:day-len|trien-khai)(?![\\w-])",
        "(?<![\\w-])(?:pnpm|yarn|bun)(?:\\s+-\\S+)*\\s+(?:day-len|trien-khai)(?![\\w-])",
        "(?<![\\w-])(?:node|nodejs|bun|deno)(?:\\s+\\S+){0,4}?\\s+\\S*scripts\\/(?:day-len|trien-khai)\\.mjs(?![\\w-])",
        "(?:^|[;&|(\\n])\\s*(?:\\w+=\\S*\\s+)*(?:exec\\s+)?\\S*scripts\\/(?:day-len|trien-khai)\\.mjs(?![\\w-])",
      ].join("|"),
    ),
    reason: "npm run day-len / npm run trien-khai (lệnh chủ dự án tự gõ: git push, áp migration remote, wrangler deploy)",
    // Đuôi riêng: hai lệnh này tự từ chối khi không có terminal thật (TTY), nên KHÔNG gợi ý `! <lệnh>` như DENY_TAIL chung.
    tail: " Theo CLAUDE.md (mục Git, triển khai, an toàn) AI không được chạy lệnh này. Chủ dự án tự gõ nó trong ứng dụng Terminal của macOS (terminal thật, có TTY), đứng ở thư mục gốc repo trên nhánh main — không chạy qua AI, kể cả dạng gõ `!` trong phiên Claude Code.",
  },
];

/** Ghi lên production bằng curl/wget/httpie: cần host trong lệnh GỐC (có thể nằm trong nháy) và cờ ghi. */
const HTTP_TOOL = /(?<![\w-])(?:curl|wget|http|https|xh)(?![\w-])/;
const METHOD = "(?:POST|PUT|PATCH|DELETE)";
const WRITE_ALWAYS = [
  `-[a-zA-Z]*X\\s*${METHOD}\\b`,
  `--request(?:\\s+|=)${METHOD}\\b`,
  "-F\\S*",
  "--form\\S*",
  "--json(?=\\s|=)",
  "-T(?=\\s)",
  "--upload-file",
  "--post-data",
  "--post-file",
  `--method(?:\\s+|=)${METHOD}`,
  `${METHOD}(?=\\s+\\S*:?\\/\\/|\\s+\\S*tourdao)`, // httpie/xh: `http POST https://…`
];
const WRITE_DATA = ["-[a-zA-Z]*d(?=\\s|\"|'|@)", "--data\\S*"]; // với -G/--get thì đây chỉ là tham số truy vấn, không phải ghi
const writeFlag = (parts) => new RegExp(`(?:^|\\s)(?:${parts.join("|")})`, "i");
const HTTP_WRITE = writeFlag([...WRITE_ALWAYS, ...WRITE_DATA]);
const HTTP_WRITE_GET = writeFlag(WRITE_ALWAYS);
const HTTP_GET_FLAG = /(?:^|\s)(?:-[a-zA-Z]*G|--get)(?=\s|$)/;
const PRODUCTION_HOST = /booking\.tourdao\.vn/i;
/** Chạy kịch bản/e2e trỏ vào production bằng biến môi trường (tests/e2e/lib.mjs, kịch bản pwa). */
const PROD_ENV = /(?:^|\s)(?:E2E_BASE_URL|BASE|BASE_URL)=\S*booking\.tourdao\.vn/i;

const GIT_MERGE = new RegExp(`${GIT}\\s+merge(?![\\w-])`);
/** Merge "gián tiếp" (cd/-C/--git-dir/checkout/switch đứng trước): nhánh đo ở thư mục hiện tại không còn đáng tin. */
const MERGE_INDIRECT = /(?:(?<![\w-])(?:cd|pushd)\s|\sgit\s+(?:-c\s+\S+\s+)*(?:checkout|switch)\b|(?:^|[;&|(]\s*)git\s+(?:checkout|switch)\b|\s-C\s|--git-dir|--work-tree)/;
const PROTECTED_BRANCHES = new Set(["main", "master"]);

const MAX_LENGTH = 200_000; // lệnh dài hơn chỉ được phân tích phần đầu (tránh quá giờ khi đầu vào dị dạng)
const MAX_SUBSTITUTIONS = 50;

const blank = (s) => s.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
const unquote = (q) => (q.startsWith('"') ? q.slice(1, -1).replace(/\\(["\\$`])/g, "$1") : q.slice(1, -1));

/** Bỏ thân heredoc (dữ liệu, không phải lệnh) — trừ khi heredoc nạp vào một shell (`bash <<EOF`, `source`, `eval`). */
function stripHeredocs(s) {
  return s.replace(/(^|\n)([^\n]*?)<<-?\s*(['"]?)([A-Za-z_]\w*)\3([^\n]*)\n([\s\S]*?)\n[ \t]*\4(?=\n|$|\))/g, (m, nl, before, _q, _tag, after) =>
    /(?<![\w-])(?:(?:ba|z|da|k|c)?sh|source|eval)(?![\w-])/.test(before) ? m : `${nl}${before}<<X${after}\nX`,
  );
}

/** Thay nội dung trong dấu nháy đơn THẬT (không nằm trong nháy kép bao ngoài) bằng khoảng trắng, giữ nguyên độ dài: trong
 * nháy đơn, shell KHÔNG bao giờ giải nghĩa `$(...)` hay dấu huyền, nên nội dung đó không phải lệnh lồng khi tách — phần bị
 * thay trắng sẽ không khớp RULES nào (đúng, vì nó chưa từng thật sự chạy). Phải đi từng ký tự theo trạng thái (đang trong
 * nháy kép hay không) vì một dấu nháy đơn NẰM TRONG nháy kép (vd `"a'b"`) chỉ là chữ, không phải mốc mở/đóng nháy đơn —
 * ghép cặp nháy đơn kiểu regex ngây thơ (không biết ngữ cảnh) sẽ vô tình xoá trắng luôn `$(...)` thật sự NẰM TRONG nháy
 * kép (chỗ shell CÓ giải nghĩa), gây lọt lệnh cấm. Trong nháy kép, `\"` là nháy kép chữ (không đóng chuỗi) nên phải nhảy
 * qua cặp ký tự thoát. NGOÀI nháy kép cũng phải nhảy qua `\<ký tự bất kỳ>` (đối xứng với nhánh trong nháy kép) — nếu
 * không, một dấu `\'` (nháy đơn có `\` đứng trước — cú pháp không hợp lệ trong bash thật, nhưng đầu vào tuỳ ý vẫn phải xử
 * lý an toàn) sẽ bị hiểu NHẦM là mốc mở/đóng nháy đơn thật, ghép cặp sai và xoá trắng nhầm `$(...)` THẬT SỰ nằm giữa hai
 * dấu `\'` đó (người kiểm độc lập tái hiện: `echo it\'s $(git push origin main) \'x` từng lọt sau bản vá đầu). Gặp nháy
 * đơn không đóng (cú pháp hỏng) thì GIỮ NGUYÊN phần còn lại, không thay trắng — thà quét dư (chặn hụt an toàn hơn) còn
 * hơn xoá oan một lệnh thật. */
function blankSingleQuoted(s) {
  let out = "";
  let i = 0;
  let inDouble = false;
  while (i < s.length) {
    const c = s[i];
    if (inDouble) {
      if (c === "\\" && i + 1 < s.length) {
        out += s.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === '"') inDouble = false;
      out += c;
      i++;
      continue;
    }
    if (c === "\\" && i + 1 < s.length) {
      out += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      out += c;
      i++;
      continue;
    }
    if (c === "'") {
      const end = s.indexOf("'", i + 1);
      if (end === -1) {
        out += s.slice(i); // nháy đơn không đóng: giữ nguyên, không thay trắng
        break;
      }
      out += `'${" ".repeat(end - i - 1)}'`;
      i = end + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function substitutions(s) {
  const scan = blankSingleQuoted(s);
  const out = [];
  for (let i = 0; i < scan.length - 1 && out.length < MAX_SUBSTITUTIONS; i++) {
    if (scan[i] !== "$" || scan[i + 1] !== "(") continue;
    let depth = 1;
    let j = i + 2;
    while (j < scan.length && depth > 0) {
      if (scan[j] === "(") depth++;
      else if (scan[j] === ")") depth--;
      j++;
    }
    out.push(scan.slice(i + 2, depth === 0 ? j - 1 : j));
  }
  return out;
}

const backticks = (s) => [...blankSingleQuoted(s).matchAll(/`([^`]*)`/g)].slice(0, MAX_SUBSTITUTIONS).map((m) => m[1]);

function shellStrings(s) {
  const out = [];
  const shC = /(?<![\w-])(?:ba|z|da|k|c)?sh\s+(?:(?:-[a-zA-Z]+|--[a-z-]+)\s+)*-[a-zA-Z]*c\s+("(?:[^"\\]|\\.)*"|'[^']*')/g;
  const ev = /(?<![\w-])eval\s+("(?:[^"\\]|\\.)*"|'[^']*')/g;
  for (const re of [shC, ev]) for (const m of s.matchAll(re)) out.push(unquote(m[1]));
  return out;
}

function normalise(raw) {
  return raw
    .replace(/\\\n\s*/g, " ") // nối dòng bằng dấu \
    .replace(/(--db(?:\s+|=))(["'])(\w+)\2/g, "$1$3") // --db 'remote'
    .replace(new RegExp(`(-[a-zA-Z]*X\\s*|--request(?:\\s+|=))(["'])(${METHOD})\\2`, "gi"), "$1$3"); // -X "POST"
}

/** Mọi chuỗi lệnh cần kiểm: lệnh gốc (đã bỏ nháy) + lệnh lồng trong $(...), `...`, bash -c "...", eval "...". */
function candidates(raw0, depth = 0, seen = new Set()) {
  if (depth > 3 || seen.has(raw0)) return [];
  seen.add(raw0);
  const raw = normalise(stripHeredocs(raw0));
  const inner = [...substitutions(raw), ...backticks(raw), ...shellStrings(raw)];
  return [{ raw, outer: blank(raw) }, ...inner.flatMap((i) => candidates(i, depth + 1, seen))];
}

const DENY_TAIL = " Theo CLAUDE.md (mục Git, triển khai, an toàn) cần lệnh rõ của chủ dự án cho đúng việc đó; hook không có công tắc tạm nên chủ tự chạy bằng `! <lệnh>` trong phiên này.";
const segments = (outer) => outer.split(/&&|\|\||;|\n|\|/);
const deny = (rule, reason, tail = DENY_TAIL) => ({ deny: true, rule, reason: `Bị chặn: ${reason}.${tail}` });

export function evaluateBash(command, { branch = null } = {}) {
  const text = String(command ?? "").slice(0, MAX_LENGTH);
  for (const { raw, outer } of candidates(text)) {
    for (const rule of RULES) {
      if (rule.unlessLocal) {
        for (const seg of segments(outer)) if (rule.re.test(seg) && !/--local(?![\w-])/.test(seg)) return deny(rule.id, rule.reason);
        continue;
      }
      if (rule.re.test(outer)) return deny(rule.id, rule.reason, rule.tail);
    }
    if (PROD_ENV.test(raw)) return deny("production-env", "biến môi trường trỏ kịch bản vào booking.tourdao.vn");
    if (HTTP_TOOL.test(outer) && PRODUCTION_HOST.test(raw)) {
      const keepMethod = raw.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, (q) => (new RegExp(`^["']?${METHOD}["']?$`, "i").test(q) ? q : '""'));
      if ((HTTP_GET_FLAG.test(outer) ? HTTP_WRITE_GET : HTTP_WRITE).test(keepMethod)) {
        return deny("production-http-write", "yêu cầu ghi (POST/PUT/PATCH/DELETE/dữ liệu) tới booking.tourdao.vn (GET chỉ-đọc thì được)");
      }
    }
    if (GIT_MERGE.test(outer) && (branch === null || PROTECTED_BRANCHES.has(branch) || MERGE_INDIRECT.test(outer))) {
      const where = branch === null ? "không xác định được nhánh hiện tại" : PROTECTED_BRANCHES.has(branch) ? `đang ở nhánh ${branch}` : "có đổi thư mục/nhánh trước khi merge";
      return deny("git-merge-main", `git merge khi ${where} (CLAUDE.md: không merge vào main)`);
    }
  }
  return { deny: false };
}

/** Lệnh có nhắc tới `git merge` không — để hook chỉ phải hỏi git về nhánh khi thật sự cần. */
export const mentionsGitMerge = (command) => candidates(String(command ?? "").slice(0, MAX_LENGTH)).some(({ outer }) => GIT_MERGE.test(outer));
