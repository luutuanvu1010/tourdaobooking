// BẢN CHÉP (đợt B khung gốc, 24/11/2026) của docs/evidence/2026-10-02-tien-xe-thue/kich-ban/bang-gia-xe-smoke.mjs — hồ sơ có ngày giữ nguyên. Đổi BỘ CHỌN theo khung gốc
// (ADR-0222, khuôn Thiết lập): khối của thẻ con #bg-panel có bảng (tr[data-dong]) và danh sách dòng (.dong[data-dong]) — KHỐI từ 800 hiện bảng, hẹp hơn hiện danh sách
// (1040: khối hẹp hơn 800 → danh sách); mọi phép đọc / bấm dòng giá lấy cách trình bày ĐANG HIỆN. Form máy tính là khối #bg-form (đầu khối h2, nhãn .truong > label,
// gợi ý .truong-goi-y); thẻ con [role=tab] trong .tab-phu; danh mục Tuyến / Cỡ xe là .dong[data-ten] trong #bg-dm-tuyen / #bg-dm-co, mô tả ở .khoi-mo-ta của khối.
// Đổi CÓ CHỦ Ý (ghi ở README-kich-ban-xe.md): nhãn cột viết thường; ô thêm tuyến / cỡ xe nay nằm trong form mở bằng nút «Thêm» ở đầu khối (data-action
// mo-them-tuyen / mo-them-co) — kịch bản bấm thêm nút mở đó; dòng danh sách ở điện thoại xếp «tuyến · cỡ · hiệu lực · trạng thái · số tiền» (so từng phần thay cả câu);
// nút dòng nay là .nut[data-cap] (phu = viên «Đổi giá», nguy-hiem = viên đỏ «Kết thúc»); «thẻ dọc chỉ ở điện thoại» thành «đúng một cách trình bày theo bề rộng khối».
// vcSub: dp-lib gốc đọc .sidebar-sub (đã bỏ từ menu theo việc 15/10) — kịch bản này tự đọc nhóm VẬN CHUYỂN của thanh bên (chỉ đổi cách tìm, giá trị mong đợi giữ nguyên).
// G1 — Bảng giá thuê xe (/bang-gia-xe): ADR-0057 T1, ADR-0095 Q3 (giá bắt buộc CẢ tuyến LẪN cỡ xe); bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1a.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-02-tien-xe-thue node docs/evidence/2026-11-24-khung-goc-dot-b/kich-ban/bang-gia-xe-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán (trang mở sau cùng là của Kế toán).
// OUT mặc định /tmp/dot-b-khung-goc-vc (dp-lib đọc OUT lúc nạp ⇒ đặt biến TRƯỚC rồi nạp động; dp-lib, tx-lib gốc dùng nguyên).
process.env.OUT ??= "/tmp/dot-b-khung-goc-vc";
const {
  ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, txt, typeInto, vnDate,
} = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");
const { dungNenGia } = await import("../../2026-10-02-tien-xe-thue/kich-ban/tx-lib.mjs");
// Thanh bên đổi từ 15/10 (menu theo việc) và đợt 0: không còn .sidebar-sub — đọc các mục của nhóm «VẬN CHUYỂN» (cùng cách bản chép dp-lib của nhóm Điều phối).
const vcSub = `(() => { const g = [...document.querySelectorAll('#sidebar .sidebar-group')].find((x) => x.querySelector('.sidebar-group-title')?.textContent.trim() === 'VẬN CHUYỂN'); const a = g ? [...g.querySelectorAll('.sidebar-item')] : []; const nhan = (x) => (x.querySelector('.sidebar-item-label')?.textContent ?? '').replace(/\\s+/g, ' ').trim().replace(/\\s*\\d+$/, ''); const c = a.find((x) => x.getAttribute('aria-current') === 'page'); return { items: a.map(nhan), current: c ? nhan(c) : null }; })()`;
// Khung gốc: vùng đang hiện của thẻ Giá thuê (bảng hay danh sách dòng) và các dòng giá trong đó; phần tử ĐANG HIỆN khớp bộ chọn.
const VUNG_GIA = "(() => { const t = document.querySelector('#bg-panel table'); return t && t.getClientRects().length > 0 ? t : document.querySelector('#bg-panel .ds-dong'); })()";
const DONG_GIA = `[...(${VUNG_GIA}?.querySelectorAll('[data-dong]') ?? [])]`;
const HIEN = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getClientRects().length > 0)`;
const FORM_MO = "!!document.querySelector('#bg-form:not([hidden])')";

const { env, call } = await dungMoiTruong();
const b = boDem("BANG GIA XE SMOKE");
const n = await dungNenGia(env, call);
const nam = vnDate(0).slice(0, 4);
const dmY = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const cho = (p) => p.waitFor(`!!document.querySelector('#bg-panel') || !document.getElementById('error').hidden`, "bảng giá dựng xong");
// Sáu cột như bảng cũ: [tuyến + ghi chú, cỡ, số tiền, hiệu lực, trạng thái, nút]. Bảng: chữ từng ô; danh sách dòng: ghép lại từ các phần của dòng.
const hang = `${DONG_GIA}.map((r) => { const t = (e) => (e ? e.innerText.replace(/\\s+/g, ' ').trim() : ''); if (r.tagName === 'TR') return [...r.children].map(t); const phu = [...r.querySelectorAll('.dong-chu > .o-phu')]; const [co, ...hl] = t(phu[0]).split(' · '); return [[t(r.querySelector('.dong-chu > strong')), ...phu.slice(1).map(t)].join(' '), co, t(r.querySelector(':scope > span:not(.dong-chu):not(.hang)')), hl.join(' · '), t(r.querySelector('.dong-chu .chip')), t(r.querySelector(':scope > .hang'))]; })`;
const the = `[...document.querySelectorAll('#bg-panel .ds-dong .dong')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`;
const tabs = `[...document.querySelectorAll('#bg-trang .tab-phu [role=tab]')].map((t) => [t.textContent, t.getAttribute('aria-selected')])`;
const ghi = (p) => apiCalls(p).filter((r) => r.method !== "GET");
const choTai = (p) => p.waitFor(`!document.querySelector('.tx-tai')`, "tải xong");

try {
  // ---- Bán hàng: không có ô transport.rate.view -------------------------------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, "/bang-gia-xe", DESK);
  await cho(s);
  await b.step("1", "Bán hàng mở thẳng /bang-gia-xe: câu không có quyền, không bảng, không gọi route bảng giá; thanh bên không có hai mục tiền xe thuê", async () => {
    assert.equal(await s.ev(txt("#error")), "Tài khoản này không xem được bảng giá thuê xe.");
    assert.equal(await s.ev(`!!document.querySelector('#bg-panel')`), false);
    assert.equal(apiCalls(s).filter((r) => r.path.startsWith("/api/van-chuyen/bang-gia")).length, 0);
    assert.deepEqual((await s.ev(vcSub)).items, ["Điều phối xe"]);
  });
  await s.close();

  // ---- Quản trị, máy tính -----------------------------------------------------------------------------------------------------------------------------------
  // Mở thẳng không tham số: máy chủ trả nhà xe theo tên, trang chọn nhà xe ĐẦU (Minh Tâm); bước 2 kiểm rồi chọn Phúc Thành bằng ô Nhà xe.
  const p = await env.as(ACCOUNTS.admin, "/bang-gia-xe", DESK);
  await cho(p);
  await choTai(p);
  await b.step("2", `1a 1040 Quản trị: h1 + phụ đề + "Thêm giá"; ô Nhà xe (nhà xe thôi hợp tác ghi rõ), "Giá đang áp ngày"; ba tab viên thuốc; bảng 6 cột, chip theo trạng thái máy chủ; KHÔNG "Mọi tuyến"/"Mọi cỡ xe", KHÔNG câu "giá theo tuyến được dùng" (ADR-0095)${axeNote()}`, async () => {
    assert.equal(await p.ev(txt("h1")), "Bảng giá thuê xe");
    assert.equal(await p.ev(txt(".dau-trang .doan-dan")), "Giá thuê mỗi chuyến của từng nhà xe đối tác.");
    assert.equal(await p.ev(txt('[data-action="them-gia"]')), "Thêm giá");
    const nx = await p.ev(`[...document.querySelectorAll('#bg-nha-xe option')].map((o) => o.textContent)`);
    assert.deepEqual(nx, ["Nhà xe Minh Tâm", "Nhà xe Phúc Thành", "Nhà xe Hoàng Long (đã thôi hợp tác)"], "đang hợp tác theo tên, rồi nhà xe đã thôi còn giá");
    assert.equal(await p.ev(`document.querySelector('#bg-nha-xe').value`), n.MT.id, "mặc định nhà xe đầu");
    await p.ev(typeInto("#bg-nha-xe", n.PT.id));
    await p.waitFor(`${DONG_GIA}.length === 5`, "giá Phúc Thành");
    const rongKhoi = await p.ev("document.querySelector('#bg-panel').getBoundingClientRect().width");
    console.log(`    ◦ 1040: khối rộng ${Math.round(rongKhoi)} → ${(await p.ev(`${VUNG_GIA}.tagName`)) === "TABLE" ? "bảng" : "danh sách dòng"}`);
    assert.equal(await p.ev(`document.querySelector('#bg-ngay').value`), vnDate(0));
    assert.deepEqual(await p.ev(tabs), [["Giá thuê", "true"], ["Tuyến", "false"], ["Cỡ xe", "false"]]);
    assert.equal(await p.ev(`document.querySelector('#bg-trang .tab-phu').getAttribute('role')`), "tablist");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#bg-panel table thead th')].map((x) => x.textContent)`), ["Tuyến", "Cỡ xe", "Số tiền / chuyến", "Hiệu lực", "Trạng thái", ""]); // khung gốc: nhãn cột viết thường (có chủ ý)
    const ds = await p.ev(hang);
    const tim = (t, c, tien) => ds.find((r) => r[0].startsWith(t) && r[1] === c && r[2] === tien);
    assert.deepEqual(tim("Nha Trang – sân bay Cam Ranh", "10–16 khách", "450.000 ₫"), ["Nha Trang – sân bay Cam Ranh Giá một chiều", "10–16 khách", "450.000 ₫", `01/07/${nam} – đang áp`, "Đang áp dụng", "Đổi giá Kết thúc"]); // nhãn trạng thái đổi 26/10 (e46997664, bảng từ lượt 3 — không do đợt B): Đang áp → Đang áp dụng, Sắp áp → Sắp áp dụng, Đã kết thúc → Đã ngừng
    assert.deepEqual(tim("Nha Trang – sân bay Cam Ranh", "10–16 khách", "400.000 ₫"), ["Nha Trang – sân bay Cam Ranh Giá cũ", "10–16 khách", "400.000 ₫", `01/01/${nam} – 30/06/${nam}`, "Đã ngừng", ""]);
    assert.equal(tim("Nha Trang – Bình Ba", "29–35 khách", "1.600.000 ₫")[4], "Sắp áp dụng");
    assert.equal(ds.length, 5);
    const chu = await p.ev(`document.querySelector('main').innerText`);
    for (const cam of ["Mọi tuyến", "Mọi cỡ xe", "giá theo tuyến được dùng", "Cần ít nhất một"]) assert.ok(!chu.includes(cam), `không có "${cam}"`);
    const nav = await p.ev(vcSub);
    assert.deepEqual(nav.items.slice(0, 3), ["Điều phối xe", "Bảng giá thuê xe", "Bảng kê chi phí xe"]);
    assert.equal(nav.current, "Bảng giá thuê xe");
    // khung gốc: «thẻ dọc chỉ ở điện thoại» thành «đúng một cách trình bày theo bề rộng khối» (khối từ 800 bảng, hẹp hơn danh sách dòng).
    assert.deepEqual([await p.ev(shown("#bg-panel table")), await p.ev(shown("#bg-panel .ds-dong"))], rongKhoi >= 800 ? [true, false] : [false, true], "đúng một cách trình bày theo bề rộng khối");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "bảng giá 1040");
    await shotFull(p, "g1-bang-gia-may-tinh.png");
  });

  await b.step("3", `"Giá đang áp ngày" chỉ đổi ngày xem: chọn ${dmY(vnDate(31))} → dòng "Sắp áp" thành "Đang áp" (máy chủ gắn nhãn); về hôm nay`, async () => {
    await p.ev(typeInto("#bg-ngay", vnDate(31)));
    await p.waitFor(`${DONG_GIA}.some((r) => r.innerText.includes('1.600.000') && r.innerText.includes('Đang áp'))`, "nhãn theo ngày mới");
    assert.ok(apiCalls(p).some((r) => r.method === "GET" && r.path === "/api/van-chuyen/bang-gia"));
    await p.ev(typeInto("#bg-ngay", vnDate(0)));
    await p.waitFor(`${DONG_GIA}.some((r) => r.innerText.includes('1.600.000') && r.innerText.includes('Sắp áp'))`, "về hôm nay");
  });

  await b.step("4", `"Thêm giá": form nội tuyến (nền nhạt), ô Tuyến * / Cỡ xe * bắt buộc, gợi ý "Chọn cả tuyến và cỡ xe."; thiếu cỡ → câu máy chủ nguyên văn; đủ → lưu, thân có requestId + đủ tuyến + cỡ, dòng mới hiện`, async () => {
    await p.ev(click('[data-action="them-gia"]'));
    await p.waitFor(FORM_MO, "form thêm giá");
    assert.equal(await p.ev(txt("#bg-form .khoi-dau h2")), "Thêm giá");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#bg-form label')].map((l) => l.textContent)`), ["Tuyến *", "Cỡ xe *", "Số tiền (₫) *", "Từ ngày *", "Đến ngày", "Ghi chú"]);
    assert.ok((await p.ev(`[...document.querySelectorAll('#bg-form .truong-goi-y')].map((x) => x.textContent)`)).includes("Chọn cả tuyến và cỡ xe."));
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#bg-f-tuyen option')].map((o) => o.textContent)`), ["Chọn tuyến", "Nha Trang – Bình Ba", "Nha Trang – Đầm Môn", "Nha Trang – sân bay Cam Ranh", "Nha Trang – Vinpearl"], "tuyến ngưng không chọn được; không 'Mọi tuyến'");
    assert.ok(!(await p.ev(`[...document.querySelectorAll('#bg-f-co option')].map((o) => o.textContent)`)).includes("45 khách"), "cỡ ngưng không chọn được");
    await p.ev(typeInto("#bg-f-tuyen", n.tuyen.VP));
    // L3 (vòng vá 1): số gõ sai định dạng → báo ngay ở trình duyệt, không gửi lệnh (trước đây gửi 0).
    await p.ev(typeInto("#bg-f-tien", "38O.000"));
    const truocSai = ghi(p).length;
    await p.ev(click('[data-action="luu-gia"]'));
    await p.waitFor(`!document.querySelector('#bg-form .tx-loi').hidden`, "câu không đọc được số");
    assert.match(await p.ev(txt("#bg-form .tx-loi")), /^Không đọc được số tiền/);
    assert.equal(ghi(p).length, truocSai, "không gửi lệnh khi số sai định dạng");
    await p.ev(typeInto("#bg-f-tien", "380.000"));
    await p.ev(click('[data-action="luu-gia"]'));
    await p.waitFor(`!document.querySelector('#bg-form .tx-loi').hidden`, "câu lỗi thiếu cỡ");
    assert.equal(await p.ev(txt("#bg-form .tx-loi")), "Cần chọn cả tuyến và cỡ xe.");
    await shotFull(p, "g1-them-gia-thieu-co-may-tinh.png");
    await p.ev(typeInto("#bg-f-co", n.co.C16));
    const truoc = ghi(p).length;
    await p.ev(click('[data-action="luu-gia"]'));
    await p.waitFor(`!${FORM_MO} && ${DONG_GIA}.length === 6`, "dòng mới");
    const body = JSON.parse(ghi(p).slice(truoc).at(-1).body);
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
    assert.deepEqual([body.tuyen, body.coXe, body.soTien, body.thayDongId], [n.tuyen.VP, n.co.C16, 380000, null]);
  });

  await b.step("5", `"Đổi giá": tiêu đề "Đổi giá — <tuyến>", Tuyến + Cỡ khoá, gợi ý ngày đóng dòng cũ theo ngày gõ; lưu gửi thayDongId; thêm giá trùng → 409 câu bản vẽ nguyên văn`, async () => {
    await p.ev(`${HIEN(`[data-dong="${n.G.crMoi}"] [data-action="doi-gia"]`)}.click()`);
    await p.waitFor(FORM_MO, "form đổi giá");
    assert.equal(await p.ev(txt("#bg-form .khoi-dau h2")), "Đổi giá — Nha Trang – sân bay Cam Ranh");
    assert.deepEqual(await p.ev(`[document.querySelector('#bg-f-tuyen').disabled, document.querySelector('#bg-f-co').disabled]`), [true, true]);
    assert.equal(await p.ev(`document.querySelector('#bg-f-tien').value`), "450000");
    const moi = vnDate(10);
    await p.ev(typeInto("#bg-f-tu", moi));
    assert.equal(await p.ev(txt("#bg-f-tu ~ .truong-goi-y")), `Dòng cũ sẽ kết thúc ngày ${dmY(vnDate(9))}, dòng mới bắt đầu ngày ${dmY(moi)}.`);
    await p.ev(typeInto("#bg-f-tien", "480000"));
    const truoc = ghi(p).length;
    await p.ev(click('[data-action="luu-gia"]'));
    await p.waitFor(`!${FORM_MO} && ${DONG_GIA}.length === 7`, "đã thay");
    const body = JSON.parse(ghi(p).slice(truoc).at(-1).body);
    assert.deepEqual([body.thayDongId, body.soTien, body.tuNgay], [n.G.crMoi, 480000, moi]);
    // Trùng: thêm giá Bình Ba · 10–16 khách cho Phúc Thành khi đã có? — Phúc Thành chưa có; thêm hai lần cùng khoảng ngày → lần hai 409.
    for (const lan of [1, 2]) {
      await p.ev(click('[data-action="them-gia"]'));
      await p.waitFor(FORM_MO, "form thêm giá");
      await p.ev(typeInto("#bg-f-tuyen", n.tuyen.BB));
      await p.ev(typeInto("#bg-f-co", n.co.C16));
      await p.ev(typeInto("#bg-f-tien", "1500000"));
      await p.ev(click('[data-action="luu-gia"]'));
      if (lan === 1) await p.waitFor(`!${FORM_MO} && !!document.querySelector('[data-action="them-gia"]')`, "lưu lần 1");
    }
    await p.waitFor(`!document.querySelector('#bg-form .tx-loi').hidden`, "câu trùng");
    assert.equal(await p.ev(txt("#bg-form .tx-loi")), "Nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này.");
    await shotFull(p, "g1-doi-gia-trung-ngay-may-tinh.png");
    await p.ev(click('[data-action="dong-form"]'));
  });

  await b.step("6", `"Kết thúc": hộp một ô "Đến ngày" (điền sẵn hôm nay) → "Kết thúc giá" → dòng có ngày kết thúc`, async () => {
    await p.ev(`${HIEN(`[data-dong="${n.G.vp7}"] [data-action="ket-thuc-gia"]`)}.click()`);
    await p.waitFor(`!!document.querySelector('.sheet [data-action="ket-thuc-gui"]')`, "hộp kết thúc");
    assert.equal(await p.ev(`document.querySelector('#bg-kt-den').value`), vnDate(0));
    await shotView(p, "g1-ket-thuc-may-tinh.png");
    await p.ev(click('[data-action="ket-thuc-gui"]'));
    await p.waitFor(`!document.querySelector('.sheet-root') && ${DONG_GIA}.find((r) => r.dataset.dong === ${JSON.stringify(n.G.vp7)})?.innerText.includes(${JSON.stringify(dmY(vnDate(0)))})`, "đã kết thúc");
  });

  await b.step("7", `Tab Tuyến (phím mũi tên đi tab): "Thêm giá" ẩn; tuyến ngưng có chip "Ngưng dùng" + "Dùng lại"; thêm "Nha Trang – Đà Lạt" (không ô mã)`, async () => {
    await p.ev(`document.querySelector('#bg-tab-gia').focus()`);
    await p.ev(`document.querySelector('#bg-tab-gia').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`);
    await p.waitFor(`document.querySelector('#bg-tab-tuyen').getAttribute('aria-selected') === 'true'`, "tab Tuyến");
    assert.equal(await p.ev(`document.activeElement.id`), "bg-tab-tuyen");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="them-gia"]')`), false);
    assert.equal(await p.ev(txt('[data-danh-muc="bg-dm-tuyen"] .khoi-mo-ta')), "Thêm, đổi tên hoặc ngưng dùng. Tuyến ngưng dùng vẫn giữ trong giá cũ.");
    const ht = await p.ev(`document.querySelector('#bg-dm-tuyen .dong[data-ten="Nha Trang – Hòn Tằm"]').innerText.replace(/\\s+/g, ' ').trim()`);
    assert.equal(ht, "Nha Trang – Hòn Tằm Ngưng dùng Đổi tên Dùng lại");
    // khung gốc: ô «Tên tuyến mới» nằm trong form mở bằng nút «Thêm» ở đầu khối (có chủ ý) — bấm nút mở rồi so nhãn của form.
    await p.ev(click('[data-action="mo-them-tuyen"]'));
    await p.waitFor(`${FORM_MO} && !!document.querySelector('#bg-tuyen-moi')`, "form thêm tuyến");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#bg-form label')].map((l) => l.textContent)`), ["Tên tuyến mới"]);
    await p.ev(typeInto("#bg-tuyen-moi", "Nha Trang – Đà Lạt"));
    // L6 (vòng vá 1): bấm "Thêm" hai lần liền ⇒ nút khoá ngay sau lần đầu, chỉ MỘT lệnh ghi.
    const truocTuyen = ghi(p).length;
    assert.equal(await p.ev(`(() => { const b = document.querySelector('[data-action="them-tuyen"]'); b.click(); const khoa = b.disabled; b.click(); return khoa; })()`), true, "nút Thêm khoá trong lúc chờ");
    await p.waitFor(`!!document.querySelector('#bg-dm-tuyen .dong[data-ten="Nha Trang – Đà Lạt"]')`, "tuyến mới");
    assert.equal(ghi(p).slice(truocTuyen).filter((r) => r.path === "/api/van-chuyen/tuyen").length, 1, "bấm hai lần chỉ gửi một lệnh");
    assert.equal(await p.ev(`document.querySelectorAll('#bg-dm-tuyen .dong[data-ten="Nha Trang – Đà Lạt"]').length`), 1);
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "tab tuyến 1040");
    await shotFull(p, "g1-tab-tuyen-may-tinh.png");
  });

  await b.step("8", `Tab Cỡ xe: thêm 8–9 → nhãn "8–9 khách" do máy chủ sinh; "Ngưng dùng" cỡ còn dòng giá đang áp → hỏi xác nhận với số N của máy chủ (Đóng: không ngưng)`, async () => {
    await p.ev(click("#bg-tab-co"));
    await p.waitFor(`!!document.querySelector('#bg-dm-co')`, "tab Cỡ xe");
    assert.equal(await p.ev(txt('[data-danh-muc="bg-dm-co"] .khoi-mo-ta')), "Nhập khoảng số khách, không kể tài xế.");
    await p.ev(click('[data-action="mo-them-co"]')); // khung gốc: ô cỡ xe nằm trong form mở bằng nút «Thêm» (có chủ ý)
    await p.waitFor(`${FORM_MO} && !!document.querySelector('#bg-co-tu')`, "form thêm cỡ xe");
    await p.ev(typeInto("#bg-co-tu", "8"));
    await p.ev(typeInto("#bg-co-den", "9"));
    const truocCo = ghi(p).length;
    assert.equal(await p.ev(`(() => { const b = document.querySelector('[data-action="them-co"]'); b.click(); const khoa = b.disabled; b.click(); return khoa; })()`), true, "nút Thêm cỡ khoá trong lúc chờ (L6)");
    await p.waitFor(`!!document.querySelector('#bg-dm-co .dong[data-ten="8–9 khách"]')`, "cỡ mới");
    assert.equal(ghi(p).slice(truocCo).filter((r) => r.path === "/api/van-chuyen/co-xe").length, 1, "bấm hai lần chỉ gửi một lệnh");
    await p.ev(`document.querySelector('#bg-dm-co .dong[data-ten="29–35 khách"] [data-action="ngung-dung"]').click()`);
    await p.waitFor(`!!document.querySelector('.sheet [data-action="ngung-xac-nhan"]')`, "hộp xác nhận");
    assert.equal(await p.ev(txt(".sheet .dp-sheet-text")), "Cỡ này còn 2 dòng giá đang áp. Ngưng dùng thì xe cùng số chỗ sẽ không còn khớp giá theo cỡ — vẫn ngưng?");
    await shotView(p, "g1-ngung-co-may-tinh.png");
    const truoc = ghi(p).length;
    await p.ev(`[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Đóng').click()`);
    await p.waitFor(`!document.querySelector('.sheet-root')`, "đóng hộp");
    assert.equal(ghi(p).length, truoc, "Đóng: không gửi lệnh");
  });

  await b.step("9", `Nhà xe đã thôi hợp tác (Hoàng Long): không "Thêm giá", không "Đổi giá"; vẫn "Kết thúc" (ADR-0057 B4)`, async () => {
    await p.ev(click("#bg-tab-gia"));
    await p.ev(typeInto("#bg-nha-xe", n.HL.id));
    await p.waitFor(`${DONG_GIA}.length === 1 && ${DONG_GIA}[0].innerText.includes('500.000')`, "giá Hoàng Long");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="them-gia"]')`), false);
    assert.equal(await p.ev(`!!document.querySelector('#bg-panel [data-action="doi-gia"]')`), false);
    assert.equal(await p.ev(`!!${HIEN('#bg-panel [data-action="ket-thuc-gia"]')}`), true);
    assert.match(await p.ev(`location.search`), new RegExp(`nha-xe=${n.HL.id}`));
  });
  await p.close();

  // ---- Quản trị, điện thoại ---------------------------------------------------------------------------------------------------------------------------------
  const m = await env.as(ACCOUNTS.admin, `/bang-gia-xe?nha-xe=${n.PT.id}`, MOB);
  await cho(m);
  await choTai(m);
  await b.step("10", `1a 390: thẻ dọc (tuyến + chip, cỡ, số tiền + hiệu lực, viên "Đổi giá" + viên đỏ "Kết thúc"); "Thêm giá" mở tấm đáy; không tràn ngang${axeNote()}`, async () => {
    assert.equal(await m.ev(shown("#bg-panel table")), false);
    const ds = await m.ev(the);
    // khung gốc: dòng xếp «tuyến · cỡ · hiệu lực · trạng thái · số tiền» (có chủ ý) — so từng phần của dòng thay vì cả câu theo thứ tự cũ.
    const dsHang = await m.ev(hang);
    assert.ok(dsHang.some((r) => r[0] === "Nha Trang – sân bay Cam Ranh" && r[4] === "Sắp áp dụng" && r[1] === "10–16 khách" && r[2] === "480.000 ₫"), JSON.stringify(ds));
    // nút dòng: .nut[data-cap] — phu = viên «Đổi giá», nguy-hiem = viên đỏ «Kết thúc» (trước: pill-btn / pill-btn-danger).
    assert.deepEqual(await m.ev(`[...document.querySelector('#bg-panel .ds-dong .dong[data-dong]:has(> .hang)').querySelectorAll(':scope > .hang button')].map((x) => x.getAttribute('data-cap') + '|' + x.textContent)`), ["phu|Đổi giá", "nguy-hiem|Kết thúc"]);
    assert.ok(await m.ev(noOverflowX));
    await axe(m, "bảng giá 390");
    await shotFull(m, "g1-bang-gia-dien-thoai.png");
    await m.ev(click('[data-action="them-gia"]'));
    await m.waitFor(`!!document.querySelector('.sheet [data-action="luu-gia"]')`, "tấm đáy thêm giá");
    assert.equal(await m.ev(FORM_MO), false, "điện thoại: không form nội tuyến");
    await shotView(m, "g1-them-gia-dien-thoai.png");
    await m.ev(`[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Đóng').click()`);
  });
  await m.close();

  // ---- Kế toán (mở sau cùng) --------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, "/bang-gia-xe", DESK);
  await cho(k);
  await choTai(k);
  await b.step("11", "Kế toán (= Quản trị ở bốn ô transport.*): thấy bảng, có \"Thêm giá\", \"Đổi giá\"; thanh bên có hai mục tiền xe thuê", async () => {
    assert.equal(await k.ev(txt('[data-action="them-gia"]')), "Thêm giá");
    assert.ok(await k.ev(`!!${HIEN('#bg-panel [data-action="doi-gia"]')}`));
    assert.deepEqual((await k.ev(vcSub)).items, ["Điều phối xe", "Bảng giá thuê xe", "Bảng kê chi phí xe"]);
  });
  await b.step("12", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [s, p, m, k]) assert.deepEqual(pg.consoleErrors, []);
  });
  await k.close();
} finally {
  b.xong();
  await env.stop();
}
