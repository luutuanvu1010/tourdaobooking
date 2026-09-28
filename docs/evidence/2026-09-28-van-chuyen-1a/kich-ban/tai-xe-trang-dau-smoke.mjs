// Kịch bản Chrome — trang đầu của tài khoản CHỈ có quyền Tài xế (ADR-0040 D3; Ruling R3, R10 của điều phối), màn 07 của bản vẽ
// docs/design/van-chuyen-1a/project/07 Trang dau tai xe.dc.html, và thanh điều hướng của tài xế.
// Phần A (Ruling R10) đưa tài xế sang trang Tài khoản; Phần B dựng màn "/tai-xe" và đổi TRANG_DAU_TAI_XE (src/shared/start-page.ts) sang "/tai-xe".
// Kiểm ở 390 và 1040:
//  1–2) mở "/" → /tai-xe (không 404), KHÔNG lời gọi /api/orders*, không lỗi console; lời chào "Chào <tên>", ngày; khối "Cuốc xe của bạn sẽ hiện ở đây"; khối
//       "Giấy tờ của tôi" đúng HAI giấy gần hạn nhất (điều phối chốt theo bản vẽ) với chip đúng màu, "Xem tất cả" → /account; số giấy tờ đủ KHÔNG có trong DOM;
//       điện thoại: thanh tab đúng hai mục Trang chủ (/tai-xe) + Tôi; máy tính: mục "Trang chủ" → /tai-xe trong nhóm TÔI, không ô tìm đơn, không nút Tạo đơn,
//       không mục Vận chuyển; axe.
//  3) tài xế chưa có giấy tờ: khối giấy tờ nói rõ "chưa có", vẫn hai tab.
//  4) tài khoản KHÔNG phải tài xế mở /tai-xe → quay về "/" (không kẹt ở trang của tài xế).
// Dùng vc-lib.mjs (trên a2-cdp.mjs). Tài khoản tài xế gieo bằng scripts/staff-lib.mjs (SĐT giả) + vai "Tài xế công ty"; giấy tờ nhập bằng API của Quản trị (số GIẢ).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs
// Kịch bản tự theo hằng TRANG_DAU_TAI_XE (không viết cứng đường dẫn).
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, DESK, DRIVER, DRIVER2, MOB, apiCalls, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, sleep, vnDate } from "./vc-lib.mjs";

const { TRANG_DAU_TAI_XE } = await import(pathToFileURL(join(process.cwd(), "src", "shared", "start-page.ts")).href);
const SO_DU = ["001090000412", "790100000412"]; // số GIẢ — không bao giờ được nằm trong DOM của tài xế (chỉ số che)
const dem = boDem("TAI XE TRANG DAU SMOKE");

const { env, ids, themGiayNguoi } = await dungMoiTruong([DRIVER, DRIVER2]);
try {
  const hung = ids[DRIVER.phone].partyId;
  await themGiayNguoi(hung, { typeCode: "CCCD", number: SO_DU[0], issuedDate: vnDate(-1000), issuedPlace: "Cục Cảnh sát QLHC về TTXH", expiryDate: vnDate(3818) });
  await themGiayNguoi(hung, { typeCode: "GPLX", number: SO_DU[1], classCode: "D2", issuedDate: vnDate(-1900), issuedPlace: "Sở GTVT Khánh Hoà", expiryDate: vnDate(38) });
  await themGiayNguoi(hung, { typeCode: "HEALTH_CHECK", issuedDate: vnDate(-363), expiryDate: vnDate(2) });
  await themGiayNguoi(hung, { typeCode: "TRANSPORT_TRAINING", issuedDate: vnDate(-200), expiryDate: vnDate(154) });

  const doc = (p) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
      const vis = (el) => !!el && el.getClientRects().length > 0;
      return {
        path: location.pathname,
        hello: t(document.querySelector('#tx-hello')), date: t(document.querySelector('#tx-date')),
        cuoc: t(document.querySelector('.vc-cuoc')),
        docsTitle: t(document.querySelector('#tx-docs .vc-card-title')),
        all: document.querySelector('#tx-docs a.vc-link-all')?.getAttribute('href') ?? null,
        rows: [...document.querySelectorAll('#tx-docs .vc-txdoc')].map((r) => ({ title: t(r.querySelector('.vc-doc-title')), exp: t(r.querySelector('.vc-txdoc-exp')), chip: t(r.querySelector('.vc-chip')), tone: [...(r.querySelector('.vc-chip')?.classList ?? [])].find((c) => c.startsWith('vc-chip-')) ?? null })),
        empty: t(document.querySelector('#tx-docs .vc-empty-line')),
        tabs: [...document.querySelectorAll('#tabbar a')].filter(vis).map((a) => ({ href: a.getAttribute('href'), text: t(a), current: a.getAttribute('aria-current') })),
        side: [...document.querySelectorAll('#sidebar .sidebar-item')].filter(vis).map((a) => ({ href: a.getAttribute('href'), text: t(a), current: a.getAttribute('aria-current') })),
        search: vis(document.querySelector('.topbar-search')), create: vis(document.querySelector('.topbar-new')),
        html: document.documentElement.outerHTML,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);

  for (const [id, ten, viewport] of [["1", "390", MOB], ["2", "1040", DESK]]) {
    await dem.step(id, `${ten}: tài xế mở "/" → ${TRANG_DAU_TAI_XE}; chào + ngày; khối cuốc xe giữ chỗ; hai giấy gần hạn nhất đúng chip; số đủ không có trong DOM; điều hướng đúng hai mục` + axeNote(), async () => {
      const p = await env.as(DRIVER, "/", viewport);
      try {
        await p.waitFor(`location.pathname === ${JSON.stringify(TRANG_DAU_TAI_XE)}`, `tài xế mở "/" được đưa sang ${TRANG_DAU_TAI_XE}`, 10000);
        await p.waitFor("document.querySelectorAll('#tx-docs .vc-txdoc').length === 2", "khối Giấy tờ của tôi dựng xong", 10000);
        await sleep(1200); // chờ các lời gọi của khung (me, chuông, góp ý, bảng tin) về hết
        const s = await doc(p);
        const calls = apiCalls(p).map((c) => c.path);
        assert.deepEqual(calls.filter((u) => u.startsWith("/api/orders")), [], `không lời gọi màn đơn nào: ${JSON.stringify(calls)}`);
        assert.deepEqual(calls.filter((u) => u.startsWith("/api/van-chuyen")), [], "tài xế không gọi API Vận chuyển");
        assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
        assert.equal(s.hello, "Chào Hùng");
        assert.match(s.date ?? "", /^(Thứ .+|Chủ nhật), \d{2}\/\d{2}\/\d{4}$/i, `ngày: ${s.date}`);
        assert.equal(s.cuoc, "Cuốc xe của bạn sẽ hiện ở đây");
        assert.equal(s.docsTitle, "Giấy tờ của tôi");
        assert.equal(s.all, "/account", "“Xem tất cả” mở trang Tôi (danh sách đủ)");
        const d = (n) => vnDate(n).split("-").reverse().join("/");
        assert.deepEqual(s.rows, [
          { title: "Khám sức khoẻ", exp: `Hết hạn ${d(2)}`, chip: "Còn 2 ngày", tone: "vc-chip-warn" },
          { title: "Giấy phép lái xe hạng D2", exp: `Hết hạn ${d(38)}`, chip: "Còn 38 ngày", tone: "vc-chip-ok" },
        ]);
        for (const so of SO_DU) assert.ok(!s.html.includes(so), `số đủ ${so} không được có trong DOM`);
        if (viewport === MOB) {
          assert.deepEqual(s.tabs, [
            { href: "/tai-xe", text: "Trang chủ", current: "page" },
            { href: "/account", text: "Tôi", current: null },
          ], "điện thoại: đúng hai tab của tài xế");
        } else {
          assert.deepEqual(s.side.map((x) => x.href), ["/tai-xe", "/account", `/feedback?new=1&from=${encodeURIComponent(TRANG_DAU_TAI_XE)}`, "/help"], `máy tính: menu tài xế ${JSON.stringify(s.side)}`);
          assert.equal(s.side[0].text, "Trang chủ");
          assert.equal(s.side[0].current, "page");
          assert.ok(!s.side.some((x) => /Vận chuyển|Đơn hàng|Danh bạ/.test(x.text ?? "")), "tài xế không có mục văn phòng / Vận chuyển");
        }
        assert.equal(s.search, false, "không ô tìm đơn");
        assert.equal(s.create, false, "không nút Tạo đơn");
        assert.ok(s.overflow <= 1, `không tràn ngang (${s.overflow}px)`);
        await axe(p, `trang đầu tài xế ${ten}`);
        await shotFull(p, `tai-xe-trang-dau-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }

  await dem.step("3", "tài xế chưa có giấy tờ: khối nói rõ “chưa có”, vẫn hai tab (điện thoại)", async () => {
    const p = await env.as(DRIVER2, "/", MOB);
    try {
      await p.waitFor(`location.pathname === ${JSON.stringify(TRANG_DAU_TAI_XE)}`, "sang trang đầu tài xế", 10000);
      await p.waitFor("!!document.querySelector('#tx-docs .vc-empty-line')", "dòng chưa có giấy tờ", 10000);
      const s = await doc(p);
      assert.equal(s.hello, "Chào Tuấn");
      assert.deepEqual(s.rows, []);
      assert.equal(s.empty, "Chưa có giấy tờ nào. Báo văn phòng để cập nhật.");
      assert.equal(s.tabs.length, 2);
      await shotFull(p, "tai-xe-trang-dau-chua-co-giay-390.png");
    } finally {
      p.close();
    }
  });

  await dem.step("4", "tài khoản KHÔNG phải tài xế (Bán hàng) mở /tai-xe → quay về Trang chủ “/”", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/tai-xe", DESK);
    try {
      await p.waitFor("location.pathname === '/'", "Bán hàng rời trang của tài xế", 10000);
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
