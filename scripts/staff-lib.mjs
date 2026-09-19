// Dùng chung cho create-staff.mjs và import-staff.mjs. Định dạng hash phải khớp src/modules/staff/password.ts.
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";

const b64u = (buf) => buf.toString("base64url");
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

export function hashPin(pin) {
  const salt = randomBytes(16);
  return `pbkdf2$sha256$100000$${b64u(salt)}$${b64u(pbkdf2Sync(pin, salt, 100000, 32, "sha256"))}`;
}

export function insertStaffSql({ name, phone, pin, role, active = 1 }) {
  return `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES (${q(randomUUID())}, ${q(name)}, ${q(phone)}, ${q(hashPin(pin))}, ${q(role)}, ${active}, ${q(new Date().toISOString())});`;
}
