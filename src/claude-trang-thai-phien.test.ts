// Bộ kiểm cho "trang trạng thái do máy sinh" — móc SessionStart (.claude/hooks/trang-thai-phien-lib.mjs + trang-thai-phien.mjs), kế hoạch 2026-11-15
// việc 2.3. Mỗi ca dựng kho git GIẢ ở thư mục tạm (main, origin/main giả bằng update-ref, một bản làm việc riêng có phần chưa lưu, sổ hạn giả) và tiêm
// hàm lấy mạng GIẢ — không bài nào gọi mạng thật, không bài nào chạy `git fetch`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { taoTrangThai, gioVN, TRAN_MANG_MS } from "../.claude/hooks/trang-thai-phien-lib.mjs";

const git = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.name=thu", "-c", "user.email=thu@example.com", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function ghi(tep: string, noiDung: string) {
  mkdirSync(dirname(tep), { recursive: true });
  writeFileSync(tep, noiDung);
}
const NOW = new Date("2026-11-15T03:00:00Z"); // 10:00 giờ VN ngày 15/11/2026

function khoGia() {
  const dir = mkdtempSync(join(tmpdir(), "td-trang-thai-"));
  git(dir, "init", "-q", "-b", "main");
  ghi(join(dir, ".gitignore"), ".claude/worktrees/\n");
  ghi(join(dir, "docs/quyen-hoan.json"), JSON.stringify({
    _mo_ta: "sổ giả",
    thao_tac: [
      { ma: "o.sap-han", han: "2026-11-20", nguoi_chiu_trach_nhiem: "chủ dự án" },
      { ma: "o.con-xa", han: "2026-12-31" },
      { ma: "o.qua-han", han: "2026-11-10" },
      { ma: "o.dung-ngay-14", han: "2026-11-29" },
    ],
    cua_ghi: [{ method: "POST", path: "/api/x", han: "2026-11-16" }, { method: "GET", path: "/api/khong-han" }],
  }));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "một");
  const c1 = git(dir, "rev-parse", "HEAD");
  git(dir, "update-ref", "refs/remotes/origin/main", c1);
  for (const ten of ["sach", "ban"]) git(dir, "worktree", "add", "-q", "-b", `nhanh-${ten}`, join(dir, ".claude/worktrees", ten));
  ghi(join(dir, ".claude/worktrees/ban/moi.txt"), "chưa lưu\n");
  return { dir, c1, don: () => rmSync(dir, { recursive: true, force: true }) };
}
const mangTot = async () => ({ version: "9.9", maintenance: { on: false } });

test("trang trạng thái: mở đầu đúng câu, có giờ VN, dưới 10.000 ký tự, tiếng Việt có dấu", async () => {
  const k = khoGia();
  try {
    const t = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.ok(t.startsWith("Trang trạng thái do máy sinh lúc 10:00 15/11/2026"), t.slice(0, 80));
    assert.ok(t.length < 10_000);
    assert.equal(gioVN(NOW), "10:00 15/11/2026");
    assert.equal(TRAN_MANG_MS, 3000);
  } finally {
    k.don();
  }
});

test("trang trạng thái: phiên bản bản chạy thật + bảo trì bật/tắt từ GET công khai (tiêm giả); lỗi mạng ⇒ «không lấy được», không ném", async () => {
  const k = khoGia();
  try {
    let hoiUrl = "";
    let hoiTran = 0;
    const t1 = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: async (url: string, tran: number) => ((hoiUrl = url), (hoiTran = tran), { version: "3.6", maintenance: { on: true, endsAt: "2026-11-16T06:34:00.000Z" } }) });
    assert.equal(hoiUrl, "https://booking.tourdao.vn/api/auth/config");
    assert.equal(hoiTran, 3000);
    assert.match(t1, /phiên bản 3\.6/);
    assert.match(t1, /bảo trì: BẬT \(dự kiến tới 13:34 16\/11\/2026\)/);
    const t2 = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.match(t2, /phiên bản 9\.9/);
    assert.match(t2, /bảo trì: tắt/);
    const t3 = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: async () => { throw new Error("hết giờ"); } });
    assert.match(t3, /Bản chạy thật: không lấy được/);
    assert.match(t3, /Bản chính:/, "lỗi mạng không làm mất các mục khác");
  } finally {
    k.don();
  }
});

test("trang trạng thái: main và origin/main — mã ngắn, khớp / không khớp; không fetch", async () => {
  const k = khoGia();
  try {
    const t1 = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.match(t1, new RegExp(`main ${k.c1.slice(0, 8)}, origin/main ${k.c1.slice(0, 8)} — khớp`));
    ghi(join(k.dir, "b.txt"), "b\n");
    git(k.dir, "add", "b.txt");
    git(k.dir, "commit", "-q", "-m", "hai");
    const t2 = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.match(t2, /KHÔNG khớp \(main đi trước 1, đi sau 0\)/);
  } finally {
    k.don();
  }
});

test("trang trạng thái: đếm bản làm việc riêng (kể cả bản gốc) và nêu tên bản còn phần chưa lưu", async () => {
  const k = khoGia();
  try {
    const t = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.match(t, /Bản làm việc riêng: 3 \(kể cả thư mục gốc\)/);
    assert.match(t, /còn phần chưa lưu \(1\): ban\b/);
    assert.doesNotMatch(t, /chưa lưu[^\n]*\bsach\b/);
  } finally {
    k.don();
  }
});

test("trang trạng thái: sổ hạn — chỉ mục có hạn trong 14 ngày tới (kể cả đúng ngày thứ 14) và mục đã quá hạn", async () => {
  const k = khoGia();
  try {
    const t = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.match(t, /o\.sap-han — hạn 2026-11-20/);
    assert.match(t, /POST \/api\/x — hạn 2026-11-16/);
    assert.match(t, /o\.dung-ngay-14 — hạn 2026-11-29/);
    assert.match(t, /o\.qua-han — hạn 2026-11-10 \(QUÁ HẠN\)/);
    assert.doesNotMatch(t, /o\.con-xa/);
    assert.doesNotMatch(t, /khong-han/);
  } finally {
    k.don();
  }
});

test("trang trạng thái: thư mục không phải kho git, sổ hạn hỏng — bỏ bước lỗi, vẫn trả văn bản", async () => {
  const dir = mkdtempSync(join(tmpdir(), "td-trang-thai-rong-"));
  try {
    ghi(join(dir, "docs/quyen-hoan.json"), "{ hỏng");
    const t = await taoTrangThai({ root: dir, now: NOW, layCauHinh: mangTot });
    assert.ok(t.startsWith("Trang trạng thái do máy sinh lúc"));
    assert.match(t, /Bản chính: không đọc được/);
    assert.match(t, /Sổ hạn \(docs\/quyen-hoan\.json\): không đọc được/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trang trạng thái: rất nhiều bản chưa lưu ⇒ cắt danh sách, tổng vẫn dưới 10.000 ký tự", async () => {
  const k = khoGia();
  try {
    for (let i = 0; i < 60; i++) {
      const wt = join(k.dir, ".claude/worktrees", `ban-lam-viec-rieng-co-ten-rat-dai-so-${i}`);
      git(k.dir, "worktree", "add", "-q", "-b", `n-${i}`, wt);
      ghi(join(wt, "x.txt"), "x\n");
    }
    const t = await taoTrangThai({ root: k.dir, now: NOW, layCauHinh: mangTot });
    assert.ok(t.length < 10_000, String(t.length));
    assert.match(t, /còn phần chưa lưu \(61\)/);
  } finally {
    k.don();
  }
});

test("settings.json: khai móc Stop (cổng xanh, trần 120 giây) và SessionStart (trang trạng thái, trần 10 giây), mỗi loại đúng một mục", () => {
  const s = JSON.parse(readFileSync(new URL("../.claude/settings.json", import.meta.url), "utf8"));
  for (const [suKien, tep, tran] of [["Stop", "cong-xanh.mjs", 120], ["SessionStart", "trang-thai-phien.mjs", 10]] as const) {
    const nhom = s.hooks?.[suKien] ?? [];
    assert.equal(nhom.length, 1, `${suKien}: đúng một mục`);
    const lenh = nhom.flatMap((h: { hooks: { command: string; timeout: number; type: string }[] }) => h.hooks);
    assert.equal(lenh.length, 1, `${suKien}: đúng một lệnh`);
    assert.equal(lenh[0].type, "command");
    assert.equal(lenh[0].command, `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${tep}"`);
    assert.equal(lenh[0].timeout, tran);
  }
  assert.equal((s.hooks?.PreToolUse ?? []).length, 3, "giữ nguyên ba móc PreToolUse cũ");
});
