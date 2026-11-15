// "Trang trạng thái do máy sinh" — móc SessionStart (`trang-thai-phien.mjs`), kế hoạch docs/superpowers/plans/2026-11-15-buoc-2-3-may-kiem-va-hai-lan-duyet.md
// việc 2.3. Đầu ra là VĂN BẢN THƯỜNG (Claude Code đưa stdout của SessionStart vào ngữ cảnh), dưới 10.000 ký tự, gồm:
//   • phiên bản bản chạy thật + bảo trì bật/tắt (GET công khai /api/auth/config, trần 3 giây; lỗi ⇒ «không lấy được»);
//   • mã ngắn của `main` và `origin/main` (KHÔNG `git fetch` — origin/main là lần lấy gần nhất), có khớp không;
//   • số bản làm việc riêng (`git worktree list`) và tên các bản còn phần chưa lưu;
//   • các mục `docs/quyen-hoan.json` có `han` trong 14 ngày tới (và mục đã quá hạn).
// Mỗi bước lỗi thì ghi «không đọc được / không lấy được» và đi tiếp; hàm không bao giờ ném. Mục đích: phiên mới khỏi khẳng định trạng thái từ tài liệu cũ
// hay trí nhớ (CLAUDE.md §8) — nhưng đây vẫn là ẢNH CHỤP lúc mở phiên, không thay cho lệnh kiểm trước khi làm việc chạm production.
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

export const URL_CAU_HINH = "https://booking.tourdao.vn/api/auth/config";
export const TRAN_MANG_MS = 3000;
const TRAN_GIT_MS = 2500;
const SO_NGAY_HAN = 14;
const TOI_DA_KY_TU = 9500;
const TOI_DA_TEN = 40;

/** Giờ Việt Nam (UTC+7, không đổi giờ mùa hè), dạng "HH:MM DD/MM/YYYY". */
export function gioVN(d) {
  const v = new Date(d.getTime() + 7 * 3600_000);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(v.getUTCHours())}:${p(v.getUTCMinutes())} ${p(v.getUTCDate())}/${p(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
}
const ngayVN = (d) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

function git(dir, args) {
  return new Promise((resolve) => {
    execFile("git", ["-C", dir, ...args], { encoding: "utf8", timeout: TRAN_GIT_MS, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => resolve(err ? null : String(stdout).replace(/\r?\n$/, "")));
  });
}

async function layCauHinhThat(url, tranMs) {
  const r = await fetch(url, { signal: AbortSignal.timeout(tranMs), headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function mucBanChayThat(layCauHinh, tranMs) {
  try {
    // Trần cứng ở đây nữa: hàm tiêm vào (hay fetch) mà treo thì vẫn chỉ chờ tranMs.
    const body = await Promise.race([layCauHinh(URL_CAU_HINH, tranMs), new Promise((_, loi) => setTimeout(() => loi(new Error(`quá ${tranMs / 1000} giây`)), tranMs).unref?.())]);
    const ban = typeof body?.version === "string" && body.version ? body.version : "không rõ";
    const m = body?.maintenance;
    const het = typeof m?.endsAt === "string" && Number.isFinite(Date.parse(m.endsAt)) ? ` (dự kiến tới ${gioVN(new Date(m.endsAt))})` : "";
    const baoTri = m?.on === true ? `BẬT${het}` : m && typeof m === "object" ? "tắt" : "không rõ";
    return `Bản chạy thật (booking.tourdao.vn): phiên bản ${ban}; bảo trì: ${baoTri}.`;
  } catch (e) {
    return `Bản chạy thật: không lấy được (${e instanceof Error ? e.message : String(e)}).`;
  }
}

async function mucBanChinh(root) {
  const [m, o] = await Promise.all([git(root, ["rev-parse", "--verify", "-q", "main^{commit}"]), git(root, ["rev-parse", "--verify", "-q", "origin/main^{commit}"])]);
  if (!m && !o) return "Bản chính: không đọc được main / origin/main.";
  const ngan = (x) => (x ? x.slice(0, 8) : "không có");
  let so = "";
  if (m && o) {
    if (m === o) so = " — khớp";
    else {
      const lr = await git(root, ["rev-list", "--left-right", "--count", "main...origin/main"]);
      const [a, b] = (lr ?? "").split(/\s+/);
      so = lr ? ` — KHÔNG khớp (main đi trước ${a}, đi sau ${b})` : " — KHÔNG khớp";
    }
  }
  return `Bản chính: main ${ngan(m)}, origin/main ${ngan(o)}${so}. (Không tự git fetch: origin/main là lần lấy gần nhất.)`;
}

async function mucBanLamViec(root) {
  const ds = await git(root, ["worktree", "list", "--porcelain"]);
  if (ds === null) return "Bản làm việc riêng: không đọc được (git worktree list lỗi).";
  const duong = ds.split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.slice("worktree ".length));
  const trangThai = await Promise.all(duong.map((p) => git(p, ["status", "--porcelain"])));
  const chuaLuu = duong.filter((_, i) => trangThai[i] !== null && trangThai[i] !== "").map((p) => basename(p));
  const khongDoc = duong.filter((_, i) => trangThai[i] === null).length;
  const ten = chuaLuu.length > TOI_DA_TEN ? [...chuaLuu.slice(0, TOI_DA_TEN), `… và ${chuaLuu.length - TOI_DA_TEN} bản nữa`] : chuaLuu;
  return [
    `Bản làm việc riêng: ${duong.length} (kể cả thư mục gốc).`,
    chuaLuu.length ? `  còn phần chưa lưu (${chuaLuu.length}): ${ten.join(", ")}` : "  không bản nào còn phần chưa lưu.",
    ...(khongDoc ? [`  không đọc được trạng thái ${khongDoc} bản (thư mục đã mất hoặc git quá giờ).`] : []),
  ].join("\n");
}

function mucSoHan(root, now) {
  let so;
  try {
    so = JSON.parse(readFileSync(join(root, "docs/quyen-hoan.json"), "utf8"));
  } catch (e) {
    return `Sổ hạn (docs/quyen-hoan.json): không đọc được (${e instanceof Error ? e.message.slice(0, 120) : String(e)}).`;
  }
  const homNay = ngayVN(now);
  const tran = ngayVN(new Date(now.getTime() + SO_NGAY_HAN * 86400_000));
  const muc = [];
  for (const ds of Object.values(so ?? {})) {
    if (!Array.isArray(ds)) continue;
    for (const x of ds) {
      const han = typeof x?.han === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.han) ? x.han : null;
      if (!han || han > tran) continue;
      const ten = x.ma ?? (x.method && x.path ? `${x.method} ${x.path}` : (x.path ?? "mục không tên"));
      muc.push({ han, dong: `  - ${String(ten).slice(0, 120)} — hạn ${han}${han < homNay ? " (QUÁ HẠN)" : ""}` });
    }
  }
  muc.sort((a, b) => a.han.localeCompare(b.han));
  if (!muc.length) return `Sổ hạn (docs/quyen-hoan.json): không mục nào đến hạn trong ${SO_NGAY_HAN} ngày tới.`;
  return [`Sổ hạn (docs/quyen-hoan.json) — ${muc.length} mục đến hạn trong ${SO_NGAY_HAN} ngày tới hoặc đã quá hạn:`, ...muc.slice(0, 30).map((m) => m.dong), ...(muc.length > 30 ? [`  … và ${muc.length - 30} mục nữa`] : [])].join("\n");
}

/** Dựng trang trạng thái. `layCauHinh(url, tranMs)` tiêm được (bài kiểm dùng hàm giả, không gọi mạng thật). Không bao giờ ném. */
export async function taoTrangThai({ root, now = new Date(), layCauHinh = layCauHinhThat, tranMangMs = TRAN_MANG_MS } = {}) {
  const an = async (f, ten) => {
    try {
      return await f();
    } catch (e) {
      return `${ten}: không đọc được (${e instanceof Error ? e.message : String(e)}).`;
    }
  };
  const [mang, chinh, lamViec] = await Promise.all([an(() => mucBanChayThat(layCauHinh, tranMangMs), "Bản chạy thật"), an(() => mucBanChinh(root), "Bản chính"), an(() => mucBanLamViec(root), "Bản làm việc riêng")]);
  const han = await an(() => mucSoHan(root, now), "Sổ hạn");
  const vanBan = [
    `Trang trạng thái do máy sinh lúc ${gioVN(now)} (giờ Việt Nam), lúc mở phiên. Đây là ảnh chụp: trước việc chạm production vẫn kiểm lại bằng lệnh chỉ đọc.`,
    mang,
    chinh,
    lamViec,
    han,
  ].join("\n");
  return vanBan.length > TOI_DA_KY_TU ? `${vanBan.slice(0, TOI_DA_KY_TU)}\n… (cắt bớt cho dưới 10.000 ký tự)` : vanBan;
}
