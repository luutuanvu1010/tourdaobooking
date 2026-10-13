// Chụp ảnh THẬT màn "Tạo đơn" cho đợt 1 (giao diện Tạo đơn trên điện thoại, bảng việc 13/10): trước và sau khi sửa, cùng một bộ ảnh.
// Bốn vai thấy màn này (Bán hàng, Thực tập, Đối tác, Toàn quyền) × hai khổ (390 điện thoại, 1040 máy tính) × các trạng thái:
//   vao = vừa mở form (đã điền ngày khởi hành); ds = ô "Gõ tên hoặc mã dịch vụ" được bấm vào (danh sách mở);
//   don = đã chọn TD101 + 2 khách + thêm đưa đón + mở "Thông tin chuyến"; don-khac-ngay = chặng đón khác ngày khởi hành + mở "Đặt qua đối tác" (vai có ô đó);
//   sua = (Bán hàng) đơn đã lưu mở lại ở /order-form?id=… (ô đã có giá trị: chữ mờ không còn hiện).
// Dữ liệu: D1 tạm + danh mục giả (21 dịch vụ TTB giả + mỗi nhóm một dịch vụ + 30 dịch vụ bổ sung → trên 40, gán nhóm bằng API Quản trị, như chip-nhom-smoke.mjs).
// Các trang dùng CHUNG kho cookie: mỗi trang đóng xong mới mở trang kế (trang của tài khoản đang chụp mở sau cùng).
// Chạy từ GỐC repo (worktree), sau `npm run build:web`, không cần mạng ngoài:
//   GIAI_DOAN=truoc node docs/evidence/2026-10-13-dot-1/kich-ban/chup-anh.mjs      (hoặc GIAI_DOAN=sau)
// AXE_JS=<…/axe.min.js> (tuỳ chọn): thêm phép đo axe (vi phạm tương phản / nhãn) cho mỗi ảnh, ghi ra $OUT/axe-<giai đoạn>.json.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const GIAI_DOAN = process.env.GIAI_DOAN ?? "truoc";
const OUT = join(process.env.OUT ?? "docs/evidence/2026-10-13-dot-1", GIAI_DOAN);
mkdirSync(OUT, { recursive: true });
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]];

const env = await startEnv();
const axeKq = {};
try {
  const T = "'2026-01-01T00:00:00.000Z'";
  const them = Array.from({ length: 21 }, (_, i) => `TTB${String(i + 7).padStart(2, "0")}`);
  const NHOM_KHAC = ["LPH", "HTA", "VHB", "VIN", "DTH", "IRS", "KON", "TTR", "NHD", "TBA", "TXE", "BUS"];
  const nhomCon = env.sql("SELECT code FROM ctl_group WHERE active = 1 AND code NOT IN ('TDA','TTB') ORDER BY sort_order").map((r) => r.code);
  assert.deepEqual([...nhomCon].sort(), [...NHOM_KHAC].sort());
  const bosung = Array.from({ length: 30 }, (_, i) => `('XT${String(i + 1).padStart(2, "0")}','Dịch vụ bổ sung ${i + 1}','perPax',250000,${100 + i},1,${T},${T})`);
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ${[...them.map((c, i) => `('${c}','Trò biển ${i + 7}','perPax',${300000 + i * 10000},${10 + i},1,${T},${T})`), ...nhomCon.map((g, i) => `('G${g}','Dịch vụ nhóm ${g}','perPax',400000,${50 + i},1,${T},${T})`), `('ZZ01','Dịch vụ mới chưa gán nhóm','perPax',500000,40,1,${T},${T})`, ...bosung].join(",")}`);
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const gan = async (codes, groupCode) => assert.equal((await call(ACCOUNTS.admin, "PUT", "/api/catalog/group-assignments", { codes, groupCode })).status, 200);
  await gan(["TTB03", "TTB06", ...them], "TTB");
  await gan(["TD101"], "TDA");
  for (const g of nhomCon) await gan([`G${g}`], g);

  // Tài khoản Đối tác (vai Cộng tác viên → quyền PARTNER, tạo bằng tài khoản Toàn quyền) và Thực tập (INTERN, gieo thẳng).
  const dt = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Chụp Ảnh", phone: "0900000271", roles: ["COLLABORATOR"] });
  assert.equal(dt.status, 201, JSON.stringify(dt.json));
  const PARTNER = { name: "Đối Tác Chụp Ảnh", phone: "0900000271", pin: dt.json.pin };
  const INTERN = { name: "Thực Tập Chụp Ảnh", phone: "0900000272", pin: "246872", permissions: ["INTERN"] };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(INTERN)).split("\n")) env.sql(stmt);

  const VAI = [
    ["ban-hang", ACCOUNTS.salesA],
    ["thuc-tap", INTERN],
    ["doi-tac", PARTNER],
    ["toan-quyen", ACCOUNTS.chu],
  ];
  const chup = async (p, ten) => {
    // Ảnh dài: thanh Lưu dính đáy và nút nổi "Hỗ trợ" bị ghép chồng giữa trang nếu chụp beyondViewport → tạm cho thanh đứng yên theo dòng và ẩn nút nổi.
    await p.ev("(() => { let s = document.getElementById('chup-tam'); if (!s) { s = document.createElement('style'); s.id = 'chup-tam'; s.textContent = '.form-actions { position: static !important; } #tl-fab { display: none !important; }'; document.head.append(s); } return true; })()");
    const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
    await p.ev("document.getElementById('chup-tam')?.remove(); true");
    if (AXE) {
      await p.ev(`${AXE}; true`);
      axeKq[ten] = await p.ev("axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }).then((r) => r.violations.map((x) => ({ id: x.id, n: x.nodes.length, ex: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))");
    }
  };
  const san = async (p) => {
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
  };
  const datNgay = (p) => p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
  const chonTd101 = async (p) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor("!!document.querySelector('#services .svc')", "thẻ dịch vụ");
    await p.ev(setInput("document.querySelector('#services .svc .counter-field[aria-label=\"Người lớn\"]')", "2"));
    await sleep(300);
    await p.ev("(() => { document.querySelector('[data-action=\"them-dua-don\"]')?.click(); return true; })()");
    await sleep(300);
  };
  for (const [vai, account] of VAI) {
    for (const [kho, vp] of KHO) {
      const p = await env.as(account, "/order-form", vp);
      await san(p);
      await datNgay(p);
      await sleep(200);
      await p.ev("window.scrollTo(0, 0); true");
      await chup(p, `${vai}-${kho}-vao`);
      // Bấm vào ô tìm để mở danh sách (như người dùng chạm vào ô).
      await p.ev("document.getElementById('catalog-q').focus(); true");
      await sleep(300);
      await p.ev("document.querySelector('.catalog').scrollIntoView({ block: 'start' }); true");
      await sleep(200);
      const r = await p.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(OUT, `${vai}-${kho}-ds.png`), Buffer.from(r.result.data, "base64"));
      // Chọn TD101, 2 khách, thêm đưa đón, mở Thông tin chuyến.
      await chonTd101(p);
      await p.ev("document.querySelector('#services details.trip').open = true; window.scrollTo(0, 0); true");
      await sleep(300);
      await chup(p, `${vai}-${kho}-don`);
      // Chặng đón KHÁC ngày khởi hành (#9) + mở "Đặt qua đối tác" nếu vai có ô đó.
      await p.ev(setInput("document.querySelector('[data-o$=\":ngay\"]')", vnDate(4)));
      await p.ev("(() => { document.querySelector('[data-action=\"dat-qua-mo\"]')?.click(); return true; })()");
      await sleep(500);
      await p.ev("window.scrollTo(0, 0); true");
      await chup(p, `${vai}-${kho}-don-khac-ngay`);
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${vai} ${kho}`);
      p.close();
      ok(`${vai} ${kho}`);
    }
  }
  // Sửa đơn đã lưu (Bán hàng): lập một đơn bằng form rồi mở lại /order-form?id=… — nơi ô đã có giá trị (chữ mờ không còn hiện).
  for (const [kho, vp] of KHO) {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await san(p);
    await datNgay(p);
    await chonTd101(p);
    await p.ev(setInput("document.querySelector('[data-o$=\":ngay\"]')", vnDate(4)));
    // Nơi đón bắt buộc khi lưu: chọn "Gõ tự do…" rồi gõ địa chỉ.
    await p.ev(setInput("document.querySelector('select[data-o$=\":don\"]')", "tudo"));
    await p.waitFor("!!document.querySelector('[data-o$=\":don-chu\"]')", "ô địa chỉ đón");
    await p.ev(setInput("document.querySelector('[data-o$=\":don-chu\"]')", "12 Trần Phú, Nha Trang"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Chụp Ảnh"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345678"));
    await sleep(200);
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "chuyển tới /order?id=… sau khi lưu", 15000);
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    await p.send("Page.navigate", { url: `${env.base}/order-form?id=${id}` });
    await sleep(500);
    await p.waitFor("location.pathname === '/order-form' && document.querySelectorAll('#services .svc').length === 1", "form sửa đơn dựng xong", 15000);
    await sleep(600);
    await p.ev("document.querySelector('#services details.trip').open = true; window.scrollTo(0, 0); true");
    await chup(p, `ban-hang-${kho}-sua`);
    p.close();
    ok(`sửa đơn ${kho}`);
  }
  if (AXE) writeFileSync(join(OUT, `axe-${GIAI_DOAN}.json`), JSON.stringify(axeKq, null, 1));
  console.log("CHUP ANH OK" + (AXE ? "" : " (chưa chạy axe: thiếu AXE_JS)"));
} finally {
  await env.stop();
}
