// Kiểm thẻ Hướng dẫn của Hỗ trợ và trang Nhật ký thay đổi riêng bằng Chrome thật (D1 tạm + wrangler dev), 390 + 1040, không cần mạng ngoài.
// Thay help-smoke.mjs của các đợt trước cho trang này. Chạy từ gốc: npm run build:web && AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-03-huong-dan/kich-ban/huong-dan-smoke.mjs
//   a  Bán hàng: thẻ Hướng dẫn đứng đầu, Bắt đầu nhanh, việc của vai, Phần chung; có bài Kho vé. Nhật ký không có ở đây.
//   b  Tài xế: không thấy bài Kho vé; mở thẳng bài đó báo không có trong danh sách. Tab Hỗ trợ sáng.
//   c  một bài: khối máy điền đúng số từ mã, dòng cập nhật, cuối bài có lối gửi yêu cầu; gửi yêu cầu điền sẵn tên bài.
//   d  tìm: có kết quả (bỏ dấu, tô chữ), bấm đoạn mở đúng chỗ; không có kết quả thì chữ gõ được điền sẵn vào yêu cầu.
//   e  Quản trị: ô Xem bài của vai trò, dải báo; Bán hàng không có ô đó. Toàn quyền thấy bài Giao diện, Quản trị không.
//   f  Nhật ký thay đổi: trang riêng, không có chữ hướng dẫn; chấm đỏ ở menu tắt khi đã mở; mục menu đúng nhãn mới.
//   g  có trả lời mới chưa đọc thì lối Hỗ trợ mở Yêu cầu của tôi; ?the=1 thì không.
//   h  mất mạng: danh sách, tìm và bài vẫn đọc được; nút gửi yêu cầu tắt kèm lý do.
// Mỗi bước: không tràn ngang, ô gõ ≥ 16px, vùng chạm ≥ 44px, axe-core (thiếu AXE_JS thì bỏ qua và báo rõ).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { CHANGELOG } from "../../../../src/shared/changelog.ts";
import { TRAN_LO_MAC_DINH } from "../../../../src/shared/ve-nhap-lo.ts";

const OUT = process.env.OUT ?? "/tmp/huong-dan-smoke";
mkdirSync(join(OUT, "anh"), { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", M], ["1040", DESK]];
ACCOUNTS.taiXe = { name: "Tài Xế Thử", phone: "0900000206", pin: "246814", permissions: ["DRIVER"] };
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
if (!AXE) console.log("! Thiếu AXE_JS: bỏ qua kiểm màu và trợ năng.");

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
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const anh = async (p, ten) => {
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
};
const kiemChung = async (p, nhan) => {
  const m = await p.ev(`(() => {
    const hien = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const nho = [...document.querySelectorAll('main button, main a[href], main select, main input')].filter(hien).filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => (el.textContent || el.id || el.tagName).trim().slice(0, 30) + ':' + Math.round(el.getBoundingClientRect().height));
    const co = [...document.querySelectorAll('main input, main select, main textarea')].filter(hien).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id);
    return { tran: document.documentElement.scrollWidth - window.innerWidth, nho, co };
  })()`);
  assert.ok(m.tran <= 0, `${nhan}: tràn ngang ${m.tran}px`);
  assert.deepEqual(m.co, [], `${nhan}: ô gõ dưới 16px`);
  assert.deepEqual(m.nho, [], `${nhan}: vùng chạm dưới 44px`);
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document.querySelector('main'), { runOnly: ['wcag2a', 'wcag2aa'] }).then((r) => r.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => v.id + ': ' + v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')))`);
  assert.deepEqual(vi, [], `${nhan}: axe`);
};
const danhSachXong = `${q(".hd-hai-cot")}?.children.length > 0`;
const baiXong = `!!${q(".hd-bai")}`;
const go = (p, s) => p.ev(`(() => { const o = ${q("#hd-tim")}; o.value = ${JSON.stringify(s)}; o.dispatchEvent(new Event('input', { bubbles: true })); })()`);

const env = await startEnv();
try {
  await step("a", "Bán hàng: thẻ Hướng dẫn đứng đầu, đủ phần, có Kho vé, không có nhật ký", async () => {
    for (const [ten, kho] of KHO) {
      const p = await env.as(ACCOUNTS.salesA, "/huong-dan?the=1", kho);
      try {
        await p.waitFor(danhSachXong, "danh sách hiện", 10000);
        assert.equal(await p.ev(`${q("#hd-the .ht-tab")}.textContent`), "Hướng dẫn");
        assert.ok((await p.ev(`${q(".hd-nhanh-the h2")}.textContent`)).startsWith("Bắt đầu nhanh cho Bán hàng"));
        const chu = await p.ev(`${q("main")}.innerText`);
        for (const s of ["Việc của Bán hàng", "Phần chung", "Kho vé điện tử", "Ở Vé điện tử"]) assert.ok(chu.includes(s), s);
        assert.ok(!chu.includes("Phiên bản "), "nhật ký không được nằm ở đây");
        await anh(p, `a-ban-hang-${ten}`);
        await kiemChung(p, `a ${ten}`);
      } finally { p.close(); }
    }
  });

  await step("b", "Tài xế: không thấy bài Kho vé, mở thẳng cũng không", async () => {
    const p = await env.as(ACCOUNTS.taiXe, "/huong-dan?the=1", M);
    try {
      await p.waitFor(danhSachXong, "danh sách hiện", 10000);
      const chu = await p.ev(`${q("main")}.innerText`);
      assert.ok(chu.includes("Việc của Tài xế"));
      assert.ok(!chu.includes("Kho vé điện tử"), "Tài xế không được thấy");
      assert.ok(await p.ev(`!!${q("#tabbar a[href='/huong-dan'][aria-current=page]")}`), "tab Hỗ trợ sáng");
      await anh(p, "b-tai-xe-390");
      await kiemChung(p, "b");
      await p.send("Page.navigate", { url: `${env.base}/huong-dan?bai=${encodeURIComponent("viec/kho-ve")}` });
      await p.waitFor(`${q(".hd-rong-cau")}?.textContent.includes('không có trong danh sách')`, "báo không có", 10000);
    } finally { p.close(); }
  });

  await step("c", "một bài: máy điền đúng số từ mã, cuối bài gửi yêu cầu điền sẵn tên bài", async () => {
    for (const [ten, kho] of KHO) {
      const p = await env.as(ACCOUNTS.salesA, `/huong-dan?bai=${encodeURIComponent("viec/kho-ve")}`, kho);
      try {
        await p.waitFor(baiXong, "bài hiện", 10000);
        assert.ok((await p.ev(`${q(".hd-bai-ten")}.getBoundingClientRect().height`)) > 20, "tên bài phải nhìn thấy, không bị luật ẩn h1 chung che");
        const may = await p.ev(`${q("#hd-may")}.innerText`);
        for (const s of ["Nền tảng tự điền", "Vé điện tử", "Bán hàng · Quản trị · Toàn quyền", `tối đa ${TRAN_LO_MAC_DINH} vé`, "Nhập lô vé", "Huỷ lô"]) assert.ok(may.includes(s), s);
        assert.ok((await p.ev(`${q(".hd-cap-nhat")}.textContent`)).startsWith("Cập nhật theo bản "));
        assert.equal(await p.ev(`getComputedStyle(${q(".hd-toc")}).display !== 'none'`), ten === "1040", "mục lục chỉ ở máy tính");
        assert.ok(await p.ev(`!!${q(".hd-bang td")}`), "bảng sự cố");
        await anh(p, `c-bai-${ten}`);
        await kiemChung(p, `c ${ten}`);
        if (ten === "390") {
          await p.ev(`${q("#hd-vuong a[data-action=gui-yeu-cau]")}.click()`);
          await p.waitFor(`${q("#new-title")}?.value.includes('Kho vé điện tử')`, "tên bài điền sẵn", 10000);
          assert.ok((await p.ev(`${q("#new-context")}.textContent`)).includes("/huong-dan"), "kèm trang đang đọc");
        }
      } finally { p.close(); }
    }
  });

  await step("d", "tìm: có kết quả tô chữ, mở đúng chỗ; không có thì chữ gõ được điền sẵn", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/huong-dan?the=1", M);
    try {
      await p.waitFor(danhSachXong, "danh sách hiện", 10000);
      await go(p, "huy lo");
      await p.waitFor(`!!${q(".hd-kq mark")}`, "có đoạn khớp", 3000);
      assert.match(await p.ev(`${q(".hd-kq > p")}.textContent`), /đoạn khớp trong \d+ bài/);
      await anh(p, "d-tim-co-390");
      await kiemChung(p, "d có");
      const href = await p.ev(`${q(".hd-kq-bai a.dong")}.getAttribute('href')`);
      assert.match(href, /doan=\d+/);
      await go(p, "xuất hoá đơn đỏ zzz");
      await p.waitFor(`${q(".hd-rong-cau")}?.textContent.includes('xuất hoá đơn đỏ zzz')`, "báo không có", 3000);
      await anh(p, "d-tim-rong-390");
      await kiemChung(p, "d rỗng");
      await p.ev(`${q("[data-ket-qua=rong] a[data-action=gui-yeu-cau]")}.click()`);
      await p.waitFor(`${q("#new-body")}?.value === 'xuất hoá đơn đỏ zzz'`, "chữ gõ điền sẵn", 10000);
      assert.ok(!(await p.ev("location.href")).includes("zzz"), "chữ gõ không lên địa chỉ trang");
    } finally { p.close(); }
  });

  await step("e", "Quản trị xem bài của vai; Bán hàng không có ô; Giao diện chỉ Toàn quyền", async () => {
    for (const [ten, kho] of KHO) {
      const p = await env.as(ACCOUNTS.admin, "/huong-dan?the=1&vai-tro=SALES", kho);
      try {
        await p.waitFor(danhSachXong, "danh sách hiện", 10000);
        assert.ok(await p.ev(`!!${q("#hd-vai")}`));
        assert.ok((await p.ev(`${q(".hd-than > .dai")}.textContent`)).includes("Đang xem bài của Bán hàng"));
        assert.ok((await p.ev(`${q("main")}.innerText`)).includes("Việc của Bán hàng"));
        await anh(p, `e-quan-tri-${ten}`);
        await kiemChung(p, `e ${ten}`);
        await p.send("Page.navigate", { url: `${env.base}/huong-dan?the=1` });
        await p.waitFor(`!window.__x && ${danhSachXong}`, "danh sách của mình", 10000);
        await p.waitFor(`!!${q("#hd-vai")}`, "ô vai", 5000);
        assert.ok(!(await p.ev(`${q("main")}.innerText`)).includes("Đổi giao diện công ty"), "Quản trị không có bài Giao diện");
      } finally { p.close(); }
    }
    const s = await env.as(ACCOUNTS.salesA, "/huong-dan?the=1&vai-tro=ADMIN", M);
    try {
      await s.waitFor(danhSachXong, "danh sách hiện", 10000);
      assert.ok(!(await s.ev(`!!${q("#hd-vai")}`)), "Bán hàng không có ô");
      assert.ok((await s.ev(`${q("main")}.innerText`)).includes("Việc của Bán hàng"), "?vai không có tác dụng với Bán hàng");
    } finally { s.close(); }
    const c = await env.as(ACCOUNTS.chu, "/huong-dan?the=1", M);
    try {
      await c.waitFor(`${q("main")}.innerText.includes('Đổi giao diện công ty')`, "Toàn quyền thấy bài Giao diện", 10000);
    } finally { c.close(); }
  });

  await step("f", "Nhật ký thay đổi: trang riêng, chấm đỏ tắt khi đã mở, mục menu đúng nhãn", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", M);
    try {
      await p.ev(`localStorage.setItem('td_help_seen', '1.0')`);
      await p.send("Page.reload", {});
      await p.waitFor(`!!${q("#links a[href='/help'] .new-dot")}`, "chấm đỏ ở dòng Nhật ký trang Tôi", 10000);
      assert.ok((await p.ev(`${q("#links a[href='/help']")}.textContent`)).includes("Nhật ký thay đổi"));
      assert.ok(await p.ev(`!!${q("#links a[href='/huong-dan']")}`), "dòng Hỗ trợ mở thẻ Hướng dẫn");
      await anh(p, "f-trang-toi-390");
      await p.send("Page.navigate", { url: `${env.base}/help` });
      await p.waitFor(`document.querySelectorAll('.nk-ban').length === ${CHANGELOG.length}`, "đủ số bản", 10000);
      const chu = await p.ev(`${q("main")}.innerText`);
      assert.ok(!chu.includes("Việc của Bán hàng") && !(await p.ev(`!!${q(".hd-nhanh-the, .hd-hai-cot, #hd-tim")}`)), "không có phần hướng dẫn"); // chữ «Bắt đầu nhanh» có trong một mục nhật ký cũ, không dùng để so
      assert.ok(chu.includes("chưa xem"));
      await anh(p, "f-nhat-ky-390");
      await kiemChung(p, "f 390");
      await p.send("Page.navigate", { url: `${env.base}/account` });
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "trang Tôi", 10000);
      assert.ok(!(await p.ev(`!!${q("#links a[href='/help'] .new-dot")}`)), "chấm đỏ phải tắt");
    } finally { p.close(); }
    const d = await env.as(ACCOUNTS.salesA, "/help", DESK);
    try {
      await d.waitFor(`document.querySelectorAll('.nk-ban').length > 0`, "nhật ký", 10000);
      await d.waitFor(`!!${q("#sidebar a[href='/help']")}`, "mục menu", 10000);
      assert.ok((await d.ev(`${q("#sidebar a[href='/help']")}.textContent`)).includes("Nhật ký thay đổi"));
      assert.ok(await d.ev(`!!${q("#sidebar a[href^='/huong-dan']")}`), "mục Hỗ trợ mở thẻ Hướng dẫn");
      await anh(d, "f-nhat-ky-1040");
      await kiemChung(d, "f 1040");
    } finally { d.close(); }
  });

  await step("g", "có trả lời mới thì lối Hỗ trợ mở Yêu cầu của tôi; thẻ có đủ ở /feedback", async () => {
    const p = await env.as(ACCOUNTS.salesB, "/feedback", M);
    try {
      await p.waitFor(`${q("#ht-tabs .ht-tab")}?.textContent === 'Hướng dẫn'`, "thẻ Hướng dẫn đứng đầu ở /feedback", 10000);
      await p.send("Page.navigate", { url: `${env.base}/huong-dan` });
      await p.waitFor(danhSachXong, "không có gì mới thì ở lại Hướng dẫn", 10000);
      assert.equal(await p.ev("location.pathname"), "/huong-dan");
      // Có trả lời mới: giả số chưa đọc ở trình duyệt (số thật do bài của /api/feedback/badge canh), chỉ kiểm lối chuyển thẻ.
      await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `{ const g = window.fetch; window.fetch = (u, o) => String(u.url ?? u).includes('/api/feedback/badge') ? Promise.resolve(new Response(JSON.stringify({ mine: 1, queue: 0 }), { headers: { 'content-type': 'application/json' } })) : g(u, o); }` });
      await p.send("Page.navigate", { url: `${env.base}/huong-dan?from=%2Faccount` });
      await p.waitFor(`location.pathname === '/feedback'`, "có trả lời mới thì sang Yêu cầu của tôi", 10000);
      await p.send("Page.navigate", { url: `${env.base}/huong-dan?the=1` });
      await p.waitFor(danhSachXong, "?the=1 thì ở lại Hướng dẫn", 10000);
      assert.equal(await p.ev("location.pathname"), "/huong-dan");
    } finally { p.close(); }
  });

  await step("h", "mất mạng: đọc và tìm được, nút gửi tắt kèm lý do", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/huong-dan?the=1", M);
    try {
      await p.waitFor(danhSachXong, "danh sách", 10000);
      await p.waitFor("!!navigator.serviceWorker?.controller", "service worker điều khiển trang", 20000);
      await p.send("Page.reload", {});
      await p.waitFor(danhSachXong, "danh sách lần 2", 10000);
      await p.waitFor(`(async () => !!(await caches.match(location.origin + '/huong-dan')) && !!(await caches.match(location.origin + '/js/huong-dan.js')))()`, "đã lưu", 20000);
      await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await p.ev("(window.__trangCu = true)");
      await p.send("Page.reload", {});
      await p.waitFor(`!window.__trangCu && ${danhSachXong}`, "danh sách khi mất mạng", 10000);
      assert.ok((await p.ev(`${q("main")}.innerText`)).includes("Việc của Bán hàng"), "nhớ đúng vai");
      assert.ok((await p.ev(`${q("main")}.innerText`)).includes("Cần có mạng để gửi yêu cầu"));
      await go(p, "huy lo");
      await p.waitFor(`!!${q(".hd-kq mark")}`, "tìm được khi mất mạng", 3000);
      await anh(p, "h-mat-mang-390");
      await p.ev(`location.assign(${q(".hd-kq-dau")}.getAttribute('href'))`);
      await p.waitFor(baiXong, "đọc được bài khi mất mạng", 10000);
    } finally {
      await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => undefined);
      p.close();
    }
  });
} finally {
  await env.stop?.();
}
if (failures.length) {
  console.log(`\n${failures.length} bước ✗: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nHUONG DAN SMOKE OK — mọi bước ✓");
}
