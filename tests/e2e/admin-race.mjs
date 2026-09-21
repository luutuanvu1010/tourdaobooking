import assert from "node:assert/strict";
import { ACCOUNTS, call, login, randomPhone as rnd, session } from "./lib.mjs";

const Z = await session(ACCOUNTS.admin);
const mk = async (name) => {
  const p = rnd();
  const r = await call(Z, "POST", "/api/staff", { fullName: name, phone: p, permissions: ["ADMIN"] });
  return { id: r.body.staff.id, phone: p, pin: r.body.pin };
};
const X = await mk("Race X"), Y = await mk("Race Y");
const xc = (await login(X.phone, X.pin)).cookie;
const yc = (await login(Y.phone, Y.pin)).cookie;
const isAdmin = (s) => s.permissions.includes("ADMIN") && s.active;
const list = (await call(xc, "GET", "/api/staff")).body.staff;
const others = list.filter((s) => isAdmin(s) && s.id !== X.id && s.id !== Y.id);
for (const o of others) assert.equal((await call(xc, "PATCH", `/api/staff/${o.id}`, { active: false })).status, 200);
const activeAdmins = async (c) => (await call(c, "GET", "/api/staff")).body?.staff?.filter(isAdmin) ?? [];
assert.equal((await activeAdmins(xc)).length, 2);

// hai admin cuối bỏ quyền ADMIN của nhau cùng lúc
const [a, b] = await Promise.all([
  call(xc, "PUT", `/api/staff/${Y.id}/permissions`, { permissions: ["SALES"] }),
  call(yc, "PUT", `/api/staff/${X.id}/permissions`, { permissions: ["SALES"] }),
]);
console.log("kết quả song song:", a.status, b.status);
const survivor = a.status === 200 ? xc : yc; // người thắng cuộc vẫn còn ADMIN
const left = await activeAdmins(survivor);
const permLogs = (await call(survivor, "GET", "/api/audit?action=permission_changed&limit=100")).body.entries.filter((e) => e.targetId === X.id || e.targetId === Y.id);

// khôi phục TRƯỚC khi kiểm, để kịch bản sau vẫn có admin test: mở lại các admin cũ, ngưng X/Y
for (const o of others) await call(survivor, "PATCH", `/api/staff/${o.id}`, { active: true });
for (const s of [X, Y]) await call(Z, "PATCH", `/api/staff/${s.id}`, { active: false });

// Bên thua nhận 409 (chốt chặn "còn admin khác" trong luật hoặc trong SQL) hoặc 403 (đã bị bỏ ADMIN trước khi request của mình chạy).
assert.equal([a, b].filter((x) => x.status === 200).length, 1, "đúng một bên thắng");
assert.ok([a.status, b.status].every((s) => s === 200 || s === 403 || s === 409));
assert.ok(left.length >= 1, "phải còn ít nhất 1 admin hoạt động");
console.log("admin còn lại:", left.map((s) => s.fullName).join(", "));
// bên thua KHÔNG được để lại dòng nhật ký "Đổi quyền"
assert.equal(permLogs.length, 1, `chỉ bên thắng có nhật ký: ${JSON.stringify(permLogs)}`);
console.log("✓ bên thua không ghi nhật ký");
console.log("RACE OK");
