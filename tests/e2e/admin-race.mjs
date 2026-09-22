// ADR-0014 điều 8: từ khi Admin chỉ quản lý được tài khoản "cấp dưới" (không giữ ADMIN/SUPER_ADMIN), một Admin không còn tự bỏ được quyền
// ADMIN của MỘT ADMIN KHÁC — kể cả của chính "đối thủ" trong cuộc đua này. Race dưới đây vẫn kiểm ĐÚNG cùng một lưới CSDL (OTHER_ADMIN,
// không phân biệt ai gọi), chỉ đổi NGƯỜI GỌI hai lệnh song song từ "X tự bỏ quyền Y / Y tự bỏ quyền X" sang một Super Admin thao tác cả hai.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, randomPhone as rnd, session } from "./lib.mjs";

const Z = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const mk = async (name) => {
  const p = rnd();
  const r = await call(Z, "POST", "/api/staff", { fullName: name, phone: p, permissions: ["ADMIN"] });
  return { id: r.body.staff.id, phone: p, pin: r.body.pin };
};
const X = await mk("Race X"), Y = await mk("Race Y");
const xc = (await login(X.phone, X.pin)).cookie;
const isAdmin = (s) => s.permissions.includes("ADMIN") && s.active;
const list = (await call(xc, "GET", "/api/staff")).body.staff;
const others = list.filter((s) => isAdmin(s) && s.id !== X.id && s.id !== Y.id);
for (const o of others) assert.equal((await call(SUPER, "PATCH", `/api/staff/${o.id}`, { active: false })).status, 200);
const activeAdmins = async (c) => (await call(c, "GET", "/api/staff")).body?.staff?.filter(isAdmin) ?? [];
assert.equal((await activeAdmins(xc)).length, 2);

// hai admin cuối bị Super Admin bỏ quyền ADMIN CÙNG LÚC (chỉ Super Admin làm được việc này, điều 8) — lưới CSDL (OTHER_ADMIN) vẫn phải chặn đúng một bên.
const [a, b] = await Promise.all([
  call(SUPER, "PUT", `/api/staff/${Y.id}/permissions`, { permissions: ["SALES"] }),
  call(SUPER, "PUT", `/api/staff/${X.id}/permissions`, { permissions: ["SALES"] }),
]);
console.log("kết quả song song:", a.status, b.status);
const left = await activeAdmins(SUPER);
const permLogs = (await call(SUPER, "GET", "/api/audit?action=permission_changed&limit=100")).body.entries.filter((e) => e.targetId === X.id || e.targetId === Y.id);

// khôi phục TRƯỚC khi kiểm, để kịch bản sau vẫn có admin test: mở lại các admin cũ, ngưng X/Y
for (const o of others) await call(SUPER, "PATCH", `/api/staff/${o.id}`, { active: true });
for (const s of [X, Y]) await call(SUPER, "PATCH", `/api/staff/${s.id}`, { active: false }); // SUPER: người thắng cuộc vẫn giữ ADMIN, Z (chỉ ADMIN) không còn quản lý được nữa

// Bên thua nhận 409 (chốt chặn "còn admin khác" trong luật hoặc trong SQL).
assert.equal([a, b].filter((x) => x.status === 200).length, 1, "đúng một bên thắng");
assert.ok([a.status, b.status].every((s) => s === 200 || s === 409), `${a.status}, ${b.status}`);
assert.ok(left.length >= 1, "phải còn ít nhất 1 admin hoạt động");
console.log("admin còn lại:", left.map((s) => s.fullName).join(", "));
// bên thua KHÔNG được để lại dòng nhật ký "Đổi quyền"
assert.equal(permLogs.length, 1, `chỉ bên thắng có nhật ký: ${JSON.stringify(permLogs)}`);
console.log("✓ bên thua không ghi nhật ký");
console.log("RACE OK");
