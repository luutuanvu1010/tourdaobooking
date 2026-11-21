// Chạy THẬT dòng lệnh quay về mà `npm run day-len` in cho chủ (scripts/release-lib.mjs, hàm lenhQuayVe) trong vỏ lệnh thật, trên một kho git TẠM: không
// remote, không đẩy gì, không đụng kho của dự án. src/release-lib.test.ts chỉ khoá HÌNH DẠNG dòng đó bằng bộ chạy lệnh giả; còn NGHĨA của nó (một chương trình
// shell có `git reset --hard`) chỉ quan sát được khi chạy thật.
// Sự cố 2026-11-21: dòng cũ là `git reset --hard <mã cũ>` trần. Hai lệnh nhập chạy chồng nhau thì `main` trên máy mang cả phần của lệnh kia; chạy dòng trần lúc
// đó xoá luôn phần ấy khỏi `main` trên máy. Dòng mới tự kiểm lúc CHẠY: đang đứng ở `main` và `main` còn đúng mã lệnh này để lại thì mới quay, không thì in DỪNG.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const lib = (await import(new URL("../scripts/release-lib.mjs", import.meta.url).href)) as { lenhQuayVe: (oldMain: string, sha: string) => string[] };

// Bỏ mọi biến GIT_* thừa hưởng (GIT_DIR / GIT_WORK_TREE trỏ sang kho khác thì `git reset --hard` dưới đây sẽ chạy nhầm kho), và chặn git dò ngược lên trên thư mục tạm.
const ENV = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))), GIT_CEILING_DIRECTORIES: tmpdir() };
const git = (cwd: string, ...a: string[]) =>
  execFileSync("git", ["-c", "user.name=thu", "-c", "user.email=thu@example.com", "-c", "commit.gpgsign=false", ...a], { cwd, env: ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Vỏ lệnh có trên máy đang chạy bài (máy của chủ: zsh; máy GitHub có thể không có zsh — vỏ nào vắng thì không chạy, không tính là bỏ qua bài). */
const VO = ["sh", "bash", "zsh"].filter((v) => spawnSync(v, ["-c", "exit 0"], { env: ENV }).status === 0);
/** zsh: `-f` = không nạp tệp cấu hình riêng của người dùng. */
const chay = (vo: string, dir: string, dong: string) => spawnSync(vo, [...(vo === "zsh" ? ["-f"] : []), "-c", dong], { cwd: dir, env: ENV, encoding: "utf8" });

/**
 * Kho tạm, `main` có ba lần lưu nối nhau: CU (`main` trước khi lệnh này gộp) → CUA_LENH_NAY (chỗ lệnh này để `main` lại) → CUA_LENH_KHAC (một lệnh nhập khác
 * nối thêm vào). Mỗi ca tự đặt `main` về trạng thái nó cần rồi chạy đúng dòng lib in ra.
 */
function khoTam() {
  const dir = mkdtempSync(join(tmpdir(), "td-quay-ve-"));
  git(dir, "init", "-q", "-b", "main");
  const luu = (ten: string) => {
    writeFileSync(join(dir, `${ten}.txt`), `${ten}\n`);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", ten);
    return git(dir, "rev-parse", "HEAD");
  };
  const cu = luu("cu");
  const cuaLenhNay = luu("cua-lenh-nay");
  const cuaLenhKhac = luu("cua-lenh-khac");
  // Chốt an toàn của chính bài này: mọi lệnh dưới đây chỉ được chạy trong kho TẠM vừa dựng.
  assert.equal(realpathSync(git(dir, "rev-parse", "--show-toplevel")), realpathSync(dir), "bài phải đang đứng trong kho tạm");
  const dong = lib.lenhQuayVe(cu, cuaLenhNay)[1]!;
  const datMain = (ma: string) => {
    git(dir, "checkout", "-q", "main");
    git(dir, "reset", "-q", "--hard", ma);
  };
  return { dir, cu, cuaLenhNay, cuaLenhKhac, dong, datMain, main: () => git(dir, "rev-parse", "main"), don: () => rmSync(dir, { recursive: true, force: true }) };
}

test("dòng quay về: máy có vỏ lệnh `sh` để chạy thật (các ca dưới chạy trên mọi vỏ có sẵn: sh, bash, zsh)", () => {
  assert.ok(VO.includes("sh"), `không tìm thấy \`sh\` — các ca chạy thật sẽ không quan sát được gì (vỏ có sẵn: ${VO.join(", ") || "không có"})`);
});

test("dòng quay về: `main` còn ở đúng chỗ lệnh này để lại → quay `main` về mã cũ, không in DỪNG", () => {
  for (const vo of VO) {
    const k = khoTam();
    try {
      k.datMain(k.cuaLenhNay);
      const r = chay(vo, k.dir, k.dong);
      assert.equal(r.status, 0, `${vo}: ${r.stderr}`);
      assert.equal(k.main(), k.cu, `${vo}: \`main\` phải về mã cũ`);
      assert.ok(!existsSync(join(k.dir, "cua-lenh-nay.txt")), `${vo}: thư mục cũng về mã cũ`);
      assert.doesNotMatch(r.stdout, /DỪNG/, vo);
    } finally {
      k.don();
    }
  }
});

test("dòng quay về (sự cố 21/11): `main` đã có thêm phần của lệnh nhập KHÁC → in DỪNG, `main` và thư mục giữ nguyên (không xoá phần của lệnh kia)", () => {
  for (const vo of VO) {
    const k = khoTam();
    try {
      k.datMain(k.cuaLenhKhac);
      const r = chay(vo, k.dir, k.dong);
      assert.match(r.stdout, /DỪNG: chưa quay về/, vo);
      assert.equal(k.main(), k.cuaLenhKhac, `${vo}: \`main\` không được đổi`);
      assert.ok(existsSync(join(k.dir, "cua-lenh-khac.txt")), `${vo}: phần của lệnh nhập khác còn nguyên trong thư mục`);
    } finally {
      k.don();
    }
  }
});

test("dòng quay về: đang đứng ở nhánh khác, hay không đứng ở nhánh nào (dù cùng mã) → in DỪNG, không nhánh nào bị đổi", () => {
  for (const vo of VO) {
    const k = khoTam();
    try {
      k.datMain(k.cuaLenhNay);
      git(k.dir, "checkout", "-q", "-b", "nhanh-khac");
      const r1 = chay(vo, k.dir, k.dong);
      assert.match(r1.stdout, /DỪNG: chưa quay về/, `${vo}: nhánh khác`);
      assert.equal(git(k.dir, "rev-parse", "nhanh-khac"), k.cuaLenhNay, `${vo}: nhánh đang đứng không bị quay về`);
      assert.equal(k.main(), k.cuaLenhNay, vo);
      git(k.dir, "checkout", "-q", "--detach", k.cuaLenhNay);
      const r2 = chay(vo, k.dir, k.dong);
      assert.match(r2.stdout, /DỪNG: chưa quay về/, `${vo}: không đứng ở nhánh nào`);
      assert.equal(git(k.dir, "rev-parse", "HEAD"), k.cuaLenhNay, vo);
      assert.equal(k.main(), k.cuaLenhNay, vo);
    } finally {
      k.don();
    }
  }
});

test("dòng quay về: chạy lần hai sau khi đã quay về (hay `main` đã ở chỗ khác hẳn) → in DỪNG, không đổi gì thêm", () => {
  for (const vo of VO) {
    const k = khoTam();
    try {
      k.datMain(k.cuaLenhNay);
      chay(vo, k.dir, k.dong);
      assert.equal(k.main(), k.cu, `${vo}: lần đầu đã quay về`);
      const r = chay(vo, k.dir, k.dong);
      assert.match(r.stdout, /DỪNG: chưa quay về/, vo);
      assert.equal(k.main(), k.cu, vo);
    } finally {
      k.don();
    }
  }
});
