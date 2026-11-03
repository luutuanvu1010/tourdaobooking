// Kiểm toán T9: quy trình "nghỉ việc = ngưng tài khoản + kết thúc vai ở màn Hồ sơ" (kế hoạch 24/9 dòng 93) sau GĐ1 mô hình 11 vai. D1 TẠM.
import { startEnv, ACCOUNTS } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { writeFileSync } from "node:fs";
const EV = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/f-t9";
const out = [];
const log = (k, v) => { const line = `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`; out.push(line); console.log(line); };
const env = await startEnv();
try {
  const admin = await env.login(ACCOUNTS.admin);
  const call = async (c, method, path, body) => {
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  for (const role of ["SALES_STAFF", "ACCOUNTANT", "GUIDE_INTERNAL"]) {
    const phone = { SALES_STAFF: "0936100001", ACCOUNTANT: "0936100002", GUIDE_INTERNAL: "0936100003" }[role];
    let r = await call(admin, "POST", "/api/staff", { fullName: `Nghỉ Việc ${role}`, phone, roles: [role] });
    const s = r.body?.staff;
    log(`${role} 1 tạo tài khoản`, { status: r.status, roles: s?.roles });
    r = await call(admin, "PATCH", `/api/staff/${s.id}`, { active: false });
    log(`${role} 2 bước 1 nghỉ việc: ngưng tài khoản`, { status: r.status, active: r.body?.staff?.active });
    const party = (await call(admin, "GET", `/api/parties/${s.partyId}`)).body?.party;
    const open = party.roles.find((x) => x.validTo === null);
    r = await call(admin, "POST", `/api/parties/${s.partyId}/roles/${open.id}/end`, {});
    log(`${role} 3 bước 2 nghỉ việc: kết thúc vai ở màn Hồ sơ`, { status: r.status, code: r.body?.code, message: r.body?.message });
    r = await call(admin, "PUT", `/api/staff/${s.id}/roles`, { roles: [] });
    log(`${role} 4 thử bỏ hết vai ở màn Nhân viên`, { status: r.status, message: r.body?.message });
    log(`${role} 5 vai còn mở sau 'nghỉ việc' (SQL chỉ đọc)`, env.sql(`SELECT r.role_type_code, r.valid_from_date, r.valid_to_date, s.active AS tai_khoan_active FROM pty_party_role r JOIN staff s ON s.party_id = r.party_id WHERE r.party_id = '${s.partyId}'`));
  }
  log("6 GET /api/parties?role=SALES_STAFF (danh sách 'đang giữ vai hôm nay')", (await call(admin, "GET", "/api/parties?role=SALES_STAFF")).body?.parties?.map((p) => ({ ten: p.displayName, active: p.active, roleCodes: p.roleCodes })));
  log("7 view v_pty_open_role_group (LC-1/LC-3 và LC-2 GĐ2 đọc)", env.sql("SELECT g.role_group, p.display_name FROM v_pty_open_role_group g JOIN pty_party p ON p.id = g.party_id WHERE p.display_name LIKE 'Nghỉ Việc%'"));
} catch (e) {
  log("LỖI", String(e?.stack ?? e));
} finally {
  await env.stop();
  writeFileSync(`${EV}/t9-nghi-viec-ket-qua.txt`, out.join("\n") + "\n");
}
