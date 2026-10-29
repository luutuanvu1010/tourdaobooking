// 7c (LO-TRINH bước 6, 29/10/2026): bộ «Island Booking System — Design System v2» là TẤM GƯƠNG của mã — `public/app.css` `:root` là nguồn.
// So bản chụp `tokens.json` trong kho với `:root`: mỗi token của bộ phải có biến `--<tên>` cùng giá trị THẬT (giải hết `var()`, rem → px,
// `max()`/`min()` của các số px). Token không có trong mã chỉ được phép khi lời dùng có "Ngoài mã: <lý do>" (mốc @media, token chưa dùng…).
// Chiều ngược: mọi `var(--x)` trong `components/bundle.css` và các `preview.html` phải là token của bộ (trang bộ chỉ sinh `tokens.css` từ `tokens.json`;
// thiếu thì bản xem trước hỏng mà không ai thấy) — trừ `--font-<họ>` do trang sinh từ `type.families`; mọi token MỚI của đợt 0 (bảng `MOI` của
// `src/token-dot-0.test.ts`) phải có trong bộ; phần "CHÉP TỪ MÃ" của bundle phải giống từng ký tự với `public/app.css` (`scripts/sinh-bundle-bo-v2.mjs`).
// Không mạng, chỉ đọc tệp. Chạy tay: `node scripts/so-bo-v2-voi-ma.mjs` (in từng lệch, thoát 1 nếu có lệch không lý do).
// Bài `src/bo-v2-khop-ma.test.ts` gọi `soBoVoiMa()` trong `npm test`.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { phanChepTrongBundle, phanChepTuMa } from "./sinh-bundle-bo-v2.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TEP_BO = "docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/tokens.json";
export const TEP_CSS = "public/app.css";
const THU_MUC_THANH_PHAN = "docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/components";
const TEP_TOKEN_DOT_0 = "src/token-dot-0.test.ts";
const DAU_NGOAI_MA = "Ngoài mã:";

/** Biến của khối `:root` đầu tiên (cùng cách đọc của `src/token-dot-0.test.ts`). */
export function docRoot(css) {
  const dau = css.indexOf(":root");
  const khoi = css.slice(dau, css.indexOf("\n}", dau)).replace(/\/\*[\s\S]*?\*\//g, "");
  return new Map([...khoi.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const soPx = (s) => {
  const m = /^(-?[\d.]+)(px|rem)$/.exec(s);
  return m ? Number(m[1]) * (m[2] === "rem" ? 16 : 1) : null;
};

/** Chuẩn hoá một giá trị đã giải: chữ thường, khoảng trắng gọn, rem → px, max/min/calc đơn giản của px. */
export function chuanHoa(gt) {
  let s = String(gt).trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  s = s.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${+(Number(n) * 16).toFixed(4)}px`);
  s = s.replace(/(^|[\s(,])0?\.(\d)/g, "$10.$2");
  for (let i = 0; i < 5; i++) {
    const truoc = s;
    s = s.replace(/\b(max|min)\(([^()]*)\)/g, (toan, ham, than) => {
      const so = than.split(",").map((x) => soPx(x.trim()));
      if (so.some((x) => x === null)) return toan;
      return `${+(ham === "max" ? Math.max(...so) : Math.min(...so)).toFixed(4)}px`;
    });
    s = s.replace(/\bcalc\((-?[\d.]+) ([-+*/]) (-?[\d.]+)\)/g, (_, a, op, b) => String(+({ "+": +a + +b, "-": a - b, "*": a * b, "/": a / b })[op].toFixed(4)));
    s = s.replace(/\bcalc\((-?[\d.]+px) ([*/]) (-?[\d.]+)\)/g, (_, a, op, b) => `${+(op === "*" ? soPx(a) * Number(b) : soPx(a) / Number(b)).toFixed(4)}px`);
    if (s === truoc) break;
  }
  s = s.replace(/\b(max|min)\(([^()]*)\)/g, (toan, ham, than) => {
    const so = than.split(",").map((x) => x.trim());
    return so.every((x) => /^-?[\d.]+$/.test(x)) ? String(ham === "max" ? Math.max(...so.map(Number)) : Math.min(...so.map(Number))) : toan;
  });
  return s.replace(/(\d\.\d*?)0+(?=\D|$)/g, "$1").replace(/(\d)\.(?=\D|$)/g, "$1");
}

/** Giải `var(--x[, dự phòng])` theo bảng biến cho tới hết. */
export function giai(gt, bang, sau = 0) {
  if (sau > 20) throw new Error(`vòng var() quá sâu: ${gt}`);
  const moi = gt.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, ten, duPhong) => {
    if (bang.has(ten)) return giai(bang.get(ten), bang, sau + 1);
    return duPhong !== undefined ? duPhong.trim() : `var(${ten})`;
  });
  return moi;
}

/** Mọi token của bộ (các họ dạng `{tokens:[…]}`, trừ `type`), kèm họ. */
export function tokenCuaBo(bo) {
  const ra = [];
  for (const [ho, v] of Object.entries(bo)) {
    if (ho === "type" || !v || !Array.isArray(v.tokens)) continue;
    for (const t of v.tokens) ra.push({ ho, ...t });
  }
  return ra;
}

/** Giá trị token của bộ (giải bí danh `{tên}` trong bộ; giá trị theo chủ đề lấy chủ đề đầu). */
function giaTriBo(t, theoTen, sau = 0) {
  let v = t.value;
  if (v && typeof v === "object") v = Object.values(v)[0];
  v = String(v);
  const bd = /^\{([\w.-]+)\}$/.exec(v);
  if (bd && theoTen.has(bd[1]) && sau < 10) return giaTriBo(theoTen.get(bd[1]), theoTen, sau + 1);
  return v;
}

/**
 * So bộ với mã. Trả { lech, ngoaiMa, chiCoTrongMa, soToken } — `lech`: tên/giá trị khác không lý do (mục tiêu 0);
 * `ngoaiMa`: token bộ không có trong mã, có lý do; `chiCoTrongMa`: biến `:root` không vào bộ (chỉ để tham khảo, bộ chọn token dùng chung).
 */
export function soBoVoiMa(root = ROOT) {
  const bo = JSON.parse(readFileSync(join(root, TEP_BO), "utf8"));
  const bang = docRoot(readFileSync(join(root, TEP_CSS), "utf8"));
  const ds = tokenCuaBo(bo);
  const theoTen = new Map(ds.map((t) => [t.name, t]));
  const lech = [];
  const ngoaiMa = [];
  const trungTen = ds.filter((t, i) => ds.findIndex((u) => u.name === t.name) !== i);
  for (const t of trungTen) lech.push({ ten: t.name, ho: t.ho, loai: "trùng tên trong bộ" });
  for (const t of ds) {
    const bien = `--${t.name}`;
    const viTri = String(t.usage ?? "").indexOf(DAU_NGOAI_MA);
    if (!bang.has(bien)) {
      if (viTri >= 0) ngoaiMa.push({ ten: t.name, ho: t.ho, lyDo: t.usage.slice(viTri + DAU_NGOAI_MA.length).trim() });
      else lech.push({ ten: t.name, ho: t.ho, loai: "không có trong :root", bo: giaTriBo(t, theoTen) });
      continue;
    }
    const ma = chuanHoa(giai(bang.get(bien), bang));
    const cuaBo = chuanHoa(giaTriBo(t, theoTen));
    if (ma !== cuaBo) lech.push({ ten: t.name, ho: t.ho, loai: "khác giá trị", bo: cuaBo, ma });
    else if (viTri >= 0) lech.push({ ten: t.name, ho: t.ho, loai: `ghi "${DAU_NGOAI_MA}" nhưng có trong :root` });
  }
  const chiCoTrongMa = [...bang.keys()].filter((b) => !theoTen.has(b.slice(2)));

  // Chiều ngược: biến mà bundle và bản xem trước dùng phải là token của bộ.
  const hoPhong = new Set(Object.keys(bo.type?.families ?? {}).map((k) => `font-${k}`));
  const tepXem = [join(THU_MUC_THANH_PHAN, "bundle.css")];
  for (const ten of readdirSync(join(root, THU_MUC_THANH_PHAN))) {
    const xem = join(THU_MUC_THANH_PHAN, ten, "preview.html");
    if (existsSync(join(root, xem))) tepXem.push(xem);
  }
  for (const tep of tepXem) {
    const chu = readFileSync(join(root, tep), "utf8");
    const tuKhai = new Set([...chu.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1].slice(2)));
    const dung = new Set([...chu.matchAll(/var\(\s*--([\w-]+)/g)].map((m) => m[1]));
    for (const ten of dung) if (!theoTen.has(ten) && !hoPhong.has(ten) && !tuKhai.has(ten)) lech.push({ ten, ho: tep.split("/").slice(-2).join("/"), loai: "dùng trong bộ nhưng không phải token của bộ" });
  }

  // Token MỚI của đợt 0 (bảng MOI của bài token-dot-0) phải có trong bộ.
  const dot0 = readFileSync(join(root, TEP_TOKEN_DOT_0), "utf8");
  const khoiMoi = /const MOI[^{]*\{([\s\S]*?)\n\};/.exec(dot0);
  if (!khoiMoi) lech.push({ ten: "MOI", ho: TEP_TOKEN_DOT_0, loai: "không đọc được bảng MOI" });
  else for (const m of khoiMoi[1].matchAll(/"--([\w-]+)"\s*:/g)) if (!theoTen.has(m[1])) lech.push({ ten: m[1], ho: "đợt 0", loai: "token MỚI của đợt 0 chưa có trong bộ" });

  // Phần CHÉP TỪ MÃ của bundle giống từng ký tự với app.css.
  const bundle = readFileSync(join(root, THU_MUC_THANH_PHAN, "bundle.css"), "utf8");
  const chep = phanChepTrongBundle(bundle);
  if (chep === null) lech.push({ ten: "bundle.css", ho: "thành phần", loai: "thiếu cặp dấu CHÉP TỪ MÃ" });
  else if (chep !== phanChepTuMa(readFileSync(join(root, TEP_CSS), "utf8"))) lech.push({ ten: "bundle.css", ho: "thành phần", loai: "phần CHÉP TỪ MÃ khác public/app.css — chạy node scripts/sinh-bundle-bo-v2.mjs" });

  return { lech, ngoaiMa, chiCoTrongMa, soToken: ds.length, soBienRoot: bang.size };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const kq = soBoVoiMa();
  console.log(`Bộ v2: ${kq.soToken} token · :root: ${kq.soBienRoot} biến · biến chỉ có trong mã (không vào bộ): ${kq.chiCoTrongMa.length}`);
  for (const n of kq.ngoaiMa) console.log(`  · ngoài mã có lý do  ${n.ten} (${n.ho}) — ${n.lyDo}`);
  for (const l of kq.lech) console.log(`  ✘ ${l.loai}  ${l.ten} (${l.ho})${l.bo !== undefined ? `  bộ: ${l.bo}` : ""}${l.ma !== undefined ? `  mã: ${l.ma}` : ""}`);
  if (process.argv.includes("--chi-trong-ma")) console.log(kq.chiCoTrongMa.join(" "));
  console.log(kq.lech.length ? `✘ ${kq.lech.length} lệch không lý do` : "✔ 0 lệch không lý do");
  process.exit(kq.lech.length ? 1 : 0);
}
