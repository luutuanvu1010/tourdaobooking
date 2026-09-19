// Dùng chung cho create-staff.mjs, import-staff.mjs và tests/e2e/run.mjs.
// Băm PIN bằng CHÍNH hàm của Worker (src/modules/staff/password.ts) → không thể lệch định dạng hash.
import { randomUUID } from "node:crypto";
import { hashPin } from "../src/modules/staff/password.ts";

export { hashPin };

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

export async function insertStaffSql({ name, phone, pin, role, active = 1 }) {
  return `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES (${q(randomUUID())}, ${q(name)}, ${q(phone)}, ${q(await hashPin(pin))}, ${q(role)}, ${active}, ${q(new Date().toISOString())});`;
}
