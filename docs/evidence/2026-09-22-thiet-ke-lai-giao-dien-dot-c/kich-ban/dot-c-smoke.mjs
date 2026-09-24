// Kịch bản Chrome cho Đợt C (Task 4): phủ bố cục 2 cột mới ở 3 trang chưa từng có kịch bản riêng — Đăng nhập (/login),
// Tôi (/account), Góp ý (/feedback) — ở khổ máy tính (≥900px) và điện thoại (<900px). Dùng lại NGUYÊN cơ chế CDP của A2
// (startEnv()/ACCOUNTS/ok từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs) và mẫu cấu trúc của ../../2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs
// Ghi ảnh vào docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/anh/*.png.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

/** axe-core: 0 vi phạm mức critical/serious (đúng ngưỡng dot-a-smoke.mjs đã dùng). */
const axe = async (p, label) => {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(
    `axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`,
  );
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};

const write = (name, r) => writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
const shot = async (p, name) => write(name, await p.send("Page.captureScreenshot", { format: "png" }));

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  // ==================================================================================================
  // 1) Đăng nhập (/login) — không đăng nhập trước. Bản thiết kế "Đăng nhập v2" (2026-09-24) BỎ cột thương hiệu
  //    Đợt C: một cột giữa (.login-col) ở CẢ HAI khổ, không cuộn ngang; form vẫn dùng được (#phone/#pin có mặt
  //    và HIỆN thật, không chỉ có trong DOM).
  // ==================================================================================================
  {
    const measureLogin = (p) =>
      p.ev(`(() => {
        const col = document.querySelector('.login-col');
        const phone = document.querySelector('.login-col #phone');
        const pin = document.querySelector('.login-col #pin');
        return {
          brandGone: document.querySelector('.login-brand') === null,
          colHasForm: col !== null && col.querySelector('#login-form') !== null,
          colWidthOk: col !== null && col.getBoundingClientRect().width <= 360,
          noHScroll: document.documentElement.scrollWidth <= window.innerWidth,
          phoneUsable: phone !== null && phone.offsetParent !== null && !phone.disabled,
          pinUsable: pin !== null && pin.offsetParent !== null && !pin.disabled,
        };
      })()`);
    const expectOne = { brandGone: true, colHasForm: true, colWidthOk: true, noHScroll: true, phoneUsable: true, pinUsable: true };

    let p = await env.openPage(DESK);
    await p.send("Page.navigate", { url: env.base + "/login" });
    await p.waitFor("document.readyState === 'complete'", "trang /login tải xong (máy tính)");
    await p.waitFor("!!document.querySelector('#phone')", "form đăng nhập đã dựng (máy tính)");
    assert.deepEqual(await measureLogin(p), expectOne, "Đăng nhập (máy tính): một cột giữa, không cột thương hiệu, không cuộn ngang, form dùng được");
    assert.deepEqual(p.consoleErrors, [], `lỗi console (đăng nhập máy tính): ${p.consoleErrors}`);
    await shot(p, "dang-nhap-may-tinh.png");
    await axe(p, "đăng nhập máy tính");
    p.close();
    ok("Đăng nhập (máy tính, 1040×800): một cột giữa, form dùng được, axe không vi phạm critical/serious");

    p = await env.openPage(MOB);
    await p.send("Page.navigate", { url: env.base + "/login" });
    await p.waitFor("document.readyState === 'complete'", "trang /login tải xong (điện thoại)");
    await p.waitFor("!!document.querySelector('#phone')", "form đăng nhập đã dựng (điện thoại)");
    assert.deepEqual(await measureLogin(p), expectOne, "Đăng nhập (điện thoại): một cột giữa, không cuộn ngang, form dùng được");
    assert.deepEqual(p.consoleErrors, [], `lỗi console (đăng nhập điện thoại): ${p.consoleErrors}`);
    await shot(p, "dang-nhap-dien-thoai.png");
    await axe(p, "đăng nhập điện thoại");
    p.close();
    ok("Đăng nhập (điện thoại, 390×844): một cột giữa, form dùng được, axe không vi phạm critical/serious");
  }

  // ==================================================================================================
  // 2) Tôi (/account) — đăng nhập ACCOUNTS.admin, và đặt admin vào mnt_setting.allowed_phones (như
  //    v1-bao-tri.mjs đã làm) để mục Chế độ bảo trì thật sự hiện ra (canToggle=true), đủ mọi khối.
  //    Máy tính: .account-layout là grid, #maintenance ở cột phải (grid-column:2), thứ tự DOM gốc
  //    #me,#myjobs,#links,#maintenance,#pin-form. Điện thoại: .account-layout là block, không tràn ngang.
  // ==================================================================================================
  {
    env.sql(`UPDATE mnt_setting SET allowed_phones = '${ACCOUNTS.admin.phone}' WHERE id = 'default'`);

    const measureAccount = (p) =>
      p.ev(`(() => {
        const layout = document.querySelector('.account-layout');
        const order = [...layout.children].map((el) => el.id);
        const me = document.querySelector('#me');
        const maint = document.querySelector('#maintenance');
        return {
          layoutDisplay: getComputedStyle(layout).display,
          domOrder: order,
          meColumn: me ? getComputedStyle(me).gridColumnStart : null,
          maintColumn: maint ? getComputedStyle(maint).gridColumnStart : null,
          maintHidden: maint ? maint.hidden : null,
          scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      })()`);

    let p = await env.as(ACCOUNTS.admin, "/account", DESK);
    await p.waitFor("!!document.querySelector('#maintenance') && !document.querySelector('#maintenance').hidden", "mục Chế độ bảo trì hiện (máy tính)");
    let m = await measureAccount(p);
    assert.equal(m.layoutDisplay, "grid", `Tôi (máy tính): .account-layout phải display:grid — ${JSON.stringify(m)}`);
    assert.deepEqual(m.domOrder, ["me", "myjobs", "links", "maintenance", "passkeys", "pin-form"], `Tôi (máy tính): thứ tự DOM gốc phải giữ nguyên — ${JSON.stringify(m)}`);
    assert.equal(m.maintHidden, false, `Tôi (máy tính): #maintenance phải HIỆN (canToggle=true) — ${JSON.stringify(m)}`);
    assert.equal(m.meColumn, "1", `Tôi (máy tính): #me phải ở cột trái (grid-column 1) — ${JSON.stringify(m)}`);
    assert.equal(m.maintColumn, "2", `Tôi (máy tính): #maintenance phải ở cột phải (grid-column 2) — ${JSON.stringify(m)}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (Tôi máy tính): ${p.consoleErrors}`);
    await shot(p, "toi-may-tinh.png");
    await axe(p, "Tôi máy tính");
    p.close();
    ok("Tôi (máy tính, 1040×800): .account-layout là grid, #maintenance ở cột phải, thứ tự DOM gốc, axe không vi phạm critical/serious");

    p = await env.as(ACCOUNTS.admin, "/account", MOB);
    await p.waitFor("!!document.querySelector('#maintenance') && !document.querySelector('#maintenance').hidden", "mục Chế độ bảo trì hiện (điện thoại)");
    m = await measureAccount(p);
    assert.equal(m.layoutDisplay, "block", `Tôi (điện thoại): .account-layout phải display:block — ${JSON.stringify(m)}`);
    assert.deepEqual(m.domOrder, ["me", "myjobs", "links", "maintenance", "passkeys", "pin-form"], `Tôi (điện thoại): thứ tự DOM gốc phải giữ nguyên — ${JSON.stringify(m)}`);
    assert.ok(m.scrollOverflow <= 1, `Tôi (điện thoại): không được tràn ngang — lệch ${m.scrollOverflow}px`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (Tôi điện thoại): ${p.consoleErrors}`);
    await shot(p, "toi-dien-thoai.png");
    await axe(p, "Tôi điện thoại");
    p.close();
    ok("Tôi (điện thoại, 390×844): .account-layout là block, không tràn ngang, axe không vi phạm critical/serious");
  }

  // ==================================================================================================
  // 3) Góp ý (/feedback?id=<id>) — đăng nhập ACCOUNTS.admin; tạo trước 1 yêu cầu qua POST /api/feedback
  //    để có id mở luồng. Máy tính: CẢ #list-card VÀ #thread đều hiện, #list-card có nội dung thật
  //    (không trống). Điện thoại: #list-card phải ẨN, chỉ #thread hiện.
  // ==================================================================================================
  {
    const created = await call(ACCOUNTS.admin, "POST", "/api/feedback", {
      kind: "QUESTION",
      title: "Kiểm bố cục 2 cột Đợt C",
      body: "Yêu cầu dựng riêng để kiểm bố cục 2 cột của trang Góp ý (kịch bản dot-c-smoke.mjs).",
      clientRequestId: crypto.randomUUID(),
      context: {},
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const id = created.json.ticket.id;

    const measureFeedback = (p) =>
      p.ev(`(() => {
        const listCard = document.querySelector('#list-card');
        const thread = document.querySelector('#thread');
        return {
          listCardHidden: listCard.hidden,
          listCardVisible: listCard.offsetParent !== null,
          threadHidden: thread.hidden,
          threadVisible: thread.offsetParent !== null,
          listContentCount: document.querySelectorAll('#list .list-row, #list p').length,
        };
      })()`);

    let p = await env.as(ACCOUNTS.admin, `/feedback?id=${id}`, DESK);
    await p.waitFor("!!document.querySelector('#thread') && !document.querySelector('#thread').hidden", "luồng đã mở (máy tính)");
    await p.waitFor("document.querySelectorAll('#list .list-row, #list p').length >= 1", "danh sách đã nạp nội dung (máy tính)");
    let m = await measureFeedback(p);
    assert.equal(m.listCardHidden, false, `Góp ý (máy tính): #list-card phải HIỆN — ${JSON.stringify(m)}`);
    assert.equal(m.listCardVisible, true, `Góp ý (máy tính): #list-card phải HIỆN thật — ${JSON.stringify(m)}`);
    assert.equal(m.threadHidden, false, `Góp ý (máy tính): #thread phải HIỆN — ${JSON.stringify(m)}`);
    assert.equal(m.threadVisible, true, `Góp ý (máy tính): #thread phải HIỆN thật — ${JSON.stringify(m)}`);
    assert.ok(m.listContentCount >= 1, `Góp ý (máy tính): #list-card phải có nội dung thật, không trống — ${JSON.stringify(m)}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (Góp ý máy tính): ${p.consoleErrors}`);
    await shot(p, "gop-y-may-tinh.png");
    await axe(p, "Góp ý máy tính (luồng mở)");
    p.close();
    ok(`Góp ý (máy tính, 1040×800): #list-card và #thread đều hiện, danh sách có ${m.listContentCount} dòng, axe không vi phạm critical/serious`);

    p = await env.as(ACCOUNTS.admin, `/feedback?id=${id}`, MOB);
    await p.waitFor("!!document.querySelector('#thread') && !document.querySelector('#thread').hidden", "luồng đã mở (điện thoại)");
    m = await measureFeedback(p);
    assert.equal(m.listCardHidden, true, `Góp ý (điện thoại): #list-card phải ẨN — ${JSON.stringify(m)}`);
    assert.equal(m.listCardVisible, false, `Góp ý (điện thoại): #list-card phải ẨN thật — ${JSON.stringify(m)}`);
    assert.equal(m.threadHidden, false, `Góp ý (điện thoại): #thread phải HIỆN — ${JSON.stringify(m)}`);
    assert.equal(m.threadVisible, true, `Góp ý (điện thoại): #thread phải HIỆN thật — ${JSON.stringify(m)}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (Góp ý điện thoại): ${p.consoleErrors}`);
    await shot(p, "gop-y-dien-thoai.png");
    await axe(p, "Góp ý điện thoại (luồng mở)");
    p.close();
    ok("Góp ý (điện thoại, 390×844): #list-card ẩn, chỉ #thread hiện, axe không vi phạm critical/serious");
  }
} finally {
  await env.stop();
}
console.log("DOT C SMOKE OK");
