// Hàng rào "không sửa tệp luật bằng dòng lệnh" (Hiến pháp N9; CLAUDE.md §3 "Không tự tay đổi luật chi phối chính mình").
// Luật `ask` ở .claude/settings.json chỉ hỏi chủ dự án khi AI sửa tệp luật bằng CÔNG CỤ SỬA TỆP (Edit/Write). Cùng tệp đó sửa bằng dòng lệnh
// (`sed -i`, `>`, `tee`, `cp`, `mv`, `rm`, `git checkout -- …`) thì không ai hỏi — đường vòng. Hàng rào này CHẶN đường vòng và trỏ AI về công cụ sửa tệp,
// để mọi thay đổi luật đi qua đúng MỘT cửa có người hỏi. Đọc, `git add`, `git commit`, chép RA ngoài, dọn worktree… không bị chặn.
//
// Hàm thuần (không I/O): danhGiaGhiLuat(command, { cwd, root }) → { deny: false } | { deny: true, rule, reason }.
//   root = thư mục checkout GỐC của kho (xem gocKho); cwd = thư mục hiện tại của phiên (trường `cwd` trong đầu vào của móc). Thiếu một trong hai ⇒ không phán.
//
// GIỚI HẠN (nói thẳng): khớp mẫu chuỗi lệnh — chặn NHẦM/QUÊN, không chống người cố ý lách. KHÔNG thấy: đường dẫn nằm trong biến (`rm "$f"`), tệp đi qua
// `xargs`, chương trình tự viết (`node -e`, `python -c`), `git apply`/`git am`/`git stash pop`, `git checkout .` / `git restore .` (trả cả cây về bản đã
// commit), `cd` có điều kiện. Chỉ canh tệp NẰM TRONG kho này (kể cả mọi worktree dưới .claude/worktrees/) — tệp ở /tmp hay kho khác không bị đụng.
import { basename, resolve } from "node:path";
import { candidates } from "./guard-remote-lib.mjs";

/** Tệp luật, tính theo đường dẫn tương đối từ gốc một cây làm việc (checkout gốc hoặc một worktree). Khớp danh sách `ask` ở .claude/settings.json. */
const LUAT = [/(?:^|\/)CLAUDE\.md$/, /^\.claude\/?$/, /^\.claude\/(?:settings(?:\.local)?\.json$|hooks(?:\/|$)|agents(?:\/|$))/, /^playbook(?:\/|$)/, /^docs\/adr(?:\/|$)/];
// Lệnh không nhắc gì tới luật VÀ thư mục hiện tại không nằm trong/cạnh thư mục luật thì khỏi phân tích (nhanh; lệnh dị dạng không tốn giờ của móc).
const TU_KHOA = /CLAUDE\.md|\.claude|playbook|adr/;
const CWD_GAN_LUAT = /^(?:\.claude|playbook|docs)(?:\/|$)/;
const TIEN_TO_WORKTREE = /^\.claude\/worktrees\/[^/]+\//;
const MAX_DOAN = 2000;

/** Gốc kho (checkout gốc) suy từ thư mục chứa móc: `<gốc>/.claude/hooks` hoặc `<gốc>/.claude/worktrees/<tên>/.claude/hooks`. Không khớp ⇒ null. */
export function gocKho(thuMucMoc) {
  const m = /^(.*)\/\.claude\/hooks\/?$/.exec(String(thuMucMoc ?? ""));
  if (!m) return null;
  const w = /^(.*)\/\.claude\/worktrees\/[^/]+$/.exec(m[1]);
  return w ? w[1] : m[1];
}

/** Đường dẫn (như gõ trong lệnh) có trỏ vào tệp luật của kho không → trả đường dẫn tương đối, hoặc null. */
function tepLuat(p, cwd, root) {
  if (typeof p !== "string" || p === "") return null;
  const abs = resolve(cwd, p);
  if (!abs.startsWith(`${root}/`)) return null;
  const rel = abs.slice(root.length + 1).replace(TIEN_TO_WORKTREE, "");
  return LUAT.some((re) => re.test(rel)) ? rel : null;
}

/** Tách chuỗi lệnh thành các đoạn (ngăn bởi ; & | && || xuống dòng và ngoặc tròn). Mỗi đoạn: `tu` = các từ đã gỡ nháy, `ghi` = đích của `>`, `>>`, `&>`, `2>`.
 * Một lượt, tuyến tính theo độ dài. Nguồn của `<`/`<<` bị bỏ (đọc, không ghi). */
function tachDoan(s) {
  const doan = [];
  let tu = [];
  let ghi = [];
  let cur = "";
  let has = false;
  let ke = "tu"; // từ kế tiếp là: "tu" (từ thường) | "ghi" (đích chuyển hướng ghi) | "bo" (nguồn của `<`, bỏ)
  const dayTu = () => {
    if (has) {
      if (ke === "ghi") ghi.push(cur);
      else if (ke === "tu") tu.push(cur);
      ke = "tu";
    }
    cur = "";
    has = false;
  };
  const dayDoan = () => {
    dayTu();
    if (tu.length || ghi.length) doan.push({ tu, ghi });
    tu = [];
    ghi = [];
    ke = "tu";
  };
  let i = 0;
  while (i < s.length && doan.length < MAX_DOAN) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      cur += s[i + 1];
      has = true;
      i += 2;
    } else if (c === "'") {
      const e = s.indexOf("'", i + 1);
      const end = e === -1 ? s.length : e;
      cur += s.slice(i + 1, end);
      has = true;
      i = end + 1;
    } else if (c === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') {
        if (s[j] === "\\" && j + 1 < s.length) {
          cur += s[j + 1];
          j += 2;
        } else {
          cur += s[j];
          j++;
        }
      }
      has = true;
      i = j + 1;
    } else if (c === " " || c === "\t") {
      dayTu();
      i++;
    } else if (c === "&" && s[i + 1] === ">") {
      dayTu(); // `&>` / `&>>`: ghi cả hai luồng vào tệp
      i += s[i + 2] === ">" ? 3 : 2;
      ke = "ghi";
    } else if (c === "\n" || c === ";" || c === "|" || c === "&" || c === "(" || c === ")") {
      dayDoan();
      i++;
    } else if (c === ">") {
      if (has && /^\d+$/.test(cur)) {
        cur = ""; // số đứng liền trước (`2>`) thuộc toán tử, không phải một từ
        has = false;
      } else dayTu();
      i++;
      if (s[i] === ">" || s[i] === "|") i++;
      if (s[i] === "&") {
        i++;
        let j = i;
        while (j < s.length && (s[j] === "-" || (s[j] >= "0" && s[j] <= "9"))) j++;
        if (j > i && (j === s.length || /[\s;|&)]/.test(s[j]))) {
          i = j; // `>&2`, `2>&1`: nhân bản luồng, không ghi tệp
          continue;
        }
      }
      ke = "ghi";
    } else if (c === "<") {
      dayTu();
      while (s[i] === "<") i++;
      if (s[i] === "-") i++;
      ke = "bo";
    } else {
      cur += c;
      has = true;
      i++;
    }
  }
  dayDoan();
  return doan;
}

const BOC = new Set(["sudo", "command", "builtin", "exec", "env", "nohup", "time", "nice", "{", "then", "do", "else", "if", "while", "!"]);
const XOA_GHI = new Set(["tee", "rm", "unlink", "rmdir", "truncate", "shred", "patch"]);
const CHEP = new Set(["cp", "mv", "install", "ln", "rsync", "ditto"]);
const coSuaTaiCho = (lenh, co) => (lenh === "sed" || lenh === "gsed" ? co.some((f) => /^-[a-zA-Z]*i/.test(f) || f.startsWith("--in-place")) : co.some((f) => /^-[a-zA-Z0-9]*i/.test(f)));

/** Một đoạn lệnh có ghi/xoá/ghi đè tệp luật không → trả đường dẫn tệp luật bị đụng, hoặc null. `nc.cwd` đổi theo `cd` (để đoạn sau tính đúng). */
function dungTepLuat({ tu, ghi }, nc, root) {
  const luat = (p, cwd = nc.cwd) => tepLuat(p, cwd, root);
  for (const g of ghi) {
    const r = luat(g);
    if (r) return r;
  }
  let k = 0;
  while (k < tu.length && (/^\w+=/.test(tu[k]) || BOC.has(tu[k]))) k++;
  if (k >= tu.length) return null;
  const lenh = basename(tu[k]);
  const a = tu.slice(k + 1);
  const ts = a.filter((x) => !x.startsWith("-")); // tham số (không phải cờ)
  const co = a.filter((x) => x.startsWith("-"));
  const dau = (ds) => {
    for (const p of ds) {
      const r = luat(p);
      if (r) return r;
    }
    return null;
  };
  if (lenh === "cd" || lenh === "pushd") {
    if (ts.length) nc.cwd = resolve(nc.cwd, ts[0]);
    return null;
  }
  if (XOA_GHI.has(lenh)) return dau(ts);
  if (lenh === "sed" || lenh === "gsed" || lenh === "perl" || lenh === "ruby") return coSuaTaiCho(lenh, co) ? dau(ts) : null;
  if (CHEP.has(lenh)) {
    if (ts.length < 2) return null;
    const dich = ts[ts.length - 1];
    const nguon = ts.slice(0, -1);
    return (lenh === "mv" ? dau(nguon) : null) ?? luat(dich) ?? dau(nguon.map((n) => `${dich}/${basename(n)}`)); // chép VÀO thư mục: đích/tên-nguồn
  }
  if (lenh === "dd") return dau(a.filter((x) => x.startsWith("of=")).map((x) => x.slice(3)));
  if (lenh === "find") {
    const iExec = a.findIndex((x) => x === "-exec" || x === "-execdir" || x === "-ok");
    const sau = iExec === -1 ? [] : a.slice(iExec + 1);
    const lenhCon = sau.length ? basename(sau[0]) : "";
    const ghiCon = XOA_GHI.has(lenhCon) || lenhCon === "mv" || ((lenhCon === "sed" || lenhCon === "gsed" || lenhCon === "perl") && coSuaTaiCho(lenhCon, sau.slice(1).filter((x) => x.startsWith("-"))));
    if (!a.includes("-delete") && !ghiCon) return null;
    const iCo = a.findIndex((x) => x.startsWith("-") || x === "(" || x === "!");
    return dau(iCo === -1 ? a : a.slice(0, iCo)); // các thư mục xuất phát đứng trước biểu thức
  }
  if (lenh === "git") {
    let j = 0;
    let cwd = nc.cwd;
    while (j < a.length) {
      if (a[j] === "-C" && j + 1 < a.length) {
        cwd = resolve(cwd, a[j + 1]);
        j += 2;
      } else if (a[j] === "-c" || /^--(?:git-dir|work-tree|namespace|exec-path)$/.test(a[j])) j += 2;
      else if (a[j].startsWith("-")) j++;
      else break;
    }
    const con = a[j];
    const sau = a.slice(j + 1);
    const coCon = sau.filter((x) => x.startsWith("-"));
    if (con === "restore" && coCon.some((f) => f === "--staged" || /^-[a-zA-Z]*S/.test(f)) && !coCon.some((f) => f === "--worktree" || /^-[a-zA-Z]*W/.test(f))) return null; // chỉ gỡ khỏi vùng chờ commit
    if (con === "checkout" || con === "restore" || con === "rm" || con === "mv") {
      for (const p of sau.filter((x) => !x.startsWith("-"))) {
        const r = luat(p, cwd);
        if (r) return r;
      }
    }
  }
  return null;
}

export function danhGiaGhiLuat(command, { cwd = null, root = null } = {}) {
  if (typeof cwd !== "string" || typeof root !== "string" || !cwd.startsWith("/") || !root.startsWith("/")) return { deny: false };
  const text = String(command ?? "");
  const goc = root.replace(/\/+$/, "");
  const cwdRel = cwd.startsWith(`${goc}/`) ? cwd.slice(goc.length + 1).replace(TIEN_TO_WORKTREE, "") : "";
  if (!TU_KHOA.test(text) && !CWD_GAN_LUAT.test(cwdRel)) return { deny: false };
  for (const { raw } of candidates(text.slice(0, 200_000))) {
    const nc = { cwd };
    for (const doan of tachDoan(raw)) {
      const rel = dungTepLuat(doan, nc, goc);
      if (rel) {
        return {
          deny: true,
          rule: "sua-luat-bang-lenh",
          reason: `Bị chặn: sửa/xoá/ghi đè tệp luật \`${rel}\` bằng dòng lệnh. Tệp luật (CLAUDE.md, .claude/, playbook/, docs/adr/) chỉ được sửa bằng công cụ sửa tệp (Edit/Write) để chủ dự án được hỏi trước (luật \`ask\` ở .claude/settings.json; Hiến pháp N9). Hook không có công tắc tạm; \`playbook/\` và ADR đã duyệt thì không sửa.`,
        };
      }
    }
  }
  return { deny: false };
}
