// Kịch bản Chrome — Danh bạ: nhà xe đối tác và quan hệ "Tài xế của" (ADR-0048 D1; Task B2 — KHUÔN SẴN: ô chọn "Công việc", ô "Loại" quan hệ đang có; chủ
// chọn Q2 = (a) ngày 29/9: không màn "Nhà xe" riêng, tìm nhà xe ở Danh bạ bằng ô lọc). Kiểm ở 1040 và 390:
//  1) Quản trị, hồ sơ tổ chức: ô "Công việc" có "Nhà xe đối tác"; gán → dòng "Nhà xe đối tác"; tiêu đề mục quan hệ "Người liên hệ, tài xế" (G3); ô "Loại"
//     có hai lựa chọn tài xế; chọn "Hồ sơ này là nhà xe CÓ tài xế…" → nút đổi chữ "Thêm tài xế"; chọn người → dòng "<tài xế> — Tài xế của — <nhà xe>".
//  2) cùng hồ sơ: chọn một hồ sơ TỔ CHỨC làm "tài xế" → hiện câu tiếng Việt của máy chủ ("… phải đi từ hồ sơ cá nhân …"), không mã thô, không thêm dòng.
//  3) hồ sơ NGƯỜI: "Hồ sơ này LÀ tài xế của nhà xe…" + chọn hồ sơ KHÔNG phải nhà xe → câu "… phải trỏ tới hồ sơ đang là nhà xe đối tác …".
//  4) ô lọc "Công việc" = "Nhà xe đối tác" → danh sách chỉ còn nhà xe (tìm nhà xe ở Danh bạ — Q2 = (a)).
//  5) điện thoại 390: hồ sơ nhà xe mở theo ?id=, mục "Người liên hệ, tài xế" có dòng tài xế, không tràn ngang; axe.
// Dùng vc-lib.mjs (trên a2-cdp.mjs: D1 tạm + wrangler dev + Chrome headless qua CDP). Hồ sơ tạo bằng API của Quản trị. Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0048/kich-ban/nha-xe-danh-ba-smoke.mjs
process.env.OUT ??= "docs/evidence/2026-09-29-adr-0048";
const { ACCOUNTS, DESK, MOB, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep, typeInto } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");

const ADMIN = ACCOUNTS.admin;
const dem = boDem("NHA XE DANH BA SMOKE");
const { env, call } = await dungMoiTruong([]);

const taoHoSo = async (body) => {
  const r = await call(ADMIN, "POST", "/api/parties", body);
  assert.equal(r.status, 201, r.text);
  return r.json.party.id;
};
/** Mục quan hệ của hồ sơ đang mở: tiêu đề, các dòng, lựa chọn ô "Loại", chữ nút thêm. */
const quanHe = (p) =>
  p.ev(`(() => {
    const h3 = [...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim().startsWith('Người liên hệ'));
    if (!h3) return null;
    const table = h3.nextElementSibling;
    const form = table.nextElementSibling;
    const sel = form?.querySelectorAll('select')[0] ?? null;
    return {
      title: h3.textContent.trim(),
      rows: [...table.querySelectorAll('tr')].map((tr) => tr.cells[0].textContent.trim()),
      loai: sel ? [...sel.options].map((o) => o.textContent.trim()) : [],
      nut: form?.querySelector('.actions button')?.textContent.trim() ?? null,
    };
  })()`);
/** Chọn một lựa chọn của ô "Loại" quan hệ theo chữ; gõ tìm hồ sơ; chờ ô "Chọn" có đúng hồ sơ; bấm nút thêm. */
const themQuanHe = async (p, loai, ten) => {
  assert.equal(await p.ev(`(() => { const h3 = [...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim().startsWith('Người liên hệ')); const sel = h3.nextElementSibling.nextElementSibling.querySelectorAll('select')[0]; const o = [...sel.options].find((x) => x.textContent.trim() === ${JSON.stringify(loai)}); if (!o) return false; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`), true, `lựa chọn "${loai}"`);
  const q = `[...document.querySelectorAll('#detail input[placeholder="Gõ tên hồ sơ cần liên kết…"]')][0]`;
  assert.equal(await p.ev(`(() => { const el = ${q}; el.value = ${JSON.stringify(ten)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`), true);
  await p.waitFor(`[...(${q}).closest('.grid').querySelectorAll('select')[1].options].some((o) => o.textContent.startsWith(${JSON.stringify(ten)}))`, `ô Chọn có "${ten}"`, 10000);
};
/** Điều hướng trang đang mở (cùng phiên) tới `path`. */
const di = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await sleep(300);
  await p.waitFor(`document.readyState === "complete" && location.pathname + location.search === ${JSON.stringify(path)}`, `mở ${path}`, 10000);
};
const moHoSo = async (p, id) => {
  await di(p, `/parties?id=${id}`);
  await p.waitFor("!document.querySelector('#detail').hidden && document.querySelectorAll('#detail h3').length >= 3", "hồ sơ mở", 10000);
};

try {
  const NHA_XE = "Nhà Xe Phương Nam Chrome";
  const TAI_XE = "Trần Văn Lái Chrome";
  const DAI_LY = "Đại Lý Thường Chrome";
  const nhaXe = await taoHoSo({ kind: "ORGANIZATION", displayName: NHA_XE });
  const taiXe = await taoHoSo({ kind: "PERSON", fullName: TAI_XE, contacts: [] });
  const daiLy = await taoHoSo({ kind: "ORGANIZATION", displayName: DAI_LY });

  const p = await env.as(ADMIN, "/parties", DESK);
  try {
    await dem.step("1", "1040 Quản trị: gán “Nhà xe đối tác” cho hồ sơ tổ chức; mục “Người liên hệ, tài xế”; “Hồ sơ này là nhà xe CÓ tài xế…” → nút “Thêm tài xế” → dòng Tài xế của", async () => {
      await moHoSo(p, nhaXe);
      const opts = await p.ev(`[...([...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim() === 'Công việc tại đâu').nextElementSibling.nextElementSibling.querySelector('select')?.options ?? [])].map((o) => o.textContent.trim())`);
      assert.ok(opts.includes("Nhà xe đối tác"), `ô Công việc thiếu "Nhà xe đối tác": ${JSON.stringify(opts)}`);
      assert.equal(await p.ev(`(() => { const sel = [...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim() === 'Công việc tại đâu').nextElementSibling.nextElementSibling.querySelector('select'); const o = [...sel.options].find((x) => x.textContent.trim() === 'Nhà xe đối tác'); sel.value = o.value; return true; })()`), true);
      assert.equal(await p.ev(clickVisible("#detail", "Thêm công việc")), true);
      await p.waitFor(`[...document.querySelectorAll('#detail table.items tr')].some((tr) => tr.cells[0]?.textContent.trim() === 'Nhà xe đối tác')`, "dòng Nhà xe đối tác", 10000);
      let s = await quanHe(p);
      assert.equal(s.title, "Người liên hệ, tài xế", "G3: tiêu đề mục quan hệ");
      assert.deepEqual(s.loai, ["Hồ sơ này LÀ người liên hệ của…", "Hồ sơ này CÓ người liên hệ là…", "Hồ sơ này LÀ tài xế của nhà xe…", "Hồ sơ này là nhà xe CÓ tài xế…"]);
      assert.equal(s.nut, "Thêm người liên hệ");
      await themQuanHe(p, "Hồ sơ này là nhà xe CÓ tài xế…", TAI_XE);
      s = await quanHe(p);
      assert.equal(s.nut, "Thêm tài xế", "nút đổi chữ theo loại");
      assert.equal(await p.ev(clickVisible("#detail", "Thêm tài xế")), true);
      await p.waitFor(`[...document.querySelectorAll('#detail table.items tr')].some((tr) => tr.cells[0]?.textContent.trim() === ${JSON.stringify(`${TAI_XE} — Tài xế của — ${NHA_XE}`)})`, "dòng Tài xế của", 10000);
      assert.equal(await p.ev("document.querySelector('#error').hidden"), true);
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await shotFull(p, "nha-xe-danh-ba-1040.png");
    });

    await dem.step("2", "1040: “là nhà xe CÓ tài xế…” + chọn hồ sơ TỔ CHỨC → câu tiếng Việt của máy chủ, không thêm dòng", async () => {
      const truoc = (await quanHe(p)).rows.length;
      await themQuanHe(p, "Hồ sơ này là nhà xe CÓ tài xế…", DAI_LY);
      assert.equal(await p.ev(clickVisible("#detail", "Thêm tài xế")), true);
      await p.waitFor("!document.querySelector('#error').hidden", "hiện lỗi", 10000);
      const loi = await p.ev("document.querySelector('#error').textContent.trim()");
      assert.match(loi, /phải đi từ hồ sơ cá nhân/, loi);
      assert.doesNotMatch(loi, /drives_for|DRIVES_FOR|CARRIER/, "không lộ mã thô");
      assert.equal((await quanHe(p)).rows.length, truoc);
    });

    await dem.step("3", "1040: hồ sơ NGƯỜI “LÀ tài xế của nhà xe…” + chọn hồ sơ KHÔNG phải nhà xe → câu tiếng Việt; chọn nhà xe → được (đã có dòng)", async () => {
      await moHoSo(p, taiXe);
      await themQuanHe(p, "Hồ sơ này LÀ tài xế của nhà xe…", DAI_LY);
      assert.equal((await quanHe(p)).nut, "Thêm quan hệ tài xế");
      assert.equal(await p.ev(clickVisible("#detail", "Thêm quan hệ tài xế")), true);
      await p.waitFor("!document.querySelector('#error').hidden", "hiện lỗi", 10000);
      const loi = await p.ev("document.querySelector('#error').textContent.trim()");
      assert.match(loi, /phải trỏ tới hồ sơ đang là nhà xe đối tác/, loi);
      assert.ok((await quanHe(p)).rows.includes(`${TAI_XE} — Tài xế của — ${NHA_XE}`), "hồ sơ tài xế cũng thấy dòng Tài xế của");
    });

    await dem.step("4", "1040: ô lọc “Công việc” = “Nhà xe đối tác” → danh sách chỉ còn nhà xe (Q2 = (a): tìm nhà xe ở Danh bạ)", async () => {
      await di(p, "/parties");
      await p.waitFor("document.querySelectorAll('#role option').length > 1", "ô lọc có dữ liệu", 10000);
      assert.equal(await p.ev(`(() => { const sel = document.querySelector('#role'); const o = [...sel.options].find((x) => x.textContent.trim() === 'Nhà xe đối tác'); if (!o) return false; sel.value = o.value; return true; })()`), true, "ô lọc có Nhà xe đối tác");
      await p.ev("document.querySelector('#search-form').requestSubmit(), true");
      await sleep(800);
      await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(NHA_XE)}))`, "nhà xe trong danh sách", 10000);
      const ten = await p.ev("[...document.querySelectorAll('#list tr')].map((tr) => tr.textContent)");
      assert.ok(!ten.some((t) => t.includes(DAI_LY) || t.includes(TAI_XE)), `chỉ còn nhà xe: ${JSON.stringify(ten)}`);
    });
  } finally {
    p.close();
  }

  await dem.step("5", "390 Quản trị: hồ sơ nhà xe mở theo ?id=, mục “Người liên hệ, tài xế” có dòng tài xế, không tràn ngang" + axeNote(), async () => {
    const m = await env.as(ADMIN, `/parties?id=${nhaXe}`, MOB);
    try {
      await m.waitFor("!document.querySelector('#detail').hidden && document.querySelectorAll('#detail h3').length >= 3", "hồ sơ mở", 10000);
      const s = await quanHe(m);
      assert.equal(s.title, "Người liên hệ, tài xế");
      assert.ok(s.rows.includes(`${TAI_XE} — Tài xế của — ${NHA_XE}`), JSON.stringify(s.rows));
      const tran = await m.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `không tràn ngang (${tran}px)`);
      await axe(m, "hồ sơ nhà xe 390");
      await shotFull(m, "nha-xe-danh-ba-390.png");
    } finally {
      m.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
