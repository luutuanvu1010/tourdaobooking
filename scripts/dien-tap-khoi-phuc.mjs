// Diễn tập khôi phục từ MỘT tệp sao lưu đã mã hoá (Đợt 2 sau kiểm toán; hướng dẫn docs/KHOI-PHUC-DU-LIEU.md). CHỦ CHẠY ở thư mục gốc dự án.
// Không ghi production: giải mã vào thư mục tạm, nạp vào một D1 TẠM trên máy (--local --persist-to), soát bất biến --strict, đếm năm con số;
// production chỉ bị ĐỌC (đếm năm con số + xem thời hạn Time Travel). Cuối cùng xoá thư mục tạm (dữ liệu chưa mã hoá không ở lại trên đĩa).
// Dùng: node scripts/dien-tap-khoi-phuc.mjs "<tệp .tar.gz.enc>" [--khong-so-production]
// In một khối «DÁN CHO AI» không có dữ liệu khách. Thoát 0 = đạt cả ba (nạp được, soát đạt, năm số khớp hoặc bỏ so), khác 0 = chưa đạt.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { THAM_SO_OPENSSL, BIEN_MAT_KHAU, TEP_D1, KEYCHAIN, CAU_DEM } from "./sao-luu-lib.mjs";

const GOC = join(dirname(fileURLToPath(import.meta.url)), "..");
const tep = process.argv[2];
const khongSo = process.argv.includes("--khong-so-production");
const batDau = Date.now();
const log = (s) => console.log(`[${Math.round((Date.now() - batDau) / 1000)}s] ${s}`);
const chay = (cmd, argv, opts = {}) => spawnSync(cmd, argv, { cwd: GOC, encoding: "utf8", env: { ...process.env, CI: "1" }, maxBuffer: 1 << 27, ...opts });

if (!tep || !existsSync(tep)) {
  console.error('Dùng: node scripts/dien-tap-khoi-phuc.mjs "<tệp .tar.gz.enc>"');
  process.exit(2);
}

/** Mật khẩu: Keychain trước (máy của chủ); không có thì hỏi gõ tay (người thứ hai, máy khác) — openssl tự hỏi khi không truyền -pass. */
const kc = spawnSync("security", ["find-generic-password", "-s", KEYCHAIN.dichVu, "-a", KEYCHAIN.taiKhoan, "-w"], { encoding: "utf8" });
const mk = process.env[BIEN_MAT_KHAU] || (kc.status === 0 ? kc.stdout.replace(/\n$/, "") : undefined); // biến môi trường: chạy thử tự động

const tam = mkdtempSync(join(tmpdir(), "tourdao-dien-tap-"));
const ketQua = { tep: basename(tep), coMb: (statSync(tep).size / 1e6).toFixed(1) };
let dat = true;
try {
  // 1. Giải mã + bung.
  const thamSo = mk ? THAM_SO_OPENSSL : THAM_SO_OPENSSL.slice(0, -2); // bỏ "-pass env:…" ⇒ openssl hỏi mật khẩu
  const giai = spawnSync("sh", ["-c", `openssl ${thamSo.join(" ")} -d -in "$1" | tar -xzf - -C "$2"`, "sh", tep, tam], {
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, ...(mk ? { [BIEN_MAT_KHAU]: mk } : {}) },
  });
  const thuMuc = readdirSync(tam).find((d) => d.startsWith("tourdao-"));
  if (giai.status !== 0 || !thuMuc) throw new Error("không giải mã được (sai mật khẩu hoặc tệp hỏng)");
  const noi = join(tam, thuMuc);
  log(`đã giải mã ${thuMuc}`);
  const r2 = join(noi, "r2");
  ketQua.r2 = existsSync(r2) ? readdirSync(r2).map((k) => `${k}: ${readdirSync(join(r2, k), { recursive: true }).length}`).join("; ") : "không có (bản --khong-r2)";

  // 2. Nạp vào D1 tạm theo thứ tự cấu trúc → dữ liệu → trigger.
  const db = join(tam, "d1-tam");
  for (const t of TEP_D1) {
    const r = chay("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", db, `--file=${join(noi, t)}`]);
    if (r.status !== 0) throw new Error(`nạp ${t} lỗi: ${String(r.stderr || r.stdout).slice(-600)}`);
    log(`nạp ${t}: được`);
  }

  // 3. Soát bất biến trên bản nạp lại.
  const soat = chay("node", ["scripts/audit-invariants.mjs", "--db", "local", "--persist-to", db, "--strict"]);
  ketQua.soat = (soat.stdout.trim().split("\n").pop() ?? "") + ` (mã thoát ${soat.status})`;
  if (soat.status !== 0) {
    dat = false;
    console.log(soat.stdout.split("\n").filter((l) => l.startsWith("✗")).join("\n"));
  }
  log(`soát bất biến: ${ketQua.soat}`);

  // 4. Năm con số: bản nạp lại vs production (chỉ đếm).
  const dem = (noiChay) => {
    const r = chay("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", ...noiChay, "--json", "--command", CAU_DEM]);
    if (r.status !== 0) throw new Error(`đếm lỗi: ${String(r.stderr || r.stdout).slice(-400)}`);
    return JSON.parse(r.stdout)[0].results[0];
  };
  ketQua.banNap = dem(["--local", "--persist-to", db]);
  ketQua.dungLai = `${Math.round((Date.now() - batDau) / 60000)} phút`;
  if (!khongSo) {
    ketQua.production = dem(["--remote"]);
    const khop = JSON.stringify(ketQua.banNap) === JSON.stringify(ketQua.production);
    ketQua.khop = khop ? "khớp" : "LỆCH (có người vừa ghi trong lúc diễn tập? so lại, hoặc xuất bản mới rồi chạy lại)";
    if (!khop) dat = false;
    const tt = chay("npx", ["wrangler", "d1", "time-travel", "info", "tourdao-sales-db"]);
    ketQua.timeTravel = String(tt.stdout || tt.stderr).split("\n").filter((l) => /retention|giữ|days|bookmark/i.test(l)).join(" | ").slice(0, 300) || "(không đọc được)";
  }
} catch (e) {
  dat = false;
  ketQua.loi = String(e?.message ?? e);
} finally {
  rmSync(tam, { recursive: true, force: true });
}

console.log("\n===== DÁN CHO AI (không có dữ liệu khách) =====");
console.log(`Ngày: ${new Date().toISOString()}`);
for (const [k, v] of Object.entries(ketQua)) console.log(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
console.log(`Thời gian dựng lại: ${Math.round((Date.now() - batDau) / 60000)} phút (tính cả giải mã, nạp, soát, đếm)`);
console.log(`KẾT LUẬN: ${dat ? "ĐẠT" : "CHƯA ĐẠT"}`);
console.log("================================================");
process.exit(dat ? 0 : 1);
