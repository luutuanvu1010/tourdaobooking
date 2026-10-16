// Kịch bản Chrome — khối "Hồ sơ của tôi" ở trang Tôi (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2). D1 tạm của vc-lib (không đụng dữ liệu thật). Chữ chính sách là chữ THỬ.
// 1) Đối tác (390): chưa có chính sách → khối hiện, câu "Chưa có chính sách riêng tư…", không form.
// 2) Toàn quyền đăng chính sách qua API. Đối tác (390 + 1040): hộp đồng ý; tick + Đồng ý → tải lại, form hiện; MỌI ô gõ 16px; khai CCCD → "Đã gửi…", phiếu "Chờ xác minh",
//    số đủ không có trong DOM; axe.
// 3) Đối tác rút phiếu (bước xác nhận trong trang) → "Đã rút".
// 3b) Vòng sửa 1 (ruling I-2): Toàn quyền đăng bản 2 qua API → Đối tác thấy "vẫn đang đồng ý … phiên bản cũ 1" + hộp đồng ý bản 2; rút đồng ý bản cũ (xác nhận trong
//     trang) → dòng bản cũ biến mất.
// 4) Toàn quyền: khung "Đăng chính sách riêng tư mới" hiện; Bán hàng: không có khung đó.
// Mở theo thứ tự Đối tác → Bán hàng → Toàn quyền (các trang dùng chung kho cookie — tài khoản mở sau cùng là Toàn quyền).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-10-17-tu-khai/kich-ban/tu-khai-smoke.mjs
import { ACCOUNTS, DESK, MOB, PARTNER, SUPER, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, sleep } from "../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs";

const dem = boDem("TU KHAI SMOKE");
const { env, call } = await dungMoiTruong([PARTNER, SUPER]);
const SO = "079777888999"; // số GIẢ
const doc = (p) => p.ev(`(() => {
  const s = document.querySelector('#ho-so-cua-toi');
  const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
  return s && { hien: !s.hidden && s.getClientRects().length > 0, chu: t(s), form: !!s.querySelector('#hs-form'), dangCs: !!s.querySelector('#hs-dang-chinh-sach'),
    co16: [...s.querySelectorAll('input:not([type=checkbox]), select, textarea')].filter((e) => e.getClientRects().length > 0).map((e) => getComputedStyle(e).fontSize),
    html: document.documentElement.outerHTML };
})()`);
try {
  await dem.step("1", "Đối tác (390), chưa có chính sách: khối hiện, câu lời thường, không form", async () => {
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!document.querySelector('#ho-so-cua-toi').hidden", "khối Hồ sơ của tôi", 10000);
      const s = await doc(p);
      assert.ok(s.chu.includes("Chưa có chính sách riêng tư nên chưa gửi được thông tin."), s.chu);
      assert.equal(s.form, false);
      assert.equal(s.dangCs, false, "Đối tác không có khung đăng chính sách");
    } finally {
      p.close();
    }
  });
  const r = await call(SUPER, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "THỬ — mục đích thử nghiệm", noiDung: "THỬ — toàn văn thử nghiệm, không phải văn bản pháp lý." });
  assert.equal(r.status, 201, r.text);
  for (const [id, ten, vp] of [["2a", "390", MOB], ["2b", "1040", DESK]]) {
    await dem.step(id, `Đối tác (${ten}): đồng ý → form; ô gõ 16px; khai → Đã gửi + Chờ xác minh; không số đủ trong DOM` + axeNote(), async () => {
      const p = await env.as(PARTNER, "/account", vp);
      try {
        await p.waitFor("!!document.querySelector('#ho-so-cua-toi h2')", "khối", 10000);
        if (!(await doc(p)).form) {
          await p.ev("document.querySelector('#hs-dong-y').click()");
          await p.ev("[...document.querySelectorAll('#ho-so-cua-toi button')].find((b) => b.textContent === 'Đồng ý').click()");
          await p.waitFor("!!document.querySelector('#hs-form')", "form sau khi đồng ý", 10000);
        }
        const s = await doc(p);
        assert.ok(s.co16.length > 0 && s.co16.every((f) => f === "16px"), `ô gõ phải 16px: ${s.co16.join(",")}`);
        if (id === "2a") {
          await p.ev(`(() => { const l = document.querySelector('#hs-loai'); l.value = 'GIAY_TO'; l.dispatchEvent(new Event('change'));
            const g = document.querySelector('#hs-loai-giay'); g.value = 'CCCD'; g.dispatchEvent(new Event('change'));
            document.querySelector('#hs-so').value = '${SO}'; document.querySelector('#hs-form').requestSubmit(); })()`);
          await p.waitFor("location.search.includes('hoso=da-gui') && !!document.querySelector('#ho-so-cua-toi .hs-phieu')", "phiếu sau khi gửi", 10000);
          const sau = await doc(p);
          assert.ok(sau.chu.includes("Đã gửi. Người khác sẽ xác minh trước khi thông tin được dùng."), sau.chu);
          assert.ok(sau.chu.includes("Chờ xác minh") && sau.chu.includes("••••8999"), sau.chu);
          assert.ok(!sau.html.includes(SO), "số đủ không được có trong DOM");
        }
        await axe(p, `ho-so-cua-toi ${ten}`);
        await shotFull(p, `tu-khai-doi-tac-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  await dem.step("3", "Đối tác rút phiếu: bước xác nhận trong trang → Đã rút", async () => {
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#ho-so-cua-toi .hs-phieu button')", "nút rút", 10000);
      await p.ev("[...document.querySelectorAll('#ho-so-cua-toi .hs-phieu button')].find((b) => b.textContent === 'Rút phiếu').click()");
      await p.ev("[...document.querySelectorAll('#ho-so-cua-toi .hs-phieu button')].find((b) => b.textContent === 'Rút phiếu này').click()");
      await p.waitFor("location.search.includes('hoso=da-luu')", "tải lại sau khi rút", 10000);
      await sleep(500);
      assert.ok((await doc(p)).chu.includes("Đã rút"));
    } finally {
      p.close();
    }
  });
  await dem.step("3b", "Đối tác rút đồng ý phiên bản CŨ sau khi có bản 2 (ruling I-2)", async () => {
    const r2 = await call(SUPER, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "THỬ — mục đích bản hai", noiDung: "THỬ — toàn văn bản hai, không phải văn bản pháp lý." });
    assert.equal(r2.status, 201, r2.text);
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#ho-so-cua-toi h2')", "khối", 10000);
      const s = await doc(p);
      assert.ok(s.chu.includes("Bạn vẫn đang đồng ý chính sách riêng tư phiên bản cũ 1."), s.chu);
      assert.ok(s.chu.includes("phiên bản 2"), s.chu);
      assert.equal(s.form, false, "chưa đồng ý bản 2 thì chưa có form khai");
      await p.ev("[...document.querySelectorAll('#ho-so-cua-toi button')].find((b) => b.textContent === 'Rút đồng ý' && b.offsetParent).click()");
      await p.ev("[...document.querySelectorAll('#ho-so-cua-toi .hs-xac-nhan button')].find((b) => b.textContent === 'Rút đồng ý' && b.offsetParent).click()");
      await p.waitFor("location.search.includes('hoso=da-luu')", "tải lại sau khi rút đồng ý bản cũ", 10000);
      await sleep(500);
      assert.ok(!(await doc(p)).chu.includes("phiên bản cũ 1"), "dòng bản cũ phải biến mất");
      await axe(p, "ho-so-cua-toi sau rút bản cũ");
    } finally {
      p.close();
    }
  });
  await dem.step("4", "Bán hàng không có khung đăng chính sách; Toàn quyền có", async () => {
    const b = await env.as(ACCOUNTS.salesA, "/account", MOB);
    try {
      await b.waitFor("!!document.querySelector('#ho-so-cua-toi h2')", "khối Bán hàng", 10000);
      assert.equal((await doc(b)).dangCs, false);
    } finally {
      b.close();
    }
    const t = await env.as(SUPER, "/account", DESK);
    try {
      await t.waitFor("!!document.querySelector('#hs-dang-chinh-sach')", "khung đăng chính sách", 10000);
      await shotFull(t, "tu-khai-toan-quyen-1040.png");
    } finally {
      t.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
