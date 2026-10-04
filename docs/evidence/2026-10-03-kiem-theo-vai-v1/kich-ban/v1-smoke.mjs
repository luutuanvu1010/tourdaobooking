// Đợt V1 của lộ trình khắc phục kiểm theo vai (docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md mục 3) — kịch bản Chrome:
//   1) HT-03 (văn phòng, 1040): hộp "Xuất bến thay tài xế" của chuyến KHÔNG phải hôm nay có dải đỏ "Không phải chuyến của hôm nay".
//   2) HT-03 (tài xế, 390): /cuoc-chuyen chuyến ngày mai — dải đỏ trên trang; bấm "Xuất bến" CHỈ mở hộp (mã, ngày chạy, giờ, biển số, số khách), CHƯA gọi
//      API; "Chưa, quay lại" đóng hộp, vẫn chưa gọi; bấm nút trong hộp → đúng MỘT lệnh xuất bến.
//   3) HT-24 (tài xế, 390, ĐỒNG HỒ GIẢ): mở /cuoc lúc 00:01 của ngày SAU ngày chạy — chuyến đang chạy vẫn ở "Hôm nay", đứng đầu, "Xuất bến dd/mm".
//   4) Kiểu A (tài xế, 390): "Đã đón" → dòng "Vừa ghi … — Sai? Báo văn phòng."; "Đã trả" và "Kết thúc chuyến" mở hộp xác nhận, lệnh chỉ gửi khi bấm trong hộp.
//   5) Kiểu D (a) (tài xế, 390, cuộn tới cuối): nút "Hỗ trợ" nổi KHÔNG giao nút "Kết thúc chuyến" / "Kết thúc gián đoạn"; gỡ tạm lớp chung khỏi khối cuối
//      → nút nổi đè lại (chứng minh phép đo bắt được lỗi cũ), trả lớp lại.
//   6) Kiểu D (c) (Quản trị, 390 + 1040): /home — mỗi ô số mang nhãn "Toàn công ty" / "Của tôi".
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài — Turnstile tắt trong máy thử):
//   CHROME_BIN=/opt/pw-browsers/chromium-1194/chrome-linux/chrome OUT=docs/evidence/2026-10-03-kiem-theo-vai-v1 node docs/evidence/2026-10-03-kiem-theo-vai-v1/kich-ban/v1-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Quản trị (bước 1) → Tài xế (2–5) → Quản trị (6); đóng trang cũ trước khi đổi tài khoản.
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("V1 SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const AN = d.AN.account;
// T4 (ngày mai 10:00, XE_A đủ giấy, An lái) có O4 (2 khách) — xếp bằng phá lệ vì trong mốc 48 giờ (khuôn cuoc-smoke.mjs).
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, x4.text);
const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const posts = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi));
const sheetOpen = `!!document.querySelector('.sheet-root .sheet[role="dialog"]')`;
const sheetRows = `[...document.querySelectorAll('.sheet .dp-xn-ds dt')].map((dt) => [dt.innerText.trim(), dt.nextElementSibling.innerText.trim()])`;
/** Đồng hồ trình duyệt GIẢ: lệch `lechMs` so với giờ thật (chỉ phía trình duyệt — máy chủ vẫn giờ thật). Gắn trước khi trang chạy. */
const dongHoGia = (lechMs) => `(() => { const D = Date; const lech = ${lechMs}; class G extends D { constructor(...a) { if (a.length === 0) super(D.now() + lech); else super(...a); } static now() { return D.now() + lech; } } window.Date = G; })();`;
/** Hai hình chữ nhật có giao nhau không (điểm ảnh CSS). */
const giao = (sel1, sel2) => `(() => { const a = document.querySelector(${JSON.stringify(sel1)})?.getBoundingClientRect(), b = document.querySelector(${JSON.stringify(sel2)})?.getBoundingClientRect(); if (!a || !b) return 'thiếu phần tử'; return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; })()`;

try {
  // ---- 1) Văn phòng: hộp bấm thay của chuyến không phải hôm nay --------------------------------------------------------------------------------------------
  let p = await env.as(ACCOUNTS.admin, `/chuyen?id=${d.T1.id}`, DESK);
  await b.step("1", `HT-03 văn phòng 1040: hộp "Xuất bến thay tài xế" của ${d.T1.ma} (ngày ${dm(d.NGAY_XA)}) có dải đỏ "Không phải chuyến của hôm nay"; đóng hộp không gửi`, async () => {
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-thay"]:not([disabled])')`, "nút xuất bến thay", 12000);
    await p.ev(click('[data-action="xuat-ben-thay"]'));
    await p.waitFor(sheetOpen, "hộp bấm thay");
    const dai = await p.ev(`[...document.querySelectorAll('.sheet .banner-danger')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.equal(dai.length, 1, JSON.stringify(dai));
    assert.match(dai[0], new RegExp(`^Không phải chuyến của hôm nay Chuyến này chạy ngày .* ${dm(d.NGAY_XA)}/\\d{4}, không phải hôm nay`));
    await shotView(p, "1-van-phong-xuat-ben-thay-khac-ngay-may-tinh.png");
    await p.ev(`document.querySelector('.sheet-close').click(), true`);
    await p.waitFor(`!${sheetOpen}`, "hộp đã đóng");
    assert.deepEqual(posts(p, "/xuat-ben"), [], "đóng hộp: không gửi lệnh");
  });
  p.close();

  // ---- 2) Tài xế: hộp xác nhận Xuất bến -----------------------------------------------------------------------------------------------------------------
  p = await env.as(AN, `/cuoc-chuyen?id=${d.T4.id}`, MOB);
  await b.step("2", `HT-03 tài xế 390: ${d.T4.ma} (ngày mai) — dải đỏ trên trang; "Xuất bến" chỉ mở hộp (5 dòng, nút "Vẫn xuất bến" không bị cắt chữ); quay lại → không gửi; xác nhận → đúng một lệnh`, async () => {
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]:not([disabled])')`, "nút xuất bến", 12000);
    assert.match(await p.ev(txt("#cc-trang .banner-danger")), /^Không phải chuyến của hôm nay Chuyến này chạy ngày /);
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(sheetOpen, "hộp xác nhận xuất bến");
    assert.deepEqual(posts(p, "/xuat-ben"), [], "một chạm chỉ mở hộp — chưa gọi API");
    const rows = await p.ev(sheetRows);
    assert.deepEqual(rows.map((r) => r[0]), ["Mã chuyến", "Ngày chạy", "Giờ dự kiến", "Biển số", "Số khách"]);
    assert.equal(rows[0][1], d.T4.ma);
    assert.match(rows[1][1], new RegExp(`${dm(d.NGAY_KHOA)}/\\d{4}$`));
    assert.deepEqual(rows.slice(2).map((r) => r[1]), ["10:00", "79A-111.11", "2 khách"]);
    assert.equal(await p.ev(txt('[data-action="xuat-ben-xac-nhan"]')), "Vẫn xuất bến");
    // Chữ nút trong hai nửa chân hộp không bị cắt (lần chạy đầu 3/10: "Vẫn xuất bến chuyến ngày 04/10" tràn khỏi nút ở 390).
    assert.equal(await p.ev(`[...document.querySelectorAll('.sheet-foot .vc-btn')].every((b) => b.scrollWidth <= b.clientWidth + 1)`), true, "chữ nút chân hộp không tràn");
    assert.ok(await p.ev(`!!document.querySelector('.sheet .banner-danger')`), "dải đỏ trong hộp");
    assert.ok(await p.ev(noOverflowX));
    await shotView(p, "2a-tai-xe-hop-xuat-ben-khac-ngay-dien-thoai.png");
    await p.ev(click('[data-action="xuat-ben-dong"]'));
    await p.waitFor(`!${sheetOpen}`, "hộp đã đóng");
    assert.deepEqual(posts(p, "/xuat-ben"), [], "quay lại: không gửi");
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(sheetOpen, "mở lại hộp");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-run-list .dp-run')`, "màn đang chạy", 12000);
    assert.equal(posts(p, "/xuat-ben").length, 1, "đúng một lệnh xuất bến");
    await shotFull(p, "2b-tai-xe-sau-xuat-ben-dien-thoai.png");
  });
  p.close();

  // ---- 3) HT-24: /cuoc lúc 00:01 ngày SAU ngày chạy (đồng hồ trình duyệt giả) --------------------------------------------------------------------------
  await b.step("3", `HT-24 tài xế 390, đồng hồ giả ${dm(vnDate(2))} 00:01: ${d.T4.ma} (ngày chạy ${dm(d.NGAY_KHOA)}, đang chạy) vẫn ở "Hôm nay", đứng đầu, "Xuất bến ${dm(d.NGAY_KHOA)}"`, async () => {
    const pg = await env.openPage(MOB);
    const c = await env.login(AN);
    await pg.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    const giaMs = Date.parse(`${vnDate(2)}T00:01:00+07:00`);
    await pg.send("Page.addScriptToEvaluateOnNewDocument", { source: dongHoGia(giaMs - Date.now()) });
    await pg.send("Page.navigate", { url: `${env.base}/cuoc` });
    await pg.waitFor(`document.querySelectorAll('.dp-cuoc-day').length === 3`, "Cuốc của tôi dựng xong", 12000);
    const homNay = await pg.ev(`(() => { const s = document.querySelector('.dp-cuoc-day'); return { t: s.querySelector('.dp-cuoc-day-title').innerText, ngay: s.querySelector('.dp-cuoc-date').innerText, the: [...s.querySelectorAll('.dp-cuoc-the')].map((x) => ({ ma: x.querySelector('.dp-cuoc-ma').innerText, ngay: x.querySelector('.dp-cuoc-xb-ngay')?.innerText ?? null, chay: x.classList.contains('is-chay') })) }; })()`);
    assert.equal(homNay.t, "Hôm nay");
    assert.match(homNay.ngay, new RegExp(`${dm(vnDate(2))}$`), "trang thật sự đang ở ngày giả");
    assert.deepEqual(homNay.the[0], { ma: d.T4.ma, ngay: `Xuất bến ${dm(d.NGAY_KHOA)}`, chay: true }, JSON.stringify(homNay));
    assert.ok(apiCalls(pg).some((r) => r.path === "/api/van-chuyen/cuoc-cua-toi"), "gọi route danh sách");
    await shotFull(pg, "3-cuoc-qua-nua-dem-dien-thoai.png");
    pg.close();
  });

  // ---- 4) + 5) Kiểu A và nút nổi ở màn đang chạy -----------------------------------------------------------------------------------------------------------
  p = await env.as(AN, `/cuoc-chuyen?id=${d.T4.id}`, MOB);
  await b.step("4", `Kiểu A tài xế 390: "Đã đón" → "Vừa ghi … — Sai? Báo văn phòng."; "Đã trả" và "Kết thúc chuyến" mở hộp, lệnh chỉ gửi khi xác nhận`, async () => {
    await p.waitFor(`!!document.querySelector('.dp-run [data-action="da-toi"]')`, "nút Đã tới", 12000);
    await p.ev(click('.dp-run [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 2`, "nút khách");
    await p.ev(click('.dp-khach-btn[data-action="don"]'));
    await p.waitFor(`!!document.querySelector('.dp-vua-ghi')`, "dòng Vừa ghi");
    assert.match(await p.ev(txt(".dp-vua-ghi")), /^Vừa ghi: .+ — Đã đón\. Sai\? Báo văn phòng\.$/);
    await shotView(p, "4a-vua-ghi-dien-thoai.png");
    await p.ev(click('.dp-khach-btn[data-action="vang"]'));
    await p.waitFor(`/— Vắng\\./.test(document.querySelector('.dp-vua-ghi')?.innerText ?? '')`, "Vừa ghi đổi sang khách vừa bấm (Vắng)");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-vua-ghi').length`), 1, "chỉ một dòng Vừa ghi — lệnh sau xoá dòng cũ");
    // "Đã trả" cả điểm: hộp trước, chưa gửi.
    const truocTra = posts(p, "/tra").length;
    await p.ev(click('.dp-run [data-action="tra-het"]'));
    await p.waitFor(sheetOpen, "hộp Đã trả");
    assert.deepEqual((await p.ev(sheetRows)).map((r) => r[0]), ["Điểm trả", "Khách xuống"]);
    assert.equal(await p.ev(txt('[data-action="tra-het-xac-nhan"]')), "Đã trả 1 khách");
    assert.equal(await p.ev(`[...document.querySelectorAll('.sheet-foot .vc-btn')].every((b) => b.scrollWidth <= b.clientWidth + 1)`), true, "chữ nút chân hộp không tràn");
    assert.equal(posts(p, "/tra").length, truocTra, "chưa gửi");
    await shotView(p, "4b-hop-da-tra-dien-thoai.png");
    await p.ev(click('[data-action="tra-het-xac-nhan"]'));
    await p.waitFor(`!document.querySelector('[data-action="ket-thuc"]')?.disabled`, "Kết thúc bấm được", 12000);
    assert.equal(posts(p, "/tra").length, truocTra + 1, "trả đúng 1 khách");
  });
  await b.step("5", `Kiểu D (a) 390 cuộn tới cuối: nút "Hỗ trợ" không giao "Kết thúc chuyến" / "Kết thúc gián đoạn"; gỡ tạm lớp chung → đè lại (phép đo bắt được lỗi cũ)`, async () => {
    await p.waitFor(`!!document.getElementById('tl-fab')`, "nút Hỗ trợ", 12000);
    // Dữ liệu thử ngắn (trang không cuộn) → chèn tạm khối 1200px ĐẦU <main> để khối nút cuối nằm ở ĐÁY trang dài như chuyến thật nhiều điểm (khuôn
    // `khongBiChe` của cuoc-smoke.mjs); gỡ khối khi xong.
    await p.ev(`(() => { const dem = document.createElement('div'); dem.id = 'v1-dem'; dem.style.height = '1200px'; document.querySelector('main').prepend(dem); return true; })()`);
    const cuon = async () => {
      await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight), window.dispatchEvent(new Event('scroll')), true`);
      await sleep(500);
    };
    await cuon();
    assert.equal(await p.ev(giao("#tl-fab", '[data-action="ket-thuc"]')), false, "nút nổi không đè Kết thúc chuyến");
    assert.equal(await p.ev(giao("#tl-fab", '[data-action="ket-thuc-gian-doan"]')), false, "nút nổi không đè Kết thúc gián đoạn");
    await shotView(p, "5a-cuon-cuoi-nut-noi-dien-thoai.png");
    // Phản chứng: gỡ lớp chung khỏi khối cuối (như trước V1.5a) → nút nổi đè ít nhất một nút.
    await p.ev(`document.querySelector('.dp-run-end').classList.remove('thanh-hanh-dong-cuoi'), true`);
    await cuon();
    const deLai = (await p.ev(giao("#tl-fab", '[data-action="ket-thuc"]'))) === true || (await p.ev(giao("#tl-fab", '[data-action="ket-thuc-gian-doan"]'))) === true;
    await shotView(p, "5b-phan-chung-khong-lop-chung-bi-de-dien-thoai.png");
    assert.ok(deLai, "không có lớp chung thì nút nổi phải đè (nếu không đè, phép đo không chứng minh gì)");
    await p.ev(`document.querySelector('.dp-run-end').classList.add('thanh-hanh-dong-cuoi'), true`);
    await cuon();
    assert.equal(await p.ev(giao("#tl-fab", '[data-action="ket-thuc"]')), false);
    await p.ev(`document.getElementById('v1-dem').remove(), window.dispatchEvent(new Event('scroll')), true`);
  });
  await b.step("4c", `Kiểu A: "Kết thúc chuyến" mở hộp tóm tắt (Đã trả 1 · Vắng 1 · Khách đã huỷ 0), quay lại không gửi, xác nhận → đúng một lệnh`, async () => {
    await p.ev(click('[data-action="ket-thuc"]'));
    await p.waitFor(sheetOpen, "hộp Kết thúc");
    assert.deepEqual(await p.ev(sheetRows), [["Đã trả", "1 khách"], ["Vắng", "1 khách"], ["Khách đã huỷ", "0 khách"]]);
    assert.equal(await p.ev(`[...document.querySelectorAll('.sheet-foot .vc-btn')].every((b) => b.scrollWidth <= b.clientWidth + 1)`), true, "chữ nút chân hộp không tràn");
    await shotView(p, "4c-hop-ket-thuc-dien-thoai.png");
    await p.ev(click('[data-action="ket-thuc-dong"]'));
    await p.waitFor(`!${sheetOpen}`, "đóng hộp");
    assert.deepEqual(posts(p, "/ket-thuc"), [], "quay lại: không gửi");
    await p.ev(click('[data-action="ket-thuc"]'));
    await p.waitFor(sheetOpen, "mở lại hộp");
    await p.ev(click('[data-action="ket-thuc-xac-nhan"]'));
    await p.waitFor(`!document.querySelector('[data-action="ket-thuc"]')`, "chuyến đã kết thúc", 12000);
    assert.equal(posts(p, "/ket-thuc").length, 1);
    assert.equal(await p.ev(noCode), "");
    await shotFull(p, "4d-sau-ket-thuc-dien-thoai.png");
  });
  p.close();

  // ---- 6) Trang chủ: nhãn phạm vi ----------------------------------------------------------------------------------------------------------------------
  for (const [kho, vp, sel] of [["390", MOB, "#dash-so"], ["1040", DESK, "#dash-so-mt"]]) {
    p = await env.as(ACCOUNTS.admin, "/home", vp);
    await b.step(`6-${kho}`, `Kiểu D (c) /home ${kho}: mỗi ô số mang nhãn phạm vi — Còn thiếu / Chờ xác nhận / Chưa phụ trách "Toàn công ty", Doanh thu "Của tôi"`, async () => {
      await p.waitFor(`document.querySelectorAll('${sel} .dash-pham-vi').length === 4`, "bốn nhãn phạm vi", 12000);
      const o = await p.ev(`[...document.querySelectorAll('${sel} > a')].map((a) => [a.querySelector('.dash-so-nhan, .dash-smt-nhan').innerText.trim(), a.querySelector('.dash-pham-vi').innerText.trim()])`);
      const theo = Object.fromEntries(o);
      assert.equal(theo["Doanh thu của tôi"], "Của tôi", JSON.stringify(o));
      for (const k of Object.keys(theo).filter((x) => x !== "Doanh thu của tôi")) assert.equal(theo[k], "Toàn công ty", `${k}: ${JSON.stringify(o)}`);
      assert.ok(await p.ev(noOverflowX));
      await shotFull(p, `6-trang-chu-nhan-pham-vi-${kho === "390" ? "dien-thoai" : "may-tinh"}.png`);
    });
    p.close();
  }
} finally {
  await env.stop();
  b.xong();
}
