// Kiểm toán T2 (chỉ đọc mã; dữ liệu trên D1 TẠM riêng): tiền hiệu lực sau khi HDV (FIELD) sửa số khách.
// Chạy: cd <WT> && node <scratch>/b-t2/money.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { startEnv, ACCOUNTS, vnDate } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";

const EVID = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/b-t2";
mkdirSync(EVID, { recursive: true });
const out = [];
const log = (...a) => { const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "); console.log(s); out.push(s); };

const env = await startEnv();
try {
  const cookieOf = async (acc) => { const c = await env.login(acc); return `${c.name}=${c.value}`; };
  const call = async (cookie, method, path, body) => {
    const r = await fetch(env.base + path, { method, headers: { cookie, "content-type": "application/json", origin: env.base, "cf-connecting-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const A = await cookieOf(ACCOUNTS.salesA);
  const ADMIN = await cookieOf(ACCOUNTS.admin);

  // Tạo tài khoản Hướng dẫn viên (FIELD) như quản trị viên thật (route cũ, danh sách quyền).
  const fphone = "0900000299";
  let r = await call(ADMIN, "POST", "/api/staff", { fullName: "Hướng Dẫn Viên Thử", phone: fphone, permissions: ["FIELD"] });
  log("tạo FIELD:", r.status);
  const fieldId = r.body.staff.id;
  const FIELD = await cookieOf({ phone: fphone, pin: r.body.pin });

  const catSvc = (pax, extra = {}) => ({ kind: "catalog", catalogCode: "TD101", pax, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate: vnDate(3), ...extra });
  const P = (adult, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
  async function makeConfirmed(label, svc, money) {
    const r1 = await call(A, "POST", "/api/orders", { customerName: `Khách ${label}`, customerPhone: "0901234567", services: [svc], ...money });
    if (r1.status !== 201) throw new Error(`${label}: tạo đơn ${r1.status} ${JSON.stringify(r1.body)}`);
    const o = r1.body.order;
    const r2 = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    if (r2.status !== 200) throw new Error(`${label}: xác nhận ${r2.status} ${JSON.stringify(r2.body)}`);
    const r3 = await call(A, "PUT", `/api/orders/${o.id}/handler`, { staffId: fieldId });
    if (r3.status !== 200) throw new Error(`${label}: gán HDV ${r3.status} ${JSON.stringify(r3.body)}`);
    return o;
  }
  const view = async (id) => (await call(A, "GET", `/api/orders/${id}`)).body.order;
  const listed = async (id) => (await call(A, "GET", `/api/orders?limit=100`)).body.orders.find((x) => x.id === id);
  const money = (o) => ({ subtotal: o.subtotal, discount: o.discount, total: o.total, deposit: o.depositAmount, remaining: o.remainingAmount, lines: o.services?.flatMap((s) => s.items.map((i) => `${i.paxCode}:${i.quantity}x${i.unitPrice}`)) });
  const edit = (id, svcId, pax, reason) => call(FIELD, "POST", `/api/orders/${id}/handler-money-edit`, { reason, services: [{ id: svcId, pax }] });

  const dash0 = (await call(A, "GET", "/api/orders/dashboard")).body;
  log("DASH trước:", { unpaid: dash0.unpaid ?? dash0.dashboard?.unpaid, revenue: (dash0.revenueWeek ?? dash0.dashboard?.revenueWeek)?.total });

  // ---- Ca 1: giá thoả thuận GIẢM (1.000.000 thay vì 1.350.000), HDV gửi LẠI ĐÚNG số khách cũ ----
  const o1 = await makeConfirmed("C1-giam", catSvc(P(2), { unitPrices: { adult: 1000000 } }), { depositAmount: 1000000, depositMethod: "cash" });
  log("C1 trước sửa (chi tiết):", money(await view(o1.id)));
  r = await edit(o1.id, o1.services[0].id, P(2), "Kiểm lại danh sách khách, không đổi");
  log("C1 HDV gửi lại ĐÚNG 2 người lớn:", r.status, r.body);
  log("C1 sau (chi tiết):", money(await view(o1.id)));
  const l1 = await listed(o1.id);
  log("C1 sau (danh sách /api/orders):", { total: l1.total, remaining: l1.remainingAmount });
  log("C1 hàng điều chỉnh:", env.sql(`SELECT seq, subtotal_before, subtotal_after, before_json, after_json FROM order_money_adjustment WHERE order_id='${o1.id}'`));
  log("C1 orders cột gốc:", env.sql(`SELECT subtotal,total,deposit_amount,remaining_amount FROM orders WHERE id='${o1.id}'`));

  // ---- Ca 2: giá thoả thuận TĂNG (phụ thu 1.600.000), HDV thêm 1 khách ----
  const o2 = await makeConfirmed("C2-tang", catSvc(P(2), { unitPrices: { adult: 1600000 } }), { depositAmount: 3200000, depositMethod: "bank_transfer" });
  log("C2 trước sửa:", money(await view(o2.id)));
  r = await edit(o2.id, o2.services[0].id, P(3), "Khách báo thêm 1 người");
  log("C2 HDV 2→3 người lớn:", r.status);
  log("C2 sau:", money(await view(o2.id)), "(kỳ vọng theo giá thoả thuận: 3×1.600.000 = 4.800.000, còn 1.600.000)");

  // ---- Ca 3: giảm khách làm tiền hiệu lực ÂM (cọc > tổng mới) ----
  const o3 = await makeConfirmed("C3-coc", catSvc(P(3)), { depositAmount: 4050000, depositMethod: "cash" });
  log("C3 trước sửa:", money(await view(o3.id)));
  r = await edit(o3.id, o3.services[0].id, P(1), "Hai khách huỷ");
  log("C3 HDV 3→1:", r.status);
  log("C3 sau (chi tiết):", money(await view(o3.id)));
  const l3 = await listed(o3.id);
  log("C3 sau (danh sách):", { total: l3.total, remaining: l3.remainingAmount });

  // ---- Ca 4: giảm khách làm TỔNG ÂM (giảm giá > tạm tính mới) ----
  const o4 = await makeConfirmed("C4-giam-gia", catSvc(P(2)), { discount: 1500000 });
  log("C4 trước sửa:", money(await view(o4.id)));
  r = await edit(o4.id, o4.services[0].id, P(1), "Một khách không đi");
  log("C4 HDV 2→1:", r.status);
  log("C4 sau:", money(await view(o4.id)), "(luật nháp: 'Giảm giá không được vượt quá tạm tính')");

  // ---- Ca 5: chỉ còn em bé (không khách trả tiền) — luật nháp đòi >= 1 khách không phải em bé ----
  const o5 = await makeConfirmed("C5-em-be", catSvc(P(1, 0, 0, 1)), {});
  r = await edit(o5.id, o5.services[0].id, P(0, 0, 0, 1), "Người lớn không đi, chỉ còn em bé");
  log("C5 HDV → chỉ 1 em bé:", r.status, r.body);
  log("C5 sau:", money(await view(o5.id)));
  // Cùng đầu vào qua đường nháp để so luật:
  r = await call(A, "POST", "/api/orders", { customerName: "Khách nháp em bé", customerPhone: "0901234567", services: [catSvc(P(0, 0, 0, 1))] });
  log("C5' đường NHÁP với chỉ 1 em bé:", r.status, r.body?.error?.message);

  const dash1 = (await call(A, "GET", "/api/orders/dashboard")).body;
  log("DASH sau:", { unpaid: dash1.unpaid ?? dash1.dashboard?.unpaid, revenue: dash1.revenueWeek ?? dash1.dashboard?.revenueWeek });

  // Ảnh: trang chi tiết đơn C1 và C3 (máy tính) + Trang chủ
  for (const [name, path] of [["c1-don-gia-thoa-thuan-mat", `/order?id=${o1.id}`], ["c3-con-lai-am", `/order?id=${o3.id}`], ["c4-tong-am", `/order?id=${o4.id}`], ["trang-chu-sau-dieu-chinh", "/home"]]) {
    const page = await env.as(ACCOUNTS.salesA, path, { width: 1280, height: 1600, mobile: false });
    await new Promise((res) => setTimeout(res, 2500));
    await page.shot(`${EVID}/${name}.png`);
    const txt = await page.ev("document.body.innerText.slice(0, 3000)");
    log(`TEXT ${name}:`, txt.replace(/\s+/g, " ").slice(0, 1500));
    page.close();
  }

  // Kiểm bất biến trên CHÍNH D1 tạm này (trước khi env.stop xoá thư mục)
  for (const strict of [false, true]) {
    let code = 0, text = "";
    try { text = execFileSync("node", ["scripts/audit-invariants.mjs", "--db", "local", "--persist-to", env.persist, ...(strict ? ["--strict"] : [])], { encoding: "utf8" }); }
    catch (e) { code = e.status; text = String(e.stdout) + String(e.stderr); }
    log(`AUDIT ${strict ? "--strict" : "thường"}: mã thoát ${code}\n${text}`);
  }
  writeFileSync(`${EVID}/money-ids.json`, JSON.stringify({ o1: o1.id, o2: o2.id, o3: o3.id, o4: o4.id, o5: o5.id, persist: env.persist }, null, 1));
} finally {
  writeFileSync(`${EVID}/money-log.txt`, out.join("\n"));
  await env.stop();
}
