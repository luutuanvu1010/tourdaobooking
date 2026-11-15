// Hàng rào "không sửa tệp luật bằng dòng lệnh" (Hiến pháp N9; CLAUDE.md §3 "Không tự tay đổi luật chi phối chính mình").
// Luật `ask` ở .claude/settings.json chỉ hỏi chủ dự án khi AI sửa tệp luật bằng CÔNG CỤ SỬA TỆP (Edit/Write). Cùng tệp đó sửa bằng dòng lệnh
// (`sed -i`, `>`, `tee`, `cp`, `mv`, `rm`, `git checkout -- …`) thì không ai hỏi — đường vòng. Hàng rào này CHẶN đường vòng và trỏ AI về công cụ sửa tệp,
// để mọi thay đổi luật đi qua đúng MỘT cửa có người hỏi. Đọc, `git add`, `git commit`, chép RA ngoài, dọn worktree… không bị chặn.
//
// Hàm thuần (không I/O): danhGiaGhiLuat(command, { cwd, root }) → { deny: false } | { deny: true, rule, reason }.
//   root = thư mục checkout GỐC của kho (xem gocKho); cwd = thư mục hiện tại của phiên (trường `cwd` trong đầu vào của móc). Thiếu một trong hai ⇒ không phán.
//
// TRÌNH THÔNG DỊCH (từ 2026-11-15, vá chỗ hở: một phiên ghi docs/adr/README.md bằng `node -e '…writeFileSync…'` mà không bị chặn): mã chạy bằng
// node/python/perl/ruby/bun/deno/php — trong `-e`/`-c`/`-p`/`--eval`, trong heredoc nạp vào trình thông dịch, hoặc trong tệp script NGOÀI thư mục
// mã của kho (`/tmp/x.mjs`, `~/.claude/jobs/…/y.py`, tệp tạm ở gốc worktree; xem danhGiaScriptLuat) — có chuỗi trỏ vào tệp luật (kể cả ghép
// `path.join('docs','adr')`, `Path('.')/'docs'/'adr'`, đối số dòng lệnh) VÀ có dấu hiệu ghi (DAU_GHI: writeFile*, appendFile*, open(…,'w'|'a'|'x'|'r+'),
// rm/unlink/rename, shutil./os.remove…, File.write, file_put_contents, perl `open(F, ">…")`, gọi tiến trình con…) ⇒ CHẶN. Chỉ đọc thì cho qua.
// Cái giá đã biết (chặn THỪA, có chủ đích — hàng rào chỉ siết): mã vừa ĐỌC tệp luật vừa ghi một tệp KHÁC (`/tmp/out`) hoặc gọi tiến trình con
// (`execSync("git show main:CLAUDE.md")`) cũng bị chặn — tách thành hai lệnh, hoặc dùng `cat`/`git show` trực tiếp.
//
// GIỚI HẠN (nói thẳng): khớp mẫu chuỗi lệnh — chặn NHẦM/QUÊN, không chống người cố ý lách. KHÔNG thấy: đường dẫn nằm trong biến (`rm "$f"`), tệp đi qua
// `xargs`, đường dẫn ghép từ mảnh không phải chuỗi liền (`"play"+"book"`, biến môi trường) hay mã tự giải mã, script chạy gián tiếp (`bash x.sh`,
// `npm run`, `xargs node`), script TRONG thư mục mã của kho (`scripts/`, `src/`, `tests/`, `web/` — mã đã qua duyệt, không đọc), `awk -i inplace`, `cp -t <thư mục>`, `find . -name CLAUDE.md -delete` (thư mục xuất phát không
// phải tệp luật), `git apply`/`git am`/`git stash`/`git reset --hard`, `git checkout .` / `git restore .` (trả cả cây về bản đã commit), `cd` có điều
// kiện, lệnh dài quá 200 000 ký tự hoặc quá 2000 đoạn (phần đuôi không được xét). Chỉ canh tệp NẰM DƯỚI thư mục gốc kho (kể cả mọi worktree dưới
// .claude/worktrees/) — tệp ở /tmp, kho khác, hay một worktree đặt NGOÀI thư mục gốc kho thì không bị đụng.
import { basename, resolve } from "node:path";
import { candidates, interpreterHeredocs } from "./guard-remote-lib.mjs";

/** Tệp luật, tính theo đường dẫn tương đối từ gốc một cây làm việc (checkout gốc hoặc một worktree). Khớp danh sách `ask` ở .claude/settings.json. */
// `.github/workflows/` (ADR-0179 Đ2.6): quy trình kiểm đủ bộ trên GitHub — sửa nó đổi được việc kiểm, nên là tệp luật như các tệp trên.
const LUAT = [/(?:^|\/)CLAUDE\.md$/, /^\.claude\/?$/, /^\.claude\/(?:settings(?:\.local)?\.json$|hooks(?:\/|$)|agents(?:\/|$))/, /^playbook(?:\/|$)/, /^docs\/adr(?:\/|$)/, /^src\/shared\/bang-tham-chieu(?:-[a-z-]+)?\.ts$/, /^scripts\/(?:bang-tham-chieu-lib|quet-nut-lib)\.mjs$/, /^src\/bang-tham-chieu\.test\.ts$/, /^\.github\/workflows(?:\/|$)/];
/** Bản ghi kết luận kiểm của day-len (ADR-0179 Đ3.1) trong thư mục .git dùng chung: AI KHÔNG ghi bằng bất kỳ cách nào (công cụ sửa tệp cũng bị guard-tep chặn). */
const BAN_GHI_KIEM = /^\.git\/tourdao-kiem(?:\/|$)/;
// Lệnh không nhắc gì tới luật VÀ thư mục hiện tại không nằm trong/cạnh thư mục luật thì khỏi phân tích (nhanh; lệnh dị dạng không tốn giờ của móc).
const TU_KHOA = /CLAUDE\.md|\.claude|playbook|adr|bang-tham-chieu|quet-nut-lib|\.github|tourdao-kiem/;
const CWD_GAN_LUAT = /^(?:\.claude|playbook|docs|\.github|\.git)(?:\/|$)/;
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
  return LUAT.some((re) => re.test(rel)) || BAN_GHI_KIEM.test(rel) ? rel : null;
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
// perl/ruby: cờ `-M…`/`-m…`/`-I…` là nạp thư viện (vd `-MList::Util`), không phải sửa tại chỗ — không tính chữ `i` trong đó.
const coSuaTaiCho = (lenh, co) => (lenh === "sed" || lenh === "gsed" ? co.some((f) => /^-[a-zA-Z]*i/.test(f) || f.startsWith("--in-place")) : co.some((f) => !/^-[MmI]/.test(f) && /^-[a-zA-Z0-9]*i/.test(f)));

// ─── Trình thông dịch (15/11) ── mọi lượng từ đều có trần (móc có hạn 10 s; một regex quay lui mũ ở bước này làm móc quá giờ ⇒ mọi luật bị bỏ qua).
const TRINH = /^(?:python[\d.]*|node|nodejs|perl|ruby|bun|deno|php)$/;
const DAU_GHI = new RegExp(
  [
    String.raw`,\s{0,5}(?:mode\s{0,3}=\s{0,3})?["'](?:[wax]|r\+)[bt+]{0,2}["']`, // đối số chế độ mở tệp để ghi: open(p, 'w'|'a'|'x'|'r+'|'wb'), File.open, fopen — kể cả open(os.path.join(…), 'w')
    String.raw`\.open\s{0,5}\(\s{0,5}(?:mode\s{0,3}=\s{0,3})?["'](?:[wax]|r\+)[bt+]{0,2}["']`, // pathlib: Path(p).open('w') — chế độ đứng một mình (người kiểm độc lập 15/11)
    String.raw`write_text|write_bytes|writeFile|appendFile|createWriteStream|writeSync|copyFile|cpSync|rmSync|rmdirSync|unlinkSync|renameSync|truncateSync|symlinkSync|linkSync|file_put_contents|writeTextFile`,
    String.raw`\b(?:unlink|rename|rmdir|truncate|symlink)\b`, // fs.unlink(…), Path.rename(…), perl `unlink "x"`, php rename()
    String.raw`\b(?:rm|link|cp)\s{0,5}\(`, // fs.rm(…), fs.cp(…)
    String.raw`shutil\.|os\.(?:remove|replace|removedirs)|FileUtils\.|File\.(?:write|binwrite|delete)|IO\.write|Bun\.write|Deno\.(?:write|remove|copyFile|create)`,
    String.raw`(?<!std(?:out|err))\.write(?:lines)?\s{0,5}\(`, // f.write(…) — trừ process.stdout.write / sys.stdout.write (in ra màn hình)
    String.raw`child_process|execSync|execFileSync|spawnSync|\bexec\s{0,5}\(|\bspawn\s{0,5}\(|os\.system|os\.popen|subprocess\.|\bsystem\s{0,5}\(`, // tiến trình con: không biết nó làm gì ⇒ coi là ghi
  ].join("|"),
);
// Chuỗi trong mã (nháy kép / đơn / ngược). Nhánh thường loại trừ `\` nên không chồng lấn với nhánh thoát ⇒ tuyến tính; mỗi chuỗi tối đa 500 ký tự.
const CHUOI = /"((?:[^"\\\n]|\\.){0,500})"|'((?:[^'\\\n]|\\.){0,500})'|`((?:[^`\\]|\\.){0,500})`/g;
// Khoảng giữa hai chuỗi liền nhau là dấu ghép đường dẫn: `'docs','adr'` (path.join / os.path.join) hoặc `Path('.') / 'docs'`.
const NOI = /^\s{0,10}(?:,|\)?\s{0,10}\/)\s{0,10}$/;
// Thư mục mã của kho: script ở đây đã qua duyệt (vd scripts/gen-bang-tham-chieu.mjs SINH bảng tham chiếu) — không đọc nội dung.
const THU_MUC_MA = /^(?:scripts|src|tests|web|node_modules|\.claude\/hooks)\//;
const MAX_CHUOI = 5000;

/** Bỏ phần đầu là biến (`${root}/…`, `$HOME/…`): phần còn lại tính như đường dẫn tương đối — thà chặn thừa còn hơn sót. */
const boBien = (p) => (p.startsWith("$") && p.includes("/") ? p.slice(p.indexOf("/") + 1) : p);

/** Mã (của trình thông dịch) có GHI tệp luật không → đường dẫn tương đối tệp luật, hoặc null. `them`: các đường dẫn đi kèm (đối số dòng lệnh). */
function maLuat(code, cwd, root, them = []) {
  const s = String(code).slice(0, 200_000);
  let coGhi = DAU_GHI.test(s);
  const ds = [];
  let ghep = "";
  let het = -1;
  for (const m of s.matchAll(CHUOI)) {
    if (ds.length >= MAX_CHUOI) break;
    let lit = m[1] ?? m[2] ?? m[3] ?? "";
    const tienTo = /^\s{0,5}(?:\+?<|\+?>{1,2}|\|)\s{0,5}/.exec(lit); // perl/ruby: open(F, ">x"), open(my $f, ">", "x"), "+<x"
    if (tienTo) {
      if (/[>+]/.test(tienTo[0])) coGhi = true;
      lit = lit.slice(tienTo[0].length);
    }
    const khe = het === -1 ? null : s.slice(het, m.index);
    ghep = khe !== null && khe.length <= 40 && ghep && NOI.test(khe) ? `${ghep}/${lit}` : lit;
    het = m.index + m[0].length;
    ds.push(lit, ghep);
  }
  if (!coGhi) return null;
  for (const p of [...ds, ...them]) {
    const r = tepLuat(boBien(p), cwd, root);
    if (r) return r;
  }
  return null;
}

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
  if (TRINH.test(lenh)) {
    // Mã nằm trong các đối số (`-e '…'`, `-c "…"`); đối số trần không khoảng trắng (`… CLAUDE.md`) có thể là đường dẫn mã sẽ ghi (process.argv).
    const r = maLuat(a.join("\n"), nc.cwd, root, a.filter((x) => !x.startsWith("-") && !/\s/.test(x)));
    if (r) return r;
  }
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
      if (rel) return phanQuyet(rel);
    }
  }
  // Heredoc nạp vào trình thông dịch (`python3 - <<'EOF'`, `cat <<'EOF' | node`): thân heredoc là MÃ. `candidates` đã gỡ thân heredoc khỏi các
  // đoạn lệnh, nên đọc trên chuỗi lệnh gốc (interpreterHeredocs đi theo dòng, tuyến tính — xem guard-remote-lib.mjs).
  for (const than of interpreterHeredocs(text.slice(0, 200_000))) {
    const rel = maLuat(than, cwd, goc);
    if (rel) return phanQuyet(rel);
  }
  return { deny: false };
}

/** Tệp script chạy bằng trình thông dịch (`node /tmp/x.mjs`, `python3 ~/.claude/jobs/…/y.py`) có ghi tệp luật không. Hàm thuần: móc đọc tệp giúp
 * (`scripts` = [{ path, content }], path như gõ trong lệnh hoặc tuyệt đối). Script trong thư mục mã của kho (THU_MUC_MA) không đọc.
 * Đường dẫn tệp luật có thể nằm trong mã hoặc đi qua đối số dòng lệnh (`python3 /tmp/w.py CLAUDE.md` mà mã có dấu hiệu ghi). */
export function danhGiaScriptLuat(command, scripts, { cwd = null, root = null } = {}) {
  if (typeof cwd !== "string" || typeof root !== "string" || !cwd.startsWith("/") || !root.startsWith("/") || !Array.isArray(scripts)) return { deny: false };
  const goc = root.replace(/\/+$/, "");
  const doiSo = [];
  for (const { raw } of candidates(String(command ?? "").slice(0, 200_000))) {
    for (const { tu } of tachDoan(raw)) {
      let k = 0;
      while (k < tu.length && (/^\w+=/.test(tu[k]) || BOC.has(tu[k]))) k++;
      if (k < tu.length && TRINH.test(basename(tu[k]))) doiSo.push(...tu.slice(k + 1, k + 51).filter((x) => !x.startsWith("-"))); // chỉ đối số của chính lệnh trình thông dịch
    }
  }
  for (const sc of scripts) {
    if (typeof sc?.path !== "string" || typeof sc?.content !== "string") continue;
    const abs = resolve(cwd, sc.path);
    if (abs.startsWith(`${goc}/`) && THU_MUC_MA.test(abs.slice(goc.length + 1).replace(TIEN_TO_WORKTREE, ""))) continue;
    const rel = maLuat(sc.content.slice(0, 256_000), cwd, goc, doiSo.slice(0, 500));
    if (rel) return phanQuyet(rel);
  }
  return { deny: false };
}

function phanQuyet(rel) {
  if (BAN_GHI_KIEM.test(rel)) {
    return {
      deny: true,
      rule: "ghi-ban-ghi-kiem",
      reason: `Bị chặn: ghi/xoá \`${rel}\` — bản ghi kết luận kiểm chỉ do \`npm run day-len\` (chủ dự án gõ trong terminal) ghi; trien-khai tin bản ghi này (ADR-0179 Đ3.1). AI không ghi, không sửa, không xoá nó bằng bất kỳ cách nào. Hook không có công tắc tạm.`,
    };
  }
  return {
    deny: true,
    rule: "sua-luat-bang-lenh",
    reason: `Bị chặn: sửa/xoá/ghi đè tệp luật \`${rel}\` bằng dòng lệnh (kể cả mã chạy bằng node/python/perl… trong \`-e\`/\`-c\`, heredoc hay tệp script tạm). Tệp luật (CLAUDE.md, .claude/, playbook/, docs/adr/) chỉ được sửa bằng công cụ sửa tệp (Edit/Write) để chủ dự án được hỏi trước (luật \`ask\` ở .claude/settings.json; Hiến pháp N9). Hook không có công tắc tạm; \`playbook/\` và ADR đã duyệt thì không sửa.`,
  };
}
