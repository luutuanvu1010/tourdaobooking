// Kiểm giả thuyết ghép chéo X1 (phiếu PNG) + X2 (người nghỉ việc vẫn giữ đơn). D1 TẠM (startEnv), chỉ đọc mã repo.
// Chạy: cd <WT> && node <scratch>/x-ghep-cheo/x1x2.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { startEnv, ACCOUNTS, vnDate } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";

const EVID = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/x-ghep-cheo";
const SCR = "/private/tmp/claude-501/-Users-tuanbao-Documents-Projects-ctytnhhtourdao-tourdao-sales--claude-worktrees-tourdao-sales-audit-62ea81/c964efb5-7bf2-4e78-8214-a3e41d4568f4/scratchpad/x-ghep-cheo";
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
  const B = await cookieOf(ACCOUNTS.salesB);
  const ADMIN = await cookieOf(ACCOUNTS.admin);
  const ACC = await cookieOf(ACCOUNTS.accounting);
  const staffList = (await call(ADMIN, "GET", "/api/staff")).body.staff;
  const idOf = (phone) => staffList.find((s) => s.phone.replace(/\s/g, "") === phone)?.id;
  const salesBId = idOf(ACCOUNTS.salesB.phone);
  log("salesB id:", salesBId);

  // HDV nội bộ (vai mới GUIDE_INTERNAL → FIELD) + Sales vai mới (SALES_STAFF) — như quản trị viên thật.
  let r = await call(ADMIN, "POST", "/api/staff", { fullName: "Hướng Dẫn Viên Nghỉ", phone: "0900000291", roles: ["GUIDE_INTERNAL"] });
  log("tạo HDV:", r.status, r.body?.staff?.permissions);
  const hdvId = r.body.staff.id; const HDV = await cookieOf({ phone: "0900000291", pin: r.body.pin });
  r = await call(ADMIN, "POST", "/api/staff", { fullName: "Sales Sắp Nghỉ", phone: "0900000292", roles: ["SALES_STAFF"] });
  log("tạo Sales vai mới:", r.status, r.body?.staff?.permissions);
  const snId = r.body.staff.id;

  const P = (adult, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
  const catSvc = (pax, extra = {}) => ({ kind: "catalog", catalogCode: "TD101", pax, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise, 12 Trần Phú", ...extra });
  async function makeConfirmed(label, svc, money, handlerId) {
    const r1 = await call(A, "POST", "/api/orders", { customerName: `Khách ${label}`, customerPhone: "0901234567", services: [svc], ...money });
    if (r1.status !== 201) throw new Error(`${label}: tạo đơn ${r1.status} ${JSON.stringify(r1.body)}`);
    const o = r1.body.order;
    const r2 = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    if (r2.status !== 200) throw new Error(`${label}: xác nhận ${r2.status} ${JSON.stringify(r2.body)}`);
    if (handlerId) {
      const r3 = await call(A, "PUT", `/api/orders/${o.id}/handler`, { staffId: handlerId });
      if (r3.status !== 200) throw new Error(`${label}: gán ${r3.status} ${JSON.stringify(r3.body)}`);
    }
    return o;
  }
  const view = async (id) => (await call(A, "GET", `/api/orders/${id}`)).body.order;
  const money = (o) => ({ status: o.status, subtotal: o.subtotal, discount: o.discount, total: o.total, deposit: o.depositAmount, remaining: o.remainingAmount, lines: o.services?.flatMap((s) => s.items.map((i) => `${i.paxCode}:${i.quantity}x${i.unitPrice}=${i.lineTotal}`)) });
  const edit = (id, svcId, pax, reason) => call(HDV, "POST", `/api/orders/${id}/handler-money-edit`, { reason, services: [{ id: svcId, pax }] });

  // Chụp phiếu PNG qua đúng đường giao diện (nút "Xác nhận gửi khách" → blob PNG).
  async function phieu(orderId, file, account = ACCOUNTS.salesA) {
    const p = await env.as(account, `/order?id=${orderId}`);
    await p.waitFor("document.querySelector('#send button') !== null", "nút Xác nhận gửi khách", 10000);
    const facts = await p.ev(`({ btn: document.querySelector('#send button')?.textContent, actions: [...document.querySelectorAll('#actions button, #actions a')].map(b => b.textContent.trim()), handlerText: document.getElementById('handler-title')?.closest('.handler-card')?.innerText?.replace(/\\s+/g,' ').slice(0,200) ?? null })`);
    await p.ev(`document.querySelector('#send button').click()`);
    await p.waitFor("(() => { const i = document.querySelector('.sheet .confirm-img'); return !!i && i.complete && i.naturalWidth > 0; })()", "ảnh phiếu", 30000);
    const dims = await p.ev(`(() => { const i = document.querySelector('.sheet .confirm-img'); const d = document.querySelector('[role=dialog]'); return { w: i.naturalWidth, h: i.naturalHeight, pageOverflow: document.documentElement.scrollWidth - innerWidth, dialogOverflow: d.scrollWidth - d.clientWidth }; })()`);
    const b64 = await p.ev(`(() => { const i = document.querySelector('.sheet .confirm-img'); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png').split(',')[1]; })()`);
    writeFileSync(`${EVID}/${file}.png`, Buffer.from(b64, "base64"));
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${EVID}/${file}-hop-thoai-390.png`, Buffer.from(r.result.data, "base64"));
    p.close();
    log(`PHIẾU ${file}:`, { ...facts, ...dims });
    return facts;
  }

  // ================= X2 =================
  const dash = async (c) => { const b = (await call(c, "GET", "/api/orders/dashboard")).body; const d = b.dashboard ?? b; return { unassignedCount: d.unassignedCount, draftCount: d.draftCount }; };
  const oS = await makeConfirmed("X2 Sales Nghỉ Việc", catSvc(P(2)), { depositAmount: 500000, depositMethod: "cash" }, snId);
  const oH = await makeConfirmed("X2 HDV Nghỉ Việc", catSvc(P(4)), {}, hdvId);
  const oN = await makeConfirmed("X2 Đối Chứng", catSvc(P(2)), {}, null);
  // đối chứng dương: đóng dòng HANDLE mặc định của oN (valid_to_at = valid_from_at, hợp CHECK) — mô phỏng đơn chưa có người phụ trách
  env.sql(`UPDATE dsp_assignment SET valid_to_at = valid_from_at WHERE order_id='${oN.id}' AND task_kind_code='HANDLE' AND valid_to_at IS NULL`);
  log("X2 đối chứng: dashboard sau khi đóng HANDLE của oN:", await dash(A));
  const oS2 = await makeConfirmed("X2 Sales Nghỉ Việc 2", catSvc(P(2)), {}, snId);
  const oH2 = await makeConfirmed("X2 HDV Nghỉ Việc 2", catSvc(P(2)), {}, hdvId);
  log("X2 dashboard TRƯỚC ngưng (salesA/admin):", await dash(A), await dash(ADMIN));
  log("X2 handlers TRƯỚC:", (await call(A, "GET", `/api/dispatch/handlers?orderIds=${oS.id},${oH.id},${oN.id}`)).body);

  r = await call(ADMIN, "PATCH", `/api/staff/${snId}`, { active: false }); log("X2 ngưng Sales vai mới:", r.status);
  r = await call(ADMIN, "PATCH", `/api/staff/${hdvId}`, { active: false }); log("X2 ngưng HDV:", r.status);
  log("X2 phiên cũ HDV sau ngưng /api/auth/me:", (await call(HDV, "GET", "/api/auth/me")).status);

  log("X2 dashboard SAU ngưng (salesA/admin/kế toán):", await dash(A), await dash(ADMIN), await dash(ACC));
  log("X2 handlers SAU:", (await call(A, "GET", `/api/dispatch/handlers?orderIds=${oS.id},${oH.id},${oN.id}`)).body);
  log("X2 dsp_assignment HANDLE đang mở + staff.active:", env.sql(`SELECT a.order_id, s.full_name, s.active, a.valid_to_at FROM dsp_assignment a LEFT JOIN staff s ON s.party_id = a.party_id WHERE a.task_kind_code='HANDLE' AND a.valid_to_at IS NULL AND a.order_id IN ('${oS.id}','${oH.id}')`));
  log("X2 assignees (có người đã ngưng?):", (await call(A, "GET", "/api/dispatch/assignees")).body.assignees.map((x) => x.name));
  const lst = (await call(A, "GET", "/api/orders?limit=100")).body.orders.filter((x) => [oS.id, oH.id].includes(x.id));
  log("X2 /api/orders (trường liên quan):", lst.map((x) => ({ code: x.orderCode, status: x.status, keys: Object.keys(x).filter((k) => /handler|assign/i.test(k)) })));

  // (b) SALES khác thử nhận; người lập đổi; admin đổi; kế toán đổi
  r = await call(B, "PUT", `/api/orders/${oS.id}/handler`, { staffId: salesBId }); log("X2 salesB tự nhận đơn của người nghỉ:", r.status, r.body?.error ?? r.body);
  r = await call(ACC, "PUT", `/api/orders/${oS.id}/handler`, { staffId: salesBId }); log("X2 kế toán giao lại:", r.status, r.body?.error?.code);

  r = await call(A, "PUT", `/api/orders/${oS2.id}/handler`, { staffId: salesBId }); log("X2 người lập (salesA) giao lại đơn thứ 2 của Sales nghỉ:", r.status, r.body?.handler?.name);
  r = await call(ADMIN, "PUT", `/api/orders/${oH2.id}/handler`, { staffId: salesBId }); log("X2 admin giao lại đơn thứ 2 của HDV nghỉ:", r.status, r.body?.handler?.name);
  // Trang đơn + phiếu khi người phụ trách đã ngưng (TRƯỚC khi ai sửa)
  await phieu(oS.id, "x2-phieu-nguoi-phu-trach-da-nghi");
  {
    const p = await env.as(ACCOUNTS.salesB, `/order?id=${oS.id}`);
    await new Promise((res) => setTimeout(res, 2500));
    const t = await p.ev("document.querySelector('main')?.innerText ?? document.body.innerText");
    log("X2 trang đơn (salesB xem) — đoạn phụ trách:", (t.match(/[^\n]*phụ trách[^\n]*(\n[^\n]*){0,2}/gi) ?? []).join(" | "));
    await p.shot(`${EVID}/x2-trang-don-salesB-xem.png`);
    p.close();
  }
  for (const acc of [["admin", ACCOUNTS.admin], ["salesA", ACCOUNTS.salesA]]) {
    const p = await env.as(acc[1], "/home");
    await new Promise((res) => setTimeout(res, 3000));
    const t = await p.ev("document.body.innerText.replace(/\\s+/g,' ')");
    log(`X2 Trang chủ ${acc[0]}:`, (t.match(/.{0,40}phụ trách.{0,40}/gi) ?? []).join(" | "));
    await p.shot(`${EVID}/x2-trang-chu-${acc[0]}.png`);
    p.close();
  }
  {
    const p = await env.as(ACCOUNTS.admin, "/staff");
    await new Promise((res) => setTimeout(res, 2500));
    const t = await p.ev("document.body.innerText.replace(/\\s+/g,' ')");
    log("X2 trang Nhân viên (admin) quanh 'Sắp Nghỉ':", (t.match(/.{0,20}Sales Sắp Nghỉ.{0,120}/g) ?? []).join(" | "));
    p.close();
  }

  // audit trên D1 tạm này
  for (const strict of [false, true]) {
    let code = 0, text = "";
    try { text = execFileSync("node", ["scripts/audit-invariants.mjs", "--db", "local", "--persist-to", env.persist, ...(strict ? ["--strict"] : [])], { encoding: "utf8" }); }
    catch (e) { code = e.status; text = String(e.stdout) + String(e.stderr); }
    log(`AUDIT ${strict ? "--strict" : "thường"}: mã thoát ${code}\n${text.split("\n").filter((l) => /R-DSP|R-ORD-6|✗|⚠|thoát|Tổng|vi phạm/i.test(l)).join("\n")}`);
  }

  writeFileSync(`${SCR}/x2-ids.json`, JSON.stringify({ oS: oS.id, oH: oH.id, oN: oN.id }, null, 1));
} catch (e) {
  log("LỖI:", String(e?.stack ?? e));
} finally {
  writeFileSync(`${SCR}/x2-log.txt`, out.join("\n"));
  writeFileSync(`${EVID}/x2-ket-qua.txt`, out.join("\n"));
  await env.stop();
}
