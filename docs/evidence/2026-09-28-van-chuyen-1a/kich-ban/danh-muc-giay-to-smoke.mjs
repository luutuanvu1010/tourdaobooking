// Kịch bản Chrome — HAI trang danh mục giấy tờ, tách ngày 2026-09-28 theo chủ dự án ("Tách theo chủ dữ liệu") khỏi trang "Danh mục giấy tờ" cũ
// (/danh-muc-giay-to — ADR-0040 D1, D2; Task A19, khuôn sẵn của trang Địa điểm):
//   /loai-giay-to-nguoi — loại giấy tờ của người + hạng giấy phép lái xe: danh mục chung, mục trong nhóm QUẢN TRỊ ngay sau "Địa điểm" (điện thoại: dòng sau
//                         "Địa điểm" ở trang Tôi);
//   /loai-giay-to-xe    — loại giấy tờ xe: mục con của "Vận chuyển" (điện thoại: dòng trong nhóm VẬN CHUYỂN của trang Tôi).
// Giữ TÊN tệp cũ: bảng "Sửa tệp nào → chạy kịch bản Chrome nào" của web/CLAUDE.md đang trỏ tới tên này (đổi bảng đó phải chờ chủ duyệt). Kiểm:
// (a) Quản trị 390: trang Tôi — thẻ đầu Danh bạ / Địa điểm / Loại giấy tờ cá nhân (không còn "Danh mục giấy tờ"); bấm → hai khối 4 / 8 thẻ, không khối xe.
// (b) Quản trị 1040: thanh bên — "Loại giấy tờ cá nhân" ngay sau "Địa điểm", trước "Vận chuyển"; bấm → mục sáng; breadcrumb; hai khối 4 / 8 dòng bảng.
// (c) Quản trị 390: nhóm VẬN CHUYỂN — Xe / Giấy tờ sắp hết hạn / Loại giấy tờ xe; bấm → MỘT khối 6 thẻ (không khối người / hạng); tiêu đề thanh đầu; tab Tôi sáng.
// (d) Quản trị 1040: dưới "Vận chuyển" — Xe / Sắp hết hạn / Loại giấy tờ xe; bấm → mục con sáng, mục cha chữ trắng; breadcrumb "Vận chuyển › Loại giấy tờ xe".
// (e) thêm loại giấy tờ người "Thẻ hướng dẫn viên" → hiện ngay.  (f) sửa tên một hạng → Lưu, tải lại vẫn đúng.
// (g) ngưng "Giấy phép lái xe" → câu tiếng Việt "không ngưng được", không lộ mã fixed_type.  (h) thêm loại giấy tờ xe → hiện ngay.
// (i) đường dẫn cũ /danh-muc-giay-to → tự chuyển sang /loai-giay-to-nguoi (không 404).
// (j) Bán hàng: không mục ở thanh bên, không dòng ở trang Tôi; mở thẳng hai trang → câu "Chỉ quản trị viên…", không bảng nào, không gọi API danh mục.
// axe (critical / serious) ở (a)–(d); ảnh 390 + 1040.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/danh-muc-giay-to-smoke.mjs
import { ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep, txt, typeInto } from "./vc-lib.mjs";

const dem = boDem("DANH MUC GIAY TO SMOKE");
const { env } = await dungMoiTruong([]);
const ADMIN = ACCOUNTS.admin;
const NGUOI = "/loai-giay-to-nguoi";
const XE = "/loai-giay-to-xe";
const CU = "/danh-muc-giay-to";
const CAU_TU_CHOI = "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.";
try {
  /** Số dòng (bảng hoặc thẻ) của từng khối; khối không có trên trang → null. */
  const soDong = (p, ids, sel) => p.ev(`${JSON.stringify(ids)}.map((k) => document.querySelector(k) ? document.querySelectorAll(k + ' ${sel}').length : null)`);
  /** Chữ các tiêu đề cấp `cap` trong khối `id` (đọc thứ bậc tiêu đề: trang một khối không có h2 riêng của khối). */
  const tieuDe = (p, id, cap) => p.ev(`[...document.querySelectorAll('${id} ${cap}')].map((e) => e.textContent.trim())`);
  /** Các dòng liên kết của một thẻ ở trang Tôi. */
  const dongToi = (p, sel) => p.ev(`[...document.querySelectorAll('${sel} .row-link')].map((a) => ({ href: a.getAttribute('href'), text: a.innerText.replace(/\\s+/g, ' ').trim() }))`);
  /** Thanh bên: nhóm → mục (nhãn, đường dẫn, mục con, đang sáng). */
  const thanhBen = (p) =>
    p.ev(`[...document.querySelectorAll('#sidebar .sidebar-group')].map((g) => ({ title: g.querySelector('.sidebar-group-title').textContent.trim(), items: [...g.querySelectorAll('.sidebar-item')].map((a) => ({ label: a.querySelector('.sidebar-item-label').textContent.trim(), href: a.getAttribute('href'), sub: a.classList.contains('sidebar-sub'), parent: a.classList.contains('sidebar-parent'), open: a.classList.contains('is-open-parent'), current: a.getAttribute('aria-current') })) }))`);
  const coLienKet = (p, hrefs) => p.ev(`[...document.querySelectorAll('a')].filter((a) => ${JSON.stringify(hrefs)}.includes(a.getAttribute('href'))).map((a) => a.getAttribute('href'))`);

  await dem.step("a", "(a) Quản trị 390: trang Tôi — Danh bạ / Địa điểm / Loại giấy tờ cá nhân (không còn “Danh mục giấy tờ”); bấm → hai khối 4 / 8 thẻ, không khối xe" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", MOB);
    try {
      await p.waitFor(`!!document.querySelector('#links-top a[href="${NGUOI}"]')`, "dòng Loại giấy tờ cá nhân", 10000);
      assert.deepEqual(await dongToi(p, "#links-top"), [{ href: "/parties", text: "Danh bạ" }, { href: "/locations", text: "Địa điểm" }, { href: NGUOI, text: "Loại giấy tờ cá nhân" }]);
      assert.deepEqual(await coLienKet(p, [CU]), [], "không còn dòng Danh mục giấy tờ");
      assert.ok(await p.ev(clickVisible("#links-top", "Loại giấy tờ cá nhân")));
      await p.waitFor(`location.pathname === '${NGUOI}' && !document.querySelector('#dm-hang').hidden`, "trang Loại giấy tờ cá nhân", 10000);
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"], ".card-list > .card"), [null, 4, 8]);
      assert.deepEqual(await tieuDe(p, "#dm-nguoi", "h2"), ["Loại giấy tờ của người"]);
      assert.deepEqual(await tieuDe(p, "#dm-nguoi", "h3"), ["Thêm loại giấy tờ của người"]);
      assert.deepEqual(await tieuDe(p, "#dm-hang", "h2"), ["Hạng giấy phép lái xe"]);
      assert.equal(await p.ev(txt("#bar-title")), "Loại giấy tờ cá nhân");
      assert.equal(await p.ev(`document.querySelector('#tabbar a[href="/account"]').getAttribute('aria-current')`), "page", "tab Tôi sáng");
      await axe(p, "Loại giấy tờ cá nhân 390");
      await shotFull(p, "loai-giay-to-nguoi-390.png");
    } finally {
      p.close();
    }
  });

  await dem.step("b", "(b) Quản trị 1040: thanh bên — “Loại giấy tờ cá nhân” ngay sau “Địa điểm”, trước “Vận chuyển”; bấm → mục sáng, breadcrumb; hai khối 4 / 8 dòng" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", DESK);
    try {
      await p.waitFor(`!!document.querySelector('#sidebar a[href="${NGUOI}"]')`, "mục Loại giấy tờ cá nhân", 10000);
      const qt = (await thanhBen(p)).find((g) => g.title === "QUẢN TRỊ");
      const nhan = qt.items.map((i) => i.label);
      const at = nhan.indexOf("Địa điểm");
      assert.deepEqual(nhan.slice(at, at + 3), ["Địa điểm", "Loại giấy tờ cá nhân", "Vận chuyển"], JSON.stringify(nhan));
      assert.deepEqual([qt.items[at + 1].href, qt.items[at + 1].sub], [NGUOI, false]);
      assert.ok(await p.ev(clickVisible("#sidebar", "Loại giấy tờ cá nhân")));
      await p.waitFor(`location.pathname === '${NGUOI}' && !document.querySelector('#dm-hang').hidden`, "trang Loại giấy tờ cá nhân", 10000);
      const moi = (await thanhBen(p)).find((g) => g.title === "QUẢN TRỊ").items.find((i) => i.href === NGUOI);
      assert.equal(moi.current, "page", "mục đang mở sáng");
      assert.equal(await p.ev(txt("#bar-title")), "Loại giấy tờ cá nhân");
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"], "table.items tbody tr"), [null, 4, 8]);
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
      assert.deepEqual(await dongToi(p, "#vc-links"), [{ href: "/dieu-phoi", text: "Điều phối xe" }, { href: "/bang-gia-xe", text: "Bảng giá thuê xe" }, { href: "/bang-ke-xe", text: "Bảng kê chi phí xe" }, { href: "/xe", text: "Xe" }, { href: "/lich-xe-ban", text: "Lịch xe bận" }, { href: "/giay-to-sap-het-han", text: "Giấy tờ sắp hết hạn" }, { href: XE, text: "Loại giấy tờ xe" }, { href: "/ly-do-dieu-phoi", text: "Lý do điều phối" }]); // + Đợt 4 (tiền xe thuê) + "Lịch xe bận" (Đợt 3)
      await shotFull(p, "loai-giay-to-toi-390.png");
      assert.ok(await p.ev(clickVisible("#vc-links", "Loại giấy tờ xe")));
      await p.waitFor(`location.pathname === '${XE}' && !document.querySelector('#dm-xe').hidden`, "trang Loại giấy tờ xe", 10000);
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"], ".card-list > .card"), [6, null, null]);
      // Trang một khối: tên trang (h1) là tên khối — khối không có h2 riêng; "Thêm…" là h2 (khuôn trang Địa điểm), không nhảy bậc tiêu đề.
      assert.deepEqual(await tieuDe(p, "#dm-xe", "h2"), ["Thêm loại giấy tờ xe"]);
      assert.deepEqual(await tieuDe(p, "#dm-xe", "h3"), []);
      assert.equal(await p.ev(txt("#bar-title")), "Loại giấy tờ xe", "điện thoại: chỉ phần cuối của breadcrumb");
      assert.equal(await p.ev(`document.querySelector('#tabbar a[href="/account"]').getAttribute('aria-current')`), "page", "tab Tôi sáng");
      await axe(p, "Loại giấy tờ xe 390");
      await shotFull(p, "loai-giay-to-xe-390.png");
    } finally {
      p.close();
    }
  });

  await dem.step("d", "(d) Quản trị 1040: dưới “Vận chuyển” — Điều phối xe / Xe / Sắp hết hạn / Loại giấy tờ xe; bấm → mục con sáng, mục cha chữ trắng, breadcrumb “Vận chuyển › Loại giấy tờ xe”; 6 dòng" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", DESK);
    try {
      await p.waitFor(`!!document.querySelector('#sidebar a[href="${XE}"]')`, "mục con Loại giấy tờ xe", 10000);
      const qt = (await thanhBen(p)).find((g) => g.title === "QUẢN TRỊ");
      const at = qt.items.findIndex((i) => i.parent && i.label === "Vận chuyển");
      // ADR-0049 B1 (vòng 3): mục con "Điều phối xe" (ô trip.view) đứng đầu dưới "Vận chuyển".
      assert.deepEqual(qt.items.slice(at, at + 8).map((i) => [i.label, i.sub]), [["Vận chuyển", false], ["Điều phối xe", true], ["Bảng giá thuê xe", true], ["Bảng kê chi phí xe", true], ["Xe", true], ["Lịch xe bận", true], ["Sắp hết hạn", true], ["Loại giấy tờ xe", true]], JSON.stringify(qt.items)); // + Đợt 4 + "Lịch xe bận" (Đợt 3)
      assert.ok(await p.ev(clickVisible("#sidebar", "Loại giấy tờ xe")));
      await p.waitFor(`location.pathname === '${XE}' && !document.querySelector('#dm-xe').hidden`, "trang Loại giấy tờ xe", 10000);
      const moi = (await thanhBen(p)).find((g) => g.title === "QUẢN TRỊ").items;
      const cha = moi.find((i) => i.parent);
      assert.equal(moi.find((i) => i.href === XE).current, "page", "mục con đang mở sáng");
      assert.equal(cha.open, true, "mục cha chữ trắng khi đang ở một mục con");
      assert.equal(await p.ev(txt("#bar-title")), "Vận chuyển › Loại giấy tờ xe");
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"], "table.items tbody tr"), [6, null, null]);
      await axe(p, "Loại giấy tờ xe 1040");
      await shotFull(p, "loai-giay-to-xe-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("e", "(e) thêm loại giấy tờ người “Thẻ hướng dẫn viên” (THE_HDV) → hiện ngay (1040)", async () => {
    const p = await env.as(ADMIN, NGUOI, DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-nguoi').hidden", "khối người", 10000);
      await p.ev(typeInto("#dm-nguoi .dm-them input[type=text]", "THE_HDV"));
      await p.ev(`(() => { const o = document.querySelectorAll('#dm-nguoi .dm-them input[type=text]')[1]; o.value = 'Thẻ hướng dẫn viên'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-nguoi .dm-them", "Thêm")));
      await p.waitFor(`[...document.querySelectorAll('#dm-nguoi table.items tbody tr')].some((r) => r.textContent.includes('Thẻ hướng dẫn viên'))`, "dòng mới", 8000);
      assert.equal(await p.ev(`document.querySelectorAll('#dm-nguoi table.items tbody tr').length`), 5);
    } finally {
      p.close();
    }
  });

  await dem.step("f", "(f) sửa tên hạng B → “Hạng B (mới)” → Lưu; tải lại vẫn đúng (390)", async () => {
    const p = await env.as(ADMIN, NGUOI, MOB);
    try {
      await p.waitFor("!document.querySelector('#dm-hang').hidden", "khối hạng", 10000);
      assert.ok(await p.ev(`(() => { const c = document.querySelector('#dm-hang .card-list > .card[data-code="B"]'); c.querySelector('button').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('#dm-hang .dm-sua:not([hidden]) h3')", "khung sửa", 5000);
      await p.ev(`(() => { const o = document.querySelector('#dm-hang .dm-sua:not([hidden]) h3').parentElement.querySelector('input[type=text]'); o.value = 'Hạng B (mới)'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-hang", "Lưu")));
      await p.waitFor(`document.querySelector('#dm-hang .card-list > .card[data-code="B"]')?.textContent.includes('Hạng B (mới)')`, "tên mới", 8000);
      await p.send("Page.reload", {});
      await p.waitFor(`document.querySelector('#dm-hang .card-list > .card[data-code="B"]')?.textContent.includes('Hạng B (mới)')`, "tên mới sau tải lại", 10000);
    } finally {
      p.close();
    }
  });

  await dem.step("g", "(g) ngưng “Giấy phép lái xe” → câu tiếng Việt “không ngưng được”, không lộ mã fixed_type (1040)", async () => {
    const p = await env.as(ADMIN, NGUOI, DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-nguoi').hidden", "khối người", 10000);
      assert.ok(await p.ev(`(() => { const r = document.querySelector('#dm-nguoi tr[data-code="GPLX"]'); r.querySelector('button').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('#dm-nguoi .dm-sua:not([hidden]) h3')", "khung sửa", 5000);
      await p.ev(`(() => { const box = [...document.querySelector('#dm-nguoi .dm-sua:not([hidden]) h3').parentElement.querySelectorAll('label.check')].find((l) => l.textContent.includes('Đang dùng')).querySelector('input'); box.click(); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-nguoi", "Lưu")));
      await p.waitFor("!document.querySelector('#error').hidden", "câu báo", 8000);
      const msg = await p.ev(txt("#error"));
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
      await p.ev(typeInto("#dm-xe .dm-them input[type=text]", "GIAY_PHEP_KD"));
      await p.ev(`(() => { const o = document.querySelectorAll('#dm-xe .dm-them input[type=text]')[1]; o.value = 'Giấy phép kinh doanh vận tải'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-xe .dm-them", "Thêm")));
      await p.waitFor(`[...document.querySelectorAll('#dm-xe table.items tbody tr')].some((r) => r.textContent.includes('Giấy phép kinh doanh vận tải'))`, "dòng mới", 8000);
      assert.equal(await p.ev(`document.querySelectorAll('#dm-xe table.items tbody tr').length`), 7);
      assert.ok(await p.ev(`(() => { const r = document.querySelector('#dm-xe tr[data-code="GIAY_PHEP_KD"]'); r.querySelector('button').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('#dm-xe .dm-sua:not([hidden]) h2')", "khung sửa (h2)", 5000);
      assert.equal(await p.ev(txt("#dm-xe .dm-sua:not([hidden]) h2")), "Sửa: GIAY_PHEP_KD");
    } finally {
      p.close();
    }
  });

  await dem.step("i", "(i) đường dẫn cũ /danh-muc-giay-to → tự chuyển sang /loai-giay-to-nguoi, trang hiện đủ hai khối (không 404)", async () => {
    const p = await env.as(ADMIN, CU, MOB);
    try {
      await p.waitFor(`location.pathname === '${NGUOI}' && !document.querySelector('#dm-hang').hidden`, "chuyển sang Loại giấy tờ cá nhân", 10000);
      assert.deepEqual(await soDong(p, ["#dm-xe", "#dm-nguoi", "#dm-hang"], ".card-list > .card"), [null, 5, 8], "THE_HDV thêm ở (e)");
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
      assert.deepEqual(nhom.map((g) => g.title), ["BÁN HÀNG", "QUẢN TRỊ", "TÔI"]);
      assert.deepEqual(nhom.find((g) => g.title === "QUẢN TRỊ").items.map((i) => i.label), ["Vận chuyển", "Điều phối xe"], "Bán hàng: nhóm QUẢN TRỊ chỉ có Vận chuyển › Điều phối xe");
    } finally {
      d.close();
    }
    for (const trang of [NGUOI, XE]) {
      const q = await env.as(ACCOUNTS.salesA, trang, DESK);
      try {
        await q.waitFor("!document.querySelector('#error').hidden", `câu báo ở ${trang}`, 10000);
        assert.equal(await q.ev(txt("#error")), CAU_TU_CHOI);
        assert.equal(await q.ev("document.querySelectorAll('table.items, .card-list > .card').length"), 0);
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
