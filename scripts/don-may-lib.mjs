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

// Thư mục tạm của hệ thống, và hồ sơ `tourdao-*` NGAY DƯỚI nó (mkdtemp của các kịch bản): /var/folders/xx/yyyy/T/tourdao-…, /tmp/tourdao-… (kể cả /private/…).
const HO_SO_TAM = [/^(?:\/private)?\/var\/folders\/[^/]+\/[^/]+\/T\/tourdao-[^/]+\/?$/, /^(?:\/private)?\/tmp\/tourdao-[^/]+\/?$/];
// Chương trình Chrome: đường dẫn tuyệt đối ĐẦU dòng lệnh, kết thúc đúng tên tệp thực thi của Chrome/Chromium (macOS: …app/Contents/MacOS/<tên>; Linux: …/chrome).
const CHUONG_TRINH_CHROME = /^(?:\/(?:[^\n]*?\/)?[^/\n]*\.app\/Contents\/MacOS\/(?:Google Chrome(?: for Testing)?|Chromium)(?: Helper(?: \([A-Za-z ]+\))?)?|\/(?:\S*\/)?(?:chrome|chromium|chrome-headless-shell))(?=\s|$)/;
// wrangler dev: `npm exec|npx wrangler dev …` hoặc `node [cờ] …/wrangler|…/cli.js dev …`.
const CHUONG_TRINH_WRANGLER = /^(?:(?:\S*\/)?(?:npm exec|npx)\s+wrangler\s+dev|(?:\S*\/)?node(?:\s+--?\S+)*\s+\S*(?:\/wrangler|\/cli\.js)\s+dev)(?=\s|$)/;
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

/** Phần đầu dòng lệnh tới chỗ bắt đầu cờ đầu tiên — chỉ để HIỂN THỊ tên cha; không dùng để quyết định nhận dạng. */
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

/** Hồ sơ `tourdao-*` nằm NGAY DƯỚI thư mục tạm của hệ thống (đường lồng sâu hơn, `..`, thư mục khác tên: không nhận). */
function laThuMucTamCuaDuAn(duongDan) {
  return !!duongDan && HO_SO_TAM.some((re) => re.test(duongDan));
}

/** Nhận dạng một dòng lệnh: trả { loai } hoặc null. Không xét tuổi hay cha. */
export function nhanDang(command) {
  const cmd = String(command);
  // Chrome / Chromium (kể cả tiến trình phụ Helper mang cùng cờ).
  if (CHUONG_TRINH_CHROME.test(cmd)) {
    const debug = /(?:^|\s)--headless(?:=\S+)?(?=\s|$)/.test(cmd) || /(?:^|\s)--remote-debugging-(?:port|pipe)(?:=|\s|$)/.test(cmd);
    if (debug && laThuMucTamCuaDuAn(giaTriCo(cmd, "user-data-dir"))) return { loai: "Chrome kiểm thử" };
    return null;
  }
  // Bộ canh scripts/chrome-tu-dong-dong.sh: sh/bash <đường dẫn>/chrome-tu-dong-dong.sh <cờ Chrome>.
  const bocanh = /^(?:\S*\/)?(?:sh|bash|zsh)\s+(\S*chrome-tu-dong-dong\.sh)(?:\s|$)/.exec(cmd);
  if (bocanh) {
    const debug = /(?:^|\s)--headless(?:=\S+)?(?=\s|$)/.test(cmd) || /(?:^|\s)--remote-debugging-(?:port|pipe)(?:=|\s|$)/.test(cmd);
    return debug && laThuMucTamCuaDuAn(giaTriCo(cmd, "user-data-dir")) ? { loai: "Bộ canh Chrome" } : null;
  }
  // wrangler dev (npm exec wrangler / .bin/wrangler / wrangler-dist/cli.js) với --persist-to là thư mục tạm của dự án.
  if (CHUONG_TRINH_WRANGLER.test(cmd) && laThuMucTamCuaDuAn(giaTriCo(cmd, "persist-to"))) return { loai: "wrangler dev kiểm thử" };
  return null;
}

/** workerd / esbuild của wrangler (không mang --persist-to): chỉ nhận qua cây cha (xem phanLoai) hoặc workerd mồ côi nằm trong node_modules của dự án. */
function laCon(command) {
  const m = /^(\S*\/(?:workerd|esbuild))(?:\s|$)/.exec(String(command));
  return m ? tenTep(m[1]) : null;
}
const WORKERD_CUA_DU_AN = /\/tourdao-sales\/(?:.*\/)?node_modules\/@cloudflare\/workerd[^/]*\/bin\/workerd(?:\s|$)/;

/**
 * @param {{ tienTrinh: {pid:number, ppid:number, etime:number, command:string}[], tuoiToiThieuGiay: number, pidTuThan: number }} vao
 * @returns {{ chon: {pid:number, tuoi:number, loai:string, command:string, lyDo:string}[], boQua: {pid:number, tuoi:number, loai:string, lyDo:string, nhom:"tre"|"cha-song"|"lenh-dang-chay"|"tu-than"}[] }}
 */
export function phanLoai({ tienTrinh, tuoiToiThieuGiay, pidTuThan }) {
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
    const nd = nhanDang(p.command);
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
    let dem = 0;
    for (; dem < 64; dem++) {
      if (a.ppid <= 1) break;
      const c = cha(a);
      if (!c) { chan = { pid: a.ppid, command: "(không thấy trong danh sách — coi như còn sống)" }; break; }
      if (!loaiCua.has(c.pid)) { chan = c; break; }
      a = c;
    }
    if (dem >= 64) chan = { pid: a.ppid, command: "(cây cha quá sâu hoặc vòng — không chắc, giữ)" }; // không chạm launchd sau 64 bước ⇒ không chắc ⇒ GIỮ
    if (chan) {
      // Cha sống đầu tiên chưa chắc là `npm run …` (thường là node của kịch bản): đi tiếp lên mọi tổ tiên để nhận ra lệnh gốc.
      let lenh = null;
      let tt = chan;
      for (let dem = 0; tt && !lenh && dem < 64; tt = theoPid.get(tt.ppid), dem++) lenh = LENH_NPM_SONG.exec(tt.command) && { ten: LENH_NPM_SONG.exec(tt.command)[1], pid: tt.pid };
      if (lenh) bo("lenh-dang-chay", `thuộc cây lệnh còn sống \`npm run ${lenh.ten}\` (pid ${lenh.pid})`);
      else bo("cha-song", `cha còn sống: pid ${chan.pid} (${tenTep(chuongTrinh(chan.command)) || "?"})`);
      continue;
    }
    chon.push({ pid: p.pid, tuoi, loai, command: p.command, lyDo: `mồ côi (cha là launchd), tuổi ${dinhDangTuoi(tuoi)} ≥ ${dinhDangTuoi(tuoiToiThieuGiay)}` });
  }
  return { chon, boQua };
}

/**
 * Đối chiếu LẠI một tiến trình ngay trước khi gửi tín hiệu (pid có thể đã bị cấp lại cho tiến trình khác sau lúc chọn).
 * daChon = { command, etime } lúc chọn; hienTai = { command, etime } vừa đọc lại bằng `ps -p <pid>` (null nếu pid không còn).
 * Chỉ ok khi dòng lệnh GIỐNG HỆT và tuổi không nhỏ hơn lúc chọn (tuổi của cùng một tiến trình chỉ tăng; dung sai 2 giây cho làm tròn).
 */
export function khopLucChon(daChon, hienTai) {
  if (!hienTai) return { ok: false, lyDo: "không còn" };
  if (hienTai.command !== daChon.command) return { ok: false, lyDo: "pid đã được cấp lại (dòng lệnh khác lúc chọn)" };
  if (!Number.isFinite(hienTai.etime) || !Number.isFinite(daChon.etime) || hienTai.etime < daChon.etime - 2) return { ok: false, lyDo: "pid đã được cấp lại (tuổi nhỏ hơn lúc chọn)" };
  return { ok: true, lyDo: "" };
}
