// Máy đo giao diện: chụp từng màn cuộn và chấm các tiêu chí máy đo (TIEU_CHI_MAY) cho từng ô = bộ quyền × trang × khổ, trên bản thử tạm (D1 tạm + wrangler dev + Chrome ẩn).
// Chạy từ GỐC kho:
//   node scripts/giao-dien/do-man.mjs --o <BỘ:/trang>[,<BỘ:/trang>…] [--kho 390,1280] [--tiem <tệp.js>] [--an-tiem] [--ra <thư mục ngoài kho>] [--khong-axe] [--han-phut N]
// Ghi ra thư mục tạm NGOÀI kho: anh/*.jpg, so-do.json, tom-tat.md. Mã thoát: 0 = đạt hết; 1 = có tiêu chí không đạt; 2 = không chạy được hoặc ĐO THIẾU (không bao giờ ghi là đạt).
// --an-tiem: CHỈ dùng cho bộ ví dụ thử — kết quả không nhắc gì tới việc cấy lỗi, để người chấm không biết màn nào bị cấy.
// Tài liệu tiêu chí: docs/TIEU-CHI-GIAO-DIEN.md. Ảnh và số đo không bao giờ vào kho (kho công khai).
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doVaGhi } from "./do-lib.mjs";
import { phanTichThamSo, timAxe } from "./tham-so.mjs";

const loiThoat = (cau) => { console.error(cau); process.exit(2); };
let tham, axeDuong;
try {
  tham = phanTichThamSo(process.argv.slice(2), { goc: process.cwd() });
  axeDuong = timAxe({ env: process.env, tonTai: existsSync, goc: process.cwd() });
} catch (e) { loiThoat(`${e.message}\nDùng: node scripts/giao-dien/do-man.mjs --o <BỘ:/trang>[,…] [--kho 390,1280] [--tiem <tệp.js>] [--an-tiem] [--ra <thư mục>] [--khong-axe] [--han-phut N]`); }
if (axeDuong === null && !tham.khongAxe) {
  loiThoat("Thiếu công cụ kiểm tương phản axe-core. Chạy `npm ci`, hoặc đặt AXE_JS=<đường dẫn axe.min.js>. Muốn đo các tiêu chí khác: thêm --khong-axe (kết quả khi đó là ĐO THIẾU, không được coi là đạt).");
}
const axeNoiDung = !tham.khongAxe && axeDuong !== null ? readFileSync(axeDuong, "utf8") : null;
let tiemNoiDung = null;
if (tham.tiem) { if (!existsSync(tham.tiem)) loiThoat(`--tiem: không thấy tệp ${tham.tiem}`); tiemNoiDung = readFileSync(tham.tiem, "utf8"); }

const ra = tham.ra ?? mkdtempSync(join(tmpdir(), "tourdao-do-man-"));
const bat = new Date();
let moi = null, loiChung = null, kq;
try {
  moi = await (await import("./moi-truong.mjs")).dungMoiTruong({ bo: tham.o.map((x) => x.bo), hanPhut: tham.hanPhut });
} catch (e) {
  loiChung = String(e?.message ?? e);
  console.error(`Không chạy được: ${loiChung}`);
}
try {
  kq = await doVaGhi(moi, { o: tham.o, kho: tham.kho, tiemNoiDung, tiemTen: tham.tiem, ra, anTiem: tham.anTiem, axeNoiDung, axeDuong, khongAxe: tham.khongAxe, loiChung, bat });
} finally {
  await moi?.dung();
}
console.log(ra);
console.log(kq.dongDau);
process.exit(kq.maThoat);
