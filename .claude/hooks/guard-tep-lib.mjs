// Hàng rào "tệp cấm sửa" cho công cụ sửa tệp (Edit/Write/MultiEdit/NotebookEdit) — móc PreToolUse `guard-tep.mjs`. Ba luật của CLAUDE.md trước đây chỉ
// dựa vào kỷ luật:
//   1. migration-da-len-main — §7 "Migration: chỉ thêm tệp mới, không sửa tệp đã áp remote". Móc không hỏi được production (không mạng, không bí mật), nên
//      SIẾT thành: tệp `migrations/*.sql` đã có trên nhánh `main` (hoặc `origin/main`) thì coi như đã áp → cấm sửa. Migration mới của nhánh thì sửa thoải mái.
//   2. tep-bi-mat — §7 "bí mật chỉ qua wrangler secret put / .dev.vars (gitignored)", N10: công cụ sửa tệp không ghi `.dev.vars`, `.env`, `.env.*`
//      (tệp mẫu `*.example` thì được). Nội dung ghi qua công cụ nằm lại trong nhật ký phiên — bí mật không được đi đường đó.
//   3. checkout-goc — §8 "Sửa mã trong git worktree riêng, không sửa thẳng ở checkout gốc": tệp nằm trong checkout gốc (không phải một worktree) và không bị
//      gitignore thì cấm sửa.
// danhGiaSuaTep(filePath, { cwd, khoChung }) → { deny: false } | { deny: true, rule, reason }. `khoChung` = thư mục `.git` dùng chung của KHO NÀY
// (khoChungCua); tệp ngoài kho hoặc của kho khác ⇒ không phán. Có gọi `git` (chỉ đọc).
//
// GIỚI HẠN (nói thẳng): chỉ canh CÔNG CỤ SỬA TỆP. Cùng việc đó làm bằng dòng lệnh (`sed -i`, `cp`, `>`) KHÔNG bị móc này thấy — chặn nhầm/quên, không
// chống cố ý lách. MỘT lớp (chưa có lớp thứ hai độc lập, P21 chưa đạt). Gặp lỗi không đo được (git hỏng, không đọc được thư mục) ⇒ cho qua.
import { execFileSync } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

function git(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).replace(/\r?\n$/, "");
  } catch {
    return null;
  }
}
const gitDung = (dir, args) => git(dir, args) !== null;
const that = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
};

/** Thư mục có thật gần nhất đi ngược lên (tệp sắp tạo có thể nằm trong nhiều tầng thư mục chưa tồn tại). */
function thuMucCoThat(p) {
  let d = p;
  for (;;) {
    try {
      if (statSync(d).isDirectory()) return d;
    } catch {
      // chưa tồn tại — leo lên
    }
    const cha = dirname(d);
    if (cha === d) return null;
    d = cha;
  }
}

/** Thư mục `.git` DÙNG CHUNG của kho chứa `dir` (checkout gốc và mọi worktree của nó trả về cùng một giá trị). Không phải kho git ⇒ null. */
export function khoChungCua(dir) {
  const d = typeof dir === "string" && dir ? thuMucCoThat(resolve(dir)) : null;
  if (!d) return null;
  const c = git(d, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return c ? that(c) : null;
}

const BI_MAT = /^\.(?:dev\.vars|env)(?:\..+)?$/;
const TEP_MAU = /\.(?:example|sample|template|mau)$/;
const chan = (rule, reason) => ({ deny: true, rule, reason: `Bị chặn: ${reason}` });

export function danhGiaSuaTep(filePath, { cwd = null, khoChung = null } = {}) {
  if (typeof filePath !== "string" || filePath === "" || typeof khoChung !== "string" || khoChung === "") return { deny: false };
  const abs = resolve(typeof cwd === "string" && cwd ? cwd : "/", filePath);
  const dir = thuMucCoThat(dirname(abs));
  if (!dir || khoChungCua(dir) !== khoChung) return { deny: false }; // ngoài kho, hoặc kho khác
  if (git(dir, ["rev-parse", "--is-inside-work-tree"]) !== "true") return { deny: false }; // bên trong .git/
  const top = git(dir, ["rev-parse", "--show-toplevel"]);
  const prefix = git(dir, ["rev-parse", "--show-prefix"]);
  if (top === null || prefix === null) return { deny: false };
  const rel = prefix + relative(dir, abs); // đường dẫn tính từ gốc cây làm việc chứa tệp
  const ten = basename(abs);

  if (BI_MAT.test(ten) && !TEP_MAU.test(ten)) {
    return chan("tep-bi-mat", `\`${rel}\` là tệp bí mật — công cụ sửa tệp không được ghi nó (nội dung sẽ nằm lại trong nhật ký phiên; CLAUDE.md §7 Bảo mật, Hiến pháp N10). Worktree cần tệp này để chạy thử thì chép nguyên tệp từ checkout gốc bằng \`cp\` (không đọc, không in nội dung); thêm TÊN biến mới thì sửa tệp mẫu \`.dev.vars.example\`, không ghi giá trị thật.`);
  }
  if (/^migrations\/[^/]+\.sql$/.test(rel) && (gitDung(dir, ["cat-file", "-e", `main:${rel}`]) || gitDung(dir, ["cat-file", "-e", `origin/main:${rel}`]))) {
    return chan("migration-da-len-main", `migration \`${rel}\` đã có trên nhánh main — coi như đã áp, không sửa (CLAUDE.md §7: chỉ thêm tệp mới; đổi phá vỡ theo expand–contract). Viết một migration MỚI với số kế tiếp (xem bẫy "Số migration" ở CLAUDE.md §10).`);
  }
  const gitDir = git(dir, ["rev-parse", "--path-format=absolute", "--git-dir"]);
  if (gitDir !== null && that(gitDir) === khoChung && !gitDung(top, ["check-ignore", "-q", "--", rel])) {
    return chan("checkout-goc", `\`${rel}\` nằm ở checkout gốc. CLAUDE.md §8: sửa mã trong git worktree riêng (\`.claude/worktrees/<tên>\`), không sửa thẳng ở checkout gốc — vào worktree (EnterWorktree) rồi sửa bản của tệp ở đó.`);
  }
  return { deny: false };
}
