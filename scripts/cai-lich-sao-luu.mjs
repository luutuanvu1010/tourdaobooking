// Cài (hoặc gỡ) lịch chạy sao lưu tự động trên máy Mac của chủ (Đợt 2 sau kiểm toán; hướng dẫn docs/KHOI-PHUC-DU-LIEU.md mục 3). CHỦ CHẠY, ở thư mục gốc dự án
// (bản checkout chính, nơi đã cài thư viện) — lịch chạy trỏ vào đúng thư mục này.
// Lịch: mỗi ngày 10:00 và mỗi lần đăng nhập máy, chạy `sao-luu.mjs --neu-cu-hon 6.5` ⇒ thực tế một bản mỗi tuần; máy tắt đúng giờ thì lần mở sau chạy bù.
// Dùng: node scripts/cai-lich-sao-luu.mjs --dich "<thư mục Google Drive>" [--khong-r2]     (cài / cài lại)
//       node scripts/cai-lich-sao-luu.mjs --go                                            (gỡ)
import { writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const NHAN = "vn.tourdao.sao-luu";
const GOC = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLIST = join(homedir(), "Library", "LaunchAgents", `${NHAN}.plist`);
const LOG = join(homedir(), "Library", "Logs", "tourdao-sao-luu.log");
const args = process.argv.slice(2);
const uid = process.getuid?.() ?? 0;
const go = () => spawnSync("launchctl", ["bootout", `gui/${uid}/${NHAN}`], { stdio: "ignore" });

if (args.includes("--go")) {
  go();
  if (existsSync(PLIST)) rmSync(PLIST);
  console.log("Đã gỡ lịch sao lưu tự động.");
  process.exit(0);
}
const dich = args.includes("--dich") ? args[args.indexOf("--dich") + 1] : undefined;
if (!dich || !existsSync(dich)) {
  console.error('Dùng: node scripts/cai-lich-sao-luu.mjs --dich "<thư mục Google Drive đã có>" [--khong-r2]');
  process.exit(2);
}
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const thamSo = [process.execPath, join(GOC, "scripts", "sao-luu.mjs"), "--dich", dich, "--neu-cu-hon", "6.5", ...(args.includes("--khong-r2") ? ["--khong-r2"] : [])];
// launchd không đọc PATH của Terminal: thêm thư mục của node đang chạy, Homebrew (aws, openssl) và thư mục hệ thống.
const PATH = [dirname(process.execPath), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
const noiDung = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Máy sinh bằng scripts/cai-lich-sao-luu.mjs. Gỡ: node scripts/cai-lich-sao-luu.mjs --go -->
<plist version="1.0">
<dict>
  <key>Label</key><string>${NHAN}</string>
  <key>ProgramArguments</key>
  <array>
${thamSo.map((a) => `    <string>${xml(a)}</string>`).join("\n")}
  </array>
  <key>WorkingDirectory</key><string>${xml(GOC)}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(PATH)}</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>Nice</key><integer>10</integer>
  <key>StandardOutPath</key><string>${xml(LOG)}</string>
  <key>StandardErrorPath</key><string>${xml(LOG)}</string>
</dict>
</plist>
`;
mkdirSync(dirname(PLIST), { recursive: true });
mkdirSync(dirname(LOG), { recursive: true });
go(); // cài lại: gỡ bản cũ trước
writeFileSync(PLIST, noiDung);
const r = spawnSync("launchctl", ["bootstrap", `gui/${uid}`, PLIST], { encoding: "utf8" });
if (r.status !== 0) {
  console.error(`Không nạp được lịch: ${r.stderr}`);
  process.exit(1);
}
console.log(`Đã cài lịch sao lưu: mỗi ngày 10:00 và lúc đăng nhập máy, chỉ sao lưu khi bản mới nhất cũ hơn 6,5 ngày.`);
console.log(`Nhật ký: ${LOG}`);
console.log(`Lần chạy đầu bắt đầu ngay bây giờ (RunAtLoad). Xem: tail -f "${LOG}"`);
