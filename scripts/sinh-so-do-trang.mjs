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
//      - menu: bảng mục src/shared/muc-giao-dien.ts — THANH_TAB rồi THANH_BEN (nhãn theo đường trang); NHÓM menu (BÁN HÀNG / QUẢN TRỊ / QUẢN TRỊ › Vận chuyển /
//        TÔI) từ THANH_BEN. Dòng trang Tôi dựng từ TRANG_TOI (không phải chuỗi literal): nhãn chèn vào phần "dựng khi trang chạy" của /account ở chú thích
//        `// sinh-so-do-trang: nhãn các dòng TRANG_TOI…` của web/account.ts (CHEN_NHAN dưới đây) — trừ nhóm VẬN CHUYỂN (bộ dò cũ không bắt các dòng đó; giữ nguyên kho).
//   2. src/shared/tro-ly-cau-truc.ts — kho (d) cấu trúc app (lõi thuần scripts/tro-ly-cau-truc-lib.mjs): phân hệ + phụ thuộc (`ALLOWED_EDGES`), luồng chính,
//      vai → làm được / không làm được (`MATRIX` + `PERMISSION_CODES`), dịch qua bảng tên src/shared/tro-ly-cau-truc-ten.ts.
// Nhãn không đủ dạng (không chữ cái, < 2 hoặc > 60 ký tự, có `${`) thì bỏ (không phải nhãn). Nhãn / chữ ĐỦ dạng mà vi phạm luật nội dung (`viPhamChu`) hay bộ lọc
// tên kỹ thuật (`viPhamKyThuat`) ⇒ NÉM LỖI (ADR-0070 điều 5: không âm thầm bỏ). Thiếu tên lời thường ⇒ ném lỗi (điều 1).
// Không suy "vai nào thấy trang" từ menu — kho (d) nói vai làm được gì từ bản đồ quyền.
// Kết quả ổn định (theo thứ tự PAGES / thứ tự tệp) để bài "chạy lại ra đúng tệp" so được.
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { viPhamChu } from "../src/shared/huong-dan.ts";
import { THANH_BEN, THANH_TAB, TRANG, TRANG_TOI } from "../src/shared/muc-giao-dien.ts";
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

/** Menu (thanh tab điện thoại + thanh bên máy tính) từ bảng mục: đường trang → { nhãn (tab trước, thanh bên sau), nhóm thanh bên }. */
function docMenu() {
  const menu = new Map();
  const them = (trang, nhanMuc, nhom) => {
    const duong = TRANG[trang].duong;
    const o = menu.get(duong) ?? { nhan: [], nhom: [] };
    themNhan(o.nhan, nhanMuc, "src/shared/muc-giao-dien.ts (menu)");
    if (nhom && !o.nhom.includes(nhom)) o.nhom.push(nhom);
    menu.set(duong, o);
  };
  for (const c of THANH_TAB) them(c.trang, c.nhan, null);
  for (const c of THANH_BEN) them(c.trang, c.nhan, "cha" in c ? `${c.nhom} › ${c.cha}` : c.nhom);
  return menu;
}

/**
 * Nhãn dòng dựng từ bảng mục (không phải chuỗi literal nên `boCucTs` không thấy): chèn vào nguồn ở ĐÚNG chỗ chú thích đánh dấu, dưới dạng `h("a", null, "Nhãn")`,
 * để thứ tự "dựng khi trang chạy" như khi các dòng còn viết tay. Thiếu chú thích ⇒ NÉM (không âm thầm mất nhãn).
 */
const CHEN_NHAN = [
  { tep: "web/account.ts", dau: "// sinh-so-do-trang: nhãn các dòng TRANG_TOI", nhan: () => TRANG_TOI.filter((c) => c.phan !== "van-chuyen").map((c) => c.nhan) },
];
function chenNhan(tep, src) {
  let out = src;
  for (const c of CHEN_NHAN) {
    if (c.tep !== tep) continue;
    const i = out.indexOf(c.dau);
    if (i < 0) throw new Error(`Thiếu chú thích chỗ chèn "${c.dau}" ở ${tep} — bộ sinh cần nó để đặt nhãn dòng đúng thứ tự (sửa scripts/sinh-so-do-trang.mjs nếu đã dời).`);
    out = out.slice(0, i) + c.nhan().map((n) => `h("a", null, ${JSON.stringify(n)});\n`).join("") + out.slice(i);
  }
  return out;
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
  const menu = docMenu();
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
    const khiChay = existsSync(join(root, tepTs)) ? boCucTs(chenNhan(tepTs, doc(root, tepTs))) : { muc: [], nut: [] };
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
