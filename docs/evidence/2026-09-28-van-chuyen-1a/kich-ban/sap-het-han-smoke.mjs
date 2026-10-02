// Kịch bản Chrome — màn 06 Giấy tờ sắp hết hạn (ADR-0040 D1; docs/design/van-chuyen-1a/project/06 Sap het han.dc.html) + huy hiệu số trên menu.
// 1) trạng thái trống (1040 + 390): "Không có giấy tờ nào sắp hết hạn", "… · 0 giấy", không huy hiệu.
// 2–3) có dữ liệu (1040 / 390): giấy xe + giấy tài xế chung MỘT danh sách, xếp theo ngày hết hạn (đã hết lên đầu), biểu tượng xe / người đầu dòng, chip đỏ (đã hết) /
//      cát (còn N ngày), không số giấy tờ; huy hiệu "Sắp hết hạn" = số dòng; trang Tôi điện thoại có cùng số.
// 4) bấm dòng xe → chi tiết xe; dòng người → hồ sơ ở Danh bạ mở thẳng (mục Giấy tờ hiện).
// 5) Đợt 1 Task 5: nút "Đổi mốc nhắc" chỉ Toàn quyền (settings.ops) thấy (1040 + 390); Quản trị không. Gõ 0 → câu của máy chủ, không lưu; gõ 7 → danh sách theo mốc 7;
//    trả về 30. (R23 cũ đã hết điều kiện vì giấy tờ người nay đọc mốc từ API.)
// 6) Bán hàng mở thẳng → câu từ chối của máy chủ, không danh sách.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/sap-het-han-smoke.mjs
import { ACCOUNTS, DESK, DRIVER, DRIVER2, MOB, SUPER, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, shotView, sleep, txt, typeInto, vnDate } from "./vc-lib.mjs";

const dem = boDem("SAP HET HAN SMOKE");
const { env, ids, call, themXe, themGiayXe, themGiayNguoi } = await dungMoiTruong([SUPER, DRIVER, DRIVER2]);
const ADMIN = ACCOUNTS.admin;
const d = (n) => vnDate(n).split("-").reverse().join("/");
try {
  const read = (p, layout) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
      const rows = [...document.querySelectorAll(${JSON.stringify(layout === "desk" ? "#due-table a.vc-due-trow" : "#due-list a.vc-due-row")})];
      return {
        title: t(document.querySelector('#due-title')), sub: t(document.querySelector('#due-sub')),
        empty: document.querySelector('#due-empty') && !document.querySelector('#due-empty').hidden ? t(document.querySelector('#due-empty')) : null,
        rows: rows.map((r) => ({ href: r.getAttribute('href'), kind: r.querySelector('.vc-ring')?.getAttribute('aria-label') ?? null, who: t(r.querySelector('.vc-due-who')), doc: t(r.querySelector('.vc-due-doc')), chip: t(r.querySelector('.vc-chip')), tone: [...(r.querySelector('.vc-chip')?.classList ?? [])].find((c) => c.startsWith('vc-chip-')) ?? null })),
        badge: t(document.querySelector('#sidebar a[href="/giay-to-sap-het-han"] .sidebar-item-badge')),
        threshold: !!document.querySelector('#due-threshold'),
        html: document.documentElement.outerHTML,
      };
    })()`);

  for (const [id, ten, vp, layout] of [["1a", "1040", DESK, "desk"], ["1b", "390", MOB, "mob"]]) {
    await dem.step(id, `06 trống (${ten}): “Không có giấy tờ nào sắp hết hạn”, 0 giấy, không huy hiệu` + axeNote(), async () => {
      const p = await env.as(ADMIN, "/giay-to-sap-het-han", vp);
      try {
        await p.waitFor("!document.querySelector('#due-empty').hidden", "trạng thái trống", 10000);
        await sleep(600);
        const s = await read(p, layout);
        assert.equal(s.empty, "Không có giấy tờ nào sắp hết hạn");
        assert.equal(s.badge, null);
        assert.ok((s.sub ?? "").includes("0 giấy"), s.sub);
        await axe(p, `06 trống ${ten}`);
        await shotFull(p, `06-sap-het-han-trong-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }

  // ---- dữ liệu (số GIẢ) ----
  const v1 = await themXe({ plateNumber: "79B-123.45", chassisNumber: "KHUNGV1000001", name: "Ford Transit", passengerCapacity: 15 });
  const v2 = await themXe({ plateNumber: "79B-246.80", chassisNumber: "KHUNGV2000002", name: "Hyundai Solati", passengerCapacity: 15 });
  await themGiayXe(v1.id, { typeCode: "CONTRACT_BADGE", number: "PH-0091", expiryDate: vnDate(-8) });
  await themGiayXe(v1.id, { typeCode: "TPL_INSURANCE", number: "BH-7788", issuedDate: vnDate(-361), expiryDate: vnDate(4) });
  await themGiayXe(v1.id, { typeCode: "INSPECTION", number: "KD-0456", issuedDate: vnDate(-166), expiryDate: vnDate(17) });
  await themGiayXe(v2.id, { typeCode: "INSPECTION", number: "KD-0788", issuedDate: vnDate(-160), expiryDate: vnDate(21) });
  await themGiayXe(v2.id, { typeCode: "TPL_INSURANCE", number: "BH-9900", issuedDate: vnDate(-10), expiryDate: vnDate(355) });
  const hung = ids[DRIVER.phone].partyId;
  const tuan = ids[DRIVER2.phone].partyId;
  await themGiayNguoi(hung, { typeCode: "HEALTH_CHECK", issuedDate: vnDate(-363), expiryDate: vnDate(2) });
  await themGiayNguoi(hung, { typeCode: "GPLX", number: "790100000412", classCode: "D2", issuedDate: vnDate(-1900), expiryDate: vnDate(38) });
  await themGiayNguoi(tuan, { typeCode: "GPLX", number: "790100000414", classCode: "D", issuedDate: vnDate(-1500), expiryDate: vnDate(12) });
  const KY_VONG = [
    { kind: "Xe", who: "79B-123.45 · Ford Transit", doc: "Phù hiệu xe hợp đồng", exp: d(-8), chip: "Đã hết hạn 8 ngày", tone: "vc-chip-danger", href: `/xe-chi-tiet?id=${v1.id}` },
    { kind: "Người", who: "Nguyễn Văn Hùng", doc: "Khám sức khoẻ", exp: d(2), chip: "Còn 2 ngày", tone: "vc-chip-warn", href: `/parties?id=${hung}` },
    { kind: "Xe", who: "79B-123.45 · Ford Transit", doc: "Bảo hiểm trách nhiệm dân sự", exp: d(4), chip: "Còn 4 ngày", tone: "vc-chip-warn", href: `/xe-chi-tiet?id=${v1.id}` },
    { kind: "Người", who: "Trần Minh Tuấn", doc: "Giấy phép lái xe hạng D", exp: d(12), chip: "Còn 12 ngày", tone: "vc-chip-warn", href: `/parties?id=${tuan}` },
    { kind: "Xe", who: "79B-123.45 · Ford Transit", doc: "Kiểm định", exp: d(17), chip: "Còn 17 ngày", tone: "vc-chip-warn", href: `/xe-chi-tiet?id=${v1.id}` },
    { kind: "Xe", who: "79B-246.80 · Hyundai Solati", doc: "Kiểm định", exp: d(21), chip: "Còn 21 ngày", tone: "vc-chip-warn", href: `/xe-chi-tiet?id=${v2.id}` },
  ];

  await dem.step("2", "06 máy tính: một danh sách xe + người theo hạn, biểu tượng đầu dòng, chip đúng màu, không số; huy hiệu menu = 6; tiêu đề “Trong 30 ngày tới”" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/giay-to-sap-het-han", DESK);
    try {
      await p.waitFor("document.querySelectorAll('#due-table a.vc-due-trow').length === 6", "sáu dòng", 10000);
      await p.waitFor(`!!document.querySelector('#sidebar a[href="/giay-to-sap-het-han"] .sidebar-item-badge')`, "huy hiệu", 8000);
      const s = await read(p, "desk");
      assert.equal(s.title, "Giấy tờ sắp hết hạn");
      assert.equal(s.sub, "Trong 30 ngày tới · gồm cả giấy đã hết hạn · 6 giấy");
      assert.deepEqual(s.rows.map((r) => ({ ...r, doc: r.doc })), KY_VONG.map((k) => ({ href: k.href, kind: k.kind, who: k.who, doc: k.doc, chip: k.chip, tone: k.tone })));
      assert.equal(s.badge, "6");
      assert.ok(!s.html.includes("790100000412") && !s.html.includes("PH-0091"), "danh sách không có số giấy tờ");
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('#due-table .vc-due-head span')].map((x) => x.innerText.trim())`), ["", "XE / NGƯỜI", "LOẠI GIẤY", "HẾT HẠN", "CÒN", ""]);
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('#due-table a.vc-due-trow')].map((r) => r.querySelector('.vc-due-exp').innerText.trim())`), KY_VONG.map((k) => k.exp));
      assert.equal(s.threshold, false, "Quản trị không thấy ô đổi mốc (#due-threshold; nút mới là data-action=doi-moc)");
      assert.equal(await p.ev(txt("#bar-title")), "Vận chuyển › Sắp hết hạn");
      await axe(p, "06 máy tính");
      await shotFull(p, "06-sap-het-han-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("3", "06 điện thoại: dòng 72px có vòng biểu tượng, tên xe/người, “loại · ngày”, chip; trang Tôi có cùng số ở dòng “Giấy tờ sắp hết hạn”" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/giay-to-sap-het-han", MOB);
    try {
      await p.waitFor("document.querySelectorAll('#due-list a.vc-due-row').length === 6", "sáu dòng", 10000);
      const s = await read(p, "mob");
      assert.equal(s.title, "Trong 30 ngày tới");
      assert.equal(s.sub, "Gồm cả giấy đã hết hạn · 6 giấy");
      assert.deepEqual(s.rows.map((r) => [r.kind, r.who, r.doc, r.chip]), KY_VONG.map((k) => [k.kind, k.who, `${k.doc} · ${k.exp}`, k.chip]));
      await axe(p, "06 điện thoại");
      await shotFull(p, "06-sap-het-han-390.png");
    } finally {
      p.close();
    }
    const q = await env.as(ADMIN, "/account", MOB);
    try {
      await q.waitFor(`!!document.querySelector('#vc-links a[href="/giay-to-sap-het-han"] .vc-badge')`, "huy hiệu ở trang Tôi", 10000);
      assert.equal(await q.ev(txt('#vc-links a[href="/giay-to-sap-het-han"] .vc-badge')), "6");
      await shotFull(q, "00-cho-vao-toi-co-so-390.png");
    } finally {
      q.close();
    }
  });

  await dem.step("4", "06 bấm dòng: xe → chi tiết xe; người → hồ sơ ở Danh bạ mở thẳng, mục Giấy tờ hiện", async () => {
    const p = await env.as(ADMIN, "/giay-to-sap-het-han", MOB);
    try {
      await p.waitFor("document.querySelectorAll('#due-list a.vc-due-row').length === 6", "danh sách", 10000);
      await p.ev(`document.querySelectorAll('#due-list a.vc-due-row')[1].click()`);
      await p.waitFor(`location.pathname === '/parties' && !document.querySelector('#detail').hidden && !!document.querySelector('#giay-to')`, "hồ sơ tài xế mở + mục Giấy tờ", 10000);
      assert.equal(new URL(await p.ev("location.href")).searchParams.get("id"), hung);
      await p.send("Page.navigate", { url: env.base + "/giay-to-sap-het-han" });
      await p.waitFor("document.querySelectorAll('#due-list a.vc-due-row').length === 6", "danh sách lại", 10000);
      await p.ev(`document.querySelectorAll('#due-list a.vc-due-row')[0].click()`);
      await p.waitFor(`location.pathname === '/xe-chi-tiet' && !!document.querySelector('h1.vc-plate')`, "chi tiết xe", 10000);
    } finally {
      p.close();
    }
  });

  await dem.step("5", "06 mốc nhắc: Quản trị KHÔNG có nút “Đổi mốc nhắc” (1040 + 390); Toàn quyền có — gõ 0 → câu máy chủ dưới ô, không lưu; gõ 7 → “Trong 7 ngày tới”, còn 3 dòng; trả về 30", async () => {
    for (const [vp, layout, sel] of [[DESK, "desk", "#due-table a.vc-due-trow"], [MOB, "mob", "#due-list a.vc-due-row"]]) {
      const q = await env.as(ADMIN, "/giay-to-sap-het-han", vp);
      try {
        await q.waitFor(`document.querySelectorAll(${JSON.stringify(sel)}).length === 6`, `sáu dòng Quản trị (${layout})`, 10000);
        await sleep(300);
        assert.equal(await q.ev(`!!document.querySelector('[data-action="doi-moc"]')`), false, `${layout}: Quản trị không thấy nút đổi mốc`);
      } finally {
        q.close();
      }
    }
    for (const [vp, layout, sel] of [[DESK, "desk", "#due-table a.vc-due-trow"], [MOB, "mob", "#due-list a.vc-due-row"]]) {
      const p = await env.as(SUPER, "/giay-to-sap-het-han", vp);
      try {
        await p.waitFor(`document.querySelectorAll(${JSON.stringify(sel)}).length === 6`, `sáu dòng (${layout})`, 10000);
        await p.waitFor(`!!document.querySelector('[data-action="doi-moc"]')`, "nút Đổi mốc nhắc", 8000);
        assert.ok(await p.ev(clickVisible("#due-sub", "Đổi mốc nhắc")), "bấm nút");
        await p.waitFor(`!!document.querySelector('.sheet-root #moc-nhac')`, "bảng đổi mốc", 8000);
        assert.equal(await p.ev(`document.querySelector('#moc-nhac').value`), "30");
        assert.ok((await p.ev(`parseFloat(getComputedStyle(document.querySelector('#moc-nhac')).fontSize)`)) >= 16, `${layout}: ô gõ ≥ 16px (chống zoom iOS)`);
        await p.ev(typeInto("#moc-nhac", "0"));
        assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu")));
        await p.waitFor(`!document.querySelector('#moc-nhac-loi').hidden`, "câu của máy chủ", 8000);
        const cau = await p.ev(txt("#moc-nhac-loi"));
        assert.ok(/1 đến 365/.test(cau ?? ""), `${layout}: câu máy chủ: ${cau}`);
        assert.equal(await p.ev(`document.querySelectorAll(${JSON.stringify(sel)}).length`), 6, `${layout}: chưa lưu thì danh sách giữ nguyên`);
        await p.ev(typeInto("#moc-nhac", "7"));
        assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu")));
        await p.waitFor(`!document.querySelector('.sheet-root') && document.querySelectorAll(${JSON.stringify(sel)}).length === 3`, `còn 3 dòng với mốc 7 (${layout})`, 10000);
        const s7 = await read(p, layout);
        assert.ok((layout === "desk" ? s7.sub : s7.title)?.includes("Trong 7 ngày tới"), `${layout}: ${s7.title} | ${s7.sub}`);
        if (layout === "desk") await shotFull(p, "06-doi-moc-7-ngay-1040.png");
        // trả về 30 để bước sau không lệch
        assert.ok(await p.ev(clickVisible("#due-sub", "Đổi mốc nhắc")));
        await p.waitFor(`!!document.querySelector('.sheet-root #moc-nhac')`, "bảng đổi mốc lần hai", 8000);
        await p.ev(typeInto("#moc-nhac", "30"));
        assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu")));
        await p.waitFor(`!document.querySelector('.sheet-root') && document.querySelectorAll(${JSON.stringify(sel)}).length === 6`, `trả về 30 (${layout})`, 10000);
      } finally {
        p.close();
      }
    }
  });

  await dem.step("6", "06 Bán hàng mở thẳng → câu từ chối của máy chủ, không danh sách", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/giay-to-sap-het-han", MOB);
    try {
      await p.waitFor("!document.querySelector('#error').hidden", "câu từ chối", 10000);
      assert.equal(await p.ev(txt("#error")), "Tài khoản này không quản lý được xe.");
      assert.equal(await p.ev("document.querySelectorAll('.vc-due-row, .vc-due-trow').length"), 0);
    } finally {
      p.close();
    }
  });
  void call;
} finally {
  await env.stop();
}
dem.xong();
