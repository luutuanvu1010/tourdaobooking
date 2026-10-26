// GHI CHÚ 27/10/2026 (ADR-0135/0136): phần E (ba ô trả trước) hết hiệu lực từ 27/10 (ADR-0135 Đ7). Bước B/C đã đỏ có sẵn (axe `moderate region: #strips`). Chưa sửa, ghi nợ.
// Kịch bản Chrome — QR thanh toán (ADR-0108; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md §4.1, §4.2, §7, §8.1, §8.7, §8.10): màn đơn, bảng QR, mục
// "Tài khoản nhận tiền" ở Danh bạ, lối tắt "Khách đã chuyển khoản", form lập đơn của Toàn quyền. Các ô mã giao dịch của Kế toán nằm ở qr-ma-smoke.mjs.
//   A. Bán hàng mở QR khi CHƯA cài tài khoản (390 và 1040): đúng câu "…báo người phụ trách hệ thống.", không mã, hai nút tắt.
//   B. Danh bạ — Quản trị không thấy mục (máy chủ 403); Toàn quyền: hồ sơ không phải công ty chủ không có mục; công ty chủ chưa cài: ô "Chọn ngân hàng" trống, chưa chọn / bỏ trống
//      ⇒ câu hiện TRONG mục, chưa gửi PUT, #error đầu trang ẩn; ba ô 16px, nằm trọn trong khung 390; cài lần đầu bằng VCB (không hỏi lại; "Đã lưu…"; tiêu điểm về tiêu đề; nhật ký
//      chỉ chữ cố định, không chép số).
//   C0. Số còn lại GIẢM sau khi trang tải (sửa sau kiểm cuối, A1): mở QR lần đầu KHÔNG báo "lớn hơn số còn lại", ô và dòng "Số tiền" hiện số còn lại MỚI do máy chủ trả.
//   C. Bảng QR (390 và 1040): sáu dòng đúng, ô số tiền 16px, ảnh mã ≤ 18rem, không tràn ngang, KHÔNG yêu cầu mạng ra ngoài (kể cả sau "Lưu ảnh"), axe sạch; "Lưu ảnh" ⇒ tải tệp
//      PNG đúng tên bằng liên kết blob (đọc lại: PNG thật, rộng 720); ô trống hoặc 0 rồi "Tạo lại mã" ⇒ ô hiện đúng số máy chủ đã dùng (A1); gõ số khác ⇒ hai nút tắt + dòng nhắc, "Tạo lại mã" ⇒ bật lại; số quá lớn ⇒ câu 400; dựng ảnh hỏng ⇒ mã hiện
//      nhưng hai nút tắt; "Khách đã chuyển khoản" ⇒ bảng đóng, form "Ghi lần thu" mở sẵn số trên QR, ô tiêu điểm, Bán hàng không có ô mã.
//   D. Danh bạ khi đã cài (390): lỗi 400 của máy chủ hiện TRONG mục, giữ số đã gõ; (1040) đổi tài khoản: hỏi lại đúng chữ, Huỷ = không gửi, bấm đúp = một PUT, "đã cũ" khi người khác
//      đổi giữa chừng, ô nhập xoá trắng.
//   E. Form lập đơn (390 và 1040): Toàn quyền không có ô trả trước (có lối chỉ sang trang đơn), Bán hàng vẫn có; số trả trước gõ SỚM (trước khi biết tài khoản) bị xoá; số gõ trong
//      lúc danh mục còn đang tải không lọt vào tóm tắt (cờ bật ngay sau initShell).
// Quy tắc ADR-0074/0075 (xem qr-chung.mjs): dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi trang đóng trước khi mở trang kế của cùng tài khoản.
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo (`npm pack axe-core`):
//   AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-08-qr-thanh-toan/kich-ban/qr-smoke.mjs
// Ảnh ghi vào docs/evidence/2026-10-08-qr-thanh-toan/ với tiền tố smoke- (đặt OUT=<thư mục> để ghi chỗ khác).
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, DESK, KHO, MOB, OUT, axeSach, chonGiaTri, chup, chupKhung, docAxe, goiApi, khongRaNgoai, ok, setInput, sleep, startEnv } from "./qr-chung.mjs";

const AXE = docAxe();
const TEN_CT = "Công ty TNHH Tour Đảo";
const TEN_TC = "Pháp nhân Chrome";
const SO_1 = "0011001234567";
const SO_2 = "0987654321";
const SEC = "document.getElementById('tai-khoan-nhan-tien')";
const THONG_BAO_CHUA_CAI = "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.";

const env = await startEnv();
try {
  const { call, lapDon } = goiApi(env);

  // ---- Dựng dữ liệu (API, chưa có trang nào mở): một đơn 1.350.000, Bán hàng đã ghi 500.000 tiền mặt ⇒ còn lại 850.000
  const don1 = await lapDon("Khách Mã QR", "0903 111 222");
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${don1.id}/payments`, { soTien: 500000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  const noiDung = don1.orderCode.replace(/[^A-Z0-9]/g, "");
  // Hai đơn riêng cho khối C0 (mỗi khổ một đơn, chưa thu đồng nào ⇒ còn lại 1.350.000): C0 ghi thêm tiền vào đơn của nó, nên không dùng don1 (C và C2 cần don1 còn 850.000).
  const donC0 = new Map([["390", await lapDon("Khách Còn Lại 390", "0903 111 390")], ["1040", await lapDon("Khách Còn Lại 1040", "0903 111 104")]]);

  // ---------------------------------------------------------------- A. chưa cài tài khoản
  for (const [kho, vp] of KHO) {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${don1.id}`, vp);
    await p.waitFor(`!!document.querySelector('[data-action="qr-thanh-toan"]')`, "nút QR thanh toán");
    await p.ev(`document.querySelector('[data-action="qr-thanh-toan"]').click(), true`);
    await p.waitFor(`document.querySelector('.sheet[role="dialog"]') !== null && !document.querySelector('.sheet .alert.danger').hidden`, "bảng QR mở và câu lỗi hiện");
    assert.equal(await p.ev(`document.querySelector('.sheet .alert.danger').textContent.trim()`), THONG_BAO_CHUA_CAI);
    assert.equal(await p.ev(`document.querySelector('.sheet canvas.qr-anh').hidden`), true, "lỗi ⇒ không có mã");
    assert.equal(await p.ev(`document.querySelectorAll('[data-khoi="qr-thong-tin"] p').length`), 0, "không có dòng thông tin nào");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.sheet-foot button')].map((b) => b.disabled)`), [true, true], "hai nút tắt");
    await chup(p, `qr-chua-cai-${kho}`);
    assert.deepEqual(p.consoleErrors.filter((m) => !/409|Failed to load resource/.test(m)), [], `lỗi console: ${p.consoleErrors}`);
    p.close();
    ok(`A) ${kho}: chưa cài tài khoản ⇒ «${THONG_BAO_CHUA_CAI}», không mã, hai nút tắt`);
  }

  // ---------------------------------------------------------------- B. Danh bạ: mục "Tài khoản nhận tiền" (web/parties.ts)
  const hienTai = `(${SEC}.querySelector('[data-khoi="tknt-hien-tai"]')?.textContent ?? '')`;
  const nutLuu = (chu) => `[...${SEC}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(chu)})`;
  /** Dòng báo trong mục (một `.alert` duy nhất khi form đã dựng). */
  const tinMuc = (p) => p.ev(`(() => { const e = ${SEC}.querySelector('.alert'); return e ? { chu: e.textContent.trim(), lop: e.className, role: e.getAttribute('role') } : null; })()`);
  const loiTrangAn = (p) => p.ev("document.querySelector('#error').hidden");
  /** Đếm số lần trình duyệt gọi PUT tới mục (chứng minh "bị chặn ở trình duyệt" là chưa gửi gì). */
  const demPut = (p) => p.ev(`window.__puts = 0; { const f = window.fetch; window.fetch = (u, o) => { if (String(u).includes('/tai-khoan-nhan-tien') && o?.method === 'PUT') window.__puts++; return f(u, o); }; } true`);
  const nutVaTinCungKhung = async (p, chu) => {
    await p.ev(`${nutLuu(chu)}.scrollIntoView({ block: 'end' }), true`);
    await sleep(900); // chờ cuộn êm xong rồi mới đo
    const o = JSON.parse(await p.ev(`(() => { const b = ${nutLuu(chu)}; const t = ${SEC}.querySelector('.alert').getBoundingClientRect(); const n = b.getBoundingClientRect(); return JSON.stringify({ tTop: Math.round(t.top), tBottom: Math.round(t.bottom), nBottom: Math.round(n.bottom), ih: innerHeight }); })()`));
    return o.tTop >= 0 && o.tBottom <= o.ih && o.nBottom <= o.ih;
  };
  async function moHoSo(p, ten, dienThoai) {
    await p.ev(setInput("document.querySelector('#q')", ten));
    await p.ev("document.querySelector('#search-form').requestSubmit(), true");
    const dong = dienThoai ? ".card-list .card" : "#list tr";
    await p.waitFor(`[...document.querySelectorAll(${JSON.stringify(dong)})].some((tr) => tr.textContent.includes(${JSON.stringify(ten)}))`, `danh sách có "${ten}"`);
    await p.ev(`[...document.querySelectorAll(${JSON.stringify(dong)})].find((tr) => tr.textContent.includes(${JSON.stringify(ten)})).click(), true`);
    await p.waitFor(`!document.querySelector('#detail').hidden && (document.querySelector('#detail h2')?.textContent ?? '').includes(${JSON.stringify(ten)})`, `hồ sơ "${ten}" mở`);
  }
  const ba = (p) => p.ev(`['select', '#tknt-so', '#tknt-ten'].map((s) => getComputedStyle(${SEC}.querySelector(s)).fontSize)`);
  const trongKhung = (p) => p.ev(`[${SEC}, ...${SEC}.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName)`);

  // B1. Quản trị: công ty chủ KHÔNG có mục; tạo hồ sơ tổ chức khác để thử "không phải công ty chủ"
  let p = await env.as(ACCOUNTS.admin, "/parties", DESK);
  await p.waitFor("!!document.querySelector('#search-form')", "trang Danh bạ dựng xong");
  const tc = await p.ev(`fetch('/api/parties', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ORGANIZATION', displayName: ${JSON.stringify(TEN_TC)}, legalName: 'CÔNG TY PHÁP NHÂN CHROME', taxCode: '0312345678', address: '3 Đường Chrome' }) }).then((r) => r.json()).then((b) => b.party.id)`);
  await moHoSo(p, TEN_CT);
  await p.waitFor("!!document.querySelector('#detail table.items')", "chi tiết dựng xong");
  assert.equal(await p.ev(`!!${SEC}`), false, "Quản trị: công ty chủ KHÔNG có mục Tài khoản nhận tiền");
  assert.equal(await p.ev("document.querySelector('#detail').textContent.includes('Tài khoản nhận tiền')"), false);
  assert.equal(await p.ev(`fetch('/api/parties/' + ${JSON.stringify(tc)} + '/tai-khoan-nhan-tien').then((r) => r.status)`), 403, "máy chủ vẫn từ chối Quản trị");
  p.close();
  ok("B1) Quản trị: công ty chủ không có mục; máy chủ 403");

  // B2. Toàn quyền 1040, CHƯA cài
  p = await env.as(ACCOUNTS.chu, "/parties", DESK);
  await p.waitFor("!!document.querySelector('#search-form')", "trang Danh bạ dựng xong");
  await moHoSo(p, TEN_TC);
  await p.waitFor("!!document.querySelector('#detail table.items')", "chi tiết dựng xong");
  assert.equal(await p.ev(`!!${SEC}`), false, "hồ sơ tổ chức KHÔNG phải công ty chủ: không có mục");
  await moHoSo(p, TEN_CT);
  await p.waitFor(`${hienTai}.length > 0`, "mục dựng xong");
  assert.match(await p.ev(hienTai), /Chưa cài tài khoản — mã QR thanh toán chưa dùng được\./);
  assert.equal(await p.ev(`${SEC}.querySelector('h3').textContent`), "Tài khoản nhận tiền");
  assert.equal(await p.ev(`${SEC}.querySelector('h3').getAttribute('tabindex')`), "-1", "tiêu đề nhận tiêu điểm được bằng mã");
  assert.equal(await p.ev("document.activeElement?.id === 'tknt-title'"), false, "lần vẽ đầu KHÔNG cướp tiêu điểm");
  assert.equal(await p.ev(`${SEC}.getAttribute('aria-labelledby') === ${SEC}.querySelector('h3').id`), true, "mục gắn nhãn bằng tiêu đề");
  assert.equal(await p.ev(`${SEC}.querySelectorAll('select option').length`), 31, "30 ngân hàng + ô trống 'Chọn ngân hàng'");
  assert.equal(await p.ev(`${SEC}.querySelector('select option').textContent`), "Chọn ngân hàng");
  assert.equal(await p.ev(`${SEC}.querySelector('select').value`), "", "chưa chọn ngân hàng nào (không mặc định Vietcombank)");
  assert.deepEqual(await ba(p), ["16px", "16px", "16px"], "ô gõ 16px");
  assert.equal(await p.ev(`!!${nutLuu("Lưu tài khoản")} && !${nutLuu("Đổi tài khoản")}`), true, "nút 'Lưu tài khoản' khi chưa có");
  assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, "không tràn ngang 1040");
  await chupKhung(p, "#tai-khoan-nhan-tien", "tai-khoan-chua-cai-1040");
  await demPut(p);
  await p.ev(`${nutLuu("Lưu tài khoản")}.click(), true`);
  let t = await tinMuc(p);
  assert.deepEqual([t?.chu, t?.role, /alert danger/.test(t?.lop ?? "")], ["Chọn ngân hàng nhận tiền.", "alert", true], `chưa chọn ngân hàng: ${JSON.stringify(t)}`);
  assert.equal(await loiTrangAn(p), true, "câu báo ở trong mục, #error đầu trang không hiện");
  await p.ev(chonGiaTri(`${SEC}.querySelector('select')`, "VCB"));
  await p.ev(`${nutLuu("Lưu tài khoản")}.click(), true`);
  t = await tinMuc(p);
  assert.deepEqual([t?.chu, t?.role], ["Nhập số tài khoản và tên chủ tài khoản.", "alert"], `bỏ trống: ${JSON.stringify(t)}`);
  assert.equal(await loiTrangAn(p), true);
  assert.equal(await p.ev("window.__puts"), 0, "chặn ở trình duyệt: chưa gửi PUT nào");
  assert.equal(env.sql("SELECT COUNT(*) AS n FROM pty_bank_account")[0].n, 0, "chưa ghi gì");
  await axeSach(p, AXE, "Danh bạ — Toàn quyền, chưa cài (1040), đang hiện câu báo");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  p.close();
  ok("B2) Toàn quyền 1040 chưa cài: ô «Chọn ngân hàng» trống; chưa chọn ngân hàng / bỏ trống ô ⇒ câu hiện TRONG mục, chưa gửi PUT; hồ sơ không-phải-chủ không có mục; axe sạch");

  // B3. 390, chưa cài
  p = await env.as(ACCOUNTS.chu, "/parties", MOB);
  await p.waitFor("!!document.querySelector('#search-form')", "trang Danh bạ (điện thoại)");
  await moHoSo(p, TEN_CT, true);
  await p.waitFor(`${hienTai}.length > 0`, "mục dựng xong (điện thoại)");
  assert.match(await p.ev(hienTai), /Chưa cài tài khoản/);
  // Cả trang Danh bạ ở 390 đã tràn ngang SẴN do bảng "Công việc tại đâu" (table.items, ngoài mục này) — chỉ khẳng định phần của MỤC MỚI.
  assert.deepEqual(await trongKhung(p), [], "mục Tài khoản nhận tiền nằm trọn trong khung 390");
  assert.deepEqual(await ba(p), ["16px", "16px", "16px"]);
  assert.deepEqual(await p.ev(`['select', '#tknt-so', '#tknt-ten'].map((s) => { const b = ${SEC}.querySelector(s).getBoundingClientRect(); return b.right <= innerWidth && b.left >= 0; })`), [true, true, true], "ba ô nằm trọn trong khung 390");
  await chupKhung(p, "#tai-khoan-nhan-tien", "tai-khoan-chua-cai-390");
  await p.ev(`${nutLuu("Lưu tài khoản")}.click(), true`);
  assert.equal((await tinMuc(p))?.chu, "Chọn ngân hàng nhận tiền.");
  assert.equal(await nutVaTinCungKhung(p, "Lưu tài khoản"), true, "ở 390, câu báo và nút Lưu cùng nằm trong màn hình");
  assert.equal(await loiTrangAn(p), true);
  await axeSach(p, AXE, "Danh bạ — mục Tài khoản nhận tiền (390)", SEC);
  assert.deepEqual(p.consoleErrors, [], `lỗi console (390): ${p.consoleErrors}`);
  p.close();
  ok("B3) 390 chưa cài: ba ô trong khung, 16px, câu báo và nút Lưu cùng trong màn hình, axe sạch (phạm vi mục)");

  // B4. 1040: cài lần đầu bằng VCB (chọn ngân hàng rõ ràng — lần đầu không có ngân hàng mặc định)
  p = await env.as(ACCOUNTS.chu, "/parties", DESK);
  await p.waitFor("!!document.querySelector('#search-form')", "trang Danh bạ dựng xong");
  await moHoSo(p, TEN_CT);
  await p.waitFor(`${hienTai}.length > 0`, "mục dựng xong");
  await p.ev(`window.__hoi = []; window.__tra = true; window.confirm = (m) => { window.__hoi.push(m); return window.__tra; }; true`);
  await p.ev(chonGiaTri(`${SEC}.querySelector('select')`, "VCB"));
  await p.ev(setInput(`${SEC}.querySelector('#tknt-so')`, SO_1));
  await p.ev(setInput(`${SEC}.querySelector('#tknt-ten')`, "Công ty TNHH Tour Đảo"));
  await p.ev(`${nutLuu("Lưu tài khoản")}.click(), true`);
  await p.waitFor(`${hienTai}.includes('CONG TY TNHH TOUR DAO')`, "đã lưu và nạp lại");
  const dong1 = await p.ev(hienTai);
  assert.equal(dong1, `Vietcombank · ${SO_1} · CONG TY TNHH TOUR DAO`);
  assert.equal(await p.ev("window.__hoi.length"), 0, "lần cài đầu KHÔNG hỏi lại");
  assert.equal(await p.ev(`!!${nutLuu("Đổi tài khoản")} && !${nutLuu("Lưu tài khoản")}`), true, "nút đổi thành 'Đổi tài khoản'");
  assert.equal(await p.ev(`${SEC}.querySelector('#tknt-so').value + ${SEC}.querySelector('#tknt-ten').value`), "", "ô nhập về trống sau khi lưu");
  assert.equal(await p.ev(`${SEC}.querySelector('select').value`), "VCB", "ô ngân hàng chọn sẵn ngân hàng đang dùng");
  assert.equal(await p.ev(`${SEC}.querySelectorAll('select option').length`), 30, "đã có tài khoản ⇒ không còn ô trống");
  t = await tinMuc(p);
  assert.deepEqual([t?.chu, t?.role, /alert ok/.test(t?.lop ?? "")], ["Đã lưu tài khoản nhận tiền.", "status", true], `dòng đã lưu: ${JSON.stringify(t)}`);
  assert.equal(await p.ev("document.activeElement?.id"), "tknt-title", "tiêu điểm về tiêu đề mục sau khi lưu");
  assert.equal(await loiTrangAn(p), true, "không báo gì ở #error");
  assert.deepEqual(env.sql("SELECT bank_code, account_number, account_name, valid_to FROM pty_bank_account").map((r) => [r.bank_code, r.account_number, r.account_name, r.valid_to]), [["VCB", SO_1, "CONG TY TNHH TOUR DAO", null]]);
  const nk = env.sql("SELECT detail FROM audit_log WHERE action = 'party_bank_account_changed'");
  assert.deepEqual(nk.map((r) => r.detail), ["cài tài khoản nhận tiền"], "nhật ký chỉ chữ cố định");
  assert.equal(JSON.stringify(nk).includes(SO_1.slice(0, 6)), false, "nhật ký không chép số tài khoản");
  assert.equal(await p.ev(`location.href.includes(${JSON.stringify(SO_1)}) || location.search.length > 0`), false, "số tài khoản không nằm trên đường dẫn");
  await chupKhung(p, "#tai-khoan-nhan-tien", "tai-khoan-da-cai-1040");
  await axeSach(p, AXE, "Danh bạ — mục Tài khoản nhận tiền đã cài (1040)", SEC);
  p.close();
  ok("B4) 1040: cài lần đầu (chọn VCB rõ ràng; không hỏi lại; «Đã lưu…» trong mục; tiêu điểm về tiêu đề; nhật ký chữ cố định, không chép số; số không lên đường dẫn; axe sạch)");

  // ---------------------------------------------------------------- C0. Số còn lại giảm SAU khi trang tải (A1)
  // Trang nhớ "còn lại" của lúc tải (1.350.000); một lần thu 150.000 ghi bằng chính trang đang mở (ADR-0074: không đăng nhập lại tài khoản này) mà trang KHÔNG tải lại,
  // nên số còn lại thật đã là 1.200.000. Mở QR lần đầu: ô phải lấy số của MÁY CHỦ, không gửi số cũ ⇒ không câu 400 "lớn hơn số còn lại".
  for (const [kho, vp] of KHO) {
    const don = donC0.get(kho);
    p = await env.as(ACCOUNTS.salesA, `/order?id=${don.id}`, vp);
    await p.waitFor(`!!document.querySelector('[data-action="qr-thanh-toan"]')`, "nút QR thanh toán");
    assert.equal(await p.ev(`fetch('/api/orders/${don.id}/payments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ soTien: 150000, hinhThuc: 'CASH', nguoiThu: 'toi' }) }).then((r) => r.status)`), 201, "ghi lần thu 150.000 từ chính trang");
    assert.match(await p.ev(`document.querySelector('[data-khoi="thanh-toan"]').textContent`), /Còn lại1\.350\.000/, "trang CHƯA tải lại: dòng «Còn lại» của thẻ Thanh toán vẫn là số cũ");
    await p.ev(`document.querySelector('[data-action="qr-thanh-toan"]').click(), true`);
    // Chờ mã HOẶC câu lỗi, để khi vỡ thì báo đúng câu lỗi của máy chủ thay vì hết giờ chờ.
    await p.waitFor(`(!document.querySelector('.qr-anh').hidden && !document.querySelector('[data-action="qr-luu-anh"]').disabled) || !document.querySelector('.sheet .alert.danger').hidden`, "mã hiện hoặc câu lỗi hiện", 15000);
    assert.equal(await p.ev(`document.querySelector('.sheet .alert.danger').hidden ? '' : document.querySelector('.sheet .alert.danger').textContent.trim()`), "", "mở QR lần đầu KHÔNG báo lỗi (không gửi số còn lại cũ của lúc tải trang)");
    assert.equal(await p.ev(`document.getElementById('qr-so-tien').value`), "1.200.000", "ô hiện số còn lại MỚI do máy chủ trả");
    assert.equal(await p.ev(`document.querySelectorAll('[data-khoi="qr-thong-tin"] p')[3]?.textContent`), "Số tiền: 1.200.000đ");
    p.close();
    ok(`C0) ${kho}: còn lại giảm sau khi tải trang ⇒ mở QR không lỗi, ô và dòng «Số tiền» hiện 1.200.000 (số máy chủ trả)`);
  }

  // ---------------------------------------------------------------- C. Bảng QR trên màn đơn, hai khổ
  for (const [kho, vp] of KHO) {
    p = await env.as(ACCOUNTS.salesA, `/order?id=${don1.id}`, vp);
    await p.waitFor(`!!document.querySelector('[data-action="qr-thanh-toan"]')`, "nút QR thanh toán");
    // Chặn tải xuống thật: ghi lại cái liên kết bị bấm và ĐỌC blob được tạo (CSP `connect-src` không cho `fetch` đọc lại liên kết blob:, nên bắt chính đối tượng Blob lúc tạo liên kết)
    await p.ev(`(() => { window.__tai = []; window.__blobs = [];
      const tao = URL.createObjectURL; URL.createObjectURL = function (b) { window.__blobs.push(b); return tao.call(URL, b); };
      const goc = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download) { const m = { download: this.download, href: this.href.slice(0, 5) }; window.__tai.push(m); const bl = window.__blobs[window.__blobs.length - 1]; m.kieu = bl.type;
          bl.arrayBuffer().then((b) => { const u = new Uint8Array(b); m.dau = [...u.slice(0, 8)].join(','); m.rong = new DataView(b).getUint32(16); m.byte = u.length; let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.slice(i, i + 0x8000)); m.b64 = btoa(s); }); return; }
        return goc.call(this); }; return true; })()`);
    await p.ev(`document.querySelector('[data-action="qr-thanh-toan"]').click(), true`);
    await p.waitFor(`!document.querySelector('.qr-anh').hidden && !document.querySelector('[data-action="qr-luu-anh"]').disabled`, "mã hiện + nút Lưu ảnh bật", 15000);
    const d = await p.ev(`(() => {
      const c = document.querySelector('.qr-anh'); const r = c.getBoundingClientRect(); const i = document.getElementById('qr-so-tien');
      return { cssW: Math.round(r.width), dong: [...document.querySelectorAll('[data-khoi="qr-thong-tin"] p')].map((x) => x.textContent), amount: i.value, font: getComputedStyle(i).fontSize,
        foot: [...document.querySelectorAll('.sheet-foot button')].map((b) => b.textContent), lechNgang: document.documentElement.scrollWidth > innerWidth };
    })()`);
    assert.equal(d.dong.length, 6, JSON.stringify(d.dong));
    assert.match(d.dong[0], /\S/, "dòng tên công ty có chữ");
    assert.deepEqual(d.dong.slice(1), [`Vietcombank · ${SO_1}`, "Chủ tài khoản: CONG TY TNHH TOUR DAO", "Số tiền: 850.000đ", `Nội dung: ${noiDung}`, `Mã đơn: ${don1.orderCode}`]);
    assert.equal(d.amount, "850.000", "ô số tiền hiện số còn lại do máy chủ trả (điền SAU khi mở, không lấy từ dữ liệu lúc tải trang)");
    assert.equal(d.font, "16px", "ô số tiền 16px");
    assert.deepEqual(d.foot, ["Lưu ảnh", "Khách đã chuyển khoản"]);
    assert.equal(d.lechNgang, false, "không tràn ngang");
    assert.ok(d.cssW <= 289, `ảnh mã ≤ 18rem (đo ${d.cssW})`);
    assert.doesNotMatch(d.dong.join("\n"), /hoa hồng|giá vốn|nợ|NV Bán|Sales/i, "không lộ hoa hồng / giá vốn / người thu");
    khongRaNgoai(p, env, `${kho}: mở bảng QR`);
    await chup(p, `qr-bang-${kho}`);
    await axeSach(p, AXE, `bảng QR đang mở (${kho})`);

    // Lưu ảnh (máy thử không có bảng chia sẻ) ⇒ tải về bằng liên kết blob; nội dung là PNG thật rộng 720
    await p.ev(`document.querySelector('[data-action="qr-luu-anh"]').click(), true`);
    await p.waitFor(`window.__tai.length === 1 && !!window.__tai[0].b64`, "đã tải ảnh và đọc lại được");
    const tai = await p.ev("window.__tai[0]");
    assert.equal(tai.download, `QR-${noiDung}.png`);
    assert.equal(tai.href, "blob:");
    assert.equal(tai.kieu, "image/png");
    assert.equal(tai.dau, "137,80,78,71,13,10,26,10", "tệp tải về là PNG");
    assert.equal(tai.rong, 720, "ảnh rộng 720");
    assert.ok(tai.byte > 3000, `ảnh có nội dung (${tai.byte} byte)`);
    if (kho === "390") writeFileSync(join(OUT, "smoke-anh-luu.png"), Buffer.from(tai.b64, "base64"));
    khongRaNgoai(p, env, `${kho}: sau Lưu ảnh (dựng ảnh nạp phông)`);

    // A1: ô TRỐNG hoặc 0 rồi "Tạo lại mã" ⇒ máy chủ dùng số còn lại ⇒ ô phải hiện lại đúng số máy chủ đã dùng (không để trống / 0). Không phụ thuộc thời gian: mỗi lần đợi mã mới về.
    for (const gocGo of ["", "0"]) {
      await p.ev(setInput(`document.getElementById('qr-so-tien')`, gocGo));
      assert.equal(await p.ev(`document.getElementById('qr-so-tien').value`), gocGo, `ô giữ «${gocGo}» khi chưa tạo lại`);
      await p.ev(`document.querySelector('[data-action="qr-tao-lai"]').click(), true`);
      await p.waitFor(`document.querySelectorAll('[data-khoi="qr-thong-tin"] p')[3]?.textContent === 'Số tiền: 850.000đ' && !document.querySelector('[data-action="qr-luu-anh"]').disabled`, `ô «${gocGo}» ⇒ mã 850.000đ`, 15000);
      assert.equal(await p.ev(`document.getElementById('qr-so-tien').value`), "850.000", `ô «${gocGo}» rồi Tạo lại mã ⇒ ô hiện đúng số máy chủ đã dùng`);
    }
    // Gõ số khác mà CHƯA tạo lại ⇒ hai nút tắt + dòng nhắc; tạo lại ⇒ bật lại
    const nutTat = `[...document.querySelectorAll('.sheet-foot button')].map((b) => b.disabled)`;
    assert.deepEqual(await p.ev(nutTat), [false, false], "trước khi gõ: hai nút bật");
    await p.ev(setInput(`document.getElementById('qr-so-tien')`, "100000"));
    assert.deepEqual(await p.ev(nutTat), [true, true], "gõ số khác ⇒ Lưu ảnh và Khách đã chuyển khoản tắt");
    assert.match(await p.ev(`document.querySelector('[data-khoi="qr-trang-thai"]').textContent`), /Tạo lại mã/);
    await chup(p, `qr-bang-doi-so-chua-tao-lai-${kho}`);
    await p.ev(`document.querySelector('[data-action="qr-tao-lai"]').click(), true`);
    await p.waitFor(`document.querySelectorAll('[data-khoi="qr-thong-tin"] p')[3]?.textContent === 'Số tiền: 100.000đ'`, "mã mới 100.000đ", 15000);
    await p.waitFor(`!document.querySelector('[data-action="qr-luu-anh"]').disabled`, "Lưu ảnh bật lại");
    assert.deepEqual(await p.ev(nutTat), [false, false], "tạo lại xong ⇒ hai nút bật lại");
    assert.equal(await p.ev(`document.querySelector('[data-khoi="qr-trang-thai"]').hidden`), true, "dòng nhắc ẩn khi mã khớp số");
    // Số quá lớn ⇒ câu 400 của máy chủ, hai nút tắt
    await p.ev(setInput(`document.getElementById('qr-so-tien')`, "99999999"));
    await p.ev(`document.querySelector('[data-action="qr-tao-lai"]').click(), true`);
    await p.waitFor(`!document.querySelector('.sheet .alert.danger').hidden`, "câu lỗi số quá lớn");
    assert.equal(await p.ev(`document.querySelector('.sheet .alert.danger').textContent.trim()`), "Số tiền không được lớn hơn số còn lại của đơn.");
    assert.deepEqual(await p.ev(nutTat), [true, true]);
    await chup(p, `qr-bang-loi-so-lon-${kho}`);

    // Khách đã chuyển khoản: tạo lại mã ở số NHỎ HƠN số còn lại (100.000 < 850.000) rồi bấm ⇒ bảng đóng, form ghi lần thu mở sẵn ĐÚNG số trên mã — không phải số còn lại
    // (nếu để 850.000 thì "điền từ số trên mã" và "điền số còn lại" cho cùng kết quả, bước này không phân biệt được).
    await p.ev(setInput(`document.getElementById('qr-so-tien')`, "100000"));
    await p.ev(`document.querySelector('[data-action="qr-tao-lai"]').click(), true`);
    await p.waitFor(`document.querySelectorAll('[data-khoi="qr-thong-tin"] p')[3]?.textContent === 'Số tiền: 100.000đ' && !document.querySelector('[data-action="qr-da-chuyen"]').disabled`, "mã 100.000đ + nút Khách đã chuyển khoản bật", 15000);
    const soQr = await p.ev("Number(document.getElementById('qr-so-tien').value.replace(/\\D/g, ''))");
    await p.ev(`document.querySelector('[data-action="qr-da-chuyen"]').click(), true`);
    await p.waitFor(`document.querySelector('.sheet[role="dialog"]') === null && !!document.querySelector('[data-khoi="form-lan-thu"]')`, "bảng đóng + form lần thu mở");
    const f = await p.ev(`(() => { const f = document.querySelector('[data-khoi="form-lan-thu"]'); const sel = f.querySelectorAll('select'); return { so: Number(f.querySelector('input').value.replace(/\\D/g, '')), hinhThuc: sel[0].value, nguoiNhan: sel[1].value, focus: document.activeElement === f.querySelector('input'), maHien: !!f.querySelector('[data-o]') }; })()`);
    assert.equal(soQr, 100000);
    assert.deepEqual(f, { so: 100000, hinhThuc: "BANK_TRANSFER", nguoiNhan: "cong_ty", focus: true, maHien: false }, "form điền sẵn đúng số trên QR (100.000, KHÔNG phải 850.000 còn lại), Chuyển khoản, người nhận Công ty; ô tiêu điểm; Bán hàng không có ô mã");
    await chup(p, `khach-da-chuyen-form-${kho}`);
    assert.deepEqual(p.consoleErrors.filter((m) => !/400|Failed to load resource/.test(m)), [], `lỗi console: ${p.consoleErrors}`);
    p.close();
    ok(`C) ${kho}: bảng QR đúng sáu dòng, ô 16px, không ra ngoài, axe sạch; Lưu ảnh → PNG ${tai.rong}px «${tai.download}»; đổi số ⇒ nút tắt / tạo lại ⇒ bật; số lớn ⇒ câu 400; Khách đã chuyển khoản ⇒ form sẵn ${soQr}`);
  }

  // C2. Dựng ảnh PNG hỏng sau khi mã đã vẽ ⇒ mã vẫn hiện, nhưng cả hai nút TẮT (không nửa vời); tạo lại ⇒ bật
  for (const [kho, vp] of KHO) {
    p = await env.as(ACCOUNTS.salesA, `/order?id=${don1.id}`, vp);
    await p.waitFor(`!!document.querySelector('[data-action="qr-thanh-toan"]')`, "nút QR thanh toán");
    await p.ev(`(() => { window.__toBlobGoc = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null); }; return true; })()`);
    await p.ev(`document.querySelector('[data-action="qr-thanh-toan"]').click(), true`);
    await p.waitFor(`!document.querySelector('.qr-anh').hidden && !document.querySelector('.sheet .alert.danger').hidden`, "mã hiện + câu báo chưa dựng được ảnh", 15000);
    assert.match(await p.ev(`document.querySelector('.sheet .alert.danger').textContent`), /Chưa dựng được ảnh/);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.sheet-foot button')].map((b) => b.disabled)`), [true, true], "hỏng dựng ảnh ⇒ cả hai nút tắt");
    await p.ev(`HTMLCanvasElement.prototype.toBlob = window.__toBlobGoc; true`);
    await p.ev(`document.querySelector('[data-action="qr-tao-lai"]').click(), true`);
    await p.waitFor(`!document.querySelector('[data-action="qr-luu-anh"]').disabled`, "tạo lại ⇒ Lưu ảnh bật");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.sheet-foot button')].map((b) => b.disabled)`), [false, false]);
    assert.equal(await p.ev(`document.querySelector('.sheet .alert.danger').hidden`), true, "câu lỗi cũ ẩn đi");
    p.close();
    ok(`C2) ${kho}: dựng ảnh hỏng ⇒ mã hiện nhưng hai nút tắt + câu báo; tạo lại ⇒ bật`);
  }

  // ---------------------------------------------------------------- D. Danh bạ khi ĐÃ cài: lỗi máy chủ, đổi tài khoản
  p = await env.as(ACCOUNTS.chu, "/parties", MOB);
  await p.waitFor("!!document.querySelector('#search-form')", "trang Danh bạ (điện thoại)");
  await moHoSo(p, TEN_CT, true);
  await p.waitFor(`${hienTai}.includes(${JSON.stringify(SO_1)})`, "mục dựng xong (điện thoại)");
  assert.deepEqual(await trongKhung(p), [], "mục nằm trọn trong khung 390");
  assert.equal(await tinMuc(p), null, "mở lại hồ sơ: không còn dòng báo cũ");
  await chupKhung(p, "#tai-khoan-nhan-tien", "tai-khoan-da-cai-390");
  await demPut(p);
  await p.ev("window.confirm = () => true; true");
  await p.ev(setInput(`${SEC}.querySelector('#tknt-so')`, "abc123"));
  await p.ev(setInput(`${SEC}.querySelector('#tknt-ten')`, "Cong ty Tour Dao"));
  await p.ev(`${nutLuu("Đổi tài khoản")}.click(), true`);
  await p.waitFor(`!!${SEC}.querySelector('.alert')`, "lỗi 400 của máy chủ hiện trong mục");
  t = await tinMuc(p);
  assert.deepEqual([t?.chu, t?.role, /alert danger/.test(t?.lop ?? "")], ["Số tài khoản chỉ gồm chữ số (4–19 số).", "alert", true], `lỗi 400: ${JSON.stringify(t)}`);
  assert.equal(await p.ev("window.__puts"), 1, "đã gửi đúng một PUT");
  assert.equal(await loiTrangAn(p), true, "#error đầu trang không hiện");
  assert.equal(await p.ev(`${SEC}.querySelector('#tknt-so').value`), "abc123", "giữ nguyên số đã gõ để sửa");
  assert.equal(await p.ev(`${nutLuu("Đổi tài khoản")}.disabled`), false, "nút mở lại sau lỗi");
  assert.equal(await p.ev(hienTai), dong1, "dòng hiện tại không đổi");
  assert.equal(env.sql("SELECT COUNT(*) AS n FROM pty_bank_account")[0].n, 1, "máy chủ từ chối ⇒ không ghi");
  assert.equal(await nutVaTinCungKhung(p, "Đổi tài khoản"), true, "ở 390, câu lỗi và nút Đổi cùng nằm trong màn hình");
  await chupKhung(p, "#tai-khoan-nhan-tien", "tai-khoan-loi-390");
  await axeSach(p, AXE, "Danh bạ — mục đã cài (390), đang hiện lỗi 400", SEC);
  assert.deepEqual(p.consoleErrors.filter((m) => !/400|Failed to load resource/.test(m)), [], `lỗi console: ${p.consoleErrors}`);
  p.close();
  ok("D1) 390 đã cài: trong khung; lỗi 400 của máy chủ hiện TRONG mục, cùng màn hình với nút, giữ số đã gõ, nút mở lại, không ghi; axe sạch");

  p = await env.as(ACCOUNTS.chu, "/parties", DESK);
  await p.waitFor("!!document.querySelector('#search-form')", "trang Danh bạ dựng xong");
  await moHoSo(p, TEN_CT);
  await p.waitFor(`${hienTai}.includes(${JSON.stringify(SO_1)})`, "mục dựng xong");
  await p.ev(`window.__hoi = []; window.__tra = true; window.confirm = (m) => { window.__hoi.push(m); return window.__tra; }; true`);
  await demPut(p);
  // Đổi: có hộp hỏi lại; chọn Huỷ thì không gửi gì
  await p.ev("window.__tra = false; true");
  await p.ev(setInput(`${SEC}.querySelector('#tknt-so')`, SO_2));
  await p.ev(setInput(`${SEC}.querySelector('#tknt-ten')`, "Cong ty Tour Dao Moi"));
  await p.ev(`${nutLuu("Đổi tài khoản")}.click(), true`);
  await sleep(600);
  assert.equal(await p.ev("window.__hoi.length"), 1, "đổi ⇒ có hộp hỏi lại");
  const hoi = await p.ev("window.__hoi[0]");
  assert.equal(hoi, "Đổi tài khoản nhận tiền? Từ lúc này mã QR mới sẽ chuyển tiền về tài khoản mới; tài khoản cũ được lưu lại trong lịch sử.");
  assert.equal(await p.ev("window.__puts"), 0, "Huỷ ⇒ chưa gửi");
  assert.equal(await tinMuc(p), null, "Huỷ ⇒ không có dòng báo");
  assert.equal(env.sql("SELECT COUNT(*) AS n FROM pty_bank_account")[0].n, 1, "bấm Huỷ ở hộp hỏi ⇒ chưa ghi gì");
  assert.equal(await p.ev(hienTai), dong1);
  // Đồng ý + bấm đúp liền nhau ⇒ chỉ MỘT lệnh gửi
  await p.ev("window.__tra = true; true");
  await p.ev(`(() => { const b = ${nutLuu("Đổi tài khoản")}; b.click(); b.click(); return true; })()`);
  await p.waitFor(`${hienTai}.includes(${JSON.stringify(SO_2)})`, "đã đổi và nạp lại");
  assert.equal(await p.ev(hienTai), `Vietcombank · ${SO_2} · CONG TY TOUR DAO MOI`);
  assert.equal(await p.ev("window.__puts"), 1, "bấm đúp ⇒ chỉ một PUT");
  t = await tinMuc(p);
  assert.deepEqual([t?.chu, t?.role], ["Đã lưu tài khoản nhận tiền.", "status"], `dòng đã lưu (đổi): ${JSON.stringify(t)}`);
  assert.equal(await p.ev("document.activeElement?.id"), "tknt-title", "tiêu điểm về tiêu đề sau khi đổi");
  const ds = env.sql("SELECT account_number, valid_to FROM pty_bank_account ORDER BY created_at");
  assert.equal(ds.length, 2, "dòng cũ giữ lại làm lịch sử");
  assert.notEqual(ds[0].valid_to, null, "dòng cũ đã đóng");
  assert.equal(ds[1].valid_to, null, "dòng mới đang mở");
  assert.deepEqual(env.sql("SELECT detail FROM audit_log WHERE action = 'party_bank_account_changed' ORDER BY created_at").map((r) => r.detail), ["cài tài khoản nhận tiền", "đổi tài khoản nhận tiền"]);
  // Khoá lạc quan: người khác đổi giữa chừng ⇒ bấm Đổi ở trang cũ nhận câu «đã cũ» TRONG MỤC, bản mới được nạp, ô nhập xoá trắng
  const partyId = env.sql("SELECT party_id FROM pty_bank_account LIMIT 1")[0].party_id;
  const idMo = await p.ev(`fetch('/api/parties/' + ${JSON.stringify(partyId)} + '/tai-khoan-nhan-tien').then((r) => r.json()).then((b) => b.hienTai.id)`);
  const khac = await p.ev(`fetch('/api/parties/' + ${JSON.stringify(partyId)} + '/tai-khoan-nhan-tien', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ maNganHang: 'MB', soTaiKhoan: '5550001112', chuTaiKhoan: 'NGUOI KHAC', truocDo: ${JSON.stringify(idMo)} }) }).then((r) => r.status)`);
  assert.equal(khac, 200, "người khác đổi sang MB");
  await p.ev("document.querySelector('#error').hidden = true, true");
  await p.ev(setInput(`${SEC}.querySelector('#tknt-so')`, "1112223334"));
  await p.ev(setInput(`${SEC}.querySelector('#tknt-ten')`, "Tour Dao Cu"));
  await p.ev(`${nutLuu("Đổi tài khoản")}.click(), true`);
  await p.waitFor(`${hienTai}.includes('5550001112')`, "bản mới của người khác được nạp");
  t = await tinMuc(p);
  assert.deepEqual([/đã cũ/.test(t?.chu ?? ""), t?.role, /alert warn/.test(t?.lop ?? "")], [true, "status", true], `câu «đã cũ»: ${JSON.stringify(t)}`);
  assert.match(t.chu, /Các ô nhập đã được xoá trắng/, "nói rõ ô đã xoá, người dùng cần nhập lại");
  assert.equal(await loiTrangAn(p), true, "#error đầu trang không hiện");
  assert.equal(await p.ev(`${SEC}.querySelector('#tknt-so').value + ${SEC}.querySelector('#tknt-ten').value`), "", "ô nhập xoá trắng");
  assert.equal(await p.ev("document.activeElement?.id"), "tknt-title", "tiêu điểm về tiêu đề sau «đã cũ»");
  assert.equal(env.sql("SELECT COUNT(*) AS n FROM pty_bank_account WHERE valid_to IS NULL")[0].n, 1, "vẫn đúng một dòng mở");
  assert.equal(await p.ev(`${SEC}.querySelector('select').value`), "MB");
  assert.deepEqual(p.consoleErrors.filter((m) => !/409|Failed to load resource/.test(m)), [], `lỗi console: ${p.consoleErrors}`);
  p.close();
  ok("D2) 1040: câu hỏi lại đúng chữ; Huỷ = không gửi; bấm đúp = một PUT; «Đã lưu…» + tiêu điểm về tiêu đề; «đã cũ» hiện TRONG mục, ô nhập xoá trắng, bản mới được nạp");

  // ---------------------------------------------------------------- E. Form lập đơn: ba ô trả trước theo quyền ghi sổ
  for (const [kho, vp] of KHO) {
    p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('prepaidAmount')", "form");
    await sleep(1500); // đủ để khối ẩn (nếu có) chạy xong
    assert.equal(await p.ev("document.getElementById('prepaid-amount-field').hidden"), false, "Bán hàng vẫn thấy ô trả trước");
    await p.ev("document.getElementById('prepaid-amount-field').scrollIntoView({ block: 'center' }), true");
    await chup(p, `form-lap-don-ban-hang-${kho}`);
    p.close();
    p = await env.as(ACCOUNTS.chu, "/order-form", vp);
    await p.waitFor("!!document.getElementById('prepaidAmount')", "form");
    await p.waitFor("document.getElementById('prepaid-amount-field').hidden === true", "ô trả trước ẩn cho Toàn quyền");
    const e = await p.ev("({ m: document.getElementById('prepaid-method-field').hidden, c: document.getElementById('prepaid-collector-field').hidden, hint: document.getElementById('prepaid-hint').textContent })");
    assert.deepEqual([e.m, e.c], [true, true]);
    assert.match(e.hint, /ghi ở trang đơn/, "có lối chỉ sang trang đơn");
    await p.ev("document.getElementById('prepaid-hint').scrollIntoView({ block: 'center' }), true");
    await chup(p, `form-lap-don-toan-quyen-${kho}`);
    p.close();
    ok(`E1) ${kho}: form lập đơn — Toàn quyền không có ô trả trước (có lối chỉ sang trang đơn); Bán hàng vẫn có`);

    // E2. Số trả trước GÕ SỚM (trước khi biết tài khoản) bị xoá khi ba ô bị ẩn; tóm tắt không còn dòng «Trả trước»
    {
      const c = await env.openPage(vp);
      const ck = await env.login(ACCOUNTS.chu);
      await c.send("Network.setCookie", { name: ck.name, value: ck.value, url: env.base, httpOnly: true });
      await c.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
        const goc = window.fetch.bind(window);
        window.fetch = (input, init) => (typeof input === 'string' ? input : input.url).includes('/api/auth/me') ? new Promise((r) => setTimeout(r, 2500)).then(() => goc(input, init)) : goc(input, init);
        const t = setInterval(() => { const i = document.getElementById('prepaidAmount'); if (!i) return; clearInterval(t);
          i.value = '500.000'; i.dispatchEvent(new Event('input', { bubbles: true })); window.__goSom = true; }, 10);
      })()` });
      await c.send("Page.navigate", { url: env.base + "/order-form" });
      await c.waitFor("window.__goSom === true", "đã gõ số trả trước sớm");
      assert.deepEqual(await c.ev("({ hien: !document.getElementById('prepaid-amount-field').hidden, giaTri: document.getElementById('prepaidAmount').value })"), { hien: true, giaTri: "500.000" }, "trước khi biết tài khoản: ô còn hiện và đã có số gõ sớm");
      await c.waitFor("document.getElementById('prepaid-amount-field').hidden === true", "ô trả trước ẩn cho Toàn quyền", 12000);
      assert.deepEqual(await c.ev("({ giaTri: document.getElementById('prepaidAmount').value, dong: !document.getElementById('sum-prepaid-row').hidden, mobile: !document.getElementById('mobile-prepaid-row').hidden })"), { giaTri: "", dong: false, mobile: false }, "sau khi ẩn: số đã gõ bị xoá, tóm tắt hết dòng Trả trước");
      assert.deepEqual(c.consoleErrors, [], `lỗi console: ${c.consoleErrors}`);
      c.close();
      ok(`E2) ${kho}: số trả trước gõ sớm bị xoá khi Toàn quyền vào form; tóm tắt hết dòng «Trả trước»`);
    }

    // E3. Số gõ SAU khi biết tài khoản nhưng TRONG LÚC danh mục còn đang tải (khe giữa initShell và khối ẩn): cờ đã bật nên tóm tắt không nhận số đó
    {
      const c = await env.openPage(vp);
      const ck = await env.login(ACCOUNTS.chu);
      await c.send("Network.setCookie", { name: ck.name, value: ck.value, url: env.base, httpOnly: true });
      await c.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
        const goc = window.fetch.bind(window);
        window.fetch = (input, init) => {
          const u = typeof input === 'string' ? input : input.url;
          if (u.includes('/api/auth/me')) return goc(input, init).then((r) => { window.__meXong = true; return r; });
          if (u.includes('/api/catalog/for-order')) return new Promise((r) => setTimeout(r, 4000)).then(() => goc(input, init));
          return goc(input, init);
        };
      })()` });
      await c.send("Page.navigate", { url: env.base + "/order-form" });
      await c.waitFor("window.__meXong === true && !!document.getElementById('prepaidAmount')", "đã biết tài khoản");
      await sleep(400); // initShell trả về, form còn đang chờ danh mục
      assert.equal(await c.ev("document.getElementById('prepaid-amount-field').hidden"), false, "trong khe: ô trả trước còn hiện (khối ẩn chưa chạy)");
      await c.ev(setInput("document.getElementById('prepaidAmount')", "500.000"));
      assert.equal(await c.ev("document.getElementById('sum-prepaid-row').hidden && document.getElementById('mobile-prepaid-row').hidden"), true, "trong khe: tóm tắt KHÔNG nhận số trả trước (cờ bật ngay sau khi biết tài khoản)");
      await c.waitFor("document.getElementById('prepaid-amount-field').hidden === true", "khối ẩn chạy xong", 12000);
      assert.equal(await c.ev("document.getElementById('prepaidAmount').value"), "", "rồi số gõ trong khe bị xoá");
      assert.deepEqual(c.consoleErrors, [], `lỗi console: ${c.consoleErrors}`);
      c.close();
      ok(`E3) ${kho}: số gõ trong lúc danh mục còn tải không lọt vào tóm tắt, rồi bị xoá`);
    }
  }
} finally {
  await env.stop();
}
console.log("QR-SMOKE XONG");
