// Thư viện cho bản Development (ADR-0162). Hàm thuần: không chạm mạng, không chạy wrangler.
// Cũng chứa `lenDev` (lệnh `npm run len-dev`, Đ5): chạy wrangler THẬT lên Development qua bộ chạy tiêm vào; test dùng bộ chạy giả.
// Đ1: Development độc lập hoàn toàn; lớp chống nhầm là bài so cấu hình ở đây (cùng tài khoản Cloudflare, không có ranh giới vật lý).

import { KHOA_BAT_BUOC, KHOA_HAI_LOP, NOT_TTY, docCacKhoTuCauHinh, isSafeBranchName, makeStop, parseR2BucketNames, parseSecretNames, trimOut } from "./release-lib.mjs";

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

// ─────────────────────────── len-dev (ADR-0162 Đ5) ───────────────────────────
// Lệnh DUY NHẤT AI được chạy chạm wrangler. Hàng rào (hook) không nhìn được bên trong, nên chính lệnh tự kiểm: cấu hình đạt bài so, không còn chỗ trống,
// thư mục sạch, rồi mới dựng và ghi. Rủi ro số một: một lời gọi wrangler thiếu `--config wrangler.dev.jsonc` ghi thẳng lên bản chính thức.
// Vì vậy MỌI wrangler đi qua đúng hàm `wr` dưới đây (gắn --config và CI=1); bài src/moi-truong-lib.test.ts đếm: tên lệnh wrangler (trong dấu nháy kép) chỉ xuất hiện MỘT lần trong tệp này.

const CHO_THU_LAI_MA_MS = 20_000;
const MA_COMMIT = /^[0-9a-f]{40}$/;
/** Tên bảng migration mặc định của wrangler (cấu hình Development không đổi tên bảng). */
const DOC_MIGRATION_SQL = "SELECT name FROM d1_migrations";

/** Mã commit bản Development đang chạy (đọc /ban-thu.json do dung-tai-san-dev ghi); null khi lỗi mạng, không phải JSON, hay mã sai khuôn. */
export async function docCommitDev(goi = fetch) {
  try {
    const res = await goi(`https://dev.tourdao.vn/ban-thu.json?t=${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
    if (!res?.ok) return null;
    const j = await res.json();
    return typeof j?.commit === "string" && MA_COMMIT.test(j.commit) ? j.commit : null;
  } catch {
    return null;
  }
}

/** Hàm DUY NHẤT gọi wrangler (dùng chung `lenDev` và `lamMoiDev`): luôn gắn --config bản Development và CI=1. Không có đường gọi nào khác. */
function taoWr(run) {
  return (thamSo, opts = {}) => run("npx", ["wrangler", ...thamSo, "--config", CAU_HINH_DEV], { ...opts, env: { CI: "1" } });
}

/**
 * @param run  (cmd, args, { env, stream }) → { code, stdout, stderr } (hoặc Promise)
 * @param args tham số dòng lệnh (không nhận tham số nào)
 * @param docTep (tên tệp ở thư mục gốc) → nội dung chữ
 * @param tenMigration tên các tệp .sql ở migrations/
 * @param docCommitDev đọc mã bản đang chạy trên Development
 * @param sleep chờ trước khi thử lại đọc mã
 * @returns mã thoát (0 = xong)
 */
export async function lenDev({ run, log, args = [], docTep, tenMigration, docCommitDev: docMa = docCommitDev, sleep }) {
  const stop = makeStop(log);
  const wr = taoWr(run);
  const HD_CONFIG = ` --config ${CAU_HINH_DEV}`;

  if (args.filter((a) => a !== "--").length) return stop("lệnh này không nhận tham số. Dùng: npm run len-dev");

  // 1. cấu hình: đột biến và chỗ trống (trước cả kiểm thư mục)
  let prodText;
  let devText;
  try {
    prodText = docTep("wrangler.jsonc");
    devText = docTep(CAU_HINH_DEV);
  } catch (e) {
    return stop(`không đọc được tệp cấu hình (${String(e?.message ?? e).slice(0, 200)}). CHƯA có gì bị đổi.`);
  }
  const loi = kiemCauHinhDev(prodText, devText);
  if (loi.length) return stop(`cấu hình Development không đạt bài so với bản chính thức — CHƯA có gì bị đổi.`, ...loi.map((l) => `  - ${l}`));
  const trong = conChoTrong(devText);
  if (trong.length) {
    return stop(`${CAU_HINH_DEV} còn chỗ trống chưa thay bằng giá trị thật: ${trong.join(", ")}. CHƯA có gì bị đổi.`, "Chủ tạo tài nguyên Development một lần (danh sách lệnh AI soạn sẵn) rồi điền giá trị.");
  }
  const cfg = docCauHinh(devText);
  const tenDb = cfg?.d1_databases?.[0]?.database_name;
  if (typeof tenDb !== "string" || tenDb === "") return stop(`không đọc được tên D1 trong ${CAU_HINH_DEV}. CHƯA có gì bị đổi.`);

  // 2. thư mục sạch; mã để dựng
  const sach = async (nhan) => {
    const st = await run("git", ["status", "--porcelain"]);
    if (st.code !== 0) return stop(`không đọc được trạng thái thư mục (\`git status\` lỗi) ${nhan}.`);
    const t = trimOut(st);
    return t === "" ? null : { bat: t };
  };
  const s1 = await sach("");
  if (s1 && typeof s1 === "number") return s1;
  if (s1) return stop("thư mục còn thay đổi chưa commit. Commit hoặc bỏ chúng rồi chạy lại. CHƯA có gì bị đổi.", s1.bat);
  const head = await run("git", ["rev-parse", "HEAD"]);
  const ma = trimOut(head);
  if (head.code !== 0 || !MA_COMMIT.test(ma)) return stop("không đọc được mã commit hiện tại (`git rev-parse HEAD` lỗi). CHƯA có gì bị đổi.");

  // 3. dựng
  log("\n▶ npm run build:web");
  if ((await run("npm", ["run", "build:web"], { stream: true })).code !== 0) return stop("`npm run build:web` đỏ. CHƯA có gì bị đổi trên Development.");
  log("\n▶ Dựng tài sản riêng của bản Development (dist-dev)");
  if ((await run("node", ["scripts/dung-tai-san-dev.mjs", ma], { stream: true })).code !== 0) return stop("dựng tài sản Development đỏ. CHƯA có gì bị đổi trên Development.");
  const s2 = await sach("sau khi dựng");
  if (s2 && typeof s2 === "number") return s2;
  if (s2) {
    return stop(
      "lệnh dựng làm đổi các tệp sau (tệp sinh ra chưa được commit, nên mã đưa lên không khớp commit). Hãy commit chúng rồi chạy lại. CHƯA có gì bị đổi trên Development.",
      s2.bat,
    );
  }

  // 4. cổng chỉ-đọc (mọi lệnh dưới đây qua `wr`)
  log("\n▶ Kiểm đăng nhập Cloudflare");
  const who = await wr(["whoami"]);
  if (who.code !== 0 || !/You are logged in/i.test(`${who.stdout}\n${who.stderr ?? ""}`)) {
    return stop("chưa đăng nhập Cloudflare. CHƯA có gì bị đổi trên Development.", "Chủ chạy `npx wrangler login` (đúng tài khoản Lưu Tuấn Vũ) rồi chạy lại.");
  }

  log("\n▶ Cổng chỉ-đọc: khoá bí mật của Development");
  const sec = await wr(["secret", "list", "--format", "json"]);
  if (sec.code !== 0) return stop("`wrangler secret list` lỗi — chưa kiểm được khoá bí mật nên KHÔNG đi tiếp. CHƯA có gì bị đổi.", String(sec.stderr ?? "").trim().slice(0, 400));
  const tenKhoa = parseSecretNames(String(sec.stdout ?? ""));
  if (tenKhoa === null) return stop("không đọc được danh sách khoá bí mật (đầu ra lạ) — KHÔNG đi tiếp. CHƯA có gì bị đổi.", String(sec.stdout ?? "").slice(0, 400));
  const thieuKhoa = [...KHOA_BAT_BUOC, KHOA_HAI_LOP].filter((k) => !tenKhoa.includes(k));
  if (thieuKhoa.length) {
    return stop(
      `Development chưa có khoá: ${thieuKhoa.join(", ")}. CHƯA có gì bị đổi.`,
      `Chủ chạy trong Terminal, ở thư mục tourdao-sales:\n${thieuKhoa.map((k) => `  ${k === KHOA_HAI_LOP ? "openssl rand -base64 32" : "openssl rand -base64 48 | tr -d '\\n'"} | npx wrangler secret put ${k}${HD_CONFIG}`).join("\n")}\nrồi chạy lại \`npm run len-dev\`.`,
    );
  }

  log("\n▶ Cổng chỉ-đọc: kho tệp của Development");
  const cacKho = docCacKhoTuCauHinh(devText);
  if (!cacKho) return stop(`không đọc được mục kho tệp (r2_buckets) trong ${CAU_HINH_DEV}. CHƯA có gì bị đổi.`);
  const kho = await wr(["r2", "bucket", "list"]);
  if (kho.code !== 0) return stop("`wrangler r2 bucket list` lỗi — chưa kiểm được kho tệp nên KHÔNG đi tiếp. CHƯA có gì bị đổi.", String(kho.stderr ?? "").trim().slice(0, 400));
  const coKho = parseR2BucketNames(String(kho.stdout ?? ""));
  const thieuKho = cacKho.filter((k) => !coKho.includes(k.ten));
  if (thieuKho.length) {
    return stop(
      `Development chưa có kho tệp: ${thieuKho.map((k) => k.ten).join(", ")}. CHƯA có gì bị đổi.`,
      `Chủ chạy trong Terminal, ở thư mục tourdao-sales (nếu wrangler hỏi có sửa cấu hình không thì trả lời n):\n${thieuKho.map((k) => `  npx wrangler r2 bucket create ${k.ten}${HD_CONFIG}`).join("\n")}\nrồi chạy lại \`npm run len-dev\`.`,
    );
  }

  log("\n▶ Cổng chỉ-đọc: migration đã áp trên Development");
  const doc = await wr(["d1", "execute", tenDb, "--remote", "--json", "--command", DOC_MIGRATION_SQL]);
  let daAp = [];
  if (doc.code !== 0) {
    if (!/no such table: d1_migrations/i.test(`${doc.stdout ?? ""}\n${doc.stderr ?? ""}`)) {
      return stop("không đọc được danh sách migration đã áp trên Development. CHƯA có gì bị đổi.", String(doc.stderr ?? "").trim().slice(0, 400));
    }
  } else {
    const o = String(doc.stdout ?? "");
    const i = o.indexOf("[");
    const j = o.lastIndexOf("]");
    try {
      const x = JSON.parse(o.slice(i, j + 1));
      const kqs = x?.[0]?.results;
      if (!Array.isArray(kqs) || !kqs.every((r) => typeof r?.name === "string")) throw new Error("dạng lạ");
      daAp = kqs.map((r) => r.name);
    } catch {
      return stop("đầu ra đọc migration đã áp của Development không hiểu được. CHƯA có gì bị đổi.", o.slice(0, 400));
    }
  }
  const la = daAp.filter((n) => !tenMigration.includes(n));
  if (la.length) {
    return stop(
      `Development đã áp migration không có trong migrations/ của mã này: ${la.join(", ")} (Development đang mang một nhánh khác). CHƯA có gì bị đổi.`,
      "Chủ chạy `npm run lam-moi-dev` để dựng lại Development từ đầu, rồi chạy lại lệnh này.",
    );
  }

  // 5. cổng cuối đã qua: từ đây là lệnh GHI (chỉ lên Development nhờ `wr`)
  log("\n▶ Áp migration lên Development");
  if ((await wr(["d1", "migrations", "apply", tenDb, "--remote"], { stream: true })).code !== 0) {
    return stop("áp migration lên Development LỖI — KHÔNG deploy. Đọc lỗi ở trên.");
  }
  log("\n▶ Deploy Worker Development");
  if ((await wr(["deploy"], { stream: true })).code !== 0) return stop("`wrangler deploy` lên Development LỖI — Worker Development có thể chưa đổi. Đọc lỗi ở trên.");

  // 6. đọc lại mã đang chạy
  log("\n▶ Kiểm mã đang chạy trên dev.tourdao.vn");
  let dang = await docMa();
  if (dang !== ma) {
    log(`Mã đọc được (${dang ? dang.slice(0, 8) : "chưa đọc được"}) chưa khớp mã vừa đưa lên (${ma.slice(0, 8)}) — chờ ${CHO_THU_LAI_MA_MS / 1000} giây rồi thử lại một lần.`);
    await sleep(CHO_THU_LAI_MA_MS);
    dang = await docMa();
  }
  if (dang !== ma) {
    return stop(`mã đang chạy trên dev.tourdao.vn (${dang ? dang.slice(0, 8) : "không đọc được"}) khác mã vừa đưa lên (${ma.slice(0, 8)}). Chờ vài phút rồi kiểm lại tay: https://dev.tourdao.vn/ban-thu.json`);
  }
  log(`Đã đưa mã ${ma.slice(0, 8)} lên dev.tourdao.vn.`);
  return 0;
}

// ─────────────────────── len-chinh-thuc (ADR-0162 Đ4, Đ5) ───────────────────────
// Chủ gõ MỘT lệnh: chỉ lên chính thức khi đúng bản (mã commit) đã thử trên Development. Gọi `day-len` và `trien-khai` thành TIẾN TRÌNH CON,
// không gọi hàm trực tiếp: trien-khai.mjs đọc số phiên bản lúc khởi động, cùng tiến trình sẽ dùng số phiên bản trước khi gộp.
// `day-len` chỉ gộp tiến thẳng nên mã nhánh không đổi sau khi nhập; vì vậy so mã nhánh với mã Development là đủ.

/** Đúng khi mọi tệp đổi là tài liệu: thuộc docs/, .claude/, hoặc là .md ngoài public/. Mảng rỗng ⇒ sai (không có gì để khẳng định). */
export function chiDoiTaiLieu(tenTep) {
  if (!Array.isArray(tenTep) || tenTep.length === 0) return false;
  return tenTep.every((t) => typeof t === "string" && !t.startsWith("public/") && (t.startsWith("docs/") || t.startsWith(".claude/") || t.endsWith(".md")));
}

const CACH_DUNG_LENH = "Gõ ở thư mục gốc `tourdao-sales` (không phải thư mục làm việc của nhánh), đứng ở nhánh `main`, thư mục sạch (không còn thay đổi chưa commit).";

/**
 * @param run (cmd, args, { stream }) → { code, stdout, stderr }
 * @param target tên nhánh cần đưa lên
 * @param docCommitDev đọc mã bản đang chạy trên Development
 * @returns mã thoát (0 = xong)
 */
export async function lenChinhThuc({ run, log, isTTY, target, docCommitDev: docMa = docCommitDev }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);
  if (!isSafeBranchName(target)) return stop("thiếu hoặc sai tên nhánh. Dùng: npm run len-chinh-thuc -- <tên-nhánh>", CACH_DUNG_LENH);

  const ma = await run("git", ["rev-parse", target]);
  const maNhanh = trimOut(ma);
  if (ma.code !== 0 || !MA_COMMIT.test(maNhanh)) return stop(`không đọc được mã của nhánh ${target}. CHƯA có gì bị đổi.`, CACH_DUNG_LENH);
  const tep = await run("git", ["diff", "--name-only", "--no-renames", `main...${target}`]);
  if (tep.code !== 0) return stop("không đọc được danh sách tệp mà nhánh đã đổi. CHƯA có gì bị đổi.", CACH_DUNG_LENH);
  const dsTep = trimOut(tep).split("\n").filter(Boolean);

  const nhap = async () => {
    log("\n▶ npm run day-len -- " + target);
    return (await run("npm", ["run", "day-len", "--", target], { stream: true })).code;
  };

  if (chiDoiTaiLieu(dsTep)) {
    const c = await nhap();
    if (c !== 0) return c;
    log("Nhánh này chỉ đổi tài liệu nên đã nhập vào bản chính, và KHÔNG cần triển khai (Nền tảng đang chạy không đổi).");
    return 0;
  }

  const dev = await docMa();
  if (dev === null || dev === undefined) return stop("không đọc được mã bản đang chạy trên dev.tourdao.vn (https://dev.tourdao.vn/ban-thu.json). CHƯA có gì bị đổi.");
  if (dev !== maNhanh) {
    return stop(
      `bản trên dev.tourdao.vn (${dev.slice(0, 8)}) không phải bản của nhánh ${target} (${maNhanh.slice(0, 8)}). CHƯA có gì bị đổi.`,
      "Chạy `npm run len-dev` từ nhánh này, thử trên dev.tourdao.vn, rồi chạy lại lệnh này.",
    );
  }

  const code = await nhap();
  if (code !== 0) return code;
  const [m, o] = [await run("git", ["rev-parse", "main"]), await run("git", ["rev-parse", "origin/main"])];
  if (m.code !== 0 || o.code !== 0 || trimOut(m) !== maNhanh || trimOut(o) !== maNhanh) {
    return stop("sau khi nhập, `main` hoặc `origin/main` không đúng mã bản đã thử. KHÔNG triển khai.", CACH_DUNG_LENH);
  }

  log("\n▶ npm run trien-khai");
  const tk = (await run("npm", ["run", "trien-khai"], { stream: true })).code;
  if (tk !== 0) {
    log("Đã nhập, chưa triển khai: bản đã vào `main` và lên GitHub, nhưng bước triển khai lên booking.tourdao.vn chưa xong.");
    log("Để làm tiếp, gõ `npm run trien-khai` ở thư mục gốc `tourdao-sales`, đứng ở nhánh `main`, thư mục sạch.");
  }
  return tk;
}

// ─────────────────────────── lam-moi-dev (ADR-0162 Đ2) ───────────────────────────
// Xoá SẠCH D1 của bản Development rồi dựng lại từ migration và gieo bảy tài khoản thử. CHỦ gõ; hook chặn AI.
// Rủi ro số một: một lời gọi thiếu --config xoá D1 THẬT. Vì vậy chỉ qua `taoWr`, và `ghi` kiểm tên D1 kết thúc `-dev-db` ngay trước MỖI lệnh ghi.
// Chỉ dùng --command (không --file: `--remote --file` hỏng với OAuth). PIN chỉ in ra Terminal, không ghi tệp.

const TEN_DOI_TUONG = /^[A-Za-z0-9_]+$/;
const dongNhay = (t) => `"${t}"`;

/**
 * @param run  như lenDev
 * @param ask  (câu hỏi) → Promise<chữ trả lời>
 * @param isTTY có terminal thật
 * @param docTep (tên tệp) → nội dung chữ
 * @param taoTaiKhoan () → [{ name, phone, pin, permissions }]
 * @param sqlTaiKhoan (tài khoản) → Promise<chuỗi SQL tạo tài khoản>
 * @returns mã thoát (0 = xong)
 */
export async function lamMoiDev({ run, ask, log, isTTY, docTep, taoTaiKhoan, sqlTaiKhoan }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);

  // 1. cấu hình: đột biến, chỗ trống, tên D1 (trước cả khi hỏi và trước mọi lệnh)
  let prodText;
  let devText;
  try {
    prodText = docTep("wrangler.jsonc");
    devText = docTep(CAU_HINH_DEV);
  } catch (e) {
    return stop(`không đọc được tệp cấu hình (${String(e?.message ?? e).slice(0, 200)}). CHƯA có gì bị đổi.`);
  }
  const loi = kiemCauHinhDev(prodText, devText);
  if (loi.length) return stop("cấu hình Development không đạt bài so với bản chính thức — CHƯA có gì bị đổi.", ...loi.map((l) => `  - ${l}`));
  const trong = conChoTrong(devText);
  if (trong.length) return stop(`${CAU_HINH_DEV} còn chỗ trống chưa thay bằng giá trị thật: ${trong.join(", ")}. CHƯA có gì bị đổi.`);
  const tenDb = docCauHinh(devText)?.d1_databases?.[0]?.database_name;
  if (typeof tenDb !== "string" || !tenDb.endsWith("-dev-db")) return stop(`tên D1 trong ${CAU_HINH_DEV} phải kết thúc bằng "-dev-db". CHƯA có gì bị đổi.`);

  // 2. xác nhận bằng chữ
  log(`Lệnh này XOÁ SẠCH mọi bảng và dữ liệu trong cơ sở dữ liệu ${tenDb} (bản Development), rồi dựng lại và tạo bảy tài khoản thử.`);
  log("Không đụng bản chính thức. Kho tệp (R2) và Bảng tin của Development KHÔNG được dọn.");
  const tra = await ask("Gõ đúng chữ dev để tiếp tục: ");
  if (tra !== "dev") return stop("câu trả lời không phải đúng chữ `dev`. CHƯA có gì bị đổi.");

  const wr = taoWr(run);
  const d1 = (sql, opts) => wr(["d1", "execute", tenDb, "--remote", "--json", "--command", sql], opts);
  // Mọi lệnh GHI đi qua đây: kiểm lại tên D1 ngay trước khi ghi.
  const ghi = (sql) => {
    if (!tenDb.endsWith("-dev-db")) throw new Error("tên D1 không kết thúc bằng -dev-db");
    return d1(sql);
  };
  const xong = [];
  const dungTai = (buoc, r) =>
    stop(
      `bước "${buoc}" LỖI. Đã làm tới: ${xong.length ? xong.join(" → ") : "chưa có gì (CHƯA có gì bị đổi)"}. Development đang ở trạng thái nửa chừng nếu đã xoá; chạy lại \`npm run lam-moi-dev\` để làm lại từ đầu.`,
      String(r?.stderr ?? "").trim().slice(0, 400),
    );

  // 3. đọc danh sách đối tượng
  log("\n▶ Đọc danh sách bảng và view của Development");
  const doc = await d1("SELECT type, name FROM sqlite_master");
  if (doc.code !== 0) return stop("không đọc được danh sách đối tượng của Development. CHƯA có gì bị đổi.", String(doc.stderr ?? "").trim().slice(0, 400));
  let dong;
  try {
    const o = String(doc.stdout ?? "");
    const x = JSON.parse(o.slice(o.indexOf("["), o.lastIndexOf("]") + 1));
    dong = x?.[0]?.results;
    if (!Array.isArray(dong) || !dong.every((r) => typeof r?.type === "string" && typeof r?.name === "string")) throw new Error("dạng lạ");
  } catch {
    return stop("đầu ra danh sách đối tượng của Development không hiểu được. CHƯA có gì bị đổi.", String(doc.stdout ?? "").slice(0, 400));
  }
  dong = dong.filter((r) => !r.name.startsWith("sqlite_") && !r.name.startsWith("_cf_"));
  const lat = dong.filter((r) => (r.type === "table" || r.type === "view") && !TEN_DOI_TUONG.test(r.name));
  if (lat.length) return stop(`có đối tượng tên lạ, không dám xoá: ${lat.map((r) => JSON.stringify(r.name)).join(", ")}. CHƯA có gì bị đổi.`);
  const view = dong.filter((r) => r.type === "view").map((r) => r.name);
  const bang = dong.filter((r) => r.type === "table").map((r) => r.name);

  // 4. xoá. Trigger và chỉ mục mất theo bảng (SQLite không chạy trigger khi xoá bảng), nên không xoá riêng.
  if (view.length) {
    log("\n▶ Xoá view");
    const r = await ghi(view.map((n) => `DROP VIEW IF EXISTS ${dongNhay(n)};`).join(" "));
    if (r.code !== 0) return dungTai("xoá view", r);
    xong.push("xoá view");
  }
  if (bang.length) {
    log("\n▶ Xoá bảng");
    const r = await ghi(`PRAGMA defer_foreign_keys = ON; ${bang.map((n) => `DROP TABLE IF EXISTS ${dongNhay(n)};`).join(" ")}`);
    if (r.code !== 0) return dungTai("xoá bảng", r);
    xong.push("xoá bảng");
  }

  // 5. dựng lại
  log("\n▶ Áp lại toàn bộ migration");
  if (!tenDb.endsWith("-dev-db")) return stop("tên D1 không kết thúc bằng -dev-db.");
  const ap = await wr(["d1", "migrations", "apply", tenDb, "--remote"], { stream: true });
  if (ap.code !== 0) return dungTai("áp migration", ap);
  xong.push("áp migration");

  // 6. gieo tài khoản thử, mỗi tài khoản một --command
  const lam = [];
  for (const a of taoTaiKhoan()) {
    const r = await ghi(await sqlTaiKhoan(a));
    if (r.code !== 0) {
      return stop(`tạo tài khoản ${a.phone} LỖI. Đã tạo: ${lam.length ? lam.map((x) => x.phone).join(", ") : "chưa có"}. Chạy lại \`npm run lam-moi-dev\` để làm lại từ đầu.`, String(r.stderr ?? "").trim().slice(0, 400));
    }
    lam.push(a);
  }

  // 7. PIN chỉ in ra Terminal này
  log("\n================ TÀI KHOẢN THỬ (Development) ================");
  for (const a of lam) log(`  ${a.permissions.join(",").padEnd(15)}  SĐT ${a.phone}  PIN ${a.pin}`);
  log("PIN chỉ hiện ở đây một lần, không lưu vào đâu.");
  log("Kho tệp và Bảng tin của Development không được dọn lần này.");
  log("==============================================================");
  return 0;
}
