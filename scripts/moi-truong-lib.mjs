// Thư viện cho bản Development (ADR-0162). Hàm thuần: không chạm mạng, không chạy wrangler.
// Đ1: Development độc lập hoàn toàn; lớp chống nhầm là bài so cấu hình ở đây (cùng tài khoản Cloudflare, không có ranh giới vật lý).

export const CAU_HINH_DEV = "wrangler.dev.jsonc";

/** Chỗ trống đã biết trong cấu hình Development: chủ thay bằng giá trị thật sau khi tạo tài nguyên. */
const MA_D1_TRONG = "00000000-0000-0000-0000-000000000000";
const VAPID_TRONG = "CHUA_TAO";
/** Ngoại lệ duy nhất được trùng giá trị giữa hai bản (ADR-0162 Đ1): Nền tảng chỉ ĐỌC Google Sheet. */
const KHOA_VARS_DUOC_TRUNG = ["SERVICES_SHEET_ID"];
/** Khoá vars chỉ một bên có (cố ý): MOI_TRUONG chỉ ở Development; VAPID_SUB bản chính thức không khai. */
const KHOA_VARS_LECH_DUOC = ["MOI_TRUONG", "VAPID_SUB"];
const MIEN_CHINH_THUC = "booking.tourdao.vn";

/** Đọc tệp cấu hình wrangler; chỉ bỏ chú thích CẢ DÒNG (luật của tệp, như docCacKhoTuCauHinh). JSON hỏng ⇒ null. */
export function docCauHinh(text) {
  try {
    return JSON.parse(String(text).split("\n").filter((d) => !/^\s*\/\//.test(d)).join("\n"));
  } catch {
    return null;
  }
}

const mang = (x) => (Array.isArray(x) ? x : []);
const bang = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
const giong = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * So cấu hình bản chính thức với Development. Trả mảng câu tiếng Việt; rỗng = đạt.
 * Tên so đúng (không so chuỗi con, vì tên Development chứa `tourdao-sales`); riêng mã D1 và miền chính thức quét cả văn bản tệp Development.
 */
export function kiemCauHinhDev(prodText, devText) {
  const p = docCauHinh(prodText);
  const d = docCauHinh(devText);
  const loi = [];
  if (!p) loi.push("Không đọc được cấu hình bản chính thức (JSON hỏng).");
  if (!d) loi.push(`Không đọc được ${CAU_HINH_DEV} (JSON hỏng).`);
  if (!p || !d) return loi;

  const khacTen = (nhan, a, b) => {
    if (typeof b !== "string" || b === "") loi.push(`${nhan} của bản Development đang trống.`);
    else if (a === b) loi.push(`${nhan} của bản Development trùng bản chính thức ("${b}").`);
  };

  // Tên Worker, D1, kho phải khác; bộ tài nguyên phải cùng số lượng và cùng tên binding.
  khacTen("Tên Worker", p.name, d.name);

  const pd1 = mang(p.d1_databases);
  const dd1 = mang(d.d1_databases);
  if (!giong(pd1.map((x) => x?.binding), dd1.map((x) => x?.binding))) loi.push("Hai bản không có cùng bộ cơ sở dữ liệu D1 (khác binding hoặc khác số lượng).");
  pd1.forEach((x, i) => {
    const y = dd1[i];
    if (!y) return;
    khacTen(`Tên D1 ${x?.binding}`, x?.database_name, y.database_name);
    khacTen(`Mã D1 ${x?.binding}`, x?.database_id, y.database_id);
    if (x?.migrations_dir !== y.migrations_dir) loi.push(`Thư mục migration của D1 ${x?.binding} lệch giữa hai bản.`);
  });

  const pr2 = mang(p.r2_buckets);
  const dr2 = mang(d.r2_buckets);
  if (!giong(pr2.map((x) => x?.binding), dr2.map((x) => x?.binding))) loi.push("Hai bản không có cùng bộ kho tệp R2 (khác binding hoặc khác số lượng).");
  pr2.forEach((x, i) => {
    if (dr2[i]) khacTen(`Tên kho ${x?.binding}`, x?.bucket_name, dr2[i].bucket_name);
  });

  if (!giong(p.durable_objects, d.durable_objects)) loi.push("Hai bản không có cùng bộ Durable Object.");
  if (!giong(p.migrations, d.migrations)) loi.push("Hai bản không có cùng danh sách migration của Durable Object.");
  if (!giong(p.triggers, d.triggers)) loi.push("Hai bản không có cùng lịch chạy (cron).");
  if (!giong(p.send_email, d.send_email)) loi.push("Hai bản không có cùng cấu hình gửi thư (send_email).");
  if (!giong(p.compatibility_date, d.compatibility_date)) loi.push("Ngày tương thích (compatibility_date) lệch giữa hai bản.");
  if (!giong(p.observability, d.observability)) loi.push("Cấu hình quan sát (observability) lệch giữa hai bản.");
  if (!giong(p.placement, d.placement)) loi.push("Cấu hình đặt chỗ (placement) lệch giữa hai bản.");
  if (p.main !== d.main) loi.push("Điểm vào mã (main) lệch giữa hai bản.");

  // Tài sản tĩnh: cùng cách chạy, khác thư mục; Development không có khối build.
  const pa = bang(p.assets);
  const da = bang(d.assets);
  if (!giong(pa.run_worker_first, da.run_worker_first)) loi.push("Danh sách đường vào Worker trước (run_worker_first) lệch giữa hai bản.");
  if (pa.not_found_handling !== da.not_found_handling) loi.push("Cách xử lý địa chỉ lạ (not_found_handling) lệch giữa hai bản.");
  if (pa.binding !== da.binding) loi.push("Tên binding của tài sản tĩnh lệch giữa hai bản.");
  if (typeof da.directory !== "string" || da.directory === "" || da.directory === pa.directory) loi.push("Thư mục tài sản tĩnh của bản Development phải riêng, không trùng bản chính thức.");
  if (d.build !== undefined) loi.push("Cấu hình Development không được có khối build.");

  // Miền.
  const pdom = mang(p.routes).map((x) => x?.pattern);
  const ddom = mang(d.routes).map((x) => x?.pattern);
  if (ddom.length === 0) loi.push("Bản Development chưa khai miền (routes).");
  if (ddom.some((x) => pdom.includes(x))) loi.push("Miền của bản Development trùng miền bản chính thức.");

  // Biến công khai.
  const pv = bang(p.vars);
  const dv = bang(d.vars);
  if ("MOI_TRUONG" in pv) loi.push("Cấu hình bản chính thức không được có biến MOI_TRUONG.");
  if (dv.MOI_TRUONG !== "development") loi.push('Biến MOI_TRUONG của bản Development phải đúng "development".');
  const khoa = new Set([...Object.keys(pv), ...Object.keys(dv)]);
  for (const k of khoa) {
    if (KHOA_VARS_LECH_DUOC.includes(k)) continue;
    if (!(k in pv) || !(k in dv)) {
      loi.push(`Biến ${k} chỉ có ở một trong hai bản.`);
      continue;
    }
    if (KHOA_VARS_DUOC_TRUNG.includes(k)) {
      if (pv[k] !== dv[k]) loi.push(`Biến ${k} phải giống bản chính thức (ngoại lệ duy nhất được trùng).`);
    } else {
      khacTen(`Biến ${k}`, pv[k], dv[k]);
    }
  }
  if (typeof dv.VAPID_SUB !== "string" || dv.VAPID_SUB === "") loi.push("Bản Development chưa khai biến VAPID_SUB.");
  else if (pv.VAPID_SUB !== undefined) khacTen("Biến VAPID_SUB", pv.VAPID_SUB, dv.VAPID_SUB);

  // Quét cả văn bản tệp Development (kể cả chú thích): mã D1 và miền của bản chính thức không được xuất hiện.
  const text = String(devText);
  for (const x of pd1) {
    if (typeof x?.database_id === "string" && x.database_id !== "" && text.includes(x.database_id)) loi.push(`Văn bản ${CAU_HINH_DEV} chứa mã D1 của bản chính thức.`);
  }
  if (text.includes(MIEN_CHINH_THUC)) loi.push(`Văn bản ${CAU_HINH_DEV} chứa miền của bản chính thức (${MIEN_CHINH_THUC}).`);
  return loi;
}

/** Giá trị trong cấu hình Development còn là chỗ trống (chủ chưa thay bằng giá trị thật). Cấu hình hỏng ⇒ báo cả hai. */
export function conChoTrong(devText) {
  const d = docCauHinh(devText);
  if (!d) return ["database_id", "VAPID_PUBLIC_KEY"];
  const ra = [];
  if (mang(d.d1_databases).some((x) => x?.database_id === MA_D1_TRONG)) ra.push("database_id");
  if (bang(d.vars).VAPID_PUBLIC_KEY === VAPID_TRONG) ra.push("VAPID_PUBLIC_KEY");
  return ra;
}
