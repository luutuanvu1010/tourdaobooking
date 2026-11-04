// Kịch bản Chrome: màn «Cấp độ đại lý» (đặc tả docs/superpowers/specs/2026-11-04-man-cap-dai-ly.md). `npm test` canh luật thuần, route và nối dây nhưng không mở trang; đây là phần mở trang.
//   1. Kế toán 1040, CHƯA có cấp nào: câu nói rõ, liên kết sang /hoa-hong, ô không phải nút mở bảng.
//   2. Kế toán 1040, có cấp: thấy hồ sơ có và chưa có tài khoản; hồ sơ không vai trò không hiện; mục ở thanh bên; đặt cấp cho công ty chưa có tài khoản; tìm bỏ dấu; lọc «Chưa có cấp».
//   3. Kế toán 390: thẻ, không bảng, ô tìm ≥ 16px, mở được bảng đặt cấp, không tràn ngang.
//   4. Bán hàng, Hành chính nhân sự: câu từ chối, không mục thanh bên, không gọi route đọc.
//   5. Quản trị ở Quản lý tài khoản: có đường dẫn sang màn, cột cấp vẫn chạy. Hành chính nhân sự: không có đường dẫn.
// Thứ tự (kho cookie dùng chung, đăng nhập lại đá phiên): dựng dữ liệu bằng tài khoản không đang mở trang. Tên, SĐT đều GIẢ. Môi trường: D1 tạm + wrangler dev + Chrome headless; không --remote.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-04-man-cap-dai-ly node docs/evidence/2026-11-04-man-cap-dai-ly/kich-ban/cap-dai-ly-smoke.mjs
// Cuối: "CAP DAI LY SMOKE OK (<n> bước)" hoặc danh sách bước đỏ (thoát 1).
import { mkdirSync } from "node:fs";
import { join } from "node:path";

process.env.OUT ??= join(process.cwd(), "docs/evidence/2026-11-04-man-cap-dai-ly");
if (!process.env.AXE_JS) {
  console.error("Thiếu AXE_JS (đường dẫn axe.min.js) — dừng, vì kịch bản này đòi axe-core.");
  process.exit(2);
}
mkdirSync(join(process.env.OUT, "anh"), { recursive: true });
const { ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, boDem, dungMoiTruong, noCode, noOverflowX, shotView, sleep, typeInto, vnDate } = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");

const NHAN_SU = { name: "Nhân Sự Màn Cấp", phone: "0900000571", pin: "246571", permissions: ["HR"] };
const BAN_HANG = { name: "Bán Hàng Màn Cấp", phone: "0900000572", pin: "246572", permissions: ["SALES"] };
const CTY = "Lữ hành Biển Xanh Chrome";
const CTY_KHAC = "Khách sạn Đà Nẵng Chrome";
const KHONG_VAI = "Công ty Không Vai Chrome";
const DAI_LY_TK = "Đại Lý Có Tài Khoản";
const CAP = "Tên thử TA3 Chrome";

const { env, call } = await dungMoiTruong([CHU, NHAN_SU, BAN_HANG]);
const b = boDem("CAP DAI LY SMOKE");
const pages = [];
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const KT = ACCOUNTS.accounting;

try {
  const taoCty = async (ten, vai) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten });
    dung(r, 201, ten);
    if (vai) dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${r.json.party.id}/roles`, { roleTypeCode: vai }), 201, `vai ${ten}`);
    return r.json.party.id;
  };
  await taoCty(CTY, "TRAVEL_AGENCY");
  await taoCty(CTY_KHAC, "HOTEL_RECEPTION");
  await taoCty(KHONG_VAI, null);
  dung(await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: DAI_LY_TK, phone: "0900000573", roles: ["GUIDE_FREELANCE"] }), 201, "tài khoản đại lý");

  const moTrang = async (account, path, viewport) => {
    const p = await env.openPage(viewport);
    pages.push(p);
    await p.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__fetchApi = []; { const goc = window.fetch; window.fetch = function (i, o) { try { window.__fetchApi.push(String(typeof i === 'string' ? i : i.url)); } catch {} return goc.apply(this, arguments); }; }",
    });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  const hang = (ten, goc) => `[...document.querySelectorAll(${JSON.stringify(goc)})].find((x) => x.textContent.includes(${JSON.stringify(ten)}) && x.getClientRects().length > 0)`;
  const chuO = (ten, goc) => `((x) => { const c = x && x.querySelector('.cot-cap'); return c ? c.innerText.replace(/\\s+/g, ' ').trim() : null; })(${hang(ten, goc)})`;
  const bamNutO = (ten, goc) => `((x) => { const n = x && x.querySelector('.cot-cap button'); if (!n) return false; n.click(); return true; })(${hang(ten, goc)})`;
  const chonCap = (ten) => `(() => { const s = document.querySelector('#cap-chon'); const o = s && [...s.options].find((x) => x.textContent === ${JSON.stringify(ten)}); if (!o) return false; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
  const bamLuu = `(() => { const n = [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent.trim() === 'Lưu'); if (!n) return false; n.click(); return true; })()`;
  const dongTrongBang = `document.querySelectorAll('#cdl-bang tr').length`;
  const HANG = "#cdl-bang tr";
  const THE = "#cdl-the .card";
  const mucThanhBen = `[...document.querySelectorAll('#sidebar a')].some((a) => a.getAttribute('href') === '/cap-dai-ly')`;

  let p = await moTrang(KT, "/cap-dai-ly", DESK);
  await b.step("1", "Kế toán 1040, chưa có cấp: câu nói rõ + liên kết /hoa-hong; ô là chữ, không nút; hồ sơ vẫn hiện", async () => {
    await p.waitFor(`!!${hang(CTY, HANG)}`, "danh sách đã vẽ");
    assert.equal(await p.ev(`document.querySelector('#cdl-khong-cap').hidden`), false, "câu không có cấp hiện");
    assert.match(await p.ev(`document.querySelector('#cdl-khong-cap').innerText`), /Chưa có cấp độ đại lý nào đang bật.*Hoa hồng đối tác/);
    assert.equal(await p.ev(`document.querySelector('#cdl-khong-cap a').getAttribute('href')`), "/hoa-hong");
    assert.equal(await p.ev(`document.querySelectorAll('#cdl-bang .cot-cap button').length`), 0, "không còn nút mở bảng");
    assert.match(await p.ev(chuO(CTY, HANG)), /^Chưa có cấp/);
    await axe(p, "Cấp độ đại lý, chưa có cấp");
    await shotView(p, "cap-1040-chua-co-cap.png");
  });
  p.close();

  const r = await call(ACCOUNTS.admin, "POST", "/api/pricing/muc-ta", { ten: CAP });
  dung(r, 201, "tạo cấp");
  dung(await call(ACCOUNTS.admin, "POST", `/api/pricing/muc-ta/${r.json.muc.code}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp: 1200, tuNgay: vnDate(-1) }), 201, "dòng cấp");

  p = await moTrang(KT, "/cap-dai-ly", DESK);
  await b.step("2a", "Kế toán 1040: đủ hồ sơ có và chưa có tài khoản, hồ sơ không vai trò không hiện; mục thanh bên; không tràn ngang, không mã thô", async () => {
    await p.waitFor(`!!${hang(CTY, HANG)}`, "danh sách đã vẽ");
    assert.equal(await p.ev(`document.querySelector('#cdl-khong-cap').hidden`), true, "có cấp ⇒ không có câu báo");
    const chu = await p.ev(`document.querySelector('#cdl-bang').innerText`);
    for (const t of [CTY, CTY_KHAC, DAI_LY_TK, "Có tài khoản", "Chưa có tài khoản", "Tổ chức", "Cá nhân"]) assert.ok(chu.includes(t), `thiếu ${t}`);
    assert.ok(!chu.includes(KHONG_VAI), "hồ sơ không vai trò không hiện");
    assert.ok(await p.ev(mucThanhBen), "mục ở thanh bên");
    assert.ok(await p.ev(noOverflowX));
    assert.equal(await p.ev(noCode), "", "không mã thô");
    await axe(p, "Cấp độ đại lý 1040");
    await shotView(p, "cap-1040-danh-sach.png");
  });
  await b.step("2b", "Đặt cấp cho công ty chưa có tài khoản ngay trên màn: ô đổi chữ, gọi đúng lệnh có sẵn, tiêu điểm về đúng hàng", async () => {
    assert.ok(await p.ev(bamNutO(CTY, HANG)), "bấm được ô");
    await p.waitFor(`!!document.querySelector('#cap-chon')`, "bảng đặt cấp mở");
    assert.match(await p.ev(`document.querySelector('.sheet-root').innerText`), new RegExp(CTY), "bảng nêu tên công ty");
    await shotView(p, "cap-1040-bang-dat.png");
    assert.ok(await p.ev(chonCap(CAP)), "chọn cấp");
    assert.ok(await p.ev(bamLuu), "bấm Lưu");
    await p.waitFor(`!document.querySelector('.sheet-root')`, "bảng đóng");
    await p.waitFor(`(${chuO(CTY, HANG)} || '').includes('cấp riêng')`, "ô đổi chữ");
    assert.match(await p.ev(chuO(CTY, HANG)), new RegExp(`^${CAP} \\(cấp riêng\\)`));
    assert.ok(apiCalls(p).some((c) => c.method === "POST" && /^\/api\/pricing\/ho-so\/[^/]+\/muc-rieng$/.test(c.path)), "đi đúng lệnh đặt có sẵn");
    assert.equal(await p.ev(`((x) => !!x && x.contains(document.activeElement))(${hang(CTY, HANG)})`), true, "tiêu điểm về hàng vừa lưu");
    await shotView(p, "cap-1040-da-dat.png");
  });
  await b.step("2c", "Tìm bỏ dấu và lọc «Chưa có cấp»", async () => {
    await p.ev(typeInto("#cdl-tim", "da nang"));
    await p.waitFor(`${dongTrongBang} === 1`, "còn một dòng sau khi tìm");
    assert.ok((await p.ev(`document.querySelector('#cdl-bang').innerText`)).includes(CTY_KHAC));
    assert.match(await p.ev(`document.querySelector('#cdl-dem').innerText`), /^1 \/ \d+ hồ sơ$/);
    await p.ev(typeInto("#cdl-tim", "khong co ai"));
    await p.waitFor(`document.querySelector('#cdl-rong').hidden === false`, "câu không khớp");
    assert.equal(await p.ev(`document.querySelector('#cdl-rong').innerText`), "Không có hồ sơ nào khớp.");
    await p.ev(typeInto("#cdl-tim", ""));
    await p.waitFor(`${dongTrongBang} > 1`, "hiện lại");
    await p.ev(`document.querySelector('#cdl-chua-co').click()`);
    await p.waitFor(`document.querySelector('#cdl-chua-co').getAttribute('aria-pressed') === 'true'`, "nút lọc bật");
    const chu = await p.ev(`document.querySelector('#cdl-bang').innerText`);
    assert.ok(!chu.includes(CTY), "công ty đã có cấp rời bộ lọc");
    assert.ok(chu.includes(CTY_KHAC), "công ty chưa có cấp còn");
    await shotView(p, "cap-1040-loc-chua-co.png");
  });
  p.close();

  p = await moTrang(KT, "/cap-dai-ly", MOB);
  await b.step("3", "Kế toán 390: thẻ thay bảng, ô tìm ≥ 16px, mở được bảng đặt cấp, không tràn ngang", async () => {
    await p.waitFor(`!!${hang(CTY_KHAC, THE)}`, "thẻ đã vẽ");
    assert.equal(await p.ev(`document.querySelector('#cdl-bang-wrap').getClientRects().length`), 0, "bảng ẩn ở điện thoại");
    assert.ok(Number.parseFloat(await p.ev(`getComputedStyle(document.querySelector('#cdl-tim')).fontSize`)) >= 16, "ô tìm ≥ 16px");
    assert.match(await p.ev(chuO(CTY, THE)), new RegExp(`^${CAP} \\(cấp riêng\\)`));
    assert.ok(await p.ev(noOverflowX));
    assert.equal(await p.ev(noCode), "", "không mã thô");
    await axe(p, "Cấp độ đại lý 390");
    await shotView(p, "cap-390-the.png");
    assert.ok(await p.ev(bamNutO(CTY_KHAC, THE)), "bấm được ô");
    await p.waitFor(`!!document.querySelector('#cap-chon')`, "bảng đặt cấp mở");
    assert.ok(await p.ev(noOverflowX));
    await shotView(p, "cap-390-bang-dat.png");
  });
  p.close();

  for (const [nhan, tk] of [["Bán hàng", BAN_HANG], ["Hành chính nhân sự", NHAN_SU]]) {
    p = await moTrang(tk, "/cap-dai-ly", DESK);
    await b.step(`4-${nhan}`, `${nhan}: câu từ chối, không mục thanh bên, không gọi route đọc của màn`, async () => {
      await p.waitFor(`document.querySelector('#error').hidden === false`, "câu từ chối");
      assert.match(await p.ev(`document.querySelector('#error').innerText`), /chỉ dành cho Kế toán, Quản trị và Toàn quyền/);
      await sleep(300);
      assert.equal(await p.ev(mucThanhBen), false, "không mục thanh bên");
      assert.equal(await p.ev(`document.querySelector('#cdl-khung').hidden`), true, "khung danh sách ẩn");
      assert.deepEqual((await p.ev(`window.__fetchApi`)).filter((u) => u.includes("/api/pricing/cap-dai-ly")), [], "không gọi route đọc");
    });
    p.close();
  }

  p = await moTrang(ACCOUNTS.admin, "/staff", DESK);
  await b.step("5a", "Quản trị ở Quản lý tài khoản: có đường dẫn sang màn; cột cấp vẫn chạy", async () => {
    await p.waitFor(`!!(${chuO(DAI_LY_TK, "#list tr")})`, "cột cấp đã dựng");
    assert.equal(await p.ev(`document.querySelector('#lien-ket-cap-dai-ly').hidden`), false);
    assert.equal(await p.ev(`document.querySelector('#lien-ket-cap-dai-ly a').getAttribute('href')`), "/cap-dai-ly");
    assert.match(await p.ev(chuO(DAI_LY_TK, "#list tr")), /^Chưa có cấp/);
    assert.ok(await p.ev(`!!(${hang(DAI_LY_TK, "#list tr")}).querySelector('.cot-cap button')`), "ô cấp vẫn bấm được");
    await shotView(p, "tai-khoan-1040-lien-ket.png");
  });
  p.close();

  p = await moTrang(NHAN_SU, "/staff", DESK);
  await b.step("5b", "Hành chính nhân sự ở Quản lý tài khoản: không có đường dẫn, không cột cấp", async () => {
    await p.waitFor(`!!${hang(DAI_LY_TK, "#list tr")}`, "danh sách đã vẽ");
    assert.equal(await p.ev(`document.querySelector('#lien-ket-cap-dai-ly').getClientRects().length`), 0);
    assert.equal(await p.ev(`document.querySelector('#cot-cap').hidden`), true);
  });
  p.close();
} finally {
  for (const pg of pages) try { pg.close(); } catch { /* đã đóng */ }
  await env.stop();
}
b.xong();
