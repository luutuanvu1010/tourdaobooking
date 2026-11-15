// "Cổng xanh" bản nhẹ — móc Stop của phiên chính (`cong-xanh.mjs`), kế hoạch docs/superpowers/plans/2026-11-15-buoc-2-3-may-kiem-va-hai-lan-duyet.md việc 2.2.
// Bản cũ (gỡ 2026-10-19) chạy cả bộ kiểm chính mỗi lần dừng — quá 12 phút. Bản này chỉ chạy phần LIÊN QUAN tới thay đổi:
//   • `stop_hook_active` đúng ⇒ cho dừng ngay (Claude Code đang dừng lại sau một lần chặn — không vòng lặp).
//   • Cây làm việc ở `cwd` không khác main ⇒ im lặng, không chạy gì.
//   • Khác ⇒ `npm run typecheck` + `node --test` các `*.test.ts` nằm NGAY trong thư mục có tệp đổi (tệp đổi = so với chỗ rẽ nhánh từ main, cộng phần
//     chưa lưu và tệp mới). Chạy hai lượt: lượt 1 = bài đổi + bài cùng tên của tệp nguồn đổi (`x.ts` → `x.test.ts`); đỏ thì chặn ngay. Lượt 2 = các bài
//     còn lại của các thư mục đó, trong thời gian còn lại của trần.
//   • Tổng có trần TRAN_MS (90 giây): quá trần mà chưa thấy đỏ ⇒ chỉ cảnh báo, cho dừng.
//   • Đỏ ⇒ chặn, kèm tối đa TOI_DA_BAI tên bài đỏ / dòng lỗi kiểu. Lỗi nội bộ ⇒ cho dừng (móc không bao giờ khoá phiên).
//   • Kết quả (xanh / đỏ / quá trần) nhớ theo dấu vân của mã (giữ từ bản cũ): mã không đổi thì không chạy lại.
// canhCong(input, { khoChung, tranMs }) → { chan: false, canhBao? } | { chan: true, lyDo }.
//
// GIỚI HẠN (nói thẳng): chỉ nhìn cây ở `cwd` của phiên chính; không chạy e2e, không chạy bài ở thư mục khác (bài phụ thuộc chéo có thể đỏ mà cổng không thấy
// — `npm test` đủ bộ trên GitHub vẫn là lớp chặn thật); thư mục nhiều bài (như `src/`, ~300 tệp) thường quá trần ở lượt 2 ⇒ chỉ cảnh báo; tệp nhớ nằm
// trong .git, AI ghi được: chặn QUÊN, không chống cố ý lách.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { khoChungCua } from "./guard-tep-lib.mjs";

export const TRAN_MS = 90_000;
export const TOI_DA_BAI = 10;
/** Bài đo giờ của hook: đỏ giả khi máy bận, `npm test` chạy nó một mình. Cổng không chạy. */
export const TEP_DO_GIO = "src/claude-guard-thoi-gian.test.ts";
const TEP_NHO = "claude-cong-xanh.json";
const LON = 64 * 1024 * 1024;

function git(dir, args) {
  const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: LON, timeout: 10_000 });
  return r.status === 0 ? r.stdout.replace(/\r?\n$/, "") : null;
}
const dong = (s) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

/** Mốc so: chỗ rẽ nhánh của HEAD với main (không có main thì origin/main). Không có ⇒ null (chỉ xét phần chưa lưu). */
function mocSo(top) {
  for (const ref of ["main", "origin/main"]) {
    if (git(top, ["rev-parse", "--verify", "-q", `${ref}^{commit}`]) === null) continue;
    const mb = git(top, ["merge-base", "HEAD", ref]);
    if (mb) return mb;
  }
  return null;
}

/** Tệp đổi so với main (đã lưu + chưa lưu) và tệp mới chưa theo dõi; đường dẫn tương đối dấu "/". null khi git lỗi. */
export function tepDoi(top) {
  const moc = mocSo(top) ?? (git(top, ["rev-parse", "--verify", "-q", "HEAD"]) ? "HEAD" : null);
  const daTheoDoi = moc ? git(top, ["diff", "--name-only", "--no-renames", moc]) : "";
  const moi = git(top, ["ls-files", "--others", "--exclude-standard"]);
  if (daTheoDoi === null || moi === null) return null;
  return [...new Set([...dong(daTheoDoi), ...dong(moi)])];
}

/** Dấu vân của nội dung đang có: cây HEAD + khác biệt chưa lưu + tên và nội dung tệp đổi. */
function dauVan(top, tep) {
  const h = createHash("sha256");
  h.update(git(top, ["rev-parse", "-q", "--verify", "HEAD^{tree}"]) ?? "chưa-có-commit");
  h.update("\0");
  h.update(git(top, ["diff", "HEAD", "--binary", "--no-ext-diff"]) ?? "");
  for (const t of [...tep].sort()) {
    h.update(`\0${t}\0`);
    try {
      if (statSync(join(top, t)).isFile()) h.update(readFileSync(join(top, t)));
    } catch {
      // tệp đã xoá: tên đã vào dấu vân là đủ
    }
  }
  return h.digest("hex");
}

const laTep = (top, rel) => {
  try {
    return statSync(join(top, rel)).isFile();
  } catch {
    return false;
  }
};

/** Bài liên quan: { truoc, sau }. truoc = bài đổi + `x.test.ts` cạnh tệp nguồn đổi `x.*`; sau = các *.test.ts còn lại NGAY trong thư mục có tệp đổi. */
export function baiLienQuan(top, tep) {
  const truoc = new Set();
  for (const t of tep) {
    const ung = t.endsWith(".test.ts") ? t : /\.[^./]+$/.test(t) ? t.replace(/\.[^./]+$/, ".test.ts") : null;
    if (ung && ung !== TEP_DO_GIO && laTep(top, ung)) truoc.add(ung);
  }
  const sau = new Set();
  for (const d of new Set(tep.map((t) => dirname(t)))) {
    if (!existsSync(join(top, d))) continue;
    for (const ten of readdirSync(join(top, d))) {
      if (!ten.endsWith(".test.ts")) continue;
      const rel = d === "." ? ten : `${d}/${ten}`;
      if (rel !== TEP_DO_GIO && !truoc.has(rel) && laTep(top, rel)) sau.add(rel);
    }
  }
  return { truoc: [...truoc].sort(), sau: [...sau].sort() };
}

const cat = (ds, ten) => (ds.length > TOI_DA_BAI ? [...ds.slice(0, TOI_DA_BAI), `… và ${ds.length - TOI_DA_BAI} ${ten} nữa`] : ds).map((d) => `  - ${d.slice(0, 300)}`);

/** Chạy typecheck + hai lượt bài trong trần `tranMs`. Trả { quaTran: true } | { xanh: true } | { xanh: false, tomTat }. */
function chayKiem(top, { truoc, sau }, tranMs) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // móc có thể chạy BÊN TRONG một lượt `node --test`: tiến trình con không được kế thừa chế độ "con"
  const batDau = Date.now();
  const chay = (lenh, thamSo) => {
    const conLai = tranMs - (Date.now() - batDau);
    if (conLai < 500) return { quaTran: true };
    const r = spawnSync(lenh, thamSo, { cwd: top, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: conLai, killSignal: "SIGKILL", maxBuffer: LON });
    if (r.error) {
      if (r.error.code === "ETIMEDOUT") return { quaTran: true };
      throw new Error(`${lenh} ${thamSo.slice(0, 2).join(" ")}: không chạy được (${r.error.code ?? r.error.message})`);
    }
    return { ma: r.status, ra: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
  };
  const phan = [];
  const kieu = chay("npm", ["run", "--silent", "typecheck"]);
  if (kieu.quaTran) return { quaTran: true };
  if (kieu.ma !== 0) phan.push(`Kiểm kiểu (npm run typecheck): ĐỎ — thoát ${kieu.ma}`, ...cat(dong(kieu.ra).filter((d) => /error TS\d+/.test(d)), "dòng lỗi kiểu"));
  const luot = (bai, nhan) => {
    if (!bai.length) return null;
    const kq = chay(process.execPath, ["--test", "--test-reporter=tap", ...bai]);
    if (kq.quaTran) return { quaTran: true };
    if (kq.ma === 0) return null;
    const ten = [...new Set(kq.ra.split("\n").map((d) => /^\s*not ok \d+ - (.*)$/.exec(d)?.[1]).filter((x) => x && !bai.includes(x)))];
    phan.push(`Bài kiểm ${nhan} (${bai.length} tệp${bai.length <= 5 ? `: ${bai.join(", ")}` : ""}): ĐỎ`, ...cat(ten.length ? ten : ["không đọc được tên bài đỏ — chạy lại tay để xem"], "bài đỏ"));
    return null;
  };
  const do_ = () => (phan.length ? { xanh: false, tomTat: phan.join("\n") } : null);
  if (luot(truoc, "của tệp đổi")?.quaTran) return do_() ?? { quaTran: true };
  if (do_()) return do_();
  if (luot(sau, "cùng thư mục")?.quaTran) return { quaTran: true };
  return do_() ?? { xanh: true };
}

const canhBaoQuaTran = (tranMs, top, soBai, nho) =>
  `Cổng xanh: quá trần ${Math.round(tranMs / 1000)} giây khi chạy typecheck + ${soBai} tệp bài ở ${top}${nho ? " (đo lần trước, mã chưa đổi)" : ""} — cho dừng, CHƯA biết xanh hay đỏ. Hãy tự chạy bài liên quan.`;

export function canhCong(input, { khoChung = null, tranMs = TRAN_MS } = {}) {
  try {
    if (input?.stop_hook_active === true) return { chan: false };
    const cwd = input?.cwd;
    if (typeof cwd !== "string" || cwd === "" || typeof khoChung !== "string" || khoChung === "") return { chan: false };
    if (khoChungCua(cwd) !== khoChung) return { chan: false }; // ngoài kho, hoặc kho khác
    const top = git(cwd, ["rev-parse", "--show-toplevel"]);
    const gitDir = git(cwd, ["rev-parse", "--path-format=absolute", "--git-dir"]);
    if (top === null || gitDir === null) return { chan: false };
    const tep = tepDoi(top);
    if (tep === null || tep.length === 0) return { chan: false };

    const van = dauVan(top, tep);
    const tepNho = join(gitDir, TEP_NHO);
    let kq = null;
    try {
      kq = JSON.parse(readFileSync(tepNho, "utf8"));
    } catch {
      kq = null;
    }
    const dungDuoc = kq?.dauVan === van && (typeof kq?.xanh === "boolean" || kq?.quaTran === true);
    if (dungDuoc && kq.quaTran === true) return { chan: false, canhBao: canhBaoQuaTran(kq.tranMs ?? tranMs, top, kq.soBai ?? 0, true) };
    if (!dungDuoc) {
      const bai = baiLienQuan(top, tep);
      const soBai = bai.truoc.length + bai.sau.length;
      const r = chayKiem(top, bai, tranMs);
      kq = r.quaTran
        ? { dauVan: van, quaTran: true, tranMs, soBai, luc: new Date().toISOString() }
        : { dauVan: van, xanh: r.xanh === true, tomTat: String(r.tomTat ?? ""), luc: new Date().toISOString() };
      try {
        writeFileSync(tepNho, `${JSON.stringify(kq, null, 2)}\n`);
      } catch {
        // không ghi được tệp nhớ: lần sau chạy lại, không sao
      }
      if (r.quaTran) return { chan: false, canhBao: canhBaoQuaTran(tranMs, top, soBai, false) };
    }
    if (kq.xanh) return { chan: false };
    return {
      chan: true,
      lyDo: [
        `Cổng xanh: CHƯA XANH ở ${top} (đo lúc ${kq.luc}).`,
        kq.tomTat,
        "Sửa cho xanh rồi mới kết thúc lượt (CLAUDE.md §4: không nói «xong» khi test/typecheck đỏ). Chưa thể xanh trong lượt này thì nói thẳng tên bài đỏ và lý do trong câu trả lời — lần dừng kế tiếp cổng sẽ cho qua.",
        "Cổng chỉ chạy: npm run typecheck + *.test.ts trong thư mục có tệp đổi (bài đổi trước; trần 90 giây). Không thay cho npm test đủ bộ.",
      ].join("\n"),
    };
  } catch (e) {
    return { chan: false, canhBao: `Cổng xanh: lỗi nội bộ, cho dừng — ${e instanceof Error ? e.message : String(e)}` };
  }
}
