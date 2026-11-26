// BẢN CHÉP (đợt D3 khung gốc, 26/11/2026) của docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/danh-muc-giay-to-smoke.mjs — hồ sơ có ngày giữ nguyên. Chỉ đổi BỘ CHỌN
// phần thân trang theo khuôn Thiết lập (ADR-0222): dòng = `table.bang tbody tr` hoặc `.ds-dong > .dong` (khối rộng từ 800 hiện bảng — đếm bản ĐANG HIỆN); biểu mẫu
// thêm / sửa nay mở trong bảng trượt (`.sheet`, ô `#<khối>-them-ma|-them-ten|-sua-ten|-sua-dang-dung`, nút ghi ở `.sheet-foot`, tiêu đề `.sheet-title`); lỗi của
// thao tác hiện trong dải lỗi của bảng trượt, không ở #error. Bảng đổi: README-kich-ban.md cùng thư mục. Phần kiểm thanh bên / trang Tôi giữ nguyên chữ (đỏ ở đó
// không do D3 — xem README).
// ---- phần dưới: chú thích của bản gốc ----
// Kịch bản Chrome — HAI trang danh mục giấy tờ, tách ngày 2026-09-28 theo chủ dự án ("Tách theo chủ dữ liệu") khỏi trang "Danh mục giấy tờ" cũ
// (/danh-muc-giay-to — ADR-0040 D1, D2; Task A19, khuôn sẵn của trang Địa điểm):
//   /loai-giay-to-nguoi — loại giấy tờ của người + hạng giấy phép lái xe: danh mục chung, mục trong nhóm QUẢN TRỊ ngay sau "Địa điểm" (điện thoại: dòng sau
//                         "Địa điểm" ở trang Tôi);
//   /loai-giay-to-xe    — loại giấy tờ xe: mục con của "Vận chuyển" (điện thoại: dòng trong nhóm VẬN CHUYỂN của trang Tôi).
// Giữ TÊN tệp cũ: bảng "Sửa tệp nào → chạy kịch bản Chrome nào" của web/CLAUDE.md đang trỏ tới tên này (đổi bảng đó phải chờ chủ duyệt). Kiểm:
// (a) Quản trị 390: trang Tôi — thẻ đầu Danh bạ / Địa điểm / Loại giấy tờ cá nhân (không còn "Danh mục giấy tờ"); bấm → hai khối 4 / 8 thẻ, không khối xe.
// (b) Quản trị 1040: thanh bên — "Loại giấy tờ cá nhân" trong nhóm Thiết lập (menu theo việc 15/10: nhóm thu gọn, đóng ở trang Tôi), ngay sau "Địa điểm"; mở nhóm → bấm → mục sáng; breadcrumb; hai khối 4 / 8 dòng bảng.
// (c) Quản trị 390: nhóm VẬN CHUYỂN — Xe / Giấy tờ sắp hết hạn / Loại giấy tờ xe; bấm → MỘT khối 6 thẻ (không khối người / hạng); tiêu đề thanh đầu; tab Tôi sáng.
// (d) Quản trị 1040: nhóm VẬN CHUYỂN phẳng (không còn mục cha); "Loại giấy tờ xe" ở nhóm Thiết lập — mở nhóm, bấm → mục sáng, nhóm tự mở, breadcrumb "Loại giấy tờ xe".
// (e) thêm loại giấy tờ người "Thẻ hướng dẫn viên" → hiện ngay.  (f) sửa tên một hạng → Lưu, tải lại vẫn đúng.
// (g) ngưng "Giấy phép lái xe" → câu tiếng Việt "không ngưng được", không lộ mã fixed_type.  (h) thêm loại giấy tờ xe → hiện ngay.
// (i) đường dẫn cũ /danh-muc-giay-to → tự chuyển sang /loai-giay-to-nguoi (không 404).
// (j) Bán hàng: không mục ở thanh bên, không dòng ở trang Tôi; mở thẳng hai trang → câu "Chỉ quản trị viên…", không bảng nào, không gọi API danh mục.
// axe (critical / serious) ở (a)–(d); ảnh 390 + 1040.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/danh-muc-giay-to-smoke.mjs
process.env.OUT ??= "/tmp/dot-d3-khung-goc-dm";
const { ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep, txt, typeInto } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");

const dem = boDem("DANH MUC GIAY TO SMOKE");
const { env } = await dungMoiTruong([]);
const ADMIN = ACCOUNTS.admin;
const NGUOI = "/loai-giay-to-nguoi";
const XE = "/loai-giay-to-xe";
const CU = "/danh-muc-giay-to";
const CAU_TU_CHOI = "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.";
try {
  /** Số dòng của từng khối, đếm ở bản ĐANG HIỆN (bảng hoặc danh sách dòng); khối không có trên trang → null. */
  const soDong = (p, ids) => p.ev(`${JSON.stringify(ids)}.map((k) => { const el = document.querySelector(k); if (!el) return null; const bang = el.querySelector('table.bang'); return bang && bang.getClientRects().length ? el.querySelectorAll('table.bang tbody tr').length : el.querySelectorAll('.ds-dong > .dong').length; })`);
  /** Bảng trượt đang mở: gõ ô, bấm nút ghi ở chân bảng. */
  const goO = (p, sel, v) => p.ev(typeInto(sel, v));
  const ghiBang = (p) => p.ev(`(() => { const b = document.querySelector('.sheet .sheet-foot button[type=submit]'); if (!b) return false; b.click(); return true; })()`);
  /** Chữ các tiêu đề cấp `cap` trong khối `id` (đọc thứ bậc tiêu đề: trang một khối không có h2 riêng của khối). */
  const tieuDe = (p, id, cap) => p.ev(`[...document.querySelectorAll('${id} ${cap}')].map((e) => e.textContent.trim())`);
  /** Các dòng liên kết của một thẻ ở trang Tôi. */
  const dongToi = (p, sel) => p.ev(`[...document.querySelectorAll('${sel} .row-link')].map((a) => ({ href: a.getAttribute('href'), text: a.innerText.replace(/\\s+/g, ' ').trim() }))`);
  /** Thanh bên theo việc (15/10): nhóm → mục (nhãn, đường dẫn, đang sáng); nhóm THIẾT LẬP là nút thu gọn (`open` = aria-expanded). */
const thanhBen = (p) =>
    p.ev(`[...document.querySelectorAll('#sidebar .sidebar-group')].map((g) => ({ title: g.querySelector('.sidebar-group-title')?.textContent.trim() ?? (g.querySelector('.sidebar-group-toggle') ? 'THIẾT LẬP' : 'HẰNG NGÀY'), open: g.querySelector('.sidebar-group-toggle')?.getAttribute('aria-expanded') ?? null, items: [...g.querySelectorAll('.sidebar-item')].map((a) => ({ label: a.querySelector('.sidebar-item-label').textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current') })) }))`);
  const coLienKet = (p, hrefs) => p.ev(`[...document.querySelectorAll('a')].filter((a) => ${JSON.stringify(hrefs)}.includes(a.getAttribute('href'))).map((a) => a.getAttribute('href'))`);
  const moThietLap = (p) => p.ev(`(() => { const t = document.querySelector('#sidebar .sidebar-group-toggle'); if (t.getAttribute('aria-expanded') !== 'true') t.click(); return t.getAttribute('aria-expanded'); })()`);

  await dem.step("a", "(a) Quản trị 390: trang Tôi — Danh bạ / Địa điểm / Loại giấy tờ cá nhân (không còn “Danh mục giấy tờ”); bấm → hai khối 4 / 8 thẻ, không khối xe" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", MOB);
    try {
      await p.waitFor(`!!document.querySelector('#links-top a[href="${NGUOI}"]')`, "dòng Loại giấy tờ cá nhân", 10000);
      assert.deepEqual(await dongToi(p, "#links-top"), [{ href: "/parties", text: "Danh bạ" }, { href: "/locations", text: "Địa điểm" }, { href: NGUOI, text: "Loại giấy tờ cá nhân" }]);
      assert.deepEqual(await coLienKet(p, [CU]), [], "không còn dòng Danh mục giấy tờ");
      assert.ok(await p.ev(clickVisible("#links-top", "Loại giấy tờ cá nhân")));
      await p.waitFor(`location.pathname === '${NGUOI}' && !document.querySelector('#dm-hang').hidden`, "trang Loại giấy tờ cá nhân", 10000);
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [null, 4, 8]);
      assert.deepEqual(await tieuDe(p, "#dm-nguoi", "h2"), ["Loại giấy tờ của người"]);
      assert.deepEqual(await tieuDe(p, "#dm-nguoi", "h3"), [], "biểu mẫu thêm nay ở bảng trượt (đợt D3)");
      assert.deepEqual(await tieuDe(p, "#dm-hang", "h2"), ["Hạng giấy phép lái xe"]);
      assert.equal(await p.ev(txt("#bar-title")), "Loại giấy tờ cá nhân");
      assert.equal(await p.ev(`document.querySelector('#tabbar a[href="/account"]').getAttribute('aria-current')`), "page", "tab Tôi sáng");
      await axe(p, "Loại giấy tờ cá nhân 390");
      await shotFull(p, "loai-giay-to-nguoi-390.png");
    } finally {
      p.close();
    }
  });

await dem.step("b", "(b) Quản trị 1040: thanh bên — “Loại giấy tờ cá nhân” trong nhóm Thiết lập (đóng ở trang Tôi) ngay sau “Địa điểm”, trước “Loại giấy tờ xe”; mở nhóm → bấm → mục sáng, nhóm tự mở, breadcrumb; hai khối 4 / 8 dòng" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", DESK);
    try {
      await p.waitFor(`!!document.querySelector('#sidebar a[href="${NGUOI}"]')`, "mục Loại giấy tờ cá nhân", 10000);
      const tl = (await thanhBen(p)).find((g) => g.title === "THIẾT LẬP");
      assert.equal(tl.open, "false", "nhóm Thiết lập ĐÓNG ở trang Tôi");
      const nhan = tl.items.map((i) => i.label);
      const at = nhan.indexOf("Địa điểm");
      assert.deepEqual(nhan.slice(at, at + 3), ["Địa điểm", "Loại giấy tờ cá nhân", "Loại giấy tờ xe"], JSON.stringify(nhan));
      assert.equal(tl.items[at + 1].href, NGUOI);
      assert.equal(await moThietLap(p), "true", "bấm nút Thiết lập thì nhóm mở");
      assert.ok(await p.ev(clickVisible("#sidebar", "Loại giấy tờ cá nhân")));
      await p.waitFor(`location.pathname === '${NGUOI}' && !document.querySelector('#dm-hang').hidden`, "trang Loại giấy tờ cá nhân", 10000);
      const g2 = (await thanhBen(p)).find((g) => g.title === "THIẾT LẬP");
      assert.equal(g2.open, "true", "đứng ở trang thuộc nhóm Thiết lập thì nhóm tự mở");
      assert.equal(g2.items.find((i) => i.href === NGUOI).current, "page", "mục đang mở sáng");
      assert.equal(await p.ev(txt("#bar-title")), "Loại giấy tờ cá nhân");
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [null, 4, 8]);
      await axe(p, "Loại giấy tờ cá nhân 1040");
      await shotFull(p, "loai-giay-to-nguoi-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("c", "(c) Quản trị 390: nhóm VẬN CHUYỂN — Xe / Giấy tờ sắp hết hạn / Loại giấy tờ xe; bấm → MỘT khối 6 thẻ; tiêu đề thanh đầu; tab Tôi sáng" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", MOB);
    try {
      await p.waitFor(`!!document.querySelector('#vc-links a[href="${XE}"]')`, "dòng Loại giấy tờ xe", 10000);
      // ADR-0049 B8 (2026-09-29): Quản trị có thêm dòng "Lý do điều phối" cuối nhóm VẬN CHUYỂN.
      assert.deepEqual(await dongToi(p, "#vc-links"), [{ href: "/dieu-phoi", text: "Điều phối xe" }, { href: "/xe-dang-chay", text: "Xe đang chạy" }, { href: "/de-nghi", text: "Đề nghị chuyển khách" }, { href: "/bang-gia-xe", text: "Bảng giá thuê xe" }, { href: "/bang-ke-xe", text: "Bảng kê chi phí xe" }, { href: "/xe", text: "Xe" }, { href: "/lich-xe-ban", text: "Lịch xe bận" }, { href: "/giay-to-sap-het-han", text: "Giấy tờ sắp hết hạn" }, { href: XE, text: "Loại giấy tờ xe" }, { href: "/ly-do-dieu-phoi", text: "Lý do điều phối" }]); // + Đợt 4 (tiền xe thuê) + "Lịch xe bận" (Đợt 3)
      await shotFull(p, "loai-giay-to-toi-390.png");
      assert.ok(await p.ev(clickVisible("#vc-links", "Loại giấy tờ xe")));
      await p.waitFor(`location.pathname === '${XE}' && !document.querySelector('#dm-xe').hidden`, "trang Loại giấy tờ xe", 10000);
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [6, null, null]);
      // Đợt D3: khối luôn có h2 tên khối (khuôn Thiết lập như trang Địa điểm); biểu mẫu thêm ở bảng trượt.
      assert.deepEqual(await tieuDe(p, "#dm-xe", "h2"), ["Loại giấy tờ xe"]);
      assert.deepEqual(await tieuDe(p, "#dm-xe", "h3"), []);
      assert.equal(await p.ev(txt("#bar-title")), "Loại giấy tờ xe", "điện thoại: chỉ phần cuối của breadcrumb");
      assert.equal(await p.ev(`document.querySelector('#tabbar a[href="/account"]').getAttribute('aria-current')`), "page", "tab Tôi sáng");
      await axe(p, "Loại giấy tờ xe 390");
      await shotFull(p, "loai-giay-to-xe-390.png");
    } finally {
      p.close();
    }
  });

await dem.step("d", "(d) Quản trị 1040: nhóm VẬN CHUYỂN phẳng 5 mục (không còn mục cha); “Loại giấy tờ xe” nằm trong nhóm Thiết lập — mở nhóm, bấm → mục sáng, nhóm tự mở, breadcrumb “Loại giấy tờ xe”; 6 dòng" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", DESK);
    try {
      await p.waitFor(`!!document.querySelector('#sidebar a[href="${XE}"]')`, "mục Loại giấy tờ xe", 10000);
      const nhomTruoc = await thanhBen(p);
      assert.deepEqual(nhomTruoc.find((g) => g.title === "VẬN CHUYỂN").items.map((i) => i.label), ["Điều phối xe", "Xe đang chạy", "Đề nghị chuyển khách", "Xe & giấy tờ", "Giá & chi phí"]);
      assert.equal(nhomTruoc.find((g) => g.title === "THIẾT LẬP").items.some((i) => i.href === XE), true, "Loại giấy tờ xe thuộc nhóm Thiết lập");
      assert.equal(await p.ev("!!document.querySelector('#sidebar .sidebar-parent')"), false, "không còn mục cha Vận chuyển");
      await moThietLap(p);
      assert.ok(await p.ev(clickVisible("#sidebar", "Loại giấy tờ xe")));
      await p.waitFor(`location.pathname === '${XE}' && !document.querySelector('#dm-xe').hidden`, "trang Loại giấy tờ xe", 10000);
      const moi = await thanhBen(p);
      const tl = moi.find((g) => g.title === "THIẾT LẬP");
      assert.equal(tl.items.find((i) => i.href === XE).current, "page", "mục đang mở sáng");
      assert.equal(tl.open, "true", "nhóm Thiết lập tự mở");
      assert.equal(moi.find((g) => g.title === "VẬN CHUYỂN").items.filter((i) => i.current === "page").length, 0, "không mục Vận chuyển nào sáng ở trang này");
      assert.equal(await p.ev(txt("#bar-title")), "Vận chuyển › Loại giấy tờ xe", "breadcrumb do data-title của trang (giữ nguyên sau menu theo việc)");
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [6, null, null]);
      await axe(p, "Loại giấy tờ xe 1040");
      await shotFull(p, "loai-giay-to-xe-1040.png");
    } finally {
      p.close();
    }
  });

  // Bước thêm của bản chép D3: (a)–(d) dừng ở phần kiểm trang Tôi / thanh bên (đổi menu từ trước D3) nên không chạy tới phần thân trang. Bước này mở THẲNG hai
  // trang ở 390 và 1040 và kiểm phần thân như (a)–(d): số dòng từng khối (đếm bản đang hiện), tiêu đề khối, axe.
  await dem.step("a-d'", "(a–d, phần thân) mở thẳng hai trang ở 390 + 1040: khối người 4 dòng, hạng 8 dòng, không khối xe; trang xe một khối 6 dòng; h2 tên khối, không h3" + axeNote(), async () => {
    for (const [kho, ten] of [[MOB, "390"], [DESK, "1040"]]) {
      const p = await env.as(ADMIN, NGUOI, kho);
      try {
        await p.waitFor("!document.querySelector('#dm-hang').hidden && !document.querySelector('#dm-nguoi').hidden", "trang Loại giấy tờ cá nhân", 10000);
        assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [null, 4, 8], ten);
        assert.deepEqual(await tieuDe(p, "#dm-nguoi", "h2"), ["Loại giấy tờ của người"]);
        assert.deepEqual(await tieuDe(p, "#dm-hang", "h2"), ["Hạng giấy phép lái xe"]);
        assert.deepEqual(await tieuDe(p, "main", "h3"), []);
        await axe(p, `Loại giấy tờ cá nhân ${ten}`);
        await shotFull(p, `d3-loai-giay-to-nguoi-${ten}.png`);
      } finally {
        p.close();
      }
      const q = await env.as(ADMIN, XE, kho);
      try {
        await q.waitFor("!document.querySelector('#dm-xe').hidden", "trang Loại giấy tờ xe", 10000);
        assert.deepEqual(await soDong(q, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [6, null, null], ten);
        assert.deepEqual(await tieuDe(q, "#dm-xe", "h2"), ["Loại giấy tờ xe"]);
        await axe(q, `Loại giấy tờ xe ${ten}`);
        await shotFull(q, `d3-loai-giay-to-xe-${ten}.png`);
      } finally {
        q.close();
      }
    }
  });

  await dem.step("e", "(e) thêm loại giấy tờ người “Thẻ hướng dẫn viên” (THE_HDV) → hiện ngay (1040)", async () => {
    const p = await env.as(ADMIN, NGUOI, DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-nguoi').hidden", "khối người", 10000);
      assert.ok(await p.ev(`(() => { document.querySelector('#dm-nguoi-them').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('.sheet #dm-nguoi-them-ma')", "bảng trượt thêm", 5000);
      await goO(p, "#dm-nguoi-them-ma", "THE_HDV");
      await goO(p, "#dm-nguoi-them-ten", "Thẻ hướng dẫn viên");
      assert.ok(await ghiBang(p));
      await p.waitFor(`!document.querySelector('.sheet') && [...document.querySelectorAll('#dm-nguoi tr[data-code]')].some((r) => r.textContent.includes('Thẻ hướng dẫn viên'))`, "dòng mới", 8000);
      assert.deepEqual(await soDong(p, ["#dm-nguoi"]), [5]);
    } finally {
      p.close();
    }
  });

  await dem.step("f", "(f) sửa tên hạng B → “Hạng B (mới)” → Lưu; tải lại vẫn đúng (390)", async () => {
    const p = await env.as(ADMIN, NGUOI, MOB);
    try {
      await p.waitFor("!document.querySelector('#dm-hang').hidden", "khối hạng", 10000);
      assert.ok(await p.ev(`(() => { const c = document.querySelector('#dm-hang .ds-dong > .dong[data-code="B"]'); c.querySelector('[data-action="sua"]').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('.sheet #dm-hang-sua-ten')", "bảng trượt sửa", 5000);
      await goO(p, "#dm-hang-sua-ten", "Hạng B (mới)");
      assert.ok(await ghiBang(p));
      await p.waitFor(`document.querySelector('#dm-hang .ds-dong > .dong[data-code="B"]')?.textContent.includes('Hạng B (mới)')`, "tên mới", 8000);
      await p.send("Page.reload", {});
      await p.waitFor(`document.querySelector('#dm-hang .ds-dong > .dong[data-code="B"]')?.textContent.includes('Hạng B (mới)')`, "tên mới sau tải lại", 10000);
    } finally {
      p.close();
    }
  });

  await dem.step("g", "(g) ngưng “Giấy phép lái xe” → câu tiếng Việt “không ngưng được”, không lộ mã fixed_type (1040)", async () => {
    const p = await env.as(ADMIN, NGUOI, DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-nguoi').hidden", "khối người", 10000);
      assert.ok(await p.ev(`(() => { const r = document.querySelector('#dm-nguoi tr[data-code="GPLX"]'); r.querySelector('[data-action="sua"]').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('.sheet #dm-nguoi-sua-dang-dung')", "bảng trượt sửa", 5000);
      await p.ev(`(() => { document.querySelector('#dm-nguoi-sua-dang-dung').click(); return true; })()`);
      assert.ok(await ghiBang(p));
      // Đợt D3: lỗi của thao tác hiện trong dải lỗi của bảng trượt (bảng vẫn mở), không ở #error của trang.
      await p.waitFor("!!document.querySelector('.sheet .alert[role=alert]:not([hidden])')", "câu báo trong bảng trượt", 8000);
      const msg = await p.ev(txt(".sheet .alert[role=alert]"));
      assert.match(msg, /không ngưng được/, msg);
      assert.ok(!/fixed_type/.test(await p.ev("document.body.innerText")), "không lộ mã");
      await shotFull(p, "loai-giay-to-nguoi-khong-ngung-duoc-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("h", "(h) thêm loại giấy tờ xe “Giấy phép kinh doanh vận tải” (GIAY_PHEP_KD) → hiện ngay; sửa dùng khung h2 của trang một khối (1040)", async () => {
    const p = await env.as(ADMIN, XE, DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-xe').hidden", "khối xe", 10000);
      assert.ok(await p.ev(`(() => { document.querySelector('#dm-xe-them').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('.sheet #dm-xe-them-ma')", "bảng trượt thêm", 5000);
      assert.equal(await p.ev(txt(".sheet .sheet-title")), "Thêm loại giấy tờ xe");
      await goO(p, "#dm-xe-them-ma", "GIAY_PHEP_KD");
      await goO(p, "#dm-xe-them-ten", "Giấy phép kinh doanh vận tải");
      assert.ok(await ghiBang(p));
      await p.waitFor(`!document.querySelector('.sheet') && [...document.querySelectorAll('#dm-xe tr[data-code]')].some((r) => r.textContent.includes('Giấy phép kinh doanh vận tải'))`, "dòng mới", 8000);
      assert.deepEqual(await soDong(p, ["#dm-xe"]), [7]);
      assert.ok(await p.ev(`(() => { const r = document.querySelector('#dm-xe tr[data-code="GIAY_PHEP_KD"]'); r.querySelector('[data-action="sua"]').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('.sheet #dm-xe-sua-ten')", "bảng trượt sửa", 5000);
      assert.equal(await p.ev(txt(".sheet .sheet-title")), "Sửa: GIAY_PHEP_KD");
    } finally {
      p.close();
    }
  });

  await dem.step("i", "(i) đường dẫn cũ /danh-muc-giay-to → tự chuyển sang /loai-giay-to-nguoi, trang hiện đủ hai khối (không 404)", async () => {
    const p = await env.as(ADMIN, CU, MOB);
    try {
      await p.waitFor(`location.pathname === '${NGUOI}' && !document.querySelector('#dm-hang').hidden`, "chuyển sang Loại giấy tờ cá nhân", 10000);
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"]), [null, 5, 8], "THE_HDV thêm ở (e)");
      console.log(`    (ghi nhận, không khẳng định: history.length sau chuyển hướng = ${await p.ev("history.length")})`);
    } finally {
      p.close();
    }
  });

  await dem.step("j", "(j) Bán hàng: không mục danh mục giấy tờ ở thanh bên (nhóm QUẢN TRỊ chỉ Vận chuyển › Điều phối xe), không dòng ở trang Tôi; mở thẳng hai trang → câu “Chỉ quản trị viên…”, không bảng nào, không gọi API danh mục", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#links .row-link')", "trang Tôi", 10000);
      await sleep(800);
      assert.deepEqual(await coLienKet(p, [NGUOI, XE, CU]), [], "trang Tôi (390)");
    } finally {
      p.close();
    }
    const d = await env.as(ACCOUNTS.salesA, "/account", DESK);
    try {
      await d.waitFor("!!document.querySelector('#sidebar .sidebar-item')", "thanh bên", 10000);
      await sleep(800);
      assert.deepEqual(await coLienKet(d, [NGUOI, XE, CU]), [], "thanh bên + trang Tôi (1040)");
      // ADR-0049 B1 (vòng 3, Q-B-4): Bán hàng nay có nhóm QUẢN TRỊ chỉ với "Vận chuyển › Điều phối xe" (ô trip.view) — vẫn không mục danh mục giấy tờ.
      const nhom = await thanhBen(d);
      assert.deepEqual(nhom.map((g) => g.title), ["HẰNG NGÀY", "VẬN CHUYỂN", "THIẾT LẬP"], "Bán hàng: ba nhóm (CHÂN MENU không phải nhóm có tiêu đề ở đây)"); // menu theo việc 15/10
      assert.deepEqual(nhom.find((g) => g.title === "VẬN CHUYỂN").items.map((i) => i.label), ["Điều phối xe", "Xe đang chạy"], "Bán hàng: nhóm VẬN CHUYỂN chỉ có Điều phối xe, Xe đang chạy (không Xe & giấy tờ / Giá & chi phí)");
      assert.deepEqual(nhom.find((g) => g.title === "THIẾT LẬP").items.map((i) => i.label), ["Hoa hồng đối tác"], "Bán hàng: nhóm Thiết lập chỉ có Hoa hồng đối tác — không mục danh mục giấy tờ");
    } finally {
      d.close();
    }
    for (const trang of [NGUOI, XE]) {
      const q = await env.as(ACCOUNTS.salesA, trang, DESK);
      try {
        await q.waitFor("!document.querySelector('#error').hidden", `câu báo ở ${trang}`, 10000);
        assert.equal(await q.ev(txt("#error")), CAU_TU_CHOI);
        assert.equal(await q.ev("document.querySelectorAll('table.bang, .ds-dong > .dong').length"), 0);
        assert.deepEqual(apiCalls(q).filter((c) => /meta|document-types|license-classes|loai-giay-to-xe/.test(c.path)), [], trang);
      } finally {
        q.close();
      }
    }
  });
} finally {
  await env.stop();
}
dem.xong();
