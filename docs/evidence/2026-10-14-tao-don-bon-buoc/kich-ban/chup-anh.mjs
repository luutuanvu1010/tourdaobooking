// Chụp ảnh THẬT màn "Tạo đơn" cho việc "bốn bước" (14/10): trước (bản 1.91 trên main) và sau khi sửa, cùng một bộ ảnh + số đo chiều cao trang.
// Dựa kịch bản đợt 1 (docs/evidence/2026-10-13-dot-1/kich-ban/chup-anh.mjs). Bốn vai (Bán hàng, Thực tập, Đối tác, Toàn quyền) × hai khổ (390, 1040) × các trạng thái:
//   vao (vừa mở, đã điền ngày) · nhom-mo · ds (danh sách dịch vụ mở) · don (đã chọn TD101 + 2 khách + thêm đưa đón; KHÔNG mở gì thêm = cái người dùng thấy mặc định)
//   · don-mo (mở hết mọi khối gập) · don-khac-ngay · loi (bấm Lưu khi thiếu SĐT) · sua (nháp có dữ liệu ở khối gập, mở lại ở /order-form?id=…, không mở tay gì)
//   · chuyen (Bán hàng: trang đơn đã xác nhận → bảng "Sửa thông tin chuyến").
// Số đo: $OUT/so-do-<giai đoạn>.json (scrollHeight mỗi trạng thái); ở giai đoạn "sau" kịch bản còn KIỂM (assert) khối gập tự mở, thân gửi không đổi, chữ "Khách có mặt".
// Các trang dùng CHUNG kho cookie: mỗi trang đóng xong mới mở trang kế (trang của tài khoản đang chụp mở sau cùng).
// Chạy từ GỐC repo (worktree), sau `npm run build:web`, không cần mạng ngoài:
//   GIAI_DOAN=truoc node docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/chup-anh.mjs      (hoặc GIAI_DOAN=sau)
// AXE_JS=<…/axe.min.js> (tuỳ chọn): thêm phép đo axe cho mỗi ảnh, ghi ra $OUT/axe-<giai đoạn>.json. CHI_VAI=ban-hang để thử nhanh một vai.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const GIAI_DOAN = process.env.GIAI_DOAN ?? "truoc";
const OUT = join(process.env.OUT ?? "docs/evidence/2026-10-14-tao-don-bon-buoc", GIAI_DOAN);
mkdirSync(OUT, { recursive: true });
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]];

// Kiểm của giai đoạn "sau" (chỉ chạy khi GIAI_DOAN=sau): khối gập tự mở khi có dữ liệu / khi lỗi, nhãn "Khách có mặt", thanh tiến độ. Mỗi ca nói rõ TRẠNG THÁI ĐẦU (đóng) trước khi tác động,
// để bài không xanh giả (nếu khối đã mở sẵn thì bài chứng minh được gì?).
const hien = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const gapMo = (ma) => `document.querySelector('button[data-gap=${JSON.stringify(ma)}]')?.getAttribute('aria-expanded') === 'true'`;
const gapMoDau = (dau) => `(() => { const b = document.querySelector('button[data-gap^=${JSON.stringify(dau)}]'); return b?.getAttribute('aria-expanded') === 'true'; })()`;
const buocTxt = (ma) => `document.querySelector('.buoc-nut[data-buoc="${ma}"]')?.textContent ?? null`;
const kiemSauSua = async (p) => {
  // nháp có dữ liệu ở mọi ô ít dùng: mọi khối gập TỰ MỞ, không mở tay gì
  assert.equal(await p.ev(gapMo("khach")), true, "khối email + ghi chú của khách tự mở");
  assert.equal(await p.ev(hien("#customerEmail")), true);
  assert.equal(await p.ev("document.querySelector('#services details.trip').open"), true, "Thông tin chuyến tự mở (có giờ / nơi có mặt)");
  assert.equal(await p.ev(hien('[data-trip="checkinPlace"]')), true);
  assert.equal(await p.ev(gapMoDau("chi-tiet-")), true, "chi tiết của chặng (xe riêng, số chỗ) tự mở");
  assert.equal(await p.ev(hien(".dd-tom-tat")), false, "chặng có giá trị ít dùng KHÔNG gọn một dòng (không giấu gì)");
  assert.equal(await p.ev("document.querySelector('[data-o$=\":xe-rieng\"]').getAttribute('aria-checked')"), "true");
  const chu = await p.ev("document.querySelector('#services .trip-body').textContent");
  assert.ok(chu.includes("Khách có mặt") && chu.includes("Có mặt lúc") && chu.includes("Có mặt tại"), chu);
  assert.ok(!/check-in/i.test(await p.ev("document.body.innerText")), "không còn chữ check-in ở màn");
};
const kiemSauSach = async (p) => {
  // nháp "sạch": mọi thứ GẬP; chặng gọn một dòng
  assert.equal(await p.ev(gapMo("khach")), false);
  assert.equal(await p.ev("document.querySelector('#services details.trip').open"), false);
  assert.equal(await p.ev(hien(".dd-tom-tat")), true, "chặng đủ nơi đón, không ô ít dùng: hiện gọn một dòng");
  assert.match(await p.ev("document.querySelector('.dd-tom-tat').textContent"), /^Chiều đi · Đón 07:30 · 12 Trần Phú, Nha Trang/);
  assert.equal(await p.ev(hien('select[data-o$=":don"]')), false);
  assert.equal(await p.ev(gapMoDau("chi-tiet-")), false);
  // (a) bấm dòng tóm tắt → chặng mở, ô nơi đón nhận focus, nút có aria-expanded đổi
  assert.equal(await p.ev("document.querySelector('.dd-tom-tat').getAttribute('aria-expanded')"), "false");
  await p.ev("document.querySelector('.dd-tom-tat').click(); true");
  assert.equal(await p.ev(hien('select[data-o$=":don"]')), true);
  assert.equal(await p.ev("document.activeElement?.matches('select[data-o$=\":don\"]')"), true, "focus vào ô nơi đón");
  // (b) LỖI MÁY KHÁCH trong khối đóng: tải lại → chặng gọn; xoá địa chỉ đón (ô ẩn) rồi Lưu → chặng TỰ MỞ, ô lỗi hiện + nhận focus
  const taiLai = async () => {
    await p.send("Page.reload");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1 && !!document.querySelector('.dd-tom-tat')", "form nháp dựng lại", 15000);
    await sleep(500);
  };
  await taiLai();
  assert.equal(await p.ev("document.querySelector('.dd-tom-tat').getAttribute('aria-expanded')"), "false", "ĐẦU: chặng đang gọn");
  await p.ev(setInput("document.querySelector('[data-o$=\":don-chu\"]')", ""));
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi");
  assert.equal(await p.ev(hien('[data-o$=":don-chu"]')), true, "ô địa chỉ đón hiện ra (chặng tự mở)");
  assert.equal(await p.ev("document.querySelector('[data-o$=\":don-chu\"]').getAttribute('aria-invalid')"), "true");
  assert.equal(await p.ev("document.activeElement?.matches('[data-o$=\":don-chu\"]')"), true, "focus tới ô lỗi");
  assert.equal(await p.ev("(() => { const r = document.querySelector('[data-o$=\":don-chu\"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()"), true, "ô lỗi nằm trong khung nhìn");
  // (b) lỗi ô nằm trong "Thêm chi tiết" của chặng: số chỗ sai ("0") gõ vào ô ẩn → Lưu → khối chi tiết TỰ MỞ, ô lỗi nhận focus
  await taiLai();
  assert.equal(await p.ev(gapMoDau("chi-tiet-")), false, "ĐẦU: chi tiết đang gập");
  await p.ev(setInput("document.querySelector('[data-o$=\":cho\"]')", "0"));
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi số chỗ");
  assert.equal(await p.ev(gapMoDau("chi-tiet-")), true, "khối chi tiết tự mở");
  assert.equal(await p.ev("document.activeElement?.matches('[data-o$=\":cho\"]')"), true, "focus tới ô số chỗ");
  assert.equal(await p.ev("document.querySelector('[data-o$=\":cho\"]').getAttribute('aria-invalid')"), "true");
  // (b) LỖI MÁY CHỦ (400 giả bằng cách chặn fetch): form hợp lệ, mọi khối đang gập → Lưu → mọi khối gập TỰ MỞ
  await taiLai();
  assert.deepEqual(await p.ev("[...document.querySelectorAll('button[data-gap][aria-expanded]')].map((b) => b.getAttribute('aria-expanded'))"), ["false", "false", "false"], "ĐẦU: ba nút gập (khách, chặng, chi tiết) đều đóng");
  await p.ev("(() => { const f = window.fetch; window.fetch = (u, o) => (String(u).endsWith('/api/orders/' + new URLSearchParams(location.search).get('id')) && o?.method === 'PUT' ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'invalid', message: 'Dịch vụ 1: số chỗ tối thiểu không hợp lệ.' } }), { status: 400, headers: { 'content-type': 'application/json' } })) : f(u, o)); return true; })()");
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden && /số chỗ tối thiểu/.test(document.getElementById('save-error').textContent)", "banner lỗi máy chủ");
  assert.deepEqual(await p.ev("[...document.querySelectorAll('#services .svc button[data-gap]')].map((b) => b.getAttribute('aria-expanded'))"), ["true", "true"], "máy chủ 400 nêu 'Dịch vụ 1': chặng + chi tiết của thẻ đó TỰ MỞ");
  assert.equal(await p.ev("document.querySelector('#services details.trip').open"), true, "Thông tin chuyến của thẻ đó tự mở");
  assert.equal(await p.ev(gapMo("khach")), false, "câu lỗi nêu dịch vụ nên khối khách giữ nguyên");
};
const kiemSauChuyen = async (p) => {
  const bang = await p.ev("document.querySelector('.sheet').textContent");
  assert.ok(bang.includes("Khách có mặt") && bang.includes("Có mặt lúc") && bang.includes("Có mặt tại"), bang);
  assert.ok(!/check-in/i.test(bang), "không còn chữ check-in trong bảng");
  assert.equal(await p.ev("document.querySelector('.sheet [data-trip=\"checkinPlace\"]').getAttribute('placeholder')"), "Ví dụ: Cảng Vinpearl");
  assert.equal(await p.ev(hien('.sheet [data-trip="checkinDate"]')), false, "ngày có mặt đang ẩn (đơn không có ngày riêng)");
  assert.equal(await p.ev(hien('.sheet [data-action="co-mat-khac-ngay"]')), true, "lối nhỏ 'Có mặt khác ngày'");
  await p.ev("document.querySelector('.sheet [data-action=\"co-mat-khac-ngay\"]').click(); true");
  assert.equal(await p.ev(hien('.sheet [data-trip="checkinDate"]')), true);
  assert.equal(await p.ev("document.activeElement?.matches('[data-trip=\"checkinDate\"]')"), true);
};
// Thanh tiến độ (mọi vai, mọi khổ): số bước, ✓ theo dữ liệu, bấm tên bước thì cuộn tới bước, bước đang xem theo cuộn.
const kiemSauBuoc = async (p, vai) => {
  const soBuoc = await p.ev("[...document.querySelectorAll('.buoc-muc')].filter((l) => !l.hidden).length");
  assert.equal(soBuoc, ["ban-hang", "toan-quyen"].includes(vai) ? 4 : 3, `${vai}: số bước`);
  if (["ban-hang", "toan-quyen"].includes(vai)) {
    // ✓ của bước Thanh toán theo lỗi tiền (MỘT nơi so sánh: loiTienForm ở web/order-form.ts): giảm giá vượt tạm tính → mất ✓; xoá giảm giá → có lại.
    assert.match(await p.ev(buocTxt("thanh-toan")), /^✓/, `${vai}: có dịch vụ, tiền hợp lệ → Thanh toán có ✓`);
    await p.ev(setInput("document.getElementById('discount')", "999999999"));
    assert.match(await p.ev(buocTxt("thanh-toan")), /^3Thanh toán/, `${vai}: giảm giá vượt tạm tính → Thanh toán mất ✓`);
    await p.ev(setInput("document.getElementById('discount')", ""));
    assert.match(await p.ev(buocTxt("thanh-toan")), /^✓/, `${vai}: xoá giảm giá → Thanh toán có ✓ lại`);
  }
  await p.ev(setInput("document.getElementById('customerPhone')", "0912345678"));
  assert.equal(await p.ev(buocTxt("khach")), "✓Khách, bước 1, đã đủ thông tin");
  assert.match(await p.ev(buocTxt("dich-vu")), /^✓/);
  await p.ev(setInput("document.getElementById('customerPhone')", ""));
  assert.match(await p.ev(buocTxt("khach")), /^1Khách/, "xoá SĐT → Khách mất dấu ✓");
  await p.ev("window.scrollTo(0, 0); true");
  await p.ev("document.querySelector('.buoc-nut[data-buoc=\"dich-vu\"]').click(); true");
  await p.waitFor("(() => { const t = document.querySelector('[data-buoc-khoi=\"dich-vu\"]').getBoundingClientRect().top; return scrollY > 100 && t >= 0 && t < 200; })()", "cuộn tới bước Dịch vụ");
  await sleep(300);
  assert.equal(await p.ev("document.querySelector('.buoc-nut[aria-current=\"step\"]').dataset.buoc"), "dich-vu", "bước đang xem đổi theo cuộn");
  await p.ev("document.querySelector('.buoc-nut[data-buoc=\"khach\"]').click(); true");
  await p.waitFor("(() => { const t = document.querySelector('[data-buoc-khoi=khach]').getBoundingClientRect().top; return t >= 0 && t < 200; })()", "cuộn về bước Khách");
  await sleep(300);
  assert.equal(await p.ev("document.querySelector('.buoc-nut[aria-current=\"step\"]').dataset.buoc"), "khach");
  const dinh = await p.ev("(() => { const r = document.querySelector('.buoc-thanh').getBoundingClientRect(); return r.top; })()");
  assert.ok(dinh >= 0 && dinh < 120, `thanh dính ở đầu khung nhìn (top ${dinh})`);
};
const env = await startEnv();
const axeKq = {};
const soDo = {};
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
    soDo[ten] = await p.ev("document.documentElement.scrollHeight");
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
  /** Mở mọi khối gập: <details> (bản trước) và nút gập có data-gap + aria-expanded="false" (bản sau; lặp vì mở một khối có thể lộ khối con). */
  const moHet = async (p) => {
    for (let i = 0; i < 4; i++) {
      await p.ev("document.querySelectorAll('#services details').forEach((d) => { d.open = true; }); document.querySelectorAll('button[data-gap][aria-expanded=\"false\"]').forEach((b) => b.click()); true");
      await sleep(150);
    }
  };
  const CHI = process.env.CHI_VAI ? process.env.CHI_VAI.split(",") : null; // thử nhanh: CHI_VAI=ban-hang (bộ ảnh đầy đủ thì để trống)
  for (const [vai, account] of VAI.filter(([v]) => !CHI || CHI.includes(v))) {
    for (const [kho, vp] of KHO) {
      const p = await env.as(account, "/order-form", vp);
      await san(p);
      await datNgay(p);
      await sleep(200);
      await p.ev("window.scrollTo(0, 0); true");
      await chup(p, `${vai}-${kho}-vao`);
      // Nút xổ xuống "Nhóm dịch vụ" (ý chủ 13/10): mở bảng nhóm, tick hai nhóm (nếu vai có nút) rồi chụp; sau đó "Bỏ chọn hết" và đóng để ảnh danh sách đủ dịch vụ.
      const coNut = await p.ev("(() => { const n = document.getElementById('catalog-nhom-nut'); return !!n && !n.closest('.catalog-nhom').hidden; })()");
      if (coNut) {
        await p.ev("document.getElementById('catalog-nhom-nut').click(); [...document.querySelectorAll('#catalog-nhom-bang input[type=checkbox]')].slice(0, 2).forEach((c) => c.click()); true");
        await sleep(300);
        await p.ev("document.querySelector('.catalog').scrollIntoView({ block: 'start' }); scrollBy(0, -80); true");
        await sleep(200);
        const m = await p.send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(OUT, `${vai}-${kho}-nhom-mo.png`), Buffer.from(m.result.data, "base64"));
        await p.ev("document.querySelector('.catalog-nhom-bo').click(); true");
      }
      // Bấm vào ô tìm để mở danh sách (như người dùng chạm vào ô).
      await p.ev("document.getElementById('catalog-q').click(); true");
      await sleep(300);
      await p.ev("document.querySelector('.catalog').scrollIntoView({ block: 'start' }); scrollBy(0, -80); true");
      await sleep(200);
      const r = await p.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(OUT, `${vai}-${kho}-ds.png`), Buffer.from(r.result.data, "base64"));
      // Chọn TD101, 2 khách, thêm đưa đón. Trạng thái "don" = KHÔNG mở thêm gì (cái người dùng thấy mặc định); "don-mo" = mở hết mọi khối gập.
      await chonTd101(p);
      await p.ev("window.scrollTo(0, 0); true");
      await sleep(300);
      await chup(p, `${vai}-${kho}-don`);
      await moHet(p);
      await p.ev("window.scrollTo(0, 0); true");
      await sleep(300);
      await chup(p, `${vai}-${kho}-don-mo`);
      // Chặng đón KHÁC ngày khởi hành (#9) + mở "Đặt qua đối tác" nếu vai có ô đó.
      await p.ev(setInput("document.querySelector('[data-o$=\":ngay\"]')", vnDate(4)));
      await p.ev("(() => { document.querySelector('[data-action=\"dat-qua-mo\"]')?.click(); return true; })()");
      await sleep(500);
      await p.ev("window.scrollTo(0, 0); true");
      await chup(p, `${vai}-${kho}-don-khac-ngay`);
      // Lỗi lưu: có tên khách và nơi đón nhưng THIẾU số điện thoại → bấm Lưu → ảnh chụp đúng màn người dùng thấy sau khi bấm.
      await p.ev(setInput("document.getElementById('customerName')", "Khách Chụp Ảnh"));
      await p.ev(setInput("document.querySelector('select[data-o$=\":don\"]')", "tudo"));
      await p.waitFor("!!document.querySelector('[data-o$=\":don-chu\"]')", "ô địa chỉ đón");
      await p.ev(setInput("document.querySelector('[data-o$=\":don-chu\"]')", "12 Trần Phú, Nha Trang"));
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi lưu hiện", 5000);
      await sleep(600);
      soDo[`${vai}-${kho}-loi`] = await p.ev("document.documentElement.scrollHeight");
      const le = await p.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(OUT, `${vai}-${kho}-loi.png`), Buffer.from(le.result.data, "base64"));
      if (GIAI_DOAN === "sau") await kiemSauBuoc(p, vai);
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${vai} ${kho}`);
      p.close();
      ok(`${vai} ${kho}`);
    }
  }
  // Sửa đơn đã lưu (Bán hàng): lập một đơn bằng form (có dữ liệu ở các ô ít dùng: email, ghi chú, xe riêng, xe tối thiểu, ô có mặt) rồi mở lại /order-form?id=… KHÔNG mở tay gì.
  // Cùng lúc ghi thân POST (lập) và thân PUT (lưu thay đổi) ra than-gui-<giai đoạn>.json để so trước/sau (phải GIỐNG NHAU từng byte, trừ dấu thời gian khoá lạc quan).
  const thanGui = {};
  const chuanHoa = (txt) => JSON.stringify(JSON.parse(txt), (k, v) => (k === "expectedUpdatedAt" ? "<dau-thoi-gian>" : v));
  const layThan = (p, method) => p.requests.filter((r) => r.method === method && /\/api\/orders(\/[^/]+)?$/.test(new URL(r.url).pathname)).map((r) => chuanHoa(r.postData)).at(-1);
  let idDon = null;
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
    await p.ev(setInput("document.getElementById('customerEmail')", "khach.chup@example.com"));
    await p.ev(setInput("document.getElementById('customerNote')", "Khách ăn chay, đi cùng người lớn tuổi."));
    await p.ev(setInput("document.querySelector('[data-trip=\"checkinPlace\"]')", "Cảng Vinpearl"));
    await p.ev(setInput("document.querySelector('[data-trip=\"checkinTime\"]')", "07:45"));
    await p.ev(setInput("document.querySelector('[data-o$=\":cho\"]')", "7"));
    await p.ev("document.querySelector('[data-o$=\":xe-rieng\"]').click(); true");
    await sleep(200);
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "chuyển tới /order?id=… sau khi lưu", 15000);
    thanGui[`POST-${kho}`] = layThan(p, "POST");
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    idDon ??= id;
    await p.send("Page.navigate", { url: `${env.base}/order-form?id=${id}` });
    await sleep(500);
    await p.waitFor("location.pathname === '/order-form' && document.querySelectorAll('#services .svc').length === 1", "form sửa đơn dựng xong", 15000);
    await sleep(600);
    await p.ev("window.scrollTo(0, 0); true");
    await chup(p, `ban-hang-${kho}-sua`);
    if (GIAI_DOAN === "sau") await kiemSauSua(p);
    // Lưu thay đổi KHÔNG đụng gì: thân PUT phải đúng thân mà bản trước gửi cho cùng đơn.
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order'", "lưu thay đổi xong", 15000);
    thanGui[`PUT-${kho}`] = layThan(p, "PUT");
    p.close();
    ok(`sửa đơn ${kho}`);
  }
  // Một nháp "sạch" (chặng chỉ có nơi đón, không ô ít dùng nào có giá trị): bản sau phải hiện chặng GỌN một dòng.
  {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
    await san(p);
    await datNgay(p);
    await chonTd101(p);
    await p.ev(setInput("document.querySelector('select[data-o$=\":don\"]')", "tudo"));
    await p.waitFor("!!document.querySelector('[data-o$=\":don-chu\"]')", "ô địa chỉ đón");
    await p.ev(setInput("document.querySelector('[data-o$=\":don-chu\"]')", "12 Trần Phú, Nha Trang"));
    await p.ev(setInput("document.querySelector('[data-o$=\":gio\"]')", "07:30"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Sạch"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345679"));
    await sleep(200);
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "chuyển tới /order?id=… sau khi lưu", 15000);
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    await p.send("Page.navigate", { url: `${env.base}/order-form?id=${id}` });
    await sleep(500);
    await p.waitFor("location.pathname === '/order-form' && document.querySelectorAll('#services .svc').length === 1", "form sửa đơn sạch dựng xong", 15000);
    await sleep(600);
    await p.ev("window.scrollTo(0, 0); true");
    await chup(p, "ban-hang-390-sua-sach");
    if (GIAI_DOAN === "sau") await kiemSauSach(p);
    p.close();
    ok("sửa đơn sạch 390");
  }
  // Trang đơn đã xác nhận → bảng "Sửa thông tin chuyến" (có ô check-in / "Khách có mặt").
  {
    const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
    const tao = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: "Khách Bảng Trượt", customerPhone: "0904 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 1, senior: 0, infant: 0 }, unitPrices: { adult: 1350000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(10), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinTime: "09:00", checkinPlace: "Cảng Vinpearl", note: "Mang theo đồ bơi" }],
    });
    assert.equal(tao.status, 201, JSON.stringify(tao.json));
    assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${tao.json.order.id}/status`, { status: "confirmed" })).status, 200);
    for (const [kho, vp] of KHO) {
      const p = await env.as(ACCOUNTS.salesA, `/order?id=${tao.json.order.id}`, vp);
      await p.waitFor("document.querySelectorAll('#order .svc-view').length === 1", "trang đơn nạp");
      await sleep(400);
      await p.ev("(() => { const b = [...document.querySelectorAll('#actions button')].find((x) => x.textContent.trim() === 'Sửa thông tin chuyến'); b.click(); return true; })()");
      await p.waitFor("document.querySelector('.sheet-root.open') !== null", "bảng Sửa thông tin chuyến mở");
      await sleep(600);
      soDo[`ban-hang-${kho}-chuyen`] = await p.ev("document.documentElement.scrollHeight");
      const r = await p.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(OUT, `ban-hang-${kho}-chuyen.png`), Buffer.from(r.result.data, "base64"));
      if (GIAI_DOAN === "sau") await kiemSauChuyen(p);
      p.close();
      ok(`bảng Sửa thông tin chuyến ${kho}`);
    }
    // Quy tắc an toàn (a) cho ô ngày: đơn ĐÃ có ngày khách có mặt khác ngày khởi hành → bảng phải HIỆN ô ngày (kèm giá trị) và ẩn lối nhỏ — không giấu giá trị đang có.
    if (GIAI_DOAN === "sau") {
      const tao2 = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
        customerName: "Khách Ngày Có Mặt", customerPhone: "0904 333 444", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
        services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: vnDate(10), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinDate: vnDate(9), checkinTime: "21:00", checkinPlace: "Cảng Vinpearl" }],
      });
      assert.equal(tao2.status, 201, JSON.stringify(tao2.json));
      assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${tao2.json.order.id}/status`, { status: "confirmed" })).status, 200);
      const p = await env.as(ACCOUNTS.salesA, `/order?id=${tao2.json.order.id}`, MOB);
      await p.waitFor("document.querySelectorAll('#order .svc-view').length === 1", "trang đơn nạp (ngày có mặt khác ngày)");
      await sleep(400);
      await p.ev("(() => { const b = [...document.querySelectorAll('#actions button')].find((x) => x.textContent.trim() === 'Sửa thông tin chuyến'); b.click(); return true; })()");
      await p.waitFor("document.querySelector('.sheet-root.open') !== null", "bảng Sửa thông tin chuyến mở (ngày có mặt khác ngày)");
      await sleep(600);
      assert.equal(await p.ev(hien('.sheet [data-trip="checkinDate"]')), true, "đơn đã có ngày khách có mặt: ô ngày HIỆN (không giấu giá trị)");
      assert.equal(await p.ev("document.querySelector('.sheet [data-trip=\"checkinDate\"]').value"), vnDate(9));
      assert.equal(await p.ev(hien('.sheet [data-action="co-mat-khac-ngay"]')), false, "ô đã hiện thì lối nhỏ ẩn");
      p.close();
      ok("bảng Sửa thông tin chuyến: ô ngày khách có mặt hiện khi đã có giá trị");
    }
  }
  writeFileSync(join(OUT, `so-do-${GIAI_DOAN}.json`), JSON.stringify(soDo, null, 1));
  writeFileSync(join(OUT, `than-gui-${GIAI_DOAN}.json`), JSON.stringify(thanGui, null, 1));
  if (AXE) writeFileSync(join(OUT, `axe-${GIAI_DOAN}.json`), JSON.stringify(axeKq, null, 1));
  console.log("CHUP ANH OK" + (AXE ? "" : " (chưa chạy axe: thiếu AXE_JS)"));
} finally {
  await env.stop();
}
