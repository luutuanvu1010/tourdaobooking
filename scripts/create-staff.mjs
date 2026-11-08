// Cửa khẩn cấp (vd mất hết admin): tạo tài khoản bằng SQL, KHÔNG qua bảng Admin nên KHÔNG ghi nhật ký.
// Dùng: node scripts/create-staff.mjs "<Họ tên>" <SĐT> <PIN 6 số> [QUYỀN[,QUYỀN…]] [VAI] > staff.local.sql
//   QUYỀN: SALES (mặc định), ACCOUNTING, ADMIN, FIELD — ví dụ quản trị viên: SALES,ADMIN hoặc chỉ ADMIN.
//   VAI (ADR-0185): tài khoản Đối tác BẮT BUỘC kèm một vai trò đối tác, vd: node scripts/create-staff.mjs "Tên" 09xxxxxxxx 246810 PARTNER TRAVEL_AGENCY
// Rồi: npx wrangler d1 execute tourdao-sales-db --local|--remote --file staff.local.sql
import { isWeakPin } from "../src/modules/staff/rules.ts";
import { PERMISSION_CODES, insertStaffSql, isPermissionCode } from "./staff-lib.mjs";

const [name, phone, pin, perm = "SALES", vaiArg] = process.argv.slice(2);
const vai = vaiArg?.trim() ? vaiArg.trim().toUpperCase() : undefined;
const permissions = perm.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
if (!name?.trim() || !/^0\d{9}$/.test(phone ?? "") || !/^\d{6}$/.test(pin ?? "") || permissions.length === 0 || !permissions.every(isPermissionCode)) {
  console.error(`Dùng: node scripts/create-staff.mjs "<Họ tên>" <SĐT 0xxxxxxxxx> <PIN 6 số> [${PERMISSION_CODES.join("|")}[,…]] [VAI — bắt buộc với PARTNER, vd TRAVEL_AGENCY]`);
  process.exit(1);
}
if (isWeakPin(pin)) {
  console.error("PIN quá dễ đoán (vd 123456, 111111). Chọn PIN khác.");
  process.exit(1);
}
try {
  console.log(await insertStaffSql({ name, phone, pin, permissions, ...(vai ? { vai } : {}) }));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e)); // ADR-0185: Đối tác thiếu vai trò, vai không hợp lệ — báo rõ, không in SQL
  process.exit(1);
}
