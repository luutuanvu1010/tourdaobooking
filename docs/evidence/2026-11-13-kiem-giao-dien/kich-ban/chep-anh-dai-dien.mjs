// Chép ảnh đại diện (thu nhỏ, JPEG) từ bộ ảnh đầy đủ ngoài kho (~/tourdao-ux-2026-11-13/anh) vào docs/evidence/2026-11-13-kiem-giao-dien/anh/ cho trang so sánh.
// Chạy từ GỐC kho: node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/chep-anh-dai-dien.mjs   (cần ImageMagick `magick`)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const RA = join(HERE, "..", "anh");
const GOC = join(homedir(), "tourdao-ux-2026-11-13", "anh");
mkdirSync(RA, { recursive: true });
// [nguồn tương đối trong GOC, tên đích, bề rộng tối đa]
export const ANH = [];
const HO = [["tao-don", "nhieu/SALES/order-form"], ["don-hang", "nhieu/SALES/orders"], ["chi-tiet-don", "nhieu/SALES/order"], ["trang-chu", "nhieu/SALES/trang-chu"],
  ["dieu-phoi", "nhieu/ADMIN/dieu-phoi"], ["tai-xe-chuyen", "nhieu/DRIVER/cuoc-chuyen"], ["so-cong-no", "nhieu/ACCOUNTING/so-cong-no"], ["hoa-hong", "nhieu/ACCOUNTING/hoa-hong"],
  ["tai-khoan", "nhieu/SUPER_ADMIN/staff"], ["thiet-lap", "nhieu/SUPER_ADMIN/thiet-lap"], ["doi-tac-don", "nhieu/PARTNER/orders"], ["doi-tac-toi", "nhieu/PARTNER/account"], ["dang-nhap", "nhieu/KHACH/login"]];
for (const [ten, p] of HO) for (const k of [390, 820, 1280]) ANH.push([`${p}-${k}-man-dau.jpg`, `${ten}-${k}.jpg`, k === 1280 ? 900 : k === 820 ? 560 : 390]);
for (const [ten, p] of [["rong-don-hang", "rong/SALES/orders-390"], ["rong-khong-quyen", "rong/SALES/403-audit-390"], ["rong-khong-trang", "rong/SALES/404-khong-co-trang-nay-390"], ["rong-ngoai-mang", "rong/SALES/matmang-trang-chu-390"]]) ANH.push([`${p}-man-dau.jpg`, `${ten}.jpg`, 390]);
ANH.push(["nhieu/SALES/t16-orders-390.jpg", "chu-x2-don-hang-390.jpg", 390], ["nhieu/ACCOUNTING/t16-trang-chu-390.jpg", "chu-x2-trang-chu-390.jpg", 390],
  ["rieng/thanh-ben-1280.jpg", "thanh-ben-1280.jpg", 820], ["rieng/tao-don-xoay-ngang-844x390.jpg", "tao-don-xoay-ngang.jpg", 844],
  ["nhieu/ADMIN/locations-390-man-dau.jpg", "ma-tho-dia-diem-390.jpg", 390], ["hanh-trinh/390/DRIVER_PARTNER/13-bam-luu-khung-ban.jpg", "bao-ban-nut-mo-390.jpg", 390],
  ["nhieu/ACCOUNTING/quet-ve-390-man-dau.jpg", "quet-ve-390.jpg", 390]);
let n = 0;
for (const [src, dst, w] of ANH) {
  const s = join(GOC, src);
  if (!existsSync(s)) { console.log(`thiếu ${src}`); continue; }
  execFileSync("magick", [s, "-resize", `${w}x>`, "-crop", `${w}x1700+0+0`, "+repage", "-quality", "62", join(RA, dst)]);
  n++;
}
console.log(`Chép ${n}/${ANH.length} ảnh vào ${RA}`);
