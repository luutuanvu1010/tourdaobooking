// Kịch bản Chrome — chủ xe ở các màn Xe (ADR-0048 D1; Task B3 — KHUÔN SẴN: ô chọn `.vc-input` của form Vận chuyển, dòng phụ `.vc-xe-meta` / `.vc-xe-sub` của thẻ
// xe bản vẽ 00–03; chủ chọn Q2 = (a) ngày 29/9 "các chỗ nhỏ … làm theo kiểu có sẵn, không cần vẽ"; Q1 = (a) "Sửa được, ghi nhật ký"). Kiểm:
//  1) 1040 /xe-sua (thêm): ô "Chủ xe" ngay dưới "Tên / đời xe", mặc định công ty chủ, có từng nhà xe đang hợp tác; chọn nhà xe → Lưu → chi tiết có
//     "Chủ xe: <nhà xe>" (máy chủ lưu đúng chủ).
//  2) 1040 /xe: dòng xe của nhà xe có "Nhà xe: <tên>", xe công ty KHÔNG có; ô lọc "Chủ xe" (Tất cả / công ty / từng nhà xe) → gọi ?chu= → chỉ xe của chủ đó.
//  3) 390 /xe: thẻ xe của nhà xe có dòng "Nhà xe: <tên>"; ô lọc hoạt động; không tràn ngang; axe.
//  4) 1040 /xe-sua?id= (sửa, Q1 = (a)): ô "Chủ xe" chọn sẵn chủ hiện tại; đổi sang công ty → Lưu → chi tiết "Chủ xe: <công ty>"; nhật ký máy chủ "chủ xe A → B".
//  5) khi CHƯA có nhà xe nào: form thêm xe và danh sách xe KHÔNG hiện ô "Chủ xe" (giữ đúng bản vẽ 01–02 của lượt 1a).
// Dùng vc-lib.mjs (trên a2-cdp.mjs). Nhà xe tạo bằng API của Quản trị. Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0048/kich-ban/xe-chu-xe-smoke.mjs
process.env.OUT ??= "docs/evidence/2026-09-29-adr-0048";
const { ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, sleep, txt, typeInto } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");

const ADMIN = ACCOUNTS.admin;
const dem = boDem("XE CHU XE SMOKE");
const { env, call, themXe } = await dungMoiTruong([]);
const CONG_TY = "Công ty TNHH Tour Đảo";
const NHA_XE = "Nhà Xe Phương Nam Chrome";

/** Nhãn (label) của các ô trong form xe theo thứ tự, và lựa chọn của ô "Chủ xe". */
const formXe = (p) =>
  p.ev(`(() => {
    const vis = (el) => !!el && el.getClientRects().length > 0;
    const labels = [...document.querySelectorAll('#xe-form .vc-field > label, #xe-form .vc-field > .vc-label')].filter(vis).map((l) => l.textContent.trim());
    const sel = document.querySelector('#xe-owner');
    return { labels, options: sel && vis(sel) ? [...sel.options].map((o) => ({ value: o.value, text: o.textContent.trim(), selected: o.selected })) : null };
  })()`);
const chonChu = (p, text) =>
  p.ev(`(() => { const sel = document.querySelector(${JSON.stringify("#xe-owner")}) ?? document.querySelector('#xe-chu'); const o = [...sel.options].find((x) => x.textContent.trim() === ${JSON.stringify(text)}); if (!o) return false; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
const di = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await sleep(300);
  await p.waitFor(`document.readyState === "complete" && location.pathname + location.search === ${JSON.stringify(path)}`, `mở ${path}`, 10000);
};

try {
  await dem.step("5", "CHƯA có nhà xe: form thêm xe và danh sách xe KHÔNG có ô “Chủ xe” (giữ bản vẽ 01–02)", async () => {
    const p = await env.as(ADMIN, "/xe-sua", DESK);
    try {
      await p.waitFor("!document.querySelector('#xe-form').hidden", "form dựng xong", 10000);
      await sleep(500);
      const f = await formXe(p);
      assert.equal(f.options, null, "không có ô Chủ xe khi chưa có nhà xe");
      assert.ok(!f.labels.includes("Chủ xe"), JSON.stringify(f.labels));
      await di(p, "/xe");
      await sleep(800);
      assert.equal(await p.ev("(() => { const el = document.querySelector('#xe-chu-loc'); return !!el && el.getClientRects().length > 0; })()"), false, "danh sách không có ô lọc Chủ xe");
    } finally {
      p.close();
    }
  });

  // Dữ liệu: một nhà xe đang hợp tác + một xe công ty có sẵn.
  const r = await call(ADMIN, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: NHA_XE });
  assert.equal(r.status, 201, r.text);
  const nhaXe = r.json.party.id;
  const rv = await call(ADMIN, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" });
  assert.equal(rv.status, 201, rv.text);
  const xeCongTy = await themXe({ plateNumber: "79B-600.01", chassisNumber: "KHUNGCT00001", name: "Ford Transit", passengerCapacity: 15 });
  let xeNhaXe = null;

  await dem.step("1", "1040 /xe-sua: ô “Chủ xe” dưới “Tên / đời xe”, mặc định công ty chủ, có nhà xe; chọn nhà xe → Lưu → chi tiết “Chủ xe: <nhà xe>”", async () => {
    const p = await env.as(ADMIN, "/xe-sua", DESK);
    try {
      await p.waitFor("!!document.querySelector('#xe-owner')", "ô Chủ xe", 10000);
      const f = await formXe(p);
      const at = f.labels.indexOf("Tên / đời xe");
      assert.equal(f.labels[at + 1], "Chủ xe", `ô Chủ xe ngay dưới Tên / đời xe: ${JSON.stringify(f.labels)}`);
      assert.deepEqual(f.options.map((o) => o.text), [`${CONG_TY} (công ty)`, `${NHA_XE} (nhà xe đối tác)`]);
      assert.equal(f.options[0].selected, true, "mặc định công ty chủ");
      await p.ev(typeInto("#xe-plate", "79B-600.02"));
      await p.ev(typeInto("#xe-chassis", "KHUNGNX00001"));
      await p.ev(typeInto("#xe-name", "Hyundai Solati"));
      assert.equal(await chonChu(p, `${NHA_XE} (nhà xe đối tác)`), true);
      await shotFull(p, "xe-sua-chu-xe-1040.png");
      await p.ev("document.querySelector('#xe-form').requestSubmit(), true");
      await p.waitFor("location.pathname === '/xe-chi-tiet'", "sang chi tiết xe", 10000);
      await p.waitFor("!document.querySelector('#xe-head').hidden", "đầu thẻ", 10000);
      const subs = await p.ev("[...document.querySelectorAll('#xe-head .vc-xe-sub')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())");
      assert.ok(subs.includes(`Chủ xe: ${NHA_XE}`), JSON.stringify(subs));
      xeNhaXe = new URL(await p.ev("location.href")).searchParams.get("id");
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await shotFull(p, "xe-chi-tiet-chu-xe-1040.png");
    } finally {
      p.close();
    }
    const [row] = env.sql(`SELECT owner_party_id FROM vc_vehicle WHERE id = '${xeNhaXe}'`);
    assert.equal(row.owner_party_id, nhaXe, "máy chủ lưu đúng chủ xe");
  });

  await dem.step("2", "1040 /xe: dòng xe nhà xe có “Nhà xe: <tên>”, xe công ty không; ô lọc “Chủ xe” gọi ?chu= và chỉ còn xe của chủ đó", async () => {
    const p = await env.as(ADMIN, "/xe", DESK);
    try {
      await p.waitFor("document.querySelectorAll('#xe-table .vc-xe-row').length === 2", "hai dòng xe", 10000);
      const rows = await p.ev("[...document.querySelectorAll('#xe-table .vc-xe-row')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())");
      assert.ok(rows.some((t) => t.includes("79B-600.02") && t.includes(`Nhà xe: ${NHA_XE}`)), JSON.stringify(rows));
      assert.ok(rows.some((t) => t.includes("79B-600.01") && !t.includes("Nhà xe:")), JSON.stringify(rows));
      await p.waitFor("(() => { const el = document.querySelector('#xe-chu-loc'); return !!el && el.getClientRects().length > 0; })()", "ô lọc Chủ xe hiện", 10000);
      assert.deepEqual(await p.ev("[...document.querySelector('#xe-chu').options].map((o) => o.textContent.trim())"), ["Tất cả", `${CONG_TY} (công ty)`, `${NHA_XE} (nhà xe đối tác)`]);
      assert.equal(await chonChu(p, `${NHA_XE} (nhà xe đối tác)`), true);
      await p.waitFor("document.querySelectorAll('#xe-table .vc-xe-row').length === 1", "chỉ còn một dòng", 10000);
      assert.match(await p.ev(txt("#xe-table .vc-xe-row")), /79B-600\.02/);
      assert.ok(apiCalls(p).some((c) => c.path === "/api/van-chuyen/xe") && p.requests.some((q) => q.url.includes(`/api/van-chuyen/xe?chu=${nhaXe}`)), "gọi ?chu=<nhà xe>");
      assert.equal(await chonChu(p, `${CONG_TY} (công ty)`), true);
      await p.waitFor("document.querySelectorAll('#xe-table .vc-xe-row').length === 1 && document.querySelector('#xe-table .vc-xe-row').innerText.includes('79B-600.01')", "chỉ xe công ty", 10000);
      assert.equal(await chonChu(p, "Tất cả"), true);
      await p.waitFor("document.querySelectorAll('#xe-table .vc-xe-row').length === 2", "lại đủ hai xe", 10000);
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await shotFull(p, "xe-danh-sach-chu-xe-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("3", "390 /xe: thẻ xe nhà xe có dòng “Nhà xe: <tên>”; ô lọc chạy; không tràn ngang" + axeNote(), async () => {
    const p = await env.as(ADMIN, "/xe", MOB);
    try {
      await p.waitFor("document.querySelectorAll('#xe-cards .vc-xe-card').length === 2", "hai thẻ xe", 10000);
      const the = await p.ev("[...document.querySelectorAll('#xe-cards .vc-xe-card')].map((c) => c.innerText.replace(/\\s+/g, ' ').trim())");
      assert.ok(the.some((t) => t.includes("79B-600.02") && t.includes(`Nhà xe: ${NHA_XE}`)), JSON.stringify(the));
      assert.ok(the.some((t) => t.includes("79B-600.01") && !t.includes("Nhà xe:")), JSON.stringify(the));
      assert.equal(await chonChu(p, `${NHA_XE} (nhà xe đối tác)`), true);
      await p.waitFor("document.querySelectorAll('#xe-cards .vc-xe-card').length === 1", "một thẻ", 10000);
      const tran = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `không tràn ngang (${tran}px)`);
      await axe(p, "danh sách xe 390");
      await shotFull(p, "xe-danh-sach-chu-xe-390.png");
    } finally {
      p.close();
    }
  });

  await dem.step("4", "1040 /xe-sua?id= (Q1 = (a)): ô Chủ xe chọn sẵn nhà xe; đổi sang công ty → Lưu → chi tiết “Chủ xe: <công ty>”; nhật ký “chủ xe A → B”", async () => {
    const p = await env.as(ADMIN, `/xe-sua?id=${xeNhaXe}`, DESK);
    try {
      await p.waitFor("!!document.querySelector('#xe-owner')", "ô Chủ xe", 10000);
      const f = await formXe(p);
      assert.equal(f.options.find((o) => o.selected)?.text, `${NHA_XE} (nhà xe đối tác)`, "chọn sẵn chủ hiện tại");
      assert.equal(await chonChu(p, `${CONG_TY} (công ty)`), true);
      await p.ev("document.querySelector('#xe-form').requestSubmit(), true");
      await p.waitFor("location.pathname === '/xe-chi-tiet'", "sang chi tiết xe", 10000);
      await p.waitFor(`[...document.querySelectorAll('#xe-head .vc-xe-sub')].some((x) => x.innerText.includes(${JSON.stringify(`Chủ xe: ${CONG_TY}`)}))`, "chi tiết: chủ là công ty", 10000);
    } finally {
      p.close();
    }
    const [nk] = env.sql(`SELECT detail FROM audit_log WHERE action = 'vehicle_updated' AND target_id = '${xeNhaXe}' ORDER BY rowid DESC LIMIT 1`);
    assert.match(nk.detail, new RegExp(`chủ xe ${NHA_XE} → ${CONG_TY}`));
    void xeCongTy;
  });
} finally {
  await env.stop();
}
dem.xong();
