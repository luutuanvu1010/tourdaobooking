import assert from "node:assert/strict";
const B = "http://localhost:8787"; let n = 0;
const call = async (cookie, method, path, body) => { const r = await fetch(B + path, { method, headers: { cookie: cookie ?? "", "content-type": "application/json", "cf-connecting-ip": `10.7.${Math.floor(Math.random()*250)}.${++n}` }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null), cookie: r.headers.get("set-cookie")?.split(";")[0] }; };
const rnd = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
const Z = (await call(null, "POST", "/api/auth/login", { phone: "0900000004", pin: "112233" })).cookie;
const mk = async (name) => { const p = rnd(); const r = await call(Z, "POST", "/api/staff", { fullName: name, phone: p, role: "admin" }); return { id: r.body.staff.id, phone: p, pin: r.body.pin }; };
const X = await mk("Race X"), Y = await mk("Race Y");
const xc = (await call(null, "POST", "/api/auth/login", { phone: X.phone, pin: X.pin })).cookie;
const yc = (await call(null, "POST", "/api/auth/login", { phone: Y.phone, pin: Y.pin })).cookie;
const list = (await call(xc, "GET", "/api/staff")).body.staff;
const others = list.filter((s) => s.role === "admin" && s.active && s.id !== X.id && s.id !== Y.id);
for (const o of others) assert.equal((await call(xc, "PATCH", `/api/staff/${o.id}`, { active: false })).status, 200);
const activeAdmins = async (c) => (await call(c, "GET", "/api/staff")).body?.staff?.filter((s) => s.role === "admin" && s.active) ?? [];
assert.equal((await activeAdmins(xc)).length, 2);
// hai admin cuối hạ quyền nhau cùng lúc
const [a, b] = await Promise.all([call(xc, "PATCH", `/api/staff/${Y.id}`, { role: "sales" }), call(yc, "PATCH", `/api/staff/${X.id}`, { role: "sales" })]);
console.log("kết quả song song:", a.status, b.status);
const survivor = a.status === 200 ? xc : yc; // người thắng cuộc vẫn còn admin
const left = await activeAdmins(survivor);
assert.ok(left.length >= 1, "phải còn ít nhất 1 admin hoạt động");
console.log("admin còn lại:", left.map((s) => s.fullName).join(", "));
// khôi phục: mở lại các admin cũ, ngưng X/Y
for (const o of others) await call(survivor, "PATCH", `/api/staff/${o.id}`, { active: true });
for (const s of [X, Y]) await call(survivor, "PATCH", `/api/staff/${s.id}`, { active: false }).then(() => {});
console.log("RACE OK");
