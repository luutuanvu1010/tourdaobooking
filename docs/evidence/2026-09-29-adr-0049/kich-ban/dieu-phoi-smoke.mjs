// B1 — V1 Điều phối xe (/dieu-phoi) cho VĂN PHÒNG + mục menu "Vận chuyển › Điều phối xe" (Q-B-4). ADR-0049 V1 (route 1, 5, 40), ADR-0050; bản vẽ
// docs/design/van-chuyen-dieu-phoi/project/01 Dieu phoi xe.dc.html (1a–1g) + dp-chua-xep, dp-dong-thoi-gian, dp-can-xu-ly; bản đối chiếu DOI-CHIEU-2026-09-29.md
// 2.1, 2.13 (không nút "Phá lệ" đứng riêng — phá lệ qua 409 `canQuyen`), H6, H7 (không "Gọi tài xế"), H8, H14, Q2 (không "Đã gọi báo"), mục 4.
// Khoá theo mốc: chỉ theo cờ `khoaMoc` của máy chủ (không tô vùng khoá theo giờ hiện tại). Vạch bây giờ / mốc: kiểm ở test thuần (dữ liệu thử không ở hôm nay).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/dieu-phoi-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt,
  typeInto, vcSub,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("DIEU PHOI SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// T5: chuyến trống giữa buổi cho chặng O5 (11:00) — XE_A (rảnh 09:30–14:30), Cường (xong T2 lúc 09:30, đủ 30 phút nghỉ).
const t5 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_A.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: d.NGAY_XA, gio: "10:30" }, ketThuc: { ngay: d.NGAY_XA, gio: "12:30" } });
assert.equal(t5.status, 201, `tạo T5: ${t5.text}`);
const T5 = t5.json.chuyen;

const cho = (p) => p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-xe .dp-tl-card')`, "bảng điều phối dựng xong");
const ghi = (p) => apiCalls(p).filter((r) => r.method !== "GET" && r.path.startsWith("/api/van-chuyen/chuyen"));
const soLieu = `[...document.querySelectorAll('#dp-so .dp-stat')].map((s) => s.innerText.replace(/\\s+/g, ' ').trim())`;
const the = `[...document.querySelectorAll('#dp-cot-chua-xep .dp-leg')].map((x) => ({ tag: x.tagName, text: x.innerText.replace(/\\s+/g, ' ').trim() }))`;
const khoi = `[...document.querySelectorAll('.dp-khoi')].map((k) => ({ id: k.dataset.chuyen, cls: [...k.classList].filter((c) => c.startsWith('is-')).join(' '), label: k.getAttribute('aria-label') }))`;
const hang = `[...document.querySelectorAll('.dp-tl-hang .dp-tl-nhan')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`;
const viec = `[...document.querySelectorAll('#dp-cot-can-xu-ly .dp-cxl')].map((x) => ({ loai: x.querySelector('.dp-cxl-loai').innerText.trim(), tieuDe: x.querySelector('.dp-cxl-tieu-de').innerText.trim(), ai: x.querySelector('.dp-cxl-ai').innerText.trim(), khoa: x.querySelector('.dp-cxl-khoa')?.innerText.trim() ?? null, nut: [...x.querySelectorAll('.dp-cxl-actions .vc-btn')].map((n) => n.innerText.trim()) }))`;
const moThe = (legId) => click(`#dp-cot-chua-xep .dp-leg[data-leg="${legId}"]`);
const keoTha = (legId, chuyenId) => `(() => {
  const leg = document.querySelector('.dp-leg[data-leg="${legId}"]'); const blk = document.querySelector('.dp-khoi[data-chuyen="${chuyenId}"]');
  if (!leg || !blk) return false;
  const dt = new DataTransfer();
  leg.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
  const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }); blk.dispatchEvent(over);
  const ok = over.defaultPrevented;
  blk.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  leg.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  return ok;
})()`;
const CAM = ["Gọi tài xế", "Đã gọi báo", "Phá lệ"];
const khongNutCam = async (p) => {
  const nut = await p.ev(`[...document.querySelectorAll('main button, main a.vc-btn')].map((x) => x.innerText.trim())`);
  for (const c of CAM) assert.ok(!nut.includes(c), `không nút "${c}" (H7 / Q2 / 2.13): ${JSON.stringify(nut)}`);
};

try {
  // ---- Bán hàng, máy tính ------------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);

  await b.step("1", `1a 1040 Bán hàng: đầu trang (ngày, "+ Chuyến mới"), dải số liệu, ba cột; menu "Vận chuyển › Điều phối xe" đang sáng; không nút Gọi / Đã gọi báo / Phá lệ${axeNote()}`, async () => {
    await cho(p);
    assert.equal(await p.ev(txt("#dp-title")), "Điều phối xe");
    assert.equal(await p.ev(`document.querySelector('#dp-ngay').value`), d.NGAY_XA);
    assert.match(await p.ev(txt("#dp-ngay-nhan")), /^(Thứ (Hai|Ba|Tư|Năm|Sáu|Bảy)|Chủ nhật)$/);
    assert.equal(await p.ev(`document.querySelector('#dp-moi').getAttribute('href')`), `/chuyen-sua?ngay=${d.NGAY_XA}`);
    assert.ok(await p.ev(shown("#dp-moi")));
    assert.deepEqual(await p.ev(soLieu), ["CHẶNG 4", "ĐÃ XẾP 3", "CHƯA XẾP 1", "CHUYẾN 4 2 bị giữ", `CẦN XỬ LÝ ${await p.ev(`document.querySelectorAll('#dp-cot-can-xu-ly .dp-cxl').length`)}`, "ĐƠN NHÁP 0"]);
    assert.equal(await p.ev(shown("#dp-tabs")), false, "máy tính: không thẻ");
    for (const c of ["#dp-cot-chua-xep", "#dp-cot-xe", "#dp-cot-can-xu-ly"]) assert.ok(await p.ev(shown(c)), c);
    const nav = await p.ev(vcSub);
    assert.deepEqual(nav.items, ["Điều phối xe"], "Bán hàng: nhóm Vận chuyển chỉ có Điều phối xe");
    assert.equal(nav.current, "Điều phối xe");
    assert.deepEqual(await p.ev(the), [{ tag: "BUTTON", text: `11:00 Mường Thanh Luxury → nơi trả chưa chốt ${d.O5.ma} · 5 khách` }], "máy tính: không hiện nút viên 'Xếp vào chuyến…'");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-col-note")), "Kéo chặng thả vào một chuyến, hoặc bấm chặng để chọn chuyến");
    assert.deepEqual(await p.ev(hang), ["79A-111.11 15 chỗ Nguyễn Văn An, Phạm Văn Cường", "79A-222.22 29 chỗ Phạm Văn Cường", "79A-333.33 15 chỗ"]);
    assert.equal(await p.ev(txt(".dp-tl-nhom-t")), "XE CÔNG TY");
    const k = await p.ev(khoi);
    assert.deepEqual(k.map((x) => [x.id, x.cls]), [[d.T1.id, "is-plan"], [T5.id, "is-plan"], [d.T3.id, "is-held"], [d.T2.id, "is-held"]]);
    const v = await p.ev(viec);
    const giu = v.filter((x) => x.loai === "CHUYẾN BỊ GIỮ");
    assert.deepEqual(giu.map((x) => [x.tieuDe, x.ai, x.nut]), [
      [`${d.T2.ma} · 07:30 · 79A-222.22`, "Ai xử lý: Quản trị, Văn phòng", []],
      [`${d.T3.ma} · 14:30 · 79A-111.11`, "Ai xử lý: Văn phòng", ["Cập nhật điểm theo đơn"]],
    ]);
    assert.ok(!v.some((x) => x.tieuDe.startsWith(`${d.T3.ma} · TD-`)), "không mục 'nơi hẹn khác điểm' trùng với chuyến bị giữ");
    assert.equal(await p.ev(`!!document.querySelector('.dp-readonly')`), false);
    await khongNutCam(p);
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "điều phối 1040 Bán hàng");
    await shotFull(p, "b1-dieu-phoi-ban-hang-may-tinh.png");
  });

  await b.step("2", `bấm khối ${d.T3.ma} → thẻ "đang chọn" (xe · tài xế · giờ · tải, tuyến, "Mở chuyến", "Cập nhật điểm theo đơn") → bấm cập nhật → dải kết quả, chuyến hết bị giữ, mục Cần xử lý biến mất`, async () => {
    await p.ev(click(`.dp-khoi[data-chuyen="${d.T3.id}"]`));
    await p.waitFor(`!!document.querySelector('.dp-chon')`, "thẻ đang chọn");
    assert.equal(await p.ev(`document.querySelector('.dp-khoi[data-chuyen="${d.T3.id}"]').getAttribute('aria-pressed')`), "true");
    assert.equal(await p.ev(txt(".dp-chon-head")), `${d.T3.ma} Bị giữ Đang chọn`);
    assert.equal(await p.ev(txt(".dp-chon-line")), "79A-111.11 · 15 chỗ · Nguyễn Văn An · 14:30–16:30 · tải 4/15");
    assert.equal(await p.ev(txt(".dp-route")), "Novotel Nha Trang ► Bến tàu du lịch Nha Trang");
    assert.equal(await p.ev(`document.querySelector('.dp-chon [data-action="mo-chuyen"]').getAttribute('href')`), `/chuyen?id=${d.T3.id}`);
    await p.ev(click('.dp-chon [data-action="cap-nhat-diem"]'));
    await p.waitFor(`!!document.querySelector('#dp-banner .dp-banner-ok')`, "dải đã cập nhật");
    assert.equal(await p.ev(txt("#dp-banner .dp-banner-ok .banner-title")), `Đã cập nhật điểm theo đơn — ${d.T3.ma}`);
    await p.waitFor(`document.querySelector('.dp-khoi[data-chuyen="${d.T3.id}"]').classList.contains('is-plan')`, "T3 hết bị giữ");
    assert.ok(!(await p.ev(viec)).some((x) => x.tieuDe.startsWith(d.T3.ma)));
    assert.equal(await p.ev(txt(".dp-chon-head")), `${d.T3.ma} Đã lên kế hoạch Đang chọn`, "vẫn chọn chuyến sau khi tải lại");
    assert.deepEqual(Object.keys(JSON.parse(ghi(p).at(-1).body)).sort(), ["requestId", "version"]);
    await shotFull(p, "b1-dieu-phoi-chon-chuyen-may-tinh.png");
  });

  await b.step("3", `bấm thẻ chặng O5 → hộp "Xếp vào chuyến" (chỉ chuyến lên kế hoạch, theo giờ; nút khoá tới khi chọn) → xếp 3/5 vào ${T5.ma} (tách đoàn) → thẻ còn "còn 2/5"${axeNote()}`, async () => {
    await p.ev(moThe(d.O5.legId));
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
    await sleep(600);
    assert.equal(await p.ev(txt(".dp-sheet-xep .sheet-title")), "Xếp vào chuyến");
    assert.equal(await p.ev(txt(".dp-sheet-xep .dp-sheet-sum")), `11:00 · Mường Thanh Luxury → nơi trả chưa chốt ${d.O5.ma} · 5 khách chưa xếp`);
    const ds = await p.ev(`[...document.querySelectorAll('.dp-sheet-xep .vc-reason')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.equal(ds.length, 4, JSON.stringify(ds));
    assert.ok(ds.every((x, i, a) => i === 0 || a[i - 1].split(" · ")[1] <= x.split(" · ")[1]), `theo giờ: ${JSON.stringify(ds)}`);
    assert.ok(ds.includes(`${T5.ma} · 10:30–12:30 · 79A-111.11 · tải 0/15`), JSON.stringify(ds));
    assert.equal(await p.ev(`document.querySelector('[data-action="xep-gui"]').disabled`), true);
    assert.equal(await p.ev(`document.querySelector('#dp-xep-so').value`), "5");
    assert.equal(await p.ev(txt("#dp-xep-so-hint")), "Ít hơn 5 là tách đoàn — số còn lại ở cột “Chưa xếp”.");
    await axe(p, "hộp xếp 1040");
    await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${T5.id}"]`));
    await p.ev(typeInto("#dp-xep-so", "3"));
    await shotView(p, "b1-xep-vao-chuyen-may-tinh.png");
    await p.ev(click('[data-action="xep-gui"]'));
    await p.waitFor(`${txt("#dp-banner .dp-banner-ok .banner-title")} === 'Đã xếp 3 khách vào ${T5.ma}'`, "dải đã xếp");
    assert.equal(await p.ev(txt("#dp-banner .dp-banner-ok li")), `Còn 2 khách của ${d.O5.ma} ở cột “Chưa xếp”.`);
    assert.match((await p.ev(the))[0].text, new RegExp(`${d.O5.ma} · còn 2/5 khách$`));
    const body = JSON.parse(ghi(p).at(-1).body);
    assert.deepEqual({ ...body, requestId: "x" }, { requestId: "x", version: T5.version, chang: [{ legId: d.O5.legId, soSuat: 3 }] });
    // Chọn chuyến vừa xếp; O5 chưa chốt nơi trả nên máy chủ giữ chuyến — thẻ nêu nguyên câu lý do.
    assert.equal(await p.ev(txt(".dp-chon-head")), `${T5.ma} Bị giữ Đang chọn`, "chọn chuyến vừa xếp");
    assert.ok((await p.ev(txt(".dp-chon-giu"))).length > 0);
  });

  await b.step("4", `kéo thẻ O5 (còn 2) thả vào khối ${T5.ma} → hộp xếp mở với ${T5.ma} đã chọn → xếp nốt → cột Chưa xếp trống`, async () => {
    assert.equal(await p.ev(keoTha(d.O5.legId, T5.id)), true, "khối chuyến lên kế hoạch nhận thả");
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
    assert.equal(await p.ev(`document.querySelector('.dp-sheet-xep .vc-reason[aria-checked="true"]')?.dataset.code`), T5.id);
    assert.equal(await p.ev(`document.querySelector('[data-action="xep-gui"]').disabled`), false);
    assert.equal(await p.ev(`document.querySelector('#dp-xep-so').value`), "2");
    await p.ev(click('[data-action="xep-gui"]'));
    await p.waitFor(`${txt("#dp-banner .dp-banner-ok .banner-title")} === 'Đã xếp 2 khách vào ${T5.ma}'`, "dải đã xếp");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-col-empty")), "Không còn chặng nào chưa xếp.");
    assert.equal((await p.ev(soLieu))[2], "CHƯA XẾP 0");
  });

  await b.step("5", "ngày trong vùng khoá (Bán hàng): đổi ngày bằng ô ngày → địa chỉ đổi; chặng 'Quá mốc' + dòng khoá 'Cần Quản trị phá lệ' ở Cần xử lý; khối chuyến mang ổ khoá theo khoaMoc; xếp vào chuyến đang khoá → máy chủ đòi phá lệ → câu trong hộp, không hộp phá lệ", async () => {
    await p.ev(typeInto("#dp-ngay", d.NGAY_KHOA));
    await p.waitFor(`location.search === '?ngay=${d.NGAY_KHOA}' && !!document.querySelector('.dp-khoi[data-chuyen="${d.T4.id}"]')`, "sang ngày khoá");
    assert.match(await p.ev(txt("#dp-ngay-nhan")), / · ngày mai$/);
    assert.match((await p.ev(the))[0].text, /^10:00 Quá mốc Citadines Bayfront → Bến tàu du lịch Nha Trang/);
    const q = (await p.ev(viec)).find((x) => x.loai === "CHẶNG QUÁ MỐC");
    assert.deepEqual([q.tieuDe, q.khoa, q.nut], ["10:00 · Citadines Bayfront → Bến tàu du lịch Nha Trang", "Cần Quản trị phá lệ", []]);
    assert.match((await p.ev(khoi)).find((x) => x.id === d.T4.id).label, /đang khoá$/);
    await p.ev(moThe(d.O4.legId));
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
    await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${d.T4.id}"]`));
    assert.equal(await p.ev(txt(".dp-sheet-xep .dg-lock-note")), "Chuyến đã vào vùng khoá trước giờ xuất bến — cần Quản trị phá lệ.");
    assert.equal(await p.ev(txt(`.dp-sheet-xep .vc-reason[data-code="${d.T4.id}"] .dp-radio-sub`)), "đang khoá");
    await p.ev(click('[data-action="xep-gui"]'));
    await p.waitFor(`!!document.querySelector('.dp-sheet-xep .vc-field-error:not([hidden])')`, "câu lỗi trong hộp");
    assert.match(await p.ev(txt(".dp-sheet-xep .vc-field-error")), /cần Quản trị phá lệ/);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="pha-le-gui"]')`), false);
    await khongNutCam(p);
    assert.equal(await p.ev(noCode), "");
  });
  await p.close();

  // ---- Bán hàng, điện thoại ----------------------------------------------------------------------------------------------------------------------------------
  const pa = await env.as(ACCOUNTS.salesA, "/account", MOB);
  await b.step("6a", "390 Bán hàng trang Tôi: nhóm VẬN CHUYỂN có đúng một dòng 'Điều phối xe'", async () => {
    await pa.waitFor(`!!document.querySelector('#vc-links')`, "nhóm Vận chuyển");
    assert.deepEqual(await pa.ev(`[...document.querySelectorAll('#vc-links .row-link')].map((a) => [a.innerText.trim(), a.getAttribute('href')])`), [["Điều phối xe", "/dieu-phoi"]]);
    assert.equal(await pa.ev(txt("#vc-eyebrow")), "VẬN CHUYỂN");
  });
  await pa.close();
  const pm = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_KHOA}`, MOB);
  await b.step("6", `1b–1d 390 Bán hàng: ba thẻ (tablist, phím mũi tên), mỗi lúc một cột; dải số liệu 4 ô; dòng thời gian cuộn ngang TRONG thẻ, trang không tràn${axeNote()}`, async () => {
    await cho(pm);
    const tabs = await pm.ev(`[...document.querySelectorAll('#dp-tabs [role=tab]')].map((t) => ({ t: t.innerText.replace(/\\s+/g, ' ').trim(), sel: t.getAttribute('aria-selected') }))`);
    assert.deepEqual(tabs.map((x) => x.sel), ["true", "false", "false"]);
    assert.deepEqual(tabs.map((x) => x.t.replace(/ \d+$/, "")), ["Chưa xếp", "Xe", "Cần xử lý"]);
    assert.ok(await pm.ev(shown("#dp-cot-chua-xep")));
    assert.equal(await pm.ev(shown("#dp-cot-xe")), false);
    assert.equal(await pm.ev(shown("#dp-so")), false);
    assert.equal(await pm.ev(`document.querySelectorAll('#dp-so-m .dp-stat-m').length`), 4);
    assert.equal(await pm.ev(txt(".dp-leg .dp-leg-pill")), "Xếp vào chuyến…", "điện thoại: thẻ chặng có nút viên (bản vẽ 1b)");
    assert.equal(await pm.ev(shown(".dp-chi-may-tinh")), false, "điện thoại: không câu 'Kéo chặng thả…'");
    assert.equal(await pm.ev(txt("#dp-so-phu")), "Chưa xếp: 1 quá mốc");
    assert.ok(await pm.ev(noOverflowX));
    await axe(pm, "điều phối 390 Chưa xếp");
    await shotFull(pm, "b1-dieu-phoi-chua-xep-dien-thoai.png");
    await pm.ev(`document.querySelector('#dp-tab-chua-xep').focus()`);
    await pm.ev(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`);
    await pm.waitFor(`document.querySelector('#dp-tab-xe').getAttribute('aria-selected') === 'true' && document.activeElement.id === 'dp-tab-xe'`, "phím → sang thẻ Xe");
    assert.ok(await pm.ev(shown("#dp-cot-xe")));
    assert.equal(await pm.ev(shown("#dp-cot-chua-xep")), false);
    assert.ok(await pm.ev(`(() => { const c = document.querySelector('.dp-tl-cuon'); return c.scrollWidth > c.clientWidth; })()`), "dòng thời gian cuộn ngang");
    assert.ok(await pm.ev(noOverflowX), "trang không tràn ngang");
    await axe(pm, "điều phối 390 Xe");
    await shotFull(pm, "b1-dieu-phoi-xe-dien-thoai.png");
    await pm.ev(click("#dp-tab-can-xu-ly"));
    assert.ok(await pm.ev(shown("#dp-cot-can-xu-ly")));
    await shotFull(pm, "b1-dieu-phoi-can-xu-ly-dien-thoai.png");
    assert.equal(await pm.ev(noCode), "");
  });
  await pm.close();

  // ---- Quản trị, máy tính ------------------------------------------------------------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/dieu-phoi?ngay=${d.NGAY_KHOA}`, DESK);
  await b.step("7", `1f 1040 Quản trị: menu Vận chuyển đủ mục (Điều phối xe đầu); chặng quá mốc KHÔNG dòng khoá, KHÔNG nút "Phá lệ" riêng; xếp vào chuyến đang khoá → hộp Phá lệ → "Phá lệ và xếp" gửi lại kèm phaLe`, async () => {
    await cho(q);
    const nav = await q.ev(vcSub);
    assert.deepEqual(nav.items, ["Điều phối xe", "Xe", "Sắp hết hạn", "Loại giấy tờ xe", "Lý do điều phối"]);
    assert.equal(nav.current, "Điều phối xe");
    const qm = (await q.ev(viec)).find((x) => x.loai === "CHẶNG QUÁ MỐC");
    assert.deepEqual([qm.khoa, qm.nut], [null, []]);
    await khongNutCam(q);
    await q.ev(moThe(d.O4.legId));
    await q.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
    await q.ev(click(`.dp-sheet-xep .vc-reason[data-code="${d.T4.id}"]`));
    assert.equal(await q.ev(txt(".dp-sheet-xep .dg-lock-note")), "Chuyến đã vào vùng khoá trước giờ xuất bến — khi xếp, bạn sẽ chọn lý do phá lệ.");
    await q.ev(click('[data-action="xep-gui"]'));
    await q.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]') && !document.querySelector('[data-action="xep-gui"]')`, "hộp phá lệ thay hộp xếp");
    await sleep(600);
    assert.equal(await q.ev(txt('[data-action="pha-le-gui"]')), "Phá lệ và xếp");
    assert.match(await q.ev(txt(".dp-sheet-pha-le .dp-sheet-sum")), new RegExp(`^Xếp chặng 10:00 · Citadines Bayfront → Bến tàu du lịch Nha Trang ${d.O4.ma} · 2 khách → vào ${d.T4.ma} \\(xuất bến 10:00\\)`));
    await axe(q, "hộp phá lệ xếp 1040");
    await shotView(q, "b1-pha-le-xep-may-tinh.png");
    await q.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_DON_GAP"]'));
    await q.ev(click('[data-action="pha-le-gui"]'));
    await q.waitFor(`${txt("#dp-banner .dp-banner-ok .banner-title")} === 'Đã xếp 2 khách vào ${d.T4.ma}'`, "đã xếp");
    const xep = ghi(q).filter((r) => r.path.endsWith("/phan-bo")).map((r) => JSON.parse(r.body));
    assert.equal(xep.length, 2);
    assert.equal(xep[0].phaLe, undefined);
    assert.deepEqual(xep[1].phaLe, { lyDo: "PHA_LE_DON_GAP" });
    assert.notEqual(xep[0].requestId, xep[1].requestId);
    assert.equal(await q.ev(txt("#dp-cot-chua-xep .dp-col-empty")), "Không còn chặng nào chưa xếp.");
    await shotFull(q, "b1-dieu-phoi-quan-tri-may-tinh.png");
  });
  await q.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);
  await b.step("8", `1e Kế toán: dải "Chỉ xem", không "+ Chuyến mới", thẻ chặng / việc không nút; bấm khối chỉ có "Mở chuyến"; menu chỉ Điều phối xe; không lệnh ghi${axeNote()}`, async () => {
    await cho(k);
    assert.equal(await k.ev(txt(".dp-readonly")), "Chỉ xem — Kế toán không xếp xe, không phá lệ.");
    assert.equal(await k.ev(shown("#dp-moi")), false);
    assert.equal(await k.ev(`document.querySelectorAll('#dp-cot-chua-xep button, #dp-cot-can-xu-ly button, #dp-cot-can-xu-ly .vc-btn').length`), 0);
    assert.deepEqual((await k.ev(vcSub)).items, ["Điều phối xe"]);
    await k.ev(click(`.dp-khoi[data-chuyen="${d.T2.id}"]`));
    await k.waitFor(`!!document.querySelector('.dp-chon')`, "thẻ đang chọn");
    assert.deepEqual(await k.ev(`[...document.querySelectorAll('.dp-chon .vc-btn')].map((x) => x.innerText.trim())`), ["Mở chuyến"]);
    assert.equal(ghi(k).length, 0);
    await khongNutCam(k);
    assert.equal(await k.ev(noCode), "");
    await axe(k, "điều phối 1040 Kế toán");
    await shotFull(k, "b1-dieu-phoi-ke-toan-may-tinh.png");
  });
  await k.close();

  await b.step("9", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [p, pa, pm, q, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
