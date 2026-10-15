// Dùng chung cho create-staff.mjs, import-staff.mjs và tests/e2e/run.mjs.
// Băm PIN bằng CHÍNH hàm của Worker (src/modules/staff/password.ts) → không thể lệch định dạng hash.
// Tạo tài khoản = hồ sơ PERSON + vai trò hồ sơ STAFF + tài khoản + quyền, đúng như Worker (staff.createAccountStatements): tách tên bằng chính
// splitPersonName của parties. staff.role/full_name là cột chết (ADR-0005): ghi hằng 'sales' / ''. Tài khoản do script tạo có created_by NULL (= hệ thống).
import { randomUUID } from "node:crypto";
import { splitPersonName, composePersonName } from "../src/modules/parties/rules.ts";
import { hashPin } from "../src/modules/staff/password.ts";
import { mfaGraceOnCreate } from "../src/modules/staff/rules.ts";
import { PERMISSION_CODES, isPermissionCode } from "../src/shared/permissions.ts";
import { vnToday } from "../src/shared/vn-date.ts";

export { hashPin, PERMISSION_CODES, isPermissionCode };

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const qn = (s) => (s === null || s === undefined ? "NULL" : q(s));

const ALLOWED_KEYS = ["name", "phone", "pin", "permissions", "active"];

/**
 * Nhiều câu INSERT (ngăn cách bằng xuống dòng) tạo một tài khoản đầy đủ. `permissions` mặc định ["SALES"].
 * Khoá lạ bị NÉM LỖI (không bỏ qua im lặng): chỗ gọi cũ còn truyền khoá "role" phải hỏng ồn ào chứ không lặng lẽ tạo nhầm tài khoản chỉ có SALES.
 */
export async function insertStaffSql(input) {
  const unknown = Object.keys(input ?? {}).filter((k) => !ALLOWED_KEYS.includes(k));
  if (unknown.length) {
    throw new Error(
      `insertStaffSql: tham số không hợp lệ: ${unknown.join(", ")}. Quyền nay khai bằng "permissions" (vd ["SALES", "ADMIN"]); khoá "role" đã bỏ vì cột đó của bảng staff là cột chết (ADR-0005).`,
    );
  }
  const { name, phone, pin, permissions = ["SALES"], active = 1 } = input;
  const n = splitPersonName(name);
  if (!n) throw new Error("Họ tên rỗng");
  if (!Array.isArray(permissions) || permissions.length === 0 || !permissions.every(isPermissionCode)) {
    throw new Error(`Quyền phải là danh sách không rỗng gồm: ${PERMISSION_CODES.join(", ")}`);
  }
  const now = new Date();
  const at = q(now.toISOString());
  const partyId = randomUUID();
  const staffId = randomUUID();
  return [
    `INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (${q(partyId)}, 'PERSON', ${q(composePersonName(n))}, ${active}, ${at}, ${at});`,
    `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES (${q(partyId)}, ${qn(n.family)}, ${qn(n.middle)}, ${q(n.given)}, ${at}, ${at});`,
    `INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (${q(randomUUID())}, ${q(partyId)}, 'STAFF', ${q(vnToday(now))}, ${at}, ${at});`,
    // ADR-0074 điều 1: tài khoản nội bộ có 14 ngày ân hạn bảo mật hai lớp từ lúc tạo — CÙNG hàm với lô tạo tài khoản của Worker.
    `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id, mfa_grace_until) VALUES (${q(staffId)}, '', ${q(phone)}, ${q(await hashPin(pin))}, 'sales', ${active}, ${at}, ${q(partyId)}, ${qn(mfaGraceOnCreate(permissions, now.getTime()))});`,
    ...permissions.map(
      (code) => `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (${q(randomUUID())}, ${q(staffId)}, ${q(code)}, ${at}, ${at}, ${at});`,
    ),
  ].join("\n");
}
