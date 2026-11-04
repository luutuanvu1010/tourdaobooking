// Dựng tài sản tĩnh riêng cho bản Development (ADR-0162 Đ3): sao chép public/ sang dist-dev/ rồi đổi tên cài, CSP, robots, thêm dải «BẢN THỬ».
// Chạy: node scripts/dung-tai-san-dev.mjs <mã-commit-40-hex>. Không chạm mạng, không ghi vào public/.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIEN_CHINH_THUC = "booking.tourdao.vn";
const MIEN_DEV = "dev.tourdao.vn";
const TEN_CAI = "Tour Đảo Dev";
const TEN_CU = "Island Booking";
const KHUON_COMMIT = /^[0-9a-f]{40}$/;
const DUOI_VAN_BAN = /\.(html|css|js|mjs|json|webmanifest|txt|xml|svg|map)$/i;

// Dải «BẢN THỬ» nằm TRONG luồng ở đầu trang (html::before, không phải body::before vì body.trang-chu::before của app.css đã dùng): không đè lên thanh đầu dính (#topbar sticky) của các trang,
// không chặn thao tác; thanh đầu vẫn dính đúng chỗ khi cuộn. Cuộn đi thì dải cuộn theo; tên cài «Tour Đảo Dev» và địa chỉ dev.tourdao.vn là dấu hiệu còn lại.
const DAI_CSS = `
/* BẢN THỬ (ADR-0162): chỉ có ở bản Development, do scripts/dung-tai-san-dev.mjs nối vào. */
html::before {
  content: "BẢN THỬ";
  display: block;
  box-sizing: border-box;
  padding-top: env(safe-area-inset-top);
  height: calc(20px + env(safe-area-inset-top));
  line-height: 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #fff;
  background: #b91c1c;
  pointer-events: none;
}
`;

function* duyetTep(thuMuc) {
  for (const ten of readdirSync(thuMuc)) {
    const duongDan = join(thuMuc, ten);
    if (statSync(duongDan).isDirectory()) yield* duyetTep(duongDan);
    else yield duongDan;
  }
}

/** Tệp văn bản trong `dich` còn chứa miền chính thức; trả đường dẫn tương đối, đã sắp xếp. */
export function quetBanChinh(dich) {
  const con = [];
  for (const tep of duyetTep(dich)) {
    if (!DUOI_VAN_BAN.test(tep) && !tep.endsWith("_headers")) continue;
    if (readFileSync(tep, "utf8").includes(MIEN_CHINH_THUC)) con.push(relative(dich, tep));
  }
  return con.sort();
}

const doiTep = (dich, ten, f) => {
  const p = join(dich, ten);
  if (existsSync(p)) writeFileSync(p, f(readFileSync(p, "utf8")));
};

export function dungTaiSanDev({ goc, dich, commit }) {
  if (typeof commit !== "string" || !KHUON_COMMIT.test(commit)) throw new Error("Mã commit phải đúng 40 ký tự hex chữ thường.");
  if (resolve(goc) === resolve(dich)) throw new Error("Thư mục đích trùng thư mục gốc.");
  rmSync(dich, { recursive: true, force: true });
  cpSync(goc, dich, { recursive: true });

  const thePhim = `apple-mobile-web-app-title" content="${TEN_CU}"`;
  for (const ten of readdirSync(dich).filter((t) => t.endsWith(".html"))) {
    doiTep(dich, ten, (h) => h.split(thePhim).join(`apple-mobile-web-app-title" content="${TEN_CAI}"`));
  }
  doiTep(dich, "manifest.webmanifest", (t) => {
    const m = JSON.parse(t);
    m.name = TEN_CAI;
    m.short_name = TEN_CAI;
    return JSON.stringify(m, null, 2) + "\n";
  });
  doiTep(dich, "_headers", (t) => t.split(MIEN_CHINH_THUC).join(MIEN_DEV).replace(/^\/\*\n/m, "/*\n  X-Robots-Tag: noindex\n"));
  writeFileSync(join(dich, "robots.txt"), "User-agent: *\nDisallow: /\n");
  doiTep(dich, "app.css", (t) => t.replace(/\n*$/, "\n") + DAI_CSS);
  writeFileSync(join(dich, "ban-thu.json"), JSON.stringify({ commit }) + "\n");

  const con = quetBanChinh(dich);
  if (con.length) throw new Error(`Bản Development còn chứa ${MIEN_CHINH_THUC} ở: ${con.join(", ")}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
  const commit = process.argv[2];
  try {
    dungTaiSanDev({ goc: join(raiz, "public"), dich: join(raiz, "dist-dev"), commit });
    console.log(`Đã dựng dist-dev/ (commit ${commit}).`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
