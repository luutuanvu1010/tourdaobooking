// Kiểm toán điểm khuất trục (d) T4+T8 — kịch bản 1: luồng người dùng thật ở khổ 375×812 (mobile), đếm chạm/màn hình/gõ lại,
// và các ca mất dữ liệu. CHỈ ĐỌC mã; ghi vào D1 TẠM do startEnv() dựng. Chạy: cd WT && node <tệp này>
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, setInput, sleep, startEnv, vnDate } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { HOP_HOI_TU_DONG } from "../../../2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs"; // bước 1 khung chung 13/11: trả lời hộp hỏi trong trang (thay confirm() của trình duyệt)

const OUT = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/d-t4-t8";
const SP = "/private/tmp/claude-501/-Users-tuanbao-Documents-Projects-ctytnhhtourdao-tourdao-sales--claude-worktrees-tourdao-sales-audit-62ea81/c964efb5-7bf2-4e78-8214-a3e41d4568f4/scratchpad/d-t4-t8";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 375, height: 812, mobile: true };
const R = { flows: {}, cases: {}, errors: [] };
const save = () => writeFileSync(join(SP, "k1-ketqua-2.json"), JSON.stringify(R, null, 2));
const log = (...a) => console.log(...a);

const env = await startEnv();
const call = async (acc, method, path, body) => {
  const c = await env.login(acc);
  const r = await fetch(env.base + path, { method, headers: { cookie: `${c.name}=${c.value}`, "content-type": "application/json", origin: env.base, "cf-connecting-ip": `10.7.${Math.floor(Math.random() * 250)}.3` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};

/** Bộ đếm luồng: mỗi hành động giao diện gọi qua đây. */
function flow(name) {
  const f = { taps: 0, typed: 0, retyped: 0, screens: [], steps: [], blockers: [] };
  R.flows[name] = f;
  return {
    f,
    async tap(p, desc, expr) { f.taps++; f.steps.push(`chạm: ${desc}`); const v = await p.ev(expr); if (v === false) throw new Error(`không bấm được: ${desc}`); return v; },
    async type(p, desc, elExpr, value, { retype = false } = {}) { f.taps++; f.typed++; if (retype) f.retyped++; f.steps.push(`gõ${retype ? " LẠI" : ""}: ${desc} = ${value}`); await p.ev(setInput(elExpr, value)); },
    async screen(p) { const path = await p.ev("location.pathname + location.search"); f.screens.push(path); },
    note(s) { f.steps.push(`ghi chú: ${s}`); },
    block(s) { f.blockers.push(s); },
  };
}

async function dialogs(p) {
  // confirm()/alert(): tự bấm OK như người dùng chạm "OK" (đếm riêng ở luồng)
  await p.send("Page.enable");
  const seen = [];
  p.onDialog = seen;
  return seen;
}

try {
  // ---------- chuẩn bị tài khoản như quản trị viên thật (API quản trị) ----------
  const hdv = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: "Hướng Dẫn Một", phone: "0900000301", roles: ["GUIDE_INTERNAL"] });
  const intern = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: "Thực Tập Một", phone: "0900000302", roles: ["INTERN"] });
  R.setup = { hdv: { status: hdv.status, perms: hdv.body?.staff?.permissions }, intern: { status: intern.status, perms: intern.body?.staff?.permissions } };
  log("setup", JSON.stringify(R.setup));
  const HDV = { phone: "0900000301", pin: hdv.body.pin, id: hdv.body.staff.id };
  const INTERN = { phone: "0900000302", pin: intern.body.pin, id: intern.body.staff.id };
  save();

  if (!process.env.SKIP_A) {} if (process.env.SKIP_A) {} else  // ============ CA A: mất đơn đang gõ khi phiên hết hạn (cookie hết hạn sau 7 ngày = trình duyệt bỏ cookie) ============
  {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
    await p.waitFor("document.getElementById('catalog-q') && !document.getElementById('order-form').inert", "form sẵn sàng", 20000);
    await p.ev(setInput("document.getElementById('customerName')", "Đoàn Anh Minh 12 khách"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912 345 678"));
    await p.ev(setInput("document.getElementById('customerNote')", "Đoàn 12 người, 2 bé, đón sảnh khách sạn Novotel"));
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "TD101");
    await p.ev("document.querySelector('#catalog-list button').click(); true");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ");
    await p.ev(setInput("document.querySelector('#services .svc .counter-field[aria-label=\"Người lớn\"]')", "10"));
    await p.ev(setInput("document.querySelector('#services .svc .counter-field[aria-label=\"Trẻ em\"]')", "2"));
    await p.ev(setInput("document.getElementById('depositAmount')", "2000000"));
    await p.ev("document.getElementById('depositMethod').value='cash'; document.getElementById('depositMethod').dispatchEvent(new Event('change',{bubbles:true})); true");
    const before = await p.ev("({ name: customerName.value, phone: customerPhone.value, svc: document.querySelectorAll('#services .svc').length, total: document.getElementById('sum-total').textContent })");
    await p.shot(join(OUT, "a1-form-da-dien-truoc-khi-het-phien.png"));
    // Trình duyệt bỏ cookie khi hết Max-Age (7 ngày) — mô phỏng đúng việc đó:
    await p.send("Network.deleteCookies", { name: "td_session", url: env.base });
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/login'", "chuyển về đăng nhập", 15000);
    const loginUrl = await p.ev("location.pathname + location.search");
    await p.waitFor("document.readyState === 'complete' && !!document.getElementById('phone')", "trang đăng nhập");
    await p.shot(join(OUT, "a2-bi-day-ve-dang-nhap.png"));
    // Đăng nhập lại qua giao diện (như người dùng)
    await p.ev(setInput("document.getElementById('phone')", ACCOUNTS.salesA.phone));
    await p.ev(setInput("document.getElementById('pin')", ACCOUNTS.salesA.pin));
    await p.waitFor("!document.getElementById('submit').disabled", "nút đăng nhập mở", 10000);
    await p.ev("document.getElementById('submit').click(); true");
    await p.waitFor("location.pathname === '/order-form'", "quay về form", 15000);
    await p.waitFor("document.readyState === 'complete' && document.getElementById('catalog-q')", "form tải lại");
    await sleep(1500);
    const after = await p.ev("({ name: customerName.value, phone: customerPhone.value, svc: document.querySelectorAll('#services .svc').length, total: document.getElementById('sum-total').textContent })");
    await p.shot(join(OUT, "a3-form-trong-sau-dang-nhap-lai.png"));
    const orders = env.sql("SELECT COUNT(*) AS n FROM orders");
    R.cases.A_het_phien = { before, loginUrl, after, ordersInDb: orders[0].n };
    log("CA A", JSON.stringify(R.cases.A_het_phien));
    save();
    p.close();
  }

  if (process.env.SKIP_A) {} else  // ============ CA A2: tải lại trang (iOS giết app PWA khi chuyển sang Zalo/nghe điện thoại) ============
  {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
    await p.waitFor("document.getElementById('catalog-q') && !document.getElementById('order-form').inert", "form sẵn sàng", 20000);
    await p.ev(setInput("document.getElementById('customerName')", "Chị Lan đại lý Zalo"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0987 654 321"));
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "TD101");
    await p.ev("document.querySelector('#catalog-list button').click(); true");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ");
    const before = await p.ev("({ name: customerName.value, svc: document.querySelectorAll('#services .svc').length })");
    // ẩn trang (chuyển app) rồi tải lại (iOS thu hồi bộ nhớ)
    await p.send("Emulation.setPageVisibility", { visible: false }).catch(() => null);
    await p.send("Page.reload", { ignoreCache: false });
    await sleep(500);
    await p.waitFor("document.readyState === 'complete' && document.getElementById('catalog-q')", "tải lại xong", 20000);
    await sleep(1500);
    const after = await p.ev("({ name: customerName.value, svc: document.querySelectorAll('#services .svc').length, storage: Object.keys(localStorage).concat(Object.keys(sessionStorage)) })");
    await p.shot(join(OUT, "a4-form-trong-sau-tai-lai.png"));
    R.cases.A2_tai_lai = { before, after };
    log("CA A2", JSON.stringify(R.cases.A2_tai_lai));
    save();
    p.close();
  }

  // ============ LUỒNG 1: Sales lập đơn đoàn 12 khách qua giao diện → lưu → xác nhận → giao HDV ============
  let orderId;
  {
    const F = flow("1_sales_lap_don_12_khach_xac_nhan_giao_hdv");
    const p = await env.as(ACCOUNTS.salesA, "/orders", MOB);
    const dlg = [];
    p.send("Page.enable");
    await p.waitFor("document.readyState === 'complete' && !document.getElementById('loading') || document.getElementById('loading').hidden", "danh sách", 20000);
    await F.screen(p);
    await F.tap(p, "nút Đơn mới / Lập đơn mới", "(() => { const a = document.getElementById('new-order') && !document.getElementById('new-order').hidden ? document.getElementById('new-order') : document.querySelector('a[href=\"/order-form\"]'); if (!a) return false; a.click(); return true; })()");
    await p.waitFor("location.pathname === '/order-form' && document.readyState === 'complete' && document.getElementById('catalog-q') && !document.getElementById('order-form').inert", "form", 20000);
    await F.screen(p);
    await F.type(p, "Tên khách", "document.getElementById('customerName')", "Đoàn cô Hạnh");
    await F.type(p, "SĐT", "document.getElementById('customerPhone')", "0912 000 111");
    await F.tap(p, "ô tìm danh mục", "document.getElementById('catalog-q').focus(), true");
    await F.type(p, "tìm dịch vụ", "document.getElementById('catalog-q')", "4 đảo");
    await p.waitFor("document.querySelectorAll('#catalog-list button').length >= 1", "kết quả");
    await F.tap(p, "chọn Tour 4 đảo", "document.querySelector('#catalog-list button').click(), true");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ");
    // số khách: ghi CẢ hai cách để so — bấm + từ 1 lên 12 = 11 chạm, hay gõ vào ô = 1 chạm + gõ
    const plusTaps = 11;
    F.note(`12 người lớn bằng nút + = ${plusTaps} chạm (mặc định 1); chọn cách gõ vào ô số`);
    await F.type(p, "Người lớn", "document.querySelector('#services .svc .counter-field[aria-label=\"Người lớn\"]')", "12");
    // khối Thông tin chuyến thu gọn ở ≤640px → phải mở
    const tripOpen = await p.ev("document.querySelector('#services .svc details.trip').open");
    if (!tripOpen) await F.tap(p, "mở 'Thông tin chuyến'", "document.querySelector('#services .svc details.trip summary').click(), true");
    await F.type(p, "Ngày khởi hành", "document.querySelector('#services .svc [data-trip=departDate]')", vnDate(1));
    await F.type(p, "Giờ đón", "document.querySelector('#services .svc [data-trip=pickupTime]')", "07:15");
    await F.type(p, "Điểm đón", "document.querySelector('#services .svc [data-trip=pickupPlace]')", "Sảnh KS Novotel");
    await F.type(p, "Đã cọc", "document.getElementById('depositAmount')", "3000000");
    await F.tap(p, "Hình thức cọc (chọn)", "(() => { const s = document.getElementById('depositMethod'); s.value = 'cash'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
    await p.shot(join(OUT, "l1-form-12-khach-truoc-luu.png"));
    await F.tap(p, "Lưu đơn nháp", "document.getElementById('save').click(), true");
    await p.waitFor("location.pathname === '/order'", "trang đơn", 20000);
    await F.screen(p);
    orderId = await p.ev("new URLSearchParams(location.search).get('id')");
    await p.waitFor("!!document.querySelector('.sheet[role=dialog]')", "hộp thoại ảnh xác nhận tự mở", 15000).catch(() => F.note("hộp thoại ảnh xác nhận KHÔNG tự mở"));
    await sleep(1500);
    await p.shot(join(OUT, "l1-trang-don-hop-thoai-anh.png"));
    const hasDialog = await p.ev("!!document.querySelector('.sheet[role=dialog]')");
    if (hasDialog) await F.tap(p, "đóng hộp thoại ảnh (✕)", "document.querySelector('.sheet[role=dialog] .sheet-close').click(), true");
    await sleep(500);
    // Xác nhận đơn (confirm() của trình duyệt: ghi đè để đếm và trả OK)
    await p.ev(HOP_HOI_TU_DONG); // bước 1 khung chung 13/11: hộp hỏi trong trang thay confirm()
    await p.ev("window.__dlg = []; window.confirm = (m) => { window.__dlg.push(m); return true; }; true");
    await F.tap(p, "Xác nhận đơn", "(() => { const b = [...document.querySelectorAll('#actions button')].find((x) => x.textContent.trim() === 'Xác nhận đơn'); if (!b) return false; b.click(); return true; })()");
    F.f.taps++; F.f.steps.push("chạm: OK ở hộp hỏi lại của trình duyệt");
    await p.waitFor("/Đã xác nhận/.test(document.getElementById('order')?.textContent ?? document.body.textContent)", "đơn đã xác nhận", 15000);
    R.flows["1_sales_lap_don_12_khach_xac_nhan_giao_hdv"].confirmPrompt = await p.ev("window.__dlg");
    await p.shot(join(OUT, "l1-don-da-xac-nhan.png"));
    // Giao HDV: "Đổi người phụ trách"
    const handlerBtn = await p.ev("[...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /phụ trách/.test(t))");
    F.note(`nút người phụ trách hiện: ${JSON.stringify(handlerBtn)}`);
    await F.tap(p, "Đổi người phụ trách", "(() => { const b = [...document.querySelectorAll('button')].find((x) => /Đổi người phụ trách|Chọn người phụ trách/.test(x.textContent)); if (!b) return false; b.click(); return true; })()");
    await p.waitFor("document.querySelectorAll('.sheet[role=dialog] input[type=radio]').length > 0", "danh sách người", 15000);
    const names = await p.ev("[...document.querySelectorAll('.sheet[role=dialog] label')].map((l) => l.textContent.trim())");
    F.note(`bảng chọn liệt kê: ${JSON.stringify(names)}`);
    await p.shot(join(OUT, "l1-bang-chon-nguoi-phu-trach.png"));
    await F.tap(p, "chọn Hướng Dẫn Một", "(() => { const l = [...document.querySelectorAll('.sheet[role=dialog] label')].find((x) => /Hướng Dẫn Một/.test(x.textContent)); if (!l) return false; l.querySelector('input').click(); return true; })()");
    await F.tap(p, "Lưu người phụ trách", "(() => { const b = [...document.querySelectorAll('.sheet[role=dialog] button')].find((x) => x.textContent.trim() === 'Lưu người phụ trách'); if (!b || b.disabled) return false; b.click(); return true; })()");
    await p.waitFor("!document.querySelector('.sheet[role=dialog]') && /Hướng Dẫn Một/.test(document.body.textContent)", "đã giao", 15000);
    await p.shot(join(OUT, "l1-da-giao-hdv.png"));
    R.flows["1_sales_lap_don_12_khach_xac_nhan_giao_hdv"].orderId = orderId;
    log("LUỒNG 1", JSON.stringify(F.f));
    save();
    p.close();
  }

  // ============ LUỒNG 2: khách đổi 12 → 10 người tại bến SAU xác nhận — Sales làm được gì? ============
  {
    const F = flow("2_sales_doi_so_khach_sau_xac_nhan");
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${orderId}`, MOB);
    await p.waitFor("/Đã xác nhận/.test(document.body.textContent)", "trang đơn", 20000);
    await F.screen(p);
    const btns = await p.ev("[...document.querySelectorAll('#order button, #order a.btn, #actions button, #actions a.btn, button')].map((b) => b.textContent.trim()).filter(Boolean)");
    F.note(`các nút Sales thấy ở đơn đã xác nhận: ${JSON.stringify([...new Set(btns)])}`);
    const canEditPax = btns.some((t) => /số khách/i.test(t));
    F.block(canEditPax ? "có nút sửa số khách" : "KHÔNG có nút nào đổi số khách cho Sales/người lập; chỉ HDV đang phụ trách (qua trang Tôi) hoặc huỷ + lập lại");
    await p.shot(join(OUT, "l2-sales-don-da-xac-nhan-cac-nut.png"));
    save();
    p.close();
  }

  // ============ LUỒNG 3: HDV sáng sớm mở app → Việc của tôi → sửa số khách → (vô tình) huỷ ============
  {
    const F = flow("3_hdv_viec_cua_toi");
    const p = await env.as(HDV, "/", MOB);
    await sleep(3000);
    await F.screen(p);
    const homeErr = await p.ev("(document.getElementById('error')?.hidden === false ? document.getElementById('error').textContent : '') + ' | ' + [...document.querySelectorAll('.banner:not([hidden]), .alert:not([hidden])')].map((e) => e.textContent.trim()).join(' / ')");
    F.note(`Trang chủ của HDV hiện: ${homeErr}`);
    await p.shot(join(OUT, "l3-hdv-mo-app-trang-chu.png"));
    const tabs = await p.ev("[...document.querySelectorAll('#tabbar a, .tabbar a, nav a')].map((a) => a.textContent.trim() + '→' + a.getAttribute('href'))");
    F.note(`thanh tab của HDV: ${JSON.stringify(tabs)}`);
    await F.tap(p, "tab Tôi", "(() => { const a = [...document.querySelectorAll('a')].find((x) => x.getAttribute('href') === '/account'); if (!a) return false; a.click(); return true; })()");
    await p.waitFor("location.pathname === '/account' && document.readyState === 'complete'", "trang Tôi", 15000);
    await p.waitFor("!document.getElementById('myjobs').hidden", "Việc của tôi", 15000);
    await F.screen(p);
    await sleep(500);
    const myjobs = await p.ev("document.getElementById('myjobs').innerText");
    F.note(`Việc của tôi: ${myjobs.slice(0, 400)}`);
    const pos = await p.ev("(() => { const r = document.getElementById('myjobs').getBoundingClientRect(); return { top: Math.round(r.top + scrollY), viewport: innerHeight }; })()");
    F.note(`khối Việc của tôi bắt đầu ở y=${pos.top}px (màn cao ${pos.viewport}px)`);
    await p.shot(join(OUT, "l3-hdv-viec-cua-toi.png"));
    // sửa 12 → 10 người lớn
    await F.tap(p, "Giảm Người lớn", "document.querySelector('#myjobs .counter-btn[aria-label=\"Giảm Người lớn\"]').click(), true");
    await F.tap(p, "Giảm Người lớn", "document.querySelector('#myjobs .counter-btn[aria-label=\"Giảm Người lớn\"]').click(), true");
    await F.type(p, "Lý do sửa", "document.querySelector('#myjobs input[placeholder^=\"Lý do\"]')", "Khách báo 2 người không đi");
    await F.tap(p, "Lưu số khách mới", "[...document.querySelectorAll('#myjobs button')].find((b) => b.textContent.trim() === 'Lưu số khách mới').click(), true");
    await sleep(2000);
    const afterEdit = await p.ev("document.getElementById('myjobs').innerText");
    F.note(`sau khi lưu: ${afterEdit.slice(0, 200)}`);
    // Huỷ: đếm số chạm tới khi đơn bị huỷ, có hỏi lại không?
    await p.ev(HOP_HOI_TU_DONG); // bước 1 khung chung 13/11: hộp hỏi trong trang thay confirm()
    await p.ev("window.__dlg = []; window.confirm = (m) => { window.__dlg.push(m); return true; }; true");
    await F.tap(p, "Huỷ đơn này", "[...document.querySelectorAll('#myjobs button')].find((b) => b.textContent.trim() === 'Huỷ đơn này').click(), true");
    await sleep(300);
    await p.shot(join(OUT, "l3-hdv-sau-cham-huy-don.png"));
    await F.tap(p, "chạm lý do 'Khách yêu cầu huỷ'", "[...document.querySelectorAll('#myjobs button')].find((b) => b.textContent.trim() === 'Khách yêu cầu huỷ').click(), true");
    await sleep(2000);
    const st = env.sql(`SELECT status FROM orders WHERE id = '${orderId}'`)[0].status;
    R.cases.C_hdv_huy = { tapsToCancel: 2, confirmDialogs: await p.ev("window.__dlg"), statusAfter: st, myjobsAfter: (await p.ev("document.getElementById('myjobs').innerText")).slice(0, 200) };
    await p.shot(join(OUT, "l3-hdv-don-da-bi-huy.png"));
    log("LUỒNG 3", JSON.stringify(F.f), JSON.stringify(R.cases.C_hdv_huy));
    save();
    p.close();
  }

  // ============ CA D: đơn quá khứ vẫn nằm trong Việc của tôi và vẫn huỷ/sửa được (mô phỏng thời gian trôi) ============
  {
    // đơn mới, xác nhận hôm nay, giao HDV (API như Sales thật)
    const svc = { kind: "catalog", catalogCode: "TD101", pax: { adult: 4 }, unitPrices: {}, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(0), departTime: "", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
    const c = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách tour hôm qua", customerPhone: "0911 222 333", services: [svc], depositAmount: 1000000, depositMethod: "cash" });
    R.cases.D_setup = { create: c.status, err: c.body?.error };
    const oid = c.body?.order?.id;
    const cf = await call(ACCOUNTS.salesA, "POST", `/api/orders/${oid}/status`, { status: "confirmed" });
    const as = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${oid}/handler`, { staffId: HDV.id });
    R.cases.D_setup = { ...R.cases.D_setup, confirm: cf.status, assign: as.status, assignErr: as.body?.error };
    // mô phỏng thời gian trôi: ngày đi tour thành 40 ngày trước (trạng thái thời gian tự tạo ra; trigger 0008 có thể chặn cột này)
    let shifted = "ok";
    try { env.sql(`UPDATE order_service SET depart_date = '${vnDate(-40)}' WHERE order_id = '${oid}'`); } catch (e) { shifted = `bị chặn: ${String(e.message).slice(0, 200)}`; }
    R.cases.D_setup.shift = shifted;
    R.cases.D_setup.dateNow = env.sql(`SELECT depart_date FROM order_service WHERE order_id = '${oid}'`)[0].depart_date;
    const mine = await call(HDV, "GET", "/api/dispatch/mine");
    R.cases.D_past = { inMine: mine.body?.assignments?.map((a) => ({ code: a.orderCode, date: a.services[0]?.departDate })) };
    const ed = await call(HDV, "POST", `/api/orders/${oid}/handler-money-edit`, { reason: "sửa sau 40 ngày", services: [{ id: mine.body.assignments.find((a) => a.orderId === oid)?.services[0].id, pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] });
    R.cases.D_past.editPast = { status: ed.status, body: ed.body };
    const dash = await call(ACCOUNTS.accounting, "GET", "/api/orders/dashboard");
    R.cases.D_past.dashboardUnpaid = dash.body?.unpaid;
    R.cases.D_past.today = vnDate(0);
    log("CA D", JSON.stringify(R.cases.D_setup), JSON.stringify(R.cases.D_past));
    // Kế toán mở Trang chủ
    const p = await env.as(ACCOUNTS.accounting, "/", MOB);
    await p.waitFor("document.querySelectorAll('.dash-stat').length > 0", "ô số liệu", 20000);
    await sleep(800);
    const stats = await p.ev("[...document.querySelectorAll('.dash-stat')].map((a) => ({ text: a.innerText.replace(/\\s+/g, ' '), href: a.getAttribute('href') }))");
    R.cases.D_past.accountingHome = stats;
    await p.shot(join(OUT, "d1-ke-toan-trang-chu-o-con-thieu-tien.png"));
    // bấm ô Còn thiếu tiền → đi đâu, có lọc không
    await p.ev("document.querySelector('.dash-stat').click(); true");
    await p.waitFor("location.pathname === '/orders' && document.readyState === 'complete'", "đơn hàng", 15000);
    await sleep(1500);
    const filters = await p.ev("({ url: location.pathname + location.search, q: document.getElementById('q').value, status: document.getElementById('status').value, statusOptions: [...document.getElementById('status').options].map((o) => o.textContent), otherInputs: [...document.querySelectorAll('main input, main select')].map((e) => e.id || e.type) })");
    R.cases.D_past.accountingTileClick = filters;
    await p.shot(join(OUT, "d2-ke-toan-bam-o-con-thieu-tien.png"));
    save();
    p.close();
  }

  // ============ LUỒNG 4: Thực tập sinh lập đơn (vai hẹp nhất) ============
  {
    const F = flow("4_thuc_tap_lap_don");
    const p = await env.as(INTERN, "/order-form", MOB);
    await p.waitFor("document.readyState === 'complete' && document.getElementById('catalog-q')", "form", 20000);
    await sleep(1500);
    await F.screen(p);
    const notice = await p.ev("document.getElementById('catalog-slot').innerText");
    F.note(`khung danh mục: ${notice.slice(0, 200)}`);
    await F.type(p, "Tên khách", "document.getElementById('customerName')", "Khách của thực tập");
    await F.type(p, "SĐT", "document.getElementById('customerPhone')", "0933 444 555");
    await sleep(1500); // ô tra hồ sơ khách tự tra theo SĐT
    const booker = await p.ev("document.getElementById('booker-slot').innerText");
    F.note(`khối Hồ sơ khách sau khi gõ SĐT: ${booker.slice(0, 300)}`);
    await p.shot(join(OUT, "l4-thuc-tap-form.png"));
    await F.tap(p, "+ Dịch vụ nhập tay", "document.getElementById('add-manual').click(), true");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ nhập tay");
    const manualInputs = await p.ev("[...document.querySelectorAll('#services .svc input, #services .svc textarea')].map((e) => e.getAttribute('aria-label') || e.placeholder || e.dataset.trip || e.type)");
    F.note(`thẻ nhập tay có ô: ${JSON.stringify(manualInputs)}`);
    save();
    p.close();
  }

  // ============ LUỒNG 5: đơn của Thực tập sinh — trang đơn (API) ============
  {
    const man = { kind: "manual", name: "Tour 4 đảo (gõ tay)", pax: { adult: 2 }, departDate: vnDate(2), departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", items: [{ description: "Người lớn", detail: "", quantity: 2, unitPrice: 1350000 }] };
    const c = await call(INTERN, "POST", "/api/orders", { customerName: "Khách TTS", customerPhone: "0933 444 556", services: [man] });
    R.cases.E_intern_order = { create: c.status, err: c.body?.error?.code };
    const oid = c.body?.order?.id;
    const p = await env.as(INTERN, `/order?id=${oid}&moi=1`, MOB);
    await sleep(5000);
    const text = await p.ev("document.body.innerText");
    R.cases.E_intern_order.pageText = text.slice(0, 1500);
    R.cases.E_intern_order.consoleErrors = p.consoleErrors;
    await p.shot(join(OUT, "l5-thuc-tap-trang-don-moi.png"));
    const hasDialog = await p.ev("!!document.querySelector('.sheet[role=dialog]')");
    if (hasDialog) { await p.ev("document.querySelector('.sheet[role=dialog] .sheet-close').click(); true"); await sleep(500); }
    R.cases.E_intern_order.afterClose = (await p.ev("document.getElementById('order')?.innerText ?? ''")).slice(0, 1200);
    await p.shot(join(OUT, "l5-thuc-tap-trang-don-sau-dong-hop-thoai.png"));
    const req = p.requests.filter((r) => r.url.includes("/api/")).map((r) => r.method + " " + r.url.replace(env.base, ""));
    R.cases.E_intern_order.apiCalls = req;
    save();
    p.close();
  }
} catch (e) {
  R.errors.push(String(e.stack || e));
  console.error(e);
  save();
} finally {
  save();
  await env.stop();
}
console.log("XONG");
