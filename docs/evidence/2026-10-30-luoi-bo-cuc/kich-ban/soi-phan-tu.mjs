// Soi một trang (Toàn quyền) bằng một biểu thức JS: node soi-phan-tu.mjs <đường> <biểu thức> [khổ]. Dùng để đo tay dải tóm tắt Chi tiết đơn (README phát hiện 5).
import { dangNhap, moChrome, sleep } from "./cdp.mjs";
const BASE="http://localhost:8810"; const [,, path, expr, w="1040"] = process.argv;
const ch = await moChrome(); const n = await ch.moNgan(); await n.cookie(await dangNhap(BASE,"0900000010","739164"), BASE);
await n.khung(+w, 900, +w<500); await n.di(BASE+path); await sleep(600);
console.log(JSON.stringify(await n.ev(expr), null, 1)); await n.dong(); await ch.tat(); process.exit(0);
