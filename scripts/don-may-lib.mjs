// Phân loại tiến trình kiểm thử mồ côi — HÀM THUẦN, không đọc `ps`, không tắt gì (phần đọc `ps` và tắt nằm ở scripts/don-may.mjs).
// Vào: danh sách tiến trình { pid, ppid, etime (GIÂY), command }. Ra: { chon, boQua }.
// Nguyên tắc: thà bỏ sót còn hơn tắt nhầm (máy chạy nhiều phiên song song, Chrome hằng ngày của chủ). Chỉ chọn khi THOẢ TẤT CẢ:
//   1. nhận dạng được là của kiểm thử: Chrome/Chromium chạy cờ debug (--headless, --remote-debugging-port|pipe) VÀ user-data-dir là thư mục
//      `tourdao-*` dưới thư mục tạm; hoặc `wrangler dev` có --persist-to là thư mục `tourdao-*` dưới thư mục tạm (kèm workerd/esbuild con của nó);
//   2. tuổi ≥ ngưỡng;
//   3. không còn cha sống: đi ngược cây cha, chỉ được đi qua các tiến trình cũng nhận dạng được (cùng nhà) để chạm launchd (pid 1);
//      gặp một cha sống khác (shell, node của kịch bản, `npm run trien-khai|day-len|test:e2e|test`) thì bỏ qua;
//   4. không nằm trong cây của chính lệnh `don-may` (pidTuThan).

export const TUOI_MAC_DINH_GIO = 3;

const THU_MUC_TAM = ["/var/folders/", "/private/var/folders/", "/tmp/", "/private/tmp/"];
const TEN_CHROME = /^(Google Chrome( for Testing)?|Chromium|chromium|chrome|chrome-headless-shell)( Helper( \([A-Za-z ]+\))?)?$/;
const LENH_NPM_SONG = /\bnpm(?:\s+run)?\s+(trien-khai|day-len|test:e2e|test)\b/;

/** `ps etime` macOS/Linux: `mm:ss`, `hh:mm:ss`, `d-hh:mm:ss` → số giây. Sai định dạng → NaN. */
export function phanTichEtime(chuoi) {
  const m = /^\s*(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)\s*$/.exec(String(chuoi));
  if (!m) return Number.NaN;
  const [, ngay, gio, phut, giay] = m;
  return (Number(ngay ?? 0) * 24 + Number(gio ?? 0)) * 3600 + Number(phut) * 60 + Number(giay);
}

export function dinhDangTuoi(giay) {
  const g = Math.floor(giay / 3600);
  const p = Math.floor((giay % 3600) / 60);
  return g >= 24 ? `${Math.floor(g / 24)} ngày ${g % 24} giờ` : g >= 1 ? `${g} giờ ${p} phút` : `${p} phút`;
}

/** Phần chương trình (argv0) của dòng lệnh: từ đầu tới chỗ bắt đầu cờ đầu tiên (đường dẫn có thể chứa dấu cách). */
function chuongTrinh(command) {
  const i = command.search(/\s--?[A-Za-z]/);
  return (i < 0 ? command : command.slice(0, i)).trim();
}

function tenTep(duongDan) {
  return duongDan.split("/").pop() ?? "";
}

function giaTriCo(command, ten) {
  const m = new RegExp(`(?:^|\\s)--${ten}(?:=|\\s+)(.+?)(?=\\s--[A-Za-z]|$)`).exec(command);
  return m ? m[1].trim() : null;
}

/** Thư mục `tourdao-*` nằm ngay dưới thư mục tạm của hệ thống (mkdtemp của các kịch bản kiểm thử). Không cho `..`. */
function laThuMucTamCuaDuAn(duongDan, goc = THU_MUC_TAM) {
  if (!duongDan || duongDan.split("/").includes("..")) return false;
  if (!goc.some((g) => duongDan.startsWith(g))) return false;
  return tenTep(duongDan.replace(/\/+$/, "")).startsWith("tourdao-");
}

/** Nhận dạng một dòng lệnh: trả { loai } hoặc null. Không xét tuổi hay cha. */
export function nhanDang(command, goc = THU_MUC_TAM) {
  const cmd = String(command);
  const ct = chuongTrinh(cmd);
  // Chrome / Chromium (kể cả tiến trình phụ Helper mang cùng cờ).
  if (TEN_CHROME.test(tenTep(ct))) {
    const debug = /(?:^|\s)--headless(?:=\S+)?(?=\s|$)/.test(cmd) || /(?:^|\s)--remote-debugging-(?:port|pipe)(?:=|\s|$)/.test(cmd);
    if (debug && laThuMucTamCuaDuAn(giaTriCo(cmd, "user-data-dir"), goc)) return { loai: "Chrome kiểm thử" };
    return null;
  }
  // Bộ canh scripts/chrome-tu-dong-dong.sh: sh/bash <đường dẫn>/chrome-tu-dong-dong.sh <cờ Chrome>.
  const bocanh = /^(?:\S*\/)?(?:sh|bash|zsh)\s+(\S*chrome-tu-dong-dong\.sh)(?:\s|$)/.exec(cmd);
  if (bocanh) {
    const debug = /(?:^|\s)--headless(?:=\S+)?(?=\s|$)/.test(cmd) || /(?:^|\s)--remote-debugging-(?:port|pipe)(?:=|\s|$)/.test(cmd);
    return debug && laThuMucTamCuaDuAn(giaTriCo(cmd, "user-data-dir"), goc) ? { loai: "Bộ canh Chrome" } : null;
  }
  // wrangler dev (npm exec wrangler / .bin/wrangler / wrangler-dist/cli.js) với --persist-to là thư mục tạm của dự án.
  if (/(?:wrangler|cli\.js)\s+dev(?:\s|$)/.test(cmd) && laThuMucTamCuaDuAn(giaTriCo(cmd, "persist-to"), goc)) return { loai: "wrangler dev kiểm thử" };
  return null;
}

/** workerd / esbuild của wrangler (không mang --persist-to): chỉ nhận qua cây cha (xem phanLoai) hoặc workerd mồ côi nằm trong node_modules của dự án. */
function laCon(command) {
  const m = /^(\S*\/(?:workerd|esbuild))(?:\s|$)/.exec(String(command));
  return m ? tenTep(m[1]) : null;
}
const WORKERD_CUA_DU_AN = /\/tourdao-sales\/(?:.*\/)?node_modules\/@cloudflare\/workerd[^/]*\/bin\/workerd(?:\s|$)/;

/**
 * @param {{ tienTrinh: {pid:number, ppid:number, etime:number, command:string}[], tuoiToiThieuGiay: number, pidTuThan: number, thuMucTam?: string[] }} vao
 * @returns {{ chon: {pid:number, tuoi:number, loai:string, lyDo:string}[], boQua: {pid:number, tuoi:number, loai:string, lyDo:string, nhom:"tre"|"cha-song"|"lenh-dang-chay"|"tu-than"}[] }}
 */
export function phanLoai({ tienTrinh, tuoiToiThieuGiay, pidTuThan, thuMucTam }) {
  const goc = thuMucTam ?? THU_MUC_TAM;
  const theoPid = new Map(tienTrinh.map((p) => [p.pid, p]));
  const cha = (p) => theoPid.get(p.ppid);

  // Cây của chính lệnh don-may: tổ tiên của nó (npm run don-may, shell) và mọi hậu duệ (ps).
  const cayTuThan = new Set();
  for (let p = theoPid.get(pidTuThan); p && !cayTuThan.has(p.pid); p = cha(p)) cayTuThan.add(p.pid);
  const duoiTuThan = (p) => {
    for (let a = p, dem = 0; a && dem < 64; a = cha(a), dem++) if (a.pid === pidTuThan) return true;
    return false;
  };

  // Vòng 1: nhận dạng theo dòng lệnh. Vòng 2: workerd/esbuild con của một tiến trình đã nhận dạng là wrangler (hoặc workerd mồ côi của dự án).
  const loaiCua = new Map();
  for (const p of tienTrinh) {
    const nd = nhanDang(p.command, goc);
    if (nd) loaiCua.set(p.pid, nd.loai);
  }
  const coTo = (p) => {
    for (let a = cha(p), dem = 0; a && dem < 64; a = cha(a), dem++) if (loaiCua.get(a.pid) === "wrangler dev kiểm thử") return true;
    return false;
  };
  for (const p of tienTrinh) {
    const con = laCon(p.command);
    if (!con || loaiCua.has(p.pid)) continue;
    if (coTo(p)) loaiCua.set(p.pid, `${con} của wrangler dev kiểm thử`);
    else if (con === "workerd" && p.ppid === 1 && WORKERD_CUA_DU_AN.test(p.command)) loaiCua.set(p.pid, "workerd mồ côi của dự án");
  }

  const chon = [];
  const boQua = [];
  for (const p of tienTrinh) {
    const loai = loaiCua.get(p.pid);
    if (!loai) continue;
    const tuoi = p.etime;
    const bo = (nhom, lyDo) => boQua.push({ pid: p.pid, tuoi, loai, lyDo, nhom });

    if (p.pid === pidTuThan || cayTuThan.has(p.pid) || duoiTuThan(p)) { bo("tu-than", "nằm trong cây của chính lệnh don-may"); continue; }
    if (!Number.isFinite(tuoi)) { bo("tre", "không đọc được tuổi — coi như còn mới"); continue; }
    if (tuoi < tuoiToiThieuGiay) { bo("tre", `còn trẻ (${dinhDangTuoi(tuoi)} < ngưỡng ${dinhDangTuoi(tuoiToiThieuGiay)})`); continue; }

    // Đi ngược cây cha: chỉ được đi qua tiến trình cùng nhà (đã nhận dạng) để tới launchd.
    let chan = null;
    let a = p;
    for (let dem = 0; dem < 64; dem++) {
      if (a.ppid <= 1) break;
      const c = cha(a);
      if (!c) { chan = { pid: a.ppid, command: "(không thấy trong danh sách — coi như còn sống)" }; break; }
      if (!loaiCua.has(c.pid)) { chan = c; break; }
      a = c;
    }
    if (chan) {
      // Cha sống đầu tiên chưa chắc là `npm run …` (thường là node của kịch bản): đi tiếp lên mọi tổ tiên để nhận ra lệnh gốc.
      let lenh = null;
      let tt = chan;
      for (let dem = 0; tt && !lenh && dem < 64; tt = theoPid.get(tt.ppid), dem++) lenh = LENH_NPM_SONG.exec(tt.command) && { ten: LENH_NPM_SONG.exec(tt.command)[1], pid: tt.pid };
      if (lenh) bo("lenh-dang-chay", `thuộc cây lệnh còn sống \`npm run ${lenh.ten}\` (pid ${lenh.pid})`);
      else bo("cha-song", `cha còn sống: pid ${chan.pid} (${tenTep(chuongTrinh(chan.command)) || "?"})`);
      continue;
    }
    chon.push({ pid: p.pid, tuoi, loai, lyDo: `mồ côi (cha là launchd), tuổi ${dinhDangTuoi(tuoi)} ≥ ${dinhDangTuoi(tuoiToiThieuGiay)}` });
  }
  return { chon, boQua };
}
