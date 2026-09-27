// Kịch bản Chrome cho Task 4 (Web Push màn hình khoá, ADR-0036, lượt 2): mục "Thông báo trên điện thoại" ở trang Tài
// khoản — 5 trạng thái (chưa cài, không hỗ trợ, bị chặn, chưa bật, đang bật) + một vòng thật: bật → máy chủ gửi tin
// (VAPID ES256 ký thật) → service worker nhận `push` → showNotification đúng câu → tắt → đăng xuất tự huỷ máy.
// Dùng lại cơ chế CDP của A2 (a2-cdp.mjs); cặp khoá VAPID sinh MỚI mỗi lần chạy (taoCapKhoaVapidThu), không commit khoá.
//
// Headless CHỈ đủ cho 4 trạng thái tĩnh (không cần đăng ký push thật): chưa cài/không hỗ trợ/bị chặn/chưa bật.
// Vòng "đăng ký thật" (subscribe → push → showNotification) ĐÒI Chrome HEADFUL — Chrome `--headless=new` không đăng ký
// được với dịch vụ đẩy thật (subscribe() treo vô thời hạn, không throw, không log — đã đo tay lúc viết kịch bản này).
//
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/thong-bao/kich-ban/luot2-push-smoke.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = "docs/evidence/thong-bao";
const MOB = { width: 390, height: 844, mobile: true };
const ok = (m) => console.log(`✓ ${m}`);
const shot = (p, name) => p.shot(`${OUT}/${name}`);

// ===================================================================================================================
// Phần 1 — bốn trạng thái tĩnh (headless, không cần subscribe thật).
// ===================================================================================================================
{
  const env = await startEnv({ vapid: true });
  try {
    // 1a) "Chưa cài" (mặc định — không PushManager, chưa cài ra màn hình chính): script tiêm TRƯỚC khi trang tải.
    let p = await env.openPage(MOB);
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: "delete window.PushManager;" });
    const c1 = await env.login(ACCOUNTS.salesA);
    await p.send("Network.setCookie", { name: c1.name, value: c1.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + "/account" });
    await p.waitFor("document.readyState === 'complete'", "trang /account tải xong (chưa cài)");
    await p.waitFor("!!document.querySelector('#push')?.textContent", "mục Thông báo có nội dung (chưa cài)");
    const html1 = await p.ev(`document.querySelector('#push').innerHTML`);
    assert.match(html1, /Thêm vào MH chính/, `phải hiện hướng dẫn cài — ${html1}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (chưa cài): ${p.consoleErrors}`);
    await shot(p, "luot2-chua-cai.png");
    p.close();
    ok("Chưa cài ra màn hình chính: hiện đúng hướng dẫn Chia sẻ → Thêm vào MH chính");

    // 1b) "Không hỗ trợ" (đã cài — display-mode: standalone — nhưng vẫn thiếu PushManager, vd Safari/iOS quá cũ).
    p = await env.openPage(MOB);
    await p.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "delete window.PushManager; const mm = window.matchMedia; window.matchMedia = (q) => q.includes('display-mode') ? { matches: true, media: q } : mm(q);",
    });
    const c2 = await env.login(ACCOUNTS.salesA);
    await p.send("Network.setCookie", { name: c2.name, value: c2.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + "/account" });
    await p.waitFor("document.readyState === 'complete'", "trang /account tải xong (không hỗ trợ)");
    await p.waitFor("!!document.querySelector('#push')?.textContent", "mục Thông báo có nội dung (không hỗ trợ)");
    const html2 = await p.ev(`document.querySelector('#push').innerHTML`);
    assert.match(html2, /không hỗ trợ thông báo/, `phải hiện không hỗ trợ — ${html2}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (không hỗ trợ): ${p.consoleErrors}`);
    await shot(p, "luot2-khong-ho-tro.png");
    p.close();
    ok("Đã cài nhưng thiếu PushManager: hiện đúng câu 'không hỗ trợ thông báo'");

    // 1c) "Bị chặn" — Notification.permission = denied thật (Browser.setPermission), trình duyệt hỗ trợ đầy đủ.
    p = await env.as(ACCOUNTS.salesA, "/account", MOB);
    await p.send("Browser.setPermission", { permission: { name: "notifications" }, setting: "denied", origin: new URL(env.base).origin });
    await p.send("Page.navigate", { url: env.base + "/account" }); // tải lại: renderPush() đọc Notification.permission lúc dựng trang
    await p.waitFor("document.readyState === 'complete'", "trang /account tải lại (bị chặn)");
    await p.waitFor("!!document.querySelector('#push')?.textContent", "mục Thông báo có nội dung (bị chặn)");
    const html3 = await p.ev(`document.querySelector('#push').innerHTML`);
    assert.match(html3, /đã chặn thông báo/, `phải hiện đã bị chặn — ${html3}`);
    assert.equal(await p.ev("Notification.permission"), "denied");
    assert.deepEqual(p.consoleErrors, [], `lỗi console (bị chặn): ${p.consoleErrors}`);
    await shot(p, "luot2-bi-chan.png");
    p.close();
    ok("Đã chặn ở trình duyệt: hiện đúng hướng dẫn mở lại ở Cài đặt");

    // 1d) "Chưa bật" — trạng thái mặc định (hỗ trợ đầy đủ, permission "default", chưa có subscription).
    p = await env.as(ACCOUNTS.salesB, "/account", MOB);
    await p.waitFor("!!document.querySelector('#push')?.querySelector('button')", "nút Bật hiện (chưa bật)");
    const html4 = await p.ev(`document.querySelector('#push').innerHTML`);
    assert.match(html4, /Bật thông báo trên điện thoại/, `phải hiện nút Bật — ${html4}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (chưa bật): ${p.consoleErrors}`);
    await shot(p, "luot2-chua-bat.png");
    p.close();
    ok("Chưa bật: hiện đúng nút 'Bật thông báo trên điện thoại'");

    // 1e) I-1 (vòng rà 2026-09-28): đăng xuất ở máy CHƯA TỪNG bật thông báo vẫn phải huỷ MỌI địa chỉ của tài khoản
    // (ADR-0036 điều 6) — kể cả khi tài khoản đã bật ở MÁY KHÁC (mô phỏng: đăng ký thẳng qua API bằng một endpoint
    // giả, không qua trình duyệt này). Trước khi sửa I-1, `tatThongBaoMayNay()` có `if (!sub) return;` TRƯỚC lời gọi
    // huỷ nên bỏ qua hẳn bước này khi máy đang đăng xuất không có subscription cục bộ — máy kia không bao giờ tắt.
    const [{ id: accId }] = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.accounting.phone}'`);
    const epMayKhac = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    const cAcc = await env.login(ACCOUNTS.accounting);
    const dkKhac = await fetch(env.base + "/api/account/thong-bao/may", {
      method: "POST",
      headers: { "content-type": "application/json", origin: env.base, cookie: `${cAcc.name}=${cAcc.value}` },
      body: JSON.stringify({ endpoint: epMayKhac, thietBi: "Điện thoại (máy khác)" }),
    });
    assert.equal(dkKhac.status, 200, `đăng ký máy khác trước khi thử đăng xuất — ${await dkKhac.text()}`);
    const [{ n: soMayTruoc }] = env.sql(`SELECT COUNT(*) AS n FROM ntf_push_sub WHERE staff_id = '${accId}' AND revoked_at IS NULL`);
    assert.equal(soMayTruoc, 1, "trước khi đăng xuất: 1 máy đang bật (máy khác, không phải trình duyệt đang mở)");

    p = await env.as(ACCOUNTS.accounting, "/account", MOB);
    // Trình duyệt vừa mở CHƯA TỪNG bấm Bật — không có subscription cục bộ. Bấm Đăng xuất vẫn phải huỷ máy khác đó.
    await p.ev(`(() => { [...document.querySelectorAll('#links a, #links button')].find(b => b.textContent.trim() === 'Đăng xuất').click(); return true; })()`);
    await p.waitFor("location.pathname === '/login'", "đăng xuất xong (máy này chưa từng bật)", 8000);
    const [{ n: soMaySau }] = env.sql(`SELECT COUNT(*) AS n FROM ntf_push_sub WHERE staff_id = '${accId}' AND revoked_at IS NULL`);
    assert.equal(soMaySau, 0, "I-1: đăng xuất ở máy chưa từng bật vẫn phải huỷ máy khác của tài khoản");
    p.close();
    ok("I-1: đăng xuất từ máy chưa từng đăng ký push vẫn huỷ mọi địa chỉ của tài khoản (ADR-0036 điều 6)");
  } finally {
    await env.stop();
  }
}

// ===================================================================================================================
// Phần 2 — vòng thật: bật (subscribe thật) → máy chủ gửi tin thật → SW showNotification → tắt → đăng xuất tự huỷ máy.
// ĐÒI Chrome HEADFUL (xem đầu tệp) — A2_HEADFUL=1 chỉ áp cho Chrome KHỞI ĐỘNG SAU dòng này (đặt trước startEnv thứ 2).
// ===================================================================================================================
{
  process.env.A2_HEADFUL = "1";
  const env = await startEnv({ vapid: true });
  try {
    // Cho admin quyền Toàn quyền (SUPER_ADMIN) để gửi tin thủ công — chỉ dữ liệu của D1 TẠM, xoá cùng env.stop().
    const [{ id: adminId }] = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.admin.phone}'`);
    env.sql(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
      VALUES ('${randomUUID()}', '${adminId}', 'SUPER_ADMIN', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);

    const p = await env.as(ACCOUNTS.salesA, "/account", MOB);
    const [{ id: salesAId }] = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`);
    await p.send("Browser.grantPermissions", { origin: new URL(env.base).origin, permissions: ["notifications"] });
    await p.waitFor("!!document.querySelector('#push')?.querySelector('button')", "nút Bật hiện (vòng thật)");

    // I-3 (vòng rà 2026-09-28): mô phỏng subscription CŨ dùng CẶP KHOÁ VAPID KHÁC (đúng tình huống "Tắt khẩn cấp" rồi
    // đổi khoá — docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md) — subscribe THẬT bằng một khoá P-256 ngẫu nhiên, không
    // phải khoá của máy chủ đang chạy. Trước khi sửa: bấm Bật gọi `subscribe()` với khoá THẬT trong khi trình duyệt
    // còn giữ subscription khoá KHÁC → `InvalidStateError`, nút Bật báo lỗi mãi (không tự phục hồi được).
    await p.ev(`(async () => {
      const reg = await navigator.serviceWorker.ready;
      const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
      return true;
    })()`);
    await p.send("Page.navigate", { url: env.base + "/account" }); // tải lại: renderPush() đọc lại mayNay (false — endpoint lạ chưa đăng ký ở máy chủ)
    await p.waitFor("document.readyState === 'complete'", "tải lại sau khi có subscription khoá khác");
    await p.waitFor("!!document.querySelector('#push')?.querySelector('button')", "vẫn hiện nút Bật dù đã có subscription (khoá khác, mayNay=false)");

    await p.ev(`(() => { document.querySelector('#push button').click(); return true; })()`);
    await p.waitFor("document.querySelector('#push')?.textContent.includes('Đang bật')", "I-3: bật lại được dù trước đó có subscription khoá KHÁC (đợi mạng)", 15000);
    const [{ so_may: soMaySauBat }] = env.sql(`SELECT COUNT(*) AS so_may FROM ntf_push_sub WHERE staff_id = '${salesAId}' AND revoked_at IS NULL`);
    assert.equal(soMaySauBat, 1, "soMay phải = 1 sau khi bật");
    assert.deepEqual(p.consoleErrors, [], `lỗi console (sau khi bật): ${p.consoleErrors}`);
    await shot(p, "luot2-dang-bat.png");
    ok("Bật: trình duyệt hỏi quyền → đăng ký push THẬT → 'Đang bật trên máy này', soMay = 1");

    // Toàn quyền gửi tin thủ công (quanTrong:true để vượt giờ yên lặng) — dayGoCua chạy trong waitUntil của route này.
    const c = await env.login(ACCOUNTS.admin);
    const send = await fetch(env.base + "/api/thong-bao", {
      method: "POST",
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: JSON.stringify({ tieuDe: "Thử Web Push lượt 2", noiDung: "Nội dung thử", nguoiNhan: "noi-bo", quanTrong: true, clientRequestId: randomUUID() }),
    });
    assert.equal(send.status, 201, `gửi tin thủ công phải 201 — ${await send.text()}`);

    let notifs = [];
    const denTruocKhi = Date.now() + 20000;
    while (Date.now() < denTruocKhi && notifs.length === 0) {
      notifs = await p.ev(`(async () => { const reg = await navigator.serviceWorker.ready; return (await reg.getNotifications()).map(n => ({ title: n.title, body: n.body, data: n.data })); })()`);
      if (notifs.length === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    assert.equal(notifs.length, 1, `phải có đúng 1 thông báo hiện trên máy — nhận: ${JSON.stringify(notifs)}`);
    assert.equal(notifs[0].title, "Island Booking");
    assert.equal(notifs[0].body, "Thử Web Push lượt 2", "câu thông báo phải khớp tiêu đề tin vừa gửi (SW hỏi lại /api/thong-bao/moi-nhat)");
    assert.equal(notifs[0].data.lienKet, "/");
    ok("Chrome hiện đúng thông báo màn hình khoá: tiêu đề app + đúng câu tin vừa gửi + liên kết");

    // Tắt.
    await p.ev(`(() => { [...document.querySelectorAll('#push button')].find(b => b.textContent.trim() === 'Tắt').click(); return true; })()`);
    await p.waitFor("document.querySelector('#push')?.textContent.includes('Bật thông báo trên điện thoại')", "quay lại nút Bật sau khi Tắt", 8000);
    const [{ so_may: soMaySauTat }] = env.sql(`SELECT COUNT(*) AS so_may FROM ntf_push_sub WHERE staff_id = '${salesAId}' AND revoked_at IS NULL`);
    assert.equal(soMaySauTat, 0, "soMay phải = 0 sau khi Tắt");
    ok("Tắt: soMay = 0, quay lại nút Bật");

    // Bật lại rồi Đăng xuất — logout() phải POST …/may/huy {tatCa:true} + unsubscribe() TRƯỚC khi rời trang.
    await p.ev(`(() => { document.querySelector('#push button').click(); return true; })()`);
    await p.waitFor("document.querySelector('#push')?.textContent.includes('Đang bật')", "bật lại trước khi thử đăng xuất", 15000);
    await p.ev(`(() => { [...document.querySelectorAll('#links a, #links button')].find(b => b.textContent.trim() === 'Đăng xuất').click(); return true; })()`);
    await p.waitFor("location.pathname === '/login'", "đăng xuất xong, về /login", 8000);
    const [{ so_may: soMaySauDangXuat }] = env.sql(`SELECT COUNT(*) AS so_may FROM ntf_push_sub WHERE staff_id = '${salesAId}' AND revoked_at IS NULL`);
    const [{ revoke_reason }] = env.sql(`SELECT revoke_reason FROM ntf_push_sub WHERE staff_id = '${salesAId}' ORDER BY updated_at DESC LIMIT 1`);
    assert.equal(soMaySauDangXuat, 0, "soMay phải = 0 sau khi đăng xuất");
    assert.equal(revoke_reason, "dang-xuat", "lý do huỷ phải là 'dang-xuat' (đúng ADR-0036 điều 6)");
    ok("Đăng xuất: tự huỷ máy TRƯỚC khi rời trang (soMay = 0, revoke_reason = dang-xuat)");

    p.close();
  } finally {
    await env.stop();
  }
}

console.log("\nLƯỢT 2 (Task 4) — Chrome OK: 5 trạng thái + một vòng thật (bật → gửi thật → hiện đúng → tắt → đăng xuất tự huỷ).");
