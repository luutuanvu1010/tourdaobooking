// Kiểm giao diện Đăng nhập bằng Face ID (ADR-0016) bằng Chrome thật, dùng authenticator ẢO qua CDP (miền WebAuthn) thay cho Face ID/vân tay thật.
// Dựa trên môi trường của A2 (`../../2026-09-20-a2/kich-ban/a2-cdp.mjs`: D1 tạm + `wrangler dev` + Chrome headless qua CDP), BẬT thêm Face ID (`startEnv({ passkey: true })`,
// dùng `localhost` — Chrome cấm tạo passkey trên địa chỉ IP). KHÔNG cần mạng ngoài. Chạy từ GỐC repo, sau `npm run build:web`:
//   npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-23-passkey/kich-ban/passkey-smoke.mjs
// Ghi ảnh vào docs/evidence/2026-09-23-passkey/anh/*.png. Mỗi bước in "✓"/"✗"; thoát mã 1 nếu có bước ✗ (không dừng ở bước hỏng đầu tiên).
//   a  /login trên localhost: nút "Đăng nhập bằng Face ID / vân tay" hiện
//   b  đăng nhập PIN (ACCOUNTS.salesA) → lời mời bật Face ID hiện, đúng câu "Chỉ bật trên điện thoại riêng của bạn."
//   c  nhập PIN, bấm "Bật" rồi "Tiếp tục với Face ID" → chuyển tới next (danh sách đơn)
//   (bổ sung) trang quản lý nhân viên: admin thấy nút "Gỡ Face ID (1)" ở hàng của salesA (không phải hàng của chính admin)
//   d  đăng xuất, về /login, bấm nút Face ID → vào app KHÔNG gõ SĐT/PIN
//   e  /account: mục Face ID có 1 dòng "Máy …"; đổi PIN xong hiện câu "Face ID vẫn còn bật…" + nút "Gỡ tất cả"
//   f  bấm "Gỡ" (dòng còn lại) → danh sách rỗng; đăng nhập Face ID sau đó báo đúng câu passkey_unknown của máy chủ
//   g  bấm "Để sau" ở lời mời (tài khoản khác — ACCOUNTS.accounting) → không mời lại ở lần đăng nhập PIN kế tiếp
//   h  console sạch (mọi trang đã mở), không lỗi CSP; vùng chạm ≥ 44px, ô gõ ≥ 16px, không tràn ngang ở 390 và 320
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, clickText, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-23-passkey";
const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };

// Chữ đúng của máy chủ: đọc thẳng từ mã nguồn (một nguồn), không chép tay — đối chiếu §2.6/§2.7 (ADR-0016).
const passkeySource = readFileSync("src/modules/auth/passkey.ts", "utf8");
const UNKNOWN = passkeySource.match(/unknown: \(\) => error\(401, "passkey_unknown", "([^"]+)"\)/)?.[1];
assert.ok(UNKNOWN, "không đọc được câu passkey_unknown từ src/modules/auth/passkey.ts");

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
const text = (p, sel) => p.ev(`${q(sel)}?.textContent ?? null`);
const value = (p, sel) => p.ev(`${q(sel)}?.value ?? null`);
const click = (p, sel) => p.ev(`(() => { const e = ${q(sel)}; if (!e) return false; e.click(); return true; })()`);
/** Nút có chữ đúng `text` trong `scope`, đang HIỆN thật (không chỉ có mặt trong DOM). */
const btnVisible = (scope, label) =>
  `(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); return !!b && !b.hidden && b.offsetParent !== null; })()`;
const typeCreds = async (p, account) => {
  await p.ev(setInput(q("#phone"), account.phone));
  await p.ev(setInput(q("#pin"), account.pin));
};
const submitLogin = (p) => p.ev(`${q("#submit")}.click(); true`);
const loggedIn = (p) => p.waitFor("location.pathname === '/' && document.readyState === 'complete'", "vào trang danh sách đơn", 15000);
const goto = async (p, path) => {
  await p.send("Page.navigate", { url: env.localBase + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
};
const doLogout = (p) => p.ev("fetch('/api/auth/logout', { method: 'POST' }).then(() => true)");
/**
 * Bấm nút Face ID. `prefetchPasskey()` chạy NỀN ngay khi nút hiện (login.ts): nếu chưa kịp xong, bấm chỉ hiện
 * `#passkey-hint` "Bấm lại nút Face ID." (không gọi WebAuthn) — bấm lại tới khi vào luồng thật (điều hướng đi hoặc `#error` hiện).
 */
async function clickPasskeyLogin(p) {
  for (let i = 0; i < 5; i++) {
    await click(p, "#passkey-login");
    await p.waitFor(
      `location.pathname !== '/login' || (${q("#error")} && !${q("#error")}.hidden) || (${q("#passkey-hint")} && !${q("#passkey-hint")}.hidden)`,
      "nút Face ID phản hồi (điều hướng đi, lỗi, hoặc lời nhắc bấm lại)",
      8000,
    );
    if (await p.ev("location.pathname !== '/login'")) return;
    if (await p.ev(`!!(${q("#error")} && !${q("#error")}.hidden)`)) return; // lỗi thật của máy chủ (vd bước f: passkey_unknown) — bước sau kiểm nội dung
    // còn lại: #passkey-hint "Bấm lại nút Face ID." — prefetch chưa sẵn sàng lần trước (đã tự lấy lại), thử bấm lại
  }
  throw new Error("nút Face ID không phản hồi thật sau nhiều lần bấm (luôn chỉ thấy lời nhắc \"Bấm lại nút Face ID.\")");
}

/** Vi phạm CSP + lỗi console thật (bỏ tiếng ồn ĐÃ BIẾT: dò phiên 401 ở /api/auth/me, và 401 passkey_unknown CỐ Ý ở bước f). */
function consoleProblems(p) {
  const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
  const noise = (e) => e.source === "network" && /status of \d+/.test(e.text) && (/\/api\/auth\/me$/.test(e.url ?? "") || /\/api\/auth\/passkey\/login$/.test(e.url ?? ""));
  const other = p.logEntries.filter((e) => e.level === "error" && !noise(e) && !csp.includes(e));
  return { csp: csp.map((e) => e.text), other: other.map((e) => `${e.source}: ${e.text} ${e.url ?? ""}`), consoleErrors: [...p.consoleErrors] };
}
/** Vùng chạm ≥ 44 px, ô gõ ≥ 16 px, không tràn ngang. */
const measure = (p) =>
  p.ev(`(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const ctl = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary')].filter(shown);
    return {
      tapDuoi44: ctl.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height)),
      oGoDuoi16: ctl.filter((el) => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id),
      tranNgang: document.documentElement.scrollWidth - innerWidth,
    };
  })()`);

const env = await startEnv({ passkey: true });
const page = await env.openPage(M);
try {
  // Ngay sau khi mở trang: gắn authenticator ảo (ctap2, resident key, tự xác nhận hiện diện — không cần Face ID thật).
  await page.send("WebAuthn.enable", { enableUI: false });
  await page.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });

  // ---- a) nút Face ID hiện ở /login (localhost) ----
  await step("a", "/login trên localhost: nút \"Đăng nhập bằng Face ID / vân tay\" hiện", async () => {
    await goto(page, "/login");
    await page.waitFor(`!!${q("#passkey-login")} && !${q("#passkey-login")}.hidden`, "nút Face ID hiện", 10000);
    assert.equal(await text(page, "#passkey-login"), "Đăng nhập bằng Face ID / vân tay");
    await page.shot(join(OUT, "anh/a-dang-nhap-nut-faceid-390.png"));
  });

  // ---- b) đăng nhập PIN → lời mời bật Face ID ----
  await step("b", "đăng nhập PIN (salesA) → lời mời bật Face ID hiện, đúng câu \"Chỉ bật trên điện thoại riêng của bạn.\"", async () => {
    await typeCreds(page, ACCOUNTS.salesA);
    await submitLogin(page);
    await page.waitFor(`!!${q("#passkey-invite")} && !${q("#passkey-invite")}.hidden`, "lời mời bật Face ID hiện", 10000);
    assert.equal(await page.ev(`${q("#login-form")}.hidden`), true, "form đăng nhập bị ẩn khi lời mời hiện (A-2)");
    const warn = await page.ev(`(${q("#passkey-invite")}.textContent.includes("Chỉ bật trên điện thoại riêng của bạn.")) `);
    assert.equal(warn, true, "câu cảnh báo đúng nguyên văn có mặt trong lời mời");
    await page.shot(join(OUT, "anh/b-loi-moi-bat-faceid-390.png"));
  });

  // ---- c) bật Face ID: nhập PIN, Bật, Tiếp tục với Face ID ----
  await step("c", "nhập PIN, bấm \"Bật\" rồi \"Tiếp tục với Face ID\" → chuyển tới trang danh sách đơn", async () => {
    await page.ev(setInput(q("#passkey-enable-pin"), ACCOUNTS.salesA.pin));
    assert.equal(await page.ev(btnVisible("#passkey-invite", "Bật")), true, "nút Bật hiện");
    await page.ev(clickText("#passkey-invite", "Bật"));
    await page.waitFor(btnVisible("#passkey-invite", "Tiếp tục với Face ID"), "nút \"Tiếp tục với Face ID\" hiện sau khi có thách thức đăng ký", 10000);
    await page.ev(clickText("#passkey-invite", "Tiếp tục với Face ID"));
    await loggedIn(page);
  });

  // ---- (bổ sung điều phối) trang quản lý nhân viên: admin thấy nút "Gỡ Face ID (1)" ở hàng salesA ----
  await step("staff-admin", "trang quản lý nhân viên: admin thấy nút \"Gỡ Face ID (1)\" ở hàng của salesA (không phải hàng của chính admin)", async () => {
    const staffPage = await env.as(ACCOUNTS.admin, "/staff", M);
    try {
      await staffPage.waitFor(`document.body.textContent.includes(${JSON.stringify(ACCOUNTS.salesA.name)})`, "danh sách nhân viên đã nạp", 10000);
      const found = await staffPage.ev(`(() => {
        const row = [...document.querySelectorAll('tr, .card-col')].find((el) => el.textContent.includes(${JSON.stringify(ACCOUNTS.salesA.name)}));
        const btn = row && [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify("Gỡ Face ID (1)")});
        // Bảng (máy tính) và thẻ (điện thoại) cùng dựng trong DOM, CSS ẩn theo khổ (mốc bảng→thẻ dùng chung) — chỉ đếm nút ĐANG HIỆN THẬT.
        const total = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim().startsWith('Gỡ Face ID') && b.offsetParent !== null).length;
        return { hasRow: !!row, hasBtn: !!btn, total };
      })()`);
      assert.deepEqual(found, { hasRow: true, hasBtn: true, total: 1 }, `hàng/nút của salesA, đúng MỘT nút "Gỡ Face ID" trên trang (không có ở hàng của chính admin): ${JSON.stringify(found)}`);
      await staffPage.shot(join(OUT, "anh/staff-admin-go-faceid-390.png"));
      assert.deepEqual(consoleProblems(staffPage), { csp: [], other: [], consoleErrors: [] }, "console sạch ở trang quản lý nhân viên");
    } finally {
      staffPage.close();
    }
  });

  // ---- d) đăng xuất, về /login, Face ID → vào app không gõ SĐT/PIN ----
  await step("d", "đăng xuất, về /login, bấm nút Face ID → vào app KHÔNG gõ SĐT/PIN", async () => {
    await doLogout(page);
    await goto(page, "/login");
    await page.waitFor(`!!${q("#passkey-login")} && !${q("#passkey-login")}.hidden`, "nút Face ID hiện lại", 10000);
    assert.deepEqual({ phone: await value(page, "#phone"), pin: await value(page, "#pin") }, { phone: "", pin: "" }, "chưa gõ gì vào SĐT/PIN");
    await clickPasskeyLogin(page);
    await loggedIn(page);
    const me = await page.ev("fetch('/api/auth/me').then((r) => r.json())");
    assert.equal(me.staff.phone, ACCOUNTS.salesA.phone, "đăng nhập ĐÚNG tài khoản salesA, không gõ SĐT/PIN");
  });

  // ---- e) trang Tôi: 1 dòng Face ID; đổi PIN xong hiện cảnh báo + Gỡ tất cả ----
  await step("e", "/account: mục Face ID có 1 dòng \"Máy …\"; đổi PIN xong hiện câu \"Face ID vẫn còn bật…\" + nút \"Gỡ tất cả\"", async () => {
    await goto(page, "/account");
    await page.waitFor(`!!${q("#passkeys")} && !${q("#passkeys")}.hidden && document.querySelectorAll('#passkeys .card-col').length === 1`, "mục Face ID hiện với đúng 1 dòng", 10000);
    const label = await text(page, "#passkeys .card-col strong");
    assert.match(label ?? "", /^Máy /, `nhãn dòng Face ID phải bắt đầu bằng "Máy ": ${label}`);
    await page.shot(join(OUT, "anh/e-toi-mot-passkey-390.png"));

    await page.ev(setInput(q("#current"), ACCOUNTS.salesA.pin));
    await page.ev(setInput(q("#new"), "224466"));
    await page.ev(setInput(q("#confirm"), "224466"));
    await page.ev(`${q("#pin-form")}.requestSubmit(); true`);
    await page.waitFor(`!${q("#ok")}.hidden`, "đổi PIN thành công", 10000);
    await page.waitFor(
      `[...document.querySelectorAll('#passkeys p')].some((p) => p.textContent.trim() === ${JSON.stringify("Face ID vẫn còn bật trên các máy dưới đây. Nếu nghi lộ PIN, bấm Gỡ tất cả.")})`,
      "câu cảnh báo sau đổi PIN hiện",
      10000,
    );
    assert.equal(await page.ev(btnVisible("#passkeys", "Gỡ tất cả")), true, "nút \"Gỡ tất cả\" hiện");
  });

  // ---- f) Gỡ dòng còn lại → rỗng; Face ID sau đó báo passkey_unknown ----
  await step("f", "bấm \"Gỡ\" (dòng còn lại) → danh sách rỗng; đăng nhập Face ID sau đó báo đúng câu passkey_unknown", async () => {
    await page.ev(clickText("#passkeys", "Gỡ"));
    await page.waitFor(`${q("#passkeys")}.textContent.includes("Chưa bật trên máy nào.")`, "danh sách rỗng", 10000);
    assert.equal(await page.ev(`document.querySelectorAll('#passkeys .card-col').length`), 0);

    await doLogout(page);
    await goto(page, "/login");
    await page.waitFor(`!!${q("#passkey-login")} && !${q("#passkey-login")}.hidden`, "nút Face ID hiện", 10000);
    await clickPasskeyLogin(page);
    await page.waitFor(`!${q("#error")}.hidden && ${q("#error")}.textContent === ${JSON.stringify(UNKNOWN)}`, "lỗi passkey_unknown của máy chủ hiện nguyên văn", 10000);
  });

  // ---- g) "Để sau" (tài khoản khác) → không mời lại ----
  await step("g", "bấm \"Để sau\" ở lời mời (accounting) → không mời lại ở lần đăng nhập PIN kế tiếp", async () => {
    await goto(page, "/login");
    await typeCreds(page, ACCOUNTS.accounting);
    await submitLogin(page);
    await page.waitFor(`!!${q("#passkey-invite")} && !${q("#passkey-invite")}.hidden`, "lời mời hiện (lần đầu, chưa có passkey)", 10000);
    await page.ev(clickText("#passkey-invite", "Để sau"));
    await loggedIn(page);

    await doLogout(page);
    await goto(page, "/login");
    await typeCreds(page, ACCOUNTS.accounting);
    await submitLogin(page);
    await loggedIn(page); // nếu lời mời lại hiện thì KHÔNG bao giờ đạt pathname === '/' (không ai bấm gì trong lời mời) → hết giờ chờ, bước này ✗
  });

  // ---- h) console sạch + đo ở 390 và 320 ----
  await step("h", "console sạch (mọi trang đã mở), không lỗi CSP; vùng chạm ≥ 44 px, ô gõ ≥ 16 px, không tràn ngang ở 390 và 320", async () => {
    assert.deepEqual(consoleProblems(page), { csp: [], other: [], consoleErrors: [] }, "console sạch ở trang chính (mọi bước a–g; trang quản lý nhân viên đã kiểm riêng ở bước staff-admin)");

    // Cookie dùng CHUNG giữa mọi tab cùng gốc (accounting còn phiên từ bước g): đăng xuất trước khi mở tab mới đo /login, không thì bị chuyển thẳng về "/".
    await doLogout(page);
    for (const [label, vp] of [["390", M], ["320", NARROW]]) {
      const p = await env.openPage(vp);
      try {
        await p.send("Page.navigate", { url: env.localBase + "/login" });
        await p.waitFor("document.readyState === 'complete'", `trang /login tải xong (${label})`);
        try {
          await p.waitFor(`!!${q("#passkey-login")} && !${q("#passkey-login")}.hidden`, `nút Face ID hiện (${label})`, 10000);
        } catch (e) {
          const diag = await p.ev(`fetch('/api/auth/config').then((r) => r.json()).then((j) => ({ cfg: j, hasBtn: !!${q("#passkey-login")}, hiddenAttr: ${q("#passkey-login")}?.hidden, url: location.href }))`).catch((x) => String(x));
          throw new Error(`${e.message}\n    chẩn đoán: ${JSON.stringify(diag)}`);
        }
        const m = await measure(p);
        assert.deepEqual([m.tapDuoi44, m.oGoDuoi16, m.tranNgang <= 0], [[], [], true], `đo ${label}: ${JSON.stringify(m)}`);
      } finally {
        p.close();
      }
    }
  });
} finally {
  page.close();
  await env.stop();
}

if (failures.length) {
  console.log(`\n${failures.length} bước ✗: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nPASSKEY SMOKE OK — mọi bước ✓");
}
