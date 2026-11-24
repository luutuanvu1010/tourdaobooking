// Dựng lại trên MÁY THỬ đúng bộ núm Giao diện công ty mà bản chạy thật đang phát ở /giao-dien.css (ADR-0087), để ảnh chụp là thứ người dùng đang thấy.
// Chạy từ GỐC kho, máy chủ thử phải đang bật:
//   node docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/dat-bo-num.mjs --css '<nguyên văn /giao-dien.css của bản chạy thật>' --num '{"khoá núm":"giá trị",…}' [--base http://127.0.0.1:8851] [--tk ~/tourdao-thi-giac-2026-11-24/tai-khoan.json]
// Bộ núm (khoá núm, KHÔNG phải tên token CSS) do người chạy suy từ tệp CSS công khai theo bảng NUM ở src/shared/giao-dien.ts; kịch bản chỉ ĐẠT khi /giao-dien.css
// của máy thử trùng TỪNG KÝ TỰ với chuỗi --css. Chỉ ghi lên máy thử cục bộ; bản chạy thật chỉ được đọc bằng GET công khai (làm tay, ngoài kịch bản này).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const base = lay("--base") ?? "http://127.0.0.1:8851";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ ghi lên máy chủ thử cục bộ."); process.exit(2); }
const cssThat = lay("--css");
const num = JSON.parse(lay("--num") ?? "{}");
if (!cssThat) { console.error("Thiếu --css (nguyên văn tệp giao diện công khai của bản chạy thật)."); process.exit(2); }
const tkTep = (lay("--tk") ?? join(homedir(), "tourdao-thi-giac-2026-11-24", "tai-khoan.json")).replace(/^~/, homedir());
const { dangNhap } = await import(pathToFileURL(join(process.cwd(), "scripts/giao-dien/cdp.mjs")).href);
const tq = JSON.parse(readFileSync(tkTep, "utf8")).taiKhoan.find((t) => t.khoa === "toanquyen");
const ck = await dangNhap(base, tq.sdt, tq.pin);
const goi = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { cookie: `${ck.name}=${ck.value}`, origin: base, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { /* không phải JSON */ }
  return { status: r.status, body: j ?? t };
};
const g = await goi("GET", "/api/giao-dien");
if (g.status !== 200) { console.error(`GET /api/giao-dien: ${g.status}`); process.exit(2); }
const p = await goi("PUT", "/api/giao-dien", { tokens: num, version: g.body.version });
if (p.status !== 200) { console.error(`PUT /api/giao-dien: ${p.status} ${JSON.stringify(p.body)}`); process.exit(2); }
const cssThu = await (await fetch(base + "/giao-dien.css")).text();
const trung = cssThu.trim() === cssThat.trim();
console.log(`Máy thử: ${cssThu.trim()}`);
console.log(`Bản thật: ${cssThat.trim()}`);
console.log(trung ? "ĐẠT: trùng từng ký tự." : "KHÔNG ĐẠT: hai tệp khác nhau.");
process.exit(trung ? 0 : 1);
