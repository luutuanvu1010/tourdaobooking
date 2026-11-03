// Kiểm toán T2: ma trận "trạng thái không thể có" — dữ liệu hợp lệ dựng qua API, rồi CỐ Ý sửa bằng SQL (ghi rõ từng bước là cố ý),
// sau mỗi bước chạy audit-invariants (thường + --strict) và ghi kiểm nào bắt được. D1 TẠM riêng của startEnv(), xoá khi xong.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { startEnv, ACCOUNTS, vnDate } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";

const EVID = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/b-t2";
const out = [];
const log = (...a) => { const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "); console.log(s); out.push(s); };

const env = await startEnv();
try {
  const cookieOf = async (acc) => { const c = await env.login(acc); return `${c.name}=${c.value}`; };
  const call = async (cookie, method, path, body, tries = 3) => {
    let r;
    try { r = await fetch(env.base + path, { method, headers: { cookie, "content-type": "application/json", origin: env.base, "cf-connecting-ip": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }, body: body === undefined ? undefined : JSON.stringify(body), keepalive: false }); }
    catch (e) { if (tries > 1) { await new Promise((res) => setTimeout(res, 500)); return call(cookie, method, path, body, tries - 1); } throw e; }
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const audit = (label) => {
    const res = {};
    for (const strict of [false, true]) {
      let code = 0, text = "";
      try { text = execFileSync("node", ["scripts/audit-invariants.mjs", "--db", "local", "--persist-to", env.persist, ...(strict ? ["--strict"] : [])], { encoding: "utf8" }); }
      catch (e) { code = e.status; text = String(e.stdout) + String(e.stderr); }
      res[strict ? "strict" : "thuong"] = { code, flagged: text.split("\n").filter((l) => /^[✗⚠]/.test(l)).map((l) => l.slice(0, 120)) };
    }
    log(`AUDIT [${label}]`, res);
    return res;
  };
  const ADMIN = await cookieOf(ACCOUNTS.admin);
  const A = await cookieOf(ACCOUNTS.salesA);
  // SUPER_ADMIN không có trong startEnv → dùng tài khoản ADMIN; vai SALES_STAFF không cần Toàn quyền.
  let r = await call(ADMIN, "POST", "/api/staff", { fullName: "Kinh Doanh Vai", phone: "0900000288", roles: ["SALES_STAFF"] });
  log("tạo tài khoản theo vai SALES_STAFF:", r.status, r.body?.staff?.permissions, r.body?.staff?.roles);
  const K = r.body.staff;

  const svc = (extra = {}) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 2 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(3), ...extra });
  const mk = async (label, confirm) => {
    const x = await call(A, "POST", "/api/orders", { customerName: label, customerPhone: "0901234567", services: [svc()], depositAmount: 500000, depositMethod: "cash" });
    if (confirm) await call(A, "POST", `/api/orders/${x.body.order.id}/status`, { status: "confirmed" });
    return x.body.order;
  };
  const draft = await mk("Đơn nháp", false);
  const conf = await mk("Đơn xác nhận", true);
  const canc = await mk("Đơn sẽ huỷ", true);
  await call(A, "POST", `/api/orders/${canc.id}/status`, { status: "cancelled" });
  audit("0. nền sạch (chỉ API)");

  // T1 — CỐ Ý: tài khoản đang mang vai SALES_STAFF (mặc định SALES), không có dòng chỉnh tay, nhưng stf_permission có thêm ACCOUNTING đang mở
  // (mô phỏng: bộ mặc định của vai đổi trong mã mà không tính lại, hoặc lô quyền chạy mà lô vai không chạy — R21b).
  env.sql(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('tamper-t1', '${K.id}', 'ACCOUNTING', '2026-09-24T00:00:00.000Z', '2026-09-24T00:00:00.000Z', '2026-09-24T00:00:00.000Z')`);
  log("T1 quyền hiện tại của K (GET /api/staff):", (await call(ADMIN, "GET", "/api/staff")).body.staff.find((s) => s.id === K.id)?.permissions, "vai:", (await call(ADMIN, "GET", `/api/staff/${K.id}/roles`)).body);
  audit("T1 quyền ≠ vai + chỉnh tay");

  // T2 — CỐ Ý: dòng điều chỉnh số khách trên đơn NHÁP (đường API chặn bằng status trong mã, SQL chèn không có điều kiện trạng thái).
  const svcDraft = env.sql(`SELECT id FROM order_service WHERE order_id='${draft.id}'`)[0].id;
  env.sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('tamper-t2','${draft.id}',1,'[]','[{"serviceId":"${svcDraft}","pax":{"adult":5,"child":0,"senior":0,"infant":0}}]',2700000,6750000)`);
  audit("T2 điều chỉnh trên đơn nháp");
  // T3 — CỐ Ý: dòng điều chỉnh trên đơn ĐÃ HUỶ (đúng khe tranh chấp: editMoneyAsHandler kiểm status rồi INSERT không điều kiện trạng thái).
  const svcCanc = env.sql(`SELECT id FROM order_service WHERE order_id='${canc.id}'`)[0].id;
  env.sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('tamper-t3','${canc.id}',1,'[]','[{"serviceId":"${svcCanc}","pax":{"adult":1,"child":0,"senior":0,"infant":0}}]',2700000,1350000)`);
  log("T3 đơn huỷ hiện (chi tiết):", (({ status, subtotal, total, remainingAmount }) => ({ status, subtotal, total, remainingAmount }))((await call(A, "GET", `/api/orders/${canc.id}`)).body.order));
  audit("T3 điều chỉnh trên đơn đã huỷ");

  // T4 — CỐ Ý: đơn đã xác nhận mất confirmed_at.
  env.sql(`UPDATE orders SET confirmed_at = NULL WHERE id = '${conf.id}'`);
  audit("T4 confirmed mà confirmed_at NULL");

  // T5 — CỐ Ý: đơn đã xác nhận nhưng người phụ trách đóng hết (không mở dòng mới) — hợp lệ theo ADR-0009 điều 2? (đơn chưa có người phụ trách)
  // T6 — CỐ Ý: hồ sơ của tài khoản K bị ngưng (pty_party.active = 0) trong khi tài khoản vẫn hoạt động — F-07 đã biết.
  env.sql(`UPDATE pty_party SET active = 0 WHERE id = '${K.partyId}'`);
  audit("T6 hồ sơ ngưng, tài khoản hoạt động (F-07)");

  // T7 — CỐ Ý: dòng tiền thêm vào đơn đã xác nhận (F-03 đã biết) — xem nó chảy vào tiền hiện hành.
  const item = env.sql(`SELECT service_id FROM order_item WHERE order_id='${conf.id}' LIMIT 1`)[0];
  env.sql(`INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total, sort_order, service_id, catalog_code, pax_code, catalog_price) VALUES ('tamper-t7','${conf.id}','Dòng lạ',1,999000,999000,9,'${item.service_id}',NULL,NULL,NULL)`);
  audit("T7 dòng tiền chèn vào đơn đã xác nhận (F-03)");

  // T8 — MÔ PHỎNG THỜI GIAN TRÔI (không phải trạng thái vô lý): đơn đã xác nhận, còn thiếu tiền, ngày đón đã qua 1 năm.
  env.sql(`UPDATE order_service SET depart_date = '2025-10-01' WHERE order_id = '${conf.id}'`);
  const d = (await call(A, "GET", "/api/orders/dashboard")).body;
  log("T8 Trang chủ sau khi 'một năm trôi qua':", d.unpaid);

  // EXPLAIN QUERY PLAN các câu nóng CHƯA có trong tests/audit/query-plan.test.mjs
  const plans = {
    "dashboard: mọi đơn confirmed": `SELECT id, discount, total, deposit_amount, remaining_amount FROM orders WHERE status = 'confirmed'`,
    "dashboard: chuyến hôm nay": `SELECT o.id FROM orders o JOIN order_service os ON os.order_id = o.id WHERE o.status = 'confirmed' AND os.depart_date = '2026-09-27' AND os.id = (SELECT id FROM order_service os2 WHERE os2.order_id = o.id AND os2.depart_date IS NOT NULL ORDER BY os2.depart_date, (os2.pickup_time IS NULL), os2.pickup_time, os2.sort_order, os2.id LIMIT 1)`,
    "dashboard: chưa có người phụ trách": `SELECT COUNT(*) FROM orders o WHERE o.status = 'confirmed' AND NOT EXISTS (SELECT 1 FROM v_dsp_order_handler h WHERE h.order_id = o.id)`,
    "dashboard: doanh thu tuần": `SELECT id FROM orders WHERE status = 'confirmed' AND staff_id = 'x' AND created_at >= '2026-09-20T17:00:00.000Z' AND created_at < '2026-09-27T17:00:00.000Z'`,
    "getLatestAdjustments": `SELECT a.order_id, a.after_json FROM order_money_adjustment a WHERE a.order_id IN (SELECT value FROM json_each('["x"]')) AND a.seq = (SELECT MAX(seq) FROM order_money_adjustment b WHERE b.order_id = a.order_id)`,
    "getServicesForSubtotal items": `SELECT order_id, service_id, pax_code, catalog_price, line_total FROM order_item WHERE order_id IN (SELECT value FROM json_each('["x"]'))`,
    "session: quyền của tài khoản": `SELECT permission_type_code FROM stf_permission WHERE staff_id = 'x' AND valid_to_at IS NULL`,
  };
  for (const [k, q] of Object.entries(plans)) log(`PLAN ${k}:`, env.sql(`EXPLAIN QUERY PLAN ${q}`).map((x) => x.detail).join(" | "));
} finally {
  writeFileSync(`${EVID}/tamper-log.txt`, out.join("\n"));
  await env.stop();
}
