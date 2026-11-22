// Kịch bản chụp của đợt đánh giá lại giao diện 20/11/2026. Chụp MỘT lần mọi màn trong bang-man.json trên máy chủ thử ĐÃ BẬT SẴN (kho dữ liệu giả ngoài kho),
// mỗi màn một thư mục bằng chứng riêng (tom-tat.md, so-do.json, anh/) ở hai khổ 390 và 1280, bằng đúng lõi đo `doVaGhi` của scripts/giao-dien/do-lib.mjs (không sửa lõi).
// Khác lệnh do-man.mjs ở một điểm: KHÔNG dựng môi trường tạm rỗng mà trỏ vào kho thử có dữ liệu (đơn, xe, chuyến, công nợ…) và tệp giao diện công ty giống bản chạy thật.
//
// Chạy từ GỐC kho (máy chủ thử phải đang chạy; xem README của đợt):
//   node docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/chup.mjs [--base http://127.0.0.1:8835] [--ra ~/tourdao-danh-gia-2026-11-20] [--so 1,2,5] [--lai]
// Ghi: <ra>/bang-chung/man-NNN/ cho từng màn và <ra>/trang-thai-chup.json (dòng đầu của máy đo, ô hỏng, địa chỉ cuối). Màn đã có tom-tat.md thì bỏ qua, trừ khi --lai.
// Không ghi gì vào kho; không ghi dữ liệu vào máy chủ thử (chỉ đăng nhập và GET).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { doVaGhi } from "../../../../scripts/giao-dien/do-lib.mjs";
import { moChrome } from "../../../../scripts/giao-dien/cdp.mjs";
import { timAxe } from "../../../../scripts/giao-dien/tham-so.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const base = lay("--base") ?? "http://127.0.0.1:8835";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ chụp trên máy chủ thử cục bộ."); process.exit(2); }
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-danh-gia-2026-11-20")).replace(/^~/, homedir()));
const rel = relative(resolve(process.cwd()), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) { console.error(`--ra (${ra}) nằm trong kho: ảnh không được ghi vào kho.`); process.exit(2); }
const chon = lay("--so") ? new Set(lay("--so").split(",").map(Number)) : null;
const lai = process.argv.includes("--lai");

// Bộ quyền → tài khoản thử trong tai-khoan.json của kho thử (tệp ngoài kho; PIN chỉ có nghĩa trên kho thử).
const KHOA_TK = { SALES: "sales", INTERN: "intern", ACCOUNTING: "ketoan", ADMIN: "quantri", FIELD: "hdv", PARTNER: "ctv", SUPER_ADMIN: "toanquyen", DRIVER: "taixe", DRIVER_PARTNER: "taixedt", HR: "nhansu", SALES_MANAGER: "qlbh" };
const dsTk = Object.fromEntries(JSON.parse(readFileSync(join(ra, "tai-khoan.json"), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const taiKhoan = Object.fromEntries(Object.entries(KHOA_TK).map(([bo, k]) => [bo, { phone: dsTk[k].sdt, pin: dsTk[k].pin }]));

const axeDuong = timAxe({ env: process.env, tonTai: existsSync, goc: process.cwd() });
if (!axeDuong) { console.error("Thiếu axe-core: chạy `npm ci` hoặc đặt AXE_JS."); process.exit(2); }
const axeNoiDung = readFileSync(axeDuong, "utf8");

const man = JSON.parse(readFileSync(join(HERE, "bang-man.json"), "utf8")).man.filter((m) => !chon || chon.has(m.so));
const tenThuMuc = (m) => `man-${String(m.so).padStart(3, "0")}`;
const ttTep = join(ra, "trang-thai-chup.json");
const trangThai = existsSync(ttTep) ? JSON.parse(readFileSync(ttTep, "utf8")) : {};
mkdirSync(join(ra, "bang-chung"), { recursive: true });

const chrome = await moChrome({ tuXuLyTinHieu: true });
let hong = 0;
try {
  for (const m of man) {
    const thuMuc = join(ra, "bang-chung", tenThuMuc(m));
    if (!lai && existsSync(join(thuMuc, "tom-tat.md"))) { console.error(`– ${tenThuMuc(m)} đã có, bỏ qua`); continue; }
    // Lõi đo tự thêm ?id=… cho /order từ moi.id.orderTheoBo; trang chi tiết khác mang mã ngay trong `trang`.
    const moi = { base, taiKhoan, id: { order: m.don ?? null, orderTheoBo: m.don ? { [m.bo]: m.don } : {} }, loiGieo: [], boChayDuoc: Object.keys(KHOA_TK), chrome };
    const kq = await doVaGhi(moi, { o: [{ bo: m.bo, trang: m.trang }], kho: [390, 1280], ra: thuMuc, axeNoiDung, axeDuong });
    const oHong = kq.cacO.filter((x) => x.loi);
    if (kq.cacO.length < 2 || oHong.length) hong++;
    trangThai[tenThuMuc(m)] = { so: m.so, bo: m.bo, trang: m.trang.replace(/id=[^&]+/, "id=…"), dongDau: kq.dongDau, maThoat: kq.maThoat, soAnh: kq.cacO.map((x) => `${x.kho}:${x.anh?.length ?? 0}`).join(" "), url: kq.cacO.map((x) => x.url).join(" | "), ghiChu: kq.cacO.map((x) => x.ghiChu).filter(Boolean).join(" | ") || null, oHong: oHong.map((x) => `@${x.kho}: ${x.loi}`) };
    writeFileSync(ttTep, JSON.stringify(trangThai, null, 1));
    console.error(`${tenThuMuc(m)} ${m.bo}:${m.trang.split("?")[0]} — ${kq.dongDau}`);
  }
} finally {
  await chrome.tat();
}
console.log(`Xong ${man.length} màn; màn có ô hỏng: ${hong}. Trạng thái: ${ttTep}`);
process.exit(hong ? 2 : 0);
