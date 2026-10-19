// Kịch bản Chrome (bằng chứng giao diện) cho Task 1.8 phần b ADR-0030 — chọn người phụ trách (hướng dẫn viên) NGAY TRONG FORM LẬP ĐƠN, dựng theo bản
// thiết kế của chủ dự án "Nguoi phu trach - Form lap don.dc.html" (Claude Design 2026-09-28), phương án 1b (chủ dự án tự ghi trong bản thiết kế: "Đề xuất:
// 1b"): khối "Người phụ trách" ở CUỐI form, ngay trước vùng nút Lưu; bảng chọn web/assignee-picker.ts (tìm theo tên bỏ dấu, gom nhóm theo `roleLabel`,
// chọn xong đóng ngay, KHÔNG gọi API ghi). Kiểm:
//   (1) Bán hàng 390: khối ở đúng chỗ, trạng thái "Chờ nhận", không gọi /api/dispatch/assignees trước khi mở bảng;
//   (2) không chọn ai → Lưu: thân POST KHÔNG có `handlerStaffId`, đơn "Chờ nhận";
//   (3) mở bảng: a11y (dialog, aria-modal, nền inert, focus), danh sách gọi lúc mở, "Chưa chọn ai" đầu danh sách, nhóm đúng thứ tự thiết kế, người trong nhóm
//       giữ thứ tự máy chủ;
//   (4) tìm theo tên đã bỏ dấu, lọc cục bộ (không gọi lại API), "Không tìm thấy ai tên …";
//   (5) Esc / chạm nền / ✕ đóng, trả focus;
//   (6) chọn → đóng ngay, khối "HDV: <tên>" + vai + "Đổi" + "Bỏ chọn — để Chờ nhận", focus vào nút mới, không có lời gọi ghi nào; mở lại thấy dấu ✓;
//   (7) "Bỏ chọn" → về "Chờ nhận", focus vào "Chọn người phụ trách";
//   (8) chọn HDV → Lưu: thân POST có `handlerStaffId`, đơn hiện NGAY ở "Việc của tôi" của HDV đó (GET /api/dispatch/mine bằng phiên của HDV);
//   (9) người được chọn vừa nghỉ giữa lúc điền form → 400 `invalid_assignee`: banner đúng lời máy chủ, KHÔNG có đơn mới, dữ liệu đã gõ còn nguyên; bỏ chọn
//       → banner tự gỡ, lưu được;
//   (10) máy tính 1040: khối ở cột phải cạnh nút Lưu, nút Lưu trong khung nhìn (900 và 768 chiều cao), bảng ở giữa màn hình;
//   (11) Đối tác thuần, (12) Thực tập: khối KHÔNG hiện, không gọi /api/dispatch/assignees (trang Thực tập mở SAU CÙNG — kho cookie chung).
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok/setInput/sleep/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs), mẫu step() ✓/✗ và openAs()/call()
// của hdv-viec-cua-toi-smoke.mjs / doi-tac-lap-don-smoke.mjs (không dừng ở bước hỏng đầu tiên).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/chon-hdv-lap-don-smoke.mjs
// Không có AXE_JS → bỏ bước axe và in rõ "chưa chạy axe". Ghi ảnh vào $OUT/anh/chon-hdv-*.png (mặc định thư mục bằng chứng này).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-27-tu-choi-huy-hdv";
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 900, mobile: false };
const DESK_SHORT = { width: 1040, height: 768, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
// Số 0900000201–209, 261, 271, 281, 282, 301–303, 397–399 đã có kịch bản khác dùng.
const HDV1 = { name: "Nguyễn Minh Tâm", phone: "0900000291", pin: "246891", permissions: ["FIELD"] };
const HDV2 = { name: "Lê Hoàng Phúc", phone: "0900000292", pin: "246892", permissions: ["FIELD"] };
const INTERN = { name: "Trần Thực Tập", phone: "0900000293", pin: "246893", permissions: ["INTERN"] };
const PARTNER = { name: "Phan Đối Tác", phone: "0900000294", pin: "246894", permissions: ["PARTNER"] };
const DEAD_MSG = "Nhân viên này đã ngưng hoạt động, không thể giao phụ trách.";
const FIX_LINE = "Đơn chưa được lưu. Bỏ chọn hoặc chọn người phụ trách khác rồi bấm Lưu lại.";

let passed = 0;
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 14).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
  }
}
const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  // Loại ĐÚNG MỘT phần tử có lỗi SẴN TỪ TRƯỚC, không thuộc việc này: chữ "System" của thương hiệu ở thanh bên trái máy tính — axe 4.12.1 tính nền là
  // #eaf2f8 thay cho nền navy thật (tương phản 1.1). Đã đo 2026-09-28 bằng tài khoản Bán hàng: lặp y hệt ở /orders và /account, và ở /order-form khi ẩn
  // khối "Người phụ trách" (báo cáo task-1.8d, mục "Lo ngại"). Mọi phần tử khác vẫn kiểm.
  const v = await p.ev(`axe.run({ include: [["html"]], exclude: [[".sidebar-head .brand-name"]] }).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, where: x.nodes.slice(0, 3).map((n) => n.target.join(" ") + " — " + (n.any[0]?.message ?? "")) })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
const axeNote = () => (AXE ? ", axe không vi phạm critical/serious" : " (chưa chạy axe: thiếu AXE_JS)");
/** Ảnh khung nhìn (bảng đang mở) và ảnh cả trang. */
const shotView = async (p, name) => {
  await sleep(450); // chuyển động mở bảng (--m-base 300ms)
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
};
const shotFull = async (p, name) => {
  await sleep(300);
  await p.shot(join(OUT, "anh", name));
};

const env = await startEnv();
const pages = [];
try {
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
  const openAs = async (account, path, viewport) => {
    const p = await env.openPage(viewport);
    pages.push(p);
    const c = await login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };

  // ---- Dữ liệu: hai HDV, một Thực tập, một Đối tác thuần (MỘT lệnh wrangler — mỗi lệnh mất vài giây) ----
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  env.sql((await Promise.all([HDV1, HDV2, INTERN, PARTNER].map((a) => insertStaffSql(a)))).join("\n"));
  const idOf = (a) => env.sql(`SELECT id FROM staff WHERE phone = '${a.phone}'`)[0].id;
  const hdv1 = { ...HDV1, id: idOf(HDV1) };
  const hdv2 = { ...HDV2, id: idOf(HDV2) };
  const orderCount = () => env.sql("SELECT count(*) AS n FROM orders")[0].n;
  // Danh sách máy chủ trả (để so thứ tự trong từng nhóm với bảng chọn) — bằng phiên Bán hàng qua Node (cookie riêng, không đụng kho cookie của Chrome).
  const assigneesApi = async () => {
    const r = await call(ACCOUNTS.salesA, "GET", "/api/dispatch/assignees");
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return r.json.assignees;
  };
  const apiList = await assigneesApi();
  console.log(`  (dữ liệu: ${apiList.length} người có thể được giao — ${apiList.map((a) => `${a.name} [${a.roleLabel}]`).join(", ")})`);

  // ---- biểu thức dùng chung ----
  const OWNER = "document.getElementById('owner-card')";
  const OPENER = `${OWNER}.querySelector('[data-action="pick-handler"]')`;
  const CLEAR = `${OWNER}.querySelector('[data-action="clear-handler"]')`;
  const ownerState = (p) =>
    p.ev(`(() => {
      const el = ${OWNER};
      const t = (x) => (x ? x.textContent.replace(/\\s+/g, " ").trim() : null);
      return {
        hidden: el.hidden, shown: el.getClientRects().length > 0,
        prev: el.previousElementSibling?.className ?? null, next: el.nextElementSibling?.id ?? null, inSide: !!el.closest('.form-side'),
        nextLop: el.nextElementSibling?.className ?? null, loiTrongThanh: !!el.nextElementSibling?.querySelector('#save-error'),
        title: t(el.querySelector('h2')), chip: t(el.querySelector('.chip')), chipClass: el.querySelector('.chip')?.className ?? null,
        text: t(el.querySelector('.owner-text')), name: t(el.querySelector('.owner-name')), role: t(el.querySelector('.owner-role')),
        buttons: [...el.querySelectorAll('button')].map((b) => ({ text: b.innerText.replace(/\\s+/g, " ").trim(), type: b.type, label: b.getAttribute('aria-label') })),
        focus: document.activeElement?.dataset?.action ?? document.activeElement?.tagName ?? null,
        border: getComputedStyle(el).borderTopWidth,
      };
    })()`);
  const sheetState = (p) =>
    p.ev(`(() => {
      const root = document.querySelector('.assignee-root');
      if (!root) return null;
      const d = root.querySelector('[role="dialog"]');
      const t = (x) => (x ? x.textContent.replace(/\\s+/g, " ").trim() : null);
      const none = root.querySelector('.assignee-none');
      const r = d.getBoundingClientRect();
      return {
        ariaModal: d.getAttribute('aria-modal'), title: t(document.getElementById(d.getAttribute('aria-labelledby'))),
        bgInert: [...document.body.children].filter((c) => c !== root).every((c) => c.inert), focusIn: d.contains(document.activeElement),
        placeholder: root.querySelector('input.assignee-search')?.placeholder ?? null,
        none: none ? { text: t(none), chip: t(none.querySelector('.chip')), pressed: none.getAttribute('aria-pressed'), check: !!none.querySelector('svg'), h: Math.round(none.getBoundingClientRect().height) } : null,
        groups: [...root.querySelectorAll('.assignee-group')].map((g) => ({ label: t(g.querySelector('.assignee-group-label')), people: [...g.querySelectorAll('.assignee-person')].map((b) => ({ name: t(b), id: b.dataset.staffId, pressed: b.getAttribute('aria-pressed'), check: !!b.querySelector('svg') })) })),
        empty: t(root.querySelector('.assignee-empty')),
        buttons: [...root.querySelectorAll('button')].map(t),
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }, vw: innerWidth, vh: innerHeight,
      };
    })()`);
  const assigneeCalls = (p) => p.requests.filter((r) => r.url.includes("/api/dispatch/assignees")).length;
  const writeCalls = (p) => p.requests.filter((r) => r.method !== "GET" && r.url.includes("/api/"));
  const orderPosts = (p) => p.requests.filter((r) => r.method === "POST" && new URL(r.url).pathname === "/api/orders").map((r) => JSON.parse(r.postData));
  const openSheet = async (p) => {
    await p.ev(`${OPENER}.click(); true`);
    await p.waitFor("!!document.querySelector('.assignee-root.open .assignee-none')", "bảng chọn mở + danh sách tải xong", 10000);
  };
  const waitClosed = (p) => p.waitFor("!document.querySelector('.assignee-root')", "bảng chọn đã đóng");
  const personBtn = (id) => `document.querySelector('.assignee-root .assignee-person[data-staff-id="${id}"]')`;

  /** Điền đủ form để lưu được: ngày đi, TD101 × 2 người lớn, tên + SĐT khách. */
  const CARD = "[...document.querySelectorAll('#services .svc')].find((c) => c.querySelector('.svc-name')?.textContent === 'Tour 4 đảo Nha Trang')";
  const fillForm = async (p, customer) => {
    await p.waitFor("!!document.getElementById('catalog-q')", "form dựng xong");
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.waitFor("/TD101/.test(document.getElementById('catalog-list')?.textContent ?? '')", "ô tìm danh mục hiện TD101", 10000);
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`!!(${CARD})`, "thẻ Tour 4 đảo Nha Trang");
    await p.ev(setInput(`(${CARD}).querySelector('.counter-field[aria-label="Người lớn"]')`, "2"));
    await p.ev(setInput("document.getElementById('customerName')", customer));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912 345 678"));
    await sleep(200);
  };
  const saveAndWaitOrder = async (p) => {
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order'", "đã lưu, sang trang đơn", 15000);
    return new URL(await p.ev("location.href")).searchParams.get("id");
  };
  const handlerOfOrder = async (orderId) => {
    const r = await call(ACCOUNTS.salesA, "GET", `/api/dispatch/handlers?orderIds=${orderId}`);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return r.json.handlers[orderId];
  };

  // ==================================================================================================
  // Bán hàng — điện thoại 390 (mọi trang Bán hàng mở TRƯỚC trang Đối tác / Thực tập)
  // ==================================================================================================
  let p = await openAs(ACCOUNTS.salesA, "/order-form", MOB);
  await p.waitFor(`!${OWNER}.hidden && !!${OPENER}`, "khối Người phụ trách dựng xong", 10000);

  await step("1", "Bán hàng 390: khối “Người phụ trách” ở CUỐI form — ngay sau “Tóm tắt”, ngay trước vùng nút Lưu; chưa chọn: chip “Chờ nhận” + câu “Chưa chọn ai — …” + nút “Chọn người phụ trách” (type=button); viền nhấn 2px; CHƯA gọi /api/dispatch/assignees" + axeNote(), async () => {
    const s = await ownerState(p);
    assert.equal(s.hidden, false);
    assert.equal(s.shown, true);
    assert.equal(s.inSide, true, "khối nằm trong cột phải (.form-side)");
    assert.match(s.prev, /summary-card/, `ngay sau thẻ Tóm tắt — ${s.prev}`);
    // Thiết kế lại 18/10 (Việc 8, sửa CÓ CHỦ ĐÍCH): dải lỗi lưu nay nằm TRONG vùng nút Lưu (ngay trên nút Lưu) — khối đứng ngay trước vùng đó (trước: ngay trước #save-error rồi mới tới vùng nút).
    assert.match(s.nextLop ?? "", /form-actions/, `ngay trước vùng nút Lưu — ${s.nextLop}`);
    assert.equal(s.loiTrongThanh, true, "dải lỗi lưu nằm trong vùng nút Lưu");
    assert.equal(s.title, "Người phụ trách");
    assert.equal(s.chip, "Chờ nhận");
    assert.match(s.chipClass, /chip-warn/);
    assert.equal(s.text, "Chưa chọn ai — hướng dẫn viên nào cũng bấm Nhận được.");
    assert.deepEqual(s.buttons.map((b) => [b.text, b.type]), [["Chọn người phụ trách", "button"]]);
    assert.equal(s.border, "2px");
    // Thiết kế lại 18/10 (Việc 8, sửa CÓ CHỦ ĐÍCH): điện thoại không còn khối Tóm tắt (tiền ở thanh dính cuối trang) — kiểm "Tóm tắt không hiện" thay cho "khối đứng sau Tóm tắt".
    const order = await p.ev("(() => { const o = document.getElementById('owner-card').getBoundingClientRect(); const pay = [...document.querySelectorAll('.form-main > .card')].at(-1).getBoundingClientRect(); return { afterPay: o.top >= pay.bottom, tomTatAn: document.querySelector('.summary-card').getClientRects().length === 0 }; })()");
    assert.deepEqual(order, { afterPay: true, tomTatAn: true }, "trên điện thoại: khối đứng sau Thanh toán; khối Tóm tắt không hiện");
    assert.equal(assigneeCalls(p), 0, "không gọi danh sách trước khi mở bảng");
    assert.equal(await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1"), true, "không tràn ngang");
    await p.ev("document.getElementById('owner-card').scrollIntoView({ block: 'center' }); true");
    await shotView(p, "chon-hdv-khoi-trong-390.png");
    await axe(p, "form 390, khối chưa chọn");
  });

  await step("2", "Không chọn ai → Lưu: thân POST /api/orders KHÔNG có handlerStaffId, đơn tạo được và ở trạng thái “Chờ nhận” (không có người phụ trách)", async () => {
    await fillForm(p, "Khách Không Chọn HDV");
    const id = await saveAndWaitOrder(p);
    const bodies = orderPosts(p);
    assert.equal(bodies.length, 1, JSON.stringify(bodies));
    assert.equal("handlerStaffId" in bodies[0], false, `không gửi trường khi chưa chọn — ${JSON.stringify(Object.keys(bodies[0]))}`);
    assert.equal(await handlerOfOrder(id), null, "đơn chưa có người phụ trách");
    assert.deepEqual(p.consoleErrors, []);
    p.close();
  });

  p = await openAs(ACCOUNTS.salesA, "/order-form", MOB);
  await p.waitFor(`!${OWNER}.hidden && !!${OPENER}`, "khối Người phụ trách dựng xong", 10000);

  await step("3", "Mở bảng (390): role=dialog + aria-modal, nền inert, focus trong bảng; danh sách gọi ĐÚNG lúc mở (1 lần); dòng đầu “Chờ nhận · Chưa chọn ai” có ✓; nhóm theo đúng thứ tự thiết kế Hướng dẫn viên → Bán hàng → Quản trị, người trong nhóm giữ thứ tự máy chủ; hàng cao 52px" + axeNote(), async () => {
    assert.equal(assigneeCalls(p), 0);
    await openSheet(p);
    assert.equal(assigneeCalls(p), 1, "gọi /api/dispatch/assignees khi mở bảng");
    const s = await sheetState(p);
    assert.equal(s.ariaModal, "true");
    assert.equal(s.title, "Chọn người phụ trách");
    assert.equal(s.bgInert, true, "phần nền inert");
    assert.equal(s.focusIn, true, "focus ở trong bảng");
    assert.equal(s.placeholder, "Tìm theo tên");
    assert.deepEqual([s.none.text, s.none.chip, s.none.pressed, s.none.check], ["Chờ nhận Chưa chọn ai", "Chờ nhận", "true", true]);
    assert.equal(s.none.h, 52, "hàng cao 52px như bản thiết kế");
    const expected = ["Hướng dẫn viên", "Bán hàng", "Quản trị"].map((label) => ({ label, ids: apiList.filter((a) => a.roleLabel === label).map((a) => a.staffId) })).filter((g) => g.ids.length);
    assert.deepEqual(s.groups.map((g) => ({ label: g.label, ids: g.people.map((x) => x.id) })), expected, JSON.stringify(s.groups));
    assert.ok(s.groups[0].people.some((x) => x.id === hdv1.id) && s.groups[0].people.some((x) => x.id === hdv2.id), "hai HDV ở nhóm đầu");
    assert.ok(s.groups.every((g) => g.people.every((x) => x.pressed === "false" && !x.check)), "chưa ai được chọn");
    assert.ok(!s.buttons.some((b) => /^Lưu/.test(b ?? "")), `bảng KHÔNG có nút Lưu riêng — ${JSON.stringify(s.buttons)}`);
    assert.ok(s.rect.bottom >= s.vh - 1 && s.rect.left <= 0 && s.rect.right >= s.vw, `điện thoại: bảng trượt từ đáy, hết bề ngang — ${JSON.stringify(s.rect)}`);
    await shotView(p, "chon-hdv-bang-390.png");
    await axe(p, "bảng chọn 390");
  });

  await step("4", "Tìm theo tên đã bỏ dấu, lọc CỤC BỘ: “tam” → chỉ Nguyễn Minh Tâm; “NGUYEN minh” → như trên; “Phúc” → Lê Hoàng Phúc; “zzz” → “Không tìm thấy ai tên “zzz”.” (dòng “Chưa chọn ai” vẫn còn); không gọi lại API", async () => {
    const SEARCH = "document.querySelector('.assignee-root input.assignee-search')";
    const only = async (q, ids) => {
      await p.ev(setInput(SEARCH, q));
      const s = await sheetState(p);
      assert.deepEqual(s.groups.flatMap((g) => g.people.map((x) => x.id)), ids, `“${q}” → ${JSON.stringify(s.groups)}`);
      assert.ok(s.none, `“${q}”: dòng “Chưa chọn ai” vẫn còn`);
      return s;
    };
    const s1 = await only("tam", [hdv1.id]);
    assert.equal(s1.groups[0].label, "Hướng dẫn viên");
    await only("NGUYEN minh", [hdv1.id]);
    await only("Phúc", [hdv2.id]);
    const s4 = await only("zzz", []);
    assert.equal(s4.empty, "Không tìm thấy ai tên “zzz”.");
    await shotView(p, "chon-hdv-tim-khong-thay-390.png");
    const everyone = ["Hướng dẫn viên", "Bán hàng", "Quản trị"].flatMap((label) => apiList.filter((a) => a.roleLabel === label).map((a) => a.staffId));
    await only("", everyone); // xoá chữ tìm → đủ mọi người trở lại, đúng thứ tự nhóm
    assert.equal(assigneeCalls(p), 1, "gõ tìm KHÔNG gọi lại API");
  });

  await step("5", "Esc / chạm nền / ✕ đều đóng bảng KHÔNG chọn gì, focus về nút “Chọn người phụ trách”, khối vẫn “Chờ nhận”", async () => {
    await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
    await waitClosed(p);
    assert.equal((await ownerState(p)).focus, "pick-handler", "Esc: focus về nút mở");
    await openSheet(p);
    await p.ev("document.querySelector('.assignee-root .sheet-scrim').click(); true");
    await waitClosed(p);
    assert.equal((await ownerState(p)).focus, "pick-handler", "chạm nền: focus về nút mở");
    await openSheet(p);
    await p.ev("document.querySelector('.assignee-root .assignee-close').click(); true");
    await waitClosed(p);
    const s = await ownerState(p);
    assert.equal(s.focus, "pick-handler", "✕: focus về nút mở");
    assert.equal(s.chip, "Chờ nhận");
    assert.equal(await p.ev("[...document.body.children].some((c) => c.inert)"), false, "đóng xong gỡ inert");
  });

  await step("6", "Chọn Nguyễn Minh Tâm → bảng đóng NGAY; khối hiện “HDV: Nguyễn Minh Tâm” + “Hướng dẫn viên” + “Đổi”, nút riêng “Bỏ chọn — để Chờ nhận”, hết chip “Chờ nhận”; focus vào nút “Đổi”; KHÔNG có lời gọi ghi nào; mở lại thấy ✓ ở đúng người" + axeNote(), async () => {
    await openSheet(p);
    await p.ev(`${personBtn(hdv1.id)}.click(); true`);
    await waitClosed(p);
    const s = await ownerState(p);
    assert.equal(s.chip, null, "hết chip Chờ nhận");
    assert.equal(s.name, `HDV: ${HDV1.name}`);
    assert.equal(s.role, "Hướng dẫn viên");
    assert.deepEqual(s.buttons.map((b) => [b.text, b.type]), [[`HDV: ${HDV1.name} Hướng dẫn viên Đổi`, "button"], ["Bỏ chọn — để Chờ nhận", "button"]]);
    assert.equal(s.buttons[0].label, `Đổi người phụ trách, đang chọn ${HDV1.name}`);
    assert.equal(s.focus, "pick-handler", "focus vào nút “Đổi” vừa dựng");
    assert.deepEqual(writeCalls(p), [], "chọn trong form KHÔNG gọi API ghi");
    await p.ev("document.getElementById('owner-card').scrollIntoView({ block: 'center' }); true");
    await shotView(p, "chon-hdv-da-chon-390.png");
    await axe(p, "form 390, đã chọn HDV");
    await openSheet(p);
    const sh = await sheetState(p);
    const me = sh.groups.flatMap((g) => g.people).find((x) => x.id === hdv1.id);
    assert.deepEqual([me.pressed, me.check], ["true", true], "người đang chọn có ✓");
    assert.deepEqual([sh.none.pressed, sh.none.check], ["false", false]);
    assert.ok(sh.groups.flatMap((g) => g.people).filter((x) => x.id !== hdv1.id).every((x) => x.pressed === "false" && !x.check));
    await shotView(p, "chon-hdv-bang-da-chon-390.png");
    await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
    await waitClosed(p);
  });

  await step("7", "“Bỏ chọn — để Chờ nhận” → về trạng thái chưa chọn, focus vào “Chọn người phụ trách”; chọn “Chưa chọn ai” trong bảng cũng xoá lựa chọn", async () => {
    await p.ev(`${CLEAR}.click(); true`);
    let s = await ownerState(p);
    assert.deepEqual([s.chip, s.name, s.focus], ["Chờ nhận", null, "pick-handler"]);
    assert.deepEqual(s.buttons.map((b) => b.text), ["Chọn người phụ trách"]);
    await openSheet(p);
    await p.ev(`${personBtn(hdv2.id)}.click(); true`);
    await waitClosed(p);
    assert.equal((await ownerState(p)).name, `HDV: ${HDV2.name}`);
    await openSheet(p);
    await p.ev("document.querySelector('.assignee-root .assignee-none').click(); true");
    await waitClosed(p);
    s = await ownerState(p);
    assert.deepEqual([s.chip, s.name, s.focus], ["Chờ nhận", null, "pick-handler"]);
  });

  await step("8", "Chọn Nguyễn Minh Tâm rồi Lưu: thân POST có handlerStaffId = mã tài khoản HDV; đơn có người phụ trách là HDV; hiện NGAY ở “Việc của tôi” của HDV (GET /api/dispatch/mine bằng phiên của HDV)", async () => {
    await openSheet(p);
    await p.ev(`${personBtn(hdv1.id)}.click(); true`);
    await waitClosed(p);
    await fillForm(p, "Khách Có HDV");
    const id = await saveAndWaitOrder(p);
    const bodies = orderPosts(p);
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].handlerStaffId, hdv1.id, JSON.stringify(bodies[0]));
    const handler = await handlerOfOrder(id);
    assert.equal(handler?.staffId, hdv1.id, JSON.stringify(handler));
    // Chỉ kiểm khối "Người phụ trách" ở trang đơn có TÊN đúng người vừa chọn (hộp thoại xác nhận `moi=1` đang mở, nền inert — DOM vẫn đọc được).
    // KHÔNG kiểm chữ có tiền tố "HDV: " hay không — điều phối đã ra ruling (2026-09-28): trang đơn giữ tên trần dưới tiêu đề mục "Người phụ trách"
    // (khác danh sách/thẻ đơn, nơi tiêu đề "HDV: <tên>" cần tự giải thích trong một dòng gọn) — xem sổ điều phối, không phải thiếu sót cần sửa.
    await p.waitFor(`(document.querySelector('.handler-name')?.textContent ?? '').includes(${JSON.stringify(HDV1.name)})`, "trang đơn: khối Người phụ trách hiện tên HDV", 10000);
    const mine = await call(HDV1, "GET", "/api/dispatch/mine");
    assert.equal(mine.status, 200, JSON.stringify(mine.json));
    assert.ok(mine.json.assignments.some((a) => a.orderId === id || a.id === id), `đơn ${id} có trong Việc của tôi của HDV: ${JSON.stringify(mine.json.assignments.map((a) => a.orderId ?? a.id))}`);
    assert.deepEqual(p.consoleErrors, []);
    p.close();
  });

  p = await openAs(ACCOUNTS.salesA, "/order-form", MOB);
  await p.waitFor(`!${OWNER}.hidden && !!${OPENER}`, "khối Người phụ trách dựng xong", 10000);

  await step("9", "Người được chọn vừa NGHỈ giữa lúc điền form → Lưu: 400 invalid_assignee — banner đúng lời máy chủ + cách sửa, KHÔNG có đơn mới, vẫn ở form, dữ liệu đã gõ + lựa chọn còn nguyên; bỏ chọn → banner tự gỡ, lưu được (Chờ nhận)" + axeNote(), async () => {
    await fillForm(p, "Khách Người Nghỉ");
    await openSheet(p);
    await p.ev(`${personBtn(hdv2.id)}.click(); true`);
    await waitClosed(p);
    env.sql(`UPDATE staff SET active = 0 WHERE id = '${hdv2.id}'`);
    const before = orderCount();
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("!document.getElementById('save-error').hidden && document.getElementById('save').textContent !== 'Đang lưu…'", "banner lỗi lưu", 15000);
    const b = await p.ev("(() => { const el = document.getElementById('save-error'); return { title: el.querySelector('.banner-title')?.textContent, lines: [...el.querySelectorAll('.banner-lines li')].map((li) => li.textContent), cls: el.className, inert: document.getElementById('order-form').inert, saveDisabled: document.getElementById('save').disabled }; })()");
    assert.deepEqual(b, { title: DEAD_MSG, lines: [FIX_LINE], cls: "banner banner-danger", inert: false, saveDisabled: false });
    assert.equal(await p.ev("location.pathname"), "/order-form", "vẫn ở form");
    assert.equal(orderCount(), before, "KHÔNG có đơn mới");
    const kept = await p.ev(`({ name: document.getElementById('customerName').value, phone: document.getElementById('customerPhone').value, card: !!(${CARD}), date: document.getElementById('orderDate').value })`);
    assert.deepEqual(kept, { name: "Khách Người Nghỉ", phone: "0912 345 678", card: true, date: vnDate(3) }, "dữ liệu đã gõ còn nguyên");
    assert.equal((await ownerState(p)).name, `HDV: ${HDV2.name}`, "lựa chọn còn nguyên để người dùng thấy mình đã chọn ai");
    const body = orderPosts(p).at(-1);
    assert.equal(body.handlerStaffId, hdv2.id);
    await p.ev("document.getElementById('save-error').scrollIntoView({ block: 'center' }); true");
    await shotView(p, "chon-hdv-loi-nguoi-nghi-390.png");
    await axe(p, "form 390, lỗi người được chọn đã nghỉ");
    await p.ev(`${CLEAR}.click(); true`);
    assert.equal(await p.ev("document.getElementById('save-error').hidden"), true, "bỏ chọn → banner về người cũ tự gỡ");
    const id = await saveAndWaitOrder(p);
    assert.equal("handlerStaffId" in orderPosts(p).at(-1), false);
    assert.equal(await handlerOfOrder(id), null);
    assert.equal(orderCount(), before + 1);
    env.sql(`UPDATE staff SET active = 1 WHERE id = '${hdv2.id}'`);
    assert.deepEqual(p.consoleErrors.filter((e) => !/status of 400/.test(e)), [], `lỗi console: ${p.consoleErrors}`);
    p.close();
  });

  // ==================================================================================================
  // Bán hàng — máy tính 1040
  // ==================================================================================================
  await step("10", "Máy tính 1040×900: khối ở CỘT PHẢI (cạnh nút Lưu), sau Tóm tắt; nút Lưu trong khung nhìn khi ở đầu trang (cả 1040×768); bảng chọn là hộp GIỮA màn hình; chọn → khối cập nhật" + axeNote(), async () => {
    const d = await openAs(ACCOUNTS.salesA, "/order-form", DESK);
    await d.waitFor(`!${OWNER}.hidden && !!${OPENER}`, "khối Người phụ trách dựng xong (máy tính)", 10000);
    const lay = await d.ev(`(() => { const m = document.querySelector('.form-main').getBoundingClientRect(); const o = document.getElementById('owner-card').getBoundingClientRect(); const s = document.getElementById('save').getBoundingClientRect(); const sum = document.querySelector('.summary-card').getBoundingClientRect();
      return { rightCol: o.left >= m.right - 1, afterSum: o.top >= sum.bottom, beforeSave: o.bottom <= s.top, saveInView: s.top >= 0 && s.bottom <= innerHeight, saveBottom: Math.round(s.bottom), vh: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }; })()`);
    assert.deepEqual([lay.rightCol, lay.afterSum, lay.beforeSave, lay.saveInView], [true, true, true, true], JSON.stringify(lay));
    assert.ok(lay.overflow <= 0, "không tràn ngang");
    await shotFull(d, "chon-hdv-khoi-1040.png");
    await axe(d, "form 1040, khối chưa chọn");
    await openSheet(d);
    const s = await sheetState(d);
    assert.ok(s.rect.top > 0 && s.rect.bottom < s.vh && s.rect.left > 0 && s.rect.right < s.vw, `máy tính: hộp giữa màn hình — ${JSON.stringify(s.rect)}`);
    assert.ok(Math.abs((s.rect.left + s.rect.right) / 2 - s.vw / 2) <= 2, `căn giữa ngang — ${JSON.stringify(s.rect)}`);
    await shotView(d, "chon-hdv-bang-1040.png");
    await axe(d, "bảng chọn 1040");
    await d.ev(`${personBtn(hdv1.id)}.click(); true`);
    await d.waitFor("!document.querySelector('.assignee-root')", "bảng chọn đóng (máy tính)");
    const st = await ownerState(d);
    assert.deepEqual([st.name, st.role, st.focus], [`HDV: ${HDV1.name}`, "Hướng dẫn viên", "pick-handler"]);
    const inView = await d.ev("(() => { const s = document.getElementById('save').getBoundingClientRect(); return s.top >= 0 && s.bottom <= innerHeight; })()");
    assert.equal(inView, true, "đã chọn (khối cao hơn): nút Lưu vẫn trong khung nhìn");
    await shotFull(d, "chon-hdv-da-chon-1040.png");
    assert.deepEqual(d.consoleErrors, []);
    d.close();
    const short = await openAs(ACCOUNTS.salesA, "/order-form", DESK_SHORT);
    await short.waitFor(`!${OWNER}.hidden && !!${OPENER}`, "khối (1040×768)", 10000);
    const v = await short.ev("(() => { const s = document.getElementById('save').getBoundingClientRect(); return { inView: s.top >= 0 && s.bottom <= innerHeight, bottom: Math.round(s.bottom), vh: innerHeight }; })()");
    assert.equal(v.inView, true, `1040×768: nút Lưu trong khung nhìn — ${JSON.stringify(v)}`);
    // Trường hợp cao nhất của cột phải dính: ĐÃ chọn người (khối cao hơn) + bấm Lưu khi form trống → banner lỗi nhiều dòng ở cột phải. Banner và nút
    // Lưu đều phải nằm trọn trong khung nhìn (order-form.ts: ≥ 960px banner ở cột dính "luôn thấy").
    await short.ev(`${OPENER}.click(); true`);
    await short.waitFor("!!document.querySelector('.assignee-root.open .assignee-none')", "bảng chọn (1040×768)", 10000);
    await short.ev(`${personBtn(hdv1.id)}.click(); true`);
    await short.waitFor("!document.querySelector('.assignee-root')", "bảng chọn đóng (1040×768)");
    await short.ev("document.getElementById('save').click(); true");
    await short.waitFor("!document.getElementById('save-error').hidden", "banner kiểm phía trình duyệt (1040×768)");
    await sleep(300);
    const tall = await short.ev(`(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); const e = r('save-error'); const s = r('save'); const o = r('owner-card');
      return { lines: document.querySelectorAll('#save-error .banner-lines li').length, errIn: e.top >= 0 && e.bottom <= innerHeight, saveIn: s.top >= 0 && s.bottom <= innerHeight, scrollY: Math.round(scrollY), ownerTop: Math.round(o.top), errBottom: Math.round(e.bottom), saveBottom: Math.round(s.bottom), vh: innerHeight }; })()`);
    console.log("    1040×768 sau Lưu lỗi:", JSON.stringify(tall));
    assert.ok(tall.lines >= 3, `banner nhiều dòng — ${JSON.stringify(tall)}`);
    assert.deepEqual([tall.errIn, tall.saveIn], [true, true], `1040×768, đã chọn + banner lỗi: banner và nút Lưu đều trong khung nhìn — ${JSON.stringify(tall)}`);
    await shotView(short, "chon-hdv-da-chon-loi-1040x768.png");
    assert.deepEqual(short.consoleErrors, []);
    short.close();
  });

  // ==================================================================================================
  // Đối tác thuần, rồi Thực tập (mở SAU CÙNG — kho cookie chung)
  // ==================================================================================================
  await step("11", "Đối tác thuần (390): khối “Người phụ trách” KHÔNG hiện (không phải hiện rồi báo lỗi), không gọi /api/dispatch/assignees; form vẫn dùng được", async () => {
    const q = await openAs(PARTNER, "/order-form", MOB);
    await q.waitFor("!!document.getElementById('catalog-q') && document.getElementById('save').textContent === 'Lưu, chờ xác nhận'", "form Đối tác dựng xong", 10000);
    await sleep(500);
    const s = await ownerState(q);
    assert.deepEqual([s.hidden, s.shown, s.buttons.length], [true, false, 0], JSON.stringify(s));
    assert.equal(assigneeCalls(q), 0);
    assert.equal(await q.ev("document.getElementById('save').disabled"), false);
    assert.deepEqual(q.consoleErrors, []);
    q.close();
  });

  await step("12", "Thực tập (390, trang mở SAU CÙNG): khối “Người phụ trách” KHÔNG hiện, không gọi /api/dispatch/assignees" + axeNote(), async () => {
    const q = await openAs(INTERN, "/order-form", MOB);
    await q.waitFor("!!document.getElementById('catalog-q') && document.getElementById('save').textContent === 'Lưu, chờ xác nhận'", "form Thực tập dựng xong", 10000);
    await sleep(500);
    const s = await ownerState(q);
    assert.deepEqual([s.hidden, s.shown, s.buttons.length], [true, false, 0], JSON.stringify(s));
    assert.equal(assigneeCalls(q), 0);
    await shotFull(q, "chon-hdv-thuc-tap-390.png");
    await axe(q, "form 390 Thực tập");
    assert.deepEqual(q.consoleErrors, []);
    q.close();
  });
} finally {
  for (const pg of pages) {
    try {
      pg.close();
    } catch {
      /* đã đóng */
    }
  }
  await env.stop();
}
console.log(`\n${passed} bước ✓, ${failures} bước ✗${AXE ? "" : " — CHƯA chạy axe (thiếu AXE_JS)"}`);
process.exit(failures ? 1 : 0);
