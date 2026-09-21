// Kiểm toán bất biến dữ liệu N1 (đặc tả N1 §6) trên D1 — CHỈ ĐỌC (chỉ SELECT/PRAGMA), an toàn để chạy trên remote.
// Dùng: node scripts/audit-invariants.mjs --db local|remote [--persist-to <thư mục>] [--strict]
//   --strict: coi tài khoản chưa có hồ sơ (R-N1-1) là VI PHẠM. Không có --strict, chúng chỉ là CẢNH BÁO (khoảng giữa hai lần phát hành N1).
//   Kiểm mức "warn" (R-DSP-2) là cảnh báo VĨNH VIỄN: không bao giờ làm hỏng kiểm, kể cả --strict (một tình trạng nghiệp vụ hợp lệ, vd người phụ trách đã nghỉ).
// Mỗi kiểm = một câu SQL trả SỐ dòng vi phạm (0 = đạt). Thoát mã 1 nếu có vi phạm. Một lần gọi wrangler cho mọi kiểm.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const db = opt("--db");
const persist = opt("--persist-to");
const strict = args.includes("--strict");
if (!["local", "remote"].includes(db)) {
  console.error("Dùng: node scripts/audit-invariants.mjs --db local|remote [--persist-to thư-mục] [--strict]");
  process.exit(1);
}

const OPEN_ADMIN = `SELECT s.id FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL WHERE s.active = 1`;
const overlap = (table, keyCols, from) =>
  `SELECT count(*) FROM ${table} a JOIN ${table} b ON a.id < b.id AND ${keyCols.map((c) => `IFNULL(a.${c}, '') = IFNULL(b.${c}, '')`).join(" AND ")}
   AND NOT (COALESCE(a.valid_to_date, '9999-12-31') < b.${from} OR a.${from} > COALESCE(b.valid_to_date, '9999-12-31'))`;

/** [mã, mô tả, SQL đếm vi phạm, mức khi vi phạm: 'fail' | 'warn-unless-strict' (đỏ khi --strict) | 'warn' (không bao giờ đỏ), 'rows' nếu số vi phạm = số dòng kết quả (PRAGMA)] */
const CHECKS = [
  ["R-N1-1", "mọi tài khoản có party_id", "SELECT count(*) FROM staff WHERE party_id IS NULL", "warn-unless-strict"],
  ["R-N1-1", "một hồ sơ tối đa một tài khoản", "SELECT count(*) FROM (SELECT party_id FROM staff WHERE party_id IS NOT NULL GROUP BY party_id HAVING count(*) > 1)", "fail"],
  ["R-N1-2", "cá nhân ⇔ có pty_person (không có pty_organization); tổ chức ngược lại",
    `SELECT count(*) FROM pty_party p WHERE
       (p.party_kind = 'PERSON' AND (NOT EXISTS (SELECT 1 FROM pty_person x WHERE x.party_id = p.id) OR EXISTS (SELECT 1 FROM pty_organization o WHERE o.party_id = p.id)))
    OR (p.party_kind = 'ORGANIZATION' AND (NOT EXISTS (SELECT 1 FROM pty_organization o WHERE o.party_id = p.id) OR EXISTS (SELECT 1 FROM pty_person x WHERE x.party_id = p.id)))`, "fail"],
  ["R-N1-3", "display_name của cá nhân = họ + tên đệm + tên",
    `SELECT count(*) FROM pty_party p JOIN pty_person e ON e.party_id = p.id
     WHERE p.display_name <> trim(COALESCE(e.family_name || ' ', '') || COALESCE(e.middle_name || ' ', '') || e.given_name)`, "fail"],
  ["R-N1-4", "vai trò hồ sơ không chồng lấn (cùng hồ sơ, vai trò, nơi)", overlap("pty_party_role", ["party_id", "role_type_code", "location_id"], "valid_from_date"), "fail"],
  ["R-N1-4", "quan hệ hồ sơ không chồng lấn", overlap("pty_party_relationship", ["from_party_id", "to_party_id", "relationship_type_code"], "valid_from_date"), "fail"],
  ["R-N1-5", "còn ít nhất một quản trị viên đang hoạt động", `SELECT CASE WHEN count(*) >= 1 THEN 0 ELSE 1 END FROM (${OPEN_ADMIN})`, "fail"],
  ["R-N1-10", "khoá ngoại toàn vẹn (PRAGMA foreign_key_check)", "PRAGMA foreign_key_check", "fail", "rows"],
  ["R-N1-13", "SĐT đăng nhập không được sao chép thành liên hệ do hệ thống tạo",
    `SELECT count(*) FROM pty_contact_point c JOIN staff s ON s.party_id = c.party_id
     WHERE c.contact_kind_code = 'PHONE' AND c.value_normalized = s.phone AND c.created_by IS NULL`, "fail"],
  ["thông tin", "nhân sự đã có hồ sơ nhưng thiếu vai trò STAFF",
    `SELECT count(*) FROM staff s WHERE s.party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = s.party_id AND r.role_type_code = 'STAFF')`, "warn-unless-strict"],
  ["thông tin", "tài khoản đang hoạt động không có quyền nào (đăng nhập được nhưng không làm được gì)",
    `SELECT count(*) FROM staff s WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL)`, "warn-unless-strict"],
  // Người phụ trách đơn (ADR-0006 điều 3, ADR-0009). Chỉ mục duy nhất một phần đã chặn ở CSDL; kiểm này bắt trường hợp chỉ mục bị gỡ/sửa nhầm.
  ["R-DSP-1", "mỗi đơn tối đa một người phụ trách (HANDLE) đang mở",
    "SELECT count(*) FROM (SELECT order_id FROM dsp_assignment WHERE task_kind_code = 'HANDLE' AND valid_to_at IS NULL GROUP BY order_id HAVING count(*) > 1)", "fail"],
  // CẢNH BÁO, không đỏ: đơn cũ vẫn có thể do người đã nghỉ/ngưng phụ trách (lịch sử hợp lệ), nhưng người đó không còn sửa được đơn — cần giao lại (ADR-0009 điều 5).
  ["R-DSP-2", "người phụ trách đang mở là hồ sơ có tài khoản đang hoạt động và còn quyền Bán hàng/Quản trị",
    `SELECT count(*) FROM dsp_assignment a WHERE a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code IN ('SALES', 'ADMIN') AND p.valid_to_at IS NULL
                       WHERE s.party_id = a.party_id AND s.active = 1)`, "warn"],
];

const cmd = ["wrangler", "d1", "execute", "tourdao-sales-db", `--${db}`, "--json", ...(persist ? ["--persist-to", persist] : []), "--command", CHECKS.map(([, , sql]) => `${sql.replace(/\s+/g, " ").trim()};`).join(" ")];
let results;
try {
  results = JSON.parse(execFileSync("npx", cmd, { encoding: "utf8", env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "pipe"] }));
} catch (e) {
  console.error(`Không chạy được truy vấn trên D1 (${db}): ${String(e.stderr ?? e.message).slice(0, 600)}`);
  process.exit(2);
}
if (!Array.isArray(results) || results.length !== CHECKS.length) {
  console.error(`Kết quả không khớp số kiểm (${results?.length} ≠ ${CHECKS.length}).`);
  process.exit(2);
}

let failed = 0;
let warned = 0;
CHECKS.forEach(([code, what, , level, mode], i) => {
  const n = mode === "rows" ? results[i].results.length : Number(Object.values(results[i].results[0] ?? { n: 0 })[0]);
  const bad = n > 0;
  const isFail = bad && (level === "fail" || (strict && level === "warn-unless-strict"));
  if (isFail) failed++;
  else if (bad) warned++;
  const note = level === "warn" ? "cảnh báo, không làm hỏng kiểm: cần người rà soát" : "cảnh báo: khoảng giữa hai lần phát hành N1; dùng --strict sau lần phát hành 2";
  console.log(`${isFail ? "✗" : bad ? "⚠" : "✓"} ${code.padEnd(8)} ${what}${bad ? ` — ${n} vi phạm${isFail ? "" : ` (${note})`}` : ""}`);
});
console.log(`\n${failed ? `${failed} bất biến BỊ VI PHẠM` : "Mọi bất biến đạt"}${warned ? `, ${warned} cảnh báo` : ""} (D1 ${db}${strict ? ", --strict" : ""}).`);
process.exit(failed ? 1 : 0);
