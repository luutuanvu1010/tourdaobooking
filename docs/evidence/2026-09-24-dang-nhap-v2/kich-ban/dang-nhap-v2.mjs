// Kịch bản Chrome cho bản thiết kế "Đăng nhập v2" (Claude Design, 2026-09-24) và các chỉnh của chủ dự án cùng ngày (vừa một màn hình,
// tiêu đề "Tour Đảo Booking", nút "Đăng nhập" + nút sinh trắc học chỉ biểu tượng ngay cạnh, chân trang gọn): chụp ảnh và ĐO các trạng thái của màn
// Đăng nhập mà các kịch bản cũ không phủ — có/không có Face ID (khối Face ID + nút PIN kiểu phụ), khổ hẹp 320/375
// (không cuộn ngang, widget Turnstile đủ chỗ cỡ "flexible" ở 375), nút Hiện/Ẩn PIN, báo lỗi sai PIN.
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs).
// Chạy từ GỐC repo, sau `npm run build:web` (CẦN MẠNG: Turnstile bật bằng khoá thử của Cloudflare):
//   CHROME_BIN=<…/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-24-dang-nhap-v2/kich-ban/dang-nhap-v2.mjs
// Ghi ảnh vào docs/evidence/2026-09-24-dang-nhap-v2/anh/*.png.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = "docs/evidence/2026-09-24-dang-nhap-v2/anh";
mkdirSync(OUT, { recursive: true });
const shot = async (p, name) => writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })).result.data, "base64"));
const view = (width, height, mobile) => ({ width, height, mobile });

const measure = (p) =>
  p.ev(`(() => {
    const vis = (el) => !!el && el.offsetParent !== null;
    const submit = document.getElementById('submit');
    const pk = document.getElementById('passkey-login');
    const box = document.getElementById('turnstile-widget');
    const main = document.querySelector('main.login');
    const rs = submit.getBoundingClientRect(), rp = pk.getBoundingClientRect();
    return {
      passkeyBtn: vis(pk),
      // cùng hàng, ngay bên phải nút Đăng nhập (chủ dự án 2026-09-24)
      passkeyBesideSubmit: vis(pk) ? Math.abs(rs.top - rp.top) < 1 && rp.left >= rs.right : null,
      submitText: submit.textContent,
      submitBg: getComputedStyle(submit).backgroundColor,
      // VỪA MỘT MÀN HÌNH (chủ dự án 2026-09-24): cả trang lẫn vùng main đều không có gì để cuộn/kéo
      noVScroll: document.documentElement.scrollHeight <= window.innerHeight && main.scrollHeight <= main.clientHeight,
      pageOverflow: getComputedStyle(document.body).overflowY,
      noHScroll: document.documentElement.scrollWidth <= window.innerWidth,
      widgetWidth: box && !box.hidden ? Math.round(box.getBoundingClientRect().width) : null,
    };
  })()`);

const env = await startEnv({ turnstile: true, passkey: true });
try {
  const open = async (vp, label) => {
    const p = await env.openPage(vp);
    await p.send("Page.navigate", { url: env.localBase + "/login" });
    await p.waitFor("document.readyState === 'complete'", `trang /login tải xong (${label})`);
    await p.waitFor("!document.getElementById('turnstile-widget').hidden && !!document.querySelector('#turnstile-widget input[name=cf-turnstile-response]')", `widget Turnstile dựng xong (${label})`, 20000);
    await p.waitFor("!document.getElementById('company').hidden", `chân trang công ty hiện (${label})`, 10000);
    return p;
  };

  // 1) Có Face ID (máy chủ bật passkey, Chrome có PublicKeyCredential): nút tròn chỉ biểu tượng đứng NGAY CẠNH nút "Đăng nhập"; trang vừa một
  //    màn hình (390×664 ≈ vùng nhìn thấy của Safari trên iPhone 14 khi có thanh địa chỉ + thanh công cụ; 1040×800 máy tính), có widget Turnstile.
  for (const [vp, name] of [[view(390, 664, true), "co-face-id-dien-thoai.png"], [view(1040, 800, false), "co-face-id-may-tinh.png"]]) {
    const p = await open(vp, name);
    await p.waitFor("!document.getElementById('passkey-login').hidden", "nút Face ID hiện", 10000);
    const m = await measure(p);
    assert.equal(m.passkeyBesideSubmit, true, `nút Face ID phải cùng hàng, bên phải nút Đăng nhập — ${JSON.stringify(m)}`);
    assert.equal(m.submitText, "Đăng nhập", `chữ nút — ${JSON.stringify(m)}`);
    assert.equal(m.submitBg, "rgb(12, 74, 110)", `nút Đăng nhập luôn là nút chính (--c-primary) — ${JSON.stringify(m)}`);
    assert.equal(m.noVScroll, true, `${vp.width}×${vp.height}: trang phải vừa một màn hình, không có gì để cuộn — ${JSON.stringify(m)}`);
    assert.equal(m.pageOverflow, "hidden", `body không cuộn — ${JSON.stringify(m)}`);
    assert.equal(m.noHScroll, true, `không cuộn ngang — ${JSON.stringify(m)}`);
    // Nút chỉ có biểu tượng (chủ dự án chốt 2026-09-24): không chữ, có biểu tượng, tên đọc được ở aria-label, tròn ≥ 44px.
    assert.deepEqual(await p.ev("(() => { const b = document.getElementById('passkey-login'); const r = b.getBoundingClientRect(); return { chu: b.textContent, bieuTuong: !!b.querySelector('svg'), ten: b.getAttribute('aria-label'), vuong: Math.round(r.width) === Math.round(r.height), du44: r.height >= 44 }; })()"), { chu: "", bieuTuong: true, ten: "Đăng nhập bằng Face ID hoặc vân tay", vuong: true, du44: true });
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    await shot(p, name);
    p.close();
    ok(`Có Face ID (${vp.width}×${vp.height}): nút tròn chỉ biểu tượng cạnh nút "Đăng nhập", vừa một màn hình (không cuộn dọc/ngang) kể cả có Turnstile`);
  }

  // 2) Không có Face ID (trình duyệt không hỗ trợ — xoá PublicKeyCredential trước khi trang chạy): chỉ còn nút "Đăng nhập" chiếm cả hàng.
  {
    const p = await env.openPage(view(390, 844, true));
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: "delete window.PublicKeyCredential;" });
    await p.send("Page.navigate", { url: env.localBase + "/login" });
    await p.waitFor("!!document.querySelector('#turnstile-widget input[name=cf-turnstile-response]')", "widget dựng xong (không Face ID)", 20000);
    await p.waitFor("!document.getElementById('company').hidden", "chân trang hiện (không Face ID)", 10000);
    const m = await measure(p);
    assert.equal(m.passkeyBtn, false, `nút Face ID phải ẨN — ${JSON.stringify(m)}`);
    assert.equal(m.submitBg, "rgb(12, 74, 110)", `nút Đăng nhập là nút chính (--c-primary) — ${JSON.stringify(m)}`);
    assert.equal(m.noVScroll, true, `390×844: vừa một màn hình — ${JSON.stringify(m)}`);
    await shot(p, "khong-face-id-dien-thoai.png");

    // Nút Hiện/Ẩn PIN: đổi type ô, chữ nút và aria-pressed; giá trị giữ nguyên.
    await p.ev(setInput("document.getElementById('pin')", "135790"));
    await p.ev("document.getElementById('pin-toggle').click(); true");
    assert.deepEqual(await p.ev("({ t: document.getElementById('pin').type, v: document.getElementById('pin').value, b: document.getElementById('pin-toggle').textContent, a: document.getElementById('pin-toggle').getAttribute('aria-pressed') })"), { t: "text", v: "135790", b: "Ẩn", a: "true" });
    await p.ev("document.getElementById('pin-toggle').click(); true");
    assert.deepEqual(await p.ev("({ t: document.getElementById('pin').type, b: document.getElementById('pin-toggle').textContent, a: document.getElementById('pin-toggle').getAttribute('aria-pressed') })"), { t: "password", b: "Hiện", a: "false" });

    // Báo lỗi sai PIN: khung lỗi hiện trong form, trang không vỡ bố cục.
    await p.ev(setInput("document.getElementById('phone')", ACCOUNTS.salesA.phone));
    await p.ev(setInput("document.getElementById('pin')", "000001"));
    await p.waitFor("!document.getElementById('submit').disabled", "nút mở khi widget có token", 20000);
    await p.ev("document.getElementById('submit').click(); true");
    await p.waitFor("!document.getElementById('error').hidden", "lỗi sai PIN hiện", 10000);
    assert.equal((await measure(p)).noHScroll, true, "không cuộn ngang khi có lỗi");
    await shot(p, "loi-sai-pin-dien-thoai.png");
    p.close();
    ok("Không có Face ID: nút Face ID ẩn, nút Đăng nhập là nút chính, vừa một màn hình; Hiện/Ẩn PIN đúng; lỗi sai PIN hiện, không cuộn ngang");
  }

  // 3) Khổ hẹp: 375 (iPhone SE/mini) widget đủ chỗ cỡ "flexible" (≥ 300px); 320 không cuộn ngang (widget tự lùi cỡ "compact").
  for (const w of [375, 320]) {
    const p = await open(view(w, 740, true), `${w}px`);
    const m = await measure(p);
    assert.equal(m.noHScroll, true, `${w}px: không cuộn ngang — ${JSON.stringify(m)}`);
    if (w === 375) assert.ok(m.widgetWidth >= 300, `375px: khung widget ≥ 300px để dùng cỡ "flexible" — ${JSON.stringify(m)}`);
    assert.equal(m.pageOverflow, "hidden", `${w}px: body không cuộn (máy thấp thì chỉ vùng giữa tự cuộn) — ${JSON.stringify(m)}`);
    await shot(p, `kho-${w}.png`);
    p.close();
    ok(`${w}px: không cuộn ngang${w === 375 ? `, khung widget ${m.widgetWidth}px (≥ 300, cỡ "flexible")` : ""}; vừa một màn hình ở ${w}×740: ${m.noVScroll ? "có" : "KHÔNG (vùng giữa tự cuộn)"}`);
  }
  console.log("DANG NHAP V2 OK");
} finally {
  await env.stop();
}
