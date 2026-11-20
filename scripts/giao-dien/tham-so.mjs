// Phân tích tham số và tìm axe cho do-man.mjs — hàm thuần (không đọc đĩa, không đọc môi trường thật), có bài kiểm ở src/giao-dien-tham-so.test.ts.
import { isAbsolute, join, relative, resolve } from "node:path";

export const BO_HOP_LE = ["SALES", "INTERN", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "DRIVER", "DRIVER_PARTNER", "HR", "SALES_MANAGER", "KHACH"];
export const KHO_HOP_LE = [390, 1280];
const CO_CO_GIA_TRI = new Set(["--o", "--kho", "--tiem", "--ra", "--han-phut"]);
const CO_KHONG_GIA_TRI = new Set(["--khong-axe"]);

/** `goc` = gốc kho (mặc định thư mục chạy). Ném Error tiếng Việt khi tham số sai. */
export function phanTichThamSo(argv, { goc = process.cwd() } = {}) {
  const v = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (CO_KHONG_GIA_TRI.has(a)) { v[a] = true; continue; }
    if (!CO_CO_GIA_TRI.has(a)) throw new Error(`Tham số lạ: ${a}`);
    const giaTri = argv[i + 1];
    if (giaTri === undefined || giaTri.startsWith("--")) throw new Error(`${a} thiếu giá trị`);
    v[a] = giaTri;
    i++;
  }
  if (!v["--o"]) throw new Error("Thiếu --o <BỘ:/trang>[,<BỘ:/trang>…], ví dụ --o SALES:/order-form");
  const o = v["--o"].split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^([A-Z_]+):(\/.*)$/);
    if (!m) throw new Error(`Ô «${s}» sai dạng, cần BỘ:/trang (ví dụ SALES:/orders)`);
    if (!BO_HOP_LE.includes(m[1])) throw new Error(`Bộ quyền lạ «${m[1]}». Hợp lệ: ${BO_HOP_LE.join(", ")}`);
    return { bo: m[1], trang: m[2] };
  });
  if (!o.length) throw new Error("--o rỗng");
  const kho = v["--kho"] ? v["--kho"].split(",").map((s) => Number(s.trim())) : [...KHO_HOP_LE];
  for (const k of kho) if (!KHO_HOP_LE.includes(k)) throw new Error(`Khổ ${k} không hỗ trợ (chỉ ${KHO_HOP_LE.join(" và ")})`);
  const hanPhut = v["--han-phut"] === undefined ? 20 : Number(v["--han-phut"]);
  if (!Number.isFinite(hanPhut) || hanPhut <= 0) throw new Error("--han-phut phải là số dương");
  let ra = null;
  if (v["--ra"]) {
    ra = resolve(goc, v["--ra"]);
    const rel = relative(resolve(goc), ra);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error(`--ra (${ra}) nằm trong kho: ảnh và số đo không được ghi vào kho (kho công khai). Chọn thư mục ngoài kho.`);
  }
  return { o, kho, tiem: v["--tiem"] ?? null, ra, khongAxe: !!v["--khong-axe"], hanPhut };
}

/**
 * Tìm tệp axe. Có AXE_JS: dùng đúng nó, không tồn tại thì ném lỗi (không lặng lẽ đổi chỗ khác).
 * Không có AXE_JS (hoặc rỗng): node_modules/axe-core/axe.min.js của kho; không thấy thì null.
 */
export function timAxe({ env, tonTai, goc = process.cwd() }) {
  if (env.AXE_JS) {
    if (!tonTai(env.AXE_JS)) throw new Error(`AXE_JS trỏ tới tệp không tồn tại: ${env.AXE_JS}`);
    return env.AXE_JS;
  }
  const mac = join(goc, "node_modules", "axe-core", "axe.min.js");
  return tonTai(mac) ? mac : null;
}
