// Dùng chung cho create-staff.mjs, import-staff.mjs và tests/e2e/run.mjs.
// Băm PIN bằng CHÍNH hàm của Worker (src/modules/staff/password.ts) → không thể lệch định dạng hash.
// Tạo tài khoản = hồ sơ PERSON + vai trò hồ sơ STAFF (hoặc vai trò đối tác `vai` — ADR-0185) + tài khoản + quyền, đúng như Worker (staff.createAccountStatements): tách tên bằng chính
// splitPersonName của parties. staff.role/full_name là cột chết (ADR-0005): ghi hằng 'sales' / ''. Tài khoản do script tạo có created_by NULL (= hệ thống).
import { randomUUID } from "node:crypto";
import { splitPersonName, composePersonName } from "../src/modules/parties/rules.ts";
import { hashPin } from "../src/modules/staff/password.ts";
import { mfaGraceOnCreate } from "../src/modules/staff/rules.ts";
import { PERMISSION_CODES, isExternalPermission, isPermissionCode } from "../src/shared/permissions.ts";
import { ROLES, ROLE_CODES, isRoleCode } from "../src/shared/roles.ts";
import { vnToday } from "../src/shared/vn-date.ts";

export { hashPin, PERMISSION_CODES, isPermissionCode };

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const qn = (s) => (s === null || s === undefined ? "NULL" : q(s));

const ALLOWED_KEYS = ["name", "phone", "pin", "permissions", "active", "vai"];
const VAI_BEN_NGOAI = ROLE_CODES.filter((c) => ROLES[c].group === "EXTERNAL");
const VAI_DOI_TAC = VAI_BEN_NGOAI.filter((c) => ROLES[c].defaults.includes("PARTNER"));

/**
 * Nhiều câu INSERT (ngăn cách bằng xuống dòng) tạo một tài khoản đầy đủ. `permissions` mặc định ["SALES"].
 * Khoá lạ bị NÉM LỖI (không bỏ qua im lặng): chỗ gọi cũ còn truyền khoá "role" phải hỏng ồn ào chứ không lặng lẽ tạo nhầm tài khoản chỉ có SALES.
 * `vai` (ADR-0185 Đ2 mục 1): mã vai trò nhóm bên ngoài, chỉ đi với quyền bên ngoài — hồ sơ mang đúng vai đó THAY vai STAFF cũ, chèn TRƯỚC quyền (trigger lc1c, LC-1).
 * Có quyền Đối tác mà không kèm `vai` ⇒ NÉM: cửa khẩn cấp không còn tạo được tài khoản Đối tác thiếu vai trò (phát hiện T-01: đơn ra hoa hồng 0 im lặng).
 * Tài xế đối tác không kèm `vai` giữ như cũ (ADR-0185 Đ2 mục 4: ngoài phạm vi).
 */
export async function insertStaffSql(input) {
  const unknown = Object.keys(input ?? {}).filter((k) => !ALLOWED_KEYS.includes(k));
  if (unknown.length) {
    throw new Error(
      `insertStaffSql: tham số không hợp lệ: ${unknown.join(", ")}. Quyền nay khai bằng "permissions" (vd ["SALES", "ADMIN"]); khoá "role" đã bỏ vì cột đó của bảng staff là cột chết (ADR-0005).`,
    );
  }
  const { name, phone, pin, permissions = ["SALES"], active = 1, vai } = input;
  const n = splitPersonName(name);
  if (!n) throw new Error("Họ tên rỗng");
  if (!Array.isArray(permissions) || permissions.length === 0 || !permissions.every(isPermissionCode)) {
    throw new Error(`Quyền phải là danh sách không rỗng gồm: ${PERMISSION_CODES.join(", ")}`);
  }
  if (vai !== undefined) {
    if (!isRoleCode(vai) || ROLES[vai].group !== "EXTERNAL") throw new Error(`insertStaffSql: \`vai\` phải là vai trò nhóm bên ngoài (${VAI_BEN_NGOAI.join(", ")}), nhận: ${vai}`);
    if (!permissions.every(isExternalPermission)) throw new Error("insertStaffSql: `vai` nhóm bên ngoài chỉ đi với quyền bên ngoài (PARTNER, DRIVER_PARTNER) — LC-1.");
    // Quyền phải nằm trong quyền mặc định của vai: không dựng hồ sơ chỉ mang Tài xế đối tác mà giữ quyền Đối tác (ca lọt K5 của kế hoạch ADR-0185).
    const thieu = permissions.filter((p) => !ROLES[vai].defaults.includes(p));
    if (thieu.length) throw new Error(`insertStaffSql: vai ${vai} không mang quyền ${thieu.join(", ")} — Đối tác: ${VAI_DOI_TAC.join(", ")}; Tài xế đối tác: DRIVER_EXTERNAL.`);
  } else if (permissions.includes("PARTNER")) {
    throw new Error(`insertStaffSql: tài khoản giữ quyền Đối tác phải kèm \`vai\` là một vai trò đối tác (vd TRAVEL_AGENCY; một trong: ${VAI_DOI_TAC.join(", ")}) — ADR-0185.`);
  }
  const now = new Date();
  const at = q(now.toISOString());
  const partyId = randomUUID();
  const staffId = randomUUID();
  return [
    `INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (${q(partyId)}, 'PERSON', ${q(composePersonName(n))}, ${active}, ${at}, ${at});`,
    `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES (${q(partyId)}, ${qn(n.family)}, ${qn(n.middle)}, ${q(n.given)}, ${at}, ${at});`,
    `INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (${q(randomUUID())}, ${q(partyId)}, ${q(vai ?? "STAFF")}, ${q(vnToday(now))}, ${at}, ${at});`,
    // ADR-0074 điều 1: tài khoản nội bộ có 14 ngày ân hạn bảo mật hai lớp từ lúc tạo — CÙNG hàm với lô tạo tài khoản của Worker.
    `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id, mfa_grace_until) VALUES (${q(staffId)}, '', ${q(phone)}, ${q(await hashPin(pin))}, 'sales', ${active}, ${at}, ${q(partyId)}, ${qn(mfaGraceOnCreate(permissions, now.getTime()))});`,
    ...permissions.map(
      (code) => `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (${q(randomUUID())}, ${q(staffId)}, ${q(code)}, ${at}, ${at}, ${at});`,
    ),
  ].join("\n");
}
