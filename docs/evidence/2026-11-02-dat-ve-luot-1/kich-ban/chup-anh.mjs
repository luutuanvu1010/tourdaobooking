// Ảnh chụp THẬT cho «Đặt vé của đối tác» lượt 1 (2026-11-02, Task 5 bước 6): Chrome headless thật, D1 tạm (wrangler dev --persist-to thư mục tạm), KHÔNG production.
// Mỗi cảnh chụp hai khổ: 390 (điện thoại, mobile=true, tỷ lệ 2) và 1280 (máy tính, tỷ lệ 1).
//   1. Form Tạo đơn của Đối tác (form gọn), đã chọn một dịch vụ để thẻ mở ra.
//   2. Form Tạo đơn của Bán hàng (đối chiếu: vẫn khối «Thông tin chuyến», nhãn «Giảm giá (₫)»).
//   3. Trang Hoa hồng, thẻ «Cấp độ đại lý».
//   4. Trang Hoa hồng, thẻ «Vai người dùng» (danh sách vai + khối «Người có cấp riêng»), một đối tác đang mở.
//   5. Quản lý tài khoản, một nút lọc theo vai trò đang bấm.
// Ngoài ra ảnh cắt sát (gấp đôi) ô giảm giá và dòng Ghi chú của form Đối tác ở khổ 390, và số đo kiểu chữ hai tiêu đề của thẻ «Vai người dùng».
// Chạy từ GỐC repo (worktree), sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-02-dat-ve-luot-1/kich-ban/chup-anh.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-11-02-dat-ve-luot-1/).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-11-02-dat-ve-luot-1";
mkdirSync(OUT, { recursive: true });
const KHO = [
  ["390", { width: 390, height: 844, mobile: true }],
  ["1280", { width: 1280, height: 900, mobile: false }],
];
const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]);

const env = await startEnv();
const pages = [];
try {
  const login = async (account) => {
    for (let i = 0; ; i++) {
      try { return await env.login(account); } catch (e) { if (i >= 2 || e?.cause?.code !== "ECONNRESET") throw e; await sleep(200); }
    }
  };
  const call = async (account, method, path, body) => {
    const c = await login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const openAs = async (account, path, viewport) => {
    const p = await env.openPage(viewport);
    pages.push(p);
    const c = await login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  /**
   * Ẩn tạm các thanh bám đáy / bám đỉnh (`position: fixed` hoặc `sticky`) để chụp. `moi(e)` chọn phần tử cần ẩn trong lượt này. Phần tử đã ẩn (có `data-an-tam`) bị bỏ qua. Trả số phần tử ẩn thêm được.
   * Vì sao phải lặp (lỗi thấy ở ảnh Hoa hồng khổ 390, 2/11): trang Hoa hồng có thanh dính đáy `#hh-thanh-cuoi`; khi nó hiện, shell (`web/shell.ts`, `theoDoiThanhDinh`) ẩn thanh tab dưới bằng lớp `tabbar-dinh`
   * nên lượt đầu KHÔNG thấy `#tabbar` (display: none, cao 0). Ẩn `#hh-thanh-cuoi` xong, shell gỡ lớp đó sau một khung hình và `#tabbar` hiện lại: lượt ẩn một lần không bắt được. Lặp tới khi hết phần tử mới.
   */
  const anMotLuot = (p, moi) => p.ev(`(() => { let n = 0; for (const e of document.querySelectorAll('body *')) { if (e.dataset.anTam !== undefined) continue; const s = getComputedStyle(e); if ((s.position === 'fixed' || s.position === 'sticky') && (${moi})) { e.dataset.anTam = e.style.display; e.style.display = 'none'; n++; } } return n; })()`);
  const anHetThanhDay = async (p, moi) => {
    for (let i = 0; i < 6; i++) {
      const n = await anMotLuot(p, moi);
      await sleep(250); // đủ cho shell đo lại thanh dính (requestAnimationFrame) và vẽ lại
      if (n === 0) return;
    }
    throw new Error("thanh dính vẫn còn hiện lại sau 6 lượt ẩn");
  };
  const traThanhDay = (p) => p.ev(`(() => { for (const e of document.querySelectorAll('[data-an-tam]')) { e.style.display = e.dataset.anTam; delete e.dataset.anTam; } return true; })()`);
  /**
   * Ảnh toàn trang: Chrome vẽ thanh dính đáy (`position: fixed` hoặc `sticky` bám đáy: có `bottom`, không có `top`) MỘT lần ở độ cao khung nhìn, tức giữa trang, che mất nội dung. Ẩn tạm các thanh bám đáy khi chụp (tổng tiền + nút
   * «Gửi đơn» / «＋ Thêm mức» vẫn có ở trang thật, chỉ không có trong ảnh dài), rồi trả lại. Sau khi ẩn xong KIỂM bằng số đo: không còn thanh bám đáy nào đang hiện ở nửa dưới khung nhìn, nếu còn thì dừng (không chụp ảnh sai).
   * `sticky` có `top` (tiêu đề bảng `.bang th`, `.form-side`) bám ĐỈNH nên không vẽ giữa trang: KHÔNG ẩn. Ẩn nhầm thì bảng trong ảnh mất hàng tiêu đề (lỗi thấy ở ảnh ma trận cấp, 2/11).
   */
  const THANH_DAY = "(s.position === 'fixed' || s.top === 'auto') && e.getBoundingClientRect().top > innerHeight * 0.5";
  const chup = async (p, duongDan) => {
    await anHetThanhDay(p, THANH_DAY);
    const con = await p.ev(`[...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'sticky') && e.getClientRects().length > 0 && ${THANH_DAY}; }).map((e) => e.tagName + '#' + e.id)`);
    assert.deepEqual(con, [], `thanh dưới còn hiện khi chụp ${duongDan}: ${con.join(", ")}`);
    await p.shot(duongDan);
    await traThanhDay(p);
  };
  /** Ảnh cắt sát phần tử `selector` (biểu thức JS trả phần tử), nới `le` px mỗi phía, gấp đôi độ nét. */
  const cat = async (p, bieuThuc, duongDan, le = 12, them = 0) => {
    // Thanh trên cùng dính (bước Khách · Dịch vụ · Thanh toán) và thanh dưới cố định đè lên vùng cắt khi cuộn tới phần tử: ẩn tạm mọi phần tử fixed / sticky (lặp, vì shell hiện lại thanh tab khi thanh dính đáy bị ẩn).
    await anHetThanhDay(p, "true");
    const r = await p.ev(`(() => { const e = ${bieuThuc}; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
    await sleep(150);
    const x = Math.max(0, r.x - le);
    const y = Math.max(0, r.y - le);
    const shot = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x, y: Math.max(0, y - (them > 0 ? 130 : 0)), width: r.w + 2 * le, height: r.h + 2 * le + them + (them > 0 ? 130 : 0), scale: 2 } });
    writeFileSync(duongDan, Buffer.from(shot.result.data, "base64"));
    await traThanhDay(p);
  };

  // ---- dữ liệu ----
  const PARTNER = { name: "Đối Tác Chụp Ảnh", phone: "0900000291", pin: "246891", permissions: ["PARTNER"] };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(PARTNER)).split("\n")) env.sql(stmt);
  // Sổ đại lý: hai vai, hai cấp, mức riêng của vai, hai đối tác (một có cấp riêng, một có mức riêng).
  const loaiMoi = async (ten) => phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten }), 201, `vai ${ten}`).loai;
  const capMoi = async (ten, tyLeBp) => {
    const c = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten }), 201, `cấp ${ten}`).muc.code;
    phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${c}/dong`, { tuNgay: "2026-01-01", phamVi: "ALL", kieu: "RATE", tyLeBp }), 201, `dòng cấp ${ten}`);
    return c;
  };
  const L_TAN = await loaiMoi(`Lễ tân khách sạn ${CHU}`);
  const L_DL = await loaiMoi(`Đại lý lữ hành ${CHU}`);
  const C_VANG = await capMoi(`Vàng ${CHU}`, 1000);
  const C_BAC = await capMoi(`Bạc ${CHU}`, 800);
  phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta/gan", { loai: L_DL.code, muc: C_VANG, tuNgay: vnDate(-5) }), 201, "xếp vai vào cấp");
  phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: L_TAN.code }, phamVi: "SERVICE", catalogCode: "TD101", kieu: "RATE", tyLeBp: 900, tuNgay: vnDate(-5) }), 201, "mức riêng của vai");
  const orgMoi = async (ten, loai) => {
    const o = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten }), 201, `hồ sơ ${ten}`).party;
    phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${o.id}/roles`, { roleTypeCode: loai.code }), 201, "gắn vai cho hồ sơ");
    return o;
  };
  const ORG1 = await orgMoi(`Khách sạn Biển Xanh ${CHU}`, L_TAN);
  const ORG2 = await orgMoi(`Công ty Lữ hành Sao Biển ${CHU}`, L_DL);
  phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/ho-so/${ORG1.id}/muc-rieng`, { muc: C_BAC, tuNgay: vnDate(0) }), 201, "cấp riêng cho đối tác");
  phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: ORG2.id }, phamVi: "SERVICE", catalogCode: "TD101", kieu: "RATE", tyLeBp: 1200, tuNgay: vnDate(-3) }), 201, "mức riêng của đối tác");
  // Tài khoản MANG VAI cho bộ lọc ở Quản lý tài khoản (Toàn quyền tạo qua API thật, đúng cách dot-a-smoke.mjs): hai «Nhân viên kinh doanh», một «Công ty lữ hành».
  for (const [ten, sdt, vai] of [["Lọc Bán Một", "0900000381", "SALES_STAFF"], ["Lọc Bán Hai", "0900000382", "SALES_STAFF"], ["Lọc Đại Lý", "0900000383", "TRAVEL_AGENCY"]]) {
    phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone: sdt, roles: [vai] }), 201, `tài khoản ${ten}`);
  }
  ok("dữ liệu dựng xong (2 vai, 2 cấp, 2 đối tác, 3 tài khoản mang vai)");

  // ---- 1, 2: form Tạo đơn ----
  const CARD = "[...document.querySelectorAll('#services .svc')].find((c) => c.querySelector('.svc-name')?.textContent === 'Tour 4 đảo Nha Trang')";
  const chonTd101 = async (p) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length >= 3", "ô tìm danh mục hiện dịch vụ", 10000);
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`!!(${CARD})`, "thẻ Tour 4 đảo Nha Trang");
    await p.ev(setInput(`(${CARD}).querySelector('.counter-field[aria-label="Người lớn"]')`, "2"));
    await p.waitFor(`[...(${CARD}).querySelectorAll('.dong-tien-chu')].some((e) => e.getClientRects().length > 0)`, "dòng tiền chữ hiện");
    await sleep(300);
  };
  for (const [ten, vp] of KHO) {
    // Bán hàng mở trước, đóng xong mới tới Đối tác (kho cookie chung).
    let p = await openAs(ACCOUNTS.salesA, "/order-form", vp);
    await chonTd101(p);
    await chup(p, join(OUT, `form-ban-hang-${ten}.png`));
    p.close();
    p = await openAs(PARTNER, "/order-form", vp);
    await chonTd101(p);
    await chup(p, join(OUT, `form-doi-tac-${ten}.png`));
    if (ten === "390") {
      await cat(p, "document.getElementById('discount').closest('.o-noi, label, div')", join(OUT, "cat-o-giam-gia-390.png"), 16);
      await cat(p, `(${CARD}).querySelector('input[data-trip-gon="note"]').closest('label')`, join(OUT, "cat-dong-ghi-chu-390.png"), 24);
      await cat(p, `(${CARD})`, join(OUT, "cat-the-dich-vu-390.png"), 12);
    }
    const so = await p.ev(`(() => { const d = document.getElementById('discount'); const g = (${CARD}).querySelector('input[data-trip-gon="note"]');
      const r = (e) => { const b = e.getBoundingClientRect(); return { rong: Math.round(b.width), cao: Math.round(b.height), cuonNgang: e.scrollWidth > e.clientWidth }; };
      return { giamGia: { ...r(d), goiY: d.placeholder }, ghiChu: { ...r(g), goiY: g.placeholder } }; })()`);
    console.log(`    [${ten}] đo ô: ${JSON.stringify(so)}`);
    p.close();
    ok(`form Bán hàng + form Đối tác [${ten}]`);
  }

  // ---- 3, 4: trang Hoa hồng ----
  for (const [ten, vp] of KHO) {
    const p = await openAs(ACCOUNTS.accounting, "/hoa-hong", vp);
    await p.waitFor("!document.getElementById('hh-noi-dung').hidden && document.querySelectorAll('#hh-the-cap *').length > 3", "trang Hoa hồng nạp xong", 12000);
    await sleep(300);
    await chup(p, join(OUT, `hoa-hong-cap-do-dai-ly-${ten}.png`));
    await p.ev("document.getElementById('hh-tab-loai').click(); true");
    await p.waitFor("!document.getElementById('hh-the-loai').hidden && document.querySelectorAll('#hh-loai-rieng .hh-dt').length >= 1", "thẻ Vai người dùng có đối tác", 8000);
    await p.ev("document.querySelector('#hh-loai-rieng .hh-dt .hh-loai-nut').click(); true");
    await p.waitFor("[...document.querySelectorAll('#hh-loai-rieng .hh-lo-ct h4')].some((x) => x.textContent === 'Cấp riêng')", "đối tác mở, hồ sơ đã nạp", 10000);
    await sleep(400);
    await chup(p, join(OUT, `hoa-hong-vai-nguoi-dung-${ten}.png`));
    await cat(p, "document.querySelector('#hh-loai-rieng .hh-cap-dau')", join(OUT, `cat-dau-khoi-nguoi-co-cap-rieng-${ten}.png`), 24, 230);
    const kieu = await p.ev(`(() => { const k = (e) => { const s = getComputedStyle(e); return { chu: e.textContent, the: e.tagName, coChu: s.fontSize, dam: s.fontWeight, hoa: s.textTransform, mau: s.color, leTren: s.marginTop }; };
      return { s2: getComputedStyle(document.documentElement).getPropertyValue('--s2').trim(), s3: getComputedStyle(document.documentElement).getPropertyValue('--s3').trim(), tieuDeThe: k(document.querySelector('#hh-loai-ds .hh-muc-ten')), tieuDeKhoi: k(document.querySelector('#hh-loai-rieng .hh-muc-ten')), tieuDeTrongDoiTac: [...document.querySelectorAll('#hh-loai-rieng .hh-lo-ct h4')].map(k) }; })()`);
    console.log(`    [${ten}] kiểu chữ tiêu đề: ${JSON.stringify(kieu)}`);
    p.close();
    ok(`Hoa hồng hai thẻ [${ten}]`);
  }

  // ---- 5: Quản lý tài khoản có lọc ----
  for (const [ten, vp] of KHO) {
    const p = await openAs(ACCOUNTS.chu, "/staff", vp);
    await p.waitFor("document.querySelectorAll('#loc-vai .loc-nut').length >= 3", "bộ lọc vai trò có nút", 12000);
    const nut = await p.ev("[...document.querySelectorAll('#loc-vai .loc-nut')].map((b) => ({ khoa: b.dataset.loc, chu: b.textContent.trim() }))");
    console.log(`    [${ten}] nút lọc: ${JSON.stringify(nut)}`);
    const chon = nut.find((n) => n.khoa !== "tat-ca" && !/^Tất cả/.test(n.chu) && !/Chưa gán/.test(n.chu)) ?? nut[1];
    await p.ev(`document.querySelector('#loc-vai .loc-nut[data-loc=${JSON.stringify(chon.khoa)}]').click(); true`);
    await sleep(400);
    const hang = await p.ev("(() => { const b = [...document.querySelectorAll('#loc-vai .loc-nut')]; const tops = new Set(b.map((x) => Math.round(x.getBoundingClientRect().top))); return { soNut: b.length, soHang: tops.size }; })()");
    console.log(`    [${ten}] bấm «${chon.chu}»; hàng nút: ${JSON.stringify(hang)}`);
    await chup(p, join(OUT, `quan-ly-tai-khoan-loc-${ten}.png`));
    await cat(p, "document.getElementById('loc-vai')", join(OUT, `cat-hang-loc-${ten}.png`), 12);
    p.close();
    ok(`Quản lý tài khoản có lọc [${ten}]`);
  }
  console.log("CHUP ANH OK");
} finally {
  for (const p of pages) try { p.close(); } catch { /* đã đóng */ }
  await env.stop();
}
