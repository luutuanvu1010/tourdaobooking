// Chụp cả bộ 20 ví dụ thử trên MỘT môi trường thử tạm, giấu việc cấy lỗi (anTiem) để giao cho người chấm.
//   node scripts/giao-dien/chay-vi-du.mjs [--ra <thư mục ngoài kho>] [--ca ca-01,ca-05]
// Ghi: <ra>/bang-chung/man-NN/ (anh/, tom-tat.md, so-do.json — KHÔNG có gì để đoán ra màn nào bị cấy; NN gán theo một hoán vị cố định) và <ra>/khoa/khoa.json (bí danh → ca, NẰM NGOÀI bang-chung/).
// Thoát 0 khi chụp đủ, 2 khi có ca hỏng. Chấm báo cáo của người chấm bằng cham-vi-du.mjs.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { doVaGhi } from "./do-lib.mjs";
import { phanTichThamSo, timAxe } from "./tham-so.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
// Hoán vị cố định của 1..20: ca-k mang bí danh man-<HOAN_VI[k-1]>. Không theo thứ tự ca, không nhóm theo loại.
const HOAN_VI = [13, 7, 18, 2, 20, 11, 5, 16, 9, 1, 14, 19, 4, 8, 17, 3, 12, 6, 15, 10];
const bietDanh = (i) => `man-${String(HOAN_VI[i]).padStart(2, "0")}`;
const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const loiThoat = (c) => { console.error(c); process.exit(2); };

const tatCa = JSON.parse(readFileSync(join(HERE, "vi-du", "ca.json"), "utf8"));
const chon = lay("--ca") ? new Set(lay("--ca").split(",")) : null;
const dsCa = tatCa.map((ca, i) => ({ ca, alias: bietDanh(i) })).filter((x) => !chon || chon.has(x.ca.ma));
if (!dsCa.length) loiThoat("Không có ca nào khớp --ca");
const ra = lay("--ra") ? resolve(lay("--ra")) : mkdtempSync(join(tmpdir(), "tourdao-vi-du-"));
const rel = relative(resolve(process.cwd()), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) loiThoat(`--ra (${ra}) nằm trong kho: ảnh không được ghi vào kho.`);
let axeDuong;
try { axeDuong = timAxe({ env: process.env, tonTai: existsSync, goc: process.cwd() }); } catch (e) { loiThoat(e.message); }
if (!axeDuong) loiThoat("Thiếu công cụ kiểm tương phản axe-core. Chạy `npm ci`, hoặc đặt AXE_JS=<đường dẫn axe.min.js>.");
const axeNoiDung = readFileSync(axeDuong, "utf8");

mkdirSync(join(ra, "bang-chung"), { recursive: true });
mkdirSync(join(ra, "khoa"), { recursive: true });
const khoa = Object.fromEntries(dsCa.map(({ ca, alias }) => [alias, ca]));
writeFileSync(join(ra, "khoa", "khoa.json"), JSON.stringify(khoa, null, 1));

const bat = Date.now();
let moi = null, hong = 0;
try {
  const bo = [...new Set(dsCa.map((x) => x.ca.o.split(":")[0]))];
  moi = await (await import("./moi-truong.mjs")).dungMoiTruong({ bo, hanPhut: 45 });
  for (const { ca, alias } of dsCa) {
    const [b, ...r] = ca.o.split(":");
    const tiemNoiDung = ca.tiem ? readFileSync(join(HERE, "vi-du", "tiem", ca.tiem), "utf8") : null;
    const thuMuc = join(ra, "bang-chung", alias);
    const kq = await doVaGhi(moi, { o: [{ bo: b, trang: r.join(":") }], kho: [390, 1280], tiemNoiDung, tiemTen: ca.tiem, ra: thuMuc, anTiem: true, axeNoiDung, axeDuong });
    if (kq.cacO.length < 2 || kq.cacO.some((x) => x.loi)) { hong++; console.error(`Ca ${ca.ma} (${alias}) hỏng`); }
  }
} catch (e) {
  hong++;
  console.error(`Không chạy được: ${e?.message ?? e}`);
} finally {
  await moi?.dung();
}
console.log(`Thư mục bằng chứng (giao người chấm): ${join(ra, "bang-chung")}`);
for (const { alias } of dsCa) console.log(join(ra, "bang-chung", alias));
console.log(`Khoá (KHÔNG giao người chấm): ${join(ra, "khoa", "khoa.json")}`);
console.log(`Mất ${Math.round((Date.now() - bat) / 1000)} giây; ca hỏng: ${hong}`);
process.exit(hong ? 2 : 0);
