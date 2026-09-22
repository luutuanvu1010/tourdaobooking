// Khôi phục D1 từ bản xuất (docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md). Bản xuất NGUYÊN KHỐI (`wrangler d1 export`) KHÔNG nạp lại được
// vào D1 trống: bảng tạo theo thứ tự lịch sử và dữ liệu chèn ngay sau từng bảng, mà `staff.party_id` (thêm ở 0012) trỏ `pty_party` (tạo ở 0011, đứng SAU
// `staff` trong tệp) → "no such table: main.pty_party", cả lần nạp bị huỷ (đã thử trên D1 local 2026-09-22). Cách đã chạy được: xuất schema (`--no-data`)
// và dữ liệu (`--no-schema`) riêng; tệp này tách schema theo TỪNG CÂU: trigger → tệp trigger; mọi câu khác (bảng, chỉ mục, view, PRAGMA) → tệp cấu trúc.
// Nạp: cấu trúc → dữ liệu → trigger (trigger nạp sau cùng, vì vd `order_service_frozen_insert` chặn chèn dịch vụ của đơn đã xác nhận).
// Thân trigger có dấu ';' bên trong nên câu trigger kết thúc ở dòng "END;". Dùng: node scripts/tach-ban-xuat-d1.mjs <schema.sql> <cau-truc.sql> <trigger.sql>
import { readFileSync, writeFileSync } from "node:fs";
const [src, outStruct, outTrig] = process.argv.slice(2);
const struct = [], trig = [];
let cur = [], inTrigger = false;
for (const line of readFileSync(src, "utf8").split("\n")) {
  if (cur.length === 0) inTrigger = /^\s*CREATE\s+TRIGGER\b/i.test(line);
  cur.push(line);
  const done = inTrigger ? /\bEND\s*;\s*$/i.test(line) : /;\s*$/.test(line);
  if (done) { (inTrigger ? trig : struct).push(cur.join("\n")); cur = []; }
}
if (cur.join("").trim()) throw new Error(`câu cuối chưa kết thúc: ${cur.join("\n").slice(0, 200)}`);
writeFileSync(outStruct, struct.join("\n") + "\n");
writeFileSync(outTrig, trig.join("\n") + "\n");
console.log(`câu cấu trúc: ${struct.length}; trigger: ${trig.length}`);
