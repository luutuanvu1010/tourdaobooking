// Bộ quét nút giao diện (ADR-0167): đọc mã `web/**`, `public/*.html`, `src/shared/` rồi liệt kê MỌI nút kèm chữ, tệp, dòng, đường API, dấu hiệu ghi.
// Chép từ docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/liet-ke-nut.mjs (hồ sơ có ngày, không sửa), bỏ phần sinh tài liệu, bảng trang/vai và mã N….
// Kết quả chỉ là GỢI Ý: cột `lyDo` do máy dò, có thể thừa hoặc thiếu. Không phải trình phân tích cú pháp đầy đủ.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { maskSource } from "./source-mask-lib.mjs";

/** Bỏ ký hiệu đầu nhãn (＋ + ✓ ← → ⋯) và khoảng trắng thừa. */
export const chuanNhan = (s) => s.replace(/^[＋+✓←→⋯\s]+/u, "").replace(/\s+/g, " ").trim();

/** Khoá ổn định của một nút: nhãn đã chuẩn hoá nối bằng « / »; nút không chữ thì aria, data-action, id. Không dùng số dòng. */
export function khoaNut(r) {
  const ds = [];
  for (const x of r.nhan ?? []) {
    const t = chuanNhan(x);
    if (t && !ds.includes(t)) ds.push(t);
  }
  if (ds.length) return ds.join(" / ");
  if (r.aria) return `aria:${chuanNhan(r.aria)}`;
  if (r.action) return `action:${r.action}`;
  if (r.id) return `id:${r.id}`;
  return "không-chữ";
}

/** Nút máy coi là «việc quan trọng» ứng viên: có dấu hiệu ghi, nguy hiểm hoặc là nút chính. */
export const laUngVien = (r) => (r.lyDo ?? []).some((x) => x === "ghi" || x === "nguy hiểm" || x === "nút chính");

function lietTep(dir, duoi, boQua = () => false) {
  const ra = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) ra.push(...lietTep(p, duoi, boQua));
    else if (e.name.endsWith(duoi) && !e.name.endsWith(".test.ts") && !e.name.endsWith(".d.ts") && !boQua(p)) ra.push(p);
  }
  return ra.sort();
}
const dongTai = (src, i) => src.slice(0, i).split("\n").length;

/** Đường của mọi `route("PHƯƠNG THỨC", "đường"` trong `src/**\/*.ts` (trừ bài kiểm); tham số `:id` đổi về `:x`. */
export function duongTrongMa(root) {
  const ra = new Set();
  for (const p of lietTep(join(root, "src"), ".ts")) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/\broute(?:<[^>]*>)?\(\s*"[A-Z]+"\s*,\s*"([^"]+)"/g)) ra.add(m[1].replace(/:[A-Za-z_]\w*/g, ":x"));
  }
  return ra;
}

/** Mọi `[[tên nút]]` trong `src/shared/huong-dan*.ts`, bỏ trùng; bỏ mảng lồng trong mã và ví dụ trong chú thích. */
export function tenHuongDan(root) {
  const ra = new Map();
  for (const p of lietTep(join(root, "src/shared"), ".ts", (q) => !/huong-dan/.test(q))) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const t = m[1];
      if (t.includes("${") || t.includes('"') || t === "Tên nút") continue;
      if (!ra.has(t)) ra.set(t, `${relative(root, p)}:${dongTai(src, m.index)}`);
    }
  }
  return [...ra].map(([ten, noi]) => ({ ten, noi }));
}

/** Toàn bộ chữ giao diện: web, public/*.html, src/shared (trừ Hướng dẫn, nhật ký thay đổi, bảng từ, sơ đồ trang, trợ lý, và chính bảng tham chiếu). */
export function toanChu(root) {
  const tepWeb = lietTep(join(root, "web"), ".ts").filter((p) => !p.includes("/vendor/"));
  const tepShared = lietTep(join(root, "src/shared"), ".ts").filter((p) => !/huong-dan|changelog|bang-tu|so-do-trang|tro-ly|bang-tham-chieu/.test(p));
  const tepHtml = lietTep(join(root, "public"), ".html");
  return [...tepWeb, ...tepShared, ...tepHtml].map((p) => readFileSync(p, "utf8")).join("\n");
}

/** Liệt kê mọi nút thật (không tính khuôn) của giao diện ở thư mục gốc `root`. */
export function lietKeNut(root) {
const rel = (p) => relative(root, p);
// ---------- đọc tệp ----------
function liet(dir, duoi) {
  const ra = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) ra.push(...liet(p, duoi));
    else if (e.name.endsWith(duoi) && !e.name.endsWith(".test.ts") && !e.name.endsWith(".d.ts")) ra.push(p);
  }
  return ra.sort();
}
const TEP_WEB = liet(join(root, "web"), ".ts").filter((p) => !p.includes("/vendor/"));
const TEP_SHARED = liet(join(root, "src/shared"), ".ts").filter((p) => !/\/bang-tham-chieu[^/]*$/.test(p));
const TEP_HTML = liet(join(root, "public"), ".html");
const nguon = new Map();
for (const p of [...TEP_WEB, ...TEP_SHARED]) {
  const src = readFileSync(p, "utf8");
  nguon.set(p, { src, mask: maskSource(src), maskChuoi: maskSource(src, { strings: false }) });
}
const dongCua = (src, i) => {
  let n = 1;
  for (let k = 0; k < i; k++) if (src.charCodeAt(k) === 10) n++;
  return n;
};
// ---------- ngoặc ----------
const MO = { "(": ")", "[": "]", "{": "}" };
function dongNgoac(mask, mo) {
  const stack = [];
  for (let i = mo; i < mask.length; i++) {
    const c = mask[i];
    if (MO[c]) stack.push(c);
    else if (c === ")" || c === "]" || c === "}") {
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return -1;
}
function tachPhay(mask, s, e) {
  const ra = [];
  let d = 0;
  let dau = s;
  for (let i = s; i < e; i++) {
    const c = mask[i];
    if (MO[c]) d++;
    else if (c === ")" || c === "]" || c === "}") d--;
    else if (c === "," && d === 0) {
      ra.push([dau, i]);
      dau = i + 1;
    }
  }
  if (mask.slice(dau, e).trim()) ra.push([dau, e]);
  return ra;
}
function catTrang(mask, s, e) {
  while (s < e && /\s/.test(mask[s])) s++;
  while (e > s && /\s/.test(mask[e - 1])) e--;
  return [s, e];
}
const laChuoiTron = (src, mask, s, e) => {
  const c = src[s];
  if (c !== '"' && c !== "'" && c !== "`") return false;
  if (src[e - 1] !== c) return false;
  if (c !== "`") return mask.slice(s + 1, e - 1).trim() === "";
  // khuôn mẫu: không có dấu ` nào của khuôn khác ở giữa ngoài phần ${}
  return true;
};
const giaiChuoi = (t) => t.replace(/\\n/g, " ").replace(/\\(.)/g, "$1");

// ---------- bảng hằng ----------
const HANG = new Map(); // tên → chuỗi; TÊN.KHOÁ → chuỗi
for (const [p, { src, mask }] of nguon) {
  for (const m of mask.matchAll(/(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:[^=\n]+)?\s*=\s*/g)) {
    const dau = m.index + m[0].length;
    if (src[dau] === '"' || src[dau] === "`") {
      const q = src[dau];
      let k = dau + 1;
      while (k < src.length && (src[k] !== q || src[k - 1] === "\\")) k++;
      if (mask.slice(dau + 1, k).trim() === "" && !HANG.has(m[1])) HANG.set(m[1], giaiChuoi(src.slice(dau + 1, k)));
    } else if (src[dau] === "{" && /^[A-Z_0-9]+$/.test(m[1])) {
      const dong = dongNgoac(mask, dau);
      if (dong < 0) continue;
      const than = src.slice(dau + 1, dong);
      for (const kv of than.matchAll(/(?:^|[\s,{])["']?([\w.\-]+)["']?\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
        const k = `${m[1]}.${kv[1]}`;
        if (!HANG.has(k)) HANG.set(k, giaiChuoi(kv[2]));
      }
    }
  }
}

// ---------- đọc nhãn từ một biểu thức ----------
function timThamSo(ten, p, viTri) {
  const { src, mask } = nguon.get(p);
  const dongToi = dongCua(src, viTri);
  const ung = [];
  for (const m of mask.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\(|\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?\(/g)) {
    if (m.index > viTri) break;
    ung.push(m);
  }
  for (const m of ung.reverse().slice(0, 8)) {
    if (dongToi - dongCua(src, m.index) > 60) break;
    const mo = m.index + m[0].length - 1;
    const dong = dongNgoac(mask, mo);
    if (dong < 0 || dong > viTri) continue;
    const ds = tachPhay(mask, mo + 1, dong).map(([a, b]) => src.slice(a, b).replace(/[:=?][\s\S]*$/, "").trim());
    const idx = ds.indexOf(ten);
    if (idx >= 0) return { ham: m[1] ?? m[2], chiSo: idx };
  }
  return null;
}

/** Trả danh sách { chu, kieu } với kieu ∈ chu | hang | nhanh | mau | bieu-tuong | bieu-thuc | khuon. */
function docNhan(p, s, e, sau = 0) {
  const { src, mask } = nguon.get(p);
  [s, e] = catTrang(mask, s, e);
  if (s >= e) return [];
  const raw = src.slice(s, e).replace(/\s+/g, " ");
  if (sau > 5) return [{ chu: null, kieu: "bieu-thuc", raw }];
  if (laChuoiTron(src, mask, s, e)) {
    const t = src.slice(s + 1, e - 1);
    if (src[s] === "`" && t.includes("${")) return [{ chu: giaiChuoi(t.replace(/\$\{[^}]*\}/g, "‹…›")), kieu: "mau" }];
    return [{ chu: giaiChuoi(t), kieu: "chu" }];
  }
  // ternary, ??, ||, && ở tầng ngoài cùng
  let d = 0;
  let hoi = -1;
  let dau2 = -1;
  let hoac = -1;
  let va = -1;
  for (let i = s; i < e; i++) {
    const c = mask[i];
    if (MO[c]) d++;
    else if (c === ")" || c === "]" || c === "}") d--;
    else if (d === 0) {
      if (c === "?" && mask[i + 1] !== "." && mask[i + 1] !== "?" && mask[i - 1] !== "?" && hoi < 0) hoi = i;
      else if (c === ":" && hoi >= 0 && dau2 < 0) {
        // ternary lồng: đếm ?
        let h2 = 0;
        for (let k = hoi + 1; k < i; k++) if (mask[k] === "?" && mask[k + 1] !== "." && mask[k + 1] !== "?" && mask[k - 1] !== "?") h2++;
        let c2 = 0;
        let dd = 0;
        for (let k = hoi + 1; k < i; k++) {
          if (MO[mask[k]]) dd++;
          else if (")]}".includes(mask[k])) dd--;
          else if (dd === 0 && mask[k] === ":") c2++;
        }
        if (h2 === c2) dau2 = i;
      } else if (c === "?" && mask[i + 1] === "?" && hoac < 0) hoac = i;
      else if (c === "|" && mask[i + 1] === "|" && hoac < 0) hoac = i;
      else if (c === "&" && mask[i + 1] === "&" && va < 0) va = i;
    }
  }
  if (hoi >= 0 && dau2 > 0) {
    const a = docNhan(p, hoi + 1, dau2, sau + 1);
    const b = docNhan(p, dau2 + 1, e, sau + 1);
    return [...a, ...b].map((x) => ({ ...x, nhanh: true }));
  }
  if (hoac >= 0) return [...docNhan(p, s, hoac, sau + 1), ...docNhan(p, hoac + 2, e, sau + 1)];
  if (va >= 0) return docNhan(p, va + 2, e, sau + 1);
  if (src[s] === "(" && dongNgoac(mask, s) === e - 1) return docNhan(p, s + 1, e - 1, sau + 1);
  if (/^(null|false|undefined|true)$/.test(raw)) return [];
  if (/^icon\(/.test(raw) || /^[A-Za-z_$][\w$.]*[iI]con\(/.test(raw)) return [{ chu: `[biểu tượng ${raw.match(/"([^"]+)"/)?.[1] ?? ""}]`, kieu: "bieu-tuong" }];
  const laH = raw.match(/^h\(/);
  if (laH) {
    const mo = s + 1;
    const dong = dongNgoac(mask, mo);
    const args = tachPhay(mask, mo + 1, dong);
    return args.slice(2).flatMap(([a, b]) => docNhan(p, a, b, sau + 1));
  }
  // định danh hoặc TÊN.KHOÁ
  if (/^[A-Za-z_$][\w$]*(\.[\w$]+)?$/.test(raw)) {
    if (HANG.has(raw)) return [{ chu: HANG.get(raw), kieu: "hang" }];
    const goc = raw.split(".")[0];
    // biến cục bộ gần nhất phía trên
    if (!raw.includes(".")) {
      const re = new RegExp(`\\b(?:const|let)\\s+${raw.replace("$", "\\$")}(?:\\s*:[^=\\n]+)?\\s*=\\s*`, "g");
      let chot = null;
      for (const m of mask.matchAll(re)) {
        if (m.index > s) break;
        chot = m;
      }
      if (chot && dongCua(src, s) - dongCua(src, chot.index) < 80) {
        const dau = chot.index + chot[0].length;
        let d2 = 0;
        let k = dau;
        for (; k < mask.length; k++) {
          const c = mask[k];
          if (MO[c]) d2++;
          else if (")]}".includes(c)) d2--;
          if (d2 === 0 && (c === ";" || c === "\n")) break;
        }
        const kq = docNhan(p, dau, k, sau + 1);
        if (kq.length) return kq;
      }
    }
    const ts = timThamSo(goc, p, s);
    if (ts) return [{ chu: null, kieu: "khuon", raw, khuon: { ...ts, tep: p, thuocTinh: raw.includes(".") ? raw.split(".")[1] : null } }];
  }
  return [{ chu: null, kieu: "bieu-thuc", raw: raw.slice(0, 120) }];
}

// ---------- chỉ mục hàm (để dò xử lý một, hai bước) ----------
const HAM = new Map();
for (const p of TEP_WEB) {
  const { mask } = nguon.get(p);
  for (const m of mask.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\(|\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?\([^\n]*?=>|\b([a-zA-Z_$][\w$]*)\s*\([^()\n]*\)\s*(?::[^{\n]+)?\{\s*$/gm)) {
    const ten = m[1] ?? m[2] ?? m[3];
    if (!ten || ["if", "for", "while", "switch", "catch", "return", "function"].includes(ten)) continue;
    // thân: dấu { đầu tiên sau danh sách tham số, hoặc tới hết biểu thức mũi tên
    let i = m.index + m[0].length;
    if (m[0].trim().endsWith("{")) i -= 1;
    const mo = mask.indexOf("{", Math.max(m.index, i - 1));
    const dong = mo >= 0 ? dongNgoac(mask, mo) : -1;
    const ds = HAM.get(ten) ?? [];
    ds.push({ tep: p, s: m.index, e: dong > 0 && dong - m.index < 20000 ? dong + 1 : Math.min(m.index + 2000, mask.length) });
    HAM.set(ten, ds);
  }
}
const BO_QUA_HAM = new Set(["h", "icon", "append", "replaceChildren", "byId", "api", "if", "for", "map", "filter", "forEach", "find", "some", "every", "push", "join", "slice", "includes", "trim", "close", "setBusy", "focus", "remove", "preventDefault", "stopPropagation", "addEventListener", "querySelector", "querySelectorAll", "encodeURIComponent", "String", "Number", "Boolean", "Array", "Object", "Promise", "Date", "JSON", "catch", "then", "finally", "can", "hasPermission", "reload", "replace", "assign", "lyDoLoi", "hienBaoNgan", "hoiXacNhan", "moBangTruot", "append", "toString", "from", "keys", "values", "entries", "test", "match", "split", "taiLai", "napLai", "ve", "render", "veLai", "load", "tai", "nap", "baoOk", "canhBao", "showError", "showToast", "setError", "datLoi", "huyHieu", "loadPage", "init", "initShell", "hien", "an", "scrollIntoView", "matches", "closest", "getAttribute", "setAttribute", "error", "log", "warn", "set", "get", "has", "add", "delete", "clear", "sort", "concat", "padStart", "toLocaleString", "toFixed", "isNaN", "parseInt", "parseFloat", "fmt", "formatVnd", "vnd", "sau", "nhan", "moHop"]);

function vungXuLy(p, s, e, buoc = 2, daTham = new Set()) {
  const { src, mask } = nguon.get(p);
  const doan = src.slice(s, e);
  const kq = { api: new Set(), ghi: new Set(), xacNhan: new Set(), hop: false, bao: new Set(), ham: new Set() };
  const hop = (o) => {
    for (const k of ["api", "ghi", "xacNhan", "bao", "ham"]) for (const v of o[k]) kq[k].add(v);
    kq.hop = kq.hop || o.hop;
  };
  for (const m of doan.matchAll(/["`](\/api\/[^"`]*)["`]/g)) kq.api.add(m[1].replace(/\$\{[^}]*\}/g, ":x"));
  // Lệnh ghi có ba dạng: `method: "POST"`, tham số của hàm bọc (`gui(url, "POST", …)`), `method` là biến. Ghi gián tiếp sâu hơn hai bước thì không thấy (giới hạn ghi ở sổ hàng rào).
  for (const m of doan.matchAll(/(?:method:\s*|,\s*)"(POST|PATCH|PUT|DELETE)"/g)) kq.ghi.add(m[1]);
  if (/\bmethod:\s*(?!string\b)[A-Za-z_$]/.test(doan)) kq.ghi.add("(biến)");
  if (/\b(hoiXacNhan|confirm)\(/.test(doan)) {
    for (const m of doan.matchAll(/nhanNguyHiem:\s*"([^"]*)"/g)) kq.xacNhan.add(m[1]);
    if (!kq.xacNhan.size) kq.xacNhan.add("(có hỏi)");
  }
  if (/\b(moBangTruot|moHop|moHop[A-Z]\w*|mo[A-Z]\w*Sheet|openSheet|hoiTen)\(/.test(doan)) kq.hop = true;
  for (const m of doan.matchAll(/\b(?:baoOk|hienBaoNgan|baoThanhCong|showToast)\(\s*"([^"]+)"/g)) kq.bao.add(m[1]);
  if (buoc > 0) {
    const che = mask.slice(s, e);
    for (const m of che.matchAll(/(?:\b|\.)([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\(/g)) {
      const ten = m[1];
      if (BO_QUA_HAM.has(ten) || daTham.has(ten)) continue;
      const ds = HAM.get(ten);
      if (!ds) continue;
      daTham.add(ten);
      kq.ham.add(ten);
      const cungTep = ds.filter((d) => d.tep === p);
      for (const d of (cungTep.length ? cungTep : ds).slice(0, 2)) hop(vungXuLy(d.tep, d.s, d.e, buoc - 1, daTham));
    }
  }
  return kq;
}
const LOP_NUT = /\b(btn|nut|pill-btn|vc-btn)\b/;
// ---------- thuộc tính của h(…) ----------
function docThuocTinh(p, s, e) {
  const { src, mask } = nguon.get(p);
  [s, e] = catTrang(mask, s, e);
  const ra = {};
  if (src[s] !== "{") return ra;
  for (const [a, b] of tachPhay(mask, s + 1, e - 1)) {
    const doan = src.slice(a, b).trim();
    const m = doan.match(/^["']?([\w\-]+)["']?\s*:\s*([\s\S]*)$/);
    if (!m) continue;
    let v = m[2].trim();
    const lit = v.match(/^["'`]([\s\S]*)["'`]$/);
    if (lit) v = lit[1];
    ra[m[1]] = v.replace(/\s+/g, " ");
  }
  return ra;
}
function tongCua(tt) {
  const lop = `${tt.class ?? ""} ${tt["data-tong"] ?? ""} ${tt["data-cap"] ?? ""}`;
  if (/danger|nguy-hiem|vc-btn-stop/.test(lop)) return "nguy hiểm";
  if (/btn-primary|btn-chinh|btn-accent|\bchinh\b|san-ho/.test(lop)) return "chính";
  if (/btn-link|vc-btn-text/.test(lop)) return "chữ";
  return "phụ";
}

const DONG = [];
const them = (o) => {
  const { src } = nguon.get(o.p) ?? { src: "" };
  DONG.push(o);
  return src;
};

// ---------- kênh: h("button") và h("a") ----------
const KHUON = new Map(); // tên hàm → { tep, chiSo, thuocTinh, lop, tong }
const dem = { "h-button-goc": 0, "h-a-goc": 0, "h-a-nut": 0, "h-role-button": 0 };
for (const p of TEP_WEB) {
  const { src, mask } = nguon.get(p);
  for (const m of mask.matchAll(/\bh\(\s*(["'])/g)) {
    const dauTen = m.index + m[0].length;
    const hetTen = src.indexOf(m[1], dauTen);
    const the = src.slice(dauTen, hetTen);
    const mo = m.index + 1;
    const dong = dongNgoac(mask, mo);
    if (dong < 0) continue;
    const args = tachPhay(mask, mo + 1, dong);
    const tt = args[1] ? docThuocTinh(p, args[1][0], args[1][1]) : {};
    const laRole = tt.role === "button";
    if (the === "a") dem["h-a-goc"]++;
    if (laRole) dem["h-role-button"]++;
    const laNutA = the === "a" && LOP_NUT.test(tt.class ?? "");
    if (the === "a" && laNutA) dem["h-a-nut"]++;
    if (the === "button") dem["h-button-goc"]++;
    if (the !== "button" && !laNutA && !laRole) continue;
    const nhanTho = args.slice(2).flatMap(([a, b]) => docNhan(p, a, b));
    // Chỉ là hàm bọc khi tham số là TOÀN BỘ chữ của nút (bỏ qua biểu tượng). Nút ghép nhiều mảnh (một hàng danh sách, thẻ bấm được) là nút thường, nhãn lúc chạy.
    const chuThat = nhanTho.filter((x) => x.kieu !== "bieu-tuong");
    const khuon = chuThat.length >= 1 && chuThat[0].kieu === "khuon" && chuThat.every((x) => x.kieu === "khuon" || x.kieu === "chu") && chuThat.length <= 2 ? chuThat[0] : null;
    const nhan = khuon ? nhanTho : nhanTho.map((x) => (x.kieu === "khuon" ? { chu: null, kieu: "bieu-thuc", raw: x.raw } : x));
    const dongSo = dongCua(src, m.index);
    const truoc = src.slice(Math.max(0, src.lastIndexOf("\n", m.index - 1) + 1), m.index);
    const bien = truoc.match(/(?:const|let)\s+([A-Za-z_$][\w$]*)(?:\s*:[^=]+)?\s*=\s*$/)?.[1] ?? truoc.match(/([A-Za-z_$][\w$.]*)\s*=\s*$/)?.[1] ?? null;
    const o = { kenh: the === "button" ? "button" : laRole ? "vai-nut" : "link", goc: the, p, i: m.index, e: dong + 1, dong: dongSo, nhan, tt, bien, href: tt.href };
    if (khuon) {
      const k = khuon.khuon;
      const khoa = `${p}::${k.ham}`;
      if (!KHUON.has(khoa)) KHUON.set(khoa, { ten: k.ham, tep: rel(k.tep), chiSo: k.chiSo, thuocTinh: k.thuocTinh, lop: tt.class ?? "", tt, p, i: m.index, e: dong + 1, dong: dongSo });
      o.kenh = "khuon";
      o.khuonTen = k.ham;
    }
    them(o);
  }
}

// ---------- kênh: gọi hàm bọc ----------
const TEN_KHUON = new Set([...KHUON.values()].map((k) => k.ten));
for (const k of KHUON.values()) {
  const ten = k.ten;
  if (["moViecKhac", "moHop", "hoiTen", "hoiXacNhan", "moBangTruot"].includes(ten)) continue;
  const tenTepKhuon = k.p.split("/").pop().replace(/\.ts$/, "");
  for (const p of TEP_WEB) {
    const { src, mask } = nguon.get(p);
    if (p !== k.p) {
      const coNhap = [...src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"\.\/([\w-]+)"/g)].some((im) => im[2] === tenTepKhuon && im[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0]).includes(ten));
      if (!coNhap) continue;
    }
    for (const m of mask.matchAll(new RegExp(`(?<![\\w$.])${ten.replace("$", "\\$")}\\s*(?:<[^>()]*>)?\\(`, "g"))) {
      const truoc = mask.slice(Math.max(0, m.index - 40), m.index);
      if (/\bfunction\s+$/.test(truoc) || /\b(const|let)\s+$/.test(truoc)) continue;
      const mo = m.index + m[0].length - 1;
      const dong = dongNgoac(mask, mo);
      if (dong < 0) continue;
      const args = tachPhay(mask, mo + 1, dong);
      const a = args[k.chiSo];
      if (!a) continue;
      let nhan;
      if (k.thuocTinh) {
        const [x, y] = catTrang(mask, a[0], a[1]);
        const tt = docThuocTinh(p, x, y);
        nhan = tt[k.thuocTinh] ? [{ chu: tt[k.thuocTinh], kieu: "chu" }] : [{ chu: null, kieu: "bieu-thuc", raw: src.slice(x, y).slice(0, 100) }];
      } else nhan = docNhan(p, a[0], a[1]);
      // Lớp nút thường do khuôn quyết định; tham số thứ hai/ba đôi khi là lớp.
      const lopGoi = args.map(([x, y]) => src.slice(x, y).trim()).find((t) => /^["'`][^"'`]*\b(btn|nut|vc-btn|pill-btn)\b/.test(t));
      them({ kenh: "goi-khuon", p, i: m.index, e: dong + 1, dong: dongCua(src, m.index), nhan, tt: { class: lopGoi ? lopGoi.slice(1, -1) : k.lop }, khuonTen: ten });
    }
  }
}

// ---------- kênh: nhãn đi qua tham số hộp ----------
function chuoiGoi(mask, src, i) {
  // Đi ngược tìm các lời gọi đang bao vị trí i.
  const ra = [];
  let d = 0;
  for (let k = i; k >= 0 && ra.length < 6; k--) {
    const c = mask[k];
    if (c === ")" || c === "]" || c === "}") d++;
    else if (c === "(" || c === "[" || c === "{") {
      if (d > 0) d--;
      else if (c === "(") {
        const m = mask.slice(Math.max(0, k - 50), k).match(/([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?$/);
        if (m) ra.push(m[1]);
      }
    }
  }
  return ra;
}
const HOP_NHAN = new Set(["moHop", "hoiTen", "moViecKhac", "hoiXacNhan", "moHopLyDo", "moHopGui", "moHopTuChoi", "hoiLyDo", "hoi", "moHoi", "moHopHoi", "moNhap"]);
const dongNhanKhac = [];
for (const p of TEP_WEB) {
  const { src, mask } = nguon.get(p);
  for (const m of mask.matchAll(/\b(nhan|nhanNguyHiem|nhanGiu|nhanNut|nutChinh|nhanXacNhan)\s*:\s*/g)) {
    const dau = m.index + m[0].length;
    // Bỏ khai báo kiểu (nhan: string).
    if (/^(string|number|boolean|\{|Child|\(|null)/.test(src.slice(dau, dau + 8))) continue;
    let d = 0;
    let k = dau;
    for (; k < mask.length; k++) {
      const c = mask[k];
      if (MO[c]) d++;
      else if (")]}".includes(c)) {
        if (d === 0) break;
        d--;
      } else if (c === "," && d === 0) break;
    }
    const nhan = docNhan(p, dau, k);
    const goi = chuoiGoi(mask, src, m.index);
    const dongSo = dongCua(src, m.index);
    const thuoc = goi.find((g) => HOP_NHAN.has(g));
    if (goi[0] && TEN_KHUON.has(goi[0]) && !["moHop", "hoiXacNhan", "hoiTen", "moViecKhac"].includes(goi[0])) continue; // đã tính ở kênh gọi hàm bọc
    if (m[1] === "nhanNguyHiem") them({ kenh: "hop-nguy-hiem", p, i: m.index, e: k, dong: dongSo, nhan, tt: { class: "btn-danger" }, thuoc: goi[0] });
    else if (m[1] === "nhanGiu") them({ kenh: "hop-giu", p, i: m.index, e: k, dong: dongSo, nhan, tt: {}, thuoc: goi[0] });
    else if (m[1] === "nutChinh" || m[1] === "nhanNut" || m[1] === "nhanXacNhan") them({ kenh: "hop-nhan", p, i: m.index, e: k, dong: dongSo, nhan, tt: { class: "btn-primary" }, thuoc: goi[0] });
    else if (goi.includes("moViecKhac")) them({ kenh: "menu-viec", p, i: m.index, e: k, dong: dongSo, nhan, tt: {}, thuoc: "moViecKhac" });
    else if (thuoc) them({ kenh: "hop-nhan", p, i: m.index, e: k, dong: dongSo, nhan, tt: { class: "btn-primary" }, thuoc });
    else dongNhanKhac.push({ tep: rel(p), dong: dongSo, goi: goi.join(" < "), nhan: nhan.map((x) => x.chu ?? x.raw).join(" | ") });
  }
  for (const m of mask.matchAll(/(?<![\w$.])(confirm)\(/g)) {
    const mo = m.index + m[0].length - 1;
    const dong = dongNgoac(mask, mo);
    const args = tachPhay(mask, mo + 1, dong);
    them({ kenh: "confirm", p, i: m.index, e: dong + 1, dong: dongCua(src, m.index), nhan: args[0] ? docNhan(p, args[0][0], args[0][1]) : [], tt: {} });
  }
}

// ---------- kênh: HTML ----------
const DONG_HTML = [];
for (const f of TEP_HTML) {
  const raw = readFileSync(f, "utf8");
  const src = raw.replace(/<!--[\s\S]*?-->/g, (x) => x.replace(/[^\n]/g, " "));
  const dongHtml = (i) => raw.slice(0, i).split("\n").length;
  const tenTrang = rel(f).replace(/^public\//, "").replace(/\.html$/, "");
  const trang = tenTrang === "index" ? "/" : `/${tenTrang}`;
  const tt = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const chu = (s) => s.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  for (const m of src.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) DONG_HTML.push({ kenh: "html-button", tep: rel(f), dong: dongHtml(m.index), tt: tt(m[1]), chu: chu(m[2]), trang });
  for (const m of src.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const t = tt(m[1]);
    if (LOP_NUT.test(t.class ?? "")) DONG_HTML.push({ kenh: "html-link", tep: rel(f), dong: dongHtml(m.index), tt: t, chu: chu(m[2]), trang });
  }
  for (const m of src.matchAll(/<input\b([^>]*\btype="(?:submit|button)"[^>]*)>/g)) {
    const t = tt(m[1]);
    DONG_HTML.push({ kenh: "vai-nut", tep: rel(f), dong: dongHtml(m.index), tt: t, chu: t.value ?? "", trang });
  }
}
// ---------- hoàn thiện từng dòng ----------
const ban = [];
for (const o of DONG) {
  const { src, mask } = nguon.get(o.p);
  // Vùng xử lý: VAR.addEventListener("click", …) gần sau chỗ dựng, thuộc tính onclick, hoặc chính lời gọi hàm bọc.
  let vung = [[o.i, o.e]];
  if (o.bien && /^[A-Za-z_$][\w$]*$/.test(o.bien)) {
    const re = new RegExp(`\\b${o.bien.replace("$", "\\$")}\\s*\\.\\s*(?:addEventListener\\(\\s*["']click["']|onclick\\s*=)`, "g");
    const che = maskSource(src, { strings: false });
    re.lastIndex = o.i;
    let m;
    while ((m = re.exec(che)) !== null) {
      if (dongCua(src, m.index) - o.dong > 80) break;
      const mo = che.indexOf("(", m.index);
      const dong = mo >= 0 && m[0].includes("addEventListener") ? dongNgoac(mask, mo) : Math.min(m.index + 600, src.length);
      if (dong > 0) vung.push([m.index, dong + 1]);
      break;
    }
    // Chữ đổi theo trạng thái: VAR.textContent = …
    const reChu = new RegExp(`\\b${o.bien.replace("$", "\\$")}\\.textContent\\s*=\\s*`, "g");
    const doi = new Set();
    for (const m2 of che.matchAll(reChu)) {
      if (Math.abs(dongCua(src, m2.index) - o.dong) > 100) continue;
      const dau = m2.index + m2[0].length;
      let k = dau;
      let d = 0;
      for (; k < che.length; k++) {
        if (MO[mask[k]]) d++;
        else if (")]}".includes(mask[k])) {
          if (d === 0) break;
          d--;
        } else if (mask[k] === ";" && d === 0) break;
      }
      for (const x of docNhan(o.p, dau, k)) if (x.chu) doi.add(x.chu);
    }
    if (doi.size) o.doiChu = [...doi];
  }
  const xl = { api: new Set(), ghi: new Set(), xacNhan: new Set(), hop: false, bao: new Set(), ham: new Set() };
  for (const [a, b] of vung) {
    const r = vungXuLy(o.p, a, b);
    for (const k of ["api", "ghi", "xacNhan", "bao", "ham"]) for (const v of r[k]) xl[k].add(v);
    xl.hop = xl.hop || r.hop;
  }
  o.xl = xl;
  o.xl = xl;
}
const nhanDep = (o) => {
  const ds = [];
  for (const x of o.nhan) {
    const t = x.chu ?? `⟪${x.raw ?? "?"}⟫`;
    if (!ds.includes(t)) ds.push(t);
  }
  return ds;
};
const kieuDep = (o) => {
  if (!o.nhan.length) return o.tt?.["aria-label"] ? "aria" : "không chữ";
  const k = new Set(o.nhan.map((x) => x.kieu));
  if (k.has("bieu-thuc")) return "biểu thức";
  if (k.has("khuon")) return "khuôn";
  if (o.nhan.length > 1) return "nhiều nhánh";
  if (k.has("mau")) return "mẫu";
  if (k.has("hang")) return "hằng";
  if (k.has("bieu-tuong")) return "biểu tượng";
  return "chữ";
};
const TU_NGUY = /Xoá|Huỷ|Gửi|Xác nhận|Duyệt|Từ chối|Bác|Khoá|Mở khoá|Ngừng|Ngưng|Thôi|Đặt lại|Đăng xuất|Thu hồi|Hoàn|Chốt|Đóng sổ|Gộp|Kết thúc|Hoàn tất|Đã giao|Đã thu|Thu |Ghi |Duyệt|Đổi|Sửa|Lưu|Tạo|Thêm|Nhận|Chuyển|Rút|Cho xe|Tắt|Bật|Áp dụng|Khôi phục|Xuất|Nhập|Tải lên|Đồng bộ|Phát hành|Mở|Chọn cấp|Đặt gấp/u;
const HANG_RA = DONG.map((o) => {
  const ghi = [...o.xl.ghi];
  const lyDo = [];
  const tong = tongCua(o.tt ?? {});
  const nhan = nhanDep(o);
  const chuoi = [...nhan, ...(o.doiChu ?? []), o.tt?.["aria-label"] ?? ""].join(" ");
  if (ghi.length) lyDo.push("ghi");
  if (tong === "nguy hiểm" || o.kenh === "hop-nguy-hiem" || o.kenh === "confirm") lyDo.push("nguy hiểm");
  if (tong === "chính") lyDo.push("nút chính");
  if (TU_NGUY.test(chuoi)) lyDo.push("từ khoá");
  return { kenh: o.kenh, tep: rel(o.p), dong: o.dong, nhan, doiChu: o.doiChu ?? [], kieu: kieuDep(o), tong, lop: o.tt?.class ?? "", aria: o.tt?.["aria-label"] ?? "", action: o.tt?.["data-action"] ?? "", id: "", href: o.tt?.href ?? "", khuon: o.khuonTen ?? o.thuoc ?? "", api: [...o.xl.api], ghi, lyDo };
});
for (const d of DONG_HTML) {
  const tong = tongCua(d.tt);
  const lyDo = [];
  if (tong === "nguy hiểm") lyDo.push("nguy hiểm");
  if (tong === "chính") lyDo.push("nút chính");
  if (TU_NGUY.test(d.chu)) lyDo.push("từ khoá");
  HANG_RA.push({ kenh: d.kenh, tep: d.tep, dong: d.dong, nhan: d.chu ? [d.chu] : [], doiChu: [], kieu: d.chu ? "chữ" : d.tt["aria-label"] ? "aria" : "không chữ", tong, lop: d.tt.class ?? "", aria: d.tt["aria-label"] ?? "", action: d.tt["data-action"] ?? "", id: d.tt.id ?? "", href: d.tt.href ?? "", khuon: "", api: [], ghi: [], lyDo });
}
HANG_RA.sort((a, b) => a.tep.localeCompare(b.tep) || a.dong - b.dong);
return HANG_RA.filter((r) => r.kenh !== "khuon");
}
