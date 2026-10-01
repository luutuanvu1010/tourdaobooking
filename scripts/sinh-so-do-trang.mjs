// Sinh KHO TRI THỨC TỰ ĐỘNG cho trợ lý Hỗ trợ từ MÃ — không ai viết tay (ADR-0066 điều 3(c), ADR-0070 điều 1–3, 5). Chạy tự động:
//   - đầu `npm run build:web` (mà `wrangler deploy`, `wrangler dev` / `npm run dev`, e2e đều chạy qua khoá `build` của wrangler.jsonc — TRƯỚC khi đóng gói Worker);
//   - đầu `npm test` (scripts/chay-test.mjs — tệp sinh vừa đổi ⇒ vẫn chạy bài trên bản mới rồi thoát ≠ 0, nhắc commit).
// Chạy tay: `node scripts/sinh-so-do-trang.mjs`. Ghi HAI tệp (giữ trong git — lý do ở docs/superpowers/plans/2026-10-01-tro-ly-hieu-cau-truc-thi-cong.md):
//   1. src/shared/so-do-trang.ts — kho (c) sơ đồ trang + (e) bố cục trang:
//      - danh sách trang: `PAGES` của src/shared/sw-policy.ts (trừ /login và trang chỉ chuyển hướng không có script);
//      - tiêu đề trang: `<title>X — Island Booking System</title>` của public/<trang>.html (trang "/" là public/index.html);
//      - bố cục (e) theo THỨ TỰ TỆP: `<h2>`/`<h3>` mở một mục; `<button>`, `<a class="…btn…">` thuộc mục gần nhất phía trên; khối `form-actions` /
//        `vc-bottom-bar` mở mục "Thanh nút cuối trang". Phần dựng trong web/X.ts (`h("h2"|"h3"|"button"|"a", …, "Nhãn")`, chuỗi LITERAL) ghi riêng là
//        "dựng khi trang chạy": danh sách mục và danh sách nút, KHÔNG gán nút vào mục (thứ tự trong mã không phải vị trí trên màn hình);
//      - menu: `{ href, label }` của web/shell.ts; NHÓM menu (BÁN HÀNG / QUẢN TRỊ / QUẢN TRỊ › Vận chuyển / TÔI) đọc từ hàm `navGroups`.
//   2. src/shared/tro-ly-cau-truc.ts — kho (d) cấu trúc app (lõi thuần scripts/tro-ly-cau-truc-lib.mjs): phân hệ + phụ thuộc (`ALLOWED_EDGES`), luồng chính,
//      vai → làm được / không làm được (`MATRIX` + `PERMISSION_CODES`), dịch qua bảng tên src/shared/tro-ly-cau-truc-ten.ts.
// Nhãn không đủ dạng (không chữ cái, < 2 hoặc > 60 ký tự, có `${`) thì bỏ (không phải nhãn). Nhãn / chữ ĐỦ dạng mà vi phạm luật nội dung (`viPhamChu`) hay bộ lọc
// tên kỹ thuật (`viPhamKyThuat`) ⇒ NÉM LỖI (ADR-0070 điều 5: không âm thầm bỏ). Thiếu tên lời thường ⇒ ném lỗi (điều 1).
// Không suy "vai nào thấy trang" từ menu (menu dựng theo cờ quyền bằng mã thủ tục) — kho (d) nói vai làm được gì từ bản đồ quyền.
// Kết quả ổn định (theo thứ tự PAGES / thứ tự tệp) để bài "chạy lại ra đúng tệp" so được.
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { viPhamChu } from "../src/shared/huong-dan.ts";
import { MATRIX, PERMISSION_CODES, PERMISSION_LABEL } from "../src/shared/permissions.ts";
import { LUONG_CHINH, LY_DO_PHU_THUOC, O_HEP, TEN_PHAN_HE, TEN_THAO_TAC } from "../src/shared/tro-ly-cau-truc-ten.ts";
import { viPhamKyThuat } from "../src/shared/tro-ly-loc-ky-thuat.ts";
import { maskSource } from "./source-mask-lib.mjs";
import { docCanh, dungCauTruc, oDuocHoi, taoKiem } from "./tro-ly-cau-truc-lib.mjs";

const ROOT_MAC_DINH = fileURLToPath(new URL("..", import.meta.url));
export const DICH = "src/shared/so-do-trang.ts";
export const DICH_CAU_TRUC = "src/shared/tro-ly-cau-truc.ts";
export const THANH_CUOI = "Thanh nút cuối trang";

const kiem = taoKiem(viPhamChu, viPhamKyThuat);
const doc = (root, p) => readFileSync(join(root, p), "utf8");
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** Nhãn đủ dạng thì trả (sau khi qua kiểm nội dung — vi phạm ⇒ NÉM); không đủ dạng ⇒ null (không phải nhãn). */
function nhan(s, noi) {
  const t = s.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > 60 || t.includes("${") || !/\p{L}/u.test(t)) return null;
  return kiem(noi, t);
}

function themNhan(ds, s, noi) {
  const t = nhan(s, noi);
  if (t && !ds.includes(t)) ds.push(t);
}

/** Hằng đường dẫn `const TRANG_X = "/…"` hoặc `= ["/…", …]` (lấy phần tử đầu) trong một tệp. */
function hangDuongDan(src) {
  const out = new Map();
  for (const m of src.matchAll(/(?:export\s+)?const\s+(TRANG_[A-Z_]+)\s*(?::[^=]+)?=\s*"([^"]+)"/g)) out.set(m[1], m[2]);
  for (const m of src.matchAll(/(?:export\s+)?const\s+(TRANG_[A-Z_]+)\s*(?::[^=]+)?=\s*\[\s*(?:([A-Z_]+)|"([^"]+)")/g)) out.set(`${m[1]}[0]`, m[3] ?? m[2]);
  return out;
}

const RE_MUC_MENU = /\{\s*href:\s*(?:"([^"]*)"|`([^`$]*)[^`]*`|([A-Z_]+)(\[0\])?!?)\s*,\s*label:\s*"([^"]+)"/g;

/** Menu (thanh bên máy tính + thanh tab điện thoại) của web/shell.ts: đường dẫn → { nhãn, nhóm }. Nhóm chỉ từ `navGroups` (thanh bên). */
function docMenu(root) {
  const shell = boChuThich(doc(root, "web/shell.ts"));
  const hang = new Map([...hangDuongDan(doc(root, "src/shared/start-page.ts")), ...hangDuongDan(shell)]);
  for (const [k, v] of hang) if (hang.has(v)) hang.set(k, hang.get(v));
  const giai = (m) => {
    const d = m[1] ?? m[2] ?? (m[3] ? hang.get(m[4] ? `${m[3]}[0]` : m[3]) : undefined);
    return d ? d.split("?")[0] : undefined;
  };

  // Nhóm thanh bên: thân hàm navGroups; biến mảng → tiêu đề nhóm đọc từ `{ title: "…", items: <biến> }`.
  const iNav = shell.indexOf("function navGroups(");
  const iReturn = iNav < 0 ? -1 : shell.indexOf("return [", iNav);
  const iHet = iReturn < 0 ? -1 : shell.indexOf("];", iReturn);
  if (iNav < 0 || iReturn < 0 || iHet < 0) throw new Error("Không đọc được hàm navGroups ở web/shell.ts — bộ sinh cần nó để biết trang ở nhóm menu nào (sửa scripts/sinh-so-do-trang.mjs).");
  const tieuDeNhom = new Map([...shell.slice(iReturn, iHet).matchAll(/\{\s*title:\s*"([^"]+)"\s*,\s*items:\s*([A-Za-z]+)\s*\}/g)].map((m) => [m[2], m[1]]));
  const khai = [...shell.slice(iNav, iReturn).matchAll(/const\s+([A-Za-z]+)\s*:\s*NavItem\[\]/g)].map((m) => ({ bien: m[1], vt: iNav + m.index }));
  if (!khai.length || khai.some((k) => !tieuDeNhom.has(k.bien))) throw new Error("Không khớp được nhóm menu (biến NavItem[] ↔ title) trong navGroups ở web/shell.ts.");

  const menu = new Map();
  let cha = null;
  for (const m of shell.matchAll(RE_MUC_MENU)) {
    const nhanMuc = m[5];
    const duoiMuc = shell.slice(m.index, shell.indexOf("}", m.index + m[0].length) + 1);
    let nhom = null;
    if (m.index > iNav && m.index < iReturn) {
      const k = khai.filter((x) => x.vt < m.index).at(-1);
      if (k) {
        nhom = tieuDeNhom.get(k.bien);
        if (/kind:\s*"parent"/.test(duoiMuc)) cha = nhanMuc;
        else if (/kind:\s*"sub"/.test(duoiMuc) && cha) nhom = `${nhom} › ${cha}`;
      }
    }
    const duong = giai(m);
    if (!duong) continue; // mục cha "Vận chuyển" (href rỗng) hoặc hằng không giải được: bỏ, không đoán
    const o = menu.get(duong) ?? { nhan: [], nhom: [] };
    themNhan(o.nhan, nhanMuc, "web/shell.ts (menu)");
    if (nhom && !o.nhom.includes(nhom)) o.nhom.push(nhom);
    menu.set(duong, o);
  }
  return menu;
}

/** Bố cục (e) từ HTML tĩnh — thứ tự tệp. Thuần theo chuỗi vào (dùng được trong bài kiểm). */
export function boCucHtml(html) {
  const s = html.replace(/<!--[\s\S]*?-->/g, "");
  const out = [];
  let muc = null;
  const moMuc = (ten) => {
    muc = { muc: ten, nut: [] };
    out.push(muc);
  };
  const re = /<(h[1-3])\b[^>]*>([^<]*)<\/\1>|<button\b[^>]*>([^<]+)<\/button>|<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>([^<]+)<\/a>|class="[^"]*\b(?:form-actions|vc-bottom-bar)\b/g;
  for (const m of s.matchAll(re)) {
    if (m[1]) {
      if (m[1] === "h1") continue; // tiêu đề trang
      const t = nhan(m[2], "tiêu đề mục (HTML)");
      if (t) moMuc(t);
    } else if (m[3] ?? m[4]) {
      if (!muc) moMuc("Đầu trang");
      themNhan(muc.nut, m[3] ?? m[4], "nút (HTML)");
    } else moMuc(THANH_CUOI);
  }
  return out;
}

/**
 * Phần dựng trong web/X.ts: tiêu đề mục và nút theo thứ tự trong mã, HAI danh sách riêng. KHÔNG gán nút vào mục: thứ tự trong mã không phải vị trí
 * trên màn hình (hàm dựng rời, hộp thoại) — gán đoán sẽ cho trợ lý nói sai chỗ một cách tự tin (thử 1/10: "Sửa thông tin chuyến" rơi vào mục Lịch sử).
 */
export function boCucTs(src) {
  const s = boChuThich(src);
  const out = { muc: [], nut: [] };
  const re = /h\(\s*"(button|a|h2|h3)"\s*,\s*(?:\{[^{}]*\}|null)\s*,\s*(?:"([^"\n]+)"|'([^'\n]+)')/g;
  for (const m of s.matchAll(re)) {
    const chu = m[2] ?? m[3];
    if (m[1] === "h2" || m[1] === "h3") themNhan(out.muc, chu, "tiêu đề mục (web)");
    else themNhan(out.nut, chu, "nút (web)");
  }
  return out;
}

/** Dựng mảng sơ đồ trang (thuần theo nội dung tệp — hai lần chạy trên cùng mã cho cùng kết quả). */
export function dungSoDo(root = ROOT_MAC_DINH) {
  const sw = doc(root, "src/shared/sw-policy.ts");
  const pages = [...(/export const PAGES[^=]*=\s*\[([^\]]*)\]/.exec(sw)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (!pages.length) throw new Error("Không đọc được PAGES ở src/shared/sw-policy.ts.");
  const menu = docMenu(root);
  const out = [];
  for (const duongDan of pages) {
    if (duongDan === "/login") continue; // trợ lý chỉ mở sau đăng nhập
    const tepHtml = `public/${duongDan === "/" ? "index" : duongDan.slice(1)}.html`;
    if (!existsSync(join(root, tepHtml))) continue;
    const html = doc(root, tepHtml);
    const script = /<script[^>]*type="module"[^>]*src="\/js\/([A-Za-z0-9_-]+)\.js"/.exec(html)?.[1];
    if (!script) continue; // trang chỉ chuyển hướng (không JS)
    const tieuDe = nhan(/<title>([^<]*?)\s+—\s+Island Booking System<\/title>/.exec(html)?.[1]?.trim() ?? "", `tiêu đề ${tepHtml}`) ?? "";
    const boCuc = boCucHtml(html);
    const tepTs = `web/${script}.ts`;
    const khiChay = existsSync(join(root, tepTs)) ? boCucTs(doc(root, tepTs)) : { muc: [], nut: [] };
    // (c) danh sách phẳng như cũ: tiêu đề mục + nút của HTML (theo thứ tự), rồi của web/X.ts.
    const nut = [];
    const hTieuDe = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(h[1-3])\b[^>]*>([^<]+)<\/\1>/g)].map((m) => m[2]);
    for (const n of hTieuDe) themNhan(nut, n, tepHtml);
    for (const m of boCuc) for (const n of m.nut) if (!nut.includes(n)) nut.push(n);
    for (const n of [...khiChay.muc, ...khiChay.nut]) if (!nut.includes(n)) nut.push(n);
    const mn = menu.get(duongDan);
    out.push({ duongDan, tieuDe, menu: mn?.nhan ?? [], nhomMenu: mn?.nhom ?? [], nut, boCuc, khiChay });
  }
  return out;
}

function tepModule(root) {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(join(root, d)).sort()) {
      const p = `${d}/${f}`;
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(doc(root, p));
    }
  };
  walk("src/modules");
  return out;
}

/** Dữ liệu vào của lõi `dungCauTruc` đọc từ repo (bài kiểm dùng để thay một phần rồi gọi lõi). */
export function dungDauVaoCauTruc(root = ROOT_MAC_DINH) {
  const thuMucModule = readdirSync(join(root, "src/modules")).filter((f) => statSync(join(root, "src/modules", f)).isDirectory()).sort();
  const ops = Object.keys(MATRIX);
  return {
    thuMucModule,
    canh: docCanh(doc(root, "src/architecture.test.ts")),
    maTran: MATRIX,
    duocHoi: oDuocHoi(tepModule(root), ops, maskSource),
    maQuyen: [...PERMISSION_CODES],
    nhanQuyen: PERMISSION_LABEL,
    ten: { phanHe: TEN_PHAN_HE, thaoTac: TEN_THAO_TAC, lyDo: LY_DO_PHU_THUOC, luong: LUONG_CHINH, oHep: O_HEP },
    trang: dungSoDo(root),
    kiem,
  };
}

const DAU = "// TỆP SINH TỰ ĐỘNG — KHÔNG SỬA TAY. Sinh lại: `node scripts/sinh-so-do-trang.mjs` (tự chạy ở đầu `npm run build:web` và `npm test`).";

export function sinhTep(root = ROOT_MAC_DINH) {
  const dong = dungSoDo(root).map((t) => `  ${JSON.stringify(t)},`).join("\n");
  return `${DAU}
// Sơ đồ trang cho trợ lý Hỗ trợ (ADR-0066 điều 3(c)) + bố cục trang (ADR-0070 điều 2): đường dẫn, tiêu đề, nhãn / nhóm menu, nhãn nút, mục theo thứ tự.
// Chỉ nhãn chữ, không mã, không dữ liệu, không màu, không ảnh. Không có cột "vai thấy trang" — kho cấu trúc app (tro-ly-cau-truc.ts) nói vai làm được gì.

export interface MucBoCuc {
  /** Tiêu đề mục (h2/h3), "Đầu trang" (nút đứng trước mọi tiêu đề) hoặc "Thanh nút cuối trang". */
  readonly muc: string;
  readonly nut: readonly string[];
}

export interface TrangSoDo {
  readonly duongDan: string;
  readonly tieuDe: string;
  /** Nhãn của mục menu trỏ tới trang (thanh bên / thanh tab); rỗng = mở từ trang khác. */
  readonly menu: readonly string[];
  /** Nhóm của thanh bên máy tính (BÁN HÀNG, QUẢN TRỊ, "QUẢN TRỊ › Vận chuyển", TÔI). */
  readonly nhomMenu: readonly string[];
  /** Nhãn nút, liên kết dạng nút, tiêu đề mục trên trang (danh sách phẳng — kho c). */
  readonly nut: readonly string[];
  /** Bố cục tĩnh theo thứ tự trên trang (kho e). */
  readonly boCuc: readonly MucBoCuc[];
  /** Mục và nút dựng khi trang chạy (web/X.ts), theo thứ tự trong mã — HAI danh sách, không gán nút vào mục (vị trí thật không suy được từ mã). */
  readonly khiChay: { readonly muc: readonly string[]; readonly nut: readonly string[] };
}

export const SO_DO_TRANG: readonly TrangSoDo[] = [
${dong}
];
`;
}

export function sinhTepCauTruc(root = ROOT_MAC_DINH) {
  const dong = dungCauTruc(dungDauVaoCauTruc(root)).map((d) => `  ${JSON.stringify(d)},`).join("\n");
  return `${DAU}
// Kho (d) "cấu trúc app" cho trợ lý Hỗ trợ (ADR-0070 điều 1): phân hệ + phụ thuộc, luồng chính, vai làm được / không làm được, ai làm được từng việc — dịch
// từ ALLOWED_EDGES + MATRIX qua bảng tên lời thường src/shared/tro-ly-cau-truc-ten.ts. Đã qua viPhamChu + viPhamKyThuat lúc sinh.
import type { PermissionCode } from "./permissions.ts";

export interface DoanCauTruc {
  readonly tieuDe: string;
  /** Rỗng = cho mọi người; khác rỗng = đoạn của vai này (ưu tiên khi người hỏi có quyền đó). */
  readonly quyen: readonly PermissionCode[];
  readonly noiDung: string;
}

export const CAU_TRUC: readonly DoanCauTruc[] = [
${dong}
];
`;
}

/** Ghi khi nội dung KHÁC (ghi tạm rồi đổi tên — nhiều máy chủ e2e cùng build không đọc phải tệp dở; wrangler không nạp lại vô cớ). Trả true nếu đã ghi. */
export function ghiNeuKhac(duong, noiDung) {
  if (existsSync(duong) && readFileSync(duong, "utf8") === noiDung) return false;
  const tam = `${duong}.${process.pid}.tam`;
  writeFileSync(tam, noiDung);
  renameSync(tam, duong);
  return true;
}

/** Sinh cả hai tệp; trả danh sách tệp vừa ĐỔI (rỗng = đã khớp mã). Lỗi (thiếu tên, vi phạm bộ lọc) ⇒ ném, không ghi tệp nào. */
export function ghiTatCa(root = ROOT_MAC_DINH) {
  const noiDung = [[DICH, sinhTep(root)], [DICH_CAU_TRUC, sinhTepCauTruc(root)]];
  return noiDung.filter(([p, s]) => ghiNeuKhac(join(root, p), s)).map(([p]) => p);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const doi = ghiTatCa();
    console.log(doi.length ? `Kho trợ lý: đã sinh lại ${doi.join(", ")} (nhớ commit).` : "Kho trợ lý: khớp mã, không đổi.");
  } catch (e) {
    console.error(`✘ Bộ sinh kho trợ lý lỗi: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
