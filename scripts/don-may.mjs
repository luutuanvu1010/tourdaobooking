// Dọn tiến trình kiểm thử mồ côi (Chrome headless, wrangler dev + workerd) do kịch bản Chrome / e2e để lại khi sập, hết giờ hoặc bị dừng.
//   npm run don-may                 CHỈ IN danh sách (pid, tuổi, loại, lý do) — không tắt gì
//   npm run don-may -- --yes        tắt: SIGTERM, chờ vài giây, SIGKILL chỉ cho cái còn sống
//   npm run don-may -- --tuoi 6     đổi ngưỡng tuổi (giờ, mặc định 3)
// Luật chọn nằm ở scripts/don-may-lib.mjs (hàm thuần, có bài src/don-may.test.ts). Tệp này chỉ đọc `ps` và gửi tín hiệu.
import { execFileSync } from "node:child_process";
import { dinhDangTuoi, phanLoai, phanTichEtime, TUOI_MAC_DINH_GIO } from "./don-may-lib.mjs";

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
const conSong = (pid) => {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
};

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

  const pids = chon.map((p) => p.pid);
  for (const pid of pids) { try { process.kill(pid, "SIGTERM"); } catch { /* đã thoát */ } }
  for (let i = 0; i < 10 && pids.some(conSong); i++) await cho(500);
  let ep = 0;
  for (const pid of pids) if (conSong(pid)) { try { process.kill(pid, "SIGKILL"); ep++; } catch { /* đã thoát */ } }
  await cho(300);
  console.log(`\nĐã gửi SIGTERM cho ${pids.length} tiến trình, SIGKILL cho ${ep} cái không chịu thoát; còn sống: ${pids.filter(conSong).length}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await chinh();
