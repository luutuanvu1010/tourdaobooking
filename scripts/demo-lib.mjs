// Thư viện cho BẢN DÙNG THỬ (ADR-0223) ở demo.tourdao.vn. Hàm thuần + `lenDemo` (lệnh `npm run len-demo`, CHỦ gõ; hàng rào chặn AI) chạy wrangler qua bộ chạy tiêm.
// Lớp chống nhầm số một: bài so BA cấu hình (chính thức, Development, dùng thử) — cùng tài khoản Cloudflare nên không có ranh giới vật lý.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { CAU_DAT_CHO_NAP, CHU_DAI } from "../src/shared/ban-dung-thu.ts";
import { CAU_HINH_DEV, docCauHinh, kiemCauHinhDev } from "./moi-truong-lib.mjs";
import { quetBanChinh } from "./dung-tai-san-dev.mjs";
import { KHOA_BAT_BUOC, KHOA_HAI_LOP, NOT_TTY, docCacKhoTuCauHinh, makeStop, parseR2BucketNames, parseSecretNames, trimOut } from "./release-lib.mjs";

export const CAU_HINH_DEMO = "wrangler.demo.jsonc";
export const MIEN_DEMO = "demo.tourdao.vn";
const MA_D1_TRONG = "00000000-0000-0000-0000-000000000000";
const DUOI_D1_DEMO = "-demo-db";
/** Bí mật bản dùng thử cần thêm ngoài bộ chung: hai PIN đặt lại mỗi lần làm sạch. */
export const KHOA_DUNG_THU = ["DUNG_THU_PIN", "DUNG_THU_PIN_TOAN_QUYEN"];

const mang = (x) => (Array.isArray(x) ? x : []);
const bang = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

/** Mọi định danh tài nguyên của một cấu hình (để so chéo): tên Worker, tên / mã D1, tên kho, miền, biến theo miền. Bỏ chỗ trống. */
function dinhDanh(c) {
  const v = bang(c?.vars);
  return [
    c?.name,
    ...mang(c?.d1_databases).flatMap((x) => [x?.database_name, x?.database_id]),
    ...mang(c?.r2_buckets).map((x) => x?.bucket_name),
    ...mang(c?.routes).map((x) => x?.pattern),
    v.PASSKEY_RP_ID, v.PASSKEY_ORIGIN, v.VAPID_SUB, v.VAPID_PUBLIC_KEY,
  ].filter((x) => typeof x === "string" && x !== "" && x !== MA_D1_TRONG);
}

/** So bản dùng thử với bản chính thức (đủ bộ bài của bản Development) VÀ với bản Development (không trùng định danh). Rỗng = đạt. */
export function kiemCauHinhDemo(prodText, devText, demoText) {
  const loi = kiemCauHinhDev(prodText, demoText, {
    ten: "bản dùng thử", tep: CAU_HINH_DEMO, moiTruong: "demo", d1Them: ["KHOA_DUNG_THU"], varsRieng: ["BAN_DUNG_THU"], duongWorkerTruocThem: ["/__ban-mau.json"],
  });
  const p = docCauHinh(prodText);
  const d = docCauHinh(devText);
  const m = docCauHinh(demoText);
  if (!d) loi.push(`Không đọc được ${CAU_HINH_DEV} (JSON hỏng).`);
  if (!m) return loi;
  if (bang(m.vars).BAN_DUNG_THU !== "bat") loi.push('Biến BAN_DUNG_THU của bản dùng thử phải đúng "bat".');
  if (d && "BAN_DUNG_THU" in bang(d.vars)) loi.push("Cấu hình bản Development không được có biến BAN_DUNG_THU.");
  if (p && "BAN_DUNG_THU" in bang(p.vars)) loi.push("Cấu hình bản chính thức không được có biến BAN_DUNG_THU.");
  const cuaM = dinhDanh(m);
  const taiNguyen = [...mang(m.d1_databases).flatMap((x) => [x?.database_name, x?.database_id]), ...mang(m.r2_buckets).map((x) => x?.bucket_name)].filter((x) => typeof x === "string" && x !== MA_D1_TRONG);
  if (new Set(taiNguyen).size !== taiNguyen.length) loi.push("Cấu hình bản dùng thử dùng một tên / mã tài nguyên hai lần.");
  if (d) for (const x of dinhDanh(d)) if (cuaM.includes(x)) loi.push(`Bản dùng thử trùng tài nguyên với bản Development ("${x}").`);
  for (const x of mang(m.d1_databases)) if (x?.binding === "DB" && !String(x?.database_name).endsWith(DUOI_D1_DEMO)) loi.push(`Tên D1 dữ liệu của bản dùng thử phải kết thúc bằng "${DUOI_D1_DEMO}".`);
  if (!mang(m.routes).some((x) => x?.pattern === MIEN_DEMO)) loi.push(`Bản dùng thử phải ở miền ${MIEN_DEMO}.`);
  return loi;
}

/** Chỗ trống còn lại (chủ chưa thay bằng giá trị thật). */
export function conChoTrongDemo(demoText) {
  const m = docCauHinh(demoText);
  if (!m) return ["(cấu hình hỏng)"];
  return mang(m.d1_databases).filter((x) => x?.database_id === MA_D1_TRONG).map((x) => `database_id của ${x?.binding}`);
}

const DAI_CSS = `
/* BẢN DÙNG THỬ (ADR-0223 Đ4): chỉ có ở demo.tourdao.vn, do scripts/dung-tai-san-demo.mjs nối vào. Khuôn dải của bản Development (ADR-0162 Đ3). */
html::before {
  content: "${CHU_DAI}";
  display: block;
  box-sizing: border-box;
  padding: env(safe-area-inset-top) 8px 0;
  min-height: calc(20px + env(safe-area-inset-top));
  line-height: 20px;
  text-align: center;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #b45309;
  pointer-events: none;
}
`;
const TEN_CAI = "Tour Đảo Demo";
const TEN_CU = "Island Booking";

/** Sao public/ → dist-demo/: tên cài, CSP theo miền, robots chặn, dải «BẢN DÙNG THỬ», mã commit, bản mẫu (nếu đưa). */
export function dungTaiSanDemo({ goc, dich, commit, banMau }) {
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("Mã commit phải đúng 40 ký tự hex chữ thường.");
  const g = resolve(goc);
  const d = resolve(dich);
  if (basename(d) !== "dist-demo") throw new Error("Thư mục đích phải có tên dist-demo.");
  if (g === d || g.startsWith(d + sep) || d.startsWith(g + sep)) throw new Error("Thư mục gốc và thư mục đích trùng nhau hoặc lồng nhau.");
  rmSync(d, { recursive: true, force: true });
  cpSync(g, d, { recursive: true });
  const doi = (ten, f) => {
    const p = join(d, ten);
    if (existsSync(p)) writeFileSync(p, f(readFileSync(p, "utf8")));
  };
  const the = `apple-mobile-web-app-title" content="${TEN_CU}"`;
  for (const ten of readdirSync(d).filter((t) => t.endsWith(".html"))) doi(ten, (h) => h.split(the).join(`apple-mobile-web-app-title" content="${TEN_CAI}"`));
  doi("manifest.webmanifest", (t) => {
    const m = JSON.parse(t);
    m.name = TEN_CAI;
    m.short_name = TEN_CAI;
    return JSON.stringify(m, null, 2) + "\n";
  });
  doi("_headers", (t) => t.split("booking.tourdao.vn").join(MIEN_DEMO).replace(/^\/\*\n/m, "/*\n  X-Robots-Tag: noindex\n"));
  writeFileSync(join(d, "robots.txt"), "User-agent: *\nDisallow: /\n");
  doi("app.css", (t) => t.replace(/\n*$/, "\n") + DAI_CSS);
  writeFileSync(join(d, "ban-thu.json"), JSON.stringify({ commit }) + "\n");
  if (banMau !== undefined) {
    if (banMau?.commit !== commit) throw new Error("Bản mẫu không cùng commit với lần dựng.");
    writeFileSync(join(d, "__ban-mau.json"), JSON.stringify(banMau));
  }
  const con = quetBanChinh(d);
  if (con.length) throw new Error(`Bản dùng thử còn chứa booking.tourdao.vn ở: ${con.join(", ")}`);
}

/** Mã commit đang chạy trên demo.tourdao.vn (null khi không đọc được). */
export async function docCommitDemo(goi = fetch) {
  try {
    const r = await goi(`https://${MIEN_DEMO}/ban-thu.json`, { cache: "no-store" });
    const c = r.ok ? (await r.json())?.commit : null;
    return typeof c === "string" && /^[0-9a-f]{40}$/.test(c) ? c : null;
  } catch {
    return null;
  }
}

/**
 * `npm run len-demo` — CHỦ gõ trong Terminal (TTY), ở thư mục gốc, nhánh đã gộp. Đưa ĐÚNG mã đang có lên bản dùng thử rồi đặt dấu «chờ nạp»: lượt lịch chạy
 * kế tiếp của Worker (≤ 15 phút) tự làm sạch và nạp bản mẫu trong MỘT lô (ADR-0223 Đ2). Không áp migration remote: lược đồ đi theo bản mẫu.
 * MỌI wrangler qua `wr` (gắn --config wrangler.demo.jsonc, CI=1).
 */
export async function lenDemo({ run, log, isTTY, args = [], docTep, docCommit = docCommitDemo, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const stop = makeStop(log);
  if (!isTTY) return stop(NOT_TTY);
  if (args.filter((a) => a !== "--").length) return stop("lệnh này không nhận tham số. Dùng: npm run len-demo");
  const wr = (thamSo, opts = {}) => run("npx", ["wrangler", ...thamSo, "--config", CAU_HINH_DEMO], { ...opts, env: { CI: "1" } });

  let prod, dev, demo;
  try {
    prod = docTep("wrangler.jsonc");
    dev = docTep(CAU_HINH_DEV);
    demo = docTep(CAU_HINH_DEMO);
  } catch (e) {
    return stop(`không đọc được tệp cấu hình (${String(e?.message ?? e).slice(0, 200)}). CHƯA có gì bị đổi.`);
  }
  const loi = kiemCauHinhDemo(prod, dev, demo);
  if (loi.length) return stop("cấu hình bản dùng thử không đạt bài so — CHƯA có gì bị đổi.", ...loi.map((l) => `  - ${l}`));
  const trong = conChoTrongDemo(demo);
  if (trong.length) return stop(`${CAU_HINH_DEMO} còn chỗ trống: ${trong.join(", ")}. CHƯA có gì bị đổi.`, "Chủ tạo tài nguyên theo khối lệnh trong kế hoạch thi công rồi điền mã D1.");
  const tenDb = mang(docCauHinh(demo).d1_databases).find((x) => x?.binding === "DB")?.database_name;

  const st = await run("git", ["status", "--porcelain"]);
  if (st.code !== 0 || trimOut(st) !== "") return stop("thư mục còn thay đổi chưa commit (hoặc `git status` lỗi). CHƯA có gì bị đổi.", trimOut(st));
  const ma = trimOut(await run("git", ["rev-parse", "HEAD"]));
  if (!/^[0-9a-f]{40}$/.test(ma)) return stop("không đọc được mã commit hiện tại. CHƯA có gì bị đổi.");

  log("\n▶ npm run build:web");
  if ((await run("npm", ["run", "build:web"], { stream: true })).code !== 0) return stop("`npm run build:web` đỏ. CHƯA có gì bị đổi trên bản dùng thử.");
  log("\n▶ Dựng tài sản và bản mẫu của bản dùng thử (dist-demo)");
  if ((await run("node", ["scripts/tao-ban-mau-demo.mjs", ma], { stream: true })).code !== 0) return stop("dựng bản dùng thử đỏ. CHƯA có gì bị đổi trên bản dùng thử.");
  const st2 = await run("git", ["status", "--porcelain"]);
  if (trimOut(st2) !== "") return stop("lệnh dựng làm đổi tệp trong kho (tệp sinh ra chưa commit). CHƯA có gì bị đổi trên bản dùng thử.", trimOut(st2));

  log("\n▶ Kiểm đăng nhập Cloudflare");
  const who = await wr(["whoami"]);
  if (who.code !== 0 || !/You are logged in/i.test(`${who.stdout}\n${who.stderr ?? ""}`)) return stop("chưa đăng nhập Cloudflare. CHƯA có gì bị đổi.", "Chủ chạy `npx wrangler login` rồi chạy lại.");
  log("\n▶ Cổng chỉ-đọc: khoá bí mật của bản dùng thử");
  const sec = await wr(["secret", "list", "--format", "json"]);
  const tenKhoa = sec.code === 0 ? parseSecretNames(String(sec.stdout ?? "")) : null;
  if (tenKhoa === null) return stop("không đọc được danh sách khoá bí mật — KHÔNG đi tiếp. CHƯA có gì bị đổi.", String(sec.stderr ?? "").trim().slice(0, 400));
  const thieu = [...KHOA_BAT_BUOC, KHOA_HAI_LOP, ...KHOA_DUNG_THU].filter((k) => !tenKhoa.includes(k));
  if (thieu.length) return stop(`bản dùng thử chưa có khoá: ${thieu.join(", ")}. CHƯA có gì bị đổi.`, "Chủ đặt theo khối lệnh trong kế hoạch thi công rồi chạy lại.");
  log("\n▶ Cổng chỉ-đọc: kho tệp của bản dùng thử");
  const kho = await wr(["r2", "bucket", "list"]);
  const coKho = kho.code === 0 ? parseR2BucketNames(String(kho.stdout ?? "")) : [];
  const thieuKho = (docCacKhoTuCauHinh(demo) ?? []).filter((k) => !coKho.includes(k.ten));
  if (kho.code !== 0 || thieuKho.length) return stop(`bản dùng thử chưa có kho tệp: ${thieuKho.map((k) => k.ten).join(", ") || "(không đọc được danh sách)"}. CHƯA có gì bị đổi.`);

  log("\n▶ Deploy Worker bản dùng thử");
  if ((await wr(["deploy"], { stream: true })).code !== 0) return stop("`wrangler deploy` lên bản dùng thử LỖI. Đọc lỗi ở trên.");
  log("\n▶ Đặt dấu «chờ nạp» lên D1 dùng thử");
  if (typeof tenDb !== "string" || !tenDb.endsWith(DUOI_D1_DEMO)) return stop(`tên D1 không kết thúc bằng ${DUOI_D1_DEMO} — không ghi.`);
  const dat = await wr(["d1", "execute", tenDb, "--remote", "--command", CAU_DAT_CHO_NAP]);
  if (dat.code !== 0) return stop("đặt dấu chờ nạp LỖI — Worker mới đã lên nhưng dữ liệu chưa được nạp lại. Chạy lại lệnh.", String(dat.stderr ?? "").trim().slice(0, 400));

  log(`\n▶ Kiểm mã đang chạy trên ${MIEN_DEMO}`);
  let dang = await docCommit();
  if (dang !== ma) {
    await sleep(20_000);
    dang = await docCommit();
  }
  if (dang !== ma) return stop(`mã đang chạy trên ${MIEN_DEMO} (${dang ? dang.slice(0, 8) : "không đọc được"}) khác mã vừa đưa lên (${ma.slice(0, 8)}). Chờ vài phút rồi mở https://${MIEN_DEMO}/ban-thu.json.`);
  log(`Đã đưa mã ${ma.slice(0, 8)} lên ${MIEN_DEMO}. Trong vòng 15 phút, bản dùng thử tự nạp dữ liệu mẫu; sau đó đăng nhập được.`);
  return 0;
}
