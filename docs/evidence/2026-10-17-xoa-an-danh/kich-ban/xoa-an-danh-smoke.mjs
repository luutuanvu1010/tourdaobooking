// Kịch bản Chrome — xoá dữ liệu / ẩn danh hoá (ADR-0126; lát H-5 Gói 2, việc 7). D1 tạm của vc-lib (không đụng dữ liệu thật; ẩn danh hoá CHỈ chạy trên D1 tạm này).
// Mọi dữ liệu là dữ liệu THỬ (số giấy tờ GIẢ, chữ chính sách THỬ, IP 203.0.113.x là dải tài liệu).
//  0) Toàn quyền (1040 + 390) mở trang Phiên khi chính sách CHƯA có số ngày: câu "chưa có thời hạn giữ phiên", nút tắt.
//  1) Đối tác (390 + 1040) mở trang Tôi: mục "Yêu cầu xoá dữ liệu", câu "Chính sách chưa ghi thời hạn" (không bịa số), nút Gửi yêu cầu xoá.
//  2) Toàn quyền đăng chính sách có số ngày (hai ô số, ô gõ 16px, nhập chữ → lỗi lời thường, nhập số → đăng được).
//  3) Đối tác gửi yêu cầu xoá HAI bước ("không hoàn tác"), thấy "Chờ xử lý" + hạn 30 ngày, phiếu tự khai đang chờ bị rút; rút yêu cầu rồi gửi lại.
//  4) Quản trị (390 rồi 1040) mở Danh bạ: hai khối mở lười (chưa mở thì chưa gọi API), thẻ phiếu, xem trước chỉ SỐ ĐẾM; Từ chối chọn trong danh sách đóng (không ô chữ);
//     Thực hiện hai bước → "Đã thực hiện xoá".
//  5) Đối tác mở lại trang Tôi: "Đã thực hiện", phần được giữ lại + câu căn cứ, hồ sơ "Đã xoá theo yêu cầu", không dấu giữ chỗ.
//  6) Quản trị mở hồ sơ Đối tác trong Danh bạ: không số / dấu giữ chỗ.
//  7) Quản trị: "Ảnh giấy tờ hết lý do giữ" (không khoá kho), chọn → xác nhận không hoàn tác → xoá.
//  8) Toàn quyền (mở SAU CÙNG — kho cookie chung) ở trang Phiên: "Ẩn danh IP và thông tin máy của N phiên…", xác nhận không hoàn tác, ẩn danh thật trên D1 tạm.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-17-xoa-an-danh node docs/evidence/2026-10-17-xoa-an-danh/kich-ban/xoa-an-danh-smoke.mjs
import { randomUUID } from "node:crypto";
import { ACCOUNTS, AXE, DESK, MOB, PARTNER, SUPER, apiCalls, assert, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep, txt } from "../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs";

/** axe-core (WCAG 2 A + AA + best-practice; tắt meta-viewport như mọi kịch bản Chrome của Nền tảng — mọi trang có maximum-scale=1): critical/serious ⇒ đỏ. */
const axe = async (p, nhan) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
  if (vi.length) console.log(`  (axe nhẹ, ${nhan}: ${vi.map((v) => `${v.impact} ${v.id}`).join(", ")})`);
};

const dem = boDem("XOA AN DANH SMOKE");
const { env, call, ids, themGiayNguoi } = await dungMoiTruong([PARTNER, SUPER]);
const SO = "079777888999"; // số GIẢ
const ADMIN = ACCOUNTS.admin;
const partyDoiTac = ids[PARTNER.phone].partyId;
const vung = (p, sel) => p.ev(`(() => {
  const s = document.querySelector(${JSON.stringify(sel)});
  const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
  return s && { hien: !s.hidden && s.getClientRects().length > 0, chu: t(s), html: document.documentElement.outerHTML,
    nutHien: [...s.querySelectorAll('button')].filter((b) => b.getClientRects().length > 0).map((b) => ({ chu: b.innerText.trim(), tat: b.disabled })),
    oChu: s.querySelectorAll('textarea, input[type=text], input:not([type])').length };
})()`);
const bam = async (p, scope, chu) => assert.ok(await p.ev(clickVisible(scope, chu)), `không thấy nút “${chu}” trong ${scope}`);
const KHONG_DAU_GIU_CHO = (html, nhan) => {
  assert.ok(!html.includes("1900-01-01"), `${nhan}: lộ ngày sinh giữ chỗ`);
  assert.ok(!/XOA[0-9A-Z]/.test(html), `${nhan}: lộ số giữ chỗ`);
  assert.ok(!html.includes(SO), `${nhan}: lộ số giấy tờ đủ`);
};
// Đối tác chịu luật một máy: các lần mở trang bằng Chrome đã thay phiên cũ của `call` ⇒ đăng nhập lại rồi mới gọi API.
const guiXoaQuaApi = async () => {
  const c = await env.login(PARTNER);
  const r = await fetch(`${env.base}/api/parties/cua-toi/phieu-xoa`, { method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: JSON.stringify({ xacNhan: true }) });
  assert.equal(r.status, 201, await r.text());
};

try {
  // ---- Dữ liệu thử qua API ----
  const cs = await call(SUPER, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "THỬ — mục đích thử nghiệm", noiDung: "THỬ — toàn văn thử nghiệm, không phải văn bản pháp lý." });
  assert.equal(cs.status, 201, cs.text);
  const hs = (await call(PARTNER, "GET", "/api/parties/cua-toi")).json;
  assert.equal((await call(PARTNER, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: hs.chinhSach.id, quyetDinh: "DONG_Y" })).status, 200);
  const ps = await call(PARTNER, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: hs.chinhSach.id, loai: "NGAY_SINH", ngaySinh: "1990-05-17" });
  assert.equal(ps.status, 201, ps.text);
  await themGiayNguoi(partyDoiTac, { typeCode: "CCCD", number: SO, classCode: null, issuedDate: null, issuedPlace: null, expiryDate: null }, ADMIN);

  for (const [id, ten, vp] of [["0a", "1040", DESK], ["0b", "390", MOB]]) {
    await dem.step(id, `Toàn quyền (${ten}) ở trang Phiên, chính sách chưa có số ngày: câu "chưa có thời hạn giữ phiên", nút tắt` + axeNote(), async () => {
      const p = await env.as(SUPER, "/sessions", vp);
      try {
        await p.waitFor("!document.querySelector('#an-danh-phien').hidden", "khối ẩn danh phiên cũ", 15000);
        const s = await vung(p, "#an-danh-phien");
        assert.ok(s.chu.includes("Ẩn danh hoá máy đã đăng xuất") && s.chu.includes("Chính sách riêng tư chưa có thời hạn giữ thông tin máy đã đăng xuất"), s.chu);
        assert.ok(s.nutHien.some((b) => b.chu === "Ẩn danh hoá" && b.tat === true), "nút phải tắt khi chưa có thời hạn");
        await axe(p, `phien-chua-co-han ${ten}`);
        await shotFull(p, `phien-chua-co-han-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  for (const [id, ten, vp] of [["1a", "390", MOB], ["1b", "1040", DESK]]) {
    await dem.step(id, `Đối tác (${ten}) ở trang Tôi: mục Yêu cầu xoá dữ liệu, chưa có số ngày thì nói lời thường` + axeNote(), async () => {
      const p = await env.as(PARTNER, "/account", vp);
      try {
        await p.waitFor("!!document.querySelector('#hs-xoa-gui')", "nút Gửi yêu cầu xoá", 15000);
        const s = await vung(p, "#ho-so-cua-toi");
        assert.ok(s.chu.includes("Yêu cầu xoá dữ liệu") && s.chu.includes("Chính sách chưa ghi thời hạn"), s.chu);
        assert.ok(!/Thời hạn xử lý: \d/.test(s.chu), "không được bịa số ngày khi chính sách chưa có");
        assert.ok(s.nutHien.some((b) => b.chu === "Gửi yêu cầu xoá" && b.tat === false));
        KHONG_DAU_GIU_CHO(s.html, "trang Tôi trước khi xoá");
        await axe(p, `ho-so-cua-toi-truoc-xoa ${ten}`);
        await shotFull(p, `doi-tac-truoc-xoa-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  await dem.step("2", "Toàn quyền (1040) đăng chính sách có số ngày: hai ô số 16px; nhập chữ → lỗi lời thường, không đăng; nhập số → đăng được" + axeNote(), async () => {
    const p = await env.as(SUPER, "/account", DESK);
    try {
      await p.waitFor("!!document.querySelector('#hs-cs-han-xoa')", "ô số ngày xử lý", 15000);
      const co16 = await p.ev("['#hs-cs-han-xoa', '#hs-cs-han-phien', '#hs-cs-muc-dich', '#hs-cs-noi-dung'].map((s) => getComputedStyle(document.querySelector(s)).fontSize)");
      assert.ok(co16.every((f) => f === "16px"), `ô gõ phải 16px: ${co16.join(",")}`);
      const banTruoc = (await call(SUPER, "GET", "/api/parties/cua-toi")).json.chinhSach.phienBan;
      const nhapVaDang = async (xoa, phien) => {
        await p.ev(`(() => { document.querySelector('#hs-dang-chinh-sach').open = true;
          const a = document.querySelector('#hs-cs-han-xoa'); a.value = ${JSON.stringify(xoa)}; const b = document.querySelector('#hs-cs-han-phien'); b.value = ${JSON.stringify(phien)};
          document.querySelector('#hs-dang-cs button[type=submit]').click(); })()`);
        await p.waitFor("!document.querySelector('#hs-dang-cs-xac-nhan').hidden", "bước xác nhận đăng", 5000);
        await shotFull(p, "toan-quyen-dang-chinh-sach-1040.png");
        await bam(p, "#hs-dang-cs-xac-nhan", "Xác nhận đăng");
      };
      await nhapVaDang("abc", "");
      await p.waitFor("document.body.innerText.includes('Số ngày phải là số nguyên từ 1 trở lên')", "câu lỗi lời thường", 8000);
      assert.equal((await call(SUPER, "GET", "/api/parties/cua-toi")).json.chinhSach.phienBan, banTruoc, "nhập chữ mà vẫn đăng phiên bản mới");
      await nhapVaDang("30", "1");
      await p.waitFor("location.search.includes('hoso=da-luu')", "tải lại sau khi đăng", 15000);
      const cs2 = (await call(SUPER, "GET", "/api/parties/cua-toi")).json.chinhSach;
      assert.equal(cs2.phienBan, banTruoc + 1);
      assert.equal(cs2.hanXuLyXoaNgay, 30);
      assert.equal(cs2.hanGiuPhienNgay, 1);
      await axe(p, "toan-quyen-chinh-sach 1040");
    } finally {
      p.close();
    }
  });
  await dem.step("3a", "Đối tác (390): thời hạn 30 ngày; gửi yêu cầu xoá HAI bước ('không hoàn tác'); Thôi quay lại; gửi → Chờ xử lý + hạn; phiếu tự khai bị rút" + axeNote(), async () => {
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#hs-xoa-gui')", "nút Gửi yêu cầu xoá", 15000);
      assert.ok((await vung(p, "#ho-so-cua-toi")).chu.includes("Thời hạn xử lý: 30 ngày kể từ khi gửi."));
      await bam(p, "#ho-so-cua-toi", "Gửi yêu cầu xoá");
      let s = await vung(p, "#hs-xoa-xac-nhan");
      assert.ok(s.hien && s.chu.includes("không hoàn tác") && s.chu.includes("Gửi yêu cầu"), s.chu);
      assert.equal(apiCalls(p).filter((c) => c.method === "POST" && c.path.endsWith("/phieu-xoa")).length, 0, "bấm lần một chưa được gọi máy chủ");
      await shotFull(p, "doi-tac-xac-nhan-gui-390.png");
      await bam(p, "#hs-xoa-xac-nhan", "Thôi");
      assert.ok((await vung(p, "#hs-xoa-gui")).hien, "Thôi phải quay về nút ban đầu");
      await bam(p, "#ho-so-cua-toi", "Gửi yêu cầu xoá");
      await bam(p, "#hs-xoa-xac-nhan", "Gửi yêu cầu");
      await p.waitFor("location.search.includes('hoso=da-xoa') && !!document.querySelector('.hs-phieu-xoa')", "tải lại sau khi gửi", 15000);
      s = await vung(p, "#ho-so-cua-toi");
      assert.ok(s.chu.includes("Đã gửi yêu cầu xoá dữ liệu."), s.chu);
      assert.ok(s.chu.includes("Chờ xử lý") && s.chu.includes("Hạn xử lý") && s.chu.includes("Rút yêu cầu"), s.chu);
      assert.ok(/Ngày sinh.*Đã rút/.test(s.chu) || s.chu.includes("Đã rút"), "phiếu tự khai đang chờ phải bị rút khi gửi xoá");
      assert.ok(!s.nutHien.some((b) => b.chu === "Gửi yêu cầu xoá"), "đã có yêu cầu chờ thì không có nút gửi lại");
      await axe(p, "doi-tac-cho-xu-ly 390");
      await shotFull(p, "doi-tac-cho-xu-ly-390.png");
    } finally {
      p.close();
    }
  });
  await dem.step("3b", "Đối tác (1040): cùng trạng thái chờ xử lý" + axeNote(), async () => {
    const p = await env.as(PARTNER, "/account", DESK);
    try {
      await p.waitFor("!!document.querySelector('.hs-phieu-xoa')", "thẻ yêu cầu xoá", 15000);
      assert.ok((await vung(p, "#ho-so-cua-toi")).chu.includes("Chờ xử lý"));
      await axe(p, "doi-tac-cho-xu-ly 1040");
      await shotFull(p, "doi-tac-cho-xu-ly-1040.png");
    } finally {
      p.close();
    }
  });
  await dem.step("3c", "Đối tác (390): Rút yêu cầu có bước xác nhận → Đã rút; gửi lại được (hai bước)", async () => {
    const p = await env.as(PARTNER, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('.hs-phieu-xoa')", "thẻ yêu cầu xoá", 15000);
      await bam(p, "#ho-so-cua-toi", "Rút yêu cầu");
      await bam(p, "#ho-so-cua-toi", "Rút yêu cầu này");
      await p.waitFor("location.search.includes('hoso=da-rut-xoa') && !!document.querySelector('#hs-xoa-gui')", "tải lại sau khi rút", 15000);
      assert.ok((await vung(p, "#ho-so-cua-toi")).chu.includes("Đã rút yêu cầu xoá dữ liệu."));
      await bam(p, "#ho-so-cua-toi", "Gửi yêu cầu xoá");
      await bam(p, "#hs-xoa-xac-nhan", "Gửi yêu cầu");
      await p.waitFor("location.search.includes('hoso=da-xoa')", "gửi lại", 15000);
    } finally {
      p.close();
    }
  });
  await dem.step("4a", "Quản trị (390) ở Danh bạ: khối mở lười; thẻ phiếu; xem trước chỉ số đếm; Từ chối chọn trong danh sách đóng, không ô chữ" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/parties", MOB);
    try {
      await p.waitFor("!document.querySelector('#phieu-xoa').hidden", "khối Xoá dữ liệu cá nhân", 15000);
      assert.equal(apiCalls(p).filter((c) => c.path.includes("/phieu-xoa") || c.path.includes("/anh-can-xoa")).length, 0, "chưa mở thì chưa được gọi API xử lý xoá");
      await p.ev("document.querySelector('#px-hop-phieu').open = true");
      await p.waitFor("!!document.querySelector('#px-ds .px-the')", "thẻ yêu cầu chờ", 20000);
      let s = await vung(p, "#px-hop-phieu");
      assert.ok(s.chu.includes("Đối Tác Thử") && s.chu.includes("Hạn"), s.chu);
      KHONG_DAU_GIU_CHO(s.html, "hàng chờ");
      await shotFull(p, "quan-tri-hang-cho-390.png");
      await p.ev("document.querySelector('#px-ds .px-the').click()");
      await p.waitFor("!document.querySelector('#px-chi-tiet').hidden", "khung xem trước", 15000);
      s = await vung(p, "#px-chi-tiet");
      assert.ok(s.chu.includes("Sẽ xoá") && s.chu.includes("Giấy tờ") && s.chu.includes("Phần phải giữ lại") && s.chu.includes("Căn cứ giữ lại: chưa được luật sư hay kế toán xác nhận."), s.chu);
      assert.ok(s.nutHien.some((b) => b.chu === "Thực hiện") && s.nutHien.some((b) => b.chu === "Từ chối"));
      KHONG_DAU_GIU_CHO(s.html, "xem trước");
      await shotFull(p, "quan-tri-xem-truoc-390.png");
      await bam(p, "#px-chi-tiet", "Từ chối");
      s = await vung(p, "#px-khung-tu-choi");
      assert.equal(s.oChu, 0, "không ô chữ tự do trong khung từ chối");
      assert.equal(await p.ev("document.querySelectorAll('#px-khung-tu-choi input[type=radio]').length"), 2);
      assert.ok(s.nutHien.find((b) => b.chu === "Gửi từ chối")?.tat === true, "chưa chọn lý do thì Gửi từ chối phải tắt");
      await p.ev("document.querySelector('#px-khung-tu-choi input[type=radio]').click()");
      await shotFull(p, "quan-tri-tu-choi-390.png");
      await axe(p, "quan-tri-tu-choi 390");
      await bam(p, "#px-khung-tu-choi", "Gửi từ chối");
      await p.waitFor("document.querySelector('#px-ok') && !document.querySelector('#px-ok').hidden", "thông báo đã từ chối", 15000);
      assert.ok((await vung(p, "#px-ok")).chu.includes("Đã từ chối yêu cầu xoá."));
      await p.ev("document.querySelector('#px-tab-xong').click()");
      await p.waitFor("document.querySelector('#px-ds').innerText.includes('Đã từ chối')", "tab Đã xử lý", 15000);
      s = await vung(p, "#px-ds");
      assert.ok(s.chu.includes("Lý do: Dữ liệu đang phải giữ theo quy định pháp luật"), s.chu);
      await shotFull(p, "quan-tri-da-xu-ly-390.png");
    } finally {
      p.close();
    }
  });
  await guiXoaQuaApi();
  await dem.step("4b", "Quản trị (1040): xem trước → Thực hiện hai bước ('không hoàn tác') → Đã thực hiện xoá" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/parties", DESK);
    try {
      await p.waitFor("!document.querySelector('#phieu-xoa').hidden", "khối Xoá dữ liệu cá nhân", 15000);
      await p.ev("document.querySelector('#px-hop-phieu').open = true");
      await p.waitFor("!!document.querySelector('#px-ds .px-the')", "thẻ yêu cầu chờ", 20000);
      await p.ev("document.querySelector('#px-ds .px-the').click()");
      await p.waitFor("!document.querySelector('#px-chi-tiet').hidden", "khung xem trước", 15000);
      await shotFull(p, "quan-tri-xem-truoc-1040.png");
      await bam(p, "#px-chi-tiet", "Thực hiện");
      let s = await vung(p, "#px-xac-nhan-thuc-hien");
      assert.ok(s.hien && s.chu.includes("Thực hiện xoá? Việc này không hoàn tác được."), s.chu);
      assert.equal(apiCalls(p).filter((c) => c.method === "POST" && c.path.endsWith("/thuc-hien")).length, 0, "bấm lần một chưa được thực hiện");
      await shotFull(p, "quan-tri-xac-nhan-thuc-hien-1040.png");
      await axe(p, "quan-tri-xac-nhan 1040");
      await bam(p, "#px-xac-nhan-thuc-hien", "Thực hiện xoá");
      await p.waitFor("document.querySelector('#px-ok') && !document.querySelector('#px-ok').hidden", "thông báo đã thực hiện", 30000);
      assert.ok((await vung(p, "#px-ok")).chu.includes("Đã thực hiện xoá."));
      await p.ev("document.querySelector('#px-tab-xong').click()");
      await p.waitFor("document.querySelector('#px-ds').innerText.includes('Đã thực hiện')", "tab Đã xử lý", 15000);
      s = await vung(p, "#px-ds");
      assert.ok(s.chu.includes("Đã thực hiện") && s.chu.includes("Đã từ chối"), s.chu);
      KHONG_DAU_GIU_CHO(s.html, "đã xử lý");
      await shotFull(p, "quan-tri-da-xu-ly-1040.png");
    } finally {
      p.close();
    }
  });
  for (const [id, ten, vp] of [["5a", "390", MOB], ["5b", "1040", DESK]]) {
    await dem.step(id, `Đối tác (${ten}) mở lại trang Tôi: Đã thực hiện, phần được giữ lại, hồ sơ "Đã xoá theo yêu cầu", không dấu giữ chỗ` + axeNote(), async () => {
      const p = await env.as(PARTNER, "/account", vp);
      try {
        await p.waitFor("!!document.querySelector('#ho-so-cua-toi .hs-phieu-xoa')", "thẻ yêu cầu xoá", 15000);
        const s = await vung(p, "#ho-so-cua-toi");
        assert.ok(s.chu.includes("Đã thực hiện") && s.chu.includes("Phần được giữ lại"), s.chu);
        assert.ok(s.chu.includes("Căn cứ giữ lại: chưa được luật sư hay kế toán xác nhận."), s.chu);
        assert.ok(s.chu.includes("Đã xoá theo yêu cầu"), "hồ sơ đã xoá phải hiện 'Đã xoá theo yêu cầu'");
        assert.ok(s.chu.includes("Họ tên Người đã xoá dữ liệu") || s.chu.includes("Người đã xoá dữ liệu"), s.chu);
        KHONG_DAU_GIU_CHO(s.html, "trang Tôi sau khi xoá");
        await axe(p, `doi-tac-da-xoa ${ten}`);
        await shotFull(p, `doi-tac-da-thuc-hien-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  for (const [id, ten, vp] of [["6a", "1040", DESK], ["6b", "390", MOB]]) {
    await dem.step(id, `Quản trị (${ten}) mở hồ sơ Đối tác trong Danh bạ: không số, không dấu giữ chỗ` + axeNote(), async () => {
      const p = await env.as(ADMIN, `/parties?id=${partyDoiTac}`, vp);
      try {
        await p.waitFor("!!document.querySelector('#detail') && !document.querySelector('#detail').hidden && document.querySelector('#detail').innerText.includes('Giấy tờ')", "hồ sơ", 20000);
        const s = await vung(p, "#detail");
        assert.ok(s.chu.includes("Người đã xoá dữ liệu"), s.chu);
        KHONG_DAU_GIU_CHO(s.html, "hồ sơ Danh bạ");
        await axe(p, `danh-ba-da-xoa ${ten}`);
        await shotFull(p, `danh-ba-ho-so-da-xoa-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  // ---- Ảnh hết lý do giữ: hai tệp THỬ không gắn giấy tờ nào (khoá kho giả, nội dung không có thật) ----
  const partySales = ids[ACCOUNTS.salesA.phone].partyId;
  const staffAdmin = ids[ADMIN.phone].staffId;
  const luc = new Date().toISOString();
  const anhThu = [randomUUID(), randomUUID()].map((id) => ({ id, khoa: `pty/${randomUUID().replaceAll("-", "")}` }));
  env.sql(anhThu.map((a) => `INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by) VALUES ('${a.id}', '${partySales}', '${a.khoa}', 'jpg', 1000, '${"a".repeat(64)}', '${luc}', '${luc}', '${staffAdmin}', '${luc}', '${staffAdmin}')`).join(";\n"));
  await dem.step("7a", "Quản trị (390): Ảnh giấy tờ hết lý do giữ — không lộ khoá kho; chọn → xác nhận 'không hoàn tác' → xoá" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/parties", MOB);
    try {
      await p.waitFor("!document.querySelector('#phieu-xoa').hidden", "khối", 15000);
      await p.ev("document.querySelector('#px-hop-anh').open = true");
      await p.waitFor("document.querySelectorAll('#px-anh-ds .px-anh-hang').length === 2", "2 ảnh", 20000);
      let s = await vung(p, "#px-hop-anh");
      assert.ok(s.chu.includes("Sales Một") && s.chu.includes("Ảnh không gắn với giấy tờ nào"), s.chu);
      for (const a of anhThu) assert.ok(!s.html.includes(a.khoa), "khoá kho không được có trong DOM");
      assert.ok(s.nutHien.find((b) => b.chu === "Xoá ảnh đã chọn")?.tat === true, "chưa chọn thì nút xoá tắt");
      await p.ev("document.querySelector('#px-anh-ds input[type=checkbox]').click()");
      assert.ok((await vung(p, "#px-anh-dem")).chu.includes("Đã chọn 1/50"));
      await bam(p, "#px-hop-anh", "Xoá ảnh đã chọn");
      s = await vung(p, "#px-anh-xac-nhan");
      assert.ok(s.hien && s.chu.includes("Xoá 1 ảnh? Việc này không hoàn tác được."), s.chu);
      await shotFull(p, "quan-tri-anh-xac-nhan-390.png");
      await axe(p, "quan-tri-anh 390");
      await bam(p, "#px-anh-xac-nhan", "Xoá ảnh");
      await p.waitFor("document.querySelector('#px-ok') && !document.querySelector('#px-ok').hidden", "thông báo đã xoá ảnh", 30000);
      assert.ok((await vung(p, "#px-ok")).chu.includes("Đã xoá 1 ảnh."));
      await p.waitFor("document.querySelectorAll('#px-anh-ds .px-anh-hang').length === 1", "còn 1 ảnh", 15000);
      await shotFull(p, "quan-tri-anh-sau-xoa-390.png");
    } finally {
      p.close();
    }
  });
  await dem.step("7b", "Quản trị (1040): danh sách ảnh còn lại + bước xác nhận (bấm Thôi)" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/parties", DESK);
    try {
      await p.waitFor("!document.querySelector('#phieu-xoa').hidden", "khối", 15000);
      await p.ev("document.querySelector('#px-hop-anh').open = true");
      await p.waitFor("document.querySelectorAll('#px-anh-ds .px-anh-hang').length === 1", "1 ảnh", 20000);
      await p.ev("document.querySelector('#px-anh-ds input[type=checkbox]').click()");
      await bam(p, "#px-hop-anh", "Xoá ảnh đã chọn");
      assert.ok((await vung(p, "#px-anh-xac-nhan")).chu.includes("không hoàn tác"));
      await shotFull(p, "quan-tri-anh-xac-nhan-1040.png");
      await axe(p, "quan-tri-anh 1040");
      await bam(p, "#px-anh-xac-nhan", "Thôi");
      assert.ok(!(await vung(p, "#px-anh-xac-nhan")).hien);
    } finally {
      p.close();
    }
  });
  // ---- Phiên cũ: hai dòng phiên đã kết thúc 3 ngày trước, còn IP / thông tin máy (THỬ) ----
  const staffSales = ids[ACCOUNTS.salesB.phone].staffId;
  const cu = new Date(Date.now() - 3 * 864e5).toISOString();
  env.sql([randomUUID(), randomUUID()].map((id) => `INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, updated_at) VALUES ('${id}', '${staffSales}', 'PIN', 0, 'Máy thử', 'Thử', '203.0.113.9', '${cu}', '${cu}', '${cu}', '${cu}', 'dang_xuat', '${cu}')`).join(";\n"));
  await dem.step("8a", "Toàn quyền (390) ở trang Phiên: 'Ẩn danh IP và thông tin máy của 2 phiên…'; bấm → xác nhận 'không hoàn tác'; Thôi" + axeNote(), async () => {
    const p = await env.as(SUPER, "/sessions", MOB);
    try {
      await p.waitFor("!document.querySelector('#an-danh-phien').hidden", "khối ẩn danh phiên cũ", 15000);
      let s = await vung(p, "#an-danh-phien");
      assert.ok(s.chu.includes("Ẩn danh IP và thông tin máy của 2 máy đã đăng xuất quá 1 ngày."), s.chu);
      assert.ok(s.nutHien.find((b) => b.chu === "Ẩn danh hoá")?.tat === false);
      await bam(p, "#an-danh-phien", "Ẩn danh hoá");
      s = await vung(p, "#adp-xac-nhan");
      assert.ok(s.hien && s.chu.includes("không hoàn tác"), s.chu);
      await shotFull(p, "phien-xac-nhan-390.png");
      await axe(p, "phien-xac-nhan 390");
      await bam(p, "#adp-xac-nhan", "Thôi");
      assert.ok(!(await vung(p, "#adp-xac-nhan")).hien);
    } finally {
      p.close();
    }
  });
  await dem.step("8b", "Toàn quyền (1040): xác nhận ẩn danh hoá → 'Đã ẩn danh hoá 2 phiên.', IP trong D1 tạm thành rỗng, khối về 0 phiên" + axeNote(), async () => {
    const p = await env.as(SUPER, "/sessions", DESK);
    try {
      await p.waitFor("!document.querySelector('#an-danh-phien').hidden && document.querySelector('#adp-nut') && !document.querySelector('#adp-nut').disabled", "nút ẩn danh hoá", 15000);
      await bam(p, "#an-danh-phien", "Ẩn danh hoá");
      await bam(p, "#adp-xac-nhan", "Xác nhận ẩn danh hoá");
      await p.waitFor(`(${txt("#ok")}) && ${txt("#ok")}.includes('Đã ẩn danh hoá 2 máy đã đăng xuất.')`, "thông báo", 20000);
      await p.waitFor("document.querySelector('#adp-dong') && document.querySelector('#adp-dong').innerText.includes('của 0 máy đã đăng xuất')", "khối về 0 phiên", 15000);
      const con = env.sql(`SELECT count(*) AS n FROM aut_session WHERE staff_id = '${staffSales}' AND (ip IS NOT NULL OR user_agent IS NOT NULL)`)[0].n;
      assert.equal(con, 0, "phiên cũ còn IP / thông tin máy");
      await axe(p, "phien-sau-an-danh 1040");
      await shotFull(p, "phien-sau-an-danh-1040.png");
    } finally {
      p.close();
    }
  });
  await sleep(100);
} finally {
  await env.stop();
}
dem.xong();
