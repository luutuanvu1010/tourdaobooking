// Kịch bản Chrome — màn 04 Giấy tờ của một người (mục "Giấy tờ" trong hồ sơ ở Danh bạ, dưới "Người liên hệ, tài xế" — tên mục từ ADR-0048) — ADR-0040 D2;
// docs/design/van-chuyen-1a/project/04 Giay to cua mot nguoi.dc.html.
// 1) Quản trị mở hồ sơ tài xế thẳng theo id (/parties?id=…): mục "Giấy tờ" viền nhấn, bốn dòng xếp theo hạn, số CHE (••••0412), số đủ KHÔNG có trong DOM,
//    "Xem đủ số" chỉ ở dòng có số, "Thêm giấy tờ", Gia hạn / Sửa sai.  2) "Xem đủ số" → hộp xác nhận (ghi nhật ký, tự che sau 10 giây) → số hiện đủ + đếm ngược +
//    "Che lại"; nhật ký có MỘT dòng xem số, KHÔNG kèm số; "Che lại" → số đủ rời DOM.  3) Điện thoại: xem đủ số rồi CHỜ → tự che sau đúng thời gian token --t-reveal.
//    Bước 2 và 3: số đủ KHÔNG nằm trong localStorage / sessionStorage, bộ nhớ đệm service worker không có phản hồi /api/, không có IndexedDB (lúc số hiện và sau khi che).
// 4) Bán hàng (party.view nhưng không party.document.write): không có mục, không gọi /api/parties/:id/documents.
// 5) Quản trị xem hồ sơ tài khoản cấp trên (Toàn quyền): chỉ xem, không nút ghi, không "Xem đủ số" (Ruling R8).
// 6) Gia hạn giấy phép lái xe (390): chữ nhắc dùng số CHE; "Số mới" để trống → giữ số cũ; hạng, nơi cấp điền sẵn → Lịch sử (1).
// 7) Thêm giấy tờ (1040): ô "Hạng" chỉ hiện với giấy phép lái xe.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/giay-to-nguoi-smoke.mjs
import { randomUUID } from "node:crypto";
import { ACCOUNTS, DESK, DRIVER, MOB, SUPER, apiCalls, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, shotView, sleep, txt, typeInto, vnDate } from "./vc-lib.mjs";

const dem = boDem("GIAY TO NGUOI SMOKE");
const { env, ids, call, themGiayNguoi } = await dungMoiTruong([SUPER, DRIVER]);
const ADMIN = ACCOUNTS.admin;
const SO = { cccd: "001090000412", gplx: "790100000412", sup: "001090000411" }; // số GIẢ
const d = (n) => vnDate(n).split("-").reverse().join("/");
try {
  const hung = ids[DRIVER.phone].partyId;
  const chu = ids[SUPER.phone].partyId;
  await themGiayNguoi(hung, { typeCode: "CCCD", number: SO.cccd, issuedDate: vnDate(-1000), issuedPlace: "Cục Cảnh sát QLHC về TTXH", expiryDate: vnDate(3818) });
  await themGiayNguoi(hung, { typeCode: "GPLX", number: SO.gplx, classCode: "D2", issuedDate: vnDate(-1900), issuedPlace: "Sở GTVT Khánh Hoà", expiryDate: vnDate(38) });
  await themGiayNguoi(hung, { typeCode: "HEALTH_CHECK", issuedDate: vnDate(-363), expiryDate: vnDate(2) });
  await themGiayNguoi(hung, { typeCode: "TRANSPORT_TRAINING", issuedDate: vnDate(-200), expiryDate: vnDate(154) });
  const at = new Date().toISOString();
  env.sql(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_date, expiry_date, created_at, updated_at) VALUES ('${randomUUID()}', '${chu}', 'CCCD', '${SO.sup}', '${SO.sup}', '${vnDate(-500)}', '${vnDate(4000)}', '${at}', '${at}')`);

  const open = async (account, partyId, vp) => {
    const p = await env.as(account, `/parties?id=${partyId}`, vp);
    await p.waitFor("!document.querySelector('#detail').hidden", "hồ sơ mở thẳng theo id", 10000);
    return p;
  };
  const sec = (p, layout) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
      const s = document.querySelector('#giay-to');
      if (!s) return null;
      const rows = [...s.querySelectorAll(${JSON.stringify(layout === "desk" ? ".vc-docs-table .vc-dt-row" : ".vc-docs-list .vc-doc")})].map((r) => ({
        title: t(r.querySelector('.vc-doc-title')), no: t(r.querySelector('.vc-no')), chip: t(r.querySelector('.vc-chip')),
        buttons: [...r.querySelectorAll('button')].filter((b) => b.getClientRects().length > 0).map(t),
      }));
      return { heading: t(s.querySelector('h3')), rows, html: document.documentElement.outerHTML, add: [...s.querySelectorAll('button')].some((b) => b.getClientRects().length > 0 && t(b) === 'Thêm giấy tờ'), note: t(s.querySelector('.vc-readonly-note')) };
    })()`);
  // Số đủ KHÔNG được ghi vào kho của trình duyệt (kế hoạch mục 7, điểm nối 4: "không lưu vào localStorage"): localStorage, sessionStorage, bộ nhớ đệm của
  // service worker (không phản hồi /api/ nào), IndexedDB (ứng dụng không dùng). Đo LÚC số đang hiện và sau khi che.
  const khongLuuSo = async (p, so, luc) => {
    const k = await p.ev(`(async () => ({
      luuTru: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
      cacheApi: (await Promise.all((await caches.keys()).map(async (n) => (await (await caches.open(n)).keys()).map((r) => r.url)))).flat().filter((u) => u.includes('/api/')),
      idb: (await indexedDB.databases()).map((x) => x.name),
    }))()`);
    assert.ok(!k.luuTru.includes(so), `${luc}: số đủ nằm trong localStorage / sessionStorage — ${k.luuTru}`);
    assert.deepEqual(k.cacheApi, [], `${luc}: bộ nhớ đệm service worker có phản hồi API`);
    assert.deepEqual(k.idb, [], `${luc}: có cơ sở dữ liệu IndexedDB`);
  };

  await dem.step("1", "04 máy tính (Quản trị, hồ sơ tài xế): mục “Giấy tờ” dưới “Người liên hệ, tài xế”, bốn dòng theo hạn, số che, số đủ không trong DOM, nút đúng" + axeNote(), async () => {
    const p = await open(ADMIN, hung, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#giay-to .vc-docs-table .vc-dt-row').length === 4", "bốn giấy tờ", 10000);
      const s = await sec(p, "desk");
      assert.equal(s.heading, "Giấy tờ");
      const order = await p.ev(`[...document.querySelectorAll('#detail h3')].map((h) => h.innerText.trim())`);
      assert.deepEqual(order.slice(-2), ["Người liên hệ, tài xế", "Giấy tờ"], JSON.stringify(order)); // G3 (ADR-0048): tiêu đề mục quan hệ đổi
      assert.deepEqual(s.rows.map((r) => [r.title, r.chip]), [
        ["Khám sức khoẻ", "Còn 2 ngày"],
        ["Giấy phép lái xe hạng D2", "Còn 38 ngày"],
        ["Tập huấn nghiệp vụ vận tải", "Còn 154 ngày"],
        ["Căn cước công dân (CCCD)", "Còn hạn"],
      ]);
      assert.equal(s.rows[1].no, "••••0412 Xem đủ số");
      assert.equal(s.rows[0].no, "—", "giấy không số");
      assert.deepEqual(s.rows[0].buttons, ["Sửa sai", "Gia hạn"]);
      assert.deepEqual(s.rows[1].buttons, ["Xem đủ số", "Sửa sai", "Gia hạn"]);
      assert.equal(s.add, true);
      for (const so of [SO.cccd, SO.gplx]) assert.ok(!s.html.includes(so), `số đủ ${so} không được có trong DOM`);
      await axe(p, "04 máy tính");
      await shotFull(p, "04-giay-to-mot-nguoi-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("2", "04 “Xem đủ số” (1040): hộp xác nhận → số đủ + “Tự che sau N giây · lần xem này đã ghi nhật ký” + “Che lại”; nhật ký 1 dòng KHÔNG số; Che lại → số rời DOM", async () => {
    const p = await open(ADMIN, hung, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#giay-to .vc-docs-table .vc-dt-row').length === 4", "giấy tờ", 10000);
      assert.ok(await p.ev(`(() => { const r = [...document.querySelectorAll('#giay-to .vc-docs-table .vc-dt-row')].find((x) => x.querySelector('.vc-doc-title').innerText.includes('CCCD')); [...r.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Xem đủ số').click(); return true; })()`));
      await p.waitFor("document.querySelector('.sheet-root.open')", "hộp xác nhận", 5000);
      assert.equal(await p.ev(txt(".sheet-title")), "Xem đủ số?");
      assert.equal(await p.ev(txt(".sheet-body .vc-warnbox")), "Mỗi lần xem đều được ghi nhật ký. Xem đủ số?");
      assert.equal(await p.ev(txt(".sheet-body .vc-reveal-line")), "Căn cước công dân (CCCD) · ••••0412 · số tự che lại sau 10 giây.");
      assert.equal(env.sql("SELECT count(*) AS n FROM audit_log WHERE action = 'party_document_number_viewed'")[0].n, 0, "chưa xác nhận thì chưa có lần xem");
      await shotView(p, "04-xem-du-so-xac-nhan-1040.png");
      assert.ok(await p.ev(clickVisible(".sheet-root", "Xem đủ số")));
      await p.waitFor(`!document.querySelector('.sheet-root') && document.documentElement.outerHTML.includes(${JSON.stringify(SO.cccd)})`, "số hiện đủ", 8000);
      const s = await p.ev(`(() => { const r = [...document.querySelectorAll('#giay-to .vc-docs-table .vc-dt-row')].find((x) => x.querySelector('.vc-doc-title').innerText.includes('CCCD')); return { no: r.querySelector('.vc-no').innerText.replace(/\\s+/g, ' ').trim(), revealed: !!r.querySelector('.vc-no-val.is-revealed'), count: r.querySelector('.vc-countdown')?.innerText.replace(/\\s+/g, ' ').trim() ?? null }; })()`);
      assert.equal(s.revealed, true);
      assert.ok(s.no.startsWith(SO.cccd), s.no);
      assert.match(s.count ?? "", /^Tự che sau (10|9|8) giây Che lại$/, "máy tính (bản vẽ): “Tự che sau N giây” + “Che lại”");
      const nk = env.sql("SELECT detail, target_id FROM audit_log WHERE action = 'party_document_number_viewed'");
      assert.equal(nk.length, 1, JSON.stringify(nk));
      assert.equal(nk[0].target_id, hung);
      assert.ok(!nk[0].detail.includes(SO.cccd) && !nk[0].detail.includes("0412"), `nhật ký không kèm số: ${nk[0].detail}`);
      await shotFull(p, "04-xem-du-so-dang-hien-1040.png");
      await khongLuuSo(p, SO.cccd, "đang hiện số (1040)");
      assert.ok(await p.ev(clickVisible("#giay-to .vc-docs-table", "Che lại")));
      await p.waitFor(`!document.documentElement.outerHTML.includes(${JSON.stringify(SO.cccd)})`, "số rời DOM sau Che lại", 3000);
      await khongLuuSo(p, SO.cccd, "sau Che lại (1040)");
    } finally {
      p.close();
    }
  });

  await dem.step("3", "04 điện thoại: xem đủ số GPLX rồi chờ → tự che đúng thời gian token --t-reveal, số rời DOM" + axeNote(), async () => {
    const p = await open(ADMIN, hung, MOB);
    try {
      await p.waitFor("document.querySelectorAll('#giay-to .vc-docs-list .vc-doc').length === 4", "giấy tờ", 10000);
      const ms = await p.ev(`(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--t-reveal').trim(); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; })()`);
      assert.equal(ms, 10000, "token --t-reveal = 10s");
      await axe(p, "04 điện thoại");
      await shotFull(p, "04-giay-to-mot-nguoi-390.png");
      assert.ok(await p.ev(`(() => { const r = [...document.querySelectorAll('#giay-to .vc-docs-list .vc-doc')].find((x) => x.querySelector('.vc-doc-title').innerText.includes('Giấy phép')); [...r.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Xem đủ số').click(); return true; })()`));
      await p.waitFor("document.querySelector('.sheet-root.open')", "hộp xác nhận", 5000);
      await shotView(p, "04-xem-du-so-xac-nhan-390.png");
      assert.ok(await p.ev(clickVisible(".sheet-root", "Xem đủ số")));
      await p.waitFor(`document.documentElement.outerHTML.includes(${JSON.stringify(SO.gplx)})`, "số hiện đủ", 8000);
      const t0 = Date.now();
      await shotFull(p, "04-xem-du-so-dang-hien-390.png");
      await p.waitFor(`!document.documentElement.outerHTML.includes(${JSON.stringify(SO.gplx)})`, "tự che", ms + 3000);
      const waited = Date.now() - t0;
      assert.ok(waited >= ms - 1500, `tự che quá sớm: ${waited}ms`);
      assert.equal(await p.ev(`[...document.querySelectorAll('#giay-to .vc-docs-list .vc-no-val')].map((e) => e.innerText.trim()).filter((x) => x.includes('0412')).length`), 2, "hai số lại che ••••0412");
      await khongLuuSo(p, SO.gplx, "sau tự che (390)");
    } finally {
      p.close();
    }
  });

  await dem.step("4", "04 Bán hàng: hồ sơ mở được nhưng KHÔNG có mục Giấy tờ, không gọi /api/parties/:id/documents", async () => {
    const p = await open(ACCOUNTS.salesA, hung, DESK);
    try {
      await sleep(1200);
      assert.equal(await p.ev("!!document.querySelector('#giay-to')"), false);
      assert.deepEqual(apiCalls(p).filter((c) => /\/documents/.test(c.path)), []);
    } finally {
      p.close();
    }
  });

  await dem.step("5", "04 Quản trị xem hồ sơ tài khoản cấp trên (Toàn quyền): số che, không Thêm / Gia hạn / Sửa sai / Xem đủ số, có câu chỉ xem", async () => {
    const p = await open(ADMIN, chu, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#giay-to .vc-docs-table .vc-dt-row').length === 1", "một giấy tờ", 10000);
      const s = await sec(p, "desk");
      assert.deepEqual(s.rows[0].buttons, []);
      assert.equal(s.add, false);
      assert.equal(s.rows[0].no, "••••0411");
      assert.equal(s.note, "Tài khoản cấp trên: chỉ xem — không thêm, gia hạn, sửa hay xem đủ số.");
      await shotFull(p, "04-cap-tren-chi-xem-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("6", "04 Gia hạn giấy phép lái xe (390): chữ nhắc dùng số che, “Số mới” để trống → giữ số cũ; hạng, nơi cấp điền sẵn → Lịch sử (1)", async () => {
    const p = await open(ADMIN, hung, MOB);
    try {
      await p.waitFor("document.querySelectorAll('#giay-to .vc-docs-list .vc-doc').length === 4", "giấy tờ", 10000);
      assert.ok(await p.ev(`(() => { const r = [...document.querySelectorAll('#giay-to .vc-docs-list .vc-doc')].find((x) => x.querySelector('.vc-doc-title').innerText.includes('Giấy phép')); [...r.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Gia hạn').click(); return true; })()`));
      await p.waitFor("document.querySelector('.sheet-root.open') && !!document.querySelector('#gt-no')", "bảng gia hạn", 5000);
      assert.equal(await p.ev(txt(".sheet-title")), "Gia hạn · Giấy phép lái xe"); // bản vẽ: tiêu đề bảng dùng tên loại (không kèm hạng)
      assert.equal(await p.ev(txt(".vc-renew-note")), `Dòng hiện tại (••••0412 · hết hạn ${d(38)}) được giữ làm lịch sử. Gia hạn thêm một dòng mới.`);
      assert.equal(await p.ev(txt("#gt-no-hint")), "Số hiện tại ••••0412 — để trống nếu không đổi số.");
      assert.equal(await p.ev("document.querySelector('#gt-no').placeholder"), "Nhập đủ số");
      assert.equal(await p.ev("document.querySelector('#gt-class').value"), "D2");
      assert.equal(await p.ev("document.querySelector('#gt-place').value"), "Sở GTVT Khánh Hoà");
      await p.ev(typeInto("#gt-exp", vnDate(1500)));
      await shotView(p, "04-gia-han-390.png");
      assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu gia hạn")));
      await p.waitFor("!document.querySelector('.sheet-root')", "bảng đóng", 8000);
      await p.waitFor(`[...document.querySelectorAll('#giay-to .vc-docs-list .vc-doc')].some((r) => r.innerText.includes('Giấy phép') && r.innerText.includes('Lịch sử (1)'))`, "Lịch sử (1)", 8000);
      const r = await call(ADMIN, "GET", `/api/parties/${hung}/documents`);
      const moi = r.json.documents.find((x) => x.typeCode === "GPLX" && x.current);
      assert.equal(moi.maskedNumber, "••••0412", "để trống → máy chủ chép số cũ");
    } finally {
      p.close();
    }
  });

  await dem.step("7", "04 Thêm giấy tờ (1040): ô “Hạng” chỉ hiện với giấy phép lái xe; “Nơi cấp” luôn có", async () => {
    const p = await open(ADMIN, hung, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#giay-to .vc-docs-table .vc-dt-row').length === 4", "giấy tờ", 10000);
      assert.ok(await p.ev(clickVisible("#giay-to", "Thêm giấy tờ")));
      await p.waitFor("document.querySelector('.sheet-root.open') && !!document.querySelector('#gt-type')", "bảng thêm", 5000);
      await p.ev(typeInto("#gt-type", "HEALTH_CHECK"));
      assert.deepEqual(await p.ev("({ cls: !!document.querySelector('#gt-class'), place: !!document.querySelector('#gt-place') })"), { cls: false, place: true });
      await p.ev(typeInto("#gt-type", "GPLX"));
      assert.deepEqual(await p.ev("({ cls: !!document.querySelector('#gt-class'), place: !!document.querySelector('#gt-place') })"), { cls: true, place: true });
      await shotView(p, "04-them-giay-to-1040.png");
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
