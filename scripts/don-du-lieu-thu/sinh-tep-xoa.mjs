// Sinh migrations/0001_xoa_du_lieu_thu_adr_0158.sql từ lược đồ thật (ADR-0158).
// Chạy từ gốc kho: node --experimental-sqlite --no-warnings scripts/don-du-lieu-thu/sinh-tep-xoa.mjs don=N phieu_thu=N chuyen=N ve_da_cap=N muc_hoa_hong=N cap=N
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const CHOT = { don: "orders", phieu_thu: "bil_payment_receipt", chuyen: "vc_trip", ve_da_cap: "vdt_allocation", muc_hoa_hong: "prc_commission_rule", cap: "prc_rate_tier" };
const tran = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
for (const k of Object.keys(CHOT)) if (!/^\d+$/.test(tran[k] ?? "")) throw new Error(`thiếu trần ${k}`);

const db = new DatabaseSync(":memory:");
for (const t of readdirSync("migrations").filter((t) => t.endsWith(".sql") && t < "0135").sort()) db.exec(readFileSync(`migrations/${t}`, "utf8"));

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
// Trigger chặn xoá của các bảng bị dọn, cộng trigger canh dấu mở ảnh: dấu đó bình thường chỉ ghi cho vé đã rút, ở đây phải ghi cho vé đã giao.
const trigger = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all()
  .filter((t) => (tap.has(t.tbl_name) && /\b(BEFORE|AFTER)\s+DELETE\b/i.test(t.sql)) || t.name === "vdt_ticket_opened_guard");

const BAY_GIO = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const dong = [
  "-- Xoá MỘT LẦN dữ liệu thử trước khi dùng thật (ADR-0158). Tệp SINH MÁY bằng sinh-tep-xoa.mjs; không sửa tay. Cách chạy: README.md cùng thư mục cha.",
  "-- Chốt chặn: một loại có nhiều dòng hơn số chủ đã đếm thì CHECK hỏng và dừng trước mọi câu xoá.",
  "DROP TABLE IF EXISTS tmp_chot_chan_xoa_thu;",
  "CREATE TABLE tmp_chot_chan_xoa_thu (loai TEXT NOT NULL, so INTEGER NOT NULL, tran INTEGER NOT NULL, CHECK (so <= tran));",
];
for (const [k, b] of Object.entries(CHOT)) dong.push(`INSERT INTO tmp_chot_chan_xoa_thu SELECT '${k}', count(*), ${tran[k]} FROM ${b};`);
dong.push("DROP TABLE tmp_chot_chan_xoa_thu;", "", "PRAGMA defer_foreign_keys = ON;", "", `-- Gỡ ${trigger.length} trigger; đặt lại nguyên văn ở cuối tệp.`);
for (const t of trigger) dong.push(`DROP TRIGGER ${t.name};`);
dong.push(
  "",
  "-- Vé đã mở ảnh có thể đã tới tay người khác: giữ dấu mở trước khi xoá phân bổ, để trigger chặn nhập lại vĩnh viễn (ADR-0158 Đ1 mục 4).",
  `UPDATE vdt_ticket SET opened_at = (SELECT max(a.revealed_at) FROM vdt_allocation a WHERE a.ticket_id = vdt_ticket.id), updated_at = ${BAY_GIO} WHERE opened_at IS NULL AND EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = vdt_ticket.id AND a.revealed_at IS NOT NULL);`,
  "-- Vé đã cấp không về kho. Có purged_at thì việc định kỳ sẽ xoá ảnh trên kho sau hạn lưu.",
  `UPDATE vdt_ticket SET status = 'VOID', purged_at = COALESCE(purged_at, ${BAY_GIO}), updated_at = ${BAY_GIO} WHERE status = 'ALLOCATED';`,
  "",
  "-- Vé hỗ trợ giữ lại, chỉ bỏ liên kết tới đơn sắp xoá, kể cả mã đơn trong ngữ cảnh mà màn vé đọc lại.",
  "UPDATE fbk_ticket SET order_id = NULL, order_code = NULL WHERE order_id IS NOT NULL OR order_code IS NOT NULL;",
  "UPDATE fbk_ticket SET context = json_remove(context, '$.orderCode') WHERE json_valid(context) AND json_extract(context, '$.orderCode') IS NOT NULL;",
  "",
  "-- Con trước cha. Nhật ký chỉ xoá dòng gắn đơn và dòng cùng id với sự kiện chuyến (R-VC-6: hai bên đi đôi).",
);
for (const b of thuTu) {
  if (b === "audit_log") dong.push("DELETE FROM audit_log WHERE order_id IS NOT NULL OR id IN (SELECT id FROM vc_trip_event);");
  else dong.push(`DELETE FROM ${b};`);
}
dong.push("", "-- Đặt lại trigger nguyên văn (bài src/don-du-lieu-thu.test.ts so với lược đồ trước đó).");
for (const t of trigger) dong.push(t.sql.trim().replace(/;?$/, ";"));
writeFileSync("scripts/don-du-lieu-thu/migrations/0001_xoa_du_lieu_thu_adr_0158.sql", dong.join("\n") + "\n");
console.log("bảng dọn", thuTu.length, "trigger", trigger.length);
