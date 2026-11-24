#!/usr/bin/env node
// ADR-0216 — chuẩn bị xoá ảnh bằng chứng khỏi toàn bộ lịch sử kho.
// CHỈ làm phần không đụng kho đang dùng và không đụng GitHub: kiểm điều kiện,
// sao lưu nguyên kho, lọc trên một bản sao mới, đối chiếu, rồi IN lệnh cho chủ tự gõ.
//
//   node scripts/chuan-bi-0216.mjs --kiem                    chỉ kiểm điều kiện (không ghi gì)
//   node scripts/chuan-bi-0216.mjs [--thu-muc <đường>]       kiểm + sao lưu + lọc + đối chiếu + in lệnh
//   node scripts/chuan-bi-0216.mjs --thu --thu-muc <đường>   bản thử: sao lưu + lọc + đối chiếu dù chưa đủ
//                                                            điều kiện (đo dung lượng); KHÔNG in lệnh một chiều
//   node scripts/chuan-bi-0216.mjs --soat <thư mục> [--sau-day]
//        chốt chặn trong khối lệnh một chiều: kho trên máy (và main trên GitHub, nếu chưa đẩy)
//        phải còn y như lúc sao lưu; khác là thoát 1 để khối lệnh dừng.
//
// Chạy ở THƯ MỤC GỐC kho (checkout chính), không trong bản làm việc riêng.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GITHUB = "https://github.com/luutuanvu1010/tourdaobooking.git";
// Đúng phạm vi ADR-0216: ảnh dưới docs/evidence/ (lịch sử chỉ có .png/.jpg; thêm biến thể hoa cho chắc).
// --path-glob của filter-repo là fnmatch: `*` khớp qua cả dấu `/`, nên khớp mọi tầng thư mục con.
const MAU = ["png", "PNG", "jpg", "JPG", "jpeg", "JPEG"].map((d) => `docs/evidence/*.${d}`);
const LA_ANH = /^docs\/evidence\/.*\.(png|jpe?g)$/i;

const args = process.argv.slice(2);
const giaTri = (co) => (args.indexOf(co) >= 0 ? args[args.indexOf(co) + 1] : undefined);
const chiKiem = args.includes("--kiem");
const banThu = args.includes("--thu");
const soat = giaTri("--soat");
if (banThu && !giaTri("--thu-muc")) { console.error("--thu cần --thu-muc <thư mục tạm>"); process.exit(1); }
const ngay = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const thuMuc = resolve(soat ?? giaTri("--thu-muc") ?? join(homedir(), "Backup", `tourdao-truoc-0216-${ngay}`));
const saoLuu = join(thuMuc, "sao-luu.git");
const daLoc = join(thuMuc, "da-loc.git");

// core.quotepath=off: tên tệp tiếng Việt in nguyên chữ, không bị bọc nháy + mã bát phân (nếu không, ảnh tên Việt lọt bộ lọc).
const git = (cwd, ...a) => execFileSync("git", ["-c", "core.quotepath=off", ...a], { cwd, encoding: "utf8", maxBuffer: 1 << 30 }).trim();
const thu = (cwd, ...a) => spawnSync("git", ["-c", "core.quotepath=off", ...a], { cwd, encoding: "utf8", maxBuffer: 1 << 30 });
const dung = (msg) => { console.error(`\n✘ ${msg}`); process.exit(1); };
const refs = (d) => git(d, "for-each-ref", "--format=%(refname) %(objectname)", "refs/heads").split("\n").filter(Boolean);

const goc = git(process.cwd(), "rev-parse", "--show-toplevel");
if (resolve(goc, git(goc, "rev-parse", "--git-dir")) !== resolve(goc, git(goc, "rev-parse", "--git-common-dir")))
  dung("Hãy chạy ở thư mục gốc kho (checkout chính), không trong bản làm việc riêng.");

// ── Chốt chặn trong khối lệnh một chiều ────────────────────────────────────
if (soat) {
  if (!existsSync(saoLuu)) dung(`Không thấy bản sao lưu ${saoLuu}.`);
  const khac = [];
  if (git(goc, "worktree", "list", "--porcelain").split("\n").filter((l) => l.startsWith("worktree ")).length !== 1)
    khac.push("đã có bản làm việc riêng mới");
  if (refs(goc).join("\n") !== refs(saoLuu).join("\n")) khac.push("nhánh trên máy đã đổi từ lúc sao lưu (có lần lưu mới hoặc nhánh mới)");
  if (!args.includes("--sau-day")) {
    const mainGH = git(goc, "ls-remote", "origin", "refs/heads/main").split("\t")[0];
    if (mainGH !== git(saoLuu, "rev-parse", "main")) khac.push("main trên GitHub đã đổi từ lúc sao lưu");
  }
  if (khac.length) dung(`DỪNG, chưa làm gì thêm: ${khac.join("; ")}. Chạy lại chuẩn bị với thư mục mới.`);
  console.log("✔ Kho còn y như lúc sao lưu — tiếp.");
  process.exit(0);
}

// ── 1. Điều kiện (ADR-0216 bước 2) ─────────────────────────────────────────
const loi = [];
const ok = (dat, chu, cach = "") => { console.log(`${dat ? "  ĐẠT " : "  CHƯA"}  ${chu}${!dat && cach ? `\n         → ${cach}` : ""}`); if (!dat) loi.push(chu); };
console.log("Điều kiện trước khi viết lại lịch sử (ADR-0216):");

ok(thu(goc, "filter-repo", "--version").status === 0, "đã cài git-filter-repo", "chủ chạy: brew install git-filter-repo");

const banLamViec = git(goc, "worktree", "list", "--porcelain").split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.slice(9));
ok(banLamViec.length === 1, `chỉ còn checkout chính (đang có ${banLamViec.length - 1} bản làm việc riêng)`,
  `lưu trữ các phiên còn mở rồi gỡ từng bản: ${banLamViec.slice(1).map((d) => d.split("/").pop()).join(", ")}`);

const dangChay = spawnSync("pgrep", ["-f", "scripts/(day-len|trien-khai)\\.mjs"], { encoding: "utf8" }).stdout.trim();
ok(dangChay === "", "không có lệnh day-len / trien-khai đang chạy", `tiến trình: ${dangChay.split("\n").join(", ")}`);

ok(git(goc, "rev-parse", "--abbrev-ref", "HEAD") === "main", "checkout chính đang ở main", "git switch main");
const daSua = git(goc, "status", "--porcelain", "--untracked-files=no");
ok(daSua === "", "checkout chính không có phần sửa chưa lưu (tệp chưa theo dõi thì giữ nguyên, không bị đụng)", daSua.split("\n").slice(0, 5).join(" · "));
ok(git(goc, "stash", "list") === "", "không còn gì trong ngăn cất tạm (stash)", "xem: git stash list");

thu(goc, "fetch", "-q", "origin", "main");
ok(git(goc, "rev-parse", "main") === git(goc, "rev-parse", "origin/main"), "main trên máy trùng main trên GitHub", "chạy day-len cho xong việc đang chờ trước");

// Mọi nhánh trên GitHub (kể cả cho-kiem/*) chưa vào main phải có bản trên máy, nếu không sẽ mất khi xoá nhánh trên GitHub.
const nhanhGH = git(goc, "ls-remote", "--heads", "origin").split("\n").filter(Boolean).map((l) => l.split("\t"))
  .map(([sha, ref]) => ({ sha, ten: ref.replace("refs/heads/", "") }))
  .filter((n) => n.ten !== "main");
const thieu = [];
for (const n of nhanhGH) {
  if (thu(goc, "cat-file", "-e", `${n.sha}^{commit}`).status !== 0) thu(goc, "fetch", "-q", "origin", n.ten);
  const daGop = thu(goc, "merge-base", "--is-ancestor", n.sha, "origin/main").status === 0;
  const coTrenMay = thu(goc, "rev-parse", "-q", "--verify", `refs/heads/${n.ten}`).stdout.trim() === n.sha;
  if (!daGop && !coTrenMay) thieu.push(n);
}
ok(thieu.length === 0, `mọi nhánh trên GitHub chưa vào main đều có bản trên máy (${nhanhGH.length} nhánh ngoài main)`,
  thieu.map((n) => `git branch ${n.ten} ${n.sha.slice(0, 12)}`).join(" ; "));

if (chiKiem) { console.log(loi.length ? `\nCòn ${loi.length} điều kiện CHƯA đạt.` : "\nĐủ điều kiện."); process.exit(loi.length ? 1 : 0); }
if (loi.length && !banThu) dung(`Còn ${loi.length} điều kiện CHƯA đạt — chưa sao lưu, chưa lọc gì.`);
if (banThu) console.log("\n(BẢN THỬ: bỏ qua điều kiện; kết quả chỉ để đo, không dùng cho lần chạy thật.)");

// ── 2. Sao lưu nguyên kho (bước 1) ─────────────────────────────────────────
if (existsSync(saoLuu) || existsSync(daLoc)) dung(`Thư mục ${thuMuc} đã có bản cũ — chọn thư mục khác bằng --thu-muc.`);
mkdirSync(thuMuc, { recursive: true });
console.log(`\n▶ Sao lưu nguyên kho vào ${saoLuu}`);
git(thuMuc, "clone", "-q", "--mirror", "--no-local", goc, saoLuu);
git(saoLuu, "fsck", "--no-progress");
const refSaoLuu = refs(saoLuu);
if (!banThu && refs(goc).join("\n") !== refSaoLuu.join("\n")) dung("Bản sao lưu không khớp nhánh của kho — dừng.");
console.log(`  ✔ ${refSaoLuu.length} nhánh, kiểm toàn vẹn (fsck) đạt`);

// ── 3. Lọc trên một bản sao mới (bước 3) ───────────────────────────────────
// --bare (không --mirror): chỉ chép refs/heads. Bản --mirror còn mang refs/remotes/origin/* (≈90 nhánh
// cho-kiem) mà filter-repo sẽ đổi thành nhánh thật, rồi bước 6 tạo lại chúng trên máy.
console.log(`\n▶ Lọc ảnh trên bản sao mới ${daLoc}`);
git(thuMuc, "clone", "-q", "--bare", "--no-local", saoLuu, daLoc);
const loc = spawnSync("git", ["filter-repo", "--invert-paths", ...MAU.flatMap((m) => ["--path-glob", m])], { cwd: daLoc, stdio: "inherit" });
if (loc.status !== 0) dung("git filter-repo báo lỗi — kho đang dùng và GitHub chưa bị đụng.");
// filter-repo chỉ gỡ remote origin khi có refs/remotes để chuyển; bản --bare không có, nên gỡ tay (trỏ về bản sao lưu, vô dụng).
thu(daLoc, "remote", "remove", "origin");

// ── 4. Đối chiếu ───────────────────────────────────────────────────────────
console.log("\n▶ Đối chiếu");
const tatCaRef = git(daLoc, "for-each-ref", "--format=%(refname)").split("\n").filter(Boolean);
const refLa = tatCaRef.filter((r) => !r.startsWith("refs/heads/"));
if (refLa.length) dung(`Bản đã lọc có ref ngoài nhánh (${refLa.slice(0, 3).join(", ")}…) — dừng.`);
const anhCon = git(daLoc, "log", "--all", "--name-only", "--format=", "--", "docs/evidence").split("\n").filter((p) => LA_ANH.test(p));
if (anhCon.length) dung(`Bản đã lọc vẫn còn ${anhCon.length} ảnh — dừng.`);
const anhTruoc = new Set(git(saoLuu, "log", "--all", "--name-only", "--format=", "--", "docs/evidence").split("\n").filter((p) => LA_ANH.test(p))).size;
console.log(`  ✔ không còn ảnh docs/evidence trong mọi lần lưu (trước khi lọc: ${anhTruoc} tệp ảnh khác nhau)`);

const nhanhLoc = refs(daLoc).map((l) => l.split(" ")[0]);
const nhanhGocTen = refSaoLuu.map((l) => l.split(" ")[0]);
if (nhanhLoc.join("\n") !== nhanhGocTen.join("\n")) dung("Danh sách nhánh sau khi lọc khác trước khi lọc — dừng.");
const caySach = (d, ref) => git(d, "ls-tree", "-r", ref).split("\n").filter((l) => l && !LA_ANH.test(l.split("\t")[1])).join("\n");
let lech = 0;
for (const ref of nhanhGocTen) if (caySach(saoLuu, ref) !== caySach(daLoc, ref)) { lech++; console.log(`  ✘ lệch nội dung: ${ref}`); }
if (lech) dung(`${lech} nhánh có nội dung khác ngoài ảnh — dừng.`);
console.log(`  ✔ ${nhanhGocTen.length} nhánh giữ nguyên mọi tệp, chỉ bớt ảnh`);
if (git(daLoc, "rev-parse", "main^{tree}") !== git(saoLuu, "rev-parse", "main^{tree}")) dung("Nội dung main sau khi lọc khác main hiện tại — dừng.");
console.log("  ✔ nội dung main hiện tại giữ nguyên từng byte (chỉ mã lần lưu đổi)");

const co = (d) => execFileSync("du", ["-sh", d], { encoding: "utf8" }).split("\t")[0];
console.log(`  dung lượng lịch sử: trước ${co(saoLuu)} → sau ${co(daLoc)}`);

// ── 5. Lệnh cho chủ tự gõ (Bước 4 và 6 của tệp cách chạy) ──────────────────
if (banThu) { console.log("\nBản thử xong. Xoá thư mục thử khi không cần: " + thuMuc); process.exit(0); }
const mainCu = git(saoLuu, "rev-parse", "main");
console.log(`
══════════ ĐÃ CHUẨN BỊ XONG — CHƯA ĐỤNG GITHUB, CHƯA ĐỤNG KHO ĐANG DÙNG ══════════
Hai khối dưới là PHẦN MỘT CHIỀU. Chủ tự gõ trong ứng dụng Terminal (không dùng ! trong phiên AI),
theo docs/superpowers/plans/2026-11-16-adr-0216-cach-chay.md. Mỗi khối là MỘT dòng lệnh dài: dán nguyên khối.
Mỗi khối mở đầu bằng chốt chặn: kho đổi từ lúc sao lưu thì dừng ngay, chưa làm gì.
Đường lùi duy nhất: ${saoLuu}

KHỐI A — đẩy main đã lọc lên GitHub, xoá mọi nhánh khác trên GitHub:

cd "${goc}" && node scripts/chuan-bi-0216.mjs --soat "${thuMuc}" && cd "${daLoc}" && git remote add origin ${GITHUB} && git push --force-with-lease=main:${mainCu} origin main && git ls-remote --heads origin | awk '{print $2}' | grep -v '^refs/heads/main$' | xargs -n 20 git push origin --delete

KHỐI B — đưa kho đang dùng sang lịch sử mới, dọn lịch sử cũ:

cd "${goc}" && node scripts/chuan-bi-0216.mjs --soat "${thuMuc}" --sau-day && git fetch --update-head-ok --force "${daLoc}" '+refs/heads/*:refs/heads/*' && git reset --hard main && git fetch --prune origin && git reflog expire --expire=now --all && git gc --prune=now

KIỂM SAU CÙNG (dòng đầu phải ra 0):

git -c core.quotepath=off log --all --name-only --format= -- docs/evidence | grep -ciE '\\.(png|jpe?g)$' ; du -sh .git
`);
