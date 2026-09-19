// Dùng: node scripts/create-staff.mjs "<Họ tên>" <SĐT> <PIN 6 số> [sales|admin] > staff.local.sql
// Rồi: npx wrangler d1 execute tourdao-sales-db --local|--remote --file staff.local.sql
import { insertStaffSql } from "./staff-lib.mjs";

const [name, phone, pin, role = "sales"] = process.argv.slice(2);
if (!name || !/^0\d{9}$/.test(phone ?? "") || !/^\d{6}$/.test(pin ?? "") || !["sales", "admin"].includes(role)) {
  console.error('Dùng: node scripts/create-staff.mjs "<Họ tên>" <SĐT 0xxxxxxxxx> <PIN 6 số> [sales|admin]');
  process.exit(1);
}
console.log(insertStaffSql({ name, phone, pin, role }));
