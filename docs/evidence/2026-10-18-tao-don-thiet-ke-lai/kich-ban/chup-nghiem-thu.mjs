// Việc 10 (nghiệm thu) — chụp ảnh THẬT màn Tạo đơn thiết kế lại: bốn vai (Bán hàng, Đối tác, Thực tập, Toàn quyền) × hai khổ (390, 1040).
// Mỗi vai × khổ chụp: <vai>-<khổ>-vao.png (vừa mở, đã điền ngày) · <vai>-<khổ>-ba-dich-vu.png (đã chọn TD101 + TTB03 + TTB06, TD101 có đưa đón, tên + số điện thoại giả;
// ảnh nhìn thấy trong khung, đầu trang) · <vai>-<khổ>-ba-dich-vu-dai.png (cả trang kéo dài; thanh dính đáy tạm cho nằm theo dòng, nút nổi Hỗ trợ ẩn).
// Dữ liệu: danh mục giả của môi trường thử (D1 tạm), tên "Khách Chụp Ảnh", số 0912 345 678 — KHÔNG dữ liệu khách thật. Không lưu đơn.
// Các trang dùng CHUNG kho cookie: mỗi trang đóng xong mới mở trang kế.
// Chạy từ GỐC repo, sau `npm run build:web`, không cần mạng ngoài:
//   OUT=<thư mục ảnh> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/chup-nghiem-thu.mjs
//   (CHI_VAI=ban-hang để thử nhanh một vai)
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/anh";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const env = await startEnv();
const soDo = {};
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const dt = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Chụp Ảnh", phone: "0900000271", roles: ["COLLABORATOR"] });
  assert.equal(dt.status, 201, JSON.stringify(dt.json));
  const PARTNER = { name: "Đối Tác Chụp Ảnh", phone: "0900000271", pin: dt.json.pin };
  const INTERN = { name: "Thực Tập Chụp Ảnh", phone: "0900000272", pin: "246872", permissions: ["INTERN"] };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(INTERN)).split("\n")) env.sql(stmt);
  const VAI = [["ban-hang", ACCOUNTS.salesA], ["doi-tac", PARTNER], ["thuc-tap", INTERN], ["toan-quyen", ACCOUNTS.chu]];
  const CHI = process.env.CHI_VAI ? process.env.CHI_VAI.split(",") : null;
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`document.querySelectorAll('#services .svc').length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(300);
    await p.ev(setInput(`document.querySelectorAll('#services .svc')[${soThe - 1}].querySelector('.counter-field')`, "2"));
    await sleep(200);
  };
  const anh = async (p, ten, beyond = false) => {
    const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: beyond });
    writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  };
  for (const [vai, account] of VAI.filter(([v]) => !CHI || CHI.includes(v))) {
    for (const [kho, vp] of [["390", MOB], ["1040", DESK]]) {
      const p = await env.as(account, "/order-form", vp);
      await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
      await sleep(600);
      await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
      await sleep(300);
      await p.ev("window.scrollTo(0, 0); true");
      await anh(p, `${vai}-${kho}-vao`);
      await chon(p, "TD101", 1);
      await p.ev("(() => { document.querySelector('#services .svc [data-action=\"them-dua-don\"]')?.click(); return true; })()");
      await sleep(300);
      await chon(p, "phao", 2);
      await chon(p, "TTB06", 3);
      // Đóng danh sách tìm còn mở sau thao tác chọn cuối: Escape ở ô tìm xoá chữ tìm, bỏ tiêu điểm, chờ ổn định.
      await p.ev("(() => { const q = document.getElementById('catalog-q'); q.focus(); q.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); q.blur(); return true; })()");
      await sleep(500);
      await p.ev(setInput("document.getElementById('customerName')", "Khách Chụp Ảnh"));
      await p.ev(setInput("document.getElementById('customerPhone')", "0912345678"));
      await p.ev("window.scrollTo(0, 0); true");
      await sleep(400);
      soDo[`${vai}-${kho}`] = await p.ev("document.documentElement.scrollHeight");
      await anh(p, `${vai}-${kho}-ba-dich-vu`);
      await p.ev("(() => { let s = document.getElementById('chup-tam'); if (!s) { s = document.createElement('style'); s.id = 'chup-tam'; s.textContent = '.form-actions, .thanh-luu, .buoc-thanh { position: static !important; } #tl-fab { display: none !important; }'; document.head.append(s); } return true; })()");
      await sleep(200);
      await anh(p, `${vai}-${kho}-ba-dich-vu-dai`, true);
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${vai} ${kho}`);
      p.close();
      ok(`${vai} ${kho}: cao ${soDo[`${vai}-${kho}`]}px`);
    }
  }
  writeFileSync(join(OUT, "so-do-trang.json"), JSON.stringify(soDo, null, 1));
  console.log("CHUP NGHIEM THU OK");
} finally {
  await env.stop();
}
