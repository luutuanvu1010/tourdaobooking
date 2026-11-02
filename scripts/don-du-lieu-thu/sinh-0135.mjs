// Sinh migrations/0135_don_du_lieu_thu.sql từ lược đồ thật. Đối số: thư mục gốc, trần số đơn, trần số phiếu thu.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const [goc, tranDon, tranPhieu] = process.argv.slice(2);
if (!/^\d+$/.test(tranDon ?? "") || !/^\d+$/.test(tranPhieu ?? "")) throw new Error("thiếu trần số đơn / phiếu thu");
const TEN = "0135_don_du_lieu_thu.sql";
const db = new DatabaseSync(":memory:");
for (const t of readdirSync(`${goc}/migrations`).filter((t) => t.endsWith(".sql") && t !== TEN).sort()) db.exec(readFileSync(`${goc}/migrations/${t}`, "utf8"));

const bang = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%cf_%'").all().map((r) => r.name);
const cha = new Map(bang.map((b) => [b, db.prepare(`PRAGMA foreign_key_list("${b}")`).all().map((f) => f.table)]));
const GOC = ["orders", "vc_trip", "vc_leg_appt_ack", "vdt_allocation", "vdt_guest_link", "prc_commission_rule", "prc_rate_tier", "prc_role_tier", "prc_party_tier"];
const tap = new Set(GOC);
for (let doi = true; doi; ) {
  doi = false;
  for (const [b, c] of cha) if (!tap.has(b) && c.some((x) => tap.has(x))) { tap.add(b); doi = true; }
}
// Con trước cha: bảng chỉ xoá được khi không còn bảng nào trong tập trỏ tới nó.
const thuTu = [];
const conLai = new Set(tap);
while (conLai.size) {
  const ra = [...conLai].filter((b) => ![...conLai].some((x) => x !== b && cha.get(x).includes(b))).sort();
  if (!ra.length) throw new Error("vòng khoá ngoại: " + [...conLai].join(","));
  for (const b of ra) { thuTu.push(b); conLai.delete(b); }
}
const trigger = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all()
  .filter((t) => tap.has(t.tbl_name) && /\b(BEFORE|AFTER)\s+DELETE\b/i.test(t.sql));

const dong = [];
dong.push(
  "-- Migration 0135 — xoá MỘT LẦN dữ liệu thử trước khi dùng thật (ADR-0158). Tệp SINH MÁY từ lược đồ; không sửa tay.",
  "-- Chốt chặn: số đơn hoặc số phiếu thu lớn hơn số chủ đã đếm thì CHECK hỏng, cả lần chạy huỷ, không xoá gì.",
  `CREATE TABLE tmp_chot_chan_0135 (loai TEXT NOT NULL, so INTEGER NOT NULL, tran INTEGER NOT NULL, CHECK (so <= tran));`,
  `INSERT INTO tmp_chot_chan_0135 SELECT 'don', count(*), ${tranDon} FROM orders;`,
  `INSERT INTO tmp_chot_chan_0135 SELECT 'phieu_thu', count(*), ${tranPhieu} FROM bil_payment_receipt;`,
  "DROP TABLE tmp_chot_chan_0135;",
  "",
  "PRAGMA defer_foreign_keys = ON;",
  "",
  `-- Gỡ ${trigger.length} trigger chặn xoá của đúng các bảng bị dọn; đặt lại nguyên văn ở cuối tệp.`,
);
for (const t of trigger) dong.push(`DROP TRIGGER ${t.name};`);
dong.push("", "-- Vé đã cấp không về kho: vé thử không bao giờ được phát cho khách thật (ADR-0158 Đ1 mục 4).");
dong.push("UPDATE vdt_ticket SET status = 'VOID', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE status = 'ALLOCATED';");
dong.push("", "-- Vé hỗ trợ giữ lại, chỉ bỏ liên kết tới đơn sắp xoá.");
dong.push("UPDATE fbk_ticket SET order_id = NULL, order_code = NULL WHERE order_id IS NOT NULL OR order_code IS NOT NULL;");
dong.push("", "-- Con trước cha. Nhật ký chỉ xoá dòng gắn đơn và dòng cùng id với sự kiện chuyến (R-VC-6: hai bên đi đôi).");
for (const b of thuTu) {
  if (b === "audit_log") dong.push("DELETE FROM audit_log WHERE order_id IS NOT NULL OR id IN (SELECT id FROM vc_trip_event);");
  else dong.push(`DELETE FROM ${b};`);
}
dong.push("", "-- Đặt lại trigger nguyên văn (bài src/migrations-0135.test.ts so với lược đồ trước đó).");
for (const t of trigger) dong.push(t.sql.trim().replace(/;?$/, ";"));
writeFileSync(`${goc}/migrations/${TEN}`, dong.join("\n") + "\n");
console.log("bảng dọn", thuTu.length, "trigger", trigger.length);
console.log(thuTu.join(" "));
