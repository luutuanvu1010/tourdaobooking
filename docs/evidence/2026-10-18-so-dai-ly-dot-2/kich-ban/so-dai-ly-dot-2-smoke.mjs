// Kịch bản Chrome — sổ đại lý đợt 2, Task 12 «Giao diện» (ADR-0132, ADR-0078 điều 7, 9, 10; ADR-0079 điều 7–8; đặc tả P4–P7).
// Trang: trang đơn đại lý trước / sau «Đã giao»; form «Ghi khoản thu» với hai lựa chọn mới («Khách trả cho đại lý <tên>», «Khách trả tại quầy <nhà cung cấp>») và ô
// «Phần tiền này cho»; Trang chủ Kế toán khối «Chờ đối chiếu» + nút «Bên kia đã nhận»; trang «Chụp bù mức»; biên nhận hai phần (Tour Đảo + nhà cung cấp).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production.
// Quy tắc ADR-0074/0075: một lần đăng nhập mới của CÙNG tài khoản thay phiên của trang đang mở ⇒ dựng dữ liệu bằng API trước khi mở trang của tài khoản đó; mỗi lúc một trang.
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-so-dai-ly-dot-2/kich-ban/so-dai-ly-dot-2-smoke.mjs
// Ảnh vào docs/evidence/2026-10-18-so-dai-ly-dot-2/anh/ (OUT=<thư mục> để ghi chỗ khác). Cuối cùng in "SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
// axe: critical/serious làm đỏ bước; moderate/minor ghi ở mục "axe nhẹ".
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe();
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-18-so-dai-ly-dot-2/anh");
mkdirSync(OUT, { recursive: true });
const DESK = { width: 1040, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const KHO = [["390", MOB], ["1040", DESK]];
const HOM_NAY = vnDate(0);
const T = "'2026-01-01T00:00:00.000Z'";
const DAI_LY = { name: "Lê Thu Hà", phone: "0900000291" }; // số giả theo khuôn 09000002xx
const NCC = "I Resort Nha Trang";
const GIA_TD = { adult: 1350000, child: 950000, senior: 1200000, infant: 0 };
const GIA_IRS = { adult: 350000, child: 250000 };

const loi = [];
const axeNhe = [];
const quanSat = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
  }
}
const ghi = (s) => { quanSat.push(s); console.log(`ℹ ${s}`); };

async function chup(p, ten, { ca = false } = {}) {
  await sleep(700);
  let r;
  if (ca) {
    const m = await p.ev("({ w: innerWidth, h0: innerHeight, h: Math.min(document.documentElement.scrollHeight, 6000) })");
    await p.send("Emulation.setDeviceMetricsOverride", { width: m.w, height: Math.max(m.h, m.h0), deviceScaleFactor: p.vp.mobile ? 2 : 1, mobile: p.vp.mobile });
    await sleep(500);
    r = await p.send("Page.captureScreenshot", { format: "png" });
    await p.send("Emulation.setDeviceMetricsOverride", { width: p.vp.width, height: p.vp.height, deviceScaleFactor: p.vp.mobile ? 2 : 1, mobile: p.vp.mobile });
    await sleep(300);
  } else r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
}
async function chupKhung(p, selector, ten) {
  await p.ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' }), true`);
  await sleep(800);
  const r = await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: Math.max(0, b.left + scrollX - 12), y: Math.max(0, b.top + scrollY - 12), width: Math.min(innerWidth, b.width + 24), height: b.height + 24 }; })()`);
  const s = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(s.result.data, "base64"));
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const moTrang = async (account, path, vp) => {
    const p = await env.openPage(vp);
    p.vp = vp;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__dialogs = []; window.confirm = (m) => { window.__dialogs.push('confirm: ' + String(m)); return true; }; window.alert = (m) => { window.__dialogs.push('alert: ' + String(m)); };" });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`, 20000);
    return p;
  };
  const cho = (p, bt, what, ms = 20000) => p.waitFor(bt, what, ms);
  const chonGiaTri = (sel, v) => `(() => { const s = document.querySelector(${JSON.stringify(sel)}); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
  const dv = (code, gia, pax = { adult: 1 }) => ({ kind: "catalog", catalogCode: code, pax, catalogPriceSeen: gia, departDate: HOM_NAY });

  // ================================================================ Dựng dữ liệu (API + SQL, CHƯA có trang nào mở)
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('IRS01','Tắm bùn I Resort','perPax',350000,250000,NULL,NULL,'Trẻ 5–10 tuổi',NULL,NULL,6,1,${T},${T})`);
  const taoDl = phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: DAI_LY.name, phone: DAI_LY.phone, roles: ["TRAVEL_AGENCY"] }), 201, "tạo tài khoản đại lý");
  const DL_ID = taoDl.staff.partyId;
  const ncc = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: NCC }), 201, "tạo hồ sơ nhà cung cấp");
  phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${ncc.party.id}/roles`, { roleTypeCode: "SUPPLIER" }), 201, "gán vai Nhà cung cấp");
  phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { tuNgay: HOM_NAY, doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 }), 201, "mức hoa hồng đại lý 10%");
  phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/cung-ung", { phamVi: "SERVICE", catalogCode: "IRS01", nguoiBanPartyId: ncc.party.id, tyLeMuaBp: 8000, tuNgay: HOM_NAY }), 201, "điều khoản cung ứng I Resort");
  const lapDon = async (ten, sdt, services, booker) => phai(await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: "", discount: 0, paymentNote: "", ...(booker ? { bookerPartyId: booker } : {}), services }), 201, `lập đơn ${ten}`).order;
  const xacNhan = async (id) => phai(await call(ACCOUNTS.salesA, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200, "xác nhận đơn");
  /** Đơn đã xác nhận KHÔNG có bản chụp (giả đơn cũ trước đợt 2): lập nháp, rồi đổi trạng thái bằng SQL. `ngay` = ngày xác nhận (giờ VN). */
  const donChuaChup = async (ten, sdt, services, booker, ngay = HOM_NAY) => {
    const o = await lapDon(ten, sdt, services, booker);
    env.sql(`UPDATE orders SET status = 'confirmed', confirmed_at = '${ngay}T03:00:00.000Z' WHERE id = '${o.id}'`);
    return o;
  };
  const donA = {};
  for (const [kho] of KHO) {
    donA[kho] = await lapDon(`Khách Đại Lý ${kho}`, `0900 111 ${kho.padStart(3, "0").slice(-3)}`, [dv("TD101", GIA_TD), dv("IRS01", GIA_IRS)], DL_ID);
    await xacNhan(donA[kho].id);
  }
  const donC = await lapDon("Khách Lẻ Một", "0900 111 777", [dv("TD101", GIA_TD)], null);
  await xacNhan(donC.id);
  const b1 = await donChuaChup("Khách Cũ Đại Lý", "0900 111 801", [dv("TD101", GIA_TD)], DL_ID);
  const b2 = await donChuaChup("Khách Cũ Lẻ", "0900 111 802", [dv("TD101", GIA_TD), dv("IRS01", GIA_IRS)], null);
  const b3 = await donChuaChup("Khách Cũ Thiếu Mức", "0900 111 803", [dv("TD101", GIA_TD)], DL_ID, vnDate(-5));
  const tA = phai(await call(ACCOUNTS.salesA, "GET", `/api/orders/${donA["390"].id}/payments`), 200, "tiền đơn A");
  ghi(`dữ liệu: đơn A tổng ${tA.tong ?? "?"}; benKia = ${JSON.stringify(tA.benKia)}`);

  // ================================================================ 1. Bán hàng: trang đơn đại lý TRƯỚC Đã giao, form Ghi khoản thu với hai lựa chọn mới
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.salesA, `/order?id=${donA[kho].id}`, vp);
      await cho(p, "!!document.querySelector('[data-action=\"ghi-lan-thu\"]')", "nút Ghi khoản thu");
      await buoc(`1-${kho}a`, `Bán hàng (${kho}): trang đơn đại lý trước Đã giao`, async () => {
        await chup(p, `1-don-dai-ly-truoc-da-giao-${kho}`, { ca: true });
      });
      await buoc(`1-${kho}b`, `form Ghi khoản thu: bốn lựa chọn người thu tiền, ô «Phần tiền này cho», câu chờ Kế toán khi chọn đại lý`, async () => {
        await p.ev("document.querySelector('[data-action=\"ghi-lan-thu\"]').click(), true");
        await cho(p, "!!document.getElementById('lan-thu-nguoi-thu')", "form mở");
        const nhan = await p.ev("[...document.querySelectorAll('#lan-thu-nguoi-thu option')].map((o) => o.textContent)");
        assert.deepEqual(nhan, ["Công ty (vào tài khoản công ty)", "Tôi thu", `Khách trả cho đại lý ${DAI_LY.name}`, `Khách trả tại quầy ${NCC}`]);
        assert.equal(await p.ev("document.querySelector('[data-khoi=\"thu-cho\"]').hidden"), false, "ô Phần tiền này cho hiện (đơn có nhà cung cấp)");
        await p.ev(chonGiaTri("#lan-thu-nguoi-thu", "ben_dat"));
        assert.equal(await p.ev("document.querySelector('[data-khoi=\"cho-ke-toan\"]').hidden"), false, "câu chờ Kế toán hiện");
        await chupKhung(p, "[data-khoi=\"form-lan-thu\"]", `1-form-khach-tra-dai-ly-${kho}`);
        await p.ev(setInput("document.querySelector('[data-khoi=\"form-lan-thu\"] input[inputmode=\"numeric\"]')", "500000"));
        await p.ev("document.querySelector('[data-khoi=\"form-lan-thu\"]').requestSubmit(), true");
        await cho(p, "/chờ Kế toán xác nhận/.test(document.getElementById('error').textContent) && !document.getElementById('error').hidden", "câu đã ghi khoản chờ Kế toán");
      });
      await buoc(`1-${kho}c`, `chọn «Khách trả tại quầy» ⇒ ô Phần tiền này cho khoá vào nhà cung cấp; ghi 350.000`, async () => {
        await p.ev("document.querySelector('[data-action=\"ghi-lan-thu\"]').click(), true");
        await cho(p, "!!document.getElementById('lan-thu-nguoi-thu')", "form mở lại");
        await p.ev(chonGiaTri("#lan-thu-nguoi-thu", `ncc:${ncc.party.id}`));
        assert.deepEqual(await p.ev("[document.getElementById('lan-thu-thu-cho').disabled, document.getElementById('lan-thu-thu-cho').value]"), [true, ncc.party.id]);
        await chupKhung(p, "[data-khoi=\"form-lan-thu\"]", `1-form-khach-tra-tai-quay-${kho}`);
        await p.ev(setInput("document.querySelector('[data-khoi=\"form-lan-thu\"] input[inputmode=\"numeric\"]')", "350000"));
        await p.ev("document.querySelector('[data-khoi=\"form-lan-thu\"]').requestSubmit(), true");
        await cho(p, "/chờ Kế toán xác nhận/.test(document.getElementById('error').textContent) && !document.getElementById('error').hidden", "câu đã ghi khoản chờ Kế toán");
        await chup(p, `1-don-dai-ly-hai-khoan-cho-${kho}`, { ca: true });
      });
      await buoc(`1-${kho}-axe`, `axe trang đơn (${kho})`, () => axeKiem(p, `/order đại lý ${kho}`));
    } catch (e) {
      loi.push(`1-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }
  // Đơn khách lẻ không có quầy: chỉ hai lựa chọn cũ.
  {
    let p;
    try {
      p = await moTrang(ACCOUNTS.salesA, `/order?id=${donC.id}`, DESK);
      await cho(p, "!!document.querySelector('[data-action=\"ghi-lan-thu\"]')", "nút Ghi khoản thu");
      await buoc("1-le", "đơn khách lẻ không quầy nhà cung cấp: chỉ «Công ty» và «Tôi thu», không ô Phần tiền này cho", async () => {
        await p.ev("document.querySelector('[data-action=\"ghi-lan-thu\"]').click(), true");
        await cho(p, "!!document.getElementById('lan-thu-nguoi-thu')", "form mở");
        assert.deepEqual(await p.ev("[...document.querySelectorAll('#lan-thu-nguoi-thu option')].map((o) => o.value)"), ["cong_ty", "toi"]);
        assert.equal(await p.ev("!!document.querySelector('[data-khoi=\"thu-cho\"]')"), false);
        await chupKhung(p, "[data-khoi=\"form-lan-thu\"]", "1-form-khach-le-1040");
      });
    } catch (e) {
      loi.push(`1-le) ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 2. Kế toán: Trang chủ «Chờ đối chiếu» + «Bên kia đã nhận»
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, "/", vp);
      await cho(p, "!document.getElementById('dash-doi-chieu').hidden && document.querySelectorAll('#dash-doi-chieu-list li').length > 0", "khối Chờ đối chiếu");
      await buoc(`2-${kho}a`, `Kế toán Trang chủ (${kho}): khối Chờ đối chiếu có khoản đại lý và quầy, nút «Bên kia đã nhận»`, async () => {
        const chu = await p.ev("document.getElementById('dash-doi-chieu').textContent");
        assert.match(chu, new RegExp(`Khách trả cho đại lý ${DAI_LY.name}`));
        assert.match(chu, new RegExp(`Khách trả tại quầy ${NCC}`));
        assert.ok((await p.ev("document.querySelectorAll('#dash-doi-chieu [data-action=\"ben-kia-da-nhan\"]').length")) >= 2);
        await chup(p, `2-trang-chu-ke-toan-cho-doi-chieu-${kho}`, { ca: true });
        await chupKhung(p, "#dash-doi-chieu", `2-khoi-cho-doi-chieu-${kho}`);
      });
      await buoc(`2-${kho}b`, `bấm «Bên kia đã nhận» cho hai khoản của đơn ${kho} ⇒ khoản rời danh sách`, async () => {
        const id = donA[kho].id;
        for (let i = 0; i < 2; i++) {
          const truoc = await p.ev(`document.querySelectorAll('#dash-doi-chieu-list li').length`);
          await p.ev(`[...document.querySelectorAll('#dash-doi-chieu-list li')].find((li) => li.querySelector('a[href*="${id}"]')).querySelector('[data-action="ben-kia-da-nhan"]').click(), true`);
          await cho(p, `document.querySelectorAll('#dash-doi-chieu-list li').length < ${truoc} || document.getElementById('dash-doi-chieu').hidden`, "khoản rời danh sách");
        }
        assert.ok((await p.ev("window.__dialogs.length")) >= 2, "có hỏi xác nhận");
        if (!(await p.ev("document.getElementById('dash-doi-chieu').hidden"))) await chupKhung(p, "#dash-doi-chieu", `2-khoi-cho-doi-chieu-sau-xac-nhan-${kho}`);
      });
      await buoc(`2-${kho}-axe`, `axe Trang chủ Kế toán (${kho})`, () => axeKiem(p, `/ Kế toán ${kho}`));
    } catch (e) {
      loi.push(`2-${kho}) ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 3. Kế toán: trang Chụp bù mức
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, "/chup-bu", vp);
      await cho(p, "!!document.querySelector('[data-khoi=\"cho-chup-bu\"]')", "danh sách chờ chụp bù tải xong");
      await buoc(`3-${kho}a`, `Chụp bù (${kho}): danh sách ba đơn, nhãn lời thường, nút từng đơn và cả danh sách`, async () => {
        if (kho === "390") {
          const chu = await p.ev("document.getElementById('cb-danh-sach').textContent");
          for (const o of [b1, b2, b3]) assert.ok(chu.includes(o.orderCode), `thiếu ${o.orderCode}`);
          assert.ok(!/co_nguoi_huong|nhap_tay|khach_le/.test(chu), "không lộ mã lý do");
          ghi(`3-390) chữ danh sách: ${chu.replace(/\s+/g, " ").slice(0, 400)}`);
        }
        await chup(p, `3-chup-bu-${kho}`, { ca: true });
      });
      if (kho === "1040") {
        await buoc("3-1040b", "Chụp bù cả danh sách ⇒ hai đơn chụp được, đơn xác nhận 5 ngày trước còn thiếu mức", async () => {
          await p.ev("document.querySelector('[data-action=\"chup-bu-ca-danh-sach\"]').click(), true");
          await cho(p, "!document.getElementById('ok').hidden || !document.getElementById('error').hidden", "câu kết quả", 30000);
          const cau = await p.ev("[document.getElementById('ok').textContent, document.getElementById('error').textContent]");
          ghi(`3-1040) kết quả: ${JSON.stringify(cau)}`);
          await chup(p, "3-chup-bu-sau-ca-danh-sach-1040", { ca: true });
        });
      }
      await buoc(`3-${kho}-axe`, `axe /chup-bu (${kho})`, () => axeKiem(p, `/chup-bu ${kho}`));
    } catch (e) {
      loi.push(`3-${kho}) ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 4. Bán hàng thu nốt (API), Quản trị bấm Đã giao, biên nhận hai phần
  for (const [kho] of KHO) {
    const t = phai(await call(ACCOUNTS.salesA, "GET", `/api/orders/${donA[kho].id}/payments`), 200, "tiền đơn A");
    ghi(`4-${kho}) trước khi thu nốt: còn lại ${t.conLai}, coTheGiao ${t.coTheGiao}, lý do ${JSON.stringify(t.lyDoChuaGiao ?? t.lyDo ?? null)}`);
    if (t.conLai > 0) phai(await call(ACCOUNTS.salesA, "POST", `/api/orders/${donA[kho].id}/payments`, { soTien: t.conLai, hinhThuc: "CASH", nguoiThu: "toi" }), 201, "thu nốt");
  }
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.admin, `/order?id=${donA[kho].id}`, vp);
      await cho(p, "!!document.querySelector('[data-action=\"da-giao\"]')", "nút Đã giao");
      await buoc(`4-${kho}a`, `Quản trị (${kho}): bấm «Đã giao – đã thu đủ» ⇒ đơn khoá; chụp sau Đã giao`, async () => {
        assert.equal(await p.ev("document.querySelector('[data-action=\"da-giao\"]').disabled"), false, "nút bấm được");
        await p.ev("document.querySelector('[data-action=\"da-giao\"]').click(), true");
        await cho(p, "/Đơn đã khoá/.test(document.getElementById('error').textContent)", "câu Đã giao");
        await chup(p, `4-don-dai-ly-sau-da-giao-${kho}`, { ca: true });
      });
      await buoc(`4-${kho}b`, `biên nhận (${kho}): hai phần — Tour Đảo và ${NCC}`, async () => {
        const r = await p.ev(`fetch('/api/orders/${donA[kho].id}/receipt').then((r) => r.json())`);
        ghi(`4-${kho}) phần biên nhận: ${JSON.stringify(r.receipt.phan.map((x) => [x.nguoiBan, x.vaiTourDao, x.tong, x.daTra, x.conLai, x.traTaiQuay]))}`);
        assert.equal(r.receipt.phan.length, 2);
        await p.ev("document.querySelector('[data-action=\"send-confirmation\"]').click(), true");
        await cho(p, "!!document.querySelector('.confirm-root [role=\"dialog\"] img, .confirm-root [role=\"dialog\"] canvas')", "ảnh biên nhận", 30000);
        await sleep(1500);
        await chup(p, `4-bien-nhan-hai-phan-${kho}`);
        // Ảnh biên nhận đầy đủ (chính tệp PNG gửi khách): đọc nguồn của <img> (blob:/data:) ngay trong trang, rồi cuộn tới phần tổng kết để chụp khung nhìn.
        const b64 = await p.ev(`(async () => { const i = document.querySelector('.confirm-root img'); if (!i) return null;
          await i.decode(); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0);
          return c.toDataURL('image/png').split(',')[1]; })()`); // CSP chặn fetch(blob:) ⇒ vẽ lại <img> đã giải mã lên canvas (cùng nguồn, không bẩn)
        assert.ok(b64, "có ảnh <img> trong hộp biên nhận");
        writeFileSync(join(OUT, `4-bien-nhan-hai-phan-anh-${kho}.png`), Buffer.from(b64, "base64"));
        await p.ev("(() => { const i = document.querySelector('.confirm-root img'); i.scrollIntoView({ block: 'end' }); return true; })()");
        await chup(p, `4-bien-nhan-hai-phan-cuoi-${kho}`);
      });
    } catch (e) {
      loi.push(`4-${kho}) ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }
} finally {
  await env.stop();
}

if (axeNhe.length) console.log(`\naxe nhẹ (${axeNhe.length}):\n  ${axeNhe.join("\n  ")}`);
if (quanSat.length) console.log(`\nquan sát:\n  ${quanSat.join("\n  ")}`);
if (loi.length) {
  console.log(`\nBƯỚC ĐỎ (${loi.length}):\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nSMOKE OK");
