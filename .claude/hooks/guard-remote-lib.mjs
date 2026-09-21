// Đường ray cho CLAUDE.md §6 (Hiến pháp P16): chặn lệnh Bash mà AI KHÔNG được tự chạy khi chưa có lệnh rõ của chủ dự án —
// git push, merge vào main, wrangler deploy/secret/rollback, ghi D1 remote, ghi lên production bằng curl.
// Hàm thuần (không I/O) để test được: evaluateBash(command, { branch }) → { deny: false } | { deny: true, rule, reason }.
//
// GIỚI HẠN (nói thẳng, không coi là an toàn tuyệt đối): đây là khớp mẫu chuỗi lệnh, chặn NHẦM/quên chứ không chống người cố ý
// lách (biến shell, base64, script tự viết). Vì vậy nó chỉ là MỘT trong hai lớp: lớp kia là `permissions.deny` trong
// .claude/settings.json (P21). Có thể chặn nhầm khi một lệnh chỉ NHẮC tới chuỗi cấm ngoài dấu ngoặc (vd heredoc) — chủ chạy bằng `!`.

const GIT = "(?<![\\w-])git(?:\\s+(?:-C\\s+\\S+|-c\\s+\\S+|--[a-z][a-z-]*(?:=\\S+)?|-[a-zA-Z]))*";

/** Quy tắc khớp trên lệnh đã bỏ nội dung trong dấu nháy (vd `git commit -m "… git push …"` không bị chặn). */
const RULES = [
  { id: "git-push", re: new RegExp(`${GIT}\\s+push(?![\\w-])`), reason: "git push" },
  { id: "gh-pr-merge", re: /(?<![\w-])gh\s+pr\s+merge(?![\w-])/, reason: "gh pr merge" },
  {
    id: "wrangler-remote-write",
    re: /(?<![\w-])wrangler(?:\s+\S+){0,4}?\s+(?:deploy|publish|rollback|delete|secret|versions|triggers)(?![\w-])/,
    reason: "wrangler deploy/secret/rollback/versions/triggers/delete",
  },
  {
    id: "d1-remote-write",
    re: /(?<![\w-])wrangler(?:\s+\S+){0,3}?\s+d1\s+(?:execute|migrations\s+apply|time-travel\s+restore|create|delete|export|import|insights)(?![\w-])/,
    reason: "wrangler d1 ghi/đọc-dữ-liệu không kèm --local",
    unlessLocal: true, // chỉ chặn khi KHÔNG có --local (`--remote` hoặc mặc định)
  },
  { id: "npm-migrate-remote", re: /(?<![\w-])(?:npm|pnpm|yarn)\s+(?:run\s+)?db:migrate:remote(?![\w-])/, reason: "npm run db:migrate:remote" },
  { id: "import-staff-remote", re: /import-staff\.mjs[^\n;&|]*--db[ =]+remote/, reason: "import-staff.mjs --db remote (ghi tài khoản lên production)" },
];

/** Ghi lên production bằng curl/wget: cần host trong lệnh GỐC (có thể nằm trong nháy) và cờ ghi trong lệnh đã bỏ nháy. */
const HTTP_TOOL = /(?<![\w-])(?:curl|wget|http|https|xh)(?![\w-])/;
const HTTP_WRITE_FLAG =
  /(?:^|\s)(?:-X\s*(?:POST|PUT|PATCH|DELETE)|--request(?:\s+|=)(?:POST|PUT|PATCH|DELETE)|-d(?=\s|"|'|@)|--data\S*|-F(?=\s)|--form\S*|--json(?=\s|=)|-T(?=\s)|--upload-file|--post-data|--post-file|--method(?:\s+|=)(?:POST|PUT|PATCH|DELETE))/i;
const PRODUCTION_HOST = /booking\.tourdao\.vn/i;

const GIT_MERGE = new RegExp(`${GIT}\\s+merge(?![\\w-])`);
const PROTECTED_BRANCHES = new Set(["main", "master"]);

const blank = (s) => s.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
const unquote = (q) => (q.startsWith('"') ? q.slice(1, -1).replace(/\\(["\\$`])/g, "$1") : q.slice(1, -1));

function substitutions(s) {
  const out = [];
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] !== "$" || s[i + 1] !== "(") continue;
    let depth = 1;
    let j = i + 2;
    while (j < s.length && depth > 0) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")") depth--;
      j++;
    }
    out.push(s.slice(i + 2, depth === 0 ? j - 1 : j));
  }
  return out;
}

const backticks = (s) => [...s.matchAll(/`([^`]*)`/g)].map((m) => m[1]);

function shellStrings(s) {
  const out = [];
  const shC = /(?<![\w-])(?:ba|z|da|k|c)?sh\s+(?:-[a-zA-Z]+\s+)*-[a-zA-Z]*c\s+("(?:[^"\\]|\\.)*"|'[^']*')/g;
  const ev = /(?<![\w-])eval\s+("(?:[^"\\]|\\.)*"|'[^']*')/g;
  for (const re of [shC, ev]) for (const m of s.matchAll(re)) out.push(unquote(m[1]));
  return out;
}

/** Mọi chuỗi lệnh cần kiểm: lệnh gốc (đã bỏ nháy) + lệnh lồng trong $(...), `...`, bash -c "...", eval "...". */
function candidates(raw, depth = 0, seen = new Set()) {
  if (depth > 3 || seen.has(raw)) return [];
  seen.add(raw);
  const inner = [...substitutions(raw), ...backticks(raw), ...shellStrings(raw)];
  return [{ raw, outer: blank(raw) }, ...inner.flatMap((i) => candidates(i, depth + 1, seen))];
}

const DENY_TAIL = " Theo CLAUDE.md §6 cần lệnh rõ của chủ dự án cho đúng việc đó; chủ tự chạy bằng `! <lệnh>` trong phiên này.";

export function evaluateBash(command, { branch = null } = {}) {
  const text = String(command ?? "");
  for (const { raw, outer } of candidates(text)) {
    for (const rule of RULES) {
      if (!rule.re.test(outer)) continue;
      if (rule.unlessLocal && /--local(?![\w-])/.test(outer)) continue;
      return { deny: true, rule: rule.id, reason: `Bị chặn: ${rule.reason}.${DENY_TAIL}` };
    }
    if (HTTP_TOOL.test(outer) && PRODUCTION_HOST.test(raw) && HTTP_WRITE_FLAG.test(outer)) {
      return { deny: true, rule: "production-http-write", reason: `Bị chặn: yêu cầu ghi (POST/PUT/PATCH/DELETE/dữ liệu) tới booking.tourdao.vn.${DENY_TAIL} GET chỉ-đọc thì được.` };
    }
    if (GIT_MERGE.test(outer) && (branch === null || PROTECTED_BRANCHES.has(branch))) {
      const where = branch === null ? "không xác định được nhánh hiện tại" : `đang ở nhánh ${branch}`;
      return { deny: true, rule: "git-merge-main", reason: `Bị chặn: git merge khi ${where} (CLAUDE.md §6: không merge vào main).${DENY_TAIL}` };
    }
  }
  return { deny: false };
}

/** Lệnh có nhắc tới `git merge` không — để hook chỉ phải hỏi git về nhánh khi thật sự cần. */
export const mentionsGitMerge = (command) => candidates(String(command ?? "")).some(({ outer }) => GIT_MERGE.test(outer));
