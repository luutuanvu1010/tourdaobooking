// Soi MỘT ô trên máy thử 13/11 (người kiểm lại dùng): đăng nhập bộ quyền, mở trang ở khổ cho trước, chạy một biểu thức JS, in kết quả; ANH=<tệp> để chụp màn đầu.
// node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/soi-mot-o.mjs <BỘ> <đường> <rộng> <cao> <1=điện thoại|0> '<biểu thức JS>'   (máy chủ http://localhost:8815, tài khoản ~/tourdao-ux-2026-11-13/tai-khoan.json)
import { readFileSync } from "node:fs";
const K = new URL("./", import.meta.url).pathname;
const { moChrome, dangNhap } = await import(K+"cdp.mjs");
const [bo, duong, w, h, mob, expr] = process.argv.slice(2);
const tk = JSON.parse(readFileSync(process.env.HOME+"/tourdao-ux-2026-11-13/tai-khoan.json")).taiKhoan.find(t=>t.bo.split("+")[0]===bo);
const B="http://localhost:8815"; const c=await moChrome(); const n=await c.moNgan(); await n.cookie(await dangNhap(B,tk.sdt,tk.pin),B);
await n.khung(+w,+h,mob==="1"); await n.di(B+duong); await new Promise(r=>setTimeout(r,800));
console.log(JSON.stringify(await n.ev(expr),null,1));
if (process.env.ANH) await n.chup(process.env.ANH, false);
await c.tat(); process.exit(0);
