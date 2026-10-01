// Kịch bản Chrome — gộp hồ sơ cá nhân (ADR-0068; đặc tả §5, C1, T2–T3). Kiểm ở 1040 và 390:
//  1) 1040 Quản trị: hồ sơ phụ có nút "Gộp vào hồ sơ khác…"; hộp gộp: tìm hồ sơ chính → bảng ba cột; nút Gộp tắt tới khi gõ đúng tên; gộp → mở hồ sơ chính, có
//     mục "Hồ sơ đã gộp vào đây".
//  2) 1040: mở hồ sơ phụ theo ?id= → dải "Đã gộp vào …", không còn nút "Lưu thông tin" / "Thêm liên hệ" / "Gộp…".
//  3) 1040: "Hồ sơ nghi trùng" → số đếm ở đầu; một dòng có nút "Gộp…" mở hộp gộp điền sẵn hồ sơ chính.
//  4) 1040 Quản lý tài khoản: gõ tên trùng → khối liệt kê hồ sơ khớp, nút "Tạo tài khoản" tắt; tick "Vẫn tạo hồ sơ mới" → nút mở.
//  5) 390: màn nghi trùng (danh sách, không bảng — `.table-wrap` ẩn dưới 900px) có nút "Gộp…" NHÌN THẤY được, không tràn ngang; axe.
// Dùng vc-lib.mjs (trên a2-cdp.mjs: D1 tạm + wrangler dev + Chrome headless qua CDP). Hồ sơ tạo bằng API của Quản trị. Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-30-gop-ho-so/kich-ban/gop-ho-so-smoke.mjs
process.env.OUT ??= "docs/evidence/2026-09-30-gop-ho-so";
const { ACCOUNTS, DESK, MOB, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");

const ADMIN = ACCOUNTS.admin;
const dem = boDem("GOP HO SO SMOKE");
const { env, call } = await dungMoiTruong([]);
const TEN = "Nguyễn Phú Hải Chrome";
const TEN_NGHI = "Trần Nghi Trùng Chrome";

const taoHoSo = async (body) => {
  const r = await call(ADMIN, "POST", "/api/parties", body);
  assert.equal(r.status, 201, r.text);
  return r.json.party.id;
};
const di = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await sleep(300);
  await p.waitFor(`document.readyState === "complete" && location.pathname + location.search === ${JSON.stringify(path)}`, `mở ${path}`, 10000);
};
const moHoSo = async (p, id) => {
  await di(p, `/parties?id=${id}`);
  await p.waitFor("!document.querySelector('#detail').hidden", "hồ sơ mở", 10000);
};
const go = (p, sel, text) => p.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(text)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const nutGopTat = (p) => p.ev("[...document.querySelectorAll('#merge button')].find((b) => b.textContent.trim() === 'Gộp').disabled");

try {
  const phu = await taoHoSo({ kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912777111" }] });
  const chinh = await taoHoSo({ kind: "PERSON", fullName: TEN, contacts: [] });
  await taoHoSo({ kind: "PERSON", fullName: TEN_NGHI, contacts: [{ kind: "PHONE", value: "0912777222" }] });
  await taoHoSo({ kind: "PERSON", fullName: TEN_NGHI, contacts: [] });

  const p = await env.as(ADMIN, "/parties", DESK);
  try {
    await dem.step("1", "1040: nút Gộp → tìm hồ sơ chính → bảng ba cột → nút Gộp tắt tới khi gõ đúng tên → gộp → hồ sơ chính có mục “Hồ sơ đã gộp vào đây”", async () => {
      await moHoSo(p, phu);
      assert.equal(await p.ev(clickVisible("#detail", "Gộp vào hồ sơ khác…")), true);
      await p.waitFor("!document.querySelector('#merge').hidden", "hộp gộp mở", 10000);
      await go(p, '#merge input[aria-label="Tìm hồ sơ chính"]', "Phú Hải Chrome");
      await p.waitFor(`[...document.querySelectorAll('#merge select option')].some((o) => o.value === ${JSON.stringify(chinh)})`, "có hồ sơ chính", 10000);
      assert.equal(await p.ev(`[...document.querySelectorAll('#merge select option')].some((o) => o.value === ${JSON.stringify(phu)})`), false, "không tự gộp vào chính mình");
      await p.ev(`(() => { const s = document.querySelector('#merge select'); s.value = ${JSON.stringify(chinh)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      await p.waitFor("[...document.querySelectorAll('#merge h4')].length === 3", "bảng ba cột", 10000);
      const cot = await p.ev("[...document.querySelectorAll('#merge h4')].map((x) => x.textContent.trim())");
      assert.deepEqual(cot.map((c) => c.replace(/ \(\d+\)$/, "")), ["Chuyển sang hồ sơ chính", "Giữ ở hồ sơ này", "Bỏ vì đã có"]);
      assert.equal(await p.ev("document.querySelectorAll('#merge .alert').length"), 0, "không có lý do chặn");
      assert.equal(await nutGopTat(p), true, "chưa gõ tên → tắt");
      await go(p, '#merge input[aria-label="Gõ lại tên hồ sơ phụ để xác nhận"]', "Nguyễn Phú Hải");
      assert.equal(await nutGopTat(p), true, "gõ thiếu tên → vẫn tắt");
      await go(p, '#merge input[aria-label="Gõ lại tên hồ sơ phụ để xác nhận"]', `  ${TEN.toUpperCase()} `);
      assert.equal(await nutGopTat(p), false, "gõ đúng tên (khác hoa thường, thừa khoảng trắng) → mở");
      assert.equal(await p.ev(clickVisible("#merge", "Gộp")), true);
      await p.waitFor("[...document.querySelectorAll('#detail h3')].some((x) => x.textContent.trim() === 'Hồ sơ đã gộp vào đây')", "mục đã gộp vào đây", 10000);
      assert.equal(await p.ev("document.querySelector('#merge').hidden"), true, "hộp gộp đóng");
      assert.equal(await p.ev("document.querySelector('#error').hidden"), true);
      assert.deepEqual(p.consoleErrors, [], JSON.stringify(p.consoleErrors));
      await shotFull(p, "gop-ho-so-1040.png");
    });

    await dem.step("2", "1040: hồ sơ phụ mở theo ?id= → dải “Đã gộp vào …”, không nút sửa", async () => {
      await moHoSo(p, phu);
      const s = await p.ev(`({ dai: document.querySelector('#detail .alert.warn')?.textContent ?? '', nut: [...document.querySelectorAll('#detail button')].map((b) => b.textContent.trim()) })`);
      assert.match(s.dai, /^Đã gộp vào Nguyễn Phú Hải Chrome ngày \d\d\/\d\d\/\d{4}\. Hồ sơ này chỉ còn để xem lịch sử\.$/);
      for (const n of ["Lưu thông tin", "Thêm liên hệ", "Gộp vào hồ sơ khác…", "Thêm công việc", "Kết thúc"]) assert.ok(!s.nut.includes(n), `còn nút ${n}`);
      // Liên kết trong dải mở hồ sơ chính.
      await p.ev("document.querySelector('#detail .alert.warn a').click(), true");
      await p.waitFor("[...document.querySelectorAll('#detail h3')].some((x) => x.textContent.trim() === 'Hồ sơ đã gộp vào đây')", "liên kết mở hồ sơ chính", 10000);
    });

    await dem.step("3", "1040: “Hồ sơ nghi trùng” → số đếm ở đầu; “Gộp…” mở hộp gộp điền sẵn hồ sơ chính", async () => {
      await di(p, "/parties");
      await p.waitFor("!document.querySelector('#dup-btn').hidden", "nút nghi trùng hiện cho Quản trị", 10000);
      await p.ev("document.querySelector('#dup-btn').click(), true");
      await p.waitFor("!document.querySelector('#dups').hidden", "màn nghi trùng", 10000);
      assert.match(await p.ev("document.querySelector('#dups-title').textContent"), /^Hồ sơ nghi trùng \(\d+\+?\)$/);
      assert.ok(await p.ev(`document.querySelector('#dups').textContent.includes(${JSON.stringify(TEN_NGHI)})`), "cặp vừa tạo có trong danh sách");
      assert.ok(!(await p.ev(`document.querySelector('#dups').textContent.includes(${JSON.stringify(TEN)})`)), "cặp đã gộp không còn");
      assert.ok(!(await p.ev("/PHONE|NAME|LOGIN_PHONE/.test(document.querySelector('#dups').textContent)")), "không lộ mã lý do thô");
      assert.equal(await p.ev(clickVisible("#dups", "Gộp…")), true);
      await p.waitFor("!document.querySelector('#merge').hidden && !!document.querySelector('#merge strong')", "hộp gộp điền sẵn", 10000);
      await p.waitFor("[...document.querySelectorAll('#merge h4')].length === 3", "xem trước tự chạy", 10000);
      assert.equal(await p.ev(clickVisible("#merge", "Huỷ")), true);
    });

    await dem.step("4", "1040 Quản lý tài khoản: gõ tên trùng → khối hồ sơ khớp, nút Tạo tắt; tick “Vẫn tạo hồ sơ mới” → mở", async () => {
      await di(p, "/staff");
      await p.waitFor("!!document.querySelector('#add-perms input')", "form thêm đã dựng", 10000);
      await go(p, "#add-name", TEN_NGHI);
      await p.waitFor("[...document.querySelectorAll('#add-khop li')].length >= 2", "khối hồ sơ khớp", 10000);
      assert.ok(await p.ev("document.querySelector('#add-khop').textContent.includes('Cùng họ tên')"), "lý do bằng lời");
      assert.equal(await p.ev("document.querySelector('#add-form button[type=submit]').disabled"), true);
      await p.ev(`(() => { const c = document.querySelector('#add-khop label.check input'); c.click(); return true; })()`);
      assert.equal(await p.ev("document.querySelector('#add-form button[type=submit]').disabled"), false);
      await shotFull(p, "gop-ho-so-staff-1040.png");
      // Xoá trắng hai ô → khối ẩn, nút mở (không tra khi cả hai rỗng).
      await go(p, "#add-name", "");
      await sleep(700);
      assert.equal(await p.ev("document.querySelector('#add-khop').hidden"), true);
      assert.equal(await p.ev("document.querySelector('#add-form button[type=submit]').disabled"), false);
      assert.deepEqual(p.consoleErrors, [], JSON.stringify(p.consoleErrors));
    });
  } finally {
    p.close();
  }

  await dem.step("5", "390: màn nghi trùng + hộp gộp không tràn ngang, nút “Gộp…” nhìn thấy" + axeNote(), async () => {
    const m = await env.as(ADMIN, "/parties", MOB);
    try {
      await m.waitFor("!document.querySelector('#dup-btn').hidden", "nút nghi trùng", 10000);
      await m.ev("document.querySelector('#dup-btn').click(), true");
      await m.waitFor("!document.querySelector('#dups').hidden", "màn nghi trùng", 10000);
      assert.ok(await m.ev("[...document.querySelectorAll('#dups button')].some((b) => b.textContent.trim() === 'Gộp…' && b.getClientRects().length > 0)"), "nút Gộp… hiện ở 390");
      let tran = await m.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `không tràn ngang (${tran}px)`);
      await axe(m, "nghi trùng 390");
      await shotFull(m, "gop-ho-so-390.png");
      assert.equal(await m.ev(clickVisible("#dups", "Gộp…")), true);
      await m.waitFor("[...document.querySelectorAll('#merge h4')].length === 3", "hộp gộp 390", 10000);
      tran = await m.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `hộp gộp không tràn ngang (${tran}px)`);
      await axe(m, "hộp gộp 390");
      await shotFull(m, "gop-ho-so-hop-gop-390.png");
    } finally {
      m.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
