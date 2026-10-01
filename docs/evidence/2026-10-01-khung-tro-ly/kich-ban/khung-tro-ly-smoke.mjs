// Kiểm khung "Hỗ trợ" nổi, kéo được, đổi cỡ được (kế hoạch docs/superpowers/plans/2026-10-01-khung-tro-ly-keo-doi-co.md) bằng Chrome thật (môi trường A2:
// D1 tạm + wrangler dev + Chrome headless qua CDP). KHÔNG cần mạng ngoài: máy OpenAI GIẢ chạy ngay trong kịch bản (như tro-ly-smoke.mjs).
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-khung-tro-ly/kich-ban/khung-tro-ly-smoke.mjs
//   a  mặc định ở 320 / 390 / 768 / 1040 / 1440: góc phải dưới, trong khung nhìn, không che nút "Hỗ trợ", không nền tối / tấm trượt, không tràn ngang;
//      390×844: cao ≤ 422 và diện tích < nửa màn; ô gõ 16px + có tiêu điểm; ARIA tiếng Việt; touch-action none; tay nắm ≥ 44px. Ảnh 390 + 1040.
//   b  kéo bằng chuột thật (CDP Input.dispatchMouseEvent) trên thanh tiêu đề: khung dời đúng độ dời; nhớ vào localStorage
//   c  kéo quá mép (trái-trên, phải-dưới): bị kẹp, chừa lề 8
//   d  đổi cỡ bằng tay nắm góc trên-trái: góc phải dưới đứng yên; kéo quá ⇒ dừng ở cỡ nhỏ nhất 260×300
//   e  tải lại trang: vị trí / cỡ được giữ
//   f  nút "Về góc": về đúng vị trí mặc định, xoá bộ nhớ
//   f2 (1.57) bấm 'Về góc' bằng chuột thật sau khi kéo + đổi cỡ ⇒ vị trí và cỡ mặc định, xoá bộ nhớ
//   g  đổi cỡ cửa sổ (1040×800 → 700×480): khung kẹp lại trong khung nhìn
//   h  390 cảm ứng (Input.dispatchTouchEvent) kéo thanh tiêu đề: khung dời, trang không cuộn
//   i  Esc đóng + tiêu điểm về nút; bấm nút khi đang mở = đóng (aria-expanded); trang phía sau vẫn bấm được khi khung mở (không modal)
//   j  320: kéo sang phải quá mép ⇒ không tràn ngang
//   l  320 (ADR-0073 Đ4): nút "Cuộc trò chuyện mới" ở chân khung, không tràn ngang; câu thứ hai mang nhớ (input là danh sách 3 mục);
//      bấm nút ⇒ xoá đoạn trên màn hình, câu kế KHÔNG mang nhớ (mã cuộc trò chuyện mới). Ảnh 320.
//   m  390 (bản 1.57, ghi vào docs/evidence/2026-10-01-tro-ly-mai/): placeholder "Hãy hỏi Mai tại đây nhé!"; nút đổi cỡ vẽ biểu tượng SVG (không còn góc CSS);
//      gửi câu (máy giả chậm 1,5 giây) ⇒ NGAY hiện bong bóng của trợ lý "Mai đang trả lời…" với ba chấm đang chạy animation, không còn dòng trạng thái riêng;
//      có trả lời ⇒ bong bóng mất; có lỗi (máy giả 500) ⇒ bong bóng mất, hiện tin lỗi; prefers-reduced-motion ⇒ ba chấm ẩn, còn chữ
//   n  (ADR-0084, ảnh vào docs/evidence/2026-10-01-tro-ly-mai/anh/) lời chào có tên: hồ sơ chưa ghi giới tính ⇒ "Chào bạn, mình là Mai — … Bạn cần hỏi gì…
//      cứ hỏi mình nhé!" (phán quyết điều phối 1/10: câu chào xưng theo {xung}, khớp Đ2);
//      đặt giới tính Nữ (SQL trên D1 tạm) ⇒ mở lại khung: "Chào chị Một, em là Mai — … Chị Một cần hỏi gì…", không còn chữ {ten}; 390 + 1040;
//      câu hỏi gửi máy giả mang dòng Mai "gọi là 'chị Một', xưng 'em'"
//   k  console sạch
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-01-khung-tro-ly";
mkdirSync(join(OUT, "anh"), { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const KHO = [
  { width: 320, height: 568, mobile: true },
  M,
  { width: 768, height: 1024, mobile: true },
  DESK,
  { width: 1440, height: 900, mobile: false },
];
const LE = 8;

// ---- máy OpenAI giả: ghi thân yêu cầu (bước l đọc "input" để biết câu có mang nhớ hay không)
const nhan = [];
const may = createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    // ADR-0082: cửa dấu vân nghĩa TẮT (503) ⇒ máy chủ lùi về từ khoá; `nhan` chỉ ghi /v1/responses như trước (bảng điều khiển canh đường mới).
    if (req.url === "/v1/embeddings") { res.writeHead(503, { "content-type": "application/json" }); return res.end("{}"); }
    nhan.push(JSON.parse(raw || "{}"));
    const cau = JSON.stringify(nhan.at(-1).input ?? "");
    if (cau.includes("gây lỗi")) { res.writeHead(500, { "content-type": "application/json" }); return res.end("{}"); }
    setTimeout(() => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Được." }] }], usage: { input_tokens: 1, input_tokens_details: { cached_tokens: 0 }, output_tokens: 1 } }));
    }, cau.includes("chờ lâu") ? 1500 : 0);
  });
});
await new Promise((r) => may.listen(0, "127.0.0.1", r));
const PORT = may.address().port;

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
const rect = (sel) => `(() => { const el = ${q(sel)}; if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }; })()`;
const VN = `(() => { const v = visualViewport; return { x: v.offsetLeft, y: v.offsetTop, w: v.width, h: v.height }; })()`;
const khungMo = `!!${q("#tl-khung")}`;
const XOA_LUU = `(() => { localStorage.removeItem('td_tro_ly_khung'); return true; })()`;
const tatCa = [];
const gan = (a, b, sai = 1) => Math.abs(a - b) <= sai;

const env = await startEnv({ vars: { OPENAI_API_KEY: "khoa-gia-chrome", OPENAI_BASE_URL: `http://127.0.0.1:${PORT}` } });

/** Mở trang /orders ở khổ `vp`, xoá vị trí đã lưu (nếu `xoa`), bấm nút Hỗ trợ, chờ khung. */
async function moKhung(vp, { xoa = true, path = "/orders" } = {}) {
  const p = await env.as(ACCOUNTS.salesA, path, vp);
  tatCa.push(p);
  await p.waitFor(`!!${q("#tl-fab")}`, "có nút Hỗ trợ", 10000);
  if (xoa) await p.ev(XOA_LUU);
  await sleep(300);
  await p.ev(`${q("#tl-fab")}.click(), true`);
  await p.waitFor(khungMo, "mở khung");
  await sleep(300); // kẹp lại ở khung hình sau
  return p;
}

/** Kéo bằng chuột thật: nhấn ở giữa phần tử `sel`, di theo `buoc` bước, thả. */
async function keoChuot(p, sel, dx, dy, buoc = 8) {
  const r = await p.ev(rect(sel));
  const x0 = r.left + Math.min(r.width / 2, 60);
  const y0 = r.top + r.height / 2;
  await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0, y: y0 });
  await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x: x0, y: y0, button: "left", buttons: 1, clickCount: 1 });
  for (let i = 1; i <= buoc; i++) {
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (dx * i) / buoc, y: y0 + (dy * i) / buoc, button: "left", buttons: 1 });
  }
  await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x0 + dx, y: y0 + dy, button: "left", buttons: 0, clickCount: 1 });
  await sleep(150);
}

const macDinh = {}; // khổ → hộp mặc định (bước a) để so ở bước f

try {
  await step("a", "mặc định ở 5 khổ: góc phải dưới, không che nút, không nền tối, không tràn; 390 ≤ nửa màn; ô gõ 16px; ARIA", async () => {
    for (const vp of KHO) {
      const p = await moKhung(vp);
      const [k, f, vn] = [await p.ev(rect("#tl-khung")), await p.ev(rect("#tl-fab")), await p.ev(VN)];
      const t = `${vp.width}: ${JSON.stringify({ k, f, vn })}`;
      assert.ok(k.left >= LE - 1 && k.top >= LE - 1 && k.right <= vn.w - LE + 1 && k.bottom <= vn.h - LE + 1, `trong khung nhìn — ${t}`);
      assert.ok(k.bottom <= f.top, `không che nút (đáy khung ≤ đỉnh nút) — ${t}`);
      assert.ok(vn.w - k.right <= 24, `sát mép phải — ${t}`);
      assert.ok(k.left + k.width / 2 >= vn.w / 2 - 1, `nằm nửa phải — ${t}`);
      assert.ok(k.bottom >= vn.h / 2, `nằm nửa dưới — ${t}`);
      assert.equal(await p.ev(`!!${q(".sheet-root")} || !!${q(".sheet-scrim")}`), false, "không có tấm phủ / nền tối");
      assert.equal(await p.ev(`document.body.classList.contains('sheet-open')`), false, "không khoá trang");
      assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, `không tràn ngang ở ${vp.width}`);
      macDinh[vp.width] = k;
      if (vp === M) {
        assert.ok(k.height <= 422, `390×844: cao ${k.height} ≤ 422`);
        assert.ok(k.width * k.height < (390 * 844) / 2, `390×844: diện tích ${k.width * k.height} < nửa màn`);
        const tab = await p.ev(rect("#tabbar"));
        assert.ok(!tab || k.bottom <= tab.top, "không che thanh tab");
      }
      assert.equal(await p.ev(`getComputedStyle(${q(".tl-o")}).fontSize`), "16px");
      assert.equal(await p.ev(`${q(".tl-o")}.getAttribute('placeholder')`), "Hãy hỏi Mai tại đây nhé!");
      assert.equal(await p.ev(`!!${q(".tl-co svg")}`), true, "nút đổi cỡ vẽ biểu tượng");
      assert.equal(await p.ev(`document.activeElement === ${q(".tl-o")}`), true, "tiêu điểm ở ô gõ");
      assert.equal(await p.ev(`${q("#tl-khung")}.getAttribute('role')`), "dialog");
      assert.equal(await p.ev(`${q("#tl-khung")}.hasAttribute('aria-modal')`), false, "không modal");
      assert.equal(await p.ev(`document.getElementById(${q("#tl-khung")}.getAttribute('aria-labelledby')).textContent`), "Hỗ trợ");
      assert.match(await p.ev(`${q(".tl-keo")}.getAttribute('aria-label')`), /^Di chuyển khung Hỗ trợ/);
      assert.match(await p.ev(`${q(".tl-co")}.getAttribute('aria-label')`), /^Đổi cỡ khung Hỗ trợ/);
      assert.equal(await p.ev(`getComputedStyle(${q(".tl-keo")}).touchAction`), "none");
      assert.equal(await p.ev(`getComputedStyle(${q(".tl-co")}).touchAction`), "none");
      const co = await p.ev(rect(".tl-co"));
      assert.ok(co.width >= 44 && co.height >= 44, `tay nắm ${co.width}×${co.height}`);
      assert.ok(co.left <= k.left + 2 && co.top <= k.top + 2, "tay nắm ở góc trên-trái");
      assert.equal(await p.ev(`${q(".tl-ve-goc")}.textContent`), "Về góc");
      // Chủ dự án 1/10: bỏ hai dòng nhắc trong khung (ý vẫn ở trang Trợ giúp).
      assert.equal(await p.ev(`document.querySelectorAll('#tl-khung .tl-luu-y').length`), 0, "không còn dòng nhắc");
      const chuKhung = await p.ev(`${q("#tl-khung")}.innerText`);
      assert.ok(!chuKhung.includes("Câu hỏi được lưu") && !chuKhung.includes("Trả lời do AI"), "hai dòng nhắc đã bỏ");
      assert.ok((await p.ev(`${q(".tl-tin-tro-ly .tl-chu")}.textContent`)).length > 0, "có câu chào");
      if (vp === M || vp === DESK) await p.shot(join(OUT, `anh/a-mac-dinh-${vp.width}.png`));
    }
  });

  await step("b", "1040: kéo bằng chuột trên thanh tiêu đề ⇒ khung dời đúng độ dời, nhớ vào localStorage", async () => {
    const p = await moKhung(DESK);
    const k0 = await p.ev(rect("#tl-khung"));
    await keoChuot(p, ".tl-keo", -300, -200);
    const k1 = await p.ev(rect("#tl-khung"));
    assert.ok(gan(k1.left, k0.left - 300) && gan(k1.top, k0.top - 200), JSON.stringify({ k0, k1 }));
    assert.equal(k1.width, k0.width);
    assert.equal(k1.height, k0.height);
    const luu = JSON.parse(await p.ev(`localStorage.getItem('td_tro_ly_khung')`));
    assert.equal(luu.w, k0.width);
    await p.shot(join(OUT, "anh/b-keo-1040.png"));
  });

  await step("c", "kéo quá mép trái-trên / phải-dưới ⇒ bị kẹp, chừa lề 8", async () => {
    const p = await moKhung(DESK);
    await keoChuot(p, ".tl-keo", -3000, -3000);
    let k = await p.ev(rect("#tl-khung"));
    assert.ok(gan(k.left, LE) && gan(k.top, LE), JSON.stringify(k));
    await keoChuot(p, ".tl-keo", 3000, 3000);
    k = await p.ev(rect("#tl-khung"));
    const vn = await p.ev(VN);
    assert.ok(gan(k.right, vn.w - LE) && gan(k.bottom, vn.h - LE), JSON.stringify({ k, vn }));
  });

  await step("d", "đổi cỡ bằng tay nắm góc trên-trái: góc phải dưới đứng yên; kéo quá ⇒ cỡ nhỏ nhất 260×300", async () => {
    const p = await moKhung(DESK);
    const k0 = await p.ev(rect("#tl-khung"));
    await keoChuot(p, ".tl-co", -120, -100);
    const k1 = await p.ev(rect("#tl-khung"));
    assert.ok(gan(k1.width, k0.width + 120) && gan(k1.height, k0.height + 100), JSON.stringify({ k0, k1 }));
    assert.ok(gan(k1.right, k0.right) && gan(k1.bottom, k0.bottom), "góc phải dưới đứng yên");
    await p.shot(join(OUT, "anh/d-doi-co-1040.png"));
    await keoChuot(p, ".tl-co", 2000, 2000);
    const k2 = await p.ev(rect("#tl-khung"));
    assert.ok(gan(k2.width, 260) && gan(k2.height, 300), JSON.stringify(k2));
    assert.ok(gan(k2.right, k0.right) && gan(k2.bottom, k0.bottom), "góc phải dưới vẫn đứng yên");
    // Nhỏ nhất vẫn thấy ô gõ và nút Gửi trong khung.
    const [o, g] = [await p.ev(rect(".tl-o")), await p.ev(rect(".tl-gui"))];
    assert.ok(o.bottom <= k2.bottom && g.right <= k2.right && o.height >= 43, JSON.stringify({ o, g, k2 }));
    await p.shot(join(OUT, "anh/d-nho-nhat-1040.png"));
  });

  await step("e", "tải lại trang ⇒ vị trí / cỡ được giữ", async () => {
    const p = await moKhung(DESK);
    await keoChuot(p, ".tl-keo", -250, -150);
    await keoChuot(p, ".tl-co", -40, -30);
    const k0 = await p.ev(rect("#tl-khung"));
    await p.send("Page.reload", {});
    await p.waitFor(`document.readyState === 'complete' && !!${q("#tl-fab")}`, "tải lại xong", 10000);
    await sleep(300);
    await p.ev(`${q("#tl-fab")}.click(), true`);
    await p.waitFor(khungMo, "mở lại khung");
    await sleep(300);
    const k1 = await p.ev(rect("#tl-khung"));
    assert.deepEqual(k1, k0);
  });

  await step("f", "nút 'Về góc' ⇒ về đúng vị trí mặc định, xoá bộ nhớ", async () => {
    const p = await moKhung(DESK, { xoa: false });
    const k0 = await p.ev(rect("#tl-khung"));
    assert.notDeepEqual(k0, macDinh[1040], "đang ở vị trí đã kéo (từ bước e)");
    await p.ev(`${q(".tl-ve-goc")}.click(), true`);
    await sleep(150);
    assert.deepEqual(await p.ev(rect("#tl-khung")), macDinh[1040]);
    assert.equal(await p.ev(`localStorage.getItem('td_tro_ly_khung')`), null);
  });

  await step("f2", "'Về góc' bấm BẰNG CHUỘT THẬT (không .click() giả): kéo khung ra khỏi góc + đổi cỡ, bấm ⇒ vị trí VÀ cỡ về mặc định, xoá bộ nhớ; 1040 + 390", async () => {
    for (const [vp, camUng] of [[DESK, false], [M, false], [M, true]]) {
      const p = await moKhung(vp);
      const mac = await p.ev(rect("#tl-khung"));
      await keoChuot(p, ".tl-co", -80, -60); // đổi cỡ (góc phải dưới đứng yên)
      await keoChuot(p, ".tl-keo", -120, -90); // rồi kéo ra khỏi góc
      const lech = await p.ev(rect("#tl-khung"));
      assert.notDeepEqual(lech, mac, `${vp.width}: đã rời mặc định`);
      assert.ok(lech.width !== mac.width || lech.height !== mac.height, `${vp.width}: cỡ đã đổi — ${JSON.stringify({ mac, lech })}`);
      assert.notEqual(await p.ev(`localStorage.getItem('td_tro_ly_khung')`), null, "đã nhớ");
      const nut = await p.ev(rect(".tl-ve-goc"));
      const [x, y] = [nut.left + nut.width / 2, nut.top + nut.height / 2];
      if (camUng) {
        await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
        await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
      }
      await sleep(200);
      assert.deepEqual(await p.ev(rect("#tl-khung")), mac, `${vp.width}${camUng ? ' (chạm)' : ''}: về đúng vị trí + cỡ mặc định`);
      assert.equal(await p.ev(`localStorage.getItem('td_tro_ly_khung')`), null, "xoá bộ nhớ");
      assert.equal(await p.ev(`${q("#tl-khung")}.classList.contains('is-ve-goc')`), true, "khung nháy viền báo nút đã nhận");
      assert.equal(await p.ev(`getComputedStyle(${q("#tl-khung")}).animationName`), "tl-ve-goc-nhay");
      await sleep(900);
      assert.equal(await p.ev(`${q("#tl-khung")}.classList.contains('is-ve-goc')`), false, "nháy xong thì tắt");
      if (vp === M) await p.shot(join(OUT, "anh/f2-ve-goc-390.png"));
    }
  });

  await step("g", "đổi cỡ cửa sổ 1040×800 → 700×480: khung kẹp lại trong khung nhìn", async () => {
    const p = await moKhung(DESK);
    await keoChuot(p, ".tl-keo", -500, -300);
    await p.send("Emulation.setDeviceMetricsOverride", { width: 700, height: 480, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    const [k, vn] = [await p.ev(rect("#tl-khung")), await p.ev(VN)];
    assert.ok(k.left >= LE - 1 && k.top >= LE - 1 && k.right <= vn.w - LE + 1 && k.bottom <= vn.h - LE + 1, JSON.stringify({ k, vn }));
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0);
  });

  await step("h", "390 cảm ứng: kéo thanh tiêu đề bằng ngón tay ⇒ khung dời, trang không cuộn", async () => {
    const p = await moKhung(M);
    const k0 = await p.ev(rect("#tl-khung"));
    const r = await p.ev(rect(".tl-keo"));
    const sy = await p.ev("scrollY");
    const x0 = r.left + 40;
    const y0 = r.top + r.height / 2;
    await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 8; i++) await p.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 - (40 * i) / 8, y: y0 - (200 * i) / 8 }] });
    await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(200);
    const k1 = await p.ev(rect("#tl-khung"));
    assert.ok(k1.top < k0.top - 150, `khung lên trên ${JSON.stringify({ k0, k1 })}`);
    assert.equal(await p.ev("scrollY"), sy, "trang không cuộn");
    await p.shot(join(OUT, "anh/h-keo-cam-ung-390.png"));
    await p.ev(`${q(".tl-ve-goc")}.click(), true`);
  });

  await step("i", "Esc đóng + tiêu điểm về nút; bấm nút khi mở = đóng; trang sau vẫn bấm được (không modal)", async () => {
    const p = await moKhung(DESK);
    assert.equal(await p.ev(`${q("#tl-fab")}.getAttribute('aria-expanded')`), "true");
    assert.equal(await p.ev(`[...document.body.children].some((el) => el.hasAttribute('inert'))`), false, "trang sau không bị khoá");
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await p.waitFor(`!${khungMo}`, "Esc đóng khung");
    assert.equal(await p.ev(`document.activeElement === ${q("#tl-fab")}`), true, "tiêu điểm về nút");
    assert.equal(await p.ev(`${q("#tl-fab")}.getAttribute('aria-expanded')`), "false");
    await p.ev(`${q("#tl-fab")}.click(), true`);
    await p.waitFor(khungMo, "mở lại");
    await p.ev(`${q("#tl-fab")}.click(), true`);
    await p.waitFor(`!${khungMo}`, "bấm nút lần nữa = đóng");
    await p.ev(`${q("#tl-fab")}.click(), true`);
    await p.waitFor(khungMo, "mở lại");
    await p.ev(`${q(".tl-dong")}.click(), true`);
    await p.waitFor(`!${khungMo}`, "nút ✕ đóng");
  });

  await step("j", "320: kéo sang phải quá mép ⇒ không tràn ngang, khung trong khung nhìn", async () => {
    const p = await moKhung(KHO[0]);
    await keoChuot(p, ".tl-keo", 400, 0);
    const [k, vn] = [await p.ev(rect("#tl-khung")), await p.ev(VN)];
    assert.ok(k.left >= LE - 1 && k.right <= vn.w - LE + 1, JSON.stringify({ k, vn }));
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0);
    await p.shot(join(OUT, "anh/j-320.png"));
    await p.ev(`${q(".tl-ve-goc")}.click(), true`);
  });

  await step("l", "320: nút 'Cuộc trò chuyện mới' ở chân khung, không tràn ngang; câu thứ hai mang nhớ (input là danh sách); bấm nút ⇒ xoá đoạn trên màn hình, câu kế không nhớ", async () => {
    const p = await moKhung(KHO[0]);
    assert.equal(await p.ev(`!!document.querySelector('.tl-chan .tl-cuoc-moi')`), true);
    assert.equal(await p.ev(`${q(".tl-cuoc-moi")}.textContent`), "Cuộc trò chuyện mới");
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0);
    const gui = async (c) => {
      const truoc = await p.ev(`document.querySelectorAll('.tl-tin-tro-ly:not(.tl-dang-tra)').length`);
      await p.ev(`(() => { ${q(".tl-o")}.value = ${JSON.stringify(c)}; ${q(".tl-form")}.requestSubmit(); return true; })()`);
      await p.waitFor(`document.querySelectorAll('.tl-tin-tro-ly:not(.tl-dang-tra)').length > ${truoc}`, "có trả lời", 15000);
    };
    await gui("đổi mã PIN thế nào");
    assert.equal(nhan.at(-1).input, "đổi mã PIN thế nào", "câu đầu không có nhớ");
    await gui("còn trên điện thoại thì sao");
    assert.ok(Array.isArray(nhan.at(-1).input) && nhan.at(-1).input.length === 3, JSON.stringify(nhan.at(-1).input));
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, "có tin vẫn không tràn ngang");
    await p.shot(join(OUT, "anh/l-hai-cau-320.png"));
    await p.ev(`${q(".tl-cuoc-moi")}.click(), true`);
    assert.equal(await p.ev(`document.querySelectorAll('.tl-tin-nguoi').length`), 0);
    await gui("lập đơn mới ra sao");
    assert.equal(nhan.at(-1).input, "lập đơn mới ra sao", "cuộc trò chuyện mới không mang nhớ");
    await p.shot(join(OUT, "anh/l-cuoc-moi-320.png"));
  });

  await step("m", "390: placeholder mới; bong bóng 'Mai đang trả lời…' ba chấm chạy ngay khi gửi, mất khi có trả lời / lỗi; giảm chuyển động ⇒ chỉ còn chữ", async () => {
    const p = await moKhung(M);
    await p.shot(join(OUT, "anh/m-placeholder-390.png"));
    const gui = (c) => p.ev(`(() => { ${q(".tl-o")}.value = ${JSON.stringify(c)}; ${q(".tl-form")}.requestSubmit(); return true; })()`);
    await gui("đổi mã PIN, chờ lâu");
    await p.waitFor(`!!${q(".tl-dang-tra")}`, "bong bóng đang trả lời hiện ngay", 1000);
    assert.equal(await p.ev(`${q(".tl-dang-tra")}.classList.contains('tl-tin-tro-ly')`), true, "là bong bóng của trợ lý");
    assert.equal(await p.ev(`${q(".tl-dang-tra-chu")}.textContent`), "Mai đang trả lời…");
    assert.equal(await p.ev(`document.querySelectorAll('.tl-dang-tra .tl-cham i').length`), 3);
    assert.equal(await p.ev(`document.querySelectorAll('.tl-dang-tra').length`), 1, "chỉ MỘT bong bóng");
    assert.equal(await p.ev(`!!${q(".tl-trang-thai")}`), false, "không còn dòng trạng thái riêng (khỏi hiện hai lần)");
    assert.equal(await p.ev(`getComputedStyle(${q(".tl-cham i")}).animationName`), "tl-cham-nhay");
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0);
    await p.shot(join(OUT, "anh/m-dang-tra-loi-390.png"));
    await p.waitFor(`!${q(".tl-dang-tra")}`, "bong bóng mất khi có trả lời", 10000);
    assert.equal(await p.ev(`document.querySelectorAll('.tl-tin-tro-ly').length`), 2, "câu chào + câu trả lời");
    await gui("gây lỗi");
    await p.waitFor(`!!${q(".tl-tin-loi")}`, "có tin lỗi", 10000);
    assert.equal(await p.ev(`!!${q(".tl-dang-tra")}`), false, "lỗi ⇒ bong bóng mất");
    await p.shot(join(OUT, "anh/m-loi-390.png"));
    // giảm chuyển động
    await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await gui("đổi mã PIN, chờ lâu");
    await p.waitFor(`!!${q(".tl-dang-tra")}`, "bong bóng hiện (giảm chuyển động)", 1000);
    assert.equal(await p.ev(`getComputedStyle(${q(".tl-cham")}).display`), "none", "không nhấp nháy");
    assert.equal(await p.ev(`${q(".tl-dang-tra-chu")}.offsetParent !== null`), true, "vẫn thấy chữ");
    await p.shot(join(OUT, "anh/m-giam-chuyen-dong-390.png"));
    await p.waitFor(`!${q(".tl-dang-tra")}`, "bong bóng mất", 10000);
    await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  });

  await step("n", "ADR-0084: lời chào có tên — 'bạn' khi chưa ghi giới tính, 'chị Một' khi giới tính Nữ; không còn {ten}; máy giả nhận dòng Mai", async () => {
    const MAI = "docs/evidence/2026-10-01-tro-ly-mai/anh";
    mkdirSync(MAI, { recursive: true });
    const chao = `${q('[data-tl="loi-chao"] .tl-chu')}.textContent`;
    let p = await moKhung(M);
    await p.shot(join(MAI, "n-loi-chao-ban-minh-390.png"));
    assert.equal(await p.ev(chao), "Chào bạn, mình là Mai — trợ lý của Tour Đảo. Bạn cần hỏi gì về cách dùng app cứ hỏi mình nhé!");
    env.sql(`UPDATE pty_person SET gender = 'NU' WHERE party_id = (SELECT party_id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}')`);
    for (const vp of [M, DESK]) {
      p = await moKhung(vp);
      const t = await p.ev(chao);
      assert.equal(t, "Chào chị Một, em là Mai — trợ lý của Tour Đảo. Chị Một cần hỏi gì về cách dùng app cứ hỏi em nhé!");
      assert.ok(!t.includes("{ten}") && !t.includes("{xung}"));
      assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0);
      await p.shot(join(MAI, `n-loi-chao-co-ten-${vp.width}.png`));
    }
    const truoc = nhan.length;
    await p.ev(`(() => { ${q(".tl-o")}.value = "đổi mã PIN thế nào"; ${q(".tl-form")}.requestSubmit(); return true; })()`);
    await p.waitFor(`!${q(".tl-dang-tra")} && document.querySelectorAll('.tl-tin-tro-ly').length >= 2`, "có trả lời (bong bóng đang trả lời đã mất)", 10000);
    assert.equal(nhan.length, truoc + 1);
    assert.ok(String(nhan.at(-1).instructions).includes("Người đang hỏi: gọi là 'chị Một', xưng 'em'."));
  });

  await step("k", "console sạch ở mọi trang đã mở", async () => {
    const loi = tatCa.flatMap((p) => p.consoleErrors);
    assert.deepEqual(loi, []);
  });
} finally {
  for (const p of tatCa) p.close();
  may.close();
  await env.stop();
}
if (failures.length) {
  console.log(`\n${failures.length} bước lỗi: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nTất cả bước đạt.");
