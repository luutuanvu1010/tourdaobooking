// Kịch bản Chrome — Giấy tờ sắp hết hạn có nhãn nhà xe (Task B4) và trang của tài khoản Tài xế đối tác (Task B5) — ADR-0048 D1, D2; KHUÔN SẴN (dòng phụ
// `.vc-due-doc` của màn 06; trang đầu tài xế `/tai-xe` màn 07 và khối "Giấy tờ của tôi" màn 05 của lượt 1a — không vẽ mới, giả định G1 của kế hoạch).
//  1) 390 Tài xế đối tác (chỉ quyền DRIVER_PARTNER) mở "/" → /cuoc (A4 T6: có ô Cuốc), rồi /tai-xe; KHÔNG lời gọi /api/orders* (không dashboard đơn), Vận chuyển
//     chỉ route tài xế; bốn tab Trang chủ / Cuốc của tôi / Báo bận của tôi / Tôi (A4 T9, G-A4-16); khối giấy tờ có giấy của mình; số đủ không có trong DOM; không
//     lỗi console; axe.
//  2) 1040 Tài xế đối tác /account: khối "Giấy tờ của tôi" (số che, không nút); menu không có mục văn phòng / Vận chuyển / Đơn hàng.
//  3) 1040 Quản trị /giay-to-sap-het-han: dòng xe của nhà xe X và dòng tài xế đối tác thuộc X có nhãn phụ "Nhà xe: X"; dòng xe công ty KHÔNG có; không số.
//  4) 390 Quản trị: như trên ở danh sách điện thoại; không tràn ngang; axe.
// Kho cookie dùng chung (web/CLAUDE.md): mỗi trang đóng trước khi mở tài khoản khác; trang Tài xế đối tác chạy trước (env.as gắn cookie thẳng, KHÔNG qua /login nên không xoá bản nhớ khung ADR-0035). Dựng trên vc-lib.mjs (a2-cdp.mjs). Số giấy tờ, SĐT là số GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0048/kich-ban/tai-xe-doi-tac-smoke.mjs
import { randomUUID } from "node:crypto";
process.env.OUT ??= "docs/evidence/2026-09-29-adr-0048";
const { ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, sleep, vnDate } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");

const ADMIN = ACCOUNTS.admin;
/** Tài khoản CHỈ quyền Tài xế đối tác (SĐT giả của kịch bản; các kịch bản 1a dùng 0900000411–0900000419). */
const TX_DT = { name: "Lê Văn Đông", phone: "0900000421", pin: "246421", permissions: ["DRIVER_PARTNER"] };
const NHA_XE = "Nhà Xe Xuân Chrome";
const SO_DU = ["790100000421", "KD-DANHDAU-5"]; // số GIẢ — không bao giờ nằm trong DOM của danh sách / của tài xế (chỉ số che)
const dem = boDem("TAI XE DOI TAC SMOKE");
const { env, ids, call, themXe, themGiayXe, themGiayNguoi } = await dungMoiTruong([TX_DT]);

const docHang = (p, sel) => p.ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`);

try {
  // Dữ liệu: vai "Tài xế đối tác" cho hồ sơ của tài khoản (như tài khoản tạo từ màn Quản lý tài khoản); nhà xe X + quan hệ "Tài xế của"; xe của X + xe công ty.
  const txParty = ids[TX_DT.phone].partyId;
  const at = new Date().toISOString();
  env.sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${txParty}', 'DRIVER_EXTERNAL', '${vnDate(0)}', '${at}', '${at}')`);
  const r = await call(ADMIN, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: NHA_XE });
  assert.equal(r.status, 201, r.text);
  const nhaXe = r.json.party.id;
  assert.equal((await call(ADMIN, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" })).status, 201);
  const q = await call(ADMIN, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: txParty, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" });
  assert.equal(q.status, 201, q.text);
  const xeNx = await themXe({ plateNumber: "79B-700.01", chassisNumber: "KHUNGNX00701", name: "Hyundai Solati", passengerCapacity: 15, ownerPartyId: nhaXe });
  const xeCt = await themXe({ plateNumber: "79B-700.02", chassisNumber: "KHUNGCT00702", name: "Ford Transit", passengerCapacity: 15 });
  await themGiayXe(xeNx.id, { typeCode: "INSPECTION", number: SO_DU[1], expiryDate: vnDate(6) });
  await themGiayXe(xeCt.id, { typeCode: "INSPECTION", number: "KD-CONGTY-7", expiryDate: vnDate(7) });
  await themGiayNguoi(txParty, { typeCode: "GPLX", number: SO_DU[0], classCode: "D2", issuedDate: vnDate(-900), expiryDate: vnDate(9) });

  // ---- Trang của tài khoản Tài xế đối tác chạy TRƯỚC trên máy "sạch": env.as gắn cookie phiên thẳng, KHÔNG đi qua /login — mà /login mới là chỗ xoá
  // BẢN NHỚ KHUNG (ADR-0035, web/login.ts xoaKhungNho). Nếu trang Quản trị chạy trước, web/home.ts sẽ gọi sớm dashboard đơn theo khung của Quản trị
  // (403 bị bỏ) — chỉ là giả tạo của cách đăng nhập trong kịch bản; người dùng thật qua /login không gặp. Mỗi trang đóng trước khi mở tài khoản khác.
  await dem.step("1", "390 Tài xế đối tác mở “/” → /cuoc rồi /tai-xe; không gọi /api/orders*; bốn tab; giấy của mình; số đủ không trong DOM" + axeNote(), async () => {
    const p = await env.as(TX_DT, "/", MOB);
    try {
      await p.waitFor("location.pathname === '/cuoc'", "được đưa sang /cuoc", 10000);
      await p.send("Page.navigate", { url: env.base + "/tai-xe" });
      await p.waitFor("location.pathname === '/tai-xe'", "mở /tai-xe", 10000);
      await p.waitFor("document.querySelectorAll('#tx-docs .vc-txdoc').length === 1", "khối giấy tờ", 10000);
      await sleep(1200); // chờ các lời gọi của khung về hết
      const calls = apiCalls(p).map((c) => c.path);
      assert.deepEqual(calls.filter((u) => u.startsWith("/api/orders")), [], `không lời gọi màn đơn: ${JSON.stringify(calls)}`);
      assert.deepEqual(calls.filter((u) => u.startsWith("/api/van-chuyen") && !u.startsWith("/api/van-chuyen/cuoc-cua-toi")), [], "chỉ route tài xế của Vận chuyển");
      const tabs = await p.ev("[...document.querySelectorAll('#tabbar a')].filter((a) => a.getClientRects().length > 0).map((a) => ({ href: a.getAttribute('href'), text: a.innerText.replace(/\\s+/g, ' ').trim() }))");
      assert.deepEqual(tabs, [{ href: "/tai-xe", text: "Trang chủ" }, { href: "/cuoc", text: "Cuốc của tôi" }, { href: "/ban", text: "Báo bận của tôi" }, { href: "/account", text: "Tôi" }]);
      assert.equal(await p.ev("document.querySelector('.vc-cuoc a')?.getAttribute('href')"), "/cuoc", "khối Cuốc xe là liên kết (không còn câu giữ chỗ)");
      assert.deepEqual(await docHang(p, "#tx-docs .vc-txdoc .vc-doc-title"), ["Giấy phép lái xe hạng D2"]);
      const html = await p.ev("document.documentElement.outerHTML");
      for (const so of SO_DU) assert.ok(!html.includes(so), `số đủ ${so} không được có trong DOM`);
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await axe(p, "trang đầu tài xế đối tác 390");
      await shotFull(p, "tai-xe-doi-tac-trang-dau-390.png");
    } finally {
      p.close();
    }
  });

  await dem.step("2", "1040 Tài xế đối tác /account: khối “Giấy tờ của tôi” số che, không nút; menu không có mục văn phòng / Vận chuyển / Đơn hàng", async () => {
    const p = await env.as(TX_DT, "/account", DESK);
    try {
      await p.waitFor("document.querySelectorAll('#my-docs .vc-mydoc').length === 1", "khối Giấy tờ của tôi", 10000);
      assert.equal(await p.ev("document.querySelector('#my-docs .vc-mydoc-no').innerText.trim()"), `••••${SO_DU[0].slice(-4)}`);
      assert.equal(await p.ev("document.querySelectorAll('#my-docs button, #my-docs a').length"), 0, "chỉ xem");
      await sleep(800);
      const side = await p.ev("[...document.querySelectorAll('#sidebar .sidebar-item')].filter((a) => a.getClientRects().length > 0).map((a) => a.innerText.replace(/\\s+/g, ' ').trim())");
      assert.ok(!side.some((x) => /Vận chuyển|Đơn hàng|Danh bạ|Trang chủ văn phòng/.test(x)), JSON.stringify(side));
      assert.equal(side[0], "Trang chủ", `mục đầu là Trang chủ (/tai-xe): ${JSON.stringify(side)}`);
      const html = await p.ev("document.documentElement.outerHTML");
      assert.ok(!html.includes(SO_DU[0]), "số đủ không trong DOM");
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await shotFull(p, "tai-xe-doi-tac-toi-1040.png");
    } finally {
      p.close();
    }
  });

  // ---- Quản trị: danh sách sắp hết hạn (Task B4).
  await dem.step("3", "1040 Quản trị: dòng xe của nhà xe và dòng tài xế đối tác có nhãn “Nhà xe: …”; xe công ty không; không số", async () => {
    const p = await env.as(ADMIN, "/giay-to-sap-het-han", DESK);
    try {
      await p.waitFor("document.querySelectorAll('#due-table a.vc-due-trow').length === 3", "ba dòng", 10000);
      const rows = await docHang(p, "#due-table a.vc-due-trow");
      assert.ok(rows.some((t) => t.startsWith("79B-700.01 · Hyundai Solati") && t.includes(`Nhà xe: ${NHA_XE}`)), JSON.stringify(rows));
      assert.ok(rows.some((t) => t.startsWith(TX_DT.name) && t.includes(`Nhà xe: ${NHA_XE}`)), JSON.stringify(rows));
      assert.ok(rows.some((t) => t.startsWith("79B-700.02 · Ford Transit") && !t.includes("Nhà xe:")), JSON.stringify(rows));
      const html = await p.ev("document.documentElement.outerHTML");
      for (const so of SO_DU) assert.ok(!html.includes(so), `không số ${so}`);
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await shotFull(p, "sap-het-han-nha-xe-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("4", "390 Quản trị: danh sách điện thoại có nhãn “Nhà xe: …”; không tràn ngang" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/giay-to-sap-het-han", MOB);
    try {
      await p.waitFor("document.querySelectorAll('#due-list a.vc-due-row').length === 3", "ba dòng", 10000);
      const rows = await docHang(p, "#due-list a.vc-due-row");
      assert.equal(rows.filter((t) => t.includes(`Nhà xe: ${NHA_XE}`)).length, 2, JSON.stringify(rows));
      const tran = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `không tràn ngang (${tran}px)`);
      await axe(p, "sắp hết hạn 390");
      await shotFull(p, "sap-het-han-nha-xe-390.png");
    } finally {
      p.close();
    }
  });

} finally {
  await env.stop();
}
dem.xong();
