// Kiểm trang Trợ giúp + chấm đỏ bằng Chrome thật (môi trường A2: D1 tạm + wrangler dev + Chrome headless qua CDP). KHÔNG cần mạng ngoài.
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs
//   a  mỗi quyền (SALES, ACCOUNTING, ADMIN, FIELD) mở /help: đúng dòng phiên bản, đủ số bản, bản đầu là bản mới nhất, nút Góp ý đúng đích
//   b  máy tính 1040: thanh điều hướng dọc (#sidebar, nhóm TÔI) có "Trợ giúp"; điện thoại 390: trang Tôi có dòng "Trợ giúp"; thanh tab của SALES không thêm tab
//   c  chấm đỏ: chưa xem ⇒ có ở tab Tôi + dòng Trợ giúp (chấm đứng ngay sau chữ, ≤ 16px); mở /help ⇒ tắt; lưu bản cũ ⇒ hiện lại; lưu rác ⇒ hiện; localStorage ném lỗi ⇒ không chấm, không lỗi
//   d  console sạch, không lỗi CSP; vùng chạm ≥ 44px, không tràn ngang ở 390 và 320 trên /help
//   f  hướng dẫn theo vai (30/9): SALES / ACCOUNTING / FIELD / ADMIN thấy đúng nhóm; chỉ Quản trị có "Hướng dẫn các vai khác"; mở hết mục ở 320 không tràn
//   e  mất mạng (CDP giả lập offline, sau khi service worker đã lưu trang): tải lại /help vẫn đủ nhật ký + đúng dòng phiên bản (nhật ký vẽ TRƯỚC initShell)
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { CHANGELOG } from "../../../../src/shared/changelog.ts";
import { APP_NAME, formatReleaseLine } from "../../../../src/shared/app-info.ts";
import { HD_CHUNG } from "../../../../src/shared/huong-dan-chung.ts";

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
// Ảnh trang /help chụp ĐÚNG KHUNG NHÌN (Ruling R23, 2026-09-28): nhật ký thay đổi dài dần (bản 1.35: trang cao ~11.000px), `p.shot` chụp cả trang
// (captureBeyondViewport) treo Chrome headless ngay ở bước a — mọi phép kiểm vẫn đạt khi chỉ đổi cách chụp. Trang Tôi / Trang chủ (bước b, c) vẫn chụp cả trang.
const shotKhung = async (p, path) => {
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path, Buffer.from(r.result.data, "base64"));
};
const reload = async (p) => {
  await p.send("Page.reload", {});
  await p.waitFor("document.readyState === 'complete'", "tải lại xong");
};
const goto = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
};
const dots = (p) => p.ev(`({ tab: !!${q("#tabbar a[href='/account'] .new-dot")}, link: !!${q("#links a[href='/help'] .new-dot")}, nav: !!${q("#sidebar a[href='/help'] .new-dot")} })`);
// Khoảng cách ngang (px) từ cuối chữ "Trợ giúp" tới chấm đỏ trong dòng ở trang Tôi (đo chữ bằng Range, không đo cả thẻ a).
const dotGap = (p) =>
  p.ev(`(() => {
    const a = ${q("#links a[href='/help']")};
    const t = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim() === 'Trợ giúp');
    const r = document.createRange();
    r.selectNodeContents(t);
    return Math.round(a.querySelector('.new-dot').getBoundingClientRect().left - r.getBoundingClientRect().right);
  })()`);
const measure = (p) =>
  p.ev(`(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const ctl = [...document.querySelectorAll('button, a[href]')].filter(shown).filter((el) => !el.closest('#sidebar'));
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
        if (key === "salesA") await shotKhung(p, join(OUT, "anh/a-tro-giup-390.png"));
      } finally {
        p.close();
      }
    }
  });

  await step("b", "đường vào: menu máy tính, dòng ở trang Tôi, thanh tab không thêm tab", async () => {
    const d = await env.as(ACCOUNTS.salesA, "/", DESK);
    try {
      await d.waitFor(`!!${q("#sidebar a[href='/help']")}`, "menu có Trợ giúp", 10000);
      assert.equal((await d.ev(`${q("#sidebar a[href='/help']")}.textContent`)).trim().startsWith("Trợ giúp"), true);
      await d.shot(join(OUT, "anh/b-menu-may-tinh-1040.png"));
    } finally {
      d.close();
    }
    const p = await env.as(ACCOUNTS.salesA, "/account", M);
    try {
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "trang Tôi có dòng Trợ giúp", 10000);
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('#tabbar .tab')].map((a) => a.textContent.trim())`), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Tôi"]);
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
      const gap = await dotGap(p);
      assert.ok(gap >= 0 && gap <= 16, `chấm đỏ phải đứng ngay sau chữ "Trợ giúp" (khoảng cách ${gap}px, cho phép 0–16px)`);
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
      // Nút lùi: Tôi (có chấm) → bấm dòng Trợ giúp → /help → bấm nút lùi ở thanh đầu (history.back) ⇒ trang Tôi phục hồi từ bộ đệm lùi/tiến, chấm phải tắt.
      await p.ev("(window.__trangCu = true)");
      await p.ev(`${q("#links a[href='/help']")}.click(), true`);
      await p.waitFor(`location.pathname === '/help' && ${q("#changelog")}?.children.length > 0 && !!${q(".bar-back")}`, "đã sang /help qua dòng Trợ giúp", 10000);
      assert.equal(await p.ev("localStorage.getItem('td_help_seen')"), CHANGELOG[0].version, "mở /help ⇒ đã đánh dấu xem");
      await p.ev(`${q(".bar-back")}.click(), true`);
      await p.waitFor(`location.pathname === '/account' && document.readyState === 'complete' && !!${q("#links a[href='/help']")}`, "nút lùi về trang Tôi", 10000);
      assert.equal(await p.ev("window.__trangCu === true"), true, "trang Tôi phải được phục hồi từ bộ đệm lùi/tiến (đúng tình huống cần kiểm), không phải tải mới");
      assert.deepEqual(await dots(p), { tab: false, link: false, nav: false }, "quay lại bằng nút lùi sau khi xem ⇒ chấm tắt");
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
        await shotKhung(p, join(OUT, `anh/d-tro-giup-${label}.png`));
      } finally {
        p.close();
      }
    }
  });

  await step("e", "mất mạng: mở /help từ bộ nhớ đệm vẫn đọc được nhật ký (vẽ trước initShell)", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/help", M);
    try {
      await p.waitFor(`${q("#changelog")}?.children.length > 0`, "nhật ký hiện (có mạng)", 10000);
      // Lần nạp đầu service worker mới cài: chờ nó điều khiển trang, nạp lại có mạng để /help + /js/help.js vào bộ nhớ đệm.
      await p.waitFor("!!navigator.serviceWorker?.controller", "service worker điều khiển trang", 20000);
      await reload(p);
      await p.waitFor(`${q("#changelog")}?.children.length > 0`, "nhật ký hiện (có mạng, lần 2)", 10000);
      await p.waitFor(`(async () => !!(await caches.match(location.origin + '/help')) && !!(await caches.match(location.origin + '/js/help.js')) && !!(await caches.match(location.origin + '/app.css')))()`, "trang /help, help.js, app.css đã vào bộ nhớ đệm", 15000);
      await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      assert.equal(await p.ev("fetch('/api/auth/me').then(() => 'có mạng', () => 'mất mạng')"), "mất mạng", "giả lập mất mạng phải cắt được yêu cầu tới máy chủ");
      await p.ev("(window.__trangCu = true)");
      await p.send("Page.reload", {});
      await p.waitFor(`!window.__trangCu && ${q("#changelog")}?.children.length > 0`, "nhật ký hiện khi mất mạng", 10000);
      assert.equal(await p.ev("window.__trangCu === undefined"), true, "đã là trang mới nạp lại");
      assert.equal(await p.ev(`document.querySelectorAll('.release-note').length`), CHANGELOG.length, "đủ số bản khi mất mạng");
      assert.equal(await p.ev(`${q("#release")}.textContent`), `${APP_NAME} · ${formatReleaseLine()}`, "dòng phiên bản khi mất mạng");
      assert.equal(await p.ev("fetch('/api/auth/me').then(() => 'có mạng', () => 'mất mạng')"), "mất mạng", "vẫn đang mất mạng lúc kiểm");
      await shotKhung(p, join(OUT, "anh/e-mat-mang-390.png"));
    } finally {
      await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => undefined);
      p.close();
    }
  });

  // f (thêm 2026-09-30, đặc tả docs/superpowers/specs/2026-09-30-huong-dan-theo-vai.md A5): khối "Hướng dẫn cho bạn" đúng nhóm theo quyền.
  await step("f", "hướng dẫn theo vai: mỗi quyền thấy đúng nhóm; Quản trị có \"Hướng dẫn các vai khác\"; không tràn 320", async () => {
    const mong = { salesA: ["Bán hàng", HD_CHUNG.tieuDe], accounting: ["Kế toán", HD_CHUNG.tieuDe], field: ["Hướng dẫn viên", HD_CHUNG.tieuDe], admin: ["Quản trị", HD_CHUNG.tieuDe] };
    for (const [key, nhom] of Object.entries(mong)) {
      const p = await env.as(ACCOUNTS[key], "/help", key === "salesA" ? NARROW : M);
      try {
        await p.waitFor(`document.querySelectorAll('#huong-dan > .hd-nhom').length > 0`, `hướng dẫn hiện (${key})`, 10000);
        const thay = await p.ev(`[...document.querySelectorAll('#huong-dan > .hd-nhom > h3')].map((e) => e.firstChild.textContent.trim())`);
        assert.deepEqual(thay, nhom, key);
        assert.equal(await p.ev(`${q("#huong-dan > .hd-nhom .hd-nhanh")}.open`), true, `"Bắt đầu nhanh" của nhóm đầu mở sẵn (${key})`);
        assert.equal(await p.ev(`[...document.querySelectorAll('#huong-dan > details > summary')].some((s) => s.textContent === 'Hướng dẫn các vai khác')`), key === "admin", `"Hướng dẫn các vai khác" chỉ Quản trị (${key})`);
        assert.ok((await p.ev(`document.querySelectorAll('#huong-dan .hd-nut').length`)) > 0, `có tên nút đóng khung (${key})`);
        if (key === "salesA") {
          await p.ev(`document.querySelectorAll('#huong-dan details').forEach((d) => (d.open = true)), true`);
          const m = await measure(p);
          assert.ok(m.tranNgang <= 0, `mở mọi mục ở 320px không tràn ngang: ${JSON.stringify(m)}`);
          await shotKhung(p, join(OUT, "anh/f-huong-dan-320.png"));
        }
        assert.deepEqual(p.consoleErrors, [], `console (${key})`);
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
