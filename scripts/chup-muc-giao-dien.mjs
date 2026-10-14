// CHỤP "MỤC HIỆN" TỪ MÃ GIAO DIỆN THẬT trên DOM GIẢ — đủ 1024 tập con của PERMISSION_CODES; không mạng, không trình duyệt, không D1.
// Bước K-c của sổ đại lý đợt 1 (rào "mục hiện ⇔ trang mở được"): ghi ảnh chụp mã CŨ TRƯỚC khi gom khai báo mục về src/shared/muc-giao-dien.ts, rồi đối chiếu
// mã MỚI với mã cũ. Chạy CHÍNH web/account.ts (kéo theo initShell của web/shell.ts: thanh bên, thanh tab, thanh trên) và src/shared/trang-chu-o.ts (ô Trang chủ),
// không chép lại điều kiện nào — điều kiện chính là thứ đang được dời đi.
//
//   node scripts/chup-muc-giao-dien.mjs --ghi src/muc-giao-dien-hien-trang.json [--rev <mã lần lưu>]
//       ghi ảnh chụp mục hiện (bài src/muc-giao-dien-hien-trang.test.ts đọc) từ cây làm việc, hoặc từ nguồn ở <mã lần lưu> (`git show`, không đụng cây làm việc).
//   node scripts/chup-muc-giao-dien.mjs --so-sanh <mã lần lưu>
//       dựng DOM bằng mã ở <mã lần lưu> và bằng cây làm việc, so TỪNG PHẦN TỬ (thẻ, lớp, href, chữ, biểu tượng, aria-current, huy hiệu): khung thật 1024 tập,
//       khung tạm từ bản nhớ khung (ADR-0035) 1024 tập, khung mất mạng, chữ thanh trên + mục đang sáng ở mọi trang của PAGES (3 tài khoản), ô Trang chủ 1024 tập.
//
// DOM giả chỉ đủ cho đường chạy của hai tệp này (createElement, append/prepend/before/after, dataset, querySelectorAll đơn giản). Mô-đun web/ ngoài danh sách
// THAT được thay bằng bản rỗng tự sinh (mỗi hàm trả lời hứa không bao giờ xong) — chúng là mạng/Bảng tin/trợ lý, không quyết mục nào hiện. web/api.ts thay riêng:
// chỉ `/api/auth/me` trả lời (theo kịch bản của lần chạy), mọi đường khác treo.
// Giới hạn: không chạy CSS (thanh bên ở điện thoại vẫn trong DOM — đúng như thật), không nạp huy hiệu (offsetParent null như điện thoại), không bấm nút.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { PERMISSION_CODES } from "../src/shared/permissions.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/** Mô-đun web/ chạy THẬT (dựng DOM hoặc thuần). Còn lại thay bằng bản rỗng. */
const THAT = new Set(["web/account.ts", "web/shell.ts", "web/dom.ts", "web/format.ts", "web/icons.ts", "web/help-seen.ts", "web/khung-nho.ts", "web/phien-ban.ts", "web/push-ui.ts", "web/vc-dem.ts"]);
const SO_TAP = 1 << PERMISSION_CODES.length;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Nguồn theo lần lưu

function nguon(rev) {
  if (!rev) return { doc: (rel) => readFileSync(join(ROOT, rel), "utf8"), co: (rel) => existsSync(join(ROOT, rel)), ten: "cây làm việc" };
  const tep = new Set(execFileSync("git", ["ls-tree", "-r", "--name-only", rev], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }).split("\n"));
  const nho = new Map();
  return {
    doc: (rel) => {
      if (!nho.has(rel)) nho.set(rel, execFileSync("git", ["show", `${rev}:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }));
      return nho.get(rel);
    },
    co: (rel) => tep.has(rel),
    ten: rev,
  };
}

/** Bản rỗng của một mô-đun web/: mọi tên được export là hàm trả lời hứa treo. web/api.ts có phần riêng. */
function banRong(rel, src) {
  const che = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const ten = new Set();
  for (const m of che.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) ten.add(m[1]);
  for (const m of che.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) ten.add(m[1]);
  for (const m of che.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const p of m[1].split(",")) {
      const t = p.trim();
      if (t && !t.startsWith("type ")) ten.add(t.split(/\s+as\s+/).pop());
    }
  }
  const rieng =
    rel === "web/api.ts"
      ? {
          ApiError: "export class ApiError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }",
          api: "export function api(path, opts) { return globalThis.__chup.api(path, opts); }",
          datNguoiDangNhap: "export function datNguoiDangNhap() {}",
        }
      : {};
  const dong = ["const __treo = () => new Promise(() => {});"];
  for (const t of ten) dong.push(rieng[t] ?? `export const ${t} = function ${t}() { return __treo(); };`);
  return dong.join("\n");
}

async function dongGoi(ng, vao) {
  const plugin = {
    name: "nguon-theo-lan-luu",
    setup(b) {
      b.onResolve({ filter: /^nguon:/ }, (a) => ({ path: a.path.slice(6), namespace: "nguon" }));
      b.onResolve({ filter: /^\./ }, (a) => {
        const goc = posix.normalize(posix.join(posix.dirname(a.importer), a.path));
        for (const c of [goc, `${goc}.ts`, `${goc}/index.ts`]) if (ng.co(c)) return { path: c, namespace: "nguon" };
        return { errors: [{ text: `không giải được "${a.path}" từ ${a.importer} (${ng.ten})` }] };
      });
      b.onLoad({ filter: /.*/, namespace: "nguon" }, (a) => {
        const src = ng.doc(a.path);
        if (a.path.startsWith("web/") && !THAT.has(a.path)) return { contents: banRong(a.path, src), loader: "js" };
        return { contents: src, loader: a.path.endsWith(".ts") ? "ts" : "js" };
      });
    },
  };
  const r = await esbuild.build({ entryPoints: [`nguon:${vao}`], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent", plugins: [plugin] });
  return r.outputFiles[0].text;
}

/** Gói web/account.ts thành MỘT hàm chạy lại được (mỗi lần gọi = một lần mở trang: mọi biến cấp mô-đun dựng mới). */
async function napTrangToi(ng, thuMuc) {
  const ma = await dongGoi(ng, "web/account.ts");
  if (/^\s*(export|import)\b/m.test(ma)) throw new Error("bản gói web/account.ts có export/import cấp đầu — không bọc được thành hàm");
  const tep = join(thuMuc, `trang-toi-${createHash("sha1").update(ng.ten).digest("hex").slice(0, 8)}.mjs`);
  writeFileSync(tep, `export default async function moTrang() {\n${ma}\n}\n`);
  return (await import(pathToFileURL(tep).href)).default;
}

async function napTrangChuO(ng, thuMuc) {
  const ma = await dongGoi(ng, "src/shared/trang-chu-o.ts");
  const tep = join(thuMuc, `trang-chu-o-${createHash("sha1").update(ng.ten).digest("hex").slice(0, 8)}.mjs`);
  writeFileSync(tep, ma);
  return import(pathToFileURL(tep).href);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// DOM giả

class NutGia {
  constructor() {
    this.parentNode = null;
    this.childNodes = [];
  }
}
class ChuGia extends NutGia {
  constructor(t) {
    super();
    this.data = String(t);
  }
  get textContent() {
    return this.data;
  }
}
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const tachKhoi = (n) => {
  const p = n.parentNode;
  if (p) p.childNodes.splice(p.childNodes.indexOf(n), 1);
  n.parentNode = null;
};
const thanhNut = (x) => (x instanceof NutGia ? x : new ChuGia(x));
class PhanTuGia extends NutGia {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.attrs = new Map();
    this.dataset = {};
    this.hidden = false;
    this.offsetParent = null;
    this.style = {};
    const self = this;
    this.classList = {
      add: (...c) => self.setAttribute("class", [...new Set([...self.lop(), ...c])].join(" ")),
      remove: (...c) => self.setAttribute("class", self.lop().filter((x) => !c.includes(x)).join(" ")),
      contains: (c) => self.lop().includes(c),
      toggle: (c, on) => ((on ?? !self.lop().includes(c)) ? self.classList.add(c) : self.classList.remove(c)),
    };
  }
  lop() {
    return (this.attrs.get("class") ?? "").split(/\s+/).filter(Boolean);
  }
  get id() {
    return this.attrs.get("id") ?? "";
  }
  set id(v) {
    this.attrs.set("id", String(v));
  }
  get className() {
    return this.attrs.get("class") ?? "";
  }
  set className(v) {
    this.attrs.set("class", String(v));
  }
  get children() {
    return this.childNodes.filter((n) => n instanceof PhanTuGia);
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join("");
  }
  set textContent(v) {
    for (const n of [...this.childNodes]) tachKhoi(n);
    if (v !== "" && v !== null && v !== undefined) this.append(String(v));
  }
  setAttribute(k, v) {
    this.attrs.set(k, String(v));
    if (k.startsWith("data-")) this.dataset[camel(k.slice(5))] = String(v);
  }
  getAttribute(k) {
    if (k.startsWith("data-")) return this.dataset[camel(k.slice(5))] ?? null;
    return this.attrs.has(k) ? this.attrs.get(k) : null;
  }
  hasAttribute(k) {
    return this.getAttribute(k) !== null;
  }
  removeAttribute(k) {
    this.attrs.delete(k);
    if (k.startsWith("data-")) delete this.dataset[camel(k.slice(5))];
  }
  append(...ns) {
    for (const x of ns.map(thanhNut)) {
      tachKhoi(x);
      x.parentNode = this;
      this.childNodes.push(x);
    }
  }
  prepend(...ns) {
    const xs = ns.map(thanhNut);
    for (const x of xs) tachKhoi(x);
    for (const x of xs) x.parentNode = this;
    this.childNodes.unshift(...xs);
  }
  chenCanh(ns, sau) {
    const p = this.parentNode;
    if (!p) return;
    const xs = ns.map(thanhNut);
    for (const x of xs) tachKhoi(x);
    for (const x of xs) x.parentNode = p;
    p.childNodes.splice(p.childNodes.indexOf(this) + (sau ? 1 : 0), 0, ...xs);
  }
  before(...ns) {
    this.chenCanh(ns, false);
  }
  after(...ns) {
    this.chenCanh(ns, true);
  }
  remove() {
    tachKhoi(this);
  }
  replaceChildren(...ns) {
    for (const n of [...this.childNodes]) tachKhoi(n);
    this.append(...ns);
  }
  addEventListener() {}
  removeEventListener() {}
  scrollIntoView() {}
  focus() {}
  reset() {}
  khop(chon) {
    return chon.split(",").some((c) => {
      c = c.trim();
      if (c.startsWith("[") && c.endsWith("]")) return this.hasAttribute(c.slice(1, -1));
      if (c.startsWith(".")) return this.lop().includes(c.slice(1));
      if (c.startsWith("#")) return this.id === c.slice(1);
      return this.tagName === c.toUpperCase();
    });
  }
  querySelectorAll(chon) {
    const out = [];
    const di = (e) => {
      for (const k of e.children) {
        if (k.khop(chon)) out.push(k);
        di(k);
      }
    };
    di(this);
    return out;
  }
  querySelector(chon) {
    return this.querySelectorAll(chon)[0] ?? null;
  }
}

function khoGia() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
}

/** Dựng "trang /account" giả: body mang mọi id của public/account.html (phẳng, đúng thứ tự tệp) + data-title của trang đang giả lập. */
function datMoiTruong({ ng, duong, tieuDe, kho, authMe }) {
  const body = new PhanTuGia("body");
  if (tieuDe !== undefined) body.dataset.title = tieuDe;
  for (const m of ng.doc("public/account.html").matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"/g)) {
    const e = new PhanTuGia(m[1]);
    e.id = m[2];
    body.append(e);
  }
  const document = {
    body,
    readyState: "complete",
    createElement: (t) => new PhanTuGia(t),
    createElementNS: (_ns, t) => new PhanTuGia(t),
    createTextNode: (t) => new ChuGia(t),
    getElementById: (id) => (body.id === id ? body : body.querySelector(`#${id}`)),
    querySelectorAll: (c) => body.querySelectorAll(c),
    querySelector: (c) => body.querySelector(c),
    addEventListener() {},
    removeEventListener() {},
  };
  const gan = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true, enumerable: false });
  gan("document", document);
  gan("window", { addEventListener() {}, removeEventListener() {} });
  gan("location", { pathname: duong, search: "", hash: "", href: `https://booking.tourdao.vn${duong}`, replace() {}, assign() {} });
  gan("history", { length: 1, back() {} });
  gan("navigator", { userAgent: "chup-muc-giao-dien" });
  gan("localStorage", kho.local);
  gan("sessionStorage", kho.session);
  gan("Node", NutGia);
  gan("__chup", {
    api(path) {
      if (path === "/api/auth/me") return authMe();
      return new Promise(() => {});
    },
  });
  return body;
}

const nhip = async (n = 4) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc DOM

const vanTay = (e) => createHash("sha1").update(viet(e, true)).digest("hex").slice(0, 8);
const THUOC_TINH = ["id", "class", "href", "aria-current", "aria-label", "aria-labelledby", "type", "placeholder", "role"];
/** Viết một cây phần tử thành chuỗi tất định: thẻ, thuộc tính chọn lọc, data-*, hidden, con (svg → vân tay hình). */
function viet(e, svgDayDu = false) {
  if (e instanceof ChuGia) return JSON.stringify(e.data);
  if (e.tagName === "SVG" && !svgDayDu) return `svg#${vanTay(e)}`;
  const tt = (svgDayDu ? [...e.attrs.keys()].sort() : THUOC_TINH).filter((k) => e.attrs.has(k)).map((k) => `${k}=${JSON.stringify(e.attrs.get(k))}`);
  const dt = Object.keys(e.dataset).sort().map((k) => `data:${k}=${JSON.stringify(e.dataset[k])}`);
  const an = e.hidden ? ["hidden"] : [];
  return `<${e.tagName.toLowerCase()}${[...tt, ...dt, ...an].map((x) => ` ${x}`).join("")}>${e.childNodes.map((c) => viet(c, svgDayDu)).join("")}</>`;
}

/** Nhãn của một mục: con đầu là chữ thì lấy chữ, không thì lấy chữ của con đầu (vd span.vc-row-label, span.sidebar-item-label). */
function nhanCua(e) {
  const dau = e.childNodes.find((c) => (c instanceof ChuGia ? c.data.trim() : !(c.tagName === "SVG" || c.lop().includes("sidebar-item-icon") || c.lop().includes("tab-icon"))));
  if (!dau) return "";
  return (dau instanceof ChuGia ? dau.data : dau.childNodes.filter((c) => c instanceof ChuGia).map((c) => c.data).join("")).trim();
}

/** Danh sách mục (chuỗi so sánh) của từng nơi — dạng mà bài src/muc-giao-dien-hien-trang.test.ts so với bảng mới. */
function docMuc(body, chiKhungTam = false) {
  const lay = (id) => {
    const e = body.querySelector(`#${id}`);
    return e && (!chiKhungTam || e.dataset.khungTam) ? e : null;
  };
  const thanhBen = [];
  const sb = lay("sidebar");
  if (sb) {
    // Chuỗi `nhóm|kiểu|nhãn|href` — kiểu "noi-bat" cho nút "Tạo đơn", còn lại rỗng. HẰNG NGÀY không có tiêu đề; THIẾT LẬP là nút thu gọn; CHÂN MENU nằm ở chân thanh.
    const mucCuaNhom = (nhom, o) => {
      const nut = o.querySelector(".sidebar-new");
      if (nut) thanhBen.push(`${nhom}|noi-bat|${nut.children.at(-1).textContent}|${nut.getAttribute("href") ?? ""}`);
      for (const it of o.querySelector(".sidebar-group-items").children) {
        thanhBen.push(`${nhom}||${it.querySelector(".sidebar-item-label").childNodes.filter((c) => c instanceof ChuGia).map((c) => c.data).join("")}|${it.getAttribute("href") ?? ""}`);
      }
    };
    for (const g of sb.querySelectorAll(".sidebar-group")) {
      const tieuDe = g.querySelector(".sidebar-group-title");
      mucCuaNhom(tieuDe ? tieuDe.textContent : g.querySelector(".sidebar-group-toggle") ? "THIẾT LẬP" : "HẰNG NGÀY", g);
    }
    const chan = sb.querySelector(".sidebar-foot");
    if (chan.querySelector(".sidebar-group-items")) mucCuaNhom("CHÂN MENU", chan);
  }
  const thanhTab = [];
  const tb = lay("tabbar");
  if (tb) for (const a of tb.children) thanhTab.push(`${a.children.at(-1).textContent}|${a.getAttribute("href")}`);
  const thanhTren = [];
  const tt = body.querySelector("#topbar");
  if (tt) {
    for (const e of tt.children) {
      if (chiKhungTam && !e.dataset.khungTam) continue;
      if (e.lop().includes("topbar-search")) thanhTren.push("Tìm đơn|/orders");
      if (e.lop().includes("topbar-new")) thanhTren.push(`${e.textContent}|${e.getAttribute("href")}`);
    }
  }
  const trangToi = [];
  if (!chiKhungTam) {
    for (const id of ["links-top", "vc-links", "links"]) {
      const s = body.querySelector(`#${id}`);
      if (!s) continue;
      for (const a of s.children) if (a.tagName === "A") trangToi.push(`${id}|${nhanCua(a)}|${a.getAttribute("href")}`);
    }
  }
  return { thanhBen, thanhTab, thanhTren, trangToi };
}

/** DOM đầy đủ của các vùng điều hướng (cho --so-sanh). */
function docDom(body, chiKhungTam = false) {
  const out = {};
  for (const id of ["sidebar", "tabbar"]) {
    const e = body.querySelector(`#${id}`);
    out[id] = e && (!chiKhungTam || e.dataset.khungTam) ? viet(e) : null;
  }
  const tt = body.querySelector("#topbar");
  out.topbar = tt ? viet(tt) : null;
  if (!chiKhungTam) {
    for (const id of ["links-top", "vc-eyebrow", "vc-links", "links"]) {
      const e = body.querySelector(`#${id}`);
      out[id] = e ? viet(e) : null;
    }
    out.thuTuVung = body.children.map((e) => e.id || e.tagName.toLowerCase()).join(",");
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Chạy

const nguoi = (m) => ({ id: `nv-${m}`, fullName: "Nguyễn Văn An", phone: "0900000000", permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)), partyId: null });

async function chup(ng) {
  const thuMuc = mkdtempSync(join(tmpdir(), "chup-muc-"));
  try {
    const moTrang = await napTrangToi(ng, thuMuc);
    const tco = await napTrangChuO(ng, thuMuc);
    const tieuDeTrang = (p) => /<body[^>]*\bdata-title="([^"]*)"/.exec(ng.doc(`public/${p === "/" ? "index" : p.slice(1)}.html`))?.[1];
    const pages = [...(/export const PAGES[^=]*=\s*\[([^\]]*)\]/.exec(ng.doc("src/shared/sw-policy.ts"))?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const kq = { muc: [], tam: [], dom: [], domTam: [], trangChu: [], ngoaiTuyen: null, duong: {} };

    for (let m = 0; m < SO_TAP; m++) {
      const staff = nguoi(m);
      const kho = { local: khoGia(), session: khoGia() };
      // Lần 1: khung thật (/api/auth/me trả lời) — đồng thời ghi bản nhớ khung vào kho.
      let body = datMoiTruong({ ng, duong: "/account", tieuDe: "Tôi", kho, authMe: async () => ({ staff, maintenance: { on: false } }) });
      await moTrang();
      await nhip();
      kq.muc.push(docMuc(body));
      kq.dom.push(docDom(body));
      // Lần 2: cùng kho ⇒ khung tạm từ bản nhớ; giữ /api/auth/me treo rồi đọc các phần tử mang data-khung-tam.
      body = datMoiTruong({ ng, duong: "/account", tieuDe: "Tôi", kho, authMe: () => new Promise(() => {}) });
      void moTrang();
      await nhip();
      kq.tam.push(docMuc(body, true));
      kq.domTam.push(docDom(body, true));
      const o = tco.oTrangChu(staff);
      kq.trangChu.push({
        nhom: tco.nhomMayTinh(staff).flatMap((g) => g.o.map((x) => `${g.ten}|${x.khoa}|${x.nhan}|${x.href}`)),
        dienThoai: [...tco.luoiDienThoai(staff).luoi.map((x) => x.khoa), String(tco.luoiDienThoai(staff).coTatCa)],
        mayTinh: [...tco.loiTatMayTinh(staff).luoi.map((x) => x.khoa), String(tco.loiTatMayTinh(staff).coTatCa)],
        luoi: [...o.luoi.map((x) => x.khoa), String(o.coTatCa)],
      });
    }

    // Mất mạng khi mở trang, chưa có bản nhớ khung: addNav(false) — 4 tab cơ bản.
    {
      const kho = { local: khoGia(), session: khoGia() };
      const body = datMoiTruong({ ng, duong: "/account", tieuDe: "Tôi", kho, authMe: () => Promise.reject(new TypeError("mất mạng")) });
      void moTrang();
      await nhip();
      kq.ngoaiTuyen = { muc: docMuc(body), dom: docDom(body, false) };
    }

    // Chữ thanh trên + mục đang sáng ở mọi trang có khung (3 tài khoản: đủ 10 quyền, chỉ tài xế, tài xế + Bán hàng).
    const BA = { "du-quyen": SO_TAP - 1, "chi-tai-xe": 1 << PERMISSION_CODES.indexOf("DRIVER"), "tai-xe-ban-hang": (1 << PERMISSION_CODES.indexOf("DRIVER")) | (1 << PERMISSION_CODES.indexOf("SALES")) };
    for (const p of pages) {
      if (["/login", "/home", "/danh-muc-giay-to"].includes(p)) continue; // không có khung (trang đăng nhập / chỉ chuyển hướng)
      kq.duong[p] = {};
      for (const [ten, m] of Object.entries(BA)) {
        const staff = nguoi(m);
        const body = datMoiTruong({ ng, duong: p, tieuDe: tieuDeTrang(p), kho: { local: khoGia(), session: khoGia() }, authMe: async () => ({ staff, maintenance: { on: false } }) });
        await moTrang();
        await nhip();
        const d = docDom(body);
        kq.duong[p][ten] = { sidebar: d.sidebar, tabbar: d.tabbar, topbar: d.topbar };
      }
    }
    return kq;
  } finally {
    rmSync(thuMuc, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Ảnh chụp mục hiện: mỗi nơi = từ điển mục (thứ tự chung của mọi tập) + mặt nạ 1024 bit cho từng mục.

/** Thứ tự chung khớp mọi dãy (sắp xếp tô-pô, hoà thì theo lần gặp đầu); dãy mâu thuẫn ⇒ ném. */
function thuTuChung(cacDay, noi) {
  const gap = new Map();
  const sau = new Map();
  const vao = new Map();
  for (const d of cacDay) {
    if (new Set(d).size !== d.length) throw new Error(`${noi}: một tập có mục trùng (${d.join(" / ")})`);
    for (const x of d) if (!gap.has(x)) (gap.set(x, gap.size), sau.set(x, new Set()), vao.set(x, 0));
    for (let i = 1; i < d.length; i++) {
      if (!sau.get(d[i - 1]).has(d[i])) {
        sau.get(d[i - 1]).add(d[i]);
        vao.set(d[i], vao.get(d[i]) + 1);
      }
    }
  }
  const out = [];
  const san = [...gap.keys()].filter((x) => vao.get(x) === 0);
  while (san.length) {
    san.sort((a, b) => gap.get(a) - gap.get(b));
    const x = san.shift();
    out.push(x);
    for (const y of sau.get(x)) {
      vao.set(y, vao.get(y) - 1);
      if (vao.get(y) === 0) san.push(y);
    }
  }
  if (out.length !== gap.size) throw new Error(`${noi}: thứ tự mục mâu thuẫn giữa các tập — không biểu diễn được bằng một từ điển`);
  return out;
}

function matNa(cacDay, noi) {
  const muc = thuTuChung(cacDay, noi);
  const bit = muc.map(() => Buffer.alloc(SO_TAP / 8));
  cacDay.forEach((d, m) => {
    for (const x of d) bit[muc.indexOf(x)][m >> 3] |= 1 << (m & 7);
  });
  return { muc, tap: bit.map((b) => b.toString("base64")) };
}

function anhChup(kq, ng) {
  const noi = {
    "thanh-ben": kq.muc.map((x) => x.thanhBen),
    "thanh-tab": kq.muc.map((x) => x.thanhTab),
    "thanh-tren": kq.muc.map((x) => x.thanhTren),
    "trang-toi": kq.muc.map((x) => x.trangToi),
    "trang-chu": kq.trangChu.map((x) => x.nhom),
    "khung-tam:thanh-ben": kq.tam.map((x) => x.thanhBen),
    "khung-tam:thanh-tab": kq.tam.map((x) => x.thanhTab),
    "khung-tam:thanh-tren": kq.tam.map((x) => x.thanhTren),
  };
  return {
    ghiChu: "Sinh bằng scripts/chup-muc-giao-dien.mjs (chạy mã giao diện thật trên DOM giả). KHÔNG sửa tay. Mặt nạ: base64, bit m = tập con m (bit i của m = PERMISSION_CODES[i]).",
    nguon: ng.ten,
    maQuyen: [...PERMISSION_CODES],
    noi: Object.fromEntries(Object.entries(noi).map(([k, v]) => [k, matNa(v, k)])),
    ngoaiTuyen: kq.ngoaiTuyen.muc,
  };
}

function soSanh(a, b, tenA, tenB) {
  const lech = [];
  const so = (khoa, x, y) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) lech.push({ khoa, a: x, b: y });
  };
  for (let m = 0; m < SO_TAP; m++) {
    for (const k of Object.keys(a.dom[m])) so(`khung thật · tập ${m} [${nguoi(m).permissions.join("+") || "không quyền"}] · ${k}`, a.dom[m][k], b.dom[m][k]);
    for (const k of Object.keys(a.domTam[m])) so(`khung tạm · tập ${m} · ${k}`, a.domTam[m][k], b.domTam[m][k]);
    so(`ô Trang chủ · tập ${m}`, a.trangChu[m], b.trangChu[m]);
  }
  so("mất mạng", a.ngoaiTuyen.dom, b.ngoaiTuyen.dom);
  so("danh sách trang", Object.keys(a.duong), Object.keys(b.duong));
  for (const p of Object.keys(a.duong)) for (const t of Object.keys(a.duong[p])) so(`trang ${p} · ${t}`, a.duong[p][t], b.duong[p]?.[t]);
  console.log(`So ${tenA} ↔ ${tenB}: ${lech.length === 0 ? "GIỐNG HỆT" : `${lech.length} chỗ lệch`} (khung thật + khung tạm 1024 tập, ô Trang chủ 1024 tập, mất mạng, ${Object.keys(a.duong).length} trang × 3 tài khoản).`);
  for (const l of lech.slice(0, 15)) console.log(`  ✘ ${l.khoa}\n     ${tenA}: ${String(JSON.stringify(l.a)).slice(0, 400)}\n     ${tenB}: ${String(JSON.stringify(l.b)).slice(0, 400)}`);
  // Số mục thanh bên (kịch bản Chrome trang-chu-smoke.mjs đếm cứng): theo vai thường gặp.
  const dem = (kq, ma) => kq.muc[ma.reduce((s, c) => s | (1 << PERMISSION_CODES.indexOf(c)), 0)].thanhBen.length;
  for (const vai of [["SALES"], ["ACCOUNTING"], ["ADMIN"], ["SUPER_ADMIN"], ["ADMIN", "SUPER_ADMIN"], ["HR"], ["FIELD"], ["PARTNER"], ["DRIVER"]]) {
    console.log(`  số mục thanh bên ${vai.join("+").padEnd(18)} ${tenA}: ${dem(a, vai)}  ${tenB}: ${dem(b, vai)}`);
  }
  return lech.length;
}

const arg = (k) => {
  const i = process.argv.indexOf(k);
  return i === -1 ? undefined : process.argv[i + 1];
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const ghi = arg("--ghi");
  const ssRev = arg("--so-sanh");
  if (ghi) {
    const ng = nguon(arg("--rev"));
    const t = Date.now();
    const kq = await chup(ng);
    writeFileSync(resolve(ROOT, ghi), `${JSON.stringify(anhChup(kq, ng), null, 1)}\n`);
    console.log(`Đã ghi ${ghi} từ ${ng.ten} (${Date.now() - t} ms).`);
  } else if (ssRev) {
    const a = await chup(nguon(ssRev));
    const b = await chup(nguon(undefined));
    process.exit(soSanh(a, b, ssRev, "cây làm việc") === 0 ? 0 : 1);
  } else {
    console.error("Dùng: --ghi <tệp> [--rev <mã>]  hoặc  --so-sanh <mã>");
    process.exit(2);
  }
}
