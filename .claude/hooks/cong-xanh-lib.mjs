// "Cổng xanh" — móc Stop / SubagentStop (`cong-xanh.mjs`). CLAUDE.md §4: "Không nói 'xong' khi test/typecheck chưa chạy hoặc đỏ". Trước đây bộ kiểm chỉ
// chạy khi AI nhớ chạy (kho không có CI, không có git hook). Cổng làm việc đó thành việc của MÁY:
//   • Cây làm việc nơi phiên đang đứng (`cwd`) GIỐNG main và sạch ⇒ không chạy gì (phiên hỏi đáp không bị chậm).
//   • KHÁC main (có commit riêng, hoặc có thay đổi chưa commit) ⇒ chạy `npm run typecheck` + bộ kiểm chính (src/**/*.test.ts TRỪ bài đo giờ của hook —
//     bài đó đỏ giả khi máy bận, `npm test` chạy nó riêng). Xanh ⇒ cho dừng. Đỏ / không chạy được ⇒ GIỮ AI lại, kèm tên bài đỏ.
//   • Lối ra duy nhất khi chưa xanh: câu trả lời cuối ghi nguyên văn CAU_KHAI ("BỘ KIỂM CHƯA XANH") — đang chờ chủ trả lời, đỏ có chủ ý giữa chừng… thì
//     AI vẫn dừng được, nhưng chủ dự án LUÔN đọc thấy sự thật.
//   • Kết quả được nhớ theo "dấu vân" của mã (cây HEAD + thay đổi chưa commit + tệp mới): mã không đổi thì không chạy lại.
// canhCong(input, { khoChung, chay }) → { chan: false, ghiChu? } | { chan: true, lyDo }. `chay` tiêm được để bài kiểm không phải chạy bộ kiểm thật.
//
// GIỚI HẠN (nói thẳng): (1) chỉ nhìn cây làm việc ở `cwd` của phiên — phiên điều phối đứng ở checkout gốc còn trợ lý con sửa ở worktree khác thì cổng của
// phiên chính không thấy (trợ lý thi công có cổng riêng ở SubagentStop). (2) KHÔNG chạy e2e, bài đo giờ, bước sinh kho trợ lý của `npm test` — `npm test`
// đầy đủ vẫn là điều kiện của lệnh đẩy/triển khai. (3) Tệp dấu nằm trong thư mục .git, AI ghi được: chặn QUÊN, không chống cố ý lách. (4) Claude Code tự
// gỡ cổng sau 8 lần giữ liên tiếp. (5) Phiên mở ở thư mục cha của kho: lớp chuyển tiếp cấp máy không biết phiên thuộc kho nào ⇒ cổng không chạy.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, globSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { khoChungCua } from "./guard-tep-lib.mjs";

/** Bài đo giờ của hook: `npm test` chạy nó MỘT MÌNH (scripts/chay-test.mjs — cùng hằng; bài kiểm canh hai nơi khớp nhau). Cổng không chạy nó. */
export const TEP_DO_GIO = "src/claude-guard-thoi-gian.test.ts";
export const CAU_KHAI = "BỘ KIỂM CHƯA XANH";
const TEP_DAU = "claude-cong-xanh.json";
const TEP_LOG = "claude-cong-xanh.log";
const HAN_KIEM_KIEU_MS = 5 * 60_000;
const HAN_BO_KIEM_MS = 12 * 60_000;
const TOI_DA_DONG = 15;
const LON = 512 * 1024 * 1024;

function git(dir, args) {
  const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: LON, timeout: 60_000 });
  return r.status === 0 ? r.stdout.replace(/\r?\n$/, "") : null;
}

/** Cây làm việc `top` có khác main không, và dấu vân của toàn bộ nội dung đang có (đổi một ký tự ở bất kỳ tệp không-bị-ignore nào ⇒ dấu vân khác). */
export function trangThaiCay(top) {
  const head = git(top, ["rev-parse", "--verify", "-q", "HEAD"]);
  const trangThai = git(top, ["status", "--porcelain", "--untracked-files=all"]) ?? "";
  // "Đi trước main" = HEAD có commit mà CẢ `main` lẫn `origin/main` đều chưa có. Worktree mới tạo từ origin/main (main cục bộ còn chậm) không tính là khác.
  const moc = head === null ? [] : ["main", "origin/main"].filter((ref) => git(top, ["rev-parse", "--verify", "-q", `${ref}^{commit}`]) !== null);
  const diTruoc = moc.length > 0 && !moc.some((ref) => git(top, ["merge-base", "--is-ancestor", "HEAD", ref]) !== null);
  const h = createHash("sha256");
  h.update(git(top, ["rev-parse", "-q", "--verify", "HEAD^{tree}"]) ?? "chưa-có-commit");
  h.update("\0");
  h.update(head === null ? "" : (git(top, ["diff", "HEAD", "--binary", "--no-ext-diff"]) ?? ""));
  for (const ten of (git(top, ["ls-files", "--others", "--exclude-standard", "-z"]) ?? "").split("\0").filter(Boolean).sort()) {
    h.update(`\0${ten}\0`);
    try {
      if (statSync(join(top, ten)).isFile()) h.update(readFileSync(join(top, ten)));
    } catch {
      // tệp vừa biến mất / không đọc được: tên tệp đã vào dấu vân là đủ
    }
  }
  return { khac: trangThai !== "" || diTruoc, dauVan: h.digest("hex") };
}

/** Chạy kiểm kiểu + bộ kiểm chính ở `top`, ghi toàn bộ đầu ra vào `tepLog`. Trả { xanh, tomTat } — tomTat liệt kê bước đỏ và tên bài / dòng lỗi kiểu. */
export function chayBoKiem(top, tepLog) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // cổng có thể đang chạy BÊN TRONG một lượt `node --test`: bộ kiểm con không được kế thừa chế độ "tiến trình con"
  const fd = openSync(tepLog, "w");
  const chay = (lenh, thamSo, han) => {
    const r = spawnSync(lenh, thamSo, { cwd: top, env, stdio: ["ignore", fd, fd], timeout: han });
    return r.error ? (r.error.code === "ETIMEDOUT" ? "quá giờ" : `không chạy được (${r.error.code ?? r.error.message})`) : r.status === 0 ? null : `thoát ${r.status ?? r.signal}`;
  };
  let loiKieu;
  let loiBai = null;
  let soTep = 0;
  try {
    loiKieu = chay("npm", ["run", "--silent", "typecheck"], HAN_KIEM_KIEU_MS);
    const tep = globSync("src/**/*.test.ts", { cwd: top }).map((f) => f.split("\\").join("/")).filter((f) => f !== TEP_DO_GIO).sort();
    soTep = tep.length;
    if (soTep) loiBai = chay(process.execPath, ["--test", "--test-reporter=tap", ...tep], HAN_BO_KIEM_MS);
  } finally {
    closeSync(fd);
  }
  if (loiKieu === null && loiBai === null) return { xanh: true, tomTat: "" };
  const dong = readFileSync(tepLog, "utf8").split("\n");
  const cat = (ds) => (ds.length > TOI_DA_DONG ? [...ds.slice(0, TOI_DA_DONG), `… và ${ds.length - TOI_DA_DONG} dòng nữa`] : ds).map((d) => `  - ${d.slice(0, 300)}`);
  const phan = [];
  if (loiKieu !== null) phan.push(`Kiểm kiểu (npm run typecheck): ĐỎ — ${loiKieu}`, ...cat(dong.filter((d) => /error TS\d+/.test(d))));
  if (loiBai !== null) phan.push(`Bộ kiểm chính (${soTep} tệp): ĐỎ — ${loiBai}`, ...cat(dong.filter((d) => /^not ok \d+ - /.test(d)).map((d) => d.replace(/^not ok \d+ - /, ""))));
  return { xanh: false, tomTat: phan.join("\n") };
}

const chuan = (s) => s.normalize("NFC").toUpperCase().replace(/\s+/g, " ");

export function canhCong(input, { khoChung = null, chay = chayBoKiem } = {}) {
  const cwd = input?.cwd;
  if (typeof cwd !== "string" || cwd === "" || typeof khoChung !== "string" || khoChung === "") return { chan: false };
  if (khoChungCua(cwd) !== khoChung) return { chan: false }; // ngoài kho, hoặc kho khác
  if (git(cwd, ["rev-parse", "--is-inside-work-tree"]) !== "true") return { chan: false };
  const top = git(cwd, ["rev-parse", "--show-toplevel"]);
  const gitDir = git(cwd, ["rev-parse", "--path-format=absolute", "--git-dir"]);
  if (top === null || gitDir === null) return { chan: false };
  const tt = trangThaiCay(top);
  if (!tt.khac) return { chan: false };

  const tepDau = join(gitDir, TEP_DAU);
  const tepLog = join(gitDir, TEP_LOG);
  let kq = null;
  try {
    kq = JSON.parse(readFileSync(tepDau, "utf8"));
  } catch {
    kq = null;
  }
  if (kq?.dauVan !== tt.dauVan || typeof kq?.xanh !== "boolean") {
    const r = chay(top, tepLog);
    kq = { dauVan: tt.dauVan, xanh: r.xanh === true, tomTat: String(r.tomTat ?? ""), luc: new Date().toISOString() };
    writeFileSync(tepDau, `${JSON.stringify(kq, null, 2)}\n`);
  }
  if (kq.xanh) return { chan: false };

  const cau = typeof input.last_assistant_message === "string" ? input.last_assistant_message : null;
  if (cau !== null && chuan(cau).includes(CAU_KHAI)) return { chan: false };
  if (cau === null && input.stop_hook_active === true) return { chan: false, ghiChu: `cổng xanh: bộ kiểm chưa xanh ở ${top} nhưng không đọc được câu trả lời cuối — cho qua có khai.` };
  return {
    chan: true,
    lyDo: [
      `Cổng xanh: bộ kiểm CHƯA XANH ở ${top} (đo lúc ${kq.luc}).`,
      kq.tomTat,
      `Nhật ký đầy đủ: ${tepLog}`,
      `Sửa cho xanh rồi mới kết thúc lượt (CLAUDE.md §4: không nói "xong" khi test/typecheck chưa chạy hoặc đỏ). Nếu chưa thể xanh trong lượt này (đang chờ chủ dự án trả lời, đỏ có chủ ý giữa chừng, lỗi có sẵn từ trước…) thì câu trả lời cuối PHẢI có nguyên văn dòng "${CAU_KHAI}" kèm tên bài đỏ và lý do — khi đó cổng cho dừng.`,
      "Cổng chạy: npm run typecheck + bộ kiểm chính (src/**/*.test.ts trừ bài đo giờ của hook). Không chạy e2e; mã không đổi thì không chạy lại.",
    ].join("\n"),
  };
}
