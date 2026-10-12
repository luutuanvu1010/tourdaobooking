// Kịch bản Chrome (bằng chứng giao diện) cho commit c8d3349 trên nhánh mo-danh-muc-doi-tac: tài khoản Đối tác (quyền PARTNER) lập đơn từ danh mục.
//   - GET /api/catalog mở cho Đối tác (trước đây 403 → form hiện "Không tải được danh mục dịch vụ"). Từ ADR-0033 (2026-09-27) form đọc
//     GET /api/catalog/for-order thay thế (route cho người lập đơn); GET /api/catalog về cổng office.
//   - Form: ô đơn giá CHỈ XEM (readOnly) khi bằng giá danh mục; ô "Giảm giá" (#discount) khoá kèm dòng "Tài khoản đối tác tạm chưa được giảm giá.".
//   - Đối chứng: tài khoản Bán hàng KHÔNG bị khoá hai ô trên.
//   - Bước 6–7 (lỗi báo 30/9, L1–L3): trang đơn đã xác nhận của Đối tác / Thực tập không có nút sửa chuyến / đổi khách, không khối người phụ trách, không gọi
//     GET /api/dispatch/handlers; thanh tab điện thoại có "Đơn hàng"; thanh bên máy tính có mục "Đơn hàng" không huy hiệu.
//   - Bước 8–10 (vòng sửa sau nghiệm thu ADR-0100, 12/10): form lập đơn của Thực tập — đứng một mình (1040 + 390) và Thực tập + Bán hàng (1040): ô đơn giá readOnly,
//     ô "Giảm giá" readOnly, dòng báo "Tài khoản Thực tập không được giảm giá." (không phải câu «tạm» của Đối tác), ô trỏ tới dòng báo; bước 10 axe cho Thực tập + Bán hàng.
// Sửa 2026-09-26 (bản 1.17): dòng báo từng nằm trong cột hẹp của hàng ba ô Thanh toán → xuống 3 hàng ở máy tính. Kịch bản nay tìm dòng báo theo
// NỘI DUNG (không theo vị trí), đếm số hàng hiển thị thật (Range.getClientRects) — máy tính phải 1 hàng, điện thoại ≤ 2 — và kiểm ô giảm giá
// trỏ tới nó bằng aria-describedby.
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok/sleep/vnDate/setInput từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs) và mẫu step()/openAs()/call() của
// ../../2026-09-26-va-3-loi-kiem-toan/kich-ban/va3-smoke.mjs. Danh mục là danh mục GIẢ của a2-cdp (TD101 "Tour 4 đảo Nha Trang", người lớn 1.350.000).
// Chạy từ GỐC repo (worktree), sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs
// AXE_JS=<…/axe.min.js> (tuỳ chọn) → thêm bước axe RIÊNG (không gộp vào bước 1–4). Ghi ảnh vào $OUT/anh/*.png (mặc định thư mục bằng chứng này).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-26-mo-danh-muc-doi-tac";
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

const PARTNER_NOTE = "Tài khoản đối tác tạm chưa được giảm giá.";
const INTERN_NOTE = "Tài khoản Thực tập không được giảm giá."; // ADR-0100: trần giảm giá của Thực tập là 0, không phải «tạm» như Đối tác
const CATALOG_ERR = "Không tải được danh mục";
const TD101_ADULT = 1350000;
const PAX = 2;
const CUSTOMER = "Khách Đối Tác Thử";

let passed = 0;
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
  }
}

const env = await startEnv();
const pages = [];
const anomalies = [];
try {
  // Đăng nhập có thử lại khi ECONNRESET (cùng lý do va3-smoke.mjs: kết nối giữ-sống chết sau các lệnh `wrangler d1 execute`).
  const login = async (account) => {
    for (let i = 0; ; i++) {
      try {
        return await env.login(account);
      } catch (e) {
        if (i >= 2 || e?.cause?.code !== "ECONNRESET") throw e;
        await sleep(200);
      }
    }
  };
  const call = async (account, method, path, body) => {
    const c = await login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  /** Mở `path` đã đăng nhập bằng `account`; confirm/alert gốc bị THAY từ trước khi mã trang chạy (hộp gốc làm treo Runtime.evaluate). */
  const openAs = async (account, path, viewport) => {
    const p = await env.openPage(viewport);
    pages.push(p);
    await p.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__dialogs = []; window.confirm = (m) => { window.__dialogs.push('confirm: ' + String(m)); return true; }; window.alert = (m) => { window.__dialogs.push('alert: ' + String(m)); };",
    });
    const c = await login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  const noteErrorLogs = (p, where) => {
    for (const e of p.logEntries.filter((x) => x.level === "error")) anomalies.push(`${where}: [${e.source}] ${e.text} ${e.url ?? ""}`.trim());
  };

  // ---- Tài khoản Đối tác: tạo qua API quản trị (vai Cộng tác viên → quyền PARTNER), như e2e nhap-tay-va-gia-doi-tac.mjs ----
  const partnerPhone = "0900000271";
  let PARTNER;
  const createdStaff = await call(ACCOUNTS.admin, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Lập Đơn", phone: partnerPhone, roles: ["COLLABORATOR"] });
  if (createdStaff.status === 201) {
    assert.deepEqual(createdStaff.json.staff.permissions, ["PARTNER"], `vai Cộng tác viên → chỉ quyền Đối tác: ${JSON.stringify(createdStaff.json.staff)}`);
    PARTNER = { name: "Đối Tác Lập Đơn", phone: partnerPhone, pin: createdStaff.json.pin };
    console.log(`  (dữ liệu: tài khoản Đối tác ${partnerPhone} tạo qua POST /api/staff roles=["COLLABORATOR"] → quyền ${JSON.stringify(createdStaff.json.staff.permissions)})`);
  } else {
    // Dự phòng: gieo thẳng quyền PARTNER (holdsPartner chỉ xét quyền nên vẫn hợp lệ cho kiểm giao diện).
    console.log(`  (POST /api/staff trả ${createdStaff.status} ${JSON.stringify(createdStaff.json)} → gieo PARTNER bằng staff-lib)`);
    anomalies.push(`POST /api/staff roles=["COLLABORATOR"] bằng tài khoản ADMIN trả ${createdStaff.status}: ${JSON.stringify(createdStaff.json)}`);
    PARTNER = { name: "Đối Tác Lập Đơn", phone: partnerPhone, pin: "246871", permissions: ["PARTNER"] };
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    for (const stmt of (await insertStaffSql(PARTNER)).split("\n")) env.sql(stmt);
  }
  // ADR-0033 (2026-09-27): form lập đơn đọc danh mục qua GET /api/catalog/for-order; GET /api/catalog về cổng office (Đối tác nhận 403 ở đó).
  const catRes = await call(PARTNER, "GET", "/api/catalog/for-order");
  console.log(`  (GET /api/catalog/for-order bằng Đối tác → ${catRes.status}, ${catRes.json?.items?.length ?? "?"} mục)`);

  // ---- biểu thức dùng chung trên form ----
  const CARD = "[...document.querySelectorAll('#services .svc')].find((c) => c.querySelector('.svc-name')?.textContent === 'Tour 4 đảo Nha Trang')";
  const ADULT = `(${CARD}).querySelector('.counter-field[aria-label="Người lớn"]')`;
  const ADULT_PRICE = `(${CARD}).querySelector('.price-field[aria-label="Đơn giá người lớn"]')`;
  /** Tìm TD101 trong ô tìm danh mục, chọn, đặt Người lớn = PAX; chờ dòng tiền người lớn hiện. */
  const pickTd101 = async (p) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length >= 3 && /TD101/.test(document.getElementById('catalog-list').textContent)", "ô tìm danh mục hiện ≥ 3 dịch vụ gồm TD101", 10000);
    const listed = await p.ev("[...document.querySelectorAll('#catalog-list .catalog-pick')].map((b) => b.textContent.trim().replace(/\\s+/g, ' '))");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`!!(${CARD})`, "thẻ Tour 4 đảo Nha Trang");
    await p.ev(setInput(ADULT, String(PAX)));
    await p.waitFor(`!(${ADULT_PRICE}).closest('.line').hidden && /2 ×/.test((${ADULT_PRICE}).closest('.line').querySelector('.line-qty').textContent)`, "dòng tiền người lớn 2 × hiện");
    await sleep(150);
    return listed;
  };
  /** Trạng thái các ô cần kiểm trên form. `ghiChu`: chữ của dòng báo cần tìm (mặc định câu của Đối tác). */
  const formState = (p, ghiChu = PARTNER_NOTE) =>
    p.ev(`(() => {
      const card = ${CARD};
      const lines = card ? [...card.querySelectorAll('.line:not([hidden])')] : [];
      const d = document.getElementById('discount');
      const note = [...document.body.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(ghiChu)});
      const noteRange = note ? document.createRange() : null;
      if (noteRange) noteRange.selectNodeContents(note);
      const adultPrice = card ? card.querySelector('.price-field[aria-label="Đơn giá người lớn"]') : null;
      return {
        card: !!card,
        visibleLines: lines.map((l) => { const f = l.querySelector('.price-field'); return { name: l.querySelector('.line-name')?.textContent, readOnly: f?.readOnly, value: f?.value, digits: Number((f?.value ?? '').replace(/\\D/g, '')), qty: l.querySelector('.line-qty')?.textContent, total: l.querySelector('.line-total')?.textContent }; }),
        adultPriceReadOnly: adultPrice ? adultPrice.readOnly : null,
        tagShown: card ? card.querySelector('.line:not([hidden]) .tag-price:not([hidden])') !== null : null,
        discountReadOnly: d.readOnly,
        discountValue: d.value,
        note: note ? { tag: note.tagName, id: note.id, cls: note.className, text: note.textContent.trim(), rows: new Set([...noteRange.getClientRects()].map((r) => Math.round(r.top))).size, visible: note.getClientRects().length > 0 } : null,
        discountDescribedBy: d.getAttribute('aria-describedby'),
        partnerNoteAnywhere: document.body.textContent.includes(${JSON.stringify(PARTNER_NOTE)}),
        catalogErrAnywhere: document.body.textContent.includes(${JSON.stringify(CATALOG_ERR)}),
        subtotal: document.getElementById('sum-subtotal')?.textContent,
      };
    })()`);

  // ==================================================================================================
  // 4) ĐỐI CHỨNG — Bán hàng (mở TRƯỚC, đóng xong mới tới Đối tác: kho cookie chung)
  // ==================================================================================================
  await step("4", "Đối chứng Bán hàng (máy tính 1040): chọn TD101 + 2 người lớn → ô đơn giá và ô giảm giá KHÔNG readOnly, không có dòng “Tài khoản đối tác…”", async () => {
    const p = await openAs(ACCOUNTS.salesA, "/order-form", DESK);
    await pickTd101(p);
    const s = await formState(p);
    assert.equal(s.visibleLines.length, 1, `một dòng tiền (người lớn) — ${JSON.stringify(s)}`);
    assert.equal(s.visibleLines[0].readOnly, false, `ô đơn giá của Bán hàng KHÔNG readOnly — ${JSON.stringify(s)}`);
    assert.equal(s.visibleLines[0].digits, TD101_ADULT, `ô đơn giá = giá danh mục — ${JSON.stringify(s)}`);
    assert.equal(s.discountReadOnly, false, `ô giảm giá của Bán hàng KHÔNG readOnly — ${JSON.stringify(s)}`);
    assert.equal(s.partnerNoteAnywhere, false, `không có dòng “${PARTNER_NOTE}” — ${JSON.stringify(s)}`);
    assert.equal(s.catalogErrAnywhere, false, `không có “${CATALOG_ERR}” — ${JSON.stringify(s)}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    noteErrorLogs(p, "Bán hàng /order-form máy tính");
    console.log(`    Bán hàng: đơn giá readOnly=${s.visibleLines[0].readOnly} (“${s.visibleLines[0].value}”), giảm giá readOnly=${s.discountReadOnly}, dòng báo: ${JSON.stringify(s.note)}, aria-describedby=${s.discountDescribedBy}`);
    p.close();
  });

  // ==================================================================================================
  // 1–3) ĐỐI TÁC — mọi trang sau đây của cùng tài khoản Đối tác
  // ==================================================================================================
  let desk;
  await step("1", "Đối tác (máy tính 1040): /order-form — ô tìm dịch vụ CÓ dịch vụ để chọn (3 mục danh mục, có TD101), KHÔNG có chữ “Không tải được danh mục”", async () => {
    desk = await openAs(PARTNER, "/order-form", DESK);
    await desk.ev("document.getElementById('catalog-q').focus(); true");
    await desk.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length >= 3", "ô tìm danh mục hiện dịch vụ", 10000);
    const listed = await desk.ev("[...document.querySelectorAll('#catalog-list .catalog-pick')].map((b) => b.textContent.trim().replace(/\\s+/g, ' '))");
    assert.ok(listed.some((t) => t.includes("TD101")), `có TD101 trong danh sách — ${JSON.stringify(listed)}`);
    const text = await desk.ev("document.body.textContent");
    assert.ok(!text.includes(CATALOG_ERR), `KHÔNG được có “${CATALOG_ERR}”`);
    assert.equal(await desk.ev("location.pathname"), "/order-form", "vẫn ở /order-form (không bị khoá form / chuyển trang)");
    assert.equal(await desk.ev("!!document.getElementById('save') && !document.getElementById('save').disabled"), true, "nút Lưu dùng được");
    console.log(`    danh sách: ${JSON.stringify(listed)}`);
  });

  await step("2", `Đối tác (máy tính 1040): chọn TD101, ${PAX} người lớn → ô đơn giá readOnly = true, hiện đúng giá danh mục 1.350.000; ô “Giảm giá” readOnly = true, có dòng “${PARTNER_NOTE}” nằm gọn MỘT hàng, ô trỏ tới nó (aria-describedby)`, async () => {
    assert.ok(desk, "trang bước 1 chưa mở");
    await pickTd101(desk);
    await desk.waitFor(`(${ADULT_PRICE}).readOnly === true`, "ô đơn giá người lớn readOnly", 5000);
    const s = await formState(desk);
    assert.equal(s.visibleLines.length, 1, `một dòng tiền (người lớn) — ${JSON.stringify(s)}`);
    for (const l of s.visibleLines) {
      assert.equal(l.readOnly, true, `mọi ô đơn giá đang hiện phải readOnly — ${JSON.stringify(l)}`);
      assert.equal(l.digits, TD101_ADULT, `ô đơn giá = giá danh mục ${TD101_ADULT} — ${JSON.stringify(l)}`);
    }
    assert.equal(s.tagShown, false, `không có nhãn “Khác giá danh mục” — ${JSON.stringify(s)}`);
    assert.equal(s.discountReadOnly, true, `ô giảm giá readOnly — ${JSON.stringify(s)}`);
    assert.equal(s.note?.visible, true, `có dòng “${PARTNER_NOTE}” đang hiện — ${JSON.stringify(s.note)}`);
    assert.equal(s.note.rows, 1, `dòng báo ở máy tính phải nằm gọn 1 hàng — ${JSON.stringify(s.note)}`);
    assert.ok(s.note.id && s.discountDescribedBy === s.note.id, `ô giảm giá trỏ tới dòng báo bằng aria-describedby — ${s.discountDescribedBy} / ${JSON.stringify(s.note)}`);
    assert.equal(s.catalogErrAnywhere, false, `không có “${CATALOG_ERR}”`);
    assert.match(s.subtotal ?? "", /2\.700\.000/, `tạm tính 2.700.000 — ${s.subtotal}`);
    assert.deepEqual(desk.consoleErrors, [], `lỗi console: ${desk.consoleErrors}`);
    await desk.shot(join(OUT, "anh", "doi-tac-form-may-tinh.png"));
    console.log(`    dòng tiền: ${JSON.stringify(s.visibleLines)} · giảm giá readOnly=${s.discountReadOnly} value="${s.discountValue}" · dòng báo: ${JSON.stringify(s.note)} · tạm tính ${s.subtotal}`);
    noteErrorLogs(desk, "Đối tác /order-form máy tính");
    desk.close();
  });

  const mob = await openAs(PARTNER, "/order-form", MOB);
  await step("2m", `Đối tác (điện thoại 390): chọn TD101, ${PAX} người lớn → ô đơn giá readOnly, giá 1.350.000; ô “Giảm giá” readOnly + dòng “${PARTNER_NOTE}”; không có “${CATALOG_ERR}”; không tràn ngang`, async () => {
    await pickTd101(mob);
    await mob.waitFor(`(${ADULT_PRICE}).readOnly === true`, "ô đơn giá người lớn readOnly", 5000);
    const s = await formState(mob);
    assert.deepEqual(s.visibleLines.map((l) => [l.readOnly, l.digits]), [[true, TD101_ADULT]], `ô đơn giá — ${JSON.stringify(s)}`);
    assert.equal(s.discountReadOnly, true, `ô giảm giá readOnly — ${JSON.stringify(s)}`);
    assert.equal(s.note?.visible, true, `có dòng “${PARTNER_NOTE}” đang hiện — ${JSON.stringify(s.note)}`);
    assert.ok(s.note.rows <= 2, `dòng báo ở điện thoại tối đa 2 hàng — ${JSON.stringify(s.note)}`);
    assert.equal(s.catalogErrAnywhere, false, `không có “${CATALOG_ERR}”`);
    const overflow = await mob.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    assert.ok(overflow <= 1, `không tràn ngang ở 390px — lệch ${overflow}px`);
    assert.deepEqual(mob.consoleErrors, [], `lỗi console: ${mob.consoleErrors}`);
    await mob.shot(join(OUT, "anh", "doi-tac-form-dien-thoai.png"));
  });

  await step("3", `Đối tác (điện thoại 390): điền tên/SĐT khách, chọn ngày, bấm Lưu → chuyển sang /order?id=…; đơn (API) tổng = ${PAX} × 1.350.000 = 2.700.000, giảm giá 0, đơn giá = giá danh mục`, async () => {
    await mob.ev(setInput("document.getElementById('customerName')", CUSTOMER));
    await mob.ev(setInput("document.getElementById('customerPhone')", "0903 555 777"));
    await mob.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    await sleep(200);
    await mob.ev("document.getElementById('save').click(); true");
    try {
      await mob.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "chuyển tới /order?id=… sau khi lưu", 15000);
    } catch (e) {
      const err = await mob.ev("(document.getElementById('save-error')?.hidden ? '' : document.getElementById('save-error')?.textContent) ?? ''").catch(() => "?");
      const dialogs = await mob.ev("window.__dialogs").catch(() => "?");
      throw new Error(`${e.message}\n#save-error: ${err}\nhộp thoại: ${JSON.stringify(dialogs)}`);
    }
    const orderId = await mob.ev("new URLSearchParams(location.search).get('id')");
    await mob.waitFor("document.readyState === 'complete'", "trang đơn tải xong");
    await sleep(800);
    const r = await call(PARTNER, "GET", `/api/orders/${orderId}`);
    assert.equal(r.status, 200, `Đối tác đọc lại đơn của mình: ${r.status} ${JSON.stringify(r.json)}`);
    const o = r.json.order;
    assert.equal(o.customerName, CUSTOMER);
    assert.equal(o.subtotal, PAX * TD101_ADULT, `tạm tính — ${o.subtotal}`);
    assert.equal(o.discount, 0, `giảm giá — ${o.discount}`);
    assert.equal(o.total, PAX * TD101_ADULT, `tổng — ${o.total}`);
    assert.equal(o.services.length, 1);
    const items = o.services[0].items.map((i) => [i.paxCode, i.quantity, i.unitPrice, i.catalogPrice]);
    assert.deepEqual(items, [["adult", PAX, TD101_ADULT, TD101_ADULT]], `dòng tiền — ${JSON.stringify(items)}`);
    assert.equal(o.services[0].departDate, vnDate(3), "ngày đi đã lưu");
    assert.deepEqual(await mob.ev("window.__dialogs"), [], "không bật hộp thoại confirm/alert nào");
    assert.deepEqual(mob.consoleErrors, [], `lỗi console: ${mob.consoleErrors}`);
    noteErrorLogs(mob, "Đối tác /order-form → /order điện thoại");
    console.log(`    đơn ${o.orderCode} (${o.status}): tạm tính ${o.subtotal}, giảm giá ${o.discount}, tổng ${o.total}, dòng ${JSON.stringify(items)}, ngày đi ${o.services[0].departDate}`);
  });
  mob.close();

  if (AXE) {
    await step("5", "axe (Đối tác, /order-form máy tính, sau khi chọn TD101): 0 vi phạm critical/serious", async () => {
      const p = await openAs(PARTNER, "/order-form", DESK);
      await pickTd101(p);
      await p.ev(`${AXE}\n;true`);
      const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`);
      const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
      assert.deepEqual(bad, [], `axe: ${JSON.stringify(bad)}`);
      p.close();
    });
  }

  // ==================================================================================================
  // 6–7) LỖI BÁO 30/9 (L1, L2, L3): trang đơn ĐÃ XÁC NHẬN của Đối tác / Thực tập — KHÔNG nút "Sửa thông tin chuyến" / "Đổi khách" (máy chủ đòi ô
  //      order.trip.edit = none → 403), KHÔNG khối "Người phụ trách" và KHÔNG lời gọi GET /api/dispatch/handlers (403 với họ — trước đây luôn hiện
  //      "Chưa tải được người phụ trách." + Thử lại); thanh tab điện thoại có "Đơn hàng" (trước: chỉ "Tạo đơn" + "Tôi"), bấm vào ra danh sách đơn của
  //      mình; thanh bên máy tính có mục "Đơn hàng" không huy hiệu, không gọi dashboard. Thực tập mở SAU CÙNG (kho cookie chung).
  // ==================================================================================================
  const donDaXacNhan = async (ai, ten) => {
    const r = await call(ai, "POST", "/api/orders", {
      customerName: ten, customerPhone: "0903 555 888", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: TD101_ADULT }, departDate: vnDate(3), departTime: "", pickupTime: "07:30", pickupPlace: "Khách sạn Biển Xanh", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
    });
    assert.equal(r.status, 201, `lập đơn: ${JSON.stringify(r.json)}`);
    const c = await call(ai, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
    assert.equal(c.status, 200, `xác nhận đơn: ${c.status} ${JSON.stringify(c.json)}`);
    // Đối chứng máy chủ: sửa chuyến / đổi khách của đơn này bị từ chối (403) — đúng lý do giao diện phải ẩn hai nút.
    const trip = await call(ai, "PUT", `/api/orders/${r.json.order.id}/booker`, { expectedUpdatedAt: "x" });
    assert.equal(trip.status, 403, `máy chủ từ chối đổi khách: ${trip.status}`);
    return r.json.order;
  };
  const trangDon = (p) =>
    p.ev(`(() => ({
      lock: document.querySelector('.lock-note')?.textContent ?? null,
      editTrip: !!document.querySelector('[data-action="edit-trip"]'),
      booker: !!document.querySelector('[data-action="change-booker"]'),
      handlerCard: !!document.querySelector('.handler-card'),
      handlerUnknown: document.body.textContent.includes('Chưa tải được người phụ trách'),
      btns: [...document.querySelectorAll('#actions .btn')].map((b) => b.textContent.trim()),
      tabs: [...document.querySelectorAll('#tabbar .tab')].map((a) => [a.querySelector(':scope > span:last-child').textContent.trim(), a.getAttribute('href'), a.getAttribute('aria-current')]),
      side: [...document.querySelectorAll('#sidebar .sidebar-item')].map((a) => [a.querySelector('.sidebar-item-label')?.textContent.trim(), a.querySelector('.sidebar-item-badge')?.textContent ?? null]),
    }))()`);
  // D5 (bản vẽ M3, ADR-0047 Phần B 2026-10-01): Đối tác, Thực tập (đơn mình lập) còn sửa được danh sách hành khách — câu khoá nói đúng điều đó, vẫn không hứa sửa chuyến.
  const LOCK_KHONG_SUA_CHUYEN = "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được danh sách hành khách."; // phiếu kiểm A2 V-1
  const TABS = [["Đơn hàng", "/orders", "page"], ["Tạo đơn", "/order-form", null], ["Tôi", "/account", null]];
  const goiHandlers = (p) => p.requests.filter((r) => r.url.includes("/api/dispatch/handlers")).map((r) => r.url);
  const goiDashboard = (p) => p.requests.filter((r) => r.url.includes("/api/orders/dashboard") || r.url.includes("/api/orders/dem-nhap")).map((r) => r.url); // ADR-0102: huy hiệu nay qua /api/orders/dem-nhap
  const kiemTrangDon = async (p, nhan) => {
    await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã xác nhận' && !!document.querySelector('#actions')", `${nhan}: đơn đã xác nhận hiện`, 15000);
    await sleep(600);
    const s = await trangDon(p);
    assert.equal(s.editTrip, false, `${nhan}: KHÔNG nút "Sửa thông tin chuyến" — ${JSON.stringify(s)}`);
    assert.equal(s.booker, false, `${nhan}: KHÔNG nút "Đổi khách" — ${JSON.stringify(s)}`);
    assert.ok(s.btns.includes("Huỷ đơn"), `${nhan}: vẫn có "Huỷ đơn" (order.modify own) — ${JSON.stringify(s.btns)}`);
    assert.equal(s.lock, LOCK_KHONG_SUA_CHUYEN, `${nhan}: câu khoá không hứa "sửa được thông tin chuyến" — ${JSON.stringify(s.lock)}`);
    assert.equal(s.handlerCard, false, `${nhan}: KHÔNG khối "Người phụ trách" — ${JSON.stringify(s)}`);
    assert.equal(s.handlerUnknown, false, `${nhan}: KHÔNG chữ "Chưa tải được người phụ trách"`);
    assert.deepEqual(goiHandlers(p), [], `${nhan}: KHÔNG gọi /api/dispatch/handlers`);
    assert.deepEqual(p.consoleErrors, [], `${nhan}: lỗi console: ${p.consoleErrors}`);
    return s;
  };

  const donDT = await donDaXacNhan(PARTNER, "Khách Đối Tác Đã Xác Nhận");
  await step("6", "L1–L3 Đối tác: trang đơn đã xác nhận (390 + 1040) không nút sửa chuyến / đổi khách, không khối người phụ trách, không gọi handlers; tab điện thoại Đơn hàng · Tạo đơn · Tôi → bấm Đơn hàng ra danh sách đơn của mình; thanh bên máy tính có Đơn hàng không huy hiệu", async () => {
    const d = await openAs(PARTNER, `/order?id=${donDT.id}`, DESK);
    const sd = await kiemTrangDon(d, "Đối tác 1040");
    const donHang = sd.side.find(([t]) => t === "Đơn hàng");
    assert.ok(donHang, `thanh bên có mục "Đơn hàng" — ${JSON.stringify(sd.side)}`);
    assert.equal(donHang[1], null, `mục "Đơn hàng" của Đối tác không huy hiệu — ${JSON.stringify(donHang)}`);
    assert.deepEqual(goiDashboard(d), [], "không gọi /api/orders/dashboard hay /api/orders/dem-nhap (huy hiệu văn phòng)");
    noteErrorLogs(d, "Đối tác /order máy tính");
    await d.shot(join(OUT, "anh", "doi-tac-don-da-xac-nhan-may-tinh.png"));
    d.close();

    const m = await openAs(PARTNER, `/order?id=${donDT.id}`, MOB);
    const sm = await kiemTrangDon(m, "Đối tác 390");
    assert.deepEqual(sm.tabs, TABS, `thanh tab điện thoại — ${JSON.stringify(sm.tabs)}`);
    noteErrorLogs(m, "Đối tác /order điện thoại");
    await m.shot(join(OUT, "anh", "doi-tac-don-da-xac-nhan-dien-thoai.png"));
    await m.ev("document.querySelector('#tabbar a[href=\"/orders\"]').click(); true");
    await m.waitFor("location.pathname === '/orders' && document.querySelectorAll('#list .order-row').length > 0", "bấm tab Đơn hàng → danh sách đơn", 15000);
    await sleep(600);
    const ds = await m.ev("[...document.querySelectorAll('#list .order-row')].map((a) => a.textContent)");
    assert.ok(ds.some((t) => t.includes("Khách Đối Tác Đã Xác Nhận")), `danh sách có đơn của mình — ${JSON.stringify(ds)}`);
    assert.ok(!ds.some((t) => t.includes("HDV:") || t.includes("Chờ nhận")), `thẻ đơn không có dòng người phụ trách — ${JSON.stringify(ds)}`);
    assert.deepEqual(goiHandlers(m), [], "danh sách: KHÔNG gọi /api/dispatch/handlers");
    assert.equal(await m.ev("document.querySelector('#tabbar a[href=\"/orders\"]').getAttribute('aria-current')"), "page", "tab Đơn hàng sáng ở /orders");
    assert.deepEqual(m.consoleErrors, [], `lỗi console: ${m.consoleErrors}`);
    noteErrorLogs(m, "Đối tác /orders điện thoại");
    await m.shot(join(OUT, "anh", "doi-tac-danh-sach-don-dien-thoai.png"));
    m.close();
  });

  const INTERN = { name: "Thực Tập Lập Đơn", phone: "0900000272", pin: "246872", permissions: ["INTERN"] };
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    for (const stmt of (await insertStaffSql(INTERN)).split("\n")) env.sql(stmt);
  }
  const donTT = await donDaXacNhan(INTERN, "Khách Thực Tập Đã Xác Nhận");
  await step("7", "L1–L3 Thực tập (390): trang đơn đã xác nhận không nút sửa chuyến / đổi khách, không khối người phụ trách, không gọi handlers; tab Đơn hàng · Tạo đơn · Tôi", async () => {
    const m = await openAs(INTERN, `/order?id=${donTT.id}`, MOB);
    const sm = await kiemTrangDon(m, "Thực tập 390");
    assert.deepEqual(sm.tabs, TABS, `thanh tab điện thoại — ${JSON.stringify(sm.tabs)}`);
    noteErrorLogs(m, "Thực tập /order điện thoại");
    await m.shot(join(OUT, "anh", "thuc-tap-don-da-xac-nhan-dien-thoai.png"));
    m.close();
  });

  // ==================================================================================================
  // 8–10) THỰC TẬP (ADR-0100, vòng sửa sau nghiệm thu 12/10): khẳng định BẰNG TRÌNH DUYỆT rằng ô đơn giá và ô "Giảm giá" bị khoá (readOnly) và dòng báo đúng chữ —
  //       Thực tập đứng một mình (1040 + 390), rồi Thực tập + Bán hàng (`chiGiaDanhMuc` = có quyền Thực tập là áp, kể cả kèm quyền nội bộ). Mở theo thứ tự
  //       Thực tập → Thực tập + Bán hàng (kho cookie chung: trang của tài khoản nào phải mở sau cùng; mỗi bước đóng trang trước khi tới bước kế).
  // ==================================================================================================
  /** Chọn TD101, 2 người lớn → khẳng định hai ô khoá + dòng báo Thực tập; `rowsMax`: số hàng tối đa của dòng báo (máy tính 1, điện thoại 2). */
  const kiemKhoaThucTap = async (p, nhan, rowsMax) => {
    await pickTd101(p);
    await p.waitFor(`(${ADULT_PRICE}).readOnly === true`, `${nhan}: ô đơn giá người lớn readOnly`, 5000);
    const s = await formState(p, INTERN_NOTE);
    assert.equal(s.visibleLines.length, 1, `${nhan}: một dòng tiền (người lớn) — ${JSON.stringify(s)}`);
    assert.equal(s.visibleLines[0].readOnly, true, `${nhan}: ô đơn giá readOnly — ${JSON.stringify(s.visibleLines)}`);
    assert.equal(s.visibleLines[0].digits, TD101_ADULT, `${nhan}: ô đơn giá = giá danh mục ${TD101_ADULT} — ${JSON.stringify(s.visibleLines)}`);
    assert.equal(s.tagShown, false, `${nhan}: không có nhãn “Khác giá danh mục” — ${JSON.stringify(s)}`);
    assert.equal(s.discountReadOnly, true, `${nhan}: ô “Giảm giá” readOnly — ${JSON.stringify(s)}`);
    assert.equal(s.note?.visible, true, `${nhan}: có dòng “${INTERN_NOTE}” đang hiện — ${JSON.stringify(s.note)}`);
    assert.ok(s.note.rows >= 1 && s.note.rows <= rowsMax, `${nhan}: dòng báo tối đa ${rowsMax} hàng — ${JSON.stringify(s.note)}`);
    assert.ok(s.note.id && s.discountDescribedBy === s.note.id, `${nhan}: ô giảm giá trỏ tới dòng báo bằng aria-describedby — ${s.discountDescribedBy} / ${JSON.stringify(s.note)}`);
    assert.equal(s.partnerNoteAnywhere, false, `${nhan}: KHÔNG có câu của Đối tác “${PARTNER_NOTE}” (Thực tập không phải «tạm») — ${JSON.stringify(s)}`);
    assert.equal(s.catalogErrAnywhere, false, `${nhan}: không có “${CATALOG_ERR}”`);
    assert.match(s.subtotal ?? "", /2\.700\.000/, `${nhan}: tạm tính 2.700.000 — ${s.subtotal}`);
    assert.deepEqual(p.consoleErrors, [], `${nhan}: lỗi console: ${p.consoleErrors}`);
    noteErrorLogs(p, nhan);
    console.log(`    ${nhan}: đơn giá readOnly=${s.visibleLines[0].readOnly} (“${s.visibleLines[0].value}”) · giảm giá readOnly=${s.discountReadOnly} value="${s.discountValue}" · dòng báo ${JSON.stringify(s.note)} · tạm tính ${s.subtotal}`);
    return s;
  };

  await step("8", `Thực tập đứng một mình (máy tính 1040): chọn TD101, ${PAX} người lớn → ô đơn giá readOnly (1.350.000), ô “Giảm giá” readOnly, dòng “${INTERN_NOTE}” gọn một hàng, ô trỏ tới nó`, async () => {
    const p = await openAs(INTERN, "/order-form", DESK);
    await kiemKhoaThucTap(p, "Thực tập 1040", 1);
    await p.shot(join(OUT, "anh", "thuc-tap-form-may-tinh.png"));
    p.close();
  });

  await step("8m", `Thực tập đứng một mình (điện thoại 390): cùng khẳng định — hai ô readOnly, dòng “${INTERN_NOTE}” tối đa 2 hàng; không tràn ngang`, async () => {
    const p = await openAs(INTERN, "/order-form", MOB);
    await kiemKhoaThucTap(p, "Thực tập 390", 2);
    const overflow = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    assert.ok(overflow <= 1, `không tràn ngang ở 390px — lệch ${overflow}px`);
    await p.shot(join(OUT, "anh", "thuc-tap-form-dien-thoai.png"));
    p.close();
  });

  // Thực tập + Bán hàng: gieo thẳng hai quyền (như tài khoản Thực tập ở trên). Nếu CSDL từ chối tổ hợp này thì dừng và báo — đừng chữa mã.
  const INTERN_SALES = { name: "Thực Tập Kiêm Bán Hàng", phone: "0900000273", pin: "246873", permissions: ["INTERN", "SALES"] };
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    for (const stmt of (await insertStaffSql(INTERN_SALES)).split("\n")) env.sql(stmt);
  }
  await step("9", `Thực tập + Bán hàng (máy tính 1040): cùng khẳng định — ô đơn giá readOnly, ô “Giảm giá” readOnly, dòng “${INTERN_NOTE}” (có quyền Thực tập là bị áp, kể cả kèm Bán hàng; câu của Thực tập vì không có quyền Đối tác)`, async () => {
    const p = await openAs(INTERN_SALES, "/order-form", DESK);
    await kiemKhoaThucTap(p, "Thực tập + Bán hàng 1040", 1);
    await p.shot(join(OUT, "anh", "thuc-tap-ban-hang-form-may-tinh.png"));
    p.close();
  });

  if (AXE) {
    await step("10", "axe (Thực tập + Bán hàng, /order-form máy tính, sau khi chọn TD101): 0 vi phạm critical/serious", async () => {
      const p = await openAs(INTERN_SALES, "/order-form", DESK);
      await pickTd101(p);
      await p.ev(`${AXE}\n;true`);
      const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`);
      const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
      assert.deepEqual(bad, [], `axe: ${JSON.stringify(bad)}`);
      p.close();
    });
  }
} finally {
  for (const p of pages) try { p.close(); } catch { /* đã đóng */ }
  await env.stop();
}
if (anomalies.length) console.log(`Điều bất thường (không làm hỏng bước nào):\n  - ${anomalies.join("\n  - ")}`);
console.log(`${passed} bước ✓, ${failures} bước ✗${AXE ? "" : " — CHƯA CHẠY AXE (thiếu AXE_JS)"}`);
if (failures) {
  console.log("ĐỐI TÁC LẬP ĐƠN SMOKE HỎNG");
  process.exit(1);
}
console.log("ĐỐI TÁC LẬP ĐƠN SMOKE OK");
