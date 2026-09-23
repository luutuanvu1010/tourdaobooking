// Kiểm trang Trợ giúp + chấm đỏ bằng Chrome thật (môi trường A2: D1 tạm + wrangler dev + Chrome headless qua CDP). KHÔNG cần mạng ngoài.
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs
//   a  mỗi quyền (SALES, ACCOUNTING, ADMIN, FIELD) mở /help: đúng dòng phiên bản, đủ số bản, bản đầu là bản mới nhất, nút Góp ý đúng đích
//   b  máy tính 1040: menu trên có "Trợ giúp"; điện thoại 390: trang Tôi có dòng "Trợ giúp"; thanh tab của SALES không thêm tab
//   c  chấm đỏ: chưa xem ⇒ có ở tab Tôi + dòng Trợ giúp; mở /help ⇒ tắt; lưu bản cũ ⇒ hiện lại; lưu rác ⇒ hiện; localStorage ném lỗi ⇒ không chấm, không lỗi
//   d  console sạch, không lỗi CSP; vùng chạm ≥ 44px, không tràn ngang ở 390 và 320 trên /help
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { CHANGELOG } from "../../../../src/shared/changelog.ts";
import { APP_NAME, formatReleaseLine } from "../../../../src/shared/app-info.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-23-nhat-ky-thay-doi";
mkdirSync(join(OUT, "anh"), { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
ACCOUNTS.field = { name: "Hướng Dẫn", phone: "0900000205", pin: "246813", permissions: ["FIELD"] }; // startEnv gieo mọi ACCOUNTS vào D1 tạm

const failures = [];
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
  } catch (e) {
    failures.push(id);
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ")}`);
  }
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const reload = async (p) => {
  await p.send("Page.reload", {});
  await p.waitFor("document.readyState === 'complete'", "tải lại xong");
};
const goto = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
};
const dots = (p) => p.ev(`({ tab: !!${q("#tabbar a[href='/account'] .new-dot")}, link: !!${q("#links a[href='/help'] .new-dot")}, nav: !!${q(".topnav a[href='/help'] .new-dot")} })`);
const measure = (p) =>
  p.ev(`(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const ctl = [...document.querySelectorAll('button, a[href]')].filter(shown).filter((el) => !el.closest('.topnav'));
    return { tapDuoi44: ctl.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height)), tranNgang: document.documentElement.scrollWidth - innerWidth };
  })()`);

const env = await startEnv();
try {
  await step("a", "mỗi quyền mở /help: dòng phiên bản, đủ bản, bản đầu mới nhất, nút Góp ý", async () => {
    for (const key of ["salesA", "accounting", "admin", "field"]) {
      const p = await env.as(ACCOUNTS[key], "/help", M);
      try {
        await p.waitFor(`${q("#changelog")}?.children.length > 0`, `nhật ký hiện (${key})`, 10000);
        assert.equal(await p.ev(`${q("h1")}.textContent`), "Trợ giúp", key);
        assert.equal(await p.ev(`${q("#release")}.textContent`), `${APP_NAME} · ${formatReleaseLine()}`, key);
        assert.equal(await p.ev(`document.querySelectorAll('.release-note').length`), CHANGELOG.length, key);
        assert.match(await p.ev(`${q(".release-note h3")}.textContent`), new RegExp(`^Phiên bản ${CHANGELOG[0].version.replace(".", "\\.")} — `), key);
        assert.equal(await p.ev(`${q("main a.btn-primary")}.getAttribute('href')`), "/feedback?new=1&from=%2Fhelp", key);
        if (key === "salesA") await p.shot(join(OUT, "anh/a-tro-giup-390.png"));
      } finally {
        p.close();
      }
    }
  });

  await step("b", "đường vào: menu máy tính, dòng ở trang Tôi, thanh tab không thêm tab", async () => {
    const d = await env.as(ACCOUNTS.salesA, "/", DESK);
    try {
      await d.waitFor(`!!${q(".topnav a[href='/help']")}`, "menu có Trợ giúp", 10000);
      assert.equal((await d.ev(`${q(".topnav a[href='/help']")}.textContent`)).trim().startsWith("Trợ giúp"), true);
      await d.shot(join(OUT, "anh/b-menu-may-tinh-1040.png"));
    } finally {
      d.close();
    }
    const p = await env.as(ACCOUNTS.salesA, "/account", M);
    try {
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "trang Tôi có dòng Trợ giúp", 10000);
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('#tabbar .tab')].map((a) => a.textContent.trim())`), ["Trang chủ", "Đơn hàng", "Đơn mới", "Tôi"]);
    } finally {
      p.close();
    }
  });

  await step("c", "chấm đỏ: chưa xem, đã xem, bản cũ, rác, localStorage bị chặn", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", M);
    try {
      await p.ev("localStorage.clear(), true");
      await reload(p);
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện", 10000);
      assert.deepEqual(await dots(p), { tab: true, link: true, nav: true }, "chưa xem ⇒ có chấm");
      await p.shot(join(OUT, "anh/c-cham-do-390.png"));
      await goto(p, "/help");
      assert.equal(await p.ev("localStorage.getItem('td_help_seen')"), CHANGELOG[0].version);
      assert.equal(await p.ev(`!!${q(".release-note .badge-new")}`), true, "chưa từng xem ⇒ bản mới nhất có nhãn Mới cập nhật");
      await goto(p, "/account");
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện", 10000);
      assert.deepEqual(await dots(p), { tab: false, link: false, nav: false }, "đã xem ⇒ tắt");
      for (const stored of [CHANGELOG[1]?.version ?? "0.9", "rác"]) {
        await p.ev(`localStorage.setItem('td_help_seen', ${JSON.stringify(stored)}), true`);
        await reload(p);
        await p.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện", 10000);
        assert.deepEqual(await dots(p), { tab: true, link: true, nav: true }, `lưu "${stored}" ⇒ có chấm`);
      }
    } finally {
      p.close();
    }
    const b = await env.openPage(M);
    try {
      await b.send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(window, 'localStorage', { get() { throw new Error('bị chặn'); } });" });
      const c = await env.login(ACCOUNTS.salesA);
      await b.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
      await goto(b, "/account");
      await b.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện dù localStorage bị chặn", 10000);
      assert.deepEqual(await dots(b), { tab: false, link: false, nav: false }, "bị chặn ⇒ không chấm");
      await goto(b, "/help");
      await b.waitFor(`${q("#changelog")}?.children.length > 0`, "nhật ký vẫn hiện khi localStorage bị chặn", 10000);
      assert.deepEqual(b.consoleErrors, [], "không lỗi console khi localStorage bị chặn");
    } finally {
      b.close();
    }
  });

  await step("d", "console sạch, không CSP; vùng chạm ≥ 44px, không tràn ngang ở 390 và 320", async () => {
    for (const [label, vp] of [["390", M], ["320", NARROW]]) {
      const p = await env.as(ACCOUNTS.salesA, "/help", vp);
      try {
        await p.waitFor(`${q("#changelog")}?.children.length > 0`, `nhật ký hiện (${label})`, 10000);
        const m = await measure(p);
        assert.deepEqual([m.tapDuoi44, m.tranNgang <= 0], [[], true], `đo ${label}: ${JSON.stringify(m)}`);
        const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
        assert.deepEqual([csp.length, p.consoleErrors.length], [0, 0], `console ${label}`);
        await p.shot(join(OUT, `anh/d-tro-giup-${label}.png`));
      } finally {
        p.close();
      }
    }
  });
} finally {
  await env.stop();
}

if (failures.length) {
  console.log(`\n${failures.length} bước ✗: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nHELP SMOKE OK — mọi bước ✓");
}
