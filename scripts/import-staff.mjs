// Nạp nhân viên từ Google Sheet (CSV) vào D1 bằng dòng lệnh (dự phòng khi chưa vào được bảng Admin).
// Cùng logic phân tích với nút "Đồng bộ từ Sheet" trong bảng Admin (src/modules/staff/sheet.ts). Sheet chỉ là nguồn đề xuất:
// mọi tài khoản mới chỉ có quyền Bán hàng (SALES); cấp Quản trị bằng scripts/create-staff.mjs (SALES,ADMIN) hoặc bảng Admin.
//
// Dùng:
//   node scripts/import-staff.mjs <URL-CSV|file.csv> --db local|remote [--sql staff.local.sql] [--pins staff-pins.local.txt]
// URL CSV của Sheet: https://docs.google.com/spreadsheets/d/<ID>/export?format=csv
//
// Script CHỈ ĐỌC D1 (lấy SĐT đã có để bỏ qua) và ghi 2 file; không tự ghi vào D1. Sau đó chạy:
//   npx wrangler d1 execute tourdao-sales-db --local|--remote --file <file .sql>
// PIN sinh ngẫu nhiên, chỉ nằm trong file --pins (gitignored) — phát riêng cho từng người rồi xoá file.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { validatePersonFullName } from "../src/modules/parties/rules.ts";
import { parseStaffSheet } from "../src/modules/staff/sheet.ts";
import { generatePin } from "../src/modules/staff/rules.ts";
import { insertStaffSql } from "./staff-lib.mjs";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const source = args.find((a) => !a.startsWith("--") && ![opt("--db"), opt("--sql"), opt("--pins")].includes(a));
const db = opt("--db");
const sqlOut = opt("--sql") ?? "staff.local.sql";
const pinsOut = opt("--pins") ?? "staff-pins.local.txt";
if (!source || !["local", "remote"].includes(db)) {
  console.error("Dùng: node scripts/import-staff.mjs <URL-CSV|file.csv> --db local|remote [--sql file] [--pins file]");
  process.exit(1);
}

let csv;
if (/^https?:\/\//.test(source)) {
  const res = await fetch(source, { redirect: "follow" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("text/csv")) {
    console.error(`Không tải được CSV (HTTP ${res.status}, ${type || "không rõ dạng"}). Sheet cần bật chia sẻ "Anyone with the link – Viewer".`);
    process.exit(1);
  }
  csv = await res.text();
} else csv = readFileSync(source, "utf8");

// Cùng luật tên với Worker: giới hạn độ dài thuộc hồ sơ (pty_person), chỉ có một nguồn ở module parties.
const nameProblem = (full) => {
  const r = validatePersonFullName(full);
  return r.ok ? null : r.message;
};
const parsed = parseStaffSheet(csv, nameProblem);
if (!parsed.ok) {
  console.error(`Không thấy cột bắt buộc. Tiêu đề đọc được: ${JSON.stringify(parsed.headers)}`);
  process.exit(1);
}

const out = execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", `--${db}`, "--json", "--command", "SELECT phone FROM staff"], { encoding: "utf8" });
const have = new Set(JSON.parse(out)[0].results.map((r) => r.phone));

const sql = [], pins = [], skipped = [], used = new Set();
for (const c of parsed.candidates) {
  if (have.has(c.phone)) { skipped.push(`${c.name} (${c.phone})`); continue; }
  let pin;
  do pin = generatePin(); while (used.has(pin));
  used.add(pin);
  sql.push(await insertStaffSql({ name: c.name, phone: c.phone, pin, permissions: ["SALES"] }));
  pins.push(`${c.phone}\t${pin}\t${c.name}\tSALES`);
}

console.log(`Nguồn: ${source}\nMôi trường D1: ${db}`);
console.log(`Sẽ thêm: ${sql.length} · Đã có, bỏ qua: ${skipped.length} · Vấn đề: ${parsed.problems.length}`);
for (const s of skipped) console.log(`  = đã có: ${s}`);
for (const p of parsed.problems) console.log(`  ! Dòng ${p.row}: ${p.message}`);
if (sql.length === 0) { console.log("Không có gì để thêm; không tạo file."); process.exit(0); }
writeFileSync(sqlOut, sql.join("\n") + "\n");
writeFileSync(pinsOut, `SĐT\tPIN\tHọ tên\tQuyền\n${pins.join("\n")}\n`, { mode: 0o600 });
console.log(`\nĐã ghi ${sqlOut} và ${pinsOut} (PIN — giữ kín, phát riêng, xoá sau khi phát).`);
console.log(`Kiểm tra rồi chạy:  npx wrangler d1 execute tourdao-sales-db --${db} --file ${sqlOut}`);
