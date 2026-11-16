// Sao lưu dữ liệu production ra ngoài Cloudflare (Đợt 2 sau kiểm toán — docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md; hướng dẫn: docs/KHOI-PHUC-DU-LIEU.md).
// CHỦ CHẠY (hoặc lịch chạy launchd trên máy Mac của chủ) ở thư mục gốc dự án. CHỈ ĐỌC production: `wrangler d1 export --remote` và `aws s3 sync` bằng khoá R2 chỉ-đọc.
//
//   1. Xuất D1 thành cấu trúc (--no-data) + dữ liệu (--no-schema), tách trigger (scripts/tach-ban-xuat-d1.mjs) → ba tệp nạp lại được.
//   2. Tải tệp của năm kho R2 (bỏ qua bằng --khong-r2 khi chưa có khoá R2).
//   3. Nén + mã hoá AES-256 bằng openssl, mật khẩu lấy từ Keychain của macOS (không qua dòng lệnh, không ghi ra đĩa).
//   4. Thử giải mã lại bản vừa tạo và đối chiếu danh sách tệp bên trong (bản không mở được = không có sao lưu).
//   5. Chép vào thư mục đích (thư mục Google Drive trên máy), xoá bản cũ theo luật giữ 8 tuần + 12 tháng, xoá bản chưa mã hoá.
//
// Dùng: node scripts/sao-luu.mjs --dich "<thư mục đích>" [--khong-r2] [--neu-cu-hon <số ngày>] [--thu-local <thư mục D1 local>]
//   --neu-cu-hon N : chỉ sao lưu khi bản mới nhất ở thư mục đích cũ hơn N ngày (lịch chạy hằng ngày dùng N = 6.5 ⇒ một bản mỗi tuần, máy tắt thì chạy bù lần mở sau).
// Thoát 0 = có bản mới (hoặc chưa tới hạn), khác 0 = hỏng (lịch chạy hiện thông báo trên máy).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync, renameSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tenBan, chonXoa, soNgayTuBanMoiNhat, KHUON_TEN, THAM_SO_OPENSSL, BIEN_MAT_KHAU, TEP_D1, KHO_R2, KEYCHAIN } from "./sao-luu-lib.mjs";

const GOC = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const dich = opt("--dich");
const khongR2 = args.includes("--khong-r2") || args.includes("--thu-local");
const neuCuHon = opt("--neu-cu-hon") === undefined ? undefined : Number(opt("--neu-cu-hon"));
const AWS_PROFILE = "tourdao-r2";
// --thu-local <thư mục D1>: CHẠY THỬ trên D1 local (không đọc production) — để kiểm công cụ trên máy; kéo theo --khong-r2.
const thuLocal = opt("--thu-local");
// `d1 export --local` không nhận --persist-to: chạy thử dựng một thư mục dự án tạm có .wrangler/state trỏ vào thư mục D1 thử.
const NGUON_D1 = thuLocal ? ["--local"] : ["--remote"];

const log = (s) => console.log(`[${new Date().toISOString()}] ${s}`);
/** Báo hỏng bằng NÉM lỗi (không process.exit): khối finally phải chạy để xoá bản chưa mã hoá. */
function hong(s) {
  throw Object.assign(new Error(s), { saoLuu: true });
}
function baoHong(e) {
  const s = e?.saoLuu ? e.message : `lỗi không lường trước: ${String(e?.stack ?? e).slice(0, 400)}`;
  console.error(`[${new Date().toISOString()}] HỎNG: ${s}`);
  // Thông báo trên máy Mac (lịch chạy không có ai nhìn Terminal). Lỗi thông báo không che lỗi chính.
  spawnSync("osascript", ["-e", `display notification "${s.replace(/["\\]/g, "'").slice(0, 180)}" with title "Tour Đảo: sao lưu HỎNG"`]);
  process.exitCode = 1;
}

function main() {
  if (!dich) hong("thiếu --dich <thư mục đích>");
  if (neuCuHon !== undefined && !(neuCuHon >= 0)) hong("--neu-cu-hon phải là số ngày ≥ 0");
  if (!existsSync(dich)) hong(`không thấy thư mục đích ${dich} (Google Drive chưa mở?)`);

  if (neuCuHon !== undefined) {
    const tuoi = soNgayTuBanMoiNhat(readdirSync(dich), new Date());
    if (tuoi < neuCuHon) {
      log(`bản mới nhất mới ${tuoi.toFixed(1)} ngày (< ${neuCuHon}) — chưa tới hạn, không làm gì.`);
      return;
    }
  }

  function matKhau() {
  if (process.env[BIEN_MAT_KHAU] && thuLocal) return process.env[BIEN_MAT_KHAU]; // chạy thử: mật khẩu thử qua biến môi trường
    const r = spawnSync("security", ["find-generic-password", "-s", KEYCHAIN.dichVu, "-a", KEYCHAIN.taiKhoan, "-w"], { encoding: "utf8" });
    const mk = (r.stdout ?? "").replace(/\n$/, "");
    if (r.status !== 0 || mk.length < 12) hong(`không đọc được mật khẩu sao lưu trong Keychain (mục "${KEYCHAIN.dichVu}") hoặc mật khẩu ngắn hơn 12 ký tự — xem docs/KHOI-PHUC-DU-LIEU.md bước chuẩn bị`);
    return mk;
  }

  /** Chạy lệnh, thử lại MỘT lần (lỗi Cloudflare 7403 lúc vé đăng nhập vừa hết hạn — CLAUDE.md §10). Mọi lệnh ở đây chỉ đọc nên thử lại an toàn. */
  function chay(cmd, argv, opts = {}) {
    for (let lan = 1; ; lan++) {
      const r = spawnSync(cmd, argv, { cwd: GOC, encoding: "utf8", env: { ...process.env, CI: "1" }, maxBuffer: 1 << 26, ...opts });
      if (r.status === 0) return r;
      if (lan >= 2) hong(`${cmd} ${argv.slice(0, 4).join(" ")} … thoát ${r.status}: ${String(r.stderr || r.stdout || r.error?.message).slice(-400)}`);
      log(`lệnh lỗi, thử lại một lần: ${cmd} ${argv.slice(0, 4).join(" ")}`);
    }
  }

  const mk = matKhau();
  const ten = tenBan(new Date());
  const tam = mkdtempSync(join(tmpdir(), "tourdao-sao-luu-"));
  const noiDung = join(tam, ten);
  try {
    mkdirSync(join(noiDung, "d1"), { recursive: true });
    log(`bắt đầu ${ten}`);

    // 1. D1
    const goc = join(tam, "cau-truc-goc.sql");
    let xuat = (argv) => chay("npx", ["wrangler", ...argv]);
    if (thuLocal) {
      const duAn = join(tam, "du-an-thu");
      mkdirSync(join(duAn, ".wrangler"), { recursive: true });
      copyFileSync(join(GOC, "wrangler.jsonc"), join(duAn, "wrangler.jsonc"));
      symlinkSync(resolve(thuLocal), join(duAn, ".wrangler", "state"));
      xuat = (argv) => chay(join(GOC, "node_modules/.bin/wrangler"), argv, { cwd: duAn });
    }
    xuat(["d1", "export", "tourdao-sales-db", ...NGUON_D1, "--no-data", `--output=${goc}`]);
    xuat(["d1", "export", "tourdao-sales-db", ...NGUON_D1, "--no-schema", `--output=${join(noiDung, TEP_D1[1])}`]);
    const tach = chay("node", [join(GOC, "scripts/tach-ban-xuat-d1.mjs"), goc, join(noiDung, TEP_D1[0]), join(noiDung, TEP_D1[2])]);
    log(`D1: ${tach.stdout.trim()}; dữ liệu ${(statSync(join(noiDung, TEP_D1[1])).size / 1e6).toFixed(1)} MB`);

    // 2. R2
    if (khongR2) log("bỏ qua kho tệp R2 (--khong-r2)");
    else {
      for (const kho of KHO_R2) {
        chay("aws", ["s3", "sync", `s3://${kho}`, join(noiDung, "r2", kho), "--profile", AWS_PROFILE, "--only-show-errors"]);
        const n = existsSync(join(noiDung, "r2", kho)) ? readdirSync(join(noiDung, "r2", kho), { recursive: true }).length : 0;
        log(`R2 ${kho}: ${n} mục`);
      }
    }

    // 3. Nén + mã hoá. Mật khẩu chỉ đi qua biến môi trường của tiến trình con.
    const tar = join(tam, `${ten}.tar.gz`);
    const enc = `${tar}.enc`;
    chay("tar", ["-C", tam, "-czf", tar, ten]);
    chay("openssl", [...THAM_SO_OPENSSL, "-salt", "-in", tar, "-out", enc], { env: { ...process.env, [BIEN_MAT_KHAU]: mk } });
    rmSync(tar);

    // 4. Thử mở lại: giải mã ra luồng, liệt kê tệp, phải thấy đủ ba tệp D1.
    const thu = execFileSync("sh", ["-c", `openssl ${THAM_SO_OPENSSL.join(" ")} -d -in "$1" | tar -tzf -`, "sh", enc], { encoding: "utf8", env: { ...process.env, [BIEN_MAT_KHAU]: mk }, maxBuffer: 1 << 26 });
    for (const t of TEP_D1) if (!thu.split("\n").includes(`${ten}/${t}`)) hong(`bản mã hoá không chứa ${t} — không cất`);
    log(`đã thử mở lại bản mã hoá: ${thu.split("\n").filter(Boolean).length} mục, đủ ba tệp D1`);

    // 5. Cất: chép sang tên tạm rồi đổi tên (Drive không đồng bộ tệp dở dang), rồi xoá bản cũ theo luật giữ.
    const den = join(dich, `${ten}.tar.gz.enc`);
    copyFileSync(enc, `${den}.dang-chep`);
    renameSync(`${den}.dang-chep`, den);
    log(`đã cất ${den} (${(statSync(den).size / 1e6).toFixed(1)} MB)`);
    for (const cu of chonXoa(readdirSync(dich))) {
      if (!KHUON_TEN.test(cu)) continue; // hai lớp: chonXoa đã lọc, nhưng xoá là việc một chiều
      rmSync(join(dich, cu));
      log(`xoá bản cũ ${cu}`);
    }
  } finally {
    rmSync(tam, { recursive: true, force: true }); // bản chưa mã hoá không bao giờ ở lại trên đĩa
  }
  log("XONG");
}

try {
  main();
} catch (e) {
  baoHong(e);
}
