// Dọn tiến trình kiểm thử mồ côi (Chrome headless, wrangler dev + workerd) do kịch bản Chrome / e2e để lại khi sập, hết giờ hoặc bị dừng.
//   npm run don-may                 CHỈ IN danh sách (pid, tuổi, loại, lý do) — không tắt gì
//   npm run don-may -- --yes        tắt: SIGTERM, chờ vài giây, SIGKILL chỉ cho cái còn sống
//   npm run don-may -- --tuoi 6     đổi ngưỡng tuổi (giờ, mặc định 3)
// Luật chọn nằm ở scripts/don-may-lib.mjs (hàm thuần, có bài src/don-may.test.ts). Tệp này chỉ đọc `ps` và gửi tín hiệu.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dinhDangTuoi, khopLucChon, phanLoai, phanTichEtime, TUOI_MAC_DINH_GIO } from "./don-may-lib.mjs";

/** Đọc `ps` thành danh sách { pid, ppid, etime (giây), command }. Không có logic quyết định. */
export function docPs() {
  const ra = execFileSync("ps", ["-axww", "-o", "pid=,ppid=,etime=,command="], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const ds = [];
  for (const dong of ra.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(dong);
    if (m) ds.push({ pid: Number(m[1]), ppid: Number(m[2]), etime: phanTichEtime(m[3]), command: m[4] });
  }
  return ds;
}

const cho = (ms) => new Promise((r) => setTimeout(r, ms));
/** Đọc lại MỘT pid: { command, etime } hoặc null nếu không còn. Không có logic quyết định. */
function docMotPid(pid) {
  let ra;
  try { ra = execFileSync("ps", ["-ww", "-o", "etime=,command=", "-p", String(pid)], { encoding: "utf8" }); } catch { return null; }
  const m = /^\s*(\S+)\s+(.*)$/m.exec(ra);
  return m ? { etime: phanTichEtime(m[1]), command: m[2] } : null;
}

function chonNguong(argv) {
  const i = argv.indexOf("--tuoi");
  if (i < 0) return TUOI_MAC_DINH_GIO;
  const g = Number(argv[i + 1]);
  if (!Number.isFinite(g) || g < 0) { console.error("✘ --tuoi cần một số giờ ≥ 0 (ví dụ --tuoi 3)."); process.exit(2); }
  return g;
}

async function chinh() {
  const argv = process.argv.slice(2);
  const tat = argv.includes("--yes");
  const gio = chonNguong(argv);
  const { chon, boQua } = phanLoai({ tienTrinh: docPs(), tuoiToiThieuGiay: gio * 3600, pidTuThan: process.pid });

  console.log(`Ngưỡng tuổi: ${gio} giờ. Đã chọn ${chon.length}, bỏ qua ${boQua.length} (tiến trình kiểm thử nhưng chưa đủ điều kiện).`);
  for (const p of chon) console.log(`  CHỌN  pid ${String(p.pid).padStart(6)}  ${dinhDangTuoi(p.tuoi).padEnd(14)} ${p.loai} — ${p.lyDo}`);
  const dem = { tre: 0, "cha-song": 0, "lenh-dang-chay": 0, "tu-than": 0 };
  for (const p of boQua) dem[p.nhom]++;
  if (boQua.length) console.log(`Bỏ qua: ${dem.tre} còn trẻ, ${dem["cha-song"]} còn cha sống, ${dem["lenh-dang-chay"]} thuộc lệnh npm đang chạy, ${dem["tu-than"]} thuộc chính lệnh này.`);
  for (const p of boQua.filter((x) => x.nhom !== "tu-than").slice(0, 40)) console.log(`  bỏ    pid ${String(p.pid).padStart(6)}  ${dinhDangTuoi(p.tuoi).padEnd(14)} ${p.loai} — ${p.lyDo}`);
  if (boQua.length > 40) console.log(`  … và ${boQua.length - 40} dòng nữa.`);

  if (!chon.length) return;
  if (!tat) { console.log("\nChưa tắt gì. Muốn tắt đúng các tiến trình CHỌN ở trên: npm run don-may -- --yes"); return; }

  // pid có thể bị cấp lại cho tiến trình khác giữa lúc chọn và lúc gửi tín hiệu: ĐỌC LẠI `ps` cho đúng pid trước MỖI lần gửi và chỉ gửi khi khớp lúc chọn.
  const gui = (p, tinHieu) => {
    const kq = khopLucChon({ command: p.command, etime: p.tuoi }, docMotPid(p.pid));
    if (!kq.ok) { if (kq.lyDo !== "không còn") console.log(`  bỏ    pid ${p.pid}: ${kq.lyDo} — KHÔNG gửi ${tinHieu}`); return false; }
    try { process.kill(p.pid, tinHieu); return true; } catch { return false; }
  };
  const conSongDung = (p) => khopLucChon({ command: p.command, etime: p.tuoi }, docMotPid(p.pid)).ok;
  let moi = 0;
  for (const p of chon) if (gui(p, "SIGTERM")) moi++;
  for (let i = 0; i < 10 && chon.some(conSongDung); i++) await cho(500);
  let ep = 0;
  for (const p of chon) if (gui(p, "SIGKILL")) ep++;
  await cho(300);
  const con = chon.filter(conSongDung).length;
  console.log(`\nĐã gửi SIGTERM cho ${moi}/${chon.length} tiến trình, SIGKILL cho ${ep} cái không chịu thoát; còn sống: ${con}.`);
  if (con) process.exitCode = 1;
}

// Chạy khi gọi trực tiếp (so sánh đường đã realpath: liên kết tượng trưng, dấu cách, %-mã hoá đều đúng); import làm thư viện thì không chạy.
let goiTrucTiep = false;
try { goiTrucTiep = !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* không phân giải được ⇒ báo lỗi bên dưới */ }
if (goiTrucTiep) await chinh();
else if (process.argv[1] && process.argv[1].endsWith("don-may.mjs")) { console.error("✘ Không phân giải được đường chạy của don-may.mjs — không làm gì."); process.exitCode = 2; }
