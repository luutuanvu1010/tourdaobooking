// Kịch bản Chrome + axe — Việc 8 (ADR-0228 đề xuất): tách công tắc khách, công tắc «Đơn đối tác không cần giờ đón», trang đơn không lặp mục. Hai khổ 390 và 1280. D1 local tạm; tên, SĐT GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web` (ảnh để NGOÀI kho — ADR-0215 Đ3):
//   AXE_JS=$PWD/node_modules/axe-core/axe.min.js OUT=$HOME/tourdao-viec-8 node docs/evidence/2026-11-21-viec-8/kich-ban/viec-8-smoke.mjs
// Luồng mỗi khổ: Toàn quyền thấy ba khối công tắc (tên, SĐT; danh sách hành khách; không cần giờ đón), bật «danh sách hành khách» → Đối tác mở form: CÓ khối Khách hàng, KHÔNG khối Hành khách,
// gửi đơn → trang đơn: dải tóm tắt không có ô «KHÁCH», không có nơi đón; Toàn quyền bật thêm «tên, SĐT» → đơn mới của Đối tác: khối Khách hàng không có dòng «Tên» (trùng Bên đặt).
// Cuối khổ trả hai công tắc về Tắt. Trang dùng chung kho cookie: mỗi phần đăng nhập một tài khoản, đóng trang trước khi mở tài khoản khác.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AXE, CHU, MOB, OUT, assert, axe, axeNote, boDem, click, dungMoiTruong, noOverflowX, sleep, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DOITAC = { name: "Đối Tác Việc Tám", phone: "0900000781", pin: "246781", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const { env } = await dungMoiTruong([CHU, DOITAC]);
const b = boDem("VIEC 8 CONG TAC KHACH VA TRANG DON");
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1280, height: 820, mobile: false };

const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
  await dat(khung.height);
  await sleep(200);
};
const axeVung = async (p, sel, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document.querySelector(${JSON.stringify(sel)})).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => ({ id: x.id, target: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))`);
  assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
};
const docTxt = (p, sel) => p.ev(`((e) => e ? e.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`);
const hien = (p, sel) => p.ev(`((e) => !!e && e.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`);
const loiConsole = (p, o) => assert.deepEqual(p.consoleErrors, [], `lỗi console (${o}): ${p.consoleErrors}`);

/** Toàn quyền bấm nút công tắc `khoa` (id `${khoa}-doi`) cho tới khi trạng thái là `muon`. */
const datCongTac = async (p, khoa, muon) => {
  const sel = `#${khoa}-trang-thai`;
  if ((await docTxt(p, sel)) === (muon ? "Đang bật." : "Đang tắt.")) return;
  await p.ev(click(`#${khoa}-doi`));
  await p.waitFor(`document.querySelector('${sel}')?.textContent === '${muon ? "Đang bật." : "Đang tắt."}'`, `công tắc ${khoa}`, 8000);
};

/** Đối tác lập đơn TD101, 2 người lớn, Không đón; điền khách nếu khối Khách hàng hiện. Trả id đơn sau khi «Gửi đơn». */
const lapVaGui = async (p) => {
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("/TD101/.test(document.getElementById('catalog-list').textContent)", "danh mục có TD101", 12000);
  await p.ev(typeInto("#catalog-q", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await p.waitFor(`!!document.querySelector('#services .svc .counter-field[aria-label="Người lớn"]')`, "thẻ dịch vụ");
  await p.ev(typeInto('#services .svc .counter-field[aria-label="Người lớn"]', "2"));
  if (await hien(p, "#customerName")) {
    await p.ev(typeInto("#customerName", "Khách Thử Việc Tám"));
    await p.ev(typeInto("#customerPhone", "0903 781 781"));
  }
  await p.ev(typeInto("#orderDate", vnDate(3)));
  await p.ev(click('[data-action="chon-khong-don"]'));
  await sleep(300);
  await p.ev("document.getElementById('save').click(); true");
  try {
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "sang trang đơn", 15000);
  } catch (e) {
    throw new Error(`${e.message}\n#save-error: ${await p.ev("document.getElementById('save-error')?.textContent ?? ''").catch(() => "?")}`);
  }
  await p.waitFor(`!!document.querySelector('.order-summary-band')`, "dải tóm tắt", 12000);
  await sleep(500);
  return p.ev("new URLSearchParams(location.search).get('id')");
};
const nhanDai = (p) => p.ev("[...document.querySelectorAll('.order-summary-band .label')].map((e) => e.textContent.trim())");
const dongKhach = (p) => p.ev(`[...document.querySelectorAll('main .khoi')].find((k) => /Khách hàng/.test(k.querySelector('h2, .khoi-tieu-de')?.textContent ?? ''))?.innerText ?? ''`);

const buoc = async (khung, hau) => {
  let p = await env.as(CHU, "/account", khung);
  await p.waitFor(`!!document.querySelector('#hanh-khach-dt-cai-dat:not([hidden]) #hanh-khach-dt-doi') && !!document.querySelector('#khong-can-gio-cai-dat:not([hidden]) #khong-can-gio-doi')`, "hai khối công tắc mới", 12000);
  await b.step(`${hau}-1`, `${hau}: Toàn quyền thấy «Đối tác không nhập tên, SĐT khách», «Đối tác không nhập danh sách hành khách», «Đơn đối tác không cần giờ đón» (đều Tắt); bật «danh sách hành khách»${axeNote()}`, async () => {
    assert.equal(await docTxt(p, "#an-khach-heading"), "Đối tác không nhập tên, SĐT khách");
    assert.equal(await docTxt(p, "#hanh-khach-dt-heading"), "Đối tác không nhập danh sách hành khách");
    assert.equal(await docTxt(p, "#khong-can-gio-heading"), "Đơn đối tác không cần giờ đón");
    for (const k of ["an-khach", "hanh-khach-dt", "khong-can-gio"]) assert.equal(await docTxt(p, `#${k}-trang-thai`), "Đang tắt.", k);
    assert.equal(await docTxt(p, "#khong-can-gio-doi"), "Bật đơn đối tác không cần giờ đón");
    await datCongTac(p, "hanh-khach-dt", true);
    assert.equal(await docTxt(p, "#hanh-khach-dt-doi"), "Tắt đối tác không nhập danh sách hành khách");
    assert.equal(await p.ev(noOverflowX), true);
    await p.ev(`document.querySelector('#hanh-khach-dt-cai-dat').scrollIntoView({ block: 'center' })`);
    await chup(p, `01-cong-tac-${hau}`, khung);
    for (const sel of ["#an-khach-cai-dat", "#hanh-khach-dt-cai-dat", "#khong-can-gio-cai-dat"]) await axeVung(p, sel, `${sel} ${hau}`);
    loiConsole(p, "trang Tôi");
  });
  p.close();

  p = await env.as(DOITAC, "/order-form", khung);
  await b.step(`${hau}-2`, `${hau}: Đối tác (chỉ tắt danh sách): CÓ ô tên, SĐT khách; KHÔNG khối Hành khách; gửi đơn được${axeNote()}`, async () => {
    await p.waitFor("!!document.getElementById('catalog-q')", "form", 12000);
    await sleep(500);
    assert.equal(await hien(p, "#customerName"), true, "ô tên khách hiện");
    assert.equal(await hien(p, "#hk-card"), false, "không khối Hành khách");
    await chup(p, `02-form-doi-tac-${hau}`, khung);
    await axe(p, `form đối tác ${hau}`);
  });
  await b.step(`${hau}-3`, `${hau}: trang đơn sau «Gửi đơn»: dải tóm tắt không có ô «KHÁCH», ô «ĐÓN» không kèm nơi đón; khối Khách hàng có dòng «Tên»${axeNote()}`, async () => {
    await lapVaGui(p);
    const nhan = await nhanDai(p);
    assert.ok(!nhan.includes("KHÁCH"), JSON.stringify(nhan));
    assert.ok(nhan.includes("SỐ KHÁCH") && nhan.includes("ĐÓN"), JSON.stringify(nhan));
    assert.match(await dongKhach(p), /Tên/);
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `03-trang-don-${hau}`, khung);
    await axe(p, `trang đơn ${hau}`);
    loiConsole(p, "trang đơn");
  });
  p.close();

  p = await env.as(CHU, "/account", khung);
  await p.waitFor(`!!document.querySelector('#an-khach-cai-dat:not([hidden]) #an-khach-doi')`, "khối tên, SĐT", 12000);
  await datCongTac(p, "an-khach", true);
  p.close();

  p = await env.as(DOITAC, "/order-form", khung);
  await b.step(`${hau}-4`, `${hau}: bật thêm «tên, SĐT»: form không ô tên; trang đơn: khối Khách hàng không có dòng «Tên» (trùng Bên đặt), vẫn có «Số điện thoại»${axeNote()}`, async () => {
    await p.waitFor("!!document.querySelector('[data-buoc-khoi=\"khach\"][data-an-khach]')", "khối khách ẩn", 12000);
    await lapVaGui(p);
    const k = await dongKhach(p);
    assert.doesNotMatch(k, /(^|\n)Tên(\n|$)/, k);
    assert.match(k, /Số điện thoại/);
    await chup(p, `04-trang-don-an-ten-${hau}`, khung);
    await axe(p, `trang đơn ẩn tên ${hau}`);
  });
  p.close();

  p = await env.as(CHU, "/account", khung); // trả về Tắt cho khổ sau
  await p.waitFor(`!!document.querySelector('#an-khach-cai-dat:not([hidden]) #an-khach-doi')`, "khối tên, SĐT", 12000);
  await datCongTac(p, "an-khach", false);
  await datCongTac(p, "hanh-khach-dt", false);
  p.close();
};

try {
  await buoc(MOB, "390");
  await buoc(DESK, "1280");
} finally {
  await env.stop?.();
}
b.xong();
