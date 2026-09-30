// Sinh SƠ ĐỒ TRANG cho trợ lý Hỗ trợ (ADR-0066 điều 3(c)) từ MÃ, lúc build — không ai viết tay: `node scripts/sinh-so-do-trang.mjs` → src/shared/so-do-trang.ts.
// Chỉ lấy NHÃN CHỮ tiếng Việt + đường dẫn trang; không mã, không cấu hình, không dữ liệu. Nguồn đọc (tĩnh, bằng biểu thức chính quy — không chạy mã):
//   - danh sách trang: `PAGES` của src/shared/sw-policy.ts (trừ /login và trang chỉ chuyển hướng không có script);
//   - tiêu đề trang: `<title>X — Island Booking System</title>` của public/<trang>.html (trang "/" là public/index.html);
//   - script của trang: `<script type="module" src="/js/X.js">` → web/X.ts;
//   - nút / tiêu đề mục: chuỗi LITERAL trong `h("button"|"a"|"h2"|"h3", {…}|null, "Nhãn")` của web/X.ts và `<button>`, `<h1-3>`, `<a class="…btn…">` của HTML;
//   - menu: đối tượng literal `{ href: …, label: "…" }` của web/shell.ts (href là chuỗi, hằng `TRANG_*` hoặc `TRANG_*[0]!` giải từ shell.ts / src/shared/start-page.ts).
// KHÔNG suy "vai nào thấy trang" (menu dựng theo cờ quyền bằng mã thủ tục — đoán sai còn tệ hơn bỏ trống; ADR-0066 thi công, người điều phối dặn "không đoán").
// Nhãn phải: có chữ cái, 2–60 ký tự, không `${`, và qua luật nội dung `viPhamChu` (không số tiền / chuỗi giống SĐT / email) — nhãn không qua thì BỎ.
// Kết quả sắp xếp ổn định (theo thứ tự PAGES; nhãn theo thứ tự xuất hiện, bỏ trùng) để `src/shared/tro-ly.test.ts` so "chạy lại ra đúng tệp" như `npm run dict`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT_MAC_DINH = fileURLToPath(new URL("..", import.meta.url));
export const DICH = "src/shared/so-do-trang.ts";

const doc = (root, p) => readFileSync(join(root, p), "utf8");
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

function nhanHopLe(s, viPhamChu) {
  const t = s.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > 60 || t.includes("${") || !/\p{L}/u.test(t)) return null;
  if (viPhamChu(t)) return null;
  return t;
}

function themNhan(ds, s, viPhamChu) {
  const t = nhanHopLe(s, viPhamChu);
  if (t && !ds.includes(t)) ds.push(t);
}

/** Hằng đường dẫn `const TRANG_X = "/…"` hoặc `= ["/…", …]` (lấy phần tử đầu) trong một tệp. */
function hangDuongDan(src) {
  const out = new Map();
  for (const m of src.matchAll(/(?:export\s+)?const\s+(TRANG_[A-Z_]+)\s*(?::[^=]+)?=\s*"([^"]+)"/g)) out.set(m[1], m[2]);
  for (const m of src.matchAll(/(?:export\s+)?const\s+(TRANG_[A-Z_]+)\s*(?::[^=]+)?=\s*\[\s*(?:([A-Z_]+)|"([^"]+)")/g)) out.set(`${m[1]}[0]`, m[3] ?? m[2]);
  return out;
}

/** Menu (thanh bên máy tính + thanh tab điện thoại) của web/shell.ts: đường dẫn → các nhãn. */
function docMenu(root, viPhamChu) {
  const shell = boChuThich(doc(root, "web/shell.ts"));
  const hang = new Map([...hangDuongDan(doc(root, "src/shared/start-page.ts")), ...hangDuongDan(shell)]);
  // Phần tử mảng là tên hằng khác (vd `[TRANG_CUOC, "/cuoc-chuyen"]`) → giải tiếp.
  for (const [k, v] of hang) if (hang.has(v)) hang.set(k, hang.get(v));
  const menu = new Map();
  for (const m of shell.matchAll(/\{\s*href:\s*(?:"([^"]*)"|`([^`$]*)[^`]*`|([A-Z_]+)(\[0\])?!?)\s*,\s*label:\s*"([^"]+)"/g)) {
    let duong = m[1] ?? m[2] ?? (m[3] ? hang.get(m[4] ? `${m[3]}[0]` : m[3]) : undefined);
    if (!duong) continue; // mục cha "Vận chuyển" (href rỗng) hoặc hằng không giải được: bỏ, không đoán
    duong = duong.split("?")[0];
    const ds = menu.get(duong) ?? [];
    themNhan(ds, m[5], viPhamChu);
    menu.set(duong, ds);
  }
  return menu;
}

function nhanTrongTs(src, viPhamChu) {
  const ds = [];
  const s = boChuThich(src);
  const re = /h\(\s*"(button|a|h2|h3)"\s*,\s*(?:\{[^{}]*\}|null)\s*,\s*(?:"([^"\n]+)"|'([^'\n]+)')/g;
  for (const m of s.matchAll(re)) themNhan(ds, m[2] ?? m[3], viPhamChu);
  return ds;
}

function nhanTrongHtml(html, viPhamChu) {
  const ds = [];
  const s = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of s.matchAll(/<(h[1-3])\b[^>]*>([^<]+)<\/\1>/g)) themNhan(ds, m[2], viPhamChu);
  for (const m of s.matchAll(/<button\b[^>]*>([^<]+)<\/button>/g)) themNhan(ds, m[1], viPhamChu);
  for (const m of s.matchAll(/<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>([^<]+)<\/a>/g)) themNhan(ds, m[1], viPhamChu);
  return ds;
}

/** Dựng mảng sơ đồ trang (thuần theo nội dung tệp — hai lần chạy trên cùng mã cho cùng kết quả). */
export async function dungSoDo(root = ROOT_MAC_DINH) {
  const { viPhamChu } = await import(pathToFileURL(join(root, "src/shared/huong-dan.ts")).href);
  const sw = doc(root, "src/shared/sw-policy.ts");
  const pages = [...(/export const PAGES[^=]*=\s*\[([^\]]*)\]/.exec(sw)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const menu = docMenu(root, viPhamChu);
  const out = [];
  for (const duongDan of pages) {
    if (duongDan === "/login") continue; // trợ lý chỉ mở sau đăng nhập
    const tepHtml = `public/${duongDan === "/" ? "index" : duongDan.slice(1)}.html`;
    if (!existsSync(join(root, tepHtml))) continue;
    const html = doc(root, tepHtml);
    const script = /<script[^>]*type="module"[^>]*src="\/js\/([A-Za-z0-9_-]+)\.js"/.exec(html)?.[1];
    if (!script) continue; // trang chỉ chuyển hướng (không JS)
    const tieuDe = /<title>([^<]*?)\s+—\s+Island Booking System<\/title>/.exec(html)?.[1]?.trim() ?? "";
    const nut = nhanTrongHtml(html, viPhamChu);
    const tepTs = `web/${script}.ts`;
    if (existsSync(join(root, tepTs))) for (const n of nhanTrongTs(doc(root, tepTs), viPhamChu)) if (!nut.includes(n)) nut.push(n);
    out.push({ duongDan, tieuDe: nhanHopLe(tieuDe, viPhamChu) ?? "", menu: menu.get(duongDan) ?? [], nut });
  }
  return out;
}

export async function sinhTep(root = ROOT_MAC_DINH) {
  const soDo = await dungSoDo(root);
  const dong = soDo.map((t) => `  ${JSON.stringify(t)},`).join("\n");
  return `// TỆP SINH TỰ ĐỘNG — KHÔNG SỬA TAY. Sinh lại: \`node scripts/sinh-so-do-trang.mjs\` (src/shared/tro-ly.test.ts đỏ nếu lệch mã).
// Sơ đồ trang cho trợ lý Hỗ trợ (ADR-0066 điều 3(c)): đường dẫn, tiêu đề, nhãn menu, nhãn nút / mục đọc từ mã giao diện. Chỉ nhãn chữ, không mã, không dữ liệu.
// Không có cột "vai thấy trang": menu dựng theo quyền bằng mã thủ tục, không suy chắc chắn được bằng đọc tĩnh — trợ lý dựa vào hướng dẫn theo vai cho việc đó.

export interface TrangSoDo {
  readonly duongDan: string;
  readonly tieuDe: string;
  /** Nhãn của mục menu trỏ tới trang (thanh bên / thanh tab); rỗng = mở từ trang khác. */
  readonly menu: readonly string[];
  /** Nhãn nút, liên kết dạng nút, tiêu đề mục trên trang. */
  readonly nut: readonly string[];
}

export const SO_DO_TRANG: readonly TrangSoDo[] = [
${dong}
];
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeFileSync(join(ROOT_MAC_DINH, DICH), await sinhTep());
  console.log(`Đã ghi ${DICH}`);
}
