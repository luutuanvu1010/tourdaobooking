// BẢN CHÉP (đợt 0 khung chung, 29/10/2026) của docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs — hồ sơ có ngày giữ nguyên.
// Sửa theo vỏ mới (đặc tả đợt 0 §5.4, Task 7): nhóm VẬN CHUYỂN của Quản trị nay có khối gập «Điều phối» (Điều phối xe + Đề nghị chuyển khách) rồi 3 mục phẳng;
// nút gập đầu tiên của thanh bên không còn là THIẾT LẬP (đọc bằng aria-controls). Bước 2, 8b, 9 đỏ CẢ ở gốc nhánh (1d3c67fd) — không do đợt 0, giữ nguyên.
// Kịch bản Chrome — chỗ vào phân hệ Vận chuyển (bản vẽ 00), màn 01 Danh sách xe, màn 02 Thêm / sửa xe (ADR-0040 D1; docs/design/van-chuyen-1a/).
// 1) menu máy tính theo việc (15/10): nhóm VẬN CHUYỂN phẳng (không còn mục cha "Vận chuyển" + mục con): Điều phối xe, Xe đang chạy, Đề nghị chuyển khách, "Xe & giấy tờ" (gộp Xe / Lịch xe bận / Sắp hết hạn), "Giá & chi phí" (gộp hai bảng tiền xe thuê); nhóm Thiết lập ĐÓNG ở trang xe; breadcrumb "Xe & giấy tờ".
//    Mục gộp sáng ở MỌI trang trong `gom`. "Loại giấy tờ xe" nay nằm trong nhóm Thiết lập (kiểm kỹ ở danh-muc-giay-to-smoke.mjs).
//    (Từ 2026-09-28: "Loại giấy tờ cá nhân" và "Loại giấy tờ xe" tách theo chủ dữ liệu — không có trong bản vẽ 00.)
// 2) trang Tôi điện thoại của Quản trị: nhãn "VẬN CHUYỂN" + hai dòng Xe / Giấy tờ sắp hết hạn (+ "Loại giấy tờ xe", 2026-09-28), ngay dưới Danh bạ / Địa điểm
//    (+ "Loại giấy tờ cá nhân", 2026-09-28).
// 3) Bán hàng: không mục, không dòng, không lời gọi /api/van-chuyen/*; mở thẳng /xe → câu từ chối của máy chủ, không nút Thêm xe.
// 4) 01 trạng thái trống (390 + 1040).  5) 02 thêm xe qua form (bộ đếm −/+, Lưu xe → chi tiết).  6) biển số trùng → "Biển số này đang dùng cho xe khác." dưới ô.
// 7) 01 có xe: thẻ / bảng, trạng thái, cảnh báo giấy tờ có biểu tượng + chữ, bộ lọc có số đếm.  8) 02 sửa: "Ngừng dùng xe" → hộp xác nhận "không bị xoá" → Ngừng.
// 9) "Dùng lại xe" khi biển đã thuộc xe khác → câu lỗi dưới ô biển số.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs
import { ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, shotView, shown, sleep, txt, typeInto, vnDate } from "../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs";

const dem = boDem("XE SMOKE");
const { env, call, themXe, themGiayXe } = await dungMoiTruong([]);
const ADMIN = ACCOUNTS.admin;
try {
  const menu = (p) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
      const groups = [...document.querySelectorAll('#sidebar .sidebar-group')].map((g) => ({ title: t(g.querySelector('.sidebar-group-title')), items: [...g.querySelectorAll('.sidebar-item')].map((a) => ({ tag: a.tagName, href: a.getAttribute('href'), label: t(a.querySelector('.sidebar-item-label')), badge: t(a.querySelector('.sidebar-item-badge')), sub: a.classList.contains('sidebar-sub'), current: a.getAttribute('aria-current') })) }));
      const tg = document.querySelector('#sidebar button[aria-controls="nhom-thiet-lap"]'); /* đợt 0 */ const thietLap = tg ? { dong: tg.getAttribute('aria-expanded') === 'false', an: document.querySelector('#nhom-thiet-lap').hidden } : null;
      return { groups, thietLap, crumb: t(document.querySelector('#bar-title')) };
    })()`);

await dem.step("1", "menu máy tính theo việc (Quản trị): nhóm VẬN CHUYỂN: khối gập Điều phối (2 mục) + 3 mục phẳng (đợt 0); \"Xe & giấy tờ\" sáng ở /xe, /lich-xe-ban, /giay-to-sap-het-han; \"Giá & chi phí\" sáng ở /bang-ke-xe; nhóm Thiết lập đóng; breadcrumb đúng", async () => {
    const p = await env.as(ADMIN, "/xe", DESK);
    try {
      await p.waitFor("!!document.querySelector('#sidebar .sidebar-group-title')", "nhóm VẬN CHUYỂN", 10000);
      await sleep(800);
      const m = await menu(p);
      const vc = m.groups.find((g) => g.title === "VẬN CHUYỂN");
      assert.ok(vc, JSON.stringify(m.groups));
      assert.deepEqual(vc.items.map((i) => i.label), ["Điều phối xe", "Đề nghị chuyển khách", "Xe đang chạy", "Xe & giấy tờ", "Giá & chi phí"]); // đợt 0 Task 7: hai mục đầu trong khối gập «Điều phối»
      assert.deepEqual(vc.items.map((i) => i.href), ["/dieu-phoi", "/de-nghi", "/xe-dang-chay", "/xe", "/bang-gia-xe"]);
      assert.equal(await p.ev("document.querySelector('#sidebar button[aria-controls=\"nhom-gap-dieu-phoi\"]')?.getAttribute('aria-expanded')"), "false", "đợt 0: khối Điều phối đóng ở /xe");
      assert.ok(vc.items.every((i) => i.tag === "A" && !i.sub), "mọi mục là liên kết phẳng, không còn mục cha / mục con");
      assert.deepEqual(vc.items.map((i) => i.current), [null, null, null, "page", null], "chỉ \"Xe & giấy tờ\" sáng ở /xe");
      assert.equal(await p.ev("!!document.querySelector('#sidebar .sidebar-parent')"), false, "không còn mục cha Vận chuyển");
      assert.deepEqual(m.thietLap, { dong: true, an: true }, "nhóm Thiết lập đóng ở trang xe");
      assert.equal(m.crumb, "Vận chuyển › Xe", "breadcrumb do data-title của trang (không đổi theo menu)");
      await shotFull(p, "00-cho-vao-1040.png");
    } finally {
      p.close();
    }
    // Mục gộp sáng ở các trang anh em và "Giá & chi phí" ở trang bảng kê (mỗi lần mở một trang; cùng phiên Quản trị).
    for (const [duong, sang] of [["/lich-xe-ban", "Xe & giấy tờ"], ["/giay-to-sap-het-han", "Xe & giấy tờ"], ["/bang-ke-xe", "Giá & chi phí"], ["/bang-gia-xe", "Giá & chi phí"]]) {
      const q = await env.as(ADMIN, duong, DESK);
      try {
        await q.waitFor("!!document.querySelector('#sidebar .sidebar-group-title')", `thanh bên ở ${duong}`, 10000);
        await sleep(500);
        const mm = await menu(q);
        const sangLa = mm.groups.flatMap((g) => g.items).filter((i) => i.current === "page").map((i) => i.label);
        assert.deepEqual(sangLa, [sang], `${duong}: đúng một mục sáng`);
      } finally {
        q.close();
      }
    }
  });

  await dem.step("2", "trang Tôi điện thoại (Quản trị): nhãn “VẬN CHUYỂN” + Xe / Giấy tờ sắp hết hạn / Loại giấy tờ xe ngay dưới Danh bạ / Địa điểm / Loại giấy tờ cá nhân" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#vc-links')", "nhóm VẬN CHUYỂN", 10000);
      const s = await p.ev(`(() => {
        const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
        const rows = (sel) => [...document.querySelectorAll(sel + ' .row-link')].map((a) => ({ href: a.getAttribute('href'), text: t(a) }));
        const order = [...document.querySelector('.account-layout').children].filter((e) => e.getClientRects().length > 0).map((e) => e.id || e.className);
        return { top: rows('#links-top'), eyebrow: t(document.querySelector('.vc-eyebrow')), vc: rows('#vc-links'), rest: rows('#links'), order };
      })()`);
      // "Loại giấy tờ cá nhân" / "Loại giấy tờ xe": tách dòng "Danh mục giấy tờ" cũ (Task A19) theo chủ dữ liệu, 2026-09-28 — không có trong bản vẽ 00.
      assert.deepEqual(s.top.map((r) => r.text), ["Danh bạ", "Địa điểm", "Loại giấy tờ cá nhân"]);
      assert.equal(s.eyebrow, "VẬN CHUYỂN");
      // ADR-0049 B8 (bản vẽ Bảng điều phối 08 khung 8d, 2026-09-29): Quản trị có thêm dòng "Lý do điều phối" cuối nhóm (không có "Chính sách điều phối" — chỉ Toàn quyền).
      assert.deepEqual(s.vc, [{ href: "/dieu-phoi", text: "Điều phối xe" }, { href: "/xe-dang-chay", text: "Xe đang chạy" }, { href: "/de-nghi", text: "Đề nghị chuyển khách" }, { href: "/bang-gia-xe", text: "Bảng giá thuê xe" }, { href: "/bang-ke-xe", text: "Bảng kê chi phí xe" }, { href: "/xe", text: "Xe" }, { href: "/lich-xe-ban", text: "Lịch xe bận" }, { href: "/giay-to-sap-het-han", text: "Giấy tờ sắp hết hạn" }, { href: "/loai-giay-to-xe", text: "Loại giấy tờ xe" }, { href: "/ly-do-dieu-phoi", text: "Lý do điều phối" }]);
      assert.ok(s.rest.some((r) => r.text?.startsWith("Góp ý")) && s.rest.some((r) => r.text === "Đăng xuất"), JSON.stringify(s.rest));
      const iTop = s.order.indexOf("links-top");
      assert.deepEqual(s.order.slice(iTop, iTop + 4), ["links-top", "vc-eyebrow", "vc-links", "links"], JSON.stringify(s.order));
      await axe(p, "trang Tôi Quản trị 390");
      await shotFull(p, "00-cho-vao-toi-390.png");
    } finally {
      p.close();
    }
  });

  // ADR-0049 B1 (vòng 3, Q-B-4): Bán hàng có ô trip.view nên nay THẤY mục cha "Vận chuyển" với đúng một mục con "Điều phối xe" và dòng "Điều phối xe" ở trang Tôi —
  // vẫn KHÔNG có Xe / Sắp hết hạn (ô vehicle.manage), không gọi /api/van-chuyen/* ở trang Tôi.
  await dem.step("3", "Bán hàng: nhóm Vận chuyển chỉ có Điều phối xe + Xe đang chạy (không Xe & giấy tờ / Giá & chi phí), trang Tôi chỉ dòng Điều phối xe, không gọi /api/van-chuyen/*; mở thẳng /xe → câu từ chối, không nút Thêm xe", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", DESK);
    try {
      await p.waitFor("!!document.querySelector('#links .row-link')", "trang Tôi", 10000);
      await sleep(1000);
      const s = await p.ev(`({ parent: !!document.querySelector('#sidebar .sidebar-parent'), sub: [...document.querySelectorAll('#sidebar .sidebar-group')].filter((g) => g.querySelector('.sidebar-group-title')?.textContent.trim() === 'VẬN CHUYỂN').flatMap((g) => [...g.querySelectorAll('.sidebar-item')].map((a) => a.innerText.trim())), vc: [...document.querySelectorAll('#vc-links .row-link')].map((a) => a.innerText.trim()), eyebrow: !!document.querySelector('.vc-eyebrow'), top: !!document.querySelector('#links-top') })`);
      // Menu theo việc (15/10): không còn mục cha (`parent: false`); `sub` nay là các mục của nhóm VẬN CHUYỂN ở thanh bên (phẳng).
      assert.deepEqual(s, { parent: false, sub: ["Điều phối xe", "Xe đang chạy"], vc: ["Điều phối xe", "Xe đang chạy"], eyebrow: true, top: true });
      assert.deepEqual(apiCalls(p).filter((c) => c.path.startsWith("/api/van-chuyen")), []);
    } finally {
      p.close();
    }
    const q = await env.as(ACCOUNTS.salesA, "/xe", MOB);
    try {
      await q.waitFor("!document.querySelector('#error').hidden", "câu từ chối", 10000);
      assert.equal(await q.ev(txt("#error")), "Tài khoản này không quản lý được xe.");
      assert.equal(await q.ev(`[...document.querySelectorAll('a, button')].some((b) => b.getClientRects().length > 0 && b.innerText.includes('Thêm xe'))`), false);
    } finally {
      q.close();
    }
  });

  for (const [id, ten, vp] of [["4a", "390", MOB], ["4b", "1040", DESK]]) {
    await dem.step(id, `01 trạng thái trống (${ten}): “Chưa có xe nào” + “Thêm xe để theo dõi giấy tờ và hạn.”, bộ lọc 0` + axeNote(), async () => {
      const p = await env.as(ADMIN, "/xe", vp);
      try {
        await p.waitFor("!document.querySelector('#xe-empty').hidden", "trạng thái trống", 10000);
        assert.equal(await p.ev(txt("#xe-empty .vc-empty-title")), "Chưa có xe nào");
        assert.equal(await p.ev(txt("#xe-empty .vc-empty-text")), "Thêm xe để theo dõi giấy tờ và hạn.");
        assert.deepEqual(await p.ev(`[...document.querySelectorAll('#vc-filters button')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`), ["Tất cả 0", "Đang dùng 0", "Bảo dưỡng 0", "Ngừng 0"]);
        await axe(p, `01 trống ${ten}`);
        await shotFull(p, `01-danh-sach-xe-trong-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }

  let xeMoiId = null;
  await dem.step("5", "02 thêm xe (390): nút “Thêm xe” dính đáy → form; bộ đếm −/+ (không kể tài xế, gợi ý “Xe 16 chỗ nhập 15.”); “Lưu xe” → chi tiết xe" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/xe", MOB);
    try {
      await p.waitFor("!document.querySelector('#xe-empty').hidden", "danh sách", 10000);
      assert.ok(await p.ev(clickVisible(".vc-bottom-bar", "Thêm xe")), "nút Thêm xe ở đáy");
      await p.waitFor("location.pathname === '/xe-sua' && !!document.querySelector('#xe-plate')", "form thêm xe", 10000);
      await sleep(500);
      assert.equal(await p.ev(txt("#bar-title")), "Thêm xe");
      assert.equal(await p.ev(txt("#xe-seats")), "15", "mặc định 15");
      await p.ev("document.querySelector('#xe-seats-dec').click()");
      assert.equal(await p.ev(txt("#xe-seats")), "14");
      await p.ev("document.querySelector('#xe-seats-inc').click()");
      assert.equal(await p.ev(txt("#xe-seats")), "15");
      assert.equal(await p.ev(txt(".vc-hint")), "Xe 16 chỗ nhập 15.");
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('.vc-seg [role=radio]')].map((b) => [b.innerText.trim(), b.getAttribute('aria-checked')])`), [["Đang dùng", "true"], ["Bảo dưỡng", "false"]]);
      assert.equal(await p.ev(`[...document.querySelectorAll('button')].some((b) => b.getClientRects().length > 0 && b.innerText.includes('Ngừng dùng xe'))`), false, "thêm mới không có Ngừng dùng");
      await p.ev(typeInto("#xe-plate", "79A-777.01"));
      await p.ev(typeInto("#xe-chassis", "RL4GA3FV0M1027701"));
      await p.ev(typeInto("#xe-name", "Toyota Fortuner 2022"));
      await axe(p, "02 thêm xe 390");
      await shotFull(p, "02-them-xe-390.png");
      assert.ok(await p.ev(clickVisible(".vc-bottom-bar", "Lưu xe")), "nút Lưu xe ở đáy");
      await p.waitFor("location.pathname === '/xe-chi-tiet'", "sang chi tiết xe", 10000);
      xeMoiId = new URL(await p.ev("location.href")).searchParams.get("id");
      const r = await call(ADMIN, "GET", `/api/van-chuyen/xe/${xeMoiId}`);
      assert.equal(r.status, 200, r.text);
      assert.deepEqual([r.json.vehicle.plateNumber, r.json.vehicle.name, r.json.vehicle.modelYear, r.json.vehicle.passengerCapacity, r.json.vehicle.status], ["79A-777.01", "Toyota Fortuner 2022", null, 15, "active"]);
    } finally {
      p.close();
    }
  });

  // ---- dữ liệu cho các bước sau (API Quản trị; số GIẢ) ----
  const v1 = await themXe({ plateNumber: "79B-123.45", chassisNumber: "KHUNGV1000001", name: "Ford Transit 2019", passengerCapacity: 15 });
  const v2 = await themXe({ plateNumber: "79B-246.80", chassisNumber: "KHUNGV2000002", name: "Hyundai Solati 2020", passengerCapacity: 15, status: "maintenance" });
  const v3 = await themXe({ plateNumber: "79A-678.90", chassisNumber: "KHUNGV3000003", name: "Toyota Innova 2021", passengerCapacity: 6 });
  await themGiayXe(v1.id, { typeCode: "CONTRACT_BADGE", number: "PH-0091", issuedDate: vnDate(-373), expiryDate: vnDate(-8) });
  await themGiayXe(v1.id, { typeCode: "TPL_INSURANCE", number: "BH-7788", issuedDate: vnDate(-361), expiryDate: vnDate(4) });
  await themGiayXe(v1.id, { typeCode: "INSPECTION", number: "KD-0456", issuedDate: vnDate(-166), expiryDate: vnDate(17) });
  await themGiayXe(v2.id, { typeCode: "INSPECTION", number: "KD-0788", issuedDate: vnDate(-160), expiryDate: vnDate(21) });

  for (const [id, ten, vp] of [["6a", "1040", DESK], ["6b", "390", MOB]]) {
    await dem.step(id, `02 biển số trùng (${ten}): gõ “79b 246 80” (cùng biển 79B-246.80 sau chuẩn hoá) → Lưu → câu dưới ô, viền đỏ; gõ lại thì câu biến mất`, async () => {
      const p = await env.as(ADMIN, "/xe-sua", vp);
      try {
        await p.waitFor("!!document.querySelector('#xe-plate')", "form", 10000);
        await p.ev(typeInto("#xe-plate", "79b 246 80"));
        await p.ev(typeInto("#xe-chassis", "KHUNGDUP00099"));
        await p.ev(typeInto("#xe-name", "Xe thử trùng biển"));
        assert.ok(await p.ev(clickVisible(ten === "390" ? ".vc-bottom-bar" : ".vc-form-actions", "Lưu xe")), "nút Lưu xe");
        await p.waitFor("!document.querySelector('#xe-plate-error').hidden", "câu lỗi biển số", 10000);
        assert.equal(await p.ev(txt("#xe-plate-error")), "Biển số này đang dùng cho xe khác.");
        assert.equal(await p.ev("document.querySelector('#xe-plate').getAttribute('aria-invalid')"), "true");
        assert.equal(await p.ev("location.pathname"), "/xe-sua", "không rời form");
        await shotFull(p, `02-bien-so-trung-${ten}.png`);
        await p.ev(typeInto("#xe-plate", "79b 246 81"));
        assert.equal(await p.ev("document.querySelector('#xe-plate-error').hidden"), true, "gõ lại thì câu lỗi biến mất");
      } finally {
        p.close();
      }
    });
  }

  for (const [id, ten, vp] of [["7a", "390", MOB], ["7b", "1040", DESK]]) {
    await dem.step(id, `01 có xe (${ten}): biển số, tên · số người, trạng thái, cảnh báo giấy tờ (biểu tượng + chữ), bộ lọc có số, lọc Bảo dưỡng` + axeNote(), async () => {
      const p = await env.as(ADMIN, "/xe", vp);
      try {
        const sel = ten === "390" ? "#xe-cards .vc-xe-card" : "#xe-table .vc-xe-row";
        await p.waitFor(`document.querySelectorAll('${sel}').length === 4`, "bốn xe", 10000);
        // Mỗi khổ chỉ MỘT cách trình bày: điện thoại thẻ, máy tính bảng (lần chạy đầu cả hai cùng hiện ở 1040 — CSS .vc-list thắng .vc-narrow).
        assert.deepEqual([await p.ev(shown("#xe-cards")), await p.ev(shown("#xe-table"))], ten === "390" ? [true, false] : [false, true], "đúng một cách trình bày theo khổ");
        const rows = await p.ev(`[...document.querySelectorAll('${sel}')].map((r) => ({ href: r.getAttribute('href'), plate: r.querySelector('.vc-xe-plate')?.innerText.trim(), status: r.querySelector('.vc-chip')?.innerText.trim(), alert: r.querySelector('.vc-xe-alert')?.innerText.replace(/\\s+/g, ' ').trim() ?? null, alertIcon: !!r.querySelector('.vc-xe-alert svg'), text: r.innerText.replace(/\\s+/g, ' ').trim() }))`);
        const r1 = rows.find((r) => r.plate === "79B-123.45");
        assert.ok(r1, JSON.stringify(rows));
        assert.equal(r1.href, `/xe-chi-tiet?id=${v1.id}`);
        assert.equal(r1.status, "Đang dùng");
        assert.equal(r1.alert, "Phù hiệu xe hợp đồng đã hết hạn 8 ngày · 2 giấy sắp hết hạn");
        assert.equal(r1.alertIcon, true, "cảnh báo có biểu tượng, không chỉ màu");
        assert.ok(r1.text.includes("Ford Transit 2019") && r1.text.includes("15 người"), r1.text);
        const r2 = rows.find((r) => r.plate === "79B-246.80");
        assert.equal(r2.status, "Bảo dưỡng");
        assert.equal(r2.alert, "Kiểm định còn 21 ngày");
        const r3 = rows.find((r) => r.plate === "79A-678.90");
        assert.ok(r3.text.includes("6 người"), r3.text);
        assert.deepEqual(await p.ev(`[...document.querySelectorAll('#vc-filters button')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`), ["Tất cả 4", "Đang dùng 3", "Bảo dưỡng 1", "Ngừng 0"]);
        await axe(p, `01 danh sách ${ten}`);
        await shotFull(p, `01-danh-sach-xe-${ten}.png`);
        assert.ok(await p.ev(clickVisible("#vc-filters", "Bảo dưỡng 1")));
        await p.waitFor(`document.querySelectorAll('${sel}').length === 1`, "lọc Bảo dưỡng còn một xe", 5000);
        assert.equal(await p.ev(`document.querySelector('#vc-filters button[aria-pressed=true]').innerText.replace(/\\s+/g, ' ').trim()`), "Bảo dưỡng 1");
        assert.ok(await p.ev(clickVisible("#vc-filters", "Ngừng 0")));
        await p.waitFor(`document.querySelectorAll('${sel}').length === 0 && !document.querySelector('#xe-filter-empty').hidden`, "lọc Ngừng: không có xe", 5000);
        assert.equal(await p.ev(txt("#xe-filter-empty")), "Không có xe nào ở trạng thái này.");
      } finally {
        p.close();
      }
    });
  }

  for (const [id, ten, vp] of [["8a", "1040", DESK], ["8b", "390", MOB]]) {
    await dem.step(id, `02 sửa (${ten}): tiêu đề “Sửa xe <biển>”, nút “Ngừng dùng xe” viền đỏ → hộp xác nhận “không bị xoá” → Giữ nguyên / Ngừng dùng`, async () => {
      const target = ten === "1040" ? v3 : v2;
      const p = await env.as(ADMIN, `/xe-sua?id=${target.id}`, vp);
      try {
        await p.waitFor(`document.querySelector('#xe-plate')?.value === ${JSON.stringify(target.plateNumber)}`, "form sửa nạp xong", 10000);
        await sleep(300);
        assert.equal(await p.ev(txt(ten === "1040" ? "main h1" : "#bar-title")), `Sửa xe ${target.plateNumber}`);
        await axe(p, `02 sửa xe ${ten}`);
        await shotFull(p, `02-sua-xe-${ten}.png`);
        assert.ok(await p.ev(clickVisible(ten === "1040" ? ".vc-form-actions" : ".vc-stop-block", "Ngừng dùng xe")), "nút Ngừng dùng xe");
        await p.waitFor("document.querySelector('.sheet-root.open')", "hộp xác nhận", 5000);
        assert.equal(await p.ev(txt(".sheet-title")), `Ngừng dùng xe ${target.plateNumber}?`);
        assert.ok((await p.ev(txt(".sheet-body"))).includes("Xe không bị xoá."), await p.ev(txt(".sheet-body")));
        await shotView(p, `02-ngung-dung-xac-nhan-${ten}.png`);
        if (ten === "390") {
          assert.ok(await p.ev(clickVisible(".sheet-root", "Giữ nguyên")));
          await p.waitFor("!document.querySelector('.sheet-root')", "đóng hộp", 5000);
          const r = await call(ADMIN, "GET", `/api/van-chuyen/xe/${target.id}`);
          assert.equal(r.json.vehicle.status, "maintenance", "Giữ nguyên thì không đổi gì");
          return;
        }
        assert.ok(await p.ev(clickVisible(".sheet-root", "Ngừng dùng")));
        await p.waitFor("!document.querySelector('.sheet-root') && !!document.querySelector('.vc-stopped')", "trạng thái Ngừng + Dùng lại xe", 8000);
        assert.equal(await p.ev(txt(".vc-stopped .vc-chip")), "Ngừng");
        // ADR-0075 (một phiên mỗi tài khoản): đọc bằng phiên của trang — call() của Quản trị đã bị phiên trình duyệt đá (đỏ sẵn trước Đợt 4, sửa 2/10).
        const r = await p.ev(`fetch(${JSON.stringify(`/api/van-chuyen/xe/${target.id}`)}).then((x) => x.json())`);
        assert.equal(r.vehicle.status, "retired");
        await shotFull(p, `02-da-ngung-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }

  await dem.step("9", "02 “Dùng lại xe” khi biển đã thuộc xe khác chưa ngừng → Lưu → “Biển số này đang dùng cho xe khác.” dưới ô (390)", async () => {
    await themXe({ plateNumber: "79A-678.90", chassisNumber: "KHUNGV5000005", name: "Xe mới cùng biển", passengerCapacity: 6 });
    const p = await env.as(ADMIN, `/xe-sua?id=${v3.id}`, MOB);
    try {
      await p.waitFor("!!document.querySelector('.vc-stopped')", "xe đang Ngừng", 10000);
      assert.ok(await p.ev(clickVisible(".vc-stopped", "Dùng lại xe")));
      await p.waitFor("!!document.querySelector('.vc-seg')", "chọn lại trạng thái", 5000);
      assert.equal(await p.ev(`document.querySelector('.vc-seg [aria-checked=true]').innerText.trim()`), "Đang dùng");
      assert.ok(await p.ev(clickVisible(".vc-bottom-bar", "Lưu")));
      await p.waitFor("!document.querySelector('#xe-plate-error').hidden", "câu lỗi biển số", 10000);
      assert.equal(await p.ev(txt("#xe-plate-error")), "Biển số này đang dùng cho xe khác.");
      const r = await call(ADMIN, "GET", `/api/van-chuyen/xe/${v3.id}`);
      assert.equal(r.json.vehicle.status, "retired", "máy chủ không dùng lại xe");
      await shotFull(p, "02-dung-lai-trung-bien-390.png");
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
