// Kịch bản Chrome — cột «Cấp độ đại lý» ở Quản lý tài khoản (ADR-0155 Đ2; kế hoạch lượt 2 Task 4.2, bước 11, 12, 13; Ruling R10: tệp RIÊNG, không thêm bước vào luot-2-smoke.mjs).
// Đây là rào DUY NHẤT cho phần GIAO DIỆN của cột: `npm test` canh luật thuần (src/shared/cap-hien-hanh-hien-thi.test.ts), máy chủ (src/modules/pricing/cap-hien-hanh-route.test.ts) và nối dây
// (src/cot-cap-dai-ly-noi-day.test.ts), nhưng không bài nào mở trang.
//   11. Quản trị 1040: đủ năm trạng thái ở ô, đặt cấp (bảng bấm, ngày mặc định hôm nay), đổi cấp (ngày mặc định hôm nay vì cấp cũ bắt đầu từ trước), «Dùng cấp theo vai trò» (câu cố định «Có hiệu lực từ ngày mai. Nếu vai trò chưa có cấp, tài khoản sẽ thành «Chưa có cấp».» cạnh nút; ô hiện «Theo vai trò từ <ngày>» + liên kết «Sửa ở trang Hoa hồng»); chỉ ba route ghi có sẵn được gọi, không gọi route hoa hồng theo từng hồ sơ; không tràn ngang, không mã thô, axe.
//   12. Quản trị 390: thẻ điện thoại có đúng ô đó (cùng chữ), bấm mở được bảng, không tràn ngang, không mã thô, axe.
//   13. Hành chính nhân sự: không cột, không ô, KHÔNG gọi route /api/pricing/* (bộ đếm `fetch` gắn vào trang TRƯỚC khi mã trang chạy).
// Thứ tự (ADR-0075 + kho cookie dùng chung): mọi lời gọi API dựng dữ liệu làm TRƯỚC khi mở trang; trong lúc trang của tài khoản nào đang mở thì không gọi API bằng tài khoản đó
// (đăng nhập lại đá phiên của trang). Tên, số điện thoại, mã đều GIẢ. Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP — không --remote, không gọi production.
// Dựng dữ liệu (không dùng để kiểm giao diện): ba cấp «Cấp một / hai / ba Chrome»; loại có sẵn Hướng dẫn viên độc lập và Công ty lữ hành gắn cấp một, Lễ tân khách sạn không gắn;
// năm tài khoản đối tác: Riêng (cấp riêng cấp hai từ 3 ngày trước), Theo Vai (loại gắn cấp một), Chưa Cấp (loại chưa gắn cấp), Hai Vai (hai loại khác cấp), Chưa Vai (quyền Đối tác, hồ sơ chưa mang vai nào).
// Không mô phỏng được: trang mở xuyên nửa đêm (đồng hồ máy chủ không giả được ở đây) — phần đó do src/shared/cap-hien-hanh-hien-thi.test.ts canh bằng đồng hồ giả, qua route thật (bài n1, n2); kịch bản này chỉ canh sau khi lưu tiêu điểm về đúng ô.
// CHƯA CHẠY lần nào khi viết (Task 4.2 cấm chạy kịch bản Chrome): nếu một bước đỏ vì dữ liệu dựng chưa đúng (vd. API tạo tài khoản đòi thêm khoá), sửa phần «Dựng dữ liệu», không sửa mã giao diện.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-02-dat-ve-luot-2 node docs/evidence/2026-11-02-dat-ve-luot-2/kich-ban/cot-cap-smoke.mjs
// Cuối: "COT CAP SMOKE OK (<n> bước)" hoặc danh sách bước đỏ (thoát 1). Thiếu AXE_JS ⇒ dừng ngay.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

process.env.OUT ??= join(process.cwd(), "docs/evidence/2026-11-02-dat-ve-luot-2");
if (!process.env.AXE_JS) {
  console.error("Thiếu AXE_JS (đường dẫn axe.min.js) — dừng, vì kịch bản này đòi axe-core.");
  process.exit(2);
}
mkdirSync(join(process.env.OUT, "anh"), { recursive: true });
// dp-lib đọc OUT và AXE_JS khi nạp ⇒ nhập SAU khi đã đặt biến môi trường.
const { ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, dungMoiTruong, noCode, noOverflowX, shotView, sleep, vnDate } = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");

const NHAN_SU = { name: "Nhân Sự Cột Cấp", phone: "0900000551", pin: "246551", permissions: ["HR"] };
// Tài khoản có quyền Đối tác nhưng hồ sơ chưa mang vai nào được hưởng (dựng thẳng bằng SQL như các kịch bản tài khoản khác).
const CHUA_VAI = { name: "Đại Lý Chưa Vai", phone: "0900000552", pin: "246552", permissions: ["PARTNER"] };
const TEN = { rieng: "Đại Lý Riêng", theoVai: "Đại Lý Theo Vai", chuaCap: "Đại Lý Chưa Cấp", haiVai: "Đại Lý Hai Vai" };
const SDT = { rieng: "0900000553", theoVai: "0900000554", chuaCap: "0900000555", haiVai: "0900000556" };
const CAP = { mot: "Cấp một Chrome", hai: "Cấp hai Chrome", ba: "Cấp ba Chrome" };

const { env, call } = await dungMoiTruong([CHU, NHAN_SU, CHUA_VAI]);
const b = boDem("COT CAP SMOKE");
const pages = [];
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);

try {
  // ---- Dựng dữ liệu (API thật) -------------------------------------------------------------------------------------------------------------------------------
  const code = {};
  for (const [k, ten, bp] of [["mot", CAP.mot, 1000], ["hai", CAP.hai, 1200], ["ba", CAP.ba, 1400]]) {
    const r = await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten });
    dung(r, 201, `cấp ${ten}`);
    code[k] = r.json.muc.code;
    dung(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${code[k]}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp: bp, tuNgay: "2026-01-01" }), 201, `dòng ${ten}`);
  }
  // Loại có sẵn: Hướng dẫn viên độc lập và Công ty lữ hành gắn cấp một; Lễ tân khách sạn để chưa gắn cấp.
  for (const loai of ["GUIDE_FREELANCE", "TRAVEL_AGENCY"]) dung(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta/gan", { loai, muc: code.mot, tuNgay: "2026-01-01" }), 201, `gắn ${loai}`);
  // Loại tự thêm (không thuộc nhóm tài khoản) để một hồ sơ mang HAI vai trò khác cấp: gắn cấp hai.
  const loaiThem = await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten: "Vai trò thử cột cấp" });
  dung(loaiThem, 201, "loại tự thêm");
  dung(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta/gan", { loai: loaiThem.json.loai.code, muc: code.hai, tuNgay: "2026-01-01" }), 201, "gắn loại tự thêm");

  const taoTaiKhoan = async (ten, phone, vai) => {
    const r = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone, roles: [vai] });
    dung(r, 201, `tài khoản ${ten}`);
    const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${r.json.staff.id}'`);
    return partyId;
  };
  const partyRieng = await taoTaiKhoan(TEN.rieng, SDT.rieng, "TRAVEL_AGENCY");
  await taoTaiKhoan(TEN.theoVai, SDT.theoVai, "GUIDE_FREELANCE");
  await taoTaiKhoan(TEN.chuaCap, SDT.chuaCap, "HOTEL_RECEPTION");
  const partyHaiVai = await taoTaiKhoan(TEN.haiVai, SDT.haiVai, "GUIDE_FREELANCE");
  dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${partyHaiVai}/roles`, { roleTypeCode: loaiThem.json.loai.code }), 201, "vai thứ hai của Đại Lý Hai Vai");
  // Cấp riêng cấp hai bắt đầu 3 ngày trước ⇒ «Đổi» mặc định hôm nay (cấp cũ đã bắt đầu từ trước).
  dung(await call(ACCOUNTS.admin, "POST", `/api/pricing/ho-so/${partyRieng}/muc-rieng`, { muc: code.hai, tuNgay: vnDate(-3) }), 201, "cấp riêng của Đại Lý Riêng");

  // Chốt trạng thái dựng ra TRƯỚC khi mở trang: năm trạng thái phải đủ bốn nguồn có hồ sơ (người thứ năm không có hồ sơ mang vai ⇒ không có trong kết quả).
  const docCap = await call(ACCOUNTS.admin, "GET", "/api/pricing/cap-hien-hanh");
  dung(docCap, 200, "đọc cấp hiện hành");
  const nguon = Object.fromEntries(docCap.json.hoSo.map((x) => [x.partyId, x.nguon]));
  assert.equal(nguon[partyRieng], "RIENG", "Đại Lý Riêng phải là cấp riêng");
  assert.equal(nguon[partyHaiVai], "XUNG_DOT", "Đại Lý Hai Vai phải là hai vai trò khác cấp");
  assert.deepEqual([...new Set(Object.values(nguon))].sort(), ["CHUA_CO", "RIENG", "THEO_VAI", "XUNG_DOT"], "đủ bốn nguồn có hồ sơ");

  // ---- Mở trang: chèn bộ đếm fetch TRƯỚC khi mã trang chạy ----------------------------------------------------------------------------------------------------
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
  const bangDong = `!document.querySelector('.sheet-root')`;
  // Sau khi lưu và vẽ lại cả bảng, tiêu điểm bàn phím phải nằm trong ĐÚNG hàng (hoặc thẻ) của hồ sơ vừa lưu (kiểm độc lập m-4), không rơi về đầu trang.
  const tieuDiemTrongHang = (ten, goc) => `((x) => !!x && x.contains(document.activeElement) && !!document.activeElement.closest('.cot-cap'))(${hang(ten, goc)})`;
  const HANG_BANG = "#list tr";
  const HANG_THE = "#list-cards .card";

  // ---- 11. Quản trị 1040 -------------------------------------------------------------------------------------------------------------------------------------
  let p = await moTrang(ACCOUNTS.admin, "/staff", DESK);
  await b.step("11a", "Quản trị 1040: cột «Cấp độ đại lý» hiện, năm trạng thái đúng chữ, người không phải đối tác thì ô trống, «Chưa có vai trò» không bấm được", async () => {
    await p.waitFor(`!!(${chuO(TEN.rieng, HANG_BANG)})`, "bảng và cột cấp đã dựng");
    assert.equal(await p.ev(`document.querySelector('#cot-cap').hidden`), false, "tiêu đề cột hiện");
    assert.equal(await p.ev(`document.querySelector('#cot-cap').textContent.trim()`), "Cấp độ đại lý");
    assert.match(await p.ev(chuO(TEN.rieng, HANG_BANG)), /^Cấp hai Chrome \(cấp riêng\)/);
    assert.match(await p.ev(chuO(TEN.theoVai, HANG_BANG)), /^Cấp một Chrome \(theo vai trò\)/);
    assert.match(await p.ev(chuO(TEN.chuaCap, HANG_BANG)), /^Chưa có cấp/);
    assert.match(await p.ev(chuO(TEN.haiVai, HANG_BANG)), /^Hai vai trò khác cấp/);
    assert.match(await p.ev(chuO(CHUA_VAI.name, HANG_BANG)), /^Chưa có vai trò/);
    assert.equal(await p.ev(`!!(${hang(CHUA_VAI.name, HANG_BANG)}).querySelector('.cot-cap button')`), false, "«Chưa có vai trò» không có nút mở bảng");
    for (const ten of [TEN.rieng, TEN.theoVai, TEN.chuaCap, TEN.haiVai]) assert.equal(await p.ev(`!!(${hang(ten, HANG_BANG)}).querySelector('.cot-cap button')`), true, `${ten} bấm được`);
    assert.equal(await p.ev(`${hang(ACCOUNTS.admin.name, HANG_BANG)}.querySelector('.cot-cap')`), null, "dòng không giữ quyền Đối tác: ô trống");
    assert.equal(await p.ev(`${hang(CHU.name, HANG_BANG)}.querySelector('.cot-cap')`), null);
    assert.ok(await p.ev(noOverflowX), "không tràn ngang");
    assert.equal(await p.ev(noCode), "", "không mã thô");
    await axe(p, "Quản lý tài khoản 1040");
    await shotView(p, "cot-cap-1040-nam-trang-thai.png");
  });
  await b.step("11b", "Đặt cấp: «Đại Lý Chưa Cấp» → bảng bấm, ngày mặc định hôm nay, không có «Dùng cấp theo vai trò»; Lưu → «Cấp ba Chrome (cấp riêng)»", async () => {
    assert.equal(await p.ev(bamNutO(TEN.chuaCap, HANG_BANG)), true);
    await p.waitFor(`!!document.querySelector('.sheet #cap-chon')`, "bảng mở");
    assert.equal(await p.ev(`document.querySelector('#cap-tu-ngay').value`), vnDate(0), "ngày mặc định = hôm nay");
    assert.equal(await p.ev(`document.querySelector('#cap-tu-ngay').min`), vnDate(0));
    assert.equal(await p.ev(`document.querySelector('#cap-dung-theo-vai-tro')`), null, "chưa có cấp riêng thì không có «Dùng cấp theo vai trò»");
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('#cap-chon')).fontSize`), "16px", "ô chọn 16px (chống phóng to iOS)");
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('#cap-tu-ngay')).fontSize`), "16px");
    assert.equal(await p.ev(noOverflowX), true);
    // Bảng khổ máy tính hiện dần từ opacity 0 (app.css); đo tương phản giữa lúc đó cho kết quả sai.
    await p.waitFor(`getComputedStyle(document.querySelector('.sheet')).opacity === '1'`, "bảng hiện hết");
    await axe(p, "bảng đặt cấp");
    await shotView(p, "cot-cap-1040-bang-dat.png");
    // Lưu khi chưa chọn cấp: lỗi ngay trong bảng, bảng không đóng.
    assert.equal(await p.ev(bamLuu), true);
    await p.waitFor(`!!document.querySelector('.sheet .vc-field-error:not([hidden])')`, "lỗi hiện trong bảng");
    assert.equal(await p.ev(`document.querySelector('.sheet .vc-field-error:not([hidden])').textContent`), "Chọn cấp độ đại lý.");
    assert.equal(await p.ev(chonCap(CAP.ba)), true);
    assert.equal(await p.ev(bamLuu), true);
    await p.waitFor(bangDong, "bảng đã đóng");
    await p.waitFor(`/^Cấp ba Chrome \\(cấp riêng\\)/.test(${chuO(TEN.chuaCap, HANG_BANG)} ?? '')`, "ô đổi thành cấp riêng");
    await p.waitFor(tieuDiemTrongHang(TEN.chuaCap, HANG_BANG), "tiêu điểm về ô của đúng hồ sơ vừa lưu");
  });
  await b.step("11c", "Đổi cấp: «Đại Lý Riêng» (cấp riêng bắt đầu từ 3 ngày trước) → ngày mặc định hôm nay, có «Dùng cấp theo vai trò» kèm «Có hiệu lực từ ngày mai.»; đổi sang cấp một → ô đổi", async () => {
    assert.equal(await p.ev(bamNutO(TEN.rieng, HANG_BANG)), true);
    await p.waitFor(`!!document.querySelector('.sheet #cap-chon')`, "bảng mở");
    assert.equal(await p.ev(`document.querySelector('#cap-tu-ngay').value`), vnDate(0), "cấp riêng cũ bắt đầu trước hôm nay ⇒ đổi từ hôm nay");
    assert.equal(await p.ev(`!!document.querySelector('#cap-dung-theo-vai-tro')`), true, "có nút «Dùng cấp theo vai trò»");
    // R13: câu cố định cạnh nút nói cả ngày hiệu lực lẫn hậu quả khi vai trò chưa có cấp.
    assert.match(await p.ev(`document.querySelector('.sheet-body').innerText`), /Có hiệu lực từ ngày mai\. Nếu vai trò chưa có cấp, tài khoản sẽ thành «Chưa có cấp»\./);
    await shotView(p, "cot-cap-1040-bang-doi.png");
    assert.equal(await p.ev(chonCap(CAP.mot)), true);
    assert.equal(await p.ev(bamLuu), true);
    await p.waitFor(bangDong, "bảng đã đóng");
    await p.waitFor(`/^Cấp một Chrome \\(cấp riêng\\)/.test(${chuO(TEN.rieng, HANG_BANG)} ?? '')`, "ô đổi sang cấp một");
    await p.waitFor(tieuDiemTrongHang(TEN.rieng, HANG_BANG), "tiêu điểm về ô của đúng hồ sơ vừa lưu");
  });
  await b.step("11d", "«Dùng cấp theo vai trò»: «Đại Lý Riêng» → vẫn «(cấp riêng)» hôm nay, ô nói «Theo vai trò từ <ngày mai>» và có liên kết «Sửa ở trang Hoa hồng», không còn nút đổi", async () => {
    assert.equal(await p.ev(bamNutO(TEN.rieng, HANG_BANG)), true);
    await p.waitFor(`!!document.querySelector('#cap-dung-theo-vai-tro')`, "bảng mở, có nút");
    assert.equal(await p.ev(`document.querySelector('#cap-dung-theo-vai-tro').click(), true`), true);
    await p.waitFor(bangDong, "bảng đã đóng");
    await p.waitFor(`/Theo vai trò từ \\d{2}\\/\\d{2}\\/\\d{4}/.test(${chuO(TEN.rieng, HANG_BANG)} ?? '')`, "ô có «Theo vai trò từ <ngày>»");
    const o = await p.ev(chuO(TEN.rieng, HANG_BANG));
    assert.match(o, /^Cấp một Chrome \(cấp riêng\)/);
    assert.match(o, /Sửa ở trang Hoa hồng/);
    assert.equal(await p.ev(`!!(${hang(TEN.rieng, HANG_BANG)}).querySelector('.cot-cap button')`), false, "đã hẹn ngày ngừng ⇒ không đổi ở đây");
    assert.equal(await p.ev(`(${hang(TEN.rieng, HANG_BANG)}).querySelector('.cot-cap a[href="/hoa-hong"]') !== null`), true);
    await p.waitFor(tieuDiemTrongHang(TEN.rieng, HANG_BANG), "ô không còn nút nhưng tiêu điểm vẫn về chính ô của hồ sơ vừa lưu");
    await shotView(p, "cot-cap-1040-dung-theo-vai-tro.png");
  });
  await b.step("11e", "Mạng: chỉ ba route ghi có sẵn (đặt, đổi, ngừng cấp riêng) mỗi route đúng một lần; mỗi lần lưu đọc lại cấp hiện hành; không gọi route hoa hồng theo từng hồ sơ", async () => {
    const goi = apiCalls(p);
    const ghi = goi.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path.replace(/\/[0-9a-f-]{8,}\//g, "/<id>/")}`).filter((c) => c.includes("/api/pricing/"));
    assert.deepEqual(ghi.sort(), [
      "POST /api/pricing/ho-so/<id>/muc-rieng",
      "POST /api/pricing/muc-rieng/<id>/doi",
      "POST /api/pricing/muc-rieng/<id>/ket-thuc",
    ].sort(), "chỉ đúng ba route ghi, mỗi route một lần");
    const docCapGoi = goi.filter((c) => c.method === "GET" && c.path === "/api/pricing/cap-hien-hanh").length;
    assert.equal(docCapGoi, 4, "một lần lúc nạp + một lần sau mỗi lần lưu (ba lần lưu)");
    assert.equal(goi.filter((c) => /\/api\/pricing\/ho-so\/[^/]+\/hoa-hong/.test(c.path)).length, 0, "không gọi route hoa hồng từng hồ sơ");
  });
  p.close();

  // ---- 12. Quản trị 390: thẻ điện thoại ------------------------------------------------------------------------------------------------------------------------
  p = await moTrang(ACCOUNTS.admin, "/staff", MOB);
  await b.step("12", "Quản trị 390: thẻ điện thoại có đúng ô «Cấp độ đại lý» (cùng chữ), bấm mở được bảng, không tràn ngang, không mã thô, axe", async () => {
    await p.waitFor(`!!(${chuO(TEN.haiVai, HANG_THE)})`, "thẻ và ô cấp đã dựng");
    assert.match(await p.ev(chuO(TEN.rieng, HANG_THE)), /^Cấp một Chrome \(cấp riêng\)/);
    assert.match(await p.ev(chuO(TEN.chuaCap, HANG_THE)), /^Cấp ba Chrome \(cấp riêng\)/);
    assert.match(await p.ev(chuO(TEN.theoVai, HANG_THE)), /^Cấp một Chrome \(theo vai trò\)/);
    assert.match(await p.ev(chuO(TEN.haiVai, HANG_THE)), /^Hai vai trò khác cấp/);
    assert.match(await p.ev(chuO(CHUA_VAI.name, HANG_THE)), /^Chưa có vai trò/);
    assert.match(await p.ev(`${hang(TEN.theoVai, HANG_THE)}.innerText`), /Cấp độ đại lý:/, "thẻ có nhãn cột");
    assert.equal(await p.ev(`${hang(ACCOUNTS.admin.name, HANG_THE)}.innerText.includes('Cấp độ đại lý')`), false, "thẻ của người không phải đối tác không có dòng này");
    assert.ok(await p.ev(noOverflowX), "không tràn ngang");
    assert.equal(await p.ev(noCode), "", "không mã thô");
    await axe(p, "Quản lý tài khoản 390 (thẻ)");
    await shotView(p, "cot-cap-390-the.png");
    assert.equal(await p.ev(bamNutO(TEN.theoVai, HANG_THE)), true);
    await p.waitFor(`!!document.querySelector('.sheet #cap-chon')`, "bảng mở ở 390");
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('#cap-chon')).fontSize`), "16px");
    assert.ok(await p.ev(noOverflowX), "bảng không làm tràn ngang");
    await axe(p, "bảng đặt cấp 390");
    await shotView(p, "cot-cap-390-bang.png");
    assert.equal(await p.ev(`document.querySelector('.sheet-close').click(), true`), true);
    await p.waitFor(bangDong, "đóng bảng bằng nút ✕, không gửi gì");
  });
  p.close();

  // ---- 13. Hành chính nhân sự: không cột, không gọi route ---------------------------------------------------------------------------------------------------------
  p = await moTrang(NHAN_SU, "/staff", DESK);
  await b.step("13", "Hành chính nhân sự: không có cột, không có ô, không gọi route /api/pricing/*; vẫn thấy danh sách tài khoản", async () => {
    await p.waitFor(`!!${hang(TEN.rieng, HANG_BANG)}`, "danh sách đã vẽ");
    await sleep(500); // chờ mọi lần nạp phụ
    assert.equal(await p.ev(`document.querySelector('#cot-cap').hidden`), true, "tiêu đề cột ẩn");
    assert.equal(await p.ev(`document.querySelectorAll('.cot-cap').length`), 0, "không ô nào");
    assert.equal(await p.ev(`document.body.innerText.includes('Cấp độ đại lý')`), false, "không chữ «Cấp độ đại lý» nào nhìn thấy");
    const fetchTrongTrang = await p.ev(`window.__fetchApi`);
    assert.deepEqual(fetchTrongTrang.filter((u) => u.includes("/api/pricing/")), [], `fetch trong trang gọi route giá: ${JSON.stringify(fetchTrongTrang)}`);
    assert.equal(apiCalls(p).filter((c) => c.path.startsWith("/api/pricing/")).length, 0, "mạng không có lời gọi /api/pricing/*");
    assert.ok(fetchTrongTrang.some((u) => u.includes("/api/staff")), "chống bài rỗng: bộ đếm fetch có ghi các lời gọi khác");
    assert.ok(await p.ev(noOverflowX));
    await shotView(p, "cot-cap-nhan-su.png");
  });
  p.close();
} finally {
  for (const pg of pages) try { pg.close(); } catch { /* đã đóng */ }
  await env.stop();
}
b.xong();
